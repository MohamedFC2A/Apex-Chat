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
  selectorMap: GlobalSelectorMap,
  spec?: { uiStateContract?: { activeClass?: string; inactiveClass?: string; hiddenClass?: string; modalOpenClass?: string; submittingClass?: string; invalidClass?: string } }
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
    jsSelectors.push(match[1].trim());
  }

  const unmatchedJSRefs = jsSelectors.filter(s => {
    // Check if the selector itself, or with prefix, is known in our validationSet
    if (selectorMap.validationSet.has(s)) return false;
    if (selectorMap.validationSet.has('#' + s)) return false;
    if (selectorMap.validationSet.has('.' + s)) return false;

    // Ignore tag names, attributes, complex/nested queries, document/window, etc.
    const isCommonOrComplex = 
      /^(body|html|window|document|canvas|svg|path|g|rect|circle|img|a|button|input|textarea|select|option|label|div|span|p|h[1-6]|ul|ol|li|table|tr|td|th|thead|tbody|iframe|header|footer|nav|section|aside|main|form|i|em|strong|b)$/i.test(s) ||
      s.includes('[') || s.includes(']') || s.includes(':') || s.includes(' ') || s.includes('>') || s.includes(',');

    if (isCommonOrComplex) return false;

    return true;
  });

  // 3. Verify CSS state classes
  const contract = spec?.uiStateContract;
  const uiStateClasses: string[] = contract
    ? [
        contract.activeClass,
        contract.inactiveClass,
        contract.hiddenClass,
        contract.modalOpenClass,
        contract.submittingClass,
        contract.invalidClass,
      ].filter((c): c is string => typeof c === "string")
    : ["is-active", "is-inactive", "is-hidden", "modal-open", "submitting", "is-invalid"];

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
  return routes.filter((value, index, self) => self.indexOf(value) === index);
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
  return routes.filter((value, index, self) => self.indexOf(value) === index);
}
