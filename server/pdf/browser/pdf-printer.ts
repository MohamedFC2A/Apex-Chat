/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║  APEX PDF — PDF Printer v4.0                                              ║
 * ║  Converts HTML to PDF Buffer using a pooled Puppeteer page               ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */

import type { PDFDocument, PDFPageSize } from "../../../shared/pdf/types.js";
import { PDF_GENERATION_TIMEOUT_MS, PDF_MAX_RETRIES } from "../../../shared/pdf/constants.js";
import { browserPool } from "./browser-pool.js";

function getPdfFormat(pageSize: PDFPageSize): "A4" | "Letter" {
  return pageSize === "letter" ? "Letter" : "A4";
}

export async function printHtmlToPdf(
  html: string,
  doc: PDFDocument,
  headerTemplate: string,
  footerTemplate: string,
): Promise<Buffer> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= PDF_MAX_RETRIES; attempt++) {
    const browser = await browserPool.acquire();
    let page: Awaited<ReturnType<typeof browser.newPage>> | null = null;

    try {
      page = await browser.newPage();
      await page.setViewport({ width: 1240, height: 1754, deviceScaleFactor: 2 });
      await page.setExtraHTTPHeaders({ "Accept-Language": "ar,en;q=0.9" });

      await page.setContent(html, {
        waitUntil: "domcontentloaded",
        timeout: PDF_GENERATION_TIMEOUT_MS,
      });

      // Wait for fonts and KaTeX
      await page.evaluate(() => document.fonts.ready);
      await new Promise((r) => setTimeout(r, 600));
      await page.emulateMediaType("print");

      const pdfBuffer = await page.pdf({
        format: getPdfFormat(doc.pageSize),
        printBackground: true,
        margin: { top: "85px", bottom: "85px", left: "24px", right: "24px" },
        displayHeaderFooter: true,
        headerTemplate,
        footerTemplate,
        preferCSSPageSize: false,
      });

      return Buffer.from(pdfBuffer);
    } catch (error) {
      lastError = error as Error;
      console.error(`[PdfPrinter] Attempt ${attempt}/${PDF_MAX_RETRIES} failed:`, error);
      if (attempt < PDF_MAX_RETRIES) {
        await new Promise((r) => setTimeout(r, attempt * 1500));
      }
    } finally {
      if (page) {
        try { await page.close(); } catch { /* ignore */ }
      }
      await browserPool.release(browser);
    }
  }

  throw lastError ?? new Error("PDF generation failed after all retries");
}
