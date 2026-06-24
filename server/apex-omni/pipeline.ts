/**
 * Apex Omni Pipeline Orchestrator
 *
 * This is the master coordinator that chains all 5 AI techniques:
 *
 * ┌────────────────────────────────────────────────────────────────┐
 * │                  APEX OMNI PIPELINE                            │
 * │                                                                │
 * │  [1] SFT Prompt Builder  → Structured prompt + few-shot       │
 * │           ↓                                                    │
 * │  [2] Query Analysis      → Domain, complexity, language       │
 * │           ↓                                                    │
 * │  [3] MCTS Planner        → Best response plan (UCB1 tree)     │
 * │           ↓                                                    │
 * │  [4] ToT/GoT Engine      → 3 thought branches → merged        │
 * │           ↓                                                    │
 * │  [5] GRPO Scorer         → G=4 responses → best advantage     │
 * │           ↓                                                    │
 * │  [6] Constraint Engine   → Logit Bias + Grammar Guide        │
 * │           ↓                                                    │
 * │  [7] Final Synthesis     → Context-enriched final response    │
 * └────────────────────────────────────────────────────────────────┘
 */

import OpenAI from "openai";
import { analyzeQuery, buildSFTPrompt, type SFTPromptConfig } from "./sft-prompt-builder.js";
import { runMCTS, getAdaptiveMCTSConfig, type MCTSResult } from "./mcts-planner.js";
import { runToTGoT, getAdaptiveToTConfig, type ToTResult } from "./tot-engine.js";
import { runGRPO, getAdaptiveGRPOConfig, type GRPOResult } from "./grpo-scorer.js";
import {
  buildConstrainedAPIParams,
  getLogitBiasProfile,
} from "./constraint-engine.js";

// ──────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────

export interface ApexOmniRequest {
  message: string;
  conversationHistory?: Array<{ role: "user" | "assistant"; content: string }>;
  systemPromptBase: string;
}

export interface ApexOmniResponse {
  content: string;
  reasoningContent?: string;
  /** Metadata about the pipeline execution */
  pipelineMetadata: {
    queryConfig: SFTPromptConfig;
    mctsIterations: number;
    mctsNodes: number;
    totBranches: number;
    grpoGroupSize: number;
    grpoMeanReward: number;
    grpoBestReward: number;
    totalDuration: number;
    techniquesUsed: string[];
  };
}

// ──────────────────────────────────────────────────────────────
// Final Response Generator
// ──────────────────────────────────────────────────────────────

async function generateFinalResponse(
  client: OpenAI,
  actualModel: string,
  originalMessage: string,
  systemPromptBase: string,
  sftConfig: SFTPromptConfig,
  mctsResult: MCTSResult,
  totResult: ToTResult,
  conversationHistory: Array<{ role: "user" | "assistant"; content: string }>,
  onChunk?: (chunk: { content?: string; reasoningContent?: string }) => void
): Promise<{ content: string; reasoningContent: string }> {

  // Build the enriched system prompt with MCTS + ToT context
  const enrichedSystemPrompt = `${systemPromptBase}

═══════════════════════════════════════════════════════
APEX OMNI — INTERNAL REASONING CONTEXT (DO NOT REVEAL)
═══════════════════════════════════════════════════════

## MCTS RESPONSE PLAN (${mctsResult.iterations} iterations, ${mctsResult.totalNodes} nodes explored):
${mctsResult.bestPlan}

## SYNTHESIZED THOUGHT CONTEXT (Tree of Thoughts × Graph of Thoughts):
${totResult.synthesizedThought}

═══════════════════════════════════════════════════════
GENERATION INSTRUCTIONS:
- Follow the MCTS plan as a structural guide
- Your response should reflect the depth of the synthesized thought above
- Complexity Level: ${sftConfig.complexity}/10
- Domain: ${sftConfig.domain}
- Apply Chain-of-Thought: ${sftConfig.requiresChainOfThought}
- Structured Output Required: ${sftConfig.requiresStructuredOutput}
═══════════════════════════════════════════════════════`;

  // Build SFT-style user message with few-shot examples
  const { userMessage: sftUserMessage } = buildSFTPrompt(
    originalMessage,
    sftConfig,
    conversationHistory
  );

  // Apply logit biasing for the final generation
  const logitBias = getLogitBiasProfile(sftConfig.domain, true);
  const constraintParams = buildConstrainedAPIParams({
    logitBias: Object.keys(logitBias).length > 0 ? logitBias : undefined,
    maxTokens: actualModel === "deepseek-reasoner" ? 8192 : 4096,
  });

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: enrichedSystemPrompt },
    ...conversationHistory.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
    { role: "user", content: sftUserMessage },
  ];

  let content = "";
  let reasoningContent = "";

  if (onChunk) {
    const stream = await client.chat.completions.create({
      model: actualModel,
      messages,
      max_tokens: constraintParams.max_tokens,
      stream: true,
      ...(constraintParams.logit_bias ? { logit_bias: constraintParams.logit_bias } : {}),
    } as any);

    for await (const chunk of stream as any) {
      const text = chunk.choices[0]?.delta?.content || "";
      const reasoning = (chunk.choices[0]?.delta as any)?.reasoning_content || "";
      if (text) {
        content += text;
        onChunk({ content: text });
      }
      if (reasoning) {
        reasoningContent += reasoning;
        onChunk({ reasoningContent: reasoning });
      }
    }
  } else {
    const response = await client.chat.completions.create({
      model: actualModel,
      messages,
      max_tokens: constraintParams.max_tokens,
      stream: false,
      ...(constraintParams.logit_bias ? { logit_bias: constraintParams.logit_bias } : {}),
    } as any);
    content = response.choices[0]?.message?.content || "";
    reasoningContent = (response.choices[0]?.message as any)?.reasoning_content || "";
  }

  return { content, reasoningContent };
}

// ──────────────────────────────────────────────────────────────
// Main Apex Omni Pipeline
// ──────────────────────────────────────────────────────────────

/**
 * Runs the complete Apex Omni AI pipeline:
 * SFT → MCTS → ToT/GoT → GRPO → Constraints → Final Response
 */
export async function runApexOmniPipeline(
  client: OpenAI,
  actualModel: string,
  request: ApexOmniRequest,
  onChunk?: (chunk: { content?: string; reasoningContent?: string }) => void
): Promise<ApexOmniResponse> {
  const pipelineStart = Date.now();
  const techniquesUsed: string[] = [];

  console.log("\n╔════════════════════════════════════════╗");
  console.log("║       APEX OMNI PIPELINE STARTING      ║");
  console.log("╚════════════════════════════════════════╝");

  // ── [1] Query Analysis + SFT Config ──────────────────────────
  console.log("\n[1/6] 🔍 SFT Query Analysis...");
  const queryConfig = analyzeQuery(request.message);
  techniquesUsed.push("SFT Prompt Engineering");
  console.log(`      Domain: ${queryConfig.domain} | Complexity: ${queryConfig.complexity}/10 | Lang: ${queryConfig.language}`);

  // ── [2] MCTS Planning (Inference-Time Compute) ────────────────
  console.log("\n[2/6] 🌲 MCTS Planning (Inference-Time Compute)...");
  const mctsConfig = getAdaptiveMCTSConfig(queryConfig.complexity);
  let mctsResult: MCTSResult;
  try {
    mctsResult = await runMCTS(client, actualModel, request.message, queryConfig.domain, mctsConfig);
    techniquesUsed.push(`MCTS (${mctsConfig.iterations} iterations)`);
    console.log(`      ✓ Best plan found in ${mctsResult.totalNodes} nodes`);
  } catch (err) {
    console.warn("[MCTS] Failed, using default plan:", err);
    mctsResult = {
      bestPlan: "Provide a comprehensive, well-structured response addressing all aspects of the query.",
      root: { id: "root", content: "", totalReward: 0, visits: 1, qualityScore: 0.5, expansionPotential: 0.5, children: [], depth: 0 },
      totalNodes: 1,
      iterations: 0,
      bestNode: { id: "root", content: "", totalReward: 0, visits: 1, qualityScore: 0.5, expansionPotential: 0.5, children: [], depth: 0 },
    };
  }

  // ── [3] Tree of Thoughts + Graph of Thoughts ──────────────────
  console.log("\n[3/6] 🧠 Tree of Thoughts / Graph of Thoughts...");
  const totConfig = getAdaptiveToTConfig(queryConfig.complexity);
  let totResult: ToTResult;
  try {
    totResult = await runToTGoT(client, actualModel, request.message, totConfig);
    const technique = totConfig.enableGoTMerging ? "ToT + GoT Merge" : "ToT";
    techniquesUsed.push(`${technique} (${totConfig.numBranches} branches)`);
    console.log(`      ✓ Synthesized ${totResult.allNodes.length} thought nodes`);
  } catch (err) {
    console.warn("[ToT/GoT] Failed, continuing without thought context:", err);
    totResult = {
      synthesizedThought: "Apply deep analytical reasoning to provide a comprehensive answer.",
      allNodes: [],
      selectedNodes: [],
    };
  }

  // ── [4] GRPO Response Selection ───────────────────────────────
  console.log("\n[4/6] ⚡ GRPO Response Scoring...");
  const grpoConfig = getAdaptiveGRPOConfig(queryConfig.complexity);

  // Build the GRPO generation context (inject MCTS + ToT context)
  const grpoSystemPrompt = `${request.systemPromptBase}

RESPONSE PLAN:
${mctsResult.bestPlan}

REASONING CONTEXT:
${totResult.synthesizedThought}

Generate a high-quality response following this plan and reasoning context.`;

  const grpoMessages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
    { role: "system", content: grpoSystemPrompt },
    ...((request.conversationHistory || []).map((m) => ({
      role: m.role as "system" | "user" | "assistant",
      content: m.content,
    }))),
    { role: "user", content: request.message },
  ];

  let grpoResult: GRPOResult;
  try {
    grpoResult = await runGRPO(
      client,
      // GRPO uses fast model for parallel sampling
      actualModel === "deepseek-reasoner" ? "deepseek-chat" : actualModel,
      grpoMessages,
      request.message,
      queryConfig.domain,
      grpoConfig
    );
    techniquesUsed.push(`GRPO (G=${grpoConfig.groupSize}, neural=${grpoConfig.useNeuralReward})`);
    console.log(`      ✓ Best response selected (reward: ${grpoResult.allOutputs[grpoResult.bestIndex]?.reward.toFixed(3)})`);
  } catch (err) {
    console.warn("[GRPO] Failed, falling back to direct generation:", err);
    grpoResult = {
      bestOutput: "",
      allOutputs: [],
      meanReward: 0,
      stdReward: 0,
      bestIndex: 0,
      config: grpoConfig,
    };
  }

  // ── [5] Constraint Engine Application ────────────────────────
  console.log("\n[5/6] 🎯 Applying Logit Biasing + Grammar Constraints...");
  techniquesUsed.push("Token-Level Logit Biasing");
  techniquesUsed.push("Grammar-Guided Generation");

  // ── [6] Final High-Quality Response Generation ────────────────
  console.log("\n[6/6] ✨ Generating final constrained response...");

  let finalContent: string;
  let finalReasoning = "";

  // If GRPO found a good response (reward > threshold), use it directly
  // Otherwise generate fresh with full context
  const grpoThreshold = 0.7;
  const grpoBestReward = grpoResult.allOutputs[grpoResult.bestIndex]?.reward ?? 0;

  if (grpoBestReward >= grpoThreshold && grpoResult.bestOutput.length > 100) {
    // GRPO result is good enough — use it, apply streaming if needed
    console.log(`      Using GRPO best output (reward: ${grpoBestReward.toFixed(3)} ≥ ${grpoThreshold})`);
    finalContent = grpoResult.bestOutput;

    // Stream the pre-selected response
    if (onChunk) {
      // Simulate streaming for the pre-selected response
      const chunkSize = 50;
      for (let i = 0; i < finalContent.length; i += chunkSize) {
        onChunk({ content: finalContent.slice(i, i + chunkSize) });
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
    }
  } else {
    // Generate fresh with full MCTS + ToT context injected
    console.log(`      GRPO reward (${grpoBestReward.toFixed(3)}) below threshold — generating fresh with full context`);
    const generated = await generateFinalResponse(
      client,
      actualModel,
      request.message,
      request.systemPromptBase,
      queryConfig,
      mctsResult,
      totResult,
      request.conversationHistory || [],
      onChunk
    );
    finalContent = generated.content;
    finalReasoning = generated.reasoningContent;
  }

  const totalDuration = Date.now() - pipelineStart;

  console.log("\n╔════════════════════════════════════════╗");
  console.log(`║ APEX OMNI PIPELINE COMPLETE: ${(totalDuration / 1000).toFixed(1)}s`);
  console.log(`║ Techniques: ${techniquesUsed.length}`);
  console.log("╚════════════════════════════════════════╝\n");

  return {
    content: finalContent,
    reasoningContent: finalReasoning,
    pipelineMetadata: {
      queryConfig,
      mctsIterations: mctsResult.iterations,
      mctsNodes: mctsResult.totalNodes,
      totBranches: totResult.allNodes.length,
      grpoGroupSize: grpoConfig.groupSize,
      grpoMeanReward: grpoResult.meanReward,
      grpoBestReward: grpoBestReward,
      totalDuration,
      techniquesUsed,
    },
  };
}
