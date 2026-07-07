/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║  APEX PDF — Shared Module Public API v4.0                                 ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */

// Types (pure TypeScript, no runtime)
export type {
  PDFDocumentLanguage,
  PDFDocumentTheme,
  PDFPageSize,
  PDFDocumentMode,
  PDFSectionType,
  ChartDataPoint,
  TimelineEvent,
  StatCardData,
  TwoColumnContent,
  MCQQuestionSection,
  FlashcardData,
  PDFSection,
  PDFDocument,
  ParsedPdfRequest,
  PdfJobOptions,
  PdfProgressEvent,
  RenderContext,
} from "./types.js";

// Validation schema
export { PDF_SCHEMA, PDF_SECTION_TYPES } from "./schema.js";
export type { PDFDocumentValidated } from "./schema.js";

// Constants
export {
  PAGE_UNIT,
  SECTION_BASE_WEIGHTS,
  PAGE_BREAK_BEFORE_TYPES,
  TOC_OVERFLOW_THRESHOLD,
  PDF_CACHE_TTL_MS,
  HTML_CACHE_TTL_MS,
  BROWSER_POOL_MAX,
  PAGES_PER_BROWSER_MAX,
  PDF_GENERATION_TIMEOUT_MS,
  PDF_MAX_RETRIES,
  BROWSER_LAUNCH_ARGS,
} from "./constants.js";

// Prompt Instruction Builders
export {
  buildPdfGenerationInstructions,
  buildPdfRepairInstructions,
} from "./instructions.js";
