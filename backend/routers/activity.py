"""Activity router — recent user actions across all entities."""

import logging
from typing import Optional

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from core.security.jwt import get_current_user
from database import get_db
from models.users import User

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/activity", tags=["activity"])


class ActivityItem(BaseModel):
    type: str
    description: str
    timestamp: str
    entity_id: Optional[str] = None
    entity_type: Optional[str] = None


@router.get("/recent", response_model=list[ActivityItem])
async def recent_activity(
    limit: int = Query(10, ge=1, le=50),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[ActivityItem]:
    """Get recent user actions across properties, scenarios, deals, and documents."""
    from models.properties import Property
    from models.analysis_scenarios import AnalysisScenario
    from models.deals import Deal
    from models.documents import Document

    items: list[ActivityItem] = []

    # Properties created
    props = (
        db.query(Property)
        .filter(Property.created_by == current_user.id, Property.is_deleted == False)
        .order_by(Property.created_at.desc())
        .limit(limit)
        .all()
    )
    for p in props:
        items.append(ActivityItem(
            type="property_saved",
            description=f"Property saved: {p.address_line1}",
            timestamp=p.created_at.isoformat() if p.created_at else "",
            entity_id=str(p.id),
            entity_type="property",
        ))

    # Analysis scenarios created
    scenarios = (
        db.query(AnalysisScenario)
        .filter(AnalysisScenario.created_by == current_user.id, AnalysisScenario.is_deleted == False)
        .order_by(AnalysisScenario.created_at.desc())
        .limit(limit)
        .all()
    )
    for s in scenarios:
        strategy_label = s.strategy.replace("_", " ").title()
        items.append(ActivityItem(
            type="analysis_completed",
            description=f"{strategy_label} analysis completed",
            timestamp=s.created_at.isoformat() if s.created_at else "",
            entity_id=str(s.property_id),
            entity_type="property",
        ))

    # Deals created
    deals = (
        db.query(Deal)
        .filter(Deal.user_id == current_user.id, Deal.deleted_at.is_(None))
        .order_by(Deal.created_at.desc())
        .limit(limit)
        .all()
    )
    for d in deals:
        items.append(ActivityItem(
            type="deal_created",
            description=f"Deal created: {d.address}",
            timestamp=d.created_at.isoformat() if d.created_at else "",
            entity_id=str(d.id),
            entity_type="deal",
        ))

    # Documents uploaded
    docs = (
        db.query(Document)
        .filter(Document.user_id == current_user.id)
        .order_by(Document.created_at.desc())
        .limit(limit)
        .all()
    )
    for doc in docs:
        items.append(ActivityItem(
            type="document_uploaded",
            description=f"Document uploaded: {doc.original_filename}",
            timestamp=doc.created_at.isoformat() if doc.created_at else "",
            entity_id=str(doc.id),
            entity_type="document",
        ))

    # Sort by timestamp desc and limit
    items.sort(key=lambda x: x.timestamp, reverse=True)
    return items[:limit]
