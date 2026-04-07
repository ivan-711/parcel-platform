"""Integration tests for the authentication endpoints (Clerk-only).

Legacy registration, login, refresh, and password reset endpoints have been
removed.  These tests verify the remaining profile endpoints and that
unauthenticated requests are properly rejected.
"""


class TestCurrentUser:
    """GET /api/v1/auth/me — session validation."""

    def test_me_returns_user_with_valid_auth(self, auth_client, test_user):
        """An authenticated request returns the user's profile."""
        resp = auth_client.get("/api/v1/auth/me")
        assert resp.status_code == 200
        data = resp.json()
        assert data["email"] == test_user.email
        assert data["name"] == test_user.name
        assert "password_hash" not in data

    def test_me_returns_401_without_auth(self, client):
        """Accessing /me without authentication returns 401."""
        resp = client.get("/api/v1/auth/me")
        assert resp.status_code == 401


class TestLegacyEndpointsRemoved:
    """Verify that legacy auth endpoints no longer exist."""

    def test_register_returns_404(self, client):
        resp = client.post("/api/v1/auth/register", json={
            "name": "Test", "email": "test@example.com",
            "password": "password123", "role": "investor",
        })
        assert resp.status_code in (404, 405)

    def test_login_returns_404(self, client):
        resp = client.post("/api/v1/auth/login", json={
            "email": "test@example.com", "password": "password123",
        })
        assert resp.status_code in (404, 405)

    def test_refresh_returns_404(self, client):
        resp = client.post("/api/v1/auth/refresh")
        assert resp.status_code in (404, 405)

    def test_logout_returns_404(self, client):
        resp = client.post("/api/v1/auth/logout")
        assert resp.status_code in (404, 405)
