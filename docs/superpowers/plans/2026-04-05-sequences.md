# Sequences Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build automated multi-step follow-up sequences: models, engine, processing endpoint, reply handling, CRUD router, list/builder pages, and contact enrollment UI.

**Architecture:** Three models (Sequence, SequenceStep, SequenceEnrollment) → SequenceEngine (enroll, process, execute, handle_reply, render_template) → sequences router (14 endpoints) + internal cron endpoint → frontend list page + builder page + enrollment integration.

**Tech Stack:** FastAPI, SQLAlchemy, Pydantic, React 18, TypeScript, TanStack React Query, Tailwind CSS

---

### Task 1: Sequence Models + Migration

**Files:**
- Create: `backend/models/sequences.py`
- Modify: `backend/models/__init__.py`
- Create: `backend/alembic/versions/o5p6q7r8s9t0_add_sequences.py`

- [ ] **Step 1: Create models**

```python
# backend/models/sequences.py
"""Sequence models — automated multi-step follow-up campaigns."""

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from database import Base
from models.base import TimestampMixin


class Sequence(TimestampMixin, Base):
    """A reusable follow-up sequence template."""

    __tablename__ = "sequences"

    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    team_id = Column(UUID(as_uuid=True), ForeignKey("teams.id"), nullable=True)

    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    status = Column(String, nullable=False, default="active")
    # active | paused | archived

    trigger_type = Column(String, nullable=True, default="manual")
    # manual | new_lead | stage_change | stale_deal

    stop_on_reply = Column(Boolean, default=True, nullable=False)
    stop_on_deal_created = Column(Boolean, default=False, nullable=False)

    total_enrolled = Column(Integer, default=0, nullable=False)
    total_completed = Column(Integer, default=0, nullable=False)
    total_replied = Column(Integer, default=0, nullable=False)

    deleted_at = Column(DateTime, nullable=True)

    # Relationships
    steps = relationship(
        "SequenceStep",
        back_populates="sequence",
        cascade="all, delete-orphan",
        order_by="SequenceStep.step_order",
    )
    enrollments = relationship("SequenceEnrollment", back_populates="sequence")


class SequenceStep(TimestampMixin, Base):
    """A single step in a sequence — one message to send."""

    __tablename__ = "sequence_steps"

    sequence_id = Column(UUID(as_uuid=True), ForeignKey("sequences.id"), nullable=False, index=True)

    step_order = Column(Integer, nullable=False)  # 1, 2, 3...
    channel = Column(String, nullable=False)  # sms | email
    delay_days = Column(Integer, nullable=False, default=0)
    delay_hours = Column(Integer, nullable=False, default=0)

    subject = Column(String, nullable=True)  # email subject template
    body_template = Column(Text, nullable=False)  # {{first_name}}, {{property_address}}, etc.

    deleted_at = Column(DateTime, nullable=True)

    # Relationships
    sequence = relationship("Sequence", back_populates="steps")


class SequenceEnrollment(TimestampMixin, Base):
    """A contact enrolled in a sequence — tracks progress through steps."""

    __tablename__ = "sequence_enrollments"

    sequence_id = Column(UUID(as_uuid=True), ForeignKey("sequences.id"), nullable=False, index=True)
    contact_id = Column(UUID(as_uuid=True), ForeignKey("contacts.id"), nullable=False, index=True)
    property_id = Column(UUID(as_uuid=True), ForeignKey("properties.id"), nullable=True)
    deal_id = Column(UUID(as_uuid=True), ForeignKey("deals.id"), nullable=True)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)

    status = Column(String, nullable=False, default="active")
    # active | completed | replied | stopped | failed
    current_step = Column(Integer, nullable=False, default=0)  # last executed step (0 = not started)
    next_send_at = Column(DateTime, nullable=True, index=True)

    enrolled_at = Column(DateTime, server_default=func.now(), nullable=False)
    completed_at = Column(DateTime, nullable=True)
    stopped_at = Column(DateTime, nullable=True)
    stopped_reason = Column(String, nullable=True)
    # reply_received | manual | deal_created | unsubscribed

    deleted_at = Column(DateTime, nullable=True)

    # Relationships
    sequence = relationship("Sequence", back_populates="enrollments")
    contact = relationship("Contact")
```

- [ ] **Step 2: Register in `__init__.py`**

Add after the BuyerPacket imports:
```python
from models.sequences import Sequence, SequenceStep, SequenceEnrollment
```
Add to `__all__`: `"Sequence"`, `"SequenceStep"`, `"SequenceEnrollment"`

- [ ] **Step 3: Create migration**

```python
# backend/alembic/versions/o5p6q7r8s9t0_add_sequences.py
"""Add sequences, sequence_steps, and sequence_enrollments tables.

Revision ID: o5p6q7r8s9t0
Revises: n4o5p6q7r8s9
Create Date: 2026-04-05
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision = "o5p6q7r8s9t0"
down_revision = "n4o5p6q7r8s9"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "sequences",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("created_by", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("team_id", UUID(as_uuid=True), sa.ForeignKey("teams.id"), nullable=True),
        sa.Column("name", sa.String, nullable=False),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("status", sa.String, nullable=False, server_default="active"),
        sa.Column("trigger_type", sa.String, nullable=True, server_default="manual"),
        sa.Column("stop_on_reply", sa.Boolean, nullable=False, server_default=sa.text("true")),
        sa.Column("stop_on_deal_created", sa.Boolean, nullable=False, server_default=sa.text("false")),
        sa.Column("total_enrolled", sa.Integer, nullable=False, server_default=sa.text("0")),
        sa.Column("total_completed", sa.Integer, nullable=False, server_default=sa.text("0")),
        sa.Column("total_replied", sa.Integer, nullable=False, server_default=sa.text("0")),
        sa.Column("deleted_at", sa.DateTime, nullable=True),
        sa.Column("created_at", sa.DateTime, nullable=False),
        sa.Column("updated_at", sa.DateTime, nullable=False),
    )
    op.create_index("ix_sequences_created_by", "sequences", ["created_by"])

    op.create_table(
        "sequence_steps",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("sequence_id", UUID(as_uuid=True), sa.ForeignKey("sequences.id"), nullable=False),
        sa.Column("step_order", sa.Integer, nullable=False),
        sa.Column("channel", sa.String, nullable=False),
        sa.Column("delay_days", sa.Integer, nullable=False, server_default=sa.text("0")),
        sa.Column("delay_hours", sa.Integer, nullable=False, server_default=sa.text("0")),
        sa.Column("subject", sa.String, nullable=True),
        sa.Column("body_template", sa.Text, nullable=False),
        sa.Column("deleted_at", sa.DateTime, nullable=True),
        sa.Column("created_at", sa.DateTime, nullable=False),
        sa.Column("updated_at", sa.DateTime, nullable=False),
    )
    op.create_index("ix_sequence_steps_sequence_id", "sequence_steps", ["sequence_id"])

    op.create_table(
        "sequence_enrollments",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("sequence_id", UUID(as_uuid=True), sa.ForeignKey("sequences.id"), nullable=False),
        sa.Column("contact_id", UUID(as_uuid=True), sa.ForeignKey("contacts.id"), nullable=False),
        sa.Column("property_id", UUID(as_uuid=True), sa.ForeignKey("properties.id"), nullable=True),
        sa.Column("deal_id", UUID(as_uuid=True), sa.ForeignKey("deals.id"), nullable=True),
        sa.Column("created_by", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("status", sa.String, nullable=False, server_default="active"),
        sa.Column("current_step", sa.Integer, nullable=False, server_default=sa.text("0")),
        sa.Column("next_send_at", sa.DateTime, nullable=True),
        sa.Column("enrolled_at", sa.DateTime, nullable=False, server_default=sa.func.now()),
        sa.Column("completed_at", sa.DateTime, nullable=True),
        sa.Column("stopped_at", sa.DateTime, nullable=True),
        sa.Column("stopped_reason", sa.String, nullable=True),
        sa.Column("deleted_at", sa.DateTime, nullable=True),
        sa.Column("created_at", sa.DateTime, nullable=False),
        sa.Column("updated_at", sa.DateTime, nullable=False),
    )
    op.create_index("ix_sequence_enrollments_sequence_id", "sequence_enrollments", ["sequence_id"])
    op.create_index("ix_sequence_enrollments_contact_id", "sequence_enrollments", ["contact_id"])
    op.create_index("ix_sequence_enrollments_next_send_at", "sequence_enrollments", ["next_send_at"])


def downgrade() -> None:
    op.drop_table("sequence_enrollments")
    op.drop_table("sequence_steps")
    op.drop_table("sequences")
```

- [ ] **Step 4: Verify**

Run: `cd /Users/ivanflores/parcel-platform/backend && python3 -c "import ast; ast.parse(open('models/sequences.py').read()); print('OK')"`

- [ ] **Step 5: Commit**

```bash
git add backend/models/sequences.py backend/models/__init__.py backend/alembic/versions/o5p6q7r8s9t0_add_sequences.py
git commit -m "feat: Sequence, SequenceStep, SequenceEnrollment models with migration"
```

---

### Task 2: Sequence Engine

**Files:**
- Create: `backend/core/communications/sequence_engine.py`
- Modify: `backend/core/communications/service.py`

- [ ] **Step 1: Create the sequence engine**

```python
# backend/core/communications/sequence_engine.py
"""Sequence engine — enroll contacts, process due steps, handle replies."""

from __future__ import annotations

import re
from datetime import datetime, timedelta
from typing import Any
from uuid import UUID

from sqlalchemy.orm import Session

from core.communications.service import CommunicationService
from models.contacts import Contact
from models.properties import Property
from models.sequences import Sequence, SequenceEnrollment, SequenceStep
from models.users import User


class SequenceEngine:
    """Stateless engine for sequence operations. Instantiated per request."""

    def __init__(self, db: Session, comm_service: CommunicationService) -> None:
        self.db = db
        self.comm = comm_service

    # ------------------------------------------------------------------
    # Enroll
    # ------------------------------------------------------------------

    async def enroll(
        self,
        sequence_id: UUID,
        contact_id: UUID,
        user_id: UUID,
        team_id: UUID | None = None,
        property_id: UUID | None = None,
        deal_id: UUID | None = None,
    ) -> SequenceEnrollment:
        """Enroll a contact in a sequence."""
        seq = self.db.query(Sequence).filter(
            Sequence.id == sequence_id,
            Sequence.created_by == user_id,
            Sequence.deleted_at.is_(None),
        ).first()
        if not seq:
            raise ValueError("Sequence not found")
        if seq.status != "active":
            raise ValueError("Sequence is not active")

        # Check not already enrolled
        existing = self.db.query(SequenceEnrollment).filter(
            SequenceEnrollment.sequence_id == sequence_id,
            SequenceEnrollment.contact_id == contact_id,
            SequenceEnrollment.status == "active",
            SequenceEnrollment.deleted_at.is_(None),
        ).first()
        if existing:
            raise ValueError("Contact is already enrolled in this sequence")

        # Get first step
        first_step = self.db.query(SequenceStep).filter(
            SequenceStep.sequence_id == sequence_id,
            SequenceStep.deleted_at.is_(None),
        ).order_by(SequenceStep.step_order.asc()).first()

        next_send = None
        if first_step:
            next_send = datetime.utcnow() + timedelta(
                days=first_step.delay_days, hours=first_step.delay_hours
            )

        enrollment = SequenceEnrollment(
            sequence_id=sequence_id,
            contact_id=contact_id,
            property_id=property_id,
            deal_id=deal_id,
            created_by=user_id,
            status="active",
            current_step=0,
            next_send_at=next_send,
        )
        self.db.add(enrollment)

        seq.total_enrolled = (seq.total_enrolled or 0) + 1
        self.db.commit()
        self.db.refresh(enrollment)
        return enrollment

    # ------------------------------------------------------------------
    # Process
    # ------------------------------------------------------------------

    async def process_due_enrollments(self) -> int:
        """Find and execute all due enrollment steps. Returns count processed."""
        now = datetime.utcnow()
        due = (
            self.db.query(SequenceEnrollment)
            .filter(
                SequenceEnrollment.status == "active",
                SequenceEnrollment.next_send_at <= now,
                SequenceEnrollment.deleted_at.is_(None),
            )
            .all()
        )

        processed = 0
        for enrollment in due:
            try:
                await self.execute_step(enrollment)
                processed += 1
            except Exception:
                enrollment.status = "failed"
                self.db.commit()

        return processed

    async def execute_step(self, enrollment: SequenceEnrollment) -> None:
        """Execute the next step for an enrollment."""
        # Get active steps ordered
        steps = (
            self.db.query(SequenceStep)
            .filter(
                SequenceStep.sequence_id == enrollment.sequence_id,
                SequenceStep.deleted_at.is_(None),
            )
            .order_by(SequenceStep.step_order.asc())
            .all()
        )

        next_step_idx = enrollment.current_step  # 0-based index into ordered steps
        if next_step_idx >= len(steps):
            # No more steps — mark completed
            self._complete_enrollment(enrollment)
            return

        step = steps[next_step_idx]

        # Load context
        contact = self.db.query(Contact).filter(Contact.id == enrollment.contact_id).first()
        if not contact:
            enrollment.status = "failed"
            self.db.commit()
            return

        prop = None
        if enrollment.property_id:
            prop = self.db.query(Property).filter(Property.id == enrollment.property_id).first()

        user = self.db.query(User).filter(User.id == enrollment.created_by).first()

        context = self._build_context(contact, prop, user)
        rendered_body = self.render_template(step.body_template, context)
        rendered_subject = self.render_template(step.subject or "", context) if step.subject else None

        # Send
        if step.channel == "sms":
            if not contact.phone:
                enrollment.status = "failed"
                self.db.commit()
                return
            await self.comm.send_sms(
                to_phone=contact.phone,
                body=rendered_body,
                from_user_id=enrollment.created_by,
                team_id=contact.team_id,
                contact_id=contact.id,
                deal_id=enrollment.deal_id,
                property_id=enrollment.property_id,
            )
        elif step.channel == "email":
            if not contact.email:
                enrollment.status = "failed"
                self.db.commit()
                return
            await self.comm.send_email(
                to_email=contact.email,
                subject=rendered_subject or "Follow-up",
                body_html=f"<p>{rendered_body}</p>",
                body_text=rendered_body,
                from_user_id=enrollment.created_by,
                team_id=contact.team_id,
                contact_id=contact.id,
                deal_id=enrollment.deal_id,
                property_id=enrollment.property_id,
            )

        # Advance
        enrollment.current_step += 1

        # Calculate next step
        if enrollment.current_step < len(steps):
            next_step = steps[enrollment.current_step]
            enrollment.next_send_at = datetime.utcnow() + timedelta(
                days=next_step.delay_days, hours=next_step.delay_hours
            )
        else:
            self._complete_enrollment(enrollment)
            return

        self.db.commit()

    # ------------------------------------------------------------------
    # Reply handling
    # ------------------------------------------------------------------

    def handle_reply(self, contact_id: UUID, user_id: UUID) -> int:
        """Stop active enrollments for a contact when a reply is received."""
        enrollments = (
            self.db.query(SequenceEnrollment)
            .join(Sequence, Sequence.id == SequenceEnrollment.sequence_id)
            .filter(
                SequenceEnrollment.contact_id == contact_id,
                SequenceEnrollment.status == "active",
                SequenceEnrollment.deleted_at.is_(None),
                Sequence.stop_on_reply == True,  # noqa: E712
                Sequence.created_by == user_id,
            )
            .all()
        )

        count = 0
        for enrollment in enrollments:
            enrollment.status = "replied"
            enrollment.stopped_at = datetime.utcnow()
            enrollment.stopped_reason = "reply_received"
            enrollment.next_send_at = None

            seq = self.db.query(Sequence).filter(Sequence.id == enrollment.sequence_id).first()
            if seq:
                seq.total_replied = (seq.total_replied or 0) + 1

            count += 1

        if count > 0:
            self.db.commit()

        return count

    # ------------------------------------------------------------------
    # Template rendering
    # ------------------------------------------------------------------

    def render_template(self, template: str, context: dict) -> str:
        """Replace {{variable}} placeholders with context values."""
        def replacer(match: re.Match) -> str:
            key = match.group(1).strip()
            return str(context.get(key, f"{{{{{key}}}}}"))

        return re.sub(r"\{\{(\s*\w+\s*)\}\}", replacer, template)

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    def _build_context(
        self,
        contact: Contact,
        prop: Property | None,
        user: User | None,
    ) -> dict[str, str]:
        return {
            "first_name": contact.first_name or "",
            "last_name": contact.last_name or "",
            "full_name": " ".join(filter(None, [contact.first_name, contact.last_name])),
            "property_address": prop.address_line1 if prop else "",
            "property_city": prop.city if prop else "",
            "property_state": prop.state if prop else "",
            "asking_price": "",
            "arv": "",
            "cash_flow": "",
            "sender_name": user.name if user else "",
            "sender_phone": "",
            "sender_company": "",
        }

    def _complete_enrollment(self, enrollment: SequenceEnrollment) -> None:
        enrollment.status = "completed"
        enrollment.completed_at = datetime.utcnow()
        enrollment.next_send_at = None

        seq = self.db.query(Sequence).filter(Sequence.id == enrollment.sequence_id).first()
        if seq:
            seq.total_completed = (seq.total_completed or 0) + 1

        self.db.commit()
```

- [ ] **Step 2: Add reply handling to CommunicationService**

In `backend/core/communications/service.py`, in both `handle_incoming_sms()` and `handle_incoming_email()`, after `self.db.refresh(comm)` and before `return comm`, add:

```python
        # Stop active sequences on reply
        if contact:
            try:
                from core.communications.sequence_engine import SequenceEngine
                engine = SequenceEngine(self.db, self)
                engine.handle_reply(contact.id, contact.created_by)
            except Exception:
                pass  # don't fail inbound handling if sequence engine errors
```

- [ ] **Step 3: Verify**

Run: `cd /Users/ivanflores/parcel-platform/backend && python3 -c "import ast; ast.parse(open('core/communications/sequence_engine.py').read()); ast.parse(open('core/communications/service.py').read()); print('OK')"`

- [ ] **Step 4: Commit**

```bash
git add backend/core/communications/sequence_engine.py backend/core/communications/service.py
git commit -m "feat: SequenceEngine — enroll, process due, execute steps, handle replies, template rendering"
```

---

### Task 3: Sequence Schemas + Router

**Files:**
- Create: `backend/schemas/sequences.py`
- Create: `backend/routers/sequences.py`
- Modify: `backend/main.py`
- Modify: `backend/.env.example`

- [ ] **Step 1: Create schemas**

```python
# backend/schemas/sequences.py
"""Pydantic schemas for sequence CRUD and enrollment endpoints."""

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field


class SequenceStepRequest(BaseModel):
    channel: str = Field(..., pattern="^(sms|email)$")
    delay_days: int = Field(0, ge=0)
    delay_hours: int = Field(0, ge=0)
    subject: Optional[str] = None
    body_template: str = Field(..., min_length=1)


class UpdateStepRequest(BaseModel):
    channel: Optional[str] = None
    delay_days: Optional[int] = Field(None, ge=0)
    delay_hours: Optional[int] = Field(None, ge=0)
    subject: Optional[str] = None
    body_template: Optional[str] = None


class CreateSequenceRequest(BaseModel):
    name: str = Field(..., min_length=1)
    description: Optional[str] = None
    stop_on_reply: bool = True
    stop_on_deal_created: bool = False
    steps: list[SequenceStepRequest] = []


class UpdateSequenceRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    stop_on_reply: Optional[bool] = None
    stop_on_deal_created: Optional[bool] = None


class StepResponse(BaseModel):
    model_config = {"from_attributes": True}
    id: UUID
    sequence_id: UUID
    step_order: int
    channel: str
    delay_days: int
    delay_hours: int
    subject: Optional[str] = None
    body_template: str
    created_at: datetime


class SequenceResponse(BaseModel):
    model_config = {"from_attributes": True}
    id: UUID
    name: str
    description: Optional[str] = None
    status: str
    trigger_type: Optional[str] = None
    stop_on_reply: bool
    stop_on_deal_created: bool
    total_enrolled: int
    total_completed: int
    total_replied: int
    steps: list[StepResponse] = []
    created_at: datetime
    updated_at: datetime


class SequenceListItem(BaseModel):
    id: UUID
    name: str
    description: Optional[str] = None
    status: str
    step_count: int = 0
    total_enrolled: int = 0
    total_completed: int = 0
    total_replied: int = 0
    reply_rate: float = 0.0
    created_at: datetime


class EnrollRequest(BaseModel):
    contact_id: UUID
    property_id: Optional[UUID] = None
    deal_id: Optional[UUID] = None


class BulkEnrollRequest(BaseModel):
    contact_ids: list[UUID] = Field(..., max_length=50)
    property_id: Optional[UUID] = None
    deal_id: Optional[UUID] = None


class EnrollmentResponse(BaseModel):
    model_config = {"from_attributes": True}
    id: UUID
    sequence_id: UUID
    contact_id: UUID
    property_id: Optional[UUID] = None
    deal_id: Optional[UUID] = None
    status: str
    current_step: int
    next_send_at: Optional[datetime] = None
    enrolled_at: datetime
    completed_at: Optional[datetime] = None
    stopped_at: Optional[datetime] = None
    stopped_reason: Optional[str] = None
    contact_name: str = ""


class SequenceAnalytics(BaseModel):
    total_enrolled: int = 0
    active: int = 0
    completed: int = 0
    replied: int = 0
    stopped: int = 0
    failed: int = 0
    reply_rate: float = 0.0
    completion_rate: float = 0.0
```

- [ ] **Step 2: Create sequences router**

Create `backend/routers/sequences.py` with these 14 endpoints:

1. `GET /sequences` — list user's sequences with step_count and reply_rate
2. `GET /sequences/{id}` — full sequence with steps
3. `POST /sequences` — create sequence with optional inline steps
4. `PATCH /sequences/{id}` — update metadata/status
5. `DELETE /sequences/{id}` — soft delete
6. `POST /sequences/{id}/steps` — add a step (auto-assign step_order)
7. `PATCH /sequences/{id}/steps/{step_id}` — update step
8. `DELETE /sequences/{id}/steps/{step_id}` — soft delete + reorder remaining
9. `POST /sequences/{id}/enroll` — enroll single contact via SequenceEngine
10. `POST /sequences/{id}/enroll-bulk` — enroll multiple contacts (max 50)
11. `DELETE /sequences/{id}/enrollments/{enrollment_id}` — stop enrollment manually
12. `GET /sequences/{id}/enrollments` — list enrollments with contact names
13. `GET /sequences/{id}/analytics` — aggregate stats
14. `POST /internal/process-sequences` — cron endpoint, validated by X-Internal-Key header

Router prefix: `/sequences`, tags: `["sequences"]`

Important patterns:
- All endpoints except #14 require `get_current_user`
- #14 validates `X-Internal-Key` header against `INTERNAL_API_KEY` env var
- Ownership checks on all resources (sequence.created_by == current_user.id)
- Soft delete uses `deleted_at` column
- Step reorder on delete: after soft-deleting a step, reassign step_order 1,2,3... for remaining active steps
- Enroll validates: contact exists and belongs to user, sequence is active
- Bulk enroll: loop enroll, collect errors, return partial results
- Analytics: count enrollments by status, calculate reply_rate and completion_rate

For the internal process endpoint, register it separately on the router:
```python
@router.post("/internal/process-sequences")
async def process_sequences_cron(request: Request, db: Session = Depends(get_db)):
    internal_key = os.getenv("INTERNAL_API_KEY", "")
    if not internal_key or request.headers.get("X-Internal-Key") != internal_key:
        raise HTTPException(status_code=403, detail="Forbidden")
    # ... process ...
```

Wait — this won't work because the router prefix is `/sequences`. The internal endpoint should be at `/api/internal/process-sequences`. 

Better approach: put the internal endpoint on the communications router or create it as a separate mini-router. Actually simplest: add it to the sequences router but at a path that includes "internal":
- The router has prefix `/sequences`, so we can't put it at `/internal/...`
- Instead, register a second small router in main.py for internal endpoints

Create the internal endpoint directly in the sequences router file but on a separate `internal_router`:

```python
internal_router = APIRouter(tags=["internal"])

@internal_router.post("/internal/process-sequences")
async def process_sequences_cron(request: Request, db: Session = Depends(get_db)):
    ...
```

Register in main.py: `app.include_router(sequences.internal_router, prefix="/api")`

- [ ] **Step 3: Register in main.py**

Add import:
```python
from routers import sequences as seq_router  # noqa: E402
```

Add registrations:
```python
app.include_router(seq_router.router, prefix="/api")
app.include_router(seq_router.internal_router, prefix="/api")
```

- [ ] **Step 4: Add INTERNAL_API_KEY to .env.example**

```
# Internal cron endpoints
INTERNAL_API_KEY=generate-a-random-key-here
```

- [ ] **Step 5: Verify**

Run: `cd /Users/ivanflores/parcel-platform/backend && python3 -c "import ast; ast.parse(open('routers/sequences.py').read()); ast.parse(open('schemas/sequences.py').read()); print('OK')"`

- [ ] **Step 6: Commit**

```bash
git add backend/schemas/sequences.py backend/routers/sequences.py backend/main.py backend/.env.example
git commit -m "feat: sequences router (14 endpoints) + internal cron processing endpoint"
```

---

### Task 4: Frontend Types + API + Hooks

**Files:**
- Modify: `frontend/src/types/index.ts`
- Modify: `frontend/src/lib/api.ts`
- Create: `frontend/src/hooks/useSequences.ts`

- [ ] **Step 1: Add types**

Append to `frontend/src/types/index.ts`:

```typescript
// ---------------------------------------------------------------------------
// Sequence types
// ---------------------------------------------------------------------------

export interface SequenceStep {
  id: string
  sequence_id: string
  step_order: number
  channel: 'sms' | 'email'
  delay_days: number
  delay_hours: number
  subject: string | null
  body_template: string
  created_at: string
}

export interface SequenceListItem {
  id: string
  name: string
  description: string | null
  status: 'active' | 'paused' | 'archived'
  step_count: number
  total_enrolled: number
  total_completed: number
  total_replied: number
  reply_rate: number
  created_at: string
}

export interface SequenceDetail {
  id: string
  name: string
  description: string | null
  status: 'active' | 'paused' | 'archived'
  trigger_type: string
  stop_on_reply: boolean
  stop_on_deal_created: boolean
  total_enrolled: number
  total_completed: number
  total_replied: number
  steps: SequenceStep[]
  created_at: string
  updated_at: string
}

export interface CreateSequenceRequest {
  name: string
  description?: string
  stop_on_reply?: boolean
  stop_on_deal_created?: boolean
  steps?: { channel: 'sms' | 'email'; delay_days?: number; delay_hours?: number; subject?: string; body_template: string }[]
}

export interface UpdateSequenceRequest {
  name?: string
  description?: string
  status?: string
  stop_on_reply?: boolean
  stop_on_deal_created?: boolean
}

export interface SequenceEnrollment {
  id: string
  sequence_id: string
  contact_id: string
  property_id: string | null
  deal_id: string | null
  status: 'active' | 'completed' | 'replied' | 'stopped' | 'failed'
  current_step: number
  next_send_at: string | null
  enrolled_at: string
  completed_at: string | null
  stopped_at: string | null
  stopped_reason: string | null
  contact_name: string
}

export interface SequenceAnalytics {
  total_enrolled: number
  active: number
  completed: number
  replied: number
  stopped: number
  failed: number
  reply_rate: number
  completion_rate: number
}

export interface EnrollRequest {
  contact_id: string
  property_id?: string
  deal_id?: string
}

export interface BulkEnrollRequest {
  contact_ids: string[]
  property_id?: string
  deal_id?: string
}
```

- [ ] **Step 2: Add API namespace**

Add to `api` object in `frontend/src/lib/api.ts`:

```typescript
  sequences: {
    list: () => request<import('@/types').SequenceListItem[]>('/api/sequences'),
    get: (id: string) => request<import('@/types').SequenceDetail>(`/api/sequences/${id}`),
    create: (data: import('@/types').CreateSequenceRequest) =>
      request<import('@/types').SequenceDetail>('/api/sequences', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: import('@/types').UpdateSequenceRequest) =>
      request<import('@/types').SequenceDetail>(`/api/sequences/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id: string) => request<void>(`/api/sequences/${id}`, { method: 'DELETE' }),
    steps: {
      add: (seqId: string, data: { channel: string; delay_days?: number; delay_hours?: number; subject?: string; body_template: string }) =>
        request<import('@/types').SequenceStep>(`/api/sequences/${seqId}/steps`, { method: 'POST', body: JSON.stringify(data) }),
      update: (seqId: string, stepId: string, data: Record<string, unknown>) =>
        request<import('@/types').SequenceStep>(`/api/sequences/${seqId}/steps/${stepId}`, { method: 'PATCH', body: JSON.stringify(data) }),
      delete: (seqId: string, stepId: string) =>
        request<void>(`/api/sequences/${seqId}/steps/${stepId}`, { method: 'DELETE' }),
    },
    enroll: (seqId: string, data: import('@/types').EnrollRequest) =>
      request<import('@/types').SequenceEnrollment>(`/api/sequences/${seqId}/enroll`, { method: 'POST', body: JSON.stringify(data) }),
    enrollBulk: (seqId: string, data: import('@/types').BulkEnrollRequest) =>
      request<{ enrolled: number; errors: string[] }>(`/api/sequences/${seqId}/enroll-bulk`, { method: 'POST', body: JSON.stringify(data) }),
    stopEnrollment: (seqId: string, enrollmentId: string) =>
      request<void>(`/api/sequences/${seqId}/enrollments/${enrollmentId}`, { method: 'DELETE' }),
    enrollments: (seqId: string) =>
      request<{ enrollments: import('@/types').SequenceEnrollment[]; total: number }>(`/api/sequences/${seqId}/enrollments`),
    analytics: (seqId: string) =>
      request<import('@/types').SequenceAnalytics>(`/api/sequences/${seqId}/analytics`),
  },
```

- [ ] **Step 3: Create hooks**

```typescript
// frontend/src/hooks/useSequences.ts
/** Sequence CRUD, enrollment, and analytics hooks. */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import type { CreateSequenceRequest, UpdateSequenceRequest, EnrollRequest, BulkEnrollRequest } from '@/types'

export function useSequences() {
  return useQuery({ queryKey: ['sequences'], queryFn: () => api.sequences.list(), staleTime: 30_000 })
}

export function useSequence(id: string | undefined) {
  return useQuery({ queryKey: ['sequences', id], queryFn: () => api.sequences.get(id!), enabled: !!id, staleTime: 30_000 })
}

export function useCreateSequence() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateSequenceRequest) => api.sequences.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['sequences'] }); toast.success('Sequence created') },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to create sequence'),
  })
}

export function useUpdateSequence(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: UpdateSequenceRequest) => api.sequences.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['sequences'] }); toast.success('Sequence updated') },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to update'),
  })
}

export function useDeleteSequence() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.sequences.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['sequences'] }); toast.success('Sequence archived') },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to delete'),
  })
}

export function useAddStep(seqId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { channel: string; delay_days?: number; delay_hours?: number; subject?: string; body_template: string }) =>
      api.sequences.steps.add(seqId, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['sequences', seqId] }); toast.success('Step added') },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to add step'),
  })
}

export function useUpdateStep(seqId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ stepId, data }: { stepId: string; data: Record<string, unknown> }) =>
      api.sequences.steps.update(seqId, stepId, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['sequences', seqId] }) },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to update step'),
  })
}

export function useDeleteStep(seqId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (stepId: string) => api.sequences.steps.delete(seqId, stepId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['sequences', seqId] }); toast.success('Step removed') },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to remove step'),
  })
}

export function useEnrollContact(seqId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: EnrollRequest) => api.sequences.enroll(seqId, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['sequences'] }); toast.success('Contact enrolled') },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to enroll'),
  })
}

export function useBulkEnroll(seqId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: BulkEnrollRequest) => api.sequences.enrollBulk(seqId, data),
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ['sequences'] })
      toast.success(`${result.enrolled} contact${result.enrolled !== 1 ? 's' : ''} enrolled`)
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to enroll'),
  })
}

export function useStopEnrollment(seqId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (enrollmentId: string) => api.sequences.stopEnrollment(seqId, enrollmentId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['sequences', seqId, 'enrollments'] }); toast.success('Enrollment stopped') },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to stop'),
  })
}

export function useEnrollments(seqId: string | undefined) {
  return useQuery({
    queryKey: ['sequences', seqId, 'enrollments'],
    queryFn: () => api.sequences.enrollments(seqId!),
    enabled: !!seqId,
    staleTime: 30_000,
  })
}

export function useSequenceAnalytics(seqId: string | undefined) {
  return useQuery({
    queryKey: ['sequences', seqId, 'analytics'],
    queryFn: () => api.sequences.analytics(seqId!),
    enabled: !!seqId,
    staleTime: 30_000,
  })
}
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/types/index.ts frontend/src/lib/api.ts frontend/src/hooks/useSequences.ts
git commit -m "feat: sequence types, API namespace, and React Query hooks"
```

---

### Task 5: Nav + Routes + Sequences List Page

**Files:**
- Modify: `frontend/src/components/layout/nav-data.ts`
- Modify: `frontend/src/App.tsx`
- Create: `frontend/src/pages/sequences/SequencesListPage.tsx`

- [ ] **Step 1: Unlock Sequences nav**

In `nav-data.ts`, remove `locked: true` from the Sequences item (line 86).

- [ ] **Step 2: Add routes to App.tsx**

Add lazy imports:
```typescript
const SequencesListPage = lazy(() => import('@/pages/sequences/SequencesListPage'))
const SequenceBuilderPage = lazy(() => import('@/pages/sequences/SequenceBuilderPage'))
```

Replace the `/sequences` LockedFeaturePage route with:
```typescript
<Route path="/sequences" element={<ProtectedRoute><PageErrorBoundary><SequencesListPage /></PageErrorBoundary></ProtectedRoute>} />
<Route path="/sequences/new" element={<ProtectedRoute><PageErrorBoundary><SequenceBuilderPage /></PageErrorBoundary></ProtectedRoute>} />
<Route path="/sequences/:id" element={<ProtectedRoute><PageErrorBoundary><SequenceBuilderPage /></PageErrorBoundary></ProtectedRoute>} />
```

- [ ] **Step 3: Create SequencesListPage**

Sequence cards with: name, description, status badge (Active green/Paused yellow/Archived gray), stats row ("X enrolled · Y completed · Z replied · N% reply rate"), step preview ("3 steps over 7 days (SMS → SMS → Email)"), Edit/Pause/Archive action buttons. "Create Sequence" violet button in header. Empty state: "Create your first follow-up sequence to automate outreach."

Use `useSequences()` hook. Link Edit to `/sequences/:id`. Design system: dark theme, Satoshi 300 headings, AppShell wrapper.

- [ ] **Step 4: Verify build**

Run: `cd /Users/ivanflores/parcel-platform/frontend && npx vite build 2>&1 | tail -5`

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/layout/nav-data.ts frontend/src/App.tsx frontend/src/pages/sequences/SequencesListPage.tsx
git commit -m "feat: sequences list page with stats, status badges, and step previews"
```

---

### Task 6: Sequence Builder Page

**Files:**
- Create: `frontend/src/pages/sequences/SequenceBuilderPage.tsx`

- [ ] **Step 1: Create the builder**

Visual sequence builder page at `/sequences/new` and `/sequences/:id`.

Layout:
- Header: "New Sequence" (or sequence name in edit mode) + "Save" button
- Sequence info: name input + description textarea
- Stop rules: "Stop on reply" toggle + "Stop when deal created" toggle
- Step timeline: vertical timeline with connecting lines

Step timeline:
- Each step is a card with: step number circle, channel icon (SMS/Email), delay text, collapsed template preview
- Click to expand: channel toggle, delay inputs (days + hours), subject (email only), body_template textarea
- Variable toolbar: buttons for {{first_name}}, {{property_address}}, {{sender_name}} etc. that insert at cursor
- Template preview: renders with sample data below textarea
- Delete step button
- "Add Step" button at bottom of timeline

For new sequences: local state manages steps, "Save" calls POST /api/sequences with inline steps.
For edit: load with useSequence(id), individual step CRUD via API.

Sample preview data:
```
{ first_name: "John", last_name: "Smith", full_name: "John Smith", property_address: "123 Main St", property_city: "Milwaukee", property_state: "WI", sender_name: "Desiree" }
```

Use hooks: useSequence, useCreateSequence, useUpdateSequence, useAddStep, useUpdateStep, useDeleteStep.

Design: dark theme, Satoshi 300, card bg-[#141311], border-[#1E1D1B], violet accents.

- [ ] **Step 2: Verify build**

Run: `cd /Users/ivanflores/parcel-platform/frontend && npx vite build 2>&1 | tail -5`

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/sequences/SequenceBuilderPage.tsx
git commit -m "feat: sequence builder with visual timeline, template editing, and variable insertion"
```

---

### Task 7: Enroll Contacts from Contact/Buyer Detail Pages

**Files:**
- Modify: `frontend/src/pages/contacts/ContactDetailPage.tsx`
- Modify: `frontend/src/pages/buyers/BuyerDetailPage.tsx`

- [ ] **Step 1: Add "Add to Sequence" to ContactDetailPage**

Add an "Add to Sequence" button in the action buttons area (next to Edit and Delete). On click, shows a dropdown listing active sequences (fetched via useSequences). Selecting one calls useEnrollContact with the contact_id. Show enrollment status if contact is currently enrolled in a sequence.

Pattern: use a popover or simple dropdown with sequence names. On select, enroll immediately and toast success.

Import `useSequences` from `@/hooks/useSequences` and `useEnrollContact`. Need to handle dynamic seqId for the enroll hook — use `api.sequences.enroll()` directly instead.

- [ ] **Step 2: Add "Add to Sequence" to BuyerDetailPage**

Same pattern as ContactDetailPage. Add in the header action area.

- [ ] **Step 3: Verify build**

Run: `cd /Users/ivanflores/parcel-platform/frontend && npx vite build 2>&1 | tail -5`

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/contacts/ContactDetailPage.tsx frontend/src/pages/buyers/BuyerDetailPage.tsx
git commit -m "feat: enroll contacts in sequences from contact/buyer detail pages"
```

---

### Task 8: Final Verification

- [ ] **Step 1: Backend syntax check**

Run: `cd /Users/ivanflores/parcel-platform/backend && python3 -c "import ast; ast.parse(open('models/sequences.py').read()); ast.parse(open('core/communications/sequence_engine.py').read()); ast.parse(open('routers/sequences.py').read()); ast.parse(open('schemas/sequences.py').read()); print('ALL OK')"`

- [ ] **Step 2: Frontend build check**

Run: `cd /Users/ivanflores/parcel-platform/frontend && npx vite build 2>&1 | tail -5`

- [ ] **Step 3: Fix any remaining issues**
