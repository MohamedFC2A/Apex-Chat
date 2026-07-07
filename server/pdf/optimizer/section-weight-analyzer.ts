/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║  APEX PDF — Optimizer Section Weights, Flow & Optimizations v4.0          ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */

import type { PDFDocument, PDFSection } from "../../../shared/pdf/types.js";
import { SECTION_BASE_WEIGHTS, PAGE_UNIT, PAGE_BREAK_BEFORE_TYPES } from "../../../shared/pdf/constants.js";

export function estimateSectionHeight(section: PDFSection): number {
  const base = SECTION_BASE_WEIGHTS[section.type] ?? 120;

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

export interface PageAnalysis {
  pageCount: number;
  sectionPages: number[];
  pageBreakPoints: number[];
  pageFillRatios: number[];
}

export function analyzePageBoundaries(doc: PDFDocument): PageAnalysis {
  const sectionPages: number[] = [];
  const pageBreakPoints: number[] = [];
  const pageUnits: number[] = [0];

  let currentPage = 0;
  let currentPageUnits = 0;

  // Cover page and Table of Contents count as separate pages
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

    const shouldBreak =
      PAGE_BREAK_BEFORE_TYPES.has(section.type) ||
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

    if (currentPageUnits >= PAGE_UNIT) {
      pageUnits[currentPage] = currentPageUnits;
      currentPage++;
      pageUnits.push(0);
      currentPageUnits = 0;
    }
  }

  pageUnits[currentPage] = currentPageUnits;
  const pageFillRatios = pageUnits.map((u) => Math.min(1.0, u / PAGE_UNIT));

  return {
    pageCount: currentPage + 1,
    sectionPages,
    pageBreakPoints,
    pageFillRatios,
  };
}

export function estimatePdfPageCount(doc: PDFDocument): number {
  return analyzePageBoundaries(doc).pageCount;
}

/**
 * Enriches a PDFDocument with accurate estimated page numbers for the TOC.
 */
export function enrichTocWithPageNumbers(doc: PDFDocument): PDFDocument {
  if (!doc.tableOfContents) return doc;

  const analysis = analyzePageBoundaries(doc);

  const enrichedSections = doc.sections.map((section, idx) => {
    if (section.type === "heading") {
      const enriched = { ...section } as PDFSection & { _estimatedPage: number };
      enriched._estimatedPage = analysis.sectionPages[idx];
      return enriched;
    }
    return section;
  });

  return { ...doc, sections: enrichedSections };
}

/**
 * Removes duplicate or near-duplicate sections.
 */
export function deduplicateSections(sections: PDFSection[]): PDFSection[] {
  const seen = new Set<string>();
  return sections.filter((section) => {
    if (section.type === "divider" || section.type === "watermark") return true;
    const fingerprint = `${section.type}:${section.content.slice(0, 80).toLowerCase().replace(/\s+/g, " ")}`;
    if (seen.has(fingerprint)) return false;
    seen.add(fingerprint);
    return true;
  });
}

/**
 * Merges consecutive very short paragraphs into a single one.
 */
export function mergeShortParagraphs(sections: PDFSection[], minChars = 80): PDFSection[] {
  const result: PDFSection[] = [];
  let pendingParagraph: PDFSection | null = null;

  for (const section of sections) {
    if (section.type === "paragraph" && section.content.length < minChars) {
      if (pendingParagraph) {
        pendingParagraph = {
          ...(pendingParagraph as PDFSection),
          content: `${pendingParagraph.content} ${section.content}`,
        };
      } else {
        pendingParagraph = { ...section };
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

  if (deduplication) {
    sections = deduplicateSections(sections);
  }

  if (doMerge) {
    sections = mergeShortParagraphs(sections);
  }

  if (sections.length > maxSections) {
    sections = sections.slice(0, maxSections);
  }

  const optimizedDoc: PDFDocument = { ...doc, sections };

  if (enrichToc && doc.tableOfContents) {
    return enrichTocWithPageNumbers(optimizedDoc);
  }

  return optimizedDoc;
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
  qualityScore: number;
  recommendations: string[];
}

export function generateQualityReport(doc: PDFDocument): PdfQualityReport {
  const analysis = analyzePageBoundaries(doc);
  const words = doc.sections.reduce((sum, s) => sum + (s.content?.split(/\s+/).length || 0), 0);

  const sectionTypes = new Set(doc.sections.map((s) => s.type));
  const recommendations: string[] = [];

  if (analysis.pageCount < 5) recommendations.push("Add more detailed sections to reach professional length.");
  if (!sectionTypes.has("table")) recommendations.push("Consider adding comparison tables for better data presentation.");
  if (!sectionTypes.has("image") && !sectionTypes.has("chart-svg")) recommendations.push("Add visual elements (charts or images) to enhance engagement.");
  if (!sectionTypes.has("callout")) recommendations.push("Add callout boxes for important notes or warnings.");
  if (!sectionTypes.has("qa")) recommendations.push("Consider adding a Q&A section for clarity.");

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
