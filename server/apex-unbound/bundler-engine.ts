/**
 * APEX Unbound — Phase 5: Bundler Engine
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

  const isArabic = spec.isRTL || /[\u0600-\u06FF]/.test(userMessage + html);
  const dir = isArabic ? 'dir="rtl"' : 'dir="ltr"';
  const lang = isArabic ? "ar" : "en";
  const headFont = spec.typography.headingFont || "Inter";
  const bodyFont = spec.typography.bodyFont || "Inter";

  // ── 1. Ensure we have a full HTML document ──────────────────────
  const isFullDoc =
    /<!DOCTYPE\s+html/i.test(doc) ||
    /<html[^>]*>/i.test(doc) ||
    /<head[^>]*>/i.test(doc);

  if (!isFullDoc) {
    // Wrap snippet in full document shell
    doc = `<!DOCTYPE html>
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
  }

  // ── 2. Ensure lang and dir on <html> tag ──────────────────────
  doc = doc.replace(/<html([^>]*)>/i, (match, attrs) => {
    let newAttrs = attrs;
    if (!newAttrs.includes("lang=")) newAttrs += ` lang="${lang}"`;
    if (!newAttrs.includes("dir=") && isArabic) newAttrs += ' dir="rtl"';
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
    doc = doc.replace(/(<\/head>)/i, `${fontLink}\n$1`);
  }

  // ── 7. Inject CSS ─────────────────────────────────────────────
  if (css && css.trim().length > 10) {
    // Remove any pre-existing style content from the HTML to avoid duplication
    const existingStyleTagRegex = /<style[^>]*>[\s\S]*?<\/style>/gi;
    const existingStyles = doc.match(existingStyleTagRegex) || [];

    const styleBlock = `  <style>\n${css}\n  </style>`;

    if (/<\/head>/i.test(doc)) {
      doc = doc.replace(/(<\/head>)/i, `${styleBlock}\n$1`);
    } else if (/<head[^>]*>/i.test(doc)) {
      doc = doc.replace(/(<head[^>]*>)/i, `$1\n${styleBlock}`);
    } else {
      doc = `${styleBlock}\n${doc}`;
    }
  }

  // ── 8. Inject JavaScript ──────────────────────────────────────
  if (js && js.trim().length > 10) {
    const scriptBlock = `  <script>\n${js}\n  </script>`;

    if (/<\/body>/i.test(doc)) {
      doc = doc.replace(/(<\/body>)/i, `${scriptBlock}\n$1`);
    } else if (/<body[^>]*>/i.test(doc)) {
      doc = doc.replace(/(<body[^>]*>)/i, `$1\n${scriptBlock}`);
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
