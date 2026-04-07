"""Tests for demo chat isolation — fixture-based history and no-persist streaming.

Verifies that demo users get seeded conversations from the JSON fixture,
that their chat messages are not persisted to the database, and that
regular users are completely unaffected.
"""

import json
import sys
import os
import uuid
from unittest.mock import patch, MagicMock

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from core.demo import DEMO_EMAIL, is_demo_user, is_reserved_email
from core.demo.chat_service import get_seeded_history, _FIXTURE_DATA
from core.security.jwt import get_current_user
from models.users import User
from models.chat_messages import ChatMessage


# ---------------------------------------------------------------------------
# Unit tests — is_demo_user
# ---------------------------------------------------------------------------

class TestIsDemoUser:
    """Verify the is_demo_user predicate."""

    def test_is_demo_user_true(self):
        """Returns True when user email matches DEMO_EMAIL."""
        user = MagicMock(spec=User)
        user.email = DEMO_EMAIL
        assert is_demo_user(user) is True

    def test_is_demo_user_false(self):
        """Returns False for a non-demo email."""
        user = MagicMock(spec=User)
        user.email = "investor@example.com"
        assert is_demo_user(user) is False

    def test_is_demo_user_case_insensitive(self):
        """is_demo_user matches regardless of email casing."""
        for variant in ["Demo@Parcel.App", "DEMO@PARCEL.APP", "Demo@parcel.app"]:
            user = MagicMock(spec=User)
            user.email = variant
            assert is_demo_user(user) is True, f"Failed for {variant}"


# ---------------------------------------------------------------------------
# Unit tests — is_reserved_email
# ---------------------------------------------------------------------------

class TestIsReservedEmail:
    """Verify the is_reserved_email guard."""

    def test_demo_email_is_reserved(self):
        """The demo email is reserved."""
        assert is_reserved_email(DEMO_EMAIL) is True

    def test_demo_email_case_insensitive(self):
        """Reserved email check is case-insensitive."""
        assert is_reserved_email("DEMO@PARCEL.APP") is True
        assert is_reserved_email("Demo@Parcel.App") is True

    def test_regular_email_not_reserved(self):
        """A regular email is not reserved."""
        assert is_reserved_email("investor@example.com") is False


# ---------------------------------------------------------------------------
# Unit tests — fixture loading and seeded history
# ---------------------------------------------------------------------------

class TestFixtureAndSeededHistory:
    """Verify the JSON fixture loads correctly and the seeded history is stable."""

    def test_fixture_file_loads(self):
        """The JSON fixture file loads without errors and has the expected structure."""
        assert "conversations" in _FIXTURE_DATA
        conversations = _FIXTURE_DATA["conversations"]
        assert isinstance(conversations, list)
        assert len(conversations) == 3
        for conv in conversations:
            assert "session_id" in conv
            assert "title" in conv
            assert "messages" in conv
            assert len(conv["messages"]) >= 2

    def test_seeded_history_returns_conversations(self):
        """get_seeded_history() returns all 3 conversations' messages."""
        history = get_seeded_history()
        assert len(history.messages) > 0
        # All 3 conversations contribute messages
        # Each conversation has 4 messages (2 user + 2 assistant)
        assert len(history.messages) == 12

    def test_seeded_history_has_stable_ids(self):
        """Calling get_seeded_history() twice produces identical UUIDs."""
        history_a = get_seeded_history()
        history_b = get_seeded_history()

        ids_a = [m.id for m in history_a.messages]
        ids_b = [m.id for m in history_b.messages]
        assert ids_a == ids_b

    def test_seeded_history_message_count(self):
        """The total message count matches the fixture data."""
        expected_count = sum(
            len(conv["messages"]) for conv in _FIXTURE_DATA["conversations"]
        )
        history = get_seeded_history()
        assert len(history.messages) == expected_count

    def test_seeded_history_chronological_order(self):
        """Messages are returned in chronological order."""
        history = get_seeded_history()
        timestamps = [m.created_at for m in history.messages]
        assert timestamps == sorted(timestamps)

    def test_seeded_history_message_roles(self):
        """Messages alternate between user and assistant roles within each conversation."""
        for conv in _FIXTURE_DATA["conversations"]:
            messages = conv["messages"]
            for i, msg in enumerate(messages):
                expected_role = "user" if i % 2 == 0 else "assistant"
                assert msg["role"] == expected_role, (
                    f"Message {i} in {conv['session_id']} has role {msg['role']}, "
                    f"expected {expected_role}"
                )


# ---------------------------------------------------------------------------
# Integration tests — chat history endpoint
# ---------------------------------------------------------------------------

@pytest.fixture()
def demo_user(db) -> User:
    """Insert a demo user and return the ORM object."""
    user = User(
        id=uuid.uuid4(),
        name="Alex Rivera",
        email=DEMO_EMAIL,
        password_hash=None,
        role="investor",
        clerk_user_id="clerk_demo_user_001",
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture()
def demo_auth_client(client, demo_user):
    """TestClient with get_current_user overridden to return the demo user."""
    from main import app
    app.dependency_overrides[get_current_user] = lambda: demo_user
    yield client
    app.dependency_overrides.pop(get_current_user, None)


class TestDemoChatHistoryEndpoint:
    """GET /api/v1/chat/history/ — demo vs. regular user behavior."""

    def test_demo_chat_history_endpoint(self, demo_auth_client):
        """Demo user hitting GET /chat/history/ receives seeded fixture conversations."""
        resp = demo_auth_client.get("/api/v1/chat/history/")
        assert resp.status_code == 200
        data = resp.json()
        assert "messages" in data
        # Should have the 12 messages from 3 fixture conversations
        assert len(data["messages"]) == 12
        # First message should be from the oldest conversation (3 days ago)
        assert data["messages"][0]["role"] == "user"

    def test_normal_user_chat_history_unaffected(self, auth_client, db, test_user):
        """Regular user hitting GET /chat/history/ still queries the DB (returns empty for new user)."""
        resp = auth_client.get("/api/v1/chat/history/")
        assert resp.status_code == 200
        data = resp.json()
        assert "messages" in data
        # No messages seeded for regular test user
        assert len(data["messages"]) == 0

    def test_normal_user_sees_own_db_messages(self, auth_client, db, test_user):
        """Regular user sees DB-persisted messages, not fixture data."""
        # Manually insert a chat message for the test user
        msg = ChatMessage(
            user_id=test_user.id,
            session_id="test-session",
            role="user",
            content="Hello from test user",
            context_type=None,
            context_id=None,
        )
        db.add(msg)
        db.commit()

        resp = auth_client.get("/api/v1/chat/history/")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data["messages"]) == 1
        assert data["messages"][0]["content"] == "Hello from test user"


# ---------------------------------------------------------------------------
# Integration tests — chat POST endpoint (persistence behavior)
# ---------------------------------------------------------------------------

class TestDemoChatPersistence:
    """POST /api/v1/chat/ — demo users don't persist, regular users do."""

    @patch("routers.chat.stream_chat_response")
    def test_demo_chat_does_not_persist(self, mock_stream, demo_auth_client, db, demo_user):
        """Demo user POST /chat/ does not create DB rows."""
        mock_stream.return_value = iter(["Hello ", "demo ", "user!"])

        resp = demo_auth_client.post(
            "/api/v1/chat/",
            json={"message": "test question", "session_id": "demo-test"},
        )
        assert resp.status_code == 200
        # Consume the streaming response
        content = resp.text

        # Verify no messages were persisted in the DB
        count = db.query(ChatMessage).filter(
            ChatMessage.user_id == demo_user.id
        ).count()
        assert count == 0

    @patch("routers.chat.stream_chat_response")
    def test_normal_user_chat_persists(self, mock_stream, auth_client, db, test_user):
        """Regular user POST /chat/ creates both user and assistant DB rows."""
        mock_stream.return_value = iter(["Hello ", "test ", "user!"])

        resp = auth_client.post(
            "/api/v1/chat/",
            json={"message": "test question", "session_id": "test-session"},
        )
        assert resp.status_code == 200
        # Consume the streaming response
        content = resp.text

        # Verify both user + assistant messages were persisted
        messages = db.query(ChatMessage).filter(
            ChatMessage.user_id == test_user.id
        ).order_by(ChatMessage.created_at).all()
        assert len(messages) == 2
        assert messages[0].role == "user"
        assert messages[0].content == "test question"
        assert messages[1].role == "assistant"
        assert messages[1].content == "Hello test user!"

    @patch("routers.chat.stream_chat_response")
    def test_demo_chat_still_streams(self, mock_stream, demo_auth_client):
        """Demo user POST /chat/ still receives streamed AI response."""
        mock_stream.return_value = iter(["chunk1", "chunk2"])

        resp = demo_auth_client.post(
            "/api/v1/chat/",
            json={"message": "help me analyze this deal"},
        )
        assert resp.status_code == 200
        # Parse SSE events from response
        lines = resp.text.strip().split("\n")
        data_lines = [l for l in lines if l.startswith("data: ")]
        assert len(data_lines) >= 2  # at least the chunks + done signal
        # Verify we got the streamed chunks
        first = json.loads(data_lines[0].replace("data: ", ""))
        assert first["delta"] == "chunk1"


# ---------------------------------------------------------------------------
# Integration tests — reserved demo email in registration and profile update
# ---------------------------------------------------------------------------

class TestReservedDemoEmail:
    """Profile update must reject the reserved demo email.

    Registration is now handled by Clerk (no local register endpoint).
    """

    def test_register_endpoint_removed(self, client):
        """POST /auth/register no longer exists (Clerk handles registration)."""
        resp = client.post(
            "/api/v1/auth/register",
            json={
                "name": "Attacker",
                "email": DEMO_EMAIL,
                "password": "Hack1234!",
                "role": "investor",
            },
        )
        assert resp.status_code in (404, 405)

    def test_update_profile_rejects_demo_email(self, client, db):
        """PUT /auth/me/ changing email to demo email returns 400."""
        from main import app
        # Use a non-demo user so the reserved-email check triggers
        user = User(
            id=uuid.uuid4(),
            name="Regular User",
            email="regular@parcel.dev",
            password_hash=None,
            role="investor",
            clerk_user_id="clerk_regular_001",
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        app.dependency_overrides[get_current_user] = lambda: user
        resp = client.put(
            "/api/v1/auth/me/",
            json={"email": DEMO_EMAIL},
        )
        assert resp.status_code == 400
        data = resp.json()
        assert data["detail"]["code"] == "EMAIL_RESERVED"
        app.dependency_overrides.pop(get_current_user, None)
