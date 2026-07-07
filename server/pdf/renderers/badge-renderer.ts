import type { PDFSection, RenderContext } from "../../../shared/pdf/types.js";
import type { SectionRenderer } from "./base-renderer.js";
import { renderInline, resolveDirection, replaceEmojisWithSvgs, escapeHtml } from "./base-renderer.js";

export class BadgeRenderer implements SectionRenderer {
  render(section: PDFSection, context: RenderContext): string {
    const dir = resolveDirection(section, context.docLanguage);
    const classes = `pdf-section section-${section.type} dir-${dir}`;
    
    const badges = section.badges || [];
    const badgeColorMap: Record<string, string> = {
      primary: "#8b5cf6", secondary: "#64748b", success: "#10b981",
      error: "#ef4444", warning: "#f59e0b", info: "#06b6d4",
    };
    const badgeHtml = badges.map(b => {
      const color = badgeColorMap[b.variant || "primary"] || "#8b5cf6";
      return `<span class="badge-pill" style="background: ${color}18; color: ${color}; border: 1px solid ${color}44">${replaceEmojisWithSvgs(escapeHtml(b.text))}</span>`;
    }).join("");

    const groupHtml = badges.length ? `<div class="badge-group">${badgeHtml}</div>` : "";

    return `<section class="${classes}" dir="${dir}">
      ${section.content ? `<div class="badge-section-label">${renderInline(section.content)}</div>` : ""}
      ${groupHtml}
    </section>`;
  }
}
