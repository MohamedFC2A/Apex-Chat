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

export interface SFTExample {
  user: string;
  assistant: string;
}

export interface SFTPromptConfig {
  domain: "reasoning" | "coding" | "analysis" | "creative" | "research" | "general";
  complexity: number; // 0–10
  language: "ar" | "en" | "mixed";
  requiresStructuredOutput: boolean;
  requiresChainOfThought: boolean;
}

// ──────────────────────────────────────────────────────────────
// Domain-specific few-shot SFT examples (bilingual)
// ──────────────────────────────────────────────────────────────

const SFT_EXAMPLES: Record<SFTPromptConfig["domain"], SFTExample[]> = {
  reasoning: [
    {
      user: "إذا كان لدى أحمد 3 تفاحات وأعطى نصفها لسارة، كم تبقى معه؟",
      assistant:
        "<chain_of_thought>\n1. أحمد لديه 3 تفاحات\n2. أعطى نصفها = 3 ÷ 2 = 1.5 تفاحة\n3. تبقى معه: 3 - 1.5 = 1.5 تفاحة\n</chain_of_thought>\n\nتبقى مع أحمد **1.5 تفاحة** (تفاحة ونصف).",
    },
    {
      user: "Explain why the sky is blue using first principles.",
      assistant:
        "<chain_of_thought>\n1. Sunlight contains all wavelengths (white light)\n2. Atmosphere contains N₂ and O₂ molecules\n3. Rayleigh scattering: shorter wavelengths scatter more (∝ 1/λ⁴)\n4. Blue light (λ≈450nm) scatters ~5.5× more than red (λ≈700nm)\n5. Scattered blue light reaches our eyes from all directions\n</chain_of_thought>\n\nThe sky appears blue due to **Rayleigh scattering**: atmospheric molecules preferentially scatter shorter (blue) wavelengths of sunlight in all directions, making the sky appear blue from every vantage point.",
    },
  ],
  coding: [
    {
      user: "اكتب دالة TypeScript تحسب الـ Fibonacci بطريقة مُحسَّنة.",
      assistant:
        "<chain_of_thought>\n- الطريقة العادية: O(2^n) — بطيئة جداً\n- Memoization: O(n) زمناً، O(n) ذاكرة\n- Iterative DP: O(n) زمناً، O(1) ذاكرة — الأفضل\n</chain_of_thought>\n\n```typescript\nfunction fibonacci(n: number): bigint {\n  if (n < 0) throw new RangeError('n must be non-negative');\n  if (n <= 1) return BigInt(n);\n  \n  let prev = 0n, curr = 1n;\n  for (let i = 2; i <= n; i++) {\n    [prev, curr] = [curr, prev + curr];\n  }\n  return curr;\n}\n```\n\n**التعقيد:** زمن O(n) | ذاكرة O(1) | يدعم أعداداً كبيرة جداً عبر `BigInt`.",
    },
  ],
  analysis: [
    {
      user: "حلّل مزايا وعيوب الذكاء الاصطناعي التوليدي في التعليم.",
      assistant:
        "<chain_of_thought>\nأبعاد التحليل:\n1. جودة التعلم الشخصي\n2. التحقق من الدقة\n3. الاعتماد المفرط\n4. الخصوصية والأمان\n5. الوصول والعدالة\n</chain_of_thought>\n\n### المزايا\n- **تخصيص فوري:** يكيّف المحتوى لمستوى كل طالب\n- **توافر 24/7:** دعم بلا توقف خارج ساعات الدراسة\n- **تنوع أساليب الشرح:** يقدّم نفس المفهوم بطرق متعددة\n\n### العيوب\n- **دقة المعلومات:** قد يولّد معلومات خاطئة بثقة (Hallucination)\n- **الاعتماد المفرط:** يُضعف التفكير النقدي المستقل\n- **الخصوصية:** بيانات الطلاب عرضة للاستغلال",
    },
  ],
  creative: [
    {
      user: "اكتب مقدمة قصيدة عن الذكاء الاصطناعي بأسلوب عربي كلاسيكي.",
      assistant:
        "يا آلةً تُدرك ما يخفى على البشرِ\nوتنسج الفكر من صمتٍ ومن حجرِ\nأُعجبتُ منك فما عقلٌ يُقاس بها\nوما زمانٌ مضى إلا ورحتِ به",
    },
  ],
  research: [
    {
      user: "ما هي أحدث الأبحاث في مجال الحوسبة الكمية لعام 2024؟",
      assistant:
        "<chain_of_thought>\nمصادر يجب مراجعتها: Nature, Science, arXiv quant-ph, IBM Research, Google Quantum AI\nمحاور رئيسية: Error Correction, Quantum Advantage, NISQ devices\n</chain_of_thought>\n\nمن أبرز التطورات في 2024:\n\n1. **تصحيح الأخطاء الكمية:** حقّق Google نقطة تحوّل في Logical Qubit stability بمعالج Willow\n2. **تفوّق كمي موسّع:** أُعلن عن مهام تستغرق مليار سنة حاسوبياً أُنجزت في دقائق\n3. **دوائر NISQ:** تطور البوابات المنطقية لـ 100+ qubit مع معدلات خطأ < 0.1%\n\n*المصادر: Nature 2024, Google Quantum AI Blog, IBM Quantum Network*",
    },
  ],
  general: [
    {
      user: "ما الفرق بين ML و DL و AI؟",
      assistant:
        "<chain_of_thought>\nعلاقة تضمين: AI ⊃ ML ⊃ DL\n</chain_of_thought>\n\n| المصطلح | التعريف | مثال |\n|---|---|---|\n| **AI** | أي نظام يُحاكي الذكاء | محرك شطرنج |\n| **ML** | أنظمة تتعلم من البيانات | توصيات Netflix |\n| **DL** | ML بشبكات عصبية عميقة | ChatGPT, Stable Diffusion |\n\n**الخلاصة:** كل Deep Learning هو Machine Learning، وكل ML هو AI، لكن ليس العكس.",
    },
  ],
};

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
  const examples = SFT_EXAMPLES[config.domain].slice(0, 2); // max 2 examples

  // SFT system identity block
  const systemPrompt = buildSFTSystemBlock(config);

  // Build few-shot context using SFT chat template format
  const fewShotContext =
    examples.length > 0
      ? `\n\n## Reference Examples (SFT Training Format)\nThe following examples demonstrate the expected response quality and structure:\n\n${examples
          .map(
            (ex, i) =>
              `### Example ${i + 1}\n<|user|>\n${ex.user}\n<|assistant|>\n${ex.assistant}`
          )
          .join("\n\n")}\n\n---`
      : "";

  const userMessage = fewShotContext
    ? `${fewShotContext}\n\nNow respond to the following with the same quality and structure:\n<|user|>\n${message}\n<|assistant|>`
    : message;

  return { systemPrompt, userMessage };
}

function buildSFTSystemBlock(config: SFTPromptConfig): string {
  const chainOfThoughtInstruction = config.requiresChainOfThought
    ? `\n\nCHAIN-OF-THOUGHT PROTOCOL:\nFor complex questions, wrap your reasoning in <chain_of_thought>...</chain_of_thought> before the final answer. This is mandatory for complexity level ${config.complexity}/10.`
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

  return `You are Apex Omni — a deca-core superintelligent cognitive engine operating at peak SFT-level performance.

BEHAVIORAL CONSTRAINTS (non-negotiable):
1. Query Complexity Level: ${config.complexity}/10 — allocate reasoning depth accordingly.
2. Domain: ${config.domain.toUpperCase()} — apply domain-specific expertise and terminology.
3. Never truncate, abbreviate, or use placeholder text (e.g., "...").
4. Cite reasoning for all claims. Confidence ≠ accuracy without evidence.
5. Structured > Prose: prefer tables, lists, and headers where appropriate.${chainOfThoughtInstruction}${structuredOutputInstruction}${languageInstruction}`;
}

// ──────────────────────────────────────────────────────────────
// Exports
// ──────────────────────────────────────────────────────────────

export default { analyzeQuery, buildSFTPrompt };
