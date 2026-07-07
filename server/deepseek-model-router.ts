import OpenAI from "openai";

export type DeepSeekTask = "reasoning" | "generation";

// OpenRouter Free Models mapping (July 2026):
// - meta-llama/llama-3.1-8b-instruct:free   → Fast lightweight model (Flash)
// - meta-llama/llama-3.3-70b-instruct:free   → Strong 70B model (Elite/Omni/Coder)
//
// All apex-* model aliases map to OpenRouter free models exclusively.
// DeepSeek API is no longer used.
const APEX_MODEL_ALIASES: Record<string, string> = {
  "apex-flash":   "google/gemini-2.5-flash",
  "apex-elite":   "google/gemini-2.5-flash",
  "apex-omni":    "google/gemini-2.5-flash",
  "apex-coder":   "google/gemini-2.5-flash",
  "apex-coder-pro": "google/gemini-2.5-pro",
  // Legacy fallbacks mapped to google/gemini-2.5-flash
  "deepseek-v4-flash": "google/gemini-2.5-flash",
  "deepseek-v4-pro":   "google/gemini-2.5-flash",
  "deepseek-chat":     "google/gemini-2.5-flash",
  "poolside/laguna-xs-2.1:free": "google/gemini-2.5-flash",
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

/**
 * Wrapper to automatically request continuation if the LLM output is truncated (finish_reason === "length").
 */
export async function executeCompletionWithContinuation(
  client: OpenAI,
  params: any,
  options?: any
): Promise<any> {
  let attempts = 0;
  const maxAttempts = 3;
  let accumulatedContent = "";
  let finalResponse: any = null;

  const currentParams = { ...params };
  const requestOptions = {
    timeout: 45000, // 45 seconds default timeout
    ...options,
  };

  while (attempts < maxAttempts) {
    const response = await client.chat.completions.create(currentParams, requestOptions);
    finalResponse = response;

    const choice = response.choices?.[0];
    const content = choice?.message?.content || "";
    accumulatedContent += content;

    if (choice?.finish_reason === "length") {
      attempts++;
      console.log(`[LLM Continuation] Response truncated by length limit. Starting continuation attempt ${attempts}...`);
      
      currentParams.messages = [
        ...currentParams.messages,
        { role: "assistant", content: content },
        { 
          role: "user", 
          content: "Your previous response was truncated due to the token output limit. Please continue generating the code or content from EXACTLY where you left off. Do NOT repeat any previous code or content, and do NOT wrap the response in markdown code blocks. Just output the remaining parts directly." 
        }
      ];
    } else {
      break;
    }
  }

  if (finalResponse && finalResponse.choices && finalResponse.choices[0]) {
    finalResponse.choices[0].message.content = accumulatedContent;
  }

  return finalResponse;
}
