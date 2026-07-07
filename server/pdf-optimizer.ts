/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║  APEX AI — BACKWARD COMPATIBILITY WRAPPER FOR PDF OPTIMIZER                  ║
 * ║  Re-routes to server/pdf/index.ts module                                     ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */

import { generatePdfDocument, optimizePdfDocument } from "./pdf/index.js";
import type { PDFDocument } from "../shared/pdf/types.js";

export {
  estimateSectionHeight,
  analyzePageBoundaries,
  estimatePdfPageCount,
  enrichTocWithPageNumbers,
  deduplicateSections,
  mergeShortParagraphs,
  optimizePdfDocument,
  generateQualityReport,
} from "./pdf/index.js";

export async function generateOptimizedPdf(
  doc: PDFDocument,
  overrides?: Partial<Pick<PDFDocument, "theme" | "pageSize">>,
  optimizationOptions?: any
): Promise<Buffer> {
  const optimized = optimizePdfDocument(doc, optimizationOptions);
  return generatePdfDocument(optimized, overrides);
}
