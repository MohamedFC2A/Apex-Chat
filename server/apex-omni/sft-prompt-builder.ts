/**
 * SFT Prompt Builder — Apex Omni Engine
 *
 * Implements Supervised Fine-Tuning (SFT) style prompt engineering.
 * Structures prompts using the exact chat template format used in SFT datasets,
 * which signals to the model to behave as a fine-tuned expert rather than a
 * generic assistant.
 *
 * Format mirrors HuggingFace chat templates:
 *   <|system|>...</|system|>
 *   <|user|>...</|user|>
 *   <|assistant|> (model completes here)
 */

export interface SFTPromptConfig {
  domain: "reasoning" | "coding" | "analysis" | "creative" | "research" | "general";
  complexity: number; // 0–10
  language: "ar" | "en" | "mixed";
  requiresStructuredOutput: boolean;
  requiresChainOfThought: boolean;
}

// ──────────────────────────────────────────────────────────────
// Complexity & Domain Detection
// ──────────────────────────────────────────────────────────────

/**
 * Analyzes a user message to determine its domain and complexity.
 * Complexity 0-3: simple, 4-6: moderate, 7-10: complex
 */
export function analyzeQuery(message: string): SFTPromptConfig {
  const lower = message.toLowerCase();
  const arabicRatio = (message.match(/[\u0600-\u06FF]/g) || []).length / message.length;
  const language: SFTPromptConfig["language"] =
    arabicRatio > 0.6 ? "ar" : arabicRatio > 0.2 ? "mixed" : "en";

  // Domain detection
  const codingTerms = /code|function|class|algorithm|typescript|python|javascript|api|كود|دالة|برمجة|خوارزمية/i;
  const analysisTerms = /analyze|compare|evaluate|assess|حلّل|قارن|قيّم|ناقش|مزايا|عيوب/i;
  const researchTerms = /research|study|paper|findings|أبحاث|دراسة|اكتشاف|علمي/i;
  const creativeTerms = /write|poem|story|creative|اكتب|قصيدة|قصة|إبداع/i;
  const reasoningTerms = /why|how|explain|reason|لماذا|كيف|اشرح|استنتج/i;

  let domain: SFTPromptConfig["domain"] = "general";
  if (codingTerms.test(lower)) domain = "coding";
  else if (analysisTerms.test(lower)) domain = "analysis";
  else if (researchTerms.test(lower)) domain = "research";
  else if (creativeTerms.test(lower)) domain = "creative";
  else if (reasoningTerms.test(lower)) domain = "reasoning";

  // Complexity scoring
  let complexity = 3; // base
  const wordCount = message.split(/\s+/).length;
  if (wordCount > 20) complexity += 2;
  if (wordCount > 50) complexity += 2;
  if (/\?.*\?/.test(message)) complexity += 1; // multiple questions
  if (/compare|مقارنة|analyze|تحليل|explain.*why|اشرح.*لماذا/i.test(message)) complexity += 2;
  if (domain === "coding" || domain === "research") complexity += 1;

  complexity = Math.min(complexity, 10);

  const requiresStructuredOutput =
    /table|جدول|list|قائمة|compare|مقارنة|step.?by.?step|خطوة.*خطوة/i.test(message);
  const requiresChainOfThought = complexity >= 5 || domain === "reasoning" || domain === "analysis";

  return { domain, complexity, language, requiresStructuredOutput, requiresChainOfThought };
}

// ──────────────────────────────────────────────────────────────
// SFT Prompt Builder
// ──────────────────────────────────────────────────────────────

/**
 * Builds an SFT-style structured prompt with relevant few-shot examples.
 * Mimics the exact format used in HuggingFace SFT datasets for
 * instruction-following fine-tuning (Alpaca, ShareGPT, etc.).
 */
export function buildSFTPrompt(
  message: string,
  config: SFTPromptConfig,
  conversationHistory?: Array<{ role: "user" | "assistant"; content: string }>
): { systemPrompt: string; userMessage: string } {
  const systemPrompt = buildSFTSystemBlock(config);

  return { systemPrompt, userMessage: message };
}

function buildSFTSystemBlock(config: SFTPromptConfig): string {
  const chainOfThoughtInstruction = config.requiresChainOfThought
    ? `\n\nREASONING PROTOCOL:
For complex questions, reason privately before answering. Do not reveal hidden chain-of-thought or wrap reasoning in XML tags. Provide only a concise rationale, assumptions, calculations, or verification steps that are useful to the user.`
    : "";

  const structuredOutputInstruction = config.requiresStructuredOutput
    ? `\n\nSTRUCTURED OUTPUT PROTOCOL:\nWhen the user requests comparisons, lists, or tabular data, you MUST use well-formatted Markdown tables or numbered lists. Never output unstructured prose for data that has clear dimensions.`
    : "";

  const languageInstruction =
    config.language === "ar"
      ? `\n\nLANGUAGE: Respond entirely in fluent, professional Arabic. No language mixing unless a technical term has no Arabic equivalent.`
      : config.language === "mixed"
      ? `\n\nLANGUAGE: Detect and match the user's primary language. Technical terms may remain in English.`
      : `\n\nLANGUAGE: Respond in English with precise, professional terminology.`;

  const systemBoundaryContract = `

## SYSTEM BOUNDARY CONTRACT — APEX OMNI V2 ENFORCEMENT
You are strictly prohibited from generating intermediate JSON formatting blocks for 'mcq' or 'pdf' widgets unless the user's absolute, explicit primary command is to construct an execution test or export a document file.

### STRICT OUTPUT BOUNDARY (V2):
- If the user's message is conversational, factual, or does not contain an **explicit construction command** (build / create / generate / اعمل / انشئ / صمم), you MUST NOT produce any structured JSON widgets (mcq-quiz or pdf-document blocks).
- If the user queries conversational facts, history profiles, heights, sports results, or general reference knowledge (e.g., "طول كريستيانو"), respond strictly using standard markdown prose strings. Do not invoke, mention, or suggest the quiz engine or pdf exporter unless explicitly commanded to do so.
- Speculative or referential mentions such as "هل في اسئلة للموضوع ده?" or "كلمني عن شكل الامتحان" or "يعني ايه ميكانيكا" must NEVER trigger widget blocks. Respond with a clean conversational answer and offer to create a quiz/pdf as a follow-up suggestion only.`;

  return `You are Apex Omni — a careful, high-accuracy assistant optimized for grounded reasoning and useful answers.

BEHAVIORAL CONSTRAINTS (non-negotiable):
1. Query Complexity Level: ${config.complexity}/10 — allocate reasoning depth accordingly.
2. Domain: ${config.domain.toUpperCase()} — apply domain-specific expertise and terminology.
3. Answer the user's actual question directly; do not introduce unrelated schemas, agents, internal phases, or training-template markers.
4. Be explicit about uncertainty. If current facts are required and no search/tool context is supplied, say what needs verification instead of inventing data.
5. Use structure only when it improves clarity. Prefer concise prose for simple questions and tables/lists for comparisons or multi-step answers.
6. Never use placeholder text or ellipses as a substitute for an answer.${chainOfThoughtInstruction}${structuredOutputInstruction}${languageInstruction}${systemBoundaryContract}`;
}

// ──────────────────────────────────────────────────────────────
// Exports
// ──────────────────────────────────────────────────────────────

export default { analyzeQuery, buildSFTPrompt };
