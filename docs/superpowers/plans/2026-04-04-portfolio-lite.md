# Portfolio-Lite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the deal-entry portfolio with an automated property-centric portfolio dashboard that pulls from owned properties, scenarios, financing instruments, and transactions.

**Architecture:** New `portfolio_v2` router computes all metrics at query time from existing data (no new models). Frontend gets a full rewrite with 4 chart components, a sortable property table, and hero section. The old v1 portfolio remains accessible but is superseded.

**Tech Stack:** Python (FastAPI, SQLAlchemy), TypeScript (React, Recharts, TanStack Query, Tailwind)

---

## Task 1: Backend Portfolio V2 Endpoint

**Files:**
- Create: `backend/routers/portfolio_v2.py`
- Modify: `backend/main.py`

- [ ] **Step 1: Create the portfolio v2 router**

```python
# backend/routers/portfolio_v2.py
"""Portfolio V2 router — automated property-centric portfolio overview."""

from datetime import date, timedelta
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from core.security.jwt import get_current_user
from database import get_db
from models.analysis_scenarios import AnalysisScenario
from models.financing_instruments import FinancingInstrument
from models.obligations import Obligation
from models.properties import Property
from models.transactions import Transaction
from models.users import User

router = APIRouter(prefix="/portfolio", tags=["portfolio-v2"])


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class PortfolioPropertyItem(BaseModel):
    id: UUID
    address: str
    city: str
    state: str
    zip_code: str
    estimated_value: float
    purchase_price: Optional[float] = None
    equity: float
    debt: float
    monthly_income: float
    monthly_expenses: float
    monthly_cash_flow: float
    cap_rate: Optional[float] = None
    coc_return: Optional[float] = None
    appreciation_pct: float
    strategy: Optional[str] = None
    instruments_count: int
    has_obligations: bool


class PortfolioSummaryV2(BaseModel):
    total_properties: int
    total_estimated_value: float
    total_equity: float
    total_debt: float
    total_monthly_income: float
    total_monthly_expenses: float
    total_monthly_cash_flow: float
    total_annual_cash_flow: float
    avg_cap_rate: float
    avg_coc_return: float
    ltv_ratio: float


class MonthlyEquity(BaseModel):
    month: str
    total_equity: float
    total_value: float


class MonthlyCashFlow(BaseModel):
    month: str
    income: float
    expenses: float
    net: float


class StrategyAllocation(BaseModel):
    by_strategy: dict[str, int] = {}
    by_value: dict[str, float] = {}


class PortfolioOverviewResponse(BaseModel):
    summary: PortfolioSummaryV2
    properties: list[PortfolioPropertyItem] = []
    equity_history: list[MonthlyEquity] = []
    cash_flow_history: list[MonthlyCashFlow] = []
    allocation: StrategyAllocation = StrategyAllocation()


# ---------------------------------------------------------------------------
# Endpoint
# ---------------------------------------------------------------------------

@router.get("/overview", response_model=PortfolioOverviewResponse)
async def portfolio_overview(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Comprehensive portfolio overview from owned properties."""

    # Get owned properties
    owned = (
        db.query(Property)
        .filter(
            Property.created_by == current_user.id,
            Property.is_deleted == False,  # noqa: E712
            Property.status == "owned",
        )
        .all()
    )

    if not owned:
        return PortfolioOverviewResponse(
            summary=PortfolioSummaryV2(
                total_properties=0, total_estimated_value=0, total_equity=0,
                total_debt=0, total_monthly_income=0, total_monthly_expenses=0,
                total_monthly_cash_flow=0, total_annual_cash_flow=0,
                avg_cap_rate=0, avg_coc_return=0, ltv_ratio=0,
            ),
        )

    property_items: list[PortfolioPropertyItem] = []
    cap_rates: list[float] = []
    coc_returns: list[float] = []
    strategy_count: dict[str, int] = {}
    strategy_value: dict[str, float] = {}

    # Current month for transaction lookups
    now = date.today()
    month_start = now.replace(day=1)

    for prop in owned:
        # Primary scenario
        scenario = (
            db.query(AnalysisScenario)
            .filter(
                AnalysisScenario.property_id == prop.id,
                AnalysisScenario.is_deleted == False,  # noqa: E712
            )
            .order_by(AnalysisScenario.created_at.desc())
            .first()
        )

        outputs = (scenario.outputs or {}) if scenario else {}
        pp = float(scenario.purchase_price or 0) if scenario else 0
        arv = float(scenario.after_repair_value or 0) if scenario else 0
        est_value = arv if arv > 0 else pp
        strategy = scenario.strategy if scenario else None

        # Debt from financing instruments
        instruments = (
            db.query(FinancingInstrument)
            .filter(
                FinancingInstrument.property_id == prop.id,
                FinancingInstrument.created_by == current_user.id,
                FinancingInstrument.deleted_at.is_(None),
                FinancingInstrument.status == "active",
            )
            .all()
        )
        debt = sum(float(i.current_balance or 0) for i in instruments)
        equity = est_value - debt

        # Obligations
        has_obls = (
            db.query(Obligation)
            .filter(
                Obligation.property_id == prop.id,
                Obligation.created_by == current_user.id,
                Obligation.deleted_at.is_(None),
                Obligation.status == "active",
            )
            .first()
        ) is not None

        # Monthly income/expenses from transactions
        month_txns = (
            db.query(Transaction)
            .filter(
                Transaction.property_id == prop.id,
                Transaction.created_by == current_user.id,
                Transaction.is_deleted == False,  # noqa: E712
                Transaction.occurred_at >= month_start,
            )
            .all()
        )

        if month_txns:
            monthly_income = sum(float(t.amount) for t in month_txns if float(t.amount or 0) > 0)
            monthly_expenses = sum(abs(float(t.amount)) for t in month_txns if float(t.amount or 0) < 0)
        else:
            # Fall back to scenario projections
            monthly_income = float(outputs.get("monthly_cash_flow", 0)) + float(outputs.get("total_monthly_expenses", 0))
            monthly_expenses = float(outputs.get("total_monthly_expenses", 0))
            if monthly_income < 0:
                monthly_income = float(outputs.get("effective_gross_income", 0))

        monthly_cf = monthly_income - monthly_expenses

        cap_rate_val = outputs.get("cap_rate")
        coc_val = outputs.get("coc_return")
        if isinstance(cap_rate_val, (int, float)):
            cap_rates.append(cap_rate_val)
        if isinstance(coc_val, (int, float)):
            coc_returns.append(coc_val)

        appreciation = round(((est_value - pp) / pp) * 100, 1) if pp > 0 else 0

        # Strategy allocation
        if strategy:
            strategy_count[strategy] = strategy_count.get(strategy, 0) + 1
            strategy_value[strategy] = strategy_value.get(strategy, 0) + est_value

        property_items.append(PortfolioPropertyItem(
            id=prop.id,
            address=prop.address_line1,
            city=prop.city,
            state=prop.state,
            zip_code=prop.zip_code,
            estimated_value=round(est_value, 2),
            purchase_price=round(pp, 2) if pp > 0 else None,
            equity=round(equity, 2),
            debt=round(debt, 2),
            monthly_income=round(monthly_income, 2),
            monthly_expenses=round(monthly_expenses, 2),
            monthly_cash_flow=round(monthly_cf, 2),
            cap_rate=round(cap_rate_val, 2) if isinstance(cap_rate_val, (int, float)) else None,
            coc_return=round(coc_val, 2) if isinstance(coc_val, (int, float)) else None,
            appreciation_pct=appreciation,
            strategy=strategy,
            instruments_count=len(instruments),
            has_obligations=has_obls,
        ))

    # Aggregate summary
    total_value = sum(p.estimated_value for p in property_items)
    total_debt = sum(p.debt for p in property_items)
    total_equity = sum(p.equity for p in property_items)
    total_income = sum(p.monthly_income for p in property_items)
    total_expenses = sum(p.monthly_expenses for p in property_items)
    total_cf = total_income - total_expenses

    summary = PortfolioSummaryV2(
        total_properties=len(property_items),
        total_estimated_value=round(total_value, 2),
        total_equity=round(total_equity, 2),
        total_debt=round(total_debt, 2),
        total_monthly_income=round(total_income, 2),
        total_monthly_expenses=round(total_expenses, 2),
        total_monthly_cash_flow=round(total_cf, 2),
        total_annual_cash_flow=round(total_cf * 12, 2),
        avg_cap_rate=round(sum(cap_rates) / len(cap_rates), 2) if cap_rates else 0,
        avg_coc_return=round(sum(coc_returns) / len(coc_returns), 2) if coc_returns else 0,
        ltv_ratio=round((total_debt / total_value) * 100, 1) if total_value > 0 else 0,
    )

    # Equity history — current values for all 12 months (flat, honest)
    equity_history = []
    for i in range(11, -1, -1):
        d = date.today().replace(day=1) - timedelta(days=i * 30)
        equity_history.append(MonthlyEquity(
            month=d.strftime("%Y-%m"),
            total_equity=round(total_equity, 2),
            total_value=round(total_value, 2),
        ))

    # Cash flow history from transactions (last 12 months)
    twelve_months_ago = date.today().replace(day=1) - timedelta(days=365)
    prop_ids = [p.id for p in owned]
    all_txns = (
        db.query(Transaction)
        .filter(
            Transaction.created_by == current_user.id,
            Transaction.is_deleted == False,  # noqa: E712
            Transaction.property_id.in_(prop_ids),
            Transaction.occurred_at >= twelve_months_ago,
        )
        .all()
    )

    monthly_cf_map: dict[str, dict] = {}
    for t in all_txns:
        key = t.occurred_at.strftime("%Y-%m")
        if key not in monthly_cf_map:
            monthly_cf_map[key] = {"income": 0.0, "expenses": 0.0}
        amt = float(t.amount or 0)
        if amt >= 0:
            monthly_cf_map[key]["income"] += amt
        else:
            monthly_cf_map[key]["expenses"] += abs(amt)

    cash_flow_history = []
    for i in range(11, -1, -1):
        d = date.today().replace(day=1) - timedelta(days=i * 30)
        key = d.strftime("%Y-%m")
        entry = monthly_cf_map.get(key, {"income": 0, "expenses": 0})
        cash_flow_history.append(MonthlyCashFlow(
            month=key,
            income=round(entry["income"], 2),
            expenses=round(entry["expenses"], 2),
            net=round(entry["income"] - entry["expenses"], 2),
        ))

    try:
        from core.telemetry import track_event
        track_event(current_user.id, "portfolio_viewed", {
            "property_count": len(property_items),
            "total_value": round(total_value, 2),
        })
    except Exception:
        pass

    return PortfolioOverviewResponse(
        summary=summary,
        properties=property_items,
        equity_history=equity_history,
        cash_flow_history=cash_flow_history,
        allocation=StrategyAllocation(
            by_strategy=strategy_count,
            by_value={k: round(v, 2) for k, v in strategy_value.items()},
        ),
    )
```

- [ ] **Step 2: Register in main.py**

In `backend/main.py`, add `portfolio_v2` to the router import on line 64 and register it. The new router uses prefix `/api` and the router itself has prefix `/portfolio`, so the endpoint will be `/api/portfolio/overview`.

Add to imports:
```python
from routers import ..., rehab, portfolio_v2  # noqa: E402
```

Add after rehab registration:
```python
app.include_router(portfolio_v2.router, prefix="/api")
```

- [ ] **Step 3: Verify syntax**

Run: `cd backend && python3 -m py_compile routers/portfolio_v2.py && python3 -m py_compile main.py && echo "OK"`

- [ ] **Step 4: Commit**

```bash
git add backend/routers/portfolio_v2.py backend/main.py
git commit -m "feat: add portfolio v2 endpoint with property-centric aggregation"
```

---

## Task 2: Frontend Types + API + Hook

**Files:**
- Modify: `frontend/src/types/index.ts`
- Modify: `frontend/src/lib/api.ts`
- Modify: `frontend/src/hooks/usePortfolio.ts`

- [ ] **Step 1: Add portfolio v2 types**

At the end of `frontend/src/types/index.ts`, add:

```typescript
// ---------------------------------------------------------------------------
// Portfolio V2 types
// ---------------------------------------------------------------------------

export interface PortfolioPropertyItem {
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

export interface PortfolioOverview {
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

- [ ] **Step 2: Add API method**

In `frontend/src/lib/api.ts`, add inside the `api` object (can go after `rehab`):

```typescript
  portfolioV2: {
    overview: () => request<import('@/types').PortfolioOverview>('/api/portfolio/overview'),
  },
```

- [ ] **Step 3: Update usePortfolio hook**

Replace `frontend/src/hooks/usePortfolio.ts` content with:

```typescript
/** Portfolio query hooks. */

import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

/** Legacy portfolio (v1 deal entries). */
export function usePortfolio() {
  return useQuery({
    queryKey: ['portfolio'],
    queryFn: () => api.portfolio.summary(),
    staleTime: 30_000,
  })
}

/** Portfolio V2 — property-centric overview. */
export function usePortfolioOverview() {
  return useQuery({
    queryKey: ['portfolio', 'overview'],
    queryFn: () => api.portfolioV2.overview(),
    staleTime: 30_000,
  })
}
```

- [ ] **Step 4: Verify build**

Run: `cd frontend && npx vite build 2>&1 | tail -5`

- [ ] **Step 5: Commit**

```bash
git add frontend/src/types/index.ts frontend/src/lib/api.ts frontend/src/hooks/usePortfolio.ts
git commit -m "feat: add portfolio v2 types, API client, and hook"
```

---

## Task 3: Portfolio Chart Components

**Files:**
- Create: `frontend/src/components/portfolio/EquityGrowthChart.tsx`
- Create: `frontend/src/components/portfolio/StrategyAllocationChart.tsx`
- Create: `frontend/src/components/portfolio/CashFlowBenchmarkChart.tsx`
- Create: `frontend/src/components/portfolio/IncomeExpenseChart.tsx`

All 4 charts follow the same pattern: typed props, Recharts, design system colors, responsive. The implementer should read the spec at `docs/superpowers/specs/2026-04-04-portfolio-lite-design.md` section 4-5 for chart requirements.

- [ ] **Step 1: Create all 4 chart components**

Create directory: `mkdir -p frontend/src/components/portfolio`

**EquityGrowthChart.tsx**: Recharts AreaChart, violet gradient (#8B7AFF), X: months, Y: equity amount. Props: `data: { month: string; total_equity: number; total_value: number }[]`

**StrategyAllocationChart.tsx**: Recharts PieChart (donut). Props: `byStrategy: Record<string, number>, byValue: Record<string, number>`. Strategy colors: buy_and_hold=#8B7AFF, brrrr=#60A5FA, creative_finance=#2DD4BF, flip=#FBBF24, wholesale=#F87171. Center shows total count.

**CashFlowBenchmarkChart.tsx**: Horizontal BarChart. Props: `properties: { address: string; monthly_cash_flow: number }[]`. Green bars for positive, red for negative. Sorted desc.

**IncomeExpenseChart.tsx**: Recharts ComposedChart. Props: `data: { month: string; income: number; expenses: number; net: number }[]`. Green bars (income), red bars (expenses), cream line (net).

- [ ] **Step 2: Verify build**

Run: `cd frontend && npx vite build 2>&1 | tail -5`

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/portfolio/
git commit -m "feat: add portfolio chart components (equity, allocation, benchmark, income/expense)"
```

---

## Task 4: Portfolio Page Rewrite

**Files:**
- Rewrite: `frontend/src/pages/portfolio/PortfolioPage.tsx`

This is the main deliverable — a full rewrite of the portfolio page using the new V2 data and chart components.

Read the spec at `docs/superpowers/specs/2026-04-04-portfolio-lite-design.md` section 4 for the layout.

The page should:
- Use `usePortfolioOverview()` hook for all data
- Show hero section with total equity + appreciation + CoC return
- Render 4 charts in 2x2 grid: EquityGrowthChart, StrategyAllocationChart, CashFlowBenchmarkChart, IncomeExpenseChart
- Show KPI row: LTV, Avg Cap Rate, Monthly CF, Annual CF
- Show sortable property performance table with all columns
- Handle empty state (zero owned properties)
- Track PostHog: portfolio_viewed, portfolio_property_clicked, portfolio_sorted

Design system: Background #0C0B0A, Card #141311, Border #1E1D1B, Text #F0EDE8/#C5C0B8/#8A8580, Violet #8B7AFF, Success #4ADE80, Danger #F87171.

- [ ] **Step 1: Rewrite PortfolioPage with hero, charts, KPIs, table**

The implementer reads the spec and builds the complete page following existing page patterns (TransactionsPage, FinancingDashboardPage).

- [ ] **Step 2: Verify build**

Run: `cd frontend && npx vite build 2>&1 | tail -5`

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/portfolio/PortfolioPage.tsx
git commit -m "feat: rewrite portfolio page with property-centric dashboard"
```

---

## Task 5: Dashboard Integration

**Files:**
- Modify: `frontend/src/pages/Dashboard.tsx`

Add a compact portfolio summary section to the Dashboard page.

- [ ] **Step 1: Add portfolio summary to Dashboard**

Add import:
```typescript
import { usePortfolioOverview } from '@/hooks/usePortfolio'
```

In the Dashboard component, add the hook call:
```typescript
const { data: portfolioData } = usePortfolioOverview()
```

Then add a portfolio card section in the dashboard layout (after the existing KPI row or activity section). The card shows:
- "Portfolio" heading
- Total value: "$1,250,000"
- Monthly cash flow: "$2,100/mo" (green/red)
- LTV: "61%"
- Property count
- "View Portfolio →" link to `/portfolio`
- Only renders if `portfolioData?.summary.total_properties > 0`

```typescript
{portfolioData && portfolioData.summary.total_properties > 0 && (
  <div className="bg-[#141311] border border-[#1E1D1B] rounded-xl p-5">
    <div className="flex items-center justify-between mb-3">
      <h3 className="text-[11px] uppercase tracking-wider text-[#8A8580] font-medium">Portfolio</h3>
      <Link to="/portfolio" className="text-xs text-[#8B7AFF] hover:text-[#A89FFF] transition-colors">
        View Portfolio →
      </Link>
    </div>
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <div>
        <p className="text-[10px] uppercase tracking-wider text-[#8A8580] mb-0.5">Total Value</p>
        <p className="text-lg text-[#F0EDE8] font-medium tabular-nums">
          ${portfolioData.summary.total_estimated_value >= 1_000_000
            ? `${(portfolioData.summary.total_estimated_value / 1_000_000).toFixed(1)}M`
            : `${Math.round(portfolioData.summary.total_estimated_value / 1000)}K`}
        </p>
      </div>
      <div>
        <p className="text-[10px] uppercase tracking-wider text-[#8A8580] mb-0.5">Monthly CF</p>
        <p className={`text-lg font-medium tabular-nums ${portfolioData.summary.total_monthly_cash_flow >= 0 ? 'text-[#4ADE80]' : 'text-[#F87171]'}`}>
          ${Math.abs(Math.round(portfolioData.summary.total_monthly_cash_flow)).toLocaleString()}
        </p>
      </div>
      <div>
        <p className="text-[10px] uppercase tracking-wider text-[#8A8580] mb-0.5">LTV</p>
        <p className="text-lg text-[#F0EDE8] font-medium tabular-nums">{portfolioData.summary.ltv_ratio}%</p>
      </div>
      <div>
        <p className="text-[10px] uppercase tracking-wider text-[#8A8580] mb-0.5">Properties</p>
        <p className="text-lg text-[#F0EDE8] font-medium tabular-nums">{portfolioData.summary.total_properties}</p>
      </div>
    </div>
  </div>
)}
```

- [ ] **Step 2: Verify build**

Run: `cd frontend && npx vite build 2>&1 | tail -5`

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/Dashboard.tsx
git commit -m "feat: add compact portfolio summary to dashboard"
```

---

## Summary

| Task | Files | Description |
|------|-------|-------------|
| 1 | `portfolio_v2.py` (new), `main.py` | Backend endpoint: property-centric aggregation |
| 2 | `types/index.ts`, `api.ts`, `usePortfolio.ts` | Frontend types, API, hook |
| 3 | 4 chart components (new) | EquityGrowth, StrategyAllocation, CashFlowBenchmark, IncomeExpense |
| 4 | `PortfolioPage.tsx` | Full page rewrite with hero, charts, KPIs, table |
| 5 | `Dashboard.tsx` | Compact portfolio summary card |
