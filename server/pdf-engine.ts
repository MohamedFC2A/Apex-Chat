/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║          APEX AI — ULTRA-PROFESSIONAL PDF ENGINE v3.0                      ║
 * ║  Academic Research Style · 300 DPI · Offline Fonts · Smart Page-Break     ║
 * ║  New: stat-card · timeline · two-column · chart-svg · badge ·             ║
 * ║       highlight-box · numbered-list · watermark                            ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */

import type { Browser } from "puppeteer";
// Puppeteer imported dynamically in initBrowser to avoid Vercel crashes
import katex from "katex";
import Prism from "prismjs";
import "prismjs/components/prism-markup.js";
import "prismjs/components/prism-css.js";
import "prismjs/components/prism-clike.js";
import "prismjs/components/prism-javascript.js";
import "prismjs/components/prism-c.js";
import "prismjs/components/prism-cpp.js";
import "prismjs/components/prism-csharp.js";
import "prismjs/components/prism-go.js";
import "prismjs/components/prism-kotlin.js";
import "prismjs/components/prism-ruby.js";
import "prismjs/components/prism-swift.js";
import "prismjs/components/prism-python.js";
import "prismjs/components/prism-bash.js";
import "prismjs/components/prism-sql.js";
import "prismjs/components/prism-rust.js";
import "prismjs/components/prism-json.js";
import "prismjs/components/prism-typescript.js";
import "prismjs/components/prism-jsx.js";
import "prismjs/components/prism-tsx.js";
import type {
  PDFDocument,
  PDFDocumentTheme,
  PDFPageSize,
  PDFSection,
  ChartDataPoint,
  TimelineEvent,
  StatCardData,
} from "../shared/pdf";

// ─── Browser Pool ─────────────────────────────────────────────────────────────
let browserPromise: Promise<Browser> | null = null;

// ─── HTML Escape ──────────────────────────────────────────────────────────────
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// ─── Premium SVG Icons (replaces emojis) ──────────────────────────────────────
const PREMIUM_SVGS: Record<string, string> = {
  info: `<svg class="inline-svg-icon text-info-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`,
  warning: `<svg class="inline-svg-icon text-warning-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
  success: `<svg class="inline-svg-icon text-success-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`,
  error: `<svg class="inline-svg-icon text-error-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`,
  idea: `<svg class="inline-svg-icon text-idea-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A5 5 0 0 0 8 8c0 1 .3 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><line x1="9" y1="18" x2="15" y2="18"/><line x1="10" y1="22" x2="14" y2="22"/></svg>`,
  bolt: `<svg class="inline-svg-icon text-bolt-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`,
  brain: `<svg class="inline-svg-icon text-brain-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.44 2.5 2.5 0 0 1 0-3.12 3 3 0 0 1 0-4.88 2.5 2.5 0 0 1 0-3.12A2.5 2.5 0 0 1 9.5 2zM14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.44 2.5 2.5 0 0 0 0-3.12 3 3 0 0 0 0-4.88 2.5 2.5 0 0 0 0-3.12A2.5 2.5 0 0 0 14.5 2z"/></svg>`,
  rocket: `<svg class="inline-svg-icon text-rocket-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2l-7 20-4-9-9-4 20-7z"/><path d="M22 2L11 13"/></svg>`,
  bot: `<svg class="inline-svg-icon text-bot-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="10" rx="2"/><path d="M12 2v4"/><path d="M8 5h8"/><path d="M9 11v-3h6v3"/><circle cx="8" cy="15" r="1"/><circle cx="16" cy="15" r="1"/></svg>`,
  search: `<svg class="inline-svg-icon text-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`,
  calendar: `<svg class="inline-svg-icon text-date-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`,
  key: `<svg class="inline-svg-icon text-key-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>`,
  target: `<svg class="inline-svg-icon text-target-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>`,
  trendup: `<svg class="inline-svg-icon text-trendup-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>`,
  trenddown: `<svg class="inline-svg-icon text-trenddown-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/></svg>`,
  note: `<svg class="inline-svg-icon text-note-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>`,
  computer: `<svg class="inline-svg-icon text-computer-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>`,
  lock: `<svg class="inline-svg-icon text-lock-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`,
  users: `<svg class="inline-svg-icon text-users-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
  star: `<svg class="inline-svg-icon text-star-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
  bell: `<svg class="inline-svg-icon text-bell-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>`,
  chat: `<svg class="inline-svg-icon text-chat-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`,
  folder: `<svg class="inline-svg-icon text-folder-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>`,
  gear: `<svg class="inline-svg-icon text-gear-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`,
  chart: `<svg class="inline-svg-icon text-chart-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>`,
  trophy: `<svg class="inline-svg-icon text-trophy-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.45 1-1 1H4v2h16v-2h-5c-.55 0-1-.45-1-1v-2.34"/><path d="M12 2a7 7 0 0 1 7 7c0 4.5-3.5 7-7 7s-7-2.5-7-7a7 7 0 0 1 7-7z"/></svg>`,
  book: `<svg class="inline-svg-icon text-book-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>`,
  clock: `<svg class="inline-svg-icon text-clock-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
  palette: `<svg class="inline-svg-icon text-palette-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 14.7255 3.09032 17.1962 4.85857 19C4.94902 19.0913 5 19.222 5 19.3564V20C5 21.1046 5.89543 22 7 22H12Z"/><circle cx="7.5" cy="10.5" r="1.5"/><circle cx="11.5" cy="7.5" r="1.5"/><circle cx="16.5" cy="9.5" r="1.5"/><circle cx="15.5" cy="14.5" r="1.5"/></svg>`,
};

const EMOJI_TO_KEY: Record<string, string> = {
  "💡": "idea",
  "⚡": "bolt",
  "🧠": "brain",
  "🚀": "rocket",
  "🤖": "bot",
  "⚠️": "warning",
  "ℹ️": "info",
  "ℹ": "info",
  "🔹": "info",
  "🔷": "info",
  "✅": "success",
  "✔️": "success",
  "✔": "success",
  "❌": "error",
  "❎": "error",
  "🔍": "search",
  "🔎": "search",
  "📅": "calendar",
  "📆": "calendar",
  "🔑": "key",
  "🎯": "target",
  "📈": "trendup",
  "📉": "trenddown",
  "📝": "note",
  "📄": "note",
  "📃": "note",
  "🗒️": "note",
  "🗒": "note",
  "💻": "computer",
  "🖥️": "computer",
  "🖥": "computer",
  "🔒": "lock",
  "🔓": "lock",
  "👥": "users",
  "👤": "users",
  "🧑‍🤝‍🧑": "users",
  "⭐": "star",
  "🌟": "star",
  "✨": "star",
  "🔔": "bell",
  "💬": "chat",
  "💭": "chat",
  "✉️": "chat",
  "✉": "chat",
  "📁": "folder",
  "📂": "folder",
  "🔧": "gear",
  "⚙️": "gear",
  "⚙": "gear",
  "🛠️": "gear",
  "🛠": "gear",
  "📊": "chart",
  "🏆": "trophy",
  "🏅": "trophy",
  "🥇": "trophy",
  "📚": "book",
  "📖": "book",
  "⏰": "clock",
  "⏱️": "clock",
  "⏱": "clock",
  "⌚": "clock",
  "🎨": "palette",
};

function replaceEmojisWithSvgs(text: string): string {
  if (!text) return text;
  let processed = text;
  for (const [emoji, key] of Object.entries(EMOJI_TO_KEY)) {
    const escapedEmoji = emoji.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const regex = new RegExp(escapedEmoji, 'g');
    processed = processed.replace(regex, PREMIUM_SVGS[key] || "");
  }
  
  // Strip any remaining Unicode emojis robustly
  processed = processed.replace(/[\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF]/g, '');
  
  try {
    processed = processed.replace(new RegExp('\\p{Emoji_Presentation}', 'gu'), '');
    processed = processed.replace(new RegExp('\\p{Extended_Pictographic}', 'gu'), '');
  } catch (e) {
    // Fallback if environment doesn't support unicode property escapes
  }
  return processed;
}

// ─── Inline Markdown → HTML ───────────────────────────────────────────────────
function renderInline(text: string): string {
  let html = escapeHtml(text);

  // Inline LaTeX \(...\)
  html = html.replace(/\\\((.+?)\\\)/g, (match, latex) => {
    try {
      const decoded = latex
        .replace(/&amp;/g, "&").replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'");
      return katex.renderToString(decoded, { displayMode: false, throwOnError: false, output: "html" });
    } catch { return match; }
  });

  // Inline LaTeX $...$
  html = html.replace(/\$(.+?)\$/g, (match, latex) => {
    try {
      const decoded = latex
        .replace(/&amp;/g, "&").replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'");
      return katex.renderToString(decoded, { displayMode: false, throwOnError: false, output: "html" });
    } catch { return match; }
  });

  const rendered = html
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
    .replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/==(.+?)==/g, '<mark class="pdf-marker">$1</mark>')
    .replace(/~~(.+?)~~/g, "<del>$1</del>")
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\n/g, "<br />");

  return replaceEmojisWithSvgs(rendered);
}

// ─── Theme Resolver ───────────────────────────────────────────────────────────
function resolveTheme(_theme: PDFDocumentTheme): "dark" | "light" {
  return "light"; // Academic style uses light
}

// ─── Direction Resolver ───────────────────────────────────────────────────────
function resolveDirection(section: PDFSection, docLanguage?: string): "rtl" | "ltr" {
  if (section.direction === "rtl" || section.direction === "ltr") return section.direction;
  if (/[\u0600-\u06FF]/.test(section.content || "")) return "rtl";
  if (section.items?.some(item => /[\u0600-\u06FF]/.test(item || ""))) return "rtl";
  if (section.rows?.some(row => row?.some(cell => /[\u0600-\u06FF]/.test(cell || "")))) return "rtl";
  if (docLanguage === "ar") return "rtl";
  return "ltr";
}

// ─── PrismJS Language ─────────────────────────────────────────────────────────
function getPrismLanguage(language?: string): string {
  const normalized = (language || "text").toLowerCase();
  if (normalized === "ts") return "typescript";
  if (normalized === "js") return "javascript";
  if (normalized === "html") return "markup";
  if (normalized === "c++") return "cpp";
  if (normalized === "c#") return "csharp";
  return normalized;
}

// ─── Column Alignment ─────────────────────────────────────────────────────────
function getTableCellAlignClass(text: string): string {
  const trimmed = text.trim();
  if (/^[\d.,%$\u20AC\u00A3\u00A5\-+\(\)]+$/.test(trimmed)) return "align-center";
  if (/[\u0600-\u06FF]/.test(trimmed)) return "align-right";
  return "align-left";
}

// ─── Renderers ────────────────────────────────────────────────────────────────

function renderCodeBlock(code: string, language?: string): string {
  const prismLanguage = getPrismLanguage(language);
  const grammar = Prism.languages[prismLanguage] || Prism.languages.plain || Prism.languages.markup;
  const highlighted = prismLanguage && grammar ? Prism.highlight(code, grammar, prismLanguage) : escapeHtml(code);
  const lines = highlighted.split("\n");
  const content = lines.map((line: string) => `<span class="code-line">${line || "&nbsp;"}</span>`).join("\n");

  const langBadge = language && language !== "text"
    ? `<span class="code-lang-badge">${escapeHtml(language.toUpperCase())}</span>`
    : "";

  return `
    <div class="code-block-wrapper">
      <div class="code-block-header">
        <div class="code-dots">
          <span class="dot dot-red"></span>
          <span class="dot dot-yellow"></span>
          <span class="dot dot-green"></span>
        </div>
        ${langBadge}
      </div>
      <pre class="code-block language-${prismLanguage}"><code>${content}</code></pre>
    </div>`;
}

function renderMathBlock(latex: string): string {
  try {
    return `<div class="math-block">${katex.renderToString(latex, { displayMode: true, throwOnError: false, output: "html" })}</div>`;
  } catch {
    return `<div class="math-block math-fallback">${escapeHtml(latex)}</div>`;
  }
}

function renderTable(section: PDFSection): string {
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
      const alignClass = colAlignments[idx] || getTableCellAlignClass(cell);
      return `<td class="${alignClass}">${renderInline(cell)}</td>`;
    }).join("")}</tr>`;
  }).join("")}</tbody>`;

  return `<div class="table-wrap">
    <table>${thead}${tbody}</table>
    ${section.caption ? `<p class="table-caption">${renderInline(section.caption)}</p>` : ""}
  </div>`;
}

function resolveTextDirection(text: string, defaultDir: "rtl" | "ltr" = "ltr"): "rtl" | "ltr" {
  if (/[\u0600-\u06FF]/.test(text)) return "rtl";
  return defaultDir;
}

function renderList(section: PDFSection, defaultDir: "rtl" | "ltr"): string {
  const items = section.items || [];
  return `<ul class="pdf-list">${items.map((item) => {
    const itemDir = resolveTextDirection(item, defaultDir);
    const alignClass = itemDir !== defaultDir ? `dir-${itemDir}` : "";
    return `<li class="${alignClass}" dir="${itemDir}">${renderInline(item)}</li>`;
  }).join("")}</ul>`;
}

function renderQA(section: PDFSection, isRtl: boolean): string {
  const q = section.question || "";
  const a = section.answer || "";
  const qBadge = isRtl ? "س" : "Q";
  const aBadge = isRtl ? "ج" : "A";

  return `
    <div class="qa-block" dir="${isRtl ? "rtl" : "ltr"}">
      <div class="qa-question-row">
        <span class="qa-badge qa-badge-q">${qBadge}</span>
        <div class="qa-question-text">${renderInline(q)}</div>
      </div>
      <div class="qa-answer-row">
        <span class="qa-badge qa-badge-a">${aBadge}</span>
        <div class="qa-answer-text">${renderInline(a)}</div>
      </div>
    </div>`;
}

function renderCallout(section: PDFSection): string {
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
  return `<aside class="callout callout-${variant}">
    <span class="callout-icon">${icon}</span>
    <div class="callout-body">${renderInline(section.content)}</div>
  </aside>`;
}

function renderQuote(section: PDFSection): string {
  return `<blockquote class="pdf-quote">${renderInline(section.content)}</blockquote>`;
}

function renderImage(section: PDFSection): string {
  const src = section.content.trim();
  if (!src) return "";
  return `<figure class="pdf-figure">
    <img src="${escapeHtml(src)}" alt="${escapeHtml(section.caption || "image")}" />
    ${section.caption ? `<figcaption>${renderInline(section.caption)}</figcaption>` : ""}
  </figure>`;
}

// ─── NEW: Stat Cards ──────────────────────────────────────────────────────────
function renderStatCards(section: PDFSection): string {
  const cards = section.cards || [];
  if (!cards.length) return "";

  const trendIcon = (trend?: string) => {
    if (trend === "up") return '<span class="trend-up">▲</span>';
    if (trend === "down") return '<span class="trend-down">▼</span>';
    return '<span class="trend-flat">►</span>';
  };

  const cardHtml = cards.map((card: StatCardData) => {
    const color = card.color || "#8b5cf6";
    return `<div class="stat-card" style="border-top: 3px solid ${escapeHtml(color)}">
      <div class="stat-card-value" style="color: ${escapeHtml(color)}">${replaceEmojisWithSvgs(escapeHtml(card.value))}${card.unit ? `<span class="stat-unit">${replaceEmojisWithSvgs(escapeHtml(card.unit))}</span>` : ""}</div>
      <div class="stat-card-label">${replaceEmojisWithSvgs(escapeHtml(card.label))}</div>
      ${card.trend ? `<div class="stat-card-trend">${trendIcon(card.trend)}<span>${replaceEmojisWithSvgs(escapeHtml(card.trendValue || ""))}</span></div>` : ""}
    </div>`;
  }).join("");

  return `<div class="stat-cards-grid">${cardHtml}</div>`;
}

// ─── NEW: Timeline ────────────────────────────────────────────────────────────
function renderTimeline(section: PDFSection, isRtl: boolean): string {
  const events = section.events || [];
  if (!events.length) return "";

  const eventsHtml = events.map((event: TimelineEvent, idx: number) => {
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

  return `<div class="timeline-wrapper" dir="${isRtl ? "rtl" : "ltr"}">${eventsHtml}</div>`;
}

// ─── NEW: Two-Column Layout ───────────────────────────────────────────────────
function renderTwoColumn(section: PDFSection): string {
  const cols = section.columns;
  if (!cols) return "";

  return `<div class="two-column-grid">
    <div class="two-col-panel">
      ${cols.leftHeading ? `<h4 class="two-col-heading">${renderInline(cols.leftHeading)}</h4>` : ""}
      <div class="two-col-content">${renderInline(cols.left)}</div>
    </div>
    <div class="two-col-divider"></div>
    <div class="two-col-panel">
      ${cols.rightHeading ? `<h4 class="two-col-heading">${renderInline(cols.rightHeading)}</h4>` : ""}
      <div class="two-col-content">${renderInline(cols.right)}</div>
    </div>
  </div>`;
}

// ─── NEW: SVG Charts ──────────────────────────────────────────────────────────
function renderChartSvg(section: PDFSection): string {
  const data = section.chartData || [];
  const chartType = section.chartType || "bar";
  const title = section.chartTitle || section.content || "";
  const height = section.chartHeight || 260;
  const width = 620;
  const defaultColors = ["#8b5cf6", "#06b6d4", "#10b981", "#f59e0b", "#ef4444", "#ec4899", "#3b82f6", "#84cc16"];

  if (!data.length) return "";

  const maxVal = Math.max(...data.map((d: ChartDataPoint) => d.value), 1);

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

    return `<div class="chart-wrapper">
      ${title ? `<div class="chart-title">${escapeHtml(title)}</div>` : ""}
      <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" style="overflow:visible;max-width:100%">
        ${gridLines}
        ${bars}
        <line x1="${padding.left}" y1="${padding.top}" x2="${padding.left}" y2="${padding.top + chartH}" stroke="#cbd5e1" stroke-width="1.5"/>
        <line x1="${padding.left}" y1="${padding.top + chartH}" x2="${padding.left + chartW}" y2="${padding.top + chartH}" stroke="#cbd5e1" stroke-width="1.5"/>
      </svg>
    </div>`;
  }

  if (chartType === "pie" || chartType === "donut") {
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

    const slicesSvg = slices.map((s: { path: string; color: string; label: string; pct: number; value: number }) =>
      `<path d="${s.path}" fill="${escapeHtml(s.color)}" stroke="white" stroke-width="2" opacity="0.92"/>`)
      .join("");

    const legendX = cx * 2 + 20;
    const legendItems = slices.map((s: { path: string; color: string; label: string; pct: number; value: number }, i: number) =>
      `<g transform="translate(${legendX}, ${20 + i * 22})">
        <rect x="0" y="-9" width="12" height="12" rx="3" fill="${escapeHtml(s.color)}"/>
        <text x="18" y="0" font-size="11" fill="#374151">${escapeHtml(s.label.slice(0, 18))} — ${s.pct}%</text>
      </g>`).join("");

    const centerLabel = chartType === "donut"
      ? `<text x="${cx}" y="${cy - 6}" text-anchor="middle" font-size="22" font-weight="800" fill="#1e293b">${total}</text>
         <text x="${cx}" y="${cy + 14}" text-anchor="middle" font-size="10" fill="#64748b">Total</text>`
      : "";

    return `<div class="chart-wrapper">
      ${title ? `<div class="chart-title">${escapeHtml(title)}</div>` : ""}
      <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" style="max-width:100%;overflow:visible">
        ${slicesSvg}
        ${centerLabel}
        ${legendItems}
      </svg>
    </div>`;
  }

  if (chartType === "line") {
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

    const polyline = points.map((p: { x: number; y: number }) => `${p.x},${p.y}`).join(" ");
    const areaPoints = [
      `${points[0]?.x},${padding.top + chartH}`,
      ...points.map((p: { x: number; y: number }) => `${p.x},${p.y}`),
      `${points[points.length - 1]?.x},${padding.top + chartH}`,
    ].join(" ");

    const circles = points.map((p: { x: number; y: number; label: string; value: number }) =>
      `<circle cx="${p.x}" cy="${p.y}" r="5" fill="${escapeHtml(color)}" stroke="white" stroke-width="2"/>
       <text x="${p.x}" y="${p.y - 10}" text-anchor="middle" font-size="10" font-weight="700" fill="${escapeHtml(color)}">${p.value}</text>
       <text x="${p.x}" y="${padding.top + chartH + 16}" text-anchor="middle" font-size="9" fill="#64748b">${escapeHtml(p.label.slice(0, 10))}</text>`
    ).join("");

    return `<div class="chart-wrapper">
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

  return "";
}

// ─── NEW: Highlight Box ───────────────────────────────────────────────────────
function renderHighlightBox(section: PDFSection): string {
  const color = section.boxColor || "#8b5cf6";
  const icon = section.boxIcon || "💡";
  const iconHtml = replaceEmojisWithSvgs(escapeHtml(icon)) || PREMIUM_SVGS.idea;
  return `<div class="highlight-box" style="border-left: 4px solid ${escapeHtml(color)}; background: ${escapeHtml(color)}10;">
    <div class="highlight-box-icon" style="color: ${escapeHtml(color)}">${iconHtml}</div>
    <div class="highlight-box-content">${renderInline(section.content)}</div>
  </div>`;
}

// ─── NEW: Numbered List ───────────────────────────────────────────────────────
function renderNumberedList(section: PDFSection): string {
  const items = section.numberedItems || [];
  if (!items.length) return "";
  return `<div class="numbered-list">
    ${items.map(item => `<div class="numbered-item">
      <div class="numbered-badge">${replaceEmojisWithSvgs(escapeHtml(item.number))}</div>
      <div class="numbered-content">
        <div class="numbered-title">${renderInline(item.title)}</div>
        ${item.description ? `<div class="numbered-desc">${renderInline(item.description)}</div>` : ""}
      </div>
    </div>`).join("")}
  </div>`;
}

// ─── NEW: Badge Group ─────────────────────────────────────────────────────────
function renderBadgeGroup(section: PDFSection): string {
  const badges = section.badges || [];
  if (!badges.length) return "";
  const badgeColorMap: Record<string, string> = {
    primary: "#8b5cf6", secondary: "#64748b", success: "#10b981",
    error: "#ef4444", warning: "#f59e0b", info: "#06b6d4",
  };
  return `<div class="badge-group">
    ${badges.map(b => {
      const color = badgeColorMap[b.variant || "primary"] || "#8b5cf6";
      return `<span class="badge-pill" style="background: ${color}18; color: ${color}; border: 1px solid ${color}44">${replaceEmojisWithSvgs(escapeHtml(b.text))}</span>`;
    }).join("")}
  </div>`;
}

// ─── NEW: Watermark (inline CSS via @page) ────────────────────────────────────
function renderWatermark(section: PDFSection): string {
  // Watermarks are applied via the body's ::before pseudo-element in CSS
  return `<!-- watermark: ${escapeHtml(section.watermarkText || section.content || "DRAFT")} -->`;
}

// ─── NEW: MCQ Question (Exam / Quiz style) ────────────────────────────────────
function renderMCQQuestion(section: PDFSection, isRtl: boolean): string {
  const q = section.mcqQuestion;
  if (!q) return "";

  const showAnswer = section.showAnswer === true;
  const optionLabels = isRtl ? ["أ", "ب", "ج", "د"] : ["A", "B", "C", "D"];
  const optionKeys: Array<"a" | "b" | "c" | "d"> = ["a", "b", "c", "d"];
  const correctLabel = isRtl
    ? { a: "أ", b: "ب", c: "ج", d: "د" }[q.correctAnswer || "a"]
    : (q.correctAnswer || "").toUpperCase();
  const questionLabel = isRtl ? `السؤال ${q.questionNumber || ""}` : `Question ${q.questionNumber || ""}`;
  const pointsLabel = q.points ? (isRtl ? `${q.points} درجات` : `${q.points} pts`) : "";

  const options = optionKeys.map((key, idx) => {
    const text = q.options[key];
    const label = optionLabels[idx];
    const isCorrect = showAnswer && q.correctAnswer === key;
    const correctClass = isCorrect ? " mcq-opt-correct" : "";
    return `<div class="mcq-option${correctClass}" dir="${isRtl ? "rtl" : "ltr"}">
      <span class="mcq-opt-label${isCorrect ? " mcq-opt-label-correct" : ""}">${escapeHtml(label)}</span>
      <span class="mcq-opt-text">${renderInline(text)}</span>
      ${isCorrect ? `<span class="mcq-correct-badge">${isRtl ? "✓ صحيح" : "✓ Correct"}</span>` : ""}
    </div>`;
  }).join("");

  return `<div class="mcq-question-block" dir="${isRtl ? "rtl" : "ltr"}">
    <div class="mcq-question-header">
      <span class="mcq-question-num">${escapeHtml(questionLabel)}</span>
      ${pointsLabel ? `<span class="mcq-points-badge">${escapeHtml(pointsLabel)}</span>` : ""}
    </div>
    <div class="mcq-question-text">${renderInline(q.questionText)}</div>
    <div class="mcq-options">${options}</div>
    ${showAnswer && q.explanation ? `<div class="mcq-explanation" dir="${isRtl ? "rtl" : "ltr"}">
      <span class="mcq-explanation-label">${isRtl ? "الشرح:" : "Explanation:"}</span>
      ${renderInline(q.explanation)}
    </div>` : ""}
  </div>`;
}

// ─── NEW: Exam Header ─────────────────────────────────────────────────────────
function renderExamHeader(section: PDFSection, isRtl: boolean): string {
  const meta = section.examMeta;
  const title = section.content || (isRtl ? "ورقة الامتحان" : "Exam Paper");

  const metaFields = [
    meta?.subject && `<div class="exam-meta-row"><span>${isRtl ? "المادة:" : "Subject:"}</span><span class="exam-meta-val">${escapeHtml(meta.subject)}</span></div>`,
    meta?.grade && `<div class="exam-meta-row"><span>${isRtl ? "المرحلة:" : "Grade:"}</span><span class="exam-meta-val">${escapeHtml(meta.grade)}</span></div>`,
    meta?.duration && `<div class="exam-meta-row"><span>${isRtl ? "المدة الزمنية:" : "Duration:"}</span><span class="exam-meta-val">${escapeHtml(meta.duration)}</span></div>`,
    meta?.totalMarks && `<div class="exam-meta-row"><span>${isRtl ? "الدرجة الكلية:" : "Total Marks:"}</span><span class="exam-meta-val">${meta.totalMarks}</span></div>`,
  ].filter(Boolean).join("");

  const nameField = meta?.studentNameField ? `
    <div class="exam-field-row" dir="${isRtl ? "rtl" : "ltr"}">
      <span class="exam-field-label">${isRtl ? "اسم الطالب:" : "Student Name:"}</span>
      <span class="exam-field-line">___________________________________</span>
    </div>` : "";

  const dateField = meta?.dateField ? `
    <div class="exam-field-row" dir="${isRtl ? "rtl" : "ltr"}">
      <span class="exam-field-label">${isRtl ? "التاريخ:" : "Date:"}</span>
      <span class="exam-field-line">__________________</span>
    </div>` : "";

  const instructions = meta?.instructions?.length ? `
    <div class="exam-instructions" dir="${isRtl ? "rtl" : "ltr"}">
      <div class="exam-instructions-title">${isRtl ? "تعليمات الامتحان:" : "Exam Instructions:"}</div>
      <ol>${meta.instructions.map(i => `<li>${escapeHtml(i)}</li>`).join("")}</ol>
    </div>` : "";

  return `<div class="exam-header-block" dir="${isRtl ? "rtl" : "ltr"}">
    <div class="exam-header-top">
      <div class="exam-institution">APEX AI — Academic Assessment</div>
      <div class="exam-header-logo">📋</div>
    </div>
    <div class="exam-title">${escapeHtml(title)}</div>
    <div class="exam-meta-grid">${metaFields}</div>
    <div class="exam-fields-row">${nameField}${dateField}</div>
    ${instructions}
    <div class="exam-divider-thick"></div>
  </div>`;
}

// ─── NEW: Answer Key ──────────────────────────────────────────────────────────
function renderAnswerKey(section: PDFSection, isRtl: boolean): string {
  const title = section.content || (isRtl ? "مفتاح الإجابات" : "Answer Key");
  const rows = section.rows || [];
  const headers = section.headers || (isRtl ? ["رقم السؤال", "الإجابة", "الدرجة"] : ["Question #", "Answer", "Marks"]);

  const thead = `<thead><tr>${headers.map(h => `<th>${replaceEmojisWithSvgs(escapeHtml(h))}</th>`).join("")}</tr></thead>`;
  const tbody = `<tbody>${rows.map(row => `<tr>${row.map(cell => `<td>${replaceEmojisWithSvgs(escapeHtml(cell))}</td>`).join("")}</tr>`).join("")}</tbody>`;

  return `<div class="answer-key-block" dir="${isRtl ? "rtl" : "ltr"}">
    <div class="answer-key-header">
      <span class="answer-key-icon">${PREMIUM_SVGS.key}</span>
      <span class="answer-key-title">${replaceEmojisWithSvgs(escapeHtml(title))}</span>
    </div>
    <table class="answer-key-table">${thead}${tbody}</table>
  </div>`;
}

// ─── NEW: Flashcard ───────────────────────────────────────────────────────────
function renderFlashcards(section: PDFSection, isRtl: boolean): string {
  const cards = section.flashcards || [];
  if (!cards.length) return "";

  const colors = ["#8b5cf6", "#06b6d4", "#10b981", "#f59e0b", "#ef4444", "#ec4899", "#3b82f6", "#84cc16"];

  return `<div class="flashcards-grid" dir="${isRtl ? "rtl" : "ltr"}">
    ${cards.map((card, idx) => {
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
    }).join("")}
  </div>`;
}



// ─── Main Section Renderer ────────────────────────────────────────────────────
function renderSection(section: PDFSection, docLanguage?: string): string {
  const dir = resolveDirection(section, docLanguage);
  const classes = `pdf-section section-${section.type} dir-${dir}`;

  switch (section.type) {
    case "heading": {
      const level = Math.min(Math.max(section.level || 2, 1), 6);
      return `<section class="${classes}" dir="${dir}"><h${level}>${renderInline(section.content)}</h${level}></section>`;
    }
    case "paragraph":
      return `<section class="${classes}" dir="${dir}"><p>${renderInline(section.content)}</p></section>`;
    case "code":
      return `<section class="${classes}" dir="ltr">${renderCodeBlock(section.content, section.language)}</section>`;
    case "math":
      return `<section class="${classes}" dir="${dir}">${renderMathBlock(section.content)}</section>`;
    case "table":
      return `<section class="${classes}" dir="${dir}">${renderTable(section)}</section>`;
    case "list":
      return `<section class="${classes}" dir="${dir}">${renderList(section, dir)}</section>`;
    case "divider":
      return `<div class="section-divider" aria-hidden="true"></div>`;
    case "quote":
      return `<section class="${classes}" dir="${dir}">${renderQuote(section)}</section>`;
    case "callout":
      return `<section class="${classes}" dir="${dir}">${renderCallout(section)}</section>`;
    case "image":
      return `<section class="${classes}" dir="${dir}">${renderImage(section)}</section>`;
    case "qa":
      return `<section class="${classes}" dir="${dir}">${renderQA(section, dir === "rtl")}</section>`;
    case "stat-card":
      return `<section class="${classes}" dir="${dir}">
        ${section.content ? `<div class="stat-cards-title">${renderInline(section.content)}</div>` : ""}
        ${renderStatCards(section)}
      </section>`;
    case "timeline":
      return `<section class="${classes}" dir="${dir}">
        ${section.content ? `<div class="timeline-heading">${renderInline(section.content)}</div>` : ""}
        ${renderTimeline(section, dir === "rtl")}
      </section>`;
    case "two-column":
      return `<section class="${classes}" dir="${dir}">
        ${section.content ? `<div class="two-col-section-title">${renderInline(section.content)}</div>` : ""}
        ${renderTwoColumn(section)}
      </section>`;
    case "chart-svg":
      return `<section class="${classes}" dir="${dir}">${renderChartSvg(section)}</section>`;
    case "highlight-box":
      return `<section class="${classes}" dir="${dir}">${renderHighlightBox(section)}</section>`;
    case "numbered-list":
      return `<section class="${classes}" dir="${dir}">
        ${section.content ? `<div class="numbered-list-title">${renderInline(section.content)}</div>` : ""}
        ${renderNumberedList(section)}
      </section>`;
    case "badge":
      return `<section class="${classes}" dir="${dir}">
        ${section.content ? `<div class="badge-section-label">${renderInline(section.content)}</div>` : ""}
        ${renderBadgeGroup(section)}
      </section>`;
    case "watermark":
      return renderWatermark(section);
    case "mcq-question":
      return `<section class="${classes}" dir="${dir}">${renderMCQQuestion(section, dir === "rtl")}</section>`;
    case "exam-header":
      return `<section class="${classes} exam-header-section" dir="${dir}">${renderExamHeader(section, dir === "rtl")}</section>`;
    case "answer-key":
      return `<section class="${classes} answer-key-section" dir="${dir}">${renderAnswerKey(section, dir === "rtl")}</section>`;
    case "flashcard":
      return `<section class="${classes}" dir="${dir}">
        ${section.content ? `<div class="flashcards-section-title">${renderInline(section.content)}</div>` : ""}
        ${renderFlashcards(section, dir === "rtl")}
      </section>`;
    default:
      return `<section class="${classes}" dir="${dir}"><p>${renderInline(section.content)}</p></section>`;
  }
}

// ─── Cover Page (Academic Style) ───────────────────────────────────────────────
function renderCoverPage(doc: PDFDocument): string {
  const isRtl = doc.language === "ar";
  return `
    <section class="cover-page" dir="${isRtl ? "rtl" : "ltr"}">
      <div class="cover-inner">
        <div class="cover-header-bar">
          <div class="cover-institution">APEX AI RESEARCH INSTITUTE</div>
          <div class="cover-date">${doc.date || new Date().toISOString().slice(0, 10)}</div>
        </div>
        <div class="cover-main">
          <div class="cover-kicker">${isRtl ? "تقرير احترافي" : "PROFESSIONAL DOCUMENT"}</div>
          <h1>${renderInline(doc.title)}</h1>
          ${doc.subtitle ? `<p class="cover-subtitle">${renderInline(doc.subtitle)}</p>` : ""}
        </div>
        <div class="cover-divider-line"></div>
        <div class="cover-meta-row">
          ${doc.author ? `<div class="cover-meta-item"><span class="cover-meta-label">${isRtl ? "المؤلف" : "Author"}</span><span class="cover-meta-value">${renderInline(doc.author)}</span></div>` : ""}
          <div class="cover-meta-item"><span class="cover-meta-label">${isRtl ? "التاريخ" : "Date"}</span><span class="cover-meta-value">${doc.date || new Date().toISOString().slice(0, 10)}</span></div>
          <div class="cover-meta-item"><span class="cover-meta-label">${isRtl ? "التنسيق" : "Format"}</span><span class="cover-meta-value">${doc.pageSize.toUpperCase()}</span></div>
          <div class="cover-meta-item"><span class="cover-meta-label">${isRtl ? "اللغة" : "Language"}</span><span class="cover-meta-value">${doc.language.toUpperCase()}</span></div>
        </div>
        <div class="cover-footer-bar">
          <span class="cover-confidential">${isRtl ? "وثيقة رسمية — Apex AI" : "Official Document — Apex AI"}</span>
        </div>
      </div>
    </section>`;
}

// ─── Table of Contents ─────────────────────────────────────────────────────────
function renderTableOfContents(doc: PDFDocument): string {
  const headings = doc.sections.filter((section) => section.type === "heading");
  if (!headings.length) return "";
  const isRtl = doc.language === "ar";

  return `
    <section class="toc-page" dir="${isRtl ? "rtl" : "ltr"}">
      <div class="toc-header">
        <h2>${isRtl ? "فهرس المحتويات" : "Table of Contents"}</h2>
        <div class="toc-header-line"></div>
      </div>
      <ol class="toc-list">
        ${headings.map((section, index) => `
          <li class="toc-item level-${section.level || 2}">
            <span class="toc-num">${index + 1}</span>
            <span class="toc-title level-${section.level || 2}">${renderInline(section.content)}</span>
            <span class="toc-dot"></span>
            <span class="toc-page-number">${index + 2}</span>
          </li>`).join("")}
      </ol>
    </section>`;
}

// ─── Header/Footer Templates ───────────────────────────────────────────────────
function getHeaderTemplate(doc: PDFDocument): string {
  return `
    <div style="width:100%;font-size:8.5px;padding:6px 24px;color:#94a3b8;font-family:Georgia,serif;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #e2e8f0;box-sizing:border-box;">
      <span style="font-weight:700;letter-spacing:0.12em;color:#64748b;">APEX AI</span>
      <span style="font-style:italic;">${escapeHtml(doc.title)}</span>
    </div>`;
}

function getFooterTemplate(doc: PDFDocument): string {
  return `
    <div style="width:100%;font-size:8.5px;padding:6px 24px;color:#94a3b8;font-family:Georgia,serif;display:flex;justify-content:space-between;align-items:center;border-top:1px solid #e2e8f0;box-sizing:border-box;">
      <span>Generated by Apex AI — ${escapeHtml(doc.date || new Date().toISOString().slice(0, 10))}</span>
      <span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
    </div>`;
}

// ─── Embedded Fonts (Base64 fallback note) ─────────────────────────────────────
// Since we can't embed full base64 fonts here, we use system fonts + Google Fonts
// with a short timeout fallback to ensure offline safety.
const FONT_IMPORTS = `
  @import url('https://fonts.googleapis.com/css2?family=Georgia&display=swap');
  @font-face {
    font-family: 'Fallback-Serif';
    src: local('Georgia'), local('Times New Roman'), local('Times');
  }
  @font-face {
    font-family: 'Fallback-Sans';
    src: local('Arial'), local('Helvetica Neue'), local('Helvetica');
  }
  @font-face {
    font-family: 'Fallback-Mono';
    src: local('Courier New'), local('Courier');
  }
`;

// ─── Document Styles (Academic Research Style) ────────────────────────────────
function getDocumentStyles(_theme: "dark" | "light"): string {
  // Always use Academic light theme for maximum professionalism
  return `
    :root {
      --page-bg: #fefefe;
      --page-surface: #ffffff;
      --page-surface-soft: #f8fafc;
      --text-main: #1a1a2e;
      --text-soft: #475569;
      --text-muted: #94a3b8;
      --border-soft: rgba(15,23,42,0.10);
      --border-medium: rgba(15,23,42,0.16);
      --accent: #4f46e5;
      --accent-2: #0891b2;
      --accent-3: #7c3aed;
      --success: #059669;
      --warning: #d97706;
      --danger: #dc2626;
      --code-bg: #f1f5f9;
      --quote-bg: rgba(79,70,229,0.04);
      --table-head-bg: #1e293b;
      --table-head-text: #f1f5f9;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body {
      margin: 0; padding: 0;
      background: var(--page-bg);
    }
    body {
      color: var(--text-main);
      font-family: Georgia, 'Times New Roman', serif;
      font-size: 13.5px;
      line-height: 1.85;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    body[dir="rtl"],
    [dir="rtl"], [dir="rtl"] * {
      font-family: 'Amiri', 'Cairo', 'Traditional Arabic', 'Arial Unicode MS', serif !important;
    }

    /* ── Document Shell ── */
    .document-shell {
      padding: 22px 18px 32px;
    }
    .document-body {
      background: transparent;
    }

    /* ── Cover Page (Academic) ── */
    .cover-page {
      display: flex;
      flex-direction: column;
      justify-content: center;
      min-height: 96vh;
      page-break-after: always;
      break-after: page;
      padding: 24px 0;
    }
    .cover-inner {
      border: 2px solid #1e293b;
      border-radius: 4px;
      padding: 0;
      overflow: hidden;
    }
    .cover-header-bar {
      background: #1e293b;
      color: #f1f5f9;
      padding: 14px 32px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 11px;
      letter-spacing: 0.12em;
      font-family: Georgia, serif;
    }
    .cover-institution {
      font-weight: 700;
      letter-spacing: 0.14em;
    }
    .cover-date {
      opacity: 0.7;
    }
    .cover-main {
      padding: 52px 44px 32px;
    }
    .cover-kicker {
      display: inline-block;
      font-size: 10px;
      letter-spacing: 0.18em;
      font-weight: 700;
      color: var(--accent);
      text-transform: uppercase;
      margin-bottom: 20px;
      padding-bottom: 8px;
      border-bottom: 2px solid var(--accent);
    }
    .cover-page h1 {
      margin: 0 0 16px;
      font-size: 36px;
      line-height: 1.18;
      color: #1a1a2e;
      font-weight: 700;
      font-family: Georgia, serif;
    }
    .cover-subtitle {
      font-size: 16px;
      color: var(--text-soft);
      line-height: 1.6;
      font-style: italic;
    }
    .cover-divider-line {
      height: 2px;
      background: linear-gradient(90deg, var(--accent), var(--accent-2));
      margin: 0 44px;
    }
    .cover-meta-row {
      display: flex;
      flex-wrap: wrap;
      gap: 24px;
      padding: 20px 44px;
      background: #f8fafc;
    }
    .cover-meta-item {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .cover-meta-label {
      font-size: 9px;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: var(--text-muted);
      font-weight: 700;
    }
    .cover-meta-value {
      font-size: 13px;
      color: var(--text-main);
      font-weight: 600;
    }
    .cover-footer-bar {
      background: var(--accent);
      color: white;
      padding: 10px 32px;
      font-size: 10px;
      letter-spacing: 0.1em;
    }

    /* ── Table of Contents ── */
    .toc-page {
      display: flex;
      flex-direction: column;
      page-break-after: always;
      break-after: page;
      padding: 20px 0;
    }
    .toc-header {
      margin-bottom: 24px;
    }
    .toc-page h2 {
      font-size: 26px;
      color: var(--text-main);
      font-family: Georgia, serif;
      margin-bottom: 8px;
    }
    .toc-header-line {
      height: 2px;
      background: var(--accent);
      width: 64px;
      border-radius: 2px;
    }
    .toc-list {
      list-style: none;
      display: grid;
      gap: 0;
    }
    .toc-item {
      display: flex;
      gap: 10px;
      align-items: baseline;
      padding: 8px 0;
      border-bottom: 1px solid #f1f5f9;
    }
    .toc-num {
      min-width: 28px;
      font-size: 11px;
      font-weight: 700;
      color: var(--accent);
      font-variant-numeric: tabular-nums;
    }
    .toc-title {
      flex: 0 0 auto;
      max-width: 75%;
      color: var(--text-main);
      font-size: 13px;
    }
    .toc-title.level-1 { font-weight: 700; font-size: 14px; }
    .toc-title.level-2 { padding-inline-start: 14px; font-size: 13px; }
    .toc-title.level-3,
    .toc-title.level-4 { padding-inline-start: 28px; font-size: 12px; color: var(--text-soft); }
    .toc-dot {
      flex: 1;
      border-bottom: 1px dotted #cbd5e1;
      transform: translateY(-3px);
      min-width: 20px;
    }
    .toc-page-number {
      min-width: 28px;
      text-align: end;
      font-size: 12px;
      font-variant-numeric: tabular-nums;
      color: var(--text-soft);
    }

    /* ── Sections ── */
    .pdf-section {
      margin-bottom: 20px;
    }
    .pdf-section.section-heading {
      break-after: avoid;
      page-break-after: avoid;
    }
    .pdf-section.section-code,
    .pdf-section.section-math,
    .pdf-section.section-table,
    .pdf-section.section-quote,
    .pdf-section.section-callout,
    .pdf-section.section-image,
    .pdf-section.section-qa,
    .pdf-section.section-stat-card,
    .pdf-section.section-timeline,
    .pdf-section.section-two-column,
    .pdf-section.section-chart-svg,
    .pdf-section.section-highlight-box,
    .pdf-section.section-numbered-list {
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .pdf-section p {
      margin: 0 0 12px;
      color: var(--text-main);
      text-align: justify;
      text-justify: inter-word;
      font-size: 13.5px;
      line-height: 1.9;
    }
    .pdf-section h1,
    .pdf-section h2,
    .pdf-section h3,
    .pdf-section h4,
    .pdf-section h5,
    .pdf-section h6 {
      margin: 28px 0 12px;
      line-height: 1.3;
      font-family: Georgia, serif;
      page-break-after: avoid;
      break-after: avoid;
    }
    .pdf-section h1 {
      font-size: 26px;
      color: #1a1a2e;
      border-bottom: 2px solid #1e293b;
      padding-bottom: 8px;
    }
    .pdf-section h2 {
      font-size: 21px;
      color: var(--accent);
      border-bottom: 1px solid var(--border-soft);
      padding-bottom: 6px;
    }
    .pdf-section h3 {
      font-size: 17px;
      color: #1e293b;
    }
    .pdf-section h4, .pdf-section h5, .pdf-section h6 {
      font-size: 14px;
      color: var(--text-soft);
    }
    .section-divider {
      height: 1px;
      margin: 24px 0;
      background: linear-gradient(90deg, transparent, #94a3b8, transparent);
    }

    /* ── Tables ── */
    .table-wrap {
      border: 1px solid var(--border-medium);
      border-radius: 4px;
      overflow: hidden;
      background: var(--page-surface);
      margin-bottom: 24px;
      page-break-inside: auto;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12.5px;
      line-height: 1.5;
      page-break-inside: auto;
    }
    thead { display: table-header-group; }
    tr {
      page-break-inside: avoid;
      break-inside: avoid;
    }
    th {
      background: var(--table-head-bg);
      color: var(--table-head-text);
      padding: 11px 16px;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      font-weight: 700;
      border-bottom: 2px solid rgba(255,255,255,0.08);
    }
    td {
      padding: 10px 16px;
      border-bottom: 1px solid var(--border-soft);
      color: var(--text-main);
      vertical-align: top;
      font-size: 12.5px;
    }
    tr:nth-child(even) td { background: #f8fafc; }
    tr:last-child td { border-bottom: none; }
    tr.total-row td {
      font-weight: 700;
      background: #f0f4ff !important;
      color: var(--accent);
      border-top: 2px solid var(--accent);
    }
    th.align-left, td.align-left { text-align: left; }
    th.align-center, td.align-center { text-align: center; }
    th.align-right, td.align-right { text-align: right; }
    .table-caption {
      margin: 0;
      padding: 10px 16px;
      font-size: 11px;
      font-style: italic;
      color: var(--text-muted);
      background: var(--page-surface-soft);
      border-top: 1px solid var(--border-soft);
      text-align: center;
    }

    /* ── Lists ── */
    .pdf-list {
      margin: 0 0 16px;
      padding-inline-start: 22px;
      display: grid;
      gap: 7px;
    }
    .pdf-list li {
      font-size: 13.5px;
      line-height: 1.75;
    }
    .pdf-list li.dir-rtl { direction: rtl; text-align: right; }
    .pdf-list li.dir-ltr { direction: ltr; text-align: left; }

    /* ── Markers/Highlights ── */
    .pdf-marker {
      background-color: rgba(250, 204, 21, 0.45);
      border-bottom: 1.5px solid #ca8a04;
      color: inherit;
      padding: 1px 3px;
      border-radius: 2px;
    }

    /* ── Q&A ── */
    .qa-block {
      border: 1px solid var(--border-medium);
      border-radius: 4px;
      padding: 18px 20px;
      margin-bottom: 20px;
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .qa-question-row, .qa-answer-row {
      display: flex;
      gap: 12px;
      align-items: flex-start;
    }
    .qa-question-row { margin-bottom: 12px; }
    .qa-answer-row {
      padding-top: 12px;
      border-top: 1px dashed var(--border-soft);
    }
    .qa-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 26px;
      height: 26px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 800;
      flex-shrink: 0;
    }
    .qa-badge-q { background: rgba(79,70,229,0.10); color: var(--accent); border: 1px solid rgba(79,70,229,0.20); }
    .qa-badge-a { background: rgba(5,150,105,0.10); color: var(--success); border: 1px solid rgba(5,150,105,0.20); }
    .qa-question-text { font-weight: 700; font-size: 14px; color: var(--text-main); margin-top: 2px; }
    .qa-answer-text { font-size: 13.5px; color: var(--text-soft); margin-top: 2px; line-height: 1.75; }

    /* ── Quote ── */
    .pdf-quote {
      margin: 16px 0 24px;
      padding: 16px 20px 16px 24px;
      border-inline-start: 4px solid var(--accent);
      background: var(--quote-bg);
      color: var(--text-main);
      font-style: italic;
      font-size: 14px;
      line-height: 1.8;
      border-radius: 0 4px 4px 0;
    }
    [dir="rtl"] .pdf-quote {
      border-inline-start: none;
      border-inline-end: 4px solid var(--accent);
      border-radius: 4px 0 0 4px;
    }

    /* ── Callout ── */
    .callout {
      padding: 14px 18px;
      border-radius: 4px;
      border: 1px solid var(--border-soft);
      margin: 16px 0 24px;
      display: flex;
      gap: 12px;
      align-items: flex-start;
    }
    .callout-icon { font-size: 18px; flex-shrink: 0; margin-top: 1px; }
    .callout-body { flex: 1; font-size: 13.5px; line-height: 1.75; }
    .callout-info { border-inline-start: 4px solid var(--accent-2) !important; background: rgba(8,145,178,0.04); }
    .callout-warning { border-inline-start: 4px solid var(--warning) !important; background: rgba(217,119,6,0.04); }
    .callout-success { border-inline-start: 4px solid var(--success) !important; background: rgba(5,150,105,0.04); }
    .callout-error { border-inline-start: 4px solid var(--danger) !important; background: rgba(220,38,38,0.04); }
    .callout-primary { border-inline-start: 4px solid var(--accent) !important; background: rgba(79,70,229,0.04); }
    .callout-secondary { border-inline-start: 4px solid #64748b !important; background: rgba(100,116,139,0.04); }

    /* ── Image ── */
    .pdf-figure {
      margin: 16px 0 24px;
      border: 1px solid var(--border-medium);
      border-radius: 4px;
      overflow: hidden;
      background: var(--page-surface);
    }
    .pdf-figure img {
      display: block;
      width: 100%;
      max-height: 400px;
      object-fit: contain;
    }
    .pdf-figure figcaption {
      padding: 8px 14px;
      font-size: 11px;
      color: var(--text-muted);
      font-style: italic;
      text-align: center;
      border-top: 1px solid var(--border-soft);
    }

    /* ── Math ── */
    .math-block {
      padding: 20px 24px;
      text-align: center;
      border: 1px solid var(--border-medium);
      background: #f8fafc;
      margin-bottom: 22px;
      overflow-x: auto;
      break-inside: avoid;
      page-break-inside: avoid;
      border-radius: 4px;
    }
    .math-block .katex-display { margin: 0; }
    .math-fallback {
      text-align: start;
      font-family: 'Courier New', monospace;
      color: var(--text-main);
    }

    /* ── Code Block ── */
    .code-block-wrapper {
      margin: 12px 0 20px;
      border-radius: 6px;
      overflow: hidden;
      border: 1px solid #d1d5db;
    }
    .code-block-header {
      background: #1e293b;
      padding: 8px 14px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .code-dots { display: flex; gap: 6px; }
    .dot {
      width: 11px; height: 11px; border-radius: 50%;
    }
    .dot-red { background: #ef4444; }
    .dot-yellow { background: #f59e0b; }
    .dot-green { background: #10b981; }
    .code-lang-badge {
      font-size: 9px;
      font-weight: 700;
      letter-spacing: 0.12em;
      color: #94a3b8;
      font-family: 'Courier New', monospace;
    }
    .code-block {
      margin: 0;
      padding: 16px 18px;
      background: #0f172a;
      color: #e2e8f0;
      border-radius: 0;
      border: none;
      overflow: hidden;
      font-family: 'Courier New', Consolas, monospace;
      font-size: 12px;
      line-height: 1.65;
      white-space: pre-wrap;
    }
    .code-block code { counter-reset: line; }
    .code-line {
      display: block;
      position: relative;
      padding-inline-start: 3em;
      white-space: pre-wrap;
      word-break: break-word;
    }
    .code-line::before {
      counter-increment: line;
      content: counter(line);
      position: absolute;
      inset-inline-start: 0;
      width: 2.2em;
      text-align: end;
      color: rgba(148,163,184,0.45);
      font-size: 0.9em;
    }
    .token.comment { color: #64748b; }
    .token.punctuation { color: #cbd5e1; }
    .token.property, .token.tag, .token.constant, .token.symbol, .token.deleted { color: #f472b6; }
    .token.boolean, .token.number { color: #f59e0b; }
    .token.selector, .token.attr-name, .token.string, .token.char, .token.builtin, .token.inserted { color: #22c55e; }
    .token.operator, .token.entity, .token.url { color: #67e8f9; }
    .token.atrule, .token.attr-value, .token.keyword { color: #a78bfa; }
    .token.function, .token.class-name { color: #60a5fa; }

    /* ── Stat Cards ── */
    .stat-cards-title {
      font-size: 15px;
      font-weight: 700;
      color: var(--text-main);
      margin-bottom: 14px;
      font-family: Georgia, serif;
    }
    .stat-cards-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
      gap: 14px;
      margin-bottom: 20px;
    }
    .stat-card {
      background: var(--page-surface);
      border: 1px solid var(--border-medium);
      border-radius: 6px;
      padding: 18px 16px;
      text-align: center;
      break-inside: avoid;
    }
    .stat-card-value {
      font-size: 30px;
      font-weight: 800;
      line-height: 1;
      margin-bottom: 6px;
      font-family: Georgia, serif;
    }
    .stat-unit {
      font-size: 12px;
      font-weight: 400;
      color: var(--text-muted);
      margin-inline-start: 3px;
    }
    .stat-card-label {
      font-size: 11px;
      color: var(--text-soft);
      text-transform: uppercase;
      letter-spacing: 0.08em;
      margin-bottom: 6px;
    }
    .stat-card-trend {
      font-size: 11px;
      color: var(--text-muted);
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 4px;
    }
    .trend-up { color: var(--success); }
    .trend-down { color: var(--danger); }
    .trend-flat { color: var(--warning); }

    /* ── Timeline ── */
    .timeline-heading {
      font-size: 15px;
      font-weight: 700;
      color: var(--text-main);
      margin-bottom: 16px;
      font-family: Georgia, serif;
    }
    .timeline-wrapper {
      position: relative;
      padding-inline-start: 20px;
      margin-bottom: 20px;
      border-inline-start: 2px solid var(--border-medium);
    }
    [dir="rtl"] .timeline-wrapper {
      padding-inline-start: 0;
      padding-inline-end: 20px;
      border-inline-start: none;
      border-inline-end: 2px solid var(--border-medium);
    }
    .timeline-item {
      display: flex;
      gap: 0;
      margin-bottom: 24px;
      position: relative;
    }
    .timeline-dot {
      position: absolute;
      inset-inline-start: -30px;
      width: 28px;
      height: 28px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 3px solid;
      background: white;
      z-index: 1;
      flex-shrink: 0;
    }
    [dir="rtl"] .timeline-dot { inset-inline-start: auto; inset-inline-end: -30px; }
    .timeline-num { font-size: 10px; font-weight: 800; }
    .timeline-icon { font-size: 13px; }
    .timeline-connector { display: none; }
    .timeline-content {
      padding-inline-start: 16px;
      flex: 1;
    }
    [dir="rtl"] .timeline-content { padding-inline-start: 0; padding-inline-end: 16px; }
    .timeline-date {
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      margin-bottom: 4px;
    }
    .timeline-title {
      font-size: 14px;
      font-weight: 700;
      color: var(--text-main);
      margin-bottom: 4px;
    }
    .timeline-desc {
      font-size: 13px;
      color: var(--text-soft);
      line-height: 1.65;
    }

    /* ── Two Column ── */
    .two-col-section-title {
      font-size: 15px;
      font-weight: 700;
      color: var(--text-main);
      margin-bottom: 14px;
      font-family: Georgia, serif;
    }
    .two-column-grid {
      display: grid;
      grid-template-columns: 1fr 1px 1fr;
      gap: 0 20px;
      margin-bottom: 20px;
      border: 1px solid var(--border-medium);
      border-radius: 4px;
      overflow: hidden;
    }
    .two-col-panel {
      padding: 18px 20px;
    }
    .two-col-divider {
      background: var(--border-medium);
      width: 1px;
    }
    .two-col-heading {
      font-size: 13px;
      font-weight: 700;
      color: var(--accent);
      text-transform: uppercase;
      letter-spacing: 0.08em;
      margin-bottom: 10px;
      padding-bottom: 6px;
      border-bottom: 1px solid var(--border-soft);
    }
    .two-col-content {
      font-size: 13px;
      line-height: 1.75;
      color: var(--text-main);
    }

    /* ── Charts ── */
    .chart-wrapper {
      margin-bottom: 24px;
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .chart-title {
      font-size: 14px;
      font-weight: 700;
      color: var(--text-main);
      margin-bottom: 12px;
      font-family: Georgia, serif;
      text-align: center;
    }

    /* ── Highlight Box ── */
    .highlight-box {
      display: flex;
      gap: 14px;
      align-items: flex-start;
      padding: 16px 20px;
      border-radius: 4px;
      margin: 16px 0 24px;
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .highlight-box-icon {
      font-size: 22px;
      flex-shrink: 0;
    }
    .highlight-box-content {
      font-size: 13.5px;
      line-height: 1.78;
      color: var(--text-main);
      font-weight: 600;
      flex: 1;
    }

    /* ── Numbered List ── */
    .numbered-list-title {
      font-size: 15px;
      font-weight: 700;
      color: var(--text-main);
      margin-bottom: 14px;
      font-family: Georgia, serif;
    }
    .numbered-list {
      display: grid;
      gap: 14px;
      margin-bottom: 20px;
    }
    .numbered-item {
      display: flex;
      gap: 16px;
      align-items: flex-start;
      break-inside: avoid;
    }
    .numbered-badge {
      min-width: 40px;
      height: 40px;
      background: var(--accent);
      color: white;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 13px;
      font-weight: 800;
      flex-shrink: 0;
      font-family: Georgia, serif;
    }
    .numbered-content { flex: 1; }
    .numbered-title {
      font-size: 14px;
      font-weight: 700;
      color: var(--text-main);
      margin-bottom: 4px;
    }
    .numbered-desc {
      font-size: 13px;
      color: var(--text-soft);
      line-height: 1.7;
    }

    /* ── Badge Group ── */
    .badge-section-label {
      font-size: 13px;
      color: var(--text-soft);
      margin-bottom: 10px;
    }
    .badge-group {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-bottom: 20px;
    }
    .badge-pill {
      display: inline-flex;
      align-items: center;
      padding: 5px 12px;
      border-radius: 999px;
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.04em;
    }

    /* ── MCQ Questions ── */
    .mcq-question-block {
      border: 1.5px solid var(--border-medium);
      border-radius: 10px;
      padding: 18px 20px;
      margin-bottom: 16px;
      background: var(--page-surface-soft);
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .mcq-question-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
    }
    .mcq-question-num {
      font-weight: 700;
      font-size: 13px;
      color: var(--accent);
      letter-spacing: 0.03em;
    }
    .mcq-points-badge {
      background: var(--accent);
      color: white;
      border-radius: 999px;
      font-size: 10px;
      font-weight: 700;
      padding: 2px 10px;
    }
    .mcq-question-text {
      font-size: 14px;
      font-weight: 600;
      color: var(--text-main);
      margin-bottom: 14px;
      line-height: 1.7;
    }
    .mcq-options {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .mcq-option {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 9px 14px;
      border-radius: 8px;
      border: 1.5px solid var(--border-soft);
      background: white;
      transition: border-color 0.2s;
    }
    .mcq-option.mcq-opt-correct {
      border-color: var(--success);
      background: #f0fdf4;
    }
    .mcq-opt-label {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: #f1f5f9;
      border: 1.5px solid var(--border-medium);
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 12px;
      flex-shrink: 0;
      color: var(--text-soft);
    }
    .mcq-opt-label-correct {
      background: var(--success);
      border-color: var(--success);
      color: white;
    }
    .mcq-opt-text {
      flex: 1;
      font-size: 13px;
      color: var(--text-main);
    }
    .mcq-correct-badge {
      font-size: 11px;
      color: var(--success);
      font-weight: 700;
      white-space: nowrap;
    }
    .mcq-explanation {
      margin-top: 12px;
      padding: 10px 14px;
      background: #eff6ff;
      border-radius: 6px;
      border-inline-start: 3px solid var(--accent-2);
      font-size: 12.5px;
      color: var(--text-soft);
      line-height: 1.6;
    }
    .mcq-explanation-label {
      font-weight: 700;
      color: var(--accent-2);
      margin-inline-end: 6px;
    }

    /* ── Exam Header ── */
    .exam-header-block {
      border: 2px solid var(--border-medium);
      border-radius: 12px;
      overflow: hidden;
      margin-bottom: 24px;
    }
    .exam-header-top {
      background: var(--table-head-bg);
      color: var(--table-head-text);
      padding: 12px 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .exam-institution {
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.1em;
      opacity: 0.85;
    }
    .exam-header-logo {
      font-size: 20px;
    }
    .exam-title {
      font-size: 20px;
      font-weight: 800;
      color: var(--text-main);
      text-align: center;
      padding: 18px 20px 6px;
      font-family: Georgia, serif;
    }
    .exam-meta-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0;
      padding: 14px 20px;
      border-top: 1px solid var(--border-soft);
    }
    .exam-meta-row {
      display: flex;
      gap: 8px;
      align-items: center;
      padding: 6px 0;
      font-size: 13px;
      color: var(--text-soft);
    }
    .exam-meta-val {
      font-weight: 700;
      color: var(--text-main);
    }
    .exam-fields-row {
      display: flex;
      flex-direction: column;
      gap: 10px;
      padding: 12px 20px;
      border-top: 1px solid var(--border-soft);
    }
    .exam-field-row {
      display: flex;
      align-items: center;
      gap: 12px;
      font-size: 13px;
    }
    .exam-field-label {
      font-weight: 600;
      white-space: nowrap;
      color: var(--text-soft);
    }
    .exam-field-line {
      flex: 1;
      color: var(--text-muted);
      border-bottom: 1px solid var(--border-medium);
      letter-spacing: 4px;
    }
    .exam-instructions {
      padding: 12px 20px;
      border-top: 1px solid var(--border-soft);
      background: #fffbeb;
    }
    .exam-instructions-title {
      font-weight: 700;
      font-size: 13px;
      color: var(--warning);
      margin-bottom: 8px;
    }
    .exam-instructions ol {
      padding-inline-start: 20px;
      margin: 0;
    }
    .exam-instructions li {
      font-size: 12.5px;
      color: var(--text-soft);
      margin-bottom: 4px;
      line-height: 1.6;
    }
    .exam-divider-thick {
      height: 4px;
      background: linear-gradient(90deg, var(--accent), var(--accent-2), var(--accent-3));
    }

    /* ── Answer Key ── */
    .answer-key-block {
      border: 2px solid #10b981;
      border-radius: 10px;
      overflow: hidden;
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .answer-key-header {
      background: #ecfdf5;
      padding: 14px 20px;
      display: flex;
      align-items: center;
      gap: 10px;
      border-bottom: 1px solid #a7f3d0;
    }
    .answer-key-icon {
      font-size: 20px;
    }
    .answer-key-title {
      font-size: 16px;
      font-weight: 700;
      color: #065f46;
      font-family: Georgia, serif;
    }
    .answer-key-table {
      width: 100%;
      border-collapse: collapse;
    }
    .answer-key-table th {
      background: #10b981;
      color: white;
      padding: 8px 16px;
      font-size: 12px;
      font-weight: 700;
      text-align: center;
    }
    .answer-key-table td {
      padding: 8px 16px;
      text-align: center;
      font-size: 13px;
      border-bottom: 1px solid #d1fae5;
    }
    .answer-key-table tr:nth-child(even) td {
      background: #f0fdf4;
    }

    /* ── Flashcards ── */
    .flashcards-section-title {
      font-size: 18px;
      font-weight: 700;
      color: var(--text-main);
      margin-bottom: 20px;
      font-family: Georgia, serif;
    }
    .flashcards-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 16px;
    }
    .flashcard {
      border-radius: 12px;
      border: 1.5px solid var(--border-soft);
      overflow: hidden;
      background: white;
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .flashcard-category {
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.08em;
      padding: 6px 14px 0;
      text-transform: uppercase;
    }
    .flashcard-front {
      padding: 14px 16px 10px;
    }
    .flashcard-front-label {
      font-size: 10px;
      font-weight: 700;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.08em;
      margin-bottom: 6px;
    }
    .flashcard-front-text {
      font-size: 13.5px;
      font-weight: 600;
      color: var(--text-main);
      line-height: 1.55;
    }
    .flashcard-hint {
      font-size: 11px;
      color: var(--warning);
      margin-top: 8px;
    }
    .flashcard-divider {
      height: 6px;
    }
    .flashcard-back {
      padding: 10px 16px 14px;
      background: var(--page-surface-soft);
    }
    .flashcard-back-label {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      margin-bottom: 6px;
    }
    .flashcard-back-text {
      font-size: 12.5px;
      color: var(--text-soft);
      line-height: 1.55;
    }

    /* ── Typography Extras ── */
    a { color: var(--accent); text-decoration: none; }
    strong { color: var(--text-main); font-weight: 700; }
    em { font-style: italic; }
    del { text-decoration: line-through; color: var(--text-muted); }
    code:not(.code-block code) {
      font-family: 'Courier New', monospace;
      font-size: 0.88em;
      background: #f1f5f9;
      border: 1px solid #e2e8f0;
      border-radius: 3px;
      padding: 1px 5px;
    }

    /* ── Print Media ── */
    @page {
      margin: 80px 24px 80px 24px;
    }
    @media print {
      .cover-page { page-break-after: always; }
      .toc-page { page-break-after: always; }
    }

    /* ── Premium SVG Icons ── */
    .inline-svg-icon {
      display: inline-block;
      width: 1.2em;
      height: 1.2em;
      vertical-align: -0.2em;
      margin-inline-end: 0.35em;
      margin-right: 0.35em;
      fill: none;
      stroke: currentColor;
      stroke-width: 2;
      stroke-linecap: round;
      stroke-linejoin: round;
      flex-shrink: 0;
    }
    [dir="rtl"] .inline-svg-icon {
      margin-right: 0;
      margin-left: 0.35em;
    }
    .callout-icon .inline-svg-icon {
      width: 20px;
      height: 20px;
      margin-inline-end: 0;
      margin-right: 0;
      vertical-align: top;
    }
    .callout-info .inline-svg-icon { color: var(--accent-2); }
    .callout-warning .inline-svg-icon { color: var(--warning); }
    .callout-success .inline-svg-icon { color: var(--success); }
    .callout-error .inline-svg-icon { color: var(--danger); }
    .callout-primary .inline-svg-icon { color: var(--accent); }
    .callout-secondary .inline-svg-icon { color: #64748b; }
    
    .highlight-box-icon .inline-svg-icon {
      width: 22px;
      height: 22px;
      margin-inline-end: 0;
      margin-right: 0;
      vertical-align: middle;
    }
    
    .timeline-dot .inline-svg-icon {
      width: 14px;
      height: 14px;
      margin-inline-end: 0;
      margin-right: 0;
      color: #ffffff;
      vertical-align: middle;
    }
    
    .answer-key-icon .inline-svg-icon {
      width: 20px;
      height: 20px;
      margin-inline-end: 0;
      margin-right: 0;
      color: #065f46;
      vertical-align: middle;
    }
    
    .flashcard-hint span .inline-svg-icon {
      width: 12px;
      height: 12px;
      margin-inline-end: 0;
      margin-right: 0;
      color: var(--warning);
      vertical-align: middle;
    }
  `;
}

// ─── Watermark CSS ─────────────────────────────────────────────────────────────
function getWatermarkCss(doc: PDFDocument): string {
  const wmText = doc.metadata?.watermark;
  const wmOpacity = doc.metadata?.watermarkOpacity ?? 0.06;
  if (!wmText) {
    // Check if any section is a watermark type
    const wmSection = doc.sections.find(s => s.type === "watermark");
    if (!wmSection) return "";
    const text = wmSection.watermarkText || wmSection.content || "DRAFT";
    const opacity = wmSection.watermarkOpacity ?? 0.06;
    return `body::before {
      content: "${escapeHtml(text)}";
      position: fixed;
      top: 45%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(-35deg);
      font-size: 90px;
      font-weight: 900;
      font-family: Georgia, serif;
      color: rgba(15,23,42,${opacity});
      letter-spacing: 0.2em;
      z-index: -1;
      pointer-events: none;
      white-space: nowrap;
    }`;
  }
  return `body::before {
    content: "${escapeHtml(wmText)}";
    position: fixed;
    top: 45%;
    left: 50%;
    transform: translate(-50%, -50%) rotate(-35deg);
    font-size: 90px;
    font-weight: 900;
    font-family: Georgia, serif;
    color: rgba(15,23,42,${wmOpacity});
    letter-spacing: 0.2em;
    z-index: -1;
    pointer-events: none;
    white-space: nowrap;
  }`;
}

// ─── HTML Builder ─────────────────────────────────────────────────────────────
export function buildPdfHtml(doc: PDFDocument): string {
  const theme = resolveTheme(doc.theme);
  const bodyDirection = doc.language === "ar" ? "rtl" : "ltr";
  const watermarkCss = getWatermarkCss(doc);

  return `<!DOCTYPE html>
<html lang="${doc.language === "ar" ? "ar" : "en"}" dir="${bodyDirection}">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(doc.title)}</title>
    <meta name="description" content="${escapeHtml(doc.subtitle || doc.title)}" />
    <meta name="author" content="${escapeHtml(doc.author || "Apex AI")}" />
    <!-- Google Fonts with timeout fallback -->
    <link rel="preconnect" href="https://fonts.googleapis.com" crossorigin>
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=Cairo:wght@400;600;700;800&display=swap" rel="stylesheet">
    <!-- KaTeX -->
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css">
    <style>
      ${FONT_IMPORTS}
      ${getDocumentStyles(theme)}
      ${watermarkCss}
    </style>
  </head>
  <body dir="${bodyDirection}">
    <main class="document-shell">
      ${doc.coverPage ? renderCoverPage(doc) : ""}
      ${doc.tableOfContents ? renderTableOfContents(doc) : ""}
      <section class="document-body">
        ${doc.sections.map((section) => renderSection(section, doc.language)).join("\n")}
      </section>
    </main>
  </body>
</html>`;
}

// ─── Browser Lifecycle ─────────────────────────────────────────────────────────
export async function initBrowser(): Promise<Browser> {
  if (!browserPromise) {
    const puppeteer = (await import("puppeteer")).default;
    browserPromise = puppeteer.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--font-render-hinting=full",
        "--force-color-profile=srgb",
        "--disable-gpu",
      ],
    });
  }
  return browserPromise;
}

export async function closeBrowser(): Promise<void> {
  if (!browserPromise) return;
  const browser = await browserPromise;
  await browser.close();
  browserPromise = null;
}

// ─── Page Size ────────────────────────────────────────────────────────────────
function getPdfFormat(pageSize: PDFPageSize): "A4" | "Letter" {
  return pageSize === "letter" ? "Letter" : "A4";
}

// ─── PDF Generator (with Retry + 300 DPI) ─────────────────────────────────────
export async function generatePdf(
  doc: PDFDocument,
  overrides?: Partial<Pick<PDFDocument, "theme" | "pageSize">>
): Promise<Buffer> {
  const MAX_RETRIES = 3;
  const TIMEOUT_MS = 90_000; // 90 seconds for large docs

  const normalizedDoc: PDFDocument = {
    ...doc,
    theme: overrides?.theme || doc.theme,
    pageSize: overrides?.pageSize || doc.pageSize,
  };

  const html = buildPdfHtml(normalizedDoc);

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    let page: Awaited<ReturnType<Browser["newPage"]>> | null = null;
    try {
      const browser = await initBrowser();
      page = await browser.newPage();

      // 300 DPI equivalent (deviceScaleFactor = 2 gives ~150dpi on A4, print media handles the rest)
      await page.setViewport({ width: 1240, height: 1754, deviceScaleFactor: 2 });

      // Set font timeout and load fonts first
      await page.setExtraHTTPHeaders({ "Accept-Language": "ar,en;q=0.9" });

      await page.setContent(html, {
        waitUntil: "domcontentloaded",
        timeout: TIMEOUT_MS,
      });

      // Wait for fonts and KaTeX to fully render
      await page.evaluate(() => document.fonts.ready);
      await new Promise(r => setTimeout(r, 600));

      await page.emulateMediaType("print");

      const pdf = await page.pdf({
        format: getPdfFormat(normalizedDoc.pageSize),
        printBackground: true,
        margin: {
          top: "85px",
          bottom: "85px",
          left: "24px",
          right: "24px",
        },
        displayHeaderFooter: true,
        headerTemplate: getHeaderTemplate(normalizedDoc),
        footerTemplate: getFooterTemplate(normalizedDoc),
        preferCSSPageSize: false,
      });

      return Buffer.from(pdf);
    } catch (error) {
      const isLastAttempt = attempt === MAX_RETRIES;
      if (isLastAttempt) throw error;
      // Wait before retry (exponential backoff)
      await new Promise(r => setTimeout(r, attempt * 1500));
    } finally {
      if (page) {
        try { await page.close(); } catch { /* ignore */ }
      }
    }
  }

  throw new Error("PDF generation failed after all retries");
}
