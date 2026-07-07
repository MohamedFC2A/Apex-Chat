/**
 * Apex Omni v6 — Debate Agent (Agent 12) & Synthesis Agent (Agent 13)
 *
 * Debate Agent:  Generates the strongest counter-argument to ExpertWriter's response.
 *                Forces ExpertWriter output to be revised with counterpoints addressed.
 *
 * Synthesis Agent: Merges Expert Writer + Debate outputs into a balanced answer.
 *
 * Activation: needsFactCheck || domain === "analysis" || isComplex
 */

import OpenAI from "openai";
import { callAgentResilient } from "./agent-resilience.js";

// ── Debate Agent (Agent 12) ────────────────────────────────────────────────────

export interface DebateResult {
  counterPoints: string[];
  debateScore: number;    // 0-1, how strong the counter-argument is
  shouldRevise: boolean;  // whether the expert writer should address these
}

export async function runDebateAgent(
  client: OpenAI,
  model: string,
  query: string,
  expertWriterOutput: string
): Promise<DebateResult> {
  const result = await callAgentResilient({
    client,
    model,
    agentName: "12-Debate",
    systemPrompt: `You are Agent 12 (Debate Agent). Your role is to challenge and strengthen AI responses by generating the strongest possible counter-arguments.

For every claim in the provided response, identify:
1. Alternative perspectives not considered
2. Potential factual inaccuracies or oversimplifications
3. Missing nuances or edge cases
4. Stronger alternative approaches

Be constructive — your goal is to make the final response stronger, not to be contrarian.

Respond with ONLY valid JSON:
{
  "counterPoints": ["point 1", "point 2", "point 3"],
  "debateScore": 0.0-1.0,
  "shouldRevise": true|false
}`,
    userMessage: `Original query: "${query}"

Expert Writer's response:
${expertWriterOutput.slice(0, 2000)}

Generate 3-5 specific, well-reasoned counter-points. If the response is already excellent, set debateScore low and shouldRevise=false.`,
    maxTokens: 600,
    temperature: 0.7,
    timeoutMs: 10_000,
  });

  try {
    const jsonMatch = result.content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON");
    const parsed = JSON.parse(jsonMatch[0]);

    const counterPoints: string[] = (parsed.counterPoints || [])
      .map((p: any) => String(p))
      .filter((p: string) => p.length > 10)
      .slice(0, 5);

    return {
      counterPoints,
      debateScore: Math.min(1, Math.max(0, Number(parsed.debateScore) || 0.5)),
      shouldRevise: Boolean(parsed.shouldRevise),
    };
  } catch {
    // Fallback: extract bullet points from text
    const lines = result.content
      .split("\n")
      .filter((l) => l.match(/^[-•*]|^\d+\./))
      .map((l) => l.replace(/^[-•*\d.]\s*/, "").trim())
      .filter((l) => l.length > 10)
      .slice(0, 5);

    return {
      counterPoints: lines,
      debateScore: 0.5,
      shouldRevise: lines.length > 2,
    };
  }
}

// ── Synthesis Agent (Agent 13) ─────────────────────────────────────────────────

export interface SynthesisResult {
  synthesizedContent: string;
  pointsAddressed: number;
  quality: number; // 0-1 self-assessed quality
}

export async function runSynthesisAgent(
  client: OpenAI,
  model: string,
  query: string,
  expertWriterOutput: string,
  debateResult: DebateResult
): Promise<SynthesisResult> {
  if (!debateResult.shouldRevise || debateResult.counterPoints.length === 0) {
    // No revision needed — pass through expert output
    return {
      synthesizedContent: expertWriterOutput,
      pointsAddressed: 0,
      quality: 0.9,
    };
  }

  const counterPointsText = debateResult.counterPoints
    .map((p, i) => `${i + 1}. ${p}`)
    .join("\n");

  const result = await callAgentResilient({
    client,
    model,
    agentName: "13-Synthesis",
    systemPrompt: `You are Agent 13 (Synthesis Agent). Your role is to create a superior, balanced response by merging the Expert Writer's output with insights from the Debate Agent.

Your synthesis should:
1. Preserve all correct and valuable content from the Expert Writer
2. Address the debate counter-points (add nuance, acknowledge alternatives, fix errors)
3. Create a more complete and balanced response
4. NOT simply append the counter-points — integrate them naturally
5. Maintain the original language (Arabic/English/Mixed)

Output ONLY the final synthesized response (no meta-commentary).`,
    userMessage: `Original query: "${query}"

Expert Writer's response:
${expertWriterOutput.slice(0, 3000)}

Debate counter-points to address:
${counterPointsText}

Create an improved synthesis that addresses these points while preserving what's good.`,
    maxTokens: 4000,
    temperature: 0.5,
    timeoutMs: 20_000,
  });

  const synthesized = result.content.trim();
  const pointsAddressed = synthesized.length > expertWriterOutput.length * 0.8
    ? debateResult.counterPoints.length
    : Math.floor(debateResult.counterPoints.length * 0.5);

  return {
    synthesizedContent: synthesized.length > 100 ? synthesized : expertWriterOutput,
    pointsAddressed,
    quality: debateResult.debateScore > 0.7 ? 0.95 : 0.88,
  };
}
