/**
 * Apex Omni v6 — Meta-QA Agent (Agent 16) & Calibrator Agent (Agent 15)
 *
 * Meta-QA Agent:   Final metacognitive review — does the response actually answer the question?
 *                  Checks all user intents, contradictions, format, confidence.
 *                  Decision: Pass | Revise(reason) | Regenerate(reason)
 *
 * Calibrator Agent: Self-calibrates confidence levels on all factual claims.
 *                   Annotates response with [HIGH/MED/LOW confidence] markers.
 */

import OpenAI from "openai";
import { callAgentResilient } from "./agent-resilience.js";

// ── Meta-QA Types ──────────────────────────────────────────────────────────────

export type MetaQADecision = "pass" | "revise" | "regenerate";

export interface MetaQAResult {
  decision: MetaQADecision;
  finalContent: string;
  reason?: string;
  intentsAddressed: number;
  overallQuality: number; // 0-1
  checks: {
    completeness: boolean;
    accuracy: boolean;
    formatting: boolean;
    length: boolean;
    language: boolean;
  };
}

// ── Meta-QA Agent (Agent 16) ───────────────────────────────────────────────────

export async function runMetaQAAgent(
  client: OpenAI,
  model: string,
  query: string,
  response: string,
  isArabic: boolean
): Promise<MetaQAResult> {
  const checks = {
    completeness: response.length > 200,
    accuracy: !/(error|sorry|unable|cannot|I don't know)/i.test(response.slice(0, 100)),
    formatting: !/broken|undefined|null/.test(response),
    length: response.length >= 150 && response.length <= 30_000,
    language: isArabic
      ? /[\u0600-\u06FF]/.test(response)
      : /[a-zA-Z]/.test(response),
  };

  const passCount = Object.values(checks).filter(Boolean).length;
  const passRate = passCount / Object.keys(checks).length;

  // Fast pass for clearly good responses (saves tokens)
  if (passRate === 1 && response.length > 500 && response.length < 15_000) {
    return {
      decision: "pass",
      finalContent: response,
      intentsAddressed: 1,
      overallQuality: 0.92,
      checks,
    };
  }

  // LLM meta-review for borderline cases
  const result = await callAgentResilient({
    client,
    model,
    agentName: "16-MetaQA",
    systemPrompt: `You are Agent 16 (Meta-QA). Your role is the final quality gate — critically evaluate whether this AI response genuinely answers the user's question.

Review checklist:
1. COMPLETENESS: Does it fully address all parts of the query?
2. ACCURACY: Are there obvious factual errors or contradictions?
3. FORMAT: Is the markdown clean and appropriate for this type of query?
4. LENGTH: Is the response appropriately sized (not too short, not padded)?
5. LANGUAGE: Does it match the user's language (Arabic/English)?
6. INTENTS: Does it address all user intents (explain + compare + code = 3 intents)?

Decision rules:
- "pass": Response is good quality → return it unchanged
- "revise": Minor issues (wrong format, missing section) → fix and return
- "regenerate": Major issues (doesn't answer the question) → flag for regeneration

Respond ONLY with valid JSON:
{
  "decision": "pass|revise|regenerate",
  "reason": "brief explanation if not pass",
  "intentsAddressed": 1-5,
  "overallQuality": 0.0-1.0,
  "revisedContent": "... (only if decision=revise, include the fixed response)"
}`,
    userMessage: `User query: "${query}"

Response to evaluate:
${response.slice(0, 4000)}

Make your meta-QA decision.`,
    maxTokens: 4500,
    temperature: 0.2,
    timeoutMs: 15_000,
  });

  try {
    const jsonMatch = result.content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON");
    const parsed = JSON.parse(jsonMatch[0]);

    const decision: MetaQADecision = ["pass", "revise", "regenerate"].includes(parsed.decision)
      ? parsed.decision
      : "pass";

    let finalContent = response;
    if (decision === "revise" && parsed.revisedContent && parsed.revisedContent.length > 100) {
      finalContent = String(parsed.revisedContent);
    }

    return {
      decision,
      finalContent,
      reason: parsed.reason,
      intentsAddressed: Number(parsed.intentsAddressed) || 1,
      overallQuality: Math.min(1, Math.max(0, Number(parsed.overallQuality) || 0.8)),
      checks,
    };
  } catch {
    // Fallback: pass through
    return {
      decision: "pass",
      finalContent: response,
      intentsAddressed: 1,
      overallQuality: passRate,
      checks,
    };
  }
}

// ── Calibrator Agent (Agent 15) ────────────────────────────────────────────────

export interface CalibrationResult {
  calibratedContent: string;
  highConfidenceClaims: number;
  medConfidenceClaims: number;
  lowConfidenceClaims: number;
  overallConfidence: number;
}

export async function runCalibratorAgent(
  client: OpenAI,
  model: string,
  query: string,
  response: string
): Promise<CalibrationResult> {
  // Only calibrate fact-heavy responses
  const hasFactualContent = /(statistics|data|study|research|percent|million|billion|year|history|was founded|was born|invented)/i.test(response);

  if (!hasFactualContent) {
    return {
      calibratedContent: response,
      highConfidenceClaims: 0,
      medConfidenceClaims: 0,
      lowConfidenceClaims: 0,
      overallConfidence: 0.85,
    };
  }

  const result = await callAgentResilient({
    client,
    model,
    agentName: "15-Calibrator",
    systemPrompt: `You are Agent 15 (Calibrator). Your role is to self-calibrate confidence levels for factual claims in AI responses.

For each factual claim, assess:
- [HIGH]: Well-established fact, unlikely to change, very reliable
- [MED]: Generally accurate but may have nuances or recent updates
- [LOW]: Less certain, may vary by source, recommend verification

Rules:
1. Only annotate actual factual claims, not opinions or recommendations
2. Keep annotations inline after the claim, in parentheses: (confidence: HIGH)
3. Don't add annotations to obviously subjective content
4. Don't change the structure or language of the response

Respond with the annotated version of the response ONLY.`,
    userMessage: `Query: "${query}"

Response to calibrate:
${response.slice(0, 3000)}

Return the response with confidence annotations added to factual claims.`,
    maxTokens: 3500,
    temperature: 0.2,
    timeoutMs: 10_000,
  });

  const calibrated = result.content.trim().length > 100 ? result.content.trim() : response;

  const highCount = (calibrated.match(/\(confidence: HIGH\)/gi) || []).length;
  const medCount = (calibrated.match(/\(confidence: MED\)/gi) || []).length;
  const lowCount = (calibrated.match(/\(confidence: LOW\)/gi) || []).length;
  const total = highCount + medCount + lowCount;

  const overallConfidence = total > 0
    ? (highCount * 1.0 + medCount * 0.7 + lowCount * 0.4) / total
    : 0.85;

  return {
    calibratedContent: calibrated,
    highConfidenceClaims: highCount,
    medConfidenceClaims: medCount,
    lowConfidenceClaims: lowCount,
    overallConfidence,
  };
}
