import type { PDFDocument } from "../../../shared/pdf/types.js";
import { renderInline } from "../renderers/base-renderer.js";

export function renderTableOfContents(doc: PDFDocument): string {
  const headings = doc.sections.filter((section) => section.type === "heading");
  if (!headings.length) return "";
  const isRtl = doc.language === "ar";

  return `
    <section class="toc-page" dir="${isRtl ? "rtl" : "ltr"}">
      <div class="toc-header">
        <h2>${isRtl ? "فهرس المحتويات" : "Table of Contents"}</h2>
        <div class="toc-header-line"></div>
      </div>
      <ol class="toc-list">
        ${headings.map((section, index) => `
          <li class="toc-item level-${section.level || 2}">
            <span class="toc-num">${index + 1}</span>
            <span class="toc-title level-${section.level || 2}">${renderInline(section.content)}</span>
            <span class="toc-dot"></span>
            <span class="toc-page-number">${index + 2}</span>
          </li>`).join("")}
        </ol>
      </section>`;
}
