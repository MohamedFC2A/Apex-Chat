import type { PDFSection, RenderContext } from "../../../shared/pdf/types.js";
import type { SectionRenderer } from "./base-renderer.js";
import { escapeHtml } from "./base-renderer.js";

export class WatermarkRenderer implements SectionRenderer {
  render(section: PDFSection, context: RenderContext): string {
    return `<!-- watermark: ${escapeHtml(section.watermarkText || section.content || "DRAFT")} -->`;
  }
}
