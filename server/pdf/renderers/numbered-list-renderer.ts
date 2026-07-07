import type { PDFSection, RenderContext } from "../../../shared/pdf/types.js";
import type { SectionRenderer } from "./base-renderer.js";
import { renderInline, resolveDirection, replaceEmojisWithSvgs, escapeHtml } from "./base-renderer.js";

export class NumberedListRenderer implements SectionRenderer {
  render(section: PDFSection, context: RenderContext): string {
    const dir = resolveDirection(section, context.docLanguage);
    const classes = `pdf-section section-${section.type} dir-${dir}`;
    
    const items = section.numberedItems || [];
    const listHtml = items.map(item => `<div class="numbered-item">
      <div class="numbered-badge">${replaceEmojisWithSvgs(escapeHtml(item.number))}</div>
      <div class="numbered-content">
        <div class="numbered-title">${renderInline(item.title)}</div>
        ${item.description ? `<div class="numbered-desc">${renderInline(item.description)}</div>` : ""}
      </div>
    </div>`).join("");

    const wrapperHtml = items.length ? `<div class="numbered-list">${listHtml}</div>` : "";

    return `<section class="${classes}" dir="${dir}">
      ${section.content ? `<div class="numbered-list-title">${renderInline(section.content)}</div>` : ""}
      ${wrapperHtml}
    </section>`;
  }
}
