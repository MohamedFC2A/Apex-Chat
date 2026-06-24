/**
 * APEX Unbound — Agent 1: Architect Agent
 *
 * Parses user requirements and produces a SystemSpec JSON.
 * No code is written here — only structural planning.
 *
 * Output contract:
 * {
 *   projectTitle: string;
 *   projectDescription: string;
 *   components: ComponentSpec[];
 *   colorScheme: { primary, secondary, accent, background, surface, text };
 *   typography: { headingFont, bodyFont };
 *   breakpoints: { mobile, tablet, desktop };
 *   features: string[];
 *   isRTL: boolean;
 *   language: "ar" | "en" | "mixed";
 * }
 */

import OpenAI from "openai";

export interface ComponentSpec {
  id: string;          // e.g. "hero-section"
  name: string;        // e.g. "Hero Section"
  description: string; // what it does
  elements: string[];  // list of sub-elements with IDs/classes
  hasInteractivity: boolean;
}

export interface ColorScheme {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  text: string;
  textMuted: string;
}

export interface SystemSpec {
  projectTitle: string;
  projectDescription: string;
  components: ComponentSpec[];
  colorScheme: ColorScheme;
  typography: { headingFont: string; bodyFont: string };
  breakpoints: { mobile: string; tablet: string; desktop: string };
  features: string[];
  animations: string[];
  isRTL: boolean;
  language: "ar" | "en" | "mixed";
  specialInstructions: string;
}

export async function runArchitectAgent(
  client: OpenAI,
  model: string,
  userMessage: string,
  conversationHistory: Array<{ role: "user" | "assistant"; content: string }>,
  onStatus?: (msg: string) => void
): Promise<SystemSpec> {
  onStatus?.("[Architect Agent] Analyzing requirements and generating system specification...");

  const systemPrompt = `You are the APEX Unbound Lead Architect Agent. Your role is to analyze a user's web app request and produce a detailed JSON system specification. You do NOT write code — only architecture.

You must respond with ONLY a valid JSON object (no markdown, no backticks, no explanation). The JSON must exactly match this TypeScript interface:

{
  "projectTitle": "string — short name of the project",
  "projectDescription": "string — what this web app does",
  "components": [
    {
      "id": "string — kebab-case unique DOM id prefix (e.g. hero-section)",
      "name": "string — human readable name",
      "description": "string — what this section does",
      "elements": ["array of element IDs/classes that will be in this component, e.g. #hero-title, #hero-cta-btn, .hero-card"],
      "hasInteractivity": true/false
    }
  ],
  "colorScheme": {
    "primary": "HSL color string (e.g. hsl(220, 90%, 56%))",
    "secondary": "HSL color",
    "accent": "HSL color — vivid contrasting accent",
    "background": "HSL dark background (e.g. hsl(220, 20%, 8%))",
    "surface": "HSL card/panel background (e.g. hsl(220, 18%, 12%))",
    "text": "HSL light text (e.g. hsl(220, 20%, 92%))",
    "textMuted": "HSL muted text"
  },
  "typography": {
    "headingFont": "Google Font name for headings",
    "bodyFont": "Google Font name for body text"
  },
  "breakpoints": {
    "mobile": "480px",
    "tablet": "768px",
    "desktop": "1200px"
  },
  "features": ["array of feature strings like 'smooth scroll', 'animated counters', etc."],
  "animations": ["list of CSS animation/transition names to use"],
  "isRTL": false,
  "language": "en",
  "specialInstructions": "any extra notes for CSS/JS agents"
}

Rules:
- Plan an absolutely breathtaking, "God Tier", production-ready system specification. The design MUST be at the level of Apple, Stripe, or Linear. It must feature a comprehensive, multi-component layout (minimum 6-8 components) packed with premium features, extreme attention to detail, and extensive interactivity.
- Never make assumptions or settle for simple one-page stubs. Every component must have a clear, distinct purpose, a dedicated responsive grid/flexbox wrapper, and rich interactive states planned (e.g., category filters, tab switches, dynamic search inputs, modal boxes, complex parallax scroll animations, and 3D card tilts).
- You must plan the following components by default for an outstanding, high-fidelity result:
  1. Ultra-Premium Glassmorphic Navbar with transparent blurred background (backdrop-filter), glowing logo SVG, hover-reveal mega-menus, and sleek responsive mobile drawer.
  2. Hero Section with asymmetrical BENTO grids or split columns: left column text with massive premium typography pairings and gradient text clips, right column housing a complex floating inline SVG dashboard mockup with 3D tilt elements.
  3. Interactive Feature/Services Grid (Bento Box style) featuring extremely polished glassmorphic cards, glowing borders on hover, tilt effects, and custom animated SVGs.
  4. Dynamic Showcase/Menu/List with smooth tab category switches and a live search input filter with floating labels.
  5. Stats Counter section showing numerical highlights with complex gradient overlays and background animated blobs.
  6. Client Testimonials Carousel with dynamic autoplay sliding, dot indicators, floating avatars, and navigation controls.
  7. Interactive Contact Form with floating input labels, real-time validations, animated focus rings, and a success popup modal overlay.
  8. Extensive multi-column Footer with custom SVGs, social links, glowing borders, and email newsletter inputs.
- Plan extremely detailed, multi-layered layouts. Do not just outline sections; plan inner wrappers, responsive grid parents, glowing interactive cards, text gradients, SVG icon placeholders, input validation states, and accessibility focus rings. 
- Always use dark/glassmorphic/sophisticated dark-mode aesthetics by default unless a light theme is explicitly requested. Use deep HSL base backgrounds (e.g. hsl(240, 15%, 4%)) paired with vivid neon accents (e.g. hsl(263, 90%, 55%), hsl(190, 90%, 55%)).
- For Arabic content: set isRTL=true, language="ar", and use professional, modern Arabic fonts like 'Cairo' or 'Tajawal' paired together.
- Color scheme must be a premium, curated HSL palette. NEVER use pure, raw, or muddy red/orange palettes (such as hsl(0, 60%, 45%) or similar) as the primary/background colors; they look unprofessional. Prioritize "Cyberpunk", "Deep Space", or "Linear-style" elegant dark-mode palettes with accents in deep violet, neon cyan, emerald green, indigo, or warm gold. Ensure there are HSL variables for borders (rgba(255,255,255,0.06)), text-primary, text-muted, background, and card-background.
- For each component, specify 10-20 detailed element IDs/classes in the "elements" array (e.g. #hero-section, .hero-bento-grid, .hero-cta-btn-primary, .hero-glow-blob, .feature-glass-card, .feature-icon-svg-wrapper). This allows the HTML/CSS/JS agents to align selectors perfectly and create hyper-detailed DOM trees.
- Zero emojis in any spec data.
- Generate at least 6-8 components with specific, unique IDs.`;

  const userPrompt = `Create a system specification for this request: "${userMessage}"`;

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
    ...conversationHistory.slice(-4).map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
    { role: "user", content: userPrompt },
  ];

  const completionArgs: any = {
    model,
    messages,
    max_tokens: 3000,
    stream: false,
  };
  if (model !== "deepseek-reasoner") {
    completionArgs.temperature = 0.3;
  }

  const response = await client.chat.completions.create(completionArgs);

  const rawContent = response.choices[0]?.message?.content || "{}";

  // Parse and validate the JSON
  let spec: SystemSpec;
  try {
    // Strip any accidental markdown wrapping
    const cleaned = rawContent
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/```\s*$/i, "")
      .trim();
    spec = JSON.parse(cleaned);
  } catch (e) {
    console.warn("[Architect Agent] JSON parse failed, using minimal fallback spec");
    const isArabic = /[\u0600-\u06FF]/.test(userMessage);
    spec = {
      projectTitle: isArabic ? "مشروع ويب" : "Web Project",
      projectDescription: userMessage,
      components: [
        {
          id: "hero-section",
          name: isArabic ? "القسم الرئيسي" : "Hero Section",
          description: "Main landing area with dynamic CTA",
          elements: ["#hero-section", "#hero-title", "#hero-subtitle", "#hero-cta-btn"],
          hasInteractivity: true,
        },
      ],
      colorScheme: {
        primary: "hsl(220, 90%, 56%)",
        secondary: "hsl(220, 50%, 40%)",
        accent: "hsl(280, 80%, 65%)",
        background: "hsl(220, 20%, 8%)",
        surface: "hsl(220, 18%, 12%)",
        text: "hsl(220, 20%, 92%)",
        textMuted: "hsl(220, 10%, 60%)",
      },
      typography: { headingFont: "Inter", bodyFont: "Inter" },
      breakpoints: { mobile: "480px", tablet: "768px", desktop: "1200px" },
      features: ["smooth scroll", "hover animations", "responsive layout"],
      animations: ["fadeInUp", "slideIn", "pulse"],
      isRTL: isArabic,
      language: isArabic ? "ar" : "en",
      specialInstructions: "",
    };
  }

  onStatus?.(
    `[Architect Agent] Spec complete: ${spec.components.length} components, ${
      spec.isRTL ? "RTL (Arabic)" : "LTR"
    } layout`
  );

  return spec;
}
