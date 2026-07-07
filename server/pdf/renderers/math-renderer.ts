import type { PDFSection, RenderContext } from "../../../shared/pdf/types.js";
import type { SectionRenderer } from "./base-renderer.js";
import { escapeHtml, resolveDirection } from "./base-renderer.js";
import katex from "katex";

export class MathRenderer implements SectionRenderer {
  render(section: PDFSection, context: RenderContext): string {
    const dir = resolveDirection(section, context.docLanguage);
    const classes = `pdf-section section-${section.type} dir-${dir}`;
    let mathHtml = "";
    try {
      mathHtml = `<div class="math-block">${katex.renderToString(section.content, { displayMode: true, throwOnError: false, output: "html" })}</div>`;
    } catch {
      mathHtml = `<div class="math-block math-fallback">${escapeHtml(section.content)}</div>`;
    }
    return `<section class="${classes}" dir="${dir}">${mathHtml}</section>`;
  }
}
