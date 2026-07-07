// integration-validator.ts - مدقق التكامل قبل تجميع الملف النهائي
import type { GlobalSelectorMap } from "./selector-sync-engine.js";

export interface ValidationResult {
  passed: boolean;
  errors: string[];
  warnings: string[];
  stats: {
    htmlRoutes: number;
    cssSelectorsUsed: number;
    jsDOMRefs: number;
    unmatchedJSRefs: number;
    missingCSSStates: number;
  };
}

export function validateIntegration(
  html: string,
  css: string,
  js: string,
  selectorMap: GlobalSelectorMap
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 1. Verify route matching
  const htmlRoutes = extractRoutes(html);
  const jsRoutes = extractJSRoutes(js);

  for (const route of htmlRoutes) {
    if (jsRoutes.length > 0 && !jsRoutes.includes(route)) {
      warnings.push(`HTML route "${route}" has no matching JS route handler`);
    }
  }

  // 2. Verify DOM selectors in JS
  const jsSelectorPattern = /(?:querySelector|getElementById|querySelectorAll)\s*\(\s*['"]([^'"]+)['"]/g;
  const jsSelectors: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = jsSelectorPattern.exec(js)) !== null) {
    jsSelectors.push(match[1]);
  }

  const allKnownSelectors = getAllSelectors(selectorMap);
  const unmatchedJSRefs = jsSelectors.filter(s => !allKnownSelectors.includes(s));

  // 3. Verify CSS state classes
  const uiStateClasses = (selectorMap as any)?.uiStateContract?.stateClasses || [];
  const missingCSSStates = uiStateClasses.filter(
    (cls: string) => !css.includes(`.${cls}`)
  );

  return {
    passed: errors.length === 0 && unmatchedJSRefs.length === 0,
    errors,
    warnings: [...warnings, ...unmatchedJSRefs.map(s => `JS references unknown selector: "${s}"`)],
    stats: {
      htmlRoutes: htmlRoutes.length,
      cssSelectorsUsed: (css.match(/[.#][\w-]+/g) || []).length,
      jsDOMRefs: jsSelectors.length,
      unmatchedJSRefs: unmatchedJSRefs.length,
      missingCSSStates: missingCSSStates.length,
    },
  };
}

function extractRoutes(html: string): string[] {
  const pattern = /data-route=["']([^"']+)["']/g;
  const routes: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = pattern.exec(html)) !== null) {
    routes.push(m[1]);
  }
  return [...new Set(routes)];
}

function extractJSRoutes(js: string): string[] {
  const pattern = /['"](\/?[\w-]+)['"]\s*(?::|=>|\)\s*\{)/g;
  const routes: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = pattern.exec(js)) !== null) {
    if (!m[1].startsWith(".") && m[1].length > 1) {
      routes.push(m[1]);
    }
  }
  return [...new Set(routes)];
}

function getAllSelectors(map: GlobalSelectorMap): string[] {
  const selectors: string[] = [];
  for (const token of (map.ids || [])) {
    selectors.push(token.cssSelector);
  }
  for (const token of (map.classes || [])) {
    selectors.push(token.cssSelector);
  }
  return selectors;
}
