/**
 * APEX Unbound — Agent 2: HTML Agent
 *
 * Consumes the SystemSpec JSON and generates clean, semantic HTML5.
 * Enforces: ARIA attributes, descriptive IDs, no inline CSS/JS.
 *
 * Output: Raw HTML string (body content + full document structure)
 */

import OpenAI from "openai";
import type { SystemSpec } from "./architect-agent.js";

export async function runHtmlAgent(
  client: OpenAI,
  model: string,
  userMessage: string,
  spec: SystemSpec,
  onStatus?: (msg: string) => void
): Promise<string> {
  onStatus?.("[HTML Agent] Generating semantic DOM structure...");

  // Build a flattened element reference from the spec
  const elementList = spec.components
    .flatMap((c) => c.elements)
    .join(", ");

  const systemPrompt = `You are the APEX Unbound HTML Specialist Agent. Your role is to generate flawless, semantic HTML5 markup based on a system specification.

CRITICAL RULES:
1. Output ONLY the raw HTML — no markdown, no backticks, no explanation text.
2. Generate a COMPLETE HTML5 document (DOCTYPE → html → head → body).
3. Every interactive element MUST have a descriptive id attribute exactly matching the spec.
4. Use semantic HTML5 elements: <header>, <main>, <section>, <article>, <nav>, <footer>, <aside>.
5. Add ARIA attributes: aria-label, role, aria-describedby where appropriate.
6. NO inline CSS — use class and id attributes only.
7. NO inline JavaScript — event handlers go in separate JS.
8. Include <meta charset>, <meta viewport>, <title>, and a <link> placeholder for fonts.
9. For Arabic/RTL: add dir="rtl" to <html> and lang="ar".
10. Every section must have an id matching the component spec.
11. Use descriptive, immutable class names (BEM-style or semantic).
12. Buttons must have type="button" (except form submits).
13. Images must have alt attributes.
14. Inputs must have labels and aria-label.
15. UI Structure for Premium Look: You must use modern, multi-layered nested layouts. Include wrapping containers for all components (e.g., .container-outer, .container-inner, .grid-layout-3col, .flex-row-center, .card-wrapper, .glow-layer, .card-overlay) to allow for complex CSS gradients, backdrop blurs, and glassmorphic glowing border effects.
16. Absolute Decorative Elements: Include absolute-positioned decorative elements like grid overlays and background blur blobs (<div class="blur-blob"></div>) inside major sections (especially Hero, Feature, and Testimonial areas) to allow the CSS agent to style premium colored glowing backgrounds.
17. Real, engaging Copywriting: Do not use generic placeholders or "lorem ipsum". Write extremely rich, engaging, professional, marketing-ready content for all headings, sub-headings, paragraphs, card details, testimonial texts, buttons, and form labels. Ensure copy matches the topic perfectly, and is written in high-quality persuasive language (fluent Arabic for RTL, premium English for LTR).
18. Dedicated SVG Icon/Graphics Design: Whenever an icon, logo, badge, avatar, banner background graphic, or vector illustration is needed, you MUST generate a clean, modern, inline <svg> structure. Do NOT use external icon fonts, external libraries, or raster placeholder images for icons or custom graphics. Write detailed, fully scalable, responsive <svg> code with precise viewBox (e.g. 0 0 24 24), path, circle, rect, linearGradient, fill, stroke, and stroke-width parameters. For large illustrations (like the Hero right column), design a complex vector composition (e.g. mock dashboard panels, server nodes, floating abstract geometries with multiple nested path/shape nodes). All SVGs should support currentColor to allow dynamic CSS hover styling.
19. Professionally Cropped Real Images: When photos or raster images are required (e.g., team member avatars, product showcases, background hero photos), use high-resolution Unsplash URLs with professional cropping and styling parameters (e.g. https://images.unsplash.com/photo-[id]?w=[width]&h=[height]&fit=crop&crop=entropy&auto=format&q=80) matching the topic of the website, instead of broken/ugly placeholder URLs. All icons, logos, badges, and vector shapes must remain inline SVGs.

The following element IDs and classes MUST appear in the HTML:
${elementList}

Produce a rich, fully-structured HTML document. Do not be minimal — include all sections, cards, items, and realistic placeholder content.`;

  const userPrompt = `Generate the complete HTML5 structure for this request:
"${userMessage}"

System Specification:
${JSON.stringify(spec, null, 2)}`;

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ];

  const completionArgs: any = {
    model,
    messages,
    max_tokens: 8000,
    stream: false,
  };
  if (model !== "deepseek-reasoner") {
    completionArgs.temperature = 0.2;
  }

  const response = await client.chat.completions.create(completionArgs);

  let html = response.choices[0]?.message?.content || "";

  // Strip any accidental markdown fencing
  html = html
    .replace(/^```html\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();

  // Basic validation — ensure we got a real HTML document
  if (!html.toLowerCase().includes("<!doctype") && !html.toLowerCase().includes("<html")) {
    html = `<!DOCTYPE html>\n<html lang="${spec.isRTL ? "ar" : "en"}" ${spec.isRTL ? 'dir="rtl"' : ''}>\n<head>\n<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width, initial-scale=1.0">\n<title>${spec.projectTitle}</title>\n</head>\n<body>\n${html}\n</body>\n</html>`;
  }

  onStatus?.(
    `[HTML Agent] DOM generated — ${(html.length / 1024).toFixed(1)}KB, ${(html.match(/<[a-z]/gi) || []).length} elements`
  );

  return html;
}
