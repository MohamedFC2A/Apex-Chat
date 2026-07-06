export type DeepSeekTask = "reasoning" | "generation";

// OpenRouter Free Models mapping:
// - poolside/laguna-xs-2.1:free    → Fastest model
// - openai/gpt-oss-120b:free        → Strong, intelligent model
//
// All apex-* model aliases map to OpenRouter free models.
const APEX_MODEL_ALIASES: Record<string, string> = {
  "apex-flash":   "poolside/laguna-xs-2.1:free",
  "apex-pro":     "openai/gpt-oss-120b:free",
  "apex-elite":   "openai/gpt-oss-120b:free",
  "apex-omni":    "openai/gpt-oss-120b:free",
  "apex-unbound": "openai/gpt-oss-120b:free",
  // Legacy fallbacks mapped to free OpenRouter models
  "deepseek-v4-flash": "poolside/laguna-xs-2.1:free",
  "deepseek-v4-pro":   "openai/gpt-oss-120b:free",
  "deepseek-chat":     "openai/gpt-oss-120b:free",
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

