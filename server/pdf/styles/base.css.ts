export const BASE_CSS = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { margin: 0; padding: 0; background: var(--page-bg); }
  body {
    color: var(--text-main);
    font-family: Georgia, 'Times New Roman', serif;
    font-size: 13.5px;
    line-height: 1.85;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .document-shell { padding: 22px 18px 32px; }
  .document-body { background: transparent; }
  .section-divider {
    height: 1px;
    margin: 24px 0;
    background: linear-gradient(90deg, transparent, #94a3b8, transparent);
  }
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
  .pdf-marker {
    background-color: rgba(250, 204, 21, 0.45);
    border-bottom: 1.5px solid #ca8a04;
    color: inherit;
    padding: 1px 3px;
    border-radius: 2px;
  }
`;
