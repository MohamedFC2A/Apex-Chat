/**
 * GRPO Scorer — Apex Omni Engine
 *
 * Implements Group Relative Policy Optimization (GRPO) scoring.
 *
 * GRPO Algorithm (Shao et al., 2024 — DeepSeekMath paper):
 * 1. For a given query q, sample G outputs: {o₁, o₂, ..., oG} from policy π
 * 2. Compute reward r_i for each output using a reward model
 * 3. Compute relative advantage: A_i = (r_i - mean(r)) / std(r)
 * 4. The output with the highest advantage is selected
 *
 * In our implementation:
 * - G = configurable group size (default: 4)
 * - Reward model = multi-factor scoring function (relevance, structure, completeness)
 * - Outputs are generated via parallel DeepSeek API calls
 * - The best output (highest advantage) becomes the final response
 */

import OpenAI from "openai";
import {
  buildConstrainedAPIParams,
  processConstrainedOutput,
  getLogitBiasProfile,
  GRPO_EVALUATION_SCHEMA,
} from "./constraint-engine.js";
import type { SFTPromptConfig } from "./sft-prompt-builder.js";

// ──────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────

export interface GRPOConfig {
  /** Number of outputs to generate (G). Higher = better quality, higher cost. */
  groupSize: number;
  /** Temperature for sampling diverse outputs. Higher = more diverse. */
  temperature: number;
  /** Whether to use the LLM reward model (more accurate) or heuristic scorer (faster) */
  useNeuralReward: boolean;
  /** Max tokens per generated output */
  maxTokens: number;
}

export interface GRPOOutput {
  /** Index in the group (0-indexed) */
  index: number;
  /** The generated text */
  text: string;
  /** Computed reward score (0–1) */
  reward: number;
  /** GRPO relative advantage: (r_i - mean(r)) / std(r) */
  advantage: number;
}

export interface GRPOResult {
  /** The selected best output */
  bestOutput: string;
  /** All generated outputs with their scores */
  allOutputs: GRPOOutput[];
  /** Mean reward across the group */
  meanReward: number;
  /** Standard deviation of rewards */
  stdReward: number;
  /** Index of the selected best output */
  bestIndex: number;
  /** Config used */
  config: GRPOConfig;
}

// ──────────────────────────────────────────────────────────────
// Adaptive Config based on Query Complexity
// ──────────────────────────────────────────────────────────────

/**
 * Returns GRPO config adapted to query complexity.
 * Simple queries (≤4) use G=2, complex queries (≥7) use G=4.
 * This balances quality vs. API cost/latency.
 */
export function getAdaptiveGRPOConfig(complexity: number): GRPOConfig {
  if (complexity <= 4) {
    return { groupSize: 3, temperature: 0.65, useNeuralReward: false, maxTokens: 2048 };
  } else if (complexity <= 7) {
    return { groupSize: 4, temperature: 0.75, useNeuralReward: false, maxTokens: 3072 };
  } else {
    return { groupSize: 6, temperature: 0.85, useNeuralReward: true, maxTokens: 4096 };
  }
}

// ──────────────────────────────────────────────────────────────
// Heuristic Reward Function
// ──────────────────────────────────────────────────────────────

/**
 * Multi-factor heuristic reward function.
 * Scores are in [0, 1] range.
 *
 * Dimensions:
 * - Relevance: TF-IDF overlap with query keywords
 * - Completeness: Length and structural richness
 * - Structure: Presence of headers, lists, code blocks
 * - Language Quality: Sentence completion, no truncation
 */
export function computeHeuristicReward(response: string, query: string): number {
  if (!response || response.length < 20) return 0;

  const queryTokens = query
    .toLowerCase()
    .replace(/[^\w\u0621-\u064A\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2);

  const responseLower = response.toLowerCase();

  // 1. Relevance (40% weight) — keyword overlap
  let relevanceScore = 0;
  if (queryTokens.length > 0) {
    const matched = queryTokens.filter((t) => responseLower.includes(t)).length;
    relevanceScore = matched / queryTokens.length;
  } else {
    relevanceScore = 0.5; // No keywords to check
  }

  // 2. Completeness (25% weight) — length-based
  const completenessScore = Math.min(response.length / 1000, 1.0);

  // 3. Structure (25% weight)
  let structureScore = 0;
  if (/#{1,3}\s/.test(response)) structureScore += 0.3;   // Headers
  if (/```[\s\S]*?```/.test(response)) structureScore += 0.3; // Code blocks
  if (/^[\-\*•]\s/m.test(response)) structureScore += 0.2;  // Lists
  if (/\|.*\|/.test(response)) structureScore += 0.2;        // Tables
  structureScore = Math.min(structureScore, 1.0);

  // 4. Language quality (10% weight) — ends properly
  const endsProperlyScore = /[.!?؟\n]$/.test(response.trim()) ? 1.0 : 0.5;

  // Penalize error responses
  const errorTerms = ["i apologize", "i cannot", "i'm sorry", "sorry, i", "error:", "timeout"];
  const hasError = errorTerms.some((t) => responseLower.includes(t));
  if (hasError) return 0.1;

  return (
    relevanceScore * 0.4 +
    completenessScore * 0.25 +
    structureScore * 0.25 +
    endsProperlyScore * 0.1
  );
}

// ──────────────────────────────────────────────────────────────
// Neural Reward Model (LLM-based scoring)
// ──────────────────────────────────────────────────────────────

/**
 * Uses the LLM as a reward model to evaluate a response.
 * More accurate than heuristics, but slower (additional API call).
 */
async function computeNeuralReward(
  client: OpenAI,
  actualModel: string,
  response: string,
  query: string
): Promise<number> {
  const evaluationPrompt = `You are a strict evaluation judge. Rate this AI response to the given query.

QUERY: "${query}"

RESPONSE TO EVALUATE:
${response}

Output a JSON evaluation with these exact fields:
- relevance_score (0.0-1.0): how relevant is the response?
- completeness_score (0.0-1.0): how complete and thorough?
- accuracy_score (0.0-1.0): how factually accurate (assume accurate if not obviously wrong)?
- structure_score (0.0-1.0): how well-structured and readable?
- overall_reward (0.0-1.0): weighted combination

Be strict and differentiate scores.`;

  try {
    const constraintParams = buildConstrainedAPIParams({
      forceJsonOutput: true,
      outputSchema: GRPO_EVALUATION_SCHEMA,
      maxTokens: 300,
    });

    const evalResponse = await client.chat.completions.create({
      model: "deepseek-chat", // Use fast model for evaluation
      messages: [
        { role: "system", content: "You are a strict AI response evaluator. Output only valid JSON." },
        { role: "user", content: evaluationPrompt },
      ],
      ...constraintParams,
    } as any);

    const rawEval = evalResponse.choices[0]?.message?.content || "{}";
    const result = processConstrainedOutput(rawEval, {
      forceJsonOutput: true,
      outputSchema: GRPO_EVALUATION_SCHEMA,
    });

    if (result.grammarValid && result.parsed) {
      const scores = result.parsed as Record<string, number>;
      return (
        (scores.relevance_score || 0) * 0.35 +
        (scores.completeness_score || 0) * 0.25 +
        (scores.accuracy_score || 0) * 0.25 +
        (scores.structure_score || 0) * 0.15
      );
    }
  } catch (err) {
    console.warn("[GRPO] Neural reward evaluation failed, falling back to heuristic:", err);
  }

  // Fallback to heuristic
  return computeHeuristicReward(response, query);
}

export function computeFormatReward(response: string): number {
  let score = 1.0;
  
  // Code block matching balance check
  const codeBlocks = response.match(/```/g);
  if (codeBlocks && codeBlocks.length % 2 !== 0) {
    score -= 0.3; // Penalty for open/unbalanced code block
  }

  // Check valid JSON syntax if JSON block is detected
  const jsonBlocks = response.match(/```json([\s\S]*?)```/gi);
  if (jsonBlocks) {
    for (const block of jsonBlocks) {
      try {
        const rawJson = block.replace(/```json|```/gi, "").trim();
        JSON.parse(rawJson);
      } catch (e) {
        score -= 0.4;
      }
    }
  }

  return Math.max(0.0, score);
}

export function computeDebateReward(response: string, query: string): number {
  let score = 1.0;
  const responseLower = response.toLowerCase();

  // Safety checks against standard boilerplate AI refusals or hallucination indicators
  const refusalPatterns = [
    "i apologize",
    "i'm sorry, but",
    "as an ai",
    "i cannot assist",
    "against my guidelines"
  ];
  for (const pattern of refusalPatterns) {
    if (responseLower.includes(pattern)) {
      score -= 0.6; // Refusal penalty
    }
  }

  // Structural checks: did it address query-specific metadata constraints
  if (query.includes("=== ATTACHMENT_EVIDENCE_START ===") && !responseLower.includes("attachment")) {
    score -= 0.2; // Structural compliance penalty
  }

  return Math.max(0.0, score);
}

export function computeSandboxReward(response: string): number {
  let score = 1.0;

  // Extract JS/TS block and dry-run code parsing to record runtime syntax flags
  const jsBlocks = response.match(/```(?:javascript|js|typescript|ts)\b([\s\S]*?)```/gi);
  if (jsBlocks) {
    for (const block of jsBlocks) {
      const code = block.replace(/```(?:javascript|js|typescript|ts)\b|```/gi, "").trim();
      try {
        new Function(code);
      } catch (e) {
        score -= 0.3; // Runtime compilation penalty
      }
    }
  }

  // Check basic HTML tag closure structure
  const htmlBlocks = response.match(/```html\b([\s\S]*?)```/gi);
  if (htmlBlocks) {
    for (const block of htmlBlocks) {
      const code = block.replace(/```html\b|```/gi, "").trim();
      const openTags = code.match(/<[a-zA-Z1-6]+[^>]*>/g) || [];
      const closeTags = code.match(/<\/[a-zA-Z1-6]+>/g) || [];
      if (Math.abs(openTags.length - closeTags.length) > 5) {
        score -= 0.2; // Malformed HTML structure
      }
    }
  }

  // CSS structure validation
  const cssBlocks = response.match(/```css\b([\s\S]*?)```/gi);
  if (cssBlocks) {
    for (const block of cssBlocks) {
      const code = block.replace(/```css\b|```/gi, "").trim();
      const openBraces = (code.match(/{/g) || []).length;
      const closeBraces = (code.match(/}/g) || []).length;
      if (openBraces !== closeBraces) {
        score -= 0.25; // Malformed CSS code block
      }
    }
  }

  return Math.max(0.0, score);
}

export async function computeTotalGrpoReward(
  client: OpenAI,
  actualModel: string,
  response: string,
  query: string,
  useNeuralReward: boolean,
  w1 = 0.3,
  w2 = 0.3,
  w3 = 0.4
): Promise<number> {
  const rFormat = computeFormatReward(response);
  const rDebate = computeDebateReward(response, query);
  const rSandbox = computeSandboxReward(response);
  
  const rTotal = w1 * rFormat + w2 * rDebate + w3 * rSandbox;
  
  // Combine with neural evaluation or heuristic baseline for contextual alignment
  let baseReward = 0;
  if (useNeuralReward) {
    baseReward = await computeNeuralReward(client, actualModel, response, query);
  } else {
    baseReward = computeHeuristicReward(response, query);
  }
  
  // 60% weight on the programmatic/mathematical multi-variable compliance, 40% on semantic alignment
  return 0.6 * rTotal + 0.4 * baseReward;
}

// ──────────────────────────────────────────────────────────────
// GRPO Statistics
// ──────────────────────────────────────────────────────────────

function mean(values: number[]): number {
  return values.length === 0 ? 0 : values.reduce((a, b) => a + b, 0) / values.length;
}

function stdDev(values: number[], mu?: number): number {
  if (values.length <= 1) return 1; // Avoid division by zero; return 1 as safe default
  const m = mu ?? mean(values);
  const variance = values.reduce((acc, v) => acc + Math.pow(v - m, 2), 0) / values.length;
  return Math.max(Math.sqrt(variance), 1e-6); // Avoid zero std
}

function argmax(values: number[]): number {
  return values.indexOf(Math.max(...values));
}

// ──────────────────────────────────────────────────────────────
// Main GRPO Engine
// ──────────────────────────────────────────────────────────────

/**
 * Runs the GRPO algorithm:
 * 1. Sample G responses from the policy (LLM) with temperature > 0
 * 2. Compute reward r_i for each response
 * 3. Compute relative advantage A_i = (r_i - μ) / σ
 * 4. Return the response with the highest advantage (argmax A_i)
 */
export async function runGRPO(
  client: OpenAI,
  actualModel: string,
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
  query: string,
  domain: SFTPromptConfig["domain"],
  config: GRPOConfig
): Promise<GRPOResult> {
  console.log(`[GRPO] Starting with G=${config.groupSize}, T=${config.temperature}, neural=${config.useNeuralReward}`);

  const logitBias = getLogitBiasProfile(domain, true);
  const constraintParams = buildConstrainedAPIParams({
    logitBias,
    maxTokens: config.maxTokens,
  });

  // ── Step 1: Sample G outputs in parallel ──
  const generationPromises = Array.from({ length: config.groupSize }, async (_, i) => {
    try {
      const response = await client.chat.completions.create({
        model: actualModel,
        messages,
        temperature: config.temperature + (i * 0.05), // Slight variation per sample
        max_tokens: config.maxTokens,
        ...(constraintParams.logit_bias ? { logit_bias: constraintParams.logit_bias } : {}),
      } as any);
      return response.choices[0]?.message?.content || "";
    } catch (err) {
      console.warn(`[GRPO] Sample ${i} generation failed:`, err);
      return "";
    }
  });

  const rawOutputs = await Promise.all(generationPromises);
  const validOutputs = rawOutputs.filter((o) => o.length > 20);

  if (validOutputs.length === 0) {
    throw new Error("[GRPO] All G samples failed to generate valid output");
  }

  // ── Step 2: Compute rewards ──
  const rewardPromises = validOutputs.map((output) =>
    computeTotalGrpoReward(client, actualModel, output, query, config.useNeuralReward)
  );
  const rewards = await Promise.all(rewardPromises);

  // ── Step 3: Compute GRPO relative advantages ──
  const mu = mean(rewards);
  const sigma = stdDev(rewards, mu);
  const advantages = rewards.map((r) => (r - mu) / sigma);

  // ── Step 4: Select best output (argmax advantage) ──
  const bestIndex = argmax(advantages);

  const allOutputs: GRPOOutput[] = validOutputs.map((text, i) => ({
    index: i,
    text,
    reward: rewards[i],
    advantage: advantages[i],
  }));

  console.log(
    `[GRPO] Rewards: [${rewards.map((r) => r.toFixed(3)).join(", ")}] | Mean: ${mu.toFixed(3)} | Std: ${sigma.toFixed(3)} | Best: #${bestIndex}`
  );

  return {
    bestOutput: validOutputs[bestIndex],
    allOutputs,
    meanReward: mu,
    stdReward: sigma,
    bestIndex,
    config,
  };
}
