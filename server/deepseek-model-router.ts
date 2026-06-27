export type DeepSeekTask = "reasoning" | "generation";

const APEX_MODEL_ALIASES: Record<string, string> = {
  "apex-flash": "deepseek-chat",
  "apex-pro": "deepseek-reasoner",
  "apex-elite": "deepseek-reasoner",
  "apex-omni": "deepseek-reasoner",
  "apex-unbound": "deepseek-reasoner",
};

const OFFICIAL_DEEPSEEK_ALIASES: Record<string, Record<DeepSeekTask, string>> = {
  "deepseek-chat": {
    reasoning: "deepseek-v4-flash",
    generation: "deepseek-v4-flash",
  },
  "deepseek-reasoner": {
    reasoning: "deepseek-v4-pro",
    generation: "deepseek-v4-pro",
  },
};

export function isOfficialDeepSeekEndpoint(baseURL?: string): boolean {
  return (baseURL || process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com/v1").includes("api.deepseek.com");
}

export function mapDeepSeekModelForTask(
  requestedModel: string,
  task: DeepSeekTask,
  baseURL?: string
): string {
  return APEX_MODEL_ALIASES[requestedModel] || requestedModel;
}

export function getDeepSeekRequestParams(model: string, temperature = 0.7): Record<string, any> {
  if (model === "deepseek-reasoner") {
    return {};
  }

  if (model === "deepseek-v4-pro" || model === "deepseek-v4-flash" || model.includes("v4")) {
    return {
      reasoning_effort: "max",
      extra_body: {
        thinking: {
          type: "enabled",
        },
      },
    };
  }

  return { temperature };
}
