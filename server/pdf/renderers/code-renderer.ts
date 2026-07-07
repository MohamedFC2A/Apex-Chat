import type { PDFSection, RenderContext } from "../../../shared/pdf/types.js";
import type { SectionRenderer } from "./base-renderer.js";
import { escapeHtml, resolveDirection } from "./base-renderer.js";
import Prism from "prismjs";
import "prismjs/components/prism-markup.js";
import "prismjs/components/prism-css.js";
import "prismjs/components/prism-clike.js";
import "prismjs/components/prism-javascript.js";
import "prismjs/components/prism-c.js";
import "prismjs/components/prism-cpp.js";
import "prismjs/components/prism-csharp.js";
import "prismjs/components/prism-go.js";
import "prismjs/components/prism-kotlin.js";
import "prismjs/components/prism-ruby.js";
import "prismjs/components/prism-swift.js";
import "prismjs/components/prism-python.js";
import "prismjs/components/prism-bash.js";
import "prismjs/components/prism-sql.js";
import "prismjs/components/prism-rust.js";
import "prismjs/components/prism-json.js";
import "prismjs/components/prism-typescript.js";
import "prismjs/components/prism-jsx.js";
import "prismjs/components/prism-tsx.js";

function getPrismLanguage(language?: string): string {
  const normalized = (language || "text").toLowerCase();
  if (normalized === "ts") return "typescript";
  if (normalized === "js") return "javascript";
  if (normalized === "html") return "markup";
  if (normalized === "c++") return "cpp";
  if (normalized === "c#") return "csharp";
  return normalized;
}

export class CodeRenderer implements SectionRenderer {
  render(section: PDFSection, context: RenderContext): string {
    const dir = resolveDirection(section, context.docLanguage);
    const classes = `pdf-section section-${section.type} dir-${dir}`;
    const prismLanguage = getPrismLanguage(section.language);
    const grammar = Prism.languages[prismLanguage] || Prism.languages.plain || Prism.languages.markup;
    const highlighted = prismLanguage && grammar ? Prism.highlight(section.content, grammar, prismLanguage) : escapeHtml(section.content);
    const lines = highlighted.split("\n");
    const content = lines.map((line) => `<span class="code-line">${line || "&nbsp;"}</span>`).join("\n");

    const langBadge = section.language && section.language !== "text"
      ? `<span class="code-lang-badge">${escapeHtml(section.language.toUpperCase())}</span>`
      : "";

    return `
      <section class="${classes}" dir="ltr">
        <div class="code-block-wrapper">
          <div class="code-block-header">
            <div class="code-dots">
              <span class="dot dot-red"></span>
              <span class="dot dot-yellow"></span>
              <span class="dot dot-green"></span>
            </div>
            ${langBadge}
          </div>
          <pre class="code-block language-${prismLanguage}"><code>${content}</code></pre>
        </div>
      </section>`;
  }
}
