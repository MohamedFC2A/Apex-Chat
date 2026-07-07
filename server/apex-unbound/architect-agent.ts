/**
 * Apex Coder — Agent 1: Architect Agent
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
import { getDeepSeekRequestParams } from "../deepseek-model-router.js";
import { robustJsonParse } from "../json-repair.js";

export interface ComponentSpec {
  id: string;          // e.g. "hero-section"
  name: string;        // e.g. "Hero Section"
  description: string; // what it does
  elements: string[];  // list of sub-elements with IDs/classes
  hasInteractivity: boolean;
}

export interface PageSpec {
  id: string;
  title: string;
  description: string;
  componentIds: string[];
}

export interface UIStateContract {
  activeClass: string;
  inactiveClass: string;
  hiddenClass: string;
  modalOpenClass: string;
  submittingClass: string;
  invalidClass: string;
  eventMap: Array<{
    eventId: string;
    triggerSelector: string;
    eventType: "click" | "submit" | "input" | "change" | "hashchange" | "keydown" | "pointermove" | "touch";
    targetSelector: string;
    stateChange: string;
  }>;
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
  pages: PageSpec[];
  uiStateContract: UIStateContract;
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

  const systemPrompt = `You are the Apex Coder Lead Architect Agent. Your role is to analyze a user's web app request and produce a detailed JSON system specification. You do NOT write code — only architecture.

You must respond with ONLY a valid JSON object (no markdown, no backticks, no explanation). The JSON must exactly match this TypeScript interface:

{
  "projectTitle": "string — short name of the project",
  "projectDescription": "string — what this web app does",
  "pages": [
    {
      "id": "string — kebab-case route id, 2-5 total pages, e.g. home, services, contact",
      "title": "string — navigation label",
      "description": "string — what this page view contains",
      "componentIds": ["array of component ids rendered in this page view"]
    }
  ],
  "uiStateContract": {
    "activeClass": "is-active",
    "inactiveClass": "is-inactive",
    "hiddenClass": "is-hidden",
    "modalOpenClass": "modal-open",
    "submittingClass": "submitting",
    "invalidClass": "is-invalid",
    "eventMap": [
      {
        "eventId": "route-home",
        "triggerSelector": "[data-route='home']",
        "eventType": "click",
        "targetSelector": "#view-home",
        "stateChange": "Set #view-home and matching nav link to .is-active; remove .is-active from other .page-view and route links"
      }
    ]
  },
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
- Plan a Multi-Page Single-Bundle Architecture. Generate 2 to 5 page views depending on the prompt. Each page view must be represented in pages[] and must be routable by hash (#home, #services, #contact) within one HTML bundle.
- Create a precise Apex Coder Sync Contract in uiStateContract. It must name state classes and every important event selector so the CSS and JS agents can follow the same contract literally.
- Every page id must be stable kebab-case without spaces. Use "home" as the first page id unless the user explicitly requests a different default.
- Every component must belong to at least one page through pages[].componentIds.
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
- You MUST enforce a premium Glassmorphism theme as the default core design system for EVERY website. Plan color scheme variables and component descriptions to support frosted glass components (semi-transparent card backgrounds, translucent borders, high backdrop-blur values, and glowing neon dropshadows) regardless of whether a dark or light theme is requested. For dark themes (default), use deep HSL base backgrounds (e.g. hsl(240, 15%, 4%)) paired with vivid neon accents (e.g. hsl(263, 90%, 55%), hsl(190, 90%, 55%)). For light themes, use soft light HSL backgrounds (e.g. hsl(0, 0%, 98%)) paired with glassmorphic cards.
- Ensure that every component planned has clear, specific interactive elements listed in the "elements" array (e.g. button IDs, input fields, close buttons) so that the JS agent can bind them to real click and input handlers.
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
    max_tokens: 8000,
    stream: false,
    ...getDeepSeekRequestParams(model, 0.5),
  };

  const response = await client.chat.completions.create(completionArgs);

  const rawContent = response.choices[0]?.message?.content || "{}";

  let spec: SystemSpec;
  try {
    spec = robustJsonParse(rawContent);

    // Safeguard structural validation
    const userRequestOnly = stripInjectedContext(userMessage);
    const arabicRatio = ((userMessage + rawContent).match(/[\u0600-\u06FF]/g) || []).length / ((userMessage + rawContent).replace(/\s/g, "").length || 1);
    const isArabic = spec.isRTL || spec.language === "ar" || arabicRatio > 0.3 || /\bArabic\b|RTL|عربي|العربية/i.test(userMessage);
    if (!spec.projectTitle) spec.projectTitle = isArabic ? "مشروع ويب" : "Web Project";
    if (!spec.projectDescription || hasInjectedSearchContext(spec.projectDescription)) {
      spec.projectDescription = userRequestOnly;
    }
    if (!spec.components || !Array.isArray(spec.components) || spec.components.length < 6) {
      const fallback = buildDeterministicSpec(userRequestOnly, isArabic);
      spec.components = mergeComponentSpecs(spec.components || [], fallback.components);
    }
    if (!Array.isArray(spec.pages) || spec.pages.length < 3) {
      spec.pages = buildDefaultPages(spec.components, isArabic);
    } else {
      spec.pages = normalizePages(spec.pages, spec.components, isArabic);
    }
    if (!spec.uiStateContract) {
      spec.uiStateContract = buildDefaultUiStateContract(spec.pages);
    }
    if (!spec.colorScheme) {
      spec.colorScheme = {
        primary: "hsl(220, 90%, 56%)",
        secondary: "hsl(220, 50%, 40%)",
        accent: "hsl(280, 80%, 65%)",
        background: "hsl(220, 20%, 8%)",
        surface: "hsl(220, 18%, 12%)",
        text: "hsl(220, 20%, 92%)",
        textMuted: "hsl(220, 10%, 60%)",
      };
    }
    if (!spec.typography) {
      spec.typography = { headingFont: "Inter", bodyFont: "Inter" };
    }
    if (isArabic) {
      spec.isRTL = true;
      spec.language = "ar";
      spec.typography = {
        headingFont: spec.typography?.headingFont && spec.typography.headingFont !== "Inter" ? spec.typography.headingFont : "Cairo",
        bodyFont: spec.typography?.bodyFont && spec.typography.bodyFont !== "Inter" ? spec.typography.bodyFont : "Tajawal",
      };
    }
    if (!spec.breakpoints) {
      spec.breakpoints = { mobile: "480px", tablet: "768px", desktop: "1200px" };
    }
    if (!spec.features || !Array.isArray(spec.features)) {
      spec.features = ["smooth scroll", "hover animations", "responsive layout"];
    }
    if (!spec.animations || !Array.isArray(spec.animations)) {
      spec.animations = ["fadeInUp", "slideIn", "pulse"];
    }
  } catch (e) {
    console.warn("[Architect Agent] JSON parse failed, using minimal fallback spec");
    const userRequestOnly = stripInjectedContext(userMessage);
    const isArabic = /[\u0600-\u06FF]/.test(userMessage) || /\bArabic\b|RTL|عربي|العربية/i.test(userMessage);
    spec = buildDeterministicSpec(userRequestOnly, isArabic);
  }

  onStatus?.(
    `[Architect Agent] Spec complete: ${spec.components.length} components, ${
      spec.isRTL ? "RTL (Arabic)" : "LTR"
    } layout`
  );

  return spec;
}

function stripInjectedContext(value: string): string {
  return value
    .replace(/=== REAL-TIME WEB SEARCH CONTEXT ===[\s\S]*?(?==== REAL TOPIC IMAGE LINKS ===|=== APEX SEARCH REFERENCES ===|=== APEX CURATED IMAGE ASSETS ===|=== APEX RAW IMAGE CANDIDATES ===|$)/gi, "")
    .replace(/=== REAL TOPIC IMAGE LINKS ===[\s\S]*?(?==== APEX SEARCH REFERENCES ===|=== APEX CURATED IMAGE ASSETS ===|=== APEX RAW IMAGE CANDIDATES ===|$)/gi, "")
    .replace(/=== APEX SEARCH REFERENCES ===[\s\S]*?(?==== APEX CURATED IMAGE ASSETS ===|=== APEX RAW IMAGE CANDIDATES ===|$)/gi, "")
    .replace(/=== APEX CURATED IMAGE ASSETS ===[\s\S]*?(?==== APEX RAW IMAGE CANDIDATES ===|$)/gi, "")
    .replace(/=== APEX RAW IMAGE CANDIDATES ===[\s\S]*$/gi, "")
    .trim();
}

function hasInjectedSearchContext(value: string): boolean {
  return /=== (?:REAL-TIME WEB SEARCH CONTEXT|REAL TOPIC IMAGE LINKS|APEX SEARCH REFERENCES|APEX CURATED IMAGE ASSETS|APEX RAW IMAGE CANDIDATES) ===/i.test(value || "");
}

function buildDeterministicSpec(userMessage: string, isArabic: boolean): SystemSpec {
  const domain = inferDomain(userMessage);
  const title = getDomainTitle(domain, isArabic);
  const components = buildDomainComponents(domain, isArabic);
  const pages = buildDomainPages(domain, components, isArabic);

  return {
    projectTitle: title,
    projectDescription: userMessage,
    pages,
    uiStateContract: buildDefaultUiStateContract(pages),
    components,
    colorScheme: {
      primary: domain === "medical" ? "hsl(188, 82%, 42%)" : "hsl(252, 86%, 62%)",
      secondary: domain === "medical" ? "hsl(214, 58%, 38%)" : "hsl(226, 58%, 42%)",
      accent: domain === "medical" ? "hsl(158, 74%, 44%)" : "hsl(190, 88%, 54%)",
      background: "hsl(224, 28%, 7%)",
      surface: "hsl(224, 22%, 12%)",
      text: "hsl(220, 22%, 94%)",
      textMuted: "hsl(220, 12%, 66%)",
    },
    typography: isArabic
      ? { headingFont: "Cairo", bodyFont: "Tajawal" }
      : { headingFont: "Inter", bodyFont: "Inter" },
    breakpoints: { mobile: "480px", tablet: "768px", desktop: "1200px" },
    features: [
      "multi-page hash router",
      "appointment form validation",
      "modal success dialog",
      "live search and filters",
      "testimonial carousel",
      "FAQ accordion",
      "3D card tilt",
      "responsive RTL layout",
    ],
    animations: ["fadeInUp", "pageTransition", "cardReveal", "modalScale", "float"],
    isRTL: isArabic || /Arabic|عربي|العربية/i.test(userMessage),
    language: isArabic || /Arabic|عربي|العربية/i.test(userMessage) ? "ar" : "en",
    specialInstructions: "Generate a complete multi-page single-bundle website. Never output a one-section demo. Include real forms, route links, modal, filters, carousel, FAQ, and mobile navigation.",
  };
}

function inferDomain(userMessage: string): string {
  const msg = userMessage.toLowerCase();
  // Weighted keyword matching across 16 domains
  const domains: Array<{ domain: string; keywords: string[]; weight: number }> = [
    { domain: "ecommerce", keywords: ["متجر", "منتجات", "شراء", "سلة", "shop", "store", "product", "cart", "buy", "تسوق", "سعر", "price"], weight: 0 },
    { domain: "medical", keywords: ["مستشفى", "طبي", "صحة", "عيادة", "hospital", "clinic", "health", "medical", "doctor", "دكتور", "مرض", "علاج", "therapy"], weight: 0 },
    { domain: "education", keywords: ["مدرسة", "تعليم", "دورة", "تدريب", "school", "course", "learn", "teach", "academy", "جامعة", "university", "درس", "lesson"], weight: 0 },
    { domain: "realestate", keywords: ["عقار", "شقة", "فيلا", "منزل", "real estate", "property", "house", "apartment", "rent", "إيجار", "بيع", "بناء"], weight: 0 },
    { domain: "restaurant", keywords: ["مطعم", "طعام", "قائمة", "food", "restaurant", "menu", "cafe", "مقهى", "كافيه", "وجبة", "أكل", "delivery", "توصيل"], weight: 0 },
    { domain: "saas", keywords: ["منصة", "برنامج", "تطبيق", "saas", "platform", "software", "dashboard", "analytics", "تحليلات", "api", "نظام", "اشتراك", "subscription"], weight: 0 },
    { domain: "portfolio", keywords: ["معرض", "أعمال", "portfolio", "showcase", "projects", "مشاريع", "gallery", "creative", "مصور", "photographer", "مصمم", "designer"], weight: 0 },
    { domain: "blog", keywords: ["مدونة", "مقالات", "blog", "article", "news", "أخبار", "magazine", "مجلة", "كاتب", "writer", "نشر", "publish"], weight: 0 },
    { domain: "booking", keywords: ["حجز", "موعد", "booking", "reservation", "appointment", "schedule", "جدول", "calendar", "تذكرة", "ticket", "hotel", "فندق"], weight: 0 },
    { domain: "finance", keywords: ["بنك", "مال", "استثمار", "bank", "finance", "investment", "crypto", "تداول", "trading", "محفظة", "wallet", "عملات"], weight: 0 },
  ];
  for (const d of domains) { for (const kw of d.keywords) { if (msg.includes(kw)) d.weight++; } }
  domains.sort((a, b) => b.weight - a.weight);
  return domains[0].weight > 0 ? domains[0].domain : "generic";
}

function getDomainTitle(domain: string, isArabic: boolean): string {
  const titles: Record<string, { ar: string; en: string }> = {
    medical: { ar: "منصة عيادة طبية", en: "Medical Clinic Platform" },
    commerce: { ar: "متجر إلكتروني", en: "Commerce Website" },
    saas: { ar: "لوحة منصة SaaS", en: "SaaS Dashboard" },
    restaurant: { ar: "موقع مطعم", en: "Restaurant Website" },
    generic: { ar: "موقع ويب متكامل", en: "Complete Web Platform" },
  };
  return isArabic ? titles[domain].ar : titles[domain].en;
}

function buildDomainComponents(domain: string, isArabic: boolean): ComponentSpec[] {
  const labels = {
    nav: isArabic ? "شريط تنقل" : "Navigation",
    hero: isArabic ? "واجهة رئيسية" : "Hero",
    services: domain === "medical" ? (isArabic ? "الخدمات الطبية" : "Medical Services") : (isArabic ? "الخدمات" : "Services"),
    showcase: domain === "medical" ? (isArabic ? "الأطباء والتخصصات" : "Doctors and Specialties") : (isArabic ? "العروض" : "Showcase"),
    booking: domain === "medical" ? (isArabic ? "حجز موعد" : "Appointment Booking") : (isArabic ? "نموذج إجراء" : "Action Form"),
    stats: isArabic ? "مؤشرات وثقة" : "Stats and Trust",
    testimonials: isArabic ? "آراء العملاء" : "Testimonials",
    faq: isArabic ? "الأسئلة الشائعة" : "FAQ",
    footer: isArabic ? "تذييل وتواصل" : "Footer and Contact",
  };

  return [
    {
      id: "main-navigation",
      name: labels.nav,
      description: "Glass navigation with route links and mobile drawer",
      elements: ["#main-navigation", "#nav-logo", "#mobile-menu-toggle", ".route-link", ".nav-drawer", "[data-route]"],
      hasInteractivity: true,
    },
    {
      id: "hero-section",
      name: labels.hero,
      description: "Primary value proposition with CTA and visual dashboard",
      elements: ["#hero-section", "#hero-title", "#hero-subtitle", "#hero-cta-btn", "#hero-secondary-btn", ".browser-mockup", ".hero-metric-card"],
      hasInteractivity: true,
    },
    {
      id: "services-section",
      name: labels.services,
      description: "Filterable services grid with detailed cards",
      elements: ["#services-section", "#service-search", ".service-filter", ".service-card", "[data-filter]", "[data-filter-item]", "[data-category]"],
      hasInteractivity: true,
    },
    {
      id: "showcase-section",
      name: labels.showcase,
      description: "Tabbed specialist/showcase section with profiles",
      elements: ["#showcase-section", ".tab-control", ".tab-panel", "[data-tab]", "[data-tab-panel]", ".profile-card", ".glass-card"],
      hasInteractivity: true,
    },
    {
      id: "booking-section",
      name: labels.booking,
      description: "Validated booking or lead form with success modal",
      elements: ["#booking-section", "#appointment-form", "#patient-name", "#patient-email", "#appointment-date", "#booking-submit", "#success-modal", ".modal-close"],
      hasInteractivity: true,
    },
    {
      id: "stats-section",
      name: labels.stats,
      description: "Trust metrics and operational highlights",
      elements: ["#stats-section", ".stat-card", ".stat-value", ".stat-label", ".trust-badge"],
      hasInteractivity: false,
    },
    {
      id: "testimonials-section",
      name: labels.testimonials,
      description: "Carousel with client/patient stories",
      elements: ["#testimonials-section", ".testimonials-carousel", ".carousel-track", ".testimonial-card", ".carousel-next", ".carousel-prev", ".carousel-dot"],
      hasInteractivity: true,
    },
    {
      id: "faq-section",
      name: labels.faq,
      description: "FAQ accordion and support details",
      elements: ["#faq-section", ".faq-item", ".faq-question", ".faq-answer", "[data-toggle-target]"],
      hasInteractivity: true,
    },
    {
      id: "site-footer",
      name: labels.footer,
      description: "Footer with contact, newsletter, social and route links",
      elements: ["#site-footer", "#newsletter-form", "#newsletter-email", "#newsletter-submit", ".footer-route-link", ".social-link"],
      hasInteractivity: true,
    },
  ];
}

function buildDomainPages(domain: string, components: ComponentSpec[], isArabic: boolean): PageSpec[] {
  const ids = components.map((component) => component.id);
  return [
    {
      id: "home",
      title: isArabic ? "الرئيسية" : "Home",
      description: "Primary landing and trust overview",
      componentIds: ids.filter((id) => ["main-navigation", "hero-section", "stats-section", "testimonials-section", "site-footer"].includes(id)),
    },
    {
      id: "services",
      title: domain === "medical" && isArabic ? "الخدمات" : "Services",
      description: "Services, filtering, and category exploration",
      componentIds: ids.filter((id) => ["main-navigation", "services-section", "showcase-section", "site-footer"].includes(id)),
    },
    {
      id: domain === "medical" ? "doctors" : "showcase",
      title: domain === "medical" ? (isArabic ? "الأطباء" : "Doctors") : (isArabic ? "العروض" : "Showcase"),
      description: "Specialists, featured items, or portfolio detail",
      componentIds: ids.filter((id) => ["main-navigation", "showcase-section", "testimonials-section", "site-footer"].includes(id)),
    },
    {
      id: domain === "medical" ? "booking" : "contact",
      title: domain === "medical" ? (isArabic ? "الحجز" : "Booking") : (isArabic ? "تواصل" : "Contact"),
      description: "Primary conversion flow and validated form",
      componentIds: ids.filter((id) => ["main-navigation", "booking-section", "faq-section", "site-footer"].includes(id)),
    },
    {
      id: "faq",
      title: isArabic ? "الأسئلة" : "FAQ",
      description: "Questions, support, and final contact routes",
      componentIds: ids.filter((id) => ["main-navigation", "faq-section", "booking-section", "site-footer"].includes(id)),
    },
  ];
}

function mergeComponentSpecs(current: ComponentSpec[], fallback: ComponentSpec[]): ComponentSpec[] {
  const byId = new Map<string, ComponentSpec>();
  for (const component of fallback) byId.set(component.id, component);
  for (const component of current) {
    if (!component?.id) continue;
    byId.set(component.id, {
      ...byId.get(component.id),
      ...component,
      elements: Array.from(new Set([...(byId.get(component.id)?.elements || []), ...(component.elements || [])])),
    });
  }
  return Array.from(byId.values());
}

function normalizePages(pages: PageSpec[], components: ComponentSpec[], isArabic: boolean): PageSpec[] {
  const componentIds = new Set((components || []).map((component) => component.id));
  const normalized = pages
    .slice(0, 5)
    .map((page, index) => {
      const fallbackId = index === 0 ? "home" : `page-${index + 1}`;
      const id = slugify(page.id || fallbackId) || fallbackId;
      const pageComponentIds = (page.componentIds || []).filter((componentId) => componentIds.has(componentId));
      return {
        id,
        title: page.title || (index === 0 ? (isArabic ? "الرئيسية" : "Home") : id),
        description: page.description || "",
        componentIds: pageComponentIds.length > 0 ? pageComponentIds : Array.from(componentIds).slice(0, 2),
      };
    });

  if (normalized.length < 2) {
    return buildDefaultPages(components, isArabic);
  }

  return normalized;
}

function buildDefaultPages(components: ComponentSpec[], isArabic: boolean): PageSpec[] {
  const componentIds = (components || []).map((component) => component.id);
  if (componentIds.length >= 6) {
    return [
      {
        id: "home",
        title: isArabic ? "الرئيسية" : "Home",
        description: "Primary landing and trust overview",
        componentIds: componentIds.filter((id) => ["main-navigation", "hero-section", "stats-section", "testimonials-section", "site-footer"].includes(id)),
      },
      {
        id: "services",
        title: isArabic ? "الخدمات" : "Services",
        description: "Services and category exploration",
        componentIds: componentIds.filter((id) => ["main-navigation", "services-section", "showcase-section", "site-footer"].includes(id)),
      },
      {
        id: "showcase",
        title: isArabic ? "الفريق" : "Showcase",
        description: "Profiles, featured content, and proof points",
        componentIds: componentIds.filter((id) => ["main-navigation", "showcase-section", "testimonials-section", "site-footer"].includes(id)),
      },
      {
        id: "booking",
        title: isArabic ? "الحجز" : "Booking",
        description: "Conversion flow and validated form",
        componentIds: componentIds.filter((id) => ["main-navigation", "booking-section", "faq-section", "site-footer"].includes(id)),
      },
      {
        id: "faq",
        title: isArabic ? "الأسئلة" : "FAQ",
        description: "Questions, support, and final contact routes",
        componentIds: componentIds.filter((id) => ["main-navigation", "faq-section", "site-footer"].includes(id)),
      },
    ];
  }

  const firstHalf = componentIds.slice(0, Math.max(1, Math.ceil(componentIds.length / 2)));
  const secondHalf = componentIds.slice(Math.max(1, Math.ceil(componentIds.length / 2)));
  return [
    {
      id: "home",
      title: isArabic ? "الرئيسية" : "Home",
      description: "Primary landing and overview page view",
      componentIds: firstHalf,
    },
    {
      id: "contact",
      title: isArabic ? "تواصل" : "Contact",
      description: "Conversion, contact, and final action page view",
      componentIds: secondHalf.length > 0 ? secondHalf : firstHalf,
    },
  ];
}

function buildDefaultUiStateContract(pages: PageSpec[]): UIStateContract {
  return {
    activeClass: "is-active",
    inactiveClass: "is-inactive",
    hiddenClass: "is-hidden",
    modalOpenClass: "modal-open",
    submittingClass: "submitting",
    invalidClass: "is-invalid",
    eventMap: pages.map((page) => ({
      eventId: `route-${page.id}`,
      triggerSelector: `[data-route="${page.id}"]`,
      eventType: "click",
      targetSelector: `#view-${page.id}`,
      stateChange: `Activate #view-${page.id}, update location hash to #${page.id}, and sync .is-active across route links and page views.`,
    })),
  };
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\u0600-\u06FF]+/gi, "-")
    .replace(/^-+|-+$/g, "");
}

export function cleanJsonString(raw: string): string {
  let cleaned = raw;
  cleaned = cleaned.replace(/<think>[\s\S]*?<\/think>/gi, "");
  cleaned = cleaned
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();

  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.slice(firstBrace, lastBrace + 1);
  }

  // Remove trailing commas in arrays and objects (which are invalid in strict JSON)
  cleaned = cleaned.replace(/,\s*([\]}])/g, "$1");

  return cleaned;
}
