"""Demo chat service — returns fixture-based seeded history for the demo account.

Demo users get pre-loaded conversations from a JSON fixture file instead of
querying the database.  Messages are never persisted for demo users.
"""

import json
import uuid
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any

from schemas.chat import ChatHistoryResponse, ChatMessageResponse

# ---------------------------------------------------------------------------
# Load fixture data at module level (cached for the lifetime of the process)
# ---------------------------------------------------------------------------
_FIXTURE_PATH = Path(__file__).resolve().parent.parent.parent / "fixtures" / "demo_chat.json"

try:
    with open(_FIXTURE_PATH, "r", encoding="utf-8") as _f:
        _FIXTURE_DATA: dict[str, Any] = json.load(_f)
except (FileNotFoundError, json.JSONDecodeError) as _exc:
    import logging as _logging
    _logging.getLogger(__name__).error("Failed to load demo chat fixture: %s", _exc)
    _FIXTURE_DATA: dict[str, Any] = {"conversations": []}

# Conversation age offsets: how many days ago each conversation started
_CONVERSATION_AGE_DAYS: list[int] = [3, 2, 1]

# Spacing between messages within a conversation
_MESSAGE_SPACING_MINUTES: int = 5


def _stable_uuid(session_id: str, index: int) -> uuid.UUID:
    """Generate a deterministic UUID for a demo message.

    Uses uuid5 with NAMESPACE_URL so the same session_id + index always
    produces the same UUID, making tests predictable and frontend keys stable.
    """
    return uuid.uuid5(uuid.NAMESPACE_URL, f"demo-{session_id}-{index}")


def get_seeded_history() -> ChatHistoryResponse:
    """Return fixture-based chat history formatted as a ChatHistoryResponse.

    Timestamps are computed relative to *now* so the conversations always
    appear recent.  Messages are returned in chronological order across all
    conversations.
    """
    now = datetime.utcnow()
    all_messages: list[ChatMessageResponse] = []

    conversations: list[dict[str, Any]] = _FIXTURE_DATA["conversations"]

    for conv_idx, conversation in enumerate(conversations):
        session_id: str = conversation["session_id"]
        days_ago = _CONVERSATION_AGE_DAYS[conv_idx] if conv_idx < len(_CONVERSATION_AGE_DAYS) else 1
        base_time = now - timedelta(days=days_ago)

        for msg_idx, message in enumerate(conversation["messages"]):
            created_at = base_time + timedelta(minutes=msg_idx * _MESSAGE_SPACING_MINUTES)
            msg = ChatMessageResponse(
                id=_stable_uuid(session_id, msg_idx),
                role=message["role"],
                content=message["content"],
                context_type=message.get("context_type"),
                created_at=created_at.isoformat(),
            )
            all_messages.append(msg)

    # Sort all messages chronologically (oldest first)
    all_messages.sort(key=lambda m: m.created_at)

    return ChatHistoryResponse(messages=all_messages)
