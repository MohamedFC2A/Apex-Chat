# خطة شاملة: جعل Apex-Chat يتحمل تحديث الصفحة وإغلاق التبويب

> **للمنفذ:** اتبع هذه الخطة خطوة بخطوة. كل مهمة تحتوي على الملفات المستهدفة والكود الدقيق والتغييرات المطلوبة.

**الهدف:** جعل توليد الذكاء الاصطناعي يستمر بشكل طبيعي بعد تحديث الصفحة أو إغلاق التبويب وإعادة فتحه، دون فقدان أي بيانات، ودون أي تأثير سلبي على واجهة المستخدم.

**المعمارية:** تخزين مزدوج (localStorage للبيانات الدائمة + sessionStorage للبيانات المؤقتة)، استئناف تلقائي للاتصال بـ SSE بعد التحديث، حفظ تدريجي للمحتوى المتدفق، تحذير beforeunload، وتزامن بين التبويبات عبر BroadcastChannel.

**التقنيات:** React, Zustand (persist middleware), SSE/EventSource API, sessionStorage/localStorage, BroadcastChannel API, Express.js

---

## تحليل المشكلة الحالية

بعد فحص الكود في الملفات التالية:
- `client/src/lib/store.ts` — مخزن Zustand مع `persist` middleware
- `client/src/pages/chat.tsx` — صفحة المحادثة مع منطق الاستئناف
- `server/routes.ts` — مسارات API مع `ActiveGeneration` Map
- `client/src/lib/ai-client.ts` — عميل AI مع SSE streaming
- `client/src/lib/auth-provider.tsx` — مزود المصادقة مع استعادة الجلسة

تم تحديد المشاكل التالية:

| # | المشكلة | الملف | السبب |
|---|---|---|---|
| 1 | `activeGenerationId` يفقد بعد التحديث | `store.ts:345-353` | غير مضمن في `partialize` |
| 2 | `isGenerating` يفقد بعد التحديث | `store.ts:345-353` | غير مضمن في `partialize` |
| 3 | `streamingContentMap` يفقد بعد التحديث | `store.ts:345-353` | غير مضمن في `partialize` |
| 4 | `streamingReasoningMap` يفقد بعد التحديث | `store.ts:345-353` | غير مضمن في `partialize` |
| 5 | لا يوجد تحذير `beforeunload` | `chat.tsx` | غير مطبق |
| 6 | `isGenerating=false` بعد التحديث يمنع منطق الاستئناف من العمل | `chat.tsx:482` | الشرط `!isGenerating` لا يتحقق |
| 7 | المحتوى المتدفق المرئي يختفي تماما بعد التحديث | `chat.tsx` | لا يوجد حفظ تدريجي |

**الحالة المرغوبة:**
- عند تحديث الصفحة (F5/Refresh) أثناء جيل AI نشط:
  1. يظهر تحذير `beforeunload` يسأل المستخدم إذا كان متأكدا
  2. بعد التحديث، يستأنف الجيل تلقائيا من حيث توقف
  3. المحتوى المتدفق السابق يُستعاد ويعرض فورا
  4. واجهة المستخدم تظهر حالة "قيد التوليد" بشكل صحيح
  5. زر الإيقاف يظهر ويعمل بشكل صحيح

---

## الخريطة الطوبولوجية المعمارية

```
┌──────────────────────────────────────────────────────────────────┐
│                   طبقة العرض (Presentation)                       │
│  chat.tsx                                                        │
│   ├── useEffect [resume detection]  ← استئناف الجيل              │
│   ├── useEffect [beforeunload]      ← تحذير قبل المغادرة         │
│   ├── useEffect [BroadcastChannel]  ← تزامن التبويبات            │
│   └── handleSendMessage             ← حفظ تدريجي أثناء التدفق    │
├──────────────────────────────────────────────────────────────────┤
│                   طبقة الحالة (State)                             │
│  store.ts (Zustand + hybridStorage)                              │
│   ├── localStorage  (دائم)   ← المحادثات، الإعدادات              │
│   └── sessionStorage (مؤقت) ← activeGenerationId، streamingMaps  │
│                   طبقة الخدمات (Services)                         │
│  generation-session.ts  ← حفظ/استعادة الحالة المؤقتة             │
│  broadcast-sync.ts      ← تزامن التبويبات                        │
├──────────────────────────────────────────────────────────────────┤
│                   طبقة الشبكة (Network)                           │
│  ai-client.ts                                                    │
│   ├── POST /api/chat (SSE)                                       │
│   └── GET /api/chat/stream/:messageId (استئناف)                  │
├──────────────────────────────────────────────────────────────────┤
│                   طبقة الخادم (Server)                            │
│  routes.ts                                                       │
│   ├── POST /api/chat              ← بدء الجيل                    │
│   ├── GET /api/chat/stream/:id    ← استئناف الجيل                │
│   ├── POST /api/chat/stop/:id     ← إيقاف الجيل                  │
│   ├── GET /api/chat/status/:id    ← استعلام الحالة               │
│   └── ActiveGeneration Map        ← ذاكرة الخادم                 │
└──────────────────────────────────────────────────────────────────┘
```

**التدفق بعد التحديث:**
```
[تحديث الصفحة]
  ↓
[AuthProvider يتحقق من الجلسة]
  ↓
[Zustand persist يستعيد الحالة من hybridStorage]
  ↓ (activeGenerationId مستعاد من sessionStorage)
  ↓ (isGenerating = true مستعاد من sessionStorage)
  ↓
[ChatPage mount → useEffect resume detection]
  ↓ (يتحقق: activeGenerationId موجود؟ isGenerating=true؟)
  ↓
[GET /api/chat/status/:messageId] ← يتأكد أن الجيل ما زال نشطا
  ↓
[يستعيد streamingContent من sessionStorage]
  ↓
[EventSource → GET /api/chat/stream/:messageId]
  ↓
[الخادم يعيد القطع المتراكمة + القطع الجديدة]
  ↓
[UI يستمر في عرض التدفق بشكل طبيعي]
```

---

## خطة التنفيذ

### المهمة 1: إنشاء ملف `generation-session.ts` (محول التخزين المزدوج + الحفظ التدريجي)

**الملفات:**
- **إنشاء:** `client/src/lib/generation-session.ts`

**الكود الكامل للملف الجديد:**

```typescript
/**
 * GENERATION SESSION MANAGER
 * 
 * يدير حالة الجيل المؤقتة عبر sessionStorage للبقاء بعد تحديث الصفحة.
 * يستخدم محول تخزين مزدوج (hybridStorage) للعمل مع zustand/persist.
 * 
 * localStorage  → البيانات الدائمة (المحادثات، الإعدادات)
 * sessionStorage → البيانات المؤقتة (حالة الجيل الجاري)
 */

// المفاتيح التي تذهب إلى sessionStorage (تختفي عند إغلاق التبويب)
const TRANSIENT_KEYS = [
  'activeGenerationId',
  'isGenerating',
  'streamingContentMap',
  'streamingReasoningMap',
  'activeQuizProgress',
  'activePdfProgress',
] as const;

export interface SessionState {
  activeGenerationId: string | null;
  isGenerating: boolean;
  streamingContent: Record<string, string>;
  streamingReasoning: Record<string, string>;
  savedAt: number;
}

// ─── محول التخزين المزدوج (متوافق مع zustand/persist) ───

export const hybridStorage = {
  getItem: (name: string): string | null => {
    try {
      const localRaw = localStorage.getItem(name);
      const sessionRaw = sessionStorage.getItem(name);

      const localState = localRaw ? JSON.parse(localRaw) : {};
      const sessionState = sessionRaw ? JSON.parse(sessionRaw) : {};

      // sessionStorage (مؤقت) له الأولوية على localStorage (دائم)
      return JSON.stringify({ ...localState, ...sessionState });
    } catch (error) {
      console.error('[HybridStorage] getItem failed:', error);
      return null;
    }
  },

  setItem: (name: string, value: string): void => {
    try {
      const fullState = JSON.parse(value);
      const localState: Record<string, unknown> = {};
      const sessionState: Record<string, unknown> = {};

      for (const [key, val] of Object.entries(fullState)) {
        if (TRANSIENT_KEYS.includes(key as any)) {
          sessionState[key] = val;
        } else {
          localState[key] = val;
        }
      }

      localStorage.setItem(name, JSON.stringify(localState));
      sessionStorage.setItem(name, JSON.stringify(sessionState));
    } catch (error) {
      console.error('[HybridStorage] setItem failed:', error);
    }
  },

  removeItem: (name: string): void => {
    try {
      localStorage.removeItem(name);
      sessionStorage.removeItem(name);
    } catch (error) {
      console.error('[HybridStorage] removeItem failed:', error);
    }
  },
};

// ─── الحفظ التدريجي أثناء التدفق ───

let saveTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * يحفظ حالة الجيل الحالية في sessionStorage كل 500ms.
 * يستخدم هذا بالإضافة إلى zustand/persist لأن persist غير متزامن
 * وقد لا يكتمل قبل beforeunload.
 */
export function throttledSaveGenerationState(
  convId: string,
  content: string,
  reasoning: string,
  generationId: string,
): void {
  if (saveTimer) return;

  saveTimer = setTimeout(() => {
    try {
      const sessionData: SessionState = {
        activeGenerationId: generationId,
        isGenerating: true,
        streamingContent: { [convId]: content },
        streamingReasoning: { [convId]: reasoning },
        savedAt: Date.now(),
      };
      sessionStorage.setItem('apexchat-generation-live', JSON.stringify(sessionData));
    } catch (error) {
      console.warn('[GenerationSession] Failed to save live state:', error);
    } finally {
      saveTimer = null;
    }
  }, 500);
}

/**
 * ينظف حالة الجيل المؤقتة من sessionStorage.
 * يُستدعى عند اكتمال الجيل أو إلغائه.
 */
export function clearGenerationState(): void {
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
  try {
    sessionStorage.removeItem('apexchat-generation-live');
  } catch (_) {
    // fail silently
  }
}

/**
 * يسترجع حالة الجيل المحفوظة من sessionStorage.
 * تُستخدم عند تحميل الصفحة لاستعادة المحتوى المتدفق السابق.
 */
export function getSavedGenerationState(): SessionState | null {
  try {
    const raw = sessionStorage.getItem('apexchat-generation-live');
    if (!raw) return null;

    const parsed: SessionState = JSON.parse(raw);

    // نتجاهل الحالة إذا كانت أقدم من 30 دقيقة (منتهية الصلاحية)
    if (Date.now() - parsed.savedAt > 30 * 60 * 1000) {
      sessionStorage.removeItem('apexchat-generation-live');
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}
```

---

### المهمة 2: إنشاء ملف `broadcast-sync.ts` (تزامن التبويبات)

**الملفات:**
- **إنشاء:** `client/src/lib/broadcast-sync.ts`

**الكود الكامل للملف الجديد:**

```typescript
/**
 * BROADCAST SYNC
 * 
 * مزامنة حالة الجيل بين التبويبات المختلفة لنفس التطبيق.
 * يمنع محاولة استئناف الجيل من تبويبين في نفس الوقت.
 */

type GenerationBroadcastMessage =
  | { type: 'GENERATION_STARTED'; tabId: string; generationId: string; conversationId: string }
  | { type: 'GENERATION_ENDED'; tabId: string; generationId: string }
  | { type: 'TAB_CLAIM_RESUME'; tabId: string; generationId: string };

const CHANNEL_NAME = 'apex-generation-sync';
const TAB_ID = crypto.randomUUID();

let channel: BroadcastChannel | null = null;

export function initBroadcastSync(
  onExternalGenerationStarted: (generationId: string, conversationId: string) => void,
  onExternalGenerationEnded: (generationId: string) => void,
): () => void {
  try {
    channel = new BroadcastChannel(CHANNEL_NAME);

    channel.onmessage = (event: MessageEvent<GenerationBroadcastMessage>) => {
      const msg = event.data;

      // تجاهل رسائلنا الخاصة
      if (msg.tabId === TAB_ID) return;

      switch (msg.type) {
        case 'GENERATION_STARTED':
          onExternalGenerationStarted(msg.generationId, msg.conversationId);
          break;
        case 'GENERATION_ENDED':
          onExternalGenerationEnded(msg.generationId);
          break;
        case 'TAB_CLAIM_RESUME':
          // تبويب آخر يدعي استئناف الجيل — لا حاجة لإجراء (يُستخدم للمنع)
          break;
      }
    };

    // إعلام التبويبات الأخرى بأن هذا التبويب جاهز
    channel.postMessage({
      type: 'TAB_CLAIM_RESUME',
      tabId: TAB_ID,
      generationId: '',
    });

    return () => {
      channel?.close();
      channel = null;
    };
  } catch {
    // BroadcastChannel غير مدعوم في هذا المتصفح — تجاهل بصمت
    return () => {};
  }
}

export function broadcastGenerationStarted(generationId: string, conversationId: string): void {
  try {
    channel?.postMessage({
      type: 'GENERATION_STARTED',
      tabId: TAB_ID,
      generationId,
      conversationId,
    });
  } catch (_) {
    // fail silently
  }
}

export function broadcastGenerationEnded(generationId: string): void {
  try {
    channel?.postMessage({
      type: 'GENERATION_ENDED',
      tabId: TAB_ID,
      generationId,
    });
  } catch (_) {
    // fail silently
  }
}
```

---

### المهمة 3: تعديل `store.ts` (تفعيل التخزين المزدوج)

**الملفات:**
- **تعديل:** `client/src/lib/store.ts`

**التغييرات المطلوبة (3 تعديلات):**

#### التعديل 3.1: إضافة import في أعلى الملف

```typescript
// أضف هذا السطر بعد imports الموجودة:
import { hybridStorage } from "./generation-session";
```

الموقع: بعد السطر `import { debouncedSaveConversation, ... } from "./cloud-sync";`

#### التعديل 3.2: تحديث `partialize` في persist config

**استبدل:**
```typescript
      partialize: (state) => ({
        selectedModel: state.selectedModel,
        serviceMode: state.serviceMode,
        reasoningLevel: state.reasoningLevel,
        conversations: state.conversations,
        activeConversationId: state.activeConversationId,
        messages: state.messages,
        omniStates: state.omniStates
      }),
```

**بـ:**
```typescript
      partialize: (state) => ({
        // الحقول الدائمة (localStorage)
        selectedModel: state.selectedModel,
        serviceMode: state.serviceMode,
        reasoningLevel: state.reasoningLevel,
        conversations: state.conversations,
        activeConversationId: state.activeConversationId,
        messages: state.messages,
        omniStates: state.omniStates,
        // الحقول المؤقتة (sessionStorage) — ضرورية لاستئناف الجيل بعد التحديث
        activeGenerationId: state.activeGenerationId,
        isGenerating: state.isGenerating,
        streamingContentMap: state.streamingContentMap,
        streamingReasoningMap: state.streamingReasoningMap,
        activeQuizProgress: state.activeQuizProgress,
        activePdfProgress: state.activePdfProgress,
      }),
```

#### التعديل 3.3: إضافة `storage` في persist config

**استبدل:**
```typescript
    {
      name: "apexchat-storage",
      partialize: (state) => ({...}),
    }
```

**بـ:**
```typescript
    {
      name: "apexchat-storage",
      storage: createJSONStorage(() => hybridStorage),
      partialize: (state) => ({...}),
    }
```

**ملاحظة:** تأكد من أن `createJSONStorage` مستورد من `zustand/middleware`. تحقق من سطر الاستيراد الحالي في الملف — إذا كان `import { create } from "zustand"; import { persist } from "zustand/middleware";`، أضف `createJSONStorage` إلى import `zustand/middleware`:

```typescript
import { persist, createJSONStorage } from "zustand/middleware";
```

---

### المهمة 4: تعديل `chat.tsx` (الاستئناف + beforeunload + الحفظ التدريجي + BroadcastChannel)

**الملفات:**
- **تعديل:** `client/src/pages/chat.tsx`

#### التعديل 4.1: إضافة imports جديدة

أضف هذه imports في أعلى الملف:

```typescript
import { throttledSaveGenerationState, clearGenerationState, getSavedGenerationState } from "@/lib/generation-session";
import { initBroadcastSync, broadcastGenerationStarted, broadcastGenerationEnded } from "@/lib/broadcast-sync";
```

#### التعديل 4.2: إضافة ref جديد `resumeInProgressRef`

أضف بعد `const isHandlingMessageRef = useRef<boolean>(false);` (السطر 88):

```typescript
  // يمنع محاولة الاستئناف أكثر من مرة بعد التحديث
  const resumeInProgressRef = useRef<boolean>(false);
```

#### التعديل 4.3: إضافة حفظ تدريجي داخل `handleSendMessage`

في `handleSendMessage`، داخل كل `onChunk` callback (هناك عدة مواقع — للـ standard model, apex-coder fallback, إلخ)، أضف بعد `setStreamingContentForConv` و `setStreamingReasoningForConv`:

```typescript
              // حفظ تدريجي للاستعادة بعد تحديث الصفحة
              throttledSaveGenerationState(thisConvId, chunkText, chunkReasoning, assistantMsgId);
```

أضف هذا في كل callback يستدعي `setStreamingContentForConv`. هذا يشمل:
- `sendAIMessage` callback في standard flow (السطر ~371)
- `sendAIMessage` callback في apex-coder fallback (السطر ~332)
- أي مكان آخر يستدعي `setStreamingContentForConv`

#### التعديل 4.4: إضافة تنظيف الحالة المؤقتة في finally و catch

في `finally` block (قبل `isHandlingMessageRef.current = false;`، السطر ~460):

```typescript
        clearGenerationState();
```

في `catch` block (بعد `setIsGenerating(false);`، السطر ~423):

```typescript
        clearGenerationState();
```

#### التعديل 4.5: إضافة beforeunload useEffect

أضف useEffect جديد بعد الـ useEffects الموجودة (قبل `handleStopGenerating` مثلا):

```typescript
  // قبل إغلاق/تحديث الصفحة: تحذير إذا كان الجيل نشطا + حفظ أخير للحالة
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      const { isGenerating, activeGenerationId, streamingContentMap, streamingReasoningMap } = useChatStore.getState();
      if (isGenerating && activeGenerationId) {
        // حفظ أخير للحالة قبل المغادرة
        try {
          const data = {
            activeGenerationId,
            isGenerating: true,
            streamingContent: streamingContentMap,
            streamingReasoning: streamingReasoningMap,
            savedAt: Date.now(),
          };
          sessionStorage.setItem('apexchat-generation-live', JSON.stringify(data));
        } catch (_) {
          // fail silently
        }

        e.preventDefault();
        // Chrome 119+ يتطلب preventDefault فقط (يتجاهل returnValue)
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);
```

#### التعديل 4.6: إضافة BroadcastChannel useEffect

أضف useEffect جديد:

```typescript
  // تزامن التبويبات: منع استئناف مزدوج للجيل
  useEffect(() => {
    const cleanup = initBroadcastSync(
      (genId) => {
        // تبويب آخر بدأ جيلا — إذا كنا نحاول استئناف نفس الجيل، توقف
        const store = useChatStore.getState();
        if (store.activeGenerationId === genId && resumeInProgressRef.current) {
          console.log('[Broadcast] Another tab claimed resume, yielding');
          resumeInProgressRef.current = false;
          store.setActiveGenerationId(null);
          store.setIsGenerating(false);
          clearGenerationState();
        }
      },
      (genId) => {
        // جيل انتهى في تبويب آخر — لا حاجة لإجراء محدد
        console.log('[Broadcast] Generation ended in another tab:', genId);
      }
    );

    return cleanup;
  }, []);
```

#### التعديل 4.7: تحسين useEffect الموجود للاستئناف

**استبدل useEffect الموجود بالكامل (الأسطر 477-631) بالنسخة المحسنة:**

```typescript
  // استئناف الجيل بعد تحديث الصفحة
  useEffect(() => {
    const store = useChatStore.getState();
    const activeGenId = store.activeGenerationId;
    const activeConvId = store.activeConversationId;

    // لا تحاول الاستئناف إذا:
    // - لا يوجد جيل نشط
    // - أو قمنا بالاستئناف بالفعل
    // - أو المستخدم أوقف الجيل يدويا
    if (!activeGenId || !activeConvId) return;
    if (resumeInProgressRef.current) return;
    if (wasStoppedByUserRef.current) {
      // تنظيف إذا كان المستخدم أوقف الجيل قبل التحديث
      store.setActiveGenerationId(null);
      store.setIsGenerating(false);
      clearGenerationState();
      return;
    }

    resumeInProgressRef.current = true;

    console.log(`[Resume] Attempting to resume generation ${activeGenId} for conversation ${activeConvId}`);

    const conversation = store.conversations.find(c => c.id === activeConvId);
    if (!conversation) {
      store.setActiveGenerationId(null);
      store.setIsGenerating(false);
      clearGenerationState();
      resumeInProgressRef.current = false;
      return;
    }

    // استعادة المحتوى المتدفق السابق من sessionStorage (للحفظ التدريجي)
    const savedState = getSavedGenerationState();
    if (savedState && savedState.activeGenerationId === activeGenId) {
      const content = savedState.streamingContent[activeConvId];
      const reasoning = savedState.streamingReasoning[activeConvId];
      if (content) setStreamingContentForConv(activeConvId, content);
      if (reasoning) setStreamingReasoningForConv(activeConvId, reasoning);
      console.log('[Resume] Restored saved streaming content');
    }

    // التحقق من أن الجيل لا يزال نشطا على الخادم
    fetch(`/api/chat/status/${activeGenId}`)
      .then(r => r.json())
      .then((data: { status: string; content?: string; reasoningContent?: string }) => {
        if (data.status === 'generating' || data.status === 'completed') {
          // الجيل موجود على الخادم — ابدأ الاستئناف
          setIsGenerating(true);
          broadcastGenerationStarted(activeGenId, activeConvId);

          const lastMsg = conversation.messages.find(m => m.id === activeGenId);
          const model = lastMsg?.model || selectedModel;

          if (model === "apex-omni") {
            // منطق استئناف Omni (موجود حاليا — لا تغيير)
            const userMsgIdx = conversation.messages.findIndex(m => m.id === activeGenId) - 1;
            const userMsg = userMsgIdx >= 0 ? conversation.messages[userMsgIdx] : null;
            if (userMsg) {
              const queryText = userMsg.contextContent || userMsg.content;
              const existingOmniState = omniStates[activeConvId] || null;

              if (abortControllerRef.current) {
                abortControllerRef.current.abort();
              }
              const controller = new AbortController();
              abortControllerRef.current = controller;

              (async () => {
                try {
                  const compactHistory = buildCompactConversationHistory(conversation.messages.slice(0, userMsgIdx));
                  const response = await processOmniRequest(
                    queryText,
                    (state) => {
                      if (controller.signal.aborted) return;
                      setOmniStateForConv(activeConvId, state);
                      const currentMsg = useChatStore.getState().conversations
                        .find(c => c.id === activeConvId)?.messages
                        .find(m => m.id === activeGenId);

                      const updatedMsg: Message = {
                        id: activeGenId,
                        role: "assistant",
                        content: state.finalResponse || currentMsg?.content || "",
                        reasoningContent: currentMsg?.reasoningContent || "",
                        model: "apex-omni",
                        timestamp: currentMsg?.timestamp || Date.now(),
                      };
                      addMessage(activeConvId, updatedMsg);
                    },
                    compactHistory,
                    existingOmniState,
                    controller.signal
                  );

                  if (!controller.signal.aborted) {
                    setOmniStateForConv(activeConvId, {
                      ...existingOmniState,
                      step: "complete",
                      finalResponse: response.content,
                    });

                    const finalMsg: Message = {
                      id: activeGenId,
                      role: "assistant",
                      content: response.content,
                      model: "apex-omni",
                      timestamp: Date.now()
                    };
                    addMessage(activeConvId, finalMsg);
                  }
                } catch (err: any) {
                  if (err.message !== "Aborted") {
                    console.error("[Resume] Omni resume failed:", err);
                  }
                } finally {
                  if (abortControllerRef.current === controller) {
                    abortControllerRef.current = null;
                  }
                  setIsGenerating(false);
                  store.setActiveGenerationId(null);
                  clearGenerationState();
                  broadcastGenerationEnded(activeGenId);
                  resumeInProgressRef.current = false;
                }
              })();
            } else {
              setIsGenerating(false);
              store.setActiveGenerationId(null);
              clearGenerationState();
              resumeInProgressRef.current = false;
            }
          } else {
            // Standard model resume via EventSource
            setStreamingContentForConv(activeConvId, "");
            setStreamingReasoningForConv(activeConvId, "");

            if (activeEventSourceRef.current) {
              activeEventSourceRef.current.close();
            }

            if (data.status === 'completed') {
              // الجيل اكتمل على الخادم — استخدم content مباشرة
              setIsGenerating(false);
              store.setActiveGenerationId(null);
              clearGenerationState();
              broadcastGenerationEnded(activeGenId);

              // أضف الرسالة النهائية إذا كانت موجودة على الخادم
              if (data.content) {
                const finalMsg: Message = {
                  id: activeGenId,
                  role: "assistant",
                  content: data.content,
                  reasoningContent: data.reasoningContent || "",
                  model: lastMsg?.model || selectedModel,
                  timestamp: Date.now(),
                };
                addMessage(activeConvId, finalMsg);
              }
              resumeInProgressRef.current = false;
              return;
            }

            // الجيل ما زال نشطا — اتصل بـ SSE للاستئناف
            const eventSource = new EventSource(`/api/chat/stream/${activeGenId}`);
            activeEventSourceRef.current = eventSource;

            eventSource.onmessage = (event) => {
              if (event.data === "[DONE]") {
                eventSource.close();
                if (activeEventSourceRef.current === eventSource) {
                  activeEventSourceRef.current = null;
                }
                setIsGenerating(false);
                store.setActiveGenerationId(null);
                clearGenerationState();
                broadcastGenerationEnded(activeGenId);
                resumeInProgressRef.current = false;

                // بناء وإدراج الرسالة النهائية
                const currentConv = useChatStore.getState().conversations.find(c => c.id === activeConvId);
                const currentMsg = currentConv?.messages.find(m => m.id === activeGenId);
                const finalMsg: Message = {
                  id: activeGenId,
                  role: "assistant",
                  content: currentMsg?.content || "",
                  reasoningContent: currentMsg?.reasoningContent || "",
                  model: currentMsg?.model || selectedModel,
                  timestamp: Date.now()
                };
                addMessage(activeConvId, finalMsg);
                return;
              }

              try {
                const chunk = JSON.parse(event.data);
                if (chunk.error) {
                  console.error("Server stream returned error:", chunk.error);
                  eventSource.close();
                  if (activeEventSourceRef.current === eventSource) {
                    activeEventSourceRef.current = null;
                  }
                  setIsGenerating(false);
                  store.setActiveGenerationId(null);
                  clearGenerationState();
                  broadcastGenerationEnded(activeGenId);
                  resumeInProgressRef.current = false;
                  setLastError(chunk.error);
                  return;
                }

                setStreamingContentForConv(activeConvId, prev => chunk.content ? prev + chunk.content : prev);
                setStreamingReasoningForConv(activeConvId, prev => chunk.reasoningContent ? prev + chunk.reasoningContent : prev);
              } catch (_) {
                // تجاهل أخطاء JSON في القطع الجزئية
              }
            };

            eventSource.onerror = (err) => {
              console.warn("EventSource connection error, retrying...", err);
            };
          }
        } else {
          // الجيل غير موجود على الخادم (status === 'not_found') — تنظيف
          console.log('[Resume] Generation not found on server, cleaning up');
          store.setActiveGenerationId(null);
          store.setIsGenerating(false);
          clearGenerationState();
          resumeInProgressRef.current = false;
        }
      })
      .catch(() => {
        // فشل الاتصال بالخادم — تنظيف
        store.setActiveGenerationId(null);
        store.setIsGenerating(false);
        clearGenerationState();
        resumeInProgressRef.current = false;
      });
  }, [activeConversationId]);
```

#### التعديل 4.8: إضافة تنظيف في handleStopGenerating

في `handleStopGenerating`، بعد `setTimeout(() => { wasStoppedByUserRef.current = false; }, 500);` (السطر ~656):

```typescript
    clearGenerationState();
    if (activeId) {
      broadcastGenerationEnded(activeId);
    }
```

#### التعديل 4.9: إضافة broadcast في بداية handleSendMessage

بعد `setIsGenerating(true);` (السطر ~190):

```typescript
      broadcastGenerationStarted(assistantMsgId, thisConvId);
```

---

### المهمة 5: تحسينات الخادم (Server-Side Enhancements)

**الملفات:**
- **تعديل:** `server/routes.ts`

#### التعديل 5.1: إضافة `createdAt` إلى ActiveGeneration

في واجهة `ActiveGeneration` (السطر 31):

```typescript
interface ActiveGeneration {
  messageId: string;
  conversationId: string;
  content: string;
  reasoningContent: string;
  isComplete: boolean;
  error?: string;
  createdAt: number;  // ← أضف هذا
  chunks: Array<{...}>;
  listeners: Array<...>;
}
```

وعند إنشاء activeGen جديد (السطر 193):

```typescript
        activeGen = {
          messageId: activeMsgId,
          conversationId: activeConvId,
          content: "",
          reasoningContent: "",
          isComplete: false,
          createdAt: Date.now(),  // ← أضف هذا
          chunks: [],
          listeners: [],
        };
```

#### التعديل 5.2: إضافة تنظيف دوري للـ activeGenerations

أضف هذا الكود بعد `const activeGenerations = new Map<string, ActiveGeneration>();` (السطر 50):

```typescript
// تنظيف الأجيال المنتهية أقدم من 30 دقيقة لمنع تسرب الذاكرة
setInterval(() => {
  const now = Date.now();
  const TTL = 30 * 60 * 1000; // 30 دقيقة
  activeGenerations.forEach((gen, id) => {
    if (gen.isComplete && now - gen.createdAt > TTL) {
      activeGenerations.delete(id);
    }
  });
}, 5 * 60 * 1000); // كل 5 دقائق
```

---

### المهمة 6: التحقق والاختبار

**خطوات التحقق اليدوي:**

1. **اختبار تحديث الصفحة (F5):**
   - افتح Apex-Chat، أرسل رسالة لبدء جيل AI
   - أثناء التدفق، اضغط F5 لتحديث الصفحة
   - تأكد من ظهور تحذير beforeunload
   - بعد التحديث، تأكد من:
     - استئناف التدفق تلقائيا
     - ظهور المحتوى المتدفق السابق
     - استمرار التدفق بشكل طبيعي حتى الاكتمال
     - إضافة الرسالة النهائية للمحادثة

2. **اختبار إغلاق التبويب:**
   - أثناء جيل نشط، حاول إغلاق التبويب (Ctrl+W)
   - تأكد من ظهور تحذير beforeunload

3. **اختبار استئناف منتهي الصلاحية:**
   - انتظر حتى يكتمل الجيل
   - حدث الصفحة
   - تأكد من عدم وجود أي حالة عالقة (isGenerating = false)

4. **اختبار حالة عدم وجود الجيل على الخادم:**
   - أرسل رسالة، ثم أوقف الجيل يدويا
   - حدث الصفحة
   - تأكد من عدم محاولة الاستئناف

5. **اختبار تبويبين:**
   - افتح Apex-Chat في تبويبين
   - ابدأ جيلا في التبويب A
   - حدث التبويب B
   - تأكد من أن التبويب B لا يحاول استئناف الجيل

6. **اختبار الحفظ التدريجي:**
   - ابدأ جيلا طويلا
   - أثناء التدفق، تحقق من sessionStorage في DevTools
   - تأكد من وجود `apexchat-generation-live` بمحتوى متدفق محدث

---

## المخاطر والتخفيف

| المخاطرة | التخفيف |
|---|---|
| `beforeunload` لا يعمل على الهاتف | الحفظ التدريجي هو الطبقة الأساسية؛ beforeunload طبقة إضافية |
| `sessionStorage` ممتلئ | تغليف setItem بـ try/catch؛ النص المتدفق حجمه صغير |
| `BroadcastChannel` غير مدعوم | graceful degradation عبر try/catch في `initBroadcastSync` |
| سباق بين hydrate و resume | استخدام `resumeInProgressRef` وفحص الحالة قبل البدء |
| الخادم يفقد `ActiveGeneration` | `GET /api/chat/status` يتحقق قبل الاستئناف؛ graceful fallback |
| `zustand/persist` hydrate غير متزامن | استخدام `onFinishHydration` إذا لزم، لكن `useEffect` يعمل بعد render الأول |
