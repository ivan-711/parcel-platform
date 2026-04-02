# Dashboard Redesign Research: Light Theme for Parcel

## 1. Current State Audit

Parcel's existing dashboard (`Dashboard.tsx`, 432 lines) has three states: empty (new user), loading (skeleton cards), and populated. The populated view stacks four sections vertically:

1. **KPI row** — 4-column grid of `KPICard` components (Total Deals, Active Pipeline, Closed Deals, Deals Analyzed), each with count-up animation and a sparkline via Recharts `AreaChart`.
2. **Recent Deals table** — address, strategy badge, risk score (mono), status pill, view link.
3. **Pipeline Summary** — 2x3 grid of stage counts inside a bordered card.
4. **Recent Activity** — icon + text + timestamp rows with staggered Framer Motion entry.

All colors reference the dark token set: `bg-app-surface` (#0F0F1A), `border-border-subtle` (#1A1A2E), `text-text-primary` (#F1F5F9). The light theme transition requires a full token remap but the component structure is sound and can be preserved.

### What works
- KPI row with sparklines is effective at a glance.
- Count-up animation adds perceived performance.
- Staggered Framer Motion entrance prevents a "wall of content" feeling.
- Skeleton loading cards instead of spinners.

### What needs improvement
- Four KPI cards all show plain counts — no currency or percentage values for portfolio value or cash flow.
- No quick action buttons — user must navigate via sidebar to start a new analysis.
- No time-range selector — metrics are all-time only.
- Pipeline summary is flat counts with no visual weight distribution.
- Empty state is functional but plain — no onboarding checklist or progress indicator.
- Activity feed has no grouping or day separators.

---

## 2. Reference Dashboard Analysis

### Mercury Dashboard
Mercury's dashboard is optimized for a single question: "How much money do I have and where is it going?"

**Layout (top to bottom):**
```
┌─────────────────────────────────────────────────────┐
│  [Account selector]            [Send $] [+ Transfer]│
├─────────────────────────────────────────────────────┤
│  $1,247,832.41            ← single hero number      │
│  Total balance                                       │
│  ┌─────────────────────────────────────────────┐    │
│  │  30-day cash flow chart (area, minimal axes) │    │
│  └─────────────────────────────────────────────┘    │
├─────────────────────────────────────────────────────┤
│  Recent transactions                  [View all →]  │
│  ─────────────────────────────────────────────────  │
│  Mar 28  Stripe payout      +$12,340.00    green    │
│  Mar 27  AWS                -$3,204.11     default  │
│  Mar 27  Gusto payroll      -$24,500.00    default  │
└─────────────────────────────────────────────────────┘
```

**Key observations:**
- One hero metric dominates — everything else is secondary.
- The cash flow chart is full-width, not a small sparkline. Time range tabs sit above it (1W, 1M, 3M, 6M, 1Y, ALL).
- Transactions are a clean table, not cards. Each row: date, description, amount (right-aligned, mono font), with green for inflows.
- The page background is `#F7F7F8`, cards are `#FFFFFF` with `box-shadow: 0 1px 3px rgba(0,0,0,0.04)`.
- Quick actions ("Send money", "Transfer") are in the top-right header, not inline with content.
- No KPI cards — Mercury bets everything on the single balance + chart.

### Stripe Dashboard
Stripe optimizes for operational awareness: "What happened today and what needs attention?"

**Layout (top to bottom):**
```
┌──────────────────────────────────────────────────────┐
│  Today                        [Apr 1] [Live ●]       │
├────────────────────┬─────────────────────────────────┤
│  Gross volume      │  Yesterday $14,230 ↗            │
│  $42,389.12        │  Net volume  $38,201.00         │
│  ↑ 12.3%           │  New customers  23              │
├────────────────────┴─────────────────────────────────┤
│  ┌─────────────────────────────────────────────┐     │
│  │  Gross volume chart (bar + line, 24h/7d/4w) │     │
│  └─────────────────────────────────────────────┘     │
├──────────────────────────────────────────────────────┤
│  Recent activity                      [View all →]   │
│  ──────────────────────────────────────────────────  │
│  $129.00  succeeded   •  cus_abc  •  3 min ago       │
│  $450.00  succeeded   •  cus_def  •  7 min ago       │
│  $89.00   refunded    •  cus_ghi  •  12 min ago      │
└──────────────────────────────────────────────────────┘
```

**Key observations:**
- Primary metric (Gross Volume) is large and left-aligned, with secondary metrics in a right column — an asymmetric two-column layout.
- Percentage change is shown inline with the primary metric, colored green/red.
- The chart is prominent (roughly 200px tall) and has time range tabs.
- Activity rows are compact: amount, status pill, customer, relative time. All on one line.
- Stripe uses `#F6F8FA` page bg, `#FFFFFF` cards, `1px solid #E3E8EE` borders.
- Status uses color-coded dots/pills: green (succeeded), yellow (pending), red (failed).

### Synthesis: Patterns for Parcel

| Pattern | Mercury | Stripe | Recommendation for Parcel |
|---------|---------|--------|---------------------------|
| Hero metric | Single balance | Gross volume + delta | Single hero (portfolio value) + 3 supporting KPIs |
| Chart | Full-width area | Full-width bar/line | Full-width area chart for monthly cash flow |
| Time range | Tabs above chart | Tabs above chart | Segmented control: 1M, 3M, 6M, 1Y |
| Activity | Transaction table | Event feed | Hybrid: grouped by day, icon + text + timestamp |
| Quick actions | Header buttons | None (sidebar) | Floating action row below KPIs |
| Empty state | N/A (always has data) | Getting started checklist | Onboarding checklist with progress |

---

## 3. Proposed Light Theme Dashboard Layout

### Wireframe: Populated State

```
┌─ AppShell ──────────────────────────────────────────────────────┐
│ Sidebar │  Dashboard                    [1M] [3M] [6M] [1Y]    │
│         │                                                       │
│         │  ┌──────────────┐ ┌──────────┐ ┌──────────┐ ┌──────┐ │
│         │  │ PORTFOLIO    │ │ MONTHLY  │ │ ACTIVE   │ │ AI   │ │
│         │  │ VALUE        │ │ CASH FLOW│ │ DEALS    │ │ USED │ │
│         │  │ $1,247,832   │ │ $8,420   │ │ 12       │ │ 34   │ │
│         │  │ ▲ 4.2%       │ │ ▲ $620   │ │          │ │ /50  │ │
│         │  │ ┈┈╱╲┈╱╲╱╲╱  │ │ ┈╱╲╱╲╱╲ │ │ ┈╱╲╱╲╱  │ │      │ │
│         │  └──────────────┘ └──────────┘ └──────────┘ └──────┘ │
│         │                                                       │
│         │  ┌─ Quick Actions ──────────────────────────────────┐ │
│         │  │ [+ New Analysis]  [Upload Document]  [Pipeline →]│ │
│         │  └──────────────────────────────────────────────────┘ │
│         │                                                       │
│         │  ┌─ Cash Flow Trend ────────────────────────────────┐ │
│         │  │                                                   │ │
│         │  │   $10k ┤                          ╱╲              │ │
│         │  │    $8k ┤              ╱╲─╱╲──╱╲──╱  ╲             │ │
│         │  │    $6k ┤    ╱╲──╱╲──╱                             │ │
│         │  │    $4k ┤╱╲─╱                                      │ │
│         │  │        └──┬──┬──┬──┬──┬──┬──┬──┬──┬──┬──┬──┤     │ │
│         │  │          Apr May Jun Jul Aug Sep Oct Nov Dec       │ │
│         │  └──────────────────────────────────────────────────┘ │
│         │                                                       │
│         │  ┌─ Recent Deals ──────────────┐ ┌─ Activity ──────┐ │
│         │  │ Address  Strategy Risk  View│ │ Today            │ │
│         │  │ ──────── ──────── ──── ─────│ │ Analyzed 123 Elm │ │
│         │  │ 123 Elm  BRRRR    24   →   │ │ Moved to Offer   │ │
│         │  │ 456 Oak  Flip     62   →   │ │ Yesterday        │ │
│         │  │ 789 Pine Hold     18   →   │ │ Uploaded lease    │ │
│         │  │              [View all →]   │ │ Closed 789 Pine  │ │
│         │  └─────────────────────────────┘ └─────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### Wireframe: Empty State (New User)

```
┌─ AppShell ──────────────────────────────────────────────────────┐
│ Sidebar │  Welcome to Parcel                                    │
│         │  Complete these steps to get started.                  │
│         │                                                       │
│         │  ┌─ Getting Started ─────────────────────── 1/4 ────┐ │
│         │  │                                                   │ │
│         │  │  [✓] Create your account              completed   │ │
│         │  │  [ ] Analyze your first deal           [Start →]  │ │
│         │  │  [ ] Add a deal to your pipeline       [Go →]     │ │
│         │  │  [ ] Upload your first document        [Upload →] │ │
│         │  │                                                   │ │
│         │  │  ████░░░░░░░░░░░░░░░░  25%                       │ │
│         │  └──────────────────────────────────────────────────┘ │
│         │                                                       │
│         │  ┌─ Sample Analysis ────────────────────────────────┐ │
│         │  │  See what Parcel can do — explore a sample BRRRR │ │
│         │  │  analysis on a real property.     [View Sample →] │ │
│         │  └──────────────────────────────────────────────────┘ │
│         │                                                       │
│         │  ┌──────────┐  ┌──────────┐  ┌──────────┐           │ │
│         │  │ Pipeline │  │ Documents│  │ AI Chat  │           │ │
│         │  │ Track    │  │ Upload   │  │ Ask any  │           │ │
│         │  │ deals    │  │ leases   │  │ question │           │ │
│         │  └──────────┘  └──────────┘  └──────────┘           │ │
└─────────────────────────────────────────────────────────────────┘
```

### Wireframe: Mobile (< 768px)

```
┌──────────────────────────┐
│ ☰ Dashboard              │
├──────────────────────────┤
│ Portfolio Value           │
│ $1,247,832    ▲ 4.2%     │
│ ┈┈╱╲┈╱╲╱╲╱╲╱╲╱          │
├──────────────────────────┤
│ ← [Cash Flow] [Deals] [AI] →  ← swipeable │
│   $8,420      12       34      │
├──────────────────────────┤
│ [+ New Analysis]  full-width   │
├──────────────────────────┤
│ Cash Flow Chart (compact)      │
│ ╱╲─╱╲──╱╲──╱╲──╱╲─            │
├──────────────────────────┤
│ Recent Activity                │
│ ○ Analyzed 123 Elm   3m ago    │
│ ○ Pipeline move      1h ago    │
│ ○ Doc uploaded       2h ago    │
│           [View all →]         │
└──────────────────────────┘
```

---

## 4. Light Theme Color Tokens

Based on the design system research (agent-01), here are the dashboard-specific mappings:

```
Dark Token            Dark Value     Light Value        Usage
──────────────────    ──────────     ──────────         ─────
app-bg                #08080F        #F8F9FB            Page background
app-surface           #0F0F1A        #FFFFFF            Card backgrounds
app-elevated          #16162A        #F1F3F6            Hover states, secondary bg
app-overlay           #1C1C30        #E8ECF1            Modal overlays
border-subtle         #1A1A2E        #E5E7EB            Card borders, dividers
border-default        #252540        #D1D5DB            Input borders
text-primary          #F1F5F9        #111827            Headings, primary text
text-secondary        #94A3B8        #6B7280            Labels, descriptions
text-muted            #475569        #9CA3AF            Timestamps, placeholders
accent-primary        #6366F1        #6366F1            Kept — indigo works in both
accent-success        #10B981        #059669            Slightly deeper green on white
accent-danger         #EF4444        #DC2626            Slightly deeper red on white
```

Card shadow for light theme (replaces border-only dark approach):
```css
.card-light {
  background: #FFFFFF;
  border: 1px solid #E5E7EB;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04), 0 1px 3px rgba(0, 0, 0, 0.02);
  border-radius: 12px;
}
```

---

## 5. Component Specifications

### 5.1 KPICard (Light Theme Revision)

The current `KPICard` works well structurally. Changes needed:

**Visual changes:**
- White background with subtle border + shadow (not bg contrast alone).
- Sparkline stroke changes from `#6366F1` to `#6366F1` (unchanged — indigo reads well on white).
- Sparkline fill gradient shifts: `stopOpacity` from 0.2 to 0.12 (lighter fill on white bg).
- Delta text: green uses `#059669` (darker on white for WCAG AA), red uses `#DC2626`.
- Label text: `#6B7280` (not all-caps tracking — sentence case with medium weight reads cleaner on light).

**New props to consider:**
- `trend: 'up' | 'down' | 'flat'` — separate from numeric delta to handle display logic.
- `subtitle?: string` — for context like "vs. last month" or "/50 limit".

**Tailwind implementation (light):**
```tsx
<div className="rounded-xl border border-gray-200 bg-white p-5 space-y-1
                shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
  <p className="text-xs font-medium text-gray-500 tracking-wide">
    {label}
  </p>
  <p className="text-3xl font-semibold font-mono text-gray-900">
    {formatValue(animated, format)}
  </p>
  {delta !== undefined && (
    <p className={cn(
      'text-xs font-mono font-medium',
      delta >= 0 ? 'text-emerald-600' : 'text-red-600'
    )}>
      {delta >= 0 ? '↑' : '↓'} {Math.abs(delta).toFixed(1)}%
      <span className="text-gray-400 font-sans ml-1">vs last month</span>
    </p>
  )}
  {/* sparkline unchanged structurally */}
</div>
```

### 5.2 Quick Actions Row

New component not in current dashboard. Positioned between KPI row and chart.

```tsx
// QuickActions.tsx
function QuickActions() {
  return (
    <div className="flex items-center gap-3">
      <Link
        to="/analyze"
        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg
                   bg-indigo-600 text-white text-sm font-medium
                   hover:bg-indigo-700 transition-colors shadow-sm"
      >
        <Plus size={16} />
        New Analysis
      </Link>
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

**Mobile:** Stack full-width, primary action only visible, secondary actions in an overflow menu or hidden behind "More actions".

### 5.3 Cash Flow Trend Chart

Full-width area chart replacing the current absence of a dashboard-level chart. Uses the existing `CashFlowProjection.tsx` Recharts pattern.

**Specifications:**
- Height: 220px desktop, 160px mobile.
- Axes: Y-axis shows dollar values (abbreviated: $4k, $8k), X-axis shows month abbreviations.
- Fill: Indigo gradient, 10% opacity at top fading to 0%.
- Stroke: `#6366F1`, 2px, `monotone` curve type.
- Grid: Horizontal dotted lines only, `#F3F4F6` stroke.
- Tooltip: White card with shadow, showing exact value + date.
- Time range: Segmented control above chart (1M, 3M, 6M, 1Y), defaults to 6M.

**Tailwind container:**
```tsx
<div className="rounded-xl border border-gray-200 bg-white p-6
                shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
  <div className="flex items-center justify-between mb-4">
    <h3 className="text-sm font-semibold text-gray-900">Cash Flow Trend</h3>
    <div className="flex rounded-lg border border-gray-200 overflow-hidden">
      {['1M', '3M', '6M', '1Y'].map((range) => (
        <button
          key={range}
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
  </div>
  <ResponsiveContainer width="100%" height={220}>
    {/* AreaChart here */}
  </ResponsiveContainer>
</div>
```

### 5.4 Activity Feed (Redesigned)

Current: flat list of rows with icon, text, and timestamp.
Proposed: grouped by day with section headers and richer formatting.

**Structure:**
```
Today
  ○ Analyzed "123 Elm St" — BRRRR, 14.2% CoC              3 min ago
  ○ Moved "456 Oak Ave" to Offer Sent                      1 hour ago

Yesterday
  ○ Uploaded lease for "789 Pine Rd"                        Mar 29
  ○ Closed deal "789 Pine Rd" — $45,000 profit              Mar 29
```

**Component spec:**
```tsx
interface ActivityGroup {
  label: string           // "Today", "Yesterday", "Mar 27"
  items: ActivityItem[]
}

function ActivityFeed({ groups }: { groups: ActivityGroup[] }) {
  return (
    <div className="space-y-5">
      {groups.map((group) => (
        <div key={group.label}>
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
            {group.label}
          </p>
          <div className="space-y-1">
            {group.items.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-3 rounded-lg px-3 py-2.5
                           hover:bg-gray-50 transition-colors"
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: `${iconColor}08` }}
                >
                  <Icon size={16} style={{ color: iconColor }} />
                </div>
                <p className="text-sm text-gray-700 flex-1 truncate">
                  {item.text}
                </p>
                <span className="text-xs text-gray-400 font-mono shrink-0">
                  {timeAgo(item.timestamp)}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
```

### 5.5 Recent Deals Table (Light Adjustments)

Current table structure is fine. Light theme changes:
- Header row: `bg-gray-50` with `text-gray-500` uppercase labels.
- Row hover: `hover:bg-gray-50` instead of `hover:bg-app-elevated/50`.
- Strategy badges: need light-friendly bg/text pairs (current dark pairs like `bg-[#451A03]` will not work).
- Risk score mono font stays. Color scale adjusts: `text-emerald-600` / `text-amber-600` / `text-red-600`.

**Light strategy badge colors:**
```
Strategy      Dark bg     Light bg       Light text
Wholesale     #451A03     #FEF3C7        #92400E
Creative      #2E1065     #EDE9FE        #5B21B6
BRRRR         #0C1A4A     #DBEAFE        #1E40AF
Buy & Hold    #064E3B     #D1FAE5        #065F46
Flip          #431407     #FEE2E2        #991B1B
```

### 5.6 Empty State: Onboarding Checklist

Replace the current single CTA + hint cards with a progress-tracked checklist.

**Data model:**
```tsx
interface OnboardingStep {
  id: string
  label: string
  description: string
  completed: boolean
  href: string
  ctaLabel: string
}

const ONBOARDING_STEPS: OnboardingStep[] = [
  { id: 'account', label: 'Create your account', description: 'Done!',
    completed: true, href: '#', ctaLabel: 'Completed' },
  { id: 'analyze', label: 'Analyze your first deal',
    description: 'Run numbers on a wholesale, BRRRR, flip, or buy & hold deal.',
    completed: false, href: '/analyze', ctaLabel: 'Start Analysis' },
  { id: 'pipeline', label: 'Add a deal to your pipeline',
    description: 'Track a deal from lead to close.',
    completed: false, href: '/pipeline', ctaLabel: 'Open Pipeline' },
  { id: 'document', label: 'Upload your first document',
    description: 'Attach a contract, lease, or inspection report.',
    completed: false, href: '/documents', ctaLabel: 'Upload' },
]
```

**Progress bar:**
```tsx
<div className="w-full bg-gray-100 rounded-full h-2">
  <div
    className="bg-indigo-600 h-2 rounded-full transition-all duration-500"
    style={{ width: `${(completed / total) * 100}%` }}
  />
</div>
<p className="text-xs text-gray-500 mt-1">
  {completed} of {total} completed
</p>
```

---

## 6. Responsive Behavior

### Breakpoint Strategy

| Breakpoint | Layout | KPI Cards | Chart | Content |
|------------|--------|-----------|-------|---------|
| < 640px (sm) | Single column | 1 hero + swipeable row | 160px height | Stacked sections |
| 640-1023px (md) | Single column | 2x2 grid | 180px height | Stacked sections |
| >= 1024px (lg) | Full layout | 4-column row | 220px height | Table + Activity side-by-side |

### Mobile KPI Strategy

On mobile, showing all 4 KPIs equally wastes space. Instead:

1. **Hero KPI** (portfolio value) is always visible, full-width, with sparkline.
2. **Supporting KPIs** are in a horizontally scrollable row beneath, using `overflow-x-auto` with `scroll-snap-x`.

```tsx
{/* Mobile: hero + scroll row */}
<div className="block lg:hidden space-y-3">
  <KPICard label="Portfolio Value" value={portfolioValue}
           format="currency" delta={4.2} className="w-full" />
  <div className="flex gap-3 overflow-x-auto scroll-smooth snap-x
                  snap-mandatory pb-2 -mx-4 px-4">
    <KPICard label="Cash Flow" value={8420} format="currency"
             className="min-w-[180px] snap-start shrink-0" />
    <KPICard label="Active Deals" value={12} format="number"
             className="min-w-[180px] snap-start shrink-0" />
    <KPICard label="AI Analyses" value={34} format="number"
             subtitle="/50"
             className="min-w-[180px] snap-start shrink-0" />
  </div>
</div>

{/* Desktop: 4-column grid */}
<div className="hidden lg:grid grid-cols-4 gap-4">
  {/* all 4 KPIs at equal weight */}
</div>
```

### Bottom Section: Two-Column on Desktop

On desktop (lg+), Recent Deals and Activity sit side-by-side in a 3:2 ratio:

```tsx
<div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
  <div className="lg:col-span-3">
    {/* Recent Deals table */}
  </div>
  <div className="lg:col-span-2">
    {/* Activity feed */}
  </div>
</div>
```

On mobile, they stack with Activity above Deals (activity is more scannable on small screens).

---

## 7. Time Range Filtering

### Approach

Add a `timeRange` state to Dashboard that controls both KPI values and the chart.

```tsx
type TimeRange = '1M' | '3M' | '6M' | '1Y'

const [timeRange, setTimeRange] = useState<TimeRange>('6M')

const { data: stats } = useQuery({
  queryKey: ['dashboard-stats', timeRange],
  queryFn: () => api.dashboard.stats({ range: timeRange }),
  staleTime: 30_000,
})
```

**Backend contract** (new query param):
```
GET /api/dashboard/stats?range=6M

Response adds:
{
  portfolio_value: number,
  portfolio_value_delta: number,     // % change vs previous period
  monthly_cash_flow: number,
  cash_flow_delta: number,
  cash_flow_series: { month: string, value: number }[],
  ...existing fields
}
```

**Segmented control component** (placed in page header area, right-aligned):
```tsx
function TimeRangeSelector({ value, onChange }: {
  value: TimeRange
  onChange: (range: TimeRange) => void
}) {
  const options: TimeRange[] = ['1M', '3M', '6M', '1Y']
  return (
    <div className="inline-flex rounded-lg border border-gray-200 bg-white overflow-hidden">
      {options.map((opt) => (
        <button
          key={opt}
          onClick={() => onChange(opt)}
          className={cn(
            'px-3 py-1.5 text-xs font-medium transition-colors',
            value === opt
              ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
              : 'text-gray-500 hover:bg-gray-50'
          )}
        >
          {opt}
        </button>
      ))}
    </div>
  )
}
```

---

## 8. Dashboard for Active Users: Usage Awareness

For users approaching plan limits, the AI Analyses KPI card should show usage context:

```tsx
<KPICard
  label="AI Analyses"
  value={34}
  format="number"
  subtitle="/50 this month"
/>
```

When usage exceeds 80% of the limit, the card gets a warning treatment:

```tsx
// When usage >= 80%
<div className="rounded-xl border border-amber-200 bg-amber-50/50 p-5 space-y-1">
  <p className="text-xs font-medium text-amber-700 tracking-wide">AI Analyses</p>
  <p className="text-3xl font-semibold font-mono text-gray-900">42<span className="text-lg text-gray-400">/50</span></p>
  <p className="text-xs text-amber-600">
    8 remaining — <Link to="/settings" className="underline">Upgrade</Link>
  </p>
</div>
```

This follows Stripe's pattern of surfacing operational warnings inline rather than in separate alert banners.

---

## 9. Skeleton Loading (Light Theme)

Current skeleton uses `bg-app-elevated animate-pulse` — dark shimmer on dark surface.

Light theme skeleton:
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
        />
      ))}
    </div>
  )
}
```

The shimmer animation can be upgraded to a gradient sweep for a more polished feel:
```css
.skeleton-shimmer-light {
  background: linear-gradient(
    90deg,
    #F3F4F6 0%,
    #E5E7EB 50%,
    #F3F4F6 100%
  );
  background-size: 200% 100%;
  animation: skeleton-shimmer 1.5s ease-in-out infinite;
}
```

---

## 10. Sparkline Adjustments for Light Background

Current sparkline uses `#6366F1` stroke with 0.2 fill opacity. On white, this needs tuning:

- **Stroke:** Keep `#6366F1` at 1.5px — sufficient contrast on white.
- **Fill opacity:** Reduce from 0.2 to 0.08 — on white, even low opacity indigo is visible.
- **Negative trend:** Red stroke `#DC2626` with 0.06 fill opacity.
- **Grid/axis:** None — sparklines should remain decoration, not readable charts.

```tsx
const strokeColor = isPositive ? '#6366F1' : '#DC2626'
const fillOpacity = 0.08  // reduced from 0.2 for light bg

<linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
  <stop offset="0%" stopColor={strokeColor} stopOpacity={fillOpacity} />
  <stop offset="100%" stopColor={strokeColor} stopOpacity={0} />
</linearGradient>
```

---

## RECOMMENDATIONS FOR PARCEL

1. **Promote Portfolio Value to hero metric.** The current dashboard treats all four KPIs equally. Follow Mercury's pattern: make portfolio value the dominant number (larger font, potentially full-width on mobile), with cash flow, active deals, and AI usage as supporting cards. This gives users an instant answer to "how am I doing?"

2. **Add a full-width Cash Flow Trend chart.** Both Mercury and Stripe place a prominent chart as the second visual element. Parcel already has `CashFlowProjection.tsx` using Recharts AreaChart — adapt it for the dashboard with time range controls. This adds visual weight and makes the dashboard feel like a command center rather than a report card.

3. **Add Quick Actions row between KPIs and chart.** "New Analysis" (primary, indigo), "Upload Document" (secondary, outlined), "View Pipeline" (secondary, outlined). On mobile, collapse to a single primary CTA with a "More" overflow. This reduces the navigation steps for the three most common actions from 2 clicks (sidebar) to 1.

4. **Group activity feed by day.** Add "Today" / "Yesterday" / date headers to the activity list. This is a small change (client-side grouping of the existing `activityData.activities` array by timestamp) with high readability impact. On desktop, place the activity feed in a right column beside the deals table.

5. **Replace empty state with onboarding checklist.** The current "Analyze Your First Deal" CTA with three hint cards is functional but does not create a sense of progression. An onboarding checklist with a progress bar (1/4 complete by default since account creation is done) gives new users a clear path and a reason to return. Track completion via a `user_onboarding` JSONB column or local storage.

6. **Use the token-swap approach for light theme.** Do not create separate light-theme component variants. Instead, remap the existing token names (`app-bg`, `app-surface`, `border-subtle`, `text-primary`, etc.) to light values via CSS custom properties toggled by a `.light` or `data-theme="light"` class on `<html>`. This means every existing component automatically inherits the light theme. The specific light values from Section 4 are confirmed to pass WCAG AA contrast ratios.

7. **Reduce sparkline fill opacity to 0.08 on light backgrounds.** The current 0.2 opacity produces too heavy a wash on white. Test at 0.08 and adjust by 0.02 increments. The stroke width (1.5px) and color (#6366F1) can remain unchanged.

8. **Add time range filtering.** A segmented control (1M / 3M / 6M / 1Y) in the dashboard header filters both KPI deltas and the cash flow chart. This requires a backend change to accept a `range` query parameter on `GET /api/dashboard/stats`. Default to 6M — long enough to show trends, short enough to feel current.

9. **Surface usage limits inline.** When AI analysis usage exceeds 80% of the monthly limit, change the AI Analyses KPI card border to amber and add a "X remaining — Upgrade" link. This is less disruptive than a banner and more visible than a settings page counter.

10. **Mobile: hero KPI + horizontal scroll for supporting metrics.** Do not compress all 4 KPIs into a 2x2 grid on small screens — the numbers become too small to read at a glance. One full-width hero card plus a horizontally scrollable row of smaller cards (with `scroll-snap-x`) preserves readability and feels native on touch devices.
