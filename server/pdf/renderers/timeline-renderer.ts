import type { PDFSection, RenderContext } from "../../../shared/pdf/types.js";
import type { SectionRenderer } from "./base-renderer.js";
import { renderInline, resolveDirection, escapeHtml, replaceEmojisWithSvgs } from "./base-renderer.js";

export class TimelineRenderer implements SectionRenderer {
  render(section: PDFSection, context: RenderContext): string {
    const dir = resolveDirection(section, context.docLanguage);
    const classes = `pdf-section section-${section.type} dir-${dir}`;
    const isRtl = dir === "rtl";
    const events = section.events || [];
    if (!events.length) return "";

    const eventsHtml = events.map((event, idx) => {
      const color = event.color || (idx % 2 === 0 ? "#8b5cf6" : "#06b6d4");
      const iconHtml = event.icon 
        ? replaceEmojisWithSvgs(escapeHtml(event.icon)) 
        : `<span class="timeline-num">${idx + 1}</span>`;
      return `<div class="timeline-item">
        <div class="timeline-dot" style="background: ${escapeHtml(color)}; border-color: ${escapeHtml(color)}">
          ${iconHtml}
        </div>
        <div class="timeline-connector" ${idx === events.length - 1 ? 'style="opacity:0"' : ""}></div>
        <div class="timeline-content">
          <div class="timeline-date" style="color: ${escapeHtml(color)}">${replaceEmojisWithSvgs(escapeHtml(event.date))}</div>
          <div class="timeline-title">${renderInline(event.title)}</div>
          ${event.description ? `<div class="timeline-desc">${renderInline(event.description)}</div>` : ""}
        </div>
      </div>`;
    }).join("");

    return `<section class="${classes}" dir="${dir}">
      ${section.content ? `<div class="timeline-heading">${renderInline(section.content)}</div>` : ""}
      <div class="timeline-wrapper" dir="${isRtl ? "rtl" : "ltr"}">${eventsHtml}</div>
    </section>`;
  }
}
