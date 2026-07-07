/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║  APEX PDF — Exam Instruction Builder v4.0                                 ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */

import type { ParsedPdfRequest } from "../../../shared/pdf/types.js";
import { BaseInstructionBuilder } from "./base-instruction-builder.js";

export class ExamInstructionBuilder extends BaseInstructionBuilder {
  build(request: ParsedPdfRequest): string {
    const count = this.resolveQuestionCount(request);
    const theme = this.resolveTheme(request);
    const pageSize = this.resolvePageSize(request);

    if (request.language === "ar") {
      return `أنشئ الآن ورقة امتحان رسمية واحترافية كـ PDF منظم بتنسيق JSON فقط.

المادة / الموضوع: ${request.topic}
عدد الأسئلة المطلوبة: ${count} سؤال اختيار من متعدد (4 خيارات لكل سؤال)
اللغة: عربي
الثيم: ${theme}
حجم الصفحة: ${pageSize}

قواعد إلزامية:
1. أخرج كتلة \`\`\`pdf-document واحدة فقط بداخلها JSON صالح.
2. هيكل الـ sections:
   أ) exam-header: معلومات ورقة الامتحان.
   ب) ${count} سؤال من نوع mcq-question مع showAnswer: false.
   ج) answer-key: جدول بمفاتيح الإجابات.
3. أسئلة متنوعة المستويات (سهل، متوسط، صعب).
4. استخدم direction: "rtl" لكل شيء.
5. أضف watermark: "نموذج امتحان — Apex AI".
أنشئ ${count} سؤال mcq-question كاملاً الآن.`;
    }

    return `Generate a formal, professional exam paper as a structured PDF in JSON format only.

Subject / Topic: ${request.topic}
Required questions: ${count} multiple-choice questions (4 options each)
Theme: ${theme} | Page size: ${pageSize}

Mandatory rules:
1. Output exactly one \`\`\`pdf-document block with valid JSON only.
2. Sections: exam-header → ${count} mcq-question (showAnswer: false) → answer-key.
3. Questions must be varied in difficulty and directly relevant to the topic.
4. Add watermark: "Exam Paper — Apex AI".
Generate all ${count} mcq-question sections now.`;
  }
}
