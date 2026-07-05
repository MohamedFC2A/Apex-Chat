/**
 * MCTS Planner — Apex Omni Engine
 *
 * Implements Monte Carlo Tree Search (MCTS) for response planning
 * and Inference-Time Compute scaling.
 *
 * MCTS ALGORITHM (4 phases):
 * ┌─────────────────────────────────────────────────────┐
 * │ 1. SELECTION    — traverse tree using UCB1 policy   │
 * │ 2. EXPANSION    — generate new child node (LLM call)│
 * │ 3. SIMULATION   — evaluate node quality (rollout)   │
 * │ 4. BACKPROP     — update scores up the tree         │
 * └─────────────────────────────────────────────────────┘
 *
 * INFERENCE-TIME COMPUTE:
 * - Simple queries (complexity ≤ 4): 2 MCTS iterations
 * - Medium queries (complexity 5-7): 4 MCTS iterations
 * - Complex queries (complexity ≥ 8): 6 MCTS iterations
 *
 * The MCTS planner produces a "response plan" (structured outline)
 * that guides the final answer generation, improving coherence
 * and completeness.
 */

import OpenAI from "openai";
import {
  buildConstrainedAPIParams,
  processConstrainedOutput,
  MCTS_NODE_EVALUATION_SCHEMA,
  getLogitBiasProfile,
} from "./constraint-engine.js";
import type { SFTPromptConfig } from "./sft-prompt-builder.js";

// ──────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────

export interface MCTSNode {
  id: string;
  /** The response candidate or plan at this node */
  content: string;
  /** Total accumulated reward from simulations through this node */
  totalReward: number;
  /** Number of times this node has been visited */
  visits: number;
  /** Quality score from the last simulation */
  qualityScore: number;
  /** Expansion potential (from evaluator) */
  expansionPotential: number;
  /** Child nodes */
  children: MCTSNode[];
  /** Parent node */
  parent?: MCTSNode;
  /** Depth in the tree */
  depth: number;
}

export interface MCTSConfig {
  /** Number of MCTS iterations (= inference-time compute) */
  iterations: number;
  /** Max depth of the search tree */
  maxDepth: number;
  /** UCB1 exploration constant (higher = more exploration) */
  explorationConstant: number;
  /** Max tokens per node generation */
  maxTokensPerNode: number;
}

export interface MCTSResult {
  /** The best response plan/outline found by MCTS */
  bestPlan: string;
  /** The root of the MCTS tree */
  root: MCTSNode;
  /** Total nodes explored */
  totalNodes: number;
  /** Number of iterations completed */
  iterations: number;
  /** Best node found */
  bestNode: MCTSNode;
}

// ──────────────────────────────────────────────────────────────
// Adaptive Config — Inference-Time Compute Scaling
// ──────────────────────────────────────────────────────────────

/**
 * Adaptively scales compute at inference time based on query complexity.
 * This is the "Inference-Time Compute" principle:
 * harder problems get more MCTS iterations.
 */
export function getAdaptiveMCTSConfig(complexity: number): MCTSConfig {
  if (complexity <= 4) {
    // Simple: 3 iterations (fast)
    return { iterations: 3, maxDepth: 2, explorationConstant: 1.414, maxTokensPerNode: 600 };
  } else if (complexity <= 7) {
    // Medium: 5 iterations
    return { iterations: 5, maxDepth: 3, explorationConstant: 1.5, maxTokensPerNode: 800 };
  } else {
    // Complex: 8 iterations (deep compute)
    return { iterations: 8, maxDepth: 4, explorationConstant: 1.8, maxTokensPerNode: 1200 };
  }
}

// ──────────────────────────────────────────────────────────────
// Node Utilities
// ──────────────────────────────────────────────────────────────

function createNode(content: string, parent?: MCTSNode): MCTSNode {
  return {
    id: `mcts_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    content,
    totalReward: 0,
    visits: 0,
    qualityScore: 0,
    expansionPotential: 0.5,
    children: [],
    parent,
    depth: parent ? parent.depth + 1 : 0,
  };
}

function isLeaf(node: MCTSNode): boolean {
  return node.children.length === 0;
}

// ──────────────────────────────────────────────────────────────
// Phase 1: Selection (UCB1 Policy)
// ──────────────────────────────────────────────────────────────

/**
 * UCB1 formula: UCB1(v_i) = Q(v_i)/N(v_i) + C * sqrt(ln(N(v)) / N(v_i))
 * where:
 *   Q(v_i) = total reward of node i
 *   N(v_i) = visits to node i
 *   N(v)   = visits to parent
 *   C      = exploration constant
 */
function ucb1Score(node: MCTSNode, explorationConstant: number): number {
  if (node.visits === 0) return Infinity; // Unvisited nodes are always selected first
  const parentVisits = node.parent?.visits ?? 1;
  const exploitation = node.totalReward / node.visits;
  const exploration = explorationConstant * Math.sqrt(Math.log(parentVisits) / node.visits);
  return exploitation + exploration;
}

/**
 * Selection phase: traverses the tree from root, always choosing
 * the child with the highest UCB1 score, until we reach a leaf or unvisited node.
 */
function selection(root: MCTSNode, explorationConstant: number): MCTSNode {
  let current = root;

  while (!isLeaf(current) && current.visits > 0) {
    const scores = current.children.map((c) => ucb1Score(c, explorationConstant));
    const bestIdx = scores.indexOf(Math.max(...scores));
    current = current.children[bestIdx];
  }

  return current;
}

// ──────────────────────────────────────────────────────────────
// Phase 2: Expansion (LLM-based node generation)
// ──────────────────────────────────────────────────────────────

/**
 * Expansion phase: generates a new child node by asking the LLM
 * to improve or extend the current node's response plan.
 */
async function expansion(
  client: OpenAI,
  actualModel: string,
  node: MCTSNode,
  query: string,
  config: MCTSConfig,
  domain: string
): Promise<MCTSNode> {
  const logitBias = getLogitBiasProfile(domain, true);
  const parentContext = node.content
    ? `\n\nPrevious approach (improve upon this):\n${node.content.substring(0, 500)}`
    : "";

  const expansionPrompt = `Create a detailed response PLAN (not the full answer) for this query.
Your plan should outline: key points to address, recommended structure, and approach.${parentContext}

Query: "${query}"

Output a concise but comprehensive response plan (3-7 bullet points):`;

  const proposerSystem = "You are a strategic response planner Proposer. Create structured plans for answering queries.";

  let currentPlan = "";
  const isOpenRouter = actualModel.includes("/");
  try {
    const response = await client.chat.completions.create({
      model: isOpenRouter ? actualModel : "deepseek-chat",
      messages: [
        {
          role: "system",
          content: proposerSystem,
        },
        { role: "user", content: expansionPrompt },
      ],
      max_tokens: config.maxTokensPerNode,
      temperature: 0.7,
      } as any);
    currentPlan = response.choices[0]?.message?.content || "";
  } catch (err) {
    console.warn("[MCTS Proposer] Expansion failed:", err);
    currentPlan = `[Plan unavailable for: ${query.substring(0, 50)}]`;
  }

  // Adversarial Critic Check
  for (let attempt = 1; attempt <= 2; attempt++) {
    if (currentPlan.includes("unavailable") || !currentPlan) break;

    const criticPrompt = `Review this response plan for the query: "${query}"
Plan to review:
${currentPlan}

Check if this plan misses any key aspects of the query, has logical flaws, or has structural issues. Respond with "PASSED" if it's completely solid. Otherwise list the flaws briefly.`;

    let critique = "";
    try {
      const response = await client.chat.completions.create({
        model: isOpenRouter ? actualModel : "deepseek-chat", // Fast critic unless OpenRouter
        messages: [
          { role: "system", content: "You are a strict, adversarial plan Critic. Output 'PASSED' if there are no flaws in the plan." },
          { role: "user", content: criticPrompt }
        ],
        max_tokens: 200,
        temperature: 0.2
      });
      critique = response.choices[0]?.message?.content || "";
    } catch (err) {
      console.warn(`[MCTS Critic] Verification failed on attempt ${attempt}:`, err);
      break;
    }

    if (critique.trim().toUpperCase().includes("PASSED")) {
      console.log("[MCTS Critic] Plan passed verification.");
      break;
    }

    console.log(`[MCTS Critic] Plan failed verification. Feedback: ${critique.substring(0, 100)}...`);

    // Proposer refactors to address flaws
    const refactorPrompt = `Refactor the response plan to fix the flaws identified by the critic.
Query: "${query}"
Current Plan:
${currentPlan}

Critic Feedback:
${critique}

Provide the complete refactored plan.`;

    try {
      const response = await client.chat.completions.create({
        model: isOpenRouter ? actualModel : "deepseek-chat",
        messages: [
          { role: "system", content: proposerSystem },
          { role: "user", content: refactorPrompt },
        ],
        max_tokens: config.maxTokensPerNode,
        temperature: 0.5,
        } as any);
      currentPlan = response.choices[0]?.message?.content || currentPlan;
    } catch (err) {
      console.warn(`[MCTS Proposer] Refactoring failed on attempt ${attempt}:`, err);
      break;
    }
  }

  const child = createNode(currentPlan, node);
  node.children.push(child);
  return child;
}

// ──────────────────────────────────────────────────────────────
// Phase 3: Simulation (Rollout / Quality Evaluation)
// ──────────────────────────────────────────────────────────────

/**
 * Simulation phase: evaluates the quality of a node's response plan.
 * Uses Grammar-Guided JSON generation for structured evaluation.
 */
async function simulation(
  client: OpenAI,
  actualModel: string,
  node: MCTSNode,
  query: string
): Promise<number> {
  if (!node.content || node.content.length < 20) return 0;

  const simPrompt = `Evaluate this response PLAN for the given query.

QUERY: "${query}"

PLAN TO EVALUATE:
${node.content}

Rate this plan. Output JSON with:
- quality_score: 0.0-1.0 (how good is this plan?)
- expansion_potential: 0.0-1.0 (how much can it be improved?)
- reasoning: brief justification`;

  try {
    const constraintParams = buildConstrainedAPIParams({
      forceJsonOutput: true,
      outputSchema: MCTS_NODE_EVALUATION_SCHEMA,
      maxTokens: 200,
    });

    const isOpenRouter = actualModel.includes("/") || actualModel === "nvidia/llama-nemotron-rerank-vl-1b-v2:free";
    const response = await client.chat.completions.create({
      model: isOpenRouter ? actualModel : "deepseek-chat",
      messages: [
        { role: "system", content: "You are a plan quality evaluator. Output only valid JSON." },
        { role: "user", content: simPrompt },
      ],
      ...constraintParams,
    } as any);

    const raw = response.choices[0]?.message?.content || "{}";
    const result = processConstrainedOutput(raw, {
      forceJsonOutput: true,
      outputSchema: MCTS_NODE_EVALUATION_SCHEMA,
    });

    if (result.grammarValid && result.parsed) {
      const data = result.parsed as { quality_score: number; expansion_potential: number };
      node.qualityScore = data.quality_score || 0.5;
      node.expansionPotential = data.expansion_potential || 0.5;
      return node.qualityScore;
    }
  } catch (err) {
    console.warn("[MCTS] Simulation evaluation failed, using heuristic:", err);
  }

  // Heuristic fallback
  const heuristic = Math.min(node.content.length / 500, 1.0);
  node.qualityScore = heuristic;
  return heuristic;
}

// ──────────────────────────────────────────────────────────────
// Phase 4: Backpropagation
// ──────────────────────────────────────────────────────────────

/**
 * Backpropagation phase: updates visit counts and accumulated rewards
 * for all nodes from the simulated node back to the root.
 */
function backpropagation(node: MCTSNode, reward: number): void {
  let current: MCTSNode | undefined = node;
  while (current) {
    current.visits += 1;
    current.totalReward += reward;
    current = current.parent;
  }
}

// ──────────────────────────────────────────────────────────────
// Best Node Selection
// ──────────────────────────────────────────────────────────────

/**
 * Returns the best child of the root (highest average reward = most robust choice).
 * Note: We use average reward (not UCB1) for the final selection — exploitation only.
 */
function getBestNode(root: MCTSNode): MCTSNode {
  if (root.children.length === 0) return root;

  // Collect all leaf/deep nodes
  const allNodes: MCTSNode[] = [];
  const traverse = (node: MCTSNode) => {
    if (node.visits > 0) allNodes.push(node);
    node.children.forEach(traverse);
  };
  traverse(root);

  if (allNodes.length === 0) return root;

  // Best = highest average reward
  return allNodes.reduce((best, node) => {
    const avgReward = node.visits > 0 ? node.totalReward / node.visits : 0;
    const bestAvg = best.visits > 0 ? best.totalReward / best.visits : 0;
    return avgReward > bestAvg ? node : best;
  }, allNodes[0]);
}

// ──────────────────────────────────────────────────────────────
// Main MCTS Engine
// ──────────────────────────────────────────────────────────────

/**
 * Runs the full MCTS algorithm to find the optimal response plan.
 *
 * Each iteration:
 *   Selection → Expansion → Simulation → Backpropagation
 *
 * Returns the best plan found across all iterations.
 */
export async function runMCTS(
  client: OpenAI,
  actualModel: string,
  query: string,
  domain: string,
  config: MCTSConfig
): Promise<MCTSResult> {
  console.log(`[MCTS] Starting: iterations=${config.iterations}, maxDepth=${config.maxDepth}, C=${config.explorationConstant}`);

  // Initialize root node with empty content (will be expanded on first iteration)
  const root = createNode("", undefined);
  root.visits = 1; // Start with 1 to avoid division by zero
  let totalNodes = 1;

  // ── MCTS Main Loop ──
  for (let iter = 0; iter < config.iterations; iter++) {
    // Phase 1: Selection
    const selectedNode = selection(root, config.explorationConstant);

    // Phase 2: Expansion (if not at max depth)
    let nodeToSimulate = selectedNode;
    if (selectedNode.depth < config.maxDepth) {
      nodeToSimulate = await expansion(client, actualModel, selectedNode, query, config, domain);
      totalNodes++;
    }

    // Phase 3: Simulation
    const reward = await simulation(client, actualModel, nodeToSimulate, query);

    // Phase 4: Backpropagation
    backpropagation(nodeToSimulate, reward);

    console.log(`[MCTS] Iter ${iter + 1}/${config.iterations} — node depth: ${nodeToSimulate.depth}, reward: ${reward.toFixed(3)}`);
  }

  const bestNode = getBestNode(root);
  const avgReward = bestNode.visits > 0 ? bestNode.totalReward / bestNode.visits : 0;

  console.log(`[MCTS] Done. Best node score: ${avgReward.toFixed(3)}, total nodes: ${totalNodes}`);

  return {
    bestPlan: bestNode.content || "Generate a comprehensive, well-structured response.",
    root,
    totalNodes,
    iterations: config.iterations,
    bestNode,
  };
}


