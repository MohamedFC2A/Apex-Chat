import type { PDFSection, RenderContext } from "../../../shared/pdf/types.js";
import type { SectionRenderer } from "./base-renderer.js";
import { resolveDirection, replaceEmojisWithSvgs, escapeHtml, PREMIUM_SVGS } from "./base-renderer.js";

export class AnswerKeyRenderer implements SectionRenderer {
  render(section: PDFSection, context: RenderContext): string {
    const dir = resolveDirection(section, context.docLanguage);
    const classes = `pdf-section section-${section.type} answer-key-section dir-${dir}`;
    const isRtl = dir === "rtl";
    
    const title = section.content || (isRtl ? "مفتاح الإجابات" : "Answer Key");
    const rows = section.rows || [];
    const headers = section.headers || (isRtl ? ["رقم السؤال", "الإجابة", "الدرجة"] : ["Question #", "Answer", "Marks"]);

    const thead = `<thead><tr>${headers.map(h => `<th>${replaceEmojisWithSvgs(escapeHtml(h))}</th>`).join("")}</tr></thead>`;
    const tbody = `<tbody>${rows.map(row => `<tr>${row.map(cell => `<td>${replaceEmojisWithSvgs(escapeHtml(cell))}</td>`).join("")}</tr>`).join("")}</tbody>`;

    const blockHtml = `<div class="answer-key-block" dir="${isRtl ? "rtl" : "ltr"}">
      <div class="answer-key-header">
        <span class="answer-key-icon">${PREMIUM_SVGS.key}</span>
        <span class="answer-key-title">${replaceEmojisWithSvgs(escapeHtml(title))}</span>
      </div>
      <table class="answer-key-table">${thead}${tbody}</table>
    </div>`;

    return `<section class="${classes}" dir="${dir}">${blockHtml}</section>`;
  }
}
