# Card & Container Design Patterns for Parcel Light Theme

## 1. Current State Audit

Parcel's existing dark theme uses a consistent card pattern across all surfaces:

```
rounded-xl border border-border-subtle bg-app-surface p-5
```

Key characteristics of the current system:
- **Border-driven separation**: `border-[#1A1A2E]` (subtle border on dark surface)
- **No shadows**: Cards rely entirely on border + background contrast for depth
- **Uniform radius**: `rounded-xl` (12px) everywhere
- **Uniform padding**: `p-5` (20px) on most cards, `p-4` on pipeline deal cards
- **No hover states**: Cards are static containers, not interactive surfaces (except deal cards which show menu on hover)
- **Hardcoded colors**: Many components use raw hex values (`bg-[#0F0F1A]`, `border-[#1A1A2E]`) instead of semantic tokens

This approach works in dark mode where border contrast is naturally low. On a light background, the same pattern would feel heavy and dated. The transition requires rethinking depth, separation, and interactivity.

---

## 2. Reference Analysis

### 2a. Mercury

Mercury's card language is defined by restraint:
- **Border**: 1px `border-gray-200` equivalent (~`#E5E7EB`) -- never darker
- **Shadow**: None by default; `shadow-xs` (`0 1px 2px rgba(0,0,0,0.05)`) on elevated cards
- **Background**: Pure white (`#FFFFFF`) on a warm off-white page (`#FAFAFA` or `#F9FAFB`)
- **Radius**: 12px consistently
- **Padding**: Generous -- 24px on standard cards, 20px on compact cards
- **Hover**: None on static cards; subtle border color shift on interactive cards
- **Internal spacing**: Clear section dividers using `border-b border-gray-100` (lighter than outer border)

Mercury's insight: the card itself should disappear. Content hierarchy does the work. Borders exist only to define boundaries, not to draw attention.

### 2b. Linear

Linear takes a flatter approach:
- **Border**: 1px, very subtle -- almost imperceptible (`rgba(0,0,0,0.06)` equivalent)
- **Shadow**: None on most cards; `shadow-sm` on modals/dropdowns only
- **Background**: White on `#F8F8F8` page background
- **Radius**: 8px (tighter than Mercury)
- **Padding**: 16px on list items, 20px on detail cards
- **Hover**: Background shift to `gray-50` on interactive items; no border change
- **Separation strategy**: Relies on spacing between cards rather than visible borders

Linear's insight: when content density is high (issue lists, kanban), reduce card chrome to zero. Let content breathe through whitespace, not decoration.

### 2c. Stripe

Stripe uses shadow as primary depth cue:
- **Border**: Optional -- some cards use `border-gray-200`, others use shadow alone
- **Shadow**: `shadow-sm` (`0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)`) is the default
- **Background**: White on `#F6F9FC` (Stripe's signature cool off-white)
- **Radius**: 8px on cards, 6px on inner elements
- **Padding**: 24px on primary cards, 16px on nested elements
- **Hover**: Shadow deepens on interactive cards (`shadow-md` transition)
- **Nested cards**: Inner sections use `bg-gray-50` with no border (inset look)

Stripe's insight: shadow creates natural hierarchy. A card with `shadow-sm` on a flat background immediately reads as "elevated content." The shadow replaces the border's job while feeling more refined.

---

## 3. Recommended Card Foundation for Parcel

### Base Card (Non-Interactive)

The standard container for all static content -- KPI groups, results tables, charts, form sections.

```
bg-white rounded-xl border border-gray-200/60 shadow-[0_1px_2px_rgba(0,0,0,0.04)]
```

Tailwind utility breakdown:
- `bg-white` -- pure white surface
- `rounded-xl` -- 12px radius (keep current value for continuity)
- `border border-gray-200/60` -- 60% opacity gray border, subtle but present
- `shadow-[0_1px_2px_rgba(0,0,0,0.04)]` -- barely-there shadow for grounding

Padding scale:
- Standard: `p-6` (24px) -- KPI cards, chart containers, form sections
- Compact: `p-4` (16px) -- pipeline deal cards, list items
- Dense: `p-3` (12px) -- document cards in grid view

### Interactive Card

For cards that navigate or trigger actions -- deal cards, portfolio entries, document cards.

```tsx
// Base
className="bg-white rounded-xl border border-gray-200/60 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-all duration-150"

// Hover (applied via group-hover or direct hover)
className="hover:shadow-[0_2px_8px_rgba(0,0,0,0.08)] hover:border-gray-300/80"

// Active/pressed
className="active:shadow-[0_1px_2px_rgba(0,0,0,0.04)] active:scale-[0.995]"
```

The hover state deepens the shadow rather than changing border color. This is the Mercury/Stripe pattern -- shadow as interactive feedback.

### Selected Card

For pipeline cards in a selected/focused state, or multi-select in compare view.

```tsx
className="bg-white rounded-xl border-2 border-indigo-500 shadow-[0_0_0_3px_rgba(99,102,241,0.12)]"
```

Double signal: thicker indigo border + indigo ring glow. This replaces the current `ring-2 ring-[#6366F1]/60 ring-offset-2` which works on dark but looks harsh on light.

---

## 4. Card Type Specifications

### 4a. KPI / Stat Cards

Dashboard and results page headline metrics. These are the most visually prominent cards.

```tsx
function KPICard({ label, value, delta, sparklineData }: KPICardProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200/60 shadow-[0_1px_2px_rgba(0,0,0,0.04)] p-6 space-y-1 overflow-hidden">
      {/* Label */}
      <p className="text-[11px] font-medium text-gray-500 uppercase tracking-[0.08em]">
        {label}
      </p>
      {/* Value -- JetBrains Mono, large */}
      <p className="text-[32px] font-semibold font-mono text-gray-900 leading-tight">
        {formattedValue}
      </p>
      {/* Delta indicator */}
      {delta !== undefined && (
        <div className={cn(
          "inline-flex items-center gap-1 text-xs font-mono font-medium rounded-full px-1.5 py-0.5",
          delta >= 0
            ? "text-emerald-700 bg-emerald-50"
            : "text-red-700 bg-red-50"
        )}>
          {delta >= 0 ? '+' : ''}{delta.toFixed(1)}%
        </div>
      )}
      {/* Sparkline -- bleeds to card edges */}
      {sparklineData && (
        <div className="mt-3 -mx-6 -mb-6">
          <ResponsiveContainer width="100%" height={56}>
            <AreaChart data={chartData}>...</AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
```

Key decisions for KPI cards:
- **Value size**: 32px (down from current 36px `text-4xl`). On light backgrounds, large dark numbers feel heavier; dial back slightly.
- **Delta badge**: Use a pill with tinted background (`bg-emerald-50 text-emerald-700`) instead of bare colored text. On light backgrounds, colored text alone lacks contrast.
- **Sparkline bleed**: Negative margin to edge-bleed the sparkline creates a polished, data-visualization feel. Keep this pattern from the current implementation.
- **Font**: JetBrains Mono remains mandatory for all numeric values.

### 4b. Form Cards (Calculator Inputs)

The analyzer forms group related inputs into sections. Each section is a card.

```tsx
<div className="bg-white rounded-xl border border-gray-200/60 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
  {/* Section header */}
  <div className="px-6 py-4 border-b border-gray-100">
    <h3 className="text-sm font-semibold text-gray-900">Property Details</h3>
    <p className="text-xs text-gray-500 mt-0.5">Basic information about the property</p>
  </div>
  {/* Field grid */}
  <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-5">
    {/* Label above input (not inline) */}
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-gray-600">Purchase Price</Label>
      <Input className="bg-gray-50 border-gray-200 font-mono" />
    </div>
  </div>
</div>
```

Form card guidelines:
- **Label placement**: Always above the input (not inline, not floating). This is the Mercury/Linear standard for data-dense forms.
- **Input background**: `bg-gray-50` provides subtle inset feel inside the white card. Avoids the "white on white" flatness problem.
- **Grid**: 2-column on `sm:` and up, single column on mobile. `gap-x-4 gap-y-5` balances density with readability.
- **Section divider**: `border-b border-gray-100` between header and fields. Lighter than the card's outer border.
- **Field grouping**: Related fields (e.g., "Purchase Price" + "ARV" + "Rehab Cost") share a card. Unrelated groups get separate cards with `gap-6` between them.

### 4c. Results Cards (Calculator Outputs)

The results page has two distinct card types: the outputs table and the risk gauge panel.

**Outputs Table Card:**
```tsx
<div className="bg-white rounded-xl border border-gray-200/60 shadow-[0_1px_2px_rgba(0,0,0,0.04)] overflow-hidden">
  <div className="px-5 py-3.5 border-b border-gray-100">
    <h3 className="text-sm font-semibold text-gray-900">All Outputs</h3>
  </div>
  <div>
    {outputEntries.map(([key, value], i) => (
      <div
        key={key}
        className={cn(
          "flex items-center justify-between py-2.5 px-5",
          i % 2 === 0 ? "bg-white" : "bg-gray-50/50"
        )}
      >
        <span className="text-sm text-gray-600">{formatLabel(key)}</span>
        <span className="font-mono text-[13px] text-gray-900">{formatValue(value)}</span>
      </div>
    ))}
  </div>
</div>
```

Zebra striping: Use `bg-gray-50/50` (very light) for alternating rows. On light themes, full `bg-gray-50` zebra stripes look too heavy. The 50% opacity version is sufficient.

**Risk Gauge Card:**
```tsx
<div className="bg-white rounded-xl border border-gray-200/60 shadow-[0_1px_2px_rgba(0,0,0,0.04)] p-6 flex flex-col items-center justify-center">
  <h3 className="text-sm font-semibold text-gray-900 mb-4">Risk Score</h3>
  <RiskGauge score={riskScore} />
</div>
```

No special treatment needed -- the gauge component itself provides visual weight.

### 4d. Deal Cards (Pipeline Kanban)

Pipeline cards need the most careful treatment. They are small, dense, interactive, and draggable.

```tsx
<div className={cn(
  "group relative bg-white rounded-lg border p-3.5 space-y-2.5 transition-all duration-150 cursor-grab active:cursor-grabbing",
  isDragging
    ? "opacity-50 shadow-none"
    : "border-gray-200/60 shadow-[0_1px_2px_rgba(0,0,0,0.04)] hover:shadow-[0_2px_8px_rgba(0,0,0,0.08)]",
  isFocused && "border-indigo-500 shadow-[0_0_0_3px_rgba(99,102,241,0.1)]"
)}>
  {/* Address */}
  <p className="text-[13px] font-medium text-gray-900 leading-tight line-clamp-2">
    {card.address}
  </p>
  {/* Strategy badge */}
  <StrategyBadge strategy={card.strategy} />
  {/* Meta row */}
  <div className="flex items-center justify-between">
    <span className="text-[12px] font-mono text-gray-500">
      ${card.asking_price?.toLocaleString()}
    </span>
    <span className="text-[11px] text-gray-400">
      {card.days_in_stage}d
    </span>
  </div>
</div>
```

Key differences from base card:
- **Radius**: `rounded-lg` (8px) instead of `rounded-xl` (12px). Smaller cards need tighter radius to avoid looking bloated.
- **Padding**: `p-3.5` (14px) -- tighter for information density in kanban columns.
- **Hover shadow**: More pronounced jump (`shadow-[0_2px_8px_rgba(0,0,0,0.08)]`) because the card communicates "I am interactive and draggable."
- **Drag state**: Reduce opacity to 0.5, remove shadow. This is the universal drag feedback pattern.

### 4e. Document Cards

Grid view document cards with file type icon, name, date, and download action.

```tsx
<div className="group bg-white rounded-xl border border-gray-200/60 shadow-[0_1px_2px_rgba(0,0,0,0.04)] p-4 hover:shadow-[0_2px_8px_rgba(0,0,0,0.08)] hover:border-gray-300/80 transition-all duration-150 cursor-pointer">
  {/* File type icon */}
  <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center mb-3">
    <FileText className="w-5 h-5 text-gray-500" />
  </div>
  {/* File name */}
  <p className="text-sm font-medium text-gray-900 line-clamp-1">{doc.name}</p>
  {/* Date */}
  <p className="text-xs text-gray-500 mt-1">{formatDate(doc.created_at)}</p>
</div>
```

### 4f. Empty States

Empty states replace content inside a card boundary when there is nothing to display.

```tsx
<div className="bg-white rounded-xl border border-gray-200/60 shadow-[0_1px_2px_rgba(0,0,0,0.04)] flex flex-col items-center justify-center py-16 px-6 text-center">
  {/* Icon container -- tinted background, not bare icon */}
  <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center mb-4">
    <Inbox className="w-6 h-6 text-gray-400" />
  </div>
  {/* Headline */}
  <p className="text-sm font-medium text-gray-900">No deals in your pipeline</p>
  {/* Description */}
  <p className="text-xs text-gray-500 mt-1 max-w-xs leading-relaxed">
    Start by analyzing a property and adding it to your pipeline to track progress.
  </p>
  {/* CTA */}
  <button className="mt-5 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[13px] font-medium transition-colors">
    <Plus size={14} />
    Analyze a Deal
  </button>
</div>
```

Empty state guidelines:
- Use icons in tinted containers (`bg-gray-100 rounded-xl`), not bare icons. Bare icons look lost on light backgrounds.
- No illustrations -- they add maintenance burden and style drift risk. Lucide icons in containers are sufficient.
- CTA button is always present. Empty states are a conversion opportunity.
- Max width on description text (`max-w-xs`) prevents awkward wide lines on desktop.

---

## 5. Dark Card on Light Background (Emphasis Technique)

For high-emphasis sections -- CTA banners, upgrade prompts, AI summary panels -- use a dark card that inverts the scheme.

```tsx
<div className="bg-gray-900 rounded-xl p-6 text-white">
  <p className="text-sm font-medium">AI Deal Summary</p>
  <p className="text-xs text-gray-400 mt-1 leading-relaxed">
    This BRRRR deal shows strong fundamentals with a 14.2% cash-on-cash return...
  </p>
</div>
```

This pattern works because:
- It breaks the visual rhythm, drawing the eye
- It creates a natural content hierarchy tier above white cards
- It maps to Parcel's existing dark brand identity (continuity with the landing page)

Use sparingly -- maximum one dark card per page view.

---

## 6. Card Grid Layouts

### Dashboard KPIs
```
grid grid-cols-2 lg:grid-cols-4 gap-4
```
4-up on desktop, 2-up on mobile. Gap of 16px.

### Calculator Results KPIs
```
grid grid-cols-2 md:grid-cols-4 gap-4
```
Same as dashboard. Breakpoint at `md` (768px) instead of `lg` because results page has no sidebar competing for space.

### Document Cards
```
grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4
```
3-up on desktop, 2-up on tablet, stacked on mobile.

### Portfolio Charts
```
grid grid-cols-1 lg:grid-cols-2 gap-6
```
Side-by-side on desktop, stacked on mobile. Larger `gap-6` because charts are visually dense.

### Form Sections (Analyzer)
```
flex flex-col gap-6
```
No grid -- form sections stack vertically with 24px gap. Each card spans full width. Internal fields use 2-column grid.

---

## 7. Interaction States

### Default
```
bg-white border-gray-200/60 shadow-[0_1px_2px_rgba(0,0,0,0.04)]
```

### Hover (interactive cards only)
```
shadow-[0_2px_8px_rgba(0,0,0,0.08)] border-gray-300/80
```
Transition: `transition-all duration-150`

### Active / Pressed
```
shadow-[0_1px_2px_rgba(0,0,0,0.04)] scale-[0.995]
```
Shadow returns to default + micro-scale for tactile feel. Optional -- only on clickable cards.

### Selected / Focused
```
border-2 border-indigo-500 shadow-[0_0_0_3px_rgba(99,102,241,0.12)]
```
Indigo ring replaces the default border. `border-2` prevents layout shift when switching from `border` (1px) by using a consistent `border-2` and making the default border transparent or adjusting padding.

Alternative approach to avoid layout shift:
```tsx
// Default: 1px border + 1px transparent outline
className="border border-gray-200/60 ring-2 ring-transparent"
// Selected: same border + indigo ring
className="border border-indigo-500 ring-2 ring-indigo-500/15"
```

### Disabled
```
bg-gray-50 border-gray-200/40 opacity-60 pointer-events-none
```

### Loading Skeleton
```tsx
<div className="bg-white rounded-xl border border-gray-200/60 shadow-[0_1px_2px_rgba(0,0,0,0.04)] p-6 space-y-3">
  <div className="h-4 w-2/5 rounded bg-gray-100 animate-pulse" />
  <div className="h-3 w-full rounded bg-gray-100 animate-pulse" />
  <div className="h-3 w-3/4 rounded bg-gray-100 animate-pulse" />
</div>
```

Skeleton bars use `bg-gray-100 animate-pulse`. On light backgrounds, `bg-gray-100` provides enough contrast for the shimmer to be visible without being distracting. The current dark-mode shimmer uses an indigo-tinted gradient -- on light mode, a plain gray pulse is more appropriate.

---

## 8. Token Mapping (Dark to Light)

For the transition, define semantic CSS custom properties:

| Token              | Dark (current)   | Light (target)             |
|--------------------|------------------|----------------------------|
| `--card-bg`        | `#0F0F1A`        | `#FFFFFF`                  |
| `--card-border`    | `#1A1A2E`        | `rgba(229,231,235,0.6)`    |
| `--card-shadow`    | `none`           | `0 1px 2px rgba(0,0,0,.04)` |
| `--card-hover-shadow` | `none`        | `0 2px 8px rgba(0,0,0,.08)` |
| `--page-bg`        | `#08080F`        | `#F9FAFB`                  |
| `--divider`        | `#1A1A2E`        | `rgba(243,244,246,1)`      |
| `--zebra-row`      | `#08080F`        | `rgba(249,250,251,0.5)`    |
| `--text-primary`   | `#F1F5F9`        | `#111827` (gray-900)       |
| `--text-secondary` | `#94A3B8`        | `#6B7280` (gray-500)       |
| `--text-muted`     | `#475569`        | `#9CA3AF` (gray-400)       |

This allows the Card component to use `bg-[var(--card-bg)]` and switch themes via a class on `<html>` or `<body>`.

---

## 9. Strategy Badge Colors (Light Adaptation)

Current badges use dark backgrounds with light text. On a white card, these need to invert to light tinted backgrounds with dark tinted text:

| Strategy         | Dark (current)              | Light (target)                     |
|------------------|-----------------------------|------------------------------------|
| Wholesale        | `bg-[#451A03] text-[#FCD34D]` | `bg-amber-50 text-amber-700`      |
| Creative Finance | `bg-[#2E1065] text-[#C4B5FD]` | `bg-violet-50 text-violet-700`    |
| BRRRR            | `bg-[#0C1A4A] text-[#93C5FD]` | `bg-blue-50 text-blue-700`        |
| Buy & Hold       | `bg-[#064E3B] text-[#6EE7B7]` | `bg-emerald-50 text-emerald-700`  |
| Flip             | `bg-[#431407] text-[#FCA5A1]` | `bg-red-50 text-red-700`          |

These use Tailwind's built-in palette at the 50/700 tier, which is the standard for "soft badge" patterns across Mercury, Linear, and Stripe.

---

## RECOMMENDATIONS FOR PARCEL

1. **Adopt border + micro-shadow as the card foundation.** Use `border border-gray-200/60 shadow-[0_1px_2px_rgba(0,0,0,0.04)]` on every card. Shadow alone (Stripe style) risks cards looking "floaty" on the off-white background; border alone (current approach) looks flat on light. The combination grounds the card while staying minimal.

2. **Standardize two card radii.** `rounded-xl` (12px) for primary containers (KPI cards, form sections, chart panels, modals). `rounded-lg` (8px) for small/dense cards (pipeline deal cards, document grid cards, dropdown menus). Do not mix further.

3. **Standardize two padding tiers.** `p-6` (24px) for primary cards. `p-4` (16px) or `p-3.5` (14px) for compact/dense cards. The current inconsistency between `p-5` and `p-4` should consolidate.

4. **Add hover shadow to all interactive cards.** Every card that navigates, opens a detail view, or can be dragged should respond to hover with `shadow-[0_2px_8px_rgba(0,0,0,0.08)]`. This is the single most impactful change for making the UI feel polished on light backgrounds.

5. **Replace raw hex colors with semantic tokens.** The current codebase has ~40 instances of `bg-[#0F0F1A]`, `border-[#1A1A2E]`, `text-[#F1F5F9]`, etc. baked into component JSX. Migrate these to CSS custom properties or Tailwind token classes so the light theme transition does not require touching every file.

6. **Use `bg-gray-50` for inset surfaces.** Input backgrounds inside white cards, zebra-stripe rows, nested sections. This creates a subtle depth layer without adding another card. Replaces the current `bg-[#08080F]` used for input backgrounds.

7. **Redesign skeleton loading for light.** Replace the indigo-tinted shimmer gradient with `bg-gray-100 animate-pulse`. Simpler, more standard, and performs better in light mode. Reserve the indigo shimmer for brand-accent loading states (e.g., AI processing indicator).

8. **Use tinted pill badges instead of bare colored text.** Delta indicators, strategy badges, and recommendation labels should all use the `bg-{color}-50 text-{color}-700` pattern. Bare colored text that reads well on `#08080F` will not have sufficient contrast on `#FFFFFF`.

9. **Limit dark-on-light emphasis cards.** Reserve `bg-gray-900` dark cards for at most one element per page: the AI summary panel, an upgrade CTA, or a disclaimer banner. Overuse dilutes the effect and fragments the light theme cohesion.

10. **Page background: `#F9FAFB` (gray-50).** This is the Stripe/Mercury standard. Pure white (`#FFFFFF`) for the page makes white cards invisible. The cool off-white provides just enough contrast for white cards to register as elevated surfaces while remaining easy on the eyes.
