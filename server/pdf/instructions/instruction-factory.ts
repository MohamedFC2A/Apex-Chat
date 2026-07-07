/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║  APEX PDF — Instruction Factory v4.0 (Strategy Pattern)                  ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */

import type { ParsedPdfRequest, PDFDocumentMode } from "../../../shared/pdf/types.js";
import type { BaseInstructionBuilder } from "./base-instruction-builder.js";
import { StudyInstructionBuilder } from "./study-instruction-builder.js";
import { ExamInstructionBuilder } from "./exam-instruction-builder.js";
import { QuizInstructionBuilder } from "./quiz-instruction-builder.js";
import { WorksheetInstructionBuilder } from "./worksheet-instruction-builder.js";
import { FlashcardInstructionBuilder } from "./flashcard-instruction-builder.js";

export class PdfInstructionFactory {
  private builders = new Map<PDFDocumentMode, BaseInstructionBuilder>([
    ["study",     new StudyInstructionBuilder()],
    ["exam",      new ExamInstructionBuilder()],
    ["quiz",      new QuizInstructionBuilder()],
    ["worksheet", new WorksheetInstructionBuilder()],
    ["flashcard", new FlashcardInstructionBuilder()],
  ]);

  build(request: ParsedPdfRequest): string {
    const builder = this.builders.get(request.mode) ?? this.builders.get("study")!;
    return builder.build(request);
  }
}

// Singleton export
export const pdfInstructionFactory = new PdfInstructionFactory();

export function buildPdfGenerationInstructions(request: ParsedPdfRequest): string {
  return pdfInstructionFactory.build(request);
}

export function buildPdfRepairInstructions(request: ParsedPdfRequest, rawResponse: string): string {
  if (request.language === "ar") {
    return `الرد السابق لم يطابق تنسيق PDF المطلوب.
الموضوع الإلزامي: ${request.topic}
أعد كتابة الرد بالكامل الآن ككتلة \`\`\`pdf-document واحدة فقط وبداخلها JSON صالح فقط.
هذا هو الرد السابق لإصلاحه:
${rawResponse}`;
  }
  return `The previous response did not match the required PDF format.
Required topic: ${request.topic}
Rewrite the entire answer now as exactly one \`\`\`pdf-document block containing valid JSON only.
Here is the previous response to repair or rebuild:
${rawResponse}`;
}
