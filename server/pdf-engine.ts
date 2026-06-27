import type { Browser } from "puppeteer";
import puppeteer from "puppeteer";
import katex from "katex";
import Prism from "prismjs";
import loadLanguages from "prismjs/components/index.js";
import type { PDFDocument, PDFDocumentTheme, PDFPageSize, PDFSection } from "@shared/pdf";

loadLanguages(["markup", "typescript", "javascript", "tsx", "jsx", "json", "python", "bash", "css", "sql"]);

let browserPromise: Promise<Browser> | null = null;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderInline(text: string): string {
  return escapeHtml(text)
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\n/g, "<br />");
}

function resolveTheme(theme: PDFDocumentTheme): "dark" | "light" {
  return theme === "light" ? "light" : "dark";
}

function resolveDirection(section: PDFSection): "rtl" | "ltr" {
  if (section.direction === "rtl" || section.direction === "ltr") {
    return section.direction;
  }
  return /[\u0600-\u06FF]/.test(section.content) ? "rtl" : "ltr";
}

function getPrismLanguage(language?: string): string {
  const normalized = (language || "text").toLowerCase();
  if (normalized === "ts") return "typescript";
  if (normalized === "js") return "javascript";
  if (normalized === "html") return "markup";
  return normalized;
}

function renderCodeBlock(code: string, language?: string): string {
  const prismLanguage = getPrismLanguage(language);
  const grammar = Prism.languages[prismLanguage] || Prism.languages.plain || Prism.languages.markup;
  const safeCode = escapeHtml(code);
  const highlighted =
    prismLanguage && grammar ? Prism.highlight(code, grammar, prismLanguage) : safeCode;
  const lines = highlighted.split("\n");

  const content = lines
    .map((line: string) => `<span class="code-line">${line || "&nbsp;"}</span>`)
    .join("\n");

  return `<pre class="code-block language-${prismLanguage}"><code>${content}</code></pre>`;
}

function renderMathBlock(latex: string): string {
  try {
    return `<div class="math-block">${katex.renderToString(latex, {
      displayMode: true,
      throwOnError: false,
      output: "html",
    })}</div>`;
  } catch {
    return `<div class="math-block math-fallback">${escapeHtml(latex)}</div>`;
  }
}

function renderTable(section: PDFSection): string {
  const headers = section.headers || [];
  const rows = section.rows || [];
  const thead = headers.length
    ? `<thead><tr>${headers.map((header) => `<th>${renderInline(header)}</th>`).join("")}</tr></thead>`
    : "";
  const tbody = `<tbody>${rows
    .map((row) => `<tr>${row.map((cell) => `<td>${renderInline(cell)}</td>`).join("")}</tr>`)
    .join("")}</tbody>`;

  return `<div class="table-wrap"><table>${thead}${tbody}</table>${section.caption ? `<p class="table-caption">${renderInline(section.caption)}</p>` : ""}</div>`;
}

function renderList(section: PDFSection): string {
  const items = section.items || [];
  return `<ul class="pdf-list">${items.map((item) => `<li>${renderInline(item)}</li>`).join("")}</ul>`;
}

function renderCallout(section: PDFSection): string {
  const variant = section.variant || "info";
  return `<aside class="callout callout-${variant}"><div class="callout-body">${renderInline(section.content)}</div></aside>`;
}

function renderQuote(section: PDFSection): string {
  return `<blockquote class="pdf-quote">${renderInline(section.content)}</blockquote>`;
}

function renderImage(section: PDFSection): string {
  const src = section.content.trim();
  if (!src) return "";
  return `
    <figure class="pdf-figure">
      <img src="${escapeHtml(src)}" alt="${escapeHtml(section.caption || "image")}" />
      ${section.caption ? `<figcaption>${renderInline(section.caption)}</figcaption>` : ""}
    </figure>
  `;
}

function renderSection(section: PDFSection): string {
  const dir = resolveDirection(section);
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
      return `<section class="${classes}" dir="${dir}">${renderList(section)}</section>`;
    case "divider":
      return `<div class="section-divider" aria-hidden="true"></div>`;
    case "quote":
      return `<section class="${classes}" dir="${dir}">${renderQuote(section)}</section>`;
    case "callout":
      return `<section class="${classes}" dir="${dir}">${renderCallout(section)}</section>`;
    case "image":
      return `<section class="${classes}" dir="${dir}">${renderImage(section)}</section>`;
    default:
      return `<section class="${classes}" dir="${dir}"><p>${renderInline(section.content)}</p></section>`;
  }
}

function renderCoverPage(doc: PDFDocument): string {
  return `
    <section class="cover-page" dir="${doc.language === "ar" ? "rtl" : "ltr"}">
      <div class="cover-inner">
        <div class="cover-kicker">APEX AI PDF EXPORT</div>
        <h1>${renderInline(doc.title)}</h1>
        ${doc.subtitle ? `<p class="cover-subtitle">${renderInline(doc.subtitle)}</p>` : ""}
        <div class="cover-meta">
          ${doc.author ? `<span>${renderInline(doc.author)}</span>` : ""}
          ${doc.date ? `<span>${renderInline(doc.date)}</span>` : ""}
          <span>${doc.pageSize.toUpperCase()}</span>
        </div>
      </div>
    </section>
  `;
}

function renderTableOfContents(doc: PDFDocument): string {
  const headings = doc.sections.filter((section) => section.type === "heading");
  if (!headings.length) return "";

  return `
    <section class="toc-page" dir="${doc.language === "ar" ? "rtl" : "ltr"}">
      <h2>${doc.language === "ar" ? "فهرس المحتويات" : "Table of Contents"}</h2>
      <ol class="toc-list">
        ${headings
          .map(
            (section, index) => `
              <li>
                <span class="toc-title level-${section.level || 2}">${renderInline(section.content)}</span>
                <span class="toc-dot"></span>
                <span class="toc-page-number">${index + 1}</span>
              </li>`
          )
          .join("")}
      </ol>
    </section>
  `;
}

function getHeaderTemplate(doc: PDFDocument): string {
  return `
    <div style="width:100%;font-size:9px;padding:0 20px;color:#94a3b8;font-family:Inter,Segoe UI,sans-serif;display:flex;justify-content:space-between;align-items:center;">
      <span style="font-weight:700;letter-spacing:0.08em;">APEX AI</span>
      <span>${escapeHtml(doc.title)}</span>
    </div>
  `;
}

function getFooterTemplate(doc: PDFDocument): string {
  return `
    <div style="width:100%;font-size:9px;padding:0 20px;color:#64748b;font-family:Inter,Segoe UI,sans-serif;display:flex;justify-content:space-between;align-items:center;">
      <span>Generated by Apex AI</span>
      <span>${escapeHtml(doc.date || new Date().toISOString().slice(0, 10))} · <span class="pageNumber"></span> / <span class="totalPages"></span></span>
    </div>
  `;
}

function getDocumentStyles(theme: "dark" | "light"): string {
  const dark = theme === "dark";

  return `
    :root {
      --page-bg: ${dark ? "#0a0a0c" : "#fafafa"};
      --page-surface: ${dark ? "#111217" : "#ffffff"};
      --page-surface-soft: ${dark ? "rgba(255,255,255,0.03)" : "#f5f7fb"};
      --text-main: ${dark ? "#ebeef5" : "#172033"};
      --text-soft: ${dark ? "#9aa4b2" : "#526074"};
      --border-soft: ${dark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.08)"};
      --accent: #8b5cf6;
      --accent-2: #06b6d4;
      --success: #10b981;
      --warning: #f59e0b;
      --danger: #ef4444;
      --code-bg: ${dark ? "#050506" : "#f1f5f9"};
      --quote-bg: ${dark ? "rgba(139,92,246,0.08)" : "rgba(99,102,241,0.06)"};
      --table-head: ${dark ? "linear-gradient(135deg,#1e1b4b,#312e81)" : "linear-gradient(135deg,#dbeafe,#e0e7ff)"};
      --table-head-text: ${dark ? "#e0e7ff" : "#1e1b4b"};
    }

    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; }
    body {
      background: var(--page-bg);
      color: var(--text-main);
      font-family: Inter, "Segoe UI", Arial, sans-serif;
      font-size: 14px;
      line-height: 1.8;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    body[dir="rtl"] {
      font-family: Cairo, "Segoe UI", Tahoma, sans-serif;
    }
    .document-shell {
      padding: 28px 20px 36px;
    }
    .document-body {
      background: transparent;
    }
    .cover-page,
    .toc-page {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      justify-content: center;
      page-break-after: always;
      padding: 28px 8px;
    }
    .cover-inner {
      background:
        radial-gradient(circle at top left, rgba(139,92,246,0.18), transparent 32%),
        radial-gradient(circle at bottom right, rgba(6,182,212,0.14), transparent 28%),
        var(--page-surface);
      border: 1px solid var(--border-soft);
      border-radius: 28px;
      padding: 52px 44px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.22);
    }
    .cover-kicker {
      display: inline-flex;
      padding: 8px 12px;
      border-radius: 999px;
      font-size: 11px;
      letter-spacing: 0.16em;
      font-weight: 700;
      color: var(--accent-2);
      background: rgba(6,182,212,0.08);
      border: 1px solid rgba(6,182,212,0.18);
    }
    .cover-page h1 {
      margin: 20px 0 10px;
      font-size: 34px;
      line-height: 1.2;
      background: linear-gradient(135deg, var(--accent), var(--accent-2));
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .cover-subtitle {
      font-size: 17px;
      color: var(--text-soft);
      margin: 0;
    }
    .cover-meta {
      margin-top: 26px;
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
    }
    .cover-meta span {
      padding: 8px 12px;
      border-radius: 999px;
      border: 1px solid var(--border-soft);
      background: var(--page-surface-soft);
      color: var(--text-soft);
      font-size: 12px;
    }
    .toc-page h2 {
      margin: 0 0 18px;
      font-size: 28px;
      color: var(--text-main);
    }
    .toc-list {
      list-style: none;
      padding: 0;
      margin: 0;
      display: grid;
      gap: 10px;
    }
    .toc-list li {
      display: flex;
      gap: 12px;
      align-items: center;
      color: var(--text-soft);
    }
    .toc-title.level-1 { font-weight: 700; color: var(--text-main); }
    .toc-title.level-2 { padding-inline-start: 14px; }
    .toc-title.level-3,
    .toc-title.level-4,
    .toc-title.level-5,
    .toc-title.level-6 { padding-inline-start: 28px; }
    .toc-dot {
      flex: 1;
      border-bottom: 1px dashed var(--border-soft);
      transform: translateY(2px);
    }
    .toc-page-number {
      font-variant-numeric: tabular-nums;
    }
    .pdf-section {
      margin-bottom: 18px;
      break-inside: avoid;
    }
    .pdf-section p {
      margin: 0;
      color: var(--text-main);
      white-space: normal;
    }
    .pdf-section h1,
    .pdf-section h2,
    .pdf-section h3,
    .pdf-section h4,
    .pdf-section h5,
    .pdf-section h6 {
      margin: 0 0 10px;
      line-height: 1.35;
      page-break-after: avoid;
    }
    .pdf-section h1 {
      font-size: 30px;
      color: var(--text-main);
    }
    .pdf-section h2 {
      font-size: 24px;
      color: ${dark ? "#a78bfa" : "#4338ca"};
    }
    .pdf-section h3 {
      font-size: 20px;
      color: ${dark ? "#c4b5fd" : "#4f46e5"};
    }
    .pdf-section h4,
    .pdf-section h5,
    .pdf-section h6 {
      color: var(--text-main);
    }
    .section-divider {
      height: 1px;
      margin: 22px 0;
      background: linear-gradient(90deg, transparent, rgba(139,92,246,0.6), transparent);
    }
    .table-wrap {
      border: 1px solid var(--border-soft);
      border-radius: 14px;
      overflow: hidden;
      background: var(--page-surface);
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }
    th {
      background: var(--table-head);
      color: var(--table-head-text);
      padding: 10px 14px;
      text-align: start;
      font-weight: 700;
    }
    td {
      padding: 9px 14px;
      border-bottom: 1px solid var(--border-soft);
      color: var(--text-main);
    }
    tr:nth-child(even) td {
      background: var(--page-surface-soft);
    }
    .table-caption {
      margin: 0;
      padding: 10px 14px 12px;
      font-size: 12px;
      color: var(--text-soft);
    }
    .pdf-list {
      margin: 0;
      padding-inline-start: 22px;
      display: grid;
      gap: 8px;
    }
    .pdf-quote {
      margin: 0;
      padding: 18px 20px;
      border-inline-start: 4px solid var(--accent);
      background: var(--quote-bg);
      border-radius: 0 12px 12px 0;
      color: var(--text-main);
    }
    [dir="rtl"] .pdf-quote {
      border-inline-start: none;
      border-inline-end: 4px solid var(--accent);
      border-radius: 12px 0 0 12px;
    }
    .callout {
      padding: 16px 18px;
      border-radius: 14px;
      border: 1px solid var(--border-soft);
      background: var(--page-surface-soft);
    }
    .callout-info { border-inline-start: 4px solid var(--accent-2); }
    .callout-warning { border-inline-start: 4px solid var(--warning); }
    .callout-success { border-inline-start: 4px solid var(--success); }
    .callout-error { border-inline-start: 4px solid var(--danger); }
    .pdf-figure {
      margin: 0;
      border-radius: 16px;
      overflow: hidden;
      border: 1px solid var(--border-soft);
      background: var(--page-surface);
    }
    .pdf-figure img {
      display: block;
      width: 100%;
      max-height: 420px;
      object-fit: contain;
      background: rgba(255,255,255,0.02);
    }
    .pdf-figure figcaption {
      padding: 10px 14px;
      font-size: 12px;
      color: var(--text-soft);
    }
    .math-block {
      padding: 18px 20px;
      text-align: center;
      border-radius: 14px;
      border-inline-start: 4px solid var(--accent);
      background: rgba(139,92,246,0.06);
      overflow-x: auto;
    }
    [dir="rtl"] .math-block {
      border-inline-start: none;
      border-inline-end: 4px solid var(--accent);
    }
    .math-fallback {
      text-align: start;
      font-family: "JetBrains Mono", Consolas, monospace;
      color: var(--text-main);
    }
    .code-block {
      margin: 0;
      padding: 18px 20px;
      background: var(--code-bg);
      color: #dbe4ff;
      border-radius: 16px;
      border: 1px solid var(--border-soft);
      overflow: hidden;
      font-family: "JetBrains Mono", Consolas, monospace;
      font-size: 12px;
      line-height: 1.7;
      white-space: pre-wrap;
    }
    .code-block code {
      counter-reset: line;
    }
    .code-line {
      display: block;
      position: relative;
      padding-inline-start: 3.2em;
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
      color: rgba(148,163,184,0.55);
    }
    .token.comment,
    .token.prolog,
    .token.doctype,
    .token.cdata { color: #64748b; }
    .token.punctuation { color: #cbd5e1; }
    .token.property,
    .token.tag,
    .token.constant,
    .token.symbol,
    .token.deleted { color: #f472b6; }
    .token.boolean,
    .token.number { color: #f59e0b; }
    .token.selector,
    .token.attr-name,
    .token.string,
    .token.char,
    .token.builtin,
    .token.inserted { color: #22c55e; }
    .token.operator,
    .token.entity,
    .token.url,
    .language-css .token.string,
    .style .token.string { color: #67e8f9; }
    .token.atrule,
    .token.attr-value,
    .token.keyword { color: #a78bfa; }
    .token.function,
    .token.class-name { color: #60a5fa; }
    .token.regex,
    .token.important,
    .token.variable { color: #fb7185; }
    a {
      color: ${dark ? "#67e8f9" : "#2563eb"};
      text-decoration: none;
    }
    strong { color: var(--text-main); }
    em { color: var(--text-soft); }
    code:not(.code-block code) {
      font-family: "JetBrains Mono", Consolas, monospace;
      font-size: 0.9em;
      background: rgba(148,163,184,0.12);
      border-radius: 6px;
      padding: 2px 6px;
    }
    @page {
      margin: 72px 28px 72px 28px;
    }
  `;
}

export function buildPdfHtml(doc: PDFDocument): string {
  const theme = resolveTheme(doc.theme);
  const bodyDirection = doc.language === "ar" ? "rtl" : "ltr";

  return `
    <!DOCTYPE html>
    <html lang="${doc.language === "ar" ? "ar" : "en"}" dir="${bodyDirection}">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${escapeHtml(doc.title)}</title>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet">
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css">
        <style>${getDocumentStyles(theme)}</style>
      </head>
      <body dir="${bodyDirection}">
        <main class="document-shell">
          ${doc.coverPage ? renderCoverPage(doc) : ""}
          ${doc.tableOfContents ? renderTableOfContents(doc) : ""}
          <section class="document-body">
            ${doc.sections.map((section) => renderSection(section)).join("\n")}
          </section>
        </main>
      </body>
    </html>
  `;
}

export async function initBrowser(): Promise<Browser> {
  if (!browserPromise) {
    browserPromise = puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--font-render-hinting=medium"],
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

function getPdfFormat(pageSize: PDFPageSize): "A4" | "Letter" {
  return pageSize === "letter" ? "Letter" : "A4";
}

export async function generatePdf(doc: PDFDocument, overrides?: Partial<Pick<PDFDocument, "theme" | "pageSize">>): Promise<Buffer> {
  const browser = await initBrowser();
  const page = await browser.newPage();
  const normalizedDoc: PDFDocument = {
    ...doc,
    theme: overrides?.theme || doc.theme,
    pageSize: overrides?.pageSize || doc.pageSize,
  };

  try {
    await page.setViewport({ width: 1240, height: 1754, deviceScaleFactor: 1 });
    await page.setContent(buildPdfHtml(normalizedDoc), { waitUntil: "domcontentloaded" });
    await page.waitForNetworkIdle();
    await page.emulateMediaType("screen");

    const pdf = await page.pdf({
      format: getPdfFormat(normalizedDoc.pageSize),
      printBackground: true,
      margin: {
        top: "90px",
        bottom: "90px",
        left: "28px",
        right: "28px",
      },
      displayHeaderFooter: true,
      headerTemplate: getHeaderTemplate(normalizedDoc),
      footerTemplate: getFooterTemplate(normalizedDoc),
    });

    return Buffer.from(pdf);
  } finally {
    await page.close();
  }
}
