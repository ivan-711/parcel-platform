"""Tasks router — CRUD, complete, snooze, today view."""

import logging
from datetime import datetime, timedelta
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import and_, case, or_
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from core.security.jwt import get_current_user
from database import get_db
from models.tasks import Task
from models.users import User

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/tasks", tags=["tasks"])


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class TaskResponse(BaseModel):
    id: str
    title: str
    description: Optional[str] = None
    status: str
    priority: str
    due_date: Optional[str] = None
    completed_at: Optional[str] = None
    property_id: Optional[str] = None
    deal_id: Optional[str] = None
    contact_id: Optional[str] = None
    assigned_to: Optional[str] = None
    is_deleted: bool = False
    created_at: str
    updated_at: str

    @classmethod
    def from_task(cls, t: Task) -> "TaskResponse":
        return cls(
            id=str(t.id),
            title=t.title,
            description=t.description,
            status=t.status,
            priority=t.priority,
            due_date=(
                t.due_date.isoformat() if t.due_date else None
            ),
            completed_at=(
                t.completed_at.isoformat()
                if t.completed_at else None
            ),
            property_id=(
                str(t.property_id) if t.property_id else None
            ),
            deal_id=str(t.deal_id) if t.deal_id else None,
            contact_id=(
                str(t.contact_id) if t.contact_id else None
            ),
            assigned_to=(
                str(t.assigned_to) if t.assigned_to else None
            ),
            is_deleted=t.is_deleted,
            created_at=(
                t.created_at.isoformat() if t.created_at else ""
            ),
            updated_at=(
                t.updated_at.isoformat() if t.updated_at else ""
            ),
        )


class TaskListResponse(BaseModel):
    tasks: list[TaskResponse]
    total: int
    page: int
    per_page: int


class CreateTaskRequest(BaseModel):
    title: str = Field(..., min_length=1)
    description: Optional[str] = None
    status: str = "open"
    priority: str = "normal"
    due_date: Optional[str] = None
    property_id: Optional[str] = None
    deal_id: Optional[str] = None
    contact_id: Optional[str] = None
    assigned_to: Optional[str] = None


class UpdateTaskRequest(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    due_date: Optional[str] = None
    property_id: Optional[str] = None
    deal_id: Optional[str] = None
    contact_id: Optional[str] = None
    assigned_to: Optional[str] = None


class SnoozeRequest(BaseModel):
    until: str


class TasksTodayResponse(BaseModel):
    due_today: list[TaskResponse]
    overdue: list[TaskResponse]
    urgent: list[TaskResponse]


# ---------------------------------------------------------------------------
# CRUD
# ---------------------------------------------------------------------------

@router.get("/", response_model=TaskListResponse)
async def list_tasks(
    status_filter: Optional[str] = Query(None, alias="status"),
    priority: Optional[str] = Query(None),
    property_id: Optional[str] = Query(None),
    deal_id: Optional[str] = Query(None),
    contact_id: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> TaskListResponse:
    """List tasks with filters and pagination."""
    q = db.query(Task).filter(
        Task.created_by == current_user.id,
        Task.is_deleted == False,  # noqa: E712
    )

    if status_filter:
        q = q.filter(Task.status == status_filter)
    if priority:
        q = q.filter(Task.priority == priority)
    if property_id:
        q = q.filter(Task.property_id == property_id)
    if deal_id:
        q = q.filter(Task.deal_id == deal_id)
    if contact_id:
        q = q.filter(Task.contact_id == contact_id)

    total = q.count()

    priority_order = case(
        {"urgent": 0, "high": 1, "normal": 2, "low": 3},
        value=Task.priority,
        else_=4,
    )
    tasks = (
        q.order_by(
            Task.due_date.asc().nullslast(),
            priority_order,
        )
        .offset((page - 1) * per_page)
        .limit(per_page)
        .all()
    )

    return TaskListResponse(
        tasks=[TaskResponse.from_task(t) for t in tasks],
        total=total,
        page=page,
        per_page=per_page,
    )


@router.get("/today", response_model=TasksTodayResponse)
async def tasks_today(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> TasksTodayResponse:
    """Tasks due today, overdue, and urgent."""
    now = datetime.utcnow()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    today_end = today_start + timedelta(days=1)

    # Include open/due tasks AND snoozed tasks whose snooze period has expired
    base = db.query(Task).filter(
        Task.created_by == current_user.id,
        Task.is_deleted == False,  # noqa: E712
        or_(
            Task.status.in_(["open", "due"]),
            # Snoozed tasks resurface when their due_date arrives
            and_(Task.status == "snoozed", Task.due_date <= today_end),
        ),
    )

    overdue = base.filter(
        Task.due_date < today_start,
    ).order_by(Task.due_date.asc()).all()

    due_today = base.filter(
        Task.due_date >= today_start,
        Task.due_date < today_end,
    ).order_by(Task.priority.desc()).all()

    urgent = base.filter(
        Task.priority == "urgent",
        # exclude already captured overdue/today
        ~Task.id.in_(
            [t.id for t in overdue] + [t.id for t in due_today]
        ),
    ).order_by(Task.due_date.asc().nullslast()).all()

    # Auto-reopen snoozed tasks that have resurfaced
    snoozed_ids = [
        t.id for t in overdue + due_today
        if t.status == "snoozed"
    ]
    if snoozed_ids:
        db.query(Task).filter(Task.id.in_(snoozed_ids)).update(
            {"status": "open"}, synchronize_session="fetch"
        )
        db.commit()

    return TasksTodayResponse(
        due_today=[TaskResponse.from_task(t) for t in due_today],
        overdue=[TaskResponse.from_task(t) for t in overdue],
        urgent=[TaskResponse.from_task(t) for t in urgent],
    )


@router.get("/{task_id}", response_model=TaskResponse)
async def get_task(
    task_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> TaskResponse:
    """Get a single task."""
    task = _get_task_or_404(db, task_id, current_user.id)
    return TaskResponse.from_task(task)


@router.post("/", response_model=TaskResponse, status_code=201)
async def create_task(
    body: CreateTaskRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> TaskResponse:
    """Create a new task."""
    # Validate ownership of linked entities
    _validate_linked_entities(db, current_user.id, body.property_id, body.deal_id, body.contact_id)

    task = Task(
        created_by=current_user.id,
        title=body.title,
        description=body.description,
        status=body.status,
        priority=body.priority,
        due_date=(
            datetime.fromisoformat(body.due_date)
            if body.due_date else None
        ),
        property_id=(
            UUID(body.property_id) if body.property_id else None
        ),
        deal_id=UUID(body.deal_id) if body.deal_id else None,
        contact_id=(
            UUID(body.contact_id) if body.contact_id else None
        ),
        assigned_to=(
            UUID(body.assigned_to) if body.assigned_to else None
        ),
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    return TaskResponse.from_task(task)


@router.patch("/{task_id}", response_model=TaskResponse)
async def update_task(
    task_id: UUID,
    body: UpdateTaskRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> TaskResponse:
    """Update task fields."""
    task = _get_task_or_404(db, task_id, current_user.id)

    update_data = body.model_dump(exclude_unset=True)

    # Validate ownership of any linked entity changes
    _validate_linked_entities(
        db, current_user.id,
        update_data.get("property_id"),
        update_data.get("deal_id"),
        update_data.get("contact_id"),
    )

    for field, value in update_data.items():
        if field == "due_date" and value is not None:
            value = datetime.fromisoformat(value)
        if field in ("property_id", "deal_id", "contact_id",
                     "assigned_to") and value is not None:
            value = UUID(value)
        setattr(task, field, value)

    db.commit()
    db.refresh(task)
    return TaskResponse.from_task(task)


@router.delete("/{task_id}", status_code=204)
async def delete_task(
    task_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Soft-delete a task."""
    task = _get_task_or_404(db, task_id, current_user.id)
    task.is_deleted = True
    db.commit()
    return None


# ---------------------------------------------------------------------------
# Convenience actions
# ---------------------------------------------------------------------------

@router.post("/{task_id}/complete", response_model=TaskResponse)
async def complete_task(
    task_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> TaskResponse:
    """Mark a task as done."""
    task = _get_task_or_404(db, task_id, current_user.id)
    task.status = "done"
    task.completed_at = datetime.utcnow()
    db.commit()
    db.refresh(task)
    return TaskResponse.from_task(task)


@router.post("/{task_id}/snooze", response_model=TaskResponse)
async def snooze_task(
    task_id: UUID,
    body: SnoozeRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> TaskResponse:
    """Snooze a task to a future date."""
    task = _get_task_or_404(db, task_id, current_user.id)
    task.status = "snoozed"
    task.due_date = datetime.fromisoformat(body.until)
    db.commit()
    db.refresh(task)
    return TaskResponse.from_task(task)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _validate_linked_entities(
    db: Session,
    user_id: UUID,
    property_id: str | None,
    deal_id: str | None,
    contact_id: str | None,
) -> None:
    """Verify that linked entity IDs belong to the current user."""
    if property_id:
        try:
            pid = UUID(property_id)
        except ValueError:
            raise HTTPException(status_code=400, detail={"error": "Invalid property_id", "code": "INVALID_ID"})
        from models.properties import Property
        prop = db.query(Property).filter(Property.id == pid, Property.created_by == user_id, Property.is_deleted == False).first()  # noqa: E712
        if not prop:
            raise HTTPException(status_code=404, detail={"error": "Property not found", "code": "NOT_FOUND"})

    if deal_id:
        try:
            did = UUID(deal_id)
        except ValueError:
            raise HTTPException(status_code=400, detail={"error": "Invalid deal_id", "code": "INVALID_ID"})
        from models.deals import Deal
        deal = db.query(Deal).filter(Deal.id == did, Deal.user_id == user_id, Deal.deleted_at.is_(None)).first()
        if not deal:
            raise HTTPException(status_code=404, detail={"error": "Deal not found", "code": "NOT_FOUND"})

    if contact_id:
        try:
            cid = UUID(contact_id)
        except ValueError:
            raise HTTPException(status_code=400, detail={"error": "Invalid contact_id", "code": "INVALID_ID"})
        from models.contacts import Contact
        contact = db.query(Contact).filter(Contact.id == cid, Contact.created_by == user_id, Contact.is_deleted == False).first()  # noqa: E712
        if not contact:
            raise HTTPException(status_code=404, detail={"error": "Contact not found", "code": "NOT_FOUND"})


def _get_task_or_404(
    db: Session, task_id: UUID, user_id: UUID
) -> Task:
    task = db.query(Task).filter(
        Task.id == task_id,
        Task.created_by == user_id,
        Task.is_deleted == False,  # noqa: E712
    ).first()
    if not task:
        raise HTTPException(
            status_code=404,
            detail={"error": "Task not found", "code": "NOT_FOUND"},
        )
    return task
