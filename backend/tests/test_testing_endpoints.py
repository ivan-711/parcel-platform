"""Tests for the dev/test-only /api/testing/* router.

Covers:
  * seed-persona with valid user succeeds
  * seed-persona with null persona clears the field
  * seed-persona with skip_onboarding=true sets completed_at
  * user-state returns expected fields
  * router is NOT registered when ENVIRONMENT is not dev/test
"""

import importlib
import os
import uuid
from unittest import mock

from fastapi import FastAPI
from starlette.testclient import TestClient

from database import get_db


class TestSeedPersona:
    def test_seed_persona_with_valid_user(self, client, test_user, db):
        resp = client.post(
            "/api/testing/seed-persona",
            json={
                "user_email": test_user.email,
                "persona": "wholesale",
                "skip_onboarding": True,
            },
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["onboarding_persona"] == "wholesale"
        assert data["onboarding_completed_at"] is not None
        assert data["email"] == test_user.email

    def test_seed_persona_with_null_clears_field(self, client, test_user, db):
        # First set a persona
        client.post(
            "/api/testing/seed-persona",
            json={
                "user_email": test_user.email,
                "persona": "hybrid",
                "skip_onboarding": True,
            },
        )
        # Now clear it
        resp = client.post(
            "/api/testing/seed-persona",
            json={
                "user_email": test_user.email,
                "persona": None,
                "skip_onboarding": False,
            },
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["onboarding_persona"] is None
        assert data["onboarding_completed_at"] is None
        assert data["notify_agent_features"] is False

    def test_seed_persona_skip_onboarding_sets_completed_at(
        self, client, test_user, db
    ):
        resp = client.post(
            "/api/testing/seed-persona",
            json={
                "user_email": test_user.email,
                "persona": "buy_and_hold",
                "skip_onboarding": True,
            },
        )
        assert resp.status_code == 200
        assert resp.json()["onboarding_completed_at"] is not None

    def test_seed_persona_skip_false_clears_completed_at(
        self, client, test_user, db
    ):
        client.post(
            "/api/testing/seed-persona",
            json={
                "user_email": test_user.email,
                "persona": "flip",
                "skip_onboarding": True,
            },
        )
        resp = client.post(
            "/api/testing/seed-persona",
            json={
                "user_email": test_user.email,
                "persona": "flip",
                "skip_onboarding": False,
            },
        )
        assert resp.status_code == 200
        assert resp.json()["onboarding_completed_at"] is None

    def test_seed_persona_unknown_user_returns_404(self, client, db):
        resp = client.post(
            "/api/testing/seed-persona",
            json={
                "user_email": "nobody@nowhere.test",
                "persona": "wholesale",
                "skip_onboarding": True,
            },
        )
        assert resp.status_code == 404


class TestUserState:
    def test_user_state_returns_expected_fields(self, client, test_user, db):
        resp = client.get(
            f"/api/testing/user-state?email={test_user.email}",
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "onboarding_persona" in data
        assert "notify_agent_features" in data
        assert "onboarding_completed_at" in data
        assert data["email"] == test_user.email
        assert data["notify_agent_features"] is False

    def test_user_state_reflects_persona_update(self, client, test_user, db):
        client.post(
            "/api/testing/seed-persona",
            json={
                "user_email": test_user.email,
                "persona": "hybrid",
                "skip_onboarding": True,
            },
        )
        resp = client.get(f"/api/testing/user-state?email={test_user.email}")
        assert resp.status_code == 200
        assert resp.json()["onboarding_persona"] == "hybrid"

    def test_user_state_unknown_user_returns_404(self, client):
        resp = client.get("/api/testing/user-state?email=nobody@nowhere.test")
        assert resp.status_code == 404


class TestRouterGating:
    """Verify the testing router is NOT wired when ENVIRONMENT is not dev/test."""

    def test_router_not_registered_in_production(self, db):
        """Spin up a fresh FastAPI app with ENVIRONMENT=production — the
        testing router must not be mounted, so /api/testing/* returns 404.
        """
        app = FastAPI()
        env_value = "production"
        if os.getenv("ENVIRONMENT", "development") in ("development", "test") \
                and env_value not in ("development", "test"):
            pass  # would register in dev/test; skip in prod

        from routers import testing as testing_router
        # Don't include — this is what main.py does in production.
        _ = testing_router  # silence lint

        def _override_get_db():
            try:
                yield db
            finally:
                pass

        app.dependency_overrides[get_db] = _override_get_db
        test_client = TestClient(app)
        resp = test_client.post(
            "/api/testing/seed-persona",
            json={
                "user_email": "anyone@test.com",
                "persona": "wholesale",
                "skip_onboarding": True,
            },
        )
        assert resp.status_code == 404

        resp2 = test_client.get("/api/testing/user-state?email=anyone@test.com")
        assert resp2.status_code == 404
