/**
 * Apex Coder — Phase 5: Bundler Engine
 *
 * Compiles HTML + CSS + JS into a unified, self-contained HTML file.
 * Handles: font injection, viewport meta, RTL directives,
 * CSS variable override, CSS/JS injection at correct positions.
 *
 * This is the final assembly step before sandbox validation.
 */

import type { SystemSpec } from "./architect-agent.js";

export interface BundleResult {
  html: string;
  stats: {
    htmlBytes: number;
    cssBytes: number;
    jsBytes: number;
    totalBytes: number;
    hasRTL: boolean;
    hasGoogleFonts: boolean;
    hasViewportMeta: boolean;
  };
}

/**
 * Assembles HTML + CSS + JS into a single self-contained HTML document.
 * Handles full documents and body snippets gracefully.
 */
export function runBundlerEngine(
  html: string,
  css: string,
  js: string,
  spec: SystemSpec,
  userMessage: string
): BundleResult {
  let doc = html.trim();
  const cssCode = (css || "").trim();
  const jsCode = (js || "").trim();

  const isArabic = spec.isRTL || /[\u0600-\u06FF]/.test(userMessage + html);
  const dir = isArabic ? 'dir="rtl"' : 'dir="ltr"';
  const lang = isArabic ? "ar" : "en";
  const headFont = spec.typography.headingFont || "Inter";
  const bodyFont = spec.typography.bodyFont || "Inter";

  // ── 1. Ensure we have a full HTML document ──────────────────────
  const hasHtmlTag = /<html[^>]*>/i.test(doc);
  const isFullDoc = hasHtmlTag;

  if (!isFullDoc) {
    doc = doc.replace(/<!DOCTYPE\s+html>\s*/i, "");
    const hasHeadOrBody = /<head[^>]*>/i.test(doc) || /<body[^>]*>/i.test(doc);
    doc = hasHeadOrBody
      ? `<!DOCTYPE html>
<html lang="${lang}" ${dir}>
${doc}
</html>`
      : `<!DOCTYPE html>
<html lang="${lang}" ${dir}>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${spec.projectTitle}</title>
</head>
<body>
${doc}
</body>
</html>`;
  } else if (!/<!DOCTYPE\s+html/i.test(doc)) {
    doc = `<!DOCTYPE html>\n${doc}`;
  }

  // ── 2. Ensure lang and dir on <html> tag ──────────────────────
  doc = doc.replace(/<html([^>]*)>/i, (match, attrs) => {
    let newAttrs = attrs;
    if (!/\slang\s*=/i.test(newAttrs)) newAttrs += ` lang="${lang}"`;
    if (!/\sdir\s*=/i.test(newAttrs)) newAttrs += ` ${dir}`;
    return `<html${newAttrs}>`;
  });

  // ── 3. Ensure <head> exists ───────────────────────────────────
  if (!/<head[^>]*>/i.test(doc)) {
    doc = doc.replace(/<html[^>]*>/i, (m) => `${m}\n<head></head>`);
  }

  // ── 4. Ensure viewport meta ───────────────────────────────────
  if (!/viewport/i.test(doc)) {
    doc = doc.replace(
      /(<head[^>]*>)/i,
      `$1\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">`
    );
  }

  // ── 5. Ensure charset meta ────────────────────────────────────
  if (!/charset/i.test(doc)) {
    doc = doc.replace(
      /(<head[^>]*>)/i,
      `$1\n  <meta charset="UTF-8">`
    );
  }

  // ── 6. Inject Google Fonts ────────────────────────────────────
  const needsGoogleFonts = !doc.includes("fonts.googleapis.com");
  if (needsGoogleFonts) {
    const arabicFonts = isArabic
      ? `family=Cairo:wght@300;400;600;700;900&family=Tajawal:wght@300;400;500;700&`
      : "";
    const googleFontsUrl = `https://fonts.googleapis.com/css2?${arabicFonts}family=${encodeURIComponent(
      headFont
    )}:wght@300;400;500;600;700;800;900&family=${encodeURIComponent(
      bodyFont
    )}:wght@300;400;500;600;700&display=swap`;

    const fontLink = `  <link rel="preconnect" href="https://fonts.googleapis.com">\n  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n  <link href="${googleFontsUrl}" rel="stylesheet">`;
    doc = doc.replace(/(<\/head>)/i, (match) => `${fontLink}\n${match}`);
  }

  // ── 7. Inject CSS ─────────────────────────────────────────────
  if (cssCode.length > 10) {
    // Only remove placeholder/empty style tags (< 50 chars), keep real content
    doc = doc.replace(/<style[^>]*>[\s\S]{0,50}?<\/style>/gi, "");

    const safeCss = cssCode.replace(/<\/style/gi, "<\\/style");
    const styleBlock = `  <style>\n${safeCss}\n  </style>`;

    if (/<\/head>/i.test(doc)) {
      doc = doc.replace(/(<\/head>)/i, (match) => `${styleBlock}\n${match}`);
    } else if (/<head[^>]*>/i.test(doc)) {
      doc = doc.replace(/(<head[^>]*>)/i, (match) => `${match}\n${styleBlock}`);
    } else {
      doc = `${styleBlock}\n${doc}`;
    }
  }

  // ── 8. Inject JavaScript ──────────────────────────────────────
  if (jsCode.length > 10) {
    // Only remove placeholder/empty script tags (< 50 chars), keep real content
    doc = doc.replace(/<script\b[^>]*>[\s\S]{0,50}?<\/script>/gi, "");

    const safeJs = jsCode.replace(/<\/script/gi, "<\\/script");
    const scriptBlock = `  <script>\n${safeJs}\n  </script>`;

    if (/<\/body>/i.test(doc)) {
      doc = doc.replace(/(<\/body>)/i, (match) => `${scriptBlock}\n${match}`);
    } else if (/<body[^>]*>/i.test(doc)) {
      doc = doc.replace(/(<body[^>]*>)/i, (match) => `${match}\n${scriptBlock}`);
    } else {
      doc = `${doc}\n${scriptBlock}`;
    }
  }

  // ── 9. Final cleanup ──────────────────────────────────────────
  // Remove duplicate DOCTYPE
  const doctypeCount = (doc.match(/<!DOCTYPE/gi) || []).length;
  if (doctypeCount > 1) {
    doc = doc.replace(/<!DOCTYPE html>\s*<!DOCTYPE html>/gi, "<!DOCTYPE html>");
  }

  const stats = {
    htmlBytes: new TextEncoder().encode(html).length,
    cssBytes: new TextEncoder().encode(css).length,
    jsBytes: new TextEncoder().encode(js).length,
    totalBytes: new TextEncoder().encode(doc).length,
    hasRTL: isArabic,
    hasGoogleFonts: doc.includes("fonts.googleapis.com"),
    hasViewportMeta: doc.includes("viewport"),
  };

  console.log(
    `[Bundler Engine] Bundle complete: ${(stats.totalBytes / 1024).toFixed(1)}KB total (HTML: ${(stats.htmlBytes / 1024).toFixed(1)}KB, CSS: ${(stats.cssBytes / 1024).toFixed(1)}KB, JS: ${(stats.jsBytes / 1024).toFixed(1)}KB)`
  );

  return { html: doc, stats };
}
