# Agent 09 -- Portfolio Page (Light Theme)

Design specification for Parcel's Portfolio page, migrated from the dark theme to a
professional light theme. References Mercury and Stripe Dashboard aesthetics, the
existing `PortfolioPage.tsx` (727 lines), and the shared Recharts theme from agent-07.

References:
- `UI-RESEARCH/agent-07-data-visualization.md` -- chart palette, axis defaults, tooltip component
- `UI-RESEARCH/agent-08-dashboard.md` -- KPI card patterns, light color tokens, mobile layout
- `BILLING-DESIGN/agent-08-paywall-ui.md` -- PaywallOverlay, plan gating types, GatedFeature

Existing implementation: `frontend/src/pages/portfolio/PortfolioPage.tsx` (727 lines,
dark theme, fully functional -- this spec describes the light-theme visual migration,
not a rewrite of business logic).

---

## 1. Overview: Aggregate KPIs

Four KPI cards in a horizontal row summarize the user's closed-deal performance at a
glance. Three are financial (Inter with `tabular-nums` for column alignment), one is
a plain count.

### KPI Definitions (from API `PortfolioSummary`)

| Card | Label | Source Field | Format | Delta | Sparkline |
|------|-------|-------------|--------|-------|-----------|
| 1 | Total Equity | `summary.total_equity` | `$XXX,XXX` | vs 30-day-ago snapshot (future) | 6-month equity trend from entries |
| 2 | Monthly Cash Flow | `summary.total_monthly_cash_flow` | `$X,XXX` | `+$XXX` absolute delta | Monthly CF values from entries |
| 3 | Annualized Return | `summary.avg_annualized_return` | `XX.X%` | -- (not yet computed by backend, shows `--`) | None |
| 4 | Deals Closed | `summary.total_deals_closed` | `12` | -- | None |

### Wireframe (Desktop, Populated)

```
┌──────────────────────────────────────────────────────────────────────────┐
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐  ┌──────────┐ │
│  │ Total Equity  │  │ Monthly CF    │  │ Ann. Return   │  │ Deals    │ │
│  │ $847,200      │  │ $4,820        │  │ 14.2%         │  │ 8        │ │
│  │ +12.3%        │  │ +$420         │  │ --            │  │          │ │
│  │ ╱╲╱╲╱╲╱╲╱╲╱  │  │ ╱╲╱╲╱╲╱╲╱╲  │  │               │  │          │ │
│  └───────────────┘  └───────────────┘  └───────────────┘  └──────────┘ │
└──────────────────────────────────────────────────────────────────────────┘
```

### Card Container (Light Theme)

```tsx
<div className="rounded-xl border border-gray-200 bg-white p-5 space-y-1
                shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
  {/* Label */}
  <p className="text-xs font-medium text-gray-500 tracking-wide">
    {label}
  </p>

  {/* Value -- Inter, tabular-nums for column alignment */}
  <p className="text-3xl font-semibold text-gray-900"
     style={{ fontVariantNumeric: 'tabular-nums' }}>
    {formattedValue}
  </p>

  {/* Delta */}
  {delta !== undefined && (
    <p className={cn(
      'text-xs font-medium',
      delta >= 0 ? 'text-emerald-600' : 'text-red-600'
    )}
       style={{ fontVariantNumeric: 'tabular-nums' }}>
      {delta >= 0 ? '\u2191' : '\u2193'} {Math.abs(delta).toFixed(1)}%
      <span className="text-gray-400 ml-1">vs last month</span>
    </p>
  )}

  {/* Sparkline (optional) */}
  {sparklineData && sparklineData.length > 1 && (
    <div className="mt-2 -mx-5 -mb-5">
      <ResponsiveContainer width="100%" height={60}>
        <AreaChart data={chartData}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={strokeColor} stopOpacity={0.08} />
              <stop offset="100%" stopColor={strokeColor} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area type="monotone" dataKey="value"
                stroke={strokeColor} strokeWidth={1.5}
                fill={`url(#${gradientId})`}
                dot={false}
                isAnimationActive animationDuration={800} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )}
</div>
```

### Light Theme Changes from Current Dark

| Property | Dark (current) | Light (new) |
|----------|---------------|-------------|
| Card bg | `bg-[#0F0F1A]` | `bg-white` |
| Card border | `border-[#1A1A2E]` | `border-gray-200` |
| Card shadow | none | `shadow-[0_1px_2px_rgba(0,0,0,0.04)]` |
| Label text | `text-[#94A3B8]` uppercase `tracking-[0.08em]` | `text-gray-500` sentence-case `tracking-wide` |
| Value text | `text-text-primary` (#F1F5F9) | `text-gray-900` |
| Positive delta | `text-accent-success` (#10B981) | `text-emerald-600` (#059669 -- deeper for WCAG AA on white) |
| Negative delta | `text-accent-danger` (#EF4444) | `text-red-600` (#DC2626 -- deeper for white-bg contrast) |
| Value font | JetBrains Mono | Inter with `font-variant-numeric: tabular-nums` |
| Sparkline fill opacity | `0.2` | `0.08` |

### Grid Layout

```tsx
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
  <KPICard label="Total Equity" value={summary.total_equity} format="currency" />
  <KPICard label="Monthly Cash Flow" value={summary.total_monthly_cash_flow} format="currency" />
  <KPICard label="Annualized Return" value={summary.avg_annualized_return ?? 0} format="percent" />
  <KPICard label="Deals Closed" value={summary.total_deals_closed} format="number" />
</div>
```

---

## 2. Property Table: Sortable Columns

The closed deals table is the core of the portfolio page. Mercury-inspired design:
clean rows, minimal borders, header in `bg-gray-50`, hover states in `bg-gray-50`.

### Wireframe

```
┌───────────────────────────────────────────────────────────────────────────────────┐
│  Closed Deals                                              [+ Add Closed Deal]   │
├──────────┬───────────┬──────────┬──────────┬──────────┬──────────┬──────┬────────┤
│ Address  │ Strategy  │ Closed   │ Price  ↕ │ Profit ↕ │ Mo. CF ↕ │ ROI  │        │
├──────────┼───────────┼──────────┼──────────┼──────────┼──────────┼──────┼────────┤
│ 123 Elm  │ [BRRRR]   │ Mar 2026 │ $245,000 │ $32,400  │ $1,200   │ 13.2%│   ✏   │
│ 456 Oak  │ [Flip]    │ Feb 2026 │ $180,000 │ $45,000  │ --       │ 25.0%│   ✏   │
│ 789 Pine │ [Hold]    │ Jan 2026 │ $320,000 │ $18,200  │ $2,100   │  5.7%│   ✏   │
└──────────┴───────────┴──────────┴──────────┴──────────┴──────────┴──────┴────────┘
```

### Column Definitions

| Column | Data Key | Sortable | Format | Width | Align |
|--------|----------|----------|--------|-------|-------|
| Address | `address` | Yes (alpha) | String, truncate at 28 chars | `min-w-[180px]` flex | Left |
| Strategy | `strategy` | Yes (alpha) | `<StrategyBadge>` pill | `w-[130px]` | Left |
| Closed Date | `closed_date` | Yes (date, default desc) | `Mon YYYY` | `w-[100px]` | Left |
| Price | `closed_price` | Yes (numeric) | `$XXX,XXX` tabular-nums | `w-[110px]` | Right |
| Profit | `profit` | Yes (numeric) | `$XX,XXX`, green/red | `w-[100px]` | Right |
| Monthly CF | `monthly_cash_flow` | Yes (numeric) | `$X,XXX` or `--` | `w-[100px]` | Right |
| ROI | computed: `(profit / closed_price) * 100` | Yes (numeric) | `XX.X%` | `w-[60px]` | Right |
| Edit | -- | No | Pencil icon, hover-reveal | `w-[48px]` | Center |

### Sort Implementation

Client-side sort with `sortKey` / `sortDir` state. Column headers are clickable buttons:

```tsx
type SortKey = 'address' | 'strategy' | 'closed_date' | 'closed_price' | 'profit' | 'monthly_cash_flow' | 'roi'
type SortDir = 'asc' | 'desc'

const [sortKey, setSortKey] = useState<SortKey>('closed_date')
const [sortDir, setSortDir] = useState<SortDir>('desc')

function toggleSort(key: SortKey) {
  if (sortKey === key) {
    setSortDir(prev => prev === 'asc' ? 'desc' : 'asc')
  } else {
    setSortKey(key)
    setSortDir(key === 'address' || key === 'strategy' ? 'asc' : 'desc')
  }
}
```

### Sortable Header Cell

```tsx
function SortableHeader({ label, sortKey: key, currentKey, direction, onSort, align = 'left' }: {
  label: string
  sortKey: SortKey
  currentKey: SortKey
  direction: SortDir
  onSort: (key: SortKey) => void
  align?: 'left' | 'right'
}) {
  const isActive = currentKey === key
  return (
    <th className={cn('px-4 py-3', align === 'right' ? 'text-right' : 'text-left')}>
      <button
        onClick={() => onSort(key)}
        className={cn(
          'inline-flex items-center gap-1 text-xs font-medium uppercase tracking-wider',
          isActive ? 'text-gray-900' : 'text-gray-500 hover:text-gray-700'
        )}
      >
        {label}
        {isActive && (
          <ChevronUp className={cn(
            'h-3 w-3 transition-transform',
            direction === 'desc' && 'rotate-180'
          )} />
        )}
      </button>
    </th>
  )
}
```

### Table Container (Light Theme)

```tsx
<div className="rounded-xl border border-gray-200 bg-white overflow-hidden
                shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
  <div className="overflow-x-auto">
    <table className="w-full">
      <thead>
        <tr className="border-b border-gray-200 bg-gray-50">
          {/* SortableHeader cells */}
        </tr>
      </thead>
      <tbody>
        {sortedEntries.map((entry) => (
          <tr key={entry.id}
              className="group border-b border-gray-100 last:border-0
                         hover:bg-gray-50 transition-colors">
            {/* Data cells */}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
</div>
```

### Light-Adapted Strategy Badges

The existing `StrategyBadge` uses dark-background color pairs. For light theme:

```ts
const STRATEGY_BADGE_LIGHT: Record<Strategy, { bg: string; text: string; label: string }> = {
  wholesale:        { bg: '#FEF3C7', text: '#92400E', label: 'Wholesale' },
  creative_finance: { bg: '#EDE9FE', text: '#5B21B6', label: 'Creative Finance' },
  brrrr:            { bg: '#DBEAFE', text: '#1E40AF', label: 'BRRRR' },
  buy_and_hold:     { bg: '#D1FAE5', text: '#065F46', label: 'Buy & Hold' },
  flip:             { bg: '#FEE2E2', text: '#991B1B', label: 'Flip' },
}
```

All five text colors pass WCAG AA (>= 4.5:1) on their respective pastel backgrounds.
Badge structure unchanged: `inline-flex items-center px-2 py-0.5 rounded text-xs font-medium`.

### Numeric Cell Styling

All financial columns use `tabular-nums` for digit alignment:

```tsx
{/* Price -- right-aligned, Inter tabular-nums */}
<td className="px-4 py-3 text-right text-sm text-gray-900"
    style={{ fontVariantNumeric: 'tabular-nums' }}>
  {formatCurrency(entry.closed_price)}
</td>

{/* Profit -- conditional color */}
<td className={cn(
  'px-4 py-3 text-right text-sm',
  profit >= 0 ? 'text-emerald-600' : 'text-red-600'
)}
    style={{ fontVariantNumeric: 'tabular-nums' }}>
  {formatCurrency(entry.profit)}
</td>

{/* ROI -- computed client-side */}
<td className="px-4 py-3 text-right text-sm text-gray-900"
    style={{ fontVariantNumeric: 'tabular-nums' }}>
  {closedPrice > 0 ? `${((profit / closedPrice) * 100).toFixed(1)}%` : '--'}
</td>
```

### Section Header

```tsx
<div className="flex items-center justify-between mb-3">
  <h2 className="text-sm font-semibold text-gray-900">Closed Deals</h2>
  <button
    onClick={() => setSheetOpen(true)}
    className="flex items-center gap-1.5 text-xs font-medium
               text-indigo-600 hover:text-indigo-700 transition-colors"
  >
    <Plus size={14} />
    Add closed deal
  </button>
</div>
```

---

## 3. Strategy Breakdown: Donut Chart

A donut chart showing portfolio composition by strategy. Uses the `STRATEGY_COLORS`
map so each slice matches its established identity. Positioned alongside the Monthly
Cash Flow bar chart in a 2-column grid.

### Wireframe

```
┌─ Portfolio by Strategy ──────────────────────┐
│                                              │
│              ┌─────────┐                     │
│            ╱─┤         ├─╲                   │
│          ╱   │    8    │   ╲                 │
│         │    │  deals  │    │                │
│          ╲   │         │   ╱                 │
│            ╲─┤         ├─╱                   │
│              └─────────┘                     │
│                                              │
│  ● Wholesale 25%  ● BRRRR 37%  ● Flip 13%  │
│  ● Buy & Hold 12% ● Creative 13%            │
└──────────────────────────────────────────────┘
```

### Recharts Configuration (Light Theme)

```tsx
<div className="rounded-xl border border-gray-200 bg-white p-6
                shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
  <h3 className="text-sm font-semibold text-gray-900 mb-4">
    Portfolio by Strategy
  </h3>
  <ResponsiveContainer width="100%" height={220}>
    <PieChart>
      <Pie
        data={strategyBreakdownData}
        cx="50%" cy="50%"
        innerRadius={55} outerRadius={85}
        paddingAngle={3}
        dataKey="value" nameKey="name"
        stroke="#FFFFFF" strokeWidth={2}
        isAnimationActive animationDuration={800} animationEasing="ease-out"
      >
        {strategyBreakdownData.map((entry) => (
          <Cell key={entry.name} fill={entry.color} />
        ))}
      </Pie>
      <Tooltip content={<DonutTooltipContent />} />
      <Legend content={<DonutLegend />} />
      {/* Center label: total deal count */}
      <text x="50%" y="46%" textAnchor="middle" dominantBaseline="central"
            className="fill-gray-900"
            style={{ fontSize: '28px', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
        {entries.length}
      </text>
      <text x="50%" y="57%" textAnchor="middle" dominantBaseline="central"
            className="fill-gray-500"
            style={{ fontSize: '11px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        deals
      </text>
    </PieChart>
  </ResponsiveContainer>
</div>
```

### Strategy Colors (Chart Series)

Preserved from existing codebase for donut segments:

```ts
const STRATEGY_COLORS: Record<Strategy, string> = {
  wholesale:        '#10B981',  // Emerald
  creative_finance: '#8B5CF6',  // Violet
  brrrr:            '#F59E0B',  // Amber
  buy_and_hold:     '#3B82F6',  // Blue
  flip:             '#EF4444',  // Rose
}
```

Note: These saturated colors are for chart segments. Badge colors (Section 2) use a
different, muted pastel palette. Two palettes, two contexts.

### Donut Tooltip (Light Theme)

```tsx
function DonutTooltipContent({ active, payload }: {
  active?: boolean
  payload?: ChartPayloadItem[]
}) {
  if (!active || !payload?.length) return null
  const item = payload[0]
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2.5
                    shadow-[0_4px_12px_rgba(0,0,0,0.08)]">
      <p className="text-xs font-medium text-gray-900 mb-1">{item.name}</p>
      <p className="text-xs text-gray-500">
        <span className="text-gray-900 font-medium"
              style={{ fontVariantNumeric: 'tabular-nums' }}>
          {item.value}
        </span>{' '}
        deal{item.value !== 1 ? 's' : ''}
      </p>
      {item.payload?.totalValue != null && (
        <p className="text-xs text-gray-500">
          Total:{' '}
          <span className="text-gray-900 font-medium"
                style={{ fontVariantNumeric: 'tabular-nums' }}>
            {formatCurrency(item.payload.totalValue)}
          </span>
        </p>
      )}
    </div>
  )
}
```

### Donut Legend (Light Theme)

```tsx
function DonutLegend({ payload }: {
  payload?: Array<{ value: string; color: string; payload?: { percent?: number } }>
}) {
  if (!payload) return null
  return (
    <div className="flex flex-wrap justify-center gap-x-4 gap-y-1.5 mt-3">
      {payload.map((entry) => (
        <div key={entry.value} className="flex items-center gap-1.5 text-xs">
          <span className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: entry.color }} />
          <span className="text-gray-500">{entry.value}</span>
          <span className="text-gray-900 font-medium"
                style={{ fontVariantNumeric: 'tabular-nums' }}>
            {entry.payload?.percent != null
              ? `${(entry.payload.percent * 100).toFixed(0)}%`
              : ''}
          </span>
        </div>
      ))}
    </div>
  )
}
```

### Changes from Dark Theme

- Pie `stroke`: `"#FFFFFF"` with `strokeWidth={2}` (was `stroke="transparent"`) -- white gaps per Stripe donut pattern
- Tooltip bg: `bg-white` + `border-gray-200` + shadow (was `bg-[#0F0F1A]` + `border-[#1A1A2E]`)
- Center count fill: `fill-gray-900` (was `fill-[#F1F5F9]`)
- Center "deals" label fill: `fill-gray-500` (was `fill-[#94A3B8]`)
- Legend text: `text-gray-500` for names, `text-gray-900` for percentages (was `text-[#94A3B8]` / `text-[#F1F5F9]`)
- `paddingAngle` increased from 2 to 3 for more breathing room on white

### Monthly Cash Flow Bar Chart (companion)

Sits beside the donut in a 2-column grid on desktop, stacked on mobile:

```tsx
<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
  {/* Donut chart card */}
  {/* Bar chart card (below) */}
</div>
```

```tsx
<div className="rounded-xl border border-gray-200 bg-white p-6
                shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
  <h3 className="text-sm font-semibold text-gray-900 mb-4">Monthly Cash Flow</h3>
  <ResponsiveContainer width="100%" height={220}>
    <BarChart data={monthlyCashFlowData} margin={{ top: 8, right: 16, bottom: 4, left: 8 }}>
      <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
      <XAxis dataKey="month"
        tick={{ fontSize: 12, fill: '#64748B' }}
        tickLine={false}
        axisLine={{ stroke: '#CBD5E1', strokeWidth: 1 }} />
      <YAxis
        tick={{ fontSize: 11, fill: '#64748B' }}
        tickLine={false} axisLine={false} width={64}
        tickFormatter={formatDollar} />
      <Tooltip content={<ChartTooltip formatValue={formatTooltipCurrency} />}
        cursor={{ fill: '#F8FAFC' }} />
      <Bar dataKey="cashFlow" radius={[4, 4, 0, 0]} barSize={28}
           isAnimationActive animationDuration={800} animationEasing="ease-out">
        {monthlyCashFlowData.map((entry, i) => (
          <Cell key={i}
            fill={entry.cashFlow >= 0 ? '#10B981' : '#EF4444'}
            fillOpacity={0.85} />
        ))}
      </Bar>
    </BarChart>
  </ResponsiveContainer>
</div>
```

Bar chart light theme changes: grid stroke `#E2E8F0` (was `#1A1A2E`), axis fill
`#64748B` (was `#94A3B8`), cursor fill `#F8FAFC` (was `#1A1A2E`), rounded top corners
`radius={[4,4,0,0]}` (Stripe pattern, kept), `fillOpacity={0.85}`.

---

## 4. Property Card

Used on mobile (< 768px) where the table is replaced by a stacked card list.

### Card Wireframe

```
┌──────────────────────────────────────────┐
│  123 Elm Street               [BRRRR]    │
│  Closed Mar 2026                         │
├──────────────────────────────────────────┤
│  Purchase Price       Profit             │
│  $245,000             $32,400            │
│                                          │
│  Monthly CF           ROI               │
│  $1,200/mo            13.2%              │
├──────────────────────────────────────────┤
│                              [Edit ✏]    │
└──────────────────────────────────────────┘
```

### Card Component (Light Theme)

```tsx
function PropertyCard({ entry, onEdit }: { entry: PortfolioEntry; onEdit: () => void }) {
  const profit = parseFloat(String(entry.profit ?? 0))
  const closedPrice = parseFloat(String(entry.closed_price ?? 0))
  const roi = closedPrice > 0 ? ((profit / closedPrice) * 100) : 0

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4
                    shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
      {/* Header: address + strategy badge */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-gray-900 truncate">
            {entry.address}
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Closed {formatMonthYear(entry.closed_date)}
          </p>
        </div>
        <StrategyBadge strategy={entry.strategy} />
      </div>

      {/* Metrics grid: 2 columns */}
      <div className="grid grid-cols-2 gap-3">
        <MetricCell label="Purchase Price" value={formatCurrency(entry.closed_price)} />
        <MetricCell label="Profit" value={formatCurrency(entry.profit)}
                    valueClass={profit >= 0 ? 'text-emerald-600' : 'text-red-600'} />
        <MetricCell label="Monthly CF"
                    value={entry.monthly_cash_flow
                      ? `${formatCurrency(entry.monthly_cash_flow)}/mo`
                      : '\u2014'} />
        <MetricCell label="ROI"
                    value={closedPrice > 0 ? `${roi.toFixed(1)}%` : '--'} />
      </div>

      {/* Notes (if present) */}
      {entry.notes && (
        <p className="text-xs text-gray-400 italic line-clamp-1">
          {entry.notes}
        </p>
      )}

      {/* Edit action */}
      <div className="flex justify-end pt-1 border-t border-gray-100">
        <button
          onClick={onEdit}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg
                     text-xs font-medium text-gray-600
                     hover:bg-gray-100 hover:text-gray-900 transition-colors"
        >
          <Pencil size={12} />
          Edit
        </button>
      </div>
    </div>
  )
}

function MetricCell({ label, value, valueClass }: {
  label: string
  value: string
  valueClass?: string
}) {
  return (
    <div>
      <p className="text-[11px] text-gray-500">{label}</p>
      <p className={cn('text-sm font-medium text-gray-900', valueClass)}
         style={{ fontVariantNumeric: 'tabular-nums' }}>
        {value}
      </p>
    </div>
  )
}
```

### Key Design Details

- Address uses `truncate` for graceful overflow handling
- 2-column metric grid avoids tall single-column card problem on narrow screens
- `tabular-nums` on all values ensures digit alignment across stacked cards
- Separator `border-t border-gray-100` before edit creates visual hierarchy
- Edit button is always visible on mobile (no hover-to-reveal on touch)

---

## 5. Edit Flow

### Pattern: Modal Dialog (kept from existing implementation)

The `EditPortfolioModal` uses shadcn `Dialog`. This is correct because:

1. Five editable fields (date, price, profit, monthly CF, notes) are too many for inline editing
2. Modal provides clear save/cancel affordance with toast feedback
3. Works identically on mobile (Dialog goes full-width below `sm`)

### Modal Styling (Light Theme)

```tsx
<DialogContent className="bg-white border-gray-200 sm:max-w-[425px]
                          shadow-[0_8px_30px_rgba(0,0,0,0.12)]">
  <DialogHeader>
    <DialogTitle className="text-gray-900">Edit Portfolio Entry</DialogTitle>
  </DialogHeader>
  <form onSubmit={handleSubmit} className="space-y-4 mt-2">
    {entry && (
      <div className="text-sm text-gray-600 mb-4">
        <span className="text-gray-400">Editing:</span>{' '}
        <span className="text-gray-900 font-medium">{entry.address}</span>
      </div>
    )}

    <div className="space-y-2">
      <Label className="text-gray-700 text-xs">Closed Price ($)</Label>
      <Input type="number"
        className="bg-white border-gray-300 text-gray-900
                   focus:border-indigo-500 focus:ring-indigo-500/20"
        style={{ fontVariantNumeric: 'tabular-nums' }} />
    </div>
    {/* ... remaining fields: closed date, profit, monthly CF, notes ... */}

    <DialogFooter className="gap-2 sm:gap-0 mt-6">
      <Button variant="outline"
        className="border-gray-300 text-gray-700 hover:bg-gray-50">
        Cancel
      </Button>
      <Button type="submit"
        className="bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm">
        {isSaving ? 'Saving...' : 'Save Changes'}
      </Button>
    </DialogFooter>
  </form>
</DialogContent>
```

### Add Entry: Side Sheet (Light Theme)

The "Add Closed Deal" flow uses the existing Sheet (slide-in from right):

```tsx
<SheetContent className="bg-white border-gray-200 overflow-y-auto">
  <SheetHeader>
    <SheetTitle className="text-gray-900">Add Closed Deal</SheetTitle>
    <SheetDescription className="text-gray-500">
      Record a deal you've closed to track in your portfolio.
    </SheetDescription>
  </SheetHeader>
  <form className="space-y-5 mt-6">
    {/* Deal select */}
    <Select>
      <SelectTrigger className="bg-white border-gray-300 text-gray-900">
        <SelectValue placeholder="Select a deal" />
      </SelectTrigger>
      <SelectContent className="bg-white border-gray-200 shadow-lg">
        <SelectItem className="text-gray-900 focus:bg-indigo-50">
          {deal.address} ({strategyLabel(deal.strategy)})
        </SelectItem>
      </SelectContent>
    </Select>
    {/* ... date, price, profit, CF, notes ... */}
    <button className="w-full h-10 rounded-lg bg-indigo-600 text-white text-sm
                       font-medium hover:bg-indigo-700 transition-colors
                       disabled:opacity-40 disabled:cursor-not-allowed">
      Add to Portfolio
    </button>
  </form>
</SheetContent>
```

### Input Fields (Light Theme, Shared)

```tsx
{/* Standard text/number input */}
<Input className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-400
                  focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20" />

{/* Number inputs add tabular-nums */}
<Input type="number"
  className="bg-white border-gray-300 text-gray-900"
  style={{ fontVariantNumeric: 'tabular-nums' }} />

{/* Textarea */}
<textarea className="w-full rounded-md border border-gray-300 bg-white px-3 py-2
                     text-sm text-gray-900 placeholder:text-gray-400
                     focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20
                     focus:outline-none resize-none" />
```

---

## 6. Empty State

Shown when `entries.length === 0` after loading completes. KPI row still renders with
zeros (shows page structure). Charts section is hidden.

### Wireframe

```
┌──────────────────────────────────────────────────────────┐
│                                                          │
│                    ┌──────┐                              │
│                    │  💼  │  (Briefcase icon, gray)      │
│                    └──────┘                              │
│                                                          │
│          Close your first deal to start tracking         │
│                                                          │
│        Track equity, cash flow, and profit across        │
│        all your closed deals.                            │
│                                                          │
│              [+ Add Your First Deal]                     │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

### Component

```tsx
function PortfolioEmptyState({ onAddDeal }: { onAddDeal: () => void }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white
                    flex flex-col items-center justify-center py-20 px-6
                    text-center space-y-4
                    shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
      <div className="w-12 h-12 rounded-full bg-indigo-50
                      flex items-center justify-center">
        <Briefcase className="w-5 h-5 text-indigo-500" />
      </div>
      <div className="space-y-1.5">
        <h3 className="text-base font-semibold text-gray-900">
          Close your first deal to start tracking
        </h3>
        <p className="text-sm text-gray-500 max-w-sm">
          Track equity, cash flow, and profit across all your closed deals.
        </p>
      </div>
      <button
        onClick={onAddDeal}
        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg
                   bg-indigo-600 text-white text-sm font-medium
                   hover:bg-indigo-700 transition-colors shadow-sm mt-2"
      >
        <Plus size={16} />
        Add Your First Deal
      </button>
    </div>
  )
}
```

### Display Logic

- `entries.length === 0` AND no loading AND no error: show empty state
- KPI row renders with zero values (page skeleton is visible)
- Charts section hidden (existing `entries.length > 0` guard)
- "Add closed deal" link in table header replaced by centered CTA

---

## 7. Paywall: Pro-Only, PaywallOverlay

The portfolio is gated behind the Pro tier. The backend enforces this via
`require_tier(Tier.PRO)` on all three endpoints (GET, POST, PUT). The frontend
uses `<PaywallOverlay>` to gate access for free users.

### Integration Pattern

```tsx
import { PaywallOverlay } from '@/components/billing/PaywallOverlay'

export default function PortfolioPage() {
  const { plan } = useBillingStore()

  // Gate on frontend BEFORE the API call to prevent a 403 error screen
  if (plan === 'free') {
    return (
      <AppShell title="Portfolio">
        <PaywallOverlay feature="portfolio" compactOnMobile>
          <PortfolioPlaceholder />
        </PaywallOverlay>
      </AppShell>
    )
  }

  // ... existing data-fetching and rendering for Pro/Team/Demo users ...
}
```

### What Free Users See

**Desktop:** The full portfolio layout renders with sample placeholder data, but
everything is blurred behind `backdrop-blur-[10px]` with `bg-white/70`. A centered
card appears:

```
┌──────────────────────────────────────────────┐
│            🔒                                │
│                                              │
│       Portfolio Tracking                     │
│                                              │
│  Track closed deals, equity, and monthly     │
│  cash flow.                                  │
│                                              │
│        [Upgrade to Pro  ->]                  │
│         Compare all plans                    │
└──────────────────────────────────────────────┘
```

**Mobile (with `compactOnMobile`):** Blurred content hidden entirely, replaced by
a compact lock card:

```
┌──────────────────────────┐
│  🔒 Portfolio Tracking   │
│  Upgrade to Pro to       │
│  track your closed deals │
│  [Upgrade ->]            │
└──────────────────────────┘
```

### PaywallOverlay Light Theme Adjustments

```tsx
{/* Blur overlay */}
<motion.div className="absolute inset-0 z-10 backdrop-blur-[10px] bg-white/70
                       flex items-center justify-center">

{/* CTA card */}
<motion.div className="bg-white border border-gray-200 rounded-xl p-6
                       text-center space-y-3 shadow-lg shadow-indigo-500/5
                       max-w-[320px] w-full mx-4">
  <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100
                  flex items-center justify-center mx-auto">
    <Lock size={18} className="text-indigo-600" />
  </div>
  <h3 className="text-sm font-semibold text-gray-900">Portfolio Tracking</h3>
  <p className="text-xs text-gray-500 leading-relaxed">
    Track closed deals, equity, and monthly cash flow.
  </p>
  <Button className="w-full bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm">
    Upgrade to Pro
    <ArrowRight size={14} className="ml-1" />
  </Button>
  <Link to="/settings/billing"
    className="text-[11px] text-gray-400 hover:text-gray-600 transition-colors">
    Compare all plans
  </Link>
</motion.div>
```

### Sample Data Behind Blur

To make the blur preview compelling, render hardcoded sample entries so the blurred
shapes hint at what the page looks like populated:

```tsx
const SAMPLE_ENTRIES = [
  { address: '123 Elm St', strategy: 'brrrr', closed_price: 245000, profit: 32400, monthly_cash_flow: 1200 },
  { address: '456 Oak Ave', strategy: 'flip', closed_price: 180000, profit: 45000, monthly_cash_flow: 0 },
  { address: '789 Pine Rd', strategy: 'buy_and_hold', closed_price: 320000, profit: 18200, monthly_cash_flow: 2100 },
  { address: '1024 Maple Dr', strategy: 'wholesale', closed_price: 95000, profit: 12000, monthly_cash_flow: 0 },
]
```

No API call is made for free users. Sample data is client-side only.

---

## 8. Mobile Layout

On screens `< 768px`, the portfolio page switches from table to card-based property
list. Charts stack vertically.

### Mobile Page Structure

```
┌──────────────────────────┐
│ hamburger  Portfolio      │
├──────────────────────────┤
│ Total Equity             │
│ $847,200                 │
│ ╱╲╱╲╱╲╱╲╱╲              │
├──────────────────────────┤
│ <-[Cash Flow][Return][Deals]-> (scroll-snap row)
│    $4,820    14.2%    8
├──────────────────────────┤
│ ┌── Cash Flow Chart ───┐ │
│ │  (180px area chart)  │ │
│ └──────────────────────┘ │
├──────────────────────────┤
│ ┌── Strategy Donut ────┐ │
│ │  (220px donut)       │ │
│ └──────────────────────┘ │
├──────────────────────────┤
│ ┌── Monthly CF Bars ───┐ │
│ │  (180px bar chart)   │ │
│ └──────────────────────┘ │
├──────────────────────────┤
│ Closed Deals      [+Add] │
├──────────────────────────┤
│ ┌──────────────────────┐ │
│ │ 123 Elm St    [BRRRR]│ │
│ │ Mar 2026             │ │
│ │ Price    $245,000    │ │
│ │ Profit   $32,400     │ │
│ │ CF/mo    $1,200      │ │
│ │ ROI      13.2%       │ │
│ │            [Edit]    │ │
│ └──────────────────────┘ │
│ ┌──────────────────────┐ │
│ │ 456 Oak Ave   [Flip] │ │
│ │ ...                  │ │
│ └──────────────────────┘ │
└──────────────────────────┘
```

### KPI Row: Mobile vs Desktop

```tsx
{/* Mobile: hero + horizontal scroll row */}
<div className="block md:hidden space-y-3">
  <KPICard label="Total Equity" value={summary.total_equity}
           format="currency" className="w-full" />
  <div className="flex gap-3 overflow-x-auto scroll-smooth snap-x snap-mandatory
                  pb-2 -mx-4 px-4">
    <KPICard label="Cash Flow" value={summary.total_monthly_cash_flow}
             format="currency" className="min-w-[160px] snap-start shrink-0" />
    <KPICard label="Ann. Return" value={summary.avg_annualized_return ?? 0}
             format="percent" className="min-w-[160px] snap-start shrink-0" />
    <KPICard label="Deals" value={summary.total_deals_closed}
             format="number" className="min-w-[160px] snap-start shrink-0" />
  </div>
</div>

{/* Desktop: 4-column grid */}
<div className="hidden md:grid grid-cols-2 lg:grid-cols-4 gap-4">
  <KPICard label="Total Equity" ... />
  <KPICard label="Monthly Cash Flow" ... />
  <KPICard label="Annualized Return" ... />
  <KPICard label="Deals Closed" ... />
</div>
```

### Property List: Cards on Mobile, Table on Desktop

```tsx
{/* Mobile: card stack */}
<div className="block md:hidden space-y-3">
  {sortedEntries.map((entry) => (
    <PropertyCard key={entry.id} entry={entry}
      onEdit={() => setEditingEntry(entry)} />
  ))}
</div>

{/* Desktop: full table */}
<div className="hidden md:block">
  {/* Table from Section 2 */}
</div>
```

### Mobile Chart Adjustments

- Cash Flow area chart: `height={180}` (down from 220px desktop)
- Donut chart: stays at `height={220}` (already compact)
- Bar chart: `height={180}`, XAxis `interval={2}` to show every 3rd month label
- All charts full-width, stacked vertically (single column)
- Bar chart with 8+ months uses horizontal scroll:

```tsx
<div className="overflow-x-auto">
  <div style={{ minWidth: Math.max(320, monthlyCashFlowData.length * 48) }}>
    <ResponsiveContainer width="100%" height={180}>
      {/* BarChart */}
    </ResponsiveContainer>
  </div>
</div>
```

### Mobile "Add" Button

On mobile, the "Add closed deal" text link becomes a full-width button below the
card list:

```tsx
<div className="sm:hidden mt-4">
  <button onClick={() => setSheetOpen(true)}
          className="w-full h-10 rounded-lg border border-gray-200 bg-white
                     text-sm font-medium text-gray-700 hover:bg-gray-50
                     transition-colors flex items-center justify-center gap-2">
    <Plus size={16} />
    Add closed deal
  </button>
</div>
```

### Scroll Snap

The mobile KPI row uses CSS scroll snap for native-feeling swipe. The `-mx-4 px-4`
negative margin trick extends the scroll area to page edges while keeping visual
alignment with other content. No custom JS needed.

---

## CRITICAL DECISIONS

### 1. Inter `tabular-nums` for numbers, NOT JetBrains Mono

The dark theme used JetBrains Mono for financial values (KPIs, table cells, chart
axes). For the light theme, **switch KPI hero numbers and table cells to Inter with
`font-variant-numeric: tabular-nums`**. Rationale: Inter with tabular-nums provides
the same column-alignment benefit as a monospace font but reads more naturally in a
professional light context. JetBrains Mono remains used for **chart axis ticks and
tooltips only**, where the "data readout" aesthetic is appropriate.

### 2. Donut chart: `stroke="#FFFFFF" strokeWidth={2}`

On the dark theme, `stroke="transparent"` was fine because the dark card bg provided
contrast. On white, adjacent segments with similar luminance blend. White stroke gaps
between segments (Stripe donut convention) provide clean visual separation. This is
combined with `paddingAngle={3}` for extra breathing room.

### 3. Edit flow: modal, not inline

Inline table editing was considered and rejected. Five fields per entry is too many
for inline. The existing `EditPortfolioModal` (Dialog) is kept. On mobile, the card
"Edit" button opens the same modal. The Sheet panel is reserved for the "Add" flow
only, differentiating create vs. edit contexts.

### 4. PaywallOverlay wraps entire page content, not individual sections

Instead of gating each chart and table separately, `<PaywallOverlay feature="portfolio">`
wraps the entire `<PortfolioContent>` component. One cohesive blur, one CTA. The
backend 403 is the security boundary; the frontend gate is a UX optimization to show
the upgrade prompt instead of an error screen.

### 5. Sample data behind blur is hardcoded, not fetched

When a free user visits `/portfolio`, the component renders 4 hardcoded sample entries
to fill the blurred preview. No API call (which would 403). The samples include all
five strategies to make the donut preview look realistic.

### 6. Mobile: card list, not horizontal-scroll table

Tables with 7+ columns on mobile are unusable even with horizontal scroll. The mobile
layout (`< md`) replaces the table entirely with stacked `PropertyCard` components.
Each card shows the same data in a vertical 2-column metric grid. Desktop table hidden
on mobile via `hidden md:block`.

### 7. Sort: client-side only, no backend param

Portfolio datasets are small (typically < 50 entries). Sorting happens in `useMemo`
with `sortKey` / `sortDir` state. No backend changes required. Default: `closed_date
DESC`. Clicking a column toggles asc/desc; clicking a different column resets to the
natural default for that type (desc for dates/numbers, asc for text).

### 8. ROI column: computed client-side

The backend `PortfolioEntryResponse` has no ROI field. The frontend computes it as
`(profit / closed_price) * 100`. If `closed_price` is 0, ROI shows `--`. This
computed value is also sortable.

### 9. Cash Flow chart requires >= 2 entries

Existing behavior preserved: cumulative cash flow area chart only renders with 2+
entries. With 0-1 entries, a placeholder message: "Add at least 2 closed deals to see
your cash flow trend." Prevents a single-point chart that conveys no trend.

### 10. Area chart gradient opacity: 0.12 (not 0.2)

The current `stopOpacity={0.2}` produces too heavy a wash on white. Reduced to `0.12`
top / `0.01` bottom (effectively invisible at baseline). Matches Mercury's barely-
visible gradient fills that add color context without competing with the stroke line.

### 11. Donut segment colors vs. badge colors are intentionally different

Chart segments use **saturated** `STRATEGY_COLORS` (emerald, violet, amber, blue, rose)
for visual impact at chart scale. Badges use **muted pastel** backgrounds with dark text
for inline readability. Two palettes serving two contexts. Do not unify them.

### 12. Sparklines on first 3 KPIs only

Include sparklines on Total Equity, Monthly Cash Flow, and Total Profit cards.
Exclude sparklines from "Deals Closed" (integer count with no meaningful trend line).
Sparkline data comes from chronologically ordering entries and computing running totals.
