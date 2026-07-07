/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║  APEX PDF — Shared Prompt Instruction Builders v4.0                       ║
 * ║  Client-safe generation directives for LLM prompt engineering              ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */

import type { ParsedPdfRequest, PDFDocumentMode } from "./types.js";

export function buildPdfGenerationInstructions(request: ParsedPdfRequest): string {
  const theme = request.theme || "dark";
  const pageSize = request.pageSize || "a4";
  const count = request.questionCount || 10;

  switch (request.mode) {
    case "exam":
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
4. استخدم direction: \"rtl\" لكل شيء.
5. أضف watermark: \"نموذج امتحان — Apex AI\".
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
4. Add watermark: \"Exam Paper — Apex AI\".
Generate all ${count} mcq-question sections now.`;

    case "quiz":
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

    case "worksheet":
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

    case "flashcard":
      const flashcardCount = request.questionCount || 20;
      if (request.language === "ar") {
        return `أنشئ مستند PDF بطاقات مراجعة دراسية (Flash Cards).
الموضوع: ${request.topic} | عدد البطاقات: ${flashcardCount}
الهيكل: heading → ${flashcardCount} sections من نوع flashcard
كل بطاقة: وجه أمامي (سؤال/مصطلح) + وجه خلفي (إجابة/شرح) + تلميح + تصنيف.`;
      }
      return `Generate a study flashcard PDF document in JSON.
Topic: ${request.topic} | Cards: ${flashcardCount}
Structure: heading → ${flashcardCount} flashcard sections.
Each card: front (question/term), back (answer/definition), optional hint, category.`;

    case "study":
    default:
      const sectionHints = request.requestedSections?.length
        ? request.requestedSections.join(", ")
        : request.language === "ar"
          ? "مقدمة، نقاط رئيسية، جداول مقارنة، رسوم بيانية، خط زمني، إحصاءات، خاتمة"
          : "introduction, key points, comparison tables, charts, timeline, statistics, conclusion";

      if (request.language === "ar") {
        return `أنشئ الآن مستند PDF منظمًا تفصيليًا للغاية وكثيف المحتوى كهيكل JSON فقط.

الموضوع المطلوب: ${request.topic}
الأقسام المفضلة: ${sectionHints}
يتضمن كود: ${request.includeCode ? "نعم" : "لا"}
يتضمن معادلات: ${request.includeMath ? "نعم" : "لا"}
فهرس محتويات: ${request.includeTableOfContents ? "نعم" : "لا"}
صفحة غلاف: ${request.includeCoverPage ? "نعم" : "لا"}
ثيم المستند: ${theme}
حجم الصفحة: ${pageSize}

قواعد إلزامية لإنتاج مستند احترافي يناسب حد الـ tokens المتاح:
1. أخرج كتلة واحدة فقط باسم \`\`\`pdf-document وبداخلها JSON صالح فقط بدون أي نص خارجي.
2. نظّم المستند في **12 إلى 18 قسمًا** منظمًا منطقيًا يغطي جوهر الموضوع:
   - مقدمة شاملة (heading + paragraph). - **بطاقات إحصاء** (stat-card) بـ 4 بطاقات بألوان مبدعة.
   - **خط زمني** (timeline) بـ 4-5 أحداث. - **رسم بياني SVG** (chart-svg) واحد أو اثنان.
   - **تخطيط عمودين** (two-column) لمقارنة رئيسية. - **جدول** (table) تفصيلي.
   - **قوائم مرقمة** (numbered-list) للخطوات. - **صندوق تمييز** (highlight-box).
   - **أسئلة وأجوبة** (qa) 2-3 أسئلة. - **callout** تحذيري أو معلوماتي.
   - **اقتباس** (quote) ملهم. - **خاتمة** (paragraph) موجزة وعملية.
3. اكتب كل فقرة بـ **60-100 كلمة** ركيزة. الجودة تفوق الكمية.
4. استخدم direction = "rtl" للمحتوى العربي.
5. اضبط theme = "${theme}" و pageSize = "${pageSize}" في JSON.
6. ميّز المصطلحات الهامة بـ ==نص==. كل section يحتوي id و type و content دائمًا.`;
      }
      return `Generate a highly structured, extremely detailed, dense, and comprehensive PDF document as JSON only.

Required topic: ${request.topic}
Preferred sections: ${sectionHints}
Include code: ${request.includeCode ? "yes" : "no"}
Include math: ${request.includeMath ? "yes" : "no"}
Include table of contents: ${request.includeTableOfContents ? "yes" : "no"}
Include cover page: ${request.includeCoverPage ? "yes" : "no"}
Preferred document theme: ${theme}
Preferred page size: ${pageSize}

Mandatory rules for producing a high-quality professional document within the available token budget:
1. Output exactly one \`\`\`pdf-document block with valid JSON only. No text outside the block.
2. Structure the document into **12 to 18 logical sections** covering the topic's core:
   - Comprehensive introduction (heading + paragraph). - **Stat cards** (stat-card) 4+ cards with diverse colors.
   - **Timeline** (timeline) 4-5 events. - **SVG chart** (chart-svg) 1-2 charts best-fit for data.
   - **Two-column** layout for one key comparison. - **Table** with real data rows/columns.
   - **Numbered list** (numbered-list) for steps. - **Highlight box** for critical insight.
   - **Q&A** (qa) 2-3 questions with detailed answers. - **Callout** (info or warning).
   - **Quote** (quote) one inspiring quote. - **Conclusion** (paragraph) concise and actionable.
3. Write each paragraph in **60-100 focused words**. Quality over quantity.
4. Set theme = "${theme}" and pageSize = "${pageSize}" in JSON.
5. Highlight key terms using ==term==. Every section must include id, type, and content.`;
  }
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
