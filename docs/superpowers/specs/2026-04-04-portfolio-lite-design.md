# Portfolio-Lite — Design Spec

## Overview

Replace the existing deal-entry portfolio with an automated property-centric portfolio dashboard. Pulls data from owned properties, analysis scenarios (value estimates), financing instruments (debt), and transactions (actual income/expenses) into a unified financial overview. No manual entry required.

## Design System

Same as all prior sprints — no new tokens.

## Architecture Decisions

- **Replace existing portfolio**: The old `/api/v1/portfolio` deal-entry system is superseded. The new `/api/portfolio` endpoint auto-computes everything from existing data sources. Old entries remain readable but are no longer the primary view.
- **Data sources**: Properties (status=owned) + AnalysisScenario (values, cap rates) + FinancingInstrument (debt, payments) + Transaction (actual income/expenses).
- **No new models**: Pure aggregation — no new database tables. All data derived at query time.
- **Router prefix**: `/api/portfolio` (new, not `/api/v1/portfolio`).
- **Frontend rewrite**: PortfolioPage.tsx gets rewritten from scratch. The existing charts/table structure is replaced with the design-reference layout.

---

## 1. Backend: Portfolio Endpoint

Create: `backend/routers/portfolio_v2.py` (new file, avoids conflicting with existing `portfolio.py`)
Register in: `backend/main.py` at `/api` prefix.

### GET /api/portfolio

Returns comprehensive portfolio overview for owned properties.

```python
PortfolioOverviewResponse:
    summary:
        total_properties: int
        total_estimated_value: float
        total_equity: float           # value - debt
        total_debt: float             # sum of instrument current_balances
        total_monthly_income: float   # from transactions or scenario projections
        total_monthly_expenses: float
        total_monthly_cash_flow: float
        total_annual_cash_flow: float
        avg_cap_rate: float
        avg_coc_return: float
        ltv_ratio: float              # debt / value * 100

    properties: list[PortfolioPropertyItem]
        id, address, city, state, zip_code
        estimated_value: float        # from primary scenario ARV or purchase_price
        purchase_price: float | null
        equity: float                 # value - property debt
        debt: float                   # sum of instrument balances for this property
        monthly_income: float         # income transactions this month, or projected rent
        monthly_expenses: float       # expense transactions, or projected
        monthly_cash_flow: float
        cap_rate: float | null        # from scenario outputs
        coc_return: float | null      # from scenario outputs
        appreciation_pct: float       # (value - purchase_price) / purchase_price * 100
        strategy: str | null          # from primary scenario
        instruments_count: int
        has_obligations: bool

    equity_history: list[MonthlyEquity]  # last 12 months
        month: str (YYYY-MM)
        total_equity: float
        total_value: float

    cash_flow_history: list[MonthlyCashFlow]  # last 12 months
        month: str
        income: float
        expenses: float
        net: float

    allocation:
        by_strategy: dict[str, int]   # strategy → property count
        by_value: dict[str, float]    # strategy → total value
```

### Data Computation Logic

For each property where `status == "owned"`:

1. **Value**: Primary scenario's `after_repair_value` or `purchase_price`, whichever is available
2. **Debt**: Sum of active `FinancingInstrument.current_balance` for this property
3. **Equity**: Value - Debt
4. **Monthly income**: Sum of positive transactions in current month for this property. If no transactions, use scenario's `monthly_cash_flow` (projected)
5. **Monthly expenses**: Sum of negative transactions (abs) in current month. If no transactions, derive from scenario outputs (`total_monthly_expenses`)
6. **Cap rate / CoC**: From scenario outputs if available
7. **Strategy**: From primary scenario's strategy field
8. **Instruments count**: Count of active financing instruments
9. **Has obligations**: Any active obligation exists

### Equity History

Simplified: for each of the last 12 months, compute total value (assumed constant — appreciation not tracked monthly) minus total debt at that point. Since we don't have historical debt snapshots, use current debt minus principal payments made after each month (approximate).

Simpler approach: Use current total value for all months (value doesn't change frequently), and approximate equity growth as `value - (current_debt + principal_paid_since_month)`. If this is too complex, just return current values for all months (the chart will be flat until we add proper snapshots later).

**Decision**: Return current equity for all 12 months — flat line. This is honest (we don't have historical snapshots) and avoids fake data. The chart infrastructure is in place for when we add monthly snapshots.

### Cash Flow History

Pull from transactions grouped by month for the last 12 months (same data as `GET /api/transactions/summary` but scoped to owned properties only).

### GET /api/portfolio/performance (optional — defer if time-constrained)

Same data as the main endpoint's history arrays. Skip this endpoint — the main endpoint returns everything needed.

---

## 2. Backend: Portfolio Schemas

Add to the portfolio_v2 router file or create `backend/schemas/portfolio_v2.py`:

```
PortfolioPropertyItem:
    id, address, city, state, zip_code
    estimated_value, purchase_price, equity, debt
    monthly_income, monthly_expenses, monthly_cash_flow
    cap_rate, coc_return, appreciation_pct
    strategy, instruments_count, has_obligations

PortfolioSummary:
    total_properties, total_estimated_value, total_equity, total_debt
    total_monthly_income, total_monthly_expenses, total_monthly_cash_flow
    total_annual_cash_flow, avg_cap_rate, avg_coc_return, ltv_ratio

MonthlyEquity:
    month, total_equity, total_value

MonthlyCashFlow:
    month, income, expenses, net

StrategyAllocation:
    by_strategy: dict[str, int]
    by_value: dict[str, float]

PortfolioOverviewResponse:
    summary: PortfolioSummary
    properties: list[PortfolioPropertyItem]
    equity_history: list[MonthlyEquity]
    cash_flow_history: list[MonthlyCashFlow]
    allocation: StrategyAllocation
```

---

## 3. Frontend: Types + API + Hook

### Types (add to `types/index.ts`)

```typescript
interface PortfolioPropertyItem {
  id: string
  address: string
  city: string
  state: string
  zip_code: string
  estimated_value: number
  purchase_price: number | null
  equity: number
  debt: number
  monthly_income: number
  monthly_expenses: number
  monthly_cash_flow: number
  cap_rate: number | null
  coc_return: number | null
  appreciation_pct: number
  strategy: string | null
  instruments_count: number
  has_obligations: boolean
}

interface PortfolioOverview {
  summary: {
    total_properties: number
    total_estimated_value: number
    total_equity: number
    total_debt: number
    total_monthly_income: number
    total_monthly_expenses: number
    total_monthly_cash_flow: number
    total_annual_cash_flow: number
    avg_cap_rate: number
    avg_coc_return: number
    ltv_ratio: number
  }
  properties: PortfolioPropertyItem[]
  equity_history: { month: string; total_equity: number; total_value: number }[]
  cash_flow_history: { month: string; income: number; expenses: number; net: number }[]
  allocation: {
    by_strategy: Record<string, number>
    by_value: Record<string, number>
  }
}
```

### API

```typescript
api.portfolioV2 = {
  overview: () => GET /api/portfolio,
}
```

### Hook

```typescript
usePortfolioOverview() — queryKey: ['portfolio', 'overview'], staleTime: 30_000
```

---

## 4. Frontend: Portfolio Page Rewrite

Rewrite: `frontend/src/pages/portfolio/PortfolioPage.tsx`

### Layout (top to bottom)

```
Header: "Portfolio" + "X Properties · $Y Total Value"

Hero Card: Large equity number + change indicator + CoC return

Charts Row (2 cols):
  Left: Equity Growth (area chart, violet gradient)
  Right: Strategy Allocation (donut chart)

Cash Flow Row (2 cols):
  Left: Cash Flow per Property (horizontal bar chart)
  Right: Monthly Income vs Expenses (bar chart, last 6 months)

KPI Row: 4 metric cards (LTV, Avg Cap Rate, Monthly CF, Annual CF)

Property Performance Table (sortable, full width)
```

### Hero Card

- "PORTFOLIO EQUITY" label (text-muted)
- Large number: "$487,000" — `total_equity` formatted
- Change indicator: appreciation % in green if positive
- Secondary: "CoC Return: 8.2%" beside it

### Charts

**Equity Growth**: Recharts AreaChart with violet gradient (`#8B7AFF`). X: months, Y: equity. Data from `equity_history`. (Will be flat initially — that's fine.)

**Strategy Allocation**: Recharts PieChart (donut). Each slice = a strategy, sized by value from `allocation.by_value`. Center label: property count. Legend below with strategy names + values.

Strategy colors:
- buy_and_hold: `#8B7AFF`
- brrrr: `#60A5FA`
- creative_finance: `#2DD4BF`
- flip: `#FBBF24`
- wholesale: `#F87171`

**Cash Flow per Property**: Horizontal bar chart. Each bar = a property's `monthly_cash_flow`. Green if positive, red if negative. Property address as label. Sorted by cash flow descending.

**Monthly Income vs Expenses**: ComposedChart with green bars (income), red bars (expenses), cream line (net). Data from `cash_flow_history`. Last 6-12 months.

### KPI Row

4 cards:
- LTV Ratio: `ltv_ratio`% — threshold green <70%, yellow <80%, red >80%
- Avg Cap Rate: `avg_cap_rate`% — threshold green >7%, yellow >5%
- Monthly Cash Flow: `total_monthly_cash_flow` — green/red
- Annual Cash Flow: `total_annual_cash_flow`

### Property Performance Table

Columns: Property | Value | Equity | Monthly CF | Cap Rate | CoC | Strategy | Instruments

- Sortable by any numeric column
- Property column: address (clickable → `/properties/:id`)
- Strategy: colored badge
- Monthly CF: green/red with sign
- Cap Rate / CoC: with threshold dots

### Empty State

"No owned properties yet. Properties with status 'owned' will appear here."

---

## 5. Frontend: Chart Components

Create in `frontend/src/components/portfolio/`:

- `EquityGrowthChart.tsx` — Recharts AreaChart, violet gradient, responsive
- `StrategyAllocationChart.tsx` — Recharts PieChart (donut), strategy colors, center label
- `CashFlowBenchmarkChart.tsx` — Horizontal BarChart per property, green/red
- `IncomeExpenseChart.tsx` — ComposedChart with bars + line

Each component receives typed props and renders independently.

---

## 6. Dashboard Integration

Modify: `frontend/src/pages/Dashboard.tsx`

Add a compact portfolio summary section:
- Total portfolio value with LTV
- Monthly cash flow
- "View Portfolio →" link
- Only shows if user has owned properties

Uses the same `usePortfolioOverview()` hook — conditionally rendered.

---

## 7. PostHog Events

- `portfolio_viewed` — `{property_count, total_value}`
- `portfolio_property_clicked` — `{property_id}`
- `portfolio_sorted` — `{sort_by}`

---

## Definition of Done

- [ ] GET /api/portfolio returns comprehensive overview from properties/scenarios/instruments/transactions
- [ ] Portfolio page rewritten with hero, 4 charts, KPI row, sortable table
- [ ] Equity growth area chart
- [ ] Strategy allocation donut chart
- [ ] Cash flow per property horizontal bars
- [ ] Monthly income vs expenses chart
- [ ] Property performance sortable table
- [ ] Dashboard compact portfolio summary
- [ ] Handles zero owned properties with empty state
- [ ] Frontend build clean
