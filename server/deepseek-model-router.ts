export type DeepSeekTask = "reasoning" | "generation";

// OpenRouter Free Models mapping (July 2026):
// - meta-llama/llama-3.1-8b-instruct:free   → Fast lightweight model (Flash)
// - meta-llama/llama-3.3-70b-instruct:free   → Strong 70B model (Pro/Elite/Omni/Unbound)
//
// All apex-* model aliases map to OpenRouter free models exclusively.
// DeepSeek API is no longer used.
const APEX_MODEL_ALIASES: Record<string, string> = {
  "apex-flash":   "poolside/laguna-xs.2:free",
  "apex-pro":     "openai/gpt-oss-120b:free",
  "apex-elite":   "openai/gpt-oss-120b:free",
  "apex-omni":    "openai/gpt-oss-120b:free",
  "apex-unbound": "openai/gpt-oss-120b:free",
  // Legacy fallbacks mapped to free OpenRouter models
  "deepseek-v4-flash": "poolside/laguna-xs.2:free",
  "deepseek-v4-pro":   "openai/gpt-oss-120b:free",
  "deepseek-chat":     "openai/gpt-oss-120b:free",
  "poolside/laguna-xs-2.1:free": "poolside/laguna-xs.2:free",
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
