# Creative Finance Frontend — Sprint 3 Design Spec

## Overview

Build the complete frontend for Parcel's creative finance module. This unlocks the Obligations nav item, adds a Financing Dashboard page, instruments on property detail, and all supporting UI (modals, hooks, types, API client).

Backend is complete (Sprint 1-2): 13 endpoints across instruments, obligations, payments, and dashboard. This sprint is frontend-only.

## Design System

Same as all prior sprints — no new tokens:
- Background: `#0C0B0A`, Card: `#141311`, Border: `#1E1D1B`
- Text: `#F0EDE8` / `#C5C0B8` / `#8A8580`
- Violet: `#8B7AFF`, Success: `#4ADE80`, Warning: `#FBBF24`, Danger: `#F87171`
- Font: Satoshi, Corners: 8-12px cards / 6-8px buttons

## Architecture Decisions

- **Financing Dashboard**: Standalone `/financing` route with nav item in ASSETS section (between Portfolio and Obligations)
- **Modals**: Shadcn Dialog for Record Payment (simple), custom modal for Add Instrument (multi-step wizard)
- **Animations**: Use existing `motion.ts` presets — `duration.normal`, `ease.luxury`, `spring.snappy`
- **State**: React Query for server state, local state for modal/form steps
- **Routing**: Lazy-loaded pages, `ProtectedRoute` + `PageErrorBoundary` wrapper

## Component Map

```
pages/
  financing/
    ObligationsPage.tsx          — /obligations
    FinancingDashboardPage.tsx   — /financing

pages/properties/
    PropertyDetailPage.tsx       — add "Financing" tab

components/financing/
    AddInstrumentModal.tsx       — multi-step wizard
    RecordPaymentModal.tsx       — payment recording
    ObligationCard.tsx           — severity-coded obligation card
    InstrumentCard.tsx           — instrument summary card
    WrapVisualization.tsx        — wrap flow diagram (styled divs)
    BalloonTimeline.tsx          — horizontal balloon timeline
    DueOnSaleRiskList.tsx        — risk monitor list
    WrapSpreadTable.tsx          — wrap spread summary
    PaymentCalendar.tsx          — monthly payment calendar

hooks/
    useFinancing.ts              — React Query hooks for all financing API

types/financing.ts               — all financing types
lib/api.ts                       — add financing namespace
```

---

## 1. Unlock Obligations in Sidebar

**Modify**: `frontend/src/components/layout/nav-data.ts`

Remove `locked: true` from the Obligations nav item. Add new "Financing" nav item in ASSETS section:

```
ASSETS section:
  - Portfolio       /portfolio
  - Financing       /financing      (NEW — Landmark icon)
  - Obligations     /obligations    (UNLOCKED)
  - Rehabs          /rehabs         (locked)
  - Transactions    /transactions
```

---

## 2. Obligations Page

**Create**: `frontend/src/pages/financing/ObligationsPage.tsx`
**Route**: `/obligations`

Carlos's command center for every financial obligation across all deals.

### Header
- Title: "Obligations", Satoshi weight 300
- Summary KPI row: "X Active" | "X Due This Week" | "X Overdue" — small stat cards
- Time filter pills: "Next 7 Days" | "Next 30 Days" | "Next 90 Days" | "All"

### Obligation Groups (vertical sections by severity)

**OVERDUE** (red `#F87171` header bar):
- Only renders if overdue obligations exist
- Cards: red 3px left border, AlertTriangle icon
- Shows: title, instrument name, property address, amount, days overdue, "Mark Complete" button

**CRITICAL** (orange `#FBBF24` header bar):
- Balloon payments, option expirations within time filter
- Cards: orange left border, larger with countdown: "44 DAYS" in large text
- Amount, due date, days until due

**HIGH** (yellow header):
- Insurance renewals, rate adjustments
- Standard card layout

**NORMAL** (default muted header):
- Monthly payments, routine obligations
- Compact cards

### Obligation Card Anatomy
- Left: 3px severity color bar
- Icon by type: DollarSign (payment), AlertTriangle (balloon), Shield (insurance), Calendar (option), TrendingUp (rate adjustment)
- Title (bold) + instrument name + property address (text-muted)
- Amount (right-aligned, large)
- Due date + relative time ("in X days" or "X days overdue"), color-coded
- Actions: Complete (green check), Snooze (clock), three-dot menu (View Instrument, View Property, Edit)

### Complete Flow
- Click "Complete" → inline form expands within card:
  - Payment amount (pre-filled)
  - Payment date (default today)
  - Payment method dropdown (Bank Transfer, Check, Cash, Auto-Pay)
  - "Record Payment" button (green)
- Submit: `POST /api/financing/obligations/:id/complete`
- Card animates out (Framer Motion `exit`), counters update via query invalidation

### Snooze Flow
- Click clock → date picker appears
- Select date → `PATCH /api/financing/obligations/:id` with `status="snoozed"`, `next_due=selected`
- Card repositions based on new due date

### Empty State
- Green checkmark icon
- "All clear — no upcoming obligations"
- "Add financing instruments to your properties to start tracking obligations"

### Data Source
- Primary: `GET /api/financing/obligations` with filters (status, severity, due_before, due_after)
- KPI stats: derived from response totals + filtered counts
- Time filter maps to `due_before` parameter

---

## 3. Financing Dashboard Page

**Create**: `frontend/src/pages/financing/FinancingDashboardPage.tsx`
**Route**: `/financing`

Financial overview of all creative finance positions.

### Top KPI Row (4 cards)
- **Total Active Instruments**: count + Landmark icon
- **Total Debt Balance**: sum formatted as currency
- **Monthly Net Cash Flow**: incoming - outgoing, green if positive, red if negative
- **Upcoming Balloons**: count within 12 months, red badge if any within 90 days

### Wrap Spread Section
- "Active Wrap Spreads" heading
- Table/card list per active wrap:
  - Property address
  - Wrap rate vs underlying rate (e.g., "7.5% / 4.5%")
  - Monthly incoming, monthly outgoing, monthly spread (green)
  - Annual spread
- Total row at bottom: sum of all monthly spreads

### Due-on-Sale Risk Monitor
- "Due-on-Sale Risk" heading
- List of sub-to instruments:
  - Property address + instrument name
  - Risk badge: HIGH (red), MEDIUM (yellow), LOW (green)
  - Last payment date
  - Tips: "Conventional loans have highest enforcement risk"

### Upcoming Balloons Timeline
- Horizontal bar/timeline showing balloon dates
- Each balloon: property address, amount, date, days until
- Color: green (>180 days), yellow (90-180), red (<90)

### Monthly Payment Calendar
- Simple calendar grid for current month
- Each date cell: payment count + total amount
- Click date → list of specific obligations due that day

### Data Source
- `GET /api/financing/dashboard` — returns all KPIs, wrap spreads, risks, balloons
- Calendar: derived from `GET /api/financing/obligations` filtered to current month

---

## 4. Property Detail: Financing Tab

**Modify**: `frontend/src/pages/properties/PropertyDetailPage.tsx`

Add "Financing" tab to TABS array (between Financials and Documents):
```typescript
{ key: 'financing', label: 'Financing', icon: Landmark }
```

### Tab Content

**Instruments List**: All instruments for this property as cards:
- Name + type badge (color-coded: Sub-To=orange, Seller Finance=violet, Wrap=blue, Lease Option=teal, Conventional=gray)
- Position: "1st Position" / "2nd Position"
- Status badge: Active (green), Paid Off (gray), Defaulted (red)
- Key terms: balance, rate, monthly payment, maturity date
- If balloon: "BALLOON: $X in Y days" — prominent, urgency-colored
- If wrap: "Spread: $312/mo" inline
- Expandable: full details + amortization (next 12 months) + payment history (last 10) + active obligations

**"Add Instrument" button**: Opens AddInstrumentModal with property_id pre-set

**Wrap Visualization** (if property has wrap + underlying):
- Styled div diagram showing flow:
  - Buyer pays → $X/mo → You → $Y/mo → Lender
  - Spread: $Z/mo highlighted green
- Simple CSS, no chart library

### Data Source
- `GET /api/financing/instruments?property_id={id}` for instruments list
- Instrument detail data from list response (includes computed fields)
- Amortization from instrument detail endpoint

---

## 5. Add Instrument Modal

**Create**: `frontend/src/components/financing/AddInstrumentModal.tsx`

Custom multi-step modal (not Shadcn Dialog — too complex for single dialog).

### Step 1: Select Type
Card grid (3 columns desktop, 1 mobile):
- Conventional Mortgage | Sub-To Mortgage | Seller Finance
- Wrap Mortgage | Lease Option | Hard Money
- Private Money | HELOC | Land Contract

Each card: icon + name + one-line description. Selection advances to Step 2.

### Step 2: Core Terms
Common fields (all types):
- Name (auto-generated: "[Type] — [Property Address]", editable)
- Position (1st, 2nd, 3rd)
- Original Balance ($), Current Balance (defaults to original)
- Interest Rate (%), Rate Type (Fixed, Adjustable, Interest Only)
- Term (months), Monthly Payment (auto-calc if balance+rate+term provided)
- Origination Date, Maturity Date (auto-calc from origination+term)

Type-specific fields:
- **SUB_TO**: original borrower, servicer, loan number (last 4), due-on-sale risk auto-set
- **SELLER_FINANCE**: down payment, late fee %, grace days, prepayment penalty toggle
- **WRAP**: underlying instrument selector (dropdown), wrap rate, wrap payment
- **LEASE_OPTION**: option consideration, expiration, monthly credit, strike price
- **HARD_MONEY/PRIVATE**: points (%), interest reserve

### Step 3: Balloon & Insurance
- Has balloon? toggle → balloon date + amount
- Requires insurance? toggle (default yes) → escrow amount

### Step 4: Review & Create
- Summary of all terms
- "Create Instrument" button (violet)
- Submit: `POST /api/financing/instruments`
- Close modal → refresh property financing tab

### Auto-Calculations
- Balance + rate + term → monthly payment (standard amortization)
- Origination + term → maturity date
- Monthly payment + rate → P vs I split for first payment
- "Calculated" badge on auto-filled fields

---

## 6. Record Payment Modal

**Create**: `frontend/src/components/financing/RecordPaymentModal.tsx`

Shadcn Dialog (simpler than Add Instrument).

Used from: Obligation complete action, instrument detail, financing dashboard.

### Fields
- Instrument selector (pre-filled from context)
- Amount ($)
- Payment date (default today)
- Direction: Outgoing | Incoming (pre-set by instrument type)
- Payment type: Regular | Extra Principal | Balloon | Late Fee | Insurance | Tax
- Principal portion ($) — auto-calc from amortization
- Interest portion ($) — auto-calc
- Payment method: Bank Transfer | Check | Cash | Auto-Pay
- Confirmation number (optional)
- Notes (optional)

### Submit
- `POST /api/financing/payments`
- Invalidate: instruments, obligations, dashboard, today queries
- Toast: "Payment recorded"

---

## 7. Frontend Types

**Create**: `frontend/src/types/financing.ts`

Types matching backend schemas:

```typescript
// Enums
type FinancingInstrumentType = 'conventional_mortgage' | 'sub_to_mortgage' | 'seller_finance' | 'wrap_mortgage' | 'lease_option' | 'hard_money' | 'private_money' | 'heloc' | 'land_contract'
type ObligationType = 'monthly_payment' | 'balloon_payment' | 'insurance_renewal' | 'option_expiration' | 'rate_adjustment' | 'manual'
type ObligationStatus = 'active' | 'completed' | 'snoozed'
type ObligationSeverity = 'normal' | 'high' | 'critical'
type PaymentDirection = 'outgoing' | 'incoming'

// Core entities
interface FinancingInstrument { ... }  // All instrument fields
interface Obligation { ... }           // All obligation fields + computed
interface Payment { ... }              // All payment fields

// Response types
interface InstrumentListItem extends FinancingInstrument { months_remaining, next_payment_due, payoff_amount_estimate, wrap_spread }
interface InstrumentDetail extends FinancingInstrument { obligations, recent_payments, wrap_spread, amortization_schedule }
interface ObligationGrouped { critical: Obligation[], high: Obligation[], normal: Obligation[] }

// Dashboard
interface FinancingDashboard { total_instruments, total_balance, net_monthly_cash_flow, upcoming_balloons, wrap_spreads, due_on_sale_risks, ... }

// Helpers
interface WrapSpreadSummary { monthly_incoming, monthly_outgoing, monthly_spread, annual_spread, ... }
interface AmortizationEntry { month, payment_date, payment, principal, interest, balance }
interface PaymentSummary { total_outgoing_monthly, total_incoming_monthly, net_monthly, ... }
```

---

## 8. API Client

**Modify**: `frontend/src/lib/api.ts`

Add `financing` namespace following existing pattern:

```typescript
financing: {
  instruments: {
    list: (filters?) => request<PaginatedInstruments>(`/api/financing/instruments?${qs}`),
    get: (id) => request<InstrumentDetail>(`/api/financing/instruments/${id}`),
    create: (data) => request<FinancingInstrument>(`/api/financing/instruments`, { method: 'POST', body: data }),
    update: (id, data) => request<FinancingInstrument>(`/api/financing/instruments/${id}`, { method: 'PATCH', body: data }),
    delete: (id) => request<void>(`/api/financing/instruments/${id}`, { method: 'DELETE' }),
  },
  obligations: {
    list: (filters?) => ...,
    upcoming: () => request<ObligationGrouped>(`/api/financing/obligations/upcoming`),
    update: (id, data) => ...,
    complete: (id, data) => request<Obligation>(`/api/financing/obligations/${id}/complete`, { method: 'POST', body: data }),
  },
  payments: {
    list: (filters?) => ...,
    create: (data) => ...,
    summary: () => ...,
  },
  dashboard: () => request<FinancingDashboard>(`/api/financing/dashboard`),
}
```

---

## 9. React Query Hooks

**Create**: `frontend/src/hooks/useFinancing.ts`

Following existing patterns (`useDeals`, `useBilling`):

- `useInstruments(filters)` — queryKey: `['financing', 'instruments', filters]`
- `useInstrument(id)` — queryKey: `['financing', 'instruments', id]`
- `useObligations(filters)` — queryKey: `['financing', 'obligations', filters]`
- `useUpcomingObligations()` — queryKey: `['financing', 'obligations', 'upcoming']`
- `usePayments(filters)` — queryKey: `['financing', 'payments', filters]`
- `usePaymentSummary()` — queryKey: `['financing', 'payments', 'summary']`
- `useFinancingDashboard()` — queryKey: `['financing', 'dashboard']`

Mutations:
- `useCreateInstrument()` — invalidates instruments, dashboard
- `useUpdateInstrument(id)` — invalidates instruments, obligations, dashboard
- `useDeleteInstrument(id)` — invalidates instruments, obligations, dashboard
- `useCompleteObligation()` — invalidates obligations, instruments, dashboard, today
- `useUpdateObligation()` — invalidates obligations
- `useRecordPayment()` — invalidates payments, instruments, obligations, dashboard, today

All mutations: `toast.success()` on success, `toast.error()` on failure.

---

## 10. Route Updates

**Modify**: `frontend/src/App.tsx`

```typescript
const ObligationsPage = lazy(() => import('@/pages/financing/ObligationsPage'))
const FinancingDashboardPage = lazy(() => import('@/pages/financing/FinancingDashboardPage'))

// Replace locked /obligations route with real route:
<Route path="/obligations" element={<ProtectedRoute><PageErrorBoundary><ObligationsPage /></PageErrorBoundary></ProtectedRoute>} />

// Add financing dashboard route:
<Route path="/financing" element={<ProtectedRoute><PageErrorBoundary><FinancingDashboardPage /></PageErrorBoundary></ProtectedRoute>} />
```

---

## 11. Today Briefing Integration

Verify `BriefingCards.tsx` handles obligation entity_types:
- `entity_type = "obligation"` → link to `/obligations`
- `entity_type = "instrument"` → link to `/properties/:propertyId` (financing tab)

If not handled, add icon mapping and link generation for these entity types.

---

## 12. PostHog Events

All events use existing `trackEvent()` pattern with try-catch:

- `obligations_page_viewed` — `{total_active, overdue_count}`
- `obligation_completed_ui` — `{obligation_type, was_overdue, had_payment}`
- `obligation_snoozed` — `{obligation_type, snooze_days}`
- `financing_dashboard_viewed` — `{total_instruments, has_wraps, total_balance}`
- `instrument_created` — `{instrument_type, has_balloon, is_wrap}`
- `instrument_detail_expanded` — `{instrument_type, property_id}`
- `payment_recorded_ui` — `{direction, amount, instrument_type}`
- `wrap_spread_viewed` — `{property_id}`
- `add_instrument_step` — `{step: 1|2|3|4, instrument_type}`

---

## 13. Mobile Responsive

- **Obligations**: single column, cards full width, severity groups collapsible
- **Financing Dashboard**: KPIs 2x2 grid, wrap table becomes cards, timeline horizontal scroll
- **Property Financing Tab**: single column, instrument cards full width
- **Add Instrument Modal**: full screen on mobile, steps as vertical scroll
- **Record Payment Modal**: full screen on mobile

---

## Definition of Done

- [ ] Obligations nav item unlocked and navigable
- [ ] Financing nav item added to ASSETS section
- [ ] Obligations page shows all obligations grouped by severity
- [ ] Overdue obligations highlighted in red with urgency
- [ ] Complete obligation flow records payment and advances recurring
- [ ] Snooze updates due date
- [ ] Financing dashboard shows KPIs, wrap spreads, due-on-sale risks, balloon timeline
- [ ] Property detail has Financing tab with instrument list
- [ ] Add Instrument modal with type-specific fields and auto-calculations
- [ ] Record Payment modal with P&I breakdown
- [ ] Wrap visualization on property detail when wrap + underlying exist
- [ ] Frontend types, API client, React Query hooks for all financing endpoints
- [ ] Today briefing renders obligation alerts with correct icons/severity
- [ ] All routes registered and navigable
- [ ] Mobile responsive
- [ ] PostHog events firing
- [ ] Frontend build clean (`npx vite build`)
- [ ] No TypeScript errors
