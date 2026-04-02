# Agent 07 — Data Visualization & Chart Design for Parcel

Research on chart styling, Recharts theming, and data display patterns for Parcel's
migration from dark-only to a professional light theme. References Mercury and
Stripe Dashboard aesthetics.

---

## 1. Light Theme Color Palette for Charts

### Primary Series Colors (ordered by use frequency)

```ts
// chart-palette.ts — single source of truth for all Recharts colors
export const CHART_COLORS = {
  // Primary series — used for the first/main data series
  indigo:    '#6366F1',
  // Secondary series — ordered for multi-series charts
  emerald:   '#10B981',
  amber:     '#F59E0B',
  sky:       '#0EA5E9',
  rose:      '#F43F5E',
  violet:    '#8B5CF6',
  teal:      '#14B8A6',
  orange:    '#F97316',

  // Semantic (fixed meaning across all charts)
  positive:  '#10B981',  // profit, gain, positive cash flow
  negative:  '#EF4444',  // loss, risk, negative cash flow
  neutral:   '#94A3B8',  // baselines, reference lines, inactive

  // Light theme surfaces
  gridLine:     '#E2E8F0',  // Slate 200 — faint horizontal rules
  axisLine:     '#CBD5E1',  // Slate 300 — axis strokes
  axisLabel:    '#64748B',  // Slate 500 — tick labels
  tooltipBg:    '#FFFFFF',
  tooltipBorder:'#E2E8F0',
  tooltipText:  '#0F172A',  // Slate 900
  cardBg:       '#FFFFFF',
  cardBorder:   '#F1F5F9',  // Slate 100
} as const
```

### Color-Blind Safe Palette (8-series maximum)

The palette above already avoids pure red/green adjacency. For extra safety,
use these distinguishable alternatives when plotting 4+ series:

```ts
export const CB_SAFE_SERIES = [
  '#6366F1', // indigo  — distinct blue-violet
  '#F59E0B', // amber   — warm yellow
  '#0EA5E9', // sky     — pure blue
  '#F43F5E', // rose    — pinkish red (not pure red)
  '#14B8A6', // teal    — blue-green (not pure green)
  '#8B5CF6', // violet  — purple
  '#F97316', // orange  — distinct from amber
  '#64748B', // slate   — gray fallback
]
```

This avoids the red-green and blue-yellow confusion axes. Tested against
deuteranopia, protanopia, and tritanopia simulations.

### Strategy Color Map (preserved from existing codebase)

```ts
export const STRATEGY_COLORS: Record<Strategy, string> = {
  wholesale:        '#10B981',
  creative_finance: '#8B5CF6',
  brrrr:            '#F59E0B',
  buy_and_hold:     '#3B82F6',
  flip:             '#EF4444',
}
```

---

## 2. Recharts Theming — Base Configuration

### Shared Props Object

Create a reusable config so every chart gets consistent styling without
copy-pasting axis props across 10+ files:

```tsx
// lib/chart-theme.ts
import { CHART_COLORS } from './chart-palette'

/** Shared XAxis props for all Recharts charts in light theme. */
export const xAxisDefaults = {
  tick: {
    fontSize: 12,
    fill: CHART_COLORS.axisLabel,
    fontFamily: '"JetBrains Mono", monospace',
  },
  tickLine: false,
  axisLine: { stroke: CHART_COLORS.axisLine, strokeWidth: 1 },
} as const

/** Shared YAxis props for all Recharts charts in light theme. */
export const yAxisDefaults = {
  tick: {
    fontSize: 11,
    fill: CHART_COLORS.axisLabel,
    fontFamily: '"JetBrains Mono", monospace',
  },
  tickLine: false,
  axisLine: false,
  width: 64,
} as const

/** CartesianGrid: horizontal only, light slate dashes. */
export const gridDefaults = {
  strokeDasharray: '3 3',
  stroke: CHART_COLORS.gridLine,
  vertical: false,
} as const

/** Standard chart margins for all CartesianGrid-based charts. */
export const chartMargins = {
  top: 8,
  right: 16,
  bottom: 4,
  left: 8,
} as const
```

### Mercury/Stripe Styling Rules Applied

Mercury and Stripe share these chart conventions on light backgrounds:

1. **No vertical grid lines** — horizontal only, at low opacity (`#E2E8F0`).
2. **No Y-axis line** — tick labels float; the grid lines imply the axis.
3. **Minimal X-axis line** — thin (`1px`), Slate 300, no tick marks.
4. **Rounded tooltip** — white card, subtle border, `box-shadow: 0 4px 12px rgba(0,0,0,0.08)`.
5. **JetBrains Mono for numbers** — all tick labels, tooltip values, KPI figures.
6. **Generous padding** — `p-6` on chart container cards, `16px` right margin in chart area.
7. **Muted legend** — small dots + Slate 500 text, placed above or below chart, never overlapping.

---

## 3. Chart Tooltip Component (Light Theme)

The current dark tooltips use `bg-[#0F0F1A]` and `border-[#1A1A2E]`. For light
theme, replace with a shared `<ChartTooltip>`:

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
      className="rounded-lg border border-slate-200 bg-white px-3 py-2.5
                 shadow-[0_4px_12px_rgba(0,0,0,0.08)]"
    >
      {label && (
        <p className="mb-1.5 text-xs font-medium text-slate-500">{label}</p>
      )}
      {payload.map((entry) => (
        <div key={entry.dataKey} className="flex items-center gap-2 py-0.5">
          <span
            className="h-2 w-2 rounded-full shrink-0"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-xs text-slate-500">{entry.name}</span>
          <span className="ml-auto font-mono text-sm font-medium text-slate-900">
            {formatValue(entry.value)}
          </span>
        </div>
      ))}
    </div>
  )
}
```

Cursor style on hover should be a vertical line, not the default crosshair:

```tsx
<Tooltip
  content={<ChartTooltip formatValue={formatDollar} />}
  cursor={{ stroke: '#6366F1', strokeOpacity: 0.15, strokeWidth: 1 }}
/>
```

---

## 4. Chart Type Styling — Per Chart Breakdown

### 4a. Area Chart (Cash Flow Projection)

Currently in `CashFlowProjection.tsx`. Light theme adjustments:

```tsx
<AreaChart data={data} margin={chartMargins}>
  <defs>
    <linearGradient id="cfGradient" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor="#6366F1" stopOpacity={0.12} />
      <stop offset="100%" stopColor="#6366F1" stopOpacity={0.01} />
    </linearGradient>
  </defs>
  <CartesianGrid {...gridDefaults} />
  <XAxis dataKey="month" {...xAxisDefaults}
    tickFormatter={(v: string) => v.replace('Month ', 'M')}
  />
  <YAxis {...yAxisDefaults} tickFormatter={formatDollar} />
  <Tooltip content={<ChartTooltip formatValue={formatTooltipCurrency} />}
    cursor={{ stroke: '#6366F1', strokeOpacity: 0.15 }}
  />
  <Area
    type="monotone" dataKey="monthlyCashFlow"
    stroke="#6366F1" strokeWidth={2}
    fill="url(#cfGradient)"
    dot={false} activeDot={{ r: 4, strokeWidth: 2, fill: '#fff' }}
  />
  <Area
    type="monotone" dataKey="cumulativeCashFlow"
    stroke="#10B981" strokeWidth={2}
    fill="none"
    dot={false} activeDot={{ r: 4, strokeWidth: 2, fill: '#fff' }}
  />
</AreaChart>
```

Key differences from dark theme:
- Gradient `stopOpacity` lowered to `0.12` (was `0.2`) — on white, less fill avoids muddiness.
- `activeDot` with white fill so it pops against the stroke color.
- `dot={false}` for cleaner line unless the dataset has under 12 points.

### 4b. Bar Chart (Strategy Comparison / Monthly Cash Flow)

Used in `PortfolioPage.tsx` for monthly cash flow. Light theme bars:

```tsx
<BarChart data={monthlyCashFlowData} margin={chartMargins}>
  <CartesianGrid {...gridDefaults} />
  <XAxis dataKey="month" {...xAxisDefaults} />
  <YAxis {...yAxisDefaults} tickFormatter={formatDollar} />
  <Tooltip content={<ChartTooltip formatValue={formatDollar} />}
    cursor={{ fill: '#F8FAFC' }}  // Slate 50 — barely visible highlight
  />
  <Bar dataKey="cashFlow" radius={[4, 4, 0, 0]} barSize={28}>
    {data.map((entry, i) => (
      <Cell
        key={i}
        fill={entry.cashFlow >= 0 ? '#10B981' : '#EF4444'}
        fillOpacity={0.85}
      />
    ))}
  </Bar>
</BarChart>
```

For **strategy comparison** bars (side-by-side grouped bars):

```tsx
<BarChart data={comparisonData} margin={chartMargins} barCategoryGap="20%">
  <CartesianGrid {...gridDefaults} />
  <XAxis dataKey="metric" {...xAxisDefaults} />
  <YAxis {...yAxisDefaults} tickFormatter={formatDollar} />
  <Tooltip content={<ChartTooltip />} />
  {deals.map((deal, i) => (
    <Bar
      key={deal.id}
      dataKey={deal.address}
      fill={CB_SAFE_SERIES[i]}
      radius={[3, 3, 0, 0]}
      barSize={24}
      fillOpacity={0.85}
    />
  ))}
</BarChart>
```

### 4c. Radar Chart (Deal Comparison)

Currently in `ComparisonRadar.tsx`. Light theme changes:

```tsx
<RadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
  <PolarGrid stroke="#E2E8F0" />
  <PolarAngleAxis
    dataKey="dimension"
    tick={{ fill: '#64748B', fontSize: 12, fontWeight: 500 }}
  />
  <PolarRadiusAxis
    angle={90} domain={[0, 100]}
    tick={{ fill: '#94A3B8', fontSize: 10 }}
    tickCount={5} axisLine={false}
  />
  {deals.map((deal, i) => (
    <Radar
      key={deal.id} name={deal.address} dataKey={deal.address}
      stroke={CB_SAFE_SERIES[i]}
      fill={CB_SAFE_SERIES[i]}
      fillOpacity={0.08}
      strokeWidth={2}
    />
  ))}
</RadarChart>
```

Lower `fillOpacity` (from `0.15` to `0.08`) prevents washed-out overlap on white.

### 4d. Pie / Donut Chart (Portfolio Strategy Breakdown)

Currently in `PortfolioPage.tsx`. Light theme:

```tsx
<PieChart>
  <Pie
    data={strategyBreakdownData}
    cx="50%" cy="50%"
    innerRadius={55} outerRadius={85}
    paddingAngle={3}
    dataKey="value" nameKey="name"
    stroke="#FFFFFF" strokeWidth={2}   // White gaps between segments
  >
    {strategyBreakdownData.map((entry) => (
      <Cell key={entry.name} fill={entry.color} />
    ))}
  </Pie>
  <Tooltip content={<DonutTooltipContent />} />
  <Legend content={<DonutLegend />} />
</PieChart>
```

On light backgrounds, add `stroke="#FFFFFF" strokeWidth={2}` to Pie segments
for clean visual separation (Mercury does this). The center label font stays
JetBrains Mono at `28px`.

### 4e. Sparklines (KPI Cards)

Currently in `KPICard.tsx`. These are minimal area charts with no axes or grid.
Light theme adjustments:

```tsx
<AreaChart data={chartData} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
  <defs>
    <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor={strokeColor} stopOpacity={0.08} />
      <stop offset="100%" stopColor={strokeColor} stopOpacity={0} />
    </linearGradient>
  </defs>
  <Area
    type="monotone" dataKey="value"
    stroke={strokeColor} strokeWidth={1.5}
    fill={`url(#${gradientId})`}
    dot={false}
    isAnimationActive={true}
    animationDuration={800}
  />
</AreaChart>
```

Gradient opacity drops from `0.2` to `0.08` for light backgrounds. Stroke width
stays at `1.5` — thin enough to feel ambient but visible.

---

## 5. Chart Container Design

Every chart should live inside a consistent card wrapper. Pattern from Mercury/Stripe:

```tsx
// components/charts/ChartCard.tsx
interface ChartCardProps {
  title: string
  subtitle?: string
  action?: React.ReactNode        // e.g., time range selector or export button
  legend?: React.ReactNode         // custom legend above the chart area
  children: React.ReactNode        // the Recharts ResponsiveContainer
  className?: string
  height?: number                  // default 300
}

export function ChartCard({
  title, subtitle, action, legend, children, className, height = 300
}: ChartCardProps) {
  return (
    <div className={cn(
      'rounded-xl border border-slate-200 bg-white p-6',
      className
    )}>
      {/* Header row */}
      <div className="flex items-start justify-between mb-1">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
          {subtitle && (
            <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
          )}
        </div>
        {action && <div className="shrink-0 ml-4">{action}</div>}
      </div>

      {/* Legend row */}
      {legend && <div className="flex items-center gap-4 mt-3 mb-4">{legend}</div>}

      {/* Chart area */}
      <div style={{ height }} className="w-full">
        <ResponsiveContainer width="100%" height="100%">
          {children}
        </ResponsiveContainer>
      </div>
    </div>
  )
}
```

### Time Range Selector

For cash flow and portfolio charts, offer `1M / 3M / 6M / 1Y / ALL` tabs:

```tsx
function TimeRangeSelector({
  value, onChange
}: {
  value: string
  onChange: (v: string) => void
}) {
  const ranges = ['1M', '3M', '6M', '1Y', 'ALL']
  return (
    <div className="flex gap-0.5 rounded-lg bg-slate-100 p-0.5">
      {ranges.map((r) => (
        <button
          key={r}
          onClick={() => onChange(r)}
          className={cn(
            'px-2.5 py-1 text-xs font-medium rounded-md transition-colors',
            value === r
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          )}
        >
          {r}
        </button>
      ))}
    </div>
  )
}
```

This matches Stripe's segmented control pattern exactly.

---

## 6. Risk Score Visualization

Parcel computes a `risk_score` for each deal. Three display patterns, each suited
to a different context:

### 6a. Color-Coded Badge (compact — tables, cards)

```tsx
function RiskBadge({ score }: { score: number }) {
  const config = score <= 3
    ? { label: 'Low',    bg: 'bg-emerald-50',  text: 'text-emerald-700', ring: 'ring-emerald-200' }
    : score <= 6
    ? { label: 'Medium', bg: 'bg-amber-50',    text: 'text-amber-700',   ring: 'ring-amber-200'   }
    : { label: 'High',   bg: 'bg-red-50',      text: 'text-red-700',     ring: 'ring-red-200'     }

  return (
    <span className={cn(
      'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ring-1 ring-inset',
      config.bg, config.text, config.ring
    )}>
      <span className="font-mono">{score}</span>
      <span>/10</span>
      <span className="hidden sm:inline">-- {config.label}</span>
    </span>
  )
}
```

### 6b. Progress Bar (medium — result cards, side panels)

```tsx
function RiskBar({ score }: { score: number }) {
  const pct = (score / 10) * 100
  const color = score <= 3 ? '#10B981' : score <= 6 ? '#F59E0B' : '#EF4444'

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-slate-500">Risk Score</span>
        <span className="font-mono font-medium text-slate-900">{score}/10</span>
      </div>
      <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </div>
    </div>
  )
}
```

### 6c. Semicircle Gauge (large — results hero section)

For the main results page, a semicircle gauge conveys risk at a glance:

```tsx
function RiskGauge({ score }: { score: number }) {
  const normalized = Math.min(10, Math.max(0, score)) / 10
  const angle = normalized * 180  // 0 = left, 180 = right
  const color = score <= 3 ? '#10B981' : score <= 6 ? '#F59E0B' : '#EF4444'

  // SVG arc path for the background track
  const trackD = 'M 20 80 A 60 60 0 0 1 140 80'
  // Compute the filled arc endpoint
  const rad = (Math.PI * (180 - angle)) / 180
  const endX = 80 + 60 * Math.cos(rad)
  const endY = 80 - 60 * Math.sin(rad)
  const largeArc = angle > 180 ? 1 : 0
  const filledD = `M 20 80 A 60 60 0 ${largeArc} 1 ${endX} ${endY}`

  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 160 100" className="w-40 h-24">
        <path d={trackD} fill="none" stroke="#E2E8F0" strokeWidth={10}
              strokeLinecap="round" />
        <motion.path
          d={filledD} fill="none" stroke={color} strokeWidth={10}
          strokeLinecap="round"
          initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
          transition={{ duration: 1, ease: 'easeOut' }}
        />
      </svg>
      <span className="font-mono text-2xl font-bold text-slate-900 -mt-2">
        {score}<span className="text-sm text-slate-400">/10</span>
      </span>
      <span className="text-xs text-slate-500 mt-0.5">Risk Score</span>
    </div>
  )
}
```

---

## 7. Cash Flow Projection Table (Positive/Negative Highlighting)

Below the area chart, render a companion table for users who want exact numbers.
Mercury does this with a condensed monospace table:

```tsx
function CashFlowTable({ data }: { data: MonthDataPoint[] }) {
  return (
    <div className="overflow-x-auto mt-4">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-slate-200">
            <th className="text-left py-2 px-3 font-medium text-slate-500">Month</th>
            <th className="text-right py-2 px-3 font-medium text-slate-500">Monthly CF</th>
            <th className="text-right py-2 px-3 font-medium text-slate-500">Cumulative</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr key={row.month} className="border-b border-slate-100 last:border-0">
              <td className="py-1.5 px-3 font-mono text-slate-600">{row.month}</td>
              <td className={cn(
                'py-1.5 px-3 text-right font-mono font-medium',
                row.monthlyCashFlow >= 0 ? 'text-emerald-600' : 'text-red-500'
              )}>
                {formatDollar(row.monthlyCashFlow)}
              </td>
              <td className={cn(
                'py-1.5 px-3 text-right font-mono font-medium',
                row.cumulativeCashFlow >= 0 ? 'text-slate-900' : 'text-red-500'
              )}>
                {formatDollar(row.cumulativeCashFlow)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

Stripe uses a subtle left border accent on negative rows. Apply with:

```tsx
className={cn(
  'border-l-2',
  row.monthlyCashFlow < 0 ? 'border-l-red-300' : 'border-l-transparent'
)}
```

---

## 8. Chart Animations

### Recharts Built-In Animation Props

All Recharts shape components accept animation props. Standardize:

```ts
export const chartAnimationDefaults = {
  isAnimationActive: true,
  animationDuration: 800,
  animationEasing: 'ease-out' as const,
  animationBegin: 0,
}

// For staggered multi-series (e.g., second area line):
export const staggeredAnimation = (index: number) => ({
  ...chartAnimationDefaults,
  animationBegin: index * 200,
})
```

### Framer Motion for Container Enter

Wrap chart cards in `motion.div` with `slideUp` for page entrance:

```ts
export const slideUp = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1, y: 0,
    transition: { duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] },
  },
}
```

### Reduced Motion

Respect `prefers-reduced-motion`:

```ts
const prefersReduced =
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

export const safeAnimationDuration = prefersReduced ? 0 : 800
```

Pass `isAnimationActive={!prefersReduced}` to all Recharts components.

---

## 9. Responsive Charts

### General Rules

- **Always use `<ResponsiveContainer width="100%" height={N}>`** — never fixed widths.
- Set `height` explicitly in pixels (not `%`) to prevent layout collapse.
- Default heights by chart type:
  - Area/Bar: `300px` desktop, `220px` mobile
  - Radar: `380px` desktop, `280px` mobile
  - Donut: `220px` both
  - Sparkline: `60px` both

### Mobile Breakpoint Handling

```tsx
function useChartHeight(desktop: number, mobile: number): number {
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 640px)')
    setIsMobile(mq.matches)
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])
  return isMobile ? mobile : desktop
}
```

### Axis Label Truncation on Mobile

On mobile, XAxis labels overlap. Apply:

```tsx
<XAxis
  {...xAxisDefaults}
  interval={isMobile ? 2 : 0}          // Show every 3rd label on mobile
  tick={{ fontSize: isMobile ? 10 : 12 }}
  angle={isMobile ? -45 : 0}
  textAnchor={isMobile ? 'end' : 'middle'}
/>
```

### Minimum Chart Width for Horizontal Scroll

For bar charts with many columns (12+ months), set a minimum width and allow
horizontal scroll:

```tsx
<div className="overflow-x-auto">
  <div style={{ minWidth: data.length * 48 }}>
    <ResponsiveContainer width="100%" height={300}>
      {/* chart */}
    </ResponsiveContainer>
  </div>
</div>
```

---

## 10. Mercury/Stripe Chart Styling Reference

### Mercury (bank dashboard for startups)

- **Background**: Pure white (`#FFFFFF`), no card shadows — border-only containers.
- **Grid**: Horizontal dashes only, `#F1F5F9` (Slate 100 equivalent).
- **Axes**: Y-axis labels only (no line). X-axis has thin bottom rule.
- **Typography**: System font for labels, monospace for values.
- **Tooltips**: White card, 1px slate border, `0 4px 12px rgba(0,0,0,0.06)` shadow.
- **Colors**: Single primary blue, green for positive, red for negative. Never more than 3 colors per chart.
- **Area fills**: Barely visible gradient (5-10% opacity of stroke color).
- **Interaction**: Vertical hover line (cursor), no crosshair.

### Stripe Dashboard

- **Background**: Off-white (`#F6F8FA`) with white chart cards.
- **Grid**: Dotted horizontal lines at very low opacity.
- **Axes**: Minimal. YAxis formatted with abbreviations (`$12K`). No axis lines.
- **Typography**: `font-variant-numeric: tabular-nums` on all number displays.
- **Tooltips**: Compact, white with subtle shadow, rounded corners.
- **Colors**: Primary indigo/blue. Revenue = blue, profit = green, costs = slate.
- **Donut**: White stroke gaps between segments (`stroke="#fff" strokeWidth={3}`).
- **Bars**: Rounded top corners (`radius={[4,4,0,0]}`), 80-85% opacity fill.
- **Time controls**: Pill-shaped segmented controls above the chart (not inside).

### What Parcel Should Adopt

- Mercury's minimal grid (horizontal only, near-invisible).
- Stripe's rounded bar corners and white-gap donut style.
- Both apps' tooltip pattern: white, bordered, shadowed, monospace values.
- Mercury's single-series simplicity where possible (avoid chart clutter).
- Stripe's time range segmented control pattern.
- Both apps' font-variant-numeric: tabular-nums for aligned number columns.

---

## 11. Number Formatting Standards

All financial values displayed in charts should use consistent formatting:

```ts
export function formatDollar(value: number): string {
  if (Math.abs(value) >= 1_000_000)
    return `$${(value / 1_000_000).toFixed(1)}M`
  if (Math.abs(value) >= 1_000)
    return `$${(value / 1_000).toFixed(0)}K`
  return `$${value.toLocaleString('en-US')}`
}

export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`
}

export function formatTooltipCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value)
}
```

Axis labels use `formatDollar` (abbreviated). Tooltips use `formatTooltipCurrency`
(full precision). This matches both Mercury and Stripe conventions.

---

## RECOMMENDATIONS FOR PARCEL

1. **Extract a shared chart theme.** Create `lib/chart-palette.ts` and `lib/chart-theme.ts` containing the color palette, axis defaults, grid defaults, and animation constants. Every chart file should import from these instead of hardcoding hex values. The current codebase has `#94A3B8`, `#1A1A2E`, `#6366F1` scattered across `CashFlowProjection.tsx`, `ComparisonRadar.tsx`, and `PortfolioPage.tsx` — centralize them.

2. **Build a `<ChartCard>` wrapper component.** Every chart container currently re-implements the same card border, title, and legend layout. A shared `ChartCard` with title, subtitle, action slot, and legend slot eliminates this duplication and ensures visual consistency.

3. **Adopt the shared `<ChartTooltip>` component.** There are currently four separate tooltip implementations (`ChartTooltipContent`, `BarTooltipContent`, `DonutTooltipContent`, and the cash flow `ChartTooltip`). Consolidate into one component that accepts a `formatValue` function.

4. **Use the color-blind safe series palette.** The current `DEAL_COLORS` array in `ComparisonRadar.tsx` includes both `#10B981` (green) and `#EF4444` (red) which are indistinguishable for deuteranopia. Swap to the `CB_SAFE_SERIES` palette that avoids red/green adjacency.

5. **Add `dot={false}` and `activeDot` to all Area/Line charts.** The current `CashFlowProjection.tsx` does not set these, meaning Recharts renders default dots at every data point. Clean lines with hover-only active dots match Mercury's style.

6. **Lower gradient fill opacity for light theme.** The current `stopOpacity={0.2}` in area charts works on dark backgrounds but will look heavy on white. Use `0.08-0.12` for light theme fills.

7. **Implement the three-tier risk score display.** Use `RiskBadge` in tables and cards, `RiskBar` in side panels and result summaries, `RiskGauge` in the main results hero. The color thresholds (green 0-3, amber 4-6, red 7-10) should be defined once in the chart palette.

8. **Add a cash flow projection table beneath the chart.** Users analyzing deals need exact monthly numbers, not just the visual shape. A compact monospace table with positive/negative highlighting below the area chart serves this. Use a red left-border accent on negative months.

9. **Implement responsive chart heights.** Use `useChartHeight(300, 220)` for area/bar charts. On mobile, increase XAxis `interval` to prevent label overlap and consider angling labels 45 degrees. For bar charts with many columns, use horizontal scroll with `minWidth` per bar.

10. **Add `prefers-reduced-motion` support.** The current charts all set `isAnimationActive={true}`. Create a `usePrefersReducedMotion` hook and pass the result to all Recharts animation props. This is both an accessibility requirement and aligns with the existing reduced-motion support on the landing page ticker.

11. **Standardize number formatting.** Use `formatDollar` (abbreviated) on axis labels and `formatTooltipCurrency` (full) in tooltips across all charts. The current `PortfolioPage.tsx` uses `formatCurrency` (which includes the full `$XXX,XXX` format) on axis ticks, making them too wide on mobile.

12. **Apply `font-variant-numeric: tabular-nums` globally.** Add this to the existing `[data-financial]` / `.financial` CSS rule in `index.css`. This ensures columns of numbers align perfectly in tables and tooltips without needing fixed-width formatting.
