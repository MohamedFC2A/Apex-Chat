/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║  APEX PDF — Mode Detector v4.0                                            ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */

import type { PDFDocumentMode } from "../../../shared/pdf/types.js";

const EXAM_REGEX = /(?:ورقة\s*امتحان|نموذج\s*امتحان|امتحان\s*(?:pdf|مستند|ورقة)|اسئلة\s*امتحان|exam\s*(?:pdf|paper|sheet)|test\s*(?:pdf|paper|sheet)|examination\s*pdf|create\s*(?:an?\s*)?exam|generate\s*(?:an?\s*)?exam|ورقة\s*اختبار|اختبار\s*(?:pdf|ورقة|رسمي))/i;

const QUIZ_REGEX = /(?:اسئلة|أسئلة|اسئله)\s*(?:pdf|في|ب|داخل)|(?:pdf|مستند)\s*(?:فيه|يحتوي|يشمل|مع)\s*(?:اسئلة|أسئلة|اختيارات|اختيار)|(?:quiz|questions?|mcq|multiple.?choice)\s*(?:pdf|document|file)|pdf\s*(?:with|containing?)\s*(?:questions?|quiz|mcq)|(?:اختيار\s*متعدد|اختيارات\s*متعددة)\s*(?:في\s*)?(?:pdf|مستند)/i;

const WORKSHEET_REGEX = /(?:ورقة\s*عمل|تمارين|تدريبات|exercises?|worksheet|practice\s*(?:pdf|sheet)|activity\s*(?:pdf|sheet)|ورقة\s*تدريب|تمرين\s*(?:pdf|في))/i;

const FLASHCARD_REGEX = /(?:بطاقات?\s*(?:مراجعة|تعليمية|دراسية)|flash\s*cards?|flashcards?|study\s*cards?|revision\s*cards?|memory\s*cards?|بطاقة\s*(?:تعلم|حفظ))/i;

export function detectPdfMode(message: string): PDFDocumentMode {
  if (FLASHCARD_REGEX.test(message)) return "flashcard";
  if (EXAM_REGEX.test(message)) return "exam";
  if (QUIZ_REGEX.test(message)) return "quiz";
  if (WORKSHEET_REGEX.test(message)) return "worksheet";
  return "study";
}

export function isPdfExamOrQuizMode(message: string): boolean {
  return EXAM_REGEX.test(message) || QUIZ_REGEX.test(message) ||
    WORKSHEET_REGEX.test(message) || FLASHCARD_REGEX.test(message);
}
