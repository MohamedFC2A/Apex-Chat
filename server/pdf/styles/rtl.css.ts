export const RTL_CSS = `
  body[dir="rtl"], [dir="rtl"], [dir="rtl"] * {
    font-family: 'Amiri', 'Cairo', 'Traditional Arabic', 'Arial Unicode MS', serif !important;
  }
  [dir="rtl"] .inline-svg-icon { margin-right: 0; margin-left: 0.35em; }
  [dir="rtl"] .pdf-quote { border-inline-start: none; border-inline-end: 4px solid var(--accent); border-radius: 4px 0 0 4px; }
  [dir="rtl"] .timeline-wrapper { padding-inline-start: 0; padding-inline-end: 20px; border-inline-start: none; border-inline-end: 2px solid var(--border-medium); }
  [dir="rtl"] .timeline-dot { inset-inline-start: auto; inset-inline-end: -30px; }
  [dir="rtl"] .timeline-content { padding-inline-start: 0; padding-inline-end: 16px; }
`;
