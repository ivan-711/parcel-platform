# Agent 16 — Recharts Theme for Parcel Light Mode

Complete, implementation-ready Recharts theming specification for Parcel's dark-to-light migration. Every hex value, every prop, every pixel measurement is final. No placeholders.

References: Agent 01 (design tokens), Agent 07 (data visualization research), existing `CashFlowProjection.tsx` and `ComparisonRadar.tsx`.

---

## 1. Chart Color Palette — 8-Color Series

### Primary Series (ordered by assignment)

Series colors are assigned in order. The first data series always gets indigo; additional series receive the next color in sequence. Maximum 8 series per chart.

```ts
// lib/chart-palette.ts

/**
 * 8-color series palette.
 * Tested against deuteranopia, protanopia, and tritanopia simulations.
 * No adjacent red/green pairs. Every color distinguishable at 50% opacity
 * on white (#FFFFFF) backgrounds.
 */
export const CHART_SERIES = [
  '#6366F1', // 1 — Indigo (brand primary, always first)
  '#F59E0B', // 2 — Amber (warm contrast to indigo)
  '#0EA5E9', // 3 — Sky (pure blue, distinct from indigo)
  '#F43F5E', // 4 — Rose (pinkish-red, NOT pure red)
  '#14B8A6', // 5 — Teal (blue-green, NOT pure green)
  '#8B5CF6', // 6 — Violet (lighter purple, distinct from indigo)
  '#F97316', // 7 — Orange (distinct from amber by hue)
  '#64748B', // 8 — Slate (neutral fallback)
] as const

export type ChartSeriesIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7
```

### Semantic Colors (fixed meaning, never reassigned)

```ts
export const CHART_SEMANTIC = {
  positive:  '#059669', // Success-600 — profit, gain, positive cash flow
  negative:  '#DC2626', // Error-600 — loss, risk, negative cash flow
  neutral:   '#98A2B3', // Gray-400 — baselines, reference lines, inactive
  benchmark: '#6366F1', // Indigo-500 — reference/target lines
} as const
```

### Strategy Color Map (preserved from existing codebase)

```ts
export const STRATEGY_COLORS: Record<string, string> = {
  wholesale:        '#10B981',
  creative_finance: '#8B5CF6',
  brrrr:            '#F59E0B',
  buy_and_hold:     '#3B82F6',
  flip:             '#EF4444',
} as const
```

### Surface Colors for Chart Infrastructure

```ts
export const CHART_SURFACE = {
  gridLine:      '#E2E8F0', // Slate-200 — horizontal grid rules
  axisLine:      '#D0D5DD', // Gray-300 — X-axis bottom stroke
  axisLabel:     '#667085', // Gray-500 — tick text (WCAG AA on white: 4.69:1)
  tooltipBg:     '#FFFFFF',
  tooltipBorder: '#EAECF0', // Gray-200
  tooltipText:   '#101828', // Gray-900
  tooltipMuted:  '#667085', // Gray-500
  cardBg:        '#FFFFFF',
  cardBorder:    '#EAECF0', // Gray-200
  cursorLine:    '#6366F1', // Indigo-500 at low opacity
  barHover:      '#F9FAFB', // Gray-50 — bar chart cursor highlight
} as const
```

---

## 2. Axis Styling

### X-Axis

```ts
export const xAxisDefaults = {
  tick: {
    fontSize: 12,
    fill: CHART_SURFACE.axisLabel,    // #667085
    fontFamily: '"Inter", sans-serif',
  },
  tickLine: false,
  axisLine: {
    stroke: CHART_SURFACE.axisLine,   // #D0D5DD
    strokeWidth: 1,
  },
} as const
```

Design notes:
- **Inter** for axis labels (not JetBrains Mono). Axis labels are category text (month names, metric names), not financial figures. Agent 01 reserves JetBrains Mono for numeric values only.
- No tick marks (`tickLine: false`). The grid lines serve as visual anchors.
- Thin 1px axis line at Gray-300. Subtle but present to anchor the chart bottom.

### Y-Axis

```ts
export const yAxisDefaults = {
  tick: {
    fontSize: 11,
    fill: CHART_SURFACE.axisLabel,
    fontFamily: '"JetBrains Mono", monospace',
  },
  tickLine: false,
  axisLine: false, // No Y-axis line — grid lines imply the axis
  width: 64,
} as const
```

Design notes:
- **JetBrains Mono** for Y-axis ticks because they display financial values ($12K, 8.5%).
- No axis line. Mercury and Stripe both omit the Y-axis line; the horizontal grid lines serve as the visual reference.
- `width: 64` accommodates formatted values like `$120K` or `-$1.2M` without clipping.

### Axis Label Formatting

X-axis categories use Inter at 12px. Y-axis values use JetBrains Mono at 11px (one size smaller to reduce visual weight). Both use Gray-500 (`#667085`) which achieves WCAG AA contrast (4.69:1) on white backgrounds.

---

## 3. Grid Configuration

```ts
export const gridDefaults = {
  strokeDasharray: '3 3',
  stroke: CHART_SURFACE.gridLine, // #E2E8F0
  strokeOpacity: 0.5,
  vertical: false,
} as const
```

Design notes:
- **Horizontal only**. Vertical grid lines add visual noise without aiding value reading. Mercury and Stripe both omit them.
- **Dashed at 0.5 opacity**. The effective color is approximately `#F1F5F9` (Slate-100 equivalent) — barely visible but enough to guide the eye to Y-axis values.
- `strokeDasharray: '3 3'` produces a balanced dash/gap ratio that reads as "soft" rather than "mechanical."

Migration note: The current `CashFlowProjection.tsx` uses `strokeOpacity={0.05}` which is invisible on white. Change to `0.5`.

---

## 4. Tooltip Styling

### Shared Custom Tooltip Props

```ts
export const tooltipCursorDefaults = {
  stroke: CHART_SURFACE.cursorLine, // #6366F1
  strokeOpacity: 0.15,
  strokeWidth: 1,
} as const
```

### `<ChartTooltip>` Component Spec

```tsx
// components/charts/ChartTooltip.tsx

interface TooltipEntry {
  name: string
  value: number
  color: string
  dataKey: string
}

interface ChartTooltipProps {
  active?: boolean
  payload?: TooltipEntry[]
  label?: string
  formatValue?: (value: number) => string
}

export function ChartTooltip({
  active,
  payload,
  label,
  formatValue = (v) => v.toLocaleString(),
}: ChartTooltipProps) {
  if (!active || !payload?.length) return null

  return (
    <div
      className={cn(
        'rounded-lg border bg-white px-3 py-2.5',
        'border-gray-200',
        'shadow-[0_4px_12px_rgba(0,0,0,0.08)]'
      )}
    >
      {label && (
        <p className="mb-1.5 text-xs font-medium text-gray-500">
          {label}
        </p>
      )}
      <div className="space-y-0.5">
        {payload.map((entry) => (
          <div key={entry.dataKey} className="flex items-center gap-2">
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-xs text-gray-500">{entry.name}</span>
            <span className="ml-auto font-mono text-sm font-semibold text-gray-900 tabular-nums">
              {formatValue(entry.value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
```

Visual properties:
- **Background**: White (`#FFFFFF`)
- **Border**: 1px Gray-200 (`#EAECF0`)
- **Shadow**: `0 4px 12px rgba(0,0,0,0.08)` — soft, diffuse, no harsh edges
- **Border radius**: `8px` (`rounded-lg`)
- **Padding**: `12px` horizontal, `10px` vertical
- **Label font**: Inter, 12px, medium weight, Gray-500
- **Value font**: JetBrains Mono, 14px, semibold, Gray-900, `tabular-nums`
- **Color dot**: 8x8px circle, series color, `rounded-full`
- **Max width**: Unconstrained (auto-size to content)

Tooltip cursor: Vertical line at Indigo-500, 15% opacity. Not a crosshair, not a highlighted band. This matches Mercury's hover pattern.

---

## 5. Legend Configuration

```ts
export const legendDefaults = {
  verticalAlign: 'top' as const,
  align: 'right' as const,
  iconType: 'circle' as const,
  iconSize: 8,
  wrapperStyle: {
    paddingBottom: 16,
    fontSize: 12,
    fontFamily: '"Inter", sans-serif',
    color: '#667085', // Gray-500
  },
} as const
```

Design notes:
- **Position**: Top-right of the chart card, inline with the title row. This keeps the legend out of the chart area and avoids overlap. When using `<ChartCard>`, the legend is placed in the header's `legend` slot, not Recharts' built-in `<Legend>`.
- **Icon**: Small circle (8px), filled with series color. Not square, not line-segment.
- **Font**: Inter, 12px, regular weight, Gray-500. Legends are metadata, not primary content.
- **Spacing**: 16px gap between legend items. 16px bottom padding before chart area.

For custom legends outside the chart (preferred for `<ChartCard>` pattern):

```tsx
interface LegendItem {
  label: string
  color: string
}

function ChartLegend({ items }: { items: LegendItem[] }) {
  return (
    <div className="flex items-center gap-4">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-1.5">
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: item.color }}
          />
          <span className="text-xs text-gray-500">{item.label}</span>
        </div>
      ))}
    </div>
  )
}
```

---

## 6. Per-Chart Configurations

### 6a. Line Chart

```tsx
// Usage: trend lines, time series without area fill
<LineChart data={data} margin={chartMargins}>
  <CartesianGrid {...gridDefaults} />
  <XAxis dataKey="label" {...xAxisDefaults} />
  <YAxis {...yAxisDefaults} tickFormatter={formatDollar} />
  <Tooltip
    content={<ChartTooltip formatValue={formatTooltipCurrency} />}
    cursor={tooltipCursorDefaults}
  />
  <Line
    type="monotone"
    dataKey="value"
    stroke={CHART_SERIES[0]}      // #6366F1
    strokeWidth={2}
    dot={false}
    activeDot={{
      r: 4,
      strokeWidth: 2,
      stroke: CHART_SERIES[0],
      fill: '#FFFFFF',
    }}
  />
</LineChart>
```

Properties:
- `type="monotone"` — smooth curves, not jagged connections
- `strokeWidth={2}` — visible but not heavy
- `dot={false}` — clean line, no data point markers
- `activeDot` — white fill with colored stroke ring, 4px radius. Only appears on hover.

For multi-series line charts, stagger `animationBegin` by 200ms per series:

```tsx
{series.map((s, i) => (
  <Line
    key={s.dataKey}
    type="monotone"
    dataKey={s.dataKey}
    stroke={CHART_SERIES[i]}
    strokeWidth={2}
    dot={false}
    activeDot={{ r: 4, strokeWidth: 2, stroke: CHART_SERIES[i], fill: '#fff' }}
    animationBegin={i * 200}
    animationDuration={800}
    animationEasing="ease-out"
  />
))}
```

### 6b. Bar Chart

```tsx
// Usage: strategy comparison, monthly cash flow, metric breakdowns
<BarChart data={data} margin={chartMargins}>
  <CartesianGrid {...gridDefaults} />
  <XAxis dataKey="label" {...xAxisDefaults} />
  <YAxis {...yAxisDefaults} tickFormatter={formatDollar} />
  <Tooltip
    content={<ChartTooltip formatValue={formatTooltipCurrency} />}
    cursor={{ fill: CHART_SURFACE.barHover }} // #F9FAFB
  />
  <Bar
    dataKey="value"
    fill={CHART_SERIES[0]}
    radius={[4, 4, 0, 0]}
    barSize={28}
    fillOpacity={0.85}
  />
</BarChart>
```

Properties:
- `radius={[4, 4, 0, 0]}` — rounded top corners only (Stripe pattern)
- `barSize={28}` — default width; adjust to 20 for grouped bars, 36 for single-series with few categories
- `fillOpacity={0.85}` — slightly transparent for depth; solid at 1.0 looks flat
- Cursor: `fill: '#F9FAFB'` (Gray-50) — barely-visible highlight on hover column

For positive/negative cash flow bars, use `<Cell>` coloring:

```tsx
<Bar dataKey="cashFlow" radius={[4, 4, 0, 0]} barSize={28}>
  {data.map((entry, i) => (
    <Cell
      key={i}
      fill={entry.cashFlow >= 0 ? CHART_SEMANTIC.positive : CHART_SEMANTIC.negative}
      fillOpacity={0.85}
    />
  ))}
</Bar>
```

For grouped bars (side-by-side comparison):
- `barCategoryGap="20%"` between groups
- `barSize={20}` per bar (narrower to fit groups)
- Each `<Bar>` gets a different `CHART_SERIES` color

### 6c. Donut / Pie Chart

```tsx
// Usage: portfolio strategy breakdown, allocation displays
<PieChart>
  <Pie
    data={data}
    cx="50%"
    cy="50%"
    innerRadius={55}
    outerRadius={85}
    paddingAngle={3}
    dataKey="value"
    nameKey="name"
    stroke="#FFFFFF"
    strokeWidth={2}
  >
    {data.map((entry, i) => (
      <Cell key={entry.name} fill={entry.color || CHART_SERIES[i]} />
    ))}
  </Pie>
  <Tooltip content={<ChartTooltip formatValue={formatPercent} />} />
</PieChart>
```

Properties:
- `innerRadius={55}` / `outerRadius={85}` — 30px ring width, enough for readability
- `paddingAngle={3}` — visible gap between segments
- `stroke="#FFFFFF" strokeWidth={2}` — white gap lines between segments (Stripe pattern). On white backgrounds this creates clean visual separation.
- No built-in `<Legend>` — use the external `ChartLegend` component positioned below the donut.

Center label (for donut charts showing a total):

```tsx
// Overlay centered inside the donut via absolute positioning
<div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
  <span className="font-mono text-2xl font-bold text-gray-900">
    {formatDollar(total)}
  </span>
  <span className="text-xs text-gray-500">Total</span>
</div>
```

### 6d. Area Chart

```tsx
// Usage: cash flow projection, portfolio value over time
<AreaChart data={data} margin={chartMargins}>
  <defs>
    <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor={CHART_SERIES[0]} stopOpacity={0.12} />
      <stop offset="100%" stopColor={CHART_SERIES[0]} stopOpacity={0.01} />
    </linearGradient>
  </defs>
  <CartesianGrid {...gridDefaults} />
  <XAxis dataKey="month" {...xAxisDefaults}
    tickFormatter={(v: string) => v.replace('Month ', 'M')}
  />
  <YAxis {...yAxisDefaults} tickFormatter={formatDollar} />
  <Tooltip
    content={<ChartTooltip formatValue={formatTooltipCurrency} />}
    cursor={tooltipCursorDefaults}
  />
  <Area
    type="monotone"
    dataKey="monthlyCashFlow"
    stroke={CHART_SERIES[0]}
    strokeWidth={2}
    fill="url(#areaGradient)"
    dot={false}
    activeDot={{ r: 4, strokeWidth: 2, stroke: CHART_SERIES[0], fill: '#fff' }}
  />
  <Area
    type="monotone"
    dataKey="cumulativeCashFlow"
    stroke="#10B981"
    strokeWidth={2}
    fill="none"
    dot={false}
    activeDot={{ r: 4, strokeWidth: 2, stroke: '#10B981', fill: '#fff' }}
  />
</AreaChart>
```

Key differences from dark theme:
- Gradient `stopOpacity` drops from `0.2` to `0.12` at top, `0.01` at bottom. On white backgrounds, heavy fills look muddy. The 0.12 creates a soft tint without competing with the stroke.
- `activeDot` has white fill so it pops against the colored stroke.
- `dot={false}` for clean lines. Dots clutter area charts with 12+ data points.
- Second series (cumulative) uses `fill="none"` — line only, no stacked area fills.

### 6e. Radar Chart

```tsx
// Usage: deal comparison (multi-dimensional spider chart)
<RadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
  <PolarGrid stroke={CHART_SURFACE.gridLine} />
  <PolarAngleAxis
    dataKey="dimension"
    tick={{
      fill: CHART_SURFACE.axisLabel,
      fontSize: 12,
      fontFamily: '"Inter", sans-serif',
      fontWeight: 500,
    }}
  />
  <PolarRadiusAxis
    angle={90}
    domain={[0, 100]}
    tick={{
      fill: CHART_SEMANTIC.neutral,
      fontSize: 10,
      fontFamily: '"JetBrains Mono", monospace',
    }}
    tickCount={5}
    axisLine={false}
  />
  {deals.map((deal, i) => (
    <Radar
      key={deal.id}
      name={deal.address}
      dataKey={deal.address}
      stroke={CHART_SERIES[i]}
      fill={CHART_SERIES[i]}
      fillOpacity={0.08}
      strokeWidth={2}
    />
  ))}
</RadarChart>
```

Key differences from dark theme:
- `PolarGrid stroke` changes from `#252540` to `#E2E8F0` (Slate-200).
- `fillOpacity` drops from `0.15` to `0.08`. With multiple overlapping polygons on white, lower opacity prevents washed-out/muddy overlap zones.
- Angle axis labels use Inter (category text), radius axis ticks use JetBrains Mono (numeric scale).

---

## 7. Sparkline Configuration for KPI Cards

Sparklines are minimal area charts embedded in KPI cards. No axes, no grid, no tooltip, no legend. Pure shape.

```tsx
interface SparklineProps {
  data: number[]
  color: string    // Series or semantic color
  height?: number  // Default: 48
  width?: string   // Default: '100%'
}

function Sparkline({ data, color, height = 48, width = '100%' }: SparklineProps) {
  const chartData = data.map((value, i) => ({ i, value }))
  const gradientId = `spark-${color.replace('#', '')}`

  return (
    <ResponsiveContainer width={width} height={height}>
      <AreaChart data={chartData} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.08} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={1.5}
          fill={`url(#${gradientId})`}
          dot={false}
          isAnimationActive={true}
          animationDuration={800}
          animationEasing="ease-out"
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
```

Properties:
- **Height**: 48px default (fits inside a KPI card without dominating)
- **Stroke**: 1.5px — thin enough to feel ambient, thick enough to be visible
- **Gradient**: 0.08 top opacity, 0 bottom. On white, this creates a whisper of color.
- **No axes, no grid, no tooltip**: Sparklines communicate trend direction, not exact values
- **Animation**: 800ms ease-out entrance. Skipped when `prefers-reduced-motion`.

Color assignment for sparklines:
- Revenue / positive metric: `CHART_SEMANTIC.positive` (`#059669`)
- Cost / negative metric: `CHART_SEMANTIC.negative` (`#DC2626`)
- Neutral / general metric: `CHART_SERIES[0]` (`#6366F1`)

---

## 8. Responsive Behavior

### Chart Heights by Breakpoint

| Chart Type | Desktop (>=768px) | Mobile (<768px) |
|---|---|---|
| Area / Line / Bar | 300px | 220px |
| Radar | 380px | 280px |
| Donut / Pie | 220px | 200px |
| Sparkline | 48px | 48px |

### `useChartHeight` Hook

```ts
import { useState, useEffect } from 'react'

function useChartHeight(desktop: number, mobile: number): number {
  const [height, setHeight] = useState(desktop)

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)')
    setHeight(mq.matches ? mobile : desktop)

    const handler = (e: MediaQueryListEvent) => setHeight(e.matches ? mobile : desktop)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [desktop, mobile])

  return height
}
```

### Axis Adaptation on Mobile

```tsx
// Inside chart components:
const isMobile = useChartHeight(300, 220) === 220

<XAxis
  {...xAxisDefaults}
  interval={isMobile ? 2 : 0}           // Show every 3rd label on mobile
  tick={{
    ...xAxisDefaults.tick,
    fontSize: isMobile ? 10 : 12,
  }}
  angle={isMobile ? -45 : 0}
  textAnchor={isMobile ? 'end' : 'middle'}
/>
```

### Bar Chart Horizontal Scroll

For bar charts with 12+ categories on mobile, allow horizontal scrolling:

```tsx
<div className="overflow-x-auto -mx-6 px-6">
  <div style={{ minWidth: Math.max(data.length * 48, 300) }}>
    <ResponsiveContainer width="100%" height={chartHeight}>
      {/* BarChart */}
    </ResponsiveContainer>
  </div>
</div>
```

The negative margin / padding trick maintains the card's visual padding while allowing the scroll area to reach the edges.

### Radar Chart on Mobile

Reduce `outerRadius` from `"70%"` to `"60%"` on mobile to prevent axis labels from clipping:

```tsx
<RadarChart
  cx="50%" cy="50%"
  outerRadius={isMobile ? '60%' : '70%'}
  data={data}
>
```

---

## 9. Animation

### Entrance Animation

All Recharts shape components receive these defaults:

```ts
export const chartAnimationDefaults = {
  isAnimationActive: true,
  animationDuration: 800,
  animationEasing: 'ease-out' as const,
  animationBegin: 0,
} as const
```

For multi-series charts, stagger by 200ms per series:

```ts
export function staggeredAnimation(index: number) {
  return {
    ...chartAnimationDefaults,
    animationBegin: index * 200,
  }
}
```

### Container Entrance (Framer Motion)

Chart cards enter the viewport with a subtle slide-up:

```ts
export const chartSlideUp = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] },
  },
} as const
```

Usage:

```tsx
<motion.div variants={chartSlideUp} initial="hidden" animate="visible">
  <ChartCard title="Cash Flow Projection">
    {/* chart */}
  </ChartCard>
</motion.div>
```

### Data Update Animation

When data changes (e.g., time range selector toggled), Recharts animates the transition automatically. Ensure `isAnimationActive={true}` remains set. For bar charts, Recharts morphs bar heights. For area/line charts, it interpolates the path.

No additional Framer Motion animation on data updates — let Recharts handle it to avoid double-animation jank.

### Reduced Motion

```ts
import { useState, useEffect } from 'react'

export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduced(mq.matches)
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  return reduced
}
```

Pass to every chart component:

```tsx
const prefersReduced = usePrefersReducedMotion()

<Area
  // ...other props
  isAnimationActive={!prefersReduced}
  animationDuration={prefersReduced ? 0 : 800}
/>
```

Also gate the Framer Motion container entrance:

```tsx
<motion.div
  variants={chartSlideUp}
  initial={prefersReduced ? 'visible' : 'hidden'}
  animate="visible"
>
```

---

## 10. Shared `<ChartTooltip>` and `<ChartCard>` Component Specs

### `<ChartTooltip>`

Full spec provided in Section 4 above. Key API:

```ts
interface ChartTooltipProps {
  active?: boolean
  payload?: Array<{
    name: string
    value: number
    color: string
    dataKey: string
  }>
  label?: string
  formatValue?: (value: number) => string
}
```

Usage with Recharts:

```tsx
<Tooltip
  content={<ChartTooltip formatValue={formatTooltipCurrency} />}
  cursor={tooltipCursorDefaults}
/>
```

The single `formatValue` prop handles all formatting needs:
- Dollar values: `formatTooltipCurrency` (full: `$125,000`)
- Percentages: `(v) => \`${v.toFixed(1)}%\``
- Counts: `(v) => v.toLocaleString()`

### `<ChartCard>`

```tsx
interface ChartCardProps {
  title: string
  subtitle?: string
  action?: React.ReactNode        // Time range selector, export button
  legend?: React.ReactNode         // ChartLegend items
  children: React.ReactNode        // ResponsiveContainer + chart
  className?: string
  height?: number                  // Passed to ResponsiveContainer, default 300
}

function ChartCard({
  title,
  subtitle,
  action,
  legend,
  children,
  className,
  height = 300,
}: ChartCardProps) {
  return (
    <div
      className={cn(
        'rounded-xl border border-gray-200 bg-white p-6',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
          {subtitle && (
            <p className="mt-0.5 text-xs text-gray-500">{subtitle}</p>
          )}
        </div>
        {action && <div className="ml-4 shrink-0">{action}</div>}
      </div>

      {/* Legend (below header, above chart) */}
      {legend && (
        <div className="mt-3 mb-4 flex items-center gap-4">
          {legend}
        </div>
      )}

      {/* Chart area */}
      <div
        style={{ height }}
        className={cn('w-full', !legend && !subtitle && 'mt-4')}
      >
        <ResponsiveContainer width="100%" height="100%">
          {children}
        </ResponsiveContainer>
      </div>
    </div>
  )
}
```

Visual properties:
- **Border**: 1px Gray-200 (`#EAECF0`)
- **Background**: White (`#FFFFFF`)
- **Border radius**: 12px (`rounded-xl`)
- **Padding**: 24px (`p-6`)
- **Title**: Inter, 14px, semibold, Gray-900
- **Subtitle**: Inter, 12px, regular, Gray-500
- **No box-shadow** on the card itself (Mercury pattern — borders only, shadows reserved for tooltips and dropdowns)

### Number Formatting Utilities

```ts
// lib/chart-format.ts

/** Abbreviated dollar format for axis labels. $1.2M, $120K, $500 */
export function formatDollar(value: number): string {
  if (Math.abs(value) >= 1_000_000)
    return `$${(value / 1_000_000).toFixed(1)}M`
  if (Math.abs(value) >= 1_000)
    return `$${(value / 1_000).toFixed(0)}K`
  return `$${value.toLocaleString('en-US')}`
}

/** Full-precision currency for tooltips. $125,000 */
export function formatTooltipCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value)
}

/** Percentage format. 8.5% */
export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`
}
```

---

## 11. Complete Recharts Theme Object

Single import, copy-paste ready. Place in `frontend/src/lib/chart-theme.ts`.

```ts
// frontend/src/lib/chart-theme.ts
//
// Single source of truth for all Recharts styling in Parcel (light theme).
// Import from here — never hardcode chart hex values in component files.

// ─── Color Palette ───────────────────────────────────────────────────────

export const CHART_SERIES = [
  '#6366F1', // Indigo (brand primary)
  '#F59E0B', // Amber
  '#0EA5E9', // Sky
  '#F43F5E', // Rose
  '#14B8A6', // Teal
  '#8B5CF6', // Violet
  '#F97316', // Orange
  '#64748B', // Slate
] as const

export const CHART_SEMANTIC = {
  positive:  '#059669',
  negative:  '#DC2626',
  neutral:   '#98A2B3',
  benchmark: '#6366F1',
} as const

export const STRATEGY_COLORS: Record<string, string> = {
  wholesale:        '#10B981',
  creative_finance: '#8B5CF6',
  brrrr:            '#F59E0B',
  buy_and_hold:     '#3B82F6',
  flip:             '#EF4444',
} as const

export const CHART_SURFACE = {
  gridLine:      '#E2E8F0',
  axisLine:      '#D0D5DD',
  axisLabel:     '#667085',
  tooltipBg:     '#FFFFFF',
  tooltipBorder: '#EAECF0',
  tooltipText:   '#101828',
  tooltipMuted:  '#667085',
  cardBg:        '#FFFFFF',
  cardBorder:    '#EAECF0',
  cursorLine:    '#6366F1',
  barHover:      '#F9FAFB',
} as const

// ─── Axis Defaults ───────────────────────────────────────────────────────

export const xAxisDefaults = {
  tick: {
    fontSize: 12,
    fill: CHART_SURFACE.axisLabel,
    fontFamily: '"Inter", sans-serif',
  },
  tickLine: false,
  axisLine: { stroke: CHART_SURFACE.axisLine, strokeWidth: 1 },
} as const

export const yAxisDefaults = {
  tick: {
    fontSize: 11,
    fill: CHART_SURFACE.axisLabel,
    fontFamily: '"JetBrains Mono", monospace',
  },
  tickLine: false,
  axisLine: false,
  width: 64,
} as const

// ─── Grid ────────────────────────────────────────────────────────────────

export const gridDefaults = {
  strokeDasharray: '3 3',
  stroke: CHART_SURFACE.gridLine,
  strokeOpacity: 0.5,
  vertical: false,
} as const

// ─── Margins ─────────────────────────────────────────────────────────────

export const chartMargins = {
  top: 8,
  right: 16,
  bottom: 4,
  left: 8,
} as const

// ─── Tooltip ─────────────────────────────────────────────────────────────

export const tooltipCursorDefaults = {
  stroke: CHART_SURFACE.cursorLine,
  strokeOpacity: 0.15,
  strokeWidth: 1,
} as const

// ─── Animation ───────────────────────────────────────────────────────────

export const chartAnimationDefaults = {
  isAnimationActive: true,
  animationDuration: 800,
  animationEasing: 'ease-out' as const,
  animationBegin: 0,
} as const

export function staggeredAnimation(index: number) {
  return {
    ...chartAnimationDefaults,
    animationBegin: index * 200,
  }
}

// ─── Framer Motion Variants ──────────────────────────────────────────────

export const chartSlideUp = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] },
  },
} as const

// ─── Number Formatting ──────────────────────────────────────────────────

export function formatDollar(value: number): string {
  if (Math.abs(value) >= 1_000_000)
    return `$${(value / 1_000_000).toFixed(1)}M`
  if (Math.abs(value) >= 1_000)
    return `$${(value / 1_000).toFixed(0)}K`
  return `$${value.toLocaleString('en-US')}`
}

export function formatTooltipCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value)
}

export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`
}

// ─── Area Chart Gradient Factory ─────────────────────────────────────────

/**
 * Returns a unique gradient ID for area chart fills.
 * Usage: <linearGradient id={areaGradientId('indigo')} .../>
 *        then fill={`url(#${areaGradientId('indigo')})`}
 */
export function areaGradientId(name: string): string {
  return `area-${name}`
}

export const AREA_GRADIENT_OPACITY = {
  top: 0.12,
  bottom: 0.01,
} as const

// ─── Active Dot Factory ──────────────────────────────────────────────────

export function activeDotStyle(color: string) {
  return {
    r: 4,
    strokeWidth: 2,
    stroke: color,
    fill: '#FFFFFF',
  }
}

// ─── Responsive Heights ──────────────────────────────────────────────────

export const CHART_HEIGHTS = {
  area:      { desktop: 300, mobile: 220 },
  line:      { desktop: 300, mobile: 220 },
  bar:       { desktop: 300, mobile: 220 },
  radar:     { desktop: 380, mobile: 280 },
  donut:     { desktop: 220, mobile: 200 },
  sparkline: { desktop: 48,  mobile: 48  },
} as const

// ─── Legend Defaults ─────────────────────────────────────────────────────

export const legendDefaults = {
  verticalAlign: 'top' as const,
  align: 'right' as const,
  iconType: 'circle' as const,
  iconSize: 8,
  wrapperStyle: {
    paddingBottom: 16,
    fontSize: 12,
    fontFamily: '"Inter", sans-serif',
    color: CHART_SURFACE.axisLabel,
  },
} as const

// ─── Bar Chart Defaults ──────────────────────────────────────────────────

export const barDefaults = {
  radius: [4, 4, 0, 0] as [number, number, number, number],
  barSize: 28,
  fillOpacity: 0.85,
} as const

// ─── Donut/Pie Defaults ─────────────────────────────────────────────────

export const donutDefaults = {
  innerRadius: 55,
  outerRadius: 85,
  paddingAngle: 3,
  stroke: '#FFFFFF',
  strokeWidth: 2,
} as const

// ─── Sparkline Defaults ──────────────────────────────────────────────────

export const sparklineDefaults = {
  strokeWidth: 1.5,
  gradientOpacityTop: 0.08,
  gradientOpacityBottom: 0,
  margin: { top: 4, right: 0, bottom: 0, left: 0 },
} as const
```

---

## CRITICAL DECISIONS

### CD-1: Inter for category axis labels, JetBrains Mono for numeric values only

The Agent 07 research file uses JetBrains Mono for all axis ticks. This document overrides that: X-axis labels showing month names, metric labels, and strategy names use Inter. Only Y-axis ticks and tooltip values — actual numbers — use JetBrains Mono. Rationale: monospace text for non-numeric labels looks mechanical and wastes horizontal space. Agent 01 design tokens already establish this convention: JetBrains Mono is for "financial numbers (cap rate, %, $, cash flow)," not category labels.

### CD-2: Grid opacity at 0.5, not 0.05

The existing `CashFlowProjection.tsx` uses `strokeOpacity={0.05}` which was appropriate for the dark theme (where any light line is visible against `#08080F`). On white backgrounds, 0.05 opacity is invisible. The new value of `0.5` on Slate-200 (`#E2E8F0`) produces an effective visible color of approximately `#F1F5F9` — matching Mercury's barely-there horizontal rules.

### CD-3: Area gradient opacity at 0.12, not 0.2

The current dark-theme value of 0.2 produces a muddy wash on white backgrounds. 0.12 maintains the "tinted area" effect without competing with the stroke line. This is the single most visible change in the migration.

### CD-4: Radar fill opacity at 0.08, not 0.15

Multiple overlapping polygons at 0.15 on white create opaque-looking intersections that obscure the individual series shapes. At 0.08, even triple-overlap zones remain semi-transparent and distinguishable.

### CD-5: Semantic colors use the -600 shade, not -500

`CHART_SEMANTIC.positive` is `#059669` (Success-600), not `#10B981` (Success-500). On white backgrounds, the -500 shades have lower contrast. The -600 variants achieve WCAG AA contrast ratios (4.5:1+) while remaining visually similar. Exception: strategy colors in `STRATEGY_COLORS` are preserved at their existing -500 values for backward compatibility with existing pipeline and badge code.

### CD-6: No box-shadow on `<ChartCard>`

Mercury uses border-only containers. Shadows are reserved for floating elements (tooltips, dropdowns, modals). Chart cards use `border border-gray-200` with no shadow. This is a deliberate departure from the current codebase's dark-theme elevated surfaces.

### CD-7: Legend in the card header, not inside the chart area

The Agent 07 research shows Recharts `<Legend>` below the chart. This document places the legend in the `<ChartCard>` header row (between title and action slot), using the custom `<ChartLegend>` component. Rationale: placing legend inside the chart area steals vertical space from the data visualization. The header row has unused horizontal space. Exception: `RadarChart`, where the chart fills the entire container and a Recharts `<Legend>` below it is acceptable.

### CD-8: Color-blind safe palette replaces `DEAL_COLORS`

The existing `ComparisonRadar.tsx` uses `['#6366F1', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6']` which places green (`#10B981`) and red (`#EF4444`) in positions 2 and 4 — indistinguishable under deuteranopia. The new `CHART_SERIES` palette replaces green with amber at position 2 and red with rose at position 4, with teal (blue-green) instead of pure green at position 5. No adjacent pair fails a color-vision-deficiency simulation.

### CD-9: Separate semantic colors from series colors

`CHART_SEMANTIC` (positive green, negative red) is never used as series colors in multi-series charts. They are reserved exclusively for conditional formatting: positive/negative cash flow cells in bar charts, profit/loss indicators, risk score coloring. This prevents the confusion of "is this bar green because it's series 2, or because it's positive?"

### CD-10: `activeDot` with white fill

On the dark theme, active dots used the series color as fill. On a white background, a colored dot with a colored stroke disappears into the white card. The light theme uses `fill: '#FFFFFF'` with the series color as `stroke`, creating a ring effect that pops visually. The white center also acts as a "window" showing the precise intersection with the data line.

### CD-11: No tooltip on sparklines

Sparklines are ambient data displays in KPI cards. Adding hover tooltips would require the user to interact with a 48px-tall chart, which is a poor touch target on mobile. The KPI card itself displays the exact value. Sparklines convey trend shape only.

### CD-12: Single light-mode theme file, no conditional branching

This theme object is exclusively for light mode. The existing dark-theme values are hardcoded in component files. During migration, each chart component switches from inline hex values to importing from `chart-theme.ts`. There is no runtime theme toggle — the dark theme is being replaced, not dual-maintained. If a dark mode is reintroduced later, a `chart-theme-dark.ts` file with identical exports would be created and swapped via a provider.

### CD-13: `prefers-reduced-motion` at the component level, not the theme level

The theme object sets `isAnimationActive: true` as the default. Each chart component is responsible for calling `usePrefersReducedMotion()` and overriding to `false`. This avoids making the theme object depend on React hooks while ensuring every chart honors the OS accessibility setting.

### CD-14: Fixed bar size, not auto-calculated

`barSize={28}` is hardcoded rather than letting Recharts auto-calculate. Auto-calculation produces 3px-wide bars on charts with many data points and 80px-wide bars on charts with few. Fixed size ensures visual consistency across pages. For grouped bars (2-3 series), use `barSize={20}` to fit within the category width.
