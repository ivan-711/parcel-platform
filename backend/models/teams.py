"""Team model — represents a group of users collaborating on deals."""

from sqlalchemy import Column, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from database import Base
from models.base import TimestampMixin


class Team(TimestampMixin, Base):
    """A team that groups users together for collaborative deal analysis."""

    __tablename__ = "teams"

    name = Column(String, nullable=False)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)

    # Relationships
    members = relationship("TeamMember", back_populates="team")
    deals = relationship("Deal", back_populates="team", foreign_keys="Deal.team_id")
