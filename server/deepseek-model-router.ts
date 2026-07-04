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

/**
 * Returns the correct API parameters for DeepSeek V4 models.
 *
 * IMPORTANT: For DeepSeek OpenAI-compatible SDK:
 * - `reasoning_effort` must be inside `extra_body`, NOT at top-level.
 *   (Top-level reasoning_effort is silently ignored and can cause 400 errors on some API versions.)
 * - `temperature` is ignored when thinking mode is enabled.
 * - Both `deepseek-v4-pro` and `deepseek-v4-flash` support the same parameter structure.
 */
export function getDeepSeekRequestParams(
  model: string,
  temperature = 0.7,
  enableThinking = false
): Record<string, any> {
  // deepseek-v4-pro: Always use thinking mode with max reasoning effort
  if (model === "deepseek-v4-pro") {
    return {
      temperature: 0.6,
      extra_body: {
        thinking: { type: "enabled" },
        reasoning_effort: "high",
      },
    };
  }

  // deepseek-v4-flash: supports standard parameters and optional thinking mode
  if (model === "deepseek-v4-flash") {
    if (enableThinking) {
      return {
        temperature: 0.6,
        extra_body: {
          thinking: { type: "enabled" },
          reasoning_effort: "high",
        },
      };
    } else {
      return {
        temperature,
        extra_body: {
          thinking: { type: "disabled" },
        },
      };
    }
  }

  return { temperature };
}

/**
 * Returns DeepSeek params optimized for structured JSON generation (PDF/MCQ).
 * Always uses flash model to maximize output tokens and avoid reasoning token overhead.
 * Thinking is disabled to prevent truncated JSON from CoT reasoning tokens.
 */
export function getDeepSeekStructuredParams(temperature = 0.3): Record<string, any> {
  return {
    temperature,
    extra_body: {
      thinking: { type: "disabled" },
    },
  };
}
