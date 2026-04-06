"""Contacts router — CRM CRUD, communications log, deal linking."""

import logging
from datetime import datetime
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel, Field
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from core.security.jwt import get_current_user
from database import get_db
from limiter import limiter
from models.communications import Communication
from models.contacts import Contact
from models.deal_contacts import DealContact
from models.deals import Deal
from models.users import User

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/contacts", tags=["contacts"])


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class ContactResponse(BaseModel):
    id: str
    first_name: str
    last_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    company: Optional[str] = None
    contact_type: Optional[str] = None
    notes: Optional[str] = None
    tags: Optional[list] = None
    is_deleted: bool = False
    created_at: str
    updated_at: str

    model_config = {"from_attributes": True}

    @classmethod
    def from_contact(cls, c: Contact) -> "ContactResponse":
        return cls(
            id=str(c.id),
            first_name=c.first_name,
            last_name=c.last_name,
            email=c.email,
            phone=c.phone,
            company=c.company,
            contact_type=c.contact_type,
            notes=c.notes,
            tags=c.tags,
            is_deleted=c.is_deleted,
            created_at=(
                c.created_at.isoformat() if c.created_at else ""
            ),
            updated_at=(
                c.updated_at.isoformat() if c.updated_at else ""
            ),
        )


class ContactListItem(BaseModel):
    id: str
    first_name: str
    last_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    company: Optional[str] = None
    contact_type: Optional[str] = None
    deal_count: int = 0
    last_communication: Optional[str] = None
    created_at: str
    updated_at: str


class ContactListResponse(BaseModel):
    contacts: list[ContactListItem]
    total: int
    page: int
    per_page: int


class CreateContactRequest(BaseModel):
    first_name: str = Field(..., min_length=1)
    last_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    company: Optional[str] = None
    contact_type: Optional[str] = None
    notes: Optional[str] = None
    tags: Optional[list] = None


class UpdateContactRequest(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    company: Optional[str] = None
    contact_type: Optional[str] = None
    notes: Optional[str] = None
    tags: Optional[list] = None


class CommunicationResponse(BaseModel):
    id: str
    channel: str
    direction: Optional[str] = None
    subject: Optional[str] = None
    body: Optional[str] = None
    deal_id: Optional[str] = None
    property_id: Optional[str] = None
    occurred_at: str
    created_at: str

    @classmethod
    def from_comm(cls, c: Communication) -> "CommunicationResponse":
        return cls(
            id=str(c.id),
            channel=c.channel,
            direction=c.direction,
            subject=c.subject,
            body=c.body,
            deal_id=str(c.deal_id) if c.deal_id else None,
            property_id=(
                str(c.property_id) if c.property_id else None
            ),
            occurred_at=(
                c.occurred_at.isoformat() if c.occurred_at else ""
            ),
            created_at=(
                c.created_at.isoformat() if c.created_at else ""
            ),
        )


class CreateCommunicationRequest(BaseModel):
    channel: str = Field(
        ..., description="call | sms | email | meeting | note"
    )
    occurred_at: str
    direction: Optional[str] = None
    subject: Optional[str] = None
    body: Optional[str] = None
    deal_id: Optional[str] = None
    property_id: Optional[str] = None


class LinkedDealResponse(BaseModel):
    deal_id: str
    address: str
    strategy: str
    status: str
    role: Optional[str] = None
    created_at: str


class LinkDealRequest(BaseModel):
    role: Optional[str] = None


# ---------------------------------------------------------------------------
# Contact CRUD
# ---------------------------------------------------------------------------

@router.get("/", response_model=ContactListResponse)
async def list_contacts(
    request: Request,
    contact_type: Optional[str] = Query(None, alias="type"),
    search: Optional[str] = Query(None, alias="q"),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ContactListResponse:
    """List contacts with optional filters and pagination."""
    q = db.query(Contact).filter(
        Contact.created_by == current_user.id,
        Contact.is_deleted == False,  # noqa: E712
    )

    if contact_type:
        q = q.filter(Contact.contact_type == contact_type)

    if search:
        pattern = f"%{search}%"
        q = q.filter(
            or_(
                Contact.first_name.ilike(pattern),
                Contact.last_name.ilike(pattern),
                Contact.email.ilike(pattern),
                Contact.company.ilike(pattern),
            )
        )

    total = q.count()
    contacts = (
        q.order_by(Contact.updated_at.desc())
        .offset((page - 1) * per_page)
        .limit(per_page)
        .all()
    )

    # Batch-load deal counts and last communication to avoid N+1
    contact_ids = [c.id for c in contacts]

    deal_count_map: dict = {}
    last_comm_map: dict = {}
    if contact_ids:
        # Deal counts — only count non-deleted deals owned by user
        deal_counts = (
            db.query(DealContact.contact_id, func.count(DealContact.id))
            .join(Deal, Deal.id == DealContact.deal_id)
            .filter(
                DealContact.contact_id.in_(contact_ids),
                Deal.user_id == current_user.id,
                Deal.deleted_at.is_(None),
            )
            .group_by(DealContact.contact_id)
            .all()
        )
        deal_count_map = {cid: cnt for cid, cnt in deal_counts}

        # Last communication per contact
        last_comms = (
            db.query(
                Communication.contact_id,
                func.max(Communication.occurred_at).label("last_at"),
            )
            .filter(
                Communication.contact_id.in_(contact_ids),
                Communication.is_deleted == False,  # noqa: E712
            )
            .group_by(Communication.contact_id)
            .all()
        )
        last_comm_map = {cid: last_at for cid, last_at in last_comms}

    items: list[ContactListItem] = []
    for c in contacts:
        last_comm = last_comm_map.get(c.id)
        items.append(ContactListItem(
            id=str(c.id),
            first_name=c.first_name,
            last_name=c.last_name,
            email=c.email,
            phone=c.phone,
            company=c.company,
            contact_type=c.contact_type,
            deal_count=deal_count_map.get(c.id, 0),
            last_communication=(
                last_comm.isoformat() if last_comm else None
            ),
            created_at=(
                c.created_at.isoformat() if c.created_at else ""
            ),
            updated_at=(
                c.updated_at.isoformat() if c.updated_at else ""
            ),
        ))

    return ContactListResponse(
        contacts=items,
        total=total,
        page=page,
        per_page=per_page,
    )


@router.get("/{contact_id}", response_model=ContactResponse)
async def get_contact(
    contact_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ContactResponse:
    """Get a single contact by ID."""
    contact = _get_contact_or_404(db, contact_id, current_user.id)
    return ContactResponse.from_contact(contact)


@router.post("/", response_model=ContactResponse, status_code=201)
async def create_contact(
    body: CreateContactRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ContactResponse:
    """Create a new contact."""
    contact = Contact(
        created_by=current_user.id,
        first_name=body.first_name,
        last_name=body.last_name,
        email=body.email,
        phone=body.phone,
        company=body.company,
        contact_type=body.contact_type,
        notes=body.notes,
        tags=body.tags,
    )
    db.add(contact)
    db.commit()
    db.refresh(contact)
    return ContactResponse.from_contact(contact)


@router.patch(
    "/{contact_id}",
    response_model=ContactResponse,
)
async def update_contact(
    contact_id: UUID,
    body: UpdateContactRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ContactResponse:
    """Update contact fields."""
    contact = _get_contact_or_404(db, contact_id, current_user.id)

    update_data = body.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(contact, field, value)

    db.commit()
    db.refresh(contact)
    return ContactResponse.from_contact(contact)


@router.delete("/{contact_id}", status_code=204)
async def delete_contact(
    contact_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Soft-delete a contact."""
    contact = _get_contact_or_404(db, contact_id, current_user.id)
    contact.is_deleted = True
    db.commit()
    return None


# ---------------------------------------------------------------------------
# Communications
# ---------------------------------------------------------------------------

@router.get(
    "/{contact_id}/communications",
    response_model=list[CommunicationResponse],
)
async def list_communications(
    contact_id: UUID,
    limit: int = Query(50, ge=1, le=200),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[CommunicationResponse]:
    """List communications for a contact."""
    _get_contact_or_404(db, contact_id, current_user.id)

    comms = (
        db.query(Communication)
        .filter(
            Communication.contact_id == contact_id,
            Communication.created_by == current_user.id,
            Communication.is_deleted == False,  # noqa: E712
        )
        .order_by(Communication.occurred_at.desc())
        .limit(limit)
        .all()
    )
    return [CommunicationResponse.from_comm(c) for c in comms]


@router.post(
    "/{contact_id}/communications",
    response_model=CommunicationResponse,
    status_code=201,
)
async def create_communication(
    contact_id: UUID,
    body: CreateCommunicationRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> CommunicationResponse:
    """Log a communication for this contact."""
    _get_contact_or_404(db, contact_id, current_user.id)

    valid_channels = {"call", "sms", "email", "meeting", "note"}
    if body.channel not in valid_channels:
        raise HTTPException(
            status_code=400,
            detail={
                "error": (
                    f"Invalid channel. Must be one of: "
                    f"{', '.join(sorted(valid_channels))}"
                ),
                "code": "INVALID_CHANNEL",
            },
        )

    # Validate ownership of linked deal/property
    if body.deal_id:
        try:
            did = UUID(body.deal_id)
        except ValueError:
            raise HTTPException(status_code=400, detail={"error": "Invalid deal_id", "code": "INVALID_ID"})
        deal = db.query(Deal).filter(Deal.id == did, Deal.user_id == current_user.id, Deal.deleted_at.is_(None)).first()
        if not deal:
            raise HTTPException(status_code=404, detail={"error": "Deal not found", "code": "NOT_FOUND"})

    if body.property_id:
        try:
            pid = UUID(body.property_id)
        except ValueError:
            raise HTTPException(status_code=400, detail={"error": "Invalid property_id", "code": "INVALID_ID"})
        from models.properties import Property
        prop = db.query(Property).filter(Property.id == pid, Property.created_by == current_user.id, Property.is_deleted == False).first()  # noqa: E712
        if not prop:
            raise HTTPException(status_code=404, detail={"error": "Property not found", "code": "NOT_FOUND"})

    # Validate occurred_at is a valid datetime
    try:
        occurred_at = datetime.fromisoformat(body.occurred_at)
    except (ValueError, TypeError):
        raise HTTPException(status_code=400, detail={"error": "Invalid occurred_at datetime", "code": "INVALID_DATE"})

    comm = Communication(
        created_by=current_user.id,
        contact_id=contact_id,
        channel=body.channel,
        direction=body.direction,
        subject=body.subject,
        body=body.body,
        deal_id=UUID(body.deal_id) if body.deal_id else None,
        property_id=(
            UUID(body.property_id) if body.property_id else None
        ),
        occurred_at=occurred_at,
    )
    db.add(comm)
    db.commit()
    db.refresh(comm)
    return CommunicationResponse.from_comm(comm)


# ---------------------------------------------------------------------------
# Deal linking
# ---------------------------------------------------------------------------

@router.get(
    "/{contact_id}/deals",
    response_model=list[LinkedDealResponse],
)
async def list_linked_deals(
    contact_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[LinkedDealResponse]:
    """List deals linked to a contact."""
    _get_contact_or_404(db, contact_id, current_user.id)

    rows = (
        db.query(DealContact, Deal)
        .join(Deal, Deal.id == DealContact.deal_id)
        .filter(
            DealContact.contact_id == contact_id,
            Deal.user_id == current_user.id,
            Deal.deleted_at.is_(None),
        )
        .order_by(Deal.created_at.desc())
        .all()
    )

    return [
        LinkedDealResponse(
            deal_id=str(deal.id),
            address=deal.address,
            strategy=deal.strategy,
            status=deal.status,
            role=dc.role,
            created_at=(
                deal.created_at.isoformat() if deal.created_at else ""
            ),
        )
        for dc, deal in rows
    ]


@router.post(
    "/{contact_id}/deals/{deal_id}",
    status_code=201,
)
async def link_deal(
    contact_id: UUID,
    deal_id: UUID,
    body: LinkDealRequest = LinkDealRequest(),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Link a contact to a deal."""
    _get_contact_or_404(db, contact_id, current_user.id)

    # Verify deal ownership
    deal = db.query(Deal).filter(
        Deal.id == deal_id,
        Deal.user_id == current_user.id,
        Deal.deleted_at.is_(None),
    ).first()
    if not deal:
        raise HTTPException(
            status_code=404,
            detail={"error": "Deal not found", "code": "NOT_FOUND"},
        )

    # Check existing link
    existing = db.query(DealContact).filter(
        DealContact.deal_id == deal_id,
        DealContact.contact_id == contact_id,
    ).first()
    if existing:
        return {"message": "Already linked"}

    link = DealContact(
        deal_id=deal_id,
        contact_id=contact_id,
        role=body.role,
    )
    db.add(link)
    db.commit()
    return {"message": "Contact linked to deal"}


@router.delete(
    "/{contact_id}/deals/{deal_id}",
    status_code=204,
)
async def unlink_deal(
    contact_id: UUID,
    deal_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Unlink a contact from a deal."""
    _get_contact_or_404(db, contact_id, current_user.id)

    link = db.query(DealContact).filter(
        DealContact.deal_id == deal_id,
        DealContact.contact_id == contact_id,
    ).first()
    if link:
        db.delete(link)
        db.commit()
    return None


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _get_contact_or_404(
    db: Session, contact_id: UUID, user_id: UUID
) -> Contact:
    contact = db.query(Contact).filter(
        Contact.id == contact_id,
        Contact.created_by == user_id,
        Contact.is_deleted == False,  # noqa: E712
    ).first()
    if not contact:
        raise HTTPException(
            status_code=404,
            detail={
                "error": "Contact not found",
                "code": "NOT_FOUND",
            },
        )
    return contact
