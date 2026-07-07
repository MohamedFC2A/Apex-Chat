import type { PDFSection, RenderContext } from "../../../shared/pdf/types.js";
import type { SectionRenderer } from "./base-renderer.js";
import { renderInline, resolveDirection, resolveTextDirection } from "./base-renderer.js";

export class ListRenderer implements SectionRenderer {
  render(section: PDFSection, context: RenderContext): string {
    const dir = resolveDirection(section, context.docLanguage);
    const classes = `pdf-section section-${section.type} dir-${dir}`;
    const items = section.items || [];
    const listHtml = `<ul class="pdf-list">${items.map((item) => {
      const itemDir = resolveTextDirection(item, dir);
      const alignClass = itemDir !== dir ? `dir-${itemDir}` : "";
      return `<li class="${alignClass}" dir="${itemDir}">${renderInline(item)}</li>`;
    }).join("")}</ul>`;
    return `<section class="${classes}" dir="${dir}">${listHtml}</section>`;
  }
}
