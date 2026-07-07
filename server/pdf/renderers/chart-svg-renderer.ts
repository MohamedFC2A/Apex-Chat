import type { PDFSection, RenderContext, ChartDataPoint } from "../../../shared/pdf/types.js";
import type { SectionRenderer } from "./base-renderer.js";
import { resolveDirection, escapeHtml } from "./base-renderer.js";

export class ChartSvgRenderer implements SectionRenderer {
  render(section: PDFSection, context: RenderContext): string {
    const dir = resolveDirection(section, context.docLanguage);
    const classes = `pdf-section section-${section.type} dir-${dir}`;
    
    const data = section.chartData || [];
    const chartType = section.chartType || "bar";
    const title = section.chartTitle || section.content || "";
    const height = section.chartHeight || 260;
    const width = 620;
    const defaultColors = ["#8b5cf6", "#06b6d4", "#10b981", "#f59e0b", "#ef4444", "#ec4899", "#3b82f6", "#84cc16"];

    if (!data.length) {
      return `<section class="${classes}" dir="${dir}"></section>`;
    }

    const maxVal = Math.max(...data.map((d: ChartDataPoint) => d.value), 1);
    let chartHtml = "";

    if (chartType === "bar") {
      const barCount = data.length;
      const padding = { top: 30, right: 20, bottom: 60, left: 50 };
      const chartW = width - padding.left - padding.right;
      const chartH = height - padding.top - padding.bottom;
      const barW = Math.max(20, Math.floor(chartW / barCount) - 10);
      const gap = (chartW - barW * barCount) / (barCount + 1);

      const gridLines = [0, 25, 50, 75, 100].map(pct => {
        const y = padding.top + chartH - (chartH * pct / 100);
        const val = Math.round(maxVal * pct / 100);
        return `<line x1="${padding.left}" y1="${y}" x2="${padding.left + chartW}" y2="${y}" stroke="#e2e8f0" stroke-width="1"/>
          <text x="${padding.left - 5}" y="${y + 4}" text-anchor="end" font-size="10" fill="#94a3b8">${val}</text>`;
      }).join("");

      const bars = data.map((d: ChartDataPoint, i: number) => {
        const x = padding.left + gap + i * (barW + gap);
        const barH = (d.value / maxVal) * chartH;
        const y = padding.top + chartH - barH;
        const color = d.color || defaultColors[i % defaultColors.length];
        const labelX = x + barW / 2;
        const labelLines = d.label.split(" ");
        const labelY1 = padding.top + chartH + 16;
        const labelY2 = labelY1 + 12;
        return `<rect x="${x}" y="${y}" width="${barW}" height="${barH}" rx="4" fill="${escapeHtml(color)}" opacity="0.9"/>
          <text x="${labelX}" y="${y - 4}" text-anchor="middle" font-size="10" font-weight="700" fill="${escapeHtml(color)}">${d.value}</text>
          <text x="${labelX}" y="${labelY1}" text-anchor="middle" font-size="9" fill="#64748b">${escapeHtml(labelLines[0] || "")}</text>
          ${labelLines[1] ? `<text x="${labelX}" y="${labelY2}" text-anchor="middle" font-size="9" fill="#64748b">${escapeHtml(labelLines[1])}</text>` : ""}`;
      }).join("");

      chartHtml = `<div class="chart-wrapper">
        ${title ? `<div class="chart-title">${escapeHtml(title)}</div>` : ""}
        <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" style="overflow:visible;max-width:100%">
          ${gridLines}
          ${bars}
          <line x1="${padding.left}" y1="${padding.top}" x2="${padding.left}" y2="${padding.top + chartH}" stroke="#cbd5e1" stroke-width="1.5"/>
          <line x1="${padding.left}" y1="${padding.top + chartH}" x2="${padding.left + chartW}" y2="${padding.top + chartH}" stroke="#cbd5e1" stroke-width="1.5"/>
        </svg>
      </div>`;
    } else if (chartType === "pie" || chartType === "donut") {
      const cx = 160, cy = height / 2, r = Math.min(cy - 20, 110);
      const innerR = chartType === "donut" ? r * 0.55 : 0;
      const total = data.reduce((s: number, d: ChartDataPoint) => s + d.value, 0);
      let startAngle = -Math.PI / 2;

      const slices = data.map((d: ChartDataPoint, i: number) => {
        const angle = (d.value / total) * 2 * Math.PI;
        const endAngle = startAngle + angle;
        const x1 = cx + r * Math.cos(startAngle);
        const y1 = cy + r * Math.sin(startAngle);
        const x2 = cx + r * Math.cos(endAngle);
        const y2 = cy + r * Math.sin(endAngle);
        const xi1 = cx + innerR * Math.cos(startAngle);
        const yi1 = cy + innerR * Math.sin(startAngle);
        const xi2 = cx + innerR * Math.cos(endAngle);
        const yi2 = cy + innerR * Math.sin(endAngle);
        const largeArc = angle > Math.PI ? 1 : 0;
        const color = d.color || defaultColors[i % defaultColors.length];

        const path = chartType === "donut"
          ? `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} L ${xi2} ${yi2} A ${innerR} ${innerR} 0 ${largeArc} 0 ${xi1} ${yi1} Z`
          : `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;

        startAngle = endAngle;

        const pct = Math.round((d.value / total) * 100);
        return { path, color, label: d.label, pct, value: d.value };
      });

      const slicesSvg = slices.map((s) =>
        `<path d="${s.path}" fill="${escapeHtml(s.color)}" stroke="white" stroke-width="2" opacity="0.92"/>`)
        .join("");

      const legendX = cx * 2 + 20;
      const legendItems = slices.map((s, i) =>
        `<g transform="translate(${legendX}, ${20 + i * 22})">
          <rect x="0" y="-9" width="12" height="12" rx="3" fill="${escapeHtml(s.color)}"/>
          <text x="18" y="0" font-size="11" fill="#374151">${escapeHtml(s.label.slice(0, 18))} — ${s.pct}%</text>
        </g>`).join("");

      const centerLabel = chartType === "donut"
        ? `<text x="${cx}" y="${cy - 6}" text-anchor="middle" font-size="22" font-weight="800" fill="#1e293b">${total}</text>
           <text x="${cx}" y="${cy + 14}" text-anchor="middle" font-size="10" fill="#64748b">Total</text>`
        : "";

      chartHtml = `<div class="chart-wrapper">
        ${title ? `<div class="chart-title">${escapeHtml(title)}</div>` : ""}
        <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" style="max-width:100%;overflow:visible">
          ${slicesSvg}
          ${centerLabel}
          ${legendItems}
        </svg>
      </div>`;
    } else if (chartType === "line") {
      const padding = { top: 30, right: 20, bottom: 55, left: 50 };
      const chartW = width - padding.left - padding.right;
      const chartH = height - padding.top - padding.bottom;
      const step = chartW / (data.length - 1 || 1);
      const color = data[0]?.color || "#8b5cf6";

      const points = data.map((d: ChartDataPoint, i: number) => ({
        x: padding.left + i * step,
        y: padding.top + chartH - (d.value / maxVal) * chartH,
        label: d.label,
        value: d.value,
      }));

      const polyline = points.map((p) => `${p.x},${p.y}`).join(" ");
      const areaPoints = [
        `${points[0]?.x},${padding.top + chartH}`,
        ...points.map((p) => `${p.x},${p.y}`),
        `${points[points.length - 1]?.x},${padding.top + chartH}`,
      ].join(" ");

      const circles = points.map((p) =>
        `<circle cx="${p.x}" cy="${p.y}" r="5" fill="${escapeHtml(color)}" stroke="white" stroke-width="2"/>
         <text x="${p.x}" y="${p.y - 10}" text-anchor="middle" font-size="10" font-weight="700" fill="${escapeHtml(color)}">${p.value}</text>
         <text x="${p.x}" y="${padding.top + chartH + 16}" text-anchor="middle" font-size="9" fill="#64748b">${escapeHtml(p.label.slice(0, 10))}</text>`
      ).join("");

      chartHtml = `<div class="chart-wrapper">
        ${title ? `<div class="chart-title">${escapeHtml(title)}</div>` : ""}
        <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" style="max-width:100%;overflow:visible">
          <defs>
            <linearGradient id="areaGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stop-color="${escapeHtml(color)}" stop-opacity="0.2"/>
              <stop offset="100%" stop-color="${escapeHtml(color)}" stop-opacity="0"/>
            </linearGradient>
          </defs>
          <polygon points="${areaPoints}" fill="url(#areaGrad)"/>
          <polyline points="${polyline}" fill="none" stroke="${escapeHtml(color)}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>
          ${circles}
          <line x1="${padding.left}" y1="${padding.top}" x2="${padding.left}" y2="${padding.top + chartH}" stroke="#cbd5e1" stroke-width="1"/>
          <line x1="${padding.left}" y1="${padding.top + chartH}" x2="${padding.left + chartW}" y2="${padding.top + chartH}" stroke="#cbd5e1" stroke-width="1"/>
        </svg>
      </div>`;
    }

    return `<section class="${classes}" dir="${dir}">${chartHtml}</section>`;
  }
}
