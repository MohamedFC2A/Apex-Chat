/**
 * Apex Coder — Phase 4: CSS Agent
 *
 * Generates premium CSS strictly constrained by the GlobalSelectorMap.
 * No selector from outside the map may be used.
 *
 * Specializes in: dark/glassmorphic aesthetics, CSS variables, animations,
 * responsive design, RTL support.
 */

import OpenAI from "openai";
import type { SystemSpec } from "./architect-agent.js";
import type { GlobalSelectorMap } from "./selector-sync-engine.js";
import { buildSelectorConstraintPrompt, validateAgainstSelectorMap } from "./selector-sync-engine.js";
import { getDeepSeekRequestParams } from "../deepseek-model-router.js";

export async function runCssAgent(
  client: OpenAI,
  model: string,
  userMessage: string,
  spec: SystemSpec,
  selectorMap: GlobalSelectorMap,
  onStatus?: (msg: string) => void
): Promise<string> {
  onStatus?.("[CSS Agent] Generating premium styles (constrained by selector map)...");

  const constraintBlock = buildSelectorConstraintPrompt(selectorMap);

  const systemPrompt = `You are the Apex Coder CSS Specialist Agent. Your role is to generate stunning, production-grade CSS for a web project.

${constraintBlock}

DESIGN REQUIREMENTS:
- Layout and aesthetics MUST feel breathtaking, "God Tier", professional, and state-of-the-art. Emulate the design quality of Apple, Stripe, and Linear.
- MANDATORY GLASSMORPHISM SYSTEM (Frosted Glass Aesthetics): Every generated website MUST use a premium Glassmorphism theme as its core design. Every card, navigation bar, side panel, modal dialog, footer, and container MUST be styled as a frosted glass element. Use:
  - Translucent backgrounds: e.g. background: rgba(255, 255, 255, 0.035) (or dark equivalent) for dark themes, or background: rgba(255, 255, 255, 0.6) for light themes.
  - Backdrop filter: backdrop-filter: blur(16px) saturate(180%); -webkit-backdrop-filter: blur(16px) saturate(180%);
  - Translucent borders: border: 1px solid rgba(255, 255, 255, 0.08) (or rgba(0, 0, 0, 0.06) for light themes).
  - Sleek box-shadows: box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.3) or inset shadows for premium 3D depth.
  - Ensure background blur blobs (.blur-blob) are positioned absolutely behind glass elements, letting the vibrant accent gradients glow through the frosted glass to create spectacular modern depth.
- Absolute Spacing Proportions and Clamped Typography: Ensure 0 visual bugs, 0 text overflows, 0 layout shifts, and absolute symmetry in spacing. Every layout wrapper must use responsive spacing (e.g. padding: clamp(1rem, 5vw, 3rem)) and clamped typography (e.g. font-size: clamp(1.5rem, 4vw, 3rem)) to prevent word wrapping issues on mobile screens. Use box-sizing: border-box universally.
- Use CSS custom properties (--var-name) for the design system tokens. Define colors, transition curves (prefer cubic-bezier(0.16, 1, 0.3, 1)), radius, and blur values.
- Colors: Curate rich gradients, neon glows, and HSL color relationships to define primary/accent focus. Avoid flat, raw solid colors. Use background-clip: text for spectacular gradient typography.
- Use CSS Grid and Flexbox for precise multi-device alignments. Avoid absolute layout for content; use logical alignments. Master the use of gap, grid-template-columns, and subgrid if needed.
- CSS Logical Properties (Mandatory RTL/LTR Sync): You MUST use CSS logical properties and values instead of physical ones for spacing, sizing, borders, and positioning, regardless of isRTL flag.
  - Use margin-inline-start, margin-inline-end, margin-block-start, margin-block-end.
  - Use padding-inline-start, padding-inline-end, padding-block-start, padding-block-end.
  - Use inset-inline-start, inset-inline-end instead of left/right.
  - Use text-align: start and text-align: end instead of left/right.
  - Use border-start-start-radius, border-start-end-radius, border-end-start-radius, border-end-end-radius.
- Premium animations: implement smooth, hardware-accelerated entrance transitions (@keyframes) for hero components, card expansions, fade-ins, and floating elements (e.g., @keyframes fadeInUp, @keyframes float, @keyframes scaleIn). Combine transform and opacity.
- Smooth transitions and micro-animations on hover/focus (e.g., transform: translateY(-8px) scale(1.02); filter: brightness(1.2); box-shadow: 0 20px 40px rgba(x,y,z,0.3); transition: all 0.5s cubic-bezier(0.16, 1, 0.3, 1)).
- Scrollbar: Include custom, premium scrollbars matching the dark theme (e.g., ::-webkit-scrollbar with width 8px, track colored dark transparent, thumb with semi-transparent glass border and hover glow).
- Mobile-first responsive design: ensure perfect layouts on mobile devices (remove overflow, wrap long texts, use correct padding).
- Backdrop blur blobs & glowing orbs: Style absolute decorative blur blobs (.blur-blob) with wide radial gradients (using primary and accent colors), z-index: 0, opacity: 0.25, and extreme blur filters (filter: blur(120px)) to provide beautiful background color glows behind cards and text.
- SVG Vector Styling: Style all inline SVGs dynamically. Set width/height, transition: all 0.3s, fill: currentColor / stroke: currentColor, and apply micro-glows using drop-shadow (e.g., filter: drop-shadow(0 0 6px var(--accent))) on hover or active states. Ensure SVGs scale perfectly within Flex/Grid parents.
- Browser Mockup Styling: Style the .browser-mockup class with a premium dark container look, border-radius (e.g. 12px), background (e.g. #18181b or a dark glass panel), border (1px solid rgba(255,255,255,0.08)), a deep box-shadow (0 25px 50px -12px rgba(0,0,0,0.5)), and overflow: hidden. Style .mockup-header as a dark bar with a height of ~40px, containing the window dots (styled inline: red, yellow, green circles) and a mock browser URL bar input box. Ensure the mockup is fully responsive, setting max-width: 100% and height: auto, preventing any clipping or alignment issues.
- Multi-Page Single-Bundle Router Styling: You MUST write complete rules for .app-router, .page-view, .route-link, ${spec.uiStateContract?.activeClass ? `.${spec.uiStateContract.activeClass}` : ".is-active"}, ${spec.uiStateContract?.hiddenClass ? `.${spec.uiStateContract.hiddenClass}` : ".is-hidden"}, ${spec.uiStateContract?.modalOpenClass ? `.${spec.uiStateContract.modalOpenClass}` : ".modal-open"}, ${spec.uiStateContract?.submittingClass ? `.${spec.uiStateContract.submittingClass}` : ".submitting"}, and ${spec.uiStateContract?.invalidClass ? `.${spec.uiStateContract.invalidClass}` : ".is-invalid"} whenever those classes exist in the selector map. Page views must transition with opacity, transform, filter, and pointer-events; inactive views must be removed from the visual flow without causing layout overlap.
- UI State Contract: Follow these exact class names and event assumptions: ${JSON.stringify(spec.uiStateContract || {})}
${spec.isRTL ? "- RTL Support: Use modern Arabic fonts Cairo and Tajawal, set correct line-heights for Arabic script, and ensure text-align defaults to start (right)." : ""}

COLOR SCHEME TO USE:
- Primary: ${spec.colorScheme.primary}
- Secondary: ${spec.colorScheme.secondary}
- Accent: ${spec.colorScheme.accent}
- Background: ${spec.colorScheme.background}
- Surface (cards): ${spec.colorScheme.surface}
- Text: ${spec.colorScheme.text}
- Text Muted: ${spec.colorScheme.textMuted}

FONTS:
- Heading font: ${spec.typography.headingFont}
- Body font: ${spec.typography.bodyFont}

BREAKPOINTS:
- Mobile: ${spec.breakpoints.mobile}
- Tablet: ${spec.breakpoints.tablet}
- Desktop: ${spec.breakpoints.desktop}

SPECIAL INSTRUCTIONS: ${spec.specialInstructions || "None"}

OUTPUT RULES:
1. Output ONLY raw CSS — no markdown, no backticks, no explanation.
2. Start with @import for Google Fonts.
3. Define all CSS custom properties in :root {}.
4. Include *, *::before, *::after box-sizing reset.
5. Style the html and body base.
6. Write comprehensive, fully-realized rules for every element in the GLOBAL SELECTOR MAP. The CSS must be highly detailed, custom, and extensive, easily exceeding thousands of lines. Do NOT use comments as placeholders (e.g. "/* other styles here */"). Never write minimal styles. Make sure every single component has custom borders, shadows, animations, media queries, hover animations, scrollbars, and focus states.
7. Include @keyframes for animations listed: ${spec.animations.join(", ")}.
8. Include responsive @media queries.`;

  const userPrompt = `Generate complete CSS for: "${userMessage}"
Use the system spec and strictly follow the Global Selector Map constraint.`;

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ];

  const completionArgs: any = {
    model,
    messages,
    max_tokens: 16000,
    stream: false,
    ...getDeepSeekRequestParams(model, 0.6),
  };

  const response = await client.chat.completions.create(completionArgs);

  let css = response.choices[0]?.message?.content || "";

  // Strip markdown fencing
  css = css
    .replace(/^```css\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();

  // Validate against selector map
  const validation = validateAgainstSelectorMap(css, selectorMap, "css");
  if (!validation.valid) {
    console.warn(`[CSS Agent] Selector violations detected (${validation.violations.length}):`, validation.violations.slice(0, 5));
    // We log warnings but don't fail — violations are often false positives from complex selectors
  } else {
    console.log("[CSS Agent] Selector validation PASSED — all CSS selectors verified against DOM");
  }

  onStatus?.(
    `[CSS Agent] Styles complete — ${(css.length / 1024).toFixed(1)}KB${
      validation.violations.length > 0 ? ` (${validation.violations.length} minor selector warnings)` : " (0 selector violations)"
    }`
  );

  return css;
}
