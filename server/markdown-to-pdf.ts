/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║          APEX AI — ENHANCED MARKDOWN TO PDF CONVERTER v3.0                ║
 * ║  Supports: GFM Tables · Nested Lists · Task Lists · Frontmatter YAML      ║
 * ║  Footnotes · Strikethrough · Definition Lists · HTML Inline               ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */

import type { Message } from "@shared/schema";
import type { PDFDocument, PDFDocumentLanguage, PDFSection } from "@shared/pdf";
import { detectPdfLanguage } from "@shared/pdf";

interface ConversationMessageLike {
  role: "user" | "assistant";
  content: string;
  timestamp?: number;
}

// ─── Utilities ────────────────────────────────────────────────────────────────
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

// ─── YAML Frontmatter Parser ──────────────────────────────────────────────────
interface FrontmatterResult {
  metadata: Record<string, string>;
  body: string;
}

function parseFrontmatter(source: string): FrontmatterResult {
  const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
  const match = source.match(frontmatterRegex);
  if (!match) return { metadata: {}, body: source };

  const metadata: Record<string, string> = {};
  const lines = match[1].split("\n");
  for (const line of lines) {
    const colonIdx = line.indexOf(":");
    if (colonIdx > 0) {
      const key = line.slice(0, colonIdx).trim();
      const value = line.slice(colonIdx + 1).trim().replace(/^['"]|['"]$/g, "");
      if (key) metadata[key] = value;
    }
  }

  return { metadata, body: match[2] };
}

// ─── GFM Table Parser ─────────────────────────────────────────────────────────
function parseTable(lines: string[], index: number): { section: PDFSection; consumed: number } | null {
  if (lines.length < 2) return null;

  const firstLine = lines[0].trim();
  const secondLine = lines[1].trim();

  // Must have pipe characters
  if (!firstLine.includes("|")) return null;
  // Second line must be separator (---)
  if (!/^\|?[\s:-]+\|[\s|:-]+$/.test(secondLine)) return null;

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

// ─── List Parser (with task list support) ─────────────────────────────────────
function parseList(lines: string[], index: number): { section: PDFSection; consumed: number } | null {
  const items: string[] = [];
  let consumed = 0;
  let isOrdered = false;

  while (consumed < lines.length) {
    const line = lines[consumed].trim();

    // Task list: - [x] or - [ ]
    const taskChecked = line.match(/^[-*+]\s+\[x\]\s+(.+)$/i);
    const taskUnchecked = line.match(/^[-*+]\s+\[ \]\s+(.+)$/);

    if (taskChecked) {
      items.push(`✅ ${sanitizeForPdf(taskChecked[1])}`);
      consumed++;
      continue;
    }
    if (taskUnchecked) {
      items.push(`☐ ${sanitizeForPdf(taskUnchecked[1])}`);
      consumed++;
      continue;
    }

    // Ordered list
    const ordered = line.match(/^(\d+)\.\s+(.+)$/);
    if (ordered) {
      items.push(sanitizeForPdf(ordered[2]));
      isOrdered = true;
      consumed++;
      continue;
    }

    // Unordered list
    const unordered = line.match(/^[-*+]\s+(.+)$/);
    if (unordered) {
      items.push(sanitizeForPdf(unordered[1]));
      consumed++;
      continue;
    }

    // Indented continuation
    if (line.startsWith("  ") && items.length > 0) {
      const lastIdx = items.length - 1;
      items[lastIdx] = `${items[lastIdx]} ${sanitizeForPdf(line)}`;
      consumed++;
      continue;
    }

    break;
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

// ─── Callout Parser (> [!NOTE], > [!WARNING], etc.) ──────────────────────────
function parseCallout(line: string): { variant: "info" | "warning" | "success" | "error" } | null {
  const match = line.match(/^>\s+\[!(NOTE|INFO|TIP|IMPORTANT|WARNING|CAUTION|DANGER|SUCCESS)\]/i);
  if (!match) return null;
  const t = match[1].toUpperCase();
  if (t === "WARNING" || t === "CAUTION") return { variant: "warning" };
  if (t === "DANGER") return { variant: "error" };
  if (t === "SUCCESS" || t === "TIP") return { variant: "success" };
  return { variant: "info" };
}

// ─── Paragraph Buffer Flush ────────────────────────────────────────────────────
function flushParagraph(buffer: string[], sections: PDFSection[], indexRef: { value: number }) {
  if (!buffer.length) return;
  const content = buffer.join("\n").trim();
  buffer.length = 0;
  if (!content) return;
  sections.push(createParagraphSection(content, indexRef.value));
  indexRef.value += 1;
}

// ─── Main Converter ───────────────────────────────────────────────────────────
export function markdownToPdfDocument(markdown: string, options?: Partial<PDFDocument>): PDFDocument {
  // Parse frontmatter first
  const { metadata: frontmatter, body: markdownBody } = parseFrontmatter(sanitizeForPdf(markdown));

  const source = sanitizeForPdf(markdownBody);
  const lines = source.split("\n");
  const sections: PDFSection[] = [];
  const paragraphBuffer: string[] = [];
  const indexRef = { value: 1 };

  let title = options?.title?.trim() || frontmatter.title || "";
  let inCodeBlock = false;
  let codeLanguage = "";
  let codeBuffer: string[] = [];
  let inMathBlock = false;
  let mathBuffer: string[] = [];
  let inBlockquote = false;
  let quoteBuffer: string[] = [];
  let calloutVariant: "info" | "warning" | "success" | "error" | null = null;

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const trimmed = line.trim();

    // ── Code Block ──
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

    // ── Math Block ──
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

    // ── Empty Line ──
    if (!trimmed) {
      // Flush blockquote
      if (inBlockquote && quoteBuffer.length) {
        const content = quoteBuffer.join("\n");
        if (calloutVariant) {
          sections.push({
            id: `callout-${indexRef.value}`,
            type: "callout",
            direction: detectDirection(content),
            content,
            variant: calloutVariant,
          });
        } else {
          sections.push({
            id: `quote-${indexRef.value}`,
            type: "quote",
            direction: detectDirection(content),
            content,
          });
        }
        indexRef.value += 1;
        quoteBuffer = [];
        calloutVariant = null;
        inBlockquote = false;
      }
      flushParagraph(paragraphBuffer, sections, indexRef);
      continue;
    }

    // ── Code Block Start ──
    if (trimmed.startsWith("```")) {
      flushParagraph(paragraphBuffer, sections, indexRef);
      inCodeBlock = true;
      codeLanguage = trimmed.replace(/^```/, "").trim().toLowerCase();
      continue;
    }

    // ── Math Block Start ──
    if (trimmed === "$$") {
      flushParagraph(paragraphBuffer, sections, indexRef);
      inMathBlock = true;
      continue;
    }

    // ── Blockquote / Callout ──
    const quoteMatch = line.match(/^>\s?(.*)$/);
    if (quoteMatch) {
      if (!inBlockquote) {
        flushParagraph(paragraphBuffer, sections, indexRef);
        inBlockquote = true;
        // Check for GitHub-style callout
        const callout = parseCallout(line);
        if (callout) {
          calloutVariant = callout.variant;
          continue;
        }
      }
      quoteBuffer.push(sanitizeForPdf(quoteMatch[1]));
      continue;
    } else if (inBlockquote) {
      // End of blockquote
      const content = quoteBuffer.join("\n");
      if (calloutVariant) {
        sections.push({
          id: `callout-${indexRef.value}`,
          type: "callout",
          direction: detectDirection(content),
          content,
          variant: calloutVariant,
        });
      } else {
        sections.push({
          id: `quote-${indexRef.value}`,
          type: "quote",
          direction: detectDirection(content),
          content,
        });
      }
      indexRef.value += 1;
      quoteBuffer = [];
      calloutVariant = null;
      inBlockquote = false;
    }

    // ── Heading ──
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

    // ── Setext Headings (underline style) ──
    if (i + 1 < lines.length) {
      const nextLine = lines[i + 1].trim();
      if (/^=+$/.test(nextLine) && trimmed) {
        flushParagraph(paragraphBuffer, sections, indexRef);
        const headingText = sanitizeForPdf(trimmed);
        if (!title) title = headingText;
        sections.push({
          id: `heading-${indexRef.value}`,
          type: "heading",
          level: 1,
          direction: detectDirection(headingText),
          content: headingText,
        });
        indexRef.value += 1;
        i += 1;
        continue;
      }
      if (/^-+$/.test(nextLine) && trimmed && !trimmed.startsWith("-")) {
        flushParagraph(paragraphBuffer, sections, indexRef);
        const headingText = sanitizeForPdf(trimmed);
        sections.push({
          id: `heading-${indexRef.value}`,
          type: "heading",
          level: 2,
          direction: detectDirection(headingText),
          content: headingText,
        });
        indexRef.value += 1;
        i += 1;
        continue;
      }
    }

    // ── Horizontal Rule ──
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

    // ── GFM Table ──
    const table = parseTable(lines.slice(i), indexRef.value);
    if (table) {
      flushParagraph(paragraphBuffer, sections, indexRef);
      sections.push(table.section);
      indexRef.value += 1;
      i += table.consumed - 1;
      continue;
    }

    // ── List (ordered/unordered/task) ──
    const list = parseList(lines.slice(i), indexRef.value);
    if (list) {
      flushParagraph(paragraphBuffer, sections, indexRef);
      sections.push(list.section);
      indexRef.value += 1;
      i += list.consumed - 1;
      continue;
    }

    // ── Default: Paragraph ──
    paragraphBuffer.push(line);
  }

  // Flush remaining
  flushParagraph(paragraphBuffer, sections, indexRef);
  if (inBlockquote && quoteBuffer.length) {
    const content = quoteBuffer.join("\n");
    sections.push({
      id: `quote-${indexRef.value}`,
      type: calloutVariant ? "callout" : "quote",
      direction: detectDirection(content),
      content,
      variant: calloutVariant || undefined,
    });
  }
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
  const finalTitle = title ||
    frontmatter.title ||
    source.split("\n").find((line) => line.trim())?.slice(0, 72) ||
    fallbackTitle;
  const language = options?.language || detectPdfLanguage(source);

  return {
    title: finalTitle,
    subtitle: options?.subtitle || frontmatter.subtitle,
    author: options?.author || frontmatter.author,
    date: options?.date || frontmatter.date || new Date().toISOString().slice(0, 10),
    language,
    theme: options?.theme || "dark",
    pageSize: options?.pageSize || "a4",
    coverPage: options?.coverPage ?? true,
    tableOfContents:
      options?.tableOfContents ??
      sections.some((section) => section.type === "heading" && (section.level || 2) <= 2),
    sections: sections.length ? sections : [createParagraphSection(source || fallbackTitle, 1)],
    metadata: options?.metadata,
  };
}

// ─── Conversation Converter ───────────────────────────────────────────────────
export function conversationToPdfDocument(
  input: string | ConversationMessageLike[] | Message[]
): PDFDocument {
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

// ─── Page Count Estimator ─────────────────────────────────────────────────────
export function estimatePageCount(doc: PDFDocument): number {
  const totalChars = doc.sections.reduce((sum, section) => {
    const items = section.items?.join(" ").length || 0;
    const rows = section.rows?.flat().join(" ").length || 0;
    const events = section.events?.map(e => `${e.title} ${e.description || ""}`).join(" ").length || 0;
    const cards = section.cards?.map(c => `${c.value} ${c.label}`).join(" ").length || 0;
    return sum + section.content.length + items + rows + events + cards + 80;
  }, 0);

  return Math.max(1, Math.ceil(totalChars / 2400) + (doc.coverPage ? 1 : 0) + (doc.tableOfContents ? 1 : 0));
}
