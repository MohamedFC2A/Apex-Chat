/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║  APEX PDF — Shared Type Definitions v4.0                                  ║
 * ║  Pure TypeScript interfaces and type aliases — zero runtime dependencies  ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */

export type PDFDocumentLanguage = "ar" | "en" | "mixed";
export type PDFDocumentTheme = "dark" | "light" | "auto";
export type PDFPageSize = "a4" | "letter";
export type PDFDocumentMode = "study" | "exam" | "quiz" | "worksheet" | "flashcard";

export type PDFSectionType =
  | "heading" | "paragraph" | "code" | "math" | "table" | "list"
  | "image" | "divider" | "quote" | "callout" | "qa"
  | "stat-card" | "timeline" | "two-column" | "chart-svg"
  | "badge" | "highlight-box" | "numbered-list" | "watermark"
  | "mcq-question" | "exam-header" | "answer-key" | "flashcard";

export interface ChartDataPoint {
  label: string;
  value: number;
  color?: string;
}

export interface TimelineEvent {
  date: string;
  title: string;
  description?: string;
  icon?: string;
  color?: string;
}

export interface StatCardData {
  value: string;
  label: string;
  unit?: string;
  trend?: "up" | "down" | "flat";
  trendValue?: string;
  icon?: string;
  color?: string;
}

export interface TwoColumnContent {
  left: string;
  right: string;
  leftHeading?: string;
  rightHeading?: string;
}

export interface MCQQuestionSection {
  questionNumber?: number;
  questionText: string;
  options: { a: string; b: string; c: string; d: string };
  correctAnswer?: "a" | "b" | "c" | "d";
  explanation?: string;
  points?: number;
}

export interface FlashcardData {
  front: string;
  back: string;
  hint?: string;
  category?: string;
}

export interface PDFSection {
  id: string;
  type: PDFSectionType;
  level?: number;
  language?: string;
  direction?: "rtl" | "ltr";
  content: string;
  items?: string[];
  rows?: string[][];
  headers?: string[];
  totalRow?: boolean;
  variant?: "info" | "warning" | "success" | "error" | "primary" | "secondary";
  caption?: string;
  question?: string;
  answer?: string;
  cards?: StatCardData[];
  events?: TimelineEvent[];
  columns?: TwoColumnContent;
  chartType?: "bar" | "pie" | "line" | "donut";
  chartData?: ChartDataPoint[];
  chartTitle?: string;
  chartHeight?: number;
  watermarkText?: string;
  watermarkOpacity?: number;
  numberedItems?: Array<{ number: string; title: string; description?: string }>;
  boxColor?: string;
  boxIcon?: string;
  badges?: Array<{ text: string; variant?: string }>;
  mcqQuestion?: MCQQuestionSection;
  showAnswer?: boolean;
  examMeta?: {
    subject?: string;
    grade?: string;
    duration?: string;
    totalMarks?: number;
    studentNameField?: boolean;
    dateField?: boolean;
    instructions?: string[];
  };
  flashcards?: FlashcardData[];
}

export interface PDFDocument {
  title: string;
  subtitle?: string;
  author?: string;
  date?: string;
  language: PDFDocumentLanguage;
  theme: PDFDocumentTheme;
  pageSize: PDFPageSize;
  coverPage: boolean;
  tableOfContents: boolean;
  sections: PDFSection[];
  isCommandAuthorized?: boolean;
  metadata?: {
    subject?: string;
    keywords?: string[];
    category?: string;
    watermark?: string;
    watermarkOpacity?: number;
  };
}

export interface ParsedPdfRequest {
  rawMessage: string;
  topic: string;
  language: PDFDocumentLanguage;
  requestedSections?: string[];
  includeCode: boolean;
  includeMath: boolean;
  includeTableOfContents: boolean;
  includeCoverPage: boolean;
  theme?: PDFDocumentTheme;
  pageSize?: PDFPageSize;
  mode: PDFDocumentMode;
  questionCount?: number;
  includeAnswerKey?: boolean;
  showAnswersInline?: boolean;
}

export interface PdfJobOptions {
  priority?: "high" | "normal" | "low";
  overrides?: Partial<Pick<PDFDocument, "theme" | "pageSize">>;
}

export interface PdfProgressEvent {
  jobId: string;
  stage: "queued" | "rendering" | "printing" | "complete" | "error";
  progress: number; // 0-100
  message?: string;
  downloadUrl?: string;
  error?: string;
}

export interface RenderContext {
  docLanguage: PDFDocumentLanguage;
  theme: "dark" | "light";
  isRtl: boolean;
}
