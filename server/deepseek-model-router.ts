export type DeepSeekTask = "reasoning" | "generation";

// DeepSeek Official API (V4 Series) supports two main model identifiers:
// - deepseek-v4-flash  (fast, efficient, non-reasoning by default)
// - deepseek-v4-pro    (larger, reasoning model with CoT enabled)
const APEX_MODEL_ALIASES: Record<string, string> = {
  "apex-flash": "deepseek-v4-flash",
  "apex-pro": "deepseek-v4-pro",
  "apex-elite": "deepseek-v4-pro",
  "apex-omni": "deepseek-v4-pro",
  "apex-unbound": "deepseek-v4-pro",
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

export function getDeepSeekRequestParams(
  model: string,
  temperature = 0.7,
  enableThinking = false
): Record<string, any> {
  // deepseek-v4-pro: Chain of Thought is always enabled by default
  if (model === "deepseek-v4-pro") {
    return {
      reasoning_effort: "max",
      extra_body: {
        thinking: {
          type: "enabled",
        },
      },
    };
  }

  // deepseek-v4-flash: supports standard parameters and optional thinking mode
  if (model === "deepseek-v4-flash") {
    if (enableThinking) {
      return {
        reasoning_effort: "high",
        extra_body: {
          thinking: {
            type: "enabled",
          },
        },
      };
    } else {
      return {
        temperature,
        extra_body: {
          thinking: {
            type: "disabled",
          },
        },
      };
    }
  }

  return { temperature };
}
