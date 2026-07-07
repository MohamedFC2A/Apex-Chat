import type { PDFSection, RenderContext } from "../../../shared/pdf/types.js";
import type { SectionRenderer } from "./base-renderer.js";
import { renderInline, resolveDirection, getTableCellAlignClass } from "./base-renderer.js";

function getAlignClass(text: string): string {
  const trimmed = text.trim();
  if (/^[\d.,%$\u20AC\u00A3\u00A5\-+\(\)]+$/.test(trimmed)) return "align-center";
  if (/[\u0600-\u06FF]/.test(trimmed)) return "align-right";
  return "align-left";
}

export class TableRenderer implements SectionRenderer {
  render(section: PDFSection, context: RenderContext): string {
    const dir = resolveDirection(section, context.docLanguage);
    const classes = `pdf-section section-${section.type} dir-${dir}`;
    const headers = section.headers || [];
    const rows = section.rows || [];

    const colAlignments = headers.map((_, colIdx) => {
      let numericCount = 0, rtlCount = 0, totalCount = 0;
      rows.forEach(row => {
        const cellVal = row[colIdx];
        if (cellVal) {
          totalCount++;
          const trimmed = cellVal.trim();
          if (/^[\d.,%$\u20AC\u00A3\u00A5\-+\(\)]+$/.test(trimmed)) numericCount++;
          if (/[\u0600-\u06FF]/.test(trimmed)) rtlCount++;
        }
      });
      if (totalCount > 0 && numericCount / totalCount > 0.5) return "align-center";
      if (rtlCount > 0) return "align-right";
      return "align-left";
    });

    const thead = headers.length
      ? `<thead><tr>${headers.map((header, idx) =>
          `<th class="${colAlignments[idx] || "align-left"}">${renderInline(header)}</th>`
        ).join("")}</tr></thead>` : "";

    const tbody = `<tbody>${rows.map((row, rowIdx) => {
      const isTotal = section.totalRow && rowIdx === rows.length - 1;
      return `<tr class="${isTotal ? "total-row" : ""}">${row.map((cell, idx) => {
        const alignClass = colAlignments[idx] || getAlignClass(cell);
        return `<td class="${alignClass}">${renderInline(cell)}</td>`;
      }).join("")}</tr>`;
    }).join("")}</tbody>`;

    const tableHtml = `<div class="table-wrap">
      <table>${thead}${tbody}</table>
      ${section.caption ? `<p class="table-caption">${renderInline(section.caption)}</p>` : ""}
    </div>`;

    return `<section class="${classes}" dir="${dir}">${tableHtml}</section>`;
  }
}
