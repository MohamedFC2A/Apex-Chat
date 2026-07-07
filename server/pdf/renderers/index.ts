import type { PDFSectionType } from "../../../shared/pdf/types.js";
import type { SectionRenderer } from "./base-renderer.js";
import { HeadingRenderer } from "./heading-renderer.js";
import { ParagraphRenderer } from "./paragraph-renderer.js";
import { CodeRenderer } from "./code-renderer.js";
import { MathRenderer } from "./math-renderer.js";
import { TableRenderer } from "./table-renderer.js";
import { ListRenderer } from "./list-renderer.js";
import { ImageRenderer } from "./image-renderer.js";
import { DividerRenderer } from "./divider-renderer.js";
import { QuoteRenderer } from "./quote-renderer.js";
import { CalloutRenderer } from "./callout-renderer.js";
import { QARenderer } from "./qa-renderer.js";
import { StatCardRenderer } from "./stat-card-renderer.js";
import { TimelineRenderer } from "./timeline-renderer.js";
import { TwoColumnRenderer } from "./two-column-renderer.js";
import { ChartSvgRenderer } from "./chart-svg-renderer.js";
import { BadgeRenderer } from "./badge-renderer.js";
import { HighlightBoxRenderer } from "./highlight-box-renderer.js";
import { NumberedListRenderer } from "./numbered-list-renderer.js";
import { WatermarkRenderer } from "./watermark-renderer.js";
import { MCQQuestionRenderer } from "./mcq-question-renderer.js";
import { ExamHeaderRenderer } from "./exam-header-renderer.js";
import { AnswerKeyRenderer } from "./answer-key-renderer.js";
import { FlashcardRenderer } from "./flashcard-renderer.js";

export * from "./base-renderer.js";
export * from "./heading-renderer.js";
export * from "./paragraph-renderer.js";
export * from "./code-renderer.js";
export * from "./math-renderer.js";
export * from "./table-renderer.js";
export * from "./list-renderer.js";
export * from "./image-renderer.js";
export * from "./divider-renderer.js";
export * from "./quote-renderer.js";
export * from "./callout-renderer.js";
export * from "./qa-renderer.js";
export * from "./stat-card-renderer.js";
export * from "./timeline-renderer.js";
export * from "./two-column-renderer.js";
export * from "./chart-svg-renderer.js";
export * from "./badge-renderer.js";
export * from "./highlight-box-renderer.js";
export * from "./numbered-list-renderer.js";
export * from "./watermark-renderer.js";
export * from "./mcq-question-renderer.js";
export * from "./exam-header-renderer.js";
export * from "./answer-key-renderer.js";
export * from "./flashcard-renderer.js";

export const RENDERERS: Record<PDFSectionType, SectionRenderer> = {
  heading: new HeadingRenderer(),
  paragraph: new ParagraphRenderer(),
  code: new CodeRenderer(),
  math: new MathRenderer(),
  table: new TableRenderer(),
  list: new ListRenderer(),
  image: new ImageRenderer(),
  divider: new DividerRenderer(),
  quote: new QuoteRenderer(),
  callout: new CalloutRenderer(),
  qa: new QARenderer(),
  "stat-card": new StatCardRenderer(),
  timeline: new TimelineRenderer(),
  "two-column": new TwoColumnRenderer(),
  "chart-svg": new ChartSvgRenderer(),
  badge: new BadgeRenderer(),
  "highlight-box": new HighlightBoxRenderer(),
  "numbered-list": new NumberedListRenderer(),
  watermark: new WatermarkRenderer(),
  "mcq-question": new MCQQuestionRenderer(),
  "exam-header": new ExamHeaderRenderer(),
  "answer-key": new AnswerKeyRenderer(),
  flashcard: new FlashcardRenderer(),
};
