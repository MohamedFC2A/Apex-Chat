/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║  APEX PDF — Language Detector v4.0                                        ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */

import type { PDFDocumentLanguage } from "../../../shared/pdf/types.js";

const ARABIC_RANGE = /[\u0600-\u06FF]/;
const LATIN_RANGE = /[A-Za-z]/;

export function containsArabic(text: string): boolean {
  return ARABIC_RANGE.test(text);
}

export function detectPdfLanguage(text: string): PDFDocumentLanguage {
  const hasArabic = ARABIC_RANGE.test(text);
  const hasLatin = LATIN_RANGE.test(text);
  if (hasArabic && hasLatin) return "mixed";
  if (hasArabic) return "ar";
  return "en";
}

export function detectDirection(text: string): "rtl" | "ltr" {
  return ARABIC_RANGE.test(text) ? "rtl" : "ltr";
}
