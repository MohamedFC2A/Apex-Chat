/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║  APEX PDF — Request Parser v4.0                                           ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */

import type { ParsedPdfRequest, PDFDocumentTheme, PDFPageSize } from "../../../shared/pdf/types.js";
import { detectPdfLanguage } from "./language-detector.js";
import { detectPdfMode } from "./mode-detector.js";

const STOP_WORDS = new Set([
  "pdf", "document", "report", "file", "export", "generate", "create",
  "make", "build", "convert", "into", "to", "for", "about", "on", "the",
  "a", "an", "please", "with", "include", "summary", "professional",
  "ملف", "وثيقة", "مستند", "تقرير", "بي", "دي", "اف", "اعمل",
  "اعملي", "اعمللي", "سوي", "سويلي", "حول", "حوّل", "حولها",
  "صدّر", "صدر", "لي", "عن", "في", "على", "بخصوص", "مع", "احترافي",
  "احترافية", "ملخص",
]);

export function cleanMessageOfDirectives(message: string): string {
  if (!message) return "";
  const index = message.indexOf("[SYSTEM DIRECTIVE:");
  return index !== -1 ? message.substring(0, index).trim() : message.trim();
}

function cleanupTopic(rawTopic: string): string {
  return rawTopic
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/[^A-Za-z0-9\u0600-\u06FF\s-]/g, " ")
    .split(/\s+/)
    .map((t) => t.trim())
    .filter(Boolean)
    .filter((t) => !STOP_WORDS.has(t.toLowerCase()))
    .filter((t) => !/^\d+$/.test(t))
    .join(" ")
    .trim();
}

function extractTopicByAnchor(message: string): string {
  const patterns = [
    /(?:about|on|for|regarding)\s+(.+)$/i,
    /(?:عن|في|حول|بخصوص)\s+(.+)$/i,
  ];
  for (const p of patterns) {
    const m = message.match(p);
    if (m?.[1]) { const t = cleanupTopic(m[1]); if (t) return t; }
  }
  return "";
}

function extractQuestionCount(message: string): number {
  const m =
    message.match(/([\d٠-٩]+)\s*(?:questions?|سؤال|أسئلة|اسئلة|اسئله|سوال)/i) ||
    message.match(/(?:questions?|سؤال|أسئلة|اسئلة)\s*[:(]?\s*([\d٠-٩]+)/i);
  if (m?.[1]) {
    const num = parseInt(m[1].replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d))));
    if (!isNaN(num) && num > 0 && num <= 100) return num;
  }
  return 10;
}

function extractRequestedSections(message: string): string[] | undefined {
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
  const sections = checks.filter(([p]) => p.test(message)).map(([, l]) => l);
  return sections.length ? sections : undefined;
}

export function parsePdfRequest(message: string): ParsedPdfRequest {
  const clean = cleanMessageOfDirectives(message);
  const language = detectPdfLanguage(clean);
  const mode = detectPdfMode(clean);
  const lowered = clean.toLowerCase();

  let theme: PDFDocumentTheme | undefined;
  if (/(?:light theme|light mode|ثيم فاتح|خلفية بيضاء|وضع فاتح)/i.test(clean)) theme = "light";
  else if (/(?:dark theme|dark mode|ثيم داكن|خلفية داكنة|وضع داكن)/i.test(clean)) theme = "dark";

  let pageSize: PDFPageSize | undefined;
  if (/(?:letter size|letter format|حجم letter|امريكي)/i.test(clean)) pageSize = "letter";
  else if (/(?:a4 size|a4 format|حجم a4|مقاس a4)/i.test(clean)) pageSize = "a4";

  const includeCode = /(?:code|snippet|example|implementation|كود|أمثلة برمجية|برمجي)/i.test(clean) ||
    lowered.includes("code") || clean.includes("كود");
  const includeMath = /(?:math|equation|formula|latex|معادلات|معادلة|رياضيات|صيغة)/i.test(clean) ||
    lowered.includes("math") || clean.includes("معادلة") || clean.includes("معادلات");

  const questionCount = (mode === "exam" || mode === "quiz" || mode === "worksheet")
    ? extractQuestionCount(clean) : undefined;

  return {
    rawMessage: message,
    topic: extractTopicByAnchor(clean) || cleanupTopic(clean) ||
      (language === "ar" ? "موضوع احترافي" : "professional topic"),
    language,
    requestedSections: extractRequestedSections(clean),
    includeCode,
    includeMath,
    includeTableOfContents: mode === "study" &&
      (/(?:table of contents|toc|فهرس|المحتويات)/i.test(clean) ||
       /(?:report|document|تقرير|مستند)/i.test(clean)),
    includeCoverPage: mode === "study" &&
      !/(?:without cover|no cover|بدون غلاف)/i.test(clean),
    theme,
    pageSize,
    mode,
    questionCount,
    includeAnswerKey: mode === "exam" ||
      /(?:answer\s*key|مفتاح\s*الإجابات|إجابات\s*نموذجية)/i.test(clean),
    showAnswersInline: mode === "quiz" || mode === "worksheet" || mode === "flashcard",
  };
}
