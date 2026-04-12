"""Sequences router — CRUD, enrollment, and internal cron processing."""

import hmac
import logging
import os
from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from core.communications.sequence_engine import SequenceEngine
from core.communications.service import CommunicationService
from core.communications.sendgrid_email import SendGridEmailProvider
from core.communications.twilio_sms import TwilioSMSProvider
from core.security.jwt import get_current_user
from core.telemetry import track_event
from database import get_db
from models.contacts import Contact
from models.deals import Deal
from models.properties import Property
from models.sequences import Sequence, SequenceEnrollment, SequenceStep
from models.users import User
from schemas.sequences import (
    BulkEnrollRequest,
    CreateSequenceRequest,
    EnrollRequest,
    EnrollmentResponse,
    SequenceAnalytics,
    SequenceListItem,
    SequenceResponse,
    SequenceStepRequest,
    StepResponse,
    UpdateSequenceRequest,
    UpdateStepRequest,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/sequences", tags=["sequences"])
internal_router = APIRouter(tags=["internal"])

_VALID_STATUSES = {"active", "paused", "archived"}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _get_sequence_or_404(db: Session, seq_id: UUID, user_id: UUID) -> Sequence:
    seq = (
        db.query(Sequence)
        .filter(
            Sequence.id == seq_id,
            Sequence.created_by == user_id,
            Sequence.deleted_at.is_(None),
        )
        .first()
    )
    if not seq:
        raise HTTPException(
            status_code=404,
            detail={"error": "Sequence not found", "code": "NOT_FOUND"},
        )
    return seq


def _get_step_or_404(db: Session, step_id: UUID, seq_id: UUID, user_id: UUID) -> SequenceStep:
    # Validate sequence ownership first
    _get_sequence_or_404(db, seq_id, user_id)
    step = (
        db.query(SequenceStep)
        .filter(
            SequenceStep.id == step_id,
            SequenceStep.sequence_id == seq_id,
            SequenceStep.deleted_at.is_(None),
        )
        .first()
    )
    if not step:
        raise HTTPException(
            status_code=404,
            detail={"error": "Step not found", "code": "NOT_FOUND"},
        )
    return step


def _get_service(db: Session) -> CommunicationService:
    try:
        sms = TwilioSMSProvider()
    except ValueError:
        sms = None  # type: ignore[assignment]
    email = SendGridEmailProvider()
    return CommunicationService(db, sms_provider=sms, email_provider=email)


def _enrollment_with_contact_name(enrollment: SequenceEnrollment, db: Session) -> EnrollmentResponse:
    contact = db.query(Contact).filter(Contact.id == enrollment.contact_id).first()
    contact_name = ""
    if contact:
        contact_name = f"{contact.first_name} {contact.last_name or ''}".strip()
    data = EnrollmentResponse.model_validate(enrollment)
    data.contact_name = contact_name
    return data


# ---------------------------------------------------------------------------
# 1. List sequences
# ---------------------------------------------------------------------------


@router.get("/", response_model=list[SequenceListItem])
async def list_sequences(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[SequenceListItem]:
    """List all sequences for the current user."""
    sequences = (
        db.query(Sequence)
        .filter(
            Sequence.created_by == current_user.id,
            Sequence.deleted_at.is_(None),
        )
        .order_by(Sequence.created_at.desc())
        .all()
    )

    items = []
    for seq in sequences:
        step_count = (
            db.query(func.count(SequenceStep.id))
            .filter(
                SequenceStep.sequence_id == seq.id,
                SequenceStep.deleted_at.is_(None),
            )
            .scalar()
            or 0
        )
        total_enrolled = seq.total_enrolled or 0
        total_replied = seq.total_replied or 0
        reply_rate = (total_replied / total_enrolled * 100) if total_enrolled > 0 else 0.0

        items.append(
            SequenceListItem(
                id=seq.id,
                name=seq.name,
                description=seq.description,
                status=seq.status,
                step_count=step_count,
                total_enrolled=total_enrolled,
                total_completed=seq.total_completed or 0,
                total_replied=total_replied,
                reply_rate=reply_rate,
                created_at=seq.created_at,
            )
        )

    return items


# ---------------------------------------------------------------------------
# 2. Get sequence
# ---------------------------------------------------------------------------


@router.get("/{seq_id}", response_model=SequenceResponse)
async def get_sequence(
    seq_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> SequenceResponse:
    """Get a single sequence with all active steps."""
    seq = _get_sequence_or_404(db, seq_id, current_user.id)

    # Eagerly load only active steps
    active_steps = (
        db.query(SequenceStep)
        .filter(
            SequenceStep.sequence_id == seq.id,
            SequenceStep.deleted_at.is_(None),
        )
        .order_by(SequenceStep.step_order)
        .all()
    )

    result = SequenceResponse.model_validate(seq)
    result.steps = [StepResponse.model_validate(s) for s in active_steps]
    return result


# ---------------------------------------------------------------------------
# 3. Create sequence
# ---------------------------------------------------------------------------


@router.post("/", response_model=SequenceResponse, status_code=201)
async def create_sequence(
    body: CreateSequenceRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> SequenceResponse:
    """Create a new sequence, optionally with inline steps."""
    seq = Sequence(
        created_by=current_user.id,
        name=body.name,
        description=body.description,
        stop_on_reply=body.stop_on_reply,
        stop_on_deal_created=body.stop_on_deal_created,
        status="active",
        total_enrolled=0,
        total_completed=0,
        total_replied=0,
    )
    db.add(seq)
    db.flush()  # get seq.id before creating steps

    steps = []
    for i, step_req in enumerate(body.steps, start=1):
        step = SequenceStep(
            sequence_id=seq.id,
            step_order=i,
            channel=step_req.channel,
            delay_days=step_req.delay_days,
            delay_hours=step_req.delay_hours,
            subject=step_req.subject,
            body_template=step_req.body_template,
        )
        db.add(step)
        steps.append(step)

    db.commit()
    db.refresh(seq)
    for s in steps:
        db.refresh(s)

    track_event(current_user.id, "sequence_created", {"sequence_id": str(seq.id), "step_count": len(steps)})

    result = SequenceResponse.model_validate(seq)
    result.steps = [StepResponse.model_validate(s) for s in steps]
    return result


# ---------------------------------------------------------------------------
# 4. Update sequence
# ---------------------------------------------------------------------------


@router.patch("/{seq_id}", response_model=SequenceResponse)
async def update_sequence(
    seq_id: UUID,
    body: UpdateSequenceRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> SequenceResponse:
    """Update sequence metadata or status."""
    seq = _get_sequence_or_404(db, seq_id, current_user.id)
    old_status = seq.status

    if body.status is not None and body.status not in _VALID_STATUSES:
        raise HTTPException(
            status_code=422,
            detail={"error": f"Invalid status. Must be one of: {', '.join(_VALID_STATUSES)}", "code": "INVALID_STATUS"},
        )

    if body.name is not None:
        seq.name = body.name
    if body.description is not None:
        seq.description = body.description
    if body.status is not None:
        seq.status = body.status
    if body.stop_on_reply is not None:
        seq.stop_on_reply = body.stop_on_reply
    if body.stop_on_deal_created is not None:
        seq.stop_on_deal_created = body.stop_on_deal_created

    # Handle enrollment status transitions when the sequence status changes
    if body.status and body.status != old_status:
        if body.status == "paused":
            # Pause all active enrollments
            db.query(SequenceEnrollment).filter(
                SequenceEnrollment.sequence_id == seq_id,
                SequenceEnrollment.status == "active",
                SequenceEnrollment.deleted_at.is_(None),
            ).update(
                {SequenceEnrollment.status: "paused", SequenceEnrollment.next_send_at: None},
                synchronize_session="fetch",
            )
        elif body.status == "active" and old_status == "paused":
            # Resume paused enrollments — schedule to send ASAP
            paused = (
                db.query(SequenceEnrollment)
                .filter(
                    SequenceEnrollment.sequence_id == seq_id,
                    SequenceEnrollment.status == "paused",
                    SequenceEnrollment.deleted_at.is_(None),
                )
                .all()
            )
            for enrollment in paused:
                enrollment.status = "active"
                enrollment.next_send_at = datetime.utcnow()

    db.commit()
    db.refresh(seq)

    active_steps = (
        db.query(SequenceStep)
        .filter(SequenceStep.sequence_id == seq.id, SequenceStep.deleted_at.is_(None))
        .order_by(SequenceStep.step_order)
        .all()
    )
    result = SequenceResponse.model_validate(seq)
    result.steps = [StepResponse.model_validate(s) for s in active_steps]
    return result


# ---------------------------------------------------------------------------
# 5. Delete sequence (soft)
# ---------------------------------------------------------------------------


@router.delete("/{seq_id}", status_code=204)
async def delete_sequence(
    seq_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    """Soft-delete a sequence."""
    seq = _get_sequence_or_404(db, seq_id, current_user.id)
    seq.deleted_at = datetime.utcnow()

    # Stop all active/paused enrollments when the sequence is deleted
    db.query(SequenceEnrollment).filter(
        SequenceEnrollment.sequence_id == seq_id,
        SequenceEnrollment.status.in_(["active", "paused"]),
        SequenceEnrollment.deleted_at.is_(None),
    ).update(
        {
            SequenceEnrollment.status: "stopped",
            SequenceEnrollment.stopped_at: datetime.utcnow(),
            SequenceEnrollment.stopped_reason: "sequence_deleted",
            SequenceEnrollment.next_send_at: None,
        },
        synchronize_session="fetch",
    )

    db.commit()


# ---------------------------------------------------------------------------
# 6. Add step
# ---------------------------------------------------------------------------


@router.post("/{seq_id}/steps", response_model=StepResponse, status_code=201)
async def add_step(
    seq_id: UUID,
    body: SequenceStepRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> StepResponse:
    """Add a step to a sequence. Auto-assigns step_order."""
    _get_sequence_or_404(db, seq_id, current_user.id)

    max_order = (
        db.query(func.max(SequenceStep.step_order))
        .filter(
            SequenceStep.sequence_id == seq_id,
            SequenceStep.deleted_at.is_(None),
        )
        .scalar()
        or 0
    )

    step = SequenceStep(
        sequence_id=seq_id,
        step_order=max_order + 1,
        channel=body.channel,
        delay_days=body.delay_days,
        delay_hours=body.delay_hours,
        subject=body.subject,
        body_template=body.body_template,
    )
    db.add(step)
    db.commit()
    db.refresh(step)

    track_event(current_user.id, "sequence_step_added", {"sequence_id": str(seq_id), "step_order": step.step_order})

    return StepResponse.model_validate(step)


# ---------------------------------------------------------------------------
# 7. Update step
# ---------------------------------------------------------------------------


@router.patch("/{seq_id}/steps/{step_id}", response_model=StepResponse)
async def update_step(
    seq_id: UUID,
    step_id: UUID,
    body: UpdateStepRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> StepResponse:
    """Update fields on a sequence step."""
    step = _get_step_or_404(db, step_id, seq_id, current_user.id)

    if body.channel is not None:
        step.channel = body.channel
    if body.delay_days is not None:
        step.delay_days = body.delay_days
    if body.delay_hours is not None:
        step.delay_hours = body.delay_hours
    if body.subject is not None:
        step.subject = body.subject
    if body.body_template is not None:
        step.body_template = body.body_template

    db.commit()
    db.refresh(step)
    return StepResponse.model_validate(step)


# ---------------------------------------------------------------------------
# 8. Delete step (soft) and reorder
# ---------------------------------------------------------------------------


@router.delete("/{seq_id}/steps/{step_id}", status_code=204)
async def delete_step(
    seq_id: UUID,
    step_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    """Soft-delete a step and reorder remaining active steps."""
    step = _get_step_or_404(db, step_id, seq_id, current_user.id)
    step.deleted_at = datetime.utcnow()
    db.flush()

    # Reorder remaining active steps
    remaining = (
        db.query(SequenceStep)
        .filter(
            SequenceStep.sequence_id == seq_id,
            SequenceStep.deleted_at.is_(None),
        )
        .order_by(SequenceStep.step_order)
        .all()
    )
    for i, s in enumerate(remaining, start=1):
        s.step_order = i

    db.commit()


# ---------------------------------------------------------------------------
# 9. Enroll contact
# ---------------------------------------------------------------------------


@router.post("/{seq_id}/enroll", response_model=EnrollmentResponse, status_code=201)
async def enroll_contact(
    seq_id: UUID,
    body: EnrollRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> EnrollmentResponse:
    """Enroll a single contact in a sequence."""
    # Validate contact ownership
    contact = (
        db.query(Contact)
        .filter(
            Contact.id == body.contact_id,
            Contact.created_by == current_user.id,
            Contact.is_deleted == False,  # noqa: E712
        )
        .first()
    )
    if not contact:
        raise HTTPException(
            status_code=404,
            detail={"error": "Contact not found", "code": "NOT_FOUND"},
        )

    # Validate deal and property ownership to prevent cross-tenant access
    if body.deal_id is not None:
        deal = db.query(Deal).filter(Deal.id == body.deal_id, Deal.user_id == current_user.id, Deal.deleted_at.is_(None)).first()
        if not deal:
            raise HTTPException(status_code=404, detail={"error": "Deal not found", "code": "DEAL_NOT_FOUND"})
    if body.property_id is not None:
        prop = db.query(Property).filter(Property.id == body.property_id, Property.created_by == current_user.id, Property.is_deleted == False).first()  # noqa: E712
        if not prop:
            raise HTTPException(status_code=404, detail={"error": "Property not found", "code": "PROPERTY_NOT_FOUND"})

    service = _get_service(db)
    engine = SequenceEngine(db, service)

    try:
        enrollment = await engine.enroll(
            sequence_id=seq_id,
            contact_id=body.contact_id,
            user_id=current_user.id,
            property_id=body.property_id,
            deal_id=body.deal_id,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=422,
            detail={"error": str(exc), "code": "ENROLL_FAILED"},
        ) from exc

    track_event(current_user.id, "contact_enrolled", {"sequence_id": str(seq_id), "contact_id": str(body.contact_id)})

    contact_name = f"{contact.first_name} {contact.last_name or ''}".strip()
    result = EnrollmentResponse.model_validate(enrollment)
    result.contact_name = contact_name
    return result


# ---------------------------------------------------------------------------
# 10. Bulk enroll
# ---------------------------------------------------------------------------


@router.post("/{seq_id}/enroll-bulk")
async def bulk_enroll(
    seq_id: UUID,
    body: BulkEnrollRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    """Enroll up to 50 contacts in a sequence. Returns count enrolled and any errors."""
    # Validate deal and property ownership once before processing any contacts
    if body.deal_id is not None:
        deal = db.query(Deal).filter(Deal.id == body.deal_id, Deal.user_id == current_user.id, Deal.deleted_at.is_(None)).first()
        if not deal:
            raise HTTPException(status_code=404, detail={"error": "Deal not found", "code": "DEAL_NOT_FOUND"})
    if body.property_id is not None:
        prop = db.query(Property).filter(Property.id == body.property_id, Property.created_by == current_user.id, Property.is_deleted == False).first()  # noqa: E712
        if not prop:
            raise HTTPException(status_code=404, detail={"error": "Property not found", "code": "PROPERTY_NOT_FOUND"})

    service = _get_service(db)
    engine = SequenceEngine(db, service)

    enrolled = 0
    errors: list[str] = []

    for contact_id in body.contact_ids:
        # Validate contact ownership
        contact = (
            db.query(Contact)
            .filter(
                Contact.id == contact_id,
                Contact.created_by == current_user.id,
                Contact.is_deleted == False,  # noqa: E712
            )
            .first()
        )
        if not contact:
            errors.append(f"{contact_id}: contact not found")
            continue

        try:
            await engine.enroll(
                sequence_id=seq_id,
                contact_id=contact_id,
                user_id=current_user.id,
                property_id=body.property_id,
                deal_id=body.deal_id,
            )
            enrolled += 1
            track_event(current_user.id, "contact_enrolled", {"sequence_id": str(seq_id), "contact_id": str(contact_id)})
        except ValueError as exc:
            errors.append(f"{contact_id}: {exc}")

    return {"enrolled": enrolled, "errors": errors}


# ---------------------------------------------------------------------------
# 11. Stop enrollment
# ---------------------------------------------------------------------------


@router.delete("/{seq_id}/enrollments/{enrollment_id}", status_code=204)
async def stop_enrollment(
    seq_id: UUID,
    enrollment_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    """Manually stop a contact's enrollment in a sequence."""
    # Validate sequence ownership
    _get_sequence_or_404(db, seq_id, current_user.id)

    enrollment = (
        db.query(SequenceEnrollment)
        .filter(
            SequenceEnrollment.id == enrollment_id,
            SequenceEnrollment.sequence_id == seq_id,
            SequenceEnrollment.deleted_at.is_(None),
        )
        .first()
    )
    if not enrollment:
        raise HTTPException(
            status_code=404,
            detail={"error": "Enrollment not found", "code": "NOT_FOUND"},
        )

    now = datetime.utcnow()
    enrollment.status = "stopped"
    enrollment.stopped_at = now
    enrollment.stopped_reason = "manual"
    enrollment.next_send_at = None
    db.commit()


# ---------------------------------------------------------------------------
# 12. List enrollments
# ---------------------------------------------------------------------------


@router.get("/{seq_id}/enrollments", response_model=list[EnrollmentResponse])
async def list_enrollments(
    seq_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[EnrollmentResponse]:
    """List all enrollments for a sequence with contact names."""
    _get_sequence_or_404(db, seq_id, current_user.id)

    enrollments = (
        db.query(SequenceEnrollment)
        .filter(
            SequenceEnrollment.sequence_id == seq_id,
            SequenceEnrollment.deleted_at.is_(None),
        )
        .order_by(SequenceEnrollment.enrolled_at.desc())
        .all()
    )

    results = []
    for enrollment in enrollments:
        contact = db.query(Contact).filter(Contact.id == enrollment.contact_id).first()
        contact_name = ""
        if contact:
            contact_name = f"{contact.first_name} {contact.last_name or ''}".strip()
        item = EnrollmentResponse.model_validate(enrollment)
        item.contact_name = contact_name
        results.append(item)

    return results


# ---------------------------------------------------------------------------
# 13. Analytics
# ---------------------------------------------------------------------------


@router.get("/{seq_id}/analytics", response_model=SequenceAnalytics)
async def get_analytics(
    seq_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> SequenceAnalytics:
    """Get enrollment analytics for a sequence."""
    _get_sequence_or_404(db, seq_id, current_user.id)

    rows = (
        db.query(SequenceEnrollment.status, func.count(SequenceEnrollment.id))
        .filter(
            SequenceEnrollment.sequence_id == seq_id,
            SequenceEnrollment.deleted_at.is_(None),
        )
        .group_by(SequenceEnrollment.status)
        .all()
    )

    counts: dict[str, int] = {row[0]: row[1] for row in rows}

    total_enrolled = sum(counts.values())
    active = counts.get("active", 0)
    completed = counts.get("completed", 0)
    replied = counts.get("replied", 0)
    stopped = counts.get("stopped", 0)
    failed = counts.get("failed", 0)

    reply_rate = (replied / total_enrolled * 100) if total_enrolled > 0 else 0.0
    completion_rate = (completed / total_enrolled * 100) if total_enrolled > 0 else 0.0

    return SequenceAnalytics(
        total_enrolled=total_enrolled,
        active=active,
        completed=completed,
        replied=replied,
        stopped=stopped,
        failed=failed,
        reply_rate=reply_rate,
        completion_rate=completion_rate,
    )


# ---------------------------------------------------------------------------
# 14. Internal cron endpoint
# ---------------------------------------------------------------------------


@internal_router.post("/internal/process-sequences")
async def process_sequences(request: Request, db: Session = Depends(get_db)) -> dict:
    """Cron endpoint — process all due sequence enrollments.

    Requires X-Internal-Key header matching INTERNAL_API_KEY env var.
    """
    internal_key = os.getenv("INTERNAL_API_KEY", "")
    provided_key = request.headers.get("X-Internal-Key", "")

    if not internal_key or not hmac.compare_digest(provided_key, internal_key):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error": "Invalid or missing internal API key", "code": "UNAUTHORIZED"},
        )

    service = _get_service(db)
    engine = SequenceEngine(db, service)

    try:
        processed = await engine.process_due_enrollments()
    except Exception as exc:
        logger.error("process_due_enrollments failed: %s", exc)
        raise HTTPException(
            status_code=500,
            detail={"error": "Processing failed", "code": "INTERNAL_ERROR"},
        ) from exc

    logger.info("process-sequences: processed %d enrollments", processed)
    return {"processed": processed}
