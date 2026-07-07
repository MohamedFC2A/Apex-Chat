import type { PDFDocument } from "../../../shared/pdf/types.js";
import { RENDERERS } from "../renderers/index.js";
import { escapeHtml } from "../renderers/base-renderer.js";
import { getDocumentStyles, FONT_IMPORTS, resolveTheme } from "../styles/index.js";
import { getWatermarkCss } from "./watermark-builder.js";
import { renderCoverPage } from "./cover-page-builder.js";
import { renderTableOfContents } from "./toc-builder.js";

export function buildPdfHtml(doc: PDFDocument): string {
  const theme = resolveTheme(doc.theme);
  const bodyDirection = doc.language === "ar" ? "rtl" : "ltr";
  const watermarkCss = getWatermarkCss(doc);
  const renderContext = { docLanguage: doc.language, theme, isRtl: doc.language === "ar" };

  const sectionsHtml = doc.sections.map((section) => {
    const renderer = RENDERERS[section.type];
    if (renderer) {
      return renderer.render(section, renderContext);
    }
    // Fallback: render paragraph
    const pRenderer = RENDERERS["paragraph"];
    return pRenderer ? pRenderer.render(section, renderContext) : "";
  }).join("\n");

  return `<!DOCTYPE html>
<html lang="${doc.language === "ar" ? "ar" : "en"}" dir="${bodyDirection}">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(doc.title)}</title>
    <meta name="description" content="${escapeHtml(doc.subtitle || doc.title)}" />
    <meta name="author" content="${escapeHtml(doc.author || "Apex AI")}" />
    <link rel="preconnect" href="https://fonts.googleapis.com" crossorigin>
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=Cairo:wght@400;600;700;800&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css">
    <style>
      ${FONT_IMPORTS}
      ${getDocumentStyles(theme)}
      ${watermarkCss}
    </style>
  </head>
  <body dir="${bodyDirection}">
    <main class="document-shell">
      ${doc.coverPage ? renderCoverPage(doc) : ""}
      ${doc.tableOfContents ? renderTableOfContents(doc) : ""}
      <section class="document-body">
        ${sectionsHtml}
      </section>
    </main>
  </body>
</html>`;
}
