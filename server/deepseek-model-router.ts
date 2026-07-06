export type DeepSeekTask = "reasoning" | "generation";

// OpenRouter Free Models mapping:
// - poolside/laguna-xs-2.1:free          → Fastest model (Flash)
// - nvidia/nemotron-3-super-120b-a12b:free → Strong, intelligent model (Pro/Elite)
// - nvidia/nemotron-3-ultra-550b-a55b:free → Most powerful 550B model (Omni/Unbound)
//
// All apex-* model aliases map to OpenRouter free models.
const APEX_MODEL_ALIASES: Record<string, string> = {
  "apex-flash":   "poolside/laguna-xs-2.1:free",
  "apex-pro":     "meta-llama/llama-3.3-70b-instruct:free",
  "apex-elite":   "meta-llama/llama-3.3-70b-instruct:free",
  "apex-omni":    "meta-llama/llama-3.3-70b-instruct:free",
  "apex-unbound": "meta-llama/llama-3.3-70b-instruct:free",
  // Legacy fallbacks mapped to free OpenRouter models
  "deepseek-v4-flash": "poolside/laguna-xs-2.1:free",
  "deepseek-v4-pro":   "meta-llama/llama-3.3-70b-instruct:free",
  "deepseek-chat":     "meta-llama/llama-3.3-70b-instruct:free",
};

export function isOfficialDeepSeekEndpoint(baseURL?: string): boolean {
  const url = baseURL || process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com";
  return url.includes("api.deepseek.com") || url.includes("openrouter.ai");
}

export function mapDeepSeekModelForTask(
  requestedModel: string,
  _task: DeepSeekTask,
  _baseURL?: string
): string {
  return APEX_MODEL_ALIASES[requestedModel] || requestedModel;
}

/**
 * Returns clean API parameters for OpenRouter/DeepSeek models.
 */
export function getDeepSeekRequestParams(
  model: string,
  temperature = 0.7,
  _enableThinking = false
): Record<string, any> {
  // OpenRouter free models: standard parameters
  return { temperature };
}

/**
 * Returns params optimized for structured JSON generation.
 * Low temperature for deterministic, valid JSON output.
 */
export function getDeepSeekStructuredParams(temperature = 0.3): Record<string, any> {
  return { temperature };
}

