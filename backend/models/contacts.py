"""Contact model — people associated with deals and properties."""

from sqlalchemy import Boolean, Column, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import relationship

from database import Base
from models.base import TimestampMixin


class Contact(TimestampMixin, Base):
    """A person connected to deals, properties, or communications."""

    __tablename__ = "contacts"

    team_id = Column(UUID(as_uuid=True), nullable=True)
    created_by = Column(UUID(as_uuid=True), nullable=False, index=True)

    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=True)
    email = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    company = Column(String, nullable=True)
    contact_type = Column(String, nullable=True)
    # seller | buyer | agent | lender | contractor | tenant | partner | other

    notes = Column(Text, nullable=True)
    tags = Column(JSONB, nullable=True)

    is_deleted = Column(Boolean, default=False, nullable=False)
    opted_out_sms = Column(Boolean, default=False, nullable=False)

    # Relationships
    buy_boxes = relationship("BuyBox", back_populates="contact", cascade="all, delete-orphan")
