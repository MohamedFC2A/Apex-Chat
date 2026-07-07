/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║  APEX PDF — Styles Layer Barrel Export v4.0                                ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */

import { BASE_CSS } from "./base.css.js";
import { TYPOGRAPHY_CSS } from "./typography.css.js";
import { COMPONENTS_CSS } from "./components.css.js";
import { PRINT_CSS } from "./print.css.js";
import { RTL_CSS } from "./rtl.css.js";
import { getLightThemeVariables } from "./themes/light.css.js";
import { getDarkThemeVariables } from "./themes/dark.css.js";
import type { PDFDocumentTheme } from "../../../shared/pdf/types.js";

export function resolveTheme(theme: PDFDocumentTheme): "dark" | "light" {
  // Academic style always resolved to light to ensure high print readability
  return "light";
}

export function getDocumentStyles(theme: "dark" | "light"): string {
  const themeVars = theme === "dark" ? getDarkThemeVariables() : getLightThemeVariables();
  return `
    ${themeVars}
    ${BASE_CSS}
    ${TYPOGRAPHY_CSS}
    ${COMPONENTS_CSS}
    ${PRINT_CSS}
    ${RTL_CSS}
  `;
}

export const FONT_IMPORTS = `
  @import url('https://fonts.googleapis.com/css2?family=Georgia&display=swap');
  @font-face {
    font-family: 'Fallback-Serif';
    src: local('Georgia'), local('Times New Roman'), local('Times');
  }
  @font-face {
    font-family: 'Fallback-Sans';
    src: local('Arial'), local('Helvetica Neue'), local('Helvetica');
  }
  @font-face {
    font-family: 'Fallback-Mono';
    src: local('Courier New'), local('Courier');
  }
`;
