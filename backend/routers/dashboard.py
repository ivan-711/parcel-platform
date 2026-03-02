"""Dashboard router — aggregated stats and activity feed for the authenticated user."""

from datetime import datetime, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from core.security.jwt import get_current_user
from database import get_db
from models.deals import Deal
from models.documents import Document
from models.pipeline_entries import PipelineEntry
from models.portfolio_entries import PortfolioEntry
from models.users import User
from schemas.dashboard import (
    ActivityFeedResponse,
    ActivityItem,
    DashboardStatsResponse,
    RecentDealItem,
)

router = APIRouter(prefix="/dashboard", tags=["dashboard"])

ALL_STRATEGIES = ["wholesale", "creative_finance", "brrrr", "buy_and_hold", "flip"]
ALL_STAGES = [
    "lead", "analyzing", "offer_sent", "under_contract",
    "due_diligence", "closed", "dead",
]
INACTIVE_STAGES = {"closed", "dead"}

_STAGE_LABELS: dict[str, str] = {
    "lead": "Lead",
    "analyzing": "Analyzing",
    "offer_sent": "Offer Sent",
    "under_contract": "Under Contract",
    "due_diligence": "Due Diligence",
    "closed": "Closed",
    "dead": "Dead",
}


@router.get("/stats/", response_model=DashboardStatsResponse)
def get_dashboard_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> DashboardStatsResponse:
    """Return aggregated dashboard statistics for the current user."""

    user_deals_filter = (Deal.user_id == current_user.id) & (Deal.deleted_at.is_(None))

    # 1. Total deals
    total_deals: int = db.execute(
        select(func.count()).select_from(Deal).where(user_deals_filter)
    ).scalar_one()

    # 2. Deals by strategy
    strategy_rows = db.execute(
        select(Deal.strategy, func.count())
        .where(user_deals_filter)
        .group_by(Deal.strategy)
    ).all()
    deals_by_strategy = {s: 0 for s in ALL_STRATEGIES}
    for strategy, count in strategy_rows:
        deals_by_strategy[strategy] = count

    # 3. Pipeline by stage
    stage_rows = db.execute(
        select(PipelineEntry.stage, func.count())
        .where(PipelineEntry.user_id == current_user.id)
        .group_by(PipelineEntry.stage)
    ).all()
    pipeline_by_stage = {s: 0 for s in ALL_STAGES}
    for stage, count in stage_rows:
        pipeline_by_stage[stage] = count

    # 4. Active pipeline deals (all stages except closed and dead)
    active_pipeline_deals = sum(
        count for stage, count in pipeline_by_stage.items()
        if stage not in INACTIVE_STAGES
    )

    # 5. Recent deals (last 5)
    recent_deal_rows = db.execute(
        select(Deal)
        .where(user_deals_filter)
        .order_by(Deal.created_at.desc())
        .limit(5)
    ).scalars().all()

    recent_deals = [RecentDealItem.model_validate(deal) for deal in recent_deal_rows]

    return DashboardStatsResponse(
        total_deals=total_deals,
        active_pipeline_deals=active_pipeline_deals,
        deals_by_strategy=deals_by_strategy,
        pipeline_by_stage=pipeline_by_stage,
        recent_deals=recent_deals,
    )


@router.get("/activity/", response_model=ActivityFeedResponse)
def get_activity_feed(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ActivityFeedResponse:
    """Return the 15 most recent activity events across deals, pipeline,
    documents, and portfolio for the current user."""

    cutoff = datetime.utcnow() - timedelta(days=30)
    items: list[ActivityItem] = []

    # 1. Recent deals created
    deal_rows = db.execute(
        select(Deal.id, Deal.address, Deal.strategy, Deal.created_at)
        .where(
            Deal.user_id == current_user.id,
            Deal.deleted_at.is_(None),
            Deal.created_at > cutoff,
        )
        .order_by(Deal.created_at.desc())
        .limit(10)
    ).all()
    for row in deal_rows:
        strategy_label = row.strategy.replace("_", " ").title()
        items.append(ActivityItem(
            id=row.id,
            activity_type="deal_analyzed",
            text=f"Analyzed {strategy_label} deal at {row.address}",
            timestamp=row.created_at,
            metadata={
                "strategy": row.strategy,
                "address": row.address,
                "stage": None,
            },
        ))

    # 2. Recent pipeline stage changes
    pipe_rows = db.execute(
        select(
            PipelineEntry.id,
            PipelineEntry.stage,
            PipelineEntry.entered_stage_at,
            Deal.address,
            Deal.strategy,
        )
        .join(Deal, PipelineEntry.deal_id == Deal.id)
        .where(
            PipelineEntry.user_id == current_user.id,
            PipelineEntry.entered_stage_at > cutoff,
        )
        .order_by(PipelineEntry.entered_stage_at.desc())
        .limit(10)
    ).all()
    for row in pipe_rows:
        stage_label = _STAGE_LABELS.get(row.stage, row.stage)
        items.append(ActivityItem(
            id=row.id,
            activity_type="pipeline_moved",
            text=f"{row.address} moved to {stage_label}",
            timestamp=row.entered_stage_at,
            metadata={
                "strategy": row.strategy,
                "address": row.address,
                "stage": row.stage,
            },
        ))

    # 3. Recent documents completed
    doc_rows = db.execute(
        select(
            Document.id,
            Document.original_filename,
            Document.updated_at,
        )
        .where(
            Document.user_id == current_user.id,
            Document.status == "complete",
            Document.updated_at > cutoff,
        )
        .order_by(Document.updated_at.desc())
        .limit(5)
    ).all()
    for row in doc_rows:
        items.append(ActivityItem(
            id=row.id,
            activity_type="document_analyzed",
            text=(
                f"Document analysis complete: {row.original_filename}"
            ),
            timestamp=row.updated_at,
            metadata={
                "strategy": None,
                "address": None,
                "stage": None,
            },
        ))

    # 4. Recent portfolio entries
    port_rows = db.execute(
        select(
            PortfolioEntry.id,
            PortfolioEntry.created_at,
            PortfolioEntry.profit,
            Deal.address,
            Deal.strategy,
        )
        .join(Deal, PortfolioEntry.deal_id == Deal.id)
        .where(
            PortfolioEntry.user_id == current_user.id,
            PortfolioEntry.created_at > cutoff,
        )
        .order_by(PortfolioEntry.created_at.desc())
        .limit(5)
    ).all()
    for row in port_rows:
        profit_str = f"${row.profit:,.0f}" if row.profit else "$0"
        items.append(ActivityItem(
            id=row.id,
            activity_type="deal_closed",
            text=f"Closed {row.address} — {profit_str} profit",
            timestamp=row.created_at,
            metadata={
                "strategy": row.strategy,
                "address": row.address,
                "stage": None,
            },
        ))

    # Merge, sort by timestamp descending, return top 15
    items.sort(key=lambda x: x.timestamp, reverse=True)
    return ActivityFeedResponse(activities=items[:15])
