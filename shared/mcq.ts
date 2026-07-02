import { z } from "zod";

export type MCQQuizMode = "practice" | "exam";
export type MCQQuizDifficulty = "easy" | "medium" | "hard";
export type MCQQuizLanguage = "ar" | "en";

export interface MCQOptionMap {
  a: string;
  b: string;
  c: string;
  d: string;
}

export interface MCQQuestion {
  id: string;
  question: string;
  options: MCQOptionMap;
  correctAnswer: keyof MCQOptionMap;
  explanation: string;
}

export interface MCQQuiz {
  title: string;
  description: string;
  mode: MCQQuizMode;
  questions: MCQQuestion[];
  /** V2 Authorization Gate: true only when an explicit operational command triggered this quiz */
  isCommandAuthorized?: boolean;
}

export interface ParsedQuizRequest {
  rawMessage: string;
  topic: string;
  requestedQuestionCount: number;
  mode: MCQQuizMode;
  difficulty: MCQQuizDifficulty;
  language: MCQQuizLanguage;
}

const QUIZ_INTENT_REGEX =
  /(?:^|\s)(mcq|msq|multiple[- ]?choice|quiz|exam|test)(?:\s|$)|اختبار|امتحان|اختر من متعدد|اختيار من متعدد|اسئلة اختيار|أسئلة اختيار|سؤال(?:ات)?/i;

const QUIZ_SCHEMA = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  mode: z.enum(["practice", "exam"]),
  isCommandAuthorized: z.boolean().optional(),
  questions: z
    .array(
      z.object({
        id: z.string().min(1),
        question: z.string().min(1),
        options: z.object({
          a: z.string().min(1),
          b: z.string().min(1),
          c: z.string().min(1),
          d: z.string().min(1),
        }),
        correctAnswer: z.enum(["a", "b", "c", "d"]),
        explanation: z.string().min(1),
      })
    )
    .min(1),
});

const STOP_WORDS = new Set([
  "mcq",
  "msq",
  "quiz",
  "exam",
  "test",
  "multiple",
  "choice",
  "questions",
  "question",
  "generate",
  "create",
  "make",
  "build",
  "give",
  "about",
  "on",
  "for",
  "the",
  "a",
  "an",
  "please",
  "practice",
  "exam-mode",
  "practice-mode",
  "easy",
  "medium",
  "hard",
  "beginner",
  "intermediate",
  "advanced",
  "اختبار",
  "امتحان",
  "اختياري",
  "اختيار",
  "متعدد",
  "اختر",
  "اسئلة",
  "أسئلة",
  "اسئله",
  "سؤال",
  "سؤالات",
  "اعمل",
  "اعملي",
  "اعمللي",
  "سوي",
  "سويلي",
  "سو",
  "لي",
  "عن",
  "في",
  "على",
  "حول",
  "بخصوص",
  "تدريبي",
  "امتحاني",
  "سهل",
  "متوسط",
  "صعب",
]);

function containsArabic(text: string): boolean {
  return /[\u0600-\u06FF]/.test(text);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function detectQuizIntent(message: string): boolean {
  if (message.includes("SYSTEM DIRECTIVE: You must output a structured MCQ/MSQ quiz block")) {
    return true;
  }
  return QUIZ_INTENT_REGEX.test(message);
}

export function detectQuizLanguage(message: string): MCQQuizLanguage {
  return containsArabic(message) ? "ar" : "en";
}

function parseRequestedQuestionCount(message: string): number {
  const patterns = [
    /(\d+)\s*(?:questions?|qs|mcqs?)/i,
    /(?:questions?|qs|mcqs?)\s*(\d+)/i,
    /(\d+)\s*(?:سؤال|أسئلة|اسئله)/i,
    /(?:سؤال|أسئلة|اسئله)\s*(\d+)/i,
  ];

  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (match?.[1]) {
      return clamp(Number(match[1]), 1, 15);
    }
  }

  const firstNumber = message.match(/\b(\d{1,2})\b/);
  if (firstNumber?.[1]) {
    return clamp(Number(firstNumber[1]), 1, 15);
  }

  return 5;
}

function parseRequestedMode(message: string): MCQQuizMode {
  if (/(?:^|\s)(exam|final|timed)(?:\s|$)|امتحاني|نهائي|اختبار نهائي/i.test(message)) {
    return "exam";
  }
  return "practice";
}

function parseRequestedDifficulty(message: string): MCQQuizDifficulty {
  if (/(?:^|\s)(easy|beginner)(?:\s|$)|سهل|مبتدئ/i.test(message)) {
    return "easy";
  }
  if (/(?:^|\s)(hard|advanced)(?:\s|$)|صعب|متقدم/i.test(message)) {
    return "hard";
  }
  return "medium";
}

function cleanupTopic(rawTopic: string): string {
  const tokens = rawTopic
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/[^A-Za-z0-9\u0600-\u06FF\s-]/g, " ")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean)
    .filter((token) => !STOP_WORDS.has(token.toLowerCase()))
    .filter((token) => !/^\d+$/.test(token));

  return tokens.join(" ").trim();
}

function extractTopicByAnchor(message: string): string {
  const anchoredPatterns = [
    /(?:about|on|regarding|for)\s+(.+)$/i,
    /(?:عن|في|حول|بخصوص)\s+(.+)$/i,
  ];

  for (const pattern of anchoredPatterns) {
    const match = message.match(pattern);
    if (match?.[1]) {
      const topic = cleanupTopic(match[1]);
      if (topic) return topic;
    }
  }

  return "";
}

const GENERIC_TOPICS = new Set([
  "عنها", "عنه", "عنهم", "عنهاُ", "عن ذلك", "عن هذا", "بالموضوع", "هذا", "ذلك", "هذه", "الموضوع", "الموضوع السابق", "الدرس", "الدرس السابق", "المقال", "المادة", "القصة", "النص", "عن المادة", "عن الدرس", "الامتحان", "الاختبار", "هناك", "معلومات", "عن الموضوع", "المعلومات", "عنها بالكامل", "عنه بالكامل", "عنها بالتفصيل", "عنه بالتفصيل", "عنها تفصيليا", "عنه تفصيليا",
  "it", "them", "this", "that", "these", "those", "the topic", "the subject", "the text", "the article", "the story", "the lesson", "the previous topic", "the previous subject", "about it", "about that", "about this", "above", "the info", "the information", "about them", "about these", "about those"
]);

export function isGenericTopic(topic: string): boolean {
  const normalized = topic.trim().toLowerCase();
  if (!normalized) return true;
  if (normalized.length <= 3) return true; // too short to be a real topic (e.g. "ها", "هو", "هي")
  if (GENERIC_TOPICS.has(normalized)) return true;
  
  const arabicPronouns = /^(عنها|عنه|عنهم|هذا|هذه|ذلك|الموضوع|الدرس|المقال|المادة|القصة|النص|المعلومات|it|this|that|them|topic|info)$/i;
  if (arabicPronouns.test(normalized)) return true;

  return false;
}

export function extractQuizTopic(
  message: string,
  conversationHistory?: Array<{ role: string; content: string }>
): string {
  const anchoredTopic = extractTopicByAnchor(message);
  if (anchoredTopic && !isGenericTopic(anchoredTopic)) {
    return anchoredTopic;
  }

  const cleaned = cleanupTopic(message);
  if (cleaned && !isGenericTopic(cleaned)) {
    return cleaned;
  }

  // If the extracted topic is generic or empty, scan the conversation history
  if (conversationHistory && conversationHistory.length > 0) {
    // 1. Scan backward for a user message that was NOT a quiz intent
    for (let i = conversationHistory.length - 1; i >= 0; i--) {
      const hist = conversationHistory[i];
      if (hist.role === "user" && hist.content && !detectQuizIntent(hist.content)) {
        const histTopic = extractTopicByAnchor(hist.content) || cleanupTopic(hist.content);
        if (histTopic && !isGenericTopic(histTopic)) {
          return histTopic;
        }
      }
    }

    // 2. Scan backward for an assistant message containing headers or titles
    for (let i = conversationHistory.length - 1; i >= 0; i--) {
      const hist = conversationHistory[i];
      if (hist.role === "assistant" && hist.content) {
        const headingMatch = hist.content.match(/^(?:###|##|#)\s+([^\n]+)/m);
        if (headingMatch?.[1]) {
          const cleanHeading = headingMatch[1].replace(/\[(?:important|info)::(.*?)\]/g, "$1").trim();
          const cleanTopic = cleanupTopic(cleanHeading);
          if (cleanTopic && !isGenericTopic(cleanTopic)) {
            return cleanTopic;
          }
        }
        
        const boldMatch = hist.content.match(/^\*\*([^*]+)\*\*/);
        if (boldMatch?.[1]) {
          const cleanTopic = cleanupTopic(boldMatch[1]);
          if (cleanTopic && !isGenericTopic(cleanTopic)) {
            return cleanTopic;
          }
        }
      }
    }
  }

  return cleaned || (containsArabic(message) ? "المعرفة العامة" : "general knowledge");
}

export function parseQuizRequest(
  message: string,
  conversationHistory?: Array<{ role: string; content: string }>
): ParsedQuizRequest {
  return {
    rawMessage: message,
    topic: extractQuizTopic(message, conversationHistory),
    requestedQuestionCount: parseRequestedQuestionCount(message),
    mode: parseRequestedMode(message),
    difficulty: parseRequestedDifficulty(message),
    language: detectQuizLanguage(message),
  };
}

function getDifficultyLabel(request: ParsedQuizRequest): string {
  if (request.language === "ar") {
    return request.difficulty === "easy" ? "سهل" : request.difficulty === "hard" ? "صعب" : "متوسط";
  }
  return request.difficulty;
}

export function buildQuizGenerationInstructions(request: ParsedQuizRequest): string {
  if (request.language === "ar") {
    return `أنشئ الآن اختبار اختيار من متعدد بصيغة JSON فقط.

الموضوع المطلوب: ${request.topic}
عدد الأسئلة المطلوب: ${request.requestedQuestionCount}
الوضع المطلوب: ${request.mode}
مستوى الصعوبة: ${getDifficultyLabel(request)}

قواعد إلزامية:
1. أخرج كتلة واحدة فقط باسم \`\`\`mcq-quiz.
2. داخل الكتلة أخرج JSON صالح فقط بدون أي شرح خارجي.
3. عنوان الاختبار ووصفه يجب أن يذكرا الموضوع حرفيًا: "${request.topic}".
4. كل سؤال يجب أن يكون متعلقًا مباشرة بموضوع "${request.topic}" وليس معرفة عامة.
5. استخدم 4 اختيارات فقط: a, b, c, d.
6. استخدم هذا الشكل بدقة:
{
  "title": "عنوان الاختبار",
  "description": "وصف قصير",
  "mode": "${request.mode}",
  "questions": [
    {
      "id": "q1",
      "question": "نص السؤال",
      "options": {
        "a": "الخيار الأول",
        "b": "الخيار الثاني",
        "c": "الخيار الثالث",
        "d": "الخيار الرابع"
      },
      "correctAnswer": "a",
      "explanation": "شرح واضح لسبب صحة الإجابة."
    }
  ]
}`;
  }

  return `Generate a multiple-choice quiz as JSON only.

Required topic: ${request.topic}
Required question count: ${request.requestedQuestionCount}
Required mode: ${request.mode}
Difficulty: ${request.difficulty}

Hard rules:
1. Output exactly one fenced block named \`\`\`mcq-quiz.
2. Inside the block, output valid JSON only with no extra prose.
3. The title and description must explicitly include the exact topic phrase "${request.topic}".
4. Every question must be directly about "${request.topic}", not general knowledge.
5. Use exactly 4 options only: a, b, c, d.
6. Use this exact shape:
{
  "title": "Quiz title",
  "description": "Short description",
  "mode": "${request.mode}",
  "questions": [
    {
      "id": "q1",
      "question": "Question text",
      "options": {
        "a": "Option A",
        "b": "Option B",
        "c": "Option C",
        "d": "Option D"
      },
      "correctAnswer": "a",
      "explanation": "Clear explanation."
    }
  ]
}`;
}

export function buildQuizRepairInstructions(request: ParsedQuizRequest, rawResponse: string): string {
  if (request.language === "ar") {
    return `الرد السابق لم يطابق التنسيق المطلوب أو لم يلتزم بالموضوع.

الموضوع الإلزامي: ${request.topic}
عدد الأسئلة الإلزامي: ${request.requestedQuestionCount}
الوضع الإلزامي: ${request.mode}

أعد كتابة الرد بالكامل الآن ككتلة \`\`\`mcq-quiz واحدة فقط وبداخلها JSON صالح فقط.
يجب أن يكون الاختبار كله عن "${request.topic}".
هذا هو الرد السابق لإصلاحه أو إعادة بنائه:
${rawResponse}`;
  }

  return `The previous response did not match the required format or topic.

Required topic: ${request.topic}
Required question count: ${request.requestedQuestionCount}
Required mode: ${request.mode}

Rewrite the entire answer now as exactly one \`\`\`mcq-quiz block containing valid JSON only.
The whole quiz must be about "${request.topic}".
Here is the previous response to repair or rebuild:
${rawResponse}`;
}

export function extractJsonLikeText(content: string): string {
  const mcqBlock = content.match(/```mcq-quiz\s*([\s\S]*?)```/i);
  if (mcqBlock?.[1]) {
    return mcqBlock[1].trim();
  }

  const jsonBlock = content.match(/```json\s*([\s\S]*?)```/i);
  if (jsonBlock?.[1]) {
    return jsonBlock[1].trim();
  }

  const genericBlock = content.match(/```[\w-]*\s*([\s\S]*?)```/i);
  if (genericBlock?.[1]) {
    return genericBlock[1].trim();
  }

  const firstBrace = content.indexOf("{");
  const lastBrace = content.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    return content.slice(firstBrace, lastBrace + 1).trim();
  }

  return content.trim();
}

function normalizeOptions(rawOptions: unknown): MCQOptionMap | null {
  if (!rawOptions) return null;

  const keys: Array<keyof MCQOptionMap> = ["a", "b", "c", "d"];
  const normalized: Partial<MCQOptionMap> = {};

  if (Array.isArray(rawOptions)) {
    const values = rawOptions.map((value) => String(value ?? "").trim()).filter(Boolean).slice(0, 4);
    if (values.length < 4) return null;
    keys.forEach((key, index) => {
      normalized[key] = values[index];
    });
    return normalized as MCQOptionMap;
  }

  if (typeof rawOptions !== "object") return null;

  const entries = Object.entries(rawOptions as Record<string, unknown>)
    .map(([key, value]) => [key.toLowerCase().trim(), String(value ?? "").trim()] as const)
    .filter(([, value]) => value.length > 0);

  if (entries.length < 4) return null;

  const byLetter = new Map(entries);
  keys.forEach((key, index) => {
    normalized[key] =
      byLetter.get(key) ||
      byLetter.get(key.toUpperCase()) ||
      entries[index]?.[1] ||
      "";
  });

  if (!normalized.a || !normalized.b || !normalized.c || !normalized.d) {
    return null;
  }

  return normalized as MCQOptionMap;
}

function normalizeCorrectAnswer(rawCorrect: unknown, options: MCQOptionMap): keyof MCQOptionMap | null {
  if (typeof rawCorrect === "string") {
    const lowered = rawCorrect.trim().toLowerCase();
    if (lowered in options) {
      return lowered as keyof MCQOptionMap;
    }
    const numeric = Number(lowered);
    if (!Number.isNaN(numeric) && numeric >= 1 && numeric <= 4) {
      return (["a", "b", "c", "d"][numeric - 1] as keyof MCQOptionMap);
    }
  }

  return null;
}

function normalizeQuizObject(raw: unknown, request: ParsedQuizRequest): MCQQuiz | null {
  if (!raw || typeof raw !== "object") return null;

  const root = raw as Record<string, any>;
  const candidate = root["mcq-quiz"] && typeof root["mcq-quiz"] === "object" ? root["mcq-quiz"] : root;
  const rawQuestions = Array.isArray(candidate.questions) ? candidate.questions : Array.isArray(candidate.items) ? candidate.items : null;

  if (!rawQuestions?.length) return null;

  const questions: MCQQuestion[] = [];

  for (let index = 0; index < rawQuestions.length; index++) {
    const item = rawQuestions[index] as Record<string, unknown>;
    const options = normalizeOptions(item.options);
    if (!options) return null;

    const correctAnswer = normalizeCorrectAnswer(
      item.correctAnswer ?? item.correct_answer ?? item.answer ?? item.correct ?? item.solution,
      options
    );

    const questionText = String(item.question ?? item.text ?? item.prompt ?? "").trim();
    const explanation = String(item.explanation ?? item.reason ?? item.rationale ?? "").trim();

    if (!questionText || !correctAnswer) return null;

    questions.push({
      id: String(item.id ?? `q${index + 1}`).trim() || `q${index + 1}`,
      question: questionText,
      options,
      correctAnswer,
      explanation:
        explanation ||
        (request.language === "ar"
          ? `الإجابة الصحيحة هي ${correctAnswer.toUpperCase()} لأنها الأنسب في هذا السؤال.`
          : `The correct answer is ${correctAnswer.toUpperCase()} because it best matches the question.`),
    });
  }

  const trimmedQuestions = questions.slice(0, request.requestedQuestionCount);
  if (trimmedQuestions.length < request.requestedQuestionCount) {
    return null;
  }

  const defaultTitle =
    request.language === "ar" ? `اختبار ${request.topic}` : `${request.topic} Quiz`;
  const defaultDescription =
    request.language === "ar"
      ? `اختبار اختيار من متعدد عن ${request.topic}`
      : `A multiple-choice quiz about ${request.topic}`;

  const normalizedQuiz: MCQQuiz = {
    title: String(candidate.title ?? defaultTitle).trim() || defaultTitle,
    description: String(candidate.description ?? defaultDescription).trim() || defaultDescription,
    mode: candidate.mode === "exam" ? "exam" : request.mode,
    questions: trimmedQuestions,
  };

  if (!normalizedQuiz.title.toLowerCase().includes(request.topic.toLowerCase())) {
    normalizedQuiz.title = defaultTitle;
  }

  if (!normalizedQuiz.description.toLowerCase().includes(request.topic.toLowerCase())) {
    normalizedQuiz.description = defaultDescription;
  }

  const validation = QUIZ_SCHEMA.safeParse(normalizedQuiz);
  return validation.success ? validation.data : null;
}

export function tryParseQuizFromText(content: string, request: ParsedQuizRequest): MCQQuiz | null {
  const candidateText = extractJsonLikeText(content);

  const parseAttempts = [candidateText];
  if (candidateText !== content.trim()) {
    parseAttempts.push(content.trim());
  }

  for (const attempt of parseAttempts) {
    try {
      const parsed = JSON.parse(attempt);
      const normalized = normalizeQuizObject(parsed, request);
      if (normalized) return normalized;
    } catch {
      // ignore
    }
  }

  return null;
}

export function formatQuizAsCodeBlock(quiz: MCQQuiz): string {
  return `\`\`\`mcq-quiz\n${JSON.stringify(quiz, null, 2)}\n\`\`\``;
}
