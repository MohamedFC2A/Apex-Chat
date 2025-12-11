# ApexChat Design Guidelines

## Design Approach
**Reference-Based + Design System Hybrid**: Draw inspiration from ChatGPT's interface paradigm combined with Shadcn/UI component library for a premium, professional chat application experience.

## Core Design Principles
1. **Information Clarity**: Prioritize readability and scannable message hierarchy
2. **Professional Minimalism**: Clean, distraction-free interface focused on conversation
3. **Power User Optimization**: Advanced controls accessible but not intrusive
4. **Responsive Intelligence**: Interface adapts to selected mode and reasoning state

---

## Typography System

**Font Family**: 
- Primary: Inter or SF Pro Display (system fonts for crispness)
- Code blocks: JetBrains Mono or Fira Code

**Hierarchy**:
- Chat messages: text-base (16px) with relaxed line-height (1.6)
- Model selector: text-sm font-medium
- Section headers: text-xs font-semibold uppercase tracking-wide
- Input placeholder: text-sm
- Timestamps: text-xs opacity-60

---

## Layout System

**Spacing Units**: Use Tailwind units of **2, 3, 4, 6, 8** consistently
- Component padding: p-4
- Section gaps: gap-6, gap-8
- Input area: p-4 to p-6
- Message bubbles: p-4
- Sidebar items: p-3

**Grid Structure**:
```
Sidebar: 260px fixed width (collapsed: 60px)
Chat Area: max-w-3xl centered (Dev mode: max-w-5xl)
Input Container: max-w-3xl centered, sticky bottom
Header: full-width with max-w-7xl inner container
```

---

## Component Library

### Navigation & Layout

**Sidebar (Left)**:
- Fixed 260px width, full viewport height
- Collapsible to 60px icon-only state
- Top: "New Chat" button (w-full, rounded-lg, h-11)
- Middle: Scrollable chat history list
- Bottom: User profile section with avatar + name
- History items: hover state with subtle background, rounded-md, p-3

**Top Header**:
- h-14 fixed height
- Model selector dropdown positioned top-left (after sidebar)
- Service mode toggle positioned center-right
- Thinking mode indicators positioned top-right

### Primary Controls

**Model Selector Dropdown**:
- Prominent button with model icon + name
- Dropdown menu: rounded-xl, p-2, max-h-96
- Each option: flex items with model icon (w-5 h-5), name, and optional badge
- Selected state: distinct background treatment
- Hover: smooth background transition

**Service Mode Switcher**:
- Segmented control with 3 options
- Each segment: px-4 py-2, rounded-md
- Active segment: distinct styling
- Icons + text labels for clarity

**Thinking Controls**:
- Located in input area toolbar
- Toggle switches with labels
- "Thinking": standard toggle
- "Over-Thinking": visually distinct (more prominent, possibly with warning treatment)
- Active states show pulsing brain icon indicator

### Chat Interface

**Message Container**:
- User messages: aligned right, max-w-2xl
- AI messages: aligned left, full-width within container
- Spacing: space-y-6 between message groups
- Timestamps: positioned above messages, text-xs

**Message Bubble Styling**:
- User: rounded-2xl, p-4
- AI: no visible bubble, just text (ChatGPT style)
- Code blocks: rounded-lg, p-4, monospace font
- Reasoning indicator: small pill badge "Analyzing..." with animated dots

**Reasoning Display**:
- Collapsible section with "Reasoning..." header
- Monospace or condensed font for chain-of-thought
- Subtle border-left accent
- Expandable/collapsible with smooth animation

### Input Area

**Input Container**:
- Fixed bottom position with backdrop blur
- Outer padding: p-4 to p-6
- Inner container: rounded-2xl with border
- min-h-14, max-h-64 with auto-expand

**Input Components**:
- Textarea: p-4, resize-none, auto-expanding
- Attachment button: absolute left, icon-only, w-10 h-10
- Thinking toggles: toolbar above input (horizontal flex, gap-3)
- Send button: absolute right, circular (w-10 h-10), icon changes when text entered
- Send button active state: distinct treatment when message ready

**Toolbar Layout** (above textarea):
- Horizontal flex container
- Attachment icon (paperclip) left
- Thinking toggle center-left
- Over-Thinking toggle center
- Character count right (if needed)

---

## Mode-Specific Adaptations

**Dev/Coder Mode**:
- Chat area: max-w-5xl (wider for code)
- Code blocks: syntax highlighting enabled
- Monospace emphasis in message rendering
- Additional padding for code readability

**Education/Tutor Mode**:
- Slightly narrower max-width (max-w-2xl) for focused reading
- Emphasis on step-by-step message formatting
- Question prompts styled distinctly

---

## Visual Feedback & States

**Loading States**:
- Reasoning: animated dots "Analyzing complex logic..."
- Message streaming: cursor blink at end of text
- Model switching: brief loading spinner in selector

**Interactive States**:
- Hover: subtle background shift (transition-colors duration-200)
- Active/Selected: distinct background treatment
- Focus: ring-2 with offset
- Disabled: opacity-50 with cursor-not-allowed

**Pulsing Brain Icon** (Over-Thinking active):
- Position: near send button or in header
- Animation: gentle pulse scale (1.0 to 1.1)
- Duration: 2s infinite

---

## Responsive Behavior

**Desktop (lg+)**: Full layout as described
**Tablet (md)**: Sidebar becomes overlay drawer
**Mobile (base)**: 
- Hamburger menu for sidebar
- Stacked service mode controls
- Input toolbar wraps to vertical
- Message containers: full-width with reduced padding

---

## Animation Principles

**Minimal & Purposeful**:
- Sidebar collapse/expand: smooth width transition (300ms)
- Dropdown menus: fade + scale in (200ms)
- Message appearance: subtle fade-in (150ms)
- Thinking indicator: continuous subtle animation
- NO distracting scroll animations or page transitions

---

## Accessibility

- All controls: keyboard navigable
- Toggles: proper ARIA labels and states
- Focus indicators: visible on all interactive elements
- Message roles: proper semantic HTML (role="log" for chat area)
- Model selector: aria-expanded states