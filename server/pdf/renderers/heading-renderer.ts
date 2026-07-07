import type { PDFSection, RenderContext } from "../../../shared/pdf/types.js";
import type { SectionRenderer } from "./base-renderer.js";
import { renderInline, resolveDirection } from "./base-renderer.js";

export class HeadingRenderer implements SectionRenderer {
  render(section: PDFSection, context: RenderContext): string {
    const dir = resolveDirection(section, context.docLanguage);
    const classes = `pdf-section section-${section.type} dir-${dir}`;
    const level = Math.min(Math.max(section.level || 2, 1), 6);
    return `<section class="${classes}" dir="${dir}"><h${level}>${renderInline(section.content)}</h${level}></section>`;
  }
}
