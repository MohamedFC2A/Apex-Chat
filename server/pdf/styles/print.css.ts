export const PRINT_CSS = `
  @page { margin: 80px 24px 80px 24px; }
  @media print {
    .cover-page { page-break-after: always; }
    .toc-page { page-break-after: always; }
  }
`;
