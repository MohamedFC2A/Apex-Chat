/**
 * Tree of Thoughts (ToT) / Graph of Thoughts (GoT) Engine — Apex Omni
 *
 * Implements the ToT algorithm (Yao et al., 2023) and GoT extensions.
 *
 * TOT ALGORITHM:
 * 1. Input: problem/query
 * 2. Generate N thought branches (partial solutions/reasoning paths)
 * 3. Evaluate each branch using a Value function: V(s, {y}) → score
 * 4. Select promising branches (BFS/DFS/Beam Search)
 * 5. Expand selected branches or aggregate into final answer
 *
 * GOT EXTENSION:
 * - Nodes can be MERGED (aggregated) — not just expanded
 * - Supports arbitrary graph topology, not just trees
 * - Merging multiple branches produces "compound thoughts"
 *
 * In our implementation:
 * - Step 1: Generate 3 thought branches in parallel (Analytical, Creative, Critical)
 * - Step 2: Evaluate each using Grammar-Guided JSON scoring
 * - Step 3: Select top-K branches (Beam Search, K=2)
 * - Step 4: GoT Merge — synthesize selected branches into a unified thought
 * - Step 5: Use merged thought as context for final response generation
 */

import OpenAI from "openai";
import {
  buildConstrainedAPIParams,
  processConstrainedOutput,
  TOT_THOUGHT_EVALUATION_SCHEMA,
} from "./constraint-engine.js";
import type { SFTPromptConfig } from "./sft-prompt-builder.js";

// ──────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────

export type ThoughtType = "analytical" | "creative" | "critical" | "merged";
export type ThoughtValuation = "sure" | "maybe" | "impossible";

export interface ThoughtNode {
  id: string;
  type: ThoughtType;
  content: string;         // The thought/reasoning text
  valueScore: number;      // V(state) from evaluator (0–1)
  valuation: ThoughtValuation; // sure/maybe/impossible
  depth: number;           // 0 = root thought, 1 = expanded, 2 = merged
  parentIds: string[];     // For GoT: which nodes this was derived from
  children: ThoughtNode[];
}

export interface ToTConfig {
  /** Number of thought branches to generate at the initial level */
  numBranches: number;
  /** Max depth of the thought tree */
  maxDepth: number;
  /** Beam width: how many branches to keep at each level */
  beamWidth: number;
  /** Whether to enable GoT merging (aggregate branches) */
  enableGoTMerging: boolean;
  /** Max tokens per thought generation */
  maxTokensPerThought: number;
}

export interface ToTResult {
  /** The merged/synthesized thought context for response generation */
  synthesizedThought: string;
  /** All nodes in the thought tree */
  allNodes: ThoughtNode[];
  /** The selected best nodes (after beam search) */
  selectedNodes: ThoughtNode[];
  /** GoT merged node (if merging was applied) */
  mergedNode?: ThoughtNode;
}

// ──────────────────────────────────────────────────────────────
// Adaptive Config
// ──────────────────────────────────────────────────────────────

export function getAdaptiveToTConfig(complexity: number): ToTConfig {
  if (complexity <= 4) {
    // Simple queries: 2 branches, no expansion, no GoT merge
    return { numBranches: 2, maxDepth: 1, beamWidth: 1, enableGoTMerging: false, maxTokensPerThought: 512 };
  } else if (complexity <= 7) {
    // Moderate: 3 branches, GoT merge
    return { numBranches: 3, maxDepth: 1, beamWidth: 2, enableGoTMerging: true, maxTokensPerThought: 768 };
  } else {
    // Complex: 3 branches + expansion + full GoT merge
    return { numBranches: 3, maxDepth: 2, beamWidth: 2, enableGoTMerging: true, maxTokensPerThought: 1024 };
  }
}

// ──────────────────────────────────────────────────────────────
// Thought Generation
// ──────────────────────────────────────────────────────────────

const THOUGHT_PROMPTS: Record<ThoughtType, string> = {
  analytical:
    "Think about this analytically and logically. Break it down into first principles. What are the key components, relationships, and logical deductions? Reason step by step.",
  creative:
    "Think about this creatively and laterally. What unconventional angles, analogies, or connections can you make? What would an innovator see here that others miss?",
  critical:
    "Think about this critically and skeptically. What are the weaknesses, edge cases, counterarguments, and potential pitfalls? Challenge assumptions ruthlessly.",
  merged:
    "Synthesize all available thinking perspectives into a unified, comprehensive thought. Integrate insights while resolving contradictions.",
};

function generateThoughtId(): string {
  return `thought_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
}

async function generateThoughtBranch(
  client: OpenAI,
  actualModel: string,
  query: string,
  thoughtType: ThoughtType,
  config: ToTConfig,
  parentContext?: string
): Promise<ThoughtNode> {
  const contextBlock = parentContext
    ? `\n\nContext from previous thinking:\n${parentContext}\n\nBuild upon this, don't repeat it.`
    : "";

  const prompt = `${THOUGHT_PROMPTS[thoughtType]}${contextBlock}

Problem/Query to reason about:
"${query}"

Generate your ${thoughtType} thought process in 2-4 focused paragraphs. Be specific and insightful. This is internal reasoning, not the final answer.`;

  try {
    const response = await client.chat.completions.create({
      model: actualModel === "deepseek-reasoner" ? "deepseek-chat" : actualModel,
      messages: [
        {
          role: "system",
          content: `You are a specialized ${thoughtType} reasoning module. Generate ${thoughtType} thoughts about problems. Be rigorous and specific.`,
        },
        { role: "user", content: prompt },
      ],
      max_tokens: config.maxTokensPerThought,
      temperature: thoughtType === "creative" ? 0.9 : thoughtType === "analytical" ? 0.4 : 0.6,
    });

    return {
      id: generateThoughtId(),
      type: thoughtType,
      content: response.choices[0]?.message?.content || `[${thoughtType} thought unavailable]`,
      valueScore: 0, // Will be set by evaluator
      valuation: "maybe", // Will be set by evaluator
      depth: parentContext ? 1 : 0,
      parentIds: [],
      children: [],
    };
  } catch (err) {
    console.warn(`[ToT] Failed to generate ${thoughtType} thought:`, err);
    return {
      id: generateThoughtId(),
      type: thoughtType,
      content: `[${thoughtType} reasoning path unavailable]`,
      valueScore: 0,
      valuation: "impossible",
      depth: 0,
      parentIds: [],
      children: [],
    };
  }
}

// ──────────────────────────────────────────────────────────────
// Thought Evaluation (Value Function V)
// ──────────────────────────────────────────────────────────────

/**
 * Evaluates a thought node using Grammar-Guided JSON generation.
 * This is the Value Function V(s, y) from the ToT paper.
 */
async function evaluateThought(
  client: OpenAI,
  query: string,
  node: ThoughtNode
): Promise<{ valueScore: number; valuation: ThoughtValuation }> {
  const evalPrompt = `Evaluate this reasoning thought for solving the given problem.

PROBLEM: "${query}"

THOUGHT (${node.type} reasoning):
${node.content}

Rate this thought. Output JSON with:
- value_score: 0.0–1.0 (how valuable is this reasoning path?)
- is_promising: "sure" (clearly helpful), "maybe" (partially useful), or "impossible" (wrong/unhelpful)
- reasoning: one-line explanation`;

  try {
    const constraintParams = buildConstrainedAPIParams({
      forceJsonOutput: true,
      outputSchema: TOT_THOUGHT_EVALUATION_SCHEMA,
      maxTokens: 200,
    });

    const response = await client.chat.completions.create({
      model: "deepseek-chat", // Use fast model for evaluation
      messages: [
        { role: "system", content: "You are a strict thought evaluator. Output only valid JSON." },
        { role: "user", content: evalPrompt },
      ],
      ...constraintParams,
    } as any);

    const raw = response.choices[0]?.message?.content || "{}";
    const result = processConstrainedOutput(raw, {
      forceJsonOutput: true,
      outputSchema: TOT_THOUGHT_EVALUATION_SCHEMA,
    });

    if (result.grammarValid && result.parsed) {
      const data = result.parsed as { value_score: number; is_promising: string };
      const valuation: ThoughtValuation =
        data.is_promising === "sure"
          ? "sure"
          : data.is_promising === "impossible"
          ? "impossible"
          : "maybe";
      return { valueScore: Math.max(0, Math.min(1, data.value_score || 0.5)), valuation };
    }
  } catch (err) {
    console.warn("[ToT] Thought evaluation failed:", err);
  }

  // Fallback: heuristic evaluation
  const heuristicScore = node.content.length > 100 ? 0.6 : 0.3;
  return { valueScore: heuristicScore, valuation: "maybe" };
}

// ──────────────────────────────────────────────────────────────
// Beam Search Selection
// ──────────────────────────────────────────────────────────────

function beamSearch(nodes: ThoughtNode[], beamWidth: number): ThoughtNode[] {
  // Filter out impossible nodes
  const viable = nodes.filter((n) => n.valuation !== "impossible");
  if (viable.length === 0) return nodes.slice(0, beamWidth); // Fallback

  // Sort by value score descending, take top-K
  return viable.sort((a, b) => b.valueScore - a.valueScore).slice(0, beamWidth);
}

// ──────────────────────────────────────────────────────────────
// GoT Merging (Graph of Thoughts aggregation)
// ──────────────────────────────────────────────────────────────

/**
 * GoT Aggregation: merges multiple thought nodes into a single compound thought.
 * This is the key distinction of GoT over ToT.
 */
async function mergeThoughts(
  client: OpenAI,
  actualModel: string,
  selectedNodes: ThoughtNode[],
  query: string,
  config: ToTConfig
): Promise<ThoughtNode> {
  const thoughtSummaries = selectedNodes
    .map((n, i) => `### ${i + 1}. ${n.type.toUpperCase()} Reasoning (score: ${n.valueScore.toFixed(2)})\n${n.content}`)
    .join("\n\n---\n\n");

  const mergePrompt = `You are performing a Graph-of-Thoughts (GoT) aggregation operation.

PROBLEM: "${query}"

The following reasoning paths have been explored in parallel:

${thoughtSummaries}

---

AGGREGATION TASK:
Synthesize these ${selectedNodes.length} reasoning paths into a single, unified, comprehensive reasoning context. 
- Identify points of convergence (where paths agree) and reinforce them
- Resolve contradictions by weighing evidence
- Combine unique insights from each path
- The result should be richer than any individual path

Output your synthesized compound thought:`;

  try {
    const response = await client.chat.completions.create({
      model: actualModel === "deepseek-reasoner" ? "deepseek-chat" : actualModel,
      messages: [
        {
          role: "system",
          content: "You are a GoT aggregation engine. Merge multiple reasoning paths into a superior compound thought.",
        },
        { role: "user", content: mergePrompt },
      ],
      max_tokens: config.maxTokensPerThought * 2,
      temperature: 0.5,
    });

    const mergedContent = response.choices[0]?.message?.content || "";

    return {
      id: generateThoughtId(),
      type: "merged",
      content: mergedContent,
      valueScore: Math.max(...selectedNodes.map((n) => n.valueScore)) * 1.1, // Merged > best individual
      valuation: "sure",
      depth: Math.max(...selectedNodes.map((n) => n.depth)) + 1,
      parentIds: selectedNodes.map((n) => n.id),
      children: [],
    };
  } catch (err) {
    console.warn("[GoT] Merging failed, using best individual thought:", err);
    // Fallback: concatenate top thoughts
    const concatenated = selectedNodes.map((n) => `[${n.type}]\n${n.content}`).join("\n\n---\n\n");
    return {
      id: generateThoughtId(),
      type: "merged",
      content: concatenated,
      valueScore: 0.7,
      valuation: "sure",
      depth: 1,
      parentIds: selectedNodes.map((n) => n.id),
      children: [],
    };
  }
}

// ──────────────────────────────────────────────────────────────
// Main ToT/GoT Engine
// ──────────────────────────────────────────────────────────────

/**
 * Runs the full Tree of Thoughts + Graph of Thoughts pipeline.
 *
 * Returns a synthesized thought context that can be injected into
 * the final response generation prompt, dramatically improving quality.
 */
export async function runToTGoT(
  client: OpenAI,
  actualModel: string,
  query: string,
  config: ToTConfig
): Promise<ToTResult> {
  console.log(`[ToT/GoT] Starting: branches=${config.numBranches}, depth=${config.maxDepth}, merge=${config.enableGoTMerging}`);

  const thoughtTypes: ThoughtType[] = ["analytical", "creative", "critical"];
  const selectedTypes = thoughtTypes.slice(0, config.numBranches);

  // ── Level 0: Generate initial thought branches in parallel ──
  const level0Nodes = await Promise.all(
    selectedTypes.map((type) =>
      generateThoughtBranch(client, actualModel, query, type, config)
    )
  );

  // ── Evaluate all level-0 nodes ──
  const evaluationResults = await Promise.all(
    level0Nodes.map((node) => evaluateThought(client, query, node))
  );
  level0Nodes.forEach((node, i) => {
    node.valueScore = evaluationResults[i].valueScore;
    node.valuation = evaluationResults[i].valuation;
  });

  console.log(`[ToT] Level-0 scores: [${level0Nodes.map((n) => `${n.type}:${n.valueScore.toFixed(2)}`).join(", ")}]`);

  // ── Beam Search: select top-K branches ──
  const selected = beamSearch(level0Nodes, config.beamWidth);

  // ── Depth 1 expansion (if configured) ──
  let allNodes: ThoughtNode[] = [...level0Nodes];
  let finalSelected = selected;

  if (config.maxDepth >= 2 && selected.length > 0) {
    // Expand the best branch one more level
    const bestNode = selected[0];
    const expandedNode = await generateThoughtBranch(
      client,
      actualModel,
      query,
      "analytical", // Analytical expansion of the best path
      config,
      bestNode.content
    );
    const expandedEval = await evaluateThought(client, query, expandedNode);
    expandedNode.valueScore = expandedEval.valueScore;
    expandedNode.valuation = expandedEval.valuation;
    expandedNode.parentIds = [bestNode.id];
    bestNode.children.push(expandedNode);
    allNodes.push(expandedNode);

    // If expanded node is better, include it in selected
    if (expandedNode.valueScore > (finalSelected[1]?.valueScore ?? 0)) {
      finalSelected = [selected[0], expandedNode];
    }
  }

  // ── GoT Merging ──
  let mergedNode: ThoughtNode | undefined;
  let synthesizedThought: string;

  if (config.enableGoTMerging && finalSelected.length >= 2) {
    mergedNode = await mergeThoughts(client, actualModel, finalSelected, query, config);
    allNodes.push(mergedNode);
    synthesizedThought = mergedNode.content;
    console.log(`[GoT] Merged ${finalSelected.length} thoughts → score: ${mergedNode.valueScore.toFixed(2)}`);
  } else {
    // Just use the best single thought
    synthesizedThought = finalSelected[0]?.content || level0Nodes[0]?.content || "";
  }

  return { synthesizedThought, allNodes, selectedNodes: finalSelected, mergedNode };
}
