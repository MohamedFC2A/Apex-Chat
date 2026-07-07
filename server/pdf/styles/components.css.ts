export const COMPONENTS_CSS = `
  /* Tables */
  .table-wrap {
    border: 1px solid var(--border-medium);
    border-radius: 4px;
    overflow: hidden;
    background: var(--page-surface);
    margin-bottom: 24px;
    page-break-inside: auto;
  }
  table { width: 100%; border-collapse: collapse; font-size: 12.5px; line-height: 1.5; page-break-inside: auto; }
  thead { display: table-header-group; }
  tr { page-break-inside: avoid; break-inside: avoid; }
  th {
    background: var(--table-head-bg); color: var(--table-head-text);
    padding: 11px 16px; font-size: 11px; text-transform: uppercase;
    letter-spacing: 0.06em; font-weight: 700; border-bottom: 2px solid rgba(255,255,255,0.08);
  }
  td { padding: 10px 16px; border-bottom: 1px solid var(--border-soft); color: var(--text-main); vertical-align: top; font-size: 12.5px; }
  tr:nth-child(even) td { background: #f8fafc; }
  tr:last-child td { border-bottom: none; }
  tr.total-row td { font-weight: 700; background: #f0f4ff !important; color: var(--accent); border-top: 2px solid var(--accent); }
  th.align-left, td.align-left { text-align: left; }
  th.align-center, td.align-center { text-align: center; }
  th.align-right, td.align-right { text-align: right; }
  .table-caption { margin: 0; padding: 10px 16px; font-size: 11px; font-style: italic; color: var(--text-muted); background: var(--page-surface-soft); border-top: 1px solid var(--border-soft); text-align: center; }

  /* Lists */
  .pdf-list { margin: 0 0 16px; padding-inline-start: 22px; display: grid; gap: 7px; }
  .pdf-list li { font-size: 13.5px; line-height: 1.75; }
  .pdf-list li.dir-rtl { direction: rtl; text-align: right; }
  .pdf-list li.dir-ltr { direction: ltr; text-align: left; }

  /* Q&A */
  .qa-block { border: 1px solid var(--border-medium); border-radius: 4px; padding: 18px 20px; margin-bottom: 20px; break-inside: avoid; page-break-inside: avoid; }
  .qa-question-row, .qa-answer-row { display: flex; gap: 12px; align-items: flex-start; }
  .qa-question-row { margin-bottom: 12px; }
  .qa-answer-row { padding-top: 12px; border-top: 1px dashed var(--border-soft); }
  .qa-badge { display: inline-flex; align-items: center; justify-content: center; width: 26px; height: 26px; border-radius: 4px; font-size: 12px; font-weight: 800; flex-shrink: 0; }
  .qa-badge-q { background: rgba(79,70,229,0.10); color: var(--accent); border: 1px solid rgba(79,70,229,0.20); }
  .qa-badge-a { background: rgba(5,150,105,0.10); color: var(--success); border: 1px solid rgba(5,150,105,0.20); }
  .qa-question-text { font-weight: 700; font-size: 14px; color: var(--text-main); margin-top: 2px; }
  .qa-answer-text { font-size: 13.5px; color: var(--text-soft); margin-top: 2px; line-height: 1.75; }

  /* Quote */
  .pdf-quote {
    margin: 16px 0 24px; padding: 16px 20px 16px 24px; border-inline-start: 4px solid var(--accent);
    background: var(--quote-bg); color: var(--text-main); font-style: italic; font-size: 14px; line-height: 1.8; border-radius: 0 4px 4px 0;
  }

  /* Callout */
  .callout { padding: 14px 18px; border-radius: 4px; border: 1px solid var(--border-soft); margin: 16px 0 24px; display: flex; gap: 12px; align-items: flex-start; }
  .callout-body { flex: 1; font-size: 13.5px; line-height: 1.75; }
  .callout-info { border-inline-start: 4px solid var(--accent-2) !important; background: rgba(8,145,178,0.04); }
  .callout-warning { border-inline-start: 4px solid var(--warning) !important; background: rgba(217,119,6,0.04); }
  .callout-success { border-inline-start: 4px solid var(--success) !important; background: rgba(5,150,105,0.04); }
  .callout-error { border-inline-start: 4px solid var(--danger) !important; background: rgba(220,38,38,0.04); }
  .callout-primary { border-inline-start: 4px solid var(--accent) !important; background: rgba(79,70,229,0.04); }
  .callout-secondary { border-inline-start: 4px solid #64748b !important; background: rgba(100,116,139,0.04); }

  /* Figures */
  .pdf-figure { margin: 16px 0 24px; border: 1px solid var(--border-medium); border-radius: 4px; overflow: hidden; background: var(--page-surface); }
  .pdf-figure img { display: block; width: 100%; max-height: 400px; object-fit: contain; }
  .pdf-figure figcaption { padding: 8px 14px; font-size: 11px; color: var(--text-muted); font-style: italic; text-align: center; border-top: 1px solid var(--border-soft); }

  /* Math */
  .math-block { padding: 20px 24px; text-align: center; border: 1px solid var(--border-medium); background: #f8fafc; margin-bottom: 22px; overflow-x: auto; break-inside: avoid; page-break-inside: avoid; border-radius: 4px; }
  .math-block .katex-display { margin: 0; }
  .math-fallback { text-align: start; font-family: 'Courier New', monospace; color: var(--text-main); }

  /* Code Block */
  .code-block-wrapper { margin: 12px 0 20px; border-radius: 6px; overflow: hidden; border: 1px solid #d1d5db; }
  .code-block-header { background: #1e293b; padding: 8px 14px; display: flex; align-items: center; justify-content: space-between; }
  .code-dots { display: flex; gap: 6px; }
  .dot { width: 11px; height: 11px; border-radius: 50%; }
  .dot-red { background: #ef4444; }
  .dot-yellow { background: #f59e0b; }
  .dot-green { background: #10b981; }
  .code-lang-badge { font-size: 9px; font-weight: 700; letter-spacing: 0.12em; color: #94a3b8; font-family: 'Courier New', monospace; }
  .code-block { margin: 0; padding: 16px 18px; background: #0f172a; color: #e2e8f0; border-radius: 0; border: none; overflow: hidden; font-family: 'Courier New', Consolas, monospace; font-size: 12px; line-height: 1.65; white-space: pre-wrap; }
  .code-block code { counter-reset: line; }
  .code-line { display: block; position: relative; padding-inline-start: 3em; white-space: pre-wrap; word-break: break-word; }
  .code-line::before { counter-increment: line; content: counter(line); position: absolute; inset-inline-start: 0; width: 2.2em; text-align: end; color: rgba(148,163,184,0.45); font-size: 0.9em; }
  .token.comment { color: #64748b; }
  .token.punctuation { color: #cbd5e1; }
  .token.property, .token.tag, .token.constant, .token.symbol, .token.deleted { color: #f472b6; }
  .token.boolean, .token.number { color: #f59e0b; }
  .token.selector, .token.attr-name, .token.string, .token.char, .token.builtin, .token.inserted { color: #22c55e; }
  .token.operator, .token.entity, .token.url { color: #67e8f9; }
  .token.atrule, .token.attr-value, .token.keyword { color: #a78bfa; }
  .token.function, .token.class-name { color: #60a5fa; }

  /* Stat Cards */
  .stat-cards-title { font-size: 15px; font-weight: 700; color: var(--text-main); margin-bottom: 14px; font-family: Georgia, serif; }
  .stat-cards-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 14px; margin-bottom: 20px; }
  .stat-card { background: var(--page-surface); border: 1px solid var(--border-medium); border-radius: 6px; padding: 18px 16px; text-align: center; break-inside: avoid; }
  .stat-card-value { font-size: 30px; font-weight: 800; line-height: 1; margin-bottom: 6px; font-family: Georgia, serif; }
  .stat-unit { font-size: 12px; font-weight: 400; color: var(--text-muted); margin-inline-start: 3px; }
  .stat-card-label { font-size: 11px; color: var(--text-soft); text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 6px; }
  .stat-card-trend { font-size: 11px; color: var(--text-muted); display: flex; align-items: center; justify-content: center; gap: 4px; }
  .trend-up { color: var(--success); }
  .trend-down { color: var(--danger); }
  .trend-flat { color: var(--warning); }

  /* Timeline */
  .timeline-heading { font-size: 15px; font-weight: 700; color: var(--text-main); margin-bottom: 16px; font-family: Georgia, serif; }
  .timeline-wrapper { position: relative; padding-inline-start: 20px; margin-bottom: 20px; border-inline-start: 2px solid var(--border-medium); }
  .timeline-item { display: flex; gap: 0; margin-bottom: 24px; position: relative; }
  .timeline-dot { position: absolute; inset-inline-start: -30px; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 3px solid; background: white; z-index: 1; flex-shrink: 0; }
  .timeline-num { font-size: 10px; font-weight: 800; }
  .timeline-icon { font-size: 13px; }
  .timeline-connector { display: none; }
  .timeline-content { padding-inline-start: 16px; flex: 1; }
  .timeline-date { font-size: 11px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; margin-bottom: 4px; }
  .timeline-title { font-size: 14px; font-weight: 700; color: var(--text-main); margin-bottom: 4px; }
  .timeline-desc { font-size: 13px; color: var(--text-soft); line-height: 1.65; }

  /* Two Column */
  .two-col-section-title { font-size: 15px; font-weight: 700; color: var(--text-main); margin-bottom: 14px; font-family: Georgia, serif; }
  .two-column-grid { display: grid; grid-template-columns: 1fr 1px 1fr; gap: 0 20px; margin-bottom: 20px; border: 1px solid var(--border-medium); border-radius: 4px; overflow: hidden; }
  .two-col-panel { padding: 18px 20px; }
  .two-col-divider { background: var(--border-medium); width: 1px; }
  .two-col-heading { font-size: 13px; font-weight: 700; color: var(--accent); text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 10px; padding-bottom: 6px; border-bottom: 1px solid var(--border-soft); }
  .two-col-content { font-size: 13px; line-height: 1.75; color: var(--text-main); }

  /* Charts */
  .chart-wrapper { margin-bottom: 24px; break-inside: avoid; page-break-inside: avoid; }
  .chart-title { font-size: 14px; font-weight: 700; color: var(--text-main); margin-bottom: 12px; font-family: Georgia, serif; text-align: center; }

  /* Highlight Box */
  .highlight-box { display: flex; gap: 14px; align-items: flex-start; padding: 16px 20px; border-radius: 4px; margin: 16px 0 24px; break-inside: avoid; page-break-inside: avoid; }
  .highlight-box-icon { font-size: 22px; flex-shrink: 0; }
  .highlight-box-content { font-size: 13.5px; line-height: 1.78; color: var(--text-main); font-weight: 600; flex: 1; }

  /* Numbered List */
  .numbered-list-title { font-size: 15px; font-weight: 700; color: var(--text-main); margin-bottom: 14px; font-family: Georgia, serif; }
  .numbered-list { display: grid; gap: 14px; margin-bottom: 20px; }
  .numbered-item { display: flex; gap: 16px; align-items: flex-start; break-inside: avoid; }
  .numbered-badge { min-width: 40px; height: 40px; background: var(--accent); color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 800; flex-shrink: 0; font-family: Georgia, serif; }
  .numbered-content { flex: 1; }
  .numbered-title { font-size: 14px; font-weight: 700; color: var(--text-main); margin-bottom: 4px; }
  .numbered-desc { font-size: 13px; color: var(--text-soft); line-height: 1.7; }

  /* Badge Group */
  .badge-section-label { font-size: 13px; color: var(--text-soft); margin-bottom: 10px; }
  .badge-group { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 20px; }
  .badge-pill { display: inline-flex; align-items: center; padding: 5px 12px; border-radius: 999px; font-size: 12px; font-weight: 700; letter-spacing: 0.04em; }

  /* MCQ Questions */
  .mcq-question-block { border: 1.5px solid var(--border-medium); border-radius: 10px; padding: 18px 20px; margin-bottom: 16px; background: var(--page-surface-soft); break-inside: avoid; page-break-inside: avoid; }
  .mcq-question-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
  .mcq-question-num { font-weight: 700; font-size: 13px; color: var(--accent); letter-spacing: 0.03em; }
  .mcq-points-badge { background: var(--accent); color: white; border-radius: 999px; font-size: 10px; font-weight: 700; padding: 2px 10px; }
  .mcq-question-text { font-size: 14px; font-weight: 600; color: var(--text-main); margin-bottom: 14px; line-height: 1.7; }
  .mcq-options { display: flex; flex-direction: column; gap: 8px; }
  .mcq-option { display: flex; align-items: center; gap: 12px; padding: 9px 14px; border-radius: 8px; border: 1.5px solid var(--border-soft); background: white; transition: border-color 0.2s; }
  .mcq-option.mcq-opt-correct { border-color: var(--success); background: #f0fdf4; }
  .mcq-opt-label { width: 28px; height: 28px; border-radius: 50%; background: #f1f5f9; border: 1.5px solid var(--border-medium); display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 12px; flex-shrink: 0; color: var(--text-soft); }
  .mcq-option.mcq-opt-correct .mcq-opt-label { background: var(--success); border-color: var(--success); color: white; }
  .mcq-opt-text { flex: 1; font-size: 13px; color: var(--text-main); }
  .mcq-correct-badge { font-size: 11px; color: var(--success); font-weight: 700; white-space: nowrap; }
  .mcq-explanation { margin-top: 12px; padding: 10px 14px; background: #eff6ff; border-radius: 6px; border-inline-start: 3px solid var(--accent-2); font-size: 12.5px; color: var(--text-soft); line-height: 1.6; }
  .mcq-explanation-label { font-weight: 700; color: var(--accent-2); margin-inline-end: 6px; }

  /* Exam Header */
  .exam-header-block { border: 2px solid var(--border-medium); border-radius: 12px; overflow: hidden; margin-bottom: 24px; }
  .exam-header-top { background: var(--table-head-bg); color: var(--table-head-text); padding: 12px 20px; display: flex; justify-content: space-between; align-items: center; }
  .exam-institution { font-size: 11px; font-weight: 700; letter-spacing: 0.1em; opacity: 0.85; }
  .exam-header-logo { font-size: 20px; }
  .exam-title { font-size: 20px; font-weight: 800; color: var(--text-main); text-align: center; padding: 18px 20px 6px; font-family: Georgia, serif; }
  .exam-meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0; padding: 14px 20px; border-top: 1px solid var(--border-soft); }
  .exam-meta-row { display: flex; gap: 8px; align-items: center; padding: 6px 0; font-size: 13px; color: var(--text-soft); }
  .exam-meta-val { font-weight: 700; color: var(--text-main); }
  .exam-fields-row { display: flex; flex-direction: column; gap: 10px; padding: 12px 20px; border-top: 1px solid var(--border-soft); }
  .exam-field-row { display: flex; align-items: center; gap: 12px; font-size: 13px; }
  .exam-field-label { font-weight: 600; white-space: nowrap; color: var(--text-soft); }
  .exam-field-line { flex: 1; color: var(--text-muted); border-bottom: 1px solid var(--border-medium); letter-spacing: 4px; }
  .exam-instructions { padding: 12px 20px; border-top: 1px solid var(--border-soft); background: #fffbeb; }
  .exam-instructions-title { font-weight: 700; font-size: 13px; color: var(--warning); margin-bottom: 8px; }
  .exam-instructions ol { padding-inline-start: 20px; margin: 0; }
  .exam-instructions li { font-size: 12.5px; color: var(--text-soft); margin-bottom: 4px; line-height: 1.6; }
  .exam-divider-thick { height: 4px; background: linear-gradient(90deg, var(--accent), var(--accent-2), var(--accent-3)); }

  /* Answer Key */
  .answer-key-block { border: 2px solid #10b981; border-radius: 10px; overflow: hidden; break-inside: avoid; page-break-inside: avoid; }
  .answer-key-header { background: #ecfdf5; padding: 14px 20px; display: flex; align-items: center; gap: 10px; border-bottom: 1px solid #a7f3d0; }
  .answer-key-icon { font-size: 20px; }
  .answer-key-title { font-size: 16px; font-weight: 700; color: #065f46; font-family: Georgia, serif; }
  .answer-key-table { width: 100%; border-collapse: collapse; }
  .answer-key-table th { background: #10b981; color: white; padding: 8px 16px; font-size: 12px; font-weight: 700; text-align: center; }
  .answer-key-table td { padding: 8px 16px; text-align: center; font-size: 13px; border-bottom: 1px solid #d1fae5; }
  .answer-key-table tr:nth-child(even) td { background: #f0fdf4; }

  /* Flashcards */
  .flashcards-section-title { font-size: 18px; font-weight: 700; color: var(--text-main); margin-bottom: 20px; font-family: Georgia, serif; }
  .flashcards-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
  .flashcard { border-radius: 12px; border: 1.5px solid var(--border-soft); overflow: hidden; background: white; break-inside: avoid; page-break-inside: avoid; }
  .flashcard-category { font-size: 10px; font-weight: 700; letter-spacing: 0.08em; padding: 6px 14px 0; text-transform: uppercase; }
  .flashcard-front { padding: 14px 16px 10px; }
  .flashcard-front-label { font-size: 10px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 6px; }
  .flashcard-front-text { font-size: 13.5px; font-weight: 600; color: var(--text-main); line-height: 1.55; }
  .flashcard-hint { font-size: 11px; color: var(--warning); margin-top: 8px; }
  .flashcard-divider { height: 6px; }
  .flashcard-back { padding: 10px 16px 14px; background: var(--page-surface-soft); }
  .flashcard-back-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 6px; }
  .flashcard-back-text { font-size: 12.5px; color: var(--text-soft); line-height: 1.55; }

  /* SVGs */
  .inline-svg-icon { display: inline-block; width: 1.2em; height: 1.2em; vertical-align: -0.2em; margin-inline-end: 0.35em; margin-right: 0.35em; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; flex-shrink: 0; }
  .callout-icon .inline-svg-icon { width: 20px; height: 20px; margin-inline-end: 0; margin-right: 0; vertical-align: top; }
  .highlight-box-icon .inline-svg-icon { width: 22px; height: 22px; margin-inline-end: 0; margin-right: 0; vertical-align: middle; }
  .timeline-dot .inline-svg-icon { width: 14px; height: 14px; margin-inline-end: 0; margin-right: 0; color: #ffffff; vertical-align: middle; }
  .answer-key-icon .inline-svg-icon { width: 20px; height: 20px; margin-inline-end: 0; margin-right: 0; color: #065f46; vertical-align: middle; }
  .flashcard-hint span .inline-svg-icon { width: 12px; height: 12px; margin-inline-end: 0; margin-right: 0; color: var(--warning); vertical-align: middle; }
`;
