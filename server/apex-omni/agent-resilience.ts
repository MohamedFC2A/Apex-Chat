/**
 * Apex Omni v6 — Agent Resilience Layer
 *
 * Production-grade execution wrapper for agent calls:
 * - Circuit breaker: if model X fails 3× → switch to fallback
 * - Retry with exponential backoff (1s → 2s → 4s)
 * - Per-agent configurable timeouts
 * - Fallback model chain: primary → secondary → emergency
 * - Structured telemetry output (latency, tokens, retries)
 */

import OpenAI from "openai";

// ── Types ──────────────────────────────────────────────────────────────────────

export interface AgentCallConfig {
  client: OpenAI;
  model: string;
  agentName: string;
  systemPrompt: string;
  userMessage: string;
  maxTokens?: number;
  temperature?: number;
  timeoutMs?: number;
  fallbackModels?: string[];
}

export interface AgentResult {
  content: string;
  latencyMs: number;
  tokensUsed: number;
  modelUsed: string;
  retries: number;
  confidence?: number;
  timedOut?: boolean;
}

// ── Circuit Breaker ────────────────────────────────────────────────────────────

interface CircuitState {
  failures: number;
  lastFailureMs: number;
  open: boolean;
}

const circuitBreakers = new Map<string, CircuitState>();
const CIRCUIT_THRESHOLD = 3;
const CIRCUIT_RESET_MS = 60_000; // 1 minute cool-down

function getCircuit(model: string): CircuitState {
  if (!circuitBreakers.has(model)) {
    circuitBreakers.set(model, { failures: 0, lastFailureMs: 0, open: false });
  }
  return circuitBreakers.get(model)!;
}

function recordSuccess(model: string): void {
  const circuit = getCircuit(model);
  circuit.failures = 0;
  circuit.open = false;
}

function recordFailure(model: string): void {
  const circuit = getCircuit(model);
  circuit.failures++;
  circuit.lastFailureMs = Date.now();
  if (circuit.failures >= CIRCUIT_THRESHOLD) {
    circuit.open = true;
    console.warn(`[Circuit Breaker] Model "${model}" circuit OPEN after ${circuit.failures} failures`);
  }
}

function isCircuitOpen(model: string): boolean {
  const circuit = getCircuit(model);
  if (!circuit.open) return false;
  // Auto-reset after cool-down
  if (Date.now() - circuit.lastFailureMs > CIRCUIT_RESET_MS) {
    circuit.open = false;
    circuit.failures = 0;
    console.log(`[Circuit Breaker] Model "${model}" circuit RESET (cool-down elapsed)`);
    return false;
  }
  return true;
}

// ── Model Fallback Chain ───────────────────────────────────────────────────────

const DEFAULT_FALLBACK_CHAIN = [
  "google/gemini-2.5-flash",
  "deepseek/deepseek-chat",
  "openai/gpt-4o-mini",
];

function buildFallbackChain(primary: string, extras?: string[]): string[] {
  const chain = [primary, ...(extras || []), ...DEFAULT_FALLBACK_CHAIN];
  // Deduplicate while preserving order
  return [...new Set(chain)];
}

// ── Per-Agent Timeout Defaults ─────────────────────────────────────────────────

const AGENT_TIMEOUTS: Record<string, number> = {
  "1-Analyst":      12_000,
  "2-Researcher":   12_000,
  "3-Critic":       8_000,
  "4-ExpertWriter": 30_000,
  "5-CodeSpecialist": 25_000,
  "6-MathSpecialist": 20_000,
  "7-FactChecker":  10_000,
  "8-Formatter":    25_000,
  "9-LanguageAgent": 15_000,
  "10-QA":          12_000,
  "11-Planner":     20_000,
  "12-Debate":      10_000,
  "13-Synthesis":   20_000,
  "14-Memory":      8_000,
  "15-Calibrator":  10_000,
  "16-MetaQA":      15_000,
};

function getAgentTimeout(agentName: string, override?: number): number {
  if (override) return override;
  // Match by prefix (e.g. "1-Analyst" → "1-Analyst")
  for (const [key, timeout] of Object.entries(AGENT_TIMEOUTS)) {
    if (agentName.startsWith(key.split("-")[0] + "-")) return timeout;
  }
  return 15_000;
}

// ── Sleep Helper ───────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── Resilient Agent Call ───────────────────────────────────────────────────────

const MAX_RETRIES = 3;
const BASE_BACKOFF_MS = 1000;

export async function callAgentResilient(
  config: AgentCallConfig
): Promise<AgentResult> {
  const start = Date.now();
  const fallbackChain = buildFallbackChain(config.model, config.fallbackModels);
  const timeoutMs = getAgentTimeout(config.agentName, config.timeoutMs);

  let retries = 0;
  let lastError: any = null;

  for (const model of fallbackChain) {
    if (isCircuitOpen(model)) {
      console.log(`[Resilience] Skipping "${model}" (circuit open), trying next...`);
      continue;
    }

    let timer: NodeJS.Timeout | null = null;
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const controller = new AbortController();
        timer = setTimeout(() => controller.abort(), timeoutMs);

        const requestStart = Date.now();

        const response = await config.client.chat.completions.create({
          model,
          messages: [
            { role: "system", content: config.systemPrompt },
            { role: "user", content: config.userMessage },
          ],
          max_tokens: config.maxTokens || 2048,
          temperature: config.temperature ?? 0.6,
          stream: false,
        } as any);

        if (timer) {
          clearTimeout(timer);
          timer = null;
        }

        const content = response.choices[0]?.message?.content || "";
        const tokensUsed = (response as any).usage?.total_tokens || 0;
        const latencyMs = Date.now() - requestStart;

        recordSuccess(model);

        if (content.length > 0) {
          console.log(
            `[Agent ${config.agentName}] ✅ Done on "${model}" (${latencyMs}ms, ${tokensUsed} tokens, retry=${attempt})`
          );

          return {
            content,
            latencyMs,
            tokensUsed,
            modelUsed: model,
            retries: attempt,
          };
        }

        // Empty content: treat as soft failure
        throw new Error("Empty content from model");

      } catch (err: any) {
        if (timer) {
          clearTimeout(timer);
          timer = null;
        }
        lastError = err;

        const isAbort = err.name === "AbortError";
        const isRateLimit = err.status === 429;
        const isAuthError = err.status === 401;

        if (isAuthError) {
          console.error(`[Resilience] Auth error on "${model}" - stopping`);
          recordFailure(model);
          break; // Don't retry auth errors
        }

        if (isAbort) {
          console.warn(`[Agent ${config.agentName}] ⏱️ Timeout on "${model}" after ${timeoutMs}ms`);
          recordFailure(model);
          break; // Don't retry timeouts on this model
        }

        if (isRateLimit) {
          const waitMs = BASE_BACKOFF_MS * Math.pow(2, attempt);
          console.warn(`[Agent ${config.agentName}] Rate limited on "${model}". Waiting ${waitMs}ms...`);
          await sleep(waitMs);
          continue;
        }

        // General error: exponential backoff
        if (attempt < MAX_RETRIES - 1) {
          const waitMs = BASE_BACKOFF_MS * Math.pow(2, attempt);
          console.warn(
            `[Agent ${config.agentName}] ⚠️ Attempt ${attempt + 1} failed on "${model}": ${err.message}. Retrying in ${waitMs}ms...`
          );
          await sleep(waitMs);
        } else {
          recordFailure(model);
          retries += attempt + 1;
        }
      }
    }
  }

  // All fallbacks exhausted
  const totalLatency = Date.now() - start;
  console.error(
    `[Agent ${config.agentName}] ❌ All fallbacks exhausted after ${retries} retries in ${totalLatency}ms`
  );

  return {
    content: "",
    latencyMs: totalLatency,
    tokensUsed: 0,
    modelUsed: fallbackChain[0],
    retries,
    timedOut: true,
  };
}

// ── Batch Resilient Calls ──────────────────────────────────────────────────────

/**
 * Run multiple agent calls in parallel with resilience.
 * Never throws — failed agents return empty string.
 */
export async function callAgentsBatch(
  calls: AgentCallConfig[]
): Promise<AgentResult[]> {
  return Promise.all(
    calls.map((config) =>
      callAgentResilient(config).catch((err) => ({
        content: "",
        latencyMs: 0,
        tokensUsed: 0,
        modelUsed: config.model,
        retries: 0,
        timedOut: true,
      }))
    )
  );
}

// ── Circuit Breaker Status ─────────────────────────────────────────────────────

export function getCircuitBreakerStatus(): Record<string, CircuitState> {
  const status: Record<string, CircuitState> = {};
  for (const [model, state] of circuitBreakers) {
    status[model] = { ...state };
  }
  return status;
}
