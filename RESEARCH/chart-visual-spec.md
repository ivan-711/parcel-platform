# Chart Visual Spec — Fey-Style Premium Financial Aesthetic

> Implementation-ready spec for upgrading Parcel's Recharts charts to a premium financial terminal look. Covers both dark and light themes.

---

## 1. Design Reference

**Target aesthetic:** Fey.com (acquired by Wealthsimple) — near-black backgrounds, thin clean lines with gradient area fills fading to transparent, minimal axis labels, frosted glass tooltips, tight data density, financial color coding.

**Key sources studied:**
- [Fey.com design breakdown (103 screens)](https://nicelydone.club/apps/fey)
- [DariusLukasukas/stocks (Next.js stock dashboard)](https://github.com/DariusLukasukas/stocks)
- [shadcn/ui chart system](https://ui.shadcn.com/docs/components/chart)
- [LeanlyLabs Recharts gradient techniques](https://leanylabs.com/blog/awesome-react-charts-tips/)

---

## 2. CSS Variables for Chart Theming

Add to `frontend/src/index.css` inside `:root` (dark) and `.light` blocks:

```css
/* ── Dark theme (default) ── */
:root {
  --chart-bg: #141311;
  --chart-border: rgba(255, 255, 255, 0.06);
  --chart-grid: rgba(255, 255, 255, 0.04);
  --chart-axis-text: #7A7872;
  --chart-label-text: #A09D98;
  --chart-line-width: 1.5;

  /* Gradient fill opacities */
  --chart-gradient-from: 0.30;
  --chart-gradient-to: 0;

  /* Tooltip */
  --chart-tooltip-bg: rgba(30, 29, 27, 0.85);
  --chart-tooltip-border: rgba(255, 255, 255, 0.08);
  --chart-tooltip-blur: 12px;
  --chart-tooltip-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  --chart-tooltip-text: #F0EDE8;
  --chart-tooltip-label: #8A8580;

  /* Crosshair cursor */
  --chart-cursor-stroke: #8B7AFF;
  --chart-cursor-opacity: 0.25;

  /* Financial colors */
  --chart-positive: #6DBEA3;
  --chart-negative: #D4766A;
  --chart-accent: #8B7AFF;
}

/* ── Light theme ── */
.light {
  --chart-bg: #FFFFFF;
  --chart-border: rgba(0, 0, 0, 0.06);
  --chart-grid: rgba(0, 0, 0, 0.05);
  --chart-axis-text: #667085;
  --chart-label-text: #98A2B3;
  --chart-line-width: 2;

  --chart-gradient-from: 0.12;
  --chart-gradient-to: 0;

  --chart-tooltip-bg: rgba(255, 255, 255, 0.85);
  --chart-tooltip-border: rgba(0, 0, 0, 0.08);
  --chart-tooltip-blur: 12px;
  --chart-tooltip-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  --chart-tooltip-text: #1D2939;
  --chart-tooltip-label: #667085;

  --chart-cursor-stroke: #8B7AFF;
  --chart-cursor-opacity: 0.2;

  --chart-positive: #16a34a;
  --chart-negative: #dc2626;
  --chart-accent: #7B6AEF;
}
```

---

## 3. Shared Component Specs

### 3A. `ChartContainer` wrapper

Wraps every chart with consistent styling and padding.

```tsx
// Props: children, className, title?, subtitle?, height?
<div className={cn(
  "rounded-xl border bg-[var(--chart-bg)] border-[var(--chart-border)]",
  "p-4 md:p-5",
  className
)}>
  {title && (
    <div className="mb-3">
      <h3 className="text-[10px] uppercase tracking-wider font-medium text-[var(--chart-axis-text)]">
        {title}
      </h3>
      {subtitle && (
        <p className="text-xs text-[var(--chart-label-text)] mt-0.5">{subtitle}</p>
      )}
    </div>
  )}
  <div style={{ height: height ?? 250 }}>
    <ResponsiveContainer width="100%" height="100%">
      {children}
    </ResponsiveContainer>
  </div>
</div>
```

### 3B. `GradientDefs` helper

Standard SVG gradient definitions for reuse across charts.

```tsx
interface GradientDefProps {
  id: string
  color: string
  fromOpacity?: number  // default: reads CSS var or 0.30
  toOpacity?: number    // default: 0
  midStop?: number      // optional mid-point stop offset (e.g. 50)
  midOpacity?: number   // opacity at mid-point
}

function GradientDef({ id, color, fromOpacity = 0.30, toOpacity = 0, midStop, midOpacity }: GradientDefProps) {
  return (
    <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
      <stop offset="5%" stopColor={color} stopOpacity={fromOpacity} />
      {midStop != null && midOpacity != null && (
        <stop offset={`${midStop}%`} stopColor={color} stopOpacity={midOpacity} />
      )}
      <stop offset="95%" stopColor={color} stopOpacity={toOpacity} />
    </linearGradient>
  )
}
```

**Gradient presets by use case:**

| Use Case | Color | From Opacity (dark) | From Opacity (light) | Mid | Notes |
|----------|-------|--------------------|--------------------|-----|-------|
| Violet accent area | `#8B7AFF` | 0.25 | 0.12 | 50% @ 0.06 | Primary chart fill |
| Positive/profit area | `#6DBEA3` | 0.20 | 0.10 | — | Green financial |
| Negative/loss area | `#D4766A` | 0.15 | 0.08 | — | Red financial |
| Sparkline (KPI card) | `#8B7AFF` | 0.20 | 0.10 | 50% @ 0.06 | Tiny, subtle |
| Secondary overlay | any | 0.10 | 0.06 | — | Background series |

### 3C. `FrostedTooltip` component

Custom Recharts tooltip with glassmorphism effect.

```tsx
import { cn } from '@/lib/utils'
import type { TooltipProps } from 'recharts'

interface FrostedTooltipProps extends TooltipProps<number, string> {
  valueFormatter?: (value: number) => string
  labelFormatter?: (label: string) => string
}

function FrostedTooltip({ active, payload, label, valueFormatter, labelFormatter }: FrostedTooltipProps) {
  if (!active || !payload?.length) return null

  const fmt = valueFormatter ?? ((v: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v)
  )

  return (
    <div
      className={cn(
        "rounded-lg px-3 py-2 text-xs",
        "border shadow-lg",
        // Glassmorphism
        "backdrop-blur-[12px]",
        "bg-[var(--chart-tooltip-bg)]",
        "border-[var(--chart-tooltip-border)]",
        "[box-shadow:var(--chart-tooltip-shadow)]",
      )}
    >
      {label && (
        <p className="text-[10px] uppercase tracking-wider font-medium mb-1.5 text-[var(--chart-tooltip-label)]">
          {labelFormatter ? labelFormatter(String(label)) : label}
        </p>
      )}
      <div className="space-y-1">
        {payload.map((entry, i) => (
          <div key={i} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5">
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-[var(--chart-tooltip-label)]">
                {entry.name}
              </span>
            </span>
            <span className="font-medium tabular-nums text-[var(--chart-tooltip-text)]">
              {fmt(entry.value as number)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
```

### 3D. `Sparkline` component

Minimal inline chart for KPI cards — no axes, grid, or tooltip.

```tsx
interface SparklineProps {
  data: number[]
  color?: string       // default: var(--chart-accent)
  height?: number      // default: 40
  strokeWidth?: number // default: 1.5
  gradientOpacity?: number // default: 0.20
  animate?: boolean    // default: false (sparklines load fast)
}

function Sparkline({ data, color = '#8B7AFF', height = 40, strokeWidth = 1.5, gradientOpacity = 0.20, animate = false }: SparklineProps) {
  const points = data.map((value, idx) => ({ idx, value }))
  const gradientId = `spark-${Math.random().toString(36).slice(2, 8)}`

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={points} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={gradientOpacity} />
            <stop offset="50%" stopColor={color} stopOpacity={gradientOpacity * 0.3} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={strokeWidth}
          fill={`url(#${gradientId})`}
          dot={false}
          isAnimationActive={animate}
          animationDuration={500}
          animationEasing="ease-out"
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
```

### 3E. Crosshair cursor config

Standard Recharts `<Tooltip>` cursor prop for a premium crosshair:

```tsx
// Dashed crosshair (default — subtle)
cursor={{
  stroke: 'var(--chart-cursor-stroke)',
  strokeOpacity: 0.25,
  strokeWidth: 1,
  strokeDasharray: '4 4',
}}

// Solid crosshair (bolder — for primary charts)
cursor={{
  stroke: 'var(--chart-cursor-stroke)',
  strokeOpacity: 0.15,
  strokeWidth: 1,
}}

// No cursor (sparklines, pie charts)
cursor={false}
```

### 3F. Line curve type recommendations

| Chart Type | Curve Type | Why |
|------------|-----------|-----|
| Cash flow, portfolio value, equity growth | `monotone` | Never overshoots — financially accurate |
| Sparklines in KPI cards | `monotone` | Clean, consistent |
| Break-even projections | `monotone` | Shows exact crossover point |
| Marketing/decorative charts | `natural` | Aesthetically smoother |
| Step-based progressions (milestones) | `stepAfter` | Shows discrete changes |

### 3G. Chart loading skeleton

```tsx
function ChartSkeleton({ height = 250 }: { height?: number }) {
  return (
    <div className="rounded-xl border bg-[var(--chart-bg)] border-[var(--chart-border)] p-4">
      <div className="animate-pulse space-y-3">
        <div className="h-3 w-24 rounded bg-[var(--chart-grid)]" />
        <div className="h-6 w-32 rounded bg-[var(--chart-grid)]" />
        <div
          className="w-full rounded-lg overflow-hidden"
          style={{ height }}
        >
          <div
            className="h-full w-full"
            style={{
              background: `linear-gradient(90deg,
                var(--chart-grid) 25%,
                transparent 50%,
                var(--chart-grid) 75%)`,
              backgroundSize: '200% 100%',
              animation: 'shimmer 1.5s ease-in-out infinite',
            }}
          />
        </div>
      </div>
    </div>
  )
}
```

### 3H. Animated number component

```tsx
import { motion, useSpring, useTransform } from 'framer-motion'
import { useEffect } from 'react'

interface AnimatedNumberProps {
  value: number
  formatter?: (n: number) => string
}

function AnimatedNumber({ value, formatter }: AnimatedNumberProps) {
  const spring = useSpring(0, { mass: 0.8, stiffness: 75, damping: 15 })
  const display = useTransform(spring, (current) =>
    formatter ? formatter(current) : Math.round(current).toLocaleString()
  )

  useEffect(() => { spring.set(value) }, [spring, value])

  return <motion.span>{display}</motion.span>
}
```

---

## 4. Axis & Grid Specifications

### Axis styling (applied via spread)

```tsx
// X-Axis
<XAxis
  dataKey="month"
  tick={{ fill: 'var(--chart-axis-text)', fontSize: 11 }}
  axisLine={false}
  tickLine={false}
  tickMargin={8}
  minTickGap={32}
/>

// Y-Axis
<YAxis
  tick={{ fill: 'var(--chart-axis-text)', fontSize: 11 }}
  axisLine={false}
  tickLine={false}
  tickFormatter={(v) => `$${(v / 1000).toFixed(0)}K`}
  width={48}
/>
```

### Grid styling

```tsx
// Subtle horizontal grid only (Fey-style)
<CartesianGrid
  stroke="var(--chart-grid)"
  strokeDasharray="3 3"
  vertical={false}
/>

// No grid at all (sparklines, minimal charts)
// Simply omit <CartesianGrid>

// Solid subtle grid (alternative)
<CartesianGrid
  stroke="var(--chart-grid)"
  vertical={false}
/>
```

**Recommendation:** Most charts should use dashed horizontal grid only. Sparklines and pie/radar charts should have no grid.

---

## 5. Existing Chart Audit & Upgrade Plan

### Summary Table

| # | Component | File | Type | Theme? | Grade | Effort |
|---|-----------|------|------|--------|-------|--------|
| 1 | KPICard sparkline | `components/ui/KPICard.tsx` | Area | Partial | A | 15 min |
| 2 | TodayCashFlowChart | `components/today/TodayCashFlowChart.tsx` | Area (dual) | Hardcoded | C | 30 min |
| 3 | CashFlowProjection | `components/charts/CashFlowProjection.tsx` | Area (dual) | Theme ✓ | A+ | 10 min |
| 4 | ComparisonRadar | `components/charts/ComparisonRadar.tsx` | Radar | Theme ✓ | A | 10 min |
| 5 | CashFlowBenchmarkChart | `components/portfolio/CashFlowBenchmarkChart.tsx` | Bar (horiz) | Hardcoded | C | 30 min |
| 6 | EquityGrowthChart | `components/portfolio/EquityGrowthChart.tsx` | Area | Hardcoded | C | 25 min |
| 7 | StrategyAllocationChart | `components/portfolio/StrategyAllocationChart.tsx` | Pie (donut) | Local const | C | 25 min |
| 8 | IncomeExpenseChart | `components/portfolio/IncomeExpenseChart.tsx` | Composed | Hardcoded | C | 30 min |
| 9 | TransactionsPage chart | `pages/transactions/TransactionsPage.tsx` | Composed | Hardcoded | D | 30 min |
| 10 | CashFlowChart | `pages/analyze/components/CashFlowChart.tsx` | Area | Hardcoded | C | 25 min |
| 11 | BreakEvenChart | `pages/analyze/components/BreakEvenChart.tsx` | Area + Ref | Hardcoded | C | 25 min |

**Total estimated effort: ~4.5 hours** (half a day)

### Per-Component Upgrade Details

#### 1. KPICard sparkline — Grade A (minor polish)
- **Current:** Already uses violet gradient (0.20 → 0.06 → 0), 1.5px stroke, animation
- **Upgrade:** Switch gradient stops to use CSS vars. Already close to ideal.

#### 2. TodayCashFlowChart — Grade C → A
- **Current:** All hex colors hardcoded (`#141311`, `#1E1D1B`, `#8A8580`, `#8B7AFF`)
- **Upgrade:**
  - Replace container bg/border with CSS vars
  - Replace axis ticks with `getChartAxis()` or CSS vars
  - Replace grid with `getChartGrid()`
  - Replace inline tooltip styles with `<FrostedTooltip>`
  - Add `CHART_ANIMATION` to both Area components
  - Add crosshair cursor config

#### 3. CashFlowProjection — Grade A+ (reference implementation)
- **Current:** Uses theme system, custom tooltip, cursor, animation. Best-in-class.
- **Upgrade:** Migrate tooltip to `<FrostedTooltip>` for glassmorphism. Otherwise keep as-is.

#### 4. ComparisonRadar — Grade A (minor polish)
- **Current:** Uses theme polar config, custom tooltip and legend.
- **Upgrade:** Add animation to Radar components. Otherwise keep as-is.

#### 5. CashFlowBenchmarkChart — Grade C → A
- **Current:** Hardcoded `#141311`, `#1E1D1B`, `#4ADE80`, `#F87171`
- **Upgrade:**
  - Container → CSS vars
  - Bar colors → `CHART_COLORS.profit` / `CHART_COLORS.loss` (semantic)
  - Axis → `getChartAxis()`
  - Tooltip → `<FrostedTooltip>`
  - Add `CHART_ANIMATION`
  - Add hover opacity on bars

#### 6. EquityGrowthChart — Grade C → A
- **Current:** Hardcoded colors, manual gradient, no grid
- **Upgrade:**
  - Container → CSS vars
  - Gradient → use `GradientDef` helper with violet
  - Add `<CartesianGrid>` with theme config
  - Axis → `getChartAxis()`
  - Tooltip → `<FrostedTooltip>`
  - Add `CHART_ANIMATION`

#### 7. StrategyAllocationChart — Grade C → B+
- **Current:** Local STRATEGY_COLORS map that diverges from theme
- **Upgrade:**
  - Replace local colors with `STRATEGY_CHART_COLORS` from chart-theme
  - Container → CSS vars
  - Add `isAnimationActive` to Pie
  - Tooltip → `<FrostedTooltip>` with percentage formatter

#### 8. IncomeExpenseChart — Grade C → A
- **Current:** Hardcoded `#4ADE80`/`#F87171` (differ from theme's `#6DBEA3`/`#D4766A`)
- **Upgrade:**
  - Colors → `CHART_COLORS.profit` / `CHART_COLORS.loss`
  - Add `<CartesianGrid>`
  - Axis → `getChartAxis()`
  - Tooltip → `<FrostedTooltip>`
  - Add `CHART_ANIMATION` with staggered `animationBegin`

#### 9. TransactionsPage chart — Grade D → B+
- **Current:** Duplicate of IncomeExpenseChart pattern, embedded in page, all hardcoded
- **Upgrade:**
  - Extract to use shared IncomeExpenseChart component (or at minimum apply same theme fixes)
  - All same upgrades as #8

#### 10. CashFlowChart (30yr projection) — Grade C → A
- **Current:** Hardcoded colors, manual gradient, toggle switch
- **Upgrade:**
  - Container → CSS vars
  - Gradient → `GradientDef` helper
  - Axis → `getChartAxis()`
  - Grid → `getChartGrid()`
  - Tooltip → `<FrostedTooltip>`
  - Add `CHART_ANIMATION`
  - Toggle switch → use CSS var colors

#### 11. BreakEvenChart — Grade C → A
- **Current:** Violet stroke + green gradient (mixed colors), hardcoded everything
- **Upgrade:**
  - Unify: use green for both stroke and gradient (it's a positive-progress chart)
  - Or use violet for both (matches accent)
  - Container → CSS vars
  - Axis → `getChartAxis()`
  - Add `<CartesianGrid>` (subtle)
  - Tooltip → `<FrostedTooltip>`
  - Add pulse animation on ReferenceDot at break-even point
  - Add `CHART_ANIMATION`

---

## 6. `chartTheme.ts` Config Spec (updated)

The existing `chart-theme.ts` is solid. Key additions needed:

```typescript
// Add to chart-theme.ts

/** Read a CSS custom property value at call time. */
function cssVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim()
}

/** Returns gradient opacity values for the current theme. */
export function getGradientOpacity() {
  const light = isLightTheme()
  return {
    primary: { from: light ? 0.12 : 0.25, to: 0 },
    secondary: { from: light ? 0.06 : 0.10, to: 0 },
    sparkline: { from: light ? 0.10 : 0.20, mid: light ? 0.03 : 0.06, to: 0 },
  }
}

/** Returns crosshair cursor config for current theme. */
export function getChartCursor() {
  return {
    stroke: '#8B7AFF',
    strokeOpacity: isLightTheme() ? 0.2 : 0.25,
    strokeWidth: 1,
    strokeDasharray: '4 4',
  }
}

/** Standard animation config. */
export const CHART_ANIMATION = {
  isAnimationActive: true,
  animationDuration: 500,
  animationEasing: 'ease-out' as const,
} as const

/** Financial color constants (theme-independent — these work on both). */
export const FINANCIAL_COLORS = {
  positive: { dark: '#6DBEA3', light: '#16a34a' },
  negative: { dark: '#D4766A', light: '#dc2626' },
} as const

export function getFinancialColor(type: 'positive' | 'negative'): string {
  return FINANCIAL_COLORS[type][isLightTheme() ? 'light' : 'dark']
}
```

---

## 7. Implementation Order

**Phase 1 — Foundation (1 hour)**
1. Add CSS variables to `index.css`
2. Add new helpers to `chart-theme.ts`
3. Create `FrostedTooltip` component
4. Create `ChartContainer` wrapper
5. Create `GradientDef` helper
6. Create `ChartSkeleton` component

**Phase 2 — Migrate charts (3 hours)**
7. TodayCashFlowChart → theme system
8. CashFlowBenchmarkChart → theme system
9. EquityGrowthChart → theme system
10. IncomeExpenseChart → theme system
11. TransactionsPage chart → theme system
12. CashFlowChart → theme system
13. BreakEvenChart → theme system
14. StrategyAllocationChart → align colors

**Phase 3 — Polish (30 min)**
15. KPICard sparkline → CSS vars
16. CashFlowProjection → FrostedTooltip
17. ComparisonRadar → add animation
18. Verify all charts in both dark and light mode

---

## 8. Visual Reference Comparison

### Fey.com Key Visual Traits → Parcel Equivalents

| Fey Trait | Fey Value | Parcel Equivalent |
|-----------|-----------|-------------------|
| Background | `#000000` | `#0C0B0A` (warmer) |
| Card background | `rgba(255,255,255,0.08)` | `#141311` (solid warm gray) |
| Text primary | `#FFFFFF` | `#F0EDE8` (warm cream) |
| Text secondary | `#868F97` | `#8A8580` (warm gray) |
| Green (gains) | `#4EBE96` | `#6DBEA3` (slightly softer) |
| Red (losses) | `#FF5C5C` | `#D4766A` (muted coral) |
| Accent | `#479FFA` (blue) | `#8B7AFF` (violet) |
| Line stroke | 1.17px | 1.5px |
| Font | Calibre | Satoshi (headings) / Inter (body) |
| Border radius | 12-16px | 12px (charts) / 16px (cards) |
| Tooltip style | Glassmorphism | `backdrop-filter: blur(12px)` |
| Grid lines | None | Dashed horizontal, low opacity |
| Gradient fill | 60% → 0% opacity | 25% → 0% opacity (subtler) |
| Chart animation | 1s ease-out slide-in | 500ms ease-out fade-in |

### Online References

- [shadcn gradient area chart (closest to target)](https://ui.shadcn.com/charts/area)
- [Fey.com design screens (NicelyDone)](https://nicelydone.club/apps/fey)
- [Fey design breakdown article](https://www.designsystemscollective.com/crafting-a-detailed-ui-kit-from-inspiration-breaking-down-feys-design-2d2761649e40)
- [DariusLukasukas/stocks demo](https://github.com/DariusLukasukas/stocks)
- [LeanlyLabs gradient + glow techniques](https://leanylabs.com/blog/awesome-react-charts-tips/)
- [Reshaped Recharts CSS variable guide](https://www.reshaped.so/docs/getting-started/guidelines/recharts)
- [BuildUI animated number recipe](https://buildui.com/recipes/animated-number)
