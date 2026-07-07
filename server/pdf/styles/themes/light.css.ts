import { DESIGN_TOKENS } from "../tokens.js";
export function getLightThemeVariables() {
  const vars = DESIGN_TOKENS.colors.light;
  return `
    :root {
      --page-bg: ${vars.background};
      --page-surface: ${vars.surface};
      --page-surface-soft: ${vars.surfaceSoft};
      --text-main: ${vars.textMain};
      --text-soft: ${vars.textSoft};
      --text-muted: ${vars.textMuted};
      --border-soft: ${vars.borderSoft};
      --border-medium: ${vars.borderMedium};
      --accent: ${vars.accent};
      --accent-2: ${vars.accent2};
      --accent-3: ${vars.accent3};
      --success: ${vars.success};
      --warning: ${vars.warning};
      --danger: ${vars.danger};
      --code-bg: ${vars.codeBg};
      --quote-bg: ${vars.quoteBg};
      --table-head-bg: ${vars.tableHeadBg};
      --table-head-text: ${vars.tableHeadText};
    }
  `;
}
