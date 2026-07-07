import type { PDFSection, RenderContext } from "../../../shared/pdf/types.js";
import type { SectionRenderer } from "./base-renderer.js";
import { renderInline, resolveDirection, escapeHtml, replaceEmojisWithSvgs } from "./base-renderer.js";

export class StatCardRenderer implements SectionRenderer {
  render(section: PDFSection, context: RenderContext): string {
    const dir = resolveDirection(section, context.docLanguage);
    const classes = `pdf-section section-${section.type} dir-${dir}`;
    const cards = section.cards || [];
    if (!cards.length) return "";

    const trendIcon = (trend?: string) => {
      if (trend === "up") return '<span class="trend-up">▲</span>';
      if (trend === "down") return '<span class="trend-down">▼</span>';
      return '<span class="trend-flat">►</span>';
    };

    const cardHtml = cards.map((card) => {
      const color = card.color || "#8b5cf6";
      return `<div class="stat-card" style="border-top: 3px solid ${escapeHtml(color)}">
        <div class="stat-card-value" style="color: ${escapeHtml(color)}">${replaceEmojisWithSvgs(escapeHtml(card.value))}${card.unit ? `<span class="stat-unit">${replaceEmojisWithSvgs(escapeHtml(card.unit))}</span>` : ""}</div>
        <div class="stat-card-label">${replaceEmojisWithSvgs(escapeHtml(card.label))}</div>
        ${card.trend ? `<div class="stat-card-trend">${trendIcon(card.trend)}<span>${replaceEmojisWithSvgs(escapeHtml(card.trendValue || ""))}</span></div>` : ""}
      </div>`;
    }).join("");

    return `<section class="${classes}" dir="${dir}">
      ${section.content ? `<div class="stat-cards-title">${renderInline(section.content)}</div>` : ""}
      <div class="stat-cards-grid">${cardHtml}</div>
    </section>`;
  }
}
