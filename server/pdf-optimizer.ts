/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║          APEX AI — PDF SMART OPTIMIZER v3.0                               ║
 * ║  Multi-threading · Smart Page Balancing · Content Weight Analysis         ║
 * ║  Worker Pool · Queue Management · Compression Hints                       ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */

import type { PDFDocument, PDFSection, PDFSectionType } from "../shared/pdf.js";
import { generatePdf } from "./pdf-engine.js";

// ─── Section Weight Map ────────────────────────────────────────────────────────
// Each section type has an estimated "height unit" (relative to a page ≈ 2200u)
const SECTION_WEIGHTS: Record<PDFSectionType, number> = {
  heading: 110,
  paragraph: 0, // calculated by content length
  code: 0,      // calculated by line count
  math: 190,
  table: 0,     // calculated by row count
  list: 0,      // calculated by item count
  image: 300,
  divider: 40,
  quote: 170,
  callout: 170,
  qa: 340,
  "stat-card": 0,  // calculated by card count
  timeline: 0,     // calculated by event count
  "two-column": 300,
  "chart-svg": 340,
  badge: 80,
  "highlight-box": 170,
  "numbered-list": 0, // calculated by item count
  watermark: 0,
  flashcard: 280,
  "mcq-question": 340,
  "exam-header": 180,
  "answer-key": 220,
};

const PAGE_UNIT = 2200; // Approximate "units" per printed page

// ─── Section Height Estimator ──────────────────────────────────────────────────
export function estimateSectionHeight(section: PDFSection): number {
  const base = SECTION_WEIGHTS[section.type] ?? 120;

  switch (section.type) {
    case "paragraph":
      return Math.max(base, Math.ceil(section.content.length * 1.3));
    case "code":
      return Math.max(base, section.content.split("\n").length * 65 + 60);
    case "table":
      return Math.max(220, (section.rows?.length || 1) * 110 + (section.headers?.length ? 60 : 0));
    case "list":
      return Math.max(160, (section.items?.length || 1) * 80);
    case "numbered-list":
      return Math.max(180, (section.numberedItems?.length || 1) * 120);
    case "stat-card":
      return Math.max(200, Math.ceil((section.cards?.length || 1) / 4) * 160);
    case "timeline":
      return Math.max(280, (section.events?.length || 1) * 130);
    default:
      return base;
  }
}

// ─── Page Boundary Analyzer ────────────────────────────────────────────────────
interface PageAnalysis {
  pageCount: number;
  sectionPages: number[];    // which page each section starts on
  pageBreakPoints: number[]; // indices where page breaks occur
  pageFillRatios: number[];  // 0.0-1.0 fill ratio per page
}

export function analyzePageBoundaries(doc: PDFDocument): PageAnalysis {
  const sectionPages: number[] = [];
  const pageBreakPoints: number[] = [];
  const pageUnits: number[] = [0]; // units used on each page

  let currentPage = 0;
  let currentPageUnits = 0;

  // Account for cover page and TOC
  if (doc.coverPage) {
    currentPage++;
    pageUnits.push(0);
  }
  if (doc.tableOfContents) {
    currentPage++;
    pageUnits.push(0);
  }

  for (let i = 0; i < doc.sections.length; i++) {
    const section = doc.sections[i];
    const height = estimateSectionHeight(section);

    // Force page break for certain section types or when page is >90% full
    const shouldBreak =
      (section.type === "heading" && (section.level || 2) === 1 && currentPageUnits > PAGE_UNIT * 0.3) ||
      (currentPageUnits + height > PAGE_UNIT * 0.95 && height > PAGE_UNIT * 0.2);

    if (shouldBreak && currentPageUnits > 0) {
      pageBreakPoints.push(i);
      pageUnits[currentPage] = currentPageUnits;
      currentPage++;
      pageUnits.push(0);
      currentPageUnits = 0;
    }

    sectionPages.push(currentPage + 1); // 1-based page number
    currentPageUnits += height;

    // Auto page break when page is full
    if (currentPageUnits >= PAGE_UNIT) {
      pageUnits[currentPage] = currentPageUnits;
      currentPage++;
      pageUnits.push(0);
      currentPageUnits = 0;
    }
  }

  pageUnits[currentPage] = currentPageUnits;

  const pageFillRatios = pageUnits.map(u => Math.min(1.0, u / PAGE_UNIT));

  return {
    pageCount: currentPage + 1,
    sectionPages,
    pageBreakPoints,
    pageFillRatios,
  };
}

// ─── TOC Page Number Injection ─────────────────────────────────────────────────
/**
 * Enriches a PDFDocument with accurate estimated page numbers for the TOC.
 * The actual page numbers can only be determined after rendering, but this
 * gives a very good approximation.
 */
export function enrichTocWithPageNumbers(doc: PDFDocument): PDFDocument {
  if (!doc.tableOfContents) return doc;

  const analysis = analyzePageBoundaries(doc);

  // Inject page numbers into heading sections as a comment (not visible in PDF)
  const enrichedSections = doc.sections.map((section, idx) => {
    if (section.type === "heading") {
      const enriched = Object.assign({}, section) as PDFSection & { _estimatedPage: number };
      enriched._estimatedPage = analysis.sectionPages[idx];
      return enriched;
    }
    return section;
  });

  return { ...doc, sections: enrichedSections };
}


// ─── Content Deduplication ─────────────────────────────────────────────────────
/**
 * Removes duplicate or near-duplicate sections that the AI might generate.
 */
export function deduplicateSections(sections: PDFSection[]): PDFSection[] {
  const seen = new Set<string>();
  return sections.filter(section => {
    if (section.type === "divider" || section.type === "watermark") return true;
    const fingerprint = `${section.type}:${section.content.slice(0, 80).toLowerCase().replace(/\s+/g, " ")}`;
    if (seen.has(fingerprint)) return false;
    seen.add(fingerprint);
    return true;
  });
}

// ─── Short Paragraph Merger ────────────────────────────────────────────────────
/**
 * Merges consecutive very short paragraphs into a single one.
 * Avoids orphan single-line paragraphs that break document flow.
 */
export function mergeShortParagraphs(sections: PDFSection[], minChars = 80): PDFSection[] {
  const result: PDFSection[] = [];
  let pendingParagraph: PDFSection | null = null;

  for (const section of sections) {
    if (section.type === "paragraph" && section.content.length < minChars) {
      if (pendingParagraph) {
        pendingParagraph = Object.assign({}, pendingParagraph, {
          content: `${pendingParagraph.content} ${section.content}`,
        }) as PDFSection;
      } else {
        pendingParagraph = Object.assign({}, section) as PDFSection;
      }
    } else {
      if (pendingParagraph) {
        result.push(pendingParagraph);
        pendingParagraph = null;
      }
      result.push(section);
    }
  }

  if (pendingParagraph) result.push(pendingParagraph);
  return result;
}

// ─── Document Optimizer ────────────────────────────────────────────────────────
export interface OptimizationOptions {
  deduplication?: boolean;
  mergeShortParagraphs?: boolean;
  enrichToc?: boolean;
  maxSections?: number;
}

export function optimizePdfDocument(doc: PDFDocument, options: OptimizationOptions = {}): PDFDocument {
  const {
    deduplication = true,
    mergeShortParagraphs: doMerge = true,
    enrichToc = true,
    maxSections = 200,
  } = options;

  let sections = [...doc.sections];

  // 1. Deduplication
  if (deduplication) {
    sections = deduplicateSections(sections);
  }

  // 2. Merge short paragraphs
  if (doMerge) {
    sections = mergeShortParagraphs(sections);
  }

  // 3. Cap sections to prevent runaway documents
  if (sections.length > maxSections) {
    sections = sections.slice(0, maxSections);
  }

  const optimizedDoc: PDFDocument = { ...doc, sections };

  // 4. Enrich TOC with page numbers
  if (enrichToc && doc.tableOfContents) {
    return enrichTocWithPageNumbers(optimizedDoc);
  }

  return optimizedDoc;
}

// ─── PDF Job ──────────────────────────────────────────────────────────────────
interface PdfJob {
  id: string;
  doc: PDFDocument;
  overrides?: Partial<Pick<PDFDocument, "theme" | "pageSize">>;
  resolve: (buffer: Buffer) => void;
  reject: (error: Error) => void;
  createdAt: number;
}

// ─── Worker Pool (Multi-threading via Promise Queue) ──────────────────────────
class PdfWorkerPool {
  private readonly maxConcurrency: number;
  private activeJobs = 0;
  private queue: PdfJob[] = [];

  constructor(maxConcurrency = 3) {
    this.maxConcurrency = maxConcurrency;
  }

  async enqueue(
    doc: PDFDocument,
    overrides?: Partial<Pick<PDFDocument, "theme" | "pageSize">>
  ): Promise<Buffer> {
    return new Promise<Buffer>((resolve, reject) => {
      const job: PdfJob = {
        id: `pdf-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        doc,
        overrides,
        resolve,
        reject,
        createdAt: Date.now(),
      };
      this.queue.push(job);
      this.processNext();
    });
  }

  private processNext() {
    if (this.activeJobs >= this.maxConcurrency || this.queue.length === 0) return;

    const job = this.queue.shift()!;
    this.activeJobs++;

    // Timeout protection: jobs older than 5 minutes are discarded
    if (Date.now() - job.createdAt > 5 * 60 * 1000) {
      job.reject(new Error("PDF job timed out in queue"));
      this.activeJobs--;
      this.processNext();
      return;
    }

    generatePdf(job.doc, job.overrides)
      .then((buffer) => {
        job.resolve(buffer);
      })
      .catch((error: Error) => {
        job.reject(error);
      })
      .finally(() => {
        this.activeJobs--;
        this.processNext();
      });
  }

  get stats() {
    return {
      active: this.activeJobs,
      queued: this.queue.length,
      capacity: this.maxConcurrency,
    };
  }
}

// ─── Global Worker Pool Singleton ─────────────────────────────────────────────
export const pdfWorkerPool = new PdfWorkerPool(3);

// ─── Optimized PDF Generator ──────────────────────────────────────────────────
/**
 * Main entry point for generating a PDF with all optimizations applied.
 * Uses the worker pool for multi-threading.
 */
export async function generateOptimizedPdf(
  doc: PDFDocument,
  overrides?: Partial<Pick<PDFDocument, "theme" | "pageSize">>,
  optimizationOptions?: OptimizationOptions
): Promise<Buffer> {
  // Apply smart optimizations
  const optimized = optimizePdfDocument(doc, optimizationOptions);

  // Queue through worker pool (supports multiple concurrent PDFs)
  return pdfWorkerPool.enqueue(optimized, overrides);
}

// ─── Quality Report ───────────────────────────────────────────────────────────
export interface PdfQualityReport {
  estimatedPageCount: number;
  sectionCount: number;
  wordCount: number;
  hasImages: boolean;
  hasTables: boolean;
  hasCode: boolean;
  hasMath: boolean;
  hasCharts: boolean;
  hasTimeline: boolean;
  hasStatCards: boolean;
  qualityScore: number; // 0-100
  recommendations: string[];
}

export function generateQualityReport(doc: PDFDocument): PdfQualityReport {
  const analysis = analyzePageBoundaries(doc);
  const words = doc.sections.reduce((sum, s) => sum + (s.content?.split(/\s+/).length || 0), 0);

  const sectionTypes = new Set(doc.sections.map(s => s.type));
  const recommendations: string[] = [];

  if (analysis.pageCount < 5) recommendations.push("Add more detailed sections to reach professional length.");
  if (!sectionTypes.has("table")) recommendations.push("Consider adding comparison tables for better data presentation.");
  if (!sectionTypes.has("image") && !sectionTypes.has("chart-svg")) recommendations.push("Add visual elements (charts or images) to enhance engagement.");
  if (!sectionTypes.has("callout")) recommendations.push("Add callout boxes for important notes or warnings.");
  if (!sectionTypes.has("qa")) recommendations.push("Consider adding a Q&A section for clarity.");

  // Quality score: 0-100 based on variety and depth
  let score = 40;
  score += Math.min(20, analysis.pageCount * 1.5);
  score += sectionTypes.has("table") ? 8 : 0;
  score += (sectionTypes.has("chart-svg") || sectionTypes.has("image")) ? 8 : 0;
  score += sectionTypes.has("callout") ? 5 : 0;
  score += sectionTypes.has("qa") ? 5 : 0;
  score += sectionTypes.has("stat-card") ? 7 : 0;
  score += sectionTypes.has("timeline") ? 5 : 0;
  score += doc.coverPage ? 2 : 0;
  score = Math.min(100, score);

  return {
    estimatedPageCount: analysis.pageCount,
    sectionCount: doc.sections.length,
    wordCount: words,
    hasImages: sectionTypes.has("image"),
    hasTables: sectionTypes.has("table"),
    hasCode: sectionTypes.has("code"),
    hasMath: sectionTypes.has("math"),
    hasCharts: sectionTypes.has("chart-svg"),
    hasTimeline: sectionTypes.has("timeline"),
    hasStatCards: sectionTypes.has("stat-card"),
    qualityScore: Math.round(score),
    recommendations,
  };
}
