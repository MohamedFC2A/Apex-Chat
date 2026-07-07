import type { PDFSection, RenderContext } from "../../../shared/pdf/types.js";
import type { SectionRenderer } from "./base-renderer.js";
import { renderInline, resolveDirection } from "./base-renderer.js";

export class TwoColumnRenderer implements SectionRenderer {
  render(section: PDFSection, context: RenderContext): string {
    const dir = resolveDirection(section, context.docLanguage);
    const classes = `pdf-section section-${section.type} dir-${dir}`;
    
    const cols = section.columns;
    if (!cols) {
      return `<section class="${classes}" dir="${dir}"></section>`;
    }

    const gridHtml = `<div class="two-column-grid">
      <div class="two-col-panel">
        ${cols.leftHeading ? `<h4 class="two-col-heading">${renderInline(cols.leftHeading)}</h4>` : ""}
        <div class="two-col-content">${renderInline(cols.left)}</div>
      </div>
      <div class="two-col-divider"></div>
      <div class="two-col-panel">
        ${cols.rightHeading ? `<h4 class="two-col-heading">${renderInline(cols.rightHeading)}</h4>` : ""}
        <div class="two-col-content">${renderInline(cols.right)}</div>
      </div>
    </div>`;

    return `<section class="${classes}" dir="${dir}">
      ${section.content ? `<div class="two-col-section-title">${renderInline(section.content)}</div>` : ""}
      ${gridHtml}
    </section>`;
  }
}
