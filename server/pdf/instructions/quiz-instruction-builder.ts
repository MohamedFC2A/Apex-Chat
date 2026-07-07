import type { ParsedPdfRequest } from "../../../shared/pdf/types.js";
import { BaseInstructionBuilder } from "./base-instruction-builder.js";

export class QuizInstructionBuilder extends BaseInstructionBuilder {
  build(request: ParsedPdfRequest): string {
    const count = this.resolveQuestionCount(request);
    if (request.language === "ar") {
      return `أنشئ مستند PDF اختبار قصير يحتوي على ${count} أسئلة مع الإجابات الصحيحة.
الموضوع: ${request.topic}
قواعد:
1. كتلة \`\`\`pdf-document واحدة فقط بداخلها JSON صالح.
2. heading → ${count} سؤال mcq-question مع showAnswer: true والشرح → callout success.
3. اجعل الأسئلة تعليمية مع شرح واضح لكل إجابة.`;
    }
    return `Generate a quiz PDF with ${count} questions and visible correct answers.
Topic: ${request.topic}
Rules:
1. One \`\`\`pdf-document block with valid JSON only.
2. heading → ${count} mcq-question sections (showAnswer: true) → success callout.
3. Each question must show correctAnswer and a clear explanation.`;
  }
}
