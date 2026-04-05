"""MailCampaign and MailRecipient models — direct mail campaign management."""

from sqlalchemy import Boolean, Column, Date, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import relationship

from database import Base
from models.base import TimestampMixin


class MailCampaign(TimestampMixin, Base):
    """A direct mail campaign targeting a set of recipients."""

    __tablename__ = "mail_campaigns"

    # Ownership
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    team_id = Column(UUID(as_uuid=True), nullable=True)

    # Identity
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)

    # Status — draft | scheduled | sending | sent | cancelled
    status = Column(String, nullable=False, default="draft")

    # Mail type — postcard_4x6 | postcard_6x9 | postcard_6x11 | letter
    mail_type = Column(String, nullable=False)

    # Template content
    template_front_html = Column(Text, nullable=True)
    template_back_html = Column(Text, nullable=True)

    # Return address — {name, line1, city, state, zip}
    from_address = Column(JSONB, nullable=True)

    # Scheduling
    scheduled_date = Column(Date, nullable=True)
    sent_at = Column(DateTime, nullable=True)

    # Aggregate counters
    total_recipients = Column(Integer, nullable=False, default=0)
    total_sent = Column(Integer, nullable=False, default=0)
    total_delivered = Column(Integer, nullable=False, default=0)
    total_returned = Column(Integer, nullable=False, default=0)
    total_cost_cents = Column(Integer, nullable=False, default=0)

    # Soft delete
    deleted_at = Column(DateTime, nullable=True)

    # Relationships
    recipients = relationship(
        "MailRecipient",
        back_populates="campaign",
        cascade="all, delete-orphan",
    )


class MailRecipient(TimestampMixin, Base):
    """A single recipient record within a mail campaign."""

    __tablename__ = "mail_recipients"

    # Campaign FK
    campaign_id = Column(UUID(as_uuid=True), ForeignKey("mail_campaigns.id"), nullable=False, index=True)

    # Optional links to existing CRM objects
    contact_id = Column(UUID(as_uuid=True), ForeignKey("contacts.id"), nullable=True)
    property_id = Column(UUID(as_uuid=True), ForeignKey("properties.id"), nullable=True)

    # Destination address
    to_name = Column(String, nullable=True)
    to_address = Column(JSONB, nullable=False)  # {name, line1, city, state, zip}

    # Address verification
    address_verified = Column(Boolean, nullable=False, default=False)
    deliverability = Column(String, nullable=True)  # usps result code / label

    # Lob.com integration
    lob_mail_id = Column(String, nullable=True)

    # Status — pending | queued | in_transit | delivered | returned | cancelled | failed
    status = Column(String, nullable=False, default="pending")

    # Cost
    cost_cents = Column(Integer, nullable=True)

    # Rendered HTML snapshots (stored for audit / re-print)
    rendered_front = Column(Text, nullable=True)
    rendered_back = Column(Text, nullable=True)

    # Soft delete
    deleted_at = Column(DateTime, nullable=True)

    # Relationships
    campaign = relationship("MailCampaign", back_populates="recipients")
    contact = relationship("Contact", foreign_keys=[contact_id])
    property = relationship("Property", foreign_keys=[property_id])
