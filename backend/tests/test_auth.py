"""Integration tests for the authentication endpoints.

Covers user registration, login, session validation, unauthorized access,
and token refresh — the full auth lifecycle used by the frontend.
"""


class TestRegistration:
    """POST /api/v1/auth/register — new account creation."""

    def test_register_creates_user_and_sets_cookie(self, client):
        """Successful registration returns user data and sets an httpOnly access token."""
        resp = client.post("/api/v1/auth/register", json={
            "name": "Jane Doe",
            "email": "jane@example.com",
            "password": "securepass123",
            "role": "investor",
        })
        assert resp.status_code == 201
        data = resp.json()
        assert data["user"]["name"] == "Jane Doe"
        assert data["user"]["email"] == "jane@example.com"
        assert data["user"]["role"] == "investor"
        assert "access_token" in resp.cookies

    def test_register_rejects_duplicate_email(self, client):
        """Registering with an email that already exists returns 400."""
        payload = {
            "name": "First User",
            "email": "dupe@example.com",
            "password": "password123",
        }
        client.post("/api/v1/auth/register", json=payload)
        resp = client.post("/api/v1/auth/register", json=payload)
        assert resp.status_code == 400
        assert resp.json()["detail"]["code"] == "EMAIL_ALREADY_EXISTS"


class TestLogin:
    """POST /api/v1/auth/login — existing user authentication."""

    def test_login_with_valid_credentials(self, client):
        """Correct email + password returns user data and sets cookies."""
        client.post("/api/v1/auth/register", json={
            "name": "Login Test",
            "email": "login@example.com",
            "password": "password123",
        })
        resp = client.post("/api/v1/auth/login", json={
            "email": "login@example.com",
            "password": "password123",
        })
        assert resp.status_code == 200
        assert resp.json()["user"]["email"] == "login@example.com"
        assert "access_token" in resp.cookies

    def test_login_rejects_wrong_password(self, client):
        """Incorrect password returns 401 with INVALID_CREDENTIALS code."""
        client.post("/api/v1/auth/register", json={
            "name": "Wrong PW",
            "email": "wrongpw@example.com",
            "password": "correctpassword",
        })
        resp = client.post("/api/v1/auth/login", json={
            "email": "wrongpw@example.com",
            "password": "wrongpassword",
        })
        assert resp.status_code == 401
        assert resp.json()["detail"]["code"] == "INVALID_CREDENTIALS"


class TestCurrentUser:
    """GET /api/v1/auth/me — session validation."""

    def test_me_returns_user_with_valid_token(self, auth_client, test_user):
        """A valid access token cookie returns the authenticated user's profile."""
        resp = auth_client.get("/api/v1/auth/me")
        assert resp.status_code == 200
        data = resp.json()
        assert data["email"] == test_user.email
        assert data["name"] == test_user.name
        assert "password_hash" not in data

    def test_me_returns_401_without_token(self, client):
        """Accessing /me without a cookie returns 401 NOT_AUTHENTICATED."""
        resp = client.get("/api/v1/auth/me")
        assert resp.status_code == 401


class TestTokenRefresh:
    """POST /api/v1/auth/refresh — access token renewal."""

    def test_refresh_issues_new_access_token(self, client):
        """A valid refresh token cookie produces a new access token."""
        # Register to get both cookies
        client.post("/api/v1/auth/register", json={
            "name": "Refresh Test",
            "email": "refresh@example.com",
            "password": "password123",
        })
        # The register response sets both access_token and refresh_token cookies.
        # Hit refresh to get a new access token.
        resp = client.post("/api/v1/auth/refresh")
        assert resp.status_code == 200
        assert "access_token" in resp.cookies
        assert resp.json()["user"]["email"] == "refresh@example.com"

    def test_refresh_fails_without_cookie(self, client):
        """Refresh without a refresh_token cookie returns 401."""
        resp = client.post("/api/v1/auth/refresh")
        assert resp.status_code == 401
