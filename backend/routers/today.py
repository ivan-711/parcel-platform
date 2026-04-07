"""Today router — aggregated daily briefing feed."""

import logging
from datetime import date, datetime, timedelta
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import and_, func, or_
from sqlalchemy.orm import Session

from core.financing.obligation_engine import _add_months
from core.security.jwt import get_current_user
from database import get_db
from models.users import User

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/today", tags=["today"])


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class PortfolioSummary(BaseModel):
    total_value: float = 0
    total_cash_flow: float = 0
    property_count: int = 0
    deal_count: int = 0
    change_pct: float = 0
    total_monthly_obligations: float = 0
    net_financing_cash_flow: float = 0
    upcoming_balloon_count: int = 0
    monthly_actuals: list[dict] = []


class BriefingItem(BaseModel):
    id: str
    severity: str  # urgent | warning | info
    title: str
    description: str
    entity_type: Optional[str] = None
    entity_id: Optional[str] = None
    action_url: Optional[str] = None
    created_at: str = ""


class PipelineSummary(BaseModel):
    total_active: int = 0
    by_stage: dict = {}
    total_value: float = 0


class ActivityItem(BaseModel):
    type: str
    description: str
    timestamp: str
    entity_id: Optional[str] = None
    entity_type: Optional[str] = None


class TodayResponse(BaseModel):
    greeting: str
    date: str
    portfolio_summary: PortfolioSummary
    briefing_items: list[BriefingItem]
    pipeline_summary: PipelineSummary
    recent_activity: list[ActivityItem]
    has_sample_data: bool
    has_real_data: bool


# ---------------------------------------------------------------------------
# Endpoint
# ---------------------------------------------------------------------------

@router.get("/", response_model=TodayResponse)
async def get_today(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> TodayResponse:
    """Aggregated daily briefing with portfolio, pipeline, briefing items."""
    from models.properties import Property
    from models.analysis_scenarios import AnalysisScenario
    from models.deals import Deal
    from models.pipeline_entries import PipelineEntry
    from models.documents import Document

    now = datetime.utcnow()
    user_name = _get_first_name(current_user)

    # --- Greeting ---
    greeting = f"{_time_greeting(now.hour)}, {user_name}"
    date_str = now.strftime("%A, %B %d, %Y").replace(" 0", " ")

    # --- Sample / real data detection ---
    total_props = (
        db.query(func.count(Property.id))
        .filter(
            Property.created_by == current_user.id,
            Property.is_deleted == False,  # noqa: E712
        )
        .scalar()
    ) or 0

    sample_props = (
        db.query(func.count(Property.id))
        .filter(
            Property.created_by == current_user.id,
            Property.is_deleted == False,  # noqa: E712
            Property.is_sample == True,  # noqa: E712
        )
        .scalar()
    ) or 0

    real_props = total_props - sample_props
    has_sample_data = sample_props > 0
    has_real_data = real_props > 0

    # Also check deals
    total_deals = (
        db.query(func.count(Deal.id))
        .filter(
            Deal.user_id == current_user.id,
            Deal.deleted_at.is_(None),
        )
        .scalar()
    ) or 0

    if not has_real_data and total_deals > 0:
        has_real_data = True

    # --- Portfolio summary (fail independently) ---
    try:
        portfolio = _build_portfolio_summary(db, current_user.id)
    except Exception:
        logger.exception("Portfolio summary builder failed")
        portfolio = PortfolioSummary()

    # --- Briefing items (fail independently) ---
    try:
        briefing = _build_briefing_items(
            db, current_user.id, now,
            has_sample_data, has_real_data,
        )
    except Exception:
        logger.exception("Briefing items builder failed")
        briefing = []

    # --- Pipeline summary (fail independently) ---
    try:
        pipeline = _build_pipeline_summary(db, current_user.id)
    except Exception:
        logger.exception("Pipeline summary builder failed")
        pipeline = PipelineSummary()

    # --- Recent activity (fail independently) ---
    try:
        activity = _build_recent_activity(
            db, current_user.id, limit=8,
        )
    except Exception:
        logger.exception("Recent activity builder failed")
        activity = []

    return TodayResponse(
        greeting=greeting,
        date=date_str,
        portfolio_summary=portfolio,
        briefing_items=briefing,
        pipeline_summary=pipeline,
        recent_activity=activity,
        has_sample_data=has_sample_data,
        has_real_data=has_real_data,
    )


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _time_greeting(hour: int) -> str:
    if 5 <= hour < 12:
        return "Good morning"
    if 12 <= hour < 17:
        return "Good afternoon"
    if 17 <= hour < 21:
        return "Good evening"
    return "Good night"


def _get_first_name(user: User) -> str:
    name = getattr(user, "name", None) or ""
    return name.split()[0] if name.strip() else "there"


def _build_portfolio_summary(
    db: Session, user_id: UUID
) -> PortfolioSummary:
    from models.properties import Property
    from models.analysis_scenarios import AnalysisScenario
    from models.financing_instruments import FinancingInstrument
    from models.transactions import Transaction as TxnModel

    owned = (
        db.query(Property)
        .filter(
            Property.created_by == user_id,
            Property.is_deleted == False,  # noqa: E712
            Property.status == "owned",
        )
        .all()
    )

    total_value = 0.0
    total_cf = 0.0
    total_debt = 0.0

    now = date.today()
    month_start = now.replace(day=1)

    for p in owned:
        scenario = (
            db.query(AnalysisScenario)
            .filter(
                AnalysisScenario.property_id == p.id,
                AnalysisScenario.is_deleted == False,  # noqa: E712
            )
            .order_by(AnalysisScenario.created_at.desc())
            .first()
        )
        if scenario:
            pp = float(scenario.purchase_price or 0)
            arv = float(scenario.after_repair_value or 0)
            total_value += arv if arv > 0 else pp
            outputs = scenario.outputs or {}
        else:
            outputs = {}

        # Debt from active financing instruments
        debt = sum(
            float(i.current_balance or 0)
            for i in db.query(FinancingInstrument).filter(
                FinancingInstrument.property_id == p.id,
                FinancingInstrument.created_by == user_id,
                FinancingInstrument.deleted_at.is_(None),
                FinancingInstrument.status == "active",
            ).all()
        )
        total_debt += debt

        # Prefer actual transactions for cash flow, fall back to scenario
        month_txns = (
            db.query(TxnModel)
            .filter(
                TxnModel.property_id == p.id,
                TxnModel.created_by == user_id,
                TxnModel.is_deleted == False,  # noqa: E712
                TxnModel.occurred_at >= month_start,
            )
            .all()
        )
        if month_txns:
            total_cf += sum(float(t.amount or 0) for t in month_txns)
        else:
            mcf = outputs.get("monthly_cash_flow")
            if isinstance(mcf, (int, float)):
                total_cf += mcf

    deal_count = (
        db.query(func.count())
        .select_from(
            db.query(Property.id)  # type: ignore
            .filter(
                Property.created_by == user_id,
                Property.is_deleted == False,  # noqa: E712
            )
            .subquery()
        )
        .scalar()
    ) or 0

    # Financing aggregates
    total_monthly_obligations = 0.0
    net_financing_cf = 0.0
    upcoming_balloon_count = 0
    try:
        from models.financing_instruments import FinancingInstrument
        from models.obligations import Obligation

        active_instruments = (
            db.query(FinancingInstrument)
            .filter(
                FinancingInstrument.created_by == user_id,
                FinancingInstrument.deleted_at.is_(None),
                FinancingInstrument.status == "active",
            )
            .all()
        )
        outgoing = sum(
            float(i.monthly_payment or 0)
            for i in active_instruments if not i.is_wrap
        )
        incoming = sum(
            float(i.wrap_payment or 0)
            for i in active_instruments if i.is_wrap
        )
        total_monthly_obligations = outgoing
        net_financing_cf = incoming - outgoing

        upcoming_balloon_count = (
            db.query(func.count(Obligation.id))
            .filter(
                Obligation.created_by == user_id,
                Obligation.deleted_at.is_(None),
                Obligation.obligation_type == "balloon_payment",
                Obligation.status == "active",
                Obligation.next_due.isnot(None),
            )
            .scalar()
        ) or 0
    except Exception:
        pass

    # Monthly transaction actuals (last 6 months)
    first_of_month = date.today().replace(day=1)
    six_months_ago = _add_months(first_of_month, -6)
    txns = (
        db.query(TxnModel)
        .filter(
            TxnModel.created_by == user_id,
            TxnModel.is_deleted == False,  # noqa: E712
            TxnModel.occurred_at >= six_months_ago,
        )
        .all()
    )
    monthly_actuals_map: dict[str, float] = {}
    for t in txns:
        key = t.occurred_at.strftime("%Y-%m")
        monthly_actuals_map[key] = monthly_actuals_map.get(key, 0) + float(t.amount or 0)

    monthly_actuals = []
    for i in range(5, -1, -1):
        d = _add_months(first_of_month, -i)
        key = d.strftime("%Y-%m")
        monthly_actuals.append({"month": key, "net": round(monthly_actuals_map.get(key, 0), 2)})

    return PortfolioSummary(
        total_value=total_value,
        total_cash_flow=total_cf,
        property_count=len(owned),
        deal_count=deal_count,
        total_monthly_obligations=total_monthly_obligations,
        net_financing_cash_flow=net_financing_cf,
        upcoming_balloon_count=upcoming_balloon_count,
        monthly_actuals=monthly_actuals,
    )


def _build_briefing_items(
    db: Session,
    user_id: UUID,
    now: datetime,
    has_sample: bool,
    has_real: bool,
) -> list[BriefingItem]:
    from models.pipeline_entries import PipelineEntry
    from models.deals import Deal

    items: list[BriefingItem] = []
    idx = 0

    # Stale deals: in pipeline for 7+ days without stage change
    stale_cutoff = now - timedelta(days=7)
    stale_entries = (
        db.query(PipelineEntry)
        .join(Deal, Deal.id == PipelineEntry.deal_id)
        .filter(
            Deal.user_id == user_id,
            Deal.deleted_at.is_(None),
            PipelineEntry.entered_stage_at <= stale_cutoff,
            PipelineEntry.stage.notin_(["closed", "dead"]),
        )
        .all()
    )
    if stale_entries:
        count = len(stale_entries)
        items.append(BriefingItem(
            id=f"stale-deals-{idx}",
            severity="warning",
            title=(
                f"{count} deal{'s' if count > 1 else ''} stale "
                f"for 7+ days — follow up"
            ),
            description=(
                "These deals haven't moved pipeline stages recently."
            ),
            entity_type="pipeline",
            action_url="/pipeline",
            created_at=now.isoformat(),
        ))
        idx += 1

    # Task-based briefing items
    try:
        from models.tasks import Task
        today_start = now.replace(
            hour=0, minute=0, second=0, microsecond=0,
        )
        today_end = today_start + timedelta(days=1)
        week_end = today_start + timedelta(days=7)

        # Overdue tasks (include snoozed tasks whose snooze period expired)
        overdue_tasks = (
            db.query(Task)
            .filter(
                Task.created_by == user_id,
                Task.is_deleted == False,  # noqa: E712
                or_(
                    Task.status.in_(["open", "due"]),
                    and_(Task.status == "snoozed", Task.due_date < today_start),
                ),
                Task.due_date < today_start,
            )
            .all()
        )
        if overdue_tasks:
            count = len(overdue_tasks)
            items.append(BriefingItem(
                id=f"overdue-tasks-{idx}",
                severity="urgent",
                title=(
                    f"{count} overdue task"
                    f"{'s' if count > 1 else ''}"
                ),
                description=overdue_tasks[0].title + (
                    f" and {count - 1} more"
                    if count > 1 else ""
                ),
                entity_type="task",
                entity_id=str(overdue_tasks[0].id),
                action_url="/today",
                created_at=now.isoformat(),
            ))
            idx += 1

        # Tasks due today (include snoozed tasks whose snooze date is today)
        due_today = (
            db.query(Task)
            .filter(
                Task.created_by == user_id,
                Task.is_deleted == False,  # noqa: E712
                or_(
                    Task.status.in_(["open", "due"]),
                    and_(Task.status == "snoozed", Task.due_date >= today_start, Task.due_date < today_end),
                ),
                Task.due_date >= today_start,
                Task.due_date < today_end,
            )
            .all()
        )
        if due_today:
            count = len(due_today)
            items.append(BriefingItem(
                id=f"due-today-{idx}",
                severity="warning",
                title=(
                    f"{count} task{'s' if count > 1 else ''} "
                    f"due today"
                ),
                description=due_today[0].title + (
                    f" and {count - 1} more"
                    if count > 1 else ""
                ),
                entity_type="task",
                entity_id=str(due_today[0].id),
                action_url="/today",
                created_at=now.isoformat(),
            ))
            idx += 1

        # Tasks due this week
        due_week = (
            db.query(Task)
            .filter(
                Task.created_by == user_id,
                Task.is_deleted == False,  # noqa: E712
                Task.status.in_(["open", "due"]),
                Task.due_date >= today_end,
                Task.due_date < week_end,
            )
            .count()
        )
        if due_week > 0:
            items.append(BriefingItem(
                id=f"due-week-{idx}",
                severity="info",
                title=(
                    f"{due_week} task"
                    f"{'s' if due_week > 1 else ''} "
                    f"due this week"
                ),
                description="Check your task list for details.",
                entity_type="task",
                action_url="/today",
                created_at=now.isoformat(),
            ))
            idx += 1
    except Exception:
        logger.debug("Task briefing items skipped")

    # Financing obligation briefing items
    try:
        from models.obligations import Obligation
        from models.financing_instruments import FinancingInstrument as FI

        today_date = now.date() if hasattr(now, "date") else now
        ninety_days = today_date + timedelta(days=90)

        # Overdue obligations
        overdue_count = (
            db.query(func.count(Obligation.id))
            .filter(
                Obligation.created_by == user_id,
                Obligation.deleted_at.is_(None),
                Obligation.status == "active",
                Obligation.next_due < today_date,
            )
            .scalar()
        ) or 0
        if overdue_count:
            items.append(BriefingItem(
                id=f"overdue-obligations-{idx}",
                severity="urgent",
                title=(
                    f"OVERDUE: {overdue_count} financing "
                    f"obligation{'s' if overdue_count > 1 else ''}"
                ),
                description="Review your financing dashboard.",
                entity_type="financing",
                action_url="/financing",
                created_at=now.isoformat(),
            ))
            idx += 1

        # Balloon payments within 90 days
        balloon_soon = (
            db.query(Obligation)
            .filter(
                Obligation.created_by == user_id,
                Obligation.deleted_at.is_(None),
                Obligation.status == "active",
                Obligation.obligation_type == "balloon_payment",
                Obligation.next_due >= today_date,
                Obligation.next_due <= ninety_days,
            )
            .all()
        )
        for bobl in balloon_soon:
            days_left = (bobl.next_due - today_date).days
            items.append(BriefingItem(
                id=f"balloon-{idx}",
                severity="urgent",
                title=f"Balloon payment in {days_left} days",
                description=bobl.title,
                entity_type="financing",
                action_url="/financing",
                created_at=now.isoformat(),
            ))
            idx += 1

        # Balloon payments 90-180 days
        one_eighty = today_date + timedelta(days=180)
        balloon_warning = (
            db.query(func.count(Obligation.id))
            .filter(
                Obligation.created_by == user_id,
                Obligation.deleted_at.is_(None),
                Obligation.status == "active",
                Obligation.obligation_type == "balloon_payment",
                Obligation.next_due > ninety_days,
                Obligation.next_due <= one_eighty,
            )
            .scalar()
        ) or 0
        if balloon_warning:
            items.append(BriefingItem(
                id=f"balloon-warning-{idx}",
                severity="warning",
                title=(
                    f"{balloon_warning} balloon payment"
                    f"{'s' if balloon_warning > 1 else ''}"
                    " within 180 days"
                ),
                description="Plan your refinance or payoff strategy.",
                entity_type="financing",
                action_url="/financing",
                created_at=now.isoformat(),
            ))
            idx += 1

        # Monthly payments due within 7 days
        seven_days = today_date + timedelta(days=7)
        payments_soon = (
            db.query(func.count(Obligation.id))
            .filter(
                Obligation.created_by == user_id,
                Obligation.deleted_at.is_(None),
                Obligation.status == "active",
                Obligation.obligation_type == "monthly_payment",
                Obligation.next_due >= today_date,
                Obligation.next_due <= seven_days,
            )
            .scalar()
        ) or 0
        if payments_soon:
            items.append(BriefingItem(
                id=f"payments-due-{idx}",
                severity="info",
                title=(
                    f"{payments_soon} payment"
                    f"{'s' if payments_soon > 1 else ''}"
                    " due this week"
                ),
                description="Check your obligations list.",
                entity_type="financing",
                action_url="/financing",
                created_at=now.isoformat(),
            ))
            idx += 1

        # Insurance renewal within 30 days
        thirty_days = today_date + timedelta(days=30)
        insurance_due = (
            db.query(func.count(Obligation.id))
            .filter(
                Obligation.created_by == user_id,
                Obligation.deleted_at.is_(None),
                Obligation.status == "active",
                Obligation.obligation_type == "insurance_renewal",
                Obligation.next_due >= today_date,
                Obligation.next_due <= thirty_days,
            )
            .scalar()
        ) or 0
        if insurance_due:
            items.append(BriefingItem(
                id=f"insurance-due-{idx}",
                severity="warning",
                title=(
                    f"{insurance_due} insurance renewal"
                    f"{'s' if insurance_due > 1 else ''}"
                    " within 30 days"
                ),
                description="Verify coverage is current.",
                entity_type="financing",
                action_url="/financing",
                created_at=now.isoformat(),
            ))
            idx += 1

        # Option expiration within 90 days
        option_expiring = (
            db.query(func.count(Obligation.id))
            .filter(
                Obligation.created_by == user_id,
                Obligation.deleted_at.is_(None),
                Obligation.status == "active",
                Obligation.obligation_type == "option_expiration",
                Obligation.next_due >= today_date,
                Obligation.next_due <= ninety_days,
            )
            .scalar()
        ) or 0
        if option_expiring:
            items.append(BriefingItem(
                id=f"option-expiring-{idx}",
                severity="urgent",
                title=(
                    f"{option_expiring} lease option"
                    f"{'s' if option_expiring > 1 else ''}"
                    " expiring within 90 days"
                ),
                description="Exercise or extend before deadline.",
                entity_type="financing",
                action_url="/financing",
                created_at=now.isoformat(),
            ))
            idx += 1
    except Exception:
        logger.debug("Financing briefing items skipped")

    # New user prompt
    if has_sample and not has_real:
        items.append(BriefingItem(
            id=f"sample-prompt-{idx}",
            severity="info",
            title="Explore your sample deals",
            description=(
                "See what Parcel can do with the sample data, "
                "then analyze your own properties."
            ),
            entity_type="onboarding",
            action_url="/analyze",
            created_at=now.isoformat(),
        ))
        idx += 1

    # Recent data enrichment — scoped to user's properties
    try:
        from models.data_source_events import DataSourceEvent
        from models.properties import Property as Prop
        recent_dse = (
            db.query(DataSourceEvent)
            .join(Prop, Prop.id == DataSourceEvent.property_id)
            .filter(
                Prop.created_by == user_id,
                Prop.is_deleted == False,  # noqa: E712
                DataSourceEvent.fetched_at >= now - timedelta(days=1),
                DataSourceEvent.response_status == "success",
            )
            .count()
        )
        if recent_dse > 0:
            items.append(BriefingItem(
                id=f"new-data-{idx}",
                severity="info",
                title="New property data available",
                description=(
                    f"{recent_dse} data refresh"
                    f"{'es' if recent_dse > 1 else ''} "
                    "completed in the last 24 hours."
                ),
                entity_type="data",
                action_url="/properties",
                created_at=now.isoformat(),
            ))
    except Exception:
        pass

    # Report engagement (last 24 hours)
    try:
        from models.reports import Report

        viewed_reports = (
            db.query(func.count(Report.id))
            .filter(
                Report.created_by == user_id,
                Report.is_deleted == False,
                Report.last_viewed_at >= now - timedelta(days=1),
                Report.view_count > 0,
            )
            .scalar()
        ) or 0
        if viewed_reports > 0:
            total_views = (
                db.query(func.sum(Report.view_count))
                .filter(
                    Report.created_by == user_id,
                    Report.is_deleted == False,
                    Report.last_viewed_at >= now - timedelta(days=1),
                )
                .scalar()
            ) or 0
            idx += 1
            items.append(BriefingItem(
                id=f"report-views-{idx}",
                severity="info",
                title=f"{viewed_reports} report{'s' if viewed_reports > 1 else ''} viewed recently",
                description=f"Your shared reports received {total_views} total view{'s' if total_views > 1 else ''} in the last 24 hours.",
                entity_type="report",
                action_url="/reports",
                created_at=now.isoformat(),
            ))
    except Exception:
        pass

    return items


def _build_pipeline_summary(
    db: Session, user_id: UUID
) -> PipelineSummary:
    from models.pipeline_entries import PipelineEntry
    from models.deals import Deal

    entries = (
        db.query(PipelineEntry.stage, func.count(PipelineEntry.id))
        .join(Deal, Deal.id == PipelineEntry.deal_id)
        .filter(
            Deal.user_id == user_id,
            Deal.deleted_at.is_(None),
        )
        .group_by(PipelineEntry.stage)
        .all()
    )

    by_stage = {stage: count for stage, count in entries}
    active_stages = {"lead", "analyzing", "offer_sent",
                     "under_contract", "due_diligence"}
    total_active = sum(
        c for s, c in by_stage.items() if s in active_stages
    )

    return PipelineSummary(
        total_active=total_active,
        by_stage=by_stage,
        total_value=0,  # computed from scenario data in future
    )


def _build_recent_activity(
    db: Session, user_id: UUID, limit: int = 8
) -> list[ActivityItem]:
    from models.properties import Property
    from models.analysis_scenarios import AnalysisScenario
    from models.deals import Deal
    from models.documents import Document

    items: list[ActivityItem] = []

    props = (
        db.query(Property)
        .filter(
            Property.created_by == user_id,
            Property.is_deleted == False,  # noqa: E712
        )
        .order_by(Property.created_at.desc())
        .limit(limit)
        .all()
    )
    for p in props:
        items.append(ActivityItem(
            type="property_saved",
            description=f"Property saved: {p.address_line1}",
            timestamp=(
                p.created_at.isoformat() if p.created_at else ""
            ),
            entity_id=str(p.id),
            entity_type="property",
        ))

    scenarios = (
        db.query(AnalysisScenario)
        .filter(
            AnalysisScenario.created_by == user_id,
            AnalysisScenario.is_deleted == False,  # noqa: E712
        )
        .order_by(AnalysisScenario.created_at.desc())
        .limit(limit)
        .all()
    )
    for s in scenarios:
        label = s.strategy.replace("_", " ").title()
        items.append(ActivityItem(
            type="analysis_completed",
            description=f"{label} analysis completed",
            timestamp=(
                s.created_at.isoformat() if s.created_at else ""
            ),
            entity_id=str(s.property_id),
            entity_type="property",
        ))

    deals = (
        db.query(Deal)
        .filter(
            Deal.user_id == user_id,
            Deal.deleted_at.is_(None),
        )
        .order_by(Deal.created_at.desc())
        .limit(limit)
        .all()
    )
    for d in deals:
        items.append(ActivityItem(
            type="deal_created",
            description=f"Deal created: {d.address}",
            timestamp=(
                d.created_at.isoformat() if d.created_at else ""
            ),
            entity_id=str(d.id),
            entity_type="deal",
        ))

    docs = (
        db.query(Document)
        .filter(Document.user_id == user_id)
        .order_by(Document.created_at.desc())
        .limit(limit)
        .all()
    )
    for doc in docs:
        items.append(ActivityItem(
            type="document_uploaded",
            description=f"Document uploaded: {doc.original_filename}",
            timestamp=(
                doc.created_at.isoformat() if doc.created_at else ""
            ),
            entity_id=str(doc.id),
            entity_type="document",
        ))

    items.sort(key=lambda x: x.timestamp, reverse=True)
    return items[:limit]
