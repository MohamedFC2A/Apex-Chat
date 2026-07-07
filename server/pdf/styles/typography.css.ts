export const TYPOGRAPHY_CSS = `
  .pdf-section h1, .pdf-section h2, .pdf-section h3, .pdf-section h4, .pdf-section h5, .pdf-section h6 {
    margin: 28px 0 12px;
    line-height: 1.3;
    font-family: Georgia, serif;
    page-break-after: avoid;
    break-after: avoid;
  }
  .pdf-section h1 { font-size: 26px; color: #1a1a2e; border-bottom: 2px solid #1e293b; padding-bottom: 8px; }
  .pdf-section h2 { font-size: 21px; color: var(--accent); border-bottom: 1px solid var(--border-soft); padding-bottom: 6px; }
  .pdf-section h3 { font-size: 17px; color: #1e293b; }
  .pdf-section h4, .pdf-section h5, .pdf-section h6 { font-size: 14px; color: var(--text-soft); }
  .pdf-section p {
    margin: 0 0 12px;
    color: var(--text-main);
    text-align: justify;
    text-justify: inter-word;
    font-size: 13.5px;
    line-height: 1.9;
  }
`;
