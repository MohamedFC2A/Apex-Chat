/**
 * Apex Omni v6 — In-Context Memory Agent (Agent 14)
 *
 * Extracts key facts from conversation history and builds a
 * "working memory" context block injected into all other agent prompts.
 *
 * Activation: conversationHistory.length > 3
 * Persistence: In-context (no external DB needed)
 */

import OpenAI from "openai";
import { callAgentResilient } from "./agent-resilience.js";

// ── Memory Types ───────────────────────────────────────────────────────────────

export interface MemoryEntry {
  fact: string;
  category: "user_preference" | "established_fact" | "context" | "decision";
  confidence: number;
}

export interface WorkingMemory {
  entries: MemoryEntry[];
  summary: string;
  contextBlock: string;
}

// ── Simple Rule-Based Extraction (fast path) ───────────────────────────────────

function extractRuleBasedMemory(
  history: Array<{ role: string; content: string }>
): string[] {
  const facts: string[] = [];

  // Look for patterns that indicate important context
  const PATTERNS = [
    /(?:my name is|أسمي|اسمي)\s+([^\s,\.]+)/gi,
    /(?:i am|i'm|أنا)\s+(?:a\s+)?([^\s,\.]{3,40})/gi,
    /(?:i (?:want|need|prefer)|أريد|أحتاج)\s+([^\.]{10,100})/gi,
    /(?:don't|do not|لا تستخدم|لا تضع)\s+([^\.]{5,80})/gi,
    /(?:always|never|دائماً|أبداً)\s+([^\.]{5,80})/gi,
  ];

  for (const msg of history.slice(-10)) {
    if (msg.role !== "user") continue;
    for (const pattern of PATTERNS) {
      pattern.lastIndex = 0;
      const matches = Array.from(msg.content.matchAll(pattern));
      for (const match of matches) {
        if (match[1] && match[1].length > 3) {
          facts.push(match[0].trim());
        }
      }
    }
  }

  return facts.slice(0, 10);
}

// ── LLM-Based Memory Extraction (smart path) ──────────────────────────────────

export async function runMemoryAgent(
  client: OpenAI,
  model: string,
  conversationHistory: Array<{ role: string; content: string }>,
  currentQuery: string
): Promise<WorkingMemory> {
  if (conversationHistory.length === 0) {
    return { entries: [], summary: "", contextBlock: "" };
  }

  // Fast path: short history — use rule-based extraction
  if (conversationHistory.length <= 3) {
    const facts = extractRuleBasedMemory(conversationHistory);
    const contextBlock =
      facts.length > 0
        ? `\n=== CONVERSATION MEMORY ===\nKey context from earlier:\n${facts.map((f) => `- ${f}`).join("\n")}\n`
        : "";
    return {
      entries: facts.map((f) => ({ fact: f, category: "context", confidence: 0.7 })),
      summary: facts.join("; "),
      contextBlock,
    };
  }

  // Smart path: LLM-based extraction
  const historyText = conversationHistory
    .slice(-12)
    .map((m) => `[${m.role.toUpperCase()}]: ${m.content.slice(0, 300)}`)
    .join("\n\n");

  const result = await callAgentResilient({
    client,
    model,
    agentName: "14-Memory",
    systemPrompt: `You are Agent 14 (Memory Agent). Your role is to extract key facts, user preferences, decisions, and important context from conversation history that would help answer the current query better.

Extract only information that is RELEVANT to the current query. Focus on:
1. User preferences (language, format, style)
2. Established facts (agreed upon information)
3. Previous decisions (choices already made)
4. Important context (what the user is building/working on)

Respond ONLY with valid JSON:
{
  "entries": [
    {"fact": "...", "category": "user_preference|established_fact|context|decision", "confidence": 0.0-1.0}
  ],
  "summary": "One sentence summary of relevant context"
}`,
    userMessage: `Current query: "${currentQuery}"

Conversation history:
${historyText}

Extract the most relevant memory entries (max 8 items).`,
    maxTokens: 600,
    temperature: 0.3,
    timeoutMs: 8000,
  });

  try {
    const content = result.content;
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON found");

    const parsed = JSON.parse(jsonMatch[0]);
    const entries: MemoryEntry[] = (parsed.entries || []).map((e: any) => ({
      fact: String(e.fact || ""),
      category: e.category || "context",
      confidence: Math.min(1, Math.max(0, Number(e.confidence) || 0.7)),
    })).filter((e: MemoryEntry) => e.fact.length > 5);

    const summary = String(parsed.summary || "").slice(0, 200);

    const contextBlock =
      entries.length > 0
        ? `\n=== CONVERSATION MEMORY ===\n${summary ? `Context: ${summary}\n` : ""}Key facts:\n${entries
            .filter((e) => e.confidence >= 0.6)
            .map((e) => `- [${e.category}] ${e.fact}`)
            .join("\n")}\n`
        : "";

    console.log(`[Memory Agent] Extracted ${entries.length} memory entries`);

    return { entries, summary, contextBlock };
  } catch {
    // Fallback to rule-based
    const facts = extractRuleBasedMemory(conversationHistory);
    const contextBlock =
      facts.length > 0
        ? `\n=== CONVERSATION MEMORY ===\nContext from previous messages:\n${facts.map((f) => `- ${f}`).join("\n")}\n`
        : "";

    return {
      entries: facts.map((f) => ({ fact: f, category: "context" as const, confidence: 0.7 })),
      summary: "",
      contextBlock,
    };
  }
}
