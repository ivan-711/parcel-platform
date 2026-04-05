# backend/routers/rehab.py
"""Rehab router — CRUD for projects and items, Bricked import, budget tracking."""

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
