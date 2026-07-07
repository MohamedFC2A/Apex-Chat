import type { PDFSection, RenderContext } from "../../../shared/pdf/types.js";
import type { SectionRenderer } from "./base-renderer.js";
import { renderInline, resolveDirection, replaceEmojisWithSvgs, escapeHtml, PREMIUM_SVGS } from "./base-renderer.js";

export class HighlightBoxRenderer implements SectionRenderer {
  render(section: PDFSection, context: RenderContext): string {
    const dir = resolveDirection(section, context.docLanguage);
    const classes = `pdf-section section-${section.type} dir-${dir}`;
    
    const color = section.boxColor || "#8b5cf6";
    const icon = section.boxIcon || "💡";
    const iconHtml = replaceEmojisWithSvgs(escapeHtml(icon)) || PREMIUM_SVGS.idea;

    const boxHtml = `<div class="highlight-box" style="border-left: 4px solid ${escapeHtml(color)}; background: ${escapeHtml(color)}10;">
      <div class="highlight-box-icon" style="color: ${escapeHtml(color)}">${iconHtml}</div>
      <div class="highlight-box-content">${renderInline(section.content)}</div>
    </div>`;

    return `<section class="${classes}" dir="${dir}">${boxHtml}</section>`;
  }
}
