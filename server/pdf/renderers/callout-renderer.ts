import type { PDFSection, RenderContext } from "../../../shared/pdf/types.js";
import type { SectionRenderer } from "./base-renderer.js";
import { renderInline, resolveDirection, PREMIUM_SVGS } from "./base-renderer.js";

export class CalloutRenderer implements SectionRenderer {
  render(section: PDFSection, context: RenderContext): string {
    const dir = resolveDirection(section, context.docLanguage);
    const classes = `pdf-section section-${section.type} dir-${dir}`;
    const variant = section.variant || "info";
    const calloutIcons: Record<string, string> = {
      info: PREMIUM_SVGS.info,
      warning: PREMIUM_SVGS.warning,
      success: PREMIUM_SVGS.success,
      error: PREMIUM_SVGS.error,
      primary: PREMIUM_SVGS.info,
      secondary: PREMIUM_SVGS.info,
    };
    const icon = calloutIcons[variant] || PREMIUM_SVGS.info;
    const calloutHtml = `<aside class="callout callout-${variant}">
      <span class="callout-icon">${icon}</span>
      <div class="callout-body">${renderInline(section.content)}</div>
    </aside>`;
    return `<section class="${classes}" dir="${dir}">${calloutHtml}</section>`;
  }
}
