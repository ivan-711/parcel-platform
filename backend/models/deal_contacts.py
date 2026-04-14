"""DealContact junction — many-to-many between deals and contacts."""

from sqlalchemy import Column, ForeignKey, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID

from database import Base
from models.base import TimestampMixin


class DealContact(TimestampMixin, Base):
    """Links a contact to a deal with an optional role."""

    __tablename__ = "deal_contacts"
    __table_args__ = (
        UniqueConstraint("deal_id", "contact_id", name="uq_deal_contact"),
    )

    deal_id = Column(
        UUID(as_uuid=True),
        ForeignKey("deals.id"),
        nullable=False,
        index=True,
    )
    contact_id = Column(
        UUID(as_uuid=True),
        ForeignKey("contacts.id"),
        nullable=False,
        index=True,
    )
    role = Column(String, nullable=True)
    # seller | buyer | agent | lender | etc.
