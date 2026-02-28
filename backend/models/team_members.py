"""TeamMember model — join table linking users to teams with a role."""

from datetime import datetime

from sqlalchemy import Column, DateTime, Enum, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from database import Base
from models.base import TimestampMixin

TeamMemberRole = Enum("owner", "analyst", "viewer", name="teammemberrole")


class TeamMember(TimestampMixin, Base):
    """Associates a user with a team and grants them a specific role."""

    __tablename__ = "team_members"

    team_id = Column(UUID(as_uuid=True), ForeignKey("teams.id"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    role = Column(TeamMemberRole, nullable=False, default="viewer")
    joined_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    team = relationship("Team", back_populates="members")
    user = relationship("User", back_populates="team_memberships", foreign_keys=[user_id])
