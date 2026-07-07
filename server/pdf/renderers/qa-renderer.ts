import type { PDFSection, RenderContext } from "../../../shared/pdf/types.js";
import type { SectionRenderer } from "./base-renderer.js";
import { renderInline, resolveDirection } from "./base-renderer.js";

export class QARenderer implements SectionRenderer {
  render(section: PDFSection, context: RenderContext): string {
    const dir = resolveDirection(section, context.docLanguage);
    const classes = `pdf-section section-${section.type} dir-${dir}`;
    const isRtl = dir === "rtl";
    const q = section.question || "";
    const a = section.answer || "";
    const qBadge = isRtl ? "س" : "Q";
    const aBadge = isRtl ? "ج" : "A";

    const qaHtml = `
      <div class="qa-block" dir="${isRtl ? "rtl" : "ltr"}">
        <div class="qa-question-row">
          <span class="qa-badge qa-badge-q">${qBadge}</span>
          <div class="qa-question-text">${renderInline(q)}</div>
        </div>
        <div class="qa-answer-row">
          <span class="qa-badge qa-badge-a">${aBadge}</span>
          <div class="qa-answer-text">${renderInline(a)}</div>
        </div>
      </div>`;
    return `<section class="${classes}" dir="${dir}">${qaHtml}</section>`;
  }
}
