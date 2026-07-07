# خطة تحسين واجهة وتجربة المستخدم (UI/UX) — Apex-Chat

## المقدمة والملخص

تهدف هذه الخطة إلى تحويل تطبيق Apex-Chat إلى موقع احترافي موحد بتصميم فائق الجودة (Premium)، مع التركيز على تحسين قائمة عرض النماذج (Model Selector) وتوحيد نظام التصميم عبر كامل التطبيق. ستعتمد الخطة على أفضل الممارسات المستخلصة من تحليل منصات AI رائدة (ChatGPT، Claude، Perplexity).

---

## المرحلة 1: الأساس — توحيد نظام الـ Design Tokens

### 1.1 إنشاء `client/src/lib/tier-tokens.ts` (ملف جديد)

مركزية كل تعريفات الـ Tiers والـ Models لتجنب تكرار القيم عبر الملفات.

- نقل `TIERS` array و `MODEL_CARD_CONFIG` من `model-selector.tsx`
- تعريف `TierToken` و `ModelCardToken` interfaces
- ربط كل tier بـ CSS variable class بدلا من inline colors
- تصدير `getTierConfig(model)` و `getModelCardConfig(model)` كدوال مساعدة

### 1.2 إضافة CSS Variables للـ Tiers في `client/src/index.css`

إضافة 4 مجموعات من المتغيرات (واحدة لكل Tier):

```css
/* OMNI (Tier 4) — Electric Indigo/Violet */
--tier-omni-accent: 262 83% 58%;
--tier-omni-surface: 262 83% 12%;
--tier-omni-border: 262 83% 28%;
--tier-omni-text: 262 83% 85%;
--tier-omni-glow: 0 0 20px rgba(139,92,246,0.45);

/* ELITE (Tier 3) — Cyan/Teal */
--tier-elite-accent: 190 90% 55%;
--tier-elite-surface: 190 90% 10%;
--tier-elite-border: 190 90% 25%;
--tier-elite-text: 190 90% 80%;
--tier-elite-glow: 0 0 18px rgba(6,182,212,0.40);

/* PRO (Tier 2) — Emerald/Lime */
--tier-pro-accent: 160 84% 39%;
--tier-pro-surface: 160 84% 10%;
--tier-pro-border: 160 84% 22%;
--tier-pro-text: 160 84% 75%;
--tier-pro-glow: 0 0 16px rgba(16,185,129,0.35);

/* STARTER (Tier 1) — Amber/Orange */
--tier-starter-accent: 38 95% 55%;
--tier-starter-surface: 38 95% 10%;
--tier-starter-border: 38 95% 22%;
--tier-starter-text: 38 95% 80%;
--tier-starter-glow: 0 0 14px rgba(245,158,11,0.30);
```

### 1.3 تمديد `tailwind.config.ts`

إضافة `tier` كـ color namespace في `theme.extend.colors` ليسهل استخدام `bg-tier-omni` و `text-tier-elite` إلخ عبر Tailwind classes.

---

## المرحلة 2: إعادة بناء ModelSelector (الأولوية القصوى)

**الهدف**: تحويل المكون من 95% inline styles إلى 0% inline styles.

### 2.1 إنشاء `client/src/components/model-selector/model-card.tsx` (جديد)

استخراج `ModelCard` إلى مكون منفصل:
- **صفر inline styles** — كل التنسيق عبر Tailwind classes + CSS variables
- استخدام `motion.button` من Framer Motion للـ hover animations
- `font-sans` للوصف، `font-mono` للاسم والـ tech tag
- ألوان الـ tier تأتي من `--tier-*-*` CSS variables
- تحسين responsive: padding متجاوب، truncate للنصوص
- Props: `model`, `isSelected`, `canAccess`, `onSelect`, `onLocked`

### 2.2 إنشاء `client/src/components/model-selector/tier-section.tsx` (جديد)

- استخراج `TierSection` من `model-selector.tsx`
- استخدام Badge component من shadcn/ui لشارة الـ tier
- استخدام Separator للخط الفاصل
- تجميع ModelCards تحت عنوان tier مع spacing مناسب
- Props: `tier`, `models`, `selectedModel`, `canAccessModel`, `onSelect`, `onLocked`

### 2.3 إعادة كتابة `client/src/components/model-selector/model-selector.tsx`

**التغييرات الجوهرية**:
| قبل | بعد |
|------|-----|
| `style={{}}` في كل عنصر | Tailwind classes فقط |
| ألوان صلبة (`#6366f1`) | `hsl(var(--tier-omni-accent))` |
| زر Upgrade عادي + inline events | Button component من shadcn/ui |
| خط mono لكل النصوص | mono للعناوين، sans للوصف |
| هيكل مسطح (كل شيء في ملف واحد) | مكونات مستقلة (model-card, tier-section) |

**الهيكل الجديد**:
```
ModelSelector
└── DropdownMenu (shadcn/ui)
    ├── DropdownMenuTrigger → Button (shadcn/ui)
    │   ├── ModelLetterIcon
    │   ├── اسم النموذج (font-mono uppercase)
    │   └── ChevronDown/Lock
    └── DropdownMenuContent → motion.div (Framer Motion)
        ├── Header: "SELECT MODEL" + "APEX·AI"
        ├── TierSection (omni)
        │   ├── ModelCard (apex-omni)
        │   └── ModelCard (apex-coder)
        ├── TierSection (elite)
        │   └── ModelCard (apex-elite)
        ├── TierSection (pro) — إن وجدت نماذج
        ├── TierSection (starter)
        │   └── ModelCard (apex-flash)
        └── Footer: "APEX-CHAT" + Upgrade Button
```

---

## المرحلة 3: إعادة تصميم Chat Header

### 3.1 إنشاء `client/src/components/chat/chat-header.tsx` (جديد)

Header احترافي يحتوي على:
- **زر Sidebar toggle** — عند إغلاق sidebar (موجود، ينتقل للمكون الجديد)
- **BrandBadge**: شعار Apex مع اسم "APEX" بتأثير تدرج لوني
- **ModelSelector** — المكون المحسّن من المرحلة 2
- **ServiceMode indicator** — شارة توضح الوضع الحالي (اختياري)

**التصميم**:
- خلفية `apex-header-bg` مع glass morphism
- ارتفاع `h-12 md:h-14`
- `max-w-4xl mx-auto` للمحاذاة
- تأثير fade-in عند التحميل (Framer Motion)

### 3.2 دمج الـ Header في `client/src/pages/chat.tsx`

استبدال الأسطر 824-866 (الـ header الحالي) بـ `<ChatHeader>` مكون واحد.

---

## المرحلة 4: توحيد تنسيق الصفحات الجانبية

### 4.1 `client/src/pages/settings.tsx`

- استبدال `bg-black` → `bg-background`
- استبدال `bg-zinc-950` → `bg-card`
- استخدام Card component للتجميعات
- استخدام Button, Badge, Switch components من shadcn/ui

### 4.2 `client/src/pages/billing.tsx`

- توحيد الألوان مع CSS variables
- استخدام Table component لسجل المعاملات
- استخدام Card component لتجميع المعلومات

### 4.3 `client/src/pages/pricing-page.tsx`

- استخدام Card component لبطاقات الأسعار
- استخدام Badge لشارة التوصية
- ألوان الـ tiers من `--tier-*-*` variables

### 4.4 `client/src/pages/login.tsx`

- خلفية `bg-background` بدلا من الأسود الصلب
- Card component لنموذج تسجيل الدخول
- تأثيرات glass morphism متسقة

---

## المرحلة 5: تحسينات الطباعة (Typography)

### 5.1 هرمية الخطوط الموحدة

| الاستخدام | الخط |
|-----------|------|
| العناوين الرئيسية | `font-display` (Space Mono) |
| العناوين التقنية | `font-mono` (JetBrains Mono) |
| النصوص الوصفية | `font-sans` (Inter) |
| النصوص العربية | `font-arabic` (Cairo) |
| الأيقونات pixel | `font-pixel` (Press Start 2P) |

### 5.2 إصلاح ModelSelector تحديدا

- اسم النموذج: `font-mono text-[11px] tracking-widest uppercase`
- وصف النموذج: `font-sans text-[10px] text-muted-foreground` (ليس mono!)
- اسم الـ tier: `font-mono text-[9px] tracking-[0.2em] uppercase`

---

## المرحلة 6: تحسينات RTL والعربية

### 6.1 استخدام CSS Logical Properties

استبدال `margin-left/right` بـ `margin-inline-start/end`، و `padding-left/right` بـ `padding-inline-start/end`.

### 6.2 أيقونات اتجاهية

استخدام `scale-x-[-1]` لعكس الأيقونات الاتجاهية في وضع RTL.

### 6.3 دعم الإدخال ثنائي الاتجاه

ChatInput: `dir="auto"` على textarea مع `unicode-bidi: plaintext`.

---

## المرحلة 7: تحسينات Premium Feel (اللمسات النهائية)

### 7.1 توسيع نظام Glassmorphism

إضافة `.glass-panel` و `.glass-card-premium` utility classes.

### 7.2 Micro-interactions

- `transition-all duration-200` على العناصر التفاعلية
- `active:scale-[0.98]` عند الضغط
- تأثيرات hover محسّنة
- Shimmer loading states

### 7.3 نظام Spacing موحد

Multiples of 4px: `gap-3` (12px), `gap-4` (16px), `gap-6` (24px).

### 7.4 تحسينات Dark Mode

- `text-foreground` بدلا من `text-white`
- `text-muted-foreground` للنصوص الثانوية
- تقليل حدة glow effects

---

## الخريطة الطوبولوجية المعمارية

```
┌──────────────────────────────────────────────┐
│            Presentation Layer                │
│  Pages: chat, settings, login, billing...    │
│  Components: ModelSelector, ChatHeader...    │
└──────────────────┬───────────────────────────┘
                   │
┌──────────────────▼───────────────────────────┐
│            Application Layer                  │
│  Store (Zustand), Hooks, auth-store          │
└──────────────────┬───────────────────────────┘
                   │
┌──────────────────▼───────────────────────────┐
│            Domain/Shared Layer                │
│  lib/tier-tokens.ts, constants.ts            │
│  @shared/schema types                        │
└──────────────────┬───────────────────────────┘
                   │
┌──────────────────▼───────────────────────────┐
│          Infrastructure Layer                 │
│  shadcn/ui, Tailwind CSS, index.css          │
│  Framer Motion, Lucide Icons                 │
└──────────────────────────────────────────────┘
```

**تدفق البيانات**: Store → ChatHeader/ModelSelector → User Selection → Store.setSelectedModel()

**الملفات الجديدة** (سيتم إنشاؤها):
- `client/src/lib/tier-tokens.ts`
- `client/src/components/model-selector/model-card.tsx`
- `client/src/components/model-selector/tier-section.tsx`
- `client/src/components/chat/chat-header.tsx`

**الملفات المعدلة** (سيتم تعديلها):
- `client/src/index.css` — إضافة tier CSS variables
- `tailwind.config.ts` — تمديد theme.colors.tier
- `client/src/components/model-selector/model-selector.tsx` — إعادة كتابة
- `client/src/pages/chat.tsx` — دمج ChatHeader
- `client/src/pages/settings.tsx` — توحيد التنسيق
- `client/src/pages/billing.tsx` — توحيد التنسيق
- `client/src/pages/pricing-page.tsx` — توحيد التنسيق
- `client/src/pages/login.tsx` — توحيد التنسيق

---

## التحقق (Verification)

1. **التحقق البصري**: فتح التطبيق والتأكد من أن ModelSelector يعمل بشكل صحيح في جميع حالاته (مفتوح/مغلق، نماذج نشطة/مقفلة، جميع الـ tiers)
2. **التحقق من RTL**: تفعيل وضع RTL والتأكد من أن التخطيط معكوس بشكل صحيح
3. **التحقق من responsive**: اختبار ModelSelector والـ Header على أحجام شاشات مختلفة (mobile, tablet, desktop)
4. **التحقق من الاتساق**: التأكد من أن جميع الصفحات (settings, billing, pricing, login) تستخدم نفس نظام الألوان والمكونات
5. **التحقق من عدم وجود inline styles**: استخدام browser DevTools للتأكد من عدم وجود ألوان صلبة أو inline styles في ModelSelector
6. **التحقق من God Mode**: اختبار نموذج apex-coder للتأكد من عدم تعارض tier variables مع God Mode theme
