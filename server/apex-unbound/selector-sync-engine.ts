/**
 * APEX Unbound — Phase 3: Selector Sync Engine
 *
 * An AST-based parser that extracts ALL ids, classes, and data-attributes
 * from raw HTML. Produces a GlobalSelectorMap that constrains the CSS and JS agents.
 *
 * This is the "interlocking mechanism" that eliminates selector mismatch bugs.
 */

export interface SelectorToken {
  type: "id" | "class" | "data-attr" | "element";
  value: string;
  cssSelector: string;  // e.g. "#hero-btn" or ".hero-card" or "[data-tab]"
  count: number;        // how many times it appears in the HTML
  elements: string[];   // which HTML tag types use this selector
}

export interface GlobalSelectorMap {
  ids: SelectorToken[];
  classes: SelectorToken[];
  dataAttributes: SelectorToken[];
  interactiveElements: SelectorToken[]; // IDs of buttons, inputs, links, etc.
  allCssSelectors: string[];            // flat deduplicated list for prompt injection
  validationSet: Set<string>;           // for fast O(1) validation lookups
}

/**
 * Parse raw HTML string and extract all DOM tokens.
 * Uses pure regex-based extraction (no external dependencies).
 */
export function runSelectorSyncEngine(html: string): GlobalSelectorMap {
  const idMap = new Map<string, { count: number; elements: string[] }>();
  const classMap = new Map<string, { count: number; elements: string[] }>();
  const dataAttrMap = new Map<string, { count: number; elements: string[] }>();
  const interactiveIds = new Set<string>();

  // Interactive element tag names
  const INTERACTIVE_TAGS = new Set(["button", "input", "select", "textarea", "a", "form", "label"]);

  // Parse all HTML opening tags
  const tagRegex = /<([a-z][a-z0-9-]*)\s([^>]*?)(?:\/>|>)/gi;
  let tagMatch: RegExpExecArray | null;

  while ((tagMatch = tagRegex.exec(html)) !== null) {
    const tagName = tagMatch[1].toLowerCase();
    const attrsString = tagMatch[2];

    // Extract id
    const idMatch = attrsString.match(/\bid\s*=\s*["']([^"']+)["']/i);
    if (idMatch) {
      const id = idMatch[1].trim();
      if (id) {
        const existing = idMap.get(id) || { count: 0, elements: [] };
        existing.count++;
        if (!existing.elements.includes(tagName)) existing.elements.push(tagName);
        idMap.set(id, existing);

        // Mark interactive elements
        if (INTERACTIVE_TAGS.has(tagName)) {
          interactiveIds.add(id);
        }
      }
    }

    // Extract class (may contain multiple)
    const classMatch = attrsString.match(/\bclass\s*=\s*["']([^"']+)["']/i);
    if (classMatch) {
      const classes = classMatch[1].split(/\s+/).filter(Boolean);
      for (const cls of classes) {
        const existing = classMap.get(cls) || { count: 0, elements: [] };
        existing.count++;
        if (!existing.elements.includes(tagName)) existing.elements.push(tagName);
        classMap.set(cls, existing);
      }
    }

    // Extract data-attributes
    const dataAttrRegex = /\b(data-[a-z][a-z0-9-]*)\s*(?:=\s*["'][^"']*["'])?/gi;
    let dataMatch: RegExpExecArray | null;
    while ((dataMatch = dataAttrRegex.exec(attrsString)) !== null) {
      const attr = dataMatch[1].toLowerCase();
      const existing = dataAttrMap.get(attr) || { count: 0, elements: [] };
      existing.count++;
      if (!existing.elements.includes(tagName)) existing.elements.push(tagName);
      dataAttrMap.set(attr, existing);
    }
  }

  // Convert maps to SelectorToken arrays
  const ids: SelectorToken[] = Array.from(idMap.entries()).map(([value, meta]) => ({
    type: "id",
    value,
    cssSelector: `#${value}`,
    count: meta.count,
    elements: meta.elements,
  }));

  const classes: SelectorToken[] = Array.from(classMap.entries()).map(([value, meta]) => ({
    type: "class",
    value,
    cssSelector: `.${value}`,
    count: meta.count,
    elements: meta.elements,
  }));

  const dataAttributes: SelectorToken[] = Array.from(dataAttrMap.entries()).map(([value, meta]) => ({
    type: "data-attr",
    value,
    cssSelector: `[${value}]`,
    count: meta.count,
    elements: meta.elements,
  }));

  const interactiveElements: SelectorToken[] = Array.from(interactiveIds).map((id) => {
    const meta = idMap.get(id)!;
    return {
      type: "id",
      value: id,
      cssSelector: `#${id}`,
      count: meta.count,
      elements: meta.elements,
    };
  });

  // Build flat deduplicated selector list
  const allCssSelectors = [
    ...ids.map((t) => t.cssSelector),
    ...classes.map((t) => t.cssSelector),
    ...dataAttributes.map((t) => t.cssSelector),
  ];

  // Build validation set for O(1) lookups
  const validationSet = new Set([
    ...ids.map((t) => t.value),
    ...ids.map((t) => t.cssSelector),
    ...classes.map((t) => t.value),
    ...classes.map((t) => t.cssSelector),
    ...dataAttributes.map((t) => t.value),
    ...dataAttributes.map((t) => t.cssSelector),
  ]);

  console.log(
    `[Selector Sync Engine] Extracted: ${ids.length} IDs, ${classes.length} classes, ${dataAttributes.length} data-attrs, ${interactiveIds.size} interactive elements`
  );

  return {
    ids,
    classes,
    dataAttributes,
    interactiveElements,
    allCssSelectors,
    validationSet,
  };
}

/**
 * Validates that a CSS or JS code string only references selectors
 * that exist in the GlobalSelectorMap.
 *
 * Returns: { valid: boolean, violations: string[] }
 */
export function validateAgainstSelectorMap(
  code: string,
  selectorMap: GlobalSelectorMap,
  codeType: "css" | "js"
): { valid: boolean; violations: string[] } {
  const violations: string[] = [];

  if (codeType === "css") {
    // Extract all CSS selectors (simplified — catches most cases)
    const cssSelectors = code.match(/[#.][a-z][a-z0-9-_]*/gi) || [];
    for (const sel of cssSelectors) {
      // Skip vendor prefixes and pseudo-classes
      if (sel.startsWith("--") || sel.includes(":")) continue;
      if (!selectorMap.validationSet.has(sel) && !selectorMap.validationSet.has(sel.replace(/^[#.]/, ""))) {
        // Check if it's a common CSS keyword that looks like a class
        const knownCssKeywords = [".container", ".wrapper", ".row", ".col", ".flex", ".grid"];
        if (!knownCssKeywords.some((kw) => sel.includes(kw.slice(1)))) {
          violations.push(`CSS: Unknown selector "${sel}"`);
        }
      }
    }
  } else {
    // Extract querySelector/getElementById/addEventListener targets in JS
    const querySelectorRegex = /querySelector(?:All)?\s*\(\s*["'`]([^"'`]+)["'`]\s*\)/g;
    const getByIdRegex = /getElementById\s*\(\s*["'`]([^"'`]+)["'`]\s*\)/g;

    let match: RegExpExecArray | null;

    while ((match = querySelectorRegex.exec(code)) !== null) {
      const sel = match[1].trim();
      // Only validate simple #id or .class selectors
      if (/^[#.][a-z][a-z0-9-_]*$/i.test(sel)) {
        if (!selectorMap.validationSet.has(sel) && !selectorMap.validationSet.has(sel.replace(/^[#.]/, ""))) {
          violations.push(`JS: querySelector("${sel}") targets non-existent element`);
        }
      }
    }

    while ((match = getByIdRegex.exec(code)) !== null) {
      const id = match[1].trim();
      if (!selectorMap.validationSet.has(id) && !selectorMap.validationSet.has(`#${id}`)) {
        violations.push(`JS: getElementById("${id}") targets non-existent element`);
      }
    }
  }

  return {
    valid: violations.length === 0,
    violations,
  };
}

/**
 * Build the constraint context string to inject into CSS/JS agent prompts.
 * This is the "Prompt Injector" middleware.
 */
export function buildSelectorConstraintPrompt(selectorMap: GlobalSelectorMap): string {
  const idList = selectorMap.ids.map((t) => t.cssSelector).join(", ");
  const classList = selectorMap.classes.map((t) => t.cssSelector).join(", ");
  const interactiveList = selectorMap.interactiveElements.map((t) => t.cssSelector).join(", ");

  return `
╔══════════════════════════════════════════════════════════╗
║         GLOBAL SELECTOR MAP — HARD CONSTRAINT           ║
║     All selectors used MUST exist in this list.         ║
╚══════════════════════════════════════════════════════════╝

VALID IDs (use as #id in CSS, getElementById("id") in JS):
${idList || "  (none)"}

VALID CLASSES (use as .class in CSS, querySelector(".class") in JS):
${classList || "  (none)"}

INTERACTIVE ELEMENT IDs (bind event listeners ONLY to these):
${interactiveList || "  (none)"}

STRICT RULES:
1. You MUST NOT reference any selector not in the above lists.
2. In CSS: only write rules for selectors that exist in the HTML.
3. In JS: only call getElementById() or querySelector() with IDs/classes from the above lists.
4. Do NOT invent new element IDs or class names.
5. Violation of any rule above will cause a runtime error.
`;
}
