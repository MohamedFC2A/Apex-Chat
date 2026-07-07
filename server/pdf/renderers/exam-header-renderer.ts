import type { PDFSection, RenderContext } from "../../../shared/pdf/types.js";
import type { SectionRenderer } from "./base-renderer.js";
import { resolveDirection, escapeHtml } from "./base-renderer.js";

export class ExamHeaderRenderer implements SectionRenderer {
  render(section: PDFSection, context: RenderContext): string {
    const dir = resolveDirection(section, context.docLanguage);
    const classes = `pdf-section section-${section.type} exam-header-section dir-${dir}`;
    const isRtl = dir === "rtl";
    
    const meta = section.examMeta;
    const title = section.content || (isRtl ? "ورقة الامتحان" : "Exam Paper");

    const metaFields = [
      meta?.subject && `<div class="exam-meta-row"><span>${isRtl ? "المادة:" : "Subject:"}</span><span class="exam-meta-val">${escapeHtml(meta.subject)}</span></div>`,
      meta?.grade && `<div class="exam-meta-row"><span>${isRtl ? "المرحلة:" : "Grade:"}</span><span class="exam-meta-val">${escapeHtml(meta.grade)}</span></div>`,
      meta?.duration && `<div class="exam-meta-row"><span>${isRtl ? "المدة الزمنية:" : "Duration:"}</span><span class="exam-meta-val">${escapeHtml(meta.duration)}</span></div>`,
      meta?.totalMarks && `<div class="exam-meta-row"><span>${isRtl ? "الدرجة الكلية:" : "Total Marks:"}</span><span class="exam-meta-val">${meta.totalMarks}</span></div>`,
    ].filter(Boolean).join("");

    const nameField = meta?.studentNameField ? `
      <div class="exam-field-row" dir="${isRtl ? "rtl" : "ltr"}">
        <span class="exam-field-label">${isRtl ? "اسم الطالب:" : "Student Name:"}</span>
        <span class="exam-field-line">___________________________________</span>
      </div>` : "";

    const dateField = meta?.dateField ? `
      <div class="exam-field-row" dir="${isRtl ? "rtl" : "ltr"}">
        <span class="exam-field-label">${isRtl ? "التاريخ:" : "Date:"}</span>
        <span class="exam-field-line">__________________</span>
      </div>` : "";

    const instructions = meta?.instructions?.length ? `
      <div class="exam-instructions" dir="${isRtl ? "rtl" : "ltr"}">
        <div class="exam-instructions-title">${isRtl ? "تعليمات الامتحان:" : "Exam Instructions:"}</div>
        <ol>${meta.instructions.map(i => `<li>${escapeHtml(i)}</li>`).join("")}</ol>
      </div>` : "";

    const blockHtml = `<div class="exam-header-block" dir="${isRtl ? "rtl" : "ltr"}">
      <div class="exam-header-top">
        <div class="exam-institution">APEX AI — Academic Assessment</div>
        <div class="exam-header-logo">📋</div>
      </div>
      <div class="exam-title">${escapeHtml(title)}</div>
      <div class="exam-meta-grid">${metaFields}</div>
      <div class="exam-fields-row">${nameField}${dateField}</div>
      ${instructions}
      <div class="exam-divider-thick"></div>
    </div>`;

    return `<section class="${classes}" dir="${dir}">${blockHtml}</section>`;
  }
}
