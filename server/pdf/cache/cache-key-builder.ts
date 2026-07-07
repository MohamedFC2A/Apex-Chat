/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║  APEX PDF — Cache Key Builder v4.0                                        ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */

import { createHash } from "crypto";
import type { PDFDocument } from "../../../shared/pdf/types.js";

export function buildPdfCacheKey(doc: PDFDocument, overrides?: Partial<Pick<PDFDocument, "theme" | "pageSize">>): string {
  const normalizedDoc = {
    title: doc.title,
    language: doc.language,
    theme: overrides?.theme || doc.theme,
    pageSize: overrides?.pageSize || doc.pageSize,
    coverPage: doc.coverPage,
    tableOfContents: doc.tableOfContents,
    sections: doc.sections,
  };
  const content = JSON.stringify(normalizedDoc);
  return createHash("sha256").update(content).digest("hex").slice(0, 24);
}

export function buildHtmlCacheKey(doc: PDFDocument): string {
  // HTML cache key excludes theme/pageSize since those affect PDF options not HTML content
  const content = JSON.stringify({
    title: doc.title,
    language: doc.language,
    coverPage: doc.coverPage,
    tableOfContents: doc.tableOfContents,
    sections: doc.sections,
  });
  return "html:" + createHash("sha256").update(content).digest("hex").slice(0, 20);
}
