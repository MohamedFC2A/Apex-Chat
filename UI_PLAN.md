# UI/UX OVERHAUL - "THE OBSIDIAN GLASS" AESTHETIC
## EXECUTION PLAN v1.0

---

## 1. COLOR SYSTEM - "THE VOID FOUNDATION"

### Primary Palette
```
Background Layer 0 (Global):    #0a0a0a (zinc-950 variant)
Background Layer 1 (Surfaces):  #18181b (zinc-900)
Background Layer 2 (Cards):     #27272a (zinc-800)
```

### Glass & Borders
```
Glass Surface:       bg-black/40 + backdrop-blur-xl
Micro-Border:        border-white/10 (1px precision)
Hover Border:        border-white/20
Focus Border:        border-white/30
God Mode Border:     border-red-900/50 + red inner glow
```

### Text Hierarchy
```
Primary Text:        text-white (100%)
Secondary Text:      text-zinc-400 (60%)
Tertiary Text:       text-zinc-500 (50%)
Placeholder:         text-zinc-600 (40%)
Active Accent:       text-white or text-amber-400
```

---

## 2. TYPOGRAPHY SYSTEM

### Font Stack
```css
Primary: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif
Monospace: 'JetBrains Mono', 'Fira Code', monospace
```

### Type Scale
```
H1 (Page Title):     text-2xl font-semibold tracking-tight text-white
H2 (Section):        text-lg font-medium tracking-tight text-white
H3 (Card Title):     text-sm font-medium tracking-tight text-zinc-200
Body Regular:        text-sm text-zinc-400 leading-relaxed
Body Small:          text-xs text-zinc-500 leading-normal
Input Text:          text-sm text-zinc-100 placeholder:text-zinc-600
Code/Mono:           text-xs font-mono text-emerald-400
```

---

## 3. COMPONENT BREAKDOWN

### A. SIDEBAR ("Ghost Panel")
**File:** `client/src/components/chat-sidebar.tsx`

**Changes:**
- Root: `bg-black/40 backdrop-blur-xl border-r border-white/5`
- Width: `w-64` (fixed)
- Position: `fixed left-0 top-0 h-screen`
- Section Headers: `text-[10px] uppercase tracking-widest text-zinc-600 font-semibold`
- Chat Items:
  - Default: `text-zinc-500 hover:text-zinc-300 hover:bg-white/5 rounded-lg px-3 py-2 transition-all`
  - Active: `text-white bg-white/10 rounded-lg px-3 py-2`
- New Chat Button: `bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-white rounded-lg`

### B. CHAT CANVAS ("Message Stream")
**File:** `client/src/pages/chat.tsx` + `client/src/components/chat-message.tsx`

**Changes:**
- Container: `bg-[#0a0a0a]` (remove any bg-gradient)
- User Messages:
  - Container: `ml-auto max-w-[80%] bg-zinc-900 border border-white/10 rounded-2xl px-4 py-3`
  - Text: `text-sm text-zinc-100 leading-relaxed`
- AI Messages:
  - Container: `max-w-[90%] bg-transparent`
  - Text: `prose prose-invert prose-sm max-w-none`
  - Code Blocks: `bg-zinc-900/80 border border-white/10 rounded-lg`
- Singularity Dashboard Widget:
  - Container: `bg-zinc-900/50 backdrop-blur-md border border-white/10 rounded-xl p-4`
  - Mono Font: `font-mono text-xs text-emerald-400`
  - Progress Bars: `bg-zinc-800 h-1.5 rounded-full overflow-hidden`

### C. INPUT AREA ("Command Cockpit")
**File:** `client/src/components/chat-input.tsx`

**Changes:**
- Container: `fixed bottom-6 left-1/2 -translate-x-1/2 w-[calc(100%-280px)] max-w-4xl`
- Island Style: `bg-zinc-900/80 backdrop-blur-md border border-white/10 rounded-xl shadow-[0_0_30px_rgba(0,0,0,0.5)]`
- Focus State: `focus-within:border-white/30 transition-all duration-200`
- God Mode Active: `border-red-900/50 shadow-[0_0_20px_rgba(127,29,29,0.3)]`
- Textarea: `bg-transparent text-zinc-100 placeholder:text-zinc-600 resize-none border-0 focus:ring-0`
- Send Button: `bg-white text-black hover:bg-zinc-200 active:scale-95 rounded-lg px-4 py-2 transition-transform`

### D. MODEL SELECTOR
**File:** `client/src/components/model-selector.tsx`

**Changes:**
- Trigger: `bg-zinc-900 border border-white/10 hover:border-white/20 rounded-lg px-3 py-2`
- Dropdown: `bg-zinc-900 border border-white/10 rounded-xl shadow-[0_8px_30px_rgba(0,0,0,0.6)] backdrop-blur-xl`
- Items: `hover:bg-white/5 text-zinc-400 hover:text-white transition-colors`
- God Mode Badge: `text-[9px] font-semibold tracking-wider bg-red-950/50 text-red-400 border border-red-900/50 px-1.5 py-0.5 rounded`

---

## 4. MOTION STRATEGY (Framer Motion)

### A. Layout Transitions
```tsx
<motion.div layout transition={{ duration: 0.3, ease: "easeInOut" }}>
```
**Apply to:**
- Sidebar expand/collapse
- Message list (new message appears)
- Feature toggle panels

### B. Entrance Animations
```tsx
<motion.div 
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
>
```
**Apply to:**
- New chat messages
- Singularity dashboard widgets
- Modal dialogs

### C. Hover Micro-Interactions
```tsx
whileHover={{ scale: 1.02, brightness: 1.1 }}
whileTap={{ scale: 0.98 }}
transition={{ duration: 0.15 }}
```
**Apply to:**
- Buttons (Send, New Chat)
- Chat history items
- Feature toggles

### D. Loading States
**Replace spinners with:**
```tsx
<motion.div
  className="h-1 bg-zinc-800 rounded-full overflow-hidden"
  initial={{ width: 0 }}
  animate={{ width: "100%" }}
  transition={{ duration: 1.5, repeat: Infinity }}
/>
```

---

## 5. GLOBAL STYLES UPDATES

### File: `client/src/index.css`

**Changes:**
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  * {
    @apply border-border;
  }
  
  body {
    @apply bg-[#0a0a0a] text-zinc-100 antialiased;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  }
  
  /* Custom Scrollbar */
  ::-webkit-scrollbar {
    @apply w-2;
  }
  
  ::-webkit-scrollbar-track {
    @apply bg-transparent;
  }
  
  ::-webkit-scrollbar-thumb {
    @apply bg-zinc-800 rounded-full hover:bg-zinc-700;
  }
  
  /* Glow Effect Utility */
  .glow-sm {
    box-shadow: 0 0 15px rgba(255, 255, 255, 0.05);
  }
  
  .glow-red {
    box-shadow: 0 0 20px rgba(127, 29, 29, 0.3);
  }
}
```

---

## 6. DEPENDENCY CHECK

**Required Packages:**
- `clsx` ✓ (check)
- `tailwind-merge` ✓ (check)
- `framer-motion` ✓ (check)

---

## 7. IMPLEMENTATION ORDER

### Phase 1: Foundation (30 min)
1. Update `index.css` with new color system
2. Install missing dependencies
3. Update tailwind config (if needed)

### Phase 2: Core Components (60 min)
4. Refactor `chat-sidebar.tsx`
5. Refactor `chat-input.tsx`
6. Refactor `chat-message.tsx`

### Phase 3: Secondary Components (45 min)
7. Update `model-selector.tsx`
8. Update `feature-toggles.tsx`
9. Update `subscription-badge.tsx`

### Phase 4: Polish & Motion (30 min)
10. Add Framer Motion transitions
11. Test all hover/active states
12. Fix any layout shifts

---

## 8. SUCCESS CRITERIA

✓ No pure black backgrounds (use #0a0a0a)
✓ All borders are 1px with white/10 opacity
✓ Glass effect on sidebar
✓ Floating input with glow on focus
✓ Smooth micro-interactions (scale, brightness)
✓ God Mode visual indicator (red border + glow)
✓ Markdown rendering with prose-invert
✓ Zero layout shift on interactions

---

**ESTIMATED TOTAL TIME:** 2.5 hours
**RISK LEVEL:** Low (CSS-only changes, no logic modification)
**ROLLBACK STRATEGY:** Git stash before starting

---

## APPENDIX: REFERENCE INSPIRATIONS
- Linear.app dashboard
- Raycast command bar
- Arc browser UI
- macOS Monterey transparency effects
