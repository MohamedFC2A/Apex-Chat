/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║  APEX PDF — Module Entry Point / Public API v4.0                          ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */

import type { PDFDocument } from "../../shared/pdf/types.js";
import { buildPdfHtml, getHeaderTemplate, getFooterTemplate } from "./assembler/index.js";
import { printHtmlToPdf } from "./browser/index.js";
import { pdfCache, buildPdfCacheKey } from "./cache/index.js";

// Core exports
export { browserPool } from "./browser/index.js";
export { pdfCache } from "./cache/index.js";
export { pdfJobQueue } from "./queue/index.js";

// Intent Layer exports
export {
  detectPdfIntent,
  detectPdfMode,
  isPdfExamOrQuizMode,
  detectPdfLanguage,
  containsArabic,
  detectDirection,
  parsePdfRequest,
  cleanMessageOfDirectives,
} from "./intent/index.js";

// Instruction Layer exports
export {
  buildPdfGenerationInstructions,
  buildPdfRepairInstructions,
} from "./instructions/index.js";

// Conversion Layer exports
export {
  markdownToPdfDocument,
  conversationToPdfDocument,
} from "./markdown-bridge/index.js";

// Optimizer Layer exports
export {
  estimateSectionHeight,
  analyzePageBoundaries,
  estimatePdfPageCount,
  enrichTocWithPageNumbers,
  deduplicateSections,
  mergeShortParagraphs,
  optimizePdfDocument,
  generateQualityReport,
} from "./optimizer/index.js";

/**
 * Generates a PDF buffer from a PDFDocument object.
 * Utilizes caching to return instantly if the document has already been generated.
 */
export async function generatePdfDocument(
  doc: PDFDocument,
  overrides?: Partial<Pick<PDFDocument, "theme" | "pageSize">>
): Promise<Buffer> {
  const cacheKey = buildPdfCacheKey(doc, overrides);

  const { buffer } = await pdfCache.getOrGeneratePdf(cacheKey, async () => {
    const normalizedDoc: PDFDocument = {
      ...doc,
      theme: overrides?.theme || doc.theme,
      pageSize: overrides?.pageSize || doc.pageSize,
    };

    const html = buildPdfHtml(normalizedDoc);
    const headerHtml = getHeaderTemplate(normalizedDoc);
    const footerHtml = getFooterTemplate(normalizedDoc);

    return printHtmlToPdf(html, normalizedDoc, headerHtml, footerHtml);
  });

  return buffer;
}
