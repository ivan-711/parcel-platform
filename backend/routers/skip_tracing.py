"""Skip tracing router — owner lookup, batch tracing, usage tracking."""

import logging
from datetime import datetime, timedelta
from typing import Optional
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from core.billing.tier_config import TIER_LIMITS, Tier
from core.billing.tier_gate import require_quota, record_usage, get_effective_tier
from core.security.jwt import get_current_user
from core.telemetry import track_event
from database import get_db
from models.skip_traces import SkipTrace
from schemas.skip_tracing import (
    BatchStatusResponse,
    CreateContactFromTraceRequest,
    CreateContactFromTraceResponse,
    SkipTraceListItem,
    SkipTraceResponse,
    TraceBatchRequest,
    TraceAddressRequest,
    UsageResponse,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/skip-tracing", tags=["skip-tracing"])


# ---------------------------------------------------------------------------
# Helper
# ---------------------------------------------------------------------------

def _get_service(db: Session):
    from core.skip_tracing.batchdata_provider import BatchDataProvider
    from core.skip_tracing.service import SkipTraceService

    provider = BatchDataProvider()
    return SkipTraceService(db, provider)


# ---------------------------------------------------------------------------
# 1. POST /trace — single trace
# ---------------------------------------------------------------------------

@router.post("/trace", response_model=SkipTraceResponse)
async def trace_single(
    body: TraceAddressRequest,
    _quota: None = Depends(require_quota("skip_traces_per_month")),
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Run a single skip trace by property_id or address fields."""
    service = _get_service(db)

    if body.property_id:
        skip_trace = await service.trace_property(
            property_id=body.property_id,
            user_id=current_user.id,
        )
    else:
        skip_trace = await service.trace_address(
            address=body.address or "",
            city=body.city or "",
            state=body.state or "",
            zip_code=body.zip_code or "",
            user_id=current_user.id,
        )

    # Detect cache hit: traced_at older than 10 seconds means it was a prior trace
    is_cache_hit = (
        skip_trace.traced_at is not None
        and skip_trace.traced_at < datetime.utcnow() - timedelta(seconds=10)
    )

    if not is_cache_hit:
        record_usage(current_user.id, "skip_traces_per_month", db)
        db.commit()

    track_event(current_user.id, "skip_trace_single", {
        "status": skip_trace.status,
        "cache_hit": is_cache_hit,
        "has_property_id": body.property_id is not None,
    })

    return SkipTraceResponse.model_validate(skip_trace)


# ---------------------------------------------------------------------------
# 2. POST /trace-batch — batch trace
# ---------------------------------------------------------------------------

@router.post("/trace-batch")
async def trace_batch(
    body: TraceBatchRequest,
    _quota: None = Depends(require_quota("skip_traces_per_month")),
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Queue a batch of skip traces (max 100 records)."""
    if len(body.records) > 100:
        raise HTTPException(status_code=400, detail="Maximum 100 records per batch")

    batch_id = uuid4().hex[:12]

    for rec in body.records:
        st = SkipTrace(
            created_by=current_user.id,
            batch_id=batch_id,
            status="pending",
            input_address=rec.get("address"),
            input_city=rec.get("city"),
            input_state=rec.get("state"),
            input_zip=rec.get("zip_code"),
            input_name=rec.get("name"),
        )
        db.add(st)

    db.commit()

    from core.tasks.skip_trace_batch import process_skip_trace_batch
    process_skip_trace_batch.send(batch_id, str(current_user.id), body.auto_create_contacts)

    track_event(current_user.id, "skip_trace_batch_queued", {
        "batch_id": batch_id,
        "total": len(body.records),
        "auto_create_contacts": body.auto_create_contacts,
    })

    return {"batch_id": batch_id, "status": "processing", "total": len(body.records)}


# ---------------------------------------------------------------------------
# 3. GET /batch/{batch_id}/status — poll batch progress
# ---------------------------------------------------------------------------

@router.get("/batch/{batch_id}/status", response_model=BatchStatusResponse)
def batch_status(
    batch_id: str,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Poll the progress of a running batch."""
    rows = (
        db.query(SkipTrace.status, func.count(SkipTrace.id).label("cnt"))
        .filter(
            SkipTrace.batch_id == batch_id,
            SkipTrace.created_by == current_user.id,
        )
        .group_by(SkipTrace.status)
        .all()
    )

    if not rows:
        raise HTTPException(status_code=404, detail="Batch not found")

    counts: dict[str, int] = {r.status: r.cnt for r in rows}
    total = sum(counts.values())
    found = counts.get("found", 0)
    not_found = counts.get("not_found", 0)
    failed = counts.get("failed", 0)
    pending = counts.get("pending", 0)
    processing = counts.get("processing", 0)

    completed = found + not_found + failed

    if pending > 0 or processing > 0:
        overall_status = "processing"
    elif failed > 0 and found == 0 and not_found == 0:
        overall_status = "failed"
    else:
        overall_status = "complete"

    return BatchStatusResponse(
        batch_id=batch_id,
        status=overall_status,
        total=total,
        completed=completed,
        found=found,
        not_found=not_found,
    )


# ---------------------------------------------------------------------------
# 4. GET /history — list traces
# ---------------------------------------------------------------------------

@router.get("/history", response_model=list[SkipTraceListItem])
def list_traces(
    property_id: Optional[UUID] = Query(None),
    status: Optional[str] = Query(None),
    date_from: Optional[datetime] = Query(None),
    date_to: Optional[datetime] = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List skip traces with optional filters, newest first."""
    q = db.query(SkipTrace).filter(
        SkipTrace.created_by == current_user.id,
        SkipTrace.deleted_at.is_(None),
    )

    if property_id:
        q = q.filter(SkipTrace.property_id == property_id)
    if status:
        q = q.filter(SkipTrace.status == status)
    if date_from:
        q = q.filter(SkipTrace.created_at >= date_from)
    if date_to:
        q = q.filter(SkipTrace.created_at <= date_to)

    q = q.order_by(SkipTrace.created_at.desc())
    offset = (page - 1) * per_page
    traces = q.offset(offset).limit(per_page).all()

    items = []
    for t in traces:
        phone_count = len(t.phones) if t.phones else 0
        email_count = len(t.emails) if t.emails else 0
        items.append(
            SkipTraceListItem(
                id=t.id,
                status=t.status,
                input_address=t.input_address,
                input_city=t.input_city,
                input_state=t.input_state,
                owner_first_name=t.owner_first_name,
                owner_last_name=t.owner_last_name,
                phone_count=phone_count,
                email_count=email_count,
                is_absentee_owner=t.is_absentee_owner,
                contact_id=t.contact_id,
                traced_at=t.traced_at,
                created_at=t.created_at,
            )
        )

    return items


# ---------------------------------------------------------------------------
# 5. GET /usage — current month usage (must come before /{id})
# ---------------------------------------------------------------------------

@router.get("/usage", response_model=UsageResponse)
def get_usage(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return the current user's skip trace usage for this billing period."""
    now = datetime.utcnow()
    period_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    rows = (
        db.query(
            func.count(SkipTrace.id).label("used"),
            func.coalesce(func.sum(SkipTrace.cost_cents), 0).label("cost_total_cents"),
        )
        .filter(
            SkipTrace.created_by == current_user.id,
            SkipTrace.created_at >= period_start,
            SkipTrace.deleted_at.is_(None),
        )
        .one()
    )

    tier = get_effective_tier(current_user)
    limits = TIER_LIMITS[tier]
    limit_value = getattr(limits, "skip_traces_per_month", None)

    return UsageResponse(
        used=rows.used,
        limit=limit_value if limit_value != 0 else 0,
        cost_total_cents=rows.cost_total_cents,
    )


# ---------------------------------------------------------------------------
# 6. GET /{id} — single trace detail
# ---------------------------------------------------------------------------

@router.get("/{trace_id}", response_model=SkipTraceResponse)
def get_trace(
    trace_id: UUID,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Fetch a single skip trace record."""
    trace = (
        db.query(SkipTrace)
        .filter(
            SkipTrace.id == trace_id,
            SkipTrace.created_by == current_user.id,
            SkipTrace.deleted_at.is_(None),
        )
        .first()
    )
    if not trace:
        raise HTTPException(status_code=404, detail="Skip trace not found")

    return SkipTraceResponse.model_validate(trace)


# ---------------------------------------------------------------------------
# 7. POST /{id}/create-contact — create contact from results
# ---------------------------------------------------------------------------

@router.post("/{trace_id}/create-contact", response_model=CreateContactFromTraceResponse)
def create_contact_from_trace(
    trace_id: UUID,
    body: CreateContactFromTraceRequest,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create (or return existing) contact from a completed skip trace."""
    service = _get_service(db)

    try:
        result = service.create_contact_from_trace(
            skip_trace_id=trace_id,
            user_id=current_user.id,
            contact_type=body.contact_type,
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))

    contact = result["contact"]
    first = contact.first_name or ""
    last = contact.last_name or ""
    contact_name = f"{first} {last}".strip() or "Unknown"

    track_event(current_user.id, "skip_trace_contact_created", {
        "trace_id": str(trace_id),
        "existing": result["existing"],
    })

    return CreateContactFromTraceResponse(
        existing=result["existing"],
        contact_id=contact.id,
        contact_name=contact_name,
    )
