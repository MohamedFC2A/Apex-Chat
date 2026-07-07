import type { ParsedPdfRequest } from "../../../shared/pdf/types.js";
import { BaseInstructionBuilder } from "./base-instruction-builder.js";

export class FlashcardInstructionBuilder extends BaseInstructionBuilder {
  build(request: ParsedPdfRequest): string {
    const count = this.resolveQuestionCount(request, 20);
    if (request.language === "ar") {
      return `أنشئ مستند PDF بطاقات مراجعة دراسية (Flash Cards).
الموضوع: ${request.topic} | عدد البطاقات: ${count}
الهيكل: heading → ${count} sections من نوع flashcard
كل بطاقة: وجه أمامي (سؤال/مصطلح) + وجه خلفي (إجابة/شرح) + تلميح + تصنيف.`;
    }
    return `Generate a study flashcard PDF document in JSON.
Topic: ${request.topic} | Cards: ${count}
Structure: heading → ${count} flashcard sections.
Each card: front (question/term), back (answer/definition), optional hint, category.`;
  }
}
