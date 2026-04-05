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
