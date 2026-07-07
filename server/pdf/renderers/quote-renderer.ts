import type { PDFSection, RenderContext } from "../../../shared/pdf/types.js";
import type { SectionRenderer } from "./base-renderer.js";
import { renderInline, resolveDirection } from "./base-renderer.js";

export class QuoteRenderer implements SectionRenderer {
  render(section: PDFSection, context: RenderContext): string {
    const dir = resolveDirection(section, context.docLanguage);
    const classes = `pdf-section section-${section.type} dir-${dir}`;
    return `<section class="${classes}" dir="${dir}"><blockquote class="pdf-quote">${renderInline(section.content)}</blockquote></section>`;
  }
}
