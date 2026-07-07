# Apex Coder - خطة النهضة الشاملة للجودة

> **للمنفذين:** استخدم هذه الخطة خطوة بخطوة. كل مهمة مكتوبة بكود كامل جاهز للتنفيذ. الـ checkboxes (`- [ ]`) لتتبع التقدم.

**الهدف:** تحويل Apex Coder من مولد مواقع "سيء" إلى نظام ينتج مواقع احترافية متكاملة تعمل بشكل صحيح. إصلاح 21 مشكلة مكتشفة موزعة على 5 مشاكل حرجة و 6 عالية و 4 متوسطة و 6 منخفضة.

**المنهجية:** إصلاح السبب الجذري لكل مشكلة (وليس الأعراض). كل تعديل مبني على تحليل دقيق للكود الحالي.

**التقنيات:** TypeScript, Express, OpenAI SDK, Gemini 2.5 Flash/Pro, Cheerio, SSE

---

## تحليل المشاكل المكتشفة (21 مشكلة)

### 🔴 حرجة (Critical) - 5 مشاكل:
1. **كل الوكلاء يستخدمون `google/gemini-2.5-flash`** - لا تنوع نماذج، نفس النموذج الضعيف للكل
2. **Self-Correction max_tokens=24000 غير كاف** - يطلب HTML+CSS+JS في رد واحد → بتر دائم
3. **`ensureProductionHtml` يستبدل كامل HTML** عند فشل أي اختبار → كود AI يضيع بالكامل
4. **التحقق من selectors يتجاهل المخالفات** - "violations are often false positives"
5. **max_tokens للـ JS Agent (12000) أقل من HTML/CSS (16000)** رغم تعقيد المهمة

### 🟠 عالية (High) - 6 مشاكل:
6. لا تنسيق بين CSS و JS agents - لا يتبادلان معلومات
7. حقن أول 3000 حرف فقط من HTML في JS agent
8. Architect Agent max_tokens=3000 غير كاف
9. تصنيف المجال (domain inference) 5 فئات فقط
10. Bundler يحذف كل style/script tags بدون تمييز
11. Self-Correction يفشل JSON parse → الكود الأصلي يبقى بدون تصحيح

### 🟡 متوسطة (Medium) - 5 مشاكل:
12. كل الوكلاء temperature=0.2 منخفض جداً
13. Selector Sync Engine يستخدم regex بدل HTML parser
14. CSS guard يضاف دائماً حتى لو غير مطلوب
15. RTL يُفرض بمجرد حرف عربي واحد
16. DOMContentLoaded wrapper تضاف بشكل أعمى

### 🟢 منخفضة (Low) - 5 مشاكل:
17. لا retry loop للـ Self-Correction
18. الـ SystemSpec يحقن في user prompt لـ HTML agent (تكرار)
19. لا chain-of-thought في prompts الوكلاء
20. الـ validationSet يحتوي تكرار
21. CSS keywords المستثناة 6 فقط

---

# خطة التنفيذ

## 🔴 المرحلة 1: إصلاح المشاكل الحرجة الخمسة (الأولوية القصوى)

### المهمة 1.1: تنويع النماذج - استخدام نموذج أقوى للـ Architect و Self-Correction

**ملف:** `c:\Users\Mo_Matany\Downloads\Apex-Chat\Apex-Chat\server\apex-unbound\pipeline.ts` (الأسطر 545-547)

**المشكلة:** `architectModel` و `specialistModel` متطابقان تماماً = `google/gemini-2.5-flash`.

**الحل:** استخدام `google/gemini-2.5-pro` (أو `google/gemini-2.5-flash-lite` للوكلاء التخصصيين حسب الحاجة):

```typescript
// قبل (السطر 545-547):
const architectModel = isOpenRouter ? "google/gemini-2.5-flash" : "deepseek-chat";
const specialistModel = isOpenRouter ? "google/gemini-2.5-flash" : "deepseek-chat";

// بعد:
const architectModel = isOpenRouter ? "google/gemini-2.5-pro" : "deepseek-chat";
const selfCorrectionModel = isOpenRouter ? "google/gemini-2.5-pro" : "deepseek-chat";
const specialistModel = isOpenRouter ? "google/gemini-2.5-flash" : "deepseek-chat";
```

**ملف:** `c:\Users\Mo_Matany\Downloads\Apex-Chat\Apex-Chat\server\deepseek-model-router.ts`

تعديل الـ model aliases لإضافة pro:

```typescript
// أضف هذا السطر:
"apex-coder-pro": "google/gemini-2.5-pro",
```

---

### المهمة 1.2: إعادة بناء Self-Correction - مراجعات منفصلة لكل مكون

**ملف:** `c:\Users\Mo_Matany\Downloads\Apex-Chat\Apex-Chat\server\apex-unbound\pipeline.ts` (الأسطر 233-319)

**المشكلة:** max_tokens=24000 غير كاف لـ HTML+CSS+JS في رد واحد → بتر دائم.

**الحل:** تقسيم self-correction إلى 3 مراجعات منفصلة:

```typescript
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
  onStatus?.("[Self-Correction] Running per-component quality audit...");

  const allNotes: string[] = [];

  // ── Phase A: Validate HTML only ──
  let correctedHtml = htmlCode;
  try {
    onStatus?.("[Self-Correction] Auditing HTML structure...");
    const htmlResult = await client.chat.completions.create({
      model,
      messages: [
        {
          role: "system",
          content: `You are a senior HTML quality auditor. Review this HTML for the following issues and return ONLY the corrected HTML:

1. Every page from the spec MUST have a corresponding <div class="page-view" id="view-{id}">
2. Every route MUST have a <a data-route="{id}"> link
3. The #app-router wrapper MUST exist
4. All interactive elements MUST have unique IDs
5. Arabic text MUST use dir="rtl" on the html element if the spec says isRTL

Return ONLY valid HTML. No markdown, no explanations.`
        },
        {
          role: "user",
          content: `Spec pages: ${JSON.stringify(spec.pages?.map(p => p.id))}
Spec isRTL: ${spec.isRTL}
  
Current HTML to audit:
${htmlCode}`
        }
      ],
      max_tokens: 16000,
      temperature: 0.1,
      ...getDeepSeekRequestParams(model, 0.1),
    });
    const raw = htmlResult.choices[0]?.message?.content || "";
    if (raw.includes("<!DOCTYPE") || raw.includes("<html")) {
      correctedHtml = raw.trim();
      allNotes.push("HTML audit: passed and corrected");
    } else {
      allNotes.push("HTML audit: model returned invalid response, keeping original");
    }
  } catch (e: any) {
    allNotes.push(`HTML audit skipped: ${e.message}`);
  }

  // ── Phase B: Validate CSS only ──
  let correctedCss = cssCode;
  try {
    onStatus?.("[Self-Correction] Auditing CSS selectors...");
    const cssResult = await client.chat.completions.create({
      model,
      messages: [
        {
          role: "system",
          content: `You are a CSS quality auditor. Review this CSS for:
1. Selectors that don't match any known ID/class from the selector map
2. Missing state classes from the UI contract (.is-active, .is-hidden, .modal-open, .submitting, .is-invalid)
3. Missing responsive breakpoints
4. RTL support using logical properties if spec requires

Return ONLY valid CSS. No markdown, no explanations.`
        },
        {
          role: "user",
          content: `Known selectors: ${JSON.stringify(selectorMap.ids?.map(t => t.cssSelector).slice(0, 30))}
UI contract classes: ${spec.uiStateContract?.activeClass}, ${spec.uiStateContract?.hiddenClass}, ${spec.uiStateContract?.modalOpenClass}, ${spec.uiStateContract?.submittingClass}, ${spec.uiStateContract?.invalidClass}
isRTL: ${spec.isRTL}

Current CSS to audit:
${cssCode}`
        }
      ],
      max_tokens: 16000,
      temperature: 0.1,
      ...getDeepSeekRequestParams(model, 0.1),
    });
    const rawCss = cssResult.choices[0]?.message?.content || "";
    if (rawCss.length > 500) {
      correctedCss = rawCss.trim();
      allNotes.push("CSS audit: passed and corrected");
    } else {
      allNotes.push("CSS audit: response too short, keeping original");
    }
  } catch (e: any) {
    allNotes.push(`CSS audit skipped: ${e.message}`);
  }

  // ── Phase C: Validate JS only ──
  let correctedJs = jsCode;
  try {
    onStatus?.("[Self-Correction] Auditing JavaScript logic...");
    const jsResult = await client.chat.completions.create({
      model,
      messages: [
        {
          role: "system",
          content: `You are a JavaScript quality auditor. Review this JS for:
1. querySelector/getElementById calls that target elements not in the selector map
2. Missing null-guards on DOM operations
3. Missing error boundaries on page initialization
4. Missing cleanup of intervals/listeners on route navigation
5. Router must handle ALL routes from the spec

Return ONLY valid JavaScript. No markdown, no explanations.`
        },
        {
          role: "user",
          content: `Known selectors: ${JSON.stringify(selectorMap.ids?.map(t => t.cssSelector).slice(0, 30))}
Interactive elements: ${JSON.stringify(selectorMap.interactiveElements?.map(t => t.cssSelector).slice(0, 20))}
Spec routes: ${JSON.stringify(spec.pages?.map(p => p.id))}

Current JS to audit:
${jsCode.slice(0, 14000)}`
        }
      ],
      max_tokens: 16000,
      temperature: 0.1,
      ...getDeepSeekRequestParams(model, 0.1),
    });
    const rawJs = jsResult.choices[0]?.message?.content || "";
    if (rawJs.length > 300) {
      correctedJs = rawJs.trim();
      allNotes.push("JS audit: passed and corrected");
    } else {
      allNotes.push("JS audit: response too short, keeping original");
    }
  } catch (e: any) {
    allNotes.push(`JS audit skipped: ${e.message}`);
  }

  return {
    htmlCode: correctedHtml,
    cssCode: correctedCss,
    jsCode: correctedJs,
    notes: allNotes.join(" | "),
  };
}
```

**ملاحظة:** احذف الدالة القديمة `runSelfCorrectionAgent` بالكامل واستبدلها بهذه.

---

### المهمة 1.3: إصلاح ensureProductionHtml - حقن تحسينات بدل استبدال كامل

**ملف:** `c:\Users\Mo_Matany\Downloads\Apex-Chat\Apex-Chat\server\apex-unbound\runtime-guard.ts` (الأسطر 40-70)

**المشكلة:** إذا فشل أي اختبار (مثلاً HTML أقل من 220 سطر)، يتم استبدال كل الكود بـ deterministic HTML صلب.

**الحل:** بدل الاستبدال الكامل، احقن فقط العناصر الناقصة:

```typescript
export function ensureProductionHtml(
  html: string,
  spec: SystemSpec
): { htmlCode: string; report: ProductionHtmlReport } {
  const report: ProductionHtmlReport = {
    injectedRouter: false,
    injectedPageViews: false,
    injectedRouteLinks: false,
    injectedNav: false,
    injectedForm: false,
    replacedHtml: false,
    summary: "",
  };

  let fixed = html;

  // 1. Inject #app-router wrapper if missing
  if (!fixed.includes("app-router")) {
    const mainMatch = fixed.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
    if (mainMatch) {
      fixed = fixed.replace(
        /(<main[^>]*>)/i,
        `$1\n  <div id="app-router" class="app-router">`
      );
      fixed = fixed.replace("</main>", `</div>\n</main>`);
    } else {
      // Wrap entire body content
      fixed = fixed.replace(
        /(<body[^>]*>)/i,
        `$1\n  <div id="app-router" class="app-router">`
      );
      fixed = fixed.replace("</body>", `</div>\n</body>`);
    }
    report.injectedRouter = true;
  }

  // 2. Inject page views for each spec page
  const pages = spec.pages || [];
  for (const page of pages) {
    const viewId = `view-${page.id}`;
    if (!fixed.includes(viewId)) {
      const insertPos = fixed.lastIndexOf("</div>");
      if (insertPos > 0) {
        const pageDiv = `
  <div class="page-view is-hidden" id="${viewId}" data-page="${page.id}">
    <h2>${page.title}</h2>
    <p>${page.description || ""}</p>
  </div>`;
        fixed = fixed.slice(0, insertPos) + pageDiv + "\n" + fixed.slice(insertPos);
        report.injectedPageViews = true;
      }
    }
  }

  // 3. Inject route links if missing any
  let needsNavLinks = false;
  for (const page of pages) {
    if (!fixed.includes(`data-route="${page.id}"`)) {
      needsNavLinks = true;
      break;
    }
  }
  if (needsNavLinks) {
    const navLinks = pages.map(p =>
      `    <a href="#${p.id}" data-route="${p.id}" class="route-link">${p.title}</a>`
    ).join("\n");
    const navBar = `\n  <nav class="main-nav" role="navigation">\n${navLinks}\n  </nav>\n`;
    // Inject after <body> or into existing nav
    if (fixed.includes("<nav")) {
      fixed = fixed.replace(/(<nav[^>]*>)/, `$1\n${navLinks}`);
    } else {
      fixed = fixed.replace(/(<body[^>]*>)/i, `$1\n${navBar}`);
    }
    report.injectedRouteLinks = true;
  }

  // 4. Inject form if spec requires one and none exists
  if (!/<form/i.test(fixed) && (spec.features || []).some((f: string) => f.toLowerCase().includes("form"))) {
    const formHtml = `
  <section class="contact-section" id="contact-section">
    <form id="request-form" class="request-form" novalidate>
      <input type="text" name="name" placeholder="الاسم" required>
      <input type="email" name="email" placeholder="البريد الإلكتروني" required>
      <textarea name="message" placeholder="الرسالة" required></textarea>
      <button type="submit" class="submit-btn">إرسال</button>
    </form>
  </section>`;
    fixed = fixed.replace("</body>", `${formHtml}\n</body>`);
    report.injectedForm = true;
  }

  // 5. Inject missing data attributes for interactive elements
  if (!/data-route="/.test(fixed) && pages.length > 0) {
    report.injectedRouter = true;
  }

  report.summary = [
    report.injectedRouter ? "injected router" : "",
    report.injectedPageViews ? "injected page views" : "",
    report.injectedRouteLinks ? "injected route links" : "",
    report.injectedForm ? "injected form" : "",
  ].filter(Boolean).join(", ") || "HTML passed all checks";

  return { htmlCode: fixed, report };
}
```

---

### المهمة 1.4: جعل مخالفات selectors تمنع الاستمرار (Fail-Fast)

**ملف:** `c:\Users\Mo_Matany\Downloads\Apex-Chat\Apex-Chat\server\apex-unbound\js-agent.ts` (الأسطر 145-155)

**المشكلة:** `validateAgainstSelectorMap` ترجع warnings فقط ولا توقف pipeline.

**الحل:** إضافة وضع صارم مع auto-fix للمخالفات:

```typescript
// في نهاية runJsAgent، بعد validation:
const validation = validateAgainstSelectorMap(jsCode, selectorMap, "js");
if (!validation.valid && validation.violations && validation.violations.length > 0) {
  console.warn(`[JS Agent] ${validation.violations.length} selector violations. Auto-fixing...`);
  
  // Auto-fix: wrap violating selectors with null-guards
  let fixedJs = jsCode;
  for (const violation of (validation.violations || [])) {
    const badSelector = violation.selector;
    if (badSelector.startsWith("#") || badSelector.startsWith(".")) {
      // Replace: const el = document.querySelector('BAD')
      // With:    const el = document.querySelector('BAD'); if (!el) { console.warn('Element BAD not found'); return; }
      const escapeRegex = badSelector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const pattern = new RegExp(
        `(querySelector|getElementById)\\s*\\(\\s*['"]${escapeRegex}['"]\\s*\\)\\s*;?\\s*(?!\\s*if\\s*\\()`,
        'g'
      );
      fixedJs = fixedJs.replace(pattern, `$& if (!$&) { console.warn('Element ${badSelector} not found'); return; }`);
    }
  }
  
  return fixedJs;
}
```

---

### المهمة 1.5: رفع max_tokens للـ JS Agent إلى 16000 وزيادة حجم HTML المحقون

**ملف:** `c:\Users\Mo_Matany\Downloads\Apex-Chat\Apex-Chat\server\apex-unbound\js-agent.ts` (السطر 122)

```typescript
// قبل:
max_tokens: 12000,

// بعد:
max_tokens: 16000,
```

**ملف:** `c:\Users\Mo_Matany\Downloads\Apex-Chat\Apex-Chat\server\apex-unbound\js-agent.ts` (الأسطر 100-101)

```typescript
// قبل:
REFERENCE HTML STRUCTURE (first 3000 chars):
${htmlCode.slice(0, 3000)}

// بعد:
REFERENCE HTML STRUCTURE (first 6000 chars):
${htmlCode.slice(0, 6000)}
```

---

## 🟠 المرحلة 2: إصلاح المشاكل العالية (High Priority)

### المهمة 2.1: تنسيق CSS ↔ JS - تمرير ملخص classes بين الوكلاء

**ملف:** `c:\Users\Mo_Matany\Downloads\Apex-Chat\Apex-Chat\server\apex-unbound\pipeline.ts` (بعد السطر 756)

**الحل:** بعد توليد CSS، استخرج animation classes وأرسلها لـ JS agent:

```typescript
// بعد runCssAgent مباشرة، استخرج classes المهمة:
const animationClasses = (cssCode.match(/\.(fadeIn|slideIn|scaleIn|float|pulse|show-animation|active)[^\w-]/gi) || [])
  .map(c => c.replace(/[^a-zA-Z-]/g, ""))
  .filter(Boolean);
const stateClasses = [
  spec.uiStateContract?.activeClass,
  spec.uiStateContract?.hiddenClass,
  spec.uiStateContract?.modalOpenClass,
].filter(Boolean);

// أمرر هذه المعلومات لـ JS agent عبر الكود التالي في prompt context
const cssBridgeContext = `
CSS ANIMATION CLASSES AVAILABLE: ${animationClasses.join(", ")}
CSS STATE CLASSES: ${stateClasses.join(", ")}
Use classList.add/remove with these exact class names for animations and state changes.`;
```

ثم أضف `cssBridgeContext` إلى prompt الـ JS (في `runJsAgent` عبر معامل إضافي):

**ملف:** `c:\Users\Mo_Matany\Downloads\Apex-Chat\Apex-Chat\server\apex-unbound\js-agent.ts`

أضف معامل `cssBridgeContext?: string` إلى `runJsAgent` وادمجه في system prompt.

---

### المهمة 2.2: رفع max_tokens للـ Architect Agent إلى 8000

**ملف:** `c:\Users\Mo_Matany\Downloads\Apex-Chat\Apex-Chat\server\apex-unbound\architect-agent.ts` (السطر 196)

```typescript
// قبل:
max_tokens: 3000,

// بعد:
max_tokens: 8000,
```

---

### المهمة 2.3: تصنيف مجال ذكي - توسيع من 5 إلى 20+ فئة

**ملف:** `c:\Users\Mo_Matany\Downloads\Apex-Chat\Apex-Chat\server\apex-unbound\architect-agent.ts` (دالة domain inference، الأسطر 331-337)

**الحل:** استبدال مطابقة الكلمات البسيطة بـ prompt-based inference:

```typescript
function inferDomain(userMessage: string, isArabic: boolean): {
  domain: string;
  subdomain: string;
  industryKeywords: string[];
} {
  const msg = userMessage.toLowerCase();
  
  // Extended domain map with keywords and weights
  const domains: Array<{ domain: string; keywords: string[]; weight: number }> = [
    { domain: "ecommerce", keywords: ["متجر", "منتجات", "شراء", "سلة", "shop", "store", "product", "cart", "buy", "تسوق", "سعر", "price"], weight: 0 },
    { domain: "healthcare", keywords: ["مستشفى", "طبي", "صحة", "عيادة", "hospital", "clinic", "health", "medical", "doctor", "دكتور", "مرض", "علاج", "therapy"], weight: 0 },
    { domain: "education", keywords: ["مدرسة", "تعليم", "دورة", "تدريب", "school", "course", "learn", "teach", "academy", "جامعة", "university", "درس", "lesson", "معلم"], weight: 0 },
    { domain: "realestate", keywords: ["عقار", "شقة", "فيلا", "منزل", "real estate", "property", "house", "apartment", "rent", "إيجار", "بيع", "بناء"], weight: 0 },
    { domain: "restaurant", keywords: ["مطعم", "طعام", "قائمة", "food", "restaurant", "menu", "cafe", "مقهى", "كافيه", "وجبة", "أكل", "delivery", "توصيل"], weight: 0 },
    { domain: "saas", keywords: ["منصة", "برنامج", "تطبيق", "saas", "platform", "software", "dashboard", "analytics", "تحليلات", "api", "نظام", "اشتراك", "subscription"], weight: 0 },
    { domain: "portfolio", keywords: ["معرض", "أعمال", "portfolio", "showcase", "projects", "مشاريع", "gallery", "creative", "مصور", "photographer", "مصمم", "designer"], weight: 0 },
    { domain: "blog", keywords: ["مدونة", "مقالات", "blog", "article", "news", "أخبار", "magazine", "مجلة", "كاتب", "writer", "نشر", "publish"], weight: 0 },
    { domain: "booking", keywords: ["حجز", "موعد", "booking", "reservation", "appointment", "schedule", "جدول", "calendar", "تذكرة", "ticket", "hotel", "فندق"], weight: 0 },
    { domain: "finance", keywords: ["بنك", "مال", "استثمار", "bank", "finance", "investment", "crypto", "تداول", "trading", "محفظة", "wallet", "عملات"], weight: 0 },
    { domain: "gaming", keywords: ["لعبة", "game", "gaming", "esports", "twitch", "stream", "بث", "لاعب", "player", "tournament", "بطولة"], weight: 0 },
    { domain: "social", keywords: ["اجتماعي", "social", "community", "منتدى", "forum", "chat", "دردشة", "شبكة", "network", "friends", "أصدقاء", "profile"], weight: 0 },
    { domain: "nonprofit", keywords: ["خيري", "تبرع", "charity", "donate", "nonprofit", "volunteer", "تطوع", "حملة", "campaign", "مساعدة", "help"], weight: 0 },
    { domain: "legal", keywords: ["محامي", "قانون", "lawyer", "legal", "محكمة", "court", "استشارة", "consult", "عقد", "contract", "مكتب", "firm"], weight: 0 },
    { domain: "fitness", keywords: ["رياضة", "جيم", "fitness", "gym", "workout", "training", "تمارين", "exercise", "nutrition", "تغذية", "صحي", "healthy"], weight: 0 },
    { domain: "travel", keywords: ["سفر", "سياحة", "travel", "tourism", "trip", "رحلة", "flight", "طيران", "visit", "زيارة", "destination", "وجهة"], weight: 0 },
  ];

  // Score each domain
  for (const domain of domains) {
    for (const kw of domain.keywords) {
      if (msg.includes(kw)) {
        domain.weight += 1;
      }
    }
  }

  // Sort by weight
  domains.sort((a, b) => b.weight - a.weight);
  const best = domains[0];
  
  if (best.weight === 0) {
    return { domain: "landing", subdomain: "general", industryKeywords: ["web", "site"] };
  }

  // Find subdomain from secondary matches
  const secondary = domains.slice(1, 3).filter(d => d.weight > 0);
  
  return {
    domain: best.domain,
    subdomain: secondary.length > 0 ? secondary[0].domain : best.domain,
    industryKeywords: [best.domain, ...secondary.map(d => d.domain)],
  };
}
```

---

### المهمة 2.4: إصلاح Bundler - حذف style/script بشكل ذكي بدل مسح كل شيء

**ملف:** `c:\Users\Mo_Matany\Downloads\Apex-Chat\Apex-Chat\server\apex-unbound\bundler-engine.ts` (الأسطر 122-139)

**الحل:** بدل regex greedy، استخدم Cheerio أو حذف انتقائي:

```typescript
// قبل (خطير):
doc = doc.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "");
doc = doc.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "");

// بعد (آمن - يحذف فقط التاجات الفارغة او التي لا تحتوي على data-keep):
// استخدم نهج أكثر أماناً: لا تحذف أي style/script موجود، فقط أضف الجديد
// الـ CSS والـ JS الجديدان يضافان بدون حذف القديم
let cleanedHtml = htmlCode;

// نحذف فقط <style> و <script> التي قد تكون placeholder (أقل من 50 حرف)
cleanedHtml = cleanedHtml.replace(/<style[^>]*>[\s\S]{0,50}?<\/style>/gi, "");
cleanedHtml = cleanedHtml.replace(/<script\b[^>]*>[\s\S]{0,50}?<\/script>/gi, "");

// نحافظ على أي style/script يحتوي على كود فعلي
```

---

### المهمة 2.5: إضافة retry loop للـ Self-Correction

**ملف:** `c:\Users\Mo_Matany\Downloads\Apex-Chat\Apex-Chat\server\apex-unbound\pipeline.ts` (حول السطر 809)

**الحل:** إعادة المحاولة مرة واحدة إذا فشلت المراجعة:

```typescript
// في runUnboundPipeline، بعد self-correction:
let correctionAttempts = 0;
const MAX_CORRECTION_ATTEMPTS = 2;

let corrected = { htmlCode, cssCode, jsCode, notes: "" };
while (correctionAttempts < MAX_CORRECTION_ATTEMPTS) {
  correctionAttempts++;
  try {
    corrected = await runSelfCorrectionAgent(
      client, selfCorrectionModel, promptContext, spec, selectorMap,
      corrected.htmlCode, corrected.cssCode, corrected.jsCode,
      (msg) => emitStatus(`> ${msg}\n`)
    );
    
    // Check quality: if notes say all passed, break
    if (corrected.notes.includes("all passed") || corrected.notes.includes("passed and corrected")) {
      break;
    }
  } catch (e: any) {
    if (correctionAttempts >= MAX_CORRECTION_ATTEMPTS) {
      console.warn("[Self-Correction] All retries exhausted:", e.message);
    }
  }
}

htmlCode = corrected.htmlCode;
cssCode = corrected.cssCode;
jsCode = corrected.jsCode;
reviewerNotes = corrected.notes;
```

---

## 🟡 المرحلة 3: إصلاح المشاكل المتوسطة (Medium Priority)

### المهمة 3.1: رفع درجات الحرارة - Temperature tuning لكل وكيل

| الملف | الوكيل | القديم | الجديد | السبب |
|-------|--------|--------|--------|-------|
| `architect-agent.ts:198` | Architect | 0.3 | 0.5 | يحتاج إبداع في تصميم المواصفات |
| `html-agent.ts:95` | HTML | 0.2 | 0.4 | تنوع في هيكل الصفحات |
| `css-agent.ts:105` | CSS | 0.2 | 0.6 | إبداع بصري أعلى |
| `js-agent.ts:124` | JS | 0.2 | 0.5 | منطق تفاعلي أكثر تنوعاً |
| `pipeline.ts:297` | Self-Correction | 0.1 | 0.2 | دقة مع بعض المرونة |

---

### المهمة 3.2: تحويل Selector Sync Engine إلى HTML parser حقيقي

**ملف:** `c:\Users\Mo_Matany\Downloads\Apex-Chat\Apex-Chat\server\apex-unbound\selector-sync-engine.ts`

**المشكلة:** يستخدم regex لاستخراج selectors مما يفشل مع HTML معقد.

**الحل:** استخدام `cheerio` كـ HTML parser:

```typescript
import * as cheerio from 'cheerio';

export function runSelectorSyncEngine(htmlCode: string): GlobalSelectorMap {
  const $ = cheerio.load(htmlCode);
  
  const ids: SelectorToken[] = [];
  const classes: SelectorToken[] = [];
  const dataAttributes: SelectorToken[] = [];
  const interactiveElements: SelectorToken[] = [];
  const sections: Record<string, { ids: string[]; classes: string[] }> = {};

  // Parse all elements
  $('*').each((_, el) => {
    const tag = el.tagName?.toLowerCase();
    const $el = $(el);
    
    const id = $el.attr('id');
    const classList = $el.attr('class')?.split(/\s+/) || [];
    const dataAttrs = Object.keys(el.attribs || {}).filter(a => a.startsWith('data-'));
    
    // Collect IDs
    if (id) {
      ids.push({
        cssSelector: `#${id}`,
        elements: [tag],
        value: id,
      });
    }
    
    // Collect classes
    for (const cls of classList) {
      if (cls && !classes.find(c => c.value === cls)) {
        classes.push({
          cssSelector: `.${cls}`,
          elements: [tag],
          value: cls,
        });
      }
    }
    
    // Collect data attributes
    for (const attr of dataAttrs) {
      dataAttributes.push({
        cssSelector: `[${attr}]`,
        elements: [tag],
        value: attr,
      });
    }
    
    // Interactive elements
    const interactiveTags = ['a', 'button', 'input', 'select', 'textarea', 'form'];
    if (interactiveTags.includes(tag) || id || classList.length > 0) {
      interactiveElements.push({
        cssSelector: id ? `#${id}` : (classList[0] ? `.${classList[0]}` : tag),
        elements: [tag],
        value: id || classList[0] || tag,
      });
    }
    
    // Sections
    if (tag === 'section' || tag === 'nav' || tag === 'header' || tag === 'footer' || tag === 'main') {
      const sectionId = id || tag;
      sections[sectionId] = {
        ids: id ? [id] : [],
        classes: classList,
      };
    }
  });

  return {
    ids,
    classes,
    dataAttributes,
    interactiveElements,
    sections,
  };
}
```

**تثبيت cheerio:**
```bash
cd 'c:\Users\Mo_Matany\Downloads\Apex-Chat\Apex-Chat'
npm install cheerio
```

---

### المهمة 3.3: CSS guard - لا تضف CSS إلا إذا كان هناك نقص فعلي

**ملف:** `c:\Users\Mo_Matany\Downloads\Apex-Chat\Apex-Chat\server\apex-unbound\runtime-guard.ts` (الأسطر 78-82)

```typescript
// قبل (guard CSS يضاف دائماً):
const finalCss = shouldInjectCss
  ? `${original}\n\n${guardCss}`
  : `${original}\n\n${guardCss}`;

// بعد (guard CSS يضاف فقط إذا كان هناك نقص):
const finalCss = shouldInjectCss
  ? `${original}\n\n${guardCss}`
  : original;  // لا تضف شيء إذا كان الكود الأصلي كافياً
```

---

### المهمة 3.4: إصلاح اكتشاف RTL - لا تفرضه إلا إذا كانت الأغلبية عربية

**ملف:** `c:\Users\Mo_Matany\Downloads\Apex-Chat\Apex-Chat\server\apex-unbound\architect-agent.ts` (السطر 211)

```typescript
// قبل (حرف عربي واحد يكفي):
const isArabic = spec.isRTL || spec.language === "ar" || /[\u0600-\u06FF]/.test(userMessage + rawContent);

// بعد (تحتاج 30% من الأحرف عربية على الأقل):
function isPredominantlyArabic(text: string): boolean {
  const arabicChars = (text.match(/[\u0600-\u06FF]/g) || []).length;
  const totalChars = text.replace(/\s/g, "").length;
  return totalChars > 0 && (arabicChars / totalChars) > 0.3;
}
const isArabic = spec.isRTL || spec.language === "ar" || isPredominantlyArabic(userMessage + rawContent);
```

---

### المهمة 3.5: DOMContentLoaded wrapper - لا تضفها إذا كان الكود يستخدم modules أو async

**ملف:** `c:\Users\Mo_Matany\Downloads\Apex-Chat\Apex-Chat\server\apex-unbound\js-agent.ts` (الأسطر 140-142)

```typescript
// قبل (تضاف دائماً):
if (!js.includes("DOMContentLoaded") && js.length > 10) {
  js = `document.addEventListener('DOMContentLoaded', function() {\n${js}\n});`;
}

// بعد (تضاف فقط إذا لم تكن هناك تهيئة بديلة):
const hasInit = js.includes("DOMContentLoaded") || 
               js.includes("window.onload") || 
               js.includes("defer") ||
               js.includes("async") ||
               js.includes("type=\"module\"") ||
               js.includes("IIFE") ||
               js.includes("(function()");
if (!hasInit && js.length > 10 && !js.includes("export ")) {
  js = `document.addEventListener('DOMContentLoaded', function() {\n${js}\n});`;
}
```

---

## 🟢 المرحلة 4: إصلاح المشاكل المنخفضة (Low Priority)

### المهمة 4.1: إزالة تكرار SystemSpec في HTML agent prompt

**ملف:** `c:\Users\Mo_Matany\Downloads\Apex-Chat\Apex-Chat\server\apex-unbound\html-agent.ts` (الأسطر 79-83)

```typescript
// قبل (SystemSpec يُحقن مرتين - في system prompt و user prompt):
const userPrompt = `Generate the complete HTML5 structure for this request:
"${userMessage}"
System Specification:
${JSON.stringify(spec, null, 2)}`;

// بعد (اكتفي بالـ system prompt فقط):
const userPrompt = `Generate the complete HTML5 structure for: "${userMessage}"

Key requirements:
- ${spec.pages?.length || 0} pages: ${spec.pages?.map(p => p.id).join(", ")}
- ${spec.components?.length || 0} components planned
- RTL: ${spec.isRTL ? "Yes" : "No"}`;
```

---

### المهمة 4.2: إضافة chain-of-thought لجميع الـ prompts

**ملف:** كل من `html-agent.ts`, `css-agent.ts`, `js-agent.ts`

أضف في بداية كل system prompt:

```typescript
const COT_PREFIX = `Before writing code, think step by step:
1. Analyze the requirements and constraints
2. Plan the structure before writing
3. Write the code with clear comments
4. Verify against all constraints

`;
```

---

### المهمة 4.3: تنظيف validationSet - إزالة التكرار

**ملف:** `c:\Users\Mo_Matany\Downloads\Apex-Chat\Apex-Chat\server\apex-unbound\selector-sync-engine.ts` (الأسطر 133-140)

```typescript
// قبل (تكرار - يضيف value و cssSelector):
const validationSet = new Set<string>();
for (const token of map.ids) {
  validationSet.add(token.value);
  validationSet.add(token.cssSelector);
}

// بعد (cssSelector فقط - يحتوي على # أو .):
const validationSet = new Set<string>();
for (const token of map.ids) {
  validationSet.add(token.cssSelector);  // e.g. "#hero-section"
}
for (const token of map.classes) {
  validationSet.add(token.cssSelector);  // e.g. ".container"
}
```

---

### المهمة 4.4: توسيع قائمة CSS keywords المستثناة

**ملف:** `c:\Users\Mo_Matany\Downloads\Apex-Chat\Apex-Chat\server\apex-unbound\selector-sync-engine.ts` (الأسطر 177-178)

```typescript
// قبل:
const knownCssKeywords = [".container", ".wrapper", ".row", ".col", ".flex", ".grid"];

// بعد:
const knownCssKeywords = [
  ".container", ".wrapper", ".row", ".col", ".flex", ".grid",
  ".header", ".footer", ".main", ".nav", ".section", ".content",
  ".button", ".btn", ".card", ".modal", ".overlay", ".sidebar",
  ".active", ".hidden", ".visible", ".open", ".close",
  ".title", ".text", ".image", ".icon", ".link", ".list",
  ".form", ".input", ".label", ".select", ".textarea",
  ".slide", ".dot", ".arrow", ".prev", ".next",
  ":root", ":before", ":after", ":hover", ":focus", ":active",
  "html", "body", "*",
];
```

---

## 🧪 المرحلة 5: الاختبار والتحقق

### المهمة 5.1: اختبار pipeline كامل

أنشئ ملف اختبار يتحقق من أن pipeline ينتج HTML صالح:
- شغّل Apex Coder بطلب "موقع مطعم بسيط"
- تحقق من أن المخرج يحتوي على: `<!DOCTYPE html>`, `#app-router`, `page-view`, `data-route`
- تحقق من أن CSS لا يحتوي على مخالفات selectors
- تحقق من أن JS يحتوي على null-guards

### المهمة 5.2: اختبار Self-Correrection

- تأكد أن المراجعات الثلاث (HTML, CSS, JS) تعمل بشكل منفصل
- تأكد أن retry loop يعمل عند فشل المراجعة

---

## 📋 ملخص الملفات المتأثرة

### ملفات معدلة (8):

| الملف | المرحلة | عدد التعديلات |
|-------|---------|---------------|
| `server/apex-unbound/pipeline.ts` | 1, 2, 3 | Self-correction rebuild + model diversity + retry loop |
| `server/apex-unbound/runtime-guard.ts` | 1, 3 | ensureProductionHtml + CSS guard |
| `server/apex-unbound/js-agent.ts` | 1, 2, 3 | max_tokens + HTML context + CSS bridge + validation |
| `server/apex-unbound/css-agent.ts` | 3 | Temperature |
| `server/apex-unbound/html-agent.ts` | 3, 4 | Temperature + SystemSpec dedup |
| `server/apex-unbound/architect-agent.ts` | 2, 3 | max_tokens + domain inference + RTL |
| `server/apex-unbound/selector-sync-engine.ts` | 3, 4 | Cheerio parser + validationSet + CSS keywords |
| `server/apex-unbound/bundler-engine.ts` | 2 | Smart style/script removal |
| `server/deepseek-model-router.ts` | 1 | Add pro model alias |

### حزمة جديدة:

| الحزمة | السبب |
|--------|-------|
| `cheerio` | HTML parser حقيقي بدل regex |

---

## ترتيب التنفيذ

```
1. npm install cheerio                          (تثبيت التبعية)
2. المرحلة 1: المشاكل الحرجة الخمسة              (الأولوية القصوى)
3. المرحلة 2: المشاكل العالية الستة              (تحسينات كبيرة)
4. المرحلة 3: المشاكل المتوسطة                    (تحسينات الجودة)
5. المرحلة 4: المشاكل المنخفضة                    (تنظيف وصقل)
6. git commit + push                             (حفظ التغييرات)
```
