"""Pydantic schemas for the reports endpoints."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, field_validator


class CreateReportRequest(BaseModel):
    """Request body for POST /reports."""

    title: str
    report_type: str = "analysis"
    property_id: uuid.UUID
    scenario_id: uuid.UUID
    audience: Optional[str] = "client"


class UpdateReportRequest(BaseModel):
    """Request body for PATCH /reports/:id."""

    title: Optional[str] = None
    audience: Optional[str] = None
    is_public: Optional[bool] = None


class ReportResponse(BaseModel):
    """Full report object returned for list and detail endpoints."""

    id: uuid.UUID
    title: str
    report_type: str
    property_id: Optional[uuid.UUID] = None
    scenario_id: Optional[uuid.UUID] = None
    audience: Optional[str] = None
    share_token: Optional[str] = None
    share_url: Optional[str] = None
    is_public: bool
    view_count: int
    last_viewed_at: Optional[datetime] = None
    property_address: Optional[str] = None
    pdf_status: str = "none"
    created_at: datetime
    updated_at: datetime
    report_data: Optional[dict[str, Any]] = None

    model_config = {"from_attributes": True}


class ReportListResponse(BaseModel):
    """Paginated report list response."""

    reports: list[ReportResponse]
    total: int
    page: int
    per_page: int
    pages: int


class SharedReportResponse(BaseModel):
    """Public report data returned for share link — no owner info."""

    title: str
    report_type: str
    report_data: dict[str, Any]
    created_at: datetime


class ReportViewLogRequest(BaseModel):
    """Request body for POST /reports/share/:token/view."""

    sections_viewed: Optional[list[str]] = None
    time_spent_seconds: Optional[int] = None


class BrandKitSchema(BaseModel):
    """Brand kit configuration for reports."""

    logo_url: Optional[str] = None
    primary_color: Optional[str] = None
    company_name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    website: Optional[str] = None

    @field_validator("logo_url")
    @classmethod
    def validate_logo_url(cls, v: Optional[str]) -> Optional[str]:
        if v is None or v == "":
            return None
        allowed_extensions = (".png", ".jpg", ".jpeg", ".svg", ".webp")
        if not v.startswith("https://"):
            raise ValueError("logo_url must use HTTPS")
        lower = v.lower().split("?")[0]  # strip query params for extension check
        if not any(lower.endswith(ext) for ext in allowed_extensions):
            raise ValueError("logo_url must end with a valid image extension (.png, .jpg, .jpeg, .svg, .webp)")
        return v


class PdfStatusResponse(BaseModel):
    """Response for PDF generation status polling."""

    status: str  # "none" | "generating" | "ready" | "failed"
    download_url: Optional[str] = None
