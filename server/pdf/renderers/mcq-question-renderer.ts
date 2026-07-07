import type { PDFSection, RenderContext } from "../../../shared/pdf/types.js";
import type { SectionRenderer } from "./base-renderer.js";
import { renderInline, resolveDirection, escapeHtml } from "./base-renderer.js";

export class MCQQuestionRenderer implements SectionRenderer {
  render(section: PDFSection, context: RenderContext): string {
    const dir = resolveDirection(section, context.docLanguage);
    const classes = `pdf-section section-${section.type} dir-${dir}`;
    const isRtl = dir === "rtl";
    
    const q = section.mcqQuestion;
    if (!q) {
      return `<section class="${classes}" dir="${dir}"></section>`;
    }

    const showAnswer = section.showAnswer === true;
    const optionLabels = isRtl ? ["أ", "ب", "ج", "د"] : ["A", "B", "C", "D"];
    const optionKeys: Array<"a" | "b" | "c" | "d"> = ["a", "b", "c", "d"];
    const questionLabel = isRtl ? `السؤال ${q.questionNumber || ""}` : `Question ${q.questionNumber || ""}`;
    const pointsLabel = q.points ? (isRtl ? `${q.points} درجات` : `${q.points} pts`) : "";

    const options = optionKeys.map((key, idx) => {
      const text = q.options[key];
      const label = optionLabels[idx];
      const isCorrect = showAnswer && q.correctAnswer === key;
      const correctClass = isCorrect ? " mcq-opt-correct" : "";
      return `<div class="mcq-option${correctClass}" dir="${isRtl ? "rtl" : "ltr"}">
        <span class="mcq-opt-label${isCorrect ? " mcq-opt-label-correct" : ""}">${escapeHtml(label)}</span>
        <span class="mcq-opt-text">${renderInline(text)}</span>
        ${isCorrect ? `<span class="mcq-correct-badge">${isRtl ? "✓ صحيح" : "✓ Correct"}</span>` : ""}
      </div>`;
    }).join("");

    const blockHtml = `<div class="mcq-question-block" dir="${isRtl ? "rtl" : "ltr"}">
      <div class="mcq-question-header">
        <span class="mcq-question-num">${escapeHtml(questionLabel)}</span>
        ${pointsLabel ? `<span class="mcq-points-badge">${escapeHtml(pointsLabel)}</span>` : ""}
      </div>
      <div class="mcq-question-text">${renderInline(q.questionText)}</div>
      <div class="mcq-options">${options}</div>
      ${showAnswer && q.explanation ? `<div class="mcq-explanation" dir="${isRtl ? "rtl" : "ltr"}">
        <span class="mcq-explanation-label">${isRtl ? "الشرح:" : "Explanation:"}</span>
        ${renderInline(q.explanation)}
      </div>` : ""}
    </div>`;

    return `<section class="${classes}" dir="${dir}">${blockHtml}</section>`;
  }
}
