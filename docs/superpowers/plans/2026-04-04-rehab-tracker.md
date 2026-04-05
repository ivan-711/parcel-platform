# Rehab Tracker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build rehab project and item tracking with models, migration, CRUD endpoints, list page, detail page with items table and budget visualization, Bricked AI import, and property detail integration.

**Architecture:** Two new models (RehabProject, RehabItem) with one-to-many relationship. Router with 10 endpoints following existing financing router patterns. Budget totals recomputed from items after every mutation. Bricked repair estimates imported via category keyword mapping.

**Tech Stack:** Python (FastAPI, SQLAlchemy, Alembic), TypeScript (React, TanStack Query, Tailwind)

---

## Task 1: Models + Migration

**Files:**
- Create: `backend/models/rehab_projects.py`
- Create: `backend/alembic/versions/k1l2m3n4o5p6_add_rehab_projects_and_items.py`
- Modify: `backend/models/__init__.py`
- Modify: `backend/models/properties.py`

- [ ] **Step 1: Create rehab models file**

```python
# backend/models/rehab_projects.py
"""Rehab project and item models — renovation cost tracking tied to properties."""

from sqlalchemy import Boolean, Column, Date, DateTime, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from database import Base
from models.base import TimestampMixin


class RehabProject(TimestampMixin, Base):
    """A rehabilitation project linked to a property."""

    __tablename__ = "rehab_projects"

    property_id = Column(UUID(as_uuid=True), ForeignKey("properties.id"), nullable=False, index=True)
    deal_id = Column(UUID(as_uuid=True), ForeignKey("deals.id"), nullable=True)
    created_by = Column(UUID(as_uuid=True), nullable=False, index=True)
    team_id = Column(UUID(as_uuid=True), nullable=True)

    name = Column(String, nullable=False)
    status = Column(String, nullable=False, default="planning")
    # planning | in_progress | completed | on_hold

    estimated_budget = Column(Numeric(14, 2), nullable=True)
    actual_spent = Column(Numeric(14, 2), nullable=True, default=0)

    start_date = Column(Date, nullable=True)
    target_completion = Column(Date, nullable=True)
    actual_completion = Column(Date, nullable=True)

    notes = Column(Text, nullable=True)
    deleted_at = Column(DateTime, nullable=True)

    # Relationships
    property = relationship("Property", back_populates="rehab_projects")
    items = relationship("RehabItem", back_populates="project", cascade="all, delete-orphan")


class RehabItem(TimestampMixin, Base):
    """A single line item within a rehab project."""

    __tablename__ = "rehab_items"

    project_id = Column(UUID(as_uuid=True), ForeignKey("rehab_projects.id"), nullable=False, index=True)
    created_by = Column(UUID(as_uuid=True), nullable=False)

    category = Column(String, nullable=False)
    # kitchen | bathroom | flooring | roof | hvac | plumbing | electrical |
    # exterior | foundation | windows_doors | painting | landscaping |
    # general | permits | other

    description = Column(String, nullable=False)

    estimated_cost = Column(Numeric(10, 2), nullable=True)
    actual_cost = Column(Numeric(10, 2), nullable=True)

    status = Column(String, nullable=False, default="planned")
    # planned | in_progress | completed | skipped

    contractor_name = Column(String, nullable=True)
    contractor_bid = Column(Numeric(10, 2), nullable=True)

    priority = Column(String, nullable=True, default="normal")
    # critical | high | normal | low

    notes = Column(Text, nullable=True)
    deleted_at = Column(DateTime, nullable=True)

    # Relationships
    project = relationship("RehabProject", back_populates="items")
```

- [ ] **Step 2: Add relationship to Property model**

In `backend/models/properties.py`, add after line 63 (`financing_instruments = relationship(...)`):

```python
    rehab_projects = relationship("RehabProject", back_populates="property")
```

- [ ] **Step 3: Register models in __init__.py**

In `backend/models/__init__.py`, add after the Wave 2 imports (after line 33):

```python
# Wave 3 models
from models.rehab_projects import RehabProject, RehabItem
```

And add to `__all__` list:

```python
    # Wave 3
    "RehabProject",
    "RehabItem",
```

- [ ] **Step 4: Create migration**

```python
# backend/alembic/versions/k1l2m3n4o5p6_add_rehab_projects_and_items.py
"""Add rehab_projects and rehab_items tables.

Revision ID: k1l2m3n4o5p6
Revises: j0e1f2g3h4i5
Create Date: 2026-04-04
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "k1l2m3n4o5p6"
down_revision: Union[str, Sequence[str], None] = "j0e1f2g3h4i5"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "rehab_projects",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False, server_default=sa.text("gen_random_uuid()")),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("property_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("deal_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("team_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("status", sa.String(), nullable=False, server_default="planning"),
        sa.Column("estimated_budget", sa.Numeric(14, 2), nullable=True),
        sa.Column("actual_spent", sa.Numeric(14, 2), nullable=True, server_default="0"),
        sa.Column("start_date", sa.Date(), nullable=True),
        sa.Column("target_completion", sa.Date(), nullable=True),
        sa.Column("actual_completion", sa.Date(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("deleted_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["property_id"], ["properties.id"]),
        sa.ForeignKeyConstraint(["deal_id"], ["deals.id"]),
    )
    op.create_index("ix_rehab_projects_property_id", "rehab_projects", ["property_id"])
    op.create_index("ix_rehab_projects_created_by", "rehab_projects", ["created_by"])

    op.create_table(
        "rehab_items",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False, server_default=sa.text("gen_random_uuid()")),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("project_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("category", sa.String(), nullable=False),
        sa.Column("description", sa.String(), nullable=False),
        sa.Column("estimated_cost", sa.Numeric(10, 2), nullable=True),
        sa.Column("actual_cost", sa.Numeric(10, 2), nullable=True),
        sa.Column("status", sa.String(), nullable=False, server_default="planned"),
        sa.Column("contractor_name", sa.String(), nullable=True),
        sa.Column("contractor_bid", sa.Numeric(10, 2), nullable=True),
        sa.Column("priority", sa.String(), nullable=True, server_default="normal"),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("deleted_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["project_id"], ["rehab_projects.id"]),
    )
    op.create_index("ix_rehab_items_project_id", "rehab_items", ["project_id"])


def downgrade() -> None:
    op.drop_table("rehab_items")
    op.drop_table("rehab_projects")
```

- [ ] **Step 5: Verify syntax**

Run: `cd backend && python3 -m py_compile models/rehab_projects.py && python3 -m py_compile alembic/versions/k1l2m3n4o5p6_add_rehab_projects_and_items.py && echo "OK"`

- [ ] **Step 6: Commit**

```bash
git add backend/models/rehab_projects.py backend/models/__init__.py backend/models/properties.py backend/alembic/versions/k1l2m3n4o5p6_add_rehab_projects_and_items.py
git commit -m "feat: add RehabProject and RehabItem models with migration"
```

---

## Task 2: Rehab Schemas

**Files:**
- Create: `backend/schemas/rehab.py`

- [ ] **Step 1: Create rehab schemas**

```python
# backend/schemas/rehab.py
"""Pydantic schemas for rehab project and item endpoints."""

from datetime import date, datetime
from decimal import Decimal
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field


class CreateRehabProjectRequest(BaseModel):
    property_id: UUID
    name: str = Field(..., min_length=1)
    deal_id: Optional[UUID] = None
    status: str = "planning"
    start_date: Optional[date] = None
    target_completion: Optional[date] = None
    notes: Optional[str] = None
    import_bricked: bool = False


class UpdateRehabProjectRequest(BaseModel):
    name: Optional[str] = None
    status: Optional[str] = None
    start_date: Optional[date] = None
    target_completion: Optional[date] = None
    actual_completion: Optional[date] = None
    notes: Optional[str] = None


class RehabItemResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: UUID
    project_id: UUID
    created_by: UUID
    category: str
    description: str
    estimated_cost: Optional[Decimal] = None
    actual_cost: Optional[Decimal] = None
    status: str
    contractor_name: Optional[str] = None
    contractor_bid: Optional[Decimal] = None
    priority: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class RehabProjectResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: UUID
    property_id: UUID
    deal_id: Optional[UUID] = None
    created_by: UUID
    team_id: Optional[UUID] = None
    name: str
    status: str
    estimated_budget: Optional[Decimal] = None
    actual_spent: Optional[Decimal] = None
    start_date: Optional[date] = None
    target_completion: Optional[date] = None
    actual_completion: Optional[date] = None
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    # Computed
    item_count: int = 0
    total_estimated: float = 0
    total_actual: float = 0
    budget_variance: float = 0
    completion_pct: float = 0
    property_address: str = ""


class RehabProjectDetailResponse(RehabProjectResponse):
    items: list[RehabItemResponse] = []


class CreateRehabItemRequest(BaseModel):
    category: str
    description: str = Field(..., min_length=1)
    estimated_cost: Optional[Decimal] = None
    actual_cost: Optional[Decimal] = None
    status: str = "planned"
    contractor_name: Optional[str] = None
    contractor_bid: Optional[Decimal] = None
    priority: str = "normal"
    notes: Optional[str] = None


class UpdateRehabItemRequest(BaseModel):
    category: Optional[str] = None
    description: Optional[str] = None
    estimated_cost: Optional[Decimal] = None
    actual_cost: Optional[Decimal] = None
    status: Optional[str] = None
    contractor_name: Optional[str] = None
    contractor_bid: Optional[Decimal] = None
    priority: Optional[str] = None
    notes: Optional[str] = None


class BulkCreateItemsRequest(BaseModel):
    items: list[CreateRehabItemRequest]


class CategorySummary(BaseModel):
    category: str
    estimated: float
    actual: float
    variance: float
    item_count: int
    completed_count: int


class ProjectSummaryResponse(BaseModel):
    total_estimated: float
    total_actual: float
    total_variance: float
    overall_completion_pct: float
    by_category: list[CategorySummary] = []
```

- [ ] **Step 2: Verify syntax**

Run: `cd backend && python3 -m py_compile schemas/rehab.py && echo "OK"`

- [ ] **Step 3: Commit**

```bash
git add backend/schemas/rehab.py
git commit -m "feat: add rehab Pydantic schemas"
```

---

## Task 3: Rehab Router

**Files:**
- Create: `backend/routers/rehab.py`
- Modify: `backend/main.py`

- [ ] **Step 1: Create the rehab router**

```python
# backend/routers/rehab.py
"""Rehab router — CRUD for projects and items, Bricked import, budget tracking."""

import math
from datetime import datetime
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from core.security.jwt import get_current_user
from database import get_db
from models.analysis_scenarios import AnalysisScenario
from models.properties import Property
from models.rehab_projects import RehabItem, RehabProject
from models.users import User
from schemas.rehab import (
    BulkCreateItemsRequest,
    CategorySummary,
    CreateRehabItemRequest,
    CreateRehabProjectRequest,
    ProjectSummaryResponse,
    RehabItemResponse,
    RehabProjectDetailResponse,
    RehabProjectResponse,
    UpdateRehabItemRequest,
    UpdateRehabProjectRequest,
)

router = APIRouter(prefix="/rehab", tags=["rehab"])

# Category keyword mapping for Bricked import
CATEGORY_KEYWORDS = {
    "kitchen": ["kitchen", "cabinet", "countertop", "appliance", "sink", "dishwasher", "stove", "oven"],
    "bathroom": ["bathroom", "bath", "shower", "toilet", "vanity", "tub"],
    "flooring": ["floor", "carpet", "tile", "hardwood", "vinyl", "laminate"],
    "roof": ["roof", "shingle", "gutter"],
    "hvac": ["hvac", "furnace", "ac", "air condition", "heating", "cooling", "duct"],
    "plumbing": ["plumb", "pipe", "water heater", "faucet", "sewer", "drain"],
    "electrical": ["electric", "wiring", "panel", "outlet", "breaker", "light"],
    "exterior": ["siding", "deck", "porch", "stucco", "facade", "garage"],
    "foundation": ["foundation", "basement", "crawl", "structural"],
    "windows_doors": ["window", "door", "glass", "screen"],
    "painting": ["paint", "primer", "stain", "drywall"],
    "landscaping": ["landscape", "yard", "fence", "driveway", "concrete", "patio"],
    "permits": ["permit", "inspection", "code"],
}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _validate_property_ownership(db: Session, property_id: UUID, user_id: UUID) -> Property:
    prop = db.query(Property).filter(
        Property.id == property_id,
        Property.created_by == user_id,
        Property.is_deleted == False,  # noqa: E712
    ).first()
    if not prop:
        raise HTTPException(status_code=404, detail={"error": "Property not found", "code": "PROPERTY_NOT_FOUND"})
    return prop


def _get_project_or_404(db: Session, project_id: UUID, user_id: UUID) -> RehabProject:
    proj = db.query(RehabProject).filter(
        RehabProject.id == project_id,
        RehabProject.created_by == user_id,
        RehabProject.deleted_at.is_(None),
    ).first()
    if not proj:
        raise HTTPException(status_code=404, detail={"error": "Project not found", "code": "PROJECT_NOT_FOUND"})
    return proj


def _recalculate_totals(db: Session, project: RehabProject) -> None:
    """Recompute project budget totals from active items."""
    items = db.query(RehabItem).filter(
        RehabItem.project_id == project.id,
        RehabItem.deleted_at.is_(None),
    ).all()

    project.estimated_budget = sum(float(i.estimated_cost or 0) for i in items)
    project.actual_spent = sum(float(i.actual_cost or 0) for i in items)


def _compute_project_stats(db: Session, project: RehabProject, prop_address: str = "") -> dict:
    """Compute derived stats for a project."""
    items = db.query(RehabItem).filter(
        RehabItem.project_id == project.id,
        RehabItem.deleted_at.is_(None),
    ).all()

    total_est = sum(float(i.estimated_cost or 0) for i in items)
    total_act = sum(float(i.actual_cost or 0) for i in items)
    completed = sum(1 for i in items if i.status == "completed")
    total = len(items)

    return {
        "item_count": total,
        "total_estimated": round(total_est, 2),
        "total_actual": round(total_act, 2),
        "budget_variance": round(total_est - total_act, 2),
        "completion_pct": round((completed / total) * 100, 2) if total > 0 else 0,
        "property_address": prop_address,
    }


def _map_category(repair_name: str) -> str:
    """Map a Bricked repair name to a rehab category via keyword matching."""
    lower = repair_name.lower()
    for category, keywords in CATEGORY_KEYWORDS.items():
        if any(kw in lower for kw in keywords):
            return category
    return "general"


# ---------------------------------------------------------------------------
# Projects
# ---------------------------------------------------------------------------

@router.get("/projects", response_model=list[RehabProjectResponse])
async def list_projects(
    property_id: Optional[UUID] = Query(None),
    project_status: Optional[str] = Query(None, alias="status"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    q = db.query(RehabProject).filter(
        RehabProject.created_by == current_user.id,
        RehabProject.deleted_at.is_(None),
    )
    if property_id:
        q = q.filter(RehabProject.property_id == property_id)
    if project_status:
        q = q.filter(RehabProject.status == project_status)

    projects = q.order_by(RehabProject.created_at.desc()).all()

    result = []
    for proj in projects:
        prop = db.query(Property).get(proj.property_id)
        prop_addr = prop.address_line1 if prop else ""
        stats = _compute_project_stats(db, proj, prop_addr)
        resp = RehabProjectResponse.model_validate(proj, from_attributes=True)
        for k, v in stats.items():
            setattr(resp, k, v)
        result.append(resp)

    return result


@router.get("/projects/{project_id}", response_model=RehabProjectDetailResponse)
async def get_project(
    project_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    proj = _get_project_or_404(db, project_id, current_user.id)
    prop = db.query(Property).get(proj.property_id)
    prop_addr = prop.address_line1 if prop else ""

    items = db.query(RehabItem).filter(
        RehabItem.project_id == proj.id,
        RehabItem.deleted_at.is_(None),
    ).order_by(RehabItem.created_at.asc()).all()

    stats = _compute_project_stats(db, proj, prop_addr)
    resp = RehabProjectDetailResponse.model_validate(proj, from_attributes=True)
    resp.items = [RehabItemResponse.model_validate(i, from_attributes=True) for i in items]
    for k, v in stats.items():
        setattr(resp, k, v)
    return resp


@router.post("/projects", response_model=RehabProjectResponse, status_code=status.HTTP_201_CREATED)
async def create_project(
    body: CreateRehabProjectRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    prop = _validate_property_ownership(db, body.property_id, current_user.id)

    project = RehabProject(
        property_id=body.property_id,
        deal_id=body.deal_id,
        created_by=current_user.id,
        team_id=current_user.team_id,
        name=body.name,
        status=body.status,
        start_date=body.start_date,
        target_completion=body.target_completion,
        notes=body.notes,
    )
    db.add(project)
    db.flush()

    bricked_imported = False

    # Auto-import from Bricked estimates
    if body.import_bricked:
        scenario = db.query(AnalysisScenario).filter(
            AnalysisScenario.property_id == body.property_id,
            AnalysisScenario.is_deleted == False,  # noqa: E712
        ).order_by(AnalysisScenario.created_at.desc()).first()

        if scenario and scenario.inputs_extended:
            repairs = scenario.inputs_extended.get("repairs") or scenario.inputs_extended.get("bricked_repairs") or []
            for repair in repairs:
                if not isinstance(repair, dict):
                    continue
                item = RehabItem(
                    project_id=project.id,
                    created_by=current_user.id,
                    category=_map_category(repair.get("repair", "")),
                    description=repair.get("repair", "Unknown repair"),
                    estimated_cost=repair.get("cost"),
                    status="planned",
                    notes="Imported from AI estimate",
                )
                db.add(item)
            if repairs:
                bricked_imported = True

    db.flush()
    _recalculate_totals(db, project)
    db.commit()
    db.refresh(project)

    try:
        from core.telemetry import track_event
        track_event(current_user.id, "rehab_project_created", {
            "property_id": str(body.property_id),
            "has_bricked_import": bricked_imported,
        })
    except Exception:
        pass

    stats = _compute_project_stats(db, project, prop.address_line1 or "")
    resp = RehabProjectResponse.model_validate(project, from_attributes=True)
    for k, v in stats.items():
        setattr(resp, k, v)
    return resp


@router.patch("/projects/{project_id}", response_model=RehabProjectResponse)
async def update_project(
    project_id: UUID,
    body: UpdateRehabProjectRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    proj = _get_project_or_404(db, project_id, current_user.id)
    update_data = body.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(proj, key, value)
    db.commit()
    db.refresh(proj)

    prop = db.query(Property).get(proj.property_id)
    stats = _compute_project_stats(db, proj, prop.address_line1 if prop else "")
    resp = RehabProjectResponse.model_validate(proj, from_attributes=True)
    for k, v in stats.items():
        setattr(resp, k, v)
    return resp


@router.delete("/projects/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(
    project_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    proj = _get_project_or_404(db, project_id, current_user.id)
    now = datetime.utcnow()
    proj.deleted_at = now
    db.query(RehabItem).filter(
        RehabItem.project_id == proj.id,
        RehabItem.deleted_at.is_(None),
    ).update({"deleted_at": now}, synchronize_session="fetch")
    db.commit()


# ---------------------------------------------------------------------------
# Items
# ---------------------------------------------------------------------------

@router.post("/projects/{project_id}/items", response_model=RehabItemResponse, status_code=status.HTTP_201_CREATED)
async def create_item(
    project_id: UUID,
    body: CreateRehabItemRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    proj = _get_project_or_404(db, project_id, current_user.id)
    item = RehabItem(
        project_id=proj.id,
        created_by=current_user.id,
        **body.model_dump(),
    )
    db.add(item)
    db.flush()
    _recalculate_totals(db, proj)
    db.commit()
    db.refresh(item)

    try:
        from core.telemetry import track_event
        track_event(current_user.id, "rehab_item_added", {
            "category": body.category,
            "has_contractor": bool(body.contractor_name),
        })
    except Exception:
        pass

    return RehabItemResponse.model_validate(item, from_attributes=True)


@router.patch("/projects/{project_id}/items/{item_id}", response_model=RehabItemResponse)
async def update_item(
    project_id: UUID,
    item_id: UUID,
    body: UpdateRehabItemRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    proj = _get_project_or_404(db, project_id, current_user.id)
    item = db.query(RehabItem).filter(
        RehabItem.id == item_id,
        RehabItem.project_id == proj.id,
        RehabItem.deleted_at.is_(None),
    ).first()
    if not item:
        raise HTTPException(status_code=404, detail={"error": "Item not found", "code": "ITEM_NOT_FOUND"})

    update_data = body.model_dump(exclude_unset=True)

    was_completed = item.status == "completed"

    for key, value in update_data.items():
        setattr(item, key, value)

    _recalculate_totals(db, proj)
    db.commit()
    db.refresh(item)

    # Track completion
    if item.status == "completed" and not was_completed:
        try:
            from core.telemetry import track_event
            over_budget = (item.actual_cost or 0) > (item.estimated_cost or 0) if item.estimated_cost else False
            track_event(current_user.id, "rehab_item_completed", {
                "category": item.category,
                "was_over_budget": over_budget,
            })
        except Exception:
            pass

    return RehabItemResponse.model_validate(item, from_attributes=True)


@router.delete("/projects/{project_id}/items/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_item(
    project_id: UUID,
    item_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    proj = _get_project_or_404(db, project_id, current_user.id)
    item = db.query(RehabItem).filter(
        RehabItem.id == item_id,
        RehabItem.project_id == proj.id,
        RehabItem.deleted_at.is_(None),
    ).first()
    if not item:
        raise HTTPException(status_code=404, detail={"error": "Item not found", "code": "ITEM_NOT_FOUND"})

    item.deleted_at = datetime.utcnow()
    _recalculate_totals(db, proj)
    db.commit()


@router.post("/projects/{project_id}/items/bulk", response_model=list[RehabItemResponse], status_code=status.HTTP_201_CREATED)
async def bulk_create_items(
    project_id: UUID,
    body: BulkCreateItemsRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    proj = _get_project_or_404(db, project_id, current_user.id)
    created = []
    for item_data in body.items:
        item = RehabItem(
            project_id=proj.id,
            created_by=current_user.id,
            **item_data.model_dump(),
        )
        db.add(item)
        created.append(item)

    db.flush()
    _recalculate_totals(db, proj)
    db.commit()
    for item in created:
        db.refresh(item)

    return [RehabItemResponse.model_validate(i, from_attributes=True) for i in created]


# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------

@router.get("/projects/{project_id}/summary", response_model=ProjectSummaryResponse)
async def project_summary(
    project_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    proj = _get_project_or_404(db, project_id, current_user.id)
    items = db.query(RehabItem).filter(
        RehabItem.project_id == proj.id,
        RehabItem.deleted_at.is_(None),
    ).all()

    categories: dict[str, dict] = {}
    for item in items:
        cat = item.category
        if cat not in categories:
            categories[cat] = {"estimated": 0.0, "actual": 0.0, "count": 0, "completed": 0}
        categories[cat]["estimated"] += float(item.estimated_cost or 0)
        categories[cat]["actual"] += float(item.actual_cost or 0)
        categories[cat]["count"] += 1
        if item.status == "completed":
            categories[cat]["completed"] += 1

    total_est = sum(c["estimated"] for c in categories.values())
    total_act = sum(c["actual"] for c in categories.values())
    total_items = sum(c["count"] for c in categories.values())
    total_completed = sum(c["completed"] for c in categories.values())

    return ProjectSummaryResponse(
        total_estimated=round(total_est, 2),
        total_actual=round(total_act, 2),
        total_variance=round(total_est - total_act, 2),
        overall_completion_pct=round((total_completed / total_items) * 100, 2) if total_items > 0 else 0,
        by_category=[
            CategorySummary(
                category=cat,
                estimated=round(v["estimated"], 2),
                actual=round(v["actual"], 2),
                variance=round(v["estimated"] - v["actual"], 2),
                item_count=v["count"],
                completed_count=v["completed"],
            )
            for cat, v in sorted(categories.items())
        ],
    )
```

- [ ] **Step 2: Register in main.py**

In `backend/main.py`, add `rehab` to the router import on line 64 and register it:

```python
from routers import ..., transactions, rehab  # noqa: E402
```

```python
app.include_router(rehab.router, prefix="/api")
```

- [ ] **Step 3: Verify syntax**

Run: `cd backend && python3 -m py_compile routers/rehab.py && python3 -m py_compile main.py && echo "OK"`

- [ ] **Step 4: Commit**

```bash
git add backend/routers/rehab.py backend/main.py
git commit -m "feat: add rehab CRUD, Bricked import, and budget tracking endpoints"
```

---

## Task 4: Frontend Types + API + Hooks

**Files:**
- Modify: `frontend/src/types/index.ts`
- Modify: `frontend/src/lib/api.ts`
- Create: `frontend/src/hooks/useRehab.ts`

- [ ] **Step 1: Add rehab types**

At the end of `frontend/src/types/index.ts`, add:

```typescript
// ---------------------------------------------------------------------------
// Rehab types
// ---------------------------------------------------------------------------

export interface RehabProject {
  id: string
  property_id: string
  deal_id: string | null
  created_by: string
  team_id: string | null
  name: string
  status: string
  estimated_budget: number | null
  actual_spent: number | null
  start_date: string | null
  target_completion: string | null
  actual_completion: string | null
  notes: string | null
  created_at: string
  updated_at: string
  item_count: number
  total_estimated: number
  total_actual: number
  budget_variance: number
  completion_pct: number
  property_address: string
}

export interface RehabItem {
  id: string
  project_id: string
  created_by: string
  category: string
  description: string
  estimated_cost: number | null
  actual_cost: number | null
  status: string
  contractor_name: string | null
  contractor_bid: number | null
  priority: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface RehabProjectDetail extends RehabProject {
  items: RehabItem[]
}

export interface RehabCategorySummary {
  category: string
  estimated: number
  actual: number
  variance: number
  item_count: number
  completed_count: number
}

export interface RehabProjectSummary {
  total_estimated: number
  total_actual: number
  total_variance: number
  overall_completion_pct: number
  by_category: RehabCategorySummary[]
}

export interface CreateRehabProjectRequest {
  property_id: string
  name: string
  deal_id?: string
  status?: string
  start_date?: string
  target_completion?: string
  notes?: string
  import_bricked?: boolean
}

export interface CreateRehabItemRequest {
  category: string
  description: string
  estimated_cost?: number
  actual_cost?: number
  status?: string
  contractor_name?: string
  contractor_bid?: number
  priority?: string
  notes?: string
}
```

- [ ] **Step 2: Add rehab API namespace**

In `frontend/src/lib/api.ts`, add inside the `api` object (after the `transactions` namespace):

```typescript
  rehab: {
    projects: {
      list: (filters?: { property_id?: string; status?: string }) => {
        const params = new URLSearchParams()
        if (filters?.property_id) params.set('property_id', filters.property_id)
        if (filters?.status) params.set('status', filters.status)
        const qs = params.toString()
        return request<import('@/types').RehabProject[]>(`/api/rehab/projects${qs ? '?' + qs : ''}`)
      },
      get: (id: string) =>
        request<import('@/types').RehabProjectDetail>(`/api/rehab/projects/${id}`),
      create: (data: import('@/types').CreateRehabProjectRequest) =>
        request<import('@/types').RehabProject>('/api/rehab/projects', {
          method: 'POST',
          body: JSON.stringify(data),
        }),
      update: (id: string, data: Record<string, unknown>) =>
        request<import('@/types').RehabProject>(`/api/rehab/projects/${id}`, {
          method: 'PATCH',
          body: JSON.stringify(data),
        }),
      delete: (id: string) =>
        request<void>(`/api/rehab/projects/${id}`, { method: 'DELETE' }),
      summary: (id: string) =>
        request<import('@/types').RehabProjectSummary>(`/api/rehab/projects/${id}/summary`),
    },
    items: {
      create: (projectId: string, data: import('@/types').CreateRehabItemRequest) =>
        request<import('@/types').RehabItem>(`/api/rehab/projects/${projectId}/items`, {
          method: 'POST',
          body: JSON.stringify(data),
        }),
      update: (projectId: string, itemId: string, data: Record<string, unknown>) =>
        request<import('@/types').RehabItem>(`/api/rehab/projects/${projectId}/items/${itemId}`, {
          method: 'PATCH',
          body: JSON.stringify(data),
        }),
      delete: (projectId: string, itemId: string) =>
        request<void>(`/api/rehab/projects/${projectId}/items/${itemId}`, { method: 'DELETE' }),
      bulkCreate: (projectId: string, data: { items: import('@/types').CreateRehabItemRequest[] }) =>
        request<import('@/types').RehabItem[]>(`/api/rehab/projects/${projectId}/items/bulk`, {
          method: 'POST',
          body: JSON.stringify(data),
        }),
    },
  },
```

- [ ] **Step 3: Create rehab hooks**

```typescript
// frontend/src/hooks/useRehab.ts
/** Rehab project and item query/mutation hooks. */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import type { CreateRehabProjectRequest, CreateRehabItemRequest } from '@/types'

export function useRehabProjects(filters?: { property_id?: string; status?: string }) {
  return useQuery({
    queryKey: ['rehab', 'projects', filters],
    queryFn: () => api.rehab.projects.list(filters),
    staleTime: 30_000,
  })
}

export function useRehabProject(id: string | undefined) {
  return useQuery({
    queryKey: ['rehab', 'projects', id],
    queryFn: () => api.rehab.projects.get(id!),
    enabled: !!id,
    staleTime: 30_000,
  })
}

export function useRehabSummary(id: string | undefined) {
  return useQuery({
    queryKey: ['rehab', 'summary', id],
    queryFn: () => api.rehab.projects.summary(id!),
    enabled: !!id,
    staleTime: 30_000,
  })
}

export function useCreateRehabProject() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateRehabProjectRequest) => api.rehab.projects.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rehab'] })
      toast.success('Rehab project created')
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to create project'),
  })
}

export function useUpdateRehabProject() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      api.rehab.projects.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rehab'] })
      toast.success('Project updated')
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to update project'),
  })
}

export function useDeleteRehabProject() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.rehab.projects.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rehab'] })
      toast.success('Project deleted')
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to delete project'),
  })
}

export function useCreateRehabItem(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateRehabItemRequest) => api.rehab.items.create(projectId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rehab'] })
      toast.success('Item added')
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to add item'),
  })
}

export function useUpdateRehabItem(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ itemId, data }: { itemId: string; data: Record<string, unknown> }) =>
      api.rehab.items.update(projectId, itemId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rehab'] })
      toast.success('Item updated')
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to update item'),
  })
}

export function useDeleteRehabItem(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (itemId: string) => api.rehab.items.delete(projectId, itemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rehab'] })
      toast.success('Item removed')
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to remove item'),
  })
}
```

- [ ] **Step 4: Verify build**

Run: `cd frontend && npx vite build 2>&1 | tail -5`

- [ ] **Step 5: Commit**

```bash
git add frontend/src/types/index.ts frontend/src/lib/api.ts frontend/src/hooks/useRehab.ts
git commit -m "feat: add rehab types, API client, and React Query hooks"
```

---

## Task 5: Nav + Routes

**Files:**
- Modify: `frontend/src/components/layout/nav-data.ts`
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: Unlock Rehabs in nav-data.ts**

Change line 72 from:
```typescript
      { label: 'Rehabs', path: '/rehabs', icon: Hammer, locked: true },
```
To:
```typescript
      { label: 'Rehabs', path: '/rehabs', icon: Hammer },
```

- [ ] **Step 2: Add routes in App.tsx**

Add lazy imports after the existing financing imports (around line 45):
```typescript
const RehabsPage = lazy(() => import('@/pages/rehab/RehabsPage'))
const RehabDetailPage = lazy(() => import('@/pages/rehab/RehabDetailPage'))
```

Add routes after the `/financing` route (around line 169):
```typescript
        <Route path="/rehabs" element={<ProtectedRoute><PageErrorBoundary><RehabsPage /></PageErrorBoundary></ProtectedRoute>} />
        <Route path="/rehabs/:projectId" element={<ProtectedRoute><PageErrorBoundary><RehabDetailPage /></PageErrorBoundary></ProtectedRoute>} />
```

Remove the locked `/rehabs` route from the locked features block (around line 173):
Delete: `<Route path="/rehabs" element={<ProtectedRoute><LockedFeaturePage /></ProtectedRoute>} />`

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/layout/nav-data.ts frontend/src/App.tsx
git commit -m "feat: unlock Rehabs nav, add rehab routes"
```

---

## Task 6: Rehab Projects Page

**Files:**
- Create: `frontend/src/pages/rehab/RehabsPage.tsx`

This is the list page at `/rehabs`. Read the plan spec section 6 for the full component. The page shows project cards in a grid with budget bars, status badges, completion percentages, and a "New Project" button that opens a create modal.

The component should be a complete page (~250 lines) following the same patterns as TransactionsPage and ObligationsPage. Include:
- Header with title + "New Project" button
- Project cards grid (2 cols desktop, 1 mobile)
- Each card: property address, project name, status badge, budget progress bar, completion %, dates
- Empty state
- Create project modal (simple: name, property selector, import_bricked toggle)

I'll provide the full code in the implementation prompt since it's too large for this plan format.

- [ ] **Step 1: Create RehabsPage with project cards and create modal**

Create `frontend/src/pages/rehab/RehabsPage.tsx` following the spec. The implementer should read the spec at `docs/superpowers/specs/2026-04-04-rehab-tracker-design.md` section 6 for requirements.

- [ ] **Step 2: Verify build**

Run: `cd frontend && npx vite build 2>&1 | tail -5`

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/rehab/RehabsPage.tsx
git commit -m "feat: add rehab projects list page with budget bars and create modal"
```

---

## Task 7: Rehab Detail Page

**Files:**
- Create: `frontend/src/pages/rehab/RehabDetailPage.tsx`

This is the project detail page at `/rehabs/:projectId`. Read the plan spec section 7. The page shows:
- Header with budget KPIs (estimated, actual, variance)
- Items table with category badges, status cycling, inline editing
- "Add Item" form
- Category summary cards
- "Import from AI Estimate" button (if Bricked data exists)

The implementer should read the spec at `docs/superpowers/specs/2026-04-04-rehab-tracker-design.md` section 7 for requirements.

- [ ] **Step 1: Create RehabDetailPage with items table, budget viz, category summary**

Create `frontend/src/pages/rehab/RehabDetailPage.tsx` following the spec.

- [ ] **Step 2: Verify build**

Run: `cd frontend && npx vite build 2>&1 | tail -5`

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/rehab/RehabDetailPage.tsx
git commit -m "feat: add rehab detail page with items table, budget tracking, AI import"
```

---

## Task 8: Property Detail Integration

**Files:**
- Modify: `frontend/src/pages/properties/PropertyDetailPage.tsx`

- [ ] **Step 1: Add rehab summary to Overview tab**

Add import:
```typescript
import { useRehabProjects } from '@/hooks/useRehab'
```

In the OverviewTab component, add the rehab hook:
```typescript
  const { data: rehabProjects } = useRehabProjects({ property_id: propertyId })
```

In the right column of OverviewTab (after Tasks card), add a rehab summary card:
```typescript
        {/* Rehab Projects */}
        <Card title="Rehab Projects">
          {(!rehabProjects || rehabProjects.length === 0) ? (
            <div className="py-2">
              <p className="text-sm text-[#8A8580]">No rehab projects.</p>
              <Link to="/rehabs" className="text-xs text-[#8B7AFF] hover:text-[#A89FFF] transition-colors mt-1 inline-block">
                + Create Rehab Project
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {rehabProjects.map(proj => {
                const pct = proj.total_estimated > 0 ? Math.min((proj.total_actual / proj.total_estimated) * 100, 100) : 0
                const overBudget = proj.total_actual > proj.total_estimated && proj.total_estimated > 0
                return (
                  <Link key={proj.id} to={`/rehabs/${proj.id}`} className="block p-3 rounded-lg bg-[#0C0B0A] border border-[#1E1D1B] hover:border-[#8B7AFF]/20 transition-colors">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-[#F0EDE8]">{proj.name}</span>
                      <span className="text-[10px] uppercase tracking-wider text-[#8A8580]">{proj.status.replace(/_/g, ' ')}</span>
                    </div>
                    <div className="h-1.5 bg-[#1E1D1B] rounded-full overflow-hidden mb-1">
                      <div className={`h-full rounded-full ${overBudget ? 'bg-[#F87171]' : 'bg-[#4ADE80]'}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-[#8A8580]">
                      <span>${Number(proj.total_actual).toLocaleString()} of ${Number(proj.total_estimated).toLocaleString()}</span>
                      <span>{proj.completion_pct}% complete</span>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </Card>
```

- [ ] **Step 2: Verify build**

Run: `cd frontend && npx vite build 2>&1 | tail -5`

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/properties/PropertyDetailPage.tsx
git commit -m "feat: add rehab project summary to property detail overview"
```

---

## Summary

| Task | Files | Description |
|------|-------|-------------|
| 1 | `rehab_projects.py`, migration, `__init__.py`, `properties.py` | Models + migration |
| 2 | `schemas/rehab.py` | Pydantic schemas |
| 3 | `routers/rehab.py`, `main.py` | 10 endpoints: CRUD, bulk, summary, Bricked import |
| 4 | `types/index.ts`, `api.ts`, `useRehab.ts` | Frontend types, API, hooks |
| 5 | `nav-data.ts`, `App.tsx` | Unlock nav, add routes |
| 6 | `RehabsPage.tsx` | Project list with budget bars |
| 7 | `RehabDetailPage.tsx` | Detail with items table, budget viz, AI import |
| 8 | `PropertyDetailPage.tsx` | Rehab summary in property overview |
