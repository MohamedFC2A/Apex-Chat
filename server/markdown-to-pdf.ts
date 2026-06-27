import type { Message } from "@shared/schema";
import type { PDFDocument, PDFDocumentLanguage, PDFSection } from "@shared/pdf";
import { detectPdfLanguage } from "@shared/pdf";

interface ConversationMessageLike {
  role: "user" | "assistant";
  content: string;
  timestamp?: number;
}

function sanitizeForPdf(text: string): string {
  return text.replace(/\r\n/g, "\n").replace(/\u0000/g, "").trim();
}

function containsArabic(text: string): boolean {
  return /[\u0600-\u06FF]/.test(text);
}

function detectDirection(text: string): "rtl" | "ltr" {
  return containsArabic(text) ? "rtl" : "ltr";
}

export function detectSectionLanguage(text: string): PDFDocumentLanguage {
  return detectPdfLanguage(text);
}

function createParagraphSection(content: string, index: number): PDFSection {
  const cleaned = sanitizeForPdf(content);
  return {
    id: `paragraph-${index}`,
    type: "paragraph",
    direction: detectDirection(cleaned),
    content: cleaned,
  };
}

function parseTable(lines: string[], index: number): { section: PDFSection; consumed: number } | null {
  if (lines.length < 2) return null;
  if (!/^\|.+\|$/.test(lines[0].trim()) || !/^\|?[\s:-]+\|[\s|:-]+$/.test(lines[1].trim())) return null;

  const normalizeCells = (line: string) =>
    line
      .trim()
      .replace(/^\|/, "")
      .replace(/\|$/, "")
      .split("|")
      .map((cell) => sanitizeForPdf(cell));

  const headers = normalizeCells(lines[0]);
  const rows: string[][] = [];
  let consumed = 2;

  while (consumed < lines.length && /^\|.+\|$/.test(lines[consumed].trim())) {
    rows.push(normalizeCells(lines[consumed]));
    consumed += 1;
  }

  return {
    consumed,
    section: {
      id: `table-${index}`,
      type: "table",
      direction: detectDirection(`${headers.join(" ")} ${rows.flat().join(" ")}`),
      content: headers.join(" | "),
      headers,
      rows,
    },
  };
}

function parseList(lines: string[], index: number): { section: PDFSection; consumed: number } | null {
  const items: string[] = [];
  let consumed = 0;

  while (consumed < lines.length) {
    const line = lines[consumed].trim();
    const unordered = line.match(/^[-*+]\s+(.+)$/);
    const ordered = line.match(/^\d+\.\s+(.+)$/);
    const item = unordered?.[1] || ordered?.[1];
    if (!item) break;
    items.push(sanitizeForPdf(item));
    consumed += 1;
  }

  if (!items.length) return null;

  return {
    consumed,
    section: {
      id: `list-${index}`,
      type: "list",
      direction: detectDirection(items.join(" ")),
      content: items.join("\n"),
      items,
    },
  };
}

function flushParagraph(buffer: string[], sections: PDFSection[], indexRef: { value: number }) {
  if (!buffer.length) return;
  const content = buffer.join("\n").trim();
  buffer.length = 0;
  if (!content) return;
  sections.push(createParagraphSection(content, indexRef.value));
  indexRef.value += 1;
}

export function markdownToPdfDocument(markdown: string, options?: Partial<PDFDocument>): PDFDocument {
  const source = sanitizeForPdf(markdown);
  const lines = source.split("\n");
  const sections: PDFSection[] = [];
  const paragraphBuffer: string[] = [];
  const indexRef = { value: 1 };

  let title = options?.title?.trim() || "";
  let inCodeBlock = false;
  let codeLanguage = "";
  let codeBuffer: string[] = [];
  let inMathBlock = false;
  let mathBuffer: string[] = [];

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const trimmed = line.trim();

    if (inCodeBlock) {
      if (trimmed.startsWith("```")) {
        sections.push({
          id: `code-${indexRef.value}`,
          type: "code",
          direction: "ltr",
          language: codeLanguage || "text",
          content: codeBuffer.join("\n").trim(),
        });
        indexRef.value += 1;
        codeBuffer = [];
        codeLanguage = "";
        inCodeBlock = false;
      } else {
        codeBuffer.push(line);
      }
      continue;
    }

    if (inMathBlock) {
      if (trimmed === "$$") {
        sections.push({
          id: `math-${indexRef.value}`,
          type: "math",
          direction: "ltr",
          content: mathBuffer.join("\n").trim(),
        });
        indexRef.value += 1;
        mathBuffer = [];
        inMathBlock = false;
      } else {
        mathBuffer.push(line);
      }
      continue;
    }

    if (!trimmed) {
      flushParagraph(paragraphBuffer, sections, indexRef);
      continue;
    }

    if (trimmed.startsWith("```")) {
      flushParagraph(paragraphBuffer, sections, indexRef);
      inCodeBlock = true;
      codeLanguage = trimmed.replace(/^```/, "").trim().toLowerCase();
      continue;
    }

    if (trimmed === "$$") {
      flushParagraph(paragraphBuffer, sections, indexRef);
      inMathBlock = true;
      continue;
    }

    const headingMatch = trimmed.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      flushParagraph(paragraphBuffer, sections, indexRef);
      const headingText = sanitizeForPdf(headingMatch[2]);
      if (!title && headingMatch[1].length === 1) {
        title = headingText;
      }
      sections.push({
        id: `heading-${indexRef.value}`,
        type: "heading",
        level: headingMatch[1].length,
        direction: detectDirection(headingText),
        content: headingText,
      });
      indexRef.value += 1;
      continue;
    }

    if (/^---+$|^\*\*\*+$|^___+$/.test(trimmed)) {
      flushParagraph(paragraphBuffer, sections, indexRef);
      sections.push({
        id: `divider-${indexRef.value}`,
        type: "divider",
        direction: "ltr",
        content: "",
      });
      indexRef.value += 1;
      continue;
    }

    const quoteMatch = line.match(/^>\s?(.*)$/);
    if (quoteMatch) {
      flushParagraph(paragraphBuffer, sections, indexRef);
      const quoteLines = [sanitizeForPdf(quoteMatch[1])];
      let consumed = 0;
      while (i + consumed + 1 < lines.length) {
        const nextMatch = lines[i + consumed + 1].match(/^>\s?(.*)$/);
        if (!nextMatch) break;
        quoteLines.push(sanitizeForPdf(nextMatch[1]));
        consumed += 1;
      }
      i += consumed;
      const content = quoteLines.join("\n");
      sections.push({
        id: `quote-${indexRef.value}`,
        type: "quote",
        direction: detectDirection(content),
        content,
      });
      indexRef.value += 1;
      continue;
    }

    const table = parseTable(lines.slice(i), indexRef.value);
    if (table) {
      flushParagraph(paragraphBuffer, sections, indexRef);
      sections.push(table.section);
      indexRef.value += 1;
      i += table.consumed - 1;
      continue;
    }

    const list = parseList(lines.slice(i), indexRef.value);
    if (list) {
      flushParagraph(paragraphBuffer, sections, indexRef);
      sections.push(list.section);
      indexRef.value += 1;
      i += list.consumed - 1;
      continue;
    }

    paragraphBuffer.push(line);
  }

  flushParagraph(paragraphBuffer, sections, indexRef);

  if (inCodeBlock && codeBuffer.length) {
    sections.push({
      id: `code-${indexRef.value}`,
      type: "code",
      direction: "ltr",
      language: codeLanguage || "text",
      content: codeBuffer.join("\n").trim(),
    });
    indexRef.value += 1;
  }

  if (inMathBlock && mathBuffer.length) {
    sections.push({
      id: `math-${indexRef.value}`,
      type: "math",
      direction: "ltr",
      content: mathBuffer.join("\n").trim(),
    });
  }

  const fallbackTitle = containsArabic(source) ? "مستند المحادثة" : "Conversation Document";
  const finalTitle = title || source.split("\n").find((line) => line.trim())?.slice(0, 72) || fallbackTitle;
  const language = options?.language || detectPdfLanguage(source);

  return {
    title: finalTitle,
    subtitle: options?.subtitle,
    author: options?.author,
    date: options?.date || new Date().toISOString().slice(0, 10),
    language,
    theme: options?.theme || "dark",
    pageSize: options?.pageSize || "a4",
    coverPage: options?.coverPage ?? true,
    tableOfContents: options?.tableOfContents ?? sections.some((section) => section.type === "heading" && (section.level || 2) <= 2),
    sections: sections.length ? sections : [createParagraphSection(source || fallbackTitle, 1)],
    metadata: options?.metadata,
  };
}

export function conversationToPdfDocument(input: string | ConversationMessageLike[] | Message[]): PDFDocument {
  const messages: ConversationMessageLike[] =
    typeof input === "string"
      ? [{ role: "assistant", content: input }]
      : input
          .filter((item) => item && typeof item.content === "string")
          .map((item) => ({
            role: item.role === "user" ? "user" : "assistant",
            content: item.content,
            timestamp: item.timestamp,
          }));

  const titleSeed = messages.find((item) => item.role === "user")?.content || messages[0]?.content || "";
  const titleBase = sanitizeForPdf(titleSeed).split("\n")[0] || "Conversation";
  const isArabicConversation = containsArabic(titleBase);
  const sections: PDFSection[] = [];
  let index = 1;

  messages.forEach((message) => {
    const label =
      message.role === "user"
        ? isArabicConversation
          ? "رسالة المستخدم"
          : "User Message"
        : isArabicConversation
          ? "رد المساعد"
          : "Assistant Response";

    sections.push({
      id: `heading-${index}`,
      type: "heading",
      level: 2,
      direction: detectDirection(label),
      content: label,
    });
    index += 1;

    if (message.role === "user") {
      const content = sanitizeForPdf(message.content);
      sections.push({
        id: `quote-${index}`,
        type: "quote",
        direction: detectDirection(content),
        content,
      });
      index += 1;
    } else {
      const assistantDoc = markdownToPdfDocument(message.content, {
        coverPage: false,
        tableOfContents: false,
        theme: "dark",
      });
      assistantDoc.sections.forEach((section) => {
        sections.push({ ...section, id: `${section.type}-${index++}` });
      });
    }

    sections.push({
      id: `divider-${index}`,
      type: "divider",
      direction: "ltr",
      content: "",
    });
    index += 1;
  });

  return {
    title: titleBase.length > 72 ? `${titleBase.slice(0, 69)}...` : titleBase,
    subtitle: isArabicConversation ? "تصدير المحادثة الكاملة" : "Full conversation export",
    date: new Date().toISOString().slice(0, 10),
    language: detectPdfLanguage(messages.map((item) => item.content).join("\n")),
    theme: "dark",
    pageSize: "a4",
    coverPage: true,
    tableOfContents: messages.length > 2,
    sections: sections.length ? sections : [createParagraphSection(titleBase, 1)],
    metadata: {
      category: "conversation",
      keywords: ["chat", "export", "pdf"],
    },
  };
}

export function estimatePageCount(doc: PDFDocument): number {
  const totalChars = doc.sections.reduce((sum, section) => {
    const items = section.items?.join(" ").length || 0;
    const rows = section.rows?.flat().join(" ").length || 0;
    return sum + section.content.length + items + rows + 80;
  }, 0);

  return Math.max(1, Math.ceil(totalChars / 2400) + (doc.coverPage ? 1 : 0) + (doc.tableOfContents ? 1 : 0));
}

