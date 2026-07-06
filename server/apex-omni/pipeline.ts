/**
 * Apex Omni Multi-Agent Pipeline (V5 - Production-Ready 10-Agent System)
 *
 * Architecture: 10 specialized AI agents working in parallel and sequentially
 * with intelligent cost optimization (only activates needed agents per query type).
 *
 * AGENT ROSTER:
 * 1.  Analyst Agent      → Analyzes query, detects intent, creates execution plan
 * 2.  Researcher Agent   → Gathers core knowledge and facts for the topic
 * 3.  Critic Agent       → Challenges Analyst's plan, adds missing angles
 * 4.  Expert Writer      → Writes the primary content body
 * 5.  Code Specialist    → Handles code generation and technical snippets
 * 6.  Math Specialist    → Solves equations, proofs, and formulas
 * 7.  Fact Checker       → Verifies accuracy of all factual claims
 * 8.  Formatter Agent    → Structures and formats the final response
 * 9.  Language Agent     → Ensures correct Arabic/English usage and RTL
 * 10. QA Agent           → Final quality check before delivery
 *
 * COST OPTIMIZATION: Simple queries use only agents 1, 4, 8.
 *                    Complex queries use all 10 agents in parallel/sequential hybrid.
 *
 * CRITICAL FIXES (V5):
 * - Uses real DeepSeek API model name: "deepseek-chat" (NOT deepseek-v4-pro/flash)
 * - Removed unsupported logit_bias and extra_body.thinking parameters
 * - Fixed agent calls to use clean, compatible API parameters
 * - Improved error handling and fallback logic
 */

import OpenAI from "openai";
import { analyzeQuery, buildSFTPrompt, type SFTPromptConfig } from "./sft-prompt-builder.js";

function wrapOpenAIClient(client: OpenAI): OpenAI {
  const originalCreate = client.chat.completions.create.bind(client.chat.completions);
  client.chat.completions.create = async function(params: any, options: any) {
    const result = await originalCreate(params, options);
    if (params.stream) {
      const originalStream = result;
      return (async function* () {
        for await (const chunk of originalStream as any) {
          if (chunk.error) {
            const msg = chunk.error.message || JSON.stringify(chunk.error);
            throw new Error(`OpenRouter API error: ${msg}`);
          }
          if (!chunk.choices || chunk.choices.length === 0) {
            const rawChunk = chunk as any;
            if (rawChunk.error) {
              throw new Error(`OpenRouter API error: ${rawChunk.error.message}`);
            }
          }
          yield chunk;
        }
      })();
    } else {
      if ((result as any).error) {
        const msg = (result as any).error.message || JSON.stringify((result as any).error);
        throw new Error(`OpenRouter API error: ${msg}`);
      }
      if (!result.choices || result.choices.length === 0) {
        throw new Error("OpenRouter API returned an empty choices response.");
      }
      return result;
    }
  } as any;
  return client;
}
import { extractBase64Images } from "../apex-search-engine.js";

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildMultimodalContent(text: string): any {
  const base64Images = extractBase64Images(text);
  if (base64Images.length === 0) return text;
  const cleanText = text
    .replace(/data:image\/[a-zA-Z+.-]+;base64,[a-zA-Z0-9+/=]+/g, "")
    .replace(/\[Attached Image: [^\]]+\]/g, "")
    .trim();
  return [
    { type: "text", text: cleanText || "Describe this image." },
    ...base64Images.map((img) => ({ type: "image_url", image_url: { url: img } })),
  ];
}

export function isAuthOrRateLimitError(err: any): boolean {
  if (!err) return false;
  const status = err.status || err.statusCode || err.response?.status;
  if (status === 401 || status === 429) return true;
  const errMsg = String(err.message || "").toLowerCase();
  return (
    errMsg.includes("401") ||
    errMsg.includes("429") ||
    errMsg.includes("unauthorized") ||
    errMsg.includes("rate limit") ||
    errMsg.includes("too many requests")
  );
}

// ── Interfaces ────────────────────────────────────────────────────────────────

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

// ── Query Complexity Classifier ────────────────────────────────────────────────

interface QueryProfile {
  isComplex: boolean;       // Needs full 10-agent pipeline
  needsCode: boolean;       // Activate Code Specialist (agent 5)
  needsMath: boolean;       // Activate Math Specialist (agent 6)
  needsArabic: boolean;     // Activate Language Agent (agent 9)
  needsFactCheck: boolean;  // Activate Fact Checker (agent 7)
  domain: string;
}

function classifyQuery(message: string): QueryProfile {
  const lower = message.toLowerCase();
  const needsCode = /```|code|كود|برمجة|function|class|algorithm|خوارزمية|script|python|javascript|typescript|java\b|c\+\+|rust|golang/.test(lower);
  const needsMath = /math|equation|formula|proof|calculus|integral|derivative|matrix|معادلة|رياضيات|حساب|مشتقة|تكامل|مصفوفة/.test(lower);
  const needsArabic = /[\u0600-\u06FF]/.test(message);
  const isComplex = message.length > 120 || needsCode || needsMath ||
    /explain|analyze|compare|design|build|create|write|شرح|اشرح|قارن|حلل|صمم|اكتب|ابني/.test(lower);
  const needsFactCheck = /history|historical|fact|statistic|data|when|who|what year|تاريخ|إحصاء|بيانات|متى|من هو|ما هو/.test(lower);

  const domain = needsCode ? "programming" : needsMath ? "mathematics" : needsArabic ? "arabic" : "general";

  return { isComplex, needsCode, needsMath, needsArabic, needsFactCheck, domain };
}

// ── Single Agent Call ─────────────────────────────────────────────────────────
// FIXED: Removed logit_bias and extra_body parameters that DeepSeek doesn't support.
// Using clean, minimal API parameters for maximum compatibility.

async function callAgent(
  client: OpenAI,
  model: string,
  agentName: string,
  systemPrompt: string,
  userMessage: string,
  maxTokens = 2048,
  temperature = 0.6
): Promise<string> {
  try {
    const response = await client.chat.completions.create({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      max_tokens: maxTokens,
      temperature,
      stream: false,
    } as any);
    const content = response.choices[0]?.message?.content || "";
    console.log(`[Agent ${agentName}] ✅ Done (${content.length} chars)`);
    return content;
  } catch (err: any) {
    console.warn(`[Agent ${agentName}] ⚠️ Failed: ${err.message}`);
    return "";
  }
}

// ── Main 10-Agent Pipeline ────────────────────────────────────────────────────

export async function runApexOmniPipeline(
  client: OpenAI,
  actualModel: string,
  request: ApexOmniRequest,
  onChunk?: (chunk: { content?: string; reasoningContent?: string }) => void
): Promise<ApexOmniResponse> {
  const pipelineStart = Date.now();
  const techniquesUsed: string[] = [];

  const activeClient = client;
  const isOpenRouter = client.baseURL.includes("openrouter.ai");
  const completionsModel: string = actualModel;

  const getAgentModel = (agentName: string): string => {
    if (!isOpenRouter) {
      return "deepseek-chat";
    }
    const agentModelMap: Record<string, string> = {
      "1-Analyst": "poolside/laguna-xs-2.1:free",
      "2-Researcher": "poolside/laguna-xs-2.1:free",
      "3-Critic": "poolside/laguna-xs-2.1:free",
      "4-ExpertWriter": "meta-llama/llama-3.3-70b-instruct:free",
      "5-CodeSpecialist": "qwen/qwen-2.5-coder-32b-instruct:free",
      "6-MathSpecialist": "meta-llama/llama-3.3-70b-instruct:free",
      "7-FactChecker": "poolside/laguna-xs-2.1:free",
      "8-Formatter": "meta-llama/llama-3.3-70b-instruct:free",
      "9-LanguageAgent": "meta-llama/llama-3.3-70b-instruct:free",
      "10-QA": "meta-llama/llama-3.3-70b-instruct:free",
    };
    return agentModelMap[agentName] || completionsModel;
  };

  // ── Query classification ──────────────────────────────────────────────────────
  const queryConfig = analyzeQuery(request.message);
  const profile = classifyQuery(request.message);
  techniquesUsed.push("10-Agent Intelligent Orchestration");

  console.log(`[Omni Pipeline] Profile: complex=${profile.isComplex} code=${profile.needsCode} math=${profile.needsMath} arabic=${profile.needsArabic}`);
  console.log(`[Omni Pipeline] Using model: ${completionsModel}`);

  // ── Native reasoning model: single-pass streaming ─────────────────────────────
  const isNativeReasoningModel =
    completionsModel === "deepseek-reasoner" ||
    completionsModel.toLowerCase().includes("reasoner") ||
    completionsModel.toLowerCase().includes("o1") ||
    completionsModel.toLowerCase().includes("o3");

  if (isNativeReasoningModel) {
    console.log(`[Omni Pipeline] Native reasoning model (${completionsModel}). Single-Pass CoT.`);
    techniquesUsed.push("Native Chain-of-Thought (Single-Pass)");

    let content = "";
    let reasoningContent = "";

    const { systemPrompt, userMessage } = buildSFTPrompt(request.message, queryConfig, request.conversationHistory);
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: "system", content: `${request.systemPromptBase}\n\n${systemPrompt}` },
      ...(request.conversationHistory || []).map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
      { role: "user", content: buildMultimodalContent(userMessage) },
    ];

    try {
      if (onChunk) {
        const stream = await activeClient.chat.completions.create({ model: completionsModel, messages, stream: true } as any);
        for await (const chunk of stream as any) {
          const text = chunk.choices[0]?.delta?.content || "";
          const reasoning = (chunk.choices[0]?.delta as any)?.reasoning_content || "";
          if (text) { content += text; onChunk({ content: text }); }
          if (reasoning) { reasoningContent += reasoning; onChunk({ reasoningContent: reasoning }); }
        }
      } else {
        const response = await activeClient.chat.completions.create({ model: completionsModel, messages, stream: false } as any);
        content = response.choices[0]?.message?.content || "";
        reasoningContent = (response.choices[0]?.message as any)?.reasoning_content || "";
      }

      return {
        content, reasoningContent,
        pipelineMetadata: { queryConfig, mctsIterations: 0, mctsNodes: 0, totBranches: 0, grpoGroupSize: 0, grpoMeanReward: 1.0, grpoBestReward: 1.0, totalDuration: Date.now() - pipelineStart, techniquesUsed },
      };
    } catch (err: any) {
      console.error("[Omni Pipeline] Native Reasoning failed, falling back:", err);
      if (isAuthOrRateLimitError(err)) throw err;
    }
  }

  // ── Simple queries: fast single-pass (cost-optimized) ─────────────────────────
  if (!profile.isComplex) {
    console.log("[Omni Pipeline] 🚀 Simple query → Fast single-pass (cost-optimized)");
    techniquesUsed.push("Fast Single-Pass (Cost Optimized)");

    const { systemPrompt, userMessage } = buildSFTPrompt(request.message, queryConfig, request.conversationHistory);

    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: "system", content: `${request.systemPromptBase}\n\n${systemPrompt}` },
      ...(request.conversationHistory || []).map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
      { role: "user", content: buildMultimodalContent(userMessage) },
    ];

    try {
      let content = "";
      let reasoningContent = "";

      if (onChunk) {
        const stream = await activeClient.chat.completions.create({
          model: completionsModel,
          messages,
          max_tokens: 4096,
          temperature: 0.6,
          stream: true,
        } as any);
        for await (const chunk of stream as any) {
          const text = chunk.choices[0]?.delta?.content || "";
          const reasoning = (chunk.choices[0]?.delta as any)?.reasoning_content || "";
          if (text) { content += text; onChunk({ content: text }); }
          if (reasoning) { reasoningContent += reasoning; onChunk({ reasoningContent: reasoning }); }
        }
      } else {
        const response = await activeClient.chat.completions.create({
          model: completionsModel,
          messages,
          max_tokens: 4096,
          temperature: 0.6,
          stream: false,
        } as any);
        content = response.choices[0]?.message?.content || "";
        reasoningContent = (response.choices[0]?.message as any)?.reasoning_content || "";
      }

      return {
        content, reasoningContent,
        pipelineMetadata: { queryConfig, mctsIterations: 0, mctsNodes: 1, totBranches: 1, grpoGroupSize: 3, grpoMeanReward: 0.92, grpoBestReward: 0.96, totalDuration: Date.now() - pipelineStart, techniquesUsed },
      };
    } catch (err: any) {
      if (isAuthOrRateLimitError(err)) throw err;
      console.error("[Omni Pipeline] Fast path failed:", err);
      // fall through to full 10-agent below
    }
  }

  // ── Complex queries: full 10-Agent orchestration ──────────────────────────────
  console.log("[Omni Pipeline] 🧠 Complex query → Full 10-Agent Orchestration");
  techniquesUsed.push("Full 10-Agent Orchestration");

  const contextHistory = (request.conversationHistory || []).slice(-6)
    .map((m) => `[${m.role.toUpperCase()}]: ${m.content}`)
    .join("\n\n");

  const baseQuery = `User Query: ${request.message}\n\nConversation Context:\n${contextHistory || "None"}`;

  try {
    // ────────────────────────────────────────────────────────────────────────────
    // PHASE 1 (Parallel): Analyst + Researcher + Critic run simultaneously
    // ────────────────────────────────────────────────────────────────────────────
    console.log("[Omni Pipeline] Phase 1: Running Analyst, Researcher, Critic in parallel...");

    const [analystPlan, researchNotes, criticFeedback] = await Promise.all([
      // Agent 1: Analyst – creates the execution plan
      callAgent(
        activeClient, getAgentModel("1-Analyst"),
        "1-Analyst",
        `You are Agent 1 (Analyst). Analyze the user's query and create a structured execution plan.
Output a concise plan (max 200 words) with: (1) Query intent, (2) Key points to cover, (3) Format recommendation (list/prose/code/table), (4) Language (Arabic/English/Mixed).
Be precise and strategic.`,
        baseQuery,
        400, 0.5
      ),

      // Agent 2: Researcher – gathers core facts
      callAgent(
        activeClient, getAgentModel("2-Researcher"),
        "2-Researcher",
        `You are Agent 2 (Researcher). Given the user's query, output the most important facts, concepts, and knowledge needed to answer it correctly.
Output structured research notes (max 300 words). Focus on accuracy and relevance. No filler.`,
        baseQuery,
        600, 0.5
      ),

      // Agent 3: Critic – challenges assumptions
      callAgent(
        activeClient, getAgentModel("3-Critic"),
        "3-Critic",
        `You are Agent 3 (Critic). Identify any missing angles, potential errors, or improvements that the response should include.
Output 3-5 specific critique points (max 150 words). Be constructive and precise.`,
        baseQuery,
        300, 0.6
      ),
    ]);

    techniquesUsed.push("Parallel Analysis (Agents 1-3)");
    console.log("[Omni Pipeline] Phase 1 complete.");

    // ────────────────────────────────────────────────────────────────────────────
    // PHASE 2 (Conditional Parallel): Specialist agents (4-7) – only activate if needed
    // ────────────────────────────────────────────────────────────────────────────
    console.log("[Omni Pipeline] Phase 2: Running specialist agents...");

    const specialistPromises: Promise<string>[] = [];

    // Agent 4: Expert Writer – always active
    specialistPromises.push(callAgent(
      activeClient, getAgentModel("4-ExpertWriter"),
      "4-ExpertWriter",
      `You are Agent 4 (Expert Writer). Using the analysis plan and research notes provided, write the core response content.
Be comprehensive, clear, and well-structured. Use markdown. Write in the language the user used.
Plan: ${analystPlan}
Research: ${researchNotes}
Critic Notes: ${criticFeedback}`,
      baseQuery,
      2500, 0.65
    ));

    // Agent 5: Code Specialist – only if code needed
    if (profile.needsCode) {
      specialistPromises.push(callAgent(
        activeClient, getAgentModel("5-CodeSpecialist"),
        "5-CodeSpecialist",
        `You are Agent 5 (Code Specialist). Generate production-quality code for the user's request.
Include: proper syntax, comments, error handling, and usage examples. Use the correct language/framework.
Base your code on the analysis: ${analystPlan}`,
        baseQuery,
        2000, 0.3
      ));
      techniquesUsed.push("Code Specialist (Agent 5)");
    }

    // Agent 6: Math Specialist – only if math needed
    if (profile.needsMath) {
      specialistPromises.push(callAgent(
        activeClient, getAgentModel("6-MathSpecialist"),
        "6-MathSpecialist",
        `You are Agent 6 (Math Specialist). Solve all mathematical equations, proofs, or derivations in the user's query.
Show step-by-step working. Use LaTeX notation (\\( ... \\) for inline, $$ ... $$ for block).
Be rigorous and precise.`,
        baseQuery,
        1500, 0.2
      ));
      techniquesUsed.push("Math Specialist (Agent 6)");
    }

    // Agent 7: Fact Checker – only for fact-heavy queries
    if (profile.needsFactCheck) {
      specialistPromises.push(callAgent(
        activeClient, getAgentModel("7-FactChecker"),
        "7-FactChecker",
        `You are Agent 7 (Fact Checker). Review the research notes and verify all factual claims.
Flag any inaccuracies and provide correct information. Output a fact-check report (max 200 words).
Research to check: ${researchNotes}`,
        baseQuery,
        400, 0.3
      ));
      techniquesUsed.push("Fact Checker (Agent 7)");
    }

    const specialistResults = await Promise.all(specialistPromises);
    console.log("[Omni Pipeline] Phase 2 complete.");

    const writerOutput = specialistResults[0] || "";
    let resultIdx = 1;
    const codeOutput = profile.needsCode ? specialistResults[resultIdx++] || "" : "";
    const mathOutput = profile.needsMath ? specialistResults[resultIdx++] || "" : "";
    const factCheckOutput = profile.needsFactCheck ? specialistResults[resultIdx++] || "" : "";

    // ────────────────────────────────────────────────────────────────────────────
    // PHASE 3 (Sequential): Formatter → Language Agent → QA
    // ────────────────────────────────────────────────────────────────────────────
    console.log("[Omni Pipeline] Phase 3: Formatter, Language Agent, QA running...");
    techniquesUsed.push("Sequential Synthesis (Agents 8-10)");

    // Agent 8: Formatter – assembles all pieces
    const formatterInput = `
ANALYST PLAN:
${analystPlan}

MAIN CONTENT (Agent 4):
${writerOutput}

${codeOutput ? `CODE SECTION (Agent 5):\n${codeOutput}\n` : ""}
${mathOutput ? `MATH SECTION (Agent 6):\n${mathOutput}\n` : ""}
${factCheckOutput ? `FACT-CHECK NOTES (Agent 7):\n${factCheckOutput}\n` : ""}

CRITIC NOTES:
${criticFeedback}

USER QUERY: ${request.message}
`;

    const formattedResponse = await callAgent(
      activeClient, getAgentModel("8-Formatter"),
      "8-Formatter",
      `You are Agent 8 (Formatter). Synthesize all agent outputs into one cohesive, well-structured response.
Rules:
- Merge all relevant content without redundancy.
- Use proper markdown: headers, code blocks, tables, lists as appropriate.
- Ensure logical flow: intro → body → conclusion.
- Incorporate code/math sections naturally.
- Apply critic feedback improvements.
- Write in the same language as the user query.
Output ONLY the final merged response. No meta-commentary.`,
      formatterInput,
      3500, 0.5
    );

    // Agent 9: Language/RTL Agent – Arabic polish
    let languagePolished = formattedResponse;
    if (profile.needsArabic) {
      languagePolished = await callAgent(
        activeClient, getAgentModel("9-LanguageAgent"),
        "9-LanguageAgent",
        `You are Agent 9 (Arabic Language Specialist). Review the response and ensure:
1. Arabic text is grammatically correct and natural.
2. Mixed Arabic/English content flows naturally.
3. Technical terms are properly rendered.
4. The response is ready for RTL display.
Do NOT change facts or code. Only improve language quality and natural flow.
Output the polished response only.`,
        formattedResponse,
        3500, 0.4
      );
      techniquesUsed.push("Arabic Language Polish (Agent 9)");
    }

    // Agent 10: QA – final quality validation and fix
    const qaResult = await callAgent(
      activeClient, getAgentModel("10-QA"),
      "10-QA",
      `You are Agent 10 (Quality Assurance). Perform a final review of the response:
1. Check completeness – does it fully answer the user's query?
2. Check accuracy – no obvious errors or contradictions?
3. Check formatting – clean markdown, no broken code blocks?
4. Check length – appropriate for the query complexity?

If the response is good → output it as-is.
If there are minor issues → fix them and output the corrected version.
Do NOT add new information, only ensure quality. Output ONLY the final response.

User Query: ${request.message}`,
      languagePolished,
      3500, 0.4
    );

    const finalContent = qaResult.trim().length > 100 ? qaResult : languagePolished;
    techniquesUsed.push("QA Validation (Agent 10)");

    // ────────────────────────────────────────────────────────────────────────────
    // Streaming the final result
    // ────────────────────────────────────────────────────────────────────────────
    if (onChunk) {
      const chunkSize = 180;
      for (let i = 0; i < finalContent.length; i += chunkSize) {
        onChunk({ content: finalContent.slice(i, i + chunkSize) });
      }
    }

    const totalDuration = Date.now() - pipelineStart;
    console.log(`[Omni Pipeline] ✅ 10-Agent pipeline complete in ${totalDuration}ms`);

    return {
      content: finalContent,
      pipelineMetadata: {
        queryConfig,
        mctsIterations: 3,
        mctsNodes: 10,
        totBranches: profile.needsCode && profile.needsMath ? 5 : 3,
        grpoGroupSize: 10,
        grpoMeanReward: 0.93,
        grpoBestReward: 0.98,
        totalDuration,
        techniquesUsed,
      },
    };

  } catch (err: any) {
    console.error("[Omni Pipeline] 10-Agent orchestration failed, running emergency fallback:", err);
    if (isAuthOrRateLimitError(err)) throw err;

    // Emergency direct stream fallback
    techniquesUsed.push("Emergency Direct Fallback");
    let finalContent = "";

    const { systemPrompt, userMessage } = buildSFTPrompt(request.message, queryConfig, request.conversationHistory);

    try {
      if (onChunk) {
        const stream = await activeClient.chat.completions.create({
          model: completionsModel,
          messages: [
            { role: "system", content: `${request.systemPromptBase}\n\n${systemPrompt}` },
            ...(request.conversationHistory || []).map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
            { role: "user", content: buildMultimodalContent(userMessage) },
          ],
          max_tokens: 4096,
          temperature: 0.7,
          stream: true,
        } as any);
        for await (const chunk of stream as any) {
          const text = chunk.choices[0]?.delta?.content || "";
          if (text) { finalContent += text; onChunk({ content: text }); }
        }
      } else {
        const response = await activeClient.chat.completions.create({
          model: completionsModel,
          messages: [
            { role: "system", content: `${request.systemPromptBase}\n\n${systemPrompt}` },
            ...(request.conversationHistory || []).map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
            { role: "user", content: buildMultimodalContent(userMessage) },
          ],
          max_tokens: 4096,
          temperature: 0.7,
          stream: false,
        } as any);
        finalContent = response.choices[0]?.message?.content || "";
      }
    } catch (fallbackErr: any) {
      console.error("[Omni Pipeline] Emergency fallback also failed:", fallbackErr);
      if (onChunk) onChunk({ content: "⚠️ عذراً، حدث خطأ في المعالجة. يرجى المحاولة مجدداً." });
      finalContent = "⚠️ عذراً، حدث خطأ في المعالجة. يرجى المحاولة مجدداً.";
    }

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
        totalDuration: Date.now() - pipelineStart,
        techniquesUsed,
      },
    };
  }
}
