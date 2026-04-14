# Navigation & App Shell Design for Luxury Dark Interfaces

## Research Scope

This document analyzes sidebar navigation, topbar, command palette, mobile navigation, and page transition patterns for a luxury dark-themed real estate SaaS. Reference points: Mercury, Linear, Stripe, Raycast, Arc Browser, and Amie. Target palette: dark bg `#0C0B0A`, cream text `#F0EDE8`, violet accent `#8B7AFF`.

---

## 1. Mercury Sidebar: Anatomy & Dimensions

Mercury's sidebar in its dark banking dashboard sets the standard for fintech navigation. Key measurements:

- **Width:** 240px (consistent with Linear, Notion). On dark backgrounds, 240px feels balanced -- narrower (200-216px) creates cramped icon-label pairing, wider (260+) wastes real estate on smaller laptops.
- **Background:** Solid `#111110` -- a near-black with warm undertone. Not a gradient. The separation from the content area comes from a single 1px right border in `rgba(255,255,255,0.06)` (approximately `#1E1E1C`). No box-shadow on the sidebar itself.
- **Logo area:** 56px height. Logo mark (24x24px rounded square) left-aligned with 16px left padding. Wordmark at 15px/600 weight. A plan/tier badge sits right-aligned in the same row, rendered as a small pill (`text-[10px] px-2 py-0.5 rounded-full`).
- **Nav item row:** 36px height. 12px horizontal padding within the nav container. Items use 8px border-radius (`rounded-lg`). Icons at 18px with 1.5px stroke. Labels at 13-14px/400 weight.
- **Spacing between groups:** 20-24px vertical gap. Mercury uses no uppercase section headers -- groups are separated by a 1px horizontal rule at `rgba(255,255,255,0.06)` with 4px horizontal margin.
- **Scrollable nav area:** The nav region between the logo and the user/footer area scrolls independently (`overflow-y-auto`). The logo and footer remain pinned.

### Tailwind Translation for Dark Sidebar

```
Sidebar container:    w-60 bg-[#0C0B0A] border-r border-white/[0.06] h-screen sticky top-0
                      flex flex-col
Logo row:             h-14 flex items-center justify-between px-4 border-b border-white/[0.06]
Nav scroll area:      flex-1 overflow-y-auto px-3 pt-4 space-y-5
Nav group divider:    border-t border-white/[0.06] mx-1
Footer/user area:     mt-auto border-t border-white/[0.06] px-3 py-3
```

---

## 2. Sidebar Background: Solid vs Gradient vs Border-Only

Three approaches exist for separating a sidebar from the main content on dark interfaces:

### 2a. Solid Dark (Mercury, Linear dark)

Sidebar background is a flat, marginally different shade from the content area. Mercury uses `#111110` sidebar against `#0C0B0A` content. The difference is 2-3% lightness. This creates an almost subliminal distinction -- the eye registers the sidebar as a separate zone without any jarring contrast.

**Pros:** Most restrained, most professional. Avoids any "gaming UI" feel. Works on all display calibrations.
**Cons:** Requires a border to be perceivable on low-contrast monitors.

### 2b. Subtle Vertical Gradient

Some premium dark UIs (Raycast, older Figma dark) apply a very subtle top-to-bottom gradient on the sidebar: e.g., `linear-gradient(180deg, rgba(255,255,255,0.02) 0%, transparent 100%)`. This gives a sense of light falling from above.

**Pros:** Adds dimensionality. Feels crafted.
**Cons:** Can appear muddy on certain monitors. Harder to maintain consistency if the sidebar scrolls (the gradient scrolls with content and breaks the illusion). Adds visual noise to an otherwise clean chrome.

### 2c. Border-Only Separation (Same Background)

Sidebar and content share the exact same background color. A single 1px border-right provides the only delineation. Arc Browser uses this approach.

**Pros:** Maximum minimalism. Content feels expansive.
**Cons:** On very dark backgrounds, the border can be nearly invisible. Requires careful opacity tuning (0.06-0.08 white).

### Verdict for Parcel

**Solid dark with border.** Use `#0C0B0A` for both sidebar and content, with a `border-r border-white/[0.06]` divider. This is the Mercury approach and reads as the most financially serious. If the sidebar needs slightly more presence, bump it to `#0F0E0D` (a 1.5% lightness increase) -- but test on multiple displays first.

CSS variable approach:
```css
--sidebar-bg: #0C0B0A;           /* or #0F0E0D for slight lift */
--sidebar-border: rgba(255,255,255,0.06);
--content-bg: #0C0B0A;
```

---

## 3. Nav Item States: Idle, Hover, Active

The three-state system is critical on dark interfaces because the reduced color range makes differentiation harder. Each state must be clearly distinct without relying on color alone.

### 3a. Idle State

- **Text:** `#F0EDE8` at 50% opacity (approximately `#7A7874`). Or use a dedicated muted token like `#6B6560`.
- **Icon:** Same color as text, or 5% lighter. Stroke-based, 1.3px weight.
- **Background:** Transparent.

```
text-[#F0EDE8]/50 or text-[#6B6560]
```

### 3b. Hover State

- **Background:** `rgba(255,255,255,0.04)` -- a barely-there white overlay. On `#0C0B0A` this resolves to approximately `#161514`.
- **Text:** Cream `#F0EDE8` at 80% opacity. The label brightens noticeably.
- **Icon:** Same brightening as text.
- **Transition:** 150ms ease-out on background-color and color.
- **Border-radius:** 8px (`rounded-lg`).

```
hover:bg-white/[0.04] hover:text-[#F0EDE8]/80
transition-colors duration-150
rounded-lg
```

### 3c. Active State

Active state must be the most visually distinct. Three sub-approaches used by premium dark apps:

**Option 1: Background tint (Mercury)**
A low-opacity accent fill behind the active item. For violet `#8B7AFF`, use `rgba(139, 122, 255, 0.08)` as the background. This creates a soft violet glow.

```
bg-[#8B7AFF]/[0.08] text-[#F0EDE8] font-medium
Icon: text-[#8B7AFF]
```

**Option 2: Left border accent (Linear, GitHub)**
A 2px left border in the accent color, with the item's left padding reduced by 2px to prevent layout shift. Background can be transparent or a very subtle tint.

```
border-l-2 border-l-[#8B7AFF] pl-[calc(0.75rem-2px)]
text-[#F0EDE8] font-medium
```

**Option 3: Icon color change only (Stripe dark)**
The icon shifts to the accent color. Text goes to full cream. No background change. Minimalist but harder to scan.

```
text-[#F0EDE8] font-medium
Icon: text-[#8B7AFF]
/* No background */
```

### Recommended Approach for Parcel

Combine Option 1 and Option 3: **accent-tinted background + accent-colored icon**. This is the approach Mercury uses and it provides the strongest wayfinding signal.

```tsx
// Active nav item
className={cn(
  'flex items-center gap-3 px-3 py-2 rounded-lg text-sm',
  'transition-colors duration-150',
  active
    ? 'bg-[#8B7AFF]/[0.08] text-[#F0EDE8] font-medium'
    : 'text-[#F0EDE8]/50 hover:bg-white/[0.04] hover:text-[#F0EDE8]/80'
)}

// Active icon
className={cn(
  'shrink-0 transition-colors duration-150',
  active ? 'text-[#8B7AFF]' : 'text-current'
)}
```

---

## 4. Icon Style on Dark: Outline vs Filled

### 4a. Outline at 1.3px Stroke (Lucide default region)

Lucide icons default to 2px stroke, which feels heavy on dark backgrounds where stroke edges glow slightly due to subpixel rendering. Reducing to 1.3-1.5px creates a thinner, more refined line.

**Pros:** Feels lighter, more expensive. Matches Linear's approach. Works well at 18px icon size. The negative space inside outlines breathes on dark backgrounds.
**Cons:** At very small sizes (14px), 1.3px strokes can feel wispy. Requires consistent stroke-width override across the app.

Implementation with Lucide:
```tsx
<Icon size={18} strokeWidth={1.5} />
```

### 4b. Filled Icons

Filled icons have more visual mass. They anchor nav items and are immediately recognizable at small sizes. Used by iOS tab bars and some mobile-first dark UIs.

**Pros:** Higher contrast and recognizability. Better for icon-only (mini/rail) modes.
**Cons:** Feel heavier, less refined. Can appear "blobby" on dark backgrounds at 18px. Filled icons in sidebars are associated with consumer apps (Instagram, Spotify), not financial SaaS.

### Verdict for Parcel

**Outline at 1.5px stroke.** This is the industry standard for premium dark SaaS navigation. Use `strokeWidth={1.5}` on all Lucide sidebar icons. The active state icon gets the violet accent color (`#8B7AFF`) but remains outline -- do not switch to filled on active. The color change alone provides sufficient differentiation.

If Parcel adds a collapsed/rail mode later, filled icons at 20px would be appropriate for the rail-only state, since outline icons become hard to identify without labels.

---

## 5. Active Nav Indicator Deep Dive

Expanding on Section 3c with specific measurements and accessibility considerations.

### Background Tint Method (Recommended)

The tinted rectangle behind the active item should span the full width of the nav container minus its horizontal padding. On a 240px sidebar with `px-3` (12px each side), the tint rectangle is 216px wide.

```
Active bg color:    rgba(139, 122, 255, 0.08)    /* #8B7AFF at 8% */
Active bg on hover: rgba(139, 122, 255, 0.12)    /* slightly brighter on hover */
Border-radius:      8px (rounded-lg)
Height:             36px (py-2 on text-sm with 18px icon = 36px row)
```

The 8% opacity is calibrated so that on `#0C0B0A`, the tinted area resolves to approximately `#140F1E` -- visible but not garish. At 12% (hover), it becomes `#1A1328`.

### Accessibility: Contrast Ratios

Active text (`#F0EDE8` on `#140F1E`): contrast ratio ~13.8:1. Passes WCAG AAA.
Idle text (`#6B6560` on `#0C0B0A`): contrast ratio ~3.2:1. Passes WCAG AA for large text only. To meet AA for normal text (4.5:1), idle text should be at least `#8A8580` (approximately `#F0EDE8` at 55-58% opacity).

Adjusted idle color for AA compliance:
```
Idle text:   #8A8580    (4.7:1 contrast on #0C0B0A)
Hover text:  #C4C0BA    (~10:1 contrast)
Active text: #F0EDE8    (~14:1 contrast)
```

### Left Border Accent (Alternative)

If Parcel wants a left-border indicator instead of or in addition to the background tint:

```
border-l-2 border-l-[#8B7AFF]
pl-[calc(0.75rem-2px)]    /* Compensate for border width */
```

The 2px left border is visible without being heavy. The `calc()` ensures no layout shift when transitioning from idle (no border) to active (2px border). The alternative is to always render a 2px transparent left border on idle items.

---

## 6. Search / Command Palette Trigger

### Topbar Search Pill

The search trigger in the topbar should look like a muted input field that invites clicking. On dark interfaces, it reads as a recessed slot.

**Dimensions:** 32px height (`h-8`), variable width. On desktop, show placeholder text ("Search or jump to...") and a keyboard shortcut badge. On mobile, show only the search icon.

**Styling:**

```tsx
<button className={cn(
  'flex items-center gap-2 h-8 px-3 rounded-lg',
  'border border-white/[0.06] bg-white/[0.03]',
  'text-[#F0EDE8]/30 text-xs',
  'hover:border-white/[0.10] hover:bg-white/[0.05]',
  'transition-colors duration-150 cursor-pointer'
)}>
  <Search size={14} className="shrink-0" />
  <span className="hidden md:inline">Search or jump to...</span>
  <kbd className={cn(
    'hidden md:inline text-[10px] font-mono',
    'bg-white/[0.06] border border-white/[0.06]',
    'px-1.5 py-0.5 rounded text-[#F0EDE8]/25'
  )}>
    Cmd+K
  </kbd>
</button>
```

### Command Palette Dialog (Dark)

The palette dialog itself should feel like it floats above the page with depth.

```
Overlay:         bg-black/60 backdrop-blur-sm
Dialog:          bg-[#161514] border border-white/[0.08] rounded-xl
                 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)]
Input area:      border-b border-white/[0.06]
                 placeholder text-[#F0EDE8]/25
                 input text: text-[#F0EDE8]
Search icon:     text-[#8B7AFF]
Group heading:   text-[#F0EDE8]/25 text-[10px] uppercase tracking-[0.1em] font-medium
Item idle:       text-[#F0EDE8]/60
Item selected:   bg-[#8B7AFF]/[0.08] text-[#F0EDE8] rounded-lg
Item icon:       text-[#8B7AFF]
Footer:          border-t border-white/[0.06]
                 kbd: bg-white/[0.04] border border-white/[0.06] text-[#F0EDE8]/25
```

Max width: 540px. Top offset: 20vh from the top. Max height for results list: 320px with custom scrollbar (`scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent`).

---

## 7. Topbar on Dark

The topbar is the horizontal bar above the content area, spanning from the sidebar's right edge to the viewport's right edge.

### Dimensions and Layout

- **Height:** 56px (`h-14`). Matches the sidebar logo row so the top border aligns.
- **Background:** Same as content area (`#0C0B0A`). Separated from content below by a 1px bottom border at `border-white/[0.06]`.
- **Horizontal padding:** `px-6 lg:px-8` (24-32px).

### Left Side: Page Title / Breadcrumbs

On dark backgrounds, page titles should use the cream color at high opacity:

```
Title:       text-[#F0EDE8] text-sm font-semibold tracking-tight
Breadcrumb:  text-[#F0EDE8]/40 text-sm
Separator:   ChevronRight at 14px, text-[#F0EDE8]/20
Current:     text-[#F0EDE8] font-medium (aria-current="page")
Link hover:  text-[#F0EDE8]/70 transition-colors duration-150
```

### Right Side: Actions + Search + Avatar

Layout: `flex items-center gap-3`. Right-to-left: user avatar, search pill, page action buttons.

Action buttons on dark use ghost styling:
```
Ghost button:   text-[#F0EDE8]/60 hover:text-[#F0EDE8] hover:bg-white/[0.04]
                border border-white/[0.06] rounded-lg h-8 px-3 text-sm
Primary button: bg-[#8B7AFF] text-white hover:bg-[#7B6AEF] rounded-lg h-8 px-4 text-sm font-medium
```

### Mobile Topbar

On screens below `md` (768px), the topbar adds a hamburger button on the far left:

```
Hamburger:    w-9 h-9 rounded-lg text-[#F0EDE8]/50
              hover:text-[#F0EDE8] hover:bg-white/[0.04]
              transition-colors cursor-pointer
```

A compact logo (icon only, no wordmark) appears next to the hamburger for brand presence.

---

## 8. User Avatar Area

The user section anchors the bottom of the sidebar. It provides identity context and access to account actions.

### Avatar Style

On dark backgrounds, text-based avatars (initials in a colored circle) work better than image avatars at small sizes because they maintain contrast. The avatar should use the accent color at low opacity:

```
Avatar circle:    w-8 h-8 rounded-full
                  bg-[#8B7AFF]/15 border border-[#8B7AFF]/20
                  flex items-center justify-center
Initials:         text-xs font-semibold text-[#8B7AFF]
```

### Sidebar Footer Layout

The user section sits at `mt-auto` in the sidebar flex column, above any trial/billing banner:

```
Container:    px-3 py-3 border-t border-white/[0.06]
Layout:       flex items-center gap-3

Name:         text-sm text-[#F0EDE8] font-medium truncate
Email/role:   text-xs text-[#F0EDE8]/40 truncate
Plan badge:   text-[10px] px-2 py-0.5 rounded-full
              bg-[#8B7AFF]/10 text-[#8B7AFF] font-medium
              (For Pro plan; Free uses bg-white/[0.04] text-[#F0EDE8]/40)
```

### Popover Menu (Dark)

Triggered by clicking the avatar or a chevron:

```
Popover:      w-56 p-1.5 bg-[#161514] border border-white/[0.08]
              shadow-xl rounded-xl
Divider:      border-t border-white/[0.06]
Menu item:    flex items-center gap-2 px-2.5 py-2 rounded-lg
              text-sm text-[#F0EDE8]/60
              hover:bg-white/[0.04] hover:text-[#F0EDE8]
Danger item:  text-red-400 hover:bg-red-500/10 hover:text-red-300
```

---

## 9. Sidebar Collapse: Animation & Mini Mode

### Collapse Trigger

A toggle button in the sidebar header or a keyboard shortcut (`Cmd+\` or `Cmd+[`). The button should be subtle -- a `ChevronsLeft` icon at 16px, `text-[#F0EDE8]/25`, visible on hover of the logo row.

### Animation (Framer Motion)

The collapse animation should feel physical -- a smooth width transition with content fading:

```tsx
const sidebarVariants = {
  expanded: {
    width: 240,
    transition: { duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }
  },
  collapsed: {
    width: 64,
    transition: { duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }
  }
}

const labelVariants = {
  expanded: { opacity: 1, x: 0, transition: { delay: 0.05, duration: 0.15 } },
  collapsed: { opacity: 0, x: -8, transition: { duration: 0.1 } }
}
```

### Mini Mode (64px Rail)

When collapsed, the sidebar becomes a 64px-wide icon rail. Each nav item shows only its icon, centered, with a tooltip on hover showing the label.

```
Rail container:   w-16 bg-[#0C0B0A] border-r border-white/[0.06]
Rail item:        w-10 h-10 mx-auto rounded-lg flex items-center justify-center
                  text-[#F0EDE8]/50 hover:bg-white/[0.04] hover:text-[#F0EDE8]/80
Active rail item: bg-[#8B7AFF]/[0.08] text-[#8B7AFF]
Logo (collapsed): w-10 h-10 mx-auto rounded-lg (icon only, no wordmark)
```

Tooltips: Use a `TooltipProvider` with `delayDuration={300}`. Tooltip appears to the right of the rail item.

```
Tooltip:    bg-[#161514] border border-white/[0.08] text-[#F0EDE8] text-xs
            px-2.5 py-1.5 rounded-lg shadow-lg
```

### Persistence

Store collapsed state in `localStorage` under a key like `parcel:sidebar-collapsed`. Read on mount with a `useState(() => localStorage.getItem(...))` initializer to avoid flash-of-expanded-sidebar.

---

## 10. Mobile Navigation on Dark

### Hamburger + Slide-Out Drawer (Recommended)

This is the current Parcel pattern and should be retained. On dark, the drawer slides from the left over a dimmed backdrop.

```
Backdrop:       bg-black/60 backdrop-blur-sm
Drawer:         w-[280px] bg-[#0C0B0A] border-r border-white/[0.06]
                slide from left, 200ms ease-out
                shadow-[20px_0_60px_-15px_rgba(0,0,0,0.5)]
```

The drawer contains the full sidebar content: logo, nav groups, user section, trial banner. All items use the same styling as the desktop sidebar. Tapping any nav item closes the drawer.

### Bottom Tab Bar (Alternative, Not Recommended)

A persistent bottom tab bar with 4-5 key items (Dashboard, Analyze, Deals, Chat, More). Common in consumer apps but problematic for Parcel:

- Parcel has 8+ nav items; a bottom bar can hold 5 maximum before needing a "More" overflow.
- Financial data tables and analysis results need maximum vertical space on mobile.
- The "More" menu creates a two-level navigation that confuses the IA.

**Verdict: Keep hamburger + drawer.** It preserves vertical space and handles all 8+ items without truncation.

### Gesture Support

Consider adding a swipe-right-from-edge gesture to open the drawer. This is natural on mobile and removes the need to reach the hamburger button:

```tsx
// Detect swipe from left edge (x < 20px start, delta > 60px)
// Use framer-motion's useDragControls or a touch event listener
```

---

## 11. Page Transitions on Dark

Page transitions on dark interfaces must be subtle. Over-animated transitions feel cheap. The goal is to indicate content change without drawing attention to the transition itself.

### Recommended: Opacity + Subtle Y-Shift

```tsx
const pageVariants = {
  initial: { opacity: 0, y: 6 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }
  },
  exit: {
    opacity: 0,
    y: -4,
    transition: { duration: 0.12, ease: [0.25, 0.1, 0.25, 1] }
  }
}
```

Key parameters:
- **Entry y-offset:** 6px (not 8 or 12 -- less is more on dark).
- **Exit y-offset:** -4px (slight upward drift as content leaves).
- **Duration:** 200ms enter, 120ms exit. Exit is faster so the new page appears quickly.
- **Easing:** Cubic bezier `[0.25, 0.1, 0.25, 1]` -- a subtle ease-out.
- **AnimatePresence mode:** `"wait"` -- the exiting page fully leaves before the entering page appears. This prevents two pages rendering simultaneously and causing scroll jumps.

### Avoid on Dark

- Scale transitions (scaling from 0.95 to 1.0) -- these feel "zoomy" and are better for modals.
- Slide-from-right/left -- implies spatial hierarchy that does not exist in a sidebar-based nav.
- Spring physics with bounce -- too playful for a financial tool.
- Blur transitions -- expensive to render and feel gimmicky.

---

## 12. Notification Indicators

Notification badges on nav items signal unread messages, pending actions, or attention-needed states.

### Badge Count (Numeric)

For items with countable notifications (e.g., "Chat 3" for unread messages, "Pipeline 2" for deals needing action):

```
Badge:    min-w-[18px] h-[18px] rounded-full px-1
          bg-[#8B7AFF] text-white text-[10px] font-semibold
          flex items-center justify-center
          leading-none
Position: Right-aligned in the nav row (ml-auto)
```

For counts above 99, display "99+". The pill expands horizontally with `min-w` and `px-1`.

### Dot Indicator (No Count)

For boolean notifications (new document processed, settings need attention):

```
Dot:      w-2 h-2 rounded-full bg-[#8B7AFF]
Position: Absolute, top-right of the icon (top-0 right-0 with -translate-x/y offset)
          or inline after the label
```

On dark backgrounds, the violet dot is clearly visible without needing a border or shadow.

### Pulse Animation (Urgent)

For time-sensitive items (trial expiring, payment failed):

```css
@keyframes notification-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.notification-pulse {
  animation: notification-pulse 2s ease-in-out infinite;
}
```

Or with Tailwind's built-in: `animate-pulse` on the dot element. However, the default `animate-pulse` uses opacity 0 to 1 which is too aggressive. A custom pulse from 1.0 to 0.5 is subtler.

### Ring Pulse (Raycast Style)

A more premium alternative: a ring that expands outward from the dot and fades:

```css
@keyframes ring-pulse {
  0% { transform: scale(1); opacity: 0.6; }
  100% { transform: scale(2.5); opacity: 0; }
}

/* Pseudo-element on the dot */
.dot-ring::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 9999px;
  border: 1px solid #8B7AFF;
  animation: ring-pulse 2s ease-out infinite;
}
```

Use ring-pulse sparingly -- only for genuinely urgent states like payment failure or trial about to expire.

---

## 13. Parcel-Specific Nav Structure on Dark

Mapping Parcel's existing nav groups to the dark theme:

```
[Logo: P mark + "Parcel" wordmark]        [Plan badge: Pro/Free]
--------------------------------------------------------------
Dashboard          LayoutDashboard
New Analysis       Calculator
--------------------------------------------------------------
My Deals           FolderOpen
Pipeline           GitBranch
Portfolio          BarChart3
--------------------------------------------------------------
Chat               MessageSquare         [dot if unread]
Documents          FileText
--------------------------------------------------------------
Pricing            CreditCard
Settings           Settings
--------------------------------------------------------------
[User avatar]  [Name]  [email/plan]
[Trial banner if applicable]
```

The four groups are separated by `border-white/[0.06]` dividers. No group headings. This is the Mercury flat-grouping model adapted for Parcel's item count (10 items across 4 groups).

---

## RECOMMENDATIONS FOR PARCEL

1. **Sidebar background: solid `#0C0B0A` with `border-r border-white/[0.06]`**. Match the content area background. No gradient. The border alone provides sufficient separation. This is the Mercury standard and communicates financial seriousness.

2. **Sidebar width: 240px (`w-60`)**. Industry consensus for SaaS dashboards. Accommodates all Parcel labels plus badge counts. Collapsed state at 64px (`w-16`) with icon-only rail.

3. **Nav item active state: `bg-[#8B7AFF]/[0.08]` background tint + `text-[#8B7AFF]` icon color**. No left border accent (cleaner). Active text at full cream `#F0EDE8` with `font-medium`. This dual signal (background + icon color) is the strongest wayfinding pattern on dark.

4. **Nav item idle text: `#8A8580` (not `#F0EDE8` at 50%)**. This specific value meets WCAG AA contrast (4.7:1) on `#0C0B0A`. Hover brightens to `#C4C0BA`. Transitions at `duration-150`.

5. **Icons: Lucide outline at `strokeWidth={1.5}`**. Thinner than default (2px) for a refined feel. Do not use filled icons in the sidebar. Size 18px for nav items, 14px for topbar actions.

6. **Command palette search pill: `border-white/[0.06] bg-white/[0.03]` with muted placeholder text**. Show "Search or jump to..." and a `Cmd+K` badge on desktop. Icon-only on mobile. The pill should feel recessed, not elevated.

7. **Topbar: 56px height, same background as content, `border-b border-white/[0.06]`**. Page title in `text-[#F0EDE8] text-sm font-semibold`. Breadcrumb links in `text-[#F0EDE8]/40` with `/70` on hover.

8. **User avatar: `bg-[#8B7AFF]/15 border border-[#8B7AFF]/20` circle with violet initials**. Plan badge as a small pill next to the name: `bg-[#8B7AFF]/10 text-[#8B7AFF]` for Pro, `bg-white/[0.04] text-[#F0EDE8]/40` for Free.

9. **Sidebar collapse: Framer Motion width animation (240px to 64px, 200ms, ease-out)**. Labels fade with a 50ms stagger. Mini mode shows centered icons with right-side tooltips. Persist state to localStorage. Keyboard shortcut `Cmd+\`.

10. **Mobile navigation: keep hamburger + slide-out drawer**. Drawer at 280px, `bg-[#0C0B0A]`, slides from left over `bg-black/60 backdrop-blur-sm` overlay. No bottom tab bar -- Parcel needs maximum vertical space for financial data.

11. **Page transitions: opacity + 6px Y-shift, 200ms enter / 120ms exit**. Use `AnimatePresence mode="wait"`. No scale, no slide, no spring bounce. The transition should be felt, not seen.

12. **Notification indicators: violet dot (`w-2 h-2 bg-[#8B7AFF]`) for boolean states, violet pill with count for numeric states**. Reserve pulse animation exclusively for urgent states (trial expiring, payment failed). Position badges `ml-auto` in the nav row.

13. **Flat nav grouping with dividers (no section headers)**. Four groups: Analyze (Dashboard, New Analysis), Manage (My Deals, Pipeline, Portfolio), AI (Chat, Documents), Account (Pricing, Settings). Separated by `border-white/[0.06]` horizontal rules. This is the Mercury model and keeps the sidebar visually clean with 10 items.

14. **Dark command palette dialog: `bg-[#161514]` with `border-white/[0.08]` and deep shadow**. Selected item uses `bg-[#8B7AFF]/[0.08]`. Search icon in `text-[#8B7AFF]`. Footer keyboard hints in `text-[#F0EDE8]/25`.

15. **Implement all nav item colors as CSS custom properties** (not hardcoded Tailwind classes) so they can be swapped between light and dark themes via the existing `.dark` class mechanism. Map to the existing `--app-bg`, `--border-subtle`, `--text-primary`, `--text-secondary`, `--text-muted` token architecture already in `index.css`.
