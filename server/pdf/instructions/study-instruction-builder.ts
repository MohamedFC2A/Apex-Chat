/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║  APEX PDF — Study Instruction Builder v4.0                                ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */

import type { ParsedPdfRequest } from "../../../shared/pdf/types.js";
import { BaseInstructionBuilder } from "./base-instruction-builder.js";

export class StudyInstructionBuilder extends BaseInstructionBuilder {
  build(request: ParsedPdfRequest): string {
    const sectionHints = request.requestedSections?.length
      ? request.requestedSections.join(", ")
      : request.language === "ar"
        ? "مقدمة، نقاط رئيسية، جداول مقارنة، رسوم بيانية، خط زمني، إحصاءات، خاتمة"
        : "introduction, key points, comparison tables, charts, timeline, statistics, conclusion";

    if (request.language === "ar") {
      return this._buildArabic(request, sectionHints);
    }
    return this._buildEnglish(request, sectionHints);
  }

  private _buildArabic(request: ParsedPdfRequest, sectionHints: string): string {
    const theme = this.resolveTheme(request);
    const pageSize = this.resolvePageSize(request);
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
2. نظّم المستند في **12 إلى 18 قسمًا** منطقيًا مرتبًا يغطي جوهر الموضوع:
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

  private _buildEnglish(request: ParsedPdfRequest, sectionHints: string): string {
    const theme = this.resolveTheme(request);
    const pageSize = this.resolvePageSize(request);
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
