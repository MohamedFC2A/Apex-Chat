export type DeepSeekTask = "reasoning" | "generation";

// OpenRouter Free Models mapping (July 2026):
// - meta-llama/llama-3.1-8b-instruct:free   → Fast lightweight model (Flash)
// - meta-llama/llama-3.3-70b-instruct:free   → Strong 70B model (Pro/Elite/Omni/Unbound)
//
// All apex-* model aliases map to OpenRouter free models exclusively.
// DeepSeek API is no longer used.
const APEX_MODEL_ALIASES: Record<string, string> = {
  "apex-flash":   "inclusionai/ling-2.6-flash",
  "apex-pro":     "inclusionai/ling-2.6-flash",
  "apex-elite":   "inclusionai/ling-2.6-flash",
  "apex-omni":    "inclusionai/ling-2.6-flash",
  "apex-unbound": "inclusionai/ling-2.6-flash",
  // Legacy fallbacks mapped to inclusionai/ling-2.6-flash
  "deepseek-v4-flash": "inclusionai/ling-2.6-flash",
  "deepseek-v4-pro":   "inclusionai/ling-2.6-flash",
  "deepseek-chat":     "inclusionai/ling-2.6-flash",
  "poolside/laguna-xs-2.1:free": "inclusionai/ling-2.6-flash",
};

export function isOfficialDeepSeekEndpoint(baseURL?: string): boolean {
  // Always using OpenRouter now
  return true;
}

export function mapDeepSeekModelForTask(
  requestedModel: string,
  _task: DeepSeekTask,
  baseURL?: string
): string {
  return APEX_MODEL_ALIASES[requestedModel] || requestedModel;
}

/**
 * Returns clean API parameters for OpenRouter models.
 */
export function getDeepSeekRequestParams(
  model: string,
  temperature = 0.7,
  _enableThinking = false
): Record<string, any> {
  // OpenRouter free models: standard parameters only
  return { temperature };
}

/**
 * Returns params optimized for structured JSON generation.
 * Low temperature for deterministic, valid JSON output.
 */
export function getDeepSeekStructuredParams(temperature = 0.3): Record<string, any> {
  return { temperature };
}
