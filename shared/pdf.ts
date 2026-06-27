import { z } from "zod";

export type PDFDocumentLanguage = "ar" | "en" | "mixed";
export type PDFDocumentTheme = "dark" | "light" | "auto";
export type PDFPageSize = "a4" | "letter";
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
  | "callout";

export interface PDFSection {
  id: string;
  type: PDFSectionType;
  level?: number;
  language?: string;
  direction?: "rtl" | "ltr";
  content: string;
  items?: string[];
  rows?: string[][];
  headers?: string[];
  variant?: "info" | "warning" | "success" | "error";
  caption?: string;
}

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
  metadata?: {
    subject?: string;
    keywords?: string[];
    category?: string;
  };
}

export interface ParsedPdfRequest {
  rawMessage: string;
  topic: string;
  language: PDFDocumentLanguage;
  requestedSections?: string[];
  includeCode: boolean;
  includeMath: boolean;
  includeTableOfContents: boolean;
  includeCoverPage: boolean;
}

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
        type: z.enum(["heading", "paragraph", "code", "math", "table", "list", "image", "divider", "quote", "callout"]),
        level: z.number().int().min(1).max(6).optional(),
        language: z.string().optional(),
        direction: z.enum(["rtl", "ltr"]).optional(),
        content: z.string(),
        items: z.array(z.string()).optional(),
        rows: z.array(z.array(z.string())).optional(),
        headers: z.array(z.string()).optional(),
        variant: z.enum(["info", "warning", "success", "error"]).optional(),
        caption: z.string().optional(),
      })
    )
    .min(1),
  metadata: z
    .object({
      subject: z.string().optional(),
      keywords: z.array(z.string()).optional(),
      category: z.string().optional(),
    })
    .optional(),
});

const PDF_INTENT_REGEX =
  /(?:^|\s)(?:pdf|document|report|export\s+pdf|create\s+(?:a\s+)?(?:pdf|document|report)|generate\s+(?:a\s+)?(?:pdf|document|report)|convert\s+to\s+pdf)(?:\s|$)|(?:ملف\s*pdf|بي\s*دي\s*اف|وثيقة|مستند|تقرير|حو[ّو]ل(?:ه|ها)?\s*(?:ل|إلى)?\s*pdf|اعم[للي]*\s*pdf|صد[ّ]?ر(?:ها|ه)?\s*(?:pdf)?)/i;

const STOP_WORDS = new Set([
  "pdf",
  "document",
  "report",
  "file",
  "export",
  "generate",
  "create",
  "make",
  "build",
  "convert",
  "into",
  "to",
  "for",
  "about",
  "on",
  "the",
  "a",
  "an",
  "please",
  "with",
  "include",
  "summary",
  "professional",
  "ملف",
  "وثيقة",
  "مستند",
  "تقرير",
  "بي",
  "دي",
  "اف",
  "اعمل",
  "اعملي",
  "اعمللي",
  "سوي",
  "سويلي",
  "حول",
  "حوّل",
  "حولها",
  "حولها",
  "صدّر",
  "صدر",
  "لي",
  "عن",
  "في",
  "على",
  "بخصوص",
  "مع",
  "احترافي",
  "احترافية",
  "ملخص",
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
  ];

  for (const [pattern, label] of checks) {
    if (pattern.test(message)) {
      sections.push(label);
    }
  }

  return sections.length ? sections : undefined;
}

export function parsePdfRequest(message: string): ParsedPdfRequest {
  const anchoredTopic = extractTopicByAnchor(message);
  const cleanedTopic = cleanupTopic(message);
  const language = detectPdfLanguage(message);
  const lowered = message.toLowerCase();
  const includeCode =
    /(?:code|snippet|example|implementation|كود|أمثلة برمجية|برمجي)/i.test(message) ||
    lowered.includes("code") ||
    message.includes("كود");
  const includeMath =
    /(?:math|equation|formula|latex|معادلات|معادلة|رياضيات|صيغة)/i.test(message) ||
    lowered.includes("math") ||
    message.includes("معادلة") ||
    message.includes("معادلات");

  return {
    rawMessage: message,
    topic: anchoredTopic || cleanedTopic || (language === "ar" ? "موضوع احترافي" : "professional topic"),
    language,
    requestedSections: extractRequestedSections(message),
    includeCode,
    includeMath,
    includeTableOfContents: /(?:table of contents|contents|toc|فهرس|المحتويات)/i.test(message) || /(?:report|document|تقرير|مستند)/i.test(message),
    includeCoverPage: !/(?:without cover|no cover|بدون غلاف)/i.test(message),
  };
}

export function buildPdfGenerationInstructions(request: ParsedPdfRequest): string {
  const sectionHints = request.requestedSections?.length
    ? request.requestedSections.join(", ")
    : request.language === "ar"
      ? "مقدمة، نقاط رئيسية، خاتمة"
      : "introduction, key points, conclusion";

  if (request.language === "ar") {
    return `أنشئ الآن مستند PDF منظمًا كهيكل JSON فقط.

الموضوع المطلوب: ${request.topic}
الأقسام المفضلة: ${sectionHints}
يتضمن كود: ${request.includeCode ? "نعم" : "لا"}
يتضمن معادلات: ${request.includeMath ? "نعم" : "لا"}
فهرس محتويات: ${request.includeTableOfContents ? "نعم" : "لا"}
صفحة غلاف: ${request.includeCoverPage ? "نعم" : "لا"}

قواعد إلزامية:
1. أخرج كتلة واحدة فقط باسم \`\`\`pdf-document.
2. داخل الكتلة أخرج JSON صالح فقط بدون أي شرح خارجي.
3. استخدم بنية PDFDocument بدقة.
4. كل section يجب أن تحتوي id و type و content.
5. استخدم direction = "rtl" للمحتوى العربي و "ltr" للإنجليزي.
6. Sections الكود يجب أن تكون type = "code" مع language مناسبة.
7. Sections المعادلات يجب أن تكون type = "math" ومحتواها LaTeX.
8. الجداول يجب أن تستخدم headers و rows.
9. اجعل title و subtitle مرتبطين مباشرة بموضوع "${request.topic}".
10. لا تضف أي نص قبل أو بعد كتلة \`\`\`pdf-document.`;
  }

  return `Generate a structured PDF document as JSON only.

Required topic: ${request.topic}
Preferred sections: ${sectionHints}
Include code: ${request.includeCode ? "yes" : "no"}
Include math: ${request.includeMath ? "yes" : "no"}
Include table of contents: ${request.includeTableOfContents ? "yes" : "no"}
Include cover page: ${request.includeCoverPage ? "yes" : "no"}

Hard rules:
1. Output exactly one fenced block named \`\`\`pdf-document.
2. Inside the block, output valid JSON only with no prose.
3. Follow the PDFDocument shape exactly.
4. Every section must include id, type, and content.
5. Use direction = "rtl" for Arabic content and "ltr" for English content.
6. Code sections must use type = "code" and include language.
7. Math sections must use type = "math" and contain LaTeX.
8. Tables must use headers and rows arrays.
9. The title and subtitle must be directly about "${request.topic}".
10. Do not output any text before or after the \`\`\`pdf-document block.`;
}

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

function normalizeRows(rawRows: unknown): string[][] | undefined {
  if (!Array.isArray(rawRows)) return undefined;
  const rows = rawRows
    .map((row) => (Array.isArray(row) ? row.map((cell) => String(cell ?? "").trim()) : []))
    .filter((row) => row.length > 0);
  return rows.length ? rows : undefined;
}

function normalizeSection(rawSection: Record<string, unknown>, index: number): PDFSection | null {
  const type = String(rawSection.type ?? "").trim() as PDFSectionType;
  const content = String(rawSection.content ?? "").trim();
  const items = Array.isArray(rawSection.items)
    ? rawSection.items.map((item) => String(item ?? "").trim()).filter(Boolean)
    : undefined;
  const headers = Array.isArray(rawSection.headers)
    ? rawSection.headers.map((item) => String(item ?? "").trim()).filter(Boolean)
    : undefined;
  const rows = normalizeRows(rawSection.rows);

  if (!type) return null;
  if (!content && type !== "divider" && !items?.length && !rows?.length) return null;

  const direction =
    rawSection.direction === "rtl" || rawSection.direction === "ltr"
      ? rawSection.direction
      : detectSectionDirection(content || items?.join(" ") || headers?.join(" ") || "");

  return {
    id: String(rawSection.id ?? `section-${index + 1}`).trim() || `section-${index + 1}`,
    type,
    level: typeof rawSection.level === "number" ? rawSection.level : undefined,
    language: typeof rawSection.language === "string" ? rawSection.language : undefined,
    direction,
    content,
    items,
    rows,
    headers,
    variant:
      rawSection.variant === "info" ||
      rawSection.variant === "warning" ||
      rawSection.variant === "success" ||
      rawSection.variant === "error"
        ? rawSection.variant
        : undefined,
    caption: typeof rawSection.caption === "string" ? rawSection.caption : undefined,
  };
}

function normalizePdfObject(raw: unknown, request: ParsedPdfRequest): PDFDocument | null {
  if (!raw || typeof raw !== "object") return null;

  const root = raw as Record<string, unknown>;
  const candidate =
    root["pdf-document"] && typeof root["pdf-document"] === "object"
      ? (root["pdf-document"] as Record<string, unknown>)
      : root;

  const rawSections = Array.isArray(candidate.sections) ? candidate.sections : null;
  if (!rawSections?.length) return null;

  const sections = rawSections
    .map((section, index) =>
      section && typeof section === "object" ? normalizeSection(section as Record<string, unknown>, index) : null
    )
    .filter(Boolean) as PDFSection[];

  if (!sections.length) return null;

  const normalized: PDFDocument = {
    title: String(candidate.title ?? "").trim() || (request.language === "ar" ? `مستند ${request.topic}` : `${request.topic} Document`),
    subtitle: String(candidate.subtitle ?? "").trim() || undefined,
    author: String(candidate.author ?? "").trim() || undefined,
    date: String(candidate.date ?? "").trim() || new Date().toISOString().slice(0, 10),
    language:
      candidate.language === "ar" || candidate.language === "en" || candidate.language === "mixed"
        ? candidate.language
        : request.language,
    theme:
      candidate.theme === "dark" || candidate.theme === "light" || candidate.theme === "auto"
        ? candidate.theme
        : "dark",
    pageSize: candidate.pageSize === "letter" ? "letter" : "a4",
    coverPage: typeof candidate.coverPage === "boolean" ? candidate.coverPage : request.includeCoverPage,
    tableOfContents:
      typeof candidate.tableOfContents === "boolean"
        ? candidate.tableOfContents
        : request.includeTableOfContents,
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
          }
        : undefined,
  };

  const validation = PDF_SCHEMA.safeParse(normalized);
  return validation.success ? validation.data : null;
}

export function tryParsePdfFromText(content: string, request: ParsedPdfRequest): PDFDocument | null {
  const candidateText = extractPdfJsonText(content);
  const parseAttempts = [candidateText];

  if (candidateText !== content.trim()) {
    parseAttempts.push(content.trim());
  }

  for (const attempt of parseAttempts) {
    try {
      const parsed = JSON.parse(attempt);
      const normalized = normalizePdfObject(parsed, request);
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

export function estimatePdfPageCount(doc: PDFDocument): number {
  const totalWeight = doc.sections.reduce((sum, section) => {
    switch (section.type) {
      case "heading":
        return sum + 120;
      case "paragraph":
        return sum + Math.max(section.content.length, 160);
      case "code":
        return sum + Math.max(section.content.split("\n").length * 70, 220);
      case "math":
        return sum + 180;
      case "table":
        return sum + Math.max((section.rows?.length || 1) * 120, 220);
      case "list":
        return sum + Math.max((section.items?.length || 1) * 90, 180);
      case "quote":
      case "callout":
        return sum + 180;
      case "image":
        return sum + 260;
      case "divider":
        return sum + 40;
      default:
        return sum + 120;
    }
  }, 0);

  const base = doc.coverPage ? 1 : 0;
  const toc = doc.tableOfContents ? 1 : 0;
  return Math.max(1, base + toc + Math.ceil(totalWeight / 2200));
}
