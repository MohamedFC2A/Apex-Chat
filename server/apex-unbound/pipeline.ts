/**
 * APEX Unbound Pipeline Orchestrator
 *
 * Master coordinator for the 6-phase multi-agent web generation system:
 *
 * ┌───────────────────────────────────────────────────────────┐
 * │               APEX UNBOUND PIPELINE                       │
 * │                                                           │
 * │  [1] Architect Agent    → SystemSpec JSON                 │
 * │           ↓                                               │
 * │  [2] HTML Agent         → Semantic DOM (HTML5)            │
 * │           ↓                                               │
 * │  [3] Selector Sync      → Global Selector Map (AST)       │
 * │           ↓                                               │
 * │  [4a] CSS Agent  ─────┐ (concurrent)                      │
 * │  [4b] JS Agent   ─────┘                                   │
 * │           ↓                                               │
 * │  [5] Bundler Engine     → Self-Contained HTML             │
 * └───────────────────────────────────────────────────────────┘
 */

import OpenAI from "openai";
import { runArchitectAgent, cleanJsonString, type SystemSpec } from "./architect-agent.js";
import { runHtmlAgent } from "./html-agent.js";
import { runSelectorSyncEngine, type GlobalSelectorMap } from "./selector-sync-engine.js";
import { runCssAgent } from "./css-agent.js";
import { runJsAgent } from "./js-agent.js";
import { runBundlerEngine, type BundleResult } from "./bundler-engine.js";
import { getDeepSeekRequestParams, mapDeepSeekModelForTask, isOfficialDeepSeekEndpoint } from "../deepseek-model-router.js";
import { buildCssQualitySummary, buildHtmlQualitySummary, buildRuntimeQualitySummary, ensureProductionCss, ensureProductionHtml, ensureProductionJavaScript } from "./runtime-guard.js";
import { buildApexSearchContext, runApexSearch } from "../apex-search-engine.js";

// ──────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────

export interface UnboundPipelineRequest {
  message: string;
  conversationHistory?: Array<{ role: "user" | "assistant"; content: string }>;
  spec?: SystemSpec;
  searchResults?: any;
  selectedChoices?: Array<{ questionId: string; title: string; description: string; theme: string; config?: Record<string, any> }>;
  isFollowUp?: boolean;
}

export interface UnboundPipelinePhase {
  phase: number;
  name: string;
  status: "pending" | "running" | "done" | "error";
  detail?: string;
  durationMs?: number;
}

export interface UnboundPipelineResult {
  bundledHtml?: string;
  spec?: SystemSpec;
  selectorMap?: GlobalSelectorMap;
  bundle?: BundleResult;
  phases: UnboundPipelinePhase[];
  totalDurationMs: number;
  formattedOutput?: string; // The markdown-formatted content for the chat message
  isPaused?: boolean;
  questions?: Array<{
    id: string;
    question: string;
    choices: Array<{ title: string; description: string; theme: string; config?: Record<string, any> }>
  }>;
  searchResults?: any;
}

export type UnboundChunkCallback = (chunk: {
  content?: string;
  reasoningContent?: string;
  phase?: UnboundPipelinePhase;
  questions?: Array<{
    id: string;
    question: string;
    choices: Array<{ title: string; description: string; theme: string; config?: Record<string, any> }>
  }>;
  spec?: SystemSpec;
  searchResults?: any;
}) => void;

// ──────────────────────────────────────────────────────────────
// Mid-Pipeline Question Generator
// ──────────────────────────────────────────────────────────────

async function generateQuestionForSpec(
  client: OpenAI,
  model: string,
  prompt: string,
  spec: SystemSpec
): Promise<{ questions: Array<{ id: string; question: string; choices: Array<{ title: string; description: string; theme: string; config?: Record<string, any> }> }> }> {
  const questionCount = Math.min(5, Math.max(3, (spec.pages?.length || 2) + 1));
  const systemPrompt = `You are a senior product architect preparing a formal requirements approval brief. Given a user's prompt describing a website they want to build and the System Specification generated for it, generate EXACTLY ${questionCount} project-specific design questions and exactly 3 choices/answers for each question to configure the website.
The questions must be in Arabic, tailored specifically to the website idea:
- Question 1 (Theme & Aesthetics): E.g., which visual theme/style do you prefer? (Provide 3 diverse options).
- Question 2 (Layout & Navigation): E.g., how should the page sections and navigation be structured? (Provide 3 diverse layouts).
- Question 3 (Core Feature & Interactions): E.g., what main interactive feature should be emphasized? (Provide 3 diverse interaction flows).
- Additional questions, when present, must be specific to the planned pages and product domain. For ecommerce ask about cart/filter behavior; for booking ask about calendar/steps; for SaaS ask about metrics/workflows; for Arabic content ask about tone and RTL content density.

You must return the response as a JSON object containing a "questions" array of exactly ${questionCount} objects.
Each question object must contain "id" (string: "q1", "q2", etc.), "question" (string), and "choices" (array of exactly 3 objects).
Each choice must represent a totally different direction, layout, and feature set. Never repeat the same style.
Each choice must include a "config" object with useful generation hints such as layout, interactionPriority, pageFocus, contentTone, or featureDepth.
Use formal Arabic suitable for a client approval document. Do not use emojis, decorative symbols, slang, or exaggerated marketing phrasing in question or choice titles.
Return ONLY valid JSON. No markdown backticks, no markdown formatting, no other text.

JSON structure:
{
  "questions": [
    {
      "id": "q1",
      "question": "Arabic question 1",
      "choices": [
        {
          "title": "Short title in Arabic",
          "description": "Detailed description in Arabic",
          "theme": "A theme keyword like 'glassmorphism', 'neobrutalism', 'minimalist-dark', 'cyberpunk', 'luxury-gold'",
          "config": { "layout": "string", "interactionPriority": "string", "pageFocus": "string" }
        },
        ...
      ]
    },
    ...
  ]
}`;

  try {
    const response = await client.chat.completions.create({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Generate a customization list of exactly ${questionCount} questions (each with 3 choices) for this project: "${spec.projectTitle} - ${spec.projectDescription}". Pages: ${JSON.stringify(spec.pages || [])}. User prompt: "${prompt}"` },
      ],
      max_tokens: 1500,
      ...getDeepSeekRequestParams(model, 0.75),
    });

    const content = response.choices[0]?.message?.content || "";
    const cleanContent = cleanJsonString(content);
    const parsed = JSON.parse(cleanContent);
    if (Array.isArray(parsed.questions) && parsed.questions.length >= 3 && parsed.questions.length <= 5) {
      return parsed;
    }
  } catch (e) {
    console.error("[Question Generation] Failed to parse AI response, using fallback. Error:", e);
  }

  // Fallback questions array
  return {
    questions: [
      {
        id: "q1",
        question: `ما هو التوجه الإبداعي والمظهر العام لمشروعك ${spec.projectTitle}؟`,
        choices: [
          {
            title: "هوية زجاجية مؤسسية (Glassmorphism)",
            description: "مظهر شفاف أنيق مع بطاقات زجاجية عائمة وحركات ناعمة تدعم الطابع الحديث.",
            theme: "glassmorphism"
          },
          {
            title: "هوية بصرية جريئة (Neobrutalism)",
            description: "ألوان حيوية متباينة مع حواف سميكة وتصميم فريد يبرز هوية موقعك.",
            theme: "neobrutalism"
          },
          {
            title: "واجهة داكنة تنفيذية (Minimalist Dark)",
            description: "واجهة داكنة مريحة للعين مع خطوط رفيعة وتفاصيل باللون الأبيض والرمادي لسهولة التصفح.",
            theme: "minimalist"
          }
        ]
      },
      {
        id: "q2",
        question: "كيف تفضل هيكل وتخطيط تصفح الموقع؟",
        choices: [
          {
            title: "تدفق عرض متصل (Single Page Scroll)",
            description: "عرض انسيابي متدفق من الأعلى للأسفل مع انتقال سلس بين الأقسام.",
            theme: "single-page"
          },
          {
            title: "هيكل أقسام مبوبة (Tabbed Section Layout)",
            description: "تقسيم المحتوى إلى تبويبات مستقلة لسهولة التنقل والوصول المباشر للمعلومات.",
            theme: "tabbed"
          },
          {
            title: "هيكل لوحة معلومات جانبية (Sidebar Dashboard)",
            description: "تصميم احترافي يعتمد على شريط ملاحة جانبي مع شاشات عرض محتوى تفصيلية.",
            theme: "dashboard"
          }
        ]
      },
      {
        id: "q3",
        question: "ما هي الوظيفة أو الإضافة البرمجية الأكثر أهمية لموقعك؟",
        choices: [
          {
            title: "وحدة إجراءات تفاعلية (Interactive Features/Booking)",
            description: "أدوات مخصصة مثل حجز تفاعلي، أو سلة مشتريات مع عرض للأسعار وحساب تلقائي للمجموع.",
            theme: "dynamic-features"
          },
          {
            title: "مساعد محادثة مدمج (AI Chat Assistant Modal)",
            description: "واجهة دردشة مخصصة لخدمة العملاء والرد التفاعلي تحاكي روبوت محادثة ذكي.",
            theme: "ai-assistant"
          },
          {
            title: "بحث وتصفية مباشرة (Live Filter & Search)",
            description: "إمكانية البحث المباشر وتصفية العناصر والمنتجات ديناميكياً مع حركات فرز سريعة.",
            theme: "live-filter"
          }
        ]
      }
    ]
  };
}

async function runSelfCorrectionAgent(
  client: OpenAI,
  model: string,
  userMessage: string,
  spec: SystemSpec,
  selectorMap: GlobalSelectorMap,
  htmlCode: string,
  cssCode: string,
  jsCode: string,
  onStatus?: (msg: string) => void
): Promise<{ htmlCode: string; cssCode: string; jsCode: string; notes: string }> {
  onStatus?.("[Self-Correction Agent] Auditing merged code against selectors, routes, and UI state contract...");

  const systemPrompt = `You are the APEX Unbound Code Reviewer and Self-Correction Agent.

Your job is to inspect the complete HTML, CSS, and JavaScript for runtime selector mismatches, missing route support, missing state classes, and fragile DOM access. You must return corrected code, not commentary.

Mandatory checks:
1. Every JS selector must exist in the HTML or be guarded defensively.
2. Every CSS state class from uiStateContract must be styled where applicable.
3. The single-bundle client router must support hash routes for every spec.pages item using #page-id and #view-page-id.
4. Page views must toggle .page-view and the contract's active/hidden classes consistently.
5. Forms must prevent default submission, validate required inputs, add/remove invalid/submitting classes, and avoid null pointer exceptions.
6. Carousels/modals/tabs/search handlers must be guarded and must not throw if optional elements are absent.

Return ONLY valid JSON with this exact shape:
{
  "htmlCode": "corrected full HTML",
  "cssCode": "corrected CSS",
  "jsCode": "corrected JavaScript",
  "notes": "short audit summary"
}`;

  const response = await client.chat.completions.create({
    model,
    messages: [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: `User request: ${userMessage}

SystemSpec:
${JSON.stringify(spec, null, 2)}

Selector map:
${JSON.stringify({
  ids: selectorMap.ids.map((token) => token.cssSelector),
  classes: selectorMap.classes.map((token) => token.cssSelector),
  dataAttributes: selectorMap.dataAttributes.map((token) => token.cssSelector),
  interactiveElements: selectorMap.interactiveElements.map((token) => token.cssSelector),
}, null, 2)}

HTML:
${htmlCode}

CSS:
${cssCode}

JavaScript:
${jsCode}`,
      },
    ],
    max_tokens: 24000,
    stream: false,
    ...getDeepSeekRequestParams(model, 0.1),
  });

  const rawContent = response.choices[0]?.message?.content || "{}";

  try {
    const parsed = JSON.parse(cleanJsonString(rawContent));
    return {
      htmlCode: typeof parsed.htmlCode === "string" && parsed.htmlCode.trim() ? parsed.htmlCode.trim() : htmlCode,
      cssCode: typeof parsed.cssCode === "string" && parsed.cssCode.trim() ? parsed.cssCode.trim() : cssCode,
      jsCode: typeof parsed.jsCode === "string" && parsed.jsCode.trim() ? parsed.jsCode.trim() : jsCode,
      notes: typeof parsed.notes === "string" ? parsed.notes : "Self-correction completed.",
    };
  } catch (error) {
    console.warn("[Self-Correction Agent] Failed to parse correction response; using original generated code.", error);
    return {
      htmlCode,
      cssCode,
      jsCode,
      notes: "Self-correction response was not valid JSON; original generated code was preserved.",
    };
  }
}

// ──────────────────────────────────────────────────────────────
// Helper for Markdown Plan
// ──────────────────────────────────────────────────────────────

function buildPlanMarkdown(spec: SystemSpec): string {
  const stack = (spec as any).techStack || ["HTML5", "Vanilla CSS", "Vanilla JS"];
  const pages = (spec.pages || [])
    .map((page) => `| ${page.title} | #${page.id} | ${page.description || "Page view"} | ${(page.componentIds || []).join(", ") || "Core components"} |`)
    .join("\n");
  const events = (spec.uiStateContract?.eventMap || [])
    .slice(0, 6)
    .map((event) => `| ${event.eventId} | ${event.triggerSelector} | ${event.targetSelector} | ${event.stateChange} |`)
    .join("\n");
  const isArabic = spec.isRTL || spec.language === "ar";

  if (isArabic) {
    return `
## وثيقة خطة التنفيذ

**اسم المشروع:** ${spec.projectTitle}
**نطاق العمل:** ${spec.projectDescription}
**حزمة التنفيذ:** ${stack.join(", ")}
**اتجاه الواجهة:** ${spec.isRTL ? "RTL" : "LTR"}

### هيكل الصفحات المعتمد
| الصفحة | المسار الداخلي | الغرض | المكونات |
|---|---|---|---|
${pages || `| الرئيسية | #home | واجهة البداية | Core components |`}

### عقد مزامنة الواجهة
| البند | القيمة |
|---|---|
| حالة العرض النشطة | .${spec.uiStateContract?.activeClass || "is-active"} |
| حالة الإخفاء | .${spec.uiStateContract?.hiddenClass || "is-hidden"} |
| حالة النافذة المنبثقة | .${spec.uiStateContract?.modalOpenClass || "modal-open"} |
| حالة الإرسال | .${spec.uiStateContract?.submittingClass || "submitting"} |
| حالة الإدخال غير الصحيح | .${spec.uiStateContract?.invalidClass || "is-invalid"} |

### خريطة الأحداث الرئيسية
| الحدث | المشغل | الهدف | الأثر |
|---|---|---|---|
${events || `| route-home | [data-route="home"] | #view-home | تفعيل الصفحة الرئيسية وتحديث حالة التنقل |`}

### معايير القبول
| المعيار | الوصف |
|---|---|
| التنقل الداخلي | جميع الصفحات تعمل داخل ملف واحد عبر hash routing دون ملفات إضافية. |
| اتساق المحددات | CSS و JavaScript يلتزمان بعقد الواجهة ومحددات DOM الفعلية. |
| الاستجابة | التصميم يدعم الجوال والتابلت وسطح المكتب دون تداخل نصي. |
| التدقيق النهائي | مرحلة المراجعة الذاتية تصحح تعارضات DOM قبل التجميع النهائي. |
`;
  }

  return `
## Implementation Plan

**Project:** ${spec.projectTitle}
**Scope:** ${spec.projectDescription}
**Delivery Stack:** ${stack.join(", ")}
**Interface Direction:** ${spec.isRTL ? "RTL" : "LTR"}

### Approved Page Structure
| Page | Internal Route | Purpose | Components |
|---|---|---|---|
${pages || `| Home | #home | Primary page view | Core components |`}

### UI Synchronization Contract
| Item | Value |
|---|---|
| Active state | .${spec.uiStateContract?.activeClass || "is-active"} |
| Hidden state | .${spec.uiStateContract?.hiddenClass || "is-hidden"} |
| Modal state | .${spec.uiStateContract?.modalOpenClass || "modal-open"} |
| Submit state | .${spec.uiStateContract?.submittingClass || "submitting"} |
| Invalid input state | .${spec.uiStateContract?.invalidClass || "is-invalid"} |

### Primary Event Map
| Event | Trigger | Target | Effect |
|---|---|---|---|
${events || `| route-home | [data-route="home"] | #view-home | Activate the home page and synchronize navigation state. |`}

### Acceptance Criteria
| Criterion | Description |
|---|---|
| Internal routing | All pages run in one HTML bundle through hash routing. |
| Selector consistency | CSS and JavaScript follow the actual DOM selector map and UI contract. |
| Responsiveness | Layout supports mobile, tablet, and desktop without text overlap. |
| Final audit | Self-correction validates DOM, CSS, and JavaScript before final bundling. |
`;
}

function normalizePipelineSpec(input: Partial<SystemSpec> | any): SystemSpec {
  const isRTL = Boolean(input?.isRTL || input?.language === "ar");
  const language = input?.language === "ar" || input?.language === "mixed" || input?.language === "en"
    ? input.language
    : (isRTL ? "ar" : "en");

  const pagesSource = Array.isArray(input?.pages) && input.pages.length > 0
    ? input.pages
    : [
        { id: "home", title: isRTL ? "الرئيسية" : "Home", description: "Primary landing page", componentIds: ["hero-section", "stats-section"] },
        { id: "services", title: isRTL ? "الخدمات" : "Services", description: "Catalog or service listing", componentIds: ["services-section"] },
        { id: "showcase", title: isRTL ? "العروض" : "Showcase", description: "Featured content and tabs", componentIds: ["showcase-section"] },
        { id: "contact", title: isRTL ? "التواصل" : "Contact", description: "Request form", componentIds: ["request-form"] },
        { id: "faq", title: isRTL ? "الأسئلة" : "FAQ", description: "Expandable support questions", componentIds: ["faq-section"] },
      ];

  const pages = pagesSource.map((page: any, index: number) => {
    const id = normalizeRouteId(page?.id || page?.title || `page-${index + 1}`);
    return {
      id,
      title: String(page?.title || id),
      description: String(page?.description || page?.purpose || `${page?.title || id} page view`),
      componentIds: Array.isArray(page?.componentIds)
        ? page.componentIds.map((componentId: any) => normalizeRouteId(String(componentId)))
        : Array.isArray(page?.components)
          ? page.components.map((component: any) => normalizeRouteId(String(component)))
          : [],
    };
  });

  const componentsSource = Array.isArray(input?.components) && input.components.length > 0 ? input.components : [];
  const components = componentsSource.map((component: any, index: number) => {
    const id = normalizeRouteId(component?.id || component?.name || `component-${index + 1}`);
    const interactions = Array.isArray(component?.interactions) ? component.interactions : [];
    return {
      id,
      name: String(component?.name || id),
      description: String(component?.description || component?.purpose || `${component?.name || id} component`),
      elements: Array.isArray(component?.elements)
        ? component.elements.map(String)
        : interactions.map((interaction: any) => `[data-${normalizeRouteId(String(interaction))}]`),
      hasInteractivity: typeof component?.hasInteractivity === "boolean" ? component.hasInteractivity : interactions.length > 0,
    };
  });

  const normalizedComponents = components.length > 0
    ? components
    : [
        { id: "hero-section", name: "Hero Section", description: "Primary value proposition and CTA", elements: ["#hero-section", "#hero-cta-btn"], hasInteractivity: true },
        { id: "services-section", name: "Services Section", description: "Searchable cards and filters", elements: ["#services-section", "[data-filter]", "[data-search]"], hasInteractivity: true },
        { id: "request-form", name: "Request Form", description: "Validated lead or order capture", elements: ["#request-form", "input", "textarea"], hasInteractivity: true },
      ];

  const uiStateContract = {
    activeClass: input?.uiStateContract?.activeClass || "is-active",
    inactiveClass: input?.uiStateContract?.inactiveClass || "is-inactive",
    hiddenClass: input?.uiStateContract?.hiddenClass || "is-hidden",
    modalOpenClass: input?.uiStateContract?.modalOpenClass || "modal-open",
    submittingClass: input?.uiStateContract?.submittingClass || "submitting",
    invalidClass: input?.uiStateContract?.invalidClass || "is-invalid",
    eventMap: Array.isArray(input?.uiStateContract?.eventMap)
      ? input.uiStateContract.eventMap
      : pages.map((page: any) => ({
          eventId: `route-${page.id}`,
          triggerSelector: `[data-route="${page.id}"]`,
          eventType: "click" as const,
          targetSelector: `#view-${page.id}`,
          stateChange: `Activate #view-${page.id} and synchronize route state.`,
        })),
  };

  return {
    projectTitle: String(input?.projectTitle || (isRTL ? "موقع ويب احترافي" : "Professional Website")),
    projectDescription: String(input?.projectDescription || (isRTL ? "تجربة ويب متعددة الصفحات بتفاعل كامل." : "A multi-page web experience with complete interactions.")),
    pages,
    uiStateContract,
    components: normalizedComponents,
    colorScheme: {
      primary: input?.colorScheme?.primary || "hsl(172, 72%, 42%)",
      secondary: input?.colorScheme?.secondary || "hsl(220, 16%, 18%)",
      accent: input?.colorScheme?.accent || "hsl(38, 92%, 54%)",
      background: input?.colorScheme?.background || "hsl(220, 18%, 8%)",
      surface: input?.colorScheme?.surface || "hsl(220, 16%, 13%)",
      text: input?.colorScheme?.text || "hsl(0, 0%, 96%)",
      textMuted: input?.colorScheme?.textMuted || "hsl(220, 8%, 70%)",
    },
    typography: {
      headingFont: input?.typography?.headingFont || (isRTL ? "Cairo" : "Inter"),
      bodyFont: input?.typography?.bodyFont || (isRTL ? "Tajawal" : "Inter"),
    },
    breakpoints: {
      mobile: input?.breakpoints?.mobile || "480px",
      tablet: input?.breakpoints?.tablet || "768px",
      desktop: input?.breakpoints?.desktop || "1200px",
    },
    features: Array.isArray(input?.features) && input.features.length > 0
      ? input.features.map(String)
      : [
          "Hash-based multi-page router",
          "Live search and category filtering",
          "Validated request form with success modal",
          "Tabs, disclosure panels, and carousel controls",
          "Responsive layout with keyboard-accessible controls",
        ],
    animations: Array.isArray(input?.animations) && input.animations.length > 0
      ? input.animations.map(String)
      : ["fadeInUp", "scaleIn", "slideIn", "softPulse"],
    isRTL,
    language,
    specialInstructions: String(input?.specialInstructions || ""),
  };
}

function normalizeRouteId(value: string): string {
  const normalized = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u0600-\u06ff]+/gi, "-")
    .replace(/^-+|-+$/g, "");
  return normalized || "section";
}

// ──────────────────────────────────────────────────────────────
// Pipeline Executor
// ──────────────────────────────────────────────────────────────


export async function runUnboundPipeline(
  client: OpenAI,
  request: UnboundPipelineRequest,
  onChunk?: UnboundChunkCallback
): Promise<UnboundPipelineResult> {
  const pipelineStart = Date.now();

  const isOfficial = isOfficialDeepSeekEndpoint(client.baseURL);
  const architectModel = isOfficial ? "deepseek-v4-pro" : "deepseek-v4-pro";
  const specialistModel = isOfficial ? "deepseek-v4-flash" : "deepseek-v4-flash";

  const isResumed = !!request.spec;
  const isFollowUp = !!request.isFollowUp;
  let spec: SystemSpec = request.spec ? normalizePipelineSpec(request.spec) : request.spec!;
  let searchResults = request.searchResults;

  const phases: UnboundPipelinePhase[] = [
    { 
      phase: 1, 
      name: "Requirements Architecture — Formal Specification", 
      status: (isResumed && !isFollowUp) ? "done" : "pending",
      detail: (isResumed && !isFollowUp) ? `${spec.components.length} components planned` : undefined 
    },
    { 
      phase: 2, 
      name: "Requirements Confirmation — Configuration Brief", 
      status: isResumed ? "done" : "pending",
      detail: isResumed && request.selectedChoices ? `Selected ${request.selectedChoices.length} customization choices` : undefined
    },
    { phase: 3, name: "Markup Engineering — Semantic DOM", status: "pending" },
    { phase: 4, name: "Interface Contract — Selector Registry", status: "pending" },
    { phase: 5, name: "Presentation and Logic — Parallel Build", status: "pending" },
    { phase: 6, name: "Quality Review — Integration Audit", status: "pending" },
    { phase: 7, name: "Release Packaging — Single Bundle", status: "pending" },
  ];

  const updatePhase = (phaseNum: number, updates: Partial<UnboundPipelinePhase>) => {
    const idx = phases.findIndex((p) => p.phase === phaseNum);
    if (idx !== -1) {
      phases[idx] = { ...phases[idx], ...updates };
      onChunk?.({ phase: phases[idx] });
    }
  };

  const emitStatus = (content: string) => {
    onChunk?.({ content });
  };

  console.log("\n╔══════════════════════════════════════════╗");
  console.log(isResumed ? (isFollowUp ? "║   APEX UNBOUND FOLLOW-UP STARTING        ║" : "║     APEX UNBOUND PIPELINE RESUMING       ║") : "║     APEX UNBOUND PIPELINE STARTING       ║");
  console.log("╚══════════════════════════════════════════╝");

  // 1. Gather Search Context (if not already present or if this is a follow-up)
  if (!searchResults) {
    emitStatus("\n**[Phase 1/7] - Discovery and Reference Review**\nCollecting supporting references, visual direction, and implementation context.\n\n");
    searchResults = await runApexSearch(request.message);
  }

  let searchContext = buildApexSearchContext(searchResults);
  if (spec && searchResults?.imageAssets?.length) {
    (spec as any).mediaAssets = searchResults.imageAssets;
  }
  
  if (searchContext && (!isResumed || isFollowUp)) {
    emitStatus(`> Apex Search selected ${searchResults.organic?.length || 0} references and ${searchResults.imageAssets?.length || searchResults.images?.length || 0} image assets.\n\n`);
  }

  // 2. Run Phase 1 if starting fresh or if doing a follow-up request
  if (!isResumed || isFollowUp) {
    updatePhase(1, { status: "running" });
    emitStatus(isFollowUp 
      ? "\n**[Phase 1/7] - Requirements Architecture**\nUpdating the formal specification according to the latest follow-up request.\n\n"
      : "\n**[Phase 1/7] - Requirements Architecture**\nPreparing a formal project specification and implementation plan.\n\n"
    );

    const phase1Start = Date.now();
    try {
      const previousSpecContext = (isFollowUp && request.spec)
        ? `\n\n=== EXISTING SYSTEM SPECIFICATION ===\n${JSON.stringify(request.spec, null, 2)}\n\nIMPORTANT: The user wants to modify/extend the existing website. Your task is to modify the existing system specification JSON above to incorporate their new request. Keep existing components, colors, and structure unless the user explicitly requested to change them. Modify the project description or component list as needed to match their request.`
        : "";

      spec = normalizePipelineSpec(await runArchitectAgent(
        client,
        architectModel,
        `${request.message}${previousSpecContext}\n\n${searchContext}`,
        request.conversationHistory || [],
        (msg) => emitStatus(`> ${msg}\n`)
      ));
      
      updatePhase(1, { 
        status: "done", 
        durationMs: Date.now() - phase1Start, 
        detail: isFollowUp 
          ? `Updated spec: ${spec.components.length} components planned`
          : `${spec.components.length} components planned` 
      });

      emitStatus(`\n**Specification ${isFollowUp ? "updated" : "approved for confirmation"}** - ${spec.components.length} components, ${(spec.pages || []).length} page views, ${spec.isRTL ? "RTL/Arabic" : "LTR"} interface.\n`);
      emitStatus(`> Project: **${spec.projectTitle}**\n`);
      emitStatus(`> Interface palette: Primary ${spec.colorScheme.primary} · Accent ${spec.colorScheme.accent}\n`);
      emitStatus(`> Typography system: ${spec.typography.headingFont} / ${spec.typography.bodyFont}\n\n`);
      if (searchResults?.imageAssets?.length) {
        (spec as any).mediaAssets = searchResults.imageAssets;
      }

      const planMarkdown = buildPlanMarkdown(spec);
      emitStatus(planMarkdown);
    } catch (err: any) {
      updatePhase(1, { status: "error", detail: err.message });
      throw new Error(`[Phase 1] Architect Agent failed: ${err.message}`);
    }

    // Phase 2: Design Questionnaire (Skip if this is a follow-up)
    if (!isFollowUp) {
      updatePhase(2, { status: "running" });
      emitStatus("\n**[Phase 2/7] - Requirements Confirmation**\nPlease confirm the configuration choices before production generation continues.\n\n");

      try {
        const questionData = await generateQuestionForSpec(client, specialistModel, request.message, spec);
        
        onChunk?.({
          questions: questionData.questions,
          spec,
          searchResults,
          phase: { phase: 2, name: "Requirements Confirmation — Configuration Brief", status: "running" }
        });

        return {
          phases,
          totalDurationMs: Date.now() - pipelineStart,
          isPaused: true,
          questions: questionData.questions,
          spec,
          searchResults
        };
      } catch (err: any) {
        updatePhase(2, { status: "error", detail: err.message });
        throw new Error(`[Phase 2] Design Questionnaire failed: ${err.message}`);
      }
    }
  }

  const choicesContext = request.selectedChoices 
    ? request.selectedChoices.map(c => `Question ID: ${c.questionId} | Selected Choice: ${c.title} - ${c.description} (Theme: ${c.theme}) | Config: ${JSON.stringify(c.config || {})}`).join("\n")
    : "";

  const promptContext = choicesContext 
    ? `${request.message}\n\n[USER SELECTIONS FOR DESIGN CUSTOMIZATION:\n${choicesContext}]`
    : request.message;

  if (request.selectedChoices && request.selectedChoices.length > 0) {
    const titles = request.selectedChoices.map(c => c.title).join(", ");
    emitStatus(`\n**Confirmed configuration:** ${titles}\n\n`);
  }

  updatePhase(3, { status: "running" });
  emitStatus("**[Phase 3/7] - Markup Engineering**\nConstructing the semantic multi-page DOM structure.\n\n");

  const phase3Start = Date.now();
  let htmlCode: string;
  try {
    htmlCode = await runHtmlAgent(
      client,
      specialistModel,
      `${promptContext}\n\n${searchContext}`,
      spec,
      (msg) => emitStatus(`> ${msg}\n`)
    );
    const htmlGuard = ensureProductionHtml(htmlCode, spec);
    htmlCode = htmlGuard.htmlCode;
    const htmlSummary = buildHtmlQualitySummary(htmlGuard.report);
    const elementCount = (htmlCode.match(/<[a-z]/gi) || []).length;
    updatePhase(3, { status: "done", durationMs: Date.now() - phase3Start, detail: `${elementCount} DOM elements` });
    emitStatus(`\n**Markup package completed** - ${elementCount} elements, ${(htmlCode.length / 1024).toFixed(1)}KB\n\n`);
    emitStatus(`> ${htmlSummary}\n\n`);
  } catch (err: any) {
    updatePhase(3, { status: "error", detail: err.message });
    throw new Error(`[Phase 3] HTML Agent failed: ${err.message}`);
  }

  updatePhase(4, { status: "running" });
  emitStatus("**[Phase 4/7] - Interface Contract**\nRegistering DOM selectors and interaction targets for downstream validation.\n\n");

  const phase4Start = Date.now();
  let selectorMap: GlobalSelectorMap;
  try {
    selectorMap = runSelectorSyncEngine(htmlCode);
    const phase4Duration = Date.now() - phase4Start;
    updatePhase(4, {
      status: "done",
      durationMs: phase4Duration,
      detail: `${selectorMap.ids.length} IDs, ${selectorMap.classes.length} classes, ${selectorMap.interactiveElements.length} interactive`,
    });
    emitStatus(`**Selector registry completed** - ${selectorMap.ids.length} IDs, ${selectorMap.classes.length} classes, ${selectorMap.interactiveElements.length} interaction targets\n`);
    emitStatus(`> Registry duration: ${phase4Duration}ms\n`);
    emitStatus(`> CSS and JavaScript generation are now constrained to verified DOM selectors.\n\n`);
  } catch (err: any) {
    updatePhase(4, { status: "error", detail: err.message });
    throw new Error(`[Phase 4] Selector Sync Engine failed: ${err.message}`);
  }

  updatePhase(5, { status: "running" });
  emitStatus("**[Phase 5/7] - Presentation and Logic Build**\nProducing the responsive style layer and client-side interaction layer.\n\n");

  const phase5Start = Date.now();
  let cssCode: string;
  let jsCode: string;

  try {
    const [cssResult, jsResult] = await Promise.all([
      runCssAgent(client, specialistModel, promptContext, spec, selectorMap, (msg) =>
        emitStatus(`> ${msg}\n`)
      ),
      runJsAgent(client, specialistModel, promptContext, spec, selectorMap, htmlCode, (msg) =>
        emitStatus(`> ${msg}\n`)
      ),
    ]);

    cssCode = cssResult;
    jsCode = jsResult;
    const cssGuard = ensureProductionCss(cssCode, spec);
    cssCode = cssGuard.cssCode;
    const runtimeGuard = ensureProductionJavaScript(jsCode, spec, selectorMap);
    jsCode = runtimeGuard.jsCode;
    const cssSummary = buildCssQualitySummary(cssGuard.report);
    const runtimeSummary = buildRuntimeQualitySummary(runtimeGuard.report);

    updatePhase(5, {
      status: "done",
      durationMs: Date.now() - phase5Start,
      detail: `CSS: ${(cssCode.length / 1024).toFixed(1)}KB · JS: ${(jsCode.length / 1024).toFixed(1)}KB`,
    });
    emitStatus(
      `\n**Presentation and logic package completed** - CSS: ${(cssCode.length / 1024).toFixed(1)}KB, JS: ${(jsCode.length / 1024).toFixed(1)}KB\n\n`
    );
    emitStatus(`> ${cssSummary}\n`);
    emitStatus(`> ${runtimeSummary}\n\n`);
  } catch (err: any) {
    updatePhase(5, { status: "error", detail: err.message });
    throw new Error(`[Phase 5] CSS/JS Agents failed: ${err.message}`);
  }

  updatePhase(6, { status: "running" });
  emitStatus("**[Phase 6/7] - Quality Review**\nAuditing integration consistency, routing behavior, and runtime safety before release packaging.\n\n");

  const phase6Start = Date.now();
  let reviewerNotes = "";
  try {
    const corrected = await runSelfCorrectionAgent(
      client,
      architectModel,
      promptContext,
      spec,
      selectorMap,
      htmlCode,
      cssCode,
      jsCode,
      (msg) => emitStatus(`> ${msg}\n`)
    );
    htmlCode = corrected.htmlCode;
    cssCode = corrected.cssCode;
    jsCode = corrected.jsCode;
    reviewerNotes = corrected.notes;

    const finalHtmlGuard = ensureProductionHtml(htmlCode, spec);
    htmlCode = finalHtmlGuard.htmlCode;
    const finalHtmlSummary = buildHtmlQualitySummary(finalHtmlGuard.report);
    const correctedSelectorMap = runSelectorSyncEngine(htmlCode);
    selectorMap = correctedSelectorMap;
    const finalCssGuard = ensureProductionCss(cssCode, spec);
    cssCode = finalCssGuard.cssCode;
    const finalRuntimeGuard = ensureProductionJavaScript(jsCode, spec, selectorMap);
    jsCode = finalRuntimeGuard.jsCode;
    const finalCssSummary = buildCssQualitySummary(finalCssGuard.report);
    const finalRuntimeSummary = buildRuntimeQualitySummary(finalRuntimeGuard.report);
    if (finalHtmlGuard.report.replacedHtml || finalCssGuard.report.injectedCss || finalRuntimeGuard.report.injectedRuntime) {
      reviewerNotes = `${reviewerNotes} ${finalHtmlSummary} ${finalCssSummary} ${finalRuntimeSummary}`.trim();
    }

    updatePhase(6, {
      status: "done",
      durationMs: Date.now() - phase6Start,
      detail: reviewerNotes.slice(0, 140) || "Integration audit complete",
    });
    emitStatus(`**Quality review completed** - ${reviewerNotes || "Integration audit complete."}\n\n`);
  } catch (err: any) {
    updatePhase(6, { status: "error", detail: err.message });
    throw new Error(`[Phase 6] Self-Correction Agent failed: ${err.message}`);
  }

  updatePhase(7, { status: "running" });
  emitStatus("**[Phase 7/7] - Release Packaging**\nCompiling the approved assets into a self-contained HTML bundle.\n\n");

  const phase7Start = Date.now();
  let bundle: BundleResult;
  try {
    bundle = runBundlerEngine(htmlCode, cssCode, jsCode, spec, promptContext);
    updatePhase(7, {
      status: "done",
      durationMs: Date.now() - phase7Start,
      detail: `${(bundle.stats.totalBytes / 1024).toFixed(1)}KB bundle`,
    });
    emitStatus(`**Release bundle assembled** - ${(bundle.stats.totalBytes / 1024).toFixed(1)}KB total\n`);
    emitStatus(`> RTL: ${bundle.stats.hasRTL ? "Yes" : "No"} · Viewport: ${bundle.stats.hasViewportMeta ? "Yes" : "No"} · Google Fonts: ${bundle.stats.hasGoogleFonts ? "Yes" : "No"}\n\n`);
  } catch (err: any) {
    updatePhase(7, { status: "error", detail: err.message });
    throw new Error(`[Phase 7] Bundler Engine failed: ${err.message}`);
  }

  const totalDuration = Date.now() - pipelineStart;

  // ── Build formatted output message ─────────────────────────
  const completedPhasesSummary = phases
    .map(
      (p) =>
        `| ${p.phase} | ${p.name} | ${p.status === "done" ? "Completed" : p.status === "error" ? "Failed" : "Pending"} | ${p.durationMs ? `${(p.durationMs / 1000).toFixed(1)}s` : "—"} | ${p.detail || "—"} |`
    )
    .join("\n");

  const formattedOutput = `
## APEX Unbound Delivery Report

### Execution Summary
| Phase | Workstream | Status | Duration | Notes |
|-------|-------|--------|----------|---------|
${completedPhasesSummary}

**Total Duration:** ${(totalDuration / 1000).toFixed(1)}s
**Bundle Size:** ${(bundle.stats.totalBytes / 1024).toFixed(1)}KB
**Page Views:** ${(spec.pages || []).map((page) => `#${page.id}`).join(", ")}
**Quality Review:** ${reviewerNotes || "Completed"}

---

### Self-Contained Website Bundle

\`\`\`html
${bundle.html}
\`\`\`

### Source Stylesheet

\`\`\`css
${cssCode}
\`\`\`

### Source Client Logic

\`\`\`javascript
${jsCode}
\`\`\`

---

### Architecture Summary

**Project:** ${spec.projectTitle}
**Components:** ${spec.components.map((c) => c.name).join(", ")}
**Selector Map:** ${selectorMap.ids.length} IDs · ${selectorMap.classes.length} classes · ${selectorMap.interactiveElements.length} interactive elements
**Color Palette:** ${spec.colorScheme.primary} (primary) · ${spec.colorScheme.accent} (accent)
**Typography:** ${spec.typography.headingFont} / ${spec.typography.bodyFont}
**Direction:** ${spec.isRTL ? "RTL (Arabic)" : "LTR (English)"}
**Pages:** ${(spec.pages || []).map((page) => `#${page.id}`).join(", ")}
**Final Audit:** ${reviewerNotes || "Completed"}
`;

  console.log("\n╔══════════════════════════════════════════╗");
  console.log(`║  APEX UNBOUND COMPLETE: ${(totalDuration / 1000).toFixed(1)}s total`);
  console.log(`║  Bundle: ${(bundle.stats.totalBytes / 1024).toFixed(1)}KB`);
  console.log("╚══════════════════════════════════════════╝\n");

  return {
    bundledHtml: bundle.html,
    spec,
    selectorMap,
    bundle,
    phases,
    totalDurationMs: totalDuration,
    formattedOutput,
  };
}
