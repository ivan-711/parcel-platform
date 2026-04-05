"""Pydantic schemas for skip tracing endpoints."""

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field, model_validator


class PhoneResult(BaseModel):
    number: str
    type: str  # mobile | landline | voip | unknown
    is_primary: bool = False


class EmailResult(BaseModel):
    email: str
    is_primary: bool = False


class TraceAddressRequest(BaseModel):
    property_id: Optional[UUID] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None

    @model_validator(mode="after")
    def require_property_or_address(self):
        if not self.property_id and not self.address:
            raise ValueError("Either property_id or address fields are required")
        return self


class TraceBatchRequest(BaseModel):
    records: list[dict] = Field(..., max_length=100)
    auto_create_contacts: bool = False


class SkipTraceResponse(BaseModel):
    model_config = {"from_attributes": True}
    id: UUID
    property_id: Optional[UUID] = None
    contact_id: Optional[UUID] = None
    status: str
    input_address: Optional[str] = None
    input_city: Optional[str] = None
    input_state: Optional[str] = None
    input_zip: Optional[str] = None
    owner_first_name: Optional[str] = None
    owner_last_name: Optional[str] = None
    phones: Optional[list[PhoneResult]] = None
    emails: Optional[list[EmailResult]] = None
    mailing_address: Optional[dict] = None
    is_absentee_owner: Optional[bool] = None
    demographics: Optional[dict] = None
    cost_cents: Optional[int] = None
    traced_at: Optional[datetime] = None
    created_at: datetime


class SkipTraceListItem(BaseModel):
    id: UUID
    status: str
    input_address: Optional[str] = None
    input_city: Optional[str] = None
    input_state: Optional[str] = None
    owner_first_name: Optional[str] = None
    owner_last_name: Optional[str] = None
    phone_count: int = 0
    email_count: int = 0
    is_absentee_owner: Optional[bool] = None
    contact_id: Optional[UUID] = None
    traced_at: Optional[datetime] = None
    created_at: datetime


class BatchStatusResponse(BaseModel):
    batch_id: str
    status: str  # processing | complete | failed
    total: int
    completed: int
    found: int
    not_found: int


class CreateContactFromTraceRequest(BaseModel):
    contact_type: str = "seller"


class CreateContactFromTraceResponse(BaseModel):
    existing: bool
    contact_id: UUID
    contact_name: str


class UsageResponse(BaseModel):
    used: int
    limit: Optional[int] = None
    cost_total_cents: int
