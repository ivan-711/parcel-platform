# Parcel Component Library -- Light Theme

Complete, implementation-ready component specifications for every shared UI component. All Tailwind classes target the light theme defined in `agent-01-design-tokens.md`: `#F9FAFB` page background, `#FFFFFF` card surfaces, `#4F46E5` indigo accent (text-level), Inter body font, JetBrains Mono for code/AI only.

Every component uses `class-variance-authority` (CVA) for variants, forwards refs via `React.forwardRef`, and composes via `cn()` from `@/lib/utils`. shadcn/ui primitives are extended -- not replaced -- where they exist.

---

## 1. Button

### Architecture

Extends the existing `frontend/src/components/ui/button.tsx` CVA setup. Adds `danger` variant, refines all classes for light theme, and introduces `loading` + `icon` composition patterns.

### Base Classes (shared by all variants)

```
inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium
rounded-md transition-colors duration-100 ease-in-out-smooth
focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40 focus-visible:ring-offset-2 focus-visible:ring-offset-white
disabled:pointer-events-none disabled:opacity-50
[&_svg]:pointer-events-none [&_svg]:shrink-0
```

Changes from current: `ring-offset-background` becomes `ring-offset-white` for explicit light theme. `transition-colors` keeps the shadcn default. Focus ring uses `indigo-500/40` instead of the opaque `ring` token for a softer glow.

### Variants

| Variant       | Tailwind Classes |
|---------------|-----------------|
| **primary**   | `bg-indigo-600 text-white hover:bg-indigo-700 active:bg-indigo-800` |
| **secondary** | `bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200/70 hover:text-gray-900 active:bg-gray-200` |
| **ghost**     | `text-gray-600 hover:bg-gray-100 hover:text-gray-900 active:bg-gray-200/60` |
| **danger**    | `bg-error-600 text-white hover:bg-error-700 active:bg-error-800` |
| **outline**   | `border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-400 active:bg-gray-100` |
| **link**      | `text-indigo-600 underline-offset-4 hover:underline hover:text-indigo-700 p-0 h-auto` |

Design notes:
- Primary uses `indigo-600` (not 500) as the fill -- passes WCAG AA for white text (4.63:1). Hover darkens to 700 (5.87:1).
- Secondary has a visible `border-gray-200` so it reads as a container, not a text link.
- Ghost has no border at all -- differentiated from secondary by the absence of the boundary.
- Danger maps to `error-600` / `error-700` from the token system, not raw Tailwind red.

### Sizes

| Size     | Tailwind Classes | Icon Size | Notes |
|----------|-----------------|-----------|-------|
| **sm**   | `h-8 px-3 text-xs [&_svg]:size-3.5` | 14px | Dense UI: table actions, inline controls |
| **md**   | `h-9 px-4 text-sm [&_svg]:size-4` | 16px | Default. Sidebar, toolbars, form actions |
| **lg**   | `h-11 px-6 text-md [&_svg]:size-5` | 20px | Primary CTAs, form submit, hero actions |
| **icon** | `h-9 w-9 p-0 [&_svg]:size-4` | 16px | Square icon-only button. Pair with Tooltip. |
| **icon-sm** | `h-8 w-8 p-0 [&_svg]:size-3.5` | 14px | Compact icon-only (table row actions) |
| **icon-lg** | `h-11 w-11 p-0 [&_svg]:size-5` | 20px | Prominent icon-only (topbar, mobile nav) |

### States

```
DEFAULT:   (variant classes above)
HOVER:     (variant hover classes above)
FOCUS:     focus-visible:ring-2 focus-visible:ring-indigo-500/40 focus-visible:ring-offset-2
ACTIVE:    (variant active classes above)
DISABLED:  disabled:opacity-50 disabled:pointer-events-none
LOADING:   opacity-80 pointer-events-none [spinner replaces text or prepends]
```

### Loading Pattern

```tsx
<Button disabled={isPending}>
  {isPending ? (
    <>
      <Loader2 className="size-4 animate-spin" />
      Analyzing...
    </>
  ) : (
    <>
      <Sparkles className="size-4" />
      Analyze Deal
    </>
  )}
</Button>
```

The spinner uses Lucide's `Loader2` with `animate-spin` (CSS, not Framer Motion -- better perf for continuous rotation). Button text changes to communicate the action in progress. The button receives `disabled` during loading to prevent double-submission.

### Icon Button Pattern

```tsx
<Tooltip>
  <TooltipTrigger asChild>
    <Button variant="ghost" size="icon" aria-label="Download PDF">
      <Download />
    </Button>
  </TooltipTrigger>
  <TooltipContent>Download PDF</TooltipContent>
</Tooltip>
```

Every icon-only button MUST have `aria-label` and a wrapping `Tooltip`. No exceptions.

### Framer Motion Integration

```ts
// Apply to primary + secondary buttons only. Ghost/link get no scale.
const buttonMotion = {
  whileHover: { scale: 1.02 },
  whileTap: { scale: 0.97 },
  transition: { type: 'spring', stiffness: 400, damping: 30 },
}
```

Use `motion.button` or wrap `<Button asChild>` with `<motion.button>`. Do NOT apply motion to icon-only buttons inside dense lists (table rows) -- too noisy.

### CVA Definition

```ts
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium rounded-md transition-colors duration-100 ease-in-out-smooth focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary:     "bg-indigo-600 text-white hover:bg-indigo-700 active:bg-indigo-800",
        secondary:   "bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200/70 hover:text-gray-900 active:bg-gray-200",
        ghost:       "text-gray-600 hover:bg-gray-100 hover:text-gray-900 active:bg-gray-200/60",
        danger:      "bg-error-600 text-white hover:bg-error-700 active:bg-error-800",
        outline:     "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-400 active:bg-gray-100",
        link:        "text-indigo-600 underline-offset-4 hover:underline hover:text-indigo-700 p-0 h-auto",
      },
      size: {
        sm:        "h-8 px-3 text-xs [&_svg]:size-3.5",
        md:        "h-9 px-4 text-sm [&_svg]:size-4",
        lg:        "h-11 px-6 text-md [&_svg]:size-5",
        icon:      "h-9 w-9 p-0 [&_svg]:size-4",
        "icon-sm": "h-8 w-8 p-0 [&_svg]:size-3.5",
        "icon-lg": "h-11 w-11 p-0 [&_svg]:size-5",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
)
```

---

## 2. Input

### Architecture

Replaces `frontend/src/components/ui/input.tsx` with a comprehensive `FormField` system. The base `Input` stays low-level; a new `FormField` wrapper composes label + input + error + helper into one unit.

### Base Input Classes

```
h-11 w-full rounded border border-gray-300 bg-white px-3 py-2.5
text-md text-gray-900 font-medium placeholder:text-gray-400
transition-colors duration-150
focus-visible:outline-none focus-visible:border-indigo-500 focus-visible:ring-2 focus-visible:ring-indigo-500/20 focus-visible:ring-offset-0
disabled:bg-gray-50 disabled:text-gray-400 disabled:border-gray-200 disabled:cursor-not-allowed
```

Changes from current:
- `h-10` to `h-11` (44px) for touch targets
- `rounded-md` to `rounded` (6px) -- inputs are tighter than buttons/cards per token spec
- `border-input` to `border-gray-300` -- explicit color, no CSS var indirection for base component
- `ring-offset-2` to `ring-offset-0` -- tight glow per Mercury research
- Added `font-medium` for the Inter 500-weight default

### Input Variants by Type

#### Text (default)

```
(base classes above -- no additions)
```

#### Number (financial values)

```tsx
<Input
  type="text"
  inputMode="decimal"
  pattern="[0-9]*\.?[0-9]*"
  className="font-sans tabular-nums"
/>
```

Uses `type="text"` + `inputMode="decimal"` to avoid browser number-input quirks (scroll-to-change, spinners, `e` allowed). The `tabular-nums` class ensures columns align. `font-sans` keeps Inter (not JetBrains Mono) per the token spec.

#### Currency ($)

```tsx
<div className="relative">
  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400 font-sans tabular-nums select-none">
    $
  </span>
  <Input
    type="text"
    inputMode="decimal"
    className="pl-7 font-sans tabular-nums"
  />
</div>
```

Key: `pointer-events-none` on the adornment so clicks pass through to the input. `select-none` prevents accidental text selection. `font-sans tabular-nums` for Inter tabular figures.

#### Percentage (%)

```tsx
<div className="relative">
  <Input
    type="text"
    inputMode="decimal"
    className="pr-8 font-sans tabular-nums"
  />
  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400 font-sans select-none">
    %
  </span>
</div>
```

Mirror of currency, suffix-aligned.

#### Select (Dropdown)

```
SelectTrigger:
  h-11 rounded border border-gray-300 bg-white px-3 text-md text-gray-900 font-medium
  focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:ring-offset-0
  data-[placeholder]:text-gray-400

SelectContent:
  rounded-lg border border-gray-200 bg-white shadow-lg
  overflow-hidden

SelectItem:
  rounded-md px-2 py-1.5 text-sm text-gray-700 cursor-pointer
  focus:bg-indigo-50 focus:text-indigo-900
  data-[highlighted]:bg-indigo-50 data-[highlighted]:text-indigo-900
```

#### Textarea

```
min-h-[120px] w-full rounded border border-gray-300 bg-white px-3 py-2.5
text-md text-gray-900 font-medium placeholder:text-gray-400
resize-y
transition-colors duration-150
focus-visible:outline-none focus-visible:border-indigo-500 focus-visible:ring-2 focus-visible:ring-indigo-500/20 focus-visible:ring-offset-0
disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed
```

Same focus/error treatment as Input. Uses `resize-y` to allow vertical resizing only.

### Label

```
text-sm font-medium text-gray-700 mb-1.5
```

`text-sm` = 12px per token scale. `font-medium` (500) is the UI weight default. Placed above the input, never floating.

### Error Message

```tsx
<p
  id="{fieldName}-error"
  role="alert"
  className="text-[13px] text-error-700 mt-1.5 flex items-center gap-1"
>
  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
  {message}
</p>
```

Error text uses `error-700` (#B91C1C) for WCAG AA compliance on white. `role="alert"` for screen reader announcement. Icon provides visual anchor.

### Helper Text

```
text-xs text-gray-500 mt-1
```

Placed below the input. Used for range hints ("Typical: 5-10%") and formatting guidance.

### Error State (Input border)

```
border-error-500 ring-2 ring-error-500/15
focus-visible:border-error-500 focus-visible:ring-2 focus-visible:ring-error-500/20
```

Red border + subtle red ring. No background tint.

### Complete FormField Composition

```tsx
<div className="space-y-1.5">
  <Label htmlFor="purchase_price" className="text-sm font-medium text-gray-700">
    Purchase Price
  </Label>
  <p className="text-xs text-gray-500 -mt-0.5">Enter the total acquisition cost</p>
  <div className="relative">
    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400 font-sans tabular-nums select-none">$</span>
    <Input
      id="purchase_price"
      className={cn(
        "pl-7 font-sans tabular-nums",
        errors.purchase_price && "border-error-500 ring-2 ring-error-500/15"
      )}
      aria-invalid={!!errors.purchase_price}
      aria-describedby={errors.purchase_price ? "purchase_price-error" : undefined}
    />
  </div>
  {errors.purchase_price && (
    <p id="purchase_price-error" role="alert" className="text-[13px] text-error-700 mt-1.5 flex items-center gap-1">
      <AlertCircle className="h-3.5 w-3.5 shrink-0" />
      {errors.purchase_price.message}
    </p>
  )}
</div>
```

### Form Section Layout

```tsx
{/* Section heading */}
<div className="pt-6 first:pt-0">
  <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-4">
    Purchase & Financing
  </h3>
  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
    {/* FormField components */}
  </div>
</div>
```

Sections separated by heading + whitespace (no `<hr>`). `gap-x-8` (32px) and `gap-y-5` (20px) for Mercury-level breathing room.

---

## 3. Card

### Architecture

Extends `frontend/src/components/ui/card.tsx`. Adds explicit variant props via CVA instead of relying solely on className overrides.

### Base Card Classes

```
rounded-lg border bg-white text-gray-900
```

All cards share `rounded-lg` (12px), `border`, `bg-white`, `text-gray-900`.

### Variants

| Variant         | Classes | Usage |
|-----------------|---------|-------|
| **default**     | `border-gray-200 shadow-xs` | Standard containers: form sections, chart panels, settings groups |
| **elevated**    | `border-gray-200 shadow-sm` | Prominent cards: KPI at rest, feature highlights |
| **bordered**    | `border-gray-200 shadow-none` | Minimal chrome: table wrappers, filter panels |
| **interactive** | `border-gray-200 shadow-xs cursor-pointer transition-all duration-150 hover:shadow-md hover:border-gray-300` | Clickable: deal cards, portfolio entries, document cards |
| **stat**        | `border-gray-200 shadow-xs p-6 space-y-1 overflow-hidden` | KPI/metric cards with sparkline bleed |

### Full Class Strings

```
default:     "rounded-lg border border-gray-200 shadow-xs bg-white text-gray-900"
elevated:    "rounded-lg border border-gray-200 shadow-sm bg-white text-gray-900"
bordered:    "rounded-lg border border-gray-200 bg-white text-gray-900"
interactive: "rounded-lg border border-gray-200 shadow-xs bg-white text-gray-900 cursor-pointer transition-all duration-150 hover:shadow-md hover:border-gray-300 active:shadow-xs active:scale-[0.995]"
stat:        "rounded-lg border border-gray-200 shadow-xs bg-white text-gray-900 p-6 space-y-1 overflow-hidden"
```

### Padding Scale

| Context | Classes | Px |
|---------|---------|-----|
| Standard | `p-6` | 24px |
| Compact | `p-4` | 16px |
| Dense (pipeline cards) | `p-3.5` | 14px |

Padding is NOT baked into the variant -- it is applied at the usage site. Exception: `stat` variant includes `p-6` because KPI cards always use standard padding.

### Card Sub-Components

**CardHeader** (section divider pattern for form/results cards):
```
px-6 py-4 border-b border-gray-100
```

Note the internal divider is `border-gray-100` -- lighter than the card's outer `border-gray-200`.

**CardTitle:**
```
text-sm font-semibold text-gray-900
```

**CardDescription:**
```
text-xs text-gray-500 mt-0.5
```

**CardContent:**
```
p-6
```

**CardFooter:**
```
flex items-center gap-3 px-6 py-4 border-t border-gray-100
```

### Selected Card State

For pipeline focus, compare multi-select, or any "this card is chosen" state:

```
border-indigo-500 ring-2 ring-indigo-500/15
```

No `border-2` (causes layout shift). Instead, the `ring-2` provides the emphasis layer without affecting box model. Override the default `border-gray-200` with `border-indigo-500`.

### Disabled Card

```
bg-gray-50 border-gray-200/60 opacity-60 pointer-events-none
```

### Skeleton Card (Loading)

```tsx
<div className="rounded-lg border border-gray-200 shadow-xs bg-white p-6 space-y-3">
  <div className="h-4 w-2/5 rounded bg-gray-100 skeleton-shimmer" />
  <div className="h-3 w-full rounded bg-gray-100 skeleton-shimmer" />
  <div className="h-3 w-3/4 rounded bg-gray-100 skeleton-shimmer" />
</div>
```

Uses `skeleton-shimmer` CSS class (gray-100 to gray-200 gradient, 1.5s cycle) instead of `animate-pulse`. The shimmer is more polished; `animate-pulse` is the fallback if `prefers-reduced-motion` is set.

### Dark Emphasis Card

For AI summary, upgrade CTA, or disclaimer -- max one per page:

```
rounded-lg bg-gray-900 p-6 text-white
```

No border, no shadow. The dark fill IS the visual separation. Inner text: `text-gray-400` for secondary, `text-white` for primary.

### Card Grid Layouts

```
Dashboard KPIs:       grid grid-cols-2 lg:grid-cols-4 gap-4
Results KPIs:         grid grid-cols-2 md:grid-cols-4 gap-4
Document cards:       grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4
Portfolio charts:     grid grid-cols-1 lg:grid-cols-2 gap-6
Form sections:        flex flex-col gap-6
```

### CVA Definition

```ts
const cardVariants = cva(
  "rounded-lg border bg-white text-gray-900",
  {
    variants: {
      variant: {
        default:     "border-gray-200 shadow-xs",
        elevated:    "border-gray-200 shadow-sm",
        bordered:    "border-gray-200",
        interactive: "border-gray-200 shadow-xs cursor-pointer transition-all duration-150 hover:shadow-md hover:border-gray-300 active:shadow-xs active:scale-[0.995]",
        stat:        "border-gray-200 shadow-xs p-6 space-y-1 overflow-hidden",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)
```

---

## 4. Badge

### Architecture

Extends `frontend/src/components/ui/badge.tsx`. Replaces the current 4-variant system with purpose-specific variants for Parcel's domain.

### Base Classes

```
inline-flex items-center rounded-full px-2 py-0.5 text-micro font-semibold
transition-colors
```

`text-micro` = 10px per token scale. `rounded-full` for pill shape. No border by default (tinted bg provides containment).

### Variants

#### Status Badges (deal pipeline, activity feed)

| Status | Classes |
|--------|---------|
| **active** | `bg-success-50 text-success-700` |
| **pending** | `bg-warning-50 text-warning-700` |
| **closed** | `bg-gray-100 text-gray-600` |
| **rejected** | `bg-error-50 text-error-700` |
| **new** | `bg-indigo-50 text-indigo-700` |

#### Plan Badges (pricing, account)

| Plan | Classes |
|------|---------|
| **free** | `bg-gray-100 text-gray-600` |
| **pro** | `bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200` |
| **team** | `bg-indigo-100 text-indigo-800 ring-1 ring-indigo-300` |

Pro and Team get a subtle `ring-1` to differentiate from plain status badges.

#### Risk Badges (calculator results)

| Risk Level | Classes |
|------------|---------|
| **low** | `bg-success-50 text-success-700` |
| **moderate** | `bg-warning-50 text-warning-700` |
| **high** | `bg-error-50 text-error-700` |

#### Strategy Badges (investment strategy)

These use the strategy-specific tokens from `agent-01-design-tokens.md`:

| Strategy | Classes |
|----------|---------|
| **wholesale** | `bg-strategy-wholesale-bg text-strategy-wholesale-text` |
| **creative_finance** | `bg-strategy-creative-bg text-strategy-creative-text` |
| **brrrr** | `bg-strategy-brrrr-bg text-strategy-brrrr-text` |
| **buy_and_hold** | `bg-strategy-buyhold-bg text-strategy-buyhold-text` |
| **flip** | `bg-strategy-flip-bg text-strategy-flip-text` |

Resolved colors (from token spec):

| Strategy | Background | Text | Contrast |
|----------|-----------|------|----------|
| Wholesale | `#FEF3C7` (amber-100) | `#92400E` (amber-800) | 6.8:1 |
| Creative Finance | `#EDE9FE` (violet-100) | `#5B21B6` (violet-800) | 7.2:1 |
| BRRRR | `#DBEAFE` (blue-100) | `#1E40AF` (blue-800) | 6.1:1 |
| Buy & Hold | `#D1FAE5` (emerald-100) | `#065F46` (emerald-800) | 6.5:1 |
| Flip | `#FFE4E6` (rose-100) | `#9F1239` (rose-800) | 6.3:1 |

All exceed WCAG AA (4.5:1).

#### Delta Badges (KPI change indicators)

```tsx
// Positive
<span className="inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-micro font-semibold font-sans tabular-nums bg-success-50 text-success-700">
  +2.4%
</span>

// Negative
<span className="inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-micro font-semibold font-sans tabular-nums bg-error-50 text-error-700">
  -1.2%
</span>

// Neutral
<span className="inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-micro font-semibold font-sans tabular-nums bg-gray-100 text-gray-600">
  0.0%
</span>
```

Delta badges use `font-sans tabular-nums` (Inter tabular figures), not JetBrains Mono.

### Outline Variant (generic)

For badges that need a border instead of a tinted fill:

```
bg-white border border-gray-300 text-gray-700
```

### CVA Definition

```ts
const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2 py-0.5 text-micro font-semibold transition-colors",
  {
    variants: {
      variant: {
        // Status
        active:    "bg-success-50 text-success-700",
        pending:   "bg-warning-50 text-warning-700",
        closed:    "bg-gray-100 text-gray-600",
        rejected:  "bg-error-50 text-error-700",
        new:       "bg-indigo-50 text-indigo-700",
        // Plan
        free:      "bg-gray-100 text-gray-600",
        pro:       "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200",
        team:      "bg-indigo-100 text-indigo-800 ring-1 ring-indigo-300",
        // Risk
        low:       "bg-success-50 text-success-700",
        moderate:  "bg-warning-50 text-warning-700",
        high:      "bg-error-50 text-error-700",
        // Generic
        outline:   "bg-white border border-gray-300 text-gray-700",
        default:   "bg-gray-100 text-gray-700",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)
```

Strategy badges remain a separate `StrategyBadge` component (not merged into the generic Badge CVA) because they map from a domain enum and use dedicated color tokens.

---

## 5. Modal

### Architecture

Extends `frontend/src/components/ui/dialog.tsx` (Radix Dialog). Adds size variants and a `SlideOver` panel variant.

### Centered Modal (Default)

**Overlay:**
```
fixed inset-0 z-50 bg-gray-950/60 backdrop-blur-[2px]
data-[state=open]:animate-in data-[state=closed]:animate-out
data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0
duration-200
```

Changes from current: `bg-black/80` becomes `bg-gray-950/60` (less harsh) + `backdrop-blur-[2px]` (frosted glass). Mercury uses this pattern.

**Content:**
```
fixed left-[50%] top-[50%] z-50 translate-x-[-50%] translate-y-[-50%]
grid w-full gap-4 border border-gray-200 bg-white p-6 shadow-xl rounded-lg
data-[state=open]:animate-in data-[state=closed]:animate-out
data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0
data-[state=closed]:zoom-out-[0.96] data-[state=open]:zoom-in-[0.96]
duration-200
```

Changes from current: `shadow-lg` to `shadow-xl`. Added `border border-gray-200`. `sm:rounded-lg` to just `rounded-lg`. Removed the slide-to/slide-from that causes jank.

### Size Variants

| Size | Class | Usage |
|------|-------|-------|
| **sm** | `max-w-sm` (384px) | Confirmations, simple prompts |
| **md** | `max-w-lg` (512px) | Default. Close deal, edit settings |
| **lg** | `max-w-2xl` (672px) | Offer letter preview, document viewer |
| **xl** | `max-w-4xl` (896px) | Compare table, full reports |
| **full** | `max-w-[calc(100vw-2rem)] max-h-[calc(100vh-2rem)]` | PDF preview, image viewer |

### Close Button

```
absolute right-4 top-4 rounded-md p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100
transition-colors duration-100
focus:outline-none focus:ring-2 focus:ring-indigo-500/40
```

### Modal Header

```
flex flex-col space-y-1.5
```

**Title:** `text-lg font-semibold text-gray-900`
**Description:** `text-sm text-gray-500`

### Modal Footer

```
flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3
```

Buttons stack on mobile, row on desktop. Destructive action on the left (desktop), primary on the right.

### Slide-Over Panel

For panels that slide in from the right edge (deal detail, document preview):

**Overlay:** Same as centered modal.

**Panel:**
```
fixed right-0 top-0 z-50 h-full w-full sm:max-w-md lg:max-w-lg
border-l border-gray-200 bg-white shadow-2xl
data-[state=open]:animate-in data-[state=closed]:animate-out
data-[state=open]:slide-in-from-right data-[state=closed]:slide-out-to-right
duration-300 ease-spring
```

Full height, right-anchored, slides from right. `max-w-md` on tablet, `max-w-lg` on desktop, full-width on mobile.

**Panel Header:**
```
flex items-center justify-between px-6 py-4 border-b border-gray-100
```

**Panel Content:**
```
flex-1 overflow-y-auto px-6 py-4
```

**Panel Footer:**
```
flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100
```

### Framer Motion Integration (optional enhancement)

```ts
export const modalContent: Variants = {
  hidden: { opacity: 0, scale: 0.96, y: 8 },
  visible: {
    opacity: 1, scale: 1, y: 0,
    transition: { type: 'spring', stiffness: 400, damping: 30 },
  },
  exit: {
    opacity: 0, scale: 0.96, y: 8,
    transition: { duration: 0.15 },
  },
}
```

---

## 6. Table

### Architecture

Custom component -- no shadcn table primitive needed. Sortable headers, responsive card fallback on mobile, optional zebra striping.

### Table Container

```tsx
<div className="rounded-lg border border-gray-200 shadow-xs bg-white overflow-hidden">
  <div className="overflow-x-auto">
    <table className="w-full text-sm">
      {/* ... */}
    </table>
  </div>
</div>
```

Wrapped in a Card-like container with horizontal scroll for overflow.

### Table Head

```
<thead>
  <tr className="border-b border-gray-200 bg-gray-50">
    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
```

Header row: `bg-gray-50`, uppercase, `text-xs`, `text-gray-500`, `tracking-wider`.

### Sortable Header

```tsx
<th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
  <button
    className="inline-flex items-center gap-1 hover:text-gray-700 transition-colors group"
    onClick={() => onSort(column)}
  >
    {label}
    <ArrowUpDown className={cn(
      "size-3.5 text-gray-400 group-hover:text-gray-600 transition-colors",
      sortColumn === column && "text-indigo-600"
    )} />
  </button>
</th>
```

Active sort column indicator: icon turns `text-indigo-600`. Swap `ArrowUpDown` for `ArrowUp` or `ArrowDown` depending on direction.

### Table Body Row

```tsx
<tr className={cn(
  "border-b border-gray-100 transition-colors",
  isStriped && rowIndex % 2 === 1 && "bg-gray-50/50",
  isInteractive && "hover:bg-gray-50 cursor-pointer",
  isSelected && "bg-indigo-50"
)}>
```

- Zebra: `bg-gray-50/50` (50% opacity -- subtler than full `bg-gray-50`)
- Hover: `hover:bg-gray-50` on interactive rows
- Selected: `bg-indigo-50`
- Divider: `border-b border-gray-100` (lighter than outer card border)

### Table Cell

```
<td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
```

Financial values:
```
<td className="px-4 py-3 text-sm text-gray-900 font-sans tabular-nums text-right whitespace-nowrap">
```

Right-align financial columns. `tabular-nums` for vertical alignment of digits.

### Empty State Row

```tsx
<tr>
  <td colSpan={columns.length} className="py-16 text-center">
    <div className="flex flex-col items-center gap-3">
      <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center">
        <Inbox className="w-6 h-6 text-gray-400" />
      </div>
      <p className="text-sm font-medium text-gray-900">No deals found</p>
      <p className="text-xs text-gray-500 max-w-xs">Try adjusting your filters or add a new deal.</p>
    </div>
  </td>
</tr>
```

### Mobile Responsive (Card View)

Tables switch to stacked cards below `md` (768px):

```tsx
{/* Desktop table */}
<div className="hidden md:block">
  <table>...</table>
</div>

{/* Mobile cards */}
<div className="md:hidden space-y-3">
  {rows.map(row => (
    <div className="rounded-lg border border-gray-200 shadow-xs bg-white p-4 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-900">{row.address}</span>
        <StrategyBadge strategy={row.strategy} />
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div>
          <span className="text-gray-500">Price</span>
          <p className="font-sans tabular-nums text-gray-900">${row.price.toLocaleString()}</p>
        </div>
        <div>
          <span className="text-gray-500">CoC Return</span>
          <p className="font-sans tabular-nums text-gray-900">{row.coc}%</p>
        </div>
      </div>
    </div>
  ))}
</div>
```

### Pagination

```tsx
<div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
  <p className="text-xs text-gray-500">
    Showing <span className="font-medium text-gray-700">{from}</span> to{' '}
    <span className="font-medium text-gray-700">{to}</span> of{' '}
    <span className="font-medium text-gray-700">{total}</span>
  </p>
  <div className="flex items-center gap-1">
    <Button variant="outline" size="sm" disabled={page === 1}>Previous</Button>
    <Button variant="outline" size="sm" disabled={page === lastPage}>Next</Button>
  </div>
</div>
```

---

## 7. Tabs

### Architecture

Three visual patterns, all built on Radix Tabs primitives (`@radix-ui/react-tabs`).

### 7a. Underline Tabs (Default)

The standard tab style for page sections (Results page, Settings).

**TabsList:**
```
flex border-b border-gray-200
```

No background color. The bottom border acts as the baseline.

**TabsTrigger:**
```
relative px-4 py-2.5 text-sm font-medium text-gray-500
hover:text-gray-700
transition-colors duration-150
data-[state=active]:text-indigo-600
```

Active indicator (CSS pseudo-element, not a separate div):
```css
[data-state="active"]::after {
  content: '';
  position: absolute;
  bottom: -1px;
  left: 0;
  right: 0;
  height: 2px;
  background: #4F46E5;
  border-radius: 1px 1px 0 0;
}
```

The `bottom: -1px` overlaps the TabsList border, creating a clean "selected" line that replaces the border segment.

**TabsContent:**
```
mt-4 focus-visible:outline-none
```

### 7b. Pill Tabs

For compact inline switching (strategy filter, chart view toggle).

**TabsList:**
```
inline-flex items-center gap-1 rounded-lg bg-gray-100 p-1
```

**TabsTrigger:**
```
rounded-md px-3 py-1.5 text-xs font-medium text-gray-600
transition-all duration-150
hover:text-gray-900
data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-xs
```

Active pill: white background with micro shadow. The `bg-gray-100` container makes the white pill "pop."

### 7c. Horizontal Scroll Tabs

For mobile where tabs overflow (5+ strategy tabs):

**TabsList:**
```
flex overflow-x-auto gap-1 border-b border-gray-200 pb-px
scrollbar-none [-webkit-overflow-scrolling:touch]
```

Same trigger style as underline. The `overflow-x-auto` + `scrollbar-none` allows horizontal swipe on mobile.

### States (All Tab Styles)

```
DEFAULT:   text-gray-500
HOVER:     text-gray-700 (underline) or text-gray-900 (pill)
ACTIVE:    text-indigo-600 (underline) or bg-white text-gray-900 shadow-xs (pill)
FOCUS:     focus-visible:ring-2 focus-visible:ring-indigo-500/40 focus-visible:rounded-md
DISABLED:  text-gray-300 pointer-events-none
```

---

## 8. Toast

### Architecture

Uses Sonner (already installed). Configure the `<Toaster>` component with light-theme styles. Custom toast variants for each severity.

### Toaster Configuration

```tsx
<Toaster
  position="bottom-right"
  toastOptions={{
    className: "rounded-lg border shadow-lg text-sm font-medium",
    duration: 4000,
  }}
  gap={8}
/>
```

### Toast Variants

| Type | Classes | Icon |
|------|---------|------|
| **success** | `bg-white border-success-200 text-gray-900` | `<CheckCircle2 className="size-5 text-success-600" />` |
| **error** | `bg-white border-error-200 text-gray-900` | `<XCircle className="size-5 text-error-600" />` |
| **warning** | `bg-white border-warning-200 text-gray-900` | `<AlertTriangle className="size-5 text-warning-600" />` |
| **info** | `bg-white border-gray-200 text-gray-900` | `<Info className="size-5 text-info-600" />` |

All toasts: white background, colored left-border accent, colored icon. The body text is always `text-gray-900`. Descriptions use `text-gray-500 text-xs`.

### Toast Structure

```tsx
toast.success('Deal saved to pipeline', {
  description: 'BRRRR analysis for 123 Main St',
  action: {
    label: 'View Pipeline',
    onClick: () => navigate('/pipeline'),
  },
})
```

### Action Link Style

```
text-indigo-600 hover:text-indigo-700 text-xs font-medium underline-offset-2 hover:underline
```

### Sonner Custom Render (light theme)

```tsx
<Toaster
  toastOptions={{
    classNames: {
      toast:       "bg-white border border-gray-200 shadow-lg rounded-lg",
      title:       "text-sm font-medium text-gray-900",
      description: "text-xs text-gray-500",
      actionButton: "text-xs font-medium text-indigo-600 hover:text-indigo-700",
      cancelButton: "text-xs font-medium text-gray-500 hover:text-gray-700",
      success:     "border-l-4 border-l-success-500",
      error:       "border-l-4 border-l-error-500",
      warning:     "border-l-4 border-l-warning-500",
      info:        "border-l-4 border-l-info-500",
    },
  }}
/>
```

The `border-l-4` accent stripe is the primary severity signal. Keeps the toast body neutral white.

### Animation

Sonner handles its own enter/exit. Default is slide-up + fade. Do NOT override with Framer Motion -- Sonner's tween is faster for ephemeral notifications.

---

## 9. Skeleton

### Architecture

Expands `frontend/src/components/ui/SkeletonCard.tsx` into a system of skeleton primitives that match each content type.

### Base Skeleton Bar

```
rounded bg-gray-100 skeleton-shimmer
```

Uses the `skeleton-shimmer` CSS class (light theme gradient: `#F2F4F7` to `#EAECF0`, 1.5s cycle). Falls back to `animate-pulse` when `prefers-reduced-motion` is set.

### Skeleton CSS

```css
.skeleton-shimmer {
  background: linear-gradient(90deg, #F2F4F7 0%, #EAECF0 50%, #F2F4F7 100%);
  background-size: 200% 100%;
  animation: skeleton-shimmer 1.5s ease-in-out infinite;
}

@keyframes skeleton-shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

@media (prefers-reduced-motion: reduce) {
  .skeleton-shimmer {
    animation: none;
    background: #F2F4F7;
  }
}
```

### Skeleton Variants

#### SkeletonText

```tsx
<div className="space-y-2">
  <div className="h-4 w-3/4 rounded bg-gray-100 skeleton-shimmer" />
  <div className="h-3 w-full rounded bg-gray-100 skeleton-shimmer" />
  <div className="h-3 w-2/3 rounded bg-gray-100 skeleton-shimmer" />
</div>
```

#### SkeletonKPI

```tsx
<div className="rounded-lg border border-gray-200 shadow-xs bg-white p-6 space-y-2">
  <div className="h-3 w-24 rounded bg-gray-100 skeleton-shimmer" />  {/* label */}
  <div className="h-8 w-32 rounded bg-gray-100 skeleton-shimmer" />  {/* value */}
  <div className="h-3 w-16 rounded-full bg-gray-100 skeleton-shimmer" />  {/* delta */}
</div>
```

#### SkeletonTable

```tsx
<div className="rounded-lg border border-gray-200 shadow-xs bg-white overflow-hidden">
  {/* Header */}
  <div className="flex gap-4 px-4 py-3 bg-gray-50 border-b border-gray-200">
    {[...Array(4)].map((_, i) => (
      <div key={i} className="h-3 w-20 rounded bg-gray-200/70 skeleton-shimmer" />
    ))}
  </div>
  {/* Rows */}
  {[...Array(5)].map((_, row) => (
    <div key={row} className="flex gap-4 px-4 py-3 border-b border-gray-100">
      {[...Array(4)].map((_, col) => (
        <div key={col} className="h-3 w-24 rounded bg-gray-100 skeleton-shimmer" />
      ))}
    </div>
  ))}
</div>
```

#### SkeletonCard (generic)

```tsx
function SkeletonCard({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn("rounded-lg border border-gray-200 shadow-xs bg-white p-6 space-y-3", className)}>
      <div className="h-4 w-2/5 rounded bg-gray-100 skeleton-shimmer" />
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "h-3 rounded bg-gray-100 skeleton-shimmer",
            i === lines - 1 ? "w-3/4" : "w-full"
          )}
        />
      ))}
    </div>
  )
}
```

#### SkeletonAvatar

```tsx
<div className="h-10 w-10 rounded-full bg-gray-100 skeleton-shimmer" />
```

#### SkeletonChart

```tsx
<div className="rounded-lg border border-gray-200 shadow-xs bg-white p-6">
  <div className="h-4 w-32 rounded bg-gray-100 skeleton-shimmer mb-4" />
  <div className="h-48 w-full rounded bg-gray-100/50 skeleton-shimmer" />
</div>
```

### Minimum Display Time

Never show a skeleton for less than 300ms. If data loads faster, delay rendering the real content:

```ts
const MIN_SKELETON_MS = 300
```

This prevents skeleton flash which is worse than no skeleton at all.

---

## 10. Tooltip

### Architecture

Extends `frontend/src/components/ui/tooltip.tsx` (Radix Tooltip).

### Classes

```
TooltipContent:
  z-50 overflow-hidden rounded-md bg-gray-900 px-3 py-1.5
  text-xs text-white font-medium
  shadow-md
  animate-in fade-in-0 zoom-in-95
  data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95
  data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2
  data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2
```

Dark tooltip on light UI. `bg-gray-900` with `text-white`. Same Radix directional animation.

### ConceptTooltip (Parcel-specific)

For financial term definitions (Cap Rate, CoC Return, DSCR):

```tsx
<TooltipContent className="max-w-xs p-3 bg-gray-900 rounded-lg shadow-lg">
  <p className="text-xs font-semibold text-white mb-1">{term}</p>
  <p className="text-xs text-gray-300 leading-relaxed">{definition}</p>
</TooltipContent>
```

Wider (`max-w-xs`), with title + description. Larger padding (`p-3`).

---

## 11. DropdownMenu

### Architecture

Extends existing Radix DropdownMenu via shadcn patterns.

### Classes

```
DropdownMenuContent:
  z-50 min-w-[180px] overflow-hidden rounded-lg border border-gray-200 bg-white p-1 shadow-lg
  animate-in fade-in-0 zoom-in-95
  data-[side=bottom]:slide-in-from-top-2

DropdownMenuItem:
  relative flex cursor-pointer select-none items-center gap-2 rounded-md px-2.5 py-2 text-sm text-gray-700 outline-none
  transition-colors duration-75
  focus:bg-gray-50 focus:text-gray-900
  data-[highlighted]:bg-gray-50 data-[highlighted]:text-gray-900
  data-[disabled]:pointer-events-none data-[disabled]:text-gray-300

DropdownMenuSeparator:
  -mx-1 my-1 h-px bg-gray-100

DropdownMenuLabel:
  px-2.5 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wider

DropdownMenuShortcut:
  ml-auto text-xs text-gray-400 tracking-widest font-mono
```

### Danger Item

```
text-error-600 focus:bg-error-50 focus:text-error-700
```

Used for "Delete Deal", "Remove from Pipeline", etc.

### Checkbox/Radio Items

```
DropdownMenuCheckboxItem (checked):
  [data-state=checked] > .indicator: text-indigo-600

DropdownMenuRadioItem (selected):
  [data-state=checked]: bg-indigo-50 text-indigo-900
```

---

## 12. Progress

### 12a. Linear Progress Bar

```tsx
<div className="w-full h-2 rounded-full bg-gray-100 overflow-hidden">
  <div
    className="h-full rounded-full bg-indigo-500 transition-all duration-500 ease-out-expo"
    style={{ width: `${percent}%` }}
  />
</div>
```

Variants by context:

| Context | Track | Fill |
|---------|-------|------|
| **default** | `bg-gray-100` | `bg-indigo-500` |
| **success** | `bg-gray-100` | `bg-success-500` |
| **warning** | `bg-gray-100` | `bg-warning-500` |
| **danger** | `bg-gray-100` | `bg-error-500` |

Sizes:

| Size | Track Height |
|------|-------------|
| **sm** | `h-1` |
| **md** | `h-2` |
| **lg** | `h-3` |

### 12b. Circular Progress (Ring)

For risk gauge, completion indicators.

```tsx
function CircularProgress({ value, size = 48, strokeWidth = 4 }: Props) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (value / 100) * circumference

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      {/* Track */}
      <circle
        cx={size / 2} cy={size / 2} r={radius}
        strokeWidth={strokeWidth}
        className="fill-none stroke-gray-100"
      />
      {/* Value */}
      <circle
        cx={size / 2} cy={size / 2} r={radius}
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        className="fill-none stroke-indigo-500 transition-all duration-700 ease-out-expo"
      />
    </svg>
  )
}
```

Center label (optional):
```tsx
<div className="relative inline-flex items-center justify-center">
  <CircularProgress value={72} size={64} strokeWidth={5} />
  <span className="absolute text-sm font-semibold text-gray-900 font-sans tabular-nums">72%</span>
</div>
```

### 12c. Step Progress

For multi-step flows (future onboarding, deal workflow):

```tsx
<div className="flex items-center gap-2">
  {steps.map((step, i) => (
    <Fragment key={step.id}>
      <div className={cn(
        "flex items-center justify-center w-8 h-8 rounded-full text-xs font-semibold transition-colors",
        i < currentStep && "bg-indigo-600 text-white",
        i === currentStep && "bg-indigo-50 text-indigo-700 ring-2 ring-indigo-500",
        i > currentStep && "bg-gray-100 text-gray-400"
      )}>
        {i < currentStep ? <Check className="size-4" /> : i + 1}
      </div>
      {i < steps.length - 1 && (
        <div className={cn(
          "flex-1 h-0.5 rounded-full",
          i < currentStep ? "bg-indigo-500" : "bg-gray-200"
        )} />
      )}
    </Fragment>
  ))}
</div>
```

---

## Complete State Matrix

Every interactive component follows this state hierarchy. No component may define states outside this system.

### Color States (all components)

| State | Background | Border | Text | Ring | Extra |
|-------|-----------|--------|------|------|-------|
| **Default** | per variant | per variant | per variant | none | -- |
| **Hover** | lighten/darken 1 step | darken 1 step (if bordered) | darken 1 step | none | `duration-75` or `duration-100` |
| **Focus** | unchanged | `border-indigo-500` | unchanged | `ring-2 ring-indigo-500/40 ring-offset-2` | Visible only on keyboard focus (`focus-visible`) |
| **Active/Pressed** | darken 2 steps from default | unchanged | unchanged | none | `scale-[0.97]` on buttons, `scale-[0.995]` on cards |
| **Disabled** | `bg-gray-50` or `opacity-50` | `border-gray-200` | `text-gray-400` | none | `pointer-events-none cursor-not-allowed` |
| **Loading** | `opacity-80` | unchanged | unchanged | none | `pointer-events-none`, spinner visible |
| **Selected** | `bg-indigo-50` | `border-indigo-500` | `text-indigo-700` | `ring-2 ring-indigo-500/15` | -- |
| **Error** | unchanged | `border-error-500` | `text-error-700` (for messages) | `ring-2 ring-error-500/15` | -- |

### Transition Tokens (always use)

| Interaction | Duration | Easing | Tailwind |
|-------------|----------|--------|----------|
| Color change | 75ms | ease-in-out-smooth | `duration-75 ease-in-out-smooth` |
| Button press | 100ms | ease-in-out-smooth | `duration-100 ease-in-out-smooth` |
| Card hover (shadow) | 150ms | ease-in-out-smooth | `duration-150 ease-in-out-smooth` |
| Dropdown open | 200ms | ease-out-expo | via Radix animation |
| Modal enter | 250ms | spring (400/30) | via Framer Motion or Radix |
| Page transition | 200ms | ease-in-out-smooth | via Framer Motion |

---

## CRITICAL DECISIONS

### 1. CVA is the single variant system -- no ad-hoc conditionals

Every component with visual variants uses `class-variance-authority`. No inline ternary chains for variant switching. This is non-negotiable for consistency -- when a developer needs to change the "ghost button hover color," they update one line in the CVA definition, not hunt through 15 component files.

### 2. shadcn primitives are extended, never replaced

Button, Input, Card, Badge, Dialog, Select, Tooltip, Popover -- these all start from the installed shadcn/ui components. The redesign modifies their class strings, not their component architecture. Radix accessibility, ref forwarding, and portal rendering are inherited for free.

### 3. Focus rings use `focus-visible` exclusively -- never `focus`

All focus styles use `focus-visible:` prefix. This ensures keyboard users see the ring but mouse/touch users do not. The ring style is `ring-2 ring-indigo-500/40 ring-offset-2 ring-offset-white` -- consistent across every interactive element. Exception: Radix components that use `data-[highlighted]` or `data-[focus-visible]` instead.

### 4. Shadows define card elevation hierarchy -- borders define boundaries

Cards always have a border. Shadow is the variable that communicates "is this interactive" and "what layer am I on." Rest: `shadow-xs`. Hover: `shadow-md`. Overlay (dropdown, modal): `shadow-lg` / `shadow-xl`. Borders are structural, not interactive.

### 5. Financial numbers use Inter `tabular-nums`, not JetBrains Mono

This is the single largest visual change from the current codebase. KPI values, table cells, form inputs for dollar/percent values -- all render in `font-sans tabular-nums` (Inter with tabular lining figures). JetBrains Mono (`font-mono`) is reserved exclusively for code blocks and AI chat output. This improves data density by ~30% and eliminates the jarring font-switch when text and numbers appear on the same line.

### 6. Error states never use background tints on inputs

Red border + subtle red ring only. No `bg-red-50` on the input itself. When multiple fields fail validation simultaneously, tinted backgrounds create a "Christmas tree" effect that is visually overwhelming. The border+ring pattern is sufficient and scales gracefully.

### 7. The `danger` button variant is separate from `destructive`

shadcn's default `destructive` variant is renamed to `danger` for Parcel. The word "destructive" is a developer abstraction; "danger" maps to the semantic color token system (`error-600`, `error-700`, `error-800`). This alignment prevents confusion when the same color appears as a badge (`error`), toast (`error`), and button (`danger`).

### 8. Toast severity uses left-border accent, not full background tint

All toasts have a white body with a 4px colored left border. This keeps the text maximally readable (dark on white) while clearly communicating severity. Full-color toast backgrounds (green success, red error) reduce text contrast and feel alarming when multiple toasts stack.

### 9. Mobile tables become cards -- no horizontal scroll as primary strategy

Below `md` (768px), data tables transform into stacked cards with key fields extracted as label-value pairs. Horizontal scroll (`overflow-x-auto`) exists as a safety net inside the card view, but the card layout is the primary mobile experience. Pinch-to-scroll tables are hostile on touch devices.

### 10. Skeleton shapes must match the final content they replace

Generic rectangles are not acceptable. A KPI skeleton has a short label bar + tall value bar + small delta pill. A table skeleton has a header row + body rows with matching column widths. Mismatched skeletons cause layout shift on data load, which is the exact problem skeletons are designed to prevent.

### 11. One dark card per page maximum

The `bg-gray-900` emphasis card (for AI summaries, CTAs) is limited to one instance per visible viewport. Overuse fragments the light theme and reduces the signal value of the dark card. If two sections need emphasis, use `bg-indigo-50` for the secondary one.

### 12. No new dependencies for this component library

Everything is built with existing deps: Radix primitives (via shadcn), CVA, Tailwind, Lucide icons, Framer Motion, Recharts. No new UI library (Mantine, Chakra, Ant). No new icon set. No new animation library. Constraint breeds consistency.
