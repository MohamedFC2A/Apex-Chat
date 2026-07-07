/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║  APEX PDF — Shared Utilities & Facade v4.0                                ║
 * ║  Re-exports all shared definitions and provides client-safe parsers        ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */

import { z } from "zod";
export * from "./pdf/index.js";

import type {
  PDFDocumentLanguage,
  PDFDocumentTheme,
  PDFPageSize,
  PDFDocumentMode,
  PDFSectionType,
  ChartDataPoint,
  TimelineEvent,
  StatCardData,
  TwoColumnContent,
  MCQQuestionSection,
  FlashcardData,
  PDFSection,
  PDFDocument,
  ParsedPdfRequest,
} from "./pdf/index.js";

import { PDF_SCHEMA } from "./pdf/index.js";

interface PdfNormalizationFallback {
  topic?: string;
  language?: PDFDocumentLanguage;
  includeCoverPage?: boolean;
  includeTableOfContents?: boolean;
}

// ─── Intent Detection (Client & Shared safe) ───────────────────────────────────
const PDF_INTENT_REGEX =
  /(?:^|\s)(?:pdf|document|report|export\s+pdf|create\s+(?:a\s+)?(?:pdf|document|report)|generate\s+(?:a\s+)?(?:pdf|document|report)|convert\s+to\s+pdf)(?:\s|$)|(?:ملف\s*pdf|بي\s*دي\s*اف|وثيقة|مستند|تقرير|حو[ّو]ل(?:ه|ها)?\s*(?:ل|إلى)?\s*pdf|اعم[للي]*\s*pdf|صد[ّ]?ر(?:ها|ه)?\s*(?:pdf)?)/i;

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

export function detectPdfIntent(message: string): boolean {
  if (message.includes("SYSTEM DIRECTIVE: You must output a structured PDF document block")) {
    return true;
  }
  return PDF_INTENT_REGEX.test(message);
}

function containsArabic(text: string): boolean {
  return /[\u0600-\u06FF]/.test(text);
}

export function detectPdfLanguage(text: string): PDFDocumentLanguage {
  const hasArabic = containsArabic(text);
  const hasLatin = /[A-Za-z]/.test(text);
  if (hasArabic && hasLatin) return "mixed";
  if (hasArabic) return "ar";
  return "en";
}

export function cleanMessageOfDirectives(message: string): string {
  if (!message) return "";
  const index = message.indexOf("[SYSTEM DIRECTIVE:");
  if (index !== -1) {
    return message.substring(0, index).trim();
  }
  return message.trim();
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
  const match = message.match(/([\d٠-٩]+)\s*(?:questions?|سؤال|أسئلة|اسئلة|اسئله|سوال)/i) ||
    message.match(/(?:questions?|سؤال|أسئلة|اسئلة)\s*[:(]?\s*([\d٠-٩]+)/i);
  if (match?.[1]) {
    const num = parseInt(match[1].replace(/[٠-٩]/g, d => String("٠١٢٣٤٥٦٧٨٩".indexOf(d))));
    if (!isNaN(num) && num > 0 && num <= 100) return num;
  }
  return 10;
}

export function parsePdfRequest(message: string): ParsedPdfRequest {
  const cleanMessage = cleanMessageOfDirectives(message);
  const anchoredTopic = extractTopicByAnchor(cleanMessage);
  const cleanedTopic = cleanupTopic(cleanMessage);
  const language = detectPdfLanguage(cleanMessage);
  const lowered = cleanMessage.toLowerCase();
  const mode = detectPdfMode(cleanMessage);

  const includeCode =
    /(?:code|snippet|example|implementation|كود|أمثلة برمجية|برمجي)/i.test(cleanMessage) ||
    lowered.includes("code") ||
    cleanMessage.includes("كود");
  const includeMath =
    /(?:math|equation|formula|latex|معادلات|معادلة|رياضيات|صيغة)/i.test(cleanMessage) ||
    lowered.includes("math") ||
    cleanMessage.includes("معادلة") ||
    cleanMessage.includes("معادلات");

  let theme: PDFDocumentTheme | undefined;
  if (/(?:light theme|light mode|ثيم فاتح|خلفية بيضاء|خلفية فاتحة|وضع فاتح)/i.test(cleanMessage)) {
    theme = "light";
  } else if (/(?:dark theme|dark mode|ثيم داكن|خلفية داكنة|وضع داكن)/i.test(cleanMessage)) {
    theme = "dark";
  }

  let pageSize: PDFPageSize | undefined;
  if (/(?:letter size|letter format|حجم letter|حجم ليتر|امريكي|مقاس ليتر)/i.test(cleanMessage)) {
    pageSize = "letter";
  } else if (/(?:a4 size|a4 format|حجم a4|مقاس a4)/i.test(cleanMessage)) {
    pageSize = "a4";
  }

  const questionCount = (mode === "exam" || mode === "quiz" || mode === "worksheet")
    ? extractQuestionCount(cleanMessage)
    : undefined;

  const includeAnswerKey = mode === "exam" || /(?:answer\s*key|مفتاح\s*الإجابات|إجابات\s*نموذجية|جدول\s*الإجابات)/i.test(cleanMessage);
  const showAnswersInline = mode === "quiz" || mode === "worksheet" || mode === "flashcard";

  return {
    rawMessage: message,
    topic: anchoredTopic || cleanedTopic || (language === "ar" ? "موضوع احترافي" : "professional topic"),
    language,
    requestedSections: extractRequestedSections(cleanMessage),
    includeCode,
    includeMath,
    includeTableOfContents: mode === "study" && (/(?:table of contents|contents|toc|فهرس|المحتويات)/i.test(cleanMessage) || /(?:report|document|تقرير|مستند)/i.test(cleanMessage)),
    includeCoverPage: mode === "study" && !/(?:without cover|no cover|بدون غلاف)/i.test(cleanMessage),
    theme,
    pageSize,
    mode,
    questionCount,
    includeAnswerKey,
    showAnswersInline,
  };
}

// ─── JSON Extraction ───────────────────────────────────────────────────────────
export function extractPdfJsonText(content: string): string {
  const pdfBlock = content.match(/```pdf-document\s*([\s\S]*?)```/i);
  if (pdfBlock?.[1]) return pdfBlock[1].trim();

  const jsonBlock = content.match(/```json\s*([\s\S]*?)```/i);
  if (jsonBlock?.[1]) return jsonBlock[1].trim();

  const genericBlock = content.match(/```[\w-]*\s*([\s\S]*?)```/i);
  if (genericBlock?.[1]) return genericBlock[1].trim();

  const firstBrace = content.indexOf("{");
  const lastBrace = content.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    return content.slice(firstBrace, lastBrace + 1).trim();
  }
  return content.trim();
}

function normalizeRows(rawRows: unknown): string[][] | undefined {
  if (!Array.isArray(rawRows)) return undefined;
  const rows = rawRows
    .map((row) => {
      if (Array.isArray(row)) return row.map((cell) => String(cell ?? "").trim());
      if (row && typeof row === "object") {
        return Object.values(row as Record<string, unknown>).map((cell) => String(cell ?? "").trim());
      }
      return [];
    })
    .filter((row) => row.length > 0);
  return rows.length ? rows : undefined;
}

function normalizeSectionType(type: unknown): PDFSectionType | null {
  const normalized = String(type ?? "").trim().toLowerCase();
  if (!normalized) return null;

  const aliasMap: Record<string, PDFSectionType> = {
    heading: "heading", title: "heading", subtitle: "heading", header: "heading", subheading: "heading",
    paragraph: "paragraph", text: "paragraph", body: "paragraph", prose: "paragraph", content: "paragraph",
    code: "code", codeblock: "code", "code-block": "code", snippet: "code",
    math: "math", equation: "math", formula: "math", latex: "math",
    table: "table", grid: "table", spreadsheet: "table",
    list: "list", bullet: "list", bullets: "list", ordered: "list", unordered: "list",
    image: "image", figure: "image", divider: "divider", hr: "divider", rule: "divider",
    quote: "quote", blockquote: "quote",
    callout: "callout", alert: "callout", note: "callout", warning: "callout", info: "callout",
    qa: "qa", "q&a": "qa", question: "qa", faq: "qa",
    "stat-card": "stat-card", statcard: "stat-card", stats: "stat-card", statistics: "stat-card", metric: "stat-card", metrics: "stat-card", kpi: "stat-card",
    timeline: "timeline", "time-line": "timeline", milestones: "timeline", roadmap: "timeline",
    "two-column": "two-column", twocolumn: "two-column", columns: "two-column", "split-view": "two-column",
    "chart-svg": "chart-svg", chart: "chart-svg", graph: "chart-svg", "bar-chart": "chart-svg", "pie-chart": "chart-svg", "line-chart": "chart-svg",
    badge: "badge", badges: "badge", tags: "badge", labels: "badge",
    "highlight-box": "highlight-box", highlightbox: "highlight-box", highlight: "highlight-box", "key-point": "highlight-box", keypoint: "highlight-box",
    "numbered-list": "numbered-list", numberedlist: "numbered-list", steps: "numbered-list", procedure: "numbered-list",
    watermark: "watermark",
    "mcq-question": "mcq-question", mcqquestion: "mcq-question", mcq: "mcq-question", "multiple-choice": "mcq-question", multiplechoice: "mcq-question",
    "exam-header": "exam-header", examheader: "exam-header", "exam-info": "exam-header", examinfo: "exam-header",
    "answer-key": "answer-key", answerkey: "answer-key", answers: "answer-key", "answer-sheet": "answer-key",
    flashcard: "flashcard", "flash-card": "flashcard", card: "flashcard", cards: "flashcard",
  };

  return aliasMap[normalized] || null;
}

function detectSectionDirection(text: string): "rtl" | "ltr" {
  return containsArabic(text) ? "rtl" : "ltr";
}

function normalizeSection(rawSection: Record<string, unknown>, index: number): PDFSection | null {
  const type = normalizeSectionType(rawSection.type) || "paragraph";
  const content = String(
    rawSection.content ?? rawSection.text ?? rawSection.body ?? rawSection.code ?? rawSection.formula ?? rawSection.latex ?? rawSection.url ?? rawSection.src ?? ""
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

  let cards: StatCardData[] | undefined;
  if (Array.isArray(rawSection.cards)) {
    cards = (rawSection.cards as unknown[]).map((c: any) => ({
      value: String(c.value ?? "").trim(),
      label: String(c.label ?? "").trim(),
      unit: c.unit ? String(c.unit) : undefined,
      trend: (c.trend === "up" || c.trend === "down" || c.trend === "flat") ? c.trend : undefined,
      trendValue: c.trendValue ? String(c.trendValue) : undefined,
      icon: c.icon ? String(c.icon) : undefined,
      color: c.color ? String(c.color) : undefined,
    }));
  }

  let events: TimelineEvent[] | undefined;
  if (Array.isArray(rawSection.events)) {
    events = (rawSection.events as unknown[]).map((e: any) => ({
      date: String(e.date ?? "").trim(),
      title: String(e.title ?? "").trim(),
      description: e.description ? String(e.description).trim() : undefined,
      icon: e.icon ? String(e.icon) : undefined,
      color: e.color ? String(e.color) : undefined,
    })).filter((e) => e.date && e.title);
  }

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

  let chartData: ChartDataPoint[] | undefined;
  if (Array.isArray(rawSection.chartData)) {
    chartData = (rawSection.chartData as unknown[]).map((point: any) => ({
      label: String(point.label ?? "").trim(),
      value: Number(point.value ?? 0),
      color: point.color ? String(point.color) : undefined,
    })).filter((d) => d.label && !isNaN(d.value));
  }

  let numberedItems: Array<{ number: string; title: string; description?: string }> | undefined;
  if (Array.isArray(rawSection.numberedItems)) {
    numberedItems = (rawSection.numberedItems as unknown[]).map((item: any) => ({
      number: String(item.number ?? "").trim(),
      title: String(item.title ?? "").trim(),
      description: item.description ? String(item.description).trim() : undefined,
    })).filter((n) => n.title);
  }

  let badges: Array<{ text: string; variant?: string }> | undefined;
  if (Array.isArray(rawSection.badges)) {
    badges = (rawSection.badges as unknown[]).map((badge: any) => ({
      text: String(badge.text ?? "").trim(),
      variant: badge.variant ? String(badge.variant) : undefined,
    })).filter((b) => b.text);
  }

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

  let flashcards: FlashcardData[] | undefined;
  if (Array.isArray(rawSection.flashcards)) {
    flashcards = (rawSection.flashcards as unknown[]).map((fc: any) => ({
      front: String(fc.front ?? fc.question ?? fc.term ?? "").trim(),
      back: String(fc.back ?? fc.answer ?? fc.definition ?? "").trim(),
      hint: fc.hint ? String(fc.hint).trim() : undefined,
      category: fc.category ? String(fc.category).trim() : undefined,
    })).filter(f => f.front && f.back);
  }

  return {
    id: String(rawSection.id ?? `section-${index + 1}`).trim() || `section-${index + 1}`,
    type,
    level: typeof rawSection.level === "number" ? rawSection.level : typeof rawSection.depth === "number" ? rawSection.depth : type === "heading" ? 2 : undefined,
    language: typeof rawSection.language === "string" ? rawSection.language : undefined,
    direction,
    content,
    items,
    rows,
    headers,
    totalRow: typeof rawSection.totalRow === "boolean" ? rawSection.totalRow : undefined,
    question: question || undefined,
    answer: answer || undefined,
    variant: (rawSection.variant === "info" || rawSection.variant === "warning" || rawSection.variant === "success" || rawSection.variant === "error" || rawSection.variant === "primary" || rawSection.variant === "secondary")
      ? rawSection.variant
      : (rawSection.type === "warning" || rawSection.type === "error" || rawSection.type === "success" || rawSection.type === "info")
        ? (rawSection.type as any) : undefined,
    caption: typeof rawSection.caption === "string" ? rawSection.caption : typeof rawSection.alt === "string" ? rawSection.alt : undefined,
    cards,
    events,
    columns,
    chartType: (rawSection.chartType === "bar" || rawSection.chartType === "pie" || rawSection.chartType === "line" || rawSection.chartType === "donut") ? rawSection.chartType : undefined,
    chartData,
    chartTitle: typeof rawSection.chartTitle === "string" ? rawSection.chartTitle : undefined,
    chartHeight: typeof rawSection.chartHeight === "number" ? rawSection.chartHeight : undefined,
    watermarkText: typeof rawSection.watermarkText === "string" ? rawSection.watermarkText : undefined,
    watermarkOpacity: typeof rawSection.watermarkOpacity === "number" ? rawSection.watermarkOpacity : undefined,
    numberedItems,
    boxColor: typeof rawSection.boxColor === "string" ? rawSection.boxColor : undefined,
    boxIcon: typeof rawSection.boxIcon === "string" ? rawSection.boxIcon : undefined,
    badges,
    mcqQuestion,
    showAnswer: typeof rawSection.showAnswer === "boolean" ? rawSection.showAnswer : undefined,
    examMeta,
    flashcards,
  };
}

export function normalizePdfObject(raw: unknown, fallback?: PdfNormalizationFallback): PDFDocument | null {
  if (!raw || typeof raw !== "object") return null;

  const root = raw as Record<string, unknown>;
  const candidate = root["pdf-document"] && typeof root["pdf-document"] === "object" ? root["pdf-document"] as Record<string, unknown> : root;
  const coverPageObject = candidate.coverPage && typeof candidate.coverPage === "object" ? candidate.coverPage as Record<string, unknown> : null;

  const rawSections = Array.isArray(candidate.sections) ? candidate.sections : Array.isArray(candidate.content) ? candidate.content : null;
  if (!rawSections?.length) return null;

  const sections = rawSections
    .map((section, index) => section && typeof section === "object" ? normalizeSection(section as Record<string, unknown>, index) : null)
    .filter(Boolean) as PDFSection[];

  if (!sections.length) return null;

  const inferredLanguage = (candidate.language === "ar" || candidate.language === "en" || candidate.language === "mixed")
    ? candidate.language
    : fallback?.language || detectPdfLanguage(JSON.stringify(candidate));

  const title = String(candidate.title ?? coverPageObject?.title ?? "").trim() ||
    (inferredLanguage === "ar" ? `مستند ${fallback?.topic || "احترافي"}` : `${fallback?.topic || "Professional"} Document`);

  const normalized: PDFDocument = {
    title,
    subtitle: String(candidate.subtitle ?? coverPageObject?.subtitle ?? "").trim() || undefined,
    author: String(candidate.author ?? coverPageObject?.author ?? "").trim() || undefined,
    date: String(candidate.date ?? coverPageObject?.date ?? "").trim() || new Date().toISOString().slice(0, 10),
    language: inferredLanguage,
    theme: (candidate.theme === "dark" || candidate.theme === "light" || candidate.theme === "auto") ? candidate.theme : "dark",
    pageSize: (candidate.pageSize === "letter" || candidate.page_size === "letter" || candidate.format === "letter") ? "letter" : "a4",
    coverPage: typeof candidate.coverPage === "boolean" ? candidate.coverPage : !!coverPageObject || fallback?.includeCoverPage || false,
    tableOfContents: typeof candidate.tableOfContents === "boolean" ? candidate.tableOfContents : typeof candidate.toc === "boolean" ? candidate.toc : fallback?.includeTableOfContents || false,
    sections,
    metadata: candidate.metadata && typeof candidate.metadata === "object" ? {
      subject: typeof (candidate.metadata as any).subject === "string" ? String((candidate.metadata as any).subject) : undefined,
      keywords: Array.isArray((candidate.metadata as any).keywords) ? (candidate.metadata as any).keywords.map((k: any) => String(k ?? "").trim()).filter(Boolean) : undefined,
      category: typeof (candidate.metadata as any).category === "string" ? String((candidate.metadata as any).category) : undefined,
      watermark: typeof (candidate.metadata as any).watermark === "string" ? String((candidate.metadata as any).watermark) : undefined,
      watermarkOpacity: typeof (candidate.metadata as any).watermarkOpacity === "number" ? Number((candidate.metadata as any).watermarkOpacity) : undefined,
    } : undefined,
  };

  const validation = PDF_SCHEMA.safeParse(normalized);
  return validation.success ? validation.data : null;
}

export function repairJsonText(jsonString: string): string {
  let cleaned = jsonString.trim();
  cleaned = cleaned.replace(/^```[a-zA-Z-]*\s*/, "").replace(/\s*```$/, "");
  cleaned = cleaned.replace(/\/\*[\s\S]*?\*\//g, "");
  cleaned = cleaned.replace(/(?:^|\s)\/\/.*$/gm, "");
  cleaned = cleaned.replace(/,\s*([\]}])/g, "$1");
  cleaned = cleaned.replace(/,\s*,/g, ",");

  let result = "";
  let insideString = false;
  let escape = false;
  for (let i = 0; i < cleaned.length; i++) {
    const char = cleaned[i];
    if (char === '"' && !escape) insideString = !insideString;
    if (char === '\\' && insideString) escape = !escape;
    else escape = false;

    if (char === '\n' && insideString) result += '\\n';
    else if (char === '\r' && insideString) result += '\\r';
    else if (char === '\t' && insideString) result += '\\t';
    else result += char;
  }
  return result;
}

export function repairTruncatedJson(raw: string): string {
  let s = raw.trim().replace(/\s*```\s*$/, "").trim();
  s = s.replace(/,\s*([\]}])/g, "$1").replace(/,\s*,/g, ",");

  const stack: Array<"{" | "["> = [];
  let inStr = false;
  let esc = false;
  let lastCompleteEnd = 0;

  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (esc) { esc = false; continue; }
    if (c === "\\" && inStr) { esc = true; continue; }
    if (c === '"') {
      inStr = !inStr;
      if (!inStr) lastCompleteEnd = i + 1;
      continue;
    }
    if (inStr) continue;
    if (c === "{" || c === "[") stack.push(c === "{" ? "{" : "[");
    else if (c === "}" || c === "]") { stack.pop(); lastCompleteEnd = i + 1; }
  }

  let result = s;
  if (inStr) {
    let qCount = 0, lastOpenQ = -1, esc2 = false;
    for (let i = 0; i < s.length; i++) {
      if (esc2) { esc2 = false; continue; }
      if (s[i] === "\\") { esc2 = true; continue; }
      if (s[i] === '"') { qCount++; if (qCount % 2 !== 0) lastOpenQ = i; }
    }
    if (lastOpenQ > 0) {
      let truncated = s.slice(0, lastOpenQ).trimEnd().replace(/[,:]\s*$/, "") + '"';
      const st2: Array<"{" | "["> = [];
      let inS2 = false, es2 = false;
      for (let i = 0; i < truncated.length; i++) {
        const c = truncated[i];
        if (es2) { es2 = false; continue; }
        if (c === "\\" && inS2) { es2 = true; continue; }
        if (c === '"') { inS2 = !inS2; continue; }
        if (inS2) continue;
        if (c === "{" || c === "[") st2.push(c === "{" ? "{" : "[");
        else if (c === "}" || c === "]") st2.pop();
      }
      result = truncated + st2.reverse().map(b => b === "{" ? "}" : "]").join("");
      return result;
    }
  }

  if (stack.length > 0) {
    result = result.trimEnd().replace(/[,:]\s*$/, "") + stack.reverse().map(b => b === "{" ? "}" : "]").join("");
  } else {
    result = result.trimEnd().replace(/[,:]\s*$/, "");
  }
  return result;
}

export function tryParsePdfFromText(content: string, request: ParsedPdfRequest): PDFDocument | null {
  const candidateText = extractPdfJsonText(content);
  const parseAttempts = [candidateText];
  if (candidateText !== content.trim()) parseAttempts.push(content.trim());

  for (const attempt of parseAttempts) {
    try {
      const repaired = repairJsonText(attempt);
      const parsed = JSON.parse(repaired);
      const normalized = normalizePdfObject(parsed, {
        topic: request.topic, language: request.language, includeCoverPage: request.includeCoverPage, includeTableOfContents: request.includeTableOfContents,
      });
      if (normalized) return normalized;
    } catch {}

    try {
      const repaired = repairTruncatedJson(repairJsonText(attempt));
      const parsed = JSON.parse(repaired);
      const normalized = normalizePdfObject(parsed, {
        topic: request.topic, language: request.language, includeCoverPage: request.includeCoverPage, includeTableOfContents: request.includeTableOfContents,
      });
      if (normalized) return normalized;
    } catch {}
  }
  return null;
}

export function tryParseAnyPdfFromText(content: string): PDFDocument | null {
  const candidateText = extractPdfJsonText(content);
  const parseAttempts = [candidateText];
  if (candidateText !== content.trim()) parseAttempts.push(content.trim());

  for (const attempt of parseAttempts) {
    try {
      const repaired = repairJsonText(attempt);
      const parsed = JSON.parse(repaired);
      const normalized = normalizePdfObject(parsed);
      if (normalized) return normalized;
    } catch {}

    try {
      const repaired = repairTruncatedJson(repairJsonText(attempt));
      const parsed = JSON.parse(repaired);
      const normalized = normalizePdfObject(parsed);
      if (normalized) return normalized;
    } catch {}
  }
  return null;
}

export function formatPdfAsCodeBlock(doc: PDFDocument): string {
  return `\`\`\`pdf-document\n${JSON.stringify(doc, null, 2)}\n\`\`\``;
}

export function estimatePdfPageCount(doc: PDFDocument): number {
  const totalWeight = doc.sections.reduce((sum, section) => {
    switch (section.type) {
      case "heading": return sum + 100;
      case "paragraph": return sum + Math.max(section.content.length * 1.2, 160);
      case "code": return sum + Math.max(section.content.split("\n").length * 70, 220);
      case "math": return sum + 180;
      case "table": return sum + Math.max((section.rows?.length || 1) * 110, 220);
      case "list": return sum + Math.max((section.items?.length || 1) * 80, 160);
      case "numbered-list": return sum + Math.max((section.numberedItems?.length || 1) * 130, 220);
      case "quote":
      case "callout":
      case "highlight-box": return sum + 160;
      case "image": return sum + 280;
      case "divider": return sum + 40;
      case "qa": return sum + 320;
      case "stat-card": return sum + Math.max((section.cards?.length || 1) * 120, 200);
      case "timeline": return sum + Math.max((section.events?.length || 1) * 140, 280);
      case "two-column": return sum + 280;
      case "chart-svg": return sum + 320;
      case "badge": return sum + 80;
      case "watermark": return sum + 0;
      default: return sum + 120;
    }
  }, 0);

  const base = doc.coverPage ? 1 : 0;
  const toc = doc.tableOfContents ? 1 : 0;
  return Math.max(1, base + toc + Math.ceil(totalWeight / 2200));
}
