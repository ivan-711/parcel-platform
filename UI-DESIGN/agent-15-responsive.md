# Agent 15 — Responsive Behavior System

The definitive responsive specification for Parcel. Mobile-first for forms and data display; desktop-first for structural layout (sidebar, Kanban). Every decision references the current codebase state (AppShell.tsx at 216px sidebar, `md:` pivot, Sheet drawer) and research from agents 04 and 14.

**Stack:** React 18 + Tailwind CSS v3 + Framer Motion v11 + shadcn/ui + Recharts v2
**Current breakpoint gate:** `md:768px` toggles sidebar visibility (hamburger Sheet below, fixed sidebar above)

---

## 1. Breakpoint Strategy

Parcel uses Tailwind's default `min-width` breakpoints. No custom breakpoints. The `md:` breakpoint (768px) is the sole structural pivot between mobile and desktop layouts.

| Token | Min-width | Device context | Layout role |
|-------|-----------|----------------|-------------|
| _(base)_ | 0px | iPhone SE (375px), small Android (360px) | Single column everything. Hamburger drawer. Sticky action bars. Card lists replace tables. |
| `sm:` | 640px | iPhone 15 Pro landscape (852px), large phones | 2-column KPI grids. Action buttons begin inline. Hint cards go 2-col. Forms remain single column. |
| `md:` | 768px | iPad Mini, tablets, small laptops | **Sidebar appears** (216px fixed). Tables activate. 2-column form grids. Centered dialogs replace bottom sheets. Content padding: `p-6`. |
| `lg:` | 1024px | Standard laptops, desktops | 4-column KPI grids. Kanban shows 4+ columns. Content: `1024 - 216 = 808px`. Charts at optimal aspect ratios. |
| `xl:` | 1280px | Large desktops, external monitors | Content wrapper hits `max-w-7xl` and begins centering. Pipeline/Chat/Compare remain full-width. Polish tier only. |

### Layout Changes at Each Breakpoint

```
0-639px (base):
  - Navigation: hamburger + Sheet drawer from left
  - Grids: single column (grid-cols-1)
  - Tables: card-list transformation (md:hidden / hidden md:block)
  - Forms: single column, sticky submit at bottom
  - Pipeline: MobilePipeline (tabbed stage view)
  - Chat: full-viewport h-[100dvh]
  - Action buttons: stacked full-width + "More" dropdown
  - Modals: bottom Sheet (slides up)

640-767px (sm):
  - KPI cards: 2-column grid (sm:grid-cols-2)
  - Hint cards: 2-column grid
  - Form fields: still single column (thumb reach priority)
  - Action buttons: inline row begins where space allows
  - Tables: still card-list (not enough width for columns)
  - Navigation: still hamburger drawer (sidebar not visible)

768-1023px (md):
  - Sidebar appears (216px fixed, content = remaining width)
  - Tables: standard horizontal format with overflow-x-auto fallback
  - Pipeline: full Kanban with DnD (compact columns)
  - Forms: optional 2-column layout (md:grid-cols-2)
  - Modals: centered Dialog (replaces bottom Sheet)
  - Sticky submit bars removed (button inline at form end)
  - Content padding: p-6

1024-1279px (lg):
  - KPI cards: 4-column grid (lg:grid-cols-4)
  - Pipeline: 5 Kanban columns comfortable
  - Content width: 1024 - 216 = 808px available
  - Charts: full height, optimal labeling
  - Hint cards: 3-column grid (lg:grid-cols-3)

1280px+ (xl):
  - Content wrapper: max-w-7xl mx-auto on standard pages
  - Full-width opt-out for Pipeline, Chat, Compare
  - Side margins appear on ultra-wide displays
  - No essential layout shifts (polish only)
```

### Authoring Rules

1. **Mobile-first always.** Unprefixed Tailwind classes target mobile (0px+). Layer complexity upward.
2. **Never write desktop-first overrides.** `grid-cols-4 md:grid-cols-2 sm:grid-cols-1` is wrong. `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4` is correct.
3. **`md:` is the only layout pivot.** Mobile-vs-desktop show/hide uses `md:hidden` / `hidden md:flex`. No component uses `sm:` or `lg:` for show/hide toggles.
4. **`xl:` is polish only.** Never put essential layout behind `xl:`.

```tsx
/* CORRECT */
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

/* WRONG */
<div className="grid grid-cols-4 md:grid-cols-2 sm:grid-cols-1 gap-4">
```

---

## 2. Mobile Navigation

### Current State: Hamburger + Sheet Drawer (Keep)

Parcel uses a hamburger button in the Topbar (below `md:`) that opens a `Sheet` drawer from the left. The Sheet contains the full sidebar nav (3 groups, 9 items). The desktop sidebar uses `hidden md:flex` to appear at 768px+.

**Decision: keep the hamburger + Sheet drawer. Do not add a bottom tab bar.**

Agent-04 (layout-navigation) explicitly recommends against a bottom tab bar: "For a data-heavy app like Parcel where users scroll through deal tables and financial projections, maximizing vertical space is more important than persistent nav." A bottom tab bar would consume 64px of vertical space on every page. This is unacceptable for financial data density.

The hamburger adds one extra tap, but Parcel also has a command palette (Cmd+K) that provides zero-tap keyboard navigation, partially offsetting the hamburger friction.

### Required Fix: Hamburger Touch Target

Current: `w-8 h-8` (32px). Below the 44px minimum.

```tsx
{/* Before — 32px, violates touch target minimum */}
<button className="md:hidden flex items-center justify-center w-8 h-8 rounded-lg ...">
  <Menu size={20} />
</button>

{/* After — 44px touch area, icon stays 20px */}
<button className="md:hidden flex items-center justify-center min-w-[44px] min-h-[44px] -ml-2 rounded-lg ...">
  <Menu size={20} />
</button>
```

The `-ml-2` compensates for the increased padding so the icon stays optically aligned with content.

### Bottom Sticky Action Bars (Per-Page)

On pages with primary actions that scroll out of view on mobile, add a sticky bottom bar. These are not navigation — they are contextual action bars.

| Page | Sticky bar content | Condition |
|------|--------------------|-----------|
| AnalyzerFormPage | "Analyze Deal" button, full-width | Always on mobile (below `md:`) |
| ResultsPage | "Save Deal" + "Add to Pipeline" | Always on mobile (below `md:`) |
| Settings | "Save Changes" button | When form is dirty |

Implementation:

```tsx
{/* Sticky action bar — mobile only */}
<div className="fixed bottom-0 inset-x-0 z-40 md:hidden
  bg-app-bg/95 backdrop-blur-sm
  border-t border-border-subtle
  px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
  <Button className="w-full min-h-[48px] text-base font-semibold">
    Analyze Deal
  </Button>
</div>

{/* Content needs bottom padding to clear the bar */}
<div className="pb-24 md:pb-0">
  {/* page content */}
</div>
```

The `pb-[max(0.75rem,env(safe-area-inset-bottom))]` clears the iPhone home indicator. The `pb-24` on content prevents last items from being obscured.

---

## 3. Per-Page Responsive Table

Exact layout behavior at each breakpoint for every page in the app.

### Dashboard (`/dashboard`)

| Element | Base (0-639px) | sm (640-767px) | md (768-1023px) | lg (1024px+) |
|---------|----------------|----------------|-----------------|--------------|
| KPI cards | 1-col stack | 2-col grid | 2-col grid | 4-col grid |
| Recent Deals | **Card list** (tappable) | Card list | Table with `overflow-x-auto`, `min-w-[600px]` | Full table |
| Pipeline summary | 2-col grid | 3-col grid | 3-col grid | Full inline row |
| Activity feed | Full-width vertical list | Full-width list | Full-width list | Full-width list |
| Hint cards | 1-col stack | 2-col grid | 2-col grid | 3-col grid |

### Pipeline (`/pipeline`)

| Element | Base | sm | md | lg+ |
|---------|------|-----|-----|------|
| View mode | `MobilePipeline` (tabbed stages) | `MobilePipeline` | Kanban DnD columns | Kanban DnD columns |
| Stage selector | Horizontal scroll tabs, `snap-x snap-mandatory` | Same | N/A (all columns visible) | N/A |
| Deal cards | Full-width within active tab | Same | 280px min per column | 280px min |
| "Add Deal" | In-tab, full-width button | Same | Per-column header link | Per-column header link |
| Stage move | "Move to..." context menu (existing) | Same | Drag-and-drop | Drag-and-drop |
| Stage count badges | On each tab | Same | Column header | Column header |

### Analyzer Form (`/analyze/:strategy`)

| Element | Base | sm | md | lg+ |
|---------|------|-----|-----|------|
| Form fields | Single column, full-width | Single column | 2-col grid (`md:grid-cols-2`) | 2-col grid |
| Strategy selector | Vertical stack | 2-col grid | Inline horizontal row | Inline row |
| Submit button | **Sticky bottom bar** (fixed) | **Sticky bottom bar** | Inline at form end | Inline at form end |
| Breadcrumbs | Truncated last segment, `text-xs` | Full path visible | Full path | Full path |
| Input adornments ($/%) | Inside input, left/right positioned | Same | Same | Same |

### Results Page (`/analyze/results/:id`)

| Element | Base | sm | md | lg+ |
|---------|------|-----|-----|------|
| KPI cards | 2-col grid | 2-col grid | 2-col grid | 4-col grid (`lg:grid-cols-4`) |
| All Outputs table | Stacked key-value cards (`md:hidden`) | Stacked cards | 2-column table (`hidden md:block`) | 2-column table |
| Cash flow chart | Full-width, `h-[200px]` | Full-width, `h-[240px]` | Full-width, `h-[300px]` | `max-w-3xl`, `h-[300px]` |
| Risk gauge | Centered, full-width | Same | Inline beside chart | Inline beside chart |
| Action buttons | 2 primary full-width + "More Actions" dropdown | Inline wrap (`sm:flex-row`) | Full inline row | Full inline row |
| Stage picker | Full-width `<select>` | Same | Inline dropdown | Inline dropdown |

### My Deals (`/deals`)

| Element | Base | sm | md | lg+ |
|---------|------|-----|-----|------|
| Search input | Full-width (`w-full`) | Full-width | `max-w-sm` right-aligned | `max-w-sm` |
| Deal list | **Card list** (tappable links) | Card list | Table rows with actions | Table rows |
| Pagination | Full-width, centered | Same | Right-aligned | Right-aligned |
| Page header | Stacked: title, then button below | `flex-wrap` | Inline `justify-between` | Inline |

### Compare (`/compare`)

| Element | Base | sm | md | lg+ |
|---------|------|-----|-----|------|
| Comparison table | **Stacked metric cards** with both deal values | Same | Side-by-side table with sticky label column | Full table |
| Deal selectors | Stacked dropdowns (1-col) | Side-by-side | Side-by-side | Side-by-side |
| Radar chart | Full-width, `aspect-square`, max 250px | 300px | 350px | 400px max-width |
| Winner highlight | Green bg on metric card | Same | Green bg on winning table cell | Same |

### AI Chat (`/chat`)

| Element | Base | sm | md | lg+ |
|---------|------|-----|-----|------|
| Container height | `h-[100dvh]` (**not** `h-screen`) | Same | `h-full` (within AppShell) | Same |
| Messages area | `px-4`, full-width | Same | `px-6` | `px-6`, `max-w-3xl mx-auto` |
| Input area | Fixed bottom, `pb-[env(safe-area-inset-bottom)]` | Same | Bottom of flex column | Same |
| Suggestion cards | 1-col, show max 4 | 2-col grid | 2-col grid | 2-col grid |
| Message bubbles | Full-width (up to 85% of viewport) | Same | Max 70% width | Max 65% width |

### Documents (`/documents`)

| Element | Base | sm | md | lg+ |
|---------|------|-----|-----|------|
| Document list | **Card list** (filename, type, size) | Card list | Table rows | Table rows |
| Upload dropzone | Full-width | Same | Same | `max-w-xl mx-auto` |
| Pagination | Full-width centered | Same | Right-aligned | Right-aligned |
| Document detail | Full-width stacked | Same | 2-column (meta sidebar + content) | 2-column |

### Portfolio (`/portfolio`)

| Element | Base | sm | md | lg+ |
|---------|------|-----|-----|------|
| Property cards | 1-col stack | 2-col grid | 2-col grid | 3-col grid |
| Edit button | **Always visible** (touch has no hover) | Same | Hover-reveal (`opacity-0 group-hover:opacity-100`) | Hover-reveal |
| Summary stats | Horizontal scroll, `snap-x` | 2-col grid | Inline row | Inline row |

### Settings (`/settings`)

| Element | Base | sm | md | lg+ |
|---------|------|-----|-----|------|
| Form layout | Single column, full-width | Single column | `max-w-lg mx-auto` | `max-w-lg mx-auto` |
| Save button | **Sticky bottom bar** (when dirty) | Same | Inline at form end | Inline at form end |
| Section tabs (if multi-section) | Horizontal scroll tabs | Same | Vertical sidebar tabs | Vertical sidebar tabs |

### Landing (`/`)

| Element | Base | sm | md | lg+ |
|---------|------|-----|-----|------|
| Hero layout | Stacked: text above DemoCard | Same | Side-by-side (text left, card right) | Side-by-side |
| DemoCard | Full-width | Same | ~50% width | `max-w-md` |
| Features bento | 1-col stack | Same | 2-col bento layout | 2-col large + right card + full-width kanban |
| Pricing cards | 1-col stack | 2-col grid | 3-col grid | 3-col grid |
| Ticker | Full-width marquee, `overflow-hidden` | Same | Same | Same |
| CTA sections | Full-width, stacked | Same | Same with wider padding | Same |

---

## 4. Touch Targets

### Minimum Sizes

All interactive elements must meet **44x44px** minimum touch area on mobile (Apple HIG + WCAG 2.2 Level AAA criterion 2.5.5). Primary action buttons use **48px**.

```
Rule 1: min-h-[44px] min-w-[44px] on every <button>, <a>, and interactive element below md:
Rule 2: min-h-[48px] for primary action buttons (Analyze, Save, Submit)
Rule 3: Icon-only buttons: icon at 16-20px, container at 44x44px (padding fills gap)
Rule 4: Text links in data contexts: wrap with padding to reach 44px height
```

### Spacing Between Adjacent Targets

```
Minimum gap:     8px   (gap-2)  — absolute minimum between tappable elements
Preferred gap:   12px  (gap-3)  — default for button groups, action bars
Nav item gap:    4px   (space-y-1)  — full-width nav items only need vertical separation
```

### Current Violations and Fixes

| Component | Current | Target | Fix |
|-----------|---------|--------|-----|
| Hamburger button (Topbar) | `w-8 h-8` (32px) | 44x44px | `min-w-[44px] min-h-[44px] -ml-2` |
| Command palette trigger | `px-2 py-1.5` (~30px tall) | 44px tall | Add `min-h-[44px]` |
| User menu avatar | `w-8 h-8` (32px) | 44x44px | `min-w-[44px] min-h-[44px]` |
| Table row "View" links | Text-only (~20px tall) | 44px tall | `inline-flex items-center min-h-[44px] px-3` |
| Breadcrumb links | `text-xs`, no padding | 44px tall | `min-h-[44px] inline-flex items-center` on mobile |
| Pagination Previous/Next | Varies | 44x44px | `min-h-[44px] min-w-[44px]` |
| Pipeline stage tabs | `min-h-[44px]` | 44px | Already correct |
| Chat send button | `w-11 h-11` (44px) | 44px | Already correct |

### Utility Classes

Add to `index.css`:

```css
@layer utilities {
  .touch-target {
    @apply min-h-[44px] min-w-[44px] flex items-center justify-center;
  }
  .touch-target-lg {
    @apply min-h-[48px] min-w-[48px] flex items-center justify-center;
  }
}
```

### Pattern for Icon-Only Buttons

```tsx
<button className="touch-target rounded-lg
  active:bg-app-elevated/50 transition-colors">
  <Icon size={20} />
</button>
```

### Pattern for Text Links in Lists

```tsx
<Link className="inline-flex items-center min-h-[44px] px-3
  text-accent-primary text-sm font-medium
  active:opacity-70 transition-opacity">
  View deal
</Link>
```

---

## 5. Mobile Components: Bottom Sheet / Desktop Dialog

### Pattern

Use shadcn's `Sheet` (from bottom) on mobile and `Dialog` (centered) on desktop. This matches platform conventions: iOS/Android users expect bottom drawers, desktop users expect centered modals.

### Decision Matrix

| Interaction | Mobile (< md) | Desktop (>= md) |
|-------------|---------------|------------------|
| Confirmations (delete, close deal) | `AlertDialog` (centered, both) | `AlertDialog` |
| Offer letter preview | Bottom `Sheet` (full height) | `Dialog` (`max-w-2xl`) |
| Pipeline "Move to..." | Bottom `Sheet` (half height) | `Popover` |
| Document upload | Bottom `Sheet` | `Dialog` |
| Share deal | Bottom `Sheet` | `Popover` |
| "More Actions" on Results | Bottom `Sheet` with action list | `DropdownMenu` |
| Nav overflow ("More" items) | Part of Sheet drawer | N/A (sidebar visible) |

**Exception:** `AlertDialog` (destructive confirmations) is always centered on both mobile and desktop. Destructive actions should feel deliberate, not swipeable.

### ResponsiveModal Component

```tsx
// components/ui/responsive-modal.tsx
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

interface ResponsiveModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  children: React.ReactNode
}

export function ResponsiveModal({ open, onOpenChange, title, children }: ResponsiveModalProps) {
  const isDesktop = useMediaQuery('(min-width: 768px)')

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>
          {children}
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[85vh] rounded-t-2xl
        pb-[env(safe-area-inset-bottom)] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
        </SheetHeader>
        <div className="overflow-y-auto px-1">{children}</div>
      </SheetContent>
    </Sheet>
  )
}
```

### Bottom Sheet Visual Specs

```
Border radius:     rounded-t-2xl (16px top corners)
Max height:        85vh (85% of viewport)
Handle indicator:  Optional — 4px tall, 40px wide, centered, bg-border-default, rounded-full
Backdrop:          bg-black/40 backdrop-blur-sm
Animation:         Slide up from bottom, 200ms ease-out (Framer Motion or Sheet default)
Safe area:         pb-[env(safe-area-inset-bottom)]
Dismiss:           Swipe down or tap backdrop
```

### useMediaQuery Hook

```tsx
// hooks/useMediaQuery.ts
import { useState, useEffect } from 'react'

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(query).matches
  )

  useEffect(() => {
    const mql = window.matchMedia(query)
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches)
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [query])

  return matches
}
```

---

## 6. Form Behavior

### Single-Column Rule

All forms render single-column on mobile. Two-column is optional at `md:` and above. This is non-negotiable for thumb-reachability on one-handed use.

```tsx
<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
  {fields.map(field => (
    <div key={field.name} className="space-y-1.5">
      <Label htmlFor={field.name}>{field.label}</Label>
      <Input id={field.name} {...register(field.name)} />
    </div>
  ))}
</div>
```

### `inputMode="decimal"` for Money Fields

**Never use `type="number"`.** It adds spinners, allows `e`/`+`/`-` characters, and triggers auto-zoom on iOS for fonts < 16px.

```tsx
<Input
  type="text"                // NOT type="number"
  inputMode="decimal"        // triggers numeric keyboard on iOS/Android
  pattern="[0-9]*"           // iOS simple numeric pad hint
  autoComplete="off"
  className="font-mono"      // JetBrains Mono for financial figures
/>
```

This applies to **every** financial input across all 5 strategy calculators:

- Purchase price, ARV, asking price, offer price
- Monthly rent, expenses, insurance, taxes, HOA
- Rehab cost, holding costs, closing costs
- Interest rate, cap rate, down payment percentage
- Cash-on-cash return, loan amount, loan term

### Input Adornments

Dollar signs and percent symbols go inside the input as positioned adornments, not in the label:

```tsx
{/* Dollar adornment (left) */}
<div className="relative">
  <span className="absolute left-3 top-1/2 -translate-y-1/2
    text-text-muted text-sm font-mono pointer-events-none">$</span>
  <Input className="pl-7 font-mono" inputMode="decimal" pattern="[0-9]*" />
</div>

{/* Percent adornment (right) */}
<div className="relative">
  <Input className="pr-8 font-mono" inputMode="decimal" />
  <span className="absolute right-3 top-1/2 -translate-y-1/2
    text-text-muted text-sm font-mono pointer-events-none">%</span>
</div>
```

### Sticky Submit Button

BRRRR (12+ fields) and Creative Finance (10+ fields) push the submit button below the fold. Pin it on mobile:

```tsx
{/* Sticky submit — mobile only */}
<div className="sticky bottom-0 z-30 -mx-4 mt-6
  bg-app-bg/95 backdrop-blur-sm border-t border-border-subtle
  p-4 pb-[max(1rem,env(safe-area-inset-bottom))]
  md:relative md:m-0 md:z-auto md:border-0 md:bg-transparent md:backdrop-blur-none md:p-0">
  <Button type="submit" className="w-full md:w-auto min-h-[48px] text-base font-semibold">
    Analyze Deal
  </Button>
</div>
```

### Field Grouping on Long Forms

For BRRRR (Purchase, Rehab, Refinance sections), use `<fieldset>` with `<legend>`:

```tsx
<div className="space-y-6">
  <fieldset>
    <legend className="text-sm font-semibold text-text-primary mb-3">
      Purchase Details
    </legend>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {purchaseFields.map(field => ...)}
    </div>
  </fieldset>
  <fieldset>
    <legend className="text-sm font-semibold text-text-primary mb-3">
      Rehab Costs
    </legend>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {rehabFields.map(field => ...)}
    </div>
  </fieldset>
</div>
```

### Validation on Mobile

- Scroll first invalid field into view: `element.scrollIntoView({ behavior: 'smooth', block: 'center' })`
- Show inline error messages below each field: `<p className="text-accent-danger text-sm mt-1">{error}</p>`
- Trigger `useShake` on the form container (already implemented)
- Toast for server errors only; inline for field validation

---

## 7. Table to Card Transformation Pattern

### Core Pattern

Use `md:hidden` / `hidden md:block` to render completely different markup per breakpoint. Both exist in the DOM; CSS hides one.

```tsx
{/* Mobile: tappable card list */}
<div className="md:hidden space-y-2">
  {items.map(item => (
    <Link
      key={item.id}
      to={item.href}
      className="block p-3 rounded-xl bg-app-surface border border-border-subtle
        active:bg-app-elevated transition-colors"
    >
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-medium text-text-primary truncate max-w-[70%]">
          {item.title}
        </span>
        {item.badge && <StrategyBadge strategy={item.badge} />}
      </div>
      <div className="flex items-center gap-3 text-xs text-text-secondary flex-wrap">
        {item.meta.map((m, i) => (
          <span key={i} className={m.mono ? 'font-mono' : ''}>{m.value}</span>
        ))}
      </div>
    </Link>
  ))}
</div>

{/* Desktop: standard table */}
<div className="hidden md:block overflow-x-auto">
  <table className="w-full">
    {/* existing table markup */}
  </table>
</div>
```

### Card Design Rules

```
Background:       bg-app-surface
Border:           border border-border-subtle
Border radius:    rounded-xl (12px)
Padding:          p-3 (12px)
Active state:     active:bg-app-elevated (touch feedback)
Transition:       transition-colors duration-150
Primary text:     text-sm font-medium text-text-primary, truncate (never 2 lines)
Meta text:        text-xs text-text-secondary
Financial values: font-mono text-sm (JetBrains Mono)
Badge:            right-aligned in top row
Card tap target:  entire card is a <Link>, min height >= 60px from padding + content
```

### Per-Page Card Content

| Page | Primary (title) | Badge | Meta line items |
|------|-----------------|-------|-----------------|
| Dashboard — Recent Deals | Address or "Untitled Deal" | Strategy | Risk score, Status, Time ago |
| My Deals | Address | Strategy | Risk score, Status, Created date |
| Documents | Filename (truncated) | File type icon | File size, Upload date |
| Portfolio | Property address | Strategy | Monthly cash flow (`font-mono`), Total equity |
| Pipeline (MobilePipeline) | Address | Stage color | Strategy, Added date |

### Compare Table Transformation

Compare is the hardest table to mobilize because it is inherently columnar (Deal A vs Deal B). On mobile, each metric becomes a mini-card showing both values:

```tsx
{/* Mobile: stacked metric cards */}
<div className="md:hidden space-y-3">
  {metrics.map(metric => (
    <div key={metric.key} className="p-3 rounded-lg bg-app-surface border border-border-subtle">
      <p className="text-xs text-text-muted mb-2">{metric.label}</p>
      <div className="flex justify-between">
        <div className="text-center">
          <span className="font-mono text-sm text-text-primary">{metric.dealA}</span>
          <p className="text-[10px] text-text-muted mt-0.5">{dealAName}</p>
        </div>
        <div className="text-center">
          <span className="font-mono text-sm text-text-primary">{metric.dealB}</span>
          <p className="text-[10px] text-text-muted mt-0.5">{dealBName}</p>
        </div>
      </div>
    </div>
  ))}
</div>
```

---

## 8. Chart Responsive Behavior

### General Rules

All Recharts charts must:

1. Wrap in `<ResponsiveContainer width="100%" height={...}>` -- never fixed pixel widths
2. Sit inside a container with `min-w-0` to prevent flex overflow (common Recharts gotcha)
3. Scale height via responsive Tailwind classes on the wrapper div

### Height per Breakpoint

Use Tailwind responsive classes on the chart wrapper, not dynamic JS:

```tsx
<div className="w-full min-w-0 h-[200px] sm:h-[240px] md:h-[300px] lg:h-[350px]">
  <ResponsiveContainer width="100%" height="100%">
    <AreaChart data={data}>...</AreaChart>
  </ResponsiveContainer>
</div>
```

| Chart | Base | sm | md | lg+ |
|-------|------|-----|-----|------|
| Cash Flow Projection (AreaChart) | 200px | 240px | 300px | 350px |
| Comparison Radar (RadarChart) | 250px (aspect-square) | 300px | 350px | 400px |
| Dashboard sparklines | 32px | 32px | 40px | 40px |

### Axis Optimization for Mobile

On small screens, axis labels overlap. Reduce density:

```tsx
<XAxis
  dataKey="month"
  tick={{ fontSize: isMobile ? 10 : 12 }}
  interval={isMobile ? 2 : 0}           // show every 3rd label on mobile
  tickFormatter={val => isMobile ? val.slice(0, 3) : val}  // "Jan" vs "January"
/>

<YAxis
  tick={{ fontSize: isMobile ? 10 : 12 }}
  tickFormatter={val => val >= 1000 ? `$${(val / 1000).toFixed(0)}k` : `$${val}`}
  width={isMobile ? 45 : 60}
/>
```

### Radar Chart Scaling

The ComparisonRadar (6 dimensions) gets cramped below 300px. Adjustments:

```tsx
<Radar outerRadius={isMobile ? '60%' : '75%'} />
<PolarAngleAxis tick={{ fontSize: isMobile ? 10 : 12 }} />
```

### Tooltip Touch Behavior

Recharts tooltips activate on tap (touch events) by default. Ensure tooltips do not extend beyond viewport:

```tsx
<Tooltip
  contentStyle={{
    backgroundColor: 'var(--app-surface, #0F0F1A)',
    border: '1px solid var(--border-subtle, #1A1A2E)',
    borderRadius: '8px',
    maxWidth: '250px',
    fontSize: '12px',
  }}
  wrapperStyle={{ zIndex: 50 }}
/>
```

### Container Queries (Future)

When container query support is needed, wrap chart divs with `@container`:

```tsx
<div className="@container w-full min-w-0">
  {/* Future: @sm:h-[300px] @md:h-[350px] for container-width-based sizing */}
</div>
```

This is a Phase 3+ enhancement. For now, viewport-based responsive classes are sufficient.

---

## 9. PWA Meta Tags and Viewport Config

### Viewport Meta (Current State)

The current `index.html` has:

```html
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
```

**Do not add `maximum-scale=1` or `user-scalable=no`.** These violate WCAG 2.1 Level AA criterion 1.4.4 (Resize text) by preventing pinch-to-zoom. Users who need to zoom into financial data must be able to do so.

To prevent iOS Safari's auto-zoom on form focus (triggered by font-size < 16px), ensure all `<input>` elements have `text-base` (16px) or larger on mobile, rather than disabling zoom globally.

### Add `viewport-fit=cover` for Safe Areas

Update the viewport meta to enable `env(safe-area-inset-*)` CSS functions:

```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
```

This is required for `env(safe-area-inset-bottom)` to work on iPhones with the home indicator.

### PWA Meta Tags to Add

Add to `<head>` in `index.html`:

```html
<!-- PWA: theme color (matches app background) -->
<meta name="theme-color" content="#08080F" />

<!-- iOS standalone mode -->
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
<meta name="apple-mobile-web-app-title" content="Parcel" />

<!-- iOS home screen icon -->
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />

<!-- Android web app manifest -->
<link rel="manifest" href="/manifest.json" />

<!-- Prevent telephone number auto-detection on iOS -->
<meta name="format-detection" content="telephone=no" />
```

### Web App Manifest

Create `/public/manifest.json`:

```json
{
  "name": "Parcel — Real Estate Intelligence",
  "short_name": "Parcel",
  "description": "Deal analysis, pipeline management, and AI-powered insights for real estate investors.",
  "start_url": "/dashboard",
  "display": "standalone",
  "background_color": "#08080F",
  "theme_color": "#6366F1",
  "orientation": "any",
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icon-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ]
}
```

### Required Icon Assets (place in `/public/`)

```
icon-192.png           — 192x192, Parcel logo centered on #08080F
icon-512.png           — 512x512, same design
apple-touch-icon.png   — 180x180, no transparency (iOS clips to rounded rect)
favicon.ico            — 32x32 standard favicon
```

### `100dvh` for Full-Height Pages

Chat and any full-height layout must use `h-[100dvh]` on mobile, not `h-screen`:

```tsx
<div className="flex flex-col h-[100dvh] md:h-full">
  {/* Chat or full-height layout */}
</div>
```

`100dvh` (dynamic viewport height) accounts for the mobile browser address bar appearing/disappearing. `100vh` / `h-screen` always uses the maximum height, causing content to hide behind the address bar when it is visible.

### Safe Area Insets

For all fixed/sticky elements on mobile, add safe area padding:

```css
/* Bottom-pinned elements (sticky bars, chat input) */
padding-bottom: max(0.75rem, env(safe-area-inset-bottom));

/* Full-bleed sidebars */
padding-left: env(safe-area-inset-left);
padding-right: env(safe-area-inset-right);
```

### Service Worker (Deferred)

A service worker with cache-first for static assets and network-first for API calls is a Phase 3+ item. It would enable offline app shell loading and cached deal data via React Query persistence. Deferred because cache invalidation during deployments and background sync for API mutations add maintenance complexity that is not warranted at this stage.

---

## 10. Testing: Device Sizes to Verify

### Required Test Matrix

Every responsive change must be verified at these viewport widths. P0 devices are mandatory before any merge.

| Device | Width | Height | Pixel ratio | Priority | Why |
|--------|-------|--------|-------------|----------|-----|
| iPhone SE (3rd gen) | 375px | 667px | 2x | **P0** | Smallest supported phone. Stress-tests truncation, stacking, overflow. |
| iPhone 15 Pro | 393px | 852px | 3x | **P0** | Most common current iPhone. Primary field-use device. |
| Pixel 8 | 412px | 915px | 2.625x | **P0** | Most common Android. Tests slightly wider mobile. |
| iPad Mini (6th gen) | 768px | 1024px | 2x | **P0** | Exact `md:` breakpoint. Sidebar pivot boundary. |
| MacBook Air 13" | 1280px | 800px | 2x | **P0** | `xl:` breakpoint. Content max-width kicks in. |
| iPhone 15 Pro Max | 430px | 932px | 3x | P1 | Large phone. Tests wider mobile card layouts. |
| iPad Air | 820px | 1180px | 2x | P1 | Standard tablet. Tests sidebar + content spacing. |
| MacBook Pro 14" | 1512px | 982px | 2x | P1 | Standard laptop. Tests content centering. |
| External display | 1920px | 1080px | 1x | P1 | Desktop. Tests max-width + side margins. |

### Chrome DevTools Custom Devices

Add these presets in DevTools > Settings > Devices:

```
Parcel Mobile S:    375 x 667  (2x)   — iPhone SE (P0)
Parcel Mobile M:    393 x 852  (3x)   — iPhone 15 Pro (P0)
Parcel Mobile L:    430 x 932  (3x)   — iPhone 15 Pro Max
Parcel Android:     412 x 915  (2.6x) — Pixel 8 (P0)
Parcel Tablet:      768 x 1024 (2x)   — iPad Mini / md: boundary (P0)
Parcel Desktop S:   1024 x 768         — lg: breakpoint
Parcel Desktop M:   1280 x 800         — xl: breakpoint (P0)
Parcel Desktop L:   1920 x 1080        — Full HD
```

### Per-Page Verification Checklist

At each P0 viewport, for each page:

- [ ] No horizontal overflow / unexpected scrollbar on `<body>`
- [ ] All interactive elements >= 44px touch target
- [ ] Text readable without zoom (min 14px body, 12px labels)
- [ ] No content hidden behind sticky bars, safe areas, or browser chrome
- [ ] `active:` states provide visible touch feedback on cards and buttons
- [ ] Financial numbers render in JetBrains Mono (`font-mono`)
- [ ] Forms trigger correct keyboard (`inputMode="decimal"` verification)
- [ ] Charts render without clipping, overflow, or overlapping labels
- [ ] Tables transform to card lists below `md:`
- [ ] Sticky submit bars appear on analyzer forms below `md:`

### Critical Pages to Test at Every Viewport

1. **Dashboard** -- KPI grid reflow, recent deals table/card, hint cards, activity feed
2. **Pipeline** -- MobilePipeline (tabbed) vs Kanban (DnD) toggle at `md:`
3. **Analyzer Form** -- Single column, numeric keyboard, sticky submit, field grouping
4. **ResultsPage** -- KPI cards, outputs table/cards, action buttons, cash flow chart
5. **Chat** -- `100dvh` layout, input positioning, safe-area clearance, message width
6. **Compare** -- Table-to-card transformation, radar chart sizing, winner highlight
7. **Landing** -- Hero layout, DemoCard tabs, pricing cards, ticker

### Automated Viewport Tests (Playwright)

```ts
const VIEWPORTS = [
  { name: 'mobile-se', width: 375, height: 667 },
  { name: 'mobile-pro', width: 393, height: 852 },
  { name: 'tablet-md', width: 768, height: 1024 },
  { name: 'desktop-xl', width: 1280, height: 800 },
]

for (const vp of VIEWPORTS) {
  test.describe(`Layout at ${vp.name} (${vp.width}px)`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } })

    test('sidebar visibility', async ({ page }) => {
      await page.goto('/dashboard')
      if (vp.width < 768) {
        await expect(page.locator('aside')).toBeHidden()
      } else {
        await expect(page.locator('aside')).toBeVisible()
      }
    })

    test('deals display mode', async ({ page }) => {
      await page.goto('/dashboard')
      if (vp.width < 768) {
        await expect(page.locator('[data-testid="deals-card-list"]')).toBeVisible()
        await expect(page.locator('[data-testid="deals-table"]')).toBeHidden()
      } else {
        await expect(page.locator('[data-testid="deals-table"]')).toBeVisible()
        await expect(page.locator('[data-testid="deals-card-list"]')).toBeHidden()
      }
    })
  })
}
```

### Real Device Testing (Pre-Launch)

Before production launch, test on physical devices:

1. **iPhone (any model with Dynamic Island)** -- safe area insets, `100dvh`, Safari keyboard push-up, PDF download via `window.open`
2. **Android phone (Chrome)** -- `inputMode="decimal"` keyboard, address bar hide/show with `100dvh`
3. **iPad (any model)** -- sidebar pivot at 768px, touch targets at tablet scale

---

## CRITICAL DECISIONS

These are binding architectural decisions. They are constraints, not suggestions. Violating them requires explicit approval and documented rationale.

### CD-1: `md:` (768px) is the sole layout pivot

All mobile-vs-desktop layout swaps use `md:` as the breakpoint. `sm:` and `lg:` adjust grid columns and spacing within the same layout mode; they never toggle show/hide or switch component variants. This means `md:hidden` / `hidden md:flex` for sidebar, tables, action bars, and modal types.

### CD-2: No bottom tab bar

Mobile navigation is hamburger + Sheet drawer. A bottom tab bar was evaluated (agent-14 Section 2) and rejected (agent-04 Section 9). Rationale: vertical space is more valuable than persistent nav for Parcel's data-dense financial pages. The command palette (Cmd+K) provides a zero-tap keyboard alternative. Revisit only if field-use analytics show >60% of mobile sessions navigate between 3+ pages.

### CD-3: Tables become card lists below `md:`

Every data table (Dashboard deals, My Deals, Documents) renders as a tappable card list on mobile via dual markup (`md:hidden` / `hidden md:block`). No horizontal-scrolling tables on phones. Both markup paths exist in the DOM simultaneously; CSS controls visibility. The `ResponsiveList` component pattern standardizes this.

### CD-4: `inputMode="decimal"` on all financial inputs

Never `type="number"`. This is a permanent, codebase-wide rule for all 5 strategy calculators and any future financial input. Paired with `pattern="[0-9]*"` for iOS and `className="font-mono"` for JetBrains Mono rendering.

### CD-5: 44px minimum touch targets (non-negotiable)

Every interactive element must have a 44x44px minimum touch area on mobile. Primary action buttons use 48px. This satisfies Apple HIG, WCAG 2.2, and Parcel's field-use requirement (one-handed operation at a property). Violations are flagged in code review. The `touch-target` utility class enforces this.

### CD-6: Sticky action bars on mobile forms

Analyzer form submit and results page primary actions pin to the bottom of the viewport on mobile. They use `backdrop-blur-sm`, `bg-app-bg/95`, and `pb-[env(safe-area-inset-bottom)]`. Content gets `pb-24` to prevent the last items from being obscured.

### CD-7: `100dvh` for full-height pages

Chat and any full-height layout use `h-[100dvh]` on mobile, not `h-screen` or `h-full` on the outermost container. This accounts for the dynamic mobile browser chrome. The `overscroll-behavior-y-contain` property prevents rubber-band scroll from propagating to the parent page on iOS.

### CD-8: Bottom Sheet on mobile, Dialog on desktop

All modals except `AlertDialog` use the `ResponsiveModal` pattern: bottom Sheet below `md:`, centered Dialog at `md:+`. The `useMediaQuery('(min-width: 768px)')` hook drives the switch at runtime. `AlertDialog` is always centered (destructive actions must feel deliberate).

### CD-9: Charts use `ResponsiveContainer` with no fixed widths

Every Recharts chart wraps in `<ResponsiveContainer width="100%">`. Height is controlled by responsive Tailwind classes on the wrapper div (`h-[200px] sm:h-[240px] md:h-[300px]`). No chart ever has a fixed pixel width. Wrapper divs include `min-w-0` to prevent flex overflow.

### CD-10: PWA manifest ships immediately

`manifest.json`, `<meta name="theme-color">`, Apple-specific meta tags, and icon assets are added now. This is minimal effort (manifest + 3 icon files) with high impact on mobile return-visit rate via "Add to Home Screen." Service worker and offline support are deferred to Phase 3+.

### CD-11: Never disable zoom

The viewport meta tag never includes `maximum-scale=1` or `user-scalable=no`. These violate WCAG 2.1 Level AA criterion 1.4.4 and harm users who need to zoom into financial data. To prevent iOS auto-zoom on input focus, inputs should use `text-base` (16px) on mobile rather than disabling zoom globally.

### CD-12: Mobile-first CSS authoring

All Tailwind classes are mobile-first: unprefixed = mobile, `sm:` = larger phones, `md:` = desktop layout, `lg:` = expanded grids. Desktop-first patterns (writing `lg:hidden` to hide desktop-only elements on mobile) are banned. The correct pattern is always "start small, add complexity upward."
