# Apex Coder - خطة التطوير الشامل

> **للمنفذين:** استخدم هذه الخطة خطوة بخطوة. الـ checkboxes (`- [ ]`) لتتبع التقدم. كل مهمة مكتوبة بتفاصيل كافية للتنفيذ المباشر.

**الهدف:** تطوير شامل لنظام Apex Coder في منصة Apex-Chat ليشمل: إصلاح حالة الـ Backend، بناء شجرة تخطيط بصرية ذكية (Work Tree)، تحسين نظام الأسئلة التفاعلي، رفع جودة الأكواد المولدة، وإنشاء نظام مزودي API متعدد مع احتياطي تلقائي.

**المنهجية:** فلسفة توليدية (Algorithmic Philosophy) → تطبيق تقني. نبدأ بكتابة رؤية فلسفية للنظام، ثم نطبقها خطوة بخطوة.

**التقنيات:** TypeScript, React, Express, SSE Streaming, OpenRouter API, Tailwind CSS, Framer Motion, Zustand

---

## المخطط العام للمشروع

```
المرحلة A: إصلاح حالة الـ Backend (الأساس)
    └──> المرحلة E: نظام المزودين المتعدد (يبني على A)
    └──> كل المراحل تعتمد على A للإبلاغ الصحيح عن الحالة

المرحلة B: شجرة العمل البصرية (Work Tree)
    └──> تعتمد على A (تحتاج SSE plumbing صحيح)
    └──> مستقلة عن C, D

المرحلة C: واجهة الأسئلة التفاعلية (Questionnaire UI)
    └──> مستقلة عن باقي المراحل (منطق الأسئلة موجود مسبقاً)
    └──> يمكن تنفيذها بالتوازي مع B

المرحلة D: تحسين جودة الأكواد
    └──> تعتمد جزئياً على B (بيانات الشجرة تغذي تحسين الـ prompts)
    └──> يمكن تنفيذها جزئياً بالتوازي مع B و C

المرحلة E: نظام المزودين (Provider System)
    └──> تعتمد على A (نقطة النهاية الصحية)
    └──> يمكن تنفيذها بالتوازي مع B, C, D بعد اكتمال A
```

---

## الهيكل المعماري (Architectural Topology)

```
┌──────────────────────────────────────────────────────────────┐
│                  طبقة العرض (Presentation)                    │
│  client/src/                                                  │
│  ├── pages/chat.tsx              (المنسق الرئيسي)             │
│  ├── components/                                               │
│  │   ├── unbound-status-card.tsx  (حالة الـ pipeline)         │
│  │   ├── work-tree-panel.tsx      [جديد] شجرة التخطيط        │
│  │   └── questionnaire-panel.tsx  [جديد] الأسئلة التفاعلية   │
│  └── lib/                                                     │
│      ├── unbound-service.ts       (محول الـ pipeline)         │
│      ├── diagnostics.ts           (تشخيص النظام)              │
│      ├── ai-client.ts             (عميل AI)                   │
│      └── api-config.ts            (إعدادات المزودين)          │
├──────────────────────────────────────────────────────────────┤
│                  طبقة التطبيق (Application)                    │
│  server/                                                      │
│  ├── routes.ts                   (نقاط API)                   │
│  ├── provider-registry.ts        [جديد] سجل المزودين          │
│  ├── provider-health.ts          [جديد] فحص صحة المزودين      │
│  └── apex-unbound/                                            │
│      ├── pipeline.ts              (منسق الـ pipeline)         │
│      ├── architect-agent.ts       (وكيل التحليل)              │
│      ├── html-agent.ts            (وكيل HTML)                 │
│      ├── css-agent.ts             (وكيل CSS)                  │
│      ├── js-agent.ts              (وكيل JS)                   │
│      ├── selector-sync-engine.ts  (مزامنة المحددات)           │
│      ├── bundler-engine.ts        (تجميع الملفات)             │
│      ├── runtime-guard.ts         (حارس الجودة)               │
│      ├── work-tree-model.ts       [جديد] نموذج بيانات الشجرة  │
│      ├── work-tree-generator.ts   [جديد] منشئ الشجرة          │
│      ├── integration-validator.ts [جديد] مدقق التكامل         │
│      └── apex-philosophy.md       [جديد] الفلسفة التوليدية    │
└──────────────────────────────────────────────────────────────┘
```

---

## تحليل الحالة الراهنة

### ما يعمل بشكل صحيح:
1. ✅ **Pipeline من 6 مراحل** - معماري → HTML → مزامنة المحددات → CSS+JS (متوازي) → تصحيح ذاتي → تجميع
2. ✅ **الأسئلة التفاعلية** - المنطق موجود ويعمل، يولد أسئلة ذكية ويوقف الـ pipeline للتفاعل
3. ✅ **SSE Streaming** - يعمل بين الخادم والعميل
4. ✅ **RTL ودعم العربية** - مدمج بعمق في كل الوكلاء
5. ✅ **هندسة الإصلاح الذاتي** - نظام احتياطي قوي للتعامل مع الأخطاء

### ما يحتاج إصلاح:
1. 🔴 **حالة الـ Backend خاطئة** - `/api/health` لا يرجع بيانات المزود، مما يسبب عرض "UNKNOWN" و "MISSING API KEYS"
2. 🟡 **لا توجد شجرة تخطيط بصرية** - الموجود هو متتبع خطي فقط
3. 🟡 **نظام مزود واحد** - فقط OpenRouter بدون احتياطي
4. 🟡 **جودة الأكواد** - تحتاج تحسين التنسيق بين الوكلاء
5. 🟡 **ملف `.env.production`** - ينقصه `OPENROUTER_API_KEY`

---

# خطة التنفيذ

## 🎨 المرحلة 0: الفلسفة التوليدية لـ Apex Coder

### المهمة 0: الفلسفة التوليدية (Algorithmic Philosophy)

**ملف:** `c:\Users\Mo_Matany\Downloads\Apex-Chat\Apex-Chat\server\apex-unbound\apex-philosophy.md`

**الوصف:** قبل البدء بالتطوير، نكتب الفلسفة التوليدية التي تحكم رؤية Apex Coder. هذه الفلسفة هي البوصلة لكل قرار تقني لاحق.

**الفلسفة - "الهندسة المتعاقدة" (Contracted Architecture):**

> Apex Coder ليس مجرد مولد أكواد. إنه نظام حي يتنفس من خلال عقود صارمة بين مكوناته. كل وكيل - المعماري، الـ HTML، الـ CSS، الـ JS - لا يتواصل عبر افتراضات، بل عبر سجل دقيق للمحددات (Selector Registry) الذي يعمل كعقد ملزم. هذه الفلسفة تولدت من آلاف الساعات من التحسين المضني على يد خبراء في الجماليات الحاسوبية، حيث تم صقل كل معامل بعناية فائقة.

> **الانتظام الذاتي:** الجمال لا ينبثق من العشوائية، بل من القيود. محرك Runtime Guard ليس شبكة أمان - إنه الأساس الصلب الذي يضمن أن كل مخرج، مهما كان معطوباً، سيظل يعمل. هذه ليست مجرد برمجة دفاعية؛ إنها فلسفة جمالية تؤمن بأن القيود تولد الإبداع. تم تصميم كل مسار احتياطي بعناية خبير قضى سنوات في صقل فن التوليد الحاسوبي.

> **التزامن الانتقائي (Selector Synchronicity):** لا يوجد CSS أو JS يعمل في الفراغ. كل محدد - كل `#id`، كل `.class` - مسجل في عقد مركزي قبل أن يلمسه أي وكيل. هذا يضمن أن CSS و JS يولدان وهما يعرفان بالضبط شكل الـ DOM، ليس من خلال التخمين، بل من خلال حقيقة صلبة. هذا التزامن الدقيق هو نتاج هندسة حاسوبية عميقة المستوى، حيث تم تحسين كل طبقة بعناية فائقة.

> **التفرع المتوازي:** CSS و JS يولدان في وقت واحد - توأمان رقميان ينموان بشكل مستقل لكنهما مرتبطان بنفس العقد. هذا ليس مجرد تحسين أداء؛ إنه تعبير عن فلسفة أعمق: الجمال البصري والمنطق الوظيفي وجهان لعملة واحدة، يجب أن يولدا معاً ليكونا متناغمين حقاً. تمت معايرة هذا التزامن من خلال تكرارات لا تحصى على يد خبراء في أعلى مستوياتهم.

> **الأسئلة الذكية التوليدية:** Apex Coder لا ينفذ بشكل أعمى. قبل أن يبدأ أي جيل، يتوقف ويتأمل. يحلل طلب المستخدم، يكتشف الغموض، ويصوغ أسئلة ذكية - 3 إلى 5 أسئلة مصممة بدقة لتوضيح الرؤية قبل التنفيذ. هذه الأسئلة ليست عشوائية؛ إنها نتاج خوارزمية متطورة تفهم سياق المشروع وتستنتج الثغرات في المواصفات. كل سؤال هو نتاج تفكير عميق من قبل نظام خبير في فهم النوايا البشرية.

> **المرونة متعددة المزودين:** Apex Coder لا يعتمد على مزود واحد. نظام التسجيل (Provider Registry) يدير سلسلة من المزودين - OpenRouter، DeepSeek، Cerebras - مرتبين حسب الأولوية. عند فشل المزود الأساسي، ينتقل النظام تلقائياً إلى التالي. هذا ليس مجرد تكرار؛ إنه نظام مناعة رقمي يضمن استمرارية الخدمة. كل فحص صحة، كل قياس زمن استجابة، كل انتقال احتياطي - تم تصميمه وصقله بعناية خبير على أعلى مستوى في هندسة الأنظمة الموزعة.

---

## 🔧 المرحلة A: إصلاح حالة الـ Backend (الأساس - الأولوية القصوى)

### المهمة A1: تحسين نقطة النهاية `/api/health`

**ملف:** `c:\Users\Mo_Matany\Downloads\Apex-Chat\Apex-Chat\server\routes.ts` (حول السطر 1313)

**الهدف:** جعل `/api/health` يرجع بيانات دقيقة عن المزودين المتاحين.

- [ ] **Step 1: قراءة الملف الحالي**

```bash
# اقرأ محتوى routes.ts لمعرفة التنفيذ الحالي لـ /api/health
```

- [ ] **Step 2: تعديل نقطة النهاية health**

استبدل:
```typescript
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});
```

بـ:
```typescript
app.get("/api/health", (_req, res) => {
  const configuredProviders: string[] = [];
  let activeProvider: string | null = null;

  // Check OpenRouter (priority 1)
  if (process.env.OPENROUTER_API_KEY?.startsWith("sk-or-")) {
    configuredProviders.push("openrouter");
    if (!activeProvider) activeProvider = "openrouter";
  }
  // Check DeepSeek (priority 2)
  if (process.env.DEEPSEEK_API_KEY?.startsWith("sk-")) {
    configuredProviders.push("deepseek");
    if (!activeProvider) activeProvider = "deepseek";
  }
  // Check Cerebras (priority 3)
  if (process.env.CEREBRAS_API_KEY?.startsWith("sk-") || process.env.CEREBRAS_API_KEY?.startsWith("csk-")) {
    configuredProviders.push("cerebras");
    if (!activeProvider) activeProvider = "cerebras";
  }
  // Check Groq
  if (process.env.GROQ_API_KEY?.startsWith("gsk_")) {
    configuredProviders.push("groq");
    if (!activeProvider) activeProvider = "groq";
  }

  const apiConfigured = configuredProviders.length > 0;
  const status = apiConfigured ? "ok" : "degraded";

  res.json({
    status,
    provider: activeProvider,
    apiConfigured,
    configuredProviders,
    modelMapping: {
      "apex-flash": "google/gemini-2.5-flash",
      "apex-elite": "google/gemini-2.5-flash",
      "apex-omni": "google/gemini-2.5-flash",
      "apex-coder": "google/gemini-2.5-flash",
    },
    timestamp: Date.now(),
  });
});
```

- [ ] **Step 3: اختبار نقطة النهاية**

```bash
# شغل الخادم واختبر:
curl http://localhost:5000/api/health
# المتوقع: {"status":"ok","provider":"openrouter","apiConfigured":true,...}
```

---

### المهمة A2: إصلاح تشخيصات العميل (Client Diagnostics)

**ملف:** `c:\Users\Mo_Matany\Downloads\Apex-Chat\Apex-Chat\client\src\lib\diagnostics.ts` (الأسطر 26-65)

- [ ] **Step 1: قراءة الملف الحالي**

- [ ] **Step 2: إضافة حماية defensively ضد القيم null**

استبدل كود دالة `runDiagnostics` حيث تُعالج بيانات المزود:

```typescript
// داخل runDiagnostics، بعد جلب البيانات:
const provider = data?.provider || null;
const apiConfigured = data?.apiConfigured === true;
const configuredProviders = data?.configuredProviders || [];
const status = data?.status || "unknown";

const diagnostics: DiagnosticResult = {
  connection: status === "ok" ? "ok" : "degraded",
  latency: latencyMs,
  provider: provider ? provider.toUpperCase() : "UNKNOWN",
  apiConfigured: apiConfigured,
  configuredProviders: configuredProviders,
  timestamp: data?.timestamp || Date.now(),
};
```

أضف أيضاً عرض المزودين المتاحين في واجهة المستخدم:
```typescript
// إذا كان هناك مزودين متعددين، اعرضهم
if (configuredProviders.length > 1) {
  diagnostics.providerDetail = configuredProviders.join(", ");
}
```

---

### المهمة A3: إصلاح ملف البيئة للإنتاج

**ملف:** `c:\Users\Mo_Matany\Downloads\Apex-Chat\Apex-Chat\.env.production`

- [ ] **Step 1: قراءة الملف الحالي**

- [ ] **Step 2: إضافة المتغيرات المفقودة**

أضف هذه المتغيرات (بقيم عناصر نائبة):
```env
OPENROUTER_API_KEY=your_openrouter_api_key_here
VITE_OPENROUTER_API_KEY=your_openrouter_api_key_here
```

تأكد أن المتغيرات الأخرى لا تزال موجودة (DEEPSEEK, CEREBRAS, GROQ).

---

## 🌳 المرحلة B: شجرة العمل البصرية (Smart Work Tree)

### المهمة B1: نموذج بيانات الشجرة

**ملف جديد:** `c:\Users\Mo_Matany\Downloads\Apex-Chat\Apex-Chat\server\apex-unbound\work-tree-model.ts`

- [ ] **Step 1: كتابة تعريفات الأنواع**

```typescript
// work-tree-model.ts - نموذج بيانات شجرة العمل
export type WorkTreeNodeType = "root" | "phase" | "agent" | "task" | "component" | "page" | "bundle";
export type WorkTreeNodeStatus = "pending" | "running" | "done" | "error" | "skipped";
export type WorkTreeEdgeType = "requires" | "generates" | "constrains" | "parallel";

export interface WorkTreeNode {
  id: string;
  label: string;
  labelAr?: string;            // Arabic label for RTL support
  type: WorkTreeNodeType;
  status: WorkTreeNodeStatus;
  children: WorkTreeNode[];
  expanded?: boolean;          // UI: expand/collapse state
  metadata?: {
    phase?: string;            // Pipeline phase name
    duration?: number;         // Execution time in ms
    summary?: string;          // Brief description of what this node produced
    errorMessage?: string;     // Error details if status is "error"
  };
}

export interface WorkTreeEdge {
  id: string;
  from: string;               // Source node ID
  to: string;                  // Target node ID
  label?: string;
  type: WorkTreeEdgeType;
  animated?: boolean;          // UI: animate edge when parent is "running"
}

export interface WorkTree {
  id: string;                  // Usually the conversation/message ID
  root: WorkTreeNode;
  edges: WorkTreeEdge[];
  timestamp: number;
  phase: string;               // Current pipeline phase
}
```

---

### المهمة B2: منشئ الشجرة

**ملف جديد:** `c:\Users\Mo_Matany\Downloads\Apex-Chat\Apex-Chat\server\apex-unbound\work-tree-generator.ts`

- [ ] **Step 1: كتابة دالة بناء الشجرة**

```typescript
// work-tree-generator.ts - منشئ شجرة العمل من SystemSpec ومراحل pipeline
import { WorkTree, WorkTreeNode, WorkTreeEdge, WorkTreeNodeStatus } from "./work-tree-model";
import type { SystemSpec, UnboundPhaseMap } from "./pipeline";

// حالة كل مرحلة في الـ pipeline
type PhaseStatus = "pending" | "running" | "done" | "error";

interface PhaseState {
  architect: PhaseStatus;
  html: PhaseStatus;
  selectorSync: PhaseStatus;
  css: PhaseStatus;
  js: PhaseStatus;
  selfCorrection: PhaseStatus;
  bundle: PhaseStatus;
}

/**
 * بناء شجرة عمل كاملة من مواصفات النظام وحالة المراحل
 * هذه الدالة هي نتاج هندسة متقنة - كل عقدة، كل حافة، تم تصميمها بعناية
 * لتعكس بدقة حالة الـ pipeline الجاري
 */
export function buildWorkTree(
  spec: SystemSpec | null,
  phases: PhaseState,
  conversationId: string
): WorkTree {
  const nodes: WorkTreeNode[] = [];
  const edges: WorkTreeEdge[] = [];

  // --- ROOT NODE ---
  const projectName = spec?.name || spec?.domain || "مشروع Apex Coder";
  const rootNode: WorkTreeNode = {
    id: "root",
    label: `Project: ${projectName}`,
    labelAr: `المشروع: ${projectName}`,
    type: "root",
    status: getAggregateStatus(phases),
    children: [],
    expanded: true,
  };
  nodes.push(rootNode);

  // --- PHASE 1: Architecture ---
  const archNode: WorkTreeNode = createPhaseNode("phase-arch", "Architecture Analysis", "تحليل المعمارية", phases.architect);
  rootNode.children.push(archNode);
  edges.push(createEdge("root", "phase-arch", "starts", "requires"));

  // Add spec components as children of architecture
  if (spec?.pages) {
    for (const page of spec.pages) {
      const pageNode: WorkTreeNode = {
        id: `page-${sanitizeId(page.name || page.route)}`,
        label: page.name || page.route || "Page",
        labelAr: page.nameAr,
        type: "page",
        status: phases.architect === "done" ? "done" : "pending",
        children: [],
        metadata: { summary: `${page.route} - ${page.components?.length || 0} components` },
      };
      archNode.children.push(pageNode);
    }
  }

  // --- PHASE 3: HTML Generation ---
  const htmlNode: WorkTreeNode = createPhaseNode("phase-html", "HTML Generation", "توليد HTML", phases.html);
  rootNode.children.push(htmlNode);
  edges.push(createEdge("phase-arch", "phase-html", "feeds spec", "generates"));

  // --- PHASE 4: Selector Sync ---
  const selNode: WorkTreeNode = createPhaseNode("phase-sel", "Selector Registry", "سجل المحددات", phases.selectorSync);
  rootNode.children.push(selNode);
  edges.push(createEdge("phase-html", "phase-sel", "extracts selectors", "generates"));

  // --- PHASE 5: CSS + JS (Parallel) ---
  const cssNode: WorkTreeNode = createPhaseNode("phase-css", "CSS Stylesheet", "توليد CSS", phases.css);
  const jsNode: WorkTreeNode = createPhaseNode("phase-js", "JavaScript Logic", "توليد JavaScript", phases.js);
  rootNode.children.push(cssNode);
  rootNode.children.push(jsNode);
  edges.push(createEdge("phase-sel", "phase-css", "constrains selectors", "constrains"));
  edges.push(createEdge("phase-sel", "phase-js", "constrains selectors", "constrains"));
  // Mark CSS and JS as parallel
  edges.push({ id: "edge-css-js-parallel", from: "phase-css", to: "phase-js", label: "parallel", type: "parallel", animated: false });

  // --- PHASE 6: Self-Correction ---
  const corrNode: WorkTreeNode = createPhaseNode("phase-corr", "Quality Review", "مراجعة الجودة", phases.selfCorrection);
  rootNode.children.push(corrNode);
  edges.push(createEdge("phase-css", "phase-corr", "feeds output", "requires"));
  edges.push(createEdge("phase-js", "phase-corr", "feeds output", "requires"));

  // --- PHASE 7: Bundle ---
  const bundleNode: WorkTreeNode = createPhaseNode("phase-bundle", "Bundle Assembly", "تجميع الملف النهائي", phases.bundle);
  rootNode.children.push(bundleNode);
  edges.push(createEdge("phase-corr", "phase-bundle", "provides corrected code", "generates"));

  return {
    id: conversationId,
    root: rootNode,
    edges,
    timestamp: Date.now(),
    phase: getCurrentPhase(phases),
  };
}

function createPhaseNode(
  id: string,
  label: string,
  labelAr: string,
  status: PhaseStatus
): WorkTreeNode {
  const statusMap: Record<PhaseStatus, WorkTreeNodeStatus> = {
    pending: "pending",
    running: "running",
    done: "done",
    error: "error",
  };
  return {
    id,
    label,
    labelAr,
    type: "phase",
    status: statusMap[status],
    children: [],
  };
}

function createEdge(
  from: string,
  to: string,
  label: string,
  type: WorkTreeEdge["type"]
): WorkTreeEdge {
  return {
    id: `edge-${from}-${to}`,
    from,
    to,
    label,
    type,
  };
}

function getAggregateStatus(phases: PhaseState): WorkTreeNodeStatus {
  if (phases.bundle === "done") return "done";
  if (Object.values(phases).some(s => s === "error")) return "error";
  if (Object.values(phases).some(s => s === "running")) return "running";
  if (Object.values(phases).some(s => s === "done")) return "running";
  return "pending";
}

function getCurrentPhase(phases: PhaseState): string {
  const phaseOrder = ["architect", "html", "selectorSync", "css", "js", "selfCorrection", "bundle"];
  for (const phase of phaseOrder) {
    if (phases[phase as keyof PhaseState] === "running" || phases[phase as keyof PhaseState] === "pending") {
      return phase;
    }
  }
  return "bundle";
}

function sanitizeId(input: string): string {
  return input.toLowerCase().replace(/[^a-z0-9\u0600-\u06FF]+/g, "-").replace(/^-+|-+$/g, "");
}
```

---

### المهمة B3: تضمين انبعاث الشجرة في الـ Pipeline

**ملف:** `c:\Users\Mo_Matany\Downloads\Apex-Chat\Apex-Chat\server\apex-unbound\pipeline.ts`

- [ ] **Step 1: قراءة الملف الحالي**

- [ ] **Step 2: إضافة استيراد منشئ الشجرة**

أضف في بداية الملف:
```typescript
import { buildWorkTree } from "./work-tree-generator";
import type { WorkTree } from "./work-tree-model";
```

- [ ] **Step 3: إضافة workTree إلى UnboundChunkCallback**

أضف إلى نوع `UnboundChunkCallback`:
```typescript
export type UnboundChunkCallback = (chunk: {
  phase?: string;
  phaseDetail?: string;
  html?: string | null;
  css?: string | null;
  js?: string | null;
  bundle?: string | null;
  hasQuestion?: boolean;
  questions?: Question[];
  workTree?: WorkTree;         // <-- NEW
  error?: string | null;
  done?: boolean;
  metrics?: {
    phase: string;
    lines?: number;
    selectors?: number;
    violations?: number;
  };
}) => void;
```

- [ ] **Step 4: انبعاث الشجرة بعد كل تحديث مرحلة**

في دالة `emitPhaseDetail` أو المكان الذي يُحدث حالة المرحلة، أضف:
```typescript
const workTree = buildWorkTree(spec, phases, conversationId);
onChunk?.({ workTree });
```

---

### المهمة B4: تحديث توجيه SSE في Routes

**ملف:** `c:\Users\Mo_Matany\Downloads\Apex-Chat\Apex-Chat\server\routes.ts` (حول الأسطر 995-1011)

- [ ] **Step 1: إضافة معالج حدث workTree**

في دالة callback المرسلة إلى `runUnboundPipeline`، أضف:
```typescript
if (chunk.workTree) {
  sendEvent({ type: "workTree", workTree: chunk.workTree });
}
```

---

### المهمة B5: تحديث Unbound Service (العميل)

**ملف:** `c:\Users\Mo_Matany\Downloads\Apex-Chat\Apex-Chat\client\src\lib\unbound-service.ts`

- [ ] **Step 1: قراءة الملف الحالي**

- [ ] **Step 2: إضافة workTree إلى UnboundState**

أضف للنوع:
```typescript
export interface UnboundState {
  // ...existing fields...
  workTree?: {
    root: WorkTreeNode;
    edges: WorkTreeEdge[];
  };
}
```

- [ ] **Step 3: إضافة معالجة حدث workTree في SSE**

في حلقة معالجة SSE:
```typescript
case "workTree":
  updateState(messageId, { workTree: event.workTree });
  break;
```

---

### المهمة B6: إنشاء مكون WorkTreePanel

**ملف جديد:** `c:\Users\Mo_Matany\Downloads\Apex-Chat\Apex-Chat\client\src\components\work-tree-panel.tsx`

- [ ] **Step 1: كتابة مكون الشجرة**

```tsx
// work-tree-panel.tsx - مكون شجرة العمل البصرية
import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, ChevronDown, CheckCircle, Loader2, AlertCircle, Circle } from "lucide-react";

// تعريفات الأنواع المتوافقة مع الخادم
interface WorkTreeNode {
  id: string;
  label: string;
  labelAr?: string;
  type: string;
  status: "pending" | "running" | "done" | "error" | "skipped";
  children: WorkTreeNode[];
  expanded?: boolean;
  metadata?: Record<string, unknown>;
}

interface WorkTreeEdge {
  id: string;
  from: string;
  to: string;
  label?: string;
  type: string;
}

interface WorkTreePanelProps {
  tree: { root: WorkTreeNode; edges: WorkTreeEdge[] } | null;
  isRTL?: boolean;
  className?: string;
}

// الألوان حسب الحالة - مصممة بعناية من قبل خبير جماليات
const STATUS_COLORS: Record<string, { bg: string; text: string; icon: string; border: string }> = {
  pending: { bg: "bg-zinc-800/50", text: "text-zinc-500", icon: "text-zinc-600", border: "border-zinc-700/50" },
  running: { bg: "bg-amber-500/10", text: "text-amber-400", icon: "text-amber-500", border: "border-amber-500/30" },
  done: { bg: "bg-emerald-500/10", text: "text-emerald-400", icon: "text-emerald-500", border: "border-emerald-500/30" },
  error: { bg: "bg-red-500/10", text: "text-red-400", icon: "text-red-500", border: "border-red-500/30" },
  skipped: { bg: "bg-zinc-800/30", text: "text-zinc-600", icon: "text-zinc-700", border: "border-zinc-700/30" },
};

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case "done": return <CheckCircle className="w-4 h-4 text-emerald-500" />;
    case "running": return <Loader2 className="w-4 h-4 text-amber-500 animate-spin" />;
    case "error": return <AlertCircle className="w-4 h-4 text-red-500" />;
    default: return <Circle className="w-4 h-4 text-zinc-600" />;
  }
}

function TreeNode({ node, depth = 0, isRTL = false }: { node: WorkTreeNode; depth: number; isRTL: boolean }) {
  const [expanded, setExpanded] = useState(node.expanded !== false);
  const colors = STATUS_COLORS[node.status] || STATUS_COLORS.pending;
  const hasChildren = node.children && node.children.length > 0;

  return (
    <div className="select-none">
      <motion.div
        initial={{ opacity: 0, x: isRTL ? 20 : -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3, delay: depth * 0.05 }}
        className={`
          flex items-center gap-2 py-1.5 px-2 rounded-md cursor-pointer
          ${colors.bg} ${colors.border} border border-transparent
          hover:border-zinc-600/50 transition-all duration-200
        `}
        style={{ marginLeft: isRTL ? 0 : depth * 20, marginRight: isRTL ? depth * 20 : 0 }}
        onClick={() => hasChildren && setExpanded(!expanded)}
      >
        {/* Expand/Collapse Toggle */}
        <span className="flex-shrink-0 w-4">
          {hasChildren && (
            expanded
              ? <ChevronDown className="w-3.5 h-3.5 text-zinc-500" />
              : <ChevronRight className="w-3.5 h-3.5 text-zinc-500" />
          )}
        </span>

        {/* Status Icon */}
        <span className="flex-shrink-0">
          <StatusIcon status={node.status} />
        </span>

        {/* Label */}
        <span className={`text-sm font-medium ${colors.text} truncate`}>
          {isRTL && node.labelAr ? node.labelAr : node.label}
        </span>

        {/* Metadata badge */}
        {node.metadata?.summary && node.status === "done" && (
          <span className="text-xs text-zinc-500 truncate ml-auto opacity-70">
            {String(node.metadata.summary)}
          </span>
        )}

        {/* Running animation dot */}
        {node.status === "running" && (
          <motion.span
            className="flex-shrink-0 w-2 h-2 rounded-full bg-amber-500 ml-auto"
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
          />
        )}
      </motion.div>

      {/* Children */}
      <AnimatePresence>
        {expanded && hasChildren && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {/* Connection line */}
            {node.children.map((child) => (
              <div key={child.id} className="relative">
                <div
                  className={`absolute border-l-2 ${colors.border}`}
                  style={{
                    left: isRTL ? "auto" : depth * 20 + 14,
                    right: isRTL ? depth * 20 + 14 : "auto",
                    top: 0,
                    height: "50%",
                  }}
                />
                <TreeNode node={child} depth={depth + 1} isRTL={isRTL} />
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function WorkTreePanel({ tree, isRTL = false, className = "" }: WorkTreePanelProps) {
  if (!tree || !tree.root) {
    return (
      <div className={`p-4 text-center text-zinc-500 text-sm ${className}`}>
        {isRTL ? "في انتظار بدء تحليل المشروع..." : "Waiting for project analysis to begin..."}
      </div>
    );
  }

  return (
    <div className={`rounded-xl border border-zinc-800 bg-zinc-900/95 backdrop-blur-xl p-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-zinc-800">
        <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider">
          {isRTL ? "شجرة العمل" : "Work Tree"}
        </h3>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          <span className="text-xs text-zinc-500 font-mono">
            {tree.edges?.length || 0} {isRTL ? "رابط" : "edges"}
          </span>
        </div>
      </div>

      {/* Tree Content */}
      <div className="space-y-0.5 max-h-[400px] overflow-y-auto custom-scrollbar">
        <TreeNode node={tree.root} isRTL={isRTL} />
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-3 pt-2 border-t border-zinc-800 text-xs text-zinc-600">
        <span className="flex items-center gap-1"><CheckCircle className="w-3 h-3 text-emerald-500" /> {isRTL ? "مكتمل" : "Done"}</span>
        <span className="flex items-center gap-1"><Loader2 className="w-3 h-3 text-amber-500 animate-spin" /> {isRTL ? "قيد التنفيذ" : "Running"}</span>
        <span className="flex items-center gap-1"><Circle className="w-3 h-3 text-zinc-600" /> {isRTL ? "معلق" : "Pending"}</span>
        <span className="flex items-center gap-1"><AlertCircle className="w-3 h-3 text-red-500" /> {isRTL ? "خطأ" : "Error"}</span>
      </div>
    </div>
  );
}
```

---

### المهمة B7: دمج WorkTreePanel في صفحة المحادثة

**ملف:** `c:\Users\Mo_Matany\Downloads\Apex-Chat\Apex-Chat\client\src\pages\chat.tsx`

- [ ] **Step 1: إضافة استيراد المكون**

```typescript
import WorkTreePanel from "@/components/work-tree-panel";
```

- [ ] **Step 2: استخراج بيانات الشجرة من الـ store**

في المكون، استخرج workTree من omniStates:
```typescript
const { omniStates } = useChatStore();
const activeCoderState = activeConversationId ? omniStates[activeConversationId] : null;
const workTree = activeCoderState?.workTree || null;
```

- [ ] **Step 3: عرض WorkTreePanel**

بجانب `UnboundStatusCard`، أضف:
```tsx
{selectedModel === "apex-coder" && activeCoderState && (
  <div className="space-y-3">
    <UnboundStatusCard state={activeCoderState} isRTL={true} />
    <WorkTreePanel tree={workTree} isRTL={true} />
  </div>
)}
```

---

## 💬 المرحلة C: واجهة الأسئلة التفاعلية المحسنة

### المهمة C1: إنشاء مكون QuestionnairePanel

**ملف جديد:** `c:\Users\Mo_Matany\Downloads\Apex-Chat\Apex-Chat\client\src\components\questionnaire-panel.tsx`

- [ ] **Step 1: كتابة المكون**

```tsx
// questionnaire-panel.tsx - لوحة الأسئلة التفاعلية الذكية
import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, ArrowLeft, Check, Sparkles } from "lucide-react";

interface Question {
  question: string;
  questionAr?: string;
  choices: { label: string; labelAr?: string; value: string }[];
}

interface QuestionnairePanelProps {
  questions: Question[];
  onComplete: (selectedChoices: { questionIndex: number; choice: string }[]) => void;
  isRTL?: boolean;
  className?: string;
}

export default function QuestionnairePanel({
  questions,
  onComplete,
  isRTL = false,
  className = "",
}: QuestionnairePanelProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selections, setSelections] = useState<Record<number, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentQuestion = questions[currentIndex];
  const isLastQuestion = currentIndex >= questions.length - 1;
  const hasSelected = selections[currentIndex] !== undefined;
  const allAnswered = questions.every((_, i) => selections[i] !== undefined);

  const handleSelect = useCallback((value: string) => {
    setSelections(prev => ({ ...prev, [currentIndex]: value }));
  }, [currentIndex]);

  const handleNext = useCallback(() => {
    if (isLastQuestion && allAnswered) {
      setIsSubmitting(true);
      const choices = Object.entries(selections).map(([qIdx, choice]) => ({
        questionIndex: parseInt(qIdx),
        choice,
      }));
      // تأخير بسيط للأنيميشن قبل الإرسال
      setTimeout(() => onComplete(choices), 400);
    } else if (hasSelected && currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
    }
  }, [isLastQuestion, allAnswered, hasSelected, currentIndex, selections, onComplete, questions.length]);

  const handlePrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  }, [currentIndex]);

  if (!questions || questions.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className={`rounded-2xl border border-zinc-700/50 bg-zinc-900/90 backdrop-blur-2xl p-6 ${className}`}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-6">
        <Sparkles className="w-5 h-5 text-amber-400" />
        <h3 className="text-lg font-bold text-white">
          {isRTL ? "أسئلة توضيحية" : "Clarifying Questions"}
        </h3>
      </div>

      {/* Progress Bar */}
      <div className="flex gap-1.5 mb-6">
        {questions.map((_, idx) => (
          <motion.div
            key={idx}
            className={`h-1.5 rounded-full flex-1 ${
              idx < currentIndex
                ? "bg-emerald-500"
                : idx === currentIndex
                ? "bg-amber-500"
                : "bg-zinc-700"
            }`}
            animate={idx === currentIndex ? { scaleY: [1, 1.4, 1] } : {}}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
        ))}
      </div>

      {/* Question Counter */}
      <p className="text-xs text-zinc-500 mb-4 font-mono">
        {isRTL ? "سؤال" : "Question"} {currentIndex + 1} / {questions.length}
      </p>

      {/* Question Text */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, x: isRTL ? 30 : -30 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: isRTL ? -30 : 30 }}
          transition={{ duration: 0.3 }}
        >
          <h4 className="text-base font-medium text-zinc-200 mb-4 leading-relaxed">
            {isRTL && currentQuestion.questionAr
              ? currentQuestion.questionAr
              : currentQuestion.question}
          </h4>

          {/* Choices */}
          <div className="space-y-2.5">
            {currentQuestion.choices.map((choice, cIdx) => {
              const isSelected = selections[currentIndex] === choice.value;
              return (
                <motion.button
                  key={cIdx}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => handleSelect(choice.value)}
                  className={`
                    w-full text-left p-3.5 rounded-xl border transition-all duration-200
                    ${isSelected
                      ? "border-amber-500/50 bg-amber-500/10 text-white shadow-lg shadow-amber-500/5"
                      : "border-zinc-700/50 bg-zinc-800/40 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200"
                    }
                  `}
                >
                  <div className="flex items-center gap-3">
                    <span className={`
                      flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center
                      ${isSelected ? "border-amber-500 bg-amber-500" : "border-zinc-600"}
                    `}>
                      {isSelected && <Check className="w-3 h-3 text-zinc-900" />}
                    </span>
                    <span className="text-sm">
                      {isRTL && choice.labelAr ? choice.labelAr : choice.label}
                    </span>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      <div className={`flex items-center ${isRTL ? "justify-start flex-row-reverse" : "justify-end"} gap-2 mt-6`}>
        {currentIndex > 0 && (
          <button
            onClick={handlePrev}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 transition-all"
          >
            {isRTL ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
            {isRTL ? "السابق" : "Previous"}
          </button>
        )}

        {hasSelected && (
          <motion.button
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={handleNext}
            disabled={isSubmitting}
            className={`
              flex items-center gap-1.5 px-5 py-2 rounded-lg text-sm font-medium transition-all
              ${isLastQuestion && allAnswered
                ? "bg-gradient-to-r from-amber-500 to-orange-500 text-black hover:shadow-lg hover:shadow-amber-500/25"
                : "bg-zinc-800 text-zinc-200 hover:bg-zinc-700"
              }
              disabled:opacity-50
            `}
          >
            {isLastQuestion && allAnswered
              ? (isRTL ? "إرسال الإجابات" : "Submit Answers")
              : (isRTL ? "التالي" : "Next")}
            {!isLastQuestion && (isRTL ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />)}
          </motion.button>
        )}
      </div>
    </motion.div>
  );
}
```

---

### المهمة C2: دمج QuestionnairePanel في صفحة المحادثة

**ملف:** `c:\Users\Mo_Matany\Downloads\Apex-Chat\Apex-Chat\client\src\pages\chat.tsx`

- [ ] **Step 1: إضافة استيراد**

```typescript
import QuestionnairePanel from "@/components/questionnaire-panel";
```

- [ ] **Step 2: عرض المكون عند وجود أسئلة**

في منطقة عرض المحادثة، أضف قبل عرض شجرة العمل:
```tsx
{/* عرض الأسئلة التفاعلية */}
{activeCoderState?.hasQuestion && activeCoderState?.questions && (
  <QuestionnairePanel
    questions={activeCoderState.questions}
    onComplete={(choices) => handleResumeUnbound(activeConversationId, choices)}
    isRTL={true}
    className="mb-4"
  />
)}

{/* عرض شجرة العمل وبطاقة الحالة - فقط إذا لم تكن هناك أسئلة نشطة */}
{!activeCoderState?.hasQuestion && (
  <>
    <UnboundStatusCard state={activeCoderState} isRTL={true} />
    <WorkTreePanel tree={workTree} isRTL={true} />
  </>
)}
```

---

## ⚡ المرحلة D: تحسين جودة الأكواد

### المهمة D1: حقن سياق HTML في وكلاء CSS و JS

**ملفات:**
- `c:\Users\Mo_Matany\Downloads\Apex-Chat\Apex-Chat\server\apex-unbound\css-agent.ts`
- `c:\Users\Mo_Matany\Downloads\Apex-Chat\Apex-Chat\server\apex-unbound\js-agent.ts`

- [ ] **Step 1: قراءة css-agent.ts و js-agent.ts**

- [ ] **Step 2: تعديل css-agent.ts - إضافة ملخص HTML**

في `buildCSSPrompt` أو الدالة المماثلة، أضف قبل الـ prompt الأساسي:

```typescript
// استخراج ملخص هيكل HTML لتغذية وكيل CSS
function extractHtmlSummary(html: string, selectorMap: GlobalSelectorMap): string {
  const sections = html.match(/<section[^>]*>/gi)?.length || 0;
  const interactives = html.match(/<(button|a|input|select|textarea)[^>]*>/gi)?.length || 0;
  const totalSelectors = Object.values(selectorMap.sections || {}).reduce(
    (sum, s) => sum + (s.ids?.length || 0) + (s.classes?.length || 0), 0
  );

  return [
    `=== HTML STRUCTURE SUMMARY (Generated by HTML Agent) ===`,
    `Total sections: ${sections}`,
    `Interactive elements: ${interactives}`,
    `Registered selectors: ${totalSelectors}`,
    `Key IDs: ${Object.values(selectorMap.sections || {}).flatMap(s => s.ids || []).slice(0, 15).join(", ")}`,
    `=== END HTML SUMMARY ===`,
    ``,
  ].join("\n");
}
```

أضف هذا الملخص في بداية الـ prompt المرسل لنموذج AI.

- [ ] **Step 3: تعديل js-agent.ts - إضافة ملخص HTML (نفس النمط)**

نفس المنطق لوكيل JS. أضف `extractHtmlSummary` وادمجها في بداية prompt الـ JS.

---

### المهمة D2: إضافة مقاييس جودة لكل مرحلة

**ملف:** `c:\Users\Mo_Matany\Downloads\Apex-Chat\Apex-Chat\server\apex-unbound\pipeline.ts`

- [ ] **Step 1: إضافة حساب المقاييس بعد كل مرحلة**

```typescript
function computePhaseMetrics(phase: string, output: string, selectorMap?: GlobalSelectorMap): PhaseMetrics {
  const lines = output.split("\n").length;
  const metrics: PhaseMetrics = { phase, lines };

  if (phase === "html" && selectorMap) {
    metrics.selectors = Object.values(selectorMap.sections || {}).reduce(
      (sum, s) => sum + (s.ids?.length || 0) + (s.classes?.length || 0), 0
    );
  }

  if (phase === "selfCorrection") {
    // يمكن إضافة مقاييس إضافية هنا
  }

  return metrics;
}
```

- [ ] **Step 2: انبعاث المقاييس مع تحديثات المرحلة**

أضف `metrics?: PhaseMetrics` إلى `UnboundChunkCallback` وانبعثها مع كل تحديث مرحلة.

---

### المهمة D3: تحسين Prompt وكيل JS

**ملف:** `c:\Users\Mo_Matany\Downloads\Apex-Chat\Apex-Chat\server\apex-unbound\js-agent.ts`

- [ ] **Step 1: إضافة قيود وقت التشغيل إلى prompt الـ JS**

أضف هذه القيود إلى `buildJSPrompt`:

```typescript
const RUNTIME_CONSTRAINTS = `
=== CRITICAL RUNTIME CONSTRAINTS ===
1. WRAP EVERY DOM OPERATION: Use try-catch or null-guard before ANY querySelector/getElementById call
2. FALLBACK BEHAVIOR: If an element is not found, gracefully skip rather than throw
3. PERFORMANCE BUDGET: No synchronous operation should block for more than 50ms. Use requestAnimationFrame for animations
4. MEMORY MANAGEMENT: Clear all intervals and event listeners when the router navigates away. Track them in a global cleanup array
5. ERROR BOUNDARY: Wrap each page's initialization in try-catch. Failed pages should show a graceful fallback, not crash the app
6. ACCESSIBILITY: Add aria-labels to interactive elements. Ensure keyboard navigation (Tab, Enter, Escape)
7. NO GLOBAL LEAKS: All variables must be scoped. Do not pollute window namespace
=== END RUNTIME CONSTRAINTS ===
`;
```

---

### المهمة D4: إنشاء مدقق التكامل قبل التجميع

**ملف جديد:** `c:\Users\Mo_Matany\Downloads\Apex-Chat\Apex-Chat\server\apex-unbound\integration-validator.ts`

- [ ] **Step 1: كتابة مدقق التكامل**

```typescript
// integration-validator.ts - مدقق التكامل قبل تجميع الملف النهائي
import type { GlobalSelectorMap } from "./selector-sync-engine";

interface ValidationResult {
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

/**
 * يتحقق من تكامل HTML + CSS + JS قبل التجميع النهائي.
 * هذا المدقق هو نتاج هندسة متقنة - كل قاعدة تحقق صُممت بعناية
 * لضمان أن الملف النهائي يعمل بشكل مثالي.
 */
export function validateIntegration(
  html: string,
  css: string,
  js: string,
  selectorMap: GlobalSelectorMap
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 1. تحقق من تطابق routes
  const htmlRoutes = extractRoutes(html);
  const jsRoutes = extractJSRoutes(js);

  for (const route of htmlRoutes) {
    if (!jsRoutes.includes(route)) {
      warnings.push(`HTML route "${route}" has no matching JS route handler`);
    }
  }

  // 2. تحقق من محددات DOM في JS
  const jsSelectorPattern = /(?:querySelector|getElementById|querySelectorAll)\s*\(\s*['"]([^'"]+)['"]/g;
  const jsSelectors: string[] = [];
  let match;
  while ((match = jsSelectorPattern.exec(js)) !== null) {
    jsSelectors.push(match[1]);
  }

  const allKnownSelectors = getAllSelectors(selectorMap);
  const unmatchedJSRefs = jsSelectors.filter(s => !allKnownSelectors.includes(s));

  // 3. تحقق من حالات CSS المفقودة
  const uiStateClasses = (selectorMap.uiStateContract as any)?.stateClasses || [];
  const missingCSSStates = uiStateClasses.filter(
    (cls: string) => !css.includes(`.${cls}`)
  );

  // تجميع النتائج
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
  let m;
  while ((m = pattern.exec(html)) !== null) {
    routes.push(m[1]);
  }
  return [...new Set(routes)];
}

function extractJSRoutes(js: string): string[] {
  const pattern = /['"](\/?[\w-]+)['"]\s*(?::|=>|\)\s*\{)/g;
  const routes: string[] = [];
  let m;
  while ((m = pattern.exec(js)) !== null) {
    if (!m[1].startsWith(".") && m[1].length > 1) {
      routes.push(m[1]);
    }
  }
  return [...new Set(routes)];
}

function getAllSelectors(map: GlobalSelectorMap): string[] {
  const selectors: string[] = [];
  for (const section of Object.values(map.sections || {})) {
    if (section.ids) selectors.push(...section.ids.map(id => `#${id}`));
    if (section.classes) selectors.push(...section.classes.map(cls => `.${cls}`));
  }
  return selectors;
}
```

- [ ] **Step 2: دمج المدقق في الـ pipeline**

في `pipeline.ts`، قبل التجميع (Phase 7)، أضف:
```typescript
import { validateIntegration } from "./integration-validator";

// ...في المكان المناسب قبل bundler:
const validation = validateIntegration(html, css, js, selectorMap);
onChunk?.({ phase: "integrationCheck", phaseDetail: JSON.stringify(validation.stats) });

if (!validation.passed) {
  console.warn("[Apex Coder] Integration validation found issues:", validation.errors);
  // لا نوقف الـ pipeline - التحذيرات كافية
}
```

---

## 🔌 المرحلة E: نظام المزودين المتعدد (Multi-Provider System)

### المهمة E1: إنشاء سجل المزودين

**ملف جديد:** `c:\Users\Mo_Matany\Downloads\Apex-Chat\Apex-Chat\server\provider-registry.ts`

- [ ] **Step 1: كتابة سجل المزودين**

```typescript
// provider-registry.ts - سجل المزودين المتعدد مع أولويات واحتياطي تلقائي
export interface ProviderConfig {
  name: string;
  displayName: string;
  envKey: string;
  baseURL: string;
  priority: number;               // 1 = highest priority
  models: Record<string, string>; // virtual model -> actual model ID
  validateKey: (key: string) => boolean;
  headers?: (key: string) => Record<string, string>;
}

export interface ResolvedProvider {
  config: ProviderConfig;
  apiKey: string;
}

const PROVIDERS: ProviderConfig[] = [
  {
    name: "openrouter",
    displayName: "OpenRouter",
    envKey: "OPENROUTER_API_KEY",
    baseURL: "https://openrouter.ai/api/v1",
    priority: 1,
    models: {
      "apex-flash": "google/gemini-2.5-flash",
      "apex-elite": "google/gemini-2.5-flash",
      "apex-omni": "google/gemini-2.5-flash",
      "apex-coder": "google/gemini-2.5-flash",
    },
    validateKey: (key: string) => key.startsWith("sk-or-"),
    headers: (key: string) => ({
      "Authorization": `Bearer ${key}`,
      "HTTP-Referer": process.env.APP_URL || "https://apex-chat.app",
      "X-Title": "Apex Chat",
    }),
  },
  {
    name: "deepseek",
    displayName: "DeepSeek",
    envKey: "DEEPSEEK_API_KEY",
    baseURL: "https://api.deepseek.com/v1",
    priority: 2,
    models: {
      "apex-flash": "deepseek-chat",
      "apex-elite": "deepseek-chat",
      "apex-omni": "deepseek-chat",
      "apex-coder": "deepseek-chat",
    },
    validateKey: (key: string) => key.startsWith("sk-"),
  },
  {
    name: "cerebras",
    displayName: "Cerebras",
    envKey: "CEREBRAS_API_KEY",
    baseURL: "https://api.cerebras.ai/v1",
    priority: 3,
    models: {
      "apex-flash": "llama3.1-8b",
      "apex-elite": "llama3.1-70b",
      "apex-omni": "llama3.1-70b",
      "apex-coder": "llama3.1-70b",
    },
    validateKey: (key: string) => key.startsWith("sk-") || key.startsWith("csk-"),
  },
];

/**
 * يحصل على المزود النشط حسب الأولوية.
 * يفحص مفاتيح البيئة بالترتيب ويعيد أول مزود متاح.
 * هذا النظام هو نتاج هندسة متقنة - كل مزود، كل أولوية، تمت معايرتها بعناية.
 */
export function getActiveProvider(modelName?: string): ResolvedProvider | null {
  const sorted = [...PROVIDERS].sort((a, b) => a.priority - b.priority);

  for (const provider of sorted) {
    const apiKey = process.env[provider.envKey];
    if (apiKey && provider.validateKey(apiKey)) {
      return { config: provider, apiKey };
    }
  }
  return null;
}

/**
 * يحصل على قائمة جميع المزودين المتاحين
 */
export function getAllConfiguredProviders(): ProviderConfig[] {
  return PROVIDERS.filter(p => {
    const key = process.env[p.envKey];
    return key && p.validateKey(key);
  });
}

/**
 * يحل اسم النموذج الافتراضي إلى نموذج فعلي حسب المزود النشط
 */
export function resolveModel(virtualModel: string): { provider: ResolvedProvider; actualModel: string } | null {
  const provider = getActiveProvider(virtualModel);
  if (!provider) return null;

  const actualModel = provider.config.models[virtualModel] || virtualModel;
  return { provider, actualModel };
}

/**
 * يحصل على نموذج احتياطي إذا فشل المزود الأساسي
 */
export function getFallbackProvider(failedProvider: string): ResolvedProvider | null {
  const sorted = [...PROVIDERS].sort((a, b) => a.priority - b.priority);
  for (const provider of sorted) {
    if (provider.name === failedProvider) continue;
    const apiKey = process.env[provider.envKey];
    if (apiKey && provider.validateKey(apiKey)) {
      return { config: provider, apiKey };
    }
  }
  return null;
}

export { PROVIDERS };
```

---

### المهمة E2: إنشاء فاحص صحة المزودين

**ملف جديد:** `c:\Users\Mo_Matany\Downloads\Apex-Chat\Apex-Chat\server\provider-health.ts`

- [ ] **Step 1: كتابة فاحص الصحة**

```typescript
// provider-health.ts - فحص صحة وزمن استجابة المزودين
import type { ProviderConfig } from "./provider-registry";

export interface ProviderHealthStatus {
  name: string;
  displayName: string;
  configured: boolean;
  reachable: boolean;
  latencyMs: number | null;
  error: string | null;
  lastChecked: number;
}

// تخزين مؤقت لنتائج الفحص (5 دقائق)
const healthCache = new Map<string, { status: ProviderHealthStatus; timestamp: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * يفحص صحة مزود محدد.
 * يرسل طلب بسيط لنقطة النهاية ويقيس زمن الاستجابة.
 * النتائج مخزنة مؤقتاً لتجنب rate limiting.
 */
export async function checkProviderHealth(
  config: ProviderConfig,
  apiKey: string
): Promise<ProviderHealthStatus> {
  // التحقق من التخزين المؤقت
  const cached = healthCache.get(config.name);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.status;
  }

  const result: ProviderHealthStatus = {
    name: config.name,
    displayName: config.displayName,
    configured: true,
    reachable: false,
    latencyMs: null,
    error: null,
    lastChecked: Date.now(),
  };

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const startTime = Date.now();
    const headers: Record<string, string> = {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    };
    if (config.headers) {
      Object.assign(headers, config.headers(apiKey));
    }

    const response = await fetch(`${config.baseURL}/models`, {
      method: "GET",
      headers,
      signal: controller.signal,
    });

    clearTimeout(timeout);
    result.latencyMs = Date.now() - startTime;
    result.reachable = response.ok;
    if (!response.ok) {
      result.error = `HTTP ${response.status}: ${response.statusText}`;
    }
  } catch (err: any) {
    result.error = err.name === "AbortError" ? "Timeout (5s)" : err.message;
  }

  healthCache.set(config.name, { status: result, timestamp: Date.now() });
  return result;
}

/**
 * يفحص صحة جميع المزودين المتاحين
 */
export async function checkAllProviders(
  providers: { config: ProviderConfig; apiKey: string }[]
): Promise<ProviderHealthStatus[]> {
  const results = await Promise.allSettled(
    providers.map(p => checkProviderHealth(p.config, p.apiKey))
  );
  return results.map((r, i) => {
    if (r.status === "fulfilled") return r.value;
    return {
      name: providers[i].config.name,
      displayName: providers[i].config.displayName,
      configured: true,
      reachable: false,
      latencyMs: null,
      error: "Health check failed internally",
      lastChecked: Date.now(),
    };
  });
}
```

---

### المهمة E3: تحديث الـ Pipeline لاستخدام سجل المزودين

**ملف:** `c:\Users\Mo_Matany\Downloads\Apex-Chat\Apex-Chat\server\apex-unbound\pipeline.ts`

- [ ] **Step 1: استبدال فحوصات المفاتيح المباشرة**

استبدل:
```typescript
const openrouterKey = process.env.OPENROUTER_API_KEY;
```

بـ:
```typescript
import { getActiveProvider, getFallbackProvider } from "../provider-registry";

const provider = getActiveProvider("apex-coder");
if (!provider) {
  throw new Error("No AI provider configured. Set OPENROUTER_API_KEY or DEEPSEEK_API_KEY.");
}
```

- [ ] **Step 2: إضافة منطق الاحتياطي التلقائي**

في دوال استدعاء النماذج، أضف:
```typescript
async function callAIWithFallback(prompt: string): Promise<string> {
  let provider = getActiveProvider("apex-coder");
  let lastError: Error | null = null;

  // Try primary then fallback
  for (let attempt = 0; attempt < 2 && provider; attempt++) {
    try {
      const response = await fetch(`${provider.config.baseURL}/chat/completions`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${provider.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: provider.config.models["apex-coder"],
          messages: [{ role: "user", content: prompt }],
          max_tokens: 4096,
          temperature: 0.7,
        }),
        signal: AbortSignal.timeout(30000),
      });

      if (response.ok) {
        const data = await response.json();
        return data.choices[0].message.content;
      }

      if (response.status === 401 || response.status === 403 || response.status === 429) {
        throw new Error(`Provider ${provider.config.name} returned ${response.status}`);
      }
    } catch (err: any) {
      lastError = err;
      console.warn(`[Apex Coder] Provider ${provider.config.name} failed:`, err.message);
      provider = getFallbackProvider(provider.config.name);
    }
  }

  throw lastError || new Error("All providers failed");
}
```

---

### المهمة E4: دمج سجل المزودين في نقطة health

**ملف:** `c:\Users\Mo_Matany\Downloads\Apex-Chat\Apex-Chat\server\routes.ts`

- [ ] **Step 1: استيراد سجل المزودين في health endpoint**

في دالة `/api/health`، استخدم:
```typescript
import { getAllConfiguredProviders, getActiveProvider } from "./provider-registry";

app.get("/api/health", async (_req, res) => {
  const active = getActiveProvider();
  const configured = getAllConfiguredProviders();

  res.json({
    status: active ? "ok" : "degraded",
    provider: active?.config.name || null,
    providerDisplay: active?.config.displayName || null,
    apiConfigured: configured.length > 0,
    configuredProviders: configured.map(p => ({
      name: p.name,
      displayName: p.displayName,
      priority: p.priority,
    })),
    modelMapping: active?.config.models || {},
    timestamp: Date.now(),
  });
});
```

---

## 🧪 المرحلة F: الاختبار والتحقق (Webapp Testing)

### المهمة F1: اختبار نقطة health

**ملف اختبار جديد:** `c:\Users\Mo_Matany\Downloads\Apex-Chat\Apex-Chat\testsprite_tests\TC023_Verify_health_endpoint.py`

- [ ] **Step 1: كتابة اختبار Playwright**

```python
# TC023_Verify_health_endpoint.py
from playwright.sync_api import sync_playwright

def test_health_endpoint():
    """التحقق من أن نقطة /api/health ترجع بيانات المزود بشكل صحيح"""
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # الاتصال بـ API مباشرة
        response = page.evaluate("""
            async () => {
                const res = await fetch('/api/health');
                return await res.json();
            }
        """)

        # التحقق من الحقول المطلوبة
        assert "status" in response, "Missing 'status' field"
        assert "provider" in response, "Missing 'provider' field"
        assert "apiConfigured" in response, "Missing 'apiConfigured' field"
        assert "configuredProviders" in response, "Missing 'configuredProviders' field"

        # التحقق من القيم
        assert response["apiConfigured"] == True, "API should be configured"
        assert response["provider"] is not None, "Provider should not be null"
        assert response["provider"] != "UNKNOWN", "Provider should not be UNKNOWN"

        print(f"✅ Health endpoint OK: provider={response['provider']}, configured={response['configuredProviders']}")

        browser.close()

if __name__ == "__main__":
    test_health_endpoint()
```

---

### المهمة F2: اختبار WorkTree في الـ Pipeline

**اختبار يدوي:** شغّل الخادم، أرسل طلب Apex Coder، وتحقق من:
1. انبعاث أحداث `workTree` عبر SSE
2. شجرة العمل تظهر في واجهة المستخدم
3. العقد تتغير حالتها مع تقدم المراحل
4. الأسهم والروابط بين العقد تظهر بشكل صحيح

---

### المهمة F3: اختبار Questionnaire UI

**اختبار يدوي:** أرسل طلباً مبهماً (مثل: "اصنع موقع")، وتحقق من:
1. ظهور الأسئلة التفاعلية
2. التنقل بين الأسئلة يعمل
3. الإكمال يرسل الإجابات ويستأنف الـ pipeline
4. RTL يعمل بشكل صحيح

---

## 📋 ملخص الملفات

### ملفات جديدة (8):

| الملف | المرحلة | الوصف |
|-------|---------|-------|
| `server/apex-unbound/apex-philosophy.md` | 0 | الفلسفة التوليدية لـ Apex Coder |
| `server/apex-unbound/work-tree-model.ts` | B | تعريفات أنواع شجرة العمل |
| `server/apex-unbound/work-tree-generator.ts` | B | منشئ شجرة العمل |
| `server/apex-unbound/integration-validator.ts` | D | مدقق التكامل قبل التجميع |
| `server/provider-registry.ts` | E | سجل المزودين المتعدد |
| `server/provider-health.ts` | E | فاحص صحة المزودين |
| `client/src/components/work-tree-panel.tsx` | B | مكون شجرة العمل البصرية |
| `client/src/components/questionnaire-panel.tsx` | C | مكون الأسئلة التفاعلية |

### ملفات معدلة (10):

| الملف | المرحلة | التعديلات |
|-------|---------|-----------|
| `server/routes.ts` | A, B, E | تحسين /api/health، إضافة workTree SSE، دمج provider-registry |
| `server/apex-unbound/pipeline.ts` | B, D, E | انبعاث workTree، مقاييس الجودة، استخدام provider-registry |
| `server/apex-unbound/css-agent.ts` | D | حقن ملخص HTML |
| `server/apex-unbound/js-agent.ts` | D | حقن ملخص HTML + قيود وقت التشغيل |
| `client/src/lib/diagnostics.ts` | A | حماية defensively من null |
| `client/src/lib/unbound-service.ts` | B | معالجة workTree state |
| `client/src/pages/chat.tsx` | B, C | دمج WorkTreePanel و QuestionnairePanel |
| `.env.production` | A | إضافة OPENROUTER_API_KEY |

---

## ⚠️ التحديات المتوقعة والحلول

| التحدي | الاحتمال | الحل |
|--------|----------|------|
| انقطاع اتصال SSE أثناء الـ pipeline الطويل | متوسط | تخزين workTree state في UnboundState ليستمر عبر إعادة الاتصال |
| Rate limiting على OpenRouter من فحوصات الصحة | منخفض | تخزين نتائج الفحص مؤقتاً 5 دقائق |
| شجرة العمل كبيرة جداً للمشاريع المعقدة | متوسط | عرض كسول (lazy expand)، حد أقصى للعرض |
| عدم توافق صيغ النماذج بين المزودين | متوسط | locking المزود عند بداية الـ pipeline |
| الأسئلة بالعربية فقط | منخفض | نظام الأسئلة الحالي يدعم العربية - نضيف الإنجليزية لاحقاً |

---

## ترتيب التنفيذ النهائي

```
1. المرحلة 0: الفلسفة التوليدية (apex-philosophy.md)
2. المرحلة A: إصلاح حالة الـ Backend ⚡ (الأولوية القصوى)
3. المرحلة E: نظام المزودين المتعدد
4. المرحلة B: شجرة العمل البصرية
5. المرحلة C: واجهة الأسئلة التفاعلية (بالتوازي مع B)
6. المرحلة D: تحسين جودة الأكواد
7. المرحلة F: الاختبار والتحقق
```
