import type { PDFSection, RenderContext, FlashcardData } from "../../../shared/pdf/types.js";
import type { SectionRenderer } from "./base-renderer.js";
import { renderInline, resolveDirection, replaceEmojisWithSvgs, escapeHtml, PREMIUM_SVGS } from "./base-renderer.js";

export class FlashcardRenderer implements SectionRenderer {
  render(section: PDFSection, context: RenderContext): string {
    const dir = resolveDirection(section, context.docLanguage);
    const classes = `pdf-section section-${section.type} dir-${dir}`;
    const isRtl = dir === "rtl";
    
    const cards = section.flashcards || [];
    const colors = ["#8b5cf6", "#06b6d4", "#10b981", "#f59e0b", "#ef4444", "#ec4899", "#3b82f6", "#84cc16"];

    const cardHtml = cards.map((card: FlashcardData, idx: number) => {
      const color = colors[idx % colors.length];
      return `<div class="flashcard" style="border-top: 4px solid ${escapeHtml(color)}">
        ${card.category ? `<div class="flashcard-category" style="color: ${escapeHtml(color)}">${replaceEmojisWithSvgs(escapeHtml(card.category))}</div>` : ""}
        <div class="flashcard-front">
          <div class="flashcard-front-label">${isRtl ? "السؤال" : "Q"}</div>
          <div class="flashcard-front-text">${renderInline(card.front)}</div>
          ${card.hint ? `<div class="flashcard-hint"><span>${PREMIUM_SVGS.idea}</span> ${replaceEmojisWithSvgs(escapeHtml(card.hint))}</div>` : ""}
        </div>
        <div class="flashcard-divider" style="background: ${escapeHtml(color)}22"></div>
        <div class="flashcard-back">
          <div class="flashcard-back-label" style="color: ${escapeHtml(color)}">${isRtl ? "الإجابة" : "A"}</div>
          <div class="flashcard-back-text">${renderInline(card.back)}</div>
        </div>
      </div>`;
    }).join("");

    const gridHtml = cards.length ? `<div class="flashcards-grid" dir="${isRtl ? "rtl" : "ltr"}">${cardHtml}</div>` : "";

    return `<section class="${classes}" dir="${dir}">
      ${section.content ? `<div class="flashcards-section-title">${renderInline(section.content)}</div>` : ""}
      ${gridHtml}
    </section>`;
  }
}
