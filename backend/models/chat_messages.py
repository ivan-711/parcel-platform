"""ChatMessage model — stores conversation history for the AI deal specialist."""

from sqlalchemy import Column, Enum, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from database import Base
from models.base import TimestampMixin

MessageRole = Enum("user", "assistant", name="messagerole")

ContextType = Enum("general", "deal", "document", name="contexttype")


class ChatMessage(TimestampMixin, Base):
    """A single message in a user's chat session with the AI deal specialist."""

    __tablename__ = "chat_messages"

    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    session_id = Column(String, nullable=False, index=True)
    role = Column(MessageRole, nullable=False)
    content = Column(Text, nullable=False)
    context_type = Column(ContextType, nullable=True)
    context_id = Column(UUID(as_uuid=True), nullable=True)

    # Relationships
    user = relationship("User", back_populates="chat_messages")
