export type DeepSeekTask = "reasoning" | "generation";

// DeepSeek Official API model identifiers (real names as of 2025/2026):
// - deepseek-chat        → V3 (fast, efficient, general purpose)
// - deepseek-reasoner    → R1 (advanced CoT reasoning, slower)
//
// All apex-* model aliases map to deepseek-chat for stability and cost efficiency.
// For queries requiring deep reasoning, the pipeline itself handles multi-agent orchestration.
const APEX_MODEL_ALIASES: Record<string, string> = {
  "apex-flash":   "deepseek-chat",
  "apex-pro":     "deepseek-chat",
  "apex-elite":   "deepseek-chat",
  "apex-omni":    "deepseek-chat",
  "apex-unbound": "deepseek-chat",
  // Legacy fallbacks
  "deepseek-v4-flash": "deepseek-chat",
  "deepseek-v4-pro":   "deepseek-chat",
};

export function isOfficialDeepSeekEndpoint(baseURL?: string): boolean {
  return (baseURL || process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com").includes("api.deepseek.com");
}

export function mapDeepSeekModelForTask(
  requestedModel: string,
  _task: DeepSeekTask,
  _baseURL?: string
): string {
  return APEX_MODEL_ALIASES[requestedModel] || requestedModel;
}

/**
 * Returns clean API parameters for DeepSeek models.
 *
 * CRITICAL: DeepSeek official API does NOT support:
 * - `logit_bias` (causes 400 errors)
 * - `extra_body.thinking` (not a real parameter on their API)
 * - `reasoning_effort` (not supported)
 *
 * deepseek-chat: standard chat completion with temperature control
 * deepseek-reasoner: reasoning built-in, does NOT support temperature param in some versions
 */
export function getDeepSeekRequestParams(
  model: string,
  temperature = 0.7,
  _enableThinking = false
): Record<string, any> {
  const resolvedModel = APEX_MODEL_ALIASES[model] || model;

  if (resolvedModel === "deepseek-reasoner") {
    // Reasoner model: reasoning is always on, temperature not needed
    return {};
  }

  // deepseek-chat and all others: standard params
  return { temperature };
}

/**
 * Returns DeepSeek params optimized for structured JSON generation (PDF/MCQ).
 * Low temperature for deterministic, valid JSON output.
 */
export function getDeepSeekStructuredParams(temperature = 0.3): Record<string, any> {
  return { temperature };
}
