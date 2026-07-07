# 🎨 OBSIDIAN GLASS - QUICK VISUAL REFERENCE

## COLOR PALETTE

```
┌─────────────────────────────────────────────────────────┐
│ BACKGROUNDS                                             │
├─────────────────────────────────────────────────────────┤
│ The Void (Global)    │ #0a0a0a  │ bg-[#0a0a0a]         │
│ Surface Layer        │ #18181b  │ bg-zinc-900          │
│ Elevated Layer       │ #27272a  │ bg-zinc-800          │
│ Glass Overlay        │ black/40 │ bg-black/40          │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ TEXT COLORS                                             │
├─────────────────────────────────────────────────────────┤
│ Primary              │ #ffffff  │ text-white           │
│ Secondary            │ #a1a1aa  │ text-zinc-400        │
│ Tertiary             │ #71717a  │ text-zinc-500        │
│ Placeholder          │ #52525b  │ text-zinc-600        │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ BORDERS (All 1px)                                       │
├─────────────────────────────────────────────────────────┤
│ Subtle               │ rgba(255,255,255,0.1)  │ /10    │
│ Hover                │ rgba(255,255,255,0.2)  │ /20    │
│ Focus                │ rgba(255,255,255,0.3)  │ /30    │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ ACCENTS                                                 │
├─────────────────────────────────────────────────────────┤
│ Primary (White)      │ #ffffff  │ Active states        │
│ Code (Emerald)       │ #34d399  │ text-emerald-400     │
│ Thinking (Blue)      │ #60a5fa  │ text-blue-400        │
│ Research (Purple)    │ #a78bfa  │ text-purple-400      │
│ God Mode (Red)       │ #f87171  │ text-red-400         │
└─────────────────────────────────────────────────────────┘
```

---

## COMPONENT ANATOMY

### 🎯 Sidebar (Ghost Panel)
```
┌──────────────────────────────────────┐
│  ╔════════════════════════════════╗  │ ← Header: border-white/10
│  ║  [≡]         ApexChat      [X] ║  │   
│  ╚════════════════════════════════╝  │
├──────────────────────────────────────┤
│  ┌────────────────────────────────┐  │ ← Upgrade Button
│  │  [👑] Manage Subscription      │  │   bg-zinc-900 border-white/10
│  └────────────────────────────────┘  │
├──────────────────────────────────────┤
│  ┌────────────────────────────────┐  │ ← New Chat
│  │  [+] New Chat                  │  │   Same styling
│  └────────────────────────────────┘  │
├──────────────────────────────────────┤
│                                      │
│  • Project Discussion               │ ← Active: bg-white/10 text-white
│    2 hours ago                      │
│                                      │
│  • Code Review                      │ ← Inactive: text-zinc-500
│    Yesterday                        │   hover:bg-white/5
│                                      │
├──────────────────────────────────────┤
│  ┌────────────────────────────────┐  │ ← Profile
│  │  [U]  User                     │  │   bg-zinc-950/50
│  │       [★] Elite                │  │   border-white/10
│  └────────────────────────────────┘  │
└──────────────────────────────────────┘

Glass: bg-black/40 backdrop-blur-xl
Border: border-r border-white/5
```

---

### 💬 Input Area (Command Cockpit)
```
┌──────────────────────────────────────────────────────────────┐
│  ┌────────────────────────────────────────────────────────┐  │
│  │  [📎] Type your message...                        [→]  │  │
│  │                                                          │  │
│  │  ─────────────────────────────────────────────────────  │  │
│  │  [🧠] [🔍] [💀]                            ⚡ CODER  │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                                │
│  ApexChat can make mistakes. Verify important information.    │
└──────────────────────────────────────────────────────────────┘

Container: bg-zinc-900/80 backdrop-blur-md
Border: border-white/10 (focus: border-white/30)
God Mode: border-red-900/50 + glow-red effect
Send Button: bg-white text-black (premium!)
Toolbar Separator: border-t border-white/10
```

---

### 💭 Messages
```
USER MESSAGE (Right-aligned):
                         ┌─────────────────────────┐  [👤]
                         │ How do I fix this bug?  │
                         └─────────────────────────┘

Styling: bg-zinc-900 border border-white/10 rounded-2xl
Max-width: 80%

AI MESSAGE (Left-aligned):
[🤖]  LLAMA3.1-8B                            [Copy]
      ┌──────────────────────────────────────────────────┐
      │ Here's how to fix the issue:                     │
      │                                                   │
      │ ```typescript                                     │
      │ function fix() { ... }                            │
      │ ```                                               │
      │                                                   │
      │ The **key point** is to use proper typing.       │
      └──────────────────────────────────────────────────┘

Avatar: bg-white/5 border border-white/10
Code: bg-zinc-900/80 border border-white/10 text-emerald-400
Strong: text-white font-bold
```

---

## INTERACTION STATES

### Buttons
```
DEFAULT:    bg-zinc-900 border border-white/10
HOVER:      bg-zinc-800 (subtle shift)
ACTIVE:     scale(0.98) (tactile feedback)
DISABLED:   opacity-50

SEND BUTTON (Special):
INACTIVE:   bg-zinc-800 text-zinc-600
ACTIVE:     bg-white text-black ← PREMIUM FEEL
```

### Feature Toggles
```
THINKING (OFF):       text-zinc-500 hover:bg-white/5
THINKING (ON):        bg-blue-600/20 text-blue-400 border-blue-900/50

RESEARCH (OFF):       text-zinc-500 hover:bg-white/5
RESEARCH (ON):        bg-purple-600/20 text-purple-400 border-purple-900/50

GOD MODE (OFF):       text-zinc-500 hover:bg-white/5
GOD MODE (ON):        bg-red-950/50 text-red-400 border-red-900/50
                      + glow-red + animate-pulse
```

### Sidebar Items
```
INACTIVE:   text-zinc-500 hover:text-zinc-300 hover:bg-white/5
ACTIVE:     bg-white/10 text-white
HOVER:      scale(1.01) translateX(2px) ← Subtle slide
```

---

## MOTION SYSTEM

### Timing
```
Quick Interactions:   0.15s (buttons, toggles)
Layout Changes:       0.3s  (sidebar expand/collapse)
Entrance Animations:  0.4s  (future enhancement)
```

### Scale Values
```
Small Elements:       hover: 1.1   tap: 0.9
Medium Elements:      hover: 1.05  tap: 0.95
Large Elements:       hover: 1.02  tap: 0.98
Sidebar Items:        hover: 1.01  (+ translateX(2px))
```

### Easing
```
Default:      transition: all 0.15s ease
Sidebar:      transition: { duration: 0.3, ease: "easeInOut" }
```

---

## TYPOGRAPHY SCALE

```
Page Title (H1):      text-2xl font-semibold tracking-tight text-white
Section (H2):         text-lg font-medium tracking-tight text-white
Card Title (H3):      text-sm font-medium tracking-tight text-zinc-200
Body Regular:         text-sm text-zinc-400 leading-relaxed
Body Small:           text-xs text-zinc-500 leading-normal
Input Text:           text-sm text-zinc-100 placeholder:text-zinc-600
Code/Mono:            text-xs font-mono text-emerald-400
Labels:               text-xs tracking-wide text-zinc-500
```

---

## ELEVATION SYSTEM

Instead of heavy drop shadows, we use:

1. **Glass Layers**: Multiple translucent surfaces create depth
2. **Micro-Borders**: 1px white/10 borders separate elements
3. **Subtle Glows**: 
   - `.glow-sm`: box-shadow: 0 0 15px rgba(255,255,255,0.05)
   - `.glow-white`: box-shadow: 0 0 20px rgba(255,255,255,0.1)
   - `.glow-red`: box-shadow: 0 0 20px rgba(127,29,29,0.3) + inset

---

## GOD MODE SPECIAL STATES

When God Mode (apex-coder) is active:

```
INPUT BORDER:        border-red-900/50 + glow-red
TOGGLE BUTTON:       bg-red-950/50 text-red-400 border-red-900/50
                     + animate-pulse
MODEL SELECTOR:      Shows "CODER" badge
                     bg-red-950/50 text-red-400 border-red-900/50
STATUS TEXT:         "⚡ CODER" in tracking-wider
```

---

## GLASS MORPHISM RECIPE

Perfect glass effect requires:
```css
background: bg-black/40           /* Semi-transparent black */
backdrop-filter: backdrop-blur-xl  /* The magic blur */
border: border-white/10            /* 1px precision border */
```

Apply to:
- Sidebar
- Input container
- Dropdown menus
- Modal overlays

---

## CODE BLOCK STYLING

Inline code:
```
bg-zinc-900 
px-1.5 py-0.5 
rounded 
border border-white/10 
text-emerald-400 
font-mono 
text-xs
```

Block code:
```
bg-zinc-900/80 
border border-white/10 
p-4 
rounded-lg 
overflow-x-auto 
my-4
text-emerald-400 
font-mono 
text-sm
```

---

## ACCESSIBILITY NOTES

- White/10 borders provide minimum 1px visibility
- Text contrast ratios maintained:
  - White on #0a0a0a: 21:1 ✅
  - zinc-400 on #0a0a0a: 8.6:1 ✅
  - emerald-400 on zinc-900: 7.2:1 ✅

- Focus states clearly visible (border-white/30)
- Hover states provide clear feedback
- Disabled states use opacity-50

---

## RESPONSIVE CONSIDERATIONS

```
Mobile (<640px):
- Sidebar collapses to icon bar
- Chat input maintains max-w-3xl
- Messages stack properly with max-w-[80%]

Tablet (640px-1024px):
- Full sidebar visible
- Optimal reading width maintained
- Touch targets sized appropriately

Desktop (>1024px):
- Maximum width containers centered
- Glass effects perform well
- All micro-interactions smooth
```

---

**Remember**: The "Obsidian Glass" aesthetic is about **precision**, **subtlety**, and **depth**. Every 1px border, every 10% opacity, every 0.15s transition contributes to the premium feel. It's the difference between "good" and "expensive."
