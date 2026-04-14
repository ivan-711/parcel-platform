# Agent 04 -- Dashboard Design (Light Theme)

Design specification for Parcel's dashboard on `#F8FAFC` background with white card surfaces, indigo accents, and Inter `tabular-nums` for all numerical displays.

---

## 1. Layout: Vertical Section Stack

The dashboard is a single-column scroll with five distinct zones, stacked top to bottom. No sidebar content competes -- the AppShell sidebar remains fixed at 216px on desktop.

```
┌─ AppShell ──────────────────────────────────────────────────────────────┐
│ Sidebar │                                                               │
│  216px  │  ┌─ Trial Banner (conditional) ─────────────────────────────┐ │
│         │  │ 5 days left on Pro trial. Upgrade to keep full access.   │ │
│         │  └──────────────────────────────────────────────────────────┘ │
│         │                                                               │
│         │  ┌─ Page Header ────────────────────────────────────────────┐ │
│         │  │ Dashboard                       [1M] [3M] [6M] [1Y]     │ │
│         │  └──────────────────────────────────────────────────────────┘ │
│         │                                                               │
│         │  ┌─ ZONE 1: KPI Row ────────────────────────────────────────┐ │
│         │  │ [Portfolio Value] [Monthly CF] [Active Deals] [Pipeline] [AI] │
│         │  └──────────────────────────────────────────────────────────┘ │
│         │                                                               │
│         │  ┌─ ZONE 2: Quick Actions ─────────────────────────────────┐ │
│         │  │ [+ New Analysis]  [Upload Document]  [View Pipeline ->]  │ │
│         │  └──────────────────────────────────────────────────────────┘ │
│         │                                                               │
│         │  ┌─ ZONE 3: Cash Flow Trend Chart ─────────────────────────┐ │
│         │  │ Area chart, 220px height, indigo gradient fill           │ │
│         │  └──────────────────────────────────────────────────────────┘ │
│         │                                                               │
│         │  ┌─ ZONE 4: Two-Column Bottom ─────────────────────────────┐ │
│         │  │ ┌─ Recent Deals (3/5) ─────┐ ┌─ Activity Feed ────────┐ │ │
│         │  │ │ Table: address, strategy, │ │ Today                  │ │ │
│         │  │ │ risk, status, view link   │ │  Analyzed 123 Elm St   │ │ │
│         │  │ │                           │ │  Moved to Offer Sent   │ │ │
│         │  │ │              [View all ->]│ │ Yesterday              │ │ │
│         │  │ └───────────────────────────┘ │  Uploaded lease doc    │ │ │
│         │  │                               │  Closed 789 Pine Rd   │ │ │
│         │  │                               │         [View all ->] │ │ │
│         │  │                               └────────────────────────┘ │ │
│         │  └──────────────────────────────────────────────────────────┘ │
│         │                                                               │
│         │  ┌─ ZONE 5: Quick Actions (mobile only, repeated) ─────────┐ │
│         │  │ Sticky bottom bar with primary CTA on small screens      │ │
│         │  └──────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
```

### Section Spacing

| Gap              | Value  | Tailwind         |
|------------------|--------|------------------|
| Between zones    | 24px   | `space-y-6`      |
| KPI card gap     | 16px   | `gap-4`          |
| Inside cards     | 20px   | `p-5`            |
| Chart container  | 24px   | `p-6`            |
| Bottom two-col   | 24px   | `gap-6`          |

---

## 2. KPI Cards

### Cards Displayed (5 total, 4 on desktop row + 1 scrollable on mobile)

| # | Label            | Format    | Example         | Sparkline | Delta Source              |
|---|------------------|-----------|-----------------|-----------|---------------------------|
| 1 | Portfolio Value   | currency  | $1,247,832      | 7-point   | % change vs prior period  |
| 2 | Monthly Cash Flow | currency  | $8,420          | 7-point   | $ change vs prior period  |
| 3 | Active Deals      | number    | 12              | 7-point   | none                      |
| 4 | Pipeline          | number    | 8               | 7-point   | none                      |
| 5 | AI Analyses       | fraction  | 34/50           | none      | usage warning at >=80%    |

### Visual Spec

```
┌──────────────────────────────────┐
│  Monthly Cash Flow               │  <- text-xs font-medium text-gray-500
│  $8,420                          │  <- text-3xl font-semibold font-mono text-gray-900
│  ↑ $620  vs last month           │  <- text-xs font-mono text-emerald-600 + text-gray-400
│  ┈┈╱╲┈╱╲╱╲╱╲╱╲╱                 │  <- sparkline, 60px tall, bleeds to card edges
└──────────────────────────────────┘
```

### Tailwind Implementation

```tsx
<div className={cn(
  'rounded-xl border border-gray-200 bg-white p-5 space-y-1 overflow-hidden',
  'shadow-[0_1px_2px_rgba(0,0,0,0.04),0_1px_3px_rgba(0,0,0,0.02)]',
  className
)}>
  <p className="text-xs font-medium text-gray-500 tracking-wide">
    {label}
  </p>
  <p className="text-3xl font-semibold text-gray-900"
     style={{ fontFamily: '"Inter", sans-serif', fontVariantNumeric: 'tabular-nums' }}>
    {formatValue(animated, format)}
  </p>
  {delta !== undefined && (
    <p className={cn(
      'text-xs font-medium',
      delta >= 0 ? 'text-emerald-600' : 'text-red-600'
    )} style={{ fontVariantNumeric: 'tabular-nums' }}>
      {delta >= 0 ? '↑' : '↓'} {formatDelta(delta, format)}
      <span className="text-gray-400 ml-1.5">vs last month</span>
    </p>
  )}
  {/* sparkline here */}
</div>
```

### Typography Rule

All financial numbers across the dashboard use Inter with `font-variant-numeric: tabular-nums` -- NOT JetBrains Mono. This is a departure from the dark theme. Inter tabular-nums gives aligned columns without the "code editor" feel that JetBrains Mono carries on a light professional surface. Add this CSS utility:

```css
.tabular-nums {
  font-variant-numeric: tabular-nums;
}
```

Apply via Tailwind's built-in `tabular-nums` class:
```tsx
<p className="text-3xl font-semibold text-gray-900 tabular-nums">
```

### Trend Arrow + Sparkline Relationship

- Sparkline stroke color matches trend direction: `#6366F1` (indigo) for positive/neutral, `#DC2626` (red) for negative.
- Fill gradient: `stopOpacity={0.08}` at top, `0` at bottom. Reduced from dark theme's `0.2` because indigo wash is much more visible on white.
- Sparkline bleeds to card edges: `className="-mx-5 -mb-5 mt-2"` on the container, preserving the current pattern.
- No dots, no axes, no grid -- sparklines are ambient decoration, not interactive charts.

### AI Analyses Card -- Usage Warning State

When usage reaches >=80% of monthly limit, the card switches to an amber treatment:

```tsx
// Normal state
<div className="rounded-xl border border-gray-200 bg-white p-5 ...">

// Warning state (>= 80%)
<div className="rounded-xl border border-amber-200 bg-amber-50/50 p-5 ...">
  <p className="text-xs font-medium text-amber-700">AI Analyses</p>
  <p className="text-3xl font-semibold text-gray-900 tabular-nums">
    42<span className="text-lg text-gray-400">/50</span>
  </p>
  <p className="text-xs text-amber-600">
    8 remaining -- <Link to="/settings/billing" className="underline">Upgrade</Link>
  </p>
</div>
```

---

## 3. Charts: Recharts Light Theme Configuration

### Shared Theme Config

All charts on the dashboard import from a centralized theme. These values are the single source of truth:

```ts
// lib/chart-theme.ts

export const LIGHT_CHART = {
  // Axis
  axisLabel:    '#64748B',   // Slate 500
  axisLine:     '#CBD5E1',   // Slate 300
  axisFont:     '"Inter", sans-serif',
  axisFontSize: 12,

  // Grid
  gridLine:     '#F1F5F9',   // Slate 100 -- near invisible
  gridDash:     '3 3',

  // Tooltip
  tooltipBg:    '#FFFFFF',
  tooltipBorder:'#E2E8F0',   // Slate 200
  tooltipShadow:'0 4px 12px rgba(0,0,0,0.08)',
  tooltipText:  '#0F172A',   // Slate 900

  // Series
  primary:      '#6366F1',   // Indigo
  positive:     '#059669',   // Emerald 600 (darker for light bg WCAG AA)
  negative:     '#DC2626',   // Red 600
  neutral:      '#94A3B8',   // Slate 400

  // Gradient fills
  primaryFillTop:    0.12,   // stopOpacity at gradient top
  primaryFillBottom: 0.01,   // stopOpacity at gradient bottom
} as const
```

### Shared Axis Props (reusable across all charts)

```tsx
export const xAxisDefaults = {
  tick: {
    fontSize: 12,
    fill: LIGHT_CHART.axisLabel,
    fontFamily: LIGHT_CHART.axisFont,
  },
  tickLine: false,
  axisLine: { stroke: LIGHT_CHART.axisLine, strokeWidth: 1 },
} as const

export const yAxisDefaults = {
  tick: {
    fontSize: 11,
    fill: LIGHT_CHART.axisLabel,
    fontFamily: LIGHT_CHART.axisFont,
  },
  tickLine: false,
  axisLine: false,
  width: 64,
} as const

export const gridDefaults = {
  strokeDasharray: LIGHT_CHART.gridDash,
  stroke: LIGHT_CHART.gridLine,
  vertical: false,
} as const

export const chartMargins = {
  top: 8, right: 16, bottom: 4, left: 8,
} as const
```

### Cash Flow Trend Chart (Dashboard Main Chart)

Full-width area chart. Primary visual after KPIs.

```
┌─ Cash Flow Trend ──────────────────────────────── [1M] [3M] [6M] [1Y] ─┐
│                                                                          │
│   $10K ┤                                    ╱╲                           │
│    $8K ┤                  ╱╲──╱╲──╱╲──╱╲──╱  ╲                          │
│    $6K ┤      ╱╲──╱╲──╱╲╱                                               │
│    $4K ┤╱╲──╱╱                                                           │
│        └────┬────┬────┬────┬────┬────┬────┬────┬────┬────┬────┬────┤    │
│            Apr  May  Jun  Jul  Aug  Sep  Oct  Nov  Dec  Jan  Feb  Mar    │
└──────────────────────────────────────────────────────────────────────────┘
```

**Specifications:**
- Container: white card, `rounded-xl border border-gray-200 bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)]`
- Height: 220px desktop, 160px mobile
- Curve type: `monotone`
- Stroke: `#6366F1`, 2px
- Fill: linear gradient, indigo at 12% opacity top -> 1% bottom
- Grid: horizontal dotted lines only, `#F1F5F9`
- Y-axis: abbreviated dollars (`$4K`, `$8K`), no axis line, floating labels
- X-axis: month abbreviations, thin bottom rule, no tick marks
- Tooltip: white card, `border-slate-200`, `shadow-[0_4px_12px_rgba(0,0,0,0.08)]`
- Cursor: vertical line `stroke="#6366F1" strokeOpacity={0.15}`
- Active dot: `r={4}`, white fill, indigo stroke, `strokeWidth={2}`
- `dot={false}` -- no permanent dots on the line

### Time Range Segmented Control

Positioned in the chart card header, right-aligned:

```tsx
<div className="inline-flex rounded-lg border border-gray-200 bg-white overflow-hidden">
  {['1M', '3M', '6M', '1Y'].map((range) => (
    <button
      key={range}
      onClick={() => setTimeRange(range)}
      className={cn(
        'px-3 py-1.5 text-xs font-medium transition-colors',
        active === range
          ? 'bg-indigo-50 text-indigo-700'
          : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
      )}
    >
      {range}
    </button>
  ))}
</div>
```

The `timeRange` state controls both KPI delta calculations and the chart data range. Default: `6M`.

### Chart Tooltip Component

Shared across all dashboard charts:

```tsx
function ChartTooltip({ active, payload, label, formatValue }: ChartTooltipProps) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2.5
                    shadow-[0_4px_12px_rgba(0,0,0,0.08)]">
      {label && (
        <p className="mb-1.5 text-xs font-medium text-slate-500">{label}</p>
      )}
      {payload.map((entry) => (
        <div key={entry.dataKey} className="flex items-center gap-2 py-0.5">
          <span className="h-2 w-2 rounded-full shrink-0"
                style={{ backgroundColor: entry.color }} />
          <span className="text-xs text-slate-500">{entry.name}</span>
          <span className="ml-auto text-sm font-medium text-slate-900 tabular-nums">
            {formatValue(entry.value)}
          </span>
        </div>
      ))}
    </div>
  )
}
```

---

## 4. Activity Feed

### Structure: Grouped by Day

The flat list of activity items is grouped client-side by timestamp into day buckets: "Today", "Yesterday", or the formatted date.

```
┌─ Recent Activity ───────────────────────────────────── View all -> ─┐
│                                                                      │
│  TODAY                                                               │
│  ┌─ ○ ─┐  Analyzed "123 Elm St" -- BRRRR, 14.2% CoC     3 min ago  │
│  └─────┘                                                             │
│  ┌─ → ─┐  Moved "456 Oak Ave" to Offer Sent              1 hr ago   │
│  └─────┘                                                             │
│                                                                      │
│  YESTERDAY                                                           │
│  ┌─ ◻ ─┐  Uploaded lease for "789 Pine Rd"                Mar 29    │
│  └─────┘                                                             │
│  ┌─ ✓ ─┐  Closed deal "789 Pine Rd" -- $45,000 profit     Mar 29    │
│  └─────┘                                                             │
└──────────────────────────────────────────────────────────────────────┘
```

### Icon + Color Map

| Activity Type       | Icon          | Icon Color | Background (8% opacity) |
|---------------------|---------------|------------|-------------------------|
| `deal_analyzed`     | Calculator    | `#6366F1`  | `#6366F110`             |
| `pipeline_moved`    | ArrowRight    | `#F59E0B`  | `#F59E0B10`             |
| `document_analyzed` | FileText      | `#0EA5E9`  | `#0EA5E910`             |
| `deal_closed`       | CheckCircle2  | `#059669`  | `#05966910`             |

### Component Spec

```tsx
interface ActivityGroup {
  label: string              // "Today", "Yesterday", "Mar 27"
  items: ActivityItem[]
}

function ActivityFeed({ groups }: { groups: ActivityGroup[] }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5
                    shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-900">Recent Activity</h3>
        <Link to="/deals" className="text-xs font-medium text-indigo-600
                                      hover:text-indigo-700 transition-colors">
          View all ->
        </Link>
      </div>

      <div className="space-y-5">
        {groups.map((group) => (
          <div key={group.label}>
            <p className="text-[11px] font-medium text-gray-400 uppercase
                          tracking-wider mb-2">
              {group.label}
            </p>
            <div className="space-y-1">
              {group.items.map((item) => (
                <div key={item.id}
                     className="flex items-center gap-3 rounded-lg px-3 py-2.5
                                hover:bg-gray-50 transition-colors">
                  {/* Icon container */}
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center
                                  shrink-0"
                       style={{ backgroundColor: `${iconColor}10` }}>
                    <Icon size={16} style={{ color: iconColor }} />
                  </div>

                  {/* Text */}
                  <p className="text-sm text-gray-700 flex-1 truncate">
                    {item.text}
                  </p>

                  {/* Timestamp */}
                  <span className="text-xs text-gray-400 tabular-nums shrink-0">
                    {timeAgo(item.timestamp)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
```

### Day Grouping Logic

```ts
function groupByDay(items: ActivityItem[]): ActivityGroup[] {
  const now = new Date()
  const today = now.toDateString()
  const yesterday = new Date(now.getTime() - 86_400_000).toDateString()

  const groups = new Map<string, ActivityItem[]>()

  for (const item of items) {
    const d = new Date(item.timestamp).toDateString()
    const label = d === today ? 'Today'
                : d === yesterday ? 'Yesterday'
                : new Date(item.timestamp).toLocaleDateString('en-US', {
                    month: 'short', day: 'numeric'
                  })
    if (!groups.has(label)) groups.set(label, [])
    groups.get(label)!.push(item)
  }

  return Array.from(groups.entries()).map(([label, items]) => ({ label, items }))
}
```

---

## 5. Quick Actions

Positioned between KPI row and chart. Three buttons, primary + two secondary.

```tsx
function QuickActions() {
  return (
    <div className="flex items-center gap-3">
      {/* Primary */}
      <Link
        to="/analyze"
        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg
                   bg-indigo-600 text-white text-sm font-medium
                   hover:bg-indigo-700 transition-colors
                   shadow-sm"
      >
        <Plus size={16} />
        New Analysis
      </Link>

      {/* Secondary */}
      <Link
        to="/documents"
        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg
                   bg-white text-gray-700 text-sm font-medium
                   border border-gray-200 hover:bg-gray-50
                   transition-colors shadow-sm"
      >
        <Upload size={16} />
        Upload Document
      </Link>

      {/* Tertiary */}
      <Link
        to="/pipeline"
        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg
                   bg-white text-gray-700 text-sm font-medium
                   border border-gray-200 hover:bg-gray-50
                   transition-colors shadow-sm"
      >
        <Kanban size={16} />
        View Pipeline
      </Link>
    </div>
  )
}
```

### Button Visual Spec

| Button          | Background      | Border           | Text         | Shadow     |
|-----------------|-----------------|------------------|--------------|------------|
| New Analysis    | `bg-indigo-600` | none             | `text-white` | `shadow-sm`|
| Upload Document | `bg-white`      | `border-gray-200`| `text-gray-700`| `shadow-sm`|
| View Pipeline   | `bg-white`      | `border-gray-200`| `text-gray-700`| `shadow-sm`|

Hover states: primary darkens to `bg-indigo-700`, secondary gains `bg-gray-50`.

---

## 6. Empty State: Onboarding Checklist

When `stats.total_deals === 0`, replace the entire populated dashboard with an onboarding flow.

### Wireframe

```
┌─ Welcome to Parcel ───────────────────────────────────────────────────┐
│  Complete these steps to get started.                                  │
│                                                                        │
│  ┌─ Getting Started ─────────────────────────────── 1 of 4 ──────────┐│
│  │                                                                    ││
│  │  [x] Create your account                           Completed       ││
│  │  [ ] Analyze your first deal                       [Start ->]      ││
│  │  [ ] Add a deal to your pipeline                   [Go ->]         ││
│  │  [ ] Upload your first document                    [Upload ->]     ││
│  │                                                                    ││
│  │  ████░░░░░░░░░░░░░░░░  25%                                        ││
│  └────────────────────────────────────────────────────────────────────┘│
│                                                                        │
│  ┌─ See Parcel in Action ────────────────────────────────────────────┐│
│  │  Explore a sample BRRRR analysis on a real property.               ││
│  │                                                    [View Sample ->]││
│  └────────────────────────────────────────────────────────────────────┘│
│                                                                        │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                            │
│  │ Pipeline │  │ Documents│  │ AI Chat  │                            │
│  │ Track    │  │ Upload   │  │ Ask any  │                            │
│  │ deals    │  │ leases   │  │ question │                            │
│  └──────────┘  └──────────┘  └──────────┘                            │
└────────────────────────────────────────────────────────────────────────┘
```

### Data Model

```ts
interface OnboardingStep {
  id: string
  label: string
  description: string
  completed: boolean
  href: string
  ctaLabel: string
}

const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 'account',
    label: 'Create your account',
    description: 'Done!',
    completed: true,
    href: '#',
    ctaLabel: 'Completed',
  },
  {
    id: 'analyze',
    label: 'Analyze your first deal',
    description: 'Run numbers on a wholesale, BRRRR, flip, or buy & hold deal.',
    completed: false,
    href: '/analyze',
    ctaLabel: 'Start Analysis',
  },
  {
    id: 'pipeline',
    label: 'Add a deal to your pipeline',
    description: 'Track a deal from lead to close.',
    completed: false,
    href: '/pipeline',
    ctaLabel: 'Open Pipeline',
  },
  {
    id: 'document',
    label: 'Upload your first document',
    description: 'Attach a contract, lease, or inspection report.',
    completed: false,
    href: '/documents',
    ctaLabel: 'Upload',
  },
]
```

### Progress Bar

```tsx
<div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
  <div
    className="bg-indigo-600 h-2 rounded-full transition-all duration-500 ease-out"
    style={{ width: `${(completed / total) * 100}%` }}
  />
</div>
<p className="text-xs text-gray-500 mt-1.5">
  {completed} of {total} completed
</p>
```

### Checklist Row

```tsx
<div className={cn(
  'flex items-center gap-4 px-4 py-3.5 rounded-lg',
  step.completed ? 'bg-gray-50' : 'bg-white'
)}>
  {/* Check circle */}
  <div className={cn(
    'w-6 h-6 rounded-full flex items-center justify-center shrink-0',
    step.completed
      ? 'bg-indigo-600 text-white'
      : 'border-2 border-gray-300'
  )}>
    {step.completed && <Check size={14} />}
  </div>

  {/* Label + description */}
  <div className="flex-1 min-w-0">
    <p className={cn(
      'text-sm font-medium',
      step.completed ? 'text-gray-400 line-through' : 'text-gray-900'
    )}>
      {step.label}
    </p>
    {!step.completed && (
      <p className="text-xs text-gray-500 mt-0.5">{step.description}</p>
    )}
  </div>

  {/* CTA */}
  {!step.completed ? (
    <Link
      to={step.href}
      className="text-xs font-medium text-indigo-600 hover:text-indigo-700
                 transition-colors shrink-0"
    >
      {step.ctaLabel} ->
    </Link>
  ) : (
    <span className="text-xs text-gray-400 shrink-0">Completed</span>
  )}
</div>
```

### Completion Tracking

Track via `localStorage` key `parcel_onboarding`:

```ts
const STORAGE_KEY = 'parcel_onboarding'

function getOnboardingState(): Record<string, boolean> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
  } catch {
    return {}
  }
}

function markStepComplete(stepId: string) {
  const state = getOnboardingState()
  state[stepId] = true
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}
```

The `account` step is always pre-completed. Other steps complete automatically when the user performs the action (detected by checking `stats.total_deals > 0`, pipeline count > 0, document count > 0).

### Hint Cards (Below Checklist)

Three cards in a `grid-cols-1 sm:grid-cols-3` grid:

```tsx
<div className="p-5 rounded-xl border border-gray-200 bg-white
                shadow-[0_1px_2px_rgba(0,0,0,0.04)] space-y-3">
  <div className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center">
    <Icon size={18} className="text-indigo-600" />
  </div>
  <p className="text-sm font-medium text-gray-900">{title}</p>
  <p className="text-xs text-gray-500 leading-relaxed">{description}</p>
</div>
```

---

## 7. Trial Banner Integration

Shown when user is on a trial plan with days remaining. Positioned above the page header, below the AppShell topbar.

### States

| Condition               | Style                                    | Message                                                |
|-------------------------|------------------------------------------|--------------------------------------------------------|
| Trial active (>3 days)  | `bg-indigo-50 border-indigo-100`         | "You have X days left on your Pro trial."              |
| Trial expiring (<=3 days)| `bg-amber-50 border-amber-200`          | "Your trial ends in X days. Upgrade to keep access."   |
| Trial expired           | `bg-red-50 border-red-200`               | "Your trial has expired. Upgrade to restore access."   |
| Demo account            | `bg-indigo-50 border-indigo-100`         | "You're viewing a demo account. Create yours free."    |

### Implementation

```tsx
function TrialBanner({ daysLeft, onDismiss }: { daysLeft: number; onDismiss: () => void }) {
  const isUrgent = daysLeft <= 3
  const isExpired = daysLeft <= 0

  return (
    <div className={cn(
      'rounded-lg px-4 py-3 text-sm flex items-center justify-between mb-4',
      isExpired
        ? 'bg-red-50 border border-red-200 text-red-800'
        : isUrgent
        ? 'bg-amber-50 border border-amber-200 text-amber-800'
        : 'bg-indigo-50 border border-indigo-100 text-indigo-800'
    )}>
      <p>
        {isExpired
          ? 'Your trial has expired.'
          : `${daysLeft} day${daysLeft !== 1 ? 's' : ''} left on your Pro trial.`}
        {' '}
        <Link
          to="/settings/billing"
          className={cn(
            'font-semibold underline underline-offset-2',
            isExpired ? 'text-red-900' : isUrgent ? 'text-amber-900' : 'text-indigo-900'
          )}
        >
          Upgrade now ->
        </Link>
      </p>
      <button
        onClick={onDismiss}
        className="ml-4 shrink-0 opacity-50 hover:opacity-100 transition-opacity"
        aria-label="Dismiss banner"
      >
        <X size={16} />
      </button>
    </div>
  )
}
```

### Dismissal

- Dismissed state stored in `sessionStorage` (re-appears next session).
- Expired trial banner cannot be dismissed -- always visible until upgraded.

---

## 8. Skeleton Loading

When `isLoading` is true, render placeholder cards matching the exact layout of the populated dashboard. This prevents layout shift on load completion.

### Skeleton Layout

```
┌─ Page ───────────────────────────────────────────────────────────┐
│  [skeleton banner -- hidden unless trial user]                    │
│                                                                   │
│  ┌─ KPI skeleton ─┐ ┌─ KPI ─┐ ┌─ KPI ─┐ ┌─ KPI ─┐ ┌─ KPI ─┐  │
│  │ ████░░░         │ │ ...   │ │ ...   │ │ ...   │ │ ...   │  │
│  │ ████████░       │ │       │ │       │ │       │ │       │  │
│  │ ████░░░░░░      │ │       │ │       │ │       │ │       │  │
│  └─────────────────┘ └───────┘ └───────┘ └───────┘ └───────┘  │
│                                                                   │
│  ┌─ Chart skeleton ──────────────────────────────────────────────┐│
│  │ ████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░                 ││
│  │                                                               ││
│  │ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░                ││
│  │ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░                ││
│  └───────────────────────────────────────────────────────────────┘│
│                                                                   │
│  ┌─ Table skeleton ─────────────┐ ┌─ Activity skeleton ─────────┐│
│  │ ████░ ████░ ████░ ████░      │ │ ████░░░░░░░░░░░░░░          ││
│  │ ████████░░░░░░░░░░░░         │ │ ████████░░░░░░░░            ││
│  │ ████████░░░░░░░░░░░░         │ │ ████████░░░░░░░░            ││
│  │ ████████░░░░░░░░░░░░         │ │ ████████░░░░░░░░            ││
│  └──────────────────────────────┘ └─────────────────────────────┘│
└───────────────────────────────────────────────────────────────────┘
```

### Skeleton Card Component (Light Theme)

```tsx
export function SkeletonCard({ className, lines = 3 }: SkeletonCardProps) {
  return (
    <div className={cn(
      'rounded-xl border border-gray-200 bg-white p-5 space-y-3',
      'shadow-[0_1px_2px_rgba(0,0,0,0.04)]',
      className
    )}>
      <div className="h-4 w-2/5 rounded-md bg-gray-100 animate-pulse" />
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className={cn(
            'h-3 rounded-md bg-gray-100 animate-pulse',
            i === lines - 1 ? 'w-3/4' : 'w-full'
          )}
          style={{ animationDelay: `${i * 100}ms` }}
        />
      ))}
    </div>
  )
}
```

### Shimmer Gradient (Optional Upgrade)

Replace `animate-pulse` with a directional shimmer for a more polished feel:

```css
.skeleton-shimmer {
  background: linear-gradient(
    90deg,
    #F3F4F6 0%,
    #E5E7EB 50%,
    #F3F4F6 100%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s ease-in-out infinite;
}

@keyframes shimmer {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
```

### Skeleton KPI Card

Matches the exact dimensions of a populated KPI card:

```tsx
function SkeletonKPI() {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-2
                    shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
      <div className="h-3 w-24 rounded bg-gray-100 animate-pulse" />
      <div className="h-8 w-32 rounded bg-gray-100 animate-pulse" />
      <div className="h-3 w-20 rounded bg-gray-100 animate-pulse" />
      <div className="h-[60px] -mx-5 -mb-5 bg-gray-50 rounded-b-xl" />
    </div>
  )
}
```

---

## 9. Mobile Responsive Design

### Breakpoint Strategy

| Breakpoint     | KPI Layout                        | Chart        | Bottom Section     | Quick Actions       |
|----------------|-----------------------------------|--------------|--------------------|---------------------|
| < 640px (sm)   | Hero + horizontal scroll          | 160px height | Stacked, activity first | Primary CTA only   |
| 640-1023px (md)| 2x2 grid                          | 180px height | Stacked, deals first    | All three visible  |
| >= 1024px (lg) | 5-column row (4 KPIs + AI usage)  | 220px height | Side-by-side 3:2        | All three visible  |

### Mobile KPI Layout (< 640px)

One hero card (Portfolio Value) is always full-width. Supporting KPIs are in a horizontally scrollable row with scroll-snap.

```tsx
{/* Mobile: hero + scroll row */}
<div className="block lg:hidden space-y-3">
  <KPICard
    label="Portfolio Value"
    value={portfolioValue}
    format="currency"
    delta={portfolioDelta}
    sparklineData={sparklines.portfolioValue}
    className="w-full"
  />
  <div className="flex gap-3 overflow-x-auto scroll-smooth snap-x
                  snap-mandatory pb-2 -mx-4 px-4
                  [scrollbar-width:none] [-webkit-overflow-scrolling:touch]">
    <KPICard
      label="Cash Flow"
      value={8420}
      format="currency"
      className="min-w-[160px] snap-start shrink-0"
    />
    <KPICard
      label="Active Deals"
      value={12}
      format="number"
      className="min-w-[160px] snap-start shrink-0"
    />
    <KPICard
      label="Pipeline"
      value={8}
      format="number"
      className="min-w-[160px] snap-start shrink-0"
    />
    <KPICard
      label="AI Analyses"
      value={34}
      format="number"
      subtitle="/50"
      className="min-w-[160px] snap-start shrink-0"
    />
  </div>
</div>

{/* Desktop: 5-column grid (or 4 if AI card merged) */}
<div className="hidden lg:grid grid-cols-4 gap-4">
  {/* all KPIs at equal weight */}
</div>
```

### Mobile Quick Actions

On mobile, collapse to a single full-width primary CTA:

```tsx
{/* Mobile */}
<div className="block sm:hidden">
  <Link
    to="/analyze"
    className="flex items-center justify-center gap-2 w-full px-4 py-3
               rounded-lg bg-indigo-600 text-white text-sm font-medium
               shadow-sm"
  >
    <Plus size={16} />
    New Analysis
  </Link>
</div>

{/* Desktop */}
<div className="hidden sm:flex items-center gap-3">
  {/* all three buttons */}
</div>
```

### Mobile Bottom Section

On mobile (< 1024px), Activity feed appears above Recent Deals (more scannable on small screens):

```tsx
<div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
  {/* Activity first on mobile, second on desktop */}
  <div className="lg:col-span-2 order-first lg:order-last">
    <ActivityFeed groups={activityGroups} />
  </div>
  <div className="lg:col-span-3">
    <RecentDealsTable deals={stats.recent_deals} />
  </div>
</div>
```

### Mobile Chart

- Height reduces to 160px via `useChartHeight(220, 160)` hook
- XAxis `interval` increases to show every 2nd or 3rd label
- Y-axis width shrinks to 48px
- Time range selector wraps below the title instead of beside it

```tsx
{/* Chart header: stacked on mobile, inline on desktop */}
<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
  <h3 className="text-sm font-semibold text-gray-900">Cash Flow Trend</h3>
  <TimeRangeSelector value={timeRange} onChange={setTimeRange} />
</div>
```

---

## 10. Recent Deals Table (Light Theme)

### Visual Adjustments from Dark Theme

| Element          | Dark Theme                    | Light Theme                    |
|------------------|-------------------------------|--------------------------------|
| Card bg          | `bg-app-surface` (#0F0F1A)   | `bg-white`                     |
| Card border      | `border-border-subtle`        | `border-gray-200`              |
| Card shadow      | none                          | `shadow-[0_1px_2px_rgba(0,0,0,0.04)]` |
| Header row bg    | transparent                   | `bg-gray-50`                   |
| Header text      | `text-text-muted` uppercase   | `text-gray-500` uppercase      |
| Row hover        | `hover:bg-app-elevated/50`    | `hover:bg-gray-50`             |
| Row border       | `border-border-subtle`        | `border-gray-100`              |
| Risk score       | green/yellow/red on dark      | `emerald-600`/`amber-600`/`red-600` |
| View link        | `text-accent-primary`         | `text-indigo-600`              |

### Light Strategy Badge Colors

| Strategy         | Background     | Text          | Ring            |
|------------------|----------------|---------------|-----------------|
| Wholesale        | `bg-amber-50`  | `text-amber-800`  | `ring-amber-200`  |
| Creative Finance | `bg-violet-50` | `text-violet-800` | `ring-violet-200` |
| BRRRR            | `bg-blue-50`   | `text-blue-800`   | `ring-blue-200`   |
| Buy & Hold       | `bg-emerald-50`| `text-emerald-800`| `ring-emerald-200`|
| Flip             | `bg-red-50`    | `text-red-800`    | `ring-red-200`    |

Badge implementation:
```tsx
<span className={cn(
  'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
  'ring-1 ring-inset',
  strategyStyles[strategy]  // maps to bg + text + ring classes above
)}>
  {strategyLabel}
</span>
```

---

## 11. Framer Motion: Page Entrance Animations

Preserve the existing stagger pattern but adjust for light theme perception (animations feel slightly faster on light backgrounds due to higher contrast).

```ts
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,  // slightly faster than 0.08 for light
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] },
  },
}
```

Each zone (KPIs, quick actions, chart, bottom section) is a `motion.div` with `variants={itemVariants}` inside a parent `motion.div` with `variants={containerVariants}`.

### Reduced Motion

```tsx
const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

// Pass to Framer Motion
<motion.div
  variants={prefersReduced ? {} : containerVariants}
  initial={prefersReduced ? false : 'hidden'}
  animate="visible"
>
```

Pass `isAnimationActive={!prefersReduced}` to all Recharts chart components.

---

## 12. Color Token Summary (Dashboard-Specific)

All colors used on the dashboard, mapped to their light theme values:

| Token / Usage              | Hex       | Tailwind Class       |
|----------------------------|-----------|----------------------|
| Page background            | `#F8FAFC` | `bg-slate-50`        |
| Card background            | `#FFFFFF` | `bg-white`           |
| Card border                | `#E5E7EB` | `border-gray-200`    |
| Card shadow                | see below | custom shadow        |
| Section heading            | `#111827` | `text-gray-900`      |
| KPI label                  | `#6B7280` | `text-gray-500`      |
| KPI value                  | `#111827` | `text-gray-900`      |
| Delta positive             | `#059669` | `text-emerald-600`   |
| Delta negative             | `#DC2626` | `text-red-600`       |
| Delta context ("vs last")  | `#9CA3AF` | `text-gray-400`      |
| Activity text              | `#374151` | `text-gray-700`      |
| Timestamp                  | `#9CA3AF` | `text-gray-400`      |
| Day group label            | `#9CA3AF` | `text-gray-400`      |
| Chart primary stroke       | `#6366F1` | --                   |
| Chart grid                 | `#F1F5F9` | --                   |
| Primary button bg          | `#4F46E5` | `bg-indigo-600`      |
| Primary button hover       | `#4338CA` | `hover:bg-indigo-700`|
| Link text                  | `#4F46E5` | `text-indigo-600`    |
| Link hover                 | `#4338CA` | `hover:text-indigo-700` |

Card shadow value (used everywhere):
```
shadow-[0_1px_2px_rgba(0,0,0,0.04),0_1px_3px_rgba(0,0,0,0.02)]
```

---

## CRITICAL DECISIONS

### 1. Inter tabular-nums replaces JetBrains Mono for financial numbers

The dark theme uses JetBrains Mono for all `$`, `%`, and count values. On a light professional surface, monospace fonts read as "developer tool" rather than "financial dashboard". Inter with `font-variant-numeric: tabular-nums` provides the same column-alignment benefit with a cleaner, more polished appearance. Apply globally via Tailwind's `tabular-nums` utility class.

**Exception:** Chart axis tick labels and tooltip values retain a monospace feel via the Inter font at smaller sizes -- they do not need JetBrains Mono either.

### 2. Five KPIs, not four

The current dashboard shows four generic count KPIs (Total Deals, Active Pipeline, Closed Deals, Deals Analyzed). The redesign replaces these with five purpose-driven KPIs: Portfolio Value (currency, hero metric), Monthly Cash Flow (currency), Active Deals (count), Pipeline (count), and AI Analyses (fraction with usage limit). Portfolio Value becomes the anchor metric -- the first thing users see, answering "how am I doing?"

### 3. Quick Actions row is a new zone

The current dashboard has no quick actions -- users must navigate via sidebar. Adding a `[+ New Analysis] [Upload Document] [View Pipeline]` row between KPIs and chart reduces the most common workflows from 2 clicks to 1. On mobile, only the primary CTA is visible.

### 4. Activity feed grouped by day

The current flat list of activity items lacks temporal context. Grouping by "Today" / "Yesterday" / date headers is a client-side transform of the existing `activityData.activities` array -- no backend change needed. This adds significant scannability.

### 5. Onboarding checklist replaces flat empty state

The current empty state shows a single CTA and three hint cards. The redesign replaces this with a progress-tracked checklist (4 steps, 1 pre-completed) with a visual progress bar. Completion is tracked via `localStorage`. This creates a sense of progression and gives new users a clear action sequence.

### 6. Time range filtering requires a backend contract change

The segmented control (1M / 3M / 6M / 1Y) filters both KPI deltas and the cash flow chart. This requires the backend `GET /api/dashboard/stats` endpoint to accept a `range` query parameter and return `portfolio_value`, `portfolio_value_delta`, `monthly_cash_flow`, `cash_flow_delta`, and `cash_flow_series` fields. Default range: `6M`. **This is a backend change that needs coordination.**

### 7. Sparkline fill opacity drops from 0.2 to 0.08

On the dark theme (#0F0F1A background), a 20% opacity indigo fill is subtle. On white, the same fill produces an overpowering wash. Testing confirms 0.08 is the right value -- visible enough to convey trend direction, light enough to feel ambient.

### 8. Card elevation uses shadow, not border contrast alone

The dark theme relies on border color contrast (`#1A1A2E` on `#0F0F1A`) to distinguish cards from background. On light theme, this is insufficient -- white cards on `#F8FAFC` need a subtle `box-shadow` to lift them. The value `0 1px 2px rgba(0,0,0,0.04), 0 1px 3px rgba(0,0,0,0.02)` matches Mercury/Stripe's approach: barely perceptible but structurally effective.

### 9. Bottom section uses 3:2 grid ratio

Recent Deals table and Activity feed sit side-by-side on desktop in a `grid-cols-5` layout (3 columns for deals, 2 for activity). This gives the table enough room for its columns while keeping the activity feed compact. On mobile, they stack with Activity above Deals (activity is more scannable on small screens and loads faster).

### 10. Trial banner is session-dismissible, not permanent

Users can dismiss the trial banner, but it returns next session. This balances urgency (they need to know) with respect (not nagging within a single work session). Exception: expired trial banners cannot be dismissed -- they persist until the user upgrades.
