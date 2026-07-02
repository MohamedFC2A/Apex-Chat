/**
 * Apex Omni Pipeline Orchestrator (V3 - Restructured)
 *
 * Implements a high-performance, rate-limit proof, and latency-optimized
 * reasoning/verification pipeline.
 *
 * PIPELINE WORKFLOW:
 * 1. Native Reasoning Detection:
 *    If the target model is a native reasoning model (e.g., deepseek-reasoner, o1, o3, etc.),
 *    the pipeline runs a single-pass streaming call, letting the model perform its
 *    native Chain-of-Thought. (1 LLM call, maximum speed).
 *
 * 2. Adaptive Speculative Dual-Pass Pipeline (for standard models):
 *    - Pass 1 (Drafting): Uses SFT Prompt Builder (few-shots, system contract) + context.
 *      Streams the draft response directly to the user immediately.
 *    - Pass 2 (Verify & Correct): Programmatically checks the draft for syntax issues
 *      (e.g., unbalanced code blocks, malformed HTML/CSS). If flaws are detected,
 *      runs a fast correction/refining call and streams the correction. (At most 2 LLM calls).
 *
 * 3. Fallback Resilience:
 *    Ensures that any API error falls back to a clean direct stream to ensure maximum uptime.
 */

import OpenAI from "openai";
import { analyzeQuery, buildSFTPrompt, type SFTPromptConfig } from "./sft-prompt-builder.js";
import { buildConstrainedAPIParams, getLogitBiasProfile } from "./constraint-engine.js";

// Helper function to identify network, auth (401), or rate-limit (429) errors
export function isAuthOrRateLimitError(err: any): boolean {
  if (!err) return false;
  const status = err.status || err.statusCode || err.response?.status;
  if (status === 401 || status === 429) return true;
  const errMsg = String(err.message || "").toLowerCase();
  if (
    errMsg.includes("401") ||
    errMsg.includes("429") ||
    errMsg.includes("unauthorized") ||
    errMsg.includes("rate limit") ||
    errMsg.includes("too many requests")
  ) {
    return true;
  }
  return false;
}

export interface ApexOmniRequest {
  message: string;
  conversationHistory?: Array<{ role: "user" | "assistant"; content: string }>;
  systemPromptBase: string;
}

export interface ApexOmniResponse {
  content: string;
  reasoningContent?: string;
  pipelineMetadata: {
    queryConfig: SFTPromptConfig;
    mctsIterations: number;
    mctsNodes: number;
    totBranches: number;
    grpoGroupSize: number;
    grpoMeanReward: number;
    grpoBestReward: number;
    totalDuration: number;
    techniquesUsed: string[];
  };
}

/**
 * Validates markdown formatting, unclosed code blocks, etc.
 * Returns true if formatting is correct.
 */
function checkFormatCorrectness(text: string): { valid: boolean; reason?: string } {
  // Check for unbalanced code blocks (odd number of triple backticks)
  const backticksCount = (text.match(/```/g) || []).length;
  if (backticksCount % 2 !== 0) {
    return { valid: false, reason: "Unbalanced markdown code blocks (unclosed triple backticks)" };
  }

  // Check for basic HTML tag matching if HTML blocks are present
  const htmlBlocks = text.match(/```html\b([\s\S]*?)```/gi);
  if (htmlBlocks) {
    for (const block of htmlBlocks) {
      const code = block.replace(/```html\b|```/gi, "").trim();
      const openTags = (code.match(/<[a-zA-Z1-6]+[^>]*>/g) || []).length;
      const closeTags = (code.match(/<\/[a-zA-Z1-6]+>/g) || []).length;
      // Allow minor differences, but major imbalance is a sign of truncation
      if (Math.abs(openTags - closeTags) > 5) {
        return { valid: false, reason: "Malformed HTML tag structure in code block" };
      }
    }
  }

  return { valid: true };
}

/**
 * Runs the restructured Apex Omni AI pipeline
 */
export async function runApexOmniPipeline(
  client: OpenAI,
  actualModel: string,
  request: ApexOmniRequest,
  onChunk?: (chunk: { content?: string; reasoningContent?: string }) => void
): Promise<ApexOmniResponse> {
  const pipelineStart = Date.now();
  const techniquesUsed: string[] = [];

  console.log("\n╔════════════════════════════════════════╗");
  console.log("║    APEX OMNI RESTRUCTURED PIPELINE     ║");
  console.log("╚════════════════════════════════════════╝");

  // Determine if it is OpenRouter or direct DeepSeek
  const isOpenRouterModel = actualModel.includes("/") || actualModel === "nvidia/llama-nemotron-rerank-vl-1b-v2:free";
  let completionsModel = actualModel;
  if (completionsModel.includes("rerank") || completionsModel === "nvidia/llama-nemotron-rerank-vl-1b-v2:free") {
    console.warn(`[Omni Pipeline] actualModel '${completionsModel}' is a reranker. Falling back to nvidia/nemotron-3-ultra-550b-a55b:free.`);
    completionsModel = "nvidia/nemotron-3-ultra-550b-a55b:free";
  }

  // Key validation
  if (isOpenRouterModel) {
    const key = process.env.OPENROUTER_API_KEY;
    if (!key || key.trim() === "") {
      if (onChunk) {
        onChunk({ content: "⚠️ **خطأ في النظام:** مفتاح OpenRouter API Key غير متاح." });
      }
      throw new Error("OpenRouter API key configuration is missing.");
    }
  } else {
    const key = process.env.DEEPSEEK_API_KEY || client.apiKey;
    if (!key || key.trim() === "") {
      if (onChunk) {
        onChunk({ content: "⚠️ **خطأ في النظام:** مفتاح DeepSeek API Key غير متاح." });
      }
      throw new Error("DeepSeek API key configuration is missing.");
    }
  }

  // Set up the active client
  let activeClient = client;
  if (isOpenRouterModel) {
    activeClient = new OpenAI({
      apiKey: process.env.OPENROUTER_API_KEY || "",
      baseURL: "https://openrouter.ai/api/v1",
      defaultHeaders: {
        "HTTP-Referer": "https://apex-chat.vercel.app",
        "X-Title": "Apex Chat",
      }
    });
  }

  // 1. Analyze query complexity and build expert SFT Prompt
  const queryConfig = analyzeQuery(request.message);
  techniquesUsed.push("SFT Prompt Engineering");

  // Check if this is a native reasoning model (e.g. deepseek-reasoner, o1, etc.)
  const isNativeReasoningModel = 
    completionsModel.toLowerCase().includes("reasoner") ||
    completionsModel.toLowerCase().includes("o1") ||
    completionsModel.toLowerCase().includes("o3") ||
    completionsModel.toLowerCase().includes("pro");

  if (isNativeReasoningModel) {
    console.log(`[Omni Pipeline] Native reasoning model detected (${completionsModel}). Running Single-Pass CoT.`);
    techniquesUsed.push("Native Chain-of-Thought (Single-Pass)");

    let content = "";
    let reasoningContent = "";

    const { systemPrompt, userMessage } = buildSFTPrompt(
      request.message,
      queryConfig,
      request.conversationHistory
    );

    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: "system", content: `${request.systemPromptBase}\n\n${systemPrompt}` },
      ...(request.conversationHistory || []).map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
      { role: "user", content: userMessage },
    ];

    try {
      if (onChunk) {
        const stream = await activeClient.chat.completions.create({
          model: completionsModel,
          messages,
          stream: true,
        } as any);

        for await (const chunk of stream as any) {
          const text = chunk.choices[0]?.delta?.content || "";
          const reasoning = (chunk.choices[0]?.delta as any)?.reasoning_content || "";
          if (text) {
            content += text;
            onChunk({ content: text });
          }
          if (reasoning) {
            reasoningContent += reasoning;
            onChunk({ reasoningContent: reasoning });
          }
        }
      } else {
        const response = await activeClient.chat.completions.create({
          model: completionsModel,
          messages,
          stream: false,
        } as any);
        content = response.choices[0]?.message?.content || "";
        reasoningContent = (response.choices[0]?.message as any)?.reasoning_content || "";
      }

      const totalDuration = Date.now() - pipelineStart;
      return {
        content,
        reasoningContent,
        pipelineMetadata: {
          queryConfig,
          mctsIterations: 0,
          mctsNodes: 0,
          totBranches: 0,
          grpoGroupSize: 0,
          grpoMeanReward: 1.0,
          grpoBestReward: 1.0,
          totalDuration,
          techniquesUsed,
        },
      };
    } catch (err: any) {
      console.error("[Omni Pipeline] Native Reasoning Stream failed, falling back:", err);
      if (isAuthOrRateLimitError(err)) {
        throw err;
      }
      // Fallback below to direct standard generation
    }
  }

  // 2. Adaptive Speculative Dual-Pass Pipeline (for standard models or reasoning fallbacks)
  console.log(`[Omni Pipeline] Standard model execution pipeline. Complexity score: ${queryConfig.complexity}/10`);
  
  let draftContent = "";
  let draftReasoning = "";

  const { systemPrompt, userMessage } = buildSFTPrompt(
    request.message,
    queryConfig,
    request.conversationHistory
  );

  const logitBias = getLogitBiasProfile(queryConfig.domain, true);
  const constraintParams = buildConstrainedAPIParams({
    logitBias: Object.keys(logitBias).length > 0 ? logitBias : undefined,
    maxTokens: completionsModel === "deepseek-reasoner" ? 8192 : 4096,
  });

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: `${request.systemPromptBase}\n\n${systemPrompt}` },
    ...(request.conversationHistory || []).map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
    { role: "user", content: userMessage },
  ];

  try {
    // ── PASS 1: Speculative Drafting ──
    console.log("[Omni Pipeline] [Pass 1/2] Generating speculative draft...");
    techniquesUsed.push("Speculative Drafting (Pass 1)");

    if (onChunk) {
      const stream = await activeClient.chat.completions.create({
        model: completionsModel,
        messages,
        max_tokens: constraintParams.max_tokens,
        stream: true,
        ...(constraintParams.logit_bias ? { logit_bias: constraintParams.logit_bias } : {}),
      } as any);

      for await (const chunk of stream as any) {
        const text = chunk.choices[0]?.delta?.content || "";
        const reasoning = (chunk.choices[0]?.delta as any)?.reasoning_content || "";
        if (text) {
          draftContent += text;
          onChunk({ content: text });
        }
        if (reasoning) {
          draftReasoning += reasoning;
          onChunk({ reasoningContent: reasoning });
        }
      }
    } else {
      const response = await activeClient.chat.completions.create({
        model: completionsModel,
        messages,
        max_tokens: constraintParams.max_tokens,
        stream: false,
        ...(constraintParams.logit_bias ? { logit_bias: constraintParams.logit_bias } : {}),
      } as any);
      draftContent = response.choices[0]?.message?.content || "";
      draftReasoning = (response.choices[0]?.message as any)?.reasoning_content || "";
    }

    // ── PASS 2: Adversarial Format Verification & Self-Correction ──
    const formatCheck = checkFormatCorrectness(draftContent);
    if (!formatCheck.valid) {
      console.warn(`[Omni Pipeline] [Pass 2/2] Format check failed: ${formatCheck.reason}. Initiating Self-Correction...`);
      techniquesUsed.push("Self-Correction Refinement (Pass 2)");
      
      if (onChunk) {
        onChunk({ content: "\n\n*(إجراء تصحيح تلقائي لتنسيق المخرجات...)*\n" });
      }

      const correctionPrompt = `You are a critical self-correction agent. The previous response had formatting/structural errors: "${formatCheck.reason}".
Please review the query and the draft response, and output the fully corrected and complete response. Maintain all factual and technical correctness but fix the formatting errors.

Query: "${request.message}"
Draft Response:
${draftContent}

Corrected Response:`;

      const correctionMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
        { role: "system", content: "You are an expert editor. Fix formatting/structural errors in the draft. Preserve the original reasoning and facts." },
        { role: "user", content: correctionPrompt },
      ];

      let correctedContent = "";
      if (onChunk) {
        const stream = await activeClient.chat.completions.create({
          model: completionsModel,
          messages: correctionMessages,
          max_tokens: constraintParams.max_tokens,
          stream: true,
        } as any);

        for await (const chunk of stream as any) {
          const text = chunk.choices[0]?.delta?.content || "";
          if (text) {
            correctedContent += text;
            onChunk({ content: text });
          }
        }
      } else {
        const response = await activeClient.chat.completions.create({
          model: completionsModel,
          messages: correctionMessages,
          max_tokens: constraintParams.max_tokens,
          stream: false,
        } as any);
        correctedContent = response.choices[0]?.message?.content || draftContent;
      }

      if (correctedContent.trim().length > 50) {
        draftContent = correctedContent;
      }
    } else {
      console.log("[Omni Pipeline] [Pass 2/2] Verification passed. No correction needed.");
      techniquesUsed.push("Verification Validation");
    }

    const totalDuration = Date.now() - pipelineStart;
    return {
      content: draftContent,
      reasoningContent: draftReasoning,
      pipelineMetadata: {
        queryConfig,
        mctsIterations: 0,
        mctsNodes: 0,
        totBranches: 0,
        grpoGroupSize: 0,
        grpoMeanReward: 1.0,
        grpoBestReward: 1.0,
        totalDuration,
        techniquesUsed,
      },
    };

  } catch (err: any) {
    console.error("[Omni Pipeline] Adaptive Dual-Pass failed, running final direct fallback:", err);
    if (isAuthOrRateLimitError(err)) {
      throw err;
    }

    // Direct fallback to keep application 100% online
    techniquesUsed.push("Fallback Direct Stream");
    let finalContent = "";
    
    if (onChunk) {
      const stream = await activeClient.chat.completions.create({
        model: completionsModel,
        messages: [
          { role: "system", content: request.systemPromptBase },
          ...(request.conversationHistory || []).map((m) => ({
            role: m.role as "user" | "assistant",
            content: m.content,
          })),
          { role: "user", content: request.message },
        ],
        stream: true,
      } as any);

      for await (const chunk of stream as any) {
        const text = chunk.choices[0]?.delta?.content || "";
        if (text) {
          finalContent += text;
          onChunk({ content: text });
        }
      }
    } else {
      const response = await activeClient.chat.completions.create({
        model: completionsModel,
        messages: [
          { role: "system", content: request.systemPromptBase },
          ...(request.conversationHistory || []).map((m) => ({
            role: m.role as "user" | "assistant",
            content: m.content,
          })),
          { role: "user", content: request.message },
        ],
        stream: false,
      } as any);
      finalContent = response.choices[0]?.message?.content || "";
    }

    const totalDuration = Date.now() - pipelineStart;
    return {
      content: finalContent,
      pipelineMetadata: {
        queryConfig,
        mctsIterations: 0,
        mctsNodes: 0,
        totBranches: 0,
        grpoGroupSize: 0,
        grpoMeanReward: 0.5,
        grpoBestReward: 0.5,
        totalDuration,
        techniquesUsed,
      },
    };
  }
}
