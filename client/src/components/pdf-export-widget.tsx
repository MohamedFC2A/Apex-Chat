import { useMemo, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { FileDown, FileText, Loader2 } from "lucide-react";
import type { PDFDocument, PDFPageSize, PDFDocumentTheme } from "@shared/pdf";
import { estimatePdfPageCount, tryParseAnyPdfFromText } from "@shared/pdf";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useChatStore } from "@/lib/store";
import { cn } from "@/lib/utils";

interface PdfParseResult {
  document: PDFDocument | null;
  error: string | null;
}

function parsePdfDocument(rawText: string): PdfParseResult {
  try {
    const payload = tryParseAnyPdfFromText(rawText);
    if (!payload) {
      throw new Error("Invalid PDF document payload");
    }

    return {
      document: payload,
      error: null,
    };
  } catch (error) {
    return {
      document: null,
      error: error instanceof Error ? error.message : "Invalid PDF payload",
    };
  }
}

function getLanguageLabel(language: PDFDocument["language"]): string {
  switch (language) {
    case "ar":
      return "AR";
    case "en":
      return "EN";
    default:
      return "Mixed";
  }
}

async function downloadPdfBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

function escapeHtml(text?: string): string {
  if (!text) return "";
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function generateClientSidePrintHtml(doc: PDFDocument): string {
  const isDark = doc.theme === "dark";
  const bodyDirection = doc.language === "ar" ? "rtl" : "ltr";
  const isRtl = doc.language !== "en";

  const css = `
    :root {
      --page-bg: ${isDark ? "#0a0a0c" : "#fafafa"};
      --page-surface: ${isDark ? "#111217" : "#ffffff"};
      --text-main: ${isDark ? "#ebeef5" : "#172033"};
      --text-soft: ${isDark ? "#9aa4b2" : "#526074"};
      --text-muted: ${isDark ? "#6b7280" : "#9ca3af"};
      --border-soft: ${isDark ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.06)"};
      --border-medium: ${isDark ? "rgba(255,255,255,0.12)" : "rgba(15,23,42,0.12)"};
      --accent: #8b5cf6;
      --code-bg: ${isDark ? "#050506" : "#f1f5f9"};
      --success: #10b981;
      --danger: #ef4444;
      --warning: #f59e0b;
      --info: #06b6d4;
    }
    * { box-sizing: border-box; }
    body {
      background: var(--page-bg);
      color: var(--text-main);
      font-family: 'Cairo', 'Inter', sans-serif;
      font-size: 14px;
      line-height: 1.85;
      margin: 0;
      padding: 40px 28px;
    }
    .cover-page {
      min-height: 85vh;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      text-align: center;
      border: 1px solid var(--border-soft);
      border-radius: 28px;
      padding: 50px 40px;
      margin-bottom: 40px;
      page-break-after: always;
      break-after: page;
      background: var(--page-surface);
      box-shadow: 0 10px 30px rgba(0,0,0,0.05);
    }
    .cover-page h1 { font-size: 2.5em; font-weight: 800; margin: 20px 0; color: var(--text-main); line-height: 1.3; }
    .cover-subtitle { font-size: 1.25em; color: var(--text-soft); margin-bottom: 30px; }
    .cover-meta { font-size: 0.9em; color: var(--text-soft); border-top: 1px solid var(--border-soft); padding-top: 20px; width: 100%; max-width: 400px; display: flex; justify-content: space-around; }
    .pdf-section { margin-bottom: 28px; }
    h1, h2, h3, h4 { color: var(--text-main); font-weight: 700; margin-top: 0; }
    h1 { font-size: 1.8em; border-bottom: 2px solid var(--accent); padding-bottom: 8px; margin-top: 30px; }
    h2 { font-size: 1.5em; margin-top: 24px; }
    h3 { font-size: 1.25em; }
    p { text-align: justify; color: var(--text-main); }
    .table-wrap { width: 100%; overflow-x: auto; margin: 20px 0; }
    table { width: 100%; border-collapse: collapse; background: var(--page-surface); border: 1px solid var(--border-soft); border-radius: 12px; }
    th, td { padding: 12px; border: 1px solid var(--border-soft); text-align: inherit; }
    th { background: var(--accent); color: white; font-weight: 600; }
    code { font-family: 'Courier New', Courier, monospace; background: var(--code-bg); padding: 2px 6px; border-radius: 6px; font-size: 0.9em; }
    pre { background: var(--code-bg); padding: 16px; border-radius: 12px; overflow-x: auto; border: 1px solid var(--border-soft); margin: 20px 0; }
    .callout { padding: 16px; border-radius: 12px; border-inline-start: 4px solid var(--accent); background: var(--page-surface); margin: 20px 0; border: 1px solid var(--border-soft); border-inline-start-width: 4px; }
    .qa-block { background: var(--page-surface); padding: 16px; border-radius: 12px; margin-bottom: 16px; border: 1px solid var(--border-soft); }
    .qa-question-row { font-weight: 700; color: var(--accent); margin-bottom: 8px; display: flex; gap: 8px; }
    .qa-answer-row { display: flex; gap: 8px; }
    .qa-badge { font-weight: 800; background: var(--accent); color: white; padding: 2px 6px; border-radius: 4px; font-size: 0.85em; }
    blockquote { font-style: italic; border-inline-start: 4px solid var(--border-soft); padding-inline-start: 16px; margin: 20px 0; color: var(--text-soft); }
    
    /* ── Advanced styles ── */
    .stat-cards-title { font-size: 15px; font-weight: 700; margin-bottom: 14px; }
    .stat-cards-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(145px, 1fr)); gap: 14px; margin-bottom: 20px; }
    .stat-card {
      background: ${isDark ? "rgba(255,255,255,0.02)" : "var(--page-surface)"};
      border: 1px solid var(--border-medium);
      border-radius: 12px;
      padding: 20px 16px;
      text-align: center;
      break-inside: avoid;
      box-shadow: ${isDark ? "0 4px 20px rgba(0,0,0,0.25)" : "0 4px 12px rgba(0,0,0,0.02)"};
    }
    .stat-card-value { font-size: 28px; font-weight: 800; line-height: 1; margin-bottom: 6px; }
    .stat-unit { font-size: 12px; font-weight: 400; color: var(--text-muted); margin-inline-start: 3px; }
    .stat-card-label { font-size: 11px; color: var(--text-soft); text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 6px; }
    .stat-card-trend { font-size: 11px; color: var(--text-muted); display: flex; align-items: center; justify-content: center; gap: 4px; }
    .trend-up { color: var(--success); font-weight: bold; }
    .trend-down { color: var(--danger); font-weight: bold; }
    .trend-flat { color: var(--warning); font-weight: bold; }

    .timeline-heading { font-size: 15px; font-weight: 700; margin-bottom: 16px; }
    .timeline-wrapper { position: relative; padding-inline-start: 20px; margin-bottom: 20px; border-inline-start: 2px solid var(--border-medium); }
    [dir="rtl"] .timeline-wrapper { padding-inline-start: 0; padding-inline-end: 20px; border-inline-start: none; border-inline-end: 2px solid var(--border-medium); }
    .timeline-item { display: flex; gap: 0; margin-bottom: 24px; position: relative; }
    .timeline-dot { position: absolute; inset-inline-start: -30px; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 3px solid; background: var(--page-surface); z-index: 1; flex-shrink: 0; }
    [dir="rtl"] .timeline-dot { inset-inline-start: auto; inset-inline-end: -30px; }
    .timeline-num { font-size: 10px; font-weight: 800; }
    .timeline-content { padding-inline-start: 16px; flex: 1; }
    [dir="rtl"] .timeline-content { padding-inline-start: 0; padding-inline-end: 16px; }
    .timeline-date { font-size: 11px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; margin-bottom: 4px; }
    .timeline-title { font-size: 14px; font-weight: 700; color: var(--text-main); margin-bottom: 4px; }
    .timeline-desc { font-size: 13px; color: var(--text-soft); line-height: 1.65; }

    .two-col-section-title { font-size: 15px; font-weight: 700; margin-bottom: 14px; }
    .two-column-grid { display: grid; grid-template-columns: 1fr 1px 1fr; gap: 0 20px; margin-bottom: 20px; border: 1px solid var(--border-medium); border-radius: 12px; overflow: hidden; background: var(--page-surface); }
    .two-col-panel { padding: 18px 20px; }
    .two-col-divider { background: var(--border-medium); width: 1px; }
    .two-col-heading { font-size: 13px; font-weight: 700; color: var(--accent); text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 10px; padding-bottom: 6px; border-bottom: 1px solid var(--border-soft); }
    .two-col-content { font-size: 13px; line-height: 1.75; }

    .chart-wrapper { margin-bottom: 24px; break-inside: avoid; text-align: center; }
    .chart-title { font-size: 14px; font-weight: 700; margin-bottom: 12px; }

    .highlight-box { display: flex; gap: 14px; align-items: flex-start; padding: 16px 20px; border-radius: 12px; margin: 16px 0 24px; break-inside: avoid; }
    .highlight-box-icon { font-size: 22px; flex-shrink: 0; }
    .highlight-box-content { font-size: 13.5px; line-height: 1.78; font-weight: 600; flex: 1; }

    .numbered-list-title { font-size: 15px; font-weight: 700; margin-bottom: 14px; }
    .numbered-list { display: grid; gap: 14px; margin-bottom: 20px; }
    .numbered-item { display: flex; gap: 16px; align-items: flex-start; break-inside: avoid; }
    .numbered-badge { min-width: 32px; height: 32px; background: var(--accent); color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 850; flex-shrink: 0; }
    .numbered-content { flex: 1; }
    .numbered-title { font-size: 14px; font-weight: 700; color: var(--text-main); margin-bottom: 4px; }
    .numbered-desc { font-size: 13px; color: var(--text-soft); line-height: 1.7; }

    .badge-section-label { font-size: 13px; color: var(--text-soft); margin-bottom: 10px; }
    .badge-group { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 20px; }
    .badge-pill { display: inline-flex; align-items: center; padding: 5px 12px; border-radius: 999px; font-size: 12px; }

    .mcq-question-block { background: var(--page-surface); border: 1px solid var(--border-medium); border-radius: 12px; padding: 18px; margin-bottom: 20px; break-inside: avoid; }
    .mcq-q-header { display: flex; gap: 10px; align-items: flex-start; margin-bottom: 14px; }
    .mcq-q-num { background: var(--accent); color: white; border-radius: 6px; padding: 2px 8px; font-size: 12px; font-weight: 800; }
    .mcq-q-text { font-size: 14px; font-weight: 700; color: var(--text-main); }
    .mcq-options-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 12px; }
    @media (max-width: 500px) { .mcq-options-grid { grid-template-columns: 1fr; } }
    .mcq-option-card { display: flex; align-items: center; gap: 8px; padding: 10px 14px; border-radius: 8px; border: 1px solid var(--border-soft); font-size: 13px; }
    .mcq-option-card.correct { background: rgba(16,185,129,0.08); border-color: var(--success); color: var(--success); font-weight: bold; }
    .mcq-option-letter { font-weight: 800; color: var(--accent); }
    .mcq-explanation { font-size: 12px; color: var(--text-soft); border-top: 1px solid var(--border-soft); padding-top: 8px; margin-top: 8px; }

    @media print {
      body { background: white; color: black; padding: 0; }
      .cover-page { border: none; min-height: 100%; box-shadow: none; }
    }
  `;

  let bodyContent = "";

  if (doc.coverPage) {
    bodyContent += `
      <div class="cover-page">
        <h1>${escapeHtml(doc.title)}</h1>
        ${doc.subtitle ? `<p class="cover-subtitle">${escapeHtml(doc.subtitle)}</p>` : ""}
        <div class="cover-meta">
          ${doc.author ? `<span>${escapeHtml(doc.author)}</span>` : ""}
          ${doc.date ? `<span>${escapeHtml(doc.date)}</span>` : ""}
          <span>${doc.pageSize.toUpperCase()}</span>
        </div>
      </div>
    `;
  }

  doc.sections.forEach((section) => {
    const sectionDir = section.direction || (doc.language === "ar" ? "rtl" : "ltr");
    bodyContent += `<div class="pdf-section" dir="${sectionDir}">`;

    switch (section.type) {
      case "heading": {
        const lvl = section.level || 2;
        bodyContent += `<h${lvl}>${escapeHtml(section.content)}</h${lvl}>`;
        break;
      }
      case "paragraph":
        bodyContent += `<p>${escapeHtml(section.content)}</p>`;
        break;
      case "code":
        bodyContent += `<pre><code>${escapeHtml(section.content)}</code></pre>`;
        break;
      case "math":
        bodyContent += `<div class="math-block">$$${escapeHtml(section.content)}$$</div>`;
        break;
      case "table": {
        const headers = section.headers || [];
        const rows = section.rows || [];
        const thead = headers.length ? `<thead><tr>${headers.map(h => `<th>${escapeHtml(h)}</th>`).join("")}</tr></thead>` : "";
        const tbody = `<tbody>${rows.map(r => `<tr>${r.map(c => `<td>${escapeHtml(c)}</td>`).join("")}</tr>`).join("")}</tbody>`;
        bodyContent += `<div class="table-wrap"><table>${thead}${tbody}</table></div>`;
        break;
      }
      case "list": {
        const items = section.items || [];
        bodyContent += `<ul>${items.map(it => `<li>${escapeHtml(it)}</li>`).join("")}</ul>`;
        break;
      }
      case "quote":
        bodyContent += `<blockquote>${escapeHtml(section.content)}</blockquote>`;
        break;
      case "callout":
        bodyContent += `<div class="callout"><div>${escapeHtml(section.content)}</div></div>`;
        break;
      case "qa": {
        const qBadge = isRtl ? "س" : "Q";
        const aBadge = isRtl ? "ج" : "A";
        bodyContent += `
          <div class="qa-block">
            <div class="qa-question-row"><span class="qa-badge">${qBadge}</span> <span>${escapeHtml(section.question)}</span></div>
            <div class="qa-answer-row"><span class="qa-badge" style="background:#06b6d4;">${aBadge}</span> <span>${escapeHtml(section.answer)}</span></div>
          </div>
        `;
        break;
      }
      case "stat-card": {
        const cards = section.cards || [];
        const trendIcon = (trend?: string) => {
          if (trend === "up") return '<span class="trend-up">▲</span>';
          if (trend === "down") return '<span class="trend-down">▼</span>';
          return '<span class="trend-flat">►</span>';
        };
        const cardHtml = cards.map((c) => {
          const color = c.color || "#8b5cf6";
          return `<div class="stat-card" style="border-top: 3px solid ${color}">
            <div class="stat-card-value" style="color: ${color}">${escapeHtml(c.value)}${c.unit ? `<span class="stat-unit">${escapeHtml(c.unit)}</span>` : ""}</div>
            <div class="stat-card-label">${escapeHtml(c.label)}</div>
            ${c.trend ? `<div class="stat-card-trend">${trendIcon(c.trend)}<span>${escapeHtml(c.trendValue)}</span></div>` : ""}
          </div>`;
        }).join("");

        bodyContent += `
          ${section.content ? `<div class="stat-cards-title">${escapeHtml(section.content)}</div>` : ""}
          <div class="stat-cards-grid">${cardHtml}</div>
        `;
        break;
      }
      case "timeline": {
        const events = section.events || [];
        const eventsHtml = events.map((ev, idx) => {
          const color = ev.color || (idx % 2 === 0 ? "#8b5cf6" : "#06b6d4");
          return `<div class="timeline-item">
            <div class="timeline-dot" style="border-color: ${color}; color: ${color}">
              ${ev.icon ? escapeHtml(ev.icon) : `<span class="timeline-num">${idx + 1}</span>`}
            </div>
            <div class="timeline-content">
              <div class="timeline-date" style="color: ${color}">${escapeHtml(ev.date)}</div>
              <div class="timeline-title">${escapeHtml(ev.title)}</div>
              ${ev.description ? `<div class="timeline-desc">${escapeHtml(ev.description)}</div>` : ""}
            </div>
          </div>`;
        }).join("");

        bodyContent += `
          ${section.content ? `<div class="timeline-heading">${escapeHtml(section.content)}</div>` : ""}
          <div class="timeline-wrapper">${eventsHtml}</div>
        `;
        break;
      }
      case "two-column": {
        const cols = section.columns;
        if (cols) {
          bodyContent += `
            ${section.content ? `<div class="two-col-section-title">${escapeHtml(section.content)}</div>` : ""}
            <div class="two-column-grid">
              <div class="two-col-panel">
                ${cols.leftHeading ? `<h4 class="two-col-heading">${escapeHtml(cols.leftHeading)}</h4>` : ""}
                <div class="two-col-content">${escapeHtml(cols.left)}</div>
              </div>
              <div class="two-col-divider"></div>
              <div class="two-col-panel">
                ${cols.rightHeading ? `<h4 class="two-col-heading">${escapeHtml(cols.rightHeading)}</h4>` : ""}
                <div class="two-col-content">${escapeHtml(cols.right)}</div>
              </div>
            </div>
          `;
        }
        break;
      }
      case "highlight-box": {
        const color = section.boxColor || "#8b5cf6";
        const icon = section.boxIcon || "💡";
        bodyContent += `<div class="highlight-box" style="border-left: 4px solid ${color}; background: ${color}0d;">
          <div class="highlight-box-icon" style="color: ${color}">${escapeHtml(icon)}</div>
          <div class="highlight-box-content">${escapeHtml(section.content)}</div>
        </div>`;
        break;
      }
      case "numbered-list": {
        const items = section.numberedItems || [];
        bodyContent += `
          ${section.content ? `<div class="numbered-list-title">${escapeHtml(section.content)}</div>` : ""}
          <div class="numbered-list">
            ${items.map(it => `<div class="numbered-item">
              <div class="numbered-badge">${escapeHtml(it.number)}</div>
              <div class="numbered-content">
                <div class="numbered-title">${escapeHtml(it.title)}</div>
                ${it.description ? `<div class="numbered-desc">${escapeHtml(it.description)}</div>` : ""}
              </div>
            </div>`).join("")}
          </div>
        `;
        break;
      }
      case "badge": {
        const badges = section.badges || [];
        const badgeColorMap: Record<string, string> = {
          primary: "#8b5cf6", secondary: "#64748b", success: "#10b981",
          error: "#ef4444", warning: "#f59e0b", info: "#06b6d4",
        };
        const badgeHtml = badges.map(b => {
          const color = badgeColorMap[b.variant || "primary"] || "#8b5cf6";
          return `<span class="badge-pill" style="background: ${color}18; color: ${color}; border: 1px solid ${color}44">${escapeHtml(b.text)}</span>`;
        }).join("");

        bodyContent += `
          ${section.content ? `<div class="badge-section-label">${escapeHtml(section.content)}</div>` : ""}
          <div class="badge-group">${badgeHtml}</div>
        `;
        break;
      }
      case "mcq-question": {
        const q = section.mcqQuestion;
        if (q) {
          const showAnswer = section.showAnswer === true;
          const optionLabels = isRtl ? ["أ", "ب", "ج", "د"] : ["A", "B", "C", "D"];
          const optionKeys: Array<"a" | "b" | "c" | "d"> = ["a", "b", "c", "d"];
          const correctLetter = q.correctAnswer || "a";

          const optionsHtml = optionKeys.map((key, i) => {
            const isCorrect = showAnswer && correctLetter === key;
            return `<div class="mcq-option-card ${isCorrect ? "correct" : ""}">
              <span class="mcq-option-letter">${optionLabels[i]}</span>
              <span>${escapeHtml(q.options[key])}</span>
            </div>`;
          }).join("");

          bodyContent += `
            <div class="mcq-question-block">
              <div class="mcq-q-header">
                ${q.questionNumber ? `<span class="mcq-q-num">${q.questionNumber}</span>` : ""}
                <span class="mcq-q-text">${escapeHtml(q.questionText)}</span>
              </div>
              <div class="mcq-options-grid">${optionsHtml}</div>
              ${showAnswer && q.explanation ? `<div class="mcq-explanation"><strong>${isRtl ? "الشرح:" : "Explanation:"}</strong> ${escapeHtml(q.explanation)}</div>` : ""}
            </div>
          `;
        }
        break;
      }
      default:
        bodyContent += `<p>${escapeHtml(section.content)}</p>`;
    }
    bodyContent += `</div>`;
  });

  return `
    <!DOCTYPE html>
    <html lang="${doc.language}" dir="${bodyDirection}">
      <head>
        <meta charset="UTF-8" />
        <title>${escapeHtml(doc.title)}</title>
        <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;700&family=Inter:wght@400;700&display=swap" rel="stylesheet">
        <style>${css}</style>
      </head>
      <body>
        ${bodyContent}
      </body>
    </html>
  `;
}

export function PDFExportWidget({ jsonText, intentVerified }: { jsonText: string; intentVerified?: boolean }) {
  const parsed = useMemo(() => parsePdfDocument(jsonText), [jsonText]);
  const [documentState, setDocumentState] = useState<PDFDocument | null>(parsed.document);
  const [theme] = useState<"dark" | "light">(parsed.document?.theme === "light" ? "light" : "dark");
  const [pageSize] = useState<PDFPageSize>(parsed.document?.pageSize || "a4");
  const [includeCoverPage] = useState<boolean>(parsed.document?.coverPage ?? true);
  const [includeToc] = useState<boolean>(parsed.document?.tableOfContents ?? true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [, setProgress] = useState(0);
  const { toast } = useToast();

  // Sync state if jsonText prop changes from parent (e.g. streaming finished)
  useEffect(() => {
    if (parsed.document) {
      setDocumentState(parsed.document);
    }
  }, [parsed.document]);

  const [hasAutoDownloaded, setHasAutoDownloaded] = useState(false);

  // Auto-download PDF once generated and ready
  // IMPORTANT: This useEffect must be BEFORE any conditional return to obey React Rules of Hooks
  useEffect(() => {
    // Guard: do not auto-download if intent not confirmed
    if (!intentVerified) return;
    const doc = parsed.document;
    if (doc && !hasAutoDownloaded) {
      setHasAutoDownloaded(true);

      const autoTheme = doc.theme === "light" ? "light" : "dark";
      const autoPageSize = doc.pageSize || "a4";
      const autoCoverPage = doc.coverPage ?? true;
      const autoToc = doc.tableOfContents ?? true;

      const autoGenerate = async () => {
        setIsGenerating(true);
        setProgress(12);
        setTimeout(() => {
          useChatStore.getState().setActivePdfProgress({ current: 12, total: 100 });
        }, 0);
        const timer = window.setInterval(() => {
          setProgress((value) => {
            const nextVal = value >= 91 ? value : value + Math.floor(Math.random() * 14) + 3;
            setTimeout(() => {
              useChatStore.getState().setActivePdfProgress({ current: nextVal, total: 100 });
            }, 0);
            return nextVal;
          });
        }, 220);

        try {
          const payload = {
            exportType: "structured",
            document: {
              ...doc,
              theme: autoTheme,
              pageSize: autoPageSize,
              coverPage: autoCoverPage,
              tableOfContents: autoToc,
            },
            options: {
              theme: autoTheme,
              pageSize: autoPageSize,
            },
          };

          const response = await fetch("/api/pdf/generate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });

          if (!response.ok) {
            const error = await response.json().catch(() => null);
            throw new Error(error?.message || `PDF export failed with status ${response.status}`);
          }

          const { jobId } = await response.json();
          const eventSource = new EventSource(`/api/pdf-progress/${jobId}`);

          eventSource.onmessage = async (event) => {
            if (event.data === "[DONE]") {
              eventSource.close();
              return;
            }

            try {
              const data = JSON.parse(event.data);
              setProgress(data.progress);
              useChatStore.getState().setActivePdfProgress({ current: data.progress, total: 100 });

              if (data.stage === "complete") {
                eventSource.close();
                const downloadRes = await fetch(`/api/pdf/download/${jobId}`);
                if (!downloadRes.ok) throw new Error("Failed to download PDF buffer");
                const blob = await downloadRes.blob();
                const filename = `${doc.title.replace(/[<>:"/\\|?*\u0000-\u001F]/g, "").trim() || "apex-document"}.pdf`;
                await downloadPdfBlob(blob, filename);
                toast({
                  title: doc.language !== "en" ? "تم إنشاء وتنزيل ملف PDF تلقائياً" : "PDF generated and downloaded automatically",
                  description: doc.language !== "en" ? "تم تنزيل المستند بنجاح." : "The file was downloaded successfully.",
                });
                setIsGenerating(false);
                setProgress(0);
                useChatStore.getState().setActivePdfProgress(null);
              } else if (data.stage === "error") {
                eventSource.close();
                setIsGenerating(false);
                setProgress(0);
                useChatStore.getState().setActivePdfProgress(null);
                toast({
                  title: doc.language !== "en" ? "فشل إنشاء PDF تلقائي" : "Auto PDF generation failed",
                  description: data.error || "Unknown error",
                  variant: "destructive",
                });
              }
            } catch (err) {
              console.error("SSE parse error:", err);
            }
          };

          eventSource.onerror = () => {
            eventSource.close();
            // Fallback: traditional POST download
            (async () => {
              const directResponse = await fetch("/api/export/pdf", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
              });
              if (!directResponse.ok) throw new Error("Fallback PDF generation failed");
              const blob = await directResponse.blob();
              const filename = `${doc.title.replace(/[<>:"/\\|?*\u0000-\u001F]/g, "").trim() || "apex-document"}.pdf`;
              await downloadPdfBlob(blob, filename);
              setIsGenerating(false);
              setProgress(0);
              useChatStore.getState().setActivePdfProgress(null);
            })().catch(console.error);
          };
        } catch (error) {
          toast({
            title: doc.language !== "en" ? "فشل إنشاء PDF تلقائي" : "Auto PDF generation failed",
            description: error instanceof Error ? error.message : "Unknown error",
            variant: "destructive",
          });
          setIsGenerating(false);
          setProgress(0);
          useChatStore.getState().setActivePdfProgress(null);
        }
      };

      autoGenerate();
    }
  }, [parsed.document, hasAutoDownloaded, intentVerified]);

  // ── Early return guards (after ALL hooks are declared) ──
  if (!intentVerified) {
    console.warn("Security Safeguard: PDF block blocked from rendering without user confirmation.");
    const fallbackText = parsed.document?.title || "PDF Document Content (Intent not verified)";
    return <p className="text-sm text-neutral-400 font-arabic" dir="auto">{fallbackText}</p>;
  }

  if (!documentState) {
    return (
      <div className="my-4 rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4 text-right font-arabic" dir="rtl">
        <p className="text-sm font-semibold text-rose-200">تعذر عرض مستند الـ PDF التفاعلي.</p>
        <p className="mt-1 text-sm text-zinc-300">صيغة `pdf-document` غير صالحة أو غير مكتملة.</p>
        {parsed.error && <pre className="mt-3 overflow-x-auto rounded-xl bg-black/20 p-3 text-left text-xs text-rose-100">{parsed.error}</pre>}
      </div>
    );
  }

  const document = documentState;
  const estimatedPages = estimatePdfPageCount({
    ...document,
    theme,
    pageSize,
    coverPage: includeCoverPage,
    tableOfContents: includeToc,
  });
  const isRtl = document.language !== "en";

  const handleGenerate = async () => {
    setIsGenerating(true);
    setProgress(5);
    setTimeout(() => {
      useChatStore.getState().setActivePdfProgress({ current: 5, total: 100 });
    }, 0);

    const payload = {
      exportType: "structured",
      document: {
        ...document,
        theme,
        pageSize,
        coverPage: includeCoverPage,
        tableOfContents: includeToc,
      },
      options: {
        theme,
        pageSize,
      },
    };

    try {
      const response = await fetch("/api/pdf/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => null);
        throw new Error(error?.message || `PDF export failed with status ${response.status}`);
      }

      const { jobId } = await response.json();
      const eventSource = new EventSource(`/api/pdf-progress/${jobId}`);

      eventSource.onmessage = async (event) => {
        if (event.data === "[DONE]") {
          eventSource.close();
          return;
        }

        try {
          const data = JSON.parse(event.data);
          setProgress(data.progress);
          useChatStore.getState().setActivePdfProgress({ current: data.progress, total: 100 });

          if (data.stage === "complete") {
            eventSource.close();
            const downloadRes = await fetch(`/api/pdf/download/${jobId}`);
            if (!downloadRes.ok) throw new Error("Failed to download PDF buffer");
            const blob = await downloadRes.blob();
            const filename = `${document.title.replace(/[<>:"/\\|?*\u0000-\u001F]/g, "").trim() || "apex-document"}.pdf`;
            await downloadPdfBlob(blob, filename);
            toast({
              title: isRtl ? "تم إنشاء ملف PDF" : "PDF generated",
              description: isRtl ? "تم تنزيل الملف بنجاح." : "The file was downloaded successfully.",
            });
            setIsGenerating(false);
            setProgress(0);
            useChatStore.getState().setActivePdfProgress(null);
          } else if (data.stage === "error") {
            eventSource.close();
            setIsGenerating(false);
            setProgress(0);
            useChatStore.getState().setActivePdfProgress(null);
            toast({
              title: isRtl ? "فشل إنشاء PDF" : "PDF generation failed",
              description: data.error || "Unknown error",
              variant: "destructive",
            });
          }
        } catch (err) {
          console.error("SSE message parse error:", err);
        }
      };

      eventSource.onerror = () => {
        eventSource.close();
        // Fallback: direct download POST
        (async () => {
          const directResponse = await fetch("/api/export/pdf", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          if (!directResponse.ok) throw new Error("Direct PDF download fallback failed");
          const blob = await directResponse.blob();
          const filename = `${document.title.replace(/[<>:"/\\|?*\u0000-\u001F]/g, "").trim() || "apex-document"}.pdf`;
          await downloadPdfBlob(blob, filename);
          toast({
            title: isRtl ? "تم إنشاء ملف PDF" : "PDF generated",
            description: isRtl ? "تم تنزيل الملف بنجاح." : "The file was downloaded successfully.",
          });
          setIsGenerating(false);
          setProgress(0);
          useChatStore.getState().setActivePdfProgress(null);
        })().catch((err) => {
          toast({
            title: isRtl ? "فشل إنشاء PDF" : "PDF generation failed",
            description: err instanceof Error ? err.message : "Unknown error",
            variant: "destructive",
          });
          setIsGenerating(false);
          setProgress(0);
          useChatStore.getState().setActivePdfProgress(null);
        });
      };
    } catch (error) {
      toast({
        title: isRtl ? "فشل إنشاء PDF" : "PDF generation failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
      setIsGenerating(false);
      setProgress(0);
      useChatStore.getState().setActivePdfProgress(null);
    }
  };

  return (
    <motion.div
      className="my-4 overflow-hidden rounded-3xl border border-zinc-800/80 dark:border-zinc-900/80 bg-gradient-to-br from-zinc-950/90 via-zinc-950/95 to-violet-950/10 shadow-lg"
      initial={{ opacity: 0, y: 8, scale: 0.985 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.28, ease: "easeOut" }}
      dir={isRtl ? "rtl" : "ltr"}
    >
      <div className="h-px bg-gradient-to-r from-transparent via-violet-500/30 to-transparent" />

      <div className="p-5 sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4 min-w-0">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-violet-500/20 bg-violet-500/10 text-violet-400">
              <FileText className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="truncate text-lg font-bold text-zinc-50">{document.title}</h3>
                <span className="rounded-full border border-violet-500/25 bg-violet-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-violet-300">
                  {getLanguageLabel(document.language)}
                </span>
              </div>
              {document.subtitle && <p className="mt-1 text-sm text-zinc-400">{document.subtitle}</p>}
              <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-zinc-400">
                <span className="rounded-full border border-zinc-800 bg-zinc-900/50 px-3 py-1 font-arabic">
                  {estimatedPages} {isRtl ? "صفحات تقريبًا" : "estimated pages"}
                </span>
                <span className="rounded-full border border-zinc-800 bg-zinc-900/50 px-3 py-1 font-arabic">
                  {document.sections.length} {isRtl ? "أقسام" : "sections"}
                </span>
                <span className="rounded-full border border-zinc-800 bg-zinc-900/50 px-3 py-1 font-mono">
                  {pageSize.toUpperCase()}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 items-center w-full sm:w-auto">
            <Button
              className="w-full sm:w-auto px-6 py-4.5 rounded-xl bg-violet-600 text-white font-bold text-sm shadow-[0_4px_15px_rgba(139,92,246,0.2)] hover:bg-violet-500 hover:shadow-[0_6px_25px_rgba(139,92,246,0.35)] active:scale-[0.98] transition-all duration-300 flex items-center justify-center gap-2 border border-violet-500/30 font-arabic"
              onClick={handleGenerate}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4.5 w-4.5 animate-spin" />
                  <span>{isRtl ? "جاري الحفظ والتنزيل..." : "Compiling & downloading..."}</span>
                </>
              ) : (
                <>
                  <FileDown className="h-4.5 w-4.5" />
                  <span>{isRtl ? "تنزيل المستند بصيغة PDF" : "Download PDF Document"}</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
