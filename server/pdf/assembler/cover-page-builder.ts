import type { PDFDocument } from "../../../shared/pdf/types.js";
import { renderInline } from "../renderers/base-renderer.js";

export function renderCoverPage(doc: PDFDocument): string {
  const isRtl = doc.language === "ar";
  return `
    <section class="cover-page" dir="${isRtl ? "rtl" : "ltr"}">
      <div class="cover-inner">
        <div class="cover-header-bar">
          <div class="cover-institution">APEX AI RESEARCH INSTITUTE</div>
          <div class="cover-date">${doc.date || new Date().toISOString().slice(0, 10)}</div>
        </div>
        <div class="cover-main">
          <div class="cover-kicker">${isRtl ? "تقرير احترافي" : "PROFESSIONAL DOCUMENT"}</div>
          <h1>${renderInline(doc.title)}</h1>
          ${doc.subtitle ? `<p class="cover-subtitle">${renderInline(doc.subtitle)}</p>` : ""}
        </div>
        <div class="cover-divider-line"></div>
        <div class="cover-meta-row">
          ${doc.author ? `<div class="cover-meta-item"><span class="cover-meta-label">${isRtl ? "المؤلف" : "Author"}</span><span class="cover-meta-value">${renderInline(doc.author)}</span></div>` : ""}
          <div class="cover-meta-item"><span class="cover-meta-label">${isRtl ? "التاريخ" : "Date"}</span><span class="cover-meta-value">${doc.date || new Date().toISOString().slice(0, 10)}</span></div>
          <div class="cover-meta-item"><span class="cover-meta-label">${isRtl ? "التنسيق" : "Format"}</span><span class="cover-meta-value">${doc.pageSize.toUpperCase()}</span></div>
          <div class="cover-meta-item"><span class="cover-meta-label">${isRtl ? "اللغة" : "Language"}</span><span class="cover-meta-value">${doc.language.toUpperCase()}</span></div>
        </div>
        <div class="cover-footer-bar">
          <span class="cover-confidential">${isRtl ? "وثيقة رسمية — Apex AI" : "Official Document — Apex AI"}</span>
        </div>
      </div>
    </section>`;
}
