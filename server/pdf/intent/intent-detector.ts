/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║  APEX PDF — Intent Detector v4.0                                          ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */

const PDF_INTENT_REGEX =
  /(?:^|\s)(?:pdf|document|report|export\s+pdf|create\s+(?:a\s+)?(?:pdf|document|report)|generate\s+(?:a\s+)?(?:pdf|document|report)|convert\s+to\s+pdf)(?:\s|$)|(?:ملف\s*pdf|بي\s*دي\s*اف|وثيقة|مستند|تقرير|حو[ّو]ل(?:ه|ها)?\s*(?:ل|إلى)?\s*pdf|اعم[للي]*\s*pdf|صد[ّ]?ر(?:ها|ه)?\s*(?:pdf)?)/i;

const SYSTEM_DIRECTIVE = "SYSTEM DIRECTIVE: You must output a structured PDF document block";

export interface PdfIntentResult {
  hasPdfIntent: boolean;
  triggeredByDirective: boolean;
}

export function detectPdfIntent(message: string): PdfIntentResult {
  const triggeredByDirective = message.includes(SYSTEM_DIRECTIVE);
  return {
    hasPdfIntent: triggeredByDirective || PDF_INTENT_REGEX.test(message),
    triggeredByDirective,
  };
}
