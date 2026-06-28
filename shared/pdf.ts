import { z } from "zod";

export type PDFDocumentLanguage = "ar" | "en" | "mixed";
export type PDFDocumentTheme = "dark" | "light" | "auto";
export type PDFPageSize = "a4" | "letter";

// ─── PDF Document Mode ────────────────────────────────────────────────────────
// study    = شرح دراسي عميق (الوضع الافتراضي)
// exam     = ورقة امتحان رسمية مع أسئلة اختيار متعدد
// quiz     = اختبار قصير (أسئلة + إجابات في PDF)
// worksheet = ورقة عمل / تدريب عملي
// flashcard = بطاقات مراجعة سريعة
export type PDFDocumentMode = "study" | "exam" | "quiz" | "worksheet" | "flashcard";

export type PDFSectionType =
  | "heading"
  | "paragraph"
  | "code"
  | "math"
  | "table"
  | "list"
  | "image"
  | "divider"
  | "quote"
  | "callout"
  | "qa"
  | "stat-card"
  | "timeline"
  | "two-column"
  | "chart-svg"
  | "badge"
  | "highlight-box"
  | "numbered-list"
  | "watermark"
  | "mcq-question"
  | "exam-header"
  | "answer-key"
  | "flashcard";

// ─── Chart Data ──────────────────────────────────────────────────────────────
export interface ChartDataPoint {
  label: string;
  value: number;
  color?: string;
}

// ─── Timeline Event ───────────────────────────────────────────────────────────
export interface TimelineEvent {
  date: string;
  title: string;
  description?: string;
  icon?: string;
  color?: string;
}

// ─── Stat Card Data ───────────────────────────────────────────────────────────
export interface StatCardData {
  value: string;
  label: string;
  unit?: string;
  trend?: "up" | "down" | "flat";
  trendValue?: string;
  icon?: string;
  color?: string;
}

// ─── Two-Column Content ───────────────────────────────────────────────────────
export interface TwoColumnContent {
  left: string;
  right: string;
  leftHeading?: string;
  rightHeading?: string;
}

// ─── MCQ Question (for exam/quiz PDF sections) ───────────────────────────────
export interface MCQQuestionSection {
  questionNumber?: number;
  questionText: string;
  options: { a: string; b: string; c: string; d: string };
  correctAnswer?: "a" | "b" | "c" | "d"; // hidden in exam mode, shown in quiz/answer-key
  explanation?: string;
  points?: number;
}

// ─── Flashcard ────────────────────────────────────────────────────────────────
export interface FlashcardData {
  front: string;
  back: string;
  hint?: string;
  category?: string;
}

// ─── PDF Section ──────────────────────────────────────────────────────────────
export interface PDFSection {
  id: string;
  type: PDFSectionType;
  level?: number;
  language?: string;
  direction?: "rtl" | "ltr";
  content: string;

  // List / Bullet types
  items?: string[];

  // Table
  rows?: string[][];
  headers?: string[];
  totalRow?: boolean;        // style last row as a totals row

  // Callout/badge variant
  variant?: "info" | "warning" | "success" | "error" | "primary" | "secondary";

  // Figure
  caption?: string;

  // Q&A
  question?: string;
  answer?: string;

  // Stat cards (array of cards for a row)
  cards?: StatCardData[];

  // Timeline events
  events?: TimelineEvent[];

  // Two-column layout
  columns?: TwoColumnContent;

  // SVG Chart
  chartType?: "bar" | "pie" | "line" | "donut";
  chartData?: ChartDataPoint[];
  chartTitle?: string;
  chartHeight?: number;

  // Watermark
  watermarkText?: string;
  watermarkOpacity?: number;

  // Numbered list (enhanced)
  numberedItems?: Array<{ number: string; title: string; description?: string }>;

  // Highlight box
  boxColor?: string;
  boxIcon?: string;

  // Badge text array
  badges?: Array<{ text: string; variant?: string }>;

  // MCQ Question (exam/quiz mode)
  mcqQuestion?: MCQQuestionSection;
  showAnswer?: boolean; // if true, renders correct answer (for quiz/answer-key)

  // Exam header metadata
  examMeta?: {
    subject?: string;
    grade?: string;
    duration?: string;
    totalMarks?: number;
    studentNameField?: boolean;
    dateField?: boolean;
    instructions?: string[];
  };

  // Flashcard data
  flashcards?: FlashcardData[];
}

// ─── PDF Document ─────────────────────────────────────────────────────────────
export interface PDFDocument {
  title: string;
  subtitle?: string;
  author?: string;
  date?: string;
  language: PDFDocumentLanguage;
  theme: PDFDocumentTheme;
  pageSize: PDFPageSize;
  coverPage: boolean;
  tableOfContents: boolean;
  sections: PDFSection[];
  /** V2 Authorization Gate: true only when an explicit operational command triggered this document */
  isCommandAuthorized?: boolean;
  metadata?: {
    subject?: string;
    keywords?: string[];
    category?: string;
    watermark?: string;
    watermarkOpacity?: number;
  };
}

// ─── Parsed PDF Request ───────────────────────────────────────────────────────
export interface ParsedPdfRequest {
  rawMessage: string;
  topic: string;
  language: PDFDocumentLanguage;
  requestedSections?: string[];
  includeCode: boolean;
  includeMath: boolean;
  includeTableOfContents: boolean;
  includeCoverPage: boolean;
  theme?: PDFDocumentTheme;
  pageSize?: PDFPageSize;
  /** Detected document mode — drives generation instructions */
  mode: PDFDocumentMode;
  /** Number of questions requested (exam/quiz modes) */
  questionCount?: number;
  /** Whether to include answer key at the end */
  includeAnswerKey?: boolean;
  /** Show answers inline (quiz mode) or separate (exam mode) */
  showAnswersInline?: boolean;
}

interface PdfNormalizationFallback {
  topic?: string;
  language?: PDFDocumentLanguage;
  includeCoverPage?: boolean;
  includeTableOfContents?: boolean;
}

// ─── Zod Schema ───────────────────────────────────────────────────────────────
const PDF_SCHEMA = z.object({
  title: z.string().min(1),
  subtitle: z.string().optional(),
  author: z.string().optional(),
  date: z.string().optional(),
  language: z.enum(["ar", "en", "mixed"]),
  theme: z.enum(["dark", "light", "auto"]).default("dark"),
  pageSize: z.enum(["a4", "letter"]).default("a4"),
  coverPage: z.boolean().default(true),
  tableOfContents: z.boolean().default(true),
  sections: z
    .array(
      z.object({
        id: z.string().min(1),
        type: z.enum([
          "heading", "paragraph", "code", "math", "table", "list",
          "image", "divider", "quote", "callout", "qa",
          "stat-card", "timeline", "two-column", "chart-svg",
          "badge", "highlight-box", "numbered-list", "watermark",
          "mcq-question", "exam-header", "answer-key", "flashcard",
        ]),
        level: z.number().int().min(1).max(6).optional(),
        language: z.string().optional(),
        direction: z.enum(["rtl", "ltr"]).optional(),
        content: z.string(),
        items: z.array(z.string()).optional(),
        rows: z.array(z.array(z.string())).optional(),
        headers: z.array(z.string()).optional(),
        totalRow: z.boolean().optional(),
        variant: z.enum(["info", "warning", "success", "error", "primary", "secondary"]).optional(),
        caption: z.string().optional(),
        question: z.string().optional(),
        answer: z.string().optional(),
        cards: z.array(z.object({
          value: z.string(),
          label: z.string(),
          unit: z.string().optional(),
          trend: z.enum(["up", "down", "flat"]).optional(),
          trendValue: z.string().optional(),
          icon: z.string().optional(),
          color: z.string().optional(),
        })).optional(),
        events: z.array(z.object({
          date: z.string(),
          title: z.string(),
          description: z.string().optional(),
          icon: z.string().optional(),
          color: z.string().optional(),
        })).optional(),
        columns: z.object({
          left: z.string(),
          right: z.string(),
          leftHeading: z.string().optional(),
          rightHeading: z.string().optional(),
        }).optional(),
        chartType: z.enum(["bar", "pie", "line", "donut"]).optional(),
        chartData: z.array(z.object({
          label: z.string(),
          value: z.number(),
          color: z.string().optional(),
        })).optional(),
        chartTitle: z.string().optional(),
        chartHeight: z.number().optional(),
        watermarkText: z.string().optional(),
        watermarkOpacity: z.number().optional(),
        numberedItems: z.array(z.object({
          number: z.string(),
          title: z.string(),
          description: z.string().optional(),
        })).optional(),
        boxColor: z.string().optional(),
        boxIcon: z.string().optional(),
        badges: z.array(z.object({
          text: z.string(),
          variant: z.string().optional(),
        })).optional(),
        // MCQ / Exam fields
        showAnswer: z.boolean().optional(),
        mcqQuestion: z.object({
          questionNumber: z.number().optional(),
          questionText: z.string(),
          options: z.object({ a: z.string(), b: z.string(), c: z.string(), d: z.string() }),
          correctAnswer: z.enum(["a","b","c","d"]).optional(),
          explanation: z.string().optional(),
          points: z.number().optional(),
        }).optional(),
        examMeta: z.object({
          subject: z.string().optional(),
          grade: z.string().optional(),
          duration: z.string().optional(),
          totalMarks: z.number().optional(),
          studentNameField: z.boolean().optional(),
          dateField: z.boolean().optional(),
          instructions: z.array(z.string()).optional(),
        }).optional(),
        // Flashcard fields
        flashcards: z.array(z.object({
          front: z.string(),
          back: z.string(),
          hint: z.string().optional(),
          category: z.string().optional(),
        })).optional(),
      })
    )
    .min(1),
  metadata: z
    .object({
      subject: z.string().optional(),
      keywords: z.array(z.string()).optional(),
      category: z.string().optional(),
      watermark: z.string().optional(),
      watermarkOpacity: z.number().optional(),
    })
    .optional(),
});

// ─── Intent Detection ─────────────────────────────────────────────────────────
const PDF_INTENT_REGEX =
  /(?:^|\s)(?:pdf|document|report|export\s+pdf|create\s+(?:a\s+)?(?:pdf|document|report)|generate\s+(?:a\s+)?(?:pdf|document|report)|convert\s+to\s+pdf)(?:\s|$)|(?:ملف\s*pdf|بي\s*دي\s*اف|وثيقة|مستند|تقرير|حو[ّو]ل(?:ه|ها)?\s*(?:ل|إلى)?\s*pdf|اعم[للي]*\s*pdf|صد[ّ]?ر(?:ها|ه)?\s*(?:pdf)?)/i;

// ─── PDF Mode Detection ───────────────────────────────────────────────────────
// Detects the INTENT behind the PDF request — exam, quiz, worksheet, flashcard, or study
const EXAM_PDF_REGEX =
  /(?:ورقة\s*امتحان|نموذج\s*امتحان|امتحان\s*(?:pdf|مستند|ورقة)|اسئلة\s*امتحان|exam\s*(?:pdf|paper|sheet)|test\s*(?:pdf|paper|sheet)|examination\s*pdf|create\s*(?:an?\s*)?exam|generate\s*(?:an?\s*)?exam|ورقة\s*اختبار|اختبار\s*(?:pdf|ورقة|رسمي))/i;

const QUIZ_PDF_REGEX =
  /(?:اسئلة|أسئلة|اسئله)\s*(?:pdf|في|ب|داخل)|(?:pdf|مستند)\s*(?:فيه|يحتوي|يشمل|مع)\s*(?:اسئلة|أسئلة|اختيارات|اختيار)|(?:quiz|questions?|mcq|multiple.?choice)\s*(?:pdf|document|file)|pdf\s*(?:with|containing?)\s*(?:questions?|quiz|mcq)|(?:اختيار\s*متعدد|اختيارات\s*متعددة)\s*(?:في\s*)?(?:pdf|مستند)/i;

const WORKSHEET_PDF_REGEX =
  /(?:ورقة\s*عمل|تمارين|تدريبات|exercises?|worksheet|practice\s*(?:pdf|sheet)|activity\s*(?:pdf|sheet)|ورقة\s*تدريب|تمرين\s*(?:pdf|في))/i;

const FLASHCARD_PDF_REGEX =
  /(?:بطاقات?\s*(?:مراجعة|تعليمية|دراسية)|flash\s*cards?|flashcards?|study\s*cards?|revision\s*cards?|memory\s*cards?|بطاقة\s*(?:تعلم|حفظ))/i;

export function detectPdfMode(message: string): PDFDocumentMode {
  if (FLASHCARD_PDF_REGEX.test(message)) return "flashcard";
  if (EXAM_PDF_REGEX.test(message)) return "exam";
  if (QUIZ_PDF_REGEX.test(message)) return "quiz";
  if (WORKSHEET_PDF_REGEX.test(message)) return "worksheet";
  return "study";
}

export function isPdfExamOrQuizMode(message: string): boolean {
  return EXAM_PDF_REGEX.test(message) || QUIZ_PDF_REGEX.test(message) ||
    WORKSHEET_PDF_REGEX.test(message) || FLASHCARD_PDF_REGEX.test(message);
}

const STOP_WORDS = new Set([
  "pdf", "document", "report", "file", "export", "generate", "create",
  "make", "build", "convert", "into", "to", "for", "about", "on", "the",
  "a", "an", "please", "with", "include", "summary", "professional",
  "ملف", "وثيقة", "مستند", "تقرير", "بي", "دي", "اف", "اعمل",
  "اعملي", "اعمللي", "سوي", "سويلي", "حول", "حوّل", "حولها",
  "صدّر", "صدر", "لي", "عن", "في", "على", "بخصوص", "مع", "احترافي",
  "احترافية", "ملخص",
]);

function containsArabic(text: string): boolean {
  return /[\u0600-\u06FF]/.test(text);
}

function detectSectionDirection(text: string): "rtl" | "ltr" {
  return containsArabic(text) ? "rtl" : "ltr";
}

export function detectPdfIntent(message: string): boolean {
  return PDF_INTENT_REGEX.test(message);
}

export function detectPdfLanguage(text: string): PDFDocumentLanguage {
  const hasArabic = containsArabic(text);
  const hasLatin = /[A-Za-z]/.test(text);
  if (hasArabic && hasLatin) return "mixed";
  if (hasArabic) return "ar";
  return "en";
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
    /(?:about|on|for|regarding)\s+(.+)$/i,
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

function extractRequestedSections(message: string): string[] | undefined {
  const sections: string[] = [];
  const checks: Array<[RegExp, string]> = [
    [/(?:introduction|overview|summary|مقدمة|ملخص)/i, "introduction"],
    [/(?:code|snippet|example|كود|مثال)/i, "code"],
    [/(?:math|equation|formula|معادلات|رياضيات|صيغة)/i, "math"],
    [/(?:table|comparison|جدول|مقارنة)/i, "table"],
    [/(?:conclusion|closing|خاتمة|استنتاج)/i, "conclusion"],
    [/(?:chart|graph|رسم بياني|مخطط)/i, "chart"],
    [/(?:timeline|خط زمني|مراحل)/i, "timeline"],
    [/(?:statistics|stats|إحصاء|إحصائيات)/i, "stats"],
  ];

  for (const [pattern, label] of checks) {
    if (pattern.test(message)) {
      sections.push(label);
    }
  }

  return sections.length ? sections : undefined;
}

function extractQuestionCount(message: string): number {
  // Match patterns like "10 questions", "٥ اسئلة", "5 أسئلة", etc.
  const match = message.match(/([\d٠-٩]+)\s*(?:questions?|سؤال|أسئلة|اسئلة|اسئله|سوال)/i) ||
    message.match(/(?:questions?|سؤال|أسئلة|اسئلة)\s*[:(]?\s*([\d٠-٩]+)/i);
  if (match?.[1]) {
    // Convert Arabic numerals to Western
    const num = parseInt(match[1].replace(/[٠-٩]/g, d => String("٠١٢٣٤٥٦٧٨٩".indexOf(d))));
    if (!isNaN(num) && num > 0 && num <= 100) return num;
  }
  return 10; // default
}

export function parsePdfRequest(message: string): ParsedPdfRequest {
  const anchoredTopic = extractTopicByAnchor(message);
  const cleanedTopic = cleanupTopic(message);
  const language = detectPdfLanguage(message);
  const lowered = message.toLowerCase();
  const mode = detectPdfMode(message);

  const includeCode =
    /(?:code|snippet|example|implementation|كود|أمثلة برمجية|برمجي)/i.test(message) ||
    lowered.includes("code") ||
    message.includes("كود");
  const includeMath =
    /(?:math|equation|formula|latex|معادلات|معادلة|رياضيات|صيغة)/i.test(message) ||
    lowered.includes("math") ||
    message.includes("معادلة") ||
    message.includes("معادلات");

  let theme: PDFDocumentTheme | undefined;
  if (/(?:light theme|light mode|ثيم فاتح|خلفية بيضاء|خلفية فاتحة|وضع فاتح)/i.test(message)) {
    theme = "light";
  } else if (/(?:dark theme|dark mode|ثيم داكن|خلفية سوداء|خلفية داكنة|وضع داكن)/i.test(message)) {
    theme = "dark";
  }

  let pageSize: PDFPageSize | undefined;
  if (/(?:letter size|letter format|حجم letter|حجم ليتر|امريكي|مقاس ليتر)/i.test(message)) {
    pageSize = "letter";
  } else if (/(?:a4 size|a4 format|حجم a4|مقاس a4)/i.test(message)) {
    pageSize = "a4";
  }

  const questionCount = (mode === "exam" || mode === "quiz" || mode === "worksheet")
    ? extractQuestionCount(message)
    : undefined;

  // exam mode: answer key at the end, answers hidden from questions
  // quiz mode: answers shown inline
  const includeAnswerKey = mode === "exam" || /(?:answer\s*key|مفتاح\s*الإجابات|إجابات\s*نموذجية|جدول\s*الإجابات)/i.test(message);
  const showAnswersInline = mode === "quiz" || mode === "worksheet" || mode === "flashcard";

  return {
    rawMessage: message,
    topic: anchoredTopic || cleanedTopic || (language === "ar" ? "موضوع احترافي" : "professional topic"),
    language,
    requestedSections: extractRequestedSections(message),
    includeCode,
    includeMath,
    includeTableOfContents: mode === "study" && (/(?:table of contents|contents|toc|فهرس|المحتويات)/i.test(message) || /(?:report|document|تقرير|مستند)/i.test(message)),
    includeCoverPage: mode === "study" && !/(?:without cover|no cover|بدون غلاف)/i.test(message),
    theme,
    pageSize,
    mode,
    questionCount,
    includeAnswerKey,
    showAnswersInline,
  };
}

// ─── Mode-Specific Generation Instructions ────────────────────────────────────
function buildExamPdfInstructions(request: ParsedPdfRequest): string {
  const count = request.questionCount || 10;
  const isAr = request.language === "ar";
  if (isAr) {
    return `أنشئ الآن ورقة امتحان رسمية واحترافية كـ PDF منظم بتنسيق JSON فقط.

المادة / الموضوع: ${request.topic}
عدد الأسئلة المطلوبة: ${count} سؤال اختيار من متعدد (4 خيارات لكل سؤال)
اللغة: عربي
الثيم: ${request.theme || "light"}
حجم الصفحة: ${request.pageSize || "a4"}

قواعد إلزامية:
1. أخرج كتلة \`\`\`pdf-document واحدة فقط بداخلها JSON صالح.
2. هيكل الـ sections يجب أن يكون:
   أ) exam-header: معلومات ورقة الامتحان (المادة، الزمن، الدرجة الكلية، اسم الطالب، التاريخ، التعليمات).
   ب) ${count} سؤال من نوع mcq-question: كل سؤال له questionText وأربعة خيارات (a/b/c/d) وعدد نقاط.
      - في وضع الامتحان: لا تظهر الإجابة الصحيحة في الأسئلة (showAnswer: false).
   ج) answer-key: جدول بمفاتيح الإجابات في النهاية.
3. اجعل الأسئلة متنوعة المستويات (سهل، متوسط، صعب) وذات صلة مباشرة بالموضوع.
4. استخدم direction: "rtl" لكل شيء.
5. أضف watermark: "نموذج امتحان — Apex AI" خفيفاً.
6. اجعل الأسئلة واضحة ومصاغة بشكل أكاديمي سليم.

JSON مثال للأقسام:
{
  "title": "امتحان مادة ${request.topic}",
  "subtitle": "نموذج امتحان أكاديمي",
  "language": "ar",
  "theme": "${request.theme || "light"}",
  "pageSize": "${request.pageSize || "a4"}",
  "coverPage": false,
  "tableOfContents": false,
  "sections": [
    {"id": "exam-hdr", "type": "exam-header", "content": "ورقة الامتحان", "direction": "rtl",
      "examMeta": {"subject": "${request.topic}", "grade": "السنة الدراسية", "duration": "90 دقيقة",
        "totalMarks": ${count * 2}, "studentNameField": true, "dateField": true,
        "instructions": ["اقرأ كل سؤال بتمعن قبل الإجابة", "اختر الإجابة الصحيحة الواحدة فقط", "لا يُسمح باستخدام الهاتف المحمول"]}},
    {"id": "q1", "type": "mcq-question", "content": "", "direction": "rtl", "showAnswer": false,
      "mcqQuestion": {"questionNumber": 1, "questionText": "نص السؤال الأول؟",
        "options": {"a": "الخيار أ", "b": "الخيار ب", "c": "الخيار ج", "d": "الخيار د"},
        "correctAnswer": "b", "points": 2}},
    {"id": "ans-key", "type": "answer-key", "content": "مفتاح الإجابات", "direction": "rtl",
      "headers": ["رقم السؤال", "الإجابة الصحيحة", "الدرجة"],
      "rows": [["1", "ب", "2"], ["2", "أ", "2"]]}
  ]
}
أنشئ ${count} سؤال mcq-question كاملاً الآن. لا تضع أي نص خارج كتلة pdf-document.`;
  }

  return `Generate a formal, professional exam paper as a structured PDF in JSON format only.

Subject / Topic: ${request.topic}
Required questions: ${count} multiple-choice questions (4 options each)
Language: English
Theme: ${request.theme || "light"}
Page size: ${request.pageSize || "a4"}

Mandatory rules:
1. Output exactly one \`\`\`pdf-document block containing valid JSON only.
2. Structure the sections as:
   a) exam-header: exam paper metadata (subject, duration, total marks, student name field, date, instructions).
   b) ${count} sections of type mcq-question: each with questionText, four options (a/b/c/d), points value.
      - Exam mode: do NOT show correct answer in questions (showAnswer: false).
   c) answer-key: a table with answer key at the end.
3. Questions must be varied in difficulty (easy/medium/hard) and directly relevant to the topic.
4. Make questions clear, unambiguous, and academically phrased.
5. Add a subtle watermark: "Exam Paper — Apex AI".

Generate all ${count} mcq-question sections now. No text outside the pdf-document block.`;
}

function buildQuizPdfInstructions(request: ParsedPdfRequest): string {
  const count = request.questionCount || 10;
  const isAr = request.language === "ar";
  if (isAr) {
    return `أنشئ مستند PDF اختبار قصير يحتوي على أسئلة مع الإجابات الصحيحة مُظهرة بشكل جمالي.

الموضوع: ${request.topic}
عدد الأسئلة: ${count}
اللغة: عربي
الثيم: ${request.theme || "light"}

قواعد:
1. أخرج كتلة \`\`\`pdf-document واحدة فقط بداخلها JSON صالح.
2. قسم المستند إلى:
   أ) heading: عنوان الاختبار مع وصف قصير.
   ب) ${count} سؤال من نوع mcq-question مع showAnswer: true (تظهر الإجابة الصحيحة والشرح).
   ج) callout (type: "success"): ملاحظة نهائية تحفيزية.
3. استخدم direction: "rtl" لكل شيء عربي.
4. اجعل الأسئلة تعليمية ومفيدة مع شرح واضح لكل إجابة.

أنشئ ${count} سؤال mcq-question كاملاً الآن مع showAnswer: true وشرح لكل إجابة.`;
  }

  return `Generate a quiz PDF document with questions and visible correct answers.

Topic: ${request.topic}
Question count: ${count}
Theme: ${request.theme || "light"}

Rules:
1. Output exactly one \`\`\`pdf-document block with valid JSON only.
2. Structure as: heading → ${count} mcq-question sections (showAnswer: true) → success callout.
3. Each mcq-question must show correctAnswer and a clear explanation.
4. Questions should be educational and explanations should teach, not just state the answer.

Generate all ${count} mcq-question sections with answers and explanations now.`;
}

function buildWorksheetPdfInstructions(request: ParsedPdfRequest): string {
  const count = request.questionCount || 10;
  const isAr = request.language === "ar";
  if (isAr) {
    return `أنشئ ورقة عمل / تدريب تعليمية كـ PDF منظم بتنسيق JSON.

الموضوع: ${request.topic}
عدد التمارين / الأسئلة: ${count}
اللغة: عربي

قواعد:
1. أخرج كتلة \`\`\`pdf-document فقط بداخلها JSON صالح.
2. اجمع بين أنواع متعددة من الأسئلة والأنشطة:
   - mcq-question: أسئلة اختيار متعدد (showAnswer: true مع شرح).
   - qa: أسئلة مقالية قصيرة أو تعبئة الفراغ.
   - numbered-list: خطوات تطبيقية أو مهام عملية.
   - highlight-box: ملاحظات وتلميحات مساعدة.
   - callout (info/success): تعليمات وإرشادات.
3. ابدأ بـ heading يشرح أهداف ورقة العمل.
4. أضف مساحة للكتابة في qa sections.
أنشئ ورقة العمل الكاملة الآن.`;
  }

  return `Generate an educational worksheet / practice PDF in JSON format.

Topic: ${request.topic}
Exercises / questions: ${count}

Rules:
1. Output one \`\`\`pdf-document block with valid JSON only.
2. Mix question types: mcq-question (with answers), qa (short answer), numbered-list (tasks), highlight-box (tips), callout (instructions).
3. Start with a heading explaining learning objectives.
4. Include explanations and hints throughout.
Generate the complete worksheet now.`;
}

function buildFlashcardPdfInstructions(request: ParsedPdfRequest): string {
  const count = request.questionCount || 20;
  const isAr = request.language === "ar";
  if (isAr) {
    return `أنشئ مستند PDF بطاقات مراجعة دراسية (Flash Cards) منظمة بتنسيق JSON.

الموضوع: ${request.topic}
عدد البطاقات: ${count}
اللغة: عربي

قواعد:
1. أخرج كتلة \`\`\`pdf-document واحدة فقط.
2. الهيكل: heading → ${count} sections من نوع flashcard، كل بطاقة تحتوي:
   - الوجه الأمامي (السؤال / المصطلح / المفهوم)
   - الوجه الخلفي (الإجابة / التعريف / الشرح)
   - تلميح اختياري (hint)
   - تصنيف (category)
3. اجعل البطاقات متنوعة وتغطي كل جوانب الموضوع.
4. استخدم تصميماً جمالياً وألواناً متناسقة لكل بطاقة.
أنشئ ${count} بطاقة مراجعة كاملة الآن.`;
  }

  return `Generate a study flashcard PDF document in JSON format.

Topic: ${request.topic}
Card count: ${count}

Rules:
1. Output one \`\`\`pdf-document block with valid JSON only.
2. Structure: heading → ${count} flashcard sections, each with front (question/term), back (answer/definition), optional hint, category.
3. Cover all aspects of the topic with varied, educational cards.
Generate all ${count} flashcards now.`;
}

// ─── Generation Instructions ───────────────────────────────────────────────────
export function buildPdfGenerationInstructions(request: ParsedPdfRequest): string {
  // Route to mode-specific instruction builder
  if (request.mode === "exam") return buildExamPdfInstructions(request);
  if (request.mode === "quiz") return buildQuizPdfInstructions(request);
  if (request.mode === "worksheet") return buildWorksheetPdfInstructions(request);
  if (request.mode === "flashcard") return buildFlashcardPdfInstructions(request);
  // Default: study mode

  const sectionHints = request.requestedSections?.length
    ? request.requestedSections.join(", ")
    : request.language === "ar"
      ? "مقدمة، نقاط رئيسية، جداول مقارنة، رسوم بيانية، خط زمني، إحصاءات، خاتمة"
      : "introduction, key points, comparison tables, charts, timeline, statistics, conclusion";

  if (request.language === "ar") {
    return `أنشئ الآن مستند PDF منظمًا تفصيليًا للغاية وكثيف المحتوى كهيكل JSON فقط.

الموضوع المطلوب: ${request.topic}
الأقسام المفضلة: ${sectionHints}
يتضمن كود: ${request.includeCode ? "نعم" : "لا"}
يتضمن معادلات: ${request.includeMath ? "نعم" : "لا"}
فهرس محتويات: ${request.includeTableOfContents ? "نعم" : "لا"}
صفحة غلاف: ${request.includeCoverPage ? "نعم" : "لا"}
ثيم المستند: ${request.theme || "dark"}
حجم الصفحة: ${request.pageSize || "a4"}

قواعد إلزامية للإبداع، التخطيط المسبق، وتكثيف المحتوى ليصبح احترافيًا وخارقًا (يجب أن يكون المستند شاملاً وتفصيليًا بشكل هائل ويصل إلى 25-35 صفحة عند الطباعة):
1. **أولاً وقبل أي شيء**، يجب أن تفكر وتخطط وتخرج أفكارك داخل كتلة \`<pdf-plan>...</pdf-plan>\`. في هذه الخطة، ابتكر أفكاراً إبداعية غير متكررة، حدد ألواناً احترافية ومختلفة تماماً عن المرات السابقة (تجنب الألوان الأساسية المملة، استخدم لوحات ألوان علمية/هندسية فريدة)، وحدد أنواع الرسوم البيانية التي تخدم البيانات بذكاء. يجب ألا تكون ردودك قالبية أو موحدة. كن حراً، جريئاً، ومبدعاً في التخطيط!
2. **ثانياً**، بعد إغلاق كتلة التخطيط \`</pdf-plan>\`، أخرج كتلة واحدة فقط باسم \`\`\`pdf-document.
3. داخل كتلة \`\`\`pdf-document أخرج JSON صالح فقط بدون أي شرح خارجي.
4. خطط هيكل المستند ليكتب بأعلى قدرة استيعابية وتفاصيل فائقة. قم بإنشاء أقسام فرعية متعددة (H1, H2, H3, H4) متبوعة بشروحات وافية وتفصيلية لكل عنصر. يجب ألا تقل الفقرة الواحدة عن 200-300 كلمة.
4. وزع المحتوى على 35 إلى 55 قسمًا (section) منظمًا منطقيًا يغطي كافة الجوانب:
   - صفحة الغلاف والتمهيد والمقدمة الشاملة.
   - **بطاقات إحصاء** (type: "stat-card") بـ 4 بطاقات على الأقل تُظهر أرقامًا مبتكرة مع مؤشرات نمو واقعية ومتنوعة (trend: "up"/"down"/"flat"). استخدم ألوانًا إبداعية لكل بطاقة!
   - **خط زمني** (type: "timeline") بـ 6 أحداث على الأقل لعرض التطور.
   - **رسوم بيانية SVG** (type: "chart-svg") بنوعين مختلفين على الأقل (اختر الأنسب للبيانات، مثل line للنمو الزمني، donut للنسب، إلخ). ابدع في اختيار ألوان كل ChartDataPoint لتكوين لوحة ألوان مبهرة ومتناغمة (Harmony). لا تستخدم نفس الألوان المكررة!
   - **تخطيط عمودين** (type: "two-column") لعرض المقارنات المزدوجة بذكاء.
   - **قوائم مرقمة** (type: "numbered-list") مع وصف تفصيلي.
   - **صناديق تمييز** (type: "highlight-box") بألوان متناغمة مع التصميم العام لإبراز النقاط الحاسمة.
   - **شارات** (type: "badge") لتصنيف المعلومات بألوان مدروسة.
   - الخلفية التاريخية أو السياق النظري للموضوع.
   - التحليل المتعمق والتفاصيل التقنية (باستخدام القوائم المنظمة والجداول المقارنة المفصلة).
   - الأكواد البرمجية الكاملة (مع التعليقات والشروحات) والمعادلات الرياضية بصيغة LaTeX المفصلة إن أمكن.
   - قسم خاص بالأسئلة الشائعة والأجوبة (type: "qa") بطريقة تفاعلية ومنظمة (بإضافة 5 أسئلة على الأقل).
   - الملاحظات الهامة والتحذيرات باستخدام كتل التنبيه (type: "callout") المتنوعة (info, warning, success, error).
   - استشهادات واقتباسات ملهمة (type: "quote") وفواصل جمالية (type: "divider").
   - الخاتمة والتوصيات العملية والمراجع أو الملحق.
5. تأكد من أن كل جدول يحتوي على عدد كبير من الصفوف والأعمدة ليعكس دراسة حقيقية وتفصيلية، واملأ الخلايا ببيانات حقيقية وكاملة دون أي اختزال. لجداول الإجمالي أضف "totalRow": true لآخر صف.
6. استخدم direction = "rtl" للمحتوى العربي و "ltr" للإنجليزي.
7. يجب أن يحتوي كائن الـ JSON على حقل theme بقيمة "${request.theme || "dark"}" وحقل pageSize بقيمة "${request.pageSize || "a4"}".
8. تمييز وتظليل الكلمات والمصطلحات الهامة في أي نص باستخدام تنسيق الماركر: ==نص مهم==.
9. إدراج معادلات رياضية مضمنة داخل الفقرات أو عناصر القوائم أو الجداول باستخدام التنسيق \\( ... \\) أو $...$.
10. لا تضف أي نص قبل أو بعد كتلة \`\`\`pdf-document.
11. استخدم بنية PDFDocument بدقة.
12. كل section يجب أن تحتوي id و type و content (باستثناء qa التي تستخدم question و answer، وstat-card التي تستخدم cards، وtimeline التي تستخدم events).

أمثلة JSON للأنواع الجديدة:

stat-card مثال:
{"id": "stats-1", "type": "stat-card", "content": "الإحصاءات الرئيسية", "direction": "rtl", "cards": [{"value": "98.7%", "label": "نسبة الدقة", "trend": "up", "trendValue": "+2.3%", "color": "#10b981"}, {"value": "4.2M", "label": "مستخدم نشط", "unit": "مستخدم", "trend": "up", "trendValue": "+15%", "color": "#8b5cf6"}, {"value": "0.3s", "label": "وقت الاستجابة", "trend": "down", "trendValue": "-40ms", "color": "#06b6d4"}, {"value": "99.9%", "label": "وقت التشغيل", "trend": "flat", "color": "#f59e0b"}]}

timeline مثال:
{"id": "timeline-1", "type": "timeline", "content": "المراحل التاريخية", "direction": "rtl", "events": [{"date": "2020", "title": "البداية", "description": "تأسيس المشروع وبناء الفريق الأساسي"}, {"date": "2021", "title": "التطوير", "description": "إطلاق النسخة التجريبية الأولى"}, {"date": "2022", "title": "النمو", "description": "الوصول إلى مليون مستخدم"}]}

chart-svg مثال:
{"id": "chart-1", "type": "chart-svg", "content": "توزيع الاستخدام", "chartType": "bar", "chartTitle": "نسبة استخدام التقنيات", "chartData": [{"label": "Python", "value": 45, "color": "#8b5cf6"}, {"label": "JavaScript", "value": 35, "color": "#06b6d4"}, {"label": "Java", "value": 12, "color": "#10b981"}, {"label": "Other", "value": 8, "color": "#f59e0b"}]}

two-column مثال:
{"id": "col-1", "type": "two-column", "content": "مقارنة النهجين", "direction": "rtl", "columns": {"leftHeading": "المزايا", "left": "نص المزايا التفصيلي هنا...", "rightHeading": "العيوب", "right": "نص العيوب التفصيلي هنا..."}}

highlight-box مثال:
{"id": "box-1", "type": "highlight-box", "content": "هذه نقطة حاسمة جداً يجب الانتباه إليها بعناية فائقة.", "direction": "rtl", "boxColor": "#8b5cf6", "boxIcon": "⚡"}

numbered-list مثال:
{"id": "num-1", "type": "numbered-list", "content": "خطوات التنفيذ", "direction": "rtl", "numberedItems": [{"number": "01", "title": "التخطيط", "description": "وضع الخطة الشاملة والأهداف..."}, {"number": "02", "title": "التطوير", "description": "البدء في التطوير الفعلي..."}]}

badge مثال:
{"id": "badge-1", "type": "badge", "content": "تصنيف المستوى", "badges": [{"text": "متقدم", "variant": "primary"}, {"text": "موصى به", "variant": "success"}, {"text": "جديد", "variant": "info"}]}`;
  }

  return `Generate a highly structured, extremely detailed, dense, and comprehensive PDF document as JSON only.

Required topic: ${request.topic}
Preferred sections: ${sectionHints}
Include code: ${request.includeCode ? "yes" : "no"}
Include math: ${request.includeMath ? "yes" : "no"}
Include table of contents: ${request.includeTableOfContents ? "yes" : "no"}
Include cover page: ${request.includeCoverPage ? "yes" : "no"}
Preferred document theme: ${request.theme || "dark"}
Preferred page size: ${request.pageSize || "a4"}

Mandatory rules for maximum creativity, density, and professional structure (designed to scale to 25-35 printed pages):
1. **FIRST**, you MUST think, brainstorm, and plan your document inside a \`<pdf-plan>...</pdf-plan>\` block. In this plan, explicitly outline a unique and creative color palette (avoid boring default colors, invent stunning professional harmonies), decide the best chart types for the data, and build a narrative flow that ensures the document feels unique and NOT like a repetitive template. Be free and creative!
2. **SECOND**, after closing the \`</pdf-plan>\` block, output exactly one fenced block named \`\`\`pdf-document.
3. Inside the block, output valid JSON only with no prose.
4. Structure the document into 35 to 55 logical sections representing a complete enterprise-grade report. Deep dive into topics with paragraphs of 200-300 words. Avoid abbreviations.
   - Premium cover page and comprehensive Executive Summary / Introduction.
   - **Stat cards** (type: "stat-card") with at least 4 cards showing creative metrics. Use diverse and thoughtful colors for each card!
   - **Timeline** (type: "timeline") with at least 6 events.
   - **SVG Charts** (type: "chart-svg") with at least 2 different chart types (e.g. line for trends, donut for distributions). Create a stunning, non-repetitive color harmony for the \`ChartDataPoint\`s. Do not use standard default colors!
   - **Two-column layout** (type: "two-column") for smart side-by-side comparisons.
   - **Numbered lists** (type: "numbered-list") with detailed descriptions.
   - **Highlight boxes** (type: "highlight-box") in various harmonious colors to emphasize critical points.
   - **Badges** (type: "badge") for categorizing information creatively.
   - Deep dive analysis, background context, and detailed core methodologies.
   - Informative tables comparing features, metrics, or benchmarks, containing extensive rows/columns with complete datasets. Add "totalRow": true for summary rows.
   - Detailed code blocks with comments, and mathematical proofs using LaTeX formatting (if applicable).
   - A dedicated Q&A section (type: "qa") containing at least 5 detailed, long-form questions and answers.
   - Important warnings, notes, or tips using callouts (info, warning, success, error).
   - Key quotes from literature or industry standards, separated by structural dividers.
   - Practical recommendations, a detailed conclusion, and references or appendix.
5. Match the user's language exactly, and use RTL direction for Arabic text.
6. You MUST set the document theme to "${request.theme || "dark"}" and page size to "${request.pageSize || "a4"}" in the JSON.
7. Highlight key terms using ==highlighted text==.
8. Include inline mathematical formulas using \\( ... \\) or $...$ syntax.
9. Do not output any text before or after the \`\`\`pdf-document block.
10. Follow the PDFDocument shape exactly.
11. Every section must include id, type, and content (except qa which uses question/answer, stat-card which uses cards, timeline which uses events).

JSON examples for new section types:

stat-card example:
{"id": "stats-1", "type": "stat-card", "content": "Key Metrics", "cards": [{"value": "98.7%", "label": "Accuracy Rate", "trend": "up", "trendValue": "+2.3%", "color": "#10b981"}, {"value": "4.2M", "label": "Active Users", "unit": "users", "trend": "up", "trendValue": "+15%", "color": "#8b5cf6"}, {"value": "0.3s", "label": "Response Time", "trend": "down", "trendValue": "-40ms", "color": "#06b6d4"}, {"value": "99.9%", "label": "Uptime", "trend": "flat", "color": "#f59e0b"}]}

timeline example:
{"id": "timeline-1", "type": "timeline", "content": "Historical Milestones", "events": [{"date": "2020 Q1", "title": "Project Launch", "description": "Founded the initiative with a core team of 5 researchers"}, {"date": "2021 Q2", "title": "First Release", "description": "Beta version launched to 10,000 early adopters"}, {"date": "2022 Q4", "title": "Scale Up", "description": "Reached 1 million active users globally"}]}

chart-svg example:
{"id": "chart-1", "type": "chart-svg", "content": "Usage Distribution", "chartType": "bar", "chartTitle": "Technology Stack Usage", "chartData": [{"label": "Python", "value": 45, "color": "#8b5cf6"}, {"label": "JavaScript", "value": 35, "color": "#06b6d4"}, {"label": "Java", "value": 12, "color": "#10b981"}, {"label": "Other", "value": 8, "color": "#f59e0b"}]}

two-column example:
{"id": "col-1", "type": "two-column", "content": "Approach Comparison", "columns": {"leftHeading": "Advantages", "left": "Detailed advantages text here...", "rightHeading": "Disadvantages", "right": "Detailed disadvantages text here..."}}

highlight-box example:
{"id": "box-1", "type": "highlight-box", "content": "This is a critical insight that requires careful attention and must not be overlooked in any implementation.", "boxColor": "#8b5cf6", "boxIcon": "⚡"}

numbered-list example:
{"id": "num-1", "type": "numbered-list", "content": "Implementation Steps", "numberedItems": [{"number": "01", "title": "Planning", "description": "Establish comprehensive roadmap and define success metrics..."}, {"number": "02", "title": "Development", "description": "Begin iterative development cycles using agile methodology..."}]}

badge example:
{"id": "badge-1", "type": "badge", "content": "Skill Level Indicators", "badges": [{"text": "Advanced", "variant": "primary"}, {"text": "Recommended", "variant": "success"}, {"text": "New", "variant": "info"}]}`;
}

// ─── Repair Instructions ───────────────────────────────────────────────────────
export function buildPdfRepairInstructions(request: ParsedPdfRequest, rawResponse: string): string {
  if (request.language === "ar") {
    return `الرد السابق لم يطابق تنسيق PDF المطلوب.

الموضوع الإلزامي: ${request.topic}
أعد كتابة الرد بالكامل الآن ككتلة \`\`\`pdf-document واحدة فقط وبداخلها JSON صالح فقط.
يجب أن يكون المستند كله عن "${request.topic}".
هذا هو الرد السابق لإصلاحه أو إعادة بنائه:
${rawResponse}`;
  }

  return `The previous response did not match the required PDF format.

Required topic: ${request.topic}
Rewrite the entire answer now as exactly one \`\`\`pdf-document block containing valid JSON only.
The whole document must be about "${request.topic}".
Here is the previous response to repair or rebuild:
${rawResponse}`;
}

// ─── JSON Extraction ───────────────────────────────────────────────────────────
export function extractPdfJsonText(content: string): string {
  const pdfBlock = content.match(/```pdf-document\s*([\s\S]*?)```/i);
  if (pdfBlock?.[1]) {
    return pdfBlock[1].trim();
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

// ─── Row Normalization ─────────────────────────────────────────────────────────
function normalizeRows(rawRows: unknown): string[][] | undefined {
  if (!Array.isArray(rawRows)) return undefined;
  const rows = rawRows
    .map((row) => {
      if (Array.isArray(row)) {
        return row.map((cell) => String(cell ?? "").trim());
      }

      if (row && typeof row === "object") {
        return Object.values(row as Record<string, unknown>).map((cell) => String(cell ?? "").trim());
      }

      return [];
    })
    .filter((row) => row.length > 0);
  return rows.length ? rows : undefined;
}

// ─── Section Type Normalization ────────────────────────────────────────────────
function normalizeSectionType(type: unknown): PDFSectionType | null {
  const normalized = String(type ?? "").trim().toLowerCase();
  if (!normalized) return null;

  const aliasMap: Record<string, PDFSectionType> = {
    heading: "heading",
    title: "heading",
    subtitle: "heading",
    header: "heading",
    subheading: "heading",
    paragraph: "paragraph",
    text: "paragraph",
    body: "paragraph",
    prose: "paragraph",
    content: "paragraph",
    code: "code",
    codeblock: "code",
    "code-block": "code",
    snippet: "code",
    math: "math",
    equation: "math",
    formula: "math",
    latex: "math",
    table: "table",
    grid: "table",
    spreadsheet: "table",
    list: "list",
    bullet: "list",
    bullets: "list",
    ordered: "list",
    unordered: "list",
    image: "image",
    figure: "image",
    divider: "divider",
    hr: "divider",
    rule: "divider",
    quote: "quote",
    blockquote: "quote",
    callout: "callout",
    alert: "callout",
    note: "callout",
    warning: "callout",
    info: "callout",
    qa: "qa",
    "q&a": "qa",
    question: "qa",
    faq: "qa",
    // New types
    "stat-card": "stat-card",
    statcard: "stat-card",
    stats: "stat-card",
    statistics: "stat-card",
    metric: "stat-card",
    metrics: "stat-card",
    kpi: "stat-card",
    timeline: "timeline",
    "time-line": "timeline",
    milestones: "timeline",
    roadmap: "timeline",
    "two-column": "two-column",
    twocolumn: "two-column",
    columns: "two-column",
    "split-view": "two-column",
    "chart-svg": "chart-svg",
    chart: "chart-svg",
    graph: "chart-svg",
    "bar-chart": "chart-svg",
    "pie-chart": "chart-svg",
    "line-chart": "chart-svg",
    badge: "badge",
    badges: "badge",
    tags: "badge",
    labels: "badge",
    "highlight-box": "highlight-box",
    highlightbox: "highlight-box",
    highlight: "highlight-box",
    "key-point": "highlight-box",
    keypoint: "highlight-box",
    "numbered-list": "numbered-list",
    numberedlist: "numbered-list",
    steps: "numbered-list",
    procedure: "numbered-list",
    watermark: "watermark",
    // Exam / Quiz / Flashcard types
    "mcq-question": "mcq-question",
    mcqquestion: "mcq-question",
    mcq: "mcq-question",
    "multiple-choice": "mcq-question",
    multiplechoice: "mcq-question",
    "exam-header": "exam-header",
    examheader: "exam-header",
    "exam-info": "exam-header",
    examinfo: "exam-header",
    "answer-key": "answer-key",
    answerkey: "answer-key",
    answers: "answer-key",
    "answer-sheet": "answer-key",
    flashcard: "flashcard",
    "flash-card": "flashcard",
    card: "flashcard",
    cards: "flashcard",
  };

  return aliasMap[normalized] || null;
}

// ─── Section Normalization ─────────────────────────────────────────────────────
function normalizeSection(rawSection: Record<string, unknown>, index: number): PDFSection | null {
  const type = normalizeSectionType(rawSection.type) || "paragraph";
  const content = String(
    rawSection.content ??
      rawSection.text ??
      rawSection.body ??
      rawSection.code ??
      rawSection.formula ??
      rawSection.latex ??
      rawSection.url ??
      rawSection.src ??
      ""
  ).trim();
  const items = Array.isArray(rawSection.items)
    ? rawSection.items.map((item) => String(item ?? "").trim()).filter(Boolean)
    : undefined;
  const headers = Array.isArray(rawSection.headers)
    ? rawSection.headers.map((item) => String(item ?? "").trim()).filter(Boolean)
    : undefined;
  const rows = normalizeRows(rawSection.rows);
  const question = String(rawSection.question ?? rawSection.q ?? "").trim();
  const answer = String(rawSection.answer ?? rawSection.a ?? "").trim();

  // Special types may not have content
  const hasSpecialData =
    (type === "stat-card" && Array.isArray(rawSection.cards) && (rawSection.cards as unknown[]).length > 0) ||
    (type === "timeline" && Array.isArray(rawSection.events) && (rawSection.events as unknown[]).length > 0) ||
    (type === "two-column" && rawSection.columns && typeof rawSection.columns === "object") ||
    (type === "chart-svg" && Array.isArray(rawSection.chartData) && (rawSection.chartData as unknown[]).length > 0) ||
    (type === "badge" && Array.isArray(rawSection.badges) && (rawSection.badges as unknown[]).length > 0) ||
    (type === "numbered-list" && Array.isArray(rawSection.numberedItems) && (rawSection.numberedItems as unknown[]).length > 0) ||
    (type === "mcq-question" && rawSection.mcqQuestion && typeof rawSection.mcqQuestion === "object") ||
    (type === "exam-header" && rawSection.examMeta && typeof rawSection.examMeta === "object") ||
    (type === "flashcard" && Array.isArray(rawSection.flashcards) && (rawSection.flashcards as unknown[]).length > 0) ||
    (type === "answer-key");

  if (!content && type !== "divider" && type !== "watermark" && !items?.length && !rows?.length && !question && !answer && !hasSpecialData) return null;

  const direction =
    rawSection.direction === "rtl" || rawSection.direction === "ltr"
      ? rawSection.direction
      : detectSectionDirection(content || items?.join(" ") || headers?.join(" ") || question || answer || "");

  // Normalize stat cards
  let cards: StatCardData[] | undefined;
  if (Array.isArray(rawSection.cards)) {
    cards = (rawSection.cards as unknown[]).map((c: unknown) => {
      const card = c as Record<string, unknown>;
      return {
        value: String(card.value ?? "").trim(),
        label: String(card.label ?? "").trim(),
        unit: card.unit ? String(card.unit) : undefined,
        trend: (card.trend === "up" || card.trend === "down" || card.trend === "flat") ? card.trend : undefined,
        trendValue: card.trendValue ? String(card.trendValue) : undefined,
        icon: card.icon ? String(card.icon) : undefined,
        color: card.color ? String(card.color) : undefined,
      } as StatCardData;
    });
  }

  // Normalize timeline events
  let events: TimelineEvent[] | undefined;
  if (Array.isArray(rawSection.events)) {
    events = (rawSection.events as unknown[]).map((e: unknown) => {
      const event = e as Record<string, unknown>;
      return {
        date: String(event.date ?? "").trim(),
        title: String(event.title ?? "").trim(),
        description: event.description ? String(event.description).trim() : undefined,
        icon: event.icon ? String(event.icon) : undefined,
        color: event.color ? String(event.color) : undefined,
      } as TimelineEvent;
    }).filter((e) => e.date && e.title);
  }

  // Normalize two-column
  let columns: TwoColumnContent | undefined;
  if (rawSection.columns && typeof rawSection.columns === "object") {
    const col = rawSection.columns as Record<string, unknown>;
    columns = {
      left: String(col.left ?? "").trim(),
      right: String(col.right ?? "").trim(),
      leftHeading: col.leftHeading ? String(col.leftHeading).trim() : undefined,
      rightHeading: col.rightHeading ? String(col.rightHeading).trim() : undefined,
    };
  }

  // Normalize chart data
  let chartData: ChartDataPoint[] | undefined;
  if (Array.isArray(rawSection.chartData)) {
    chartData = (rawSection.chartData as unknown[]).map((d: unknown) => {
      const point = d as Record<string, unknown>;
      return {
        label: String(point.label ?? "").trim(),
        value: Number(point.value ?? 0),
        color: point.color ? String(point.color) : undefined,
      } as ChartDataPoint;
    }).filter((d) => d.label && !isNaN(d.value));
  }

  // Normalize numbered items
  let numberedItems: Array<{ number: string; title: string; description?: string }> | undefined;
  if (Array.isArray(rawSection.numberedItems)) {
    numberedItems = (rawSection.numberedItems as unknown[]).map((n: unknown) => {
      const item = n as Record<string, unknown>;
      return {
        number: String(item.number ?? "").trim(),
        title: String(item.title ?? "").trim(),
        description: item.description ? String(item.description).trim() : undefined,
      };
    }).filter((n) => n.title);
  }

  // Normalize badges
  let badges: Array<{ text: string; variant?: string }> | undefined;
  if (Array.isArray(rawSection.badges)) {
    badges = (rawSection.badges as unknown[]).map((b: unknown) => {
      const badge = b as Record<string, unknown>;
      return {
        text: String(badge.text ?? "").trim(),
        variant: badge.variant ? String(badge.variant) : undefined,
      };
    }).filter((b) => b.text);
  }

  // Normalize MCQ question
  let mcqQuestion: MCQQuestionSection | undefined;
  if (rawSection.mcqQuestion && typeof rawSection.mcqQuestion === "object") {
    const q = rawSection.mcqQuestion as Record<string, unknown>;
    const opts = (q.options && typeof q.options === "object") ? q.options as Record<string, unknown> : {};
    mcqQuestion = {
      questionNumber: typeof q.questionNumber === "number" ? q.questionNumber : undefined,
      questionText: String(q.questionText ?? q.question ?? "").trim(),
      options: {
        a: String(opts.a ?? "").trim(),
        b: String(opts.b ?? "").trim(),
        c: String(opts.c ?? "").trim(),
        d: String(opts.d ?? "").trim(),
      },
      correctAnswer: (q.correctAnswer === "a" || q.correctAnswer === "b" || q.correctAnswer === "c" || q.correctAnswer === "d")
        ? q.correctAnswer : undefined,
      explanation: q.explanation ? String(q.explanation).trim() : undefined,
      points: typeof q.points === "number" ? q.points : undefined,
    };
  }

  // Normalize exam header meta
  let examMeta: PDFSection["examMeta"] | undefined;
  if (rawSection.examMeta && typeof rawSection.examMeta === "object") {
    const m = rawSection.examMeta as Record<string, unknown>;
    examMeta = {
      subject: m.subject ? String(m.subject).trim() : undefined,
      grade: m.grade ? String(m.grade).trim() : undefined,
      duration: m.duration ? String(m.duration).trim() : undefined,
      totalMarks: typeof m.totalMarks === "number" ? m.totalMarks : undefined,
      studentNameField: typeof m.studentNameField === "boolean" ? m.studentNameField : undefined,
      dateField: typeof m.dateField === "boolean" ? m.dateField : undefined,
      instructions: Array.isArray(m.instructions) ? (m.instructions as unknown[]).map(i => String(i).trim()).filter(Boolean) : undefined,
    };
  }

  // Normalize flashcards
  let flashcards: FlashcardData[] | undefined;
  if (Array.isArray(rawSection.flashcards)) {
    flashcards = (rawSection.flashcards as unknown[]).map((f: unknown) => {
      const fc = f as Record<string, unknown>;
      return {
        front: String(fc.front ?? fc.question ?? fc.term ?? "").trim(),
        back: String(fc.back ?? fc.answer ?? fc.definition ?? "").trim(),
        hint: fc.hint ? String(fc.hint).trim() : undefined,
        category: fc.category ? String(fc.category).trim() : undefined,
      } as FlashcardData;
    }).filter(f => f.front && f.back);
  }

  return {
    id: String(rawSection.id ?? `section-${index + 1}`).trim() || `section-${index + 1}`,
    type,
    level:
      typeof rawSection.level === "number"
        ? rawSection.level
        : typeof rawSection.depth === "number"
          ? rawSection.depth
          : type === "heading"
            ? 2
            : undefined,
    language: typeof rawSection.language === "string" ? rawSection.language : undefined,
    direction,
    content,
    items,
    rows,
    headers,
    totalRow: typeof rawSection.totalRow === "boolean" ? rawSection.totalRow : undefined,
    question: question || undefined,
    answer: answer || undefined,
    variant:
      rawSection.variant === "info" ||
      rawSection.variant === "warning" ||
      rawSection.variant === "success" ||
      rawSection.variant === "error" ||
      rawSection.variant === "primary" ||
      rawSection.variant === "secondary"
        ? rawSection.variant
        : rawSection.type === "warning" || rawSection.type === "error" || rawSection.type === "success" || rawSection.type === "info"
          ? (rawSection.type as "info" | "warning" | "success" | "error")
        : undefined,
    caption:
      typeof rawSection.caption === "string"
        ? rawSection.caption
        : typeof rawSection.alt === "string"
          ? rawSection.alt
          : undefined,
    cards,
    events,
    columns,
    chartType: (rawSection.chartType === "bar" || rawSection.chartType === "pie" || rawSection.chartType === "line" || rawSection.chartType === "donut")
      ? rawSection.chartType : undefined,
    chartData,
    chartTitle: typeof rawSection.chartTitle === "string" ? rawSection.chartTitle : undefined,
    chartHeight: typeof rawSection.chartHeight === "number" ? rawSection.chartHeight : undefined,
    watermarkText: typeof rawSection.watermarkText === "string" ? rawSection.watermarkText : undefined,
    watermarkOpacity: typeof rawSection.watermarkOpacity === "number" ? rawSection.watermarkOpacity : undefined,
    numberedItems,
    boxColor: typeof rawSection.boxColor === "string" ? rawSection.boxColor : undefined,
    boxIcon: typeof rawSection.boxIcon === "string" ? rawSection.boxIcon : undefined,
    badges,
    // Exam / Quiz / Flashcard fields
    mcqQuestion,
    showAnswer: typeof rawSection.showAnswer === "boolean" ? rawSection.showAnswer : undefined,
    examMeta,
    flashcards,
  };
}

// ─── Document Normalization ────────────────────────────────────────────────────
export function normalizePdfObject(raw: unknown, fallback?: PdfNormalizationFallback): PDFDocument | null {
  if (!raw || typeof raw !== "object") return null;

  const root = raw as Record<string, unknown>;
  const candidate =
    root["pdf-document"] && typeof root["pdf-document"] === "object"
      ? (root["pdf-document"] as Record<string, unknown>)
      : root;

  const coverPageObject =
    candidate.coverPage && typeof candidate.coverPage === "object"
      ? (candidate.coverPage as Record<string, unknown>)
      : null;

  const rawSections = Array.isArray(candidate.sections)
    ? candidate.sections
    : Array.isArray(candidate.content)
      ? candidate.content
      : null;
  if (!rawSections?.length) return null;

  const sections = rawSections
    .map((section, index) =>
      section && typeof section === "object" ? normalizeSection(section as Record<string, unknown>, index) : null
    )
    .filter(Boolean) as PDFSection[];

  if (!sections.length) return null;

  const inferredLanguage =
    candidate.language === "ar" || candidate.language === "en" || candidate.language === "mixed"
      ? candidate.language
      : fallback?.language || detectPdfLanguage(JSON.stringify(candidate));

  const title =
    String(candidate.title ?? coverPageObject?.title ?? "").trim() ||
    (inferredLanguage === "ar"
      ? `مستند ${fallback?.topic || "احترافي"}`
      : `${fallback?.topic || "Professional"} Document`);

  const normalized: PDFDocument = {
    title,
    subtitle: String(candidate.subtitle ?? coverPageObject?.subtitle ?? "").trim() || undefined,
    author: String(candidate.author ?? coverPageObject?.author ?? "").trim() || undefined,
    date: String(candidate.date ?? coverPageObject?.date ?? "").trim() || new Date().toISOString().slice(0, 10),
    language: inferredLanguage,
    theme:
      candidate.theme === "dark" || candidate.theme === "light" || candidate.theme === "auto"
        ? candidate.theme
        : "dark",
    pageSize:
      candidate.pageSize === "letter" ||
      candidate.page_size === "letter" ||
      candidate.format === "letter"
        ? "letter"
        : "a4",
    coverPage:
      typeof candidate.coverPage === "boolean"
        ? candidate.coverPage
        : !!coverPageObject || fallback?.includeCoverPage || false,
    tableOfContents:
      typeof candidate.tableOfContents === "boolean"
        ? candidate.tableOfContents
        : typeof candidate.toc === "boolean"
          ? candidate.toc
          : fallback?.includeTableOfContents || false,
    sections,
    metadata:
      candidate.metadata && typeof candidate.metadata === "object"
        ? {
            subject:
              typeof (candidate.metadata as Record<string, unknown>).subject === "string"
                ? String((candidate.metadata as Record<string, unknown>).subject)
                : undefined,
            keywords: Array.isArray((candidate.metadata as Record<string, unknown>).keywords)
              ? ((candidate.metadata as Record<string, unknown>).keywords as unknown[])
                  .map((keyword) => String(keyword ?? "").trim())
                  .filter(Boolean)
              : undefined,
            category:
              typeof (candidate.metadata as Record<string, unknown>).category === "string"
                ? String((candidate.metadata as Record<string, unknown>).category)
                : undefined,
            watermark:
              typeof (candidate.metadata as Record<string, unknown>).watermark === "string"
                ? String((candidate.metadata as Record<string, unknown>).watermark)
                : undefined,
            watermarkOpacity:
              typeof (candidate.metadata as Record<string, unknown>).watermarkOpacity === "number"
                ? Number((candidate.metadata as Record<string, unknown>).watermarkOpacity)
                : undefined,
          }
        : undefined,
  };

  const validation = PDF_SCHEMA.safeParse(normalized);
  return validation.success ? validation.data : null;
}

// ─── JSON Repair ──────────────────────────────────────────────────────────────
export function repairJsonText(jsonString: string): string {
  let cleaned = jsonString.trim();

  // 1. Remove markdown syntax
  cleaned = cleaned.replace(/^```[a-zA-Z-]*\s*/, "").replace(/\s*```$/, "");

  // 2. Remove JavaScript-style comments
  cleaned = cleaned.replace(/\/\*[\s\S]*?\*\//g, "");
  cleaned = cleaned.replace(/(?:^|\s)\/\/.*$/gm, "");

  // 3. Fix trailing commas before closing braces/brackets
  cleaned = cleaned.replace(/,\s*([\]}])/g, "$1");

  // 4. Fix double commas
  cleaned = cleaned.replace(/,\s*,/g, ",");

  // 5. Replace unescaped newlines inside JSON string values
  let result = "";
  let insideString = false;
  let escape = false;
  for (let i = 0; i < cleaned.length; i++) {
    const char = cleaned[i];
    if (char === '"' && !escape) {
      insideString = !insideString;
    }
    if (char === '\\' && insideString) {
      escape = !escape;
    } else {
      escape = false;
    }

    if (char === '\n' && insideString) {
      result += '\\n';
    } else if (char === '\r' && insideString) {
      result += '\\r';
    } else if (char === '\t' && insideString) {
      result += '\\t';
    } else {
      result += char;
    }
  }
  cleaned = result;

  return cleaned;
}

// ─── Parse Helpers ────────────────────────────────────────────────────────────
export function tryParsePdfFromText(content: string, request: ParsedPdfRequest): PDFDocument | null {
  const candidateText = extractPdfJsonText(content);
  const parseAttempts = [candidateText];

  if (candidateText !== content.trim()) {
    parseAttempts.push(content.trim());
  }

  for (const attempt of parseAttempts) {
    try {
      const repaired = repairJsonText(attempt);
      const parsed = JSON.parse(repaired);
      const normalized = normalizePdfObject(parsed, {
        topic: request.topic,
        language: request.language,
        includeCoverPage: request.includeCoverPage,
        includeTableOfContents: request.includeTableOfContents,
      });
      if (normalized) return normalized;
    } catch {
      // ignore malformed attempts
    }
  }

  return null;
}

export function tryParseAnyPdfFromText(content: string): PDFDocument | null {
  const candidateText = extractPdfJsonText(content);
  const parseAttempts = [candidateText];

  if (candidateText !== content.trim()) {
    parseAttempts.push(content.trim());
  }

  for (const attempt of parseAttempts) {
    try {
      const repaired = repairJsonText(attempt);
      const parsed = JSON.parse(repaired);
      const normalized = normalizePdfObject(parsed);
      if (normalized) return normalized;
    } catch {
      // ignore malformed attempts
    }
  }

  return null;
}

export function formatPdfAsCodeBlock(doc: PDFDocument): string {
  return `\`\`\`pdf-document\n${JSON.stringify(doc, null, 2)}\n\`\`\``;
}

// ─── Page Count Estimator ─────────────────────────────────────────────────────
export function estimatePdfPageCount(doc: PDFDocument): number {
  const totalWeight = doc.sections.reduce((sum, section) => {
    switch (section.type) {
      case "heading":
        return sum + 100;
      case "paragraph":
        return sum + Math.max(section.content.length * 1.2, 160);
      case "code":
        return sum + Math.max(section.content.split("\n").length * 70, 220);
      case "math":
        return sum + 180;
      case "table":
        return sum + Math.max((section.rows?.length || 1) * 110, 220);
      case "list":
        return sum + Math.max((section.items?.length || 1) * 80, 160);
      case "numbered-list":
        return sum + Math.max((section.numberedItems?.length || 1) * 130, 220);
      case "quote":
      case "callout":
      case "highlight-box":
        return sum + 160;
      case "image":
        return sum + 280;
      case "divider":
        return sum + 40;
      case "qa":
        return sum + 320;
      case "stat-card":
        return sum + Math.max((section.cards?.length || 1) * 120, 200);
      case "timeline":
        return sum + Math.max((section.events?.length || 1) * 140, 280);
      case "two-column":
        return sum + 280;
      case "chart-svg":
        return sum + 320;
      case "badge":
        return sum + 80;
      case "watermark":
        return sum + 0;
      default:
        return sum + 120;
    }
  }, 0);

  const base = doc.coverPage ? 1 : 0;
  const toc = doc.tableOfContents ? 1 : 0;
  return Math.max(1, base + toc + Math.ceil(totalWeight / 2200));
}
