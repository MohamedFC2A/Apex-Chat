/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║  APEX PDF — Zod Validation Schema v4.0                                    ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */

import { z } from "zod";

export const PDF_SECTION_TYPES = [
  "heading", "paragraph", "code", "math", "table", "list",
  "image", "divider", "quote", "callout", "qa",
  "stat-card", "timeline", "two-column", "chart-svg",
  "badge", "highlight-box", "numbered-list", "watermark",
  "mcq-question", "exam-header", "answer-key", "flashcard",
] as const;

export const PDF_SCHEMA = z.object({
  title: z.string().min(1),
  subtitle: z.string().optional(),
  author: z.string().optional(),
  date: z.string().optional(),
  language: z.enum(["ar", "en", "mixed"]),
  theme: z.enum(["dark", "light", "auto"]).default("dark"),
  pageSize: z.enum(["a4", "letter"]).default("a4"),
  coverPage: z.boolean().default(true),
  tableOfContents: z.boolean().default(true),
  sections: z.array(
    z.object({
      id: z.string().min(1),
      type: z.enum(PDF_SECTION_TYPES),
      level: z.number().int().min(1).max(6).optional(),
      language: z.string().optional(),
      direction: z.enum(["rtl", "ltr"]).optional(),
      content: z.string(),
      items: z.array(z.string()).optional(),
      rows: z.array(z.array(z.string())).optional(),
      headers: z.array(z.string()).optional(),
      totalRow: z.boolean().optional(),
      variant: z.enum(["info", "warning", "success", "error", "primary", "secondary"]).optional(),
      caption: z.string().optional(),
      question: z.string().optional(),
      answer: z.string().optional(),
      cards: z.array(z.object({
        value: z.string(), label: z.string(), unit: z.string().optional(),
        trend: z.enum(["up", "down", "flat"]).optional(), trendValue: z.string().optional(),
        icon: z.string().optional(), color: z.string().optional(),
      })).optional(),
      events: z.array(z.object({
        date: z.string(), title: z.string(), description: z.string().optional(),
        icon: z.string().optional(), color: z.string().optional(),
      })).optional(),
      columns: z.object({
        left: z.string(), right: z.string(),
        leftHeading: z.string().optional(), rightHeading: z.string().optional(),
      }).optional(),
      chartType: z.enum(["bar", "pie", "line", "donut"]).optional(),
      chartData: z.array(z.object({
        label: z.string(), value: z.number(), color: z.string().optional(),
      })).optional(),
      chartTitle: z.string().optional(),
      chartHeight: z.number().optional(),
      watermarkText: z.string().optional(),
      watermarkOpacity: z.number().optional(),
      numberedItems: z.array(z.object({
        number: z.string(), title: z.string(), description: z.string().optional(),
      })).optional(),
      boxColor: z.string().optional(),
      boxIcon: z.string().optional(),
      badges: z.array(z.object({
        text: z.string(), variant: z.string().optional(),
      })).optional(),
      showAnswer: z.boolean().optional(),
      mcqQuestion: z.object({
        questionNumber: z.number().optional(),
        questionText: z.string(),
        options: z.object({ a: z.string(), b: z.string(), c: z.string(), d: z.string() }),
        correctAnswer: z.enum(["a","b","c","d"]).optional(),
        explanation: z.string().optional(),
        points: z.number().optional(),
      }).optional(),
      examMeta: z.object({
        subject: z.string().optional(), grade: z.string().optional(),
        duration: z.string().optional(), totalMarks: z.number().optional(),
        studentNameField: z.boolean().optional(), dateField: z.boolean().optional(),
        instructions: z.array(z.string()).optional(),
      }).optional(),
      flashcards: z.array(z.object({
        front: z.string(), back: z.string(),
        hint: z.string().optional(), category: z.string().optional(),
      })).optional(),
    })
  ).min(1),
  metadata: z.object({
    subject: z.string().optional(), keywords: z.array(z.string()).optional(),
    category: z.string().optional(), watermark: z.string().optional(),
    watermarkOpacity: z.number().optional(),
  }).optional(),
});

export type PDFDocumentValidated = z.infer<typeof PDF_SCHEMA>;
