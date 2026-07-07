/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║  APEX AI — BACKWARD COMPATIBILITY WRAPPER FOR PDF ENGINE                    ║
 * ║  Re-routes to server/pdf/index.ts module                                     ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */

import { generatePdfDocument, browserPool } from "./pdf/index.js";
import { buildPdfHtml as coreBuildPdfHtml } from "./pdf/assembler/index.js";
import type { PDFDocument } from "../shared/pdf/types.js";

export { browserPool } from "./pdf/index.js";

export async function initBrowser() {
  return browserPool.acquire();
}

export async function closeBrowser() {
  return browserPool.shutdown();
}

export function buildPdfHtml(doc: PDFDocument): string {
  return coreBuildPdfHtml(doc);
}

export async function generatePdf(
  doc: PDFDocument,
  overrides?: Partial<Pick<PDFDocument, "theme" | "pageSize">>
): Promise<Buffer> {
  return generatePdfDocument(doc, overrides);
}
