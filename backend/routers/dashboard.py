"""Dashboard router — aggregated stats for the authenticated user."""

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from core.security.jwt import get_current_user
from database import get_db
from models.deals import Deal
from models.pipeline_entries import PipelineEntry
from models.users import User
from schemas.dashboard import DashboardStatsResponse, RecentDealItem

router = APIRouter(prefix="/dashboard", tags=["dashboard"])

ALL_STRATEGIES = ["wholesale", "creative_finance", "brrrr", "buy_and_hold", "flip"]
ALL_STAGES = [
    "lead", "analyzing", "offer_sent", "under_contract",
    "due_diligence", "closed", "dead",
]
INACTIVE_STAGES = {"closed", "dead"}


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
