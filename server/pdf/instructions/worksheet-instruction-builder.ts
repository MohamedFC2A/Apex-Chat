import type { ParsedPdfRequest } from "../../../shared/pdf/types.js";
import { BaseInstructionBuilder } from "./base-instruction-builder.js";

export class WorksheetInstructionBuilder extends BaseInstructionBuilder {
  build(request: ParsedPdfRequest): string {
    const count = this.resolveQuestionCount(request);
    if (request.language === "ar") {
      return `أنشئ ورقة عمل تعليمية كـ PDF JSON.
الموضوع: ${request.topic} | عدد التمارين: ${count}
اجمع بين: mcq-question، qa، numbered-list، highlight-box، callout.
ابدأ بـ heading يشرح أهداف ورقة العمل.`;
    }
    return `Generate an educational worksheet PDF in JSON.
Topic: ${request.topic} | Exercises: ${count}
Mix: mcq-question (with answers), qa (short answer), numbered-list (tasks), highlight-box (tips), callout.
Start with a heading explaining learning objectives.`;
  }
}
