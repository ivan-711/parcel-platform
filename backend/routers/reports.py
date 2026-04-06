"""Reports router — CRUD, public share, view tracking, and PDF generation."""

import hashlib
import logging
import math
import os
import re
import secrets
from datetime import datetime, timedelta
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.orm import Session

from core.billing.tier_gate import require_feature
from core.security.jwt import get_current_user
from core.storage.s3_service import delete_file, generate_presigned_url
from database import get_db
from limiter import limiter

logger = logging.getLogger(__name__)

# IP hash salt — read once at import time
_IP_HASH_SALT = os.getenv("IP_HASH_SALT", "parcel-default-salt-change-me")

# Bot and headless browser User-Agent patterns
_BOT_UA_RE = re.compile(
    r"bot|crawl|spider|slurp|HeadlessChrome|Playwright|Puppeteer|PhantomJS"
    r"|Googlebot|Bingbot|Baiduspider|YandexBot|DuckDuckBot|facebookexternalhit",
    re.IGNORECASE,
)


def _hash_ip(ip: str) -> str:
    """Hash an IP address with a server-side salt."""
    return hashlib.sha256(f"{_IP_HASH_SALT}{ip}".encode()).hexdigest()[:16]


def _is_bot(user_agent: str) -> bool:
    """Check if a User-Agent string looks like a bot or headless browser."""
    return bool(_BOT_UA_RE.search(user_agent))
from models.analysis_scenarios import AnalysisScenario
from models.properties import Property
from models.report_views import ReportView
from models.reports import Report
from models.users import User
from schemas.reports import (
    BrandKitSchema,
    CreateReportRequest,
    PdfStatusResponse,
    ReportListResponse,
    ReportResponse,
    ReportViewLogRequest,
    SharedReportResponse,
    UpdateReportRequest,
)

router = APIRouter(prefix="/reports", tags=["reports"])


def _build_report_data(prop: Property, scenario: AnalysisScenario, user: User) -> dict:
    """Build a frozen data snapshot from property + scenario + brand kit."""
    return {
        "property": {
            "address_line1": prop.address_line1,
            "city": prop.city,
            "state": prop.state,
            "zip_code": prop.zip_code,
            "property_type": prop.property_type,
            "bedrooms": prop.bedrooms,
            "bathrooms": float(prop.bathrooms) if prop.bathrooms else None,
            "sqft": prop.sqft,
            "year_built": prop.year_built,
        },
        "scenario": {
            "strategy": scenario.strategy,
            "purchase_price": float(scenario.purchase_price) if scenario.purchase_price else None,
            "after_repair_value": float(scenario.after_repair_value) if scenario.after_repair_value else None,
            "repair_cost": float(scenario.repair_cost) if scenario.repair_cost else None,
            "monthly_rent": float(scenario.monthly_rent) if scenario.monthly_rent else None,
            "inputs_extended": scenario.inputs_extended,
            "outputs": scenario.outputs,
            "risk_score": float(scenario.risk_score) if scenario.risk_score else None,
            "risk_flags": scenario.risk_flags,
            "ai_narrative": scenario.ai_narrative,
        },
        "brand_kit": user.brand_kit,
    }


def _report_to_response(report: Report, include_data: bool = False) -> ReportResponse:
    """Convert a Report model to a ReportResponse schema."""
    prop_address = None
    if report.report_data and report.report_data.get("property"):
        p = report.report_data["property"]
        prop_address = f"{p.get('address_line1', '')}, {p.get('city', '')}, {p.get('state', '')}"

    pdf_status = "none"
    if report.pdf_s3_key:
        pdf_status = "ready"

    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
    share_url = f"{frontend_url}/reports/view/{report.share_token}" if report.share_token else None

    return ReportResponse(
        id=report.id,
        title=report.title,
        report_type=report.report_type,
        property_id=report.property_id,
        scenario_id=report.scenario_id,
        audience=report.audience,
        share_token=report.share_token,
        share_url=share_url,
        is_public=report.is_public,
        view_count=report.view_count,
        last_viewed_at=report.last_viewed_at,
        property_address=prop_address,
        pdf_status=pdf_status,
        created_at=report.created_at,
        updated_at=report.updated_at,
        report_data=report.report_data if include_data else None,
    )


# ---------------------------------------------------------------------------
# Authenticated endpoints
# ---------------------------------------------------------------------------


@router.post("/", response_model=ReportResponse, status_code=status.HTTP_201_CREATED)
async def create_report(
    body: CreateReportRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ReportResponse:
    """Create a report with a frozen data snapshot from property + scenario."""
    prop = db.query(Property).filter(
        Property.id == body.property_id,
        Property.created_by == current_user.id,
        Property.is_deleted == False,
    ).first()
    if not prop:
        raise HTTPException(status_code=404, detail={"error": "Property not found", "code": "PROPERTY_NOT_FOUND"})

    scenario = db.query(AnalysisScenario).filter(
        AnalysisScenario.id == body.scenario_id,
        AnalysisScenario.created_by == current_user.id,
        AnalysisScenario.is_deleted == False,
    ).first()
    if not scenario:
        raise HTTPException(status_code=404, detail={"error": "Scenario not found", "code": "SCENARIO_NOT_FOUND"})

    if scenario.property_id != body.property_id:
        raise HTTPException(
            status_code=400,
            detail={"error": "Scenario does not belong to this property", "code": "SCENARIO_PROPERTY_MISMATCH"},
        )

    report_data = _build_report_data(prop, scenario, current_user)

    report = Report(
        created_by=current_user.id,
        team_id=current_user.team_id,
        title=body.title,
        report_type=body.report_type,
        property_id=body.property_id,
        scenario_id=body.scenario_id,
        audience=body.audience,
        report_data=report_data,
        share_token=secrets.token_urlsafe(16),
        is_public=(body.audience != "internal"),
        brand_logo_url=(current_user.brand_kit or {}).get("logo_url"),
        brand_colors=current_user.brand_kit,
    )
    db.add(report)
    db.commit()
    db.refresh(report)

    from core.telemetry import track_event
    track_event(current_user.id, "report_created", {
        "report_type": body.report_type,
        "audience": body.audience,
        "property_id": str(body.property_id),
    })

    return _report_to_response(report, include_data=True)


@router.get("/", response_model=ReportListResponse)
async def list_reports(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ReportListResponse:
    """List reports for the current user with pagination."""
    base_query = (
        db.query(Report)
        .filter(Report.created_by == current_user.id, Report.is_deleted == False)
        .order_by(Report.created_at.desc())
    )
    total = base_query.count()
    pages = max(1, math.ceil(total / per_page))
    offset = (page - 1) * per_page
    reports = base_query.offset(offset).limit(per_page).all()

    return ReportListResponse(
        reports=[_report_to_response(r) for r in reports],
        total=total,
        page=page,
        per_page=per_page,
        pages=pages,
    )


@router.get("/{report_id}", response_model=ReportResponse)
async def get_report(
    report_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ReportResponse:
    """Return full report details including report_data for the owner."""
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report or report.created_by != current_user.id or report.is_deleted:
        raise HTTPException(status_code=404, detail={"error": "Report not found", "code": "REPORT_NOT_FOUND"})
    return _report_to_response(report, include_data=True)


@router.patch("/{report_id}", response_model=ReportResponse)
async def update_report(
    report_id: UUID,
    body: UpdateReportRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ReportResponse:
    """Update report metadata (title, audience, is_public)."""
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report or report.created_by != current_user.id or report.is_deleted:
        raise HTTPException(status_code=404, detail={"error": "Report not found", "code": "REPORT_NOT_FOUND"})

    if body.title is not None:
        report.title = body.title
    if body.audience is not None:
        report.audience = body.audience
    if body.is_public is not None:
        report.is_public = body.is_public
    db.commit()
    db.refresh(report)
    return _report_to_response(report)


@router.delete("/{report_id}")
async def delete_report(
    report_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict[str, str]:
    """Soft delete a report and remove cached PDF."""
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report or report.created_by != current_user.id:
        raise HTTPException(status_code=404, detail={"error": "Report not found", "code": "REPORT_NOT_FOUND"})

    report.is_deleted = True
    if report.pdf_s3_key:
        try:
            delete_file(report.pdf_s3_key)
        except Exception:
            pass
        report.pdf_s3_key = None
    db.commit()
    return {"message": "Report deleted"}


# ---------------------------------------------------------------------------
# PDF generation (authenticated, feature-gated)
# ---------------------------------------------------------------------------


@router.post("/{report_id}/pdf", response_model=PdfStatusResponse)
async def trigger_pdf_generation(
    report_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    _feat: None = Depends(require_feature("pdf_export")),
) -> PdfStatusResponse:
    """Trigger Playwright PDF generation as a background task."""
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report or report.created_by != current_user.id or report.is_deleted:
        raise HTTPException(status_code=404, detail={"error": "Report not found", "code": "REPORT_NOT_FOUND"})

    # Return cached PDF if available
    if report.pdf_s3_key:
        url = generate_presigned_url(report.pdf_s3_key)
        return PdfStatusResponse(status="ready", download_url=url)

    # Dispatch background task
    from core.tasks.pdf_generation import generate_report_pdf
    generate_report_pdf.send(str(report.id))

    return PdfStatusResponse(status="generating")


@router.get("/{report_id}/pdf/status", response_model=PdfStatusResponse)
async def pdf_status(
    report_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> PdfStatusResponse:
    """Poll for PDF generation status."""
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report or report.created_by != current_user.id or report.is_deleted:
        raise HTTPException(status_code=404, detail={"error": "Report not found", "code": "REPORT_NOT_FOUND"})

    if report.pdf_s3_key:
        url = generate_presigned_url(report.pdf_s3_key)
        return PdfStatusResponse(status="ready", download_url=url)

    return PdfStatusResponse(status="generating")


# ---------------------------------------------------------------------------
# Public share endpoints (NO AUTH)
# ---------------------------------------------------------------------------


@router.get("/share/{share_token}", response_model=SharedReportResponse)
@limiter.limit("60/minute")
async def get_shared_report(
    share_token: str,
    request: Request,
    db: Session = Depends(get_db),
) -> SharedReportResponse:
    """Public endpoint — returns report data for rendering. No auth required."""
    report = db.query(Report).filter(
        Report.share_token == share_token,
        Report.is_public == True,
        Report.is_deleted == False,
    ).first()
    if not report:
        raise HTTPException(status_code=404, detail={"error": "Report not found or no longer available", "code": "REPORT_NOT_FOUND"})

    user_agent = request.headers.get("user-agent", "")[:500]
    ip_hash = _hash_ip(request.client.host or "unknown")

    # Determine if this view should increment the counter:
    # Skip bots/Playwright, skip report owner, deduplicate by IP (5-min window)
    should_count = True

    if _is_bot(user_agent):
        should_count = False

    # Check if the viewer is the report owner (via cookie or Bearer token)
    if should_count:
        viewer_id = None
        try:
            from core.security.jwt import verify_token
            token = request.cookies.get("access_token")
            if token:
                payload = verify_token(token)
                if payload:
                    viewer_id = str(payload.get("sub"))
        except Exception:
            pass
        if not viewer_id:
            try:
                from core.security.clerk import verify_clerk_token
                auth_header = request.headers.get("authorization", "")
                if auth_header.startswith("Bearer "):
                    claims = verify_clerk_token(auth_header[7:])
                    if claims:
                        viewer_id = claims.get("sub")
            except Exception:
                pass
        if viewer_id and viewer_id == str(report.created_by):
            should_count = False

    # Deduplicate: same IP within last 5 minutes
    if should_count:
        recent_cutoff = datetime.utcnow() - timedelta(minutes=5)
        recent_view = (
            db.query(ReportView)
            .filter(
                ReportView.report_id == report.id,
                ReportView.ip_hash == ip_hash,
                ReportView.created_at >= recent_cutoff,
            )
            .first()
        )
        if recent_view:
            should_count = False

    if should_count:
        report.view_count = (report.view_count or 0) + 1
        report.last_viewed_at = datetime.utcnow()

    # Always log the view event (for audit), but mark bots
    view = ReportView(
        report_id=report.id,
        ip_hash=ip_hash,
        user_agent=user_agent,
        referrer=request.headers.get("referer", "")[:500],
    )
    db.add(view)
    db.commit()

    return SharedReportResponse(
        title=report.title,
        report_type=report.report_type,
        report_data=report.report_data or {},
        created_at=report.created_at,
    )


@router.post("/share/{share_token}/view", status_code=204)
@limiter.limit("10/minute")
async def log_view_engagement(
    share_token: str,
    body: ReportViewLogRequest,
    request: Request,
    db: Session = Depends(get_db),
) -> None:
    """Log detailed engagement data (sections viewed, time spent). No auth required."""
    report = db.query(Report).filter(
        Report.share_token == share_token,
        Report.is_deleted == False,
    ).first()
    if not report:
        return  # Silently ignore — don't expose report existence

    # Cap payload sizes to prevent database bloat attacks
    sections = (body.sections_viewed or [])[:50]
    time_spent = min(body.time_spent_seconds or 0, 86400)

    ip_hash = _hash_ip(request.client.host or "unknown")
    view = ReportView(
        report_id=report.id,
        ip_hash=ip_hash,
        user_agent=request.headers.get("user-agent", "")[:500],
        referrer=request.headers.get("referer", "")[:500],
        sections_viewed=sections,
        time_spent_seconds=time_spent,
    )
    db.add(view)
    db.commit()
