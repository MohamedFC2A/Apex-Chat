import type { PDFSection, RenderContext } from "../../../shared/pdf/types.js";
import type { SectionRenderer } from "./base-renderer.js";
import { renderInline, resolveDirection, escapeHtml } from "./base-renderer.js";

export class ImageRenderer implements SectionRenderer {
  render(section: PDFSection, context: RenderContext): string {
    const dir = resolveDirection(section, context.docLanguage);
    const classes = `pdf-section section-${section.type} dir-${dir}`;
    const src = section.content.trim();
    if (!src) return "";
    const imgHtml = `<figure class="pdf-figure">
      <img src="${escapeHtml(src)}" alt="${escapeHtml(section.caption || "image")}" />
      ${section.caption ? `<figcaption>${renderInline(section.caption)}</figcaption>` : ""}
    </figure>`;
    return `<section class="${classes}" dir="${dir}">${imgHtml}</section>`;
  }
}
