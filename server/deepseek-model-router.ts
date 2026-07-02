export type DeepSeekTask = "reasoning" | "generation";

// DeepSeek Official API supports only two model identifiers:
// - deepseek-chat      (fast inference, V3 non-reasoning)
// - deepseek-reasoner  (deep chain-of-thought reasoning, R1)
const APEX_MODEL_ALIASES: Record<string, string> = {
  "apex-flash": "deepseek-chat",
  "apex-pro": "deepseek-reasoner",
  "apex-elite": "deepseek-reasoner",
  "apex-omni": "deepseek-chat",
  "apex-unbound": "deepseek-reasoner",
};

export function isOfficialDeepSeekEndpoint(baseURL?: string): boolean {
  return (baseURL || process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com/v1").includes("api.deepseek.com");
}

export function mapDeepSeekModelForTask(
  requestedModel: string,
  _task: DeepSeekTask,
  _baseURL?: string
): string {
  // Always resolve to one of the two real DeepSeek API model IDs
  return APEX_MODEL_ALIASES[requestedModel] || requestedModel;
}

export function getDeepSeekRequestParams(model: string, temperature = 0.7): Record<string, any> {
  // deepseek-reasoner: does NOT support temperature or top_p
  if (model === "deepseek-reasoner") {
    return {};
  }

  // deepseek-chat: supports temperature
  return { temperature };
}
