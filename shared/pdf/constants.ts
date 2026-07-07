/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║  APEX PDF — Shared Constants v4.0                                         ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */

import type { PDFSectionType } from "./types.js";

/** Approximate "height units" per printed page — used for page count estimation */
export const PAGE_UNIT = 2200;

/** Base height weight (in units) for each section type */
export const SECTION_BASE_WEIGHTS: Record<PDFSectionType, number> = {
  heading: 110,
  paragraph: 0,   // calculated dynamically by content length
  code: 0,        // calculated dynamically by line count
  math: 190,
  table: 0,       // calculated dynamically by row count
  list: 0,        // calculated dynamically by item count
  image: 300,
  divider: 40,
  quote: 170,
  callout: 170,
  qa: 340,
  "stat-card": 0, // calculated dynamically by card count
  timeline: 0,    // calculated dynamically by event count
  "two-column": 300,
  "chart-svg": 340,
  badge: 80,
  "highlight-box": 170,
  "numbered-list": 0, // calculated dynamically by item count
  watermark: 0,
  flashcard: 280,
  "mcq-question": 340,
  "exam-header": 180,
  "answer-key": 220,
};

/** Section types that always force a page break before them */
export const PAGE_BREAK_BEFORE_TYPES: ReadonlySet<PDFSectionType> = new Set<PDFSectionType>([
  "exam-header",
  "answer-key",
]);

/** Max pages before TOC needs a second page */
export const TOC_OVERFLOW_THRESHOLD = 25;

/** PDF cache TTL in milliseconds */
export const PDF_CACHE_TTL_MS = 1000 * 60 * 60; // 1 hour

/** HTML cache TTL in milliseconds */
export const HTML_CACHE_TTL_MS = 1000 * 60 * 30; // 30 minutes

/** Maximum concurrent browser instances in the pool */
export const BROWSER_POOL_MAX = 3;

/** Maximum pages per browser instance */
export const PAGES_PER_BROWSER_MAX = 5;

/** PDF generation timeout in milliseconds */
export const PDF_GENERATION_TIMEOUT_MS = 90_000;

/** Maximum retries for PDF generation */
export const PDF_MAX_RETRIES = 3;

/** Browser launch arguments for headless Chromium */
export const BROWSER_LAUNCH_ARGS = [
  "--no-sandbox",
  "--disable-setuid-sandbox",
  "--disable-dev-shm-usage",
  "--font-render-hinting=full",
  "--force-color-profile=srgb",
  "--disable-gpu",
] as const;
