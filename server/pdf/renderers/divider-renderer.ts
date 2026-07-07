import type { PDFSection, RenderContext } from "../../../shared/pdf/types.js";
import type { SectionRenderer } from "./base-renderer.js";

export class DividerRenderer implements SectionRenderer {
  render(section: PDFSection, context: RenderContext): string {
    return `<div class="section-divider" aria-hidden="true"></div>`;
  }
}
