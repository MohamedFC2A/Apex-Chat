/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║  APEX PDF — Base Instruction Builder v4.0                                 ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */

import type { ParsedPdfRequest } from "../../../shared/pdf/types.js";

export abstract class BaseInstructionBuilder {
  abstract build(request: ParsedPdfRequest): string;

  protected resolveTheme(request: ParsedPdfRequest): string {
    return request.theme || "dark";
  }

  protected resolvePageSize(request: ParsedPdfRequest): string {
    return request.pageSize || "a4";
  }

  protected resolveQuestionCount(request: ParsedPdfRequest, defaultCount = 10): number {
    return request.questionCount || defaultCount;
  }
}
