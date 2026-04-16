"""Tests for Clerk webhook handler — verifies identity is keyed on clerk_user_id, never email."""

import uuid

import pytest

from models.users import User
from routers.clerk_webhooks import _handle_user_created, _get_primary_email


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _clerk_user_data(
    clerk_id: str = "clerk_new_001",
    email: str = "alice@example.com",
    first_name: str = "Alice",
    last_name: str = "Smith",
) -> dict:
    """Build a minimal Clerk user.created data payload."""
    return {
        "id": clerk_id,
        "first_name": first_name,
        "last_name": last_name,
        "email_addresses": [
            {"id": "eid_1", "email_address": email},
        ],
        "primary_email_address_id": "eid_1",
    }


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------


class TestHandleUserCreated:
    """Verify _handle_user_created always keys on clerk_user_id."""

    def test_creates_new_user_with_clerk_id(self, db):
        """Happy path: new Clerk signup creates a fresh user row."""
        data = _clerk_user_data(clerk_id="clerk_abc", email="newuser@example.com")

        _handle_user_created(db, data)

        user = db.query(User).filter(User.clerk_user_id == "clerk_abc").first()
        assert user is not None
        assert user.email == "newuser@example.com"
        assert user.name == "Alice Smith"
        assert user.role == "investor"

    def test_idempotent_on_duplicate_event(self, db):
        """Replayed user.created event for the same clerk_id updates, doesn't duplicate."""
        data = _clerk_user_data(clerk_id="clerk_dup", email="dup@example.com")

        _handle_user_created(db, data)
        _handle_user_created(db, data)  # replay

        count = db.query(User).filter(User.clerk_user_id == "clerk_dup").count()
        assert count == 1

    def test_does_not_link_to_null_clerk_row_with_matching_email(self, db):
        """A pre-existing row with NULL clerk_user_id and matching email must NOT
        be linked to the new Clerk user. The legacy email is renamed and a new
        row is created. This is the core security invariant — prevents legacy
        data transfer."""
        # Seed a legacy row with NULL clerk_user_id
        legacy_id = uuid.uuid4()
        legacy = User(
            id=legacy_id,
            name="Legacy User",
            email="collision@example.com",
            clerk_user_id=None,
            role="investor",
            plan_tier="free",
        )
        db.add(legacy)
        db.commit()

        # Simulate a Clerk signup with the same email
        data = _clerk_user_data(clerk_id="clerk_new_signup", email="collision@example.com")
        _handle_user_created(db, data)

        # Legacy row must be untouched — still NULL clerk_user_id, email renamed
        db.refresh(legacy)
        assert legacy.clerk_user_id is None, "Legacy row must NOT be linked to new Clerk ID"
        assert legacy.email != "collision@example.com", "Legacy email must be renamed"
        assert legacy.email.startswith("orphan+"), "Legacy email must be renamed to orphan+"

        # New row must exist with the Clerk ID and the original email
        new_user = db.query(User).filter(User.clerk_user_id == "clerk_new_signup").first()
        assert new_user is not None
        assert new_user.id != legacy_id, "Must be a separate user row"
        assert new_user.email == "collision@example.com"

    def test_skips_when_email_belongs_to_different_clerk_user(self, db):
        """If email is owned by a different Clerk user, skip gracefully."""
        # Create an existing Clerk user with an email
        existing = User(
            id=uuid.uuid4(),
            name="Existing User",
            email="taken@example.com",
            clerk_user_id="clerk_existing",
            role="investor",
            plan_tier="free",
        )
        db.add(existing)
        db.commit()

        # A different Clerk user tries to sign up with the same email
        data = _clerk_user_data(clerk_id="clerk_new", email="taken@example.com")
        _handle_user_created(db, data)

        # No new user should be created
        new_user = db.query(User).filter(User.clerk_user_id == "clerk_new").first()
        assert new_user is None, "Should not create user when email belongs to different Clerk user"

        # Existing user untouched
        db.refresh(existing)
        assert existing.clerk_user_id == "clerk_existing"


class TestGetPrimaryEmail:
    """Verify email extraction from Clerk data payload."""

    def test_extracts_primary_email(self):
        data = {
            "email_addresses": [
                {"id": "eid_1", "email_address": "primary@example.com"},
                {"id": "eid_2", "email_address": "secondary@example.com"},
            ],
            "primary_email_address_id": "eid_1",
        }
        assert _get_primary_email(data) == "primary@example.com"

    def test_falls_back_to_first_email(self):
        data = {
            "email_addresses": [
                {"id": "eid_1", "email_address": "only@example.com"},
            ],
            "primary_email_address_id": "eid_missing",
        }
        assert _get_primary_email(data) == "only@example.com"

    def test_returns_none_for_empty(self):
        assert _get_primary_email({"email_addresses": []}) is None
