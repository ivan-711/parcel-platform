"""Unit tests for Clerk JWT audience validation logic in verify_clerk_token()."""

import os
import sys
import time

import pytest

# Ensure backend is on path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.primitives import serialization
from jose import jwt as jose_jwt
from jose.utils import long_to_base64

# ---------------------------------------------------------------------------
# Fixtures: RS256 key pair and token helpers
# ---------------------------------------------------------------------------

TEST_KID = "test-kid-001"
TEST_ISSUER = "https://clerk.test.dev"
TEST_AUDIENCE = "https://clerk.test.dev"


@pytest.fixture(scope="module")
def rsa_keypair():
    """Generate an RS256 key pair for the test suite."""
    private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    private_pem = private_key.private_bytes(
        serialization.Encoding.PEM,
        serialization.PrivateFormat.PKCS8,
        serialization.NoEncryption(),
    ).decode()

    pub_numbers = private_key.public_key().public_numbers()
    jwk_public = {
        "kty": "RSA",
        "kid": TEST_KID,
        "use": "sig",
        "n": long_to_base64(pub_numbers.n).decode(),
        "e": long_to_base64(pub_numbers.e).decode(),
    }

    return private_pem, jwk_public


@pytest.fixture(scope="module")
def jwks(rsa_keypair):
    """JWKS dict matching what _get_jwks_client() returns."""
    _, jwk_public = rsa_keypair
    return {"keys": [jwk_public]}


def _mint_token(private_pem, claims_override=None, kid=TEST_KID):
    """Mint an RS256 JWT with sensible defaults."""
    now = int(time.time())
    claims = {
        "sub": "user_clerk_test_123",
        "iss": TEST_ISSUER,
        "iat": now,
        "exp": now + 3600,
    }
    if claims_override:
        claims.update(claims_override)
    return jose_jwt.encode(claims, private_pem, algorithm="RS256", headers={"kid": kid})


# ---------------------------------------------------------------------------
# Patch helper — sets module-level state so verify_clerk_token() works
# ---------------------------------------------------------------------------

@pytest.fixture(autouse=True)
def _patch_clerk_module(monkeypatch, jwks):
    """Patch clerk module globals so verify_clerk_token() uses our test keys."""
    import core.security.clerk as clerk_mod

    monkeypatch.setattr(clerk_mod, "CLERK_JWKS_URL", "https://clerk.test.dev/.well-known/jwks.json")
    monkeypatch.setattr(clerk_mod, "CLERK_ISSUER_URL", TEST_ISSUER)
    monkeypatch.setattr(clerk_mod, "CLERK_SECRET_KEY", "sk_test_fake")
    monkeypatch.setattr(clerk_mod, "_get_jwks_client", lambda: jwks)

    # Default: no audience env var (disabled)
    monkeypatch.delenv("CLERK_JWT_AUDIENCE", raising=False)


# ---------------------------------------------------------------------------
# Tests: audience disabled (CLERK_JWT_AUDIENCE unset)
# ---------------------------------------------------------------------------


class TestAudienceDisabled:
    """When CLERK_JWT_AUDIENCE is unset, audience validation is skipped."""

    def test_valid_token_succeeds_when_audience_disabled(self, rsa_keypair):
        from core.security.clerk import verify_clerk_token

        private_pem, _ = rsa_keypair
        token = _mint_token(private_pem)  # no aud claim
        result = verify_clerk_token(token)
        assert result is not None
        assert result["sub"] == "user_clerk_test_123"

    def test_valid_token_with_aud_succeeds_when_audience_disabled(self, rsa_keypair):
        from core.security.clerk import verify_clerk_token

        private_pem, _ = rsa_keypair
        token = _mint_token(private_pem, {"aud": "https://some-audience.example"})
        result = verify_clerk_token(token)
        assert result is not None
        assert result["sub"] == "user_clerk_test_123"


# ---------------------------------------------------------------------------
# Tests: audience enabled (CLERK_JWT_AUDIENCE set)
# ---------------------------------------------------------------------------


class TestAudienceEnabled:
    """When CLERK_JWT_AUDIENCE is set, audience validation is enforced."""

    @pytest.fixture(autouse=True)
    def _set_audience_env(self, monkeypatch):
        monkeypatch.setenv("CLERK_JWT_AUDIENCE", TEST_AUDIENCE)

    def test_valid_token_with_correct_aud_succeeds(self, rsa_keypair):
        from core.security.clerk import verify_clerk_token

        private_pem, _ = rsa_keypair
        token = _mint_token(private_pem, {"aud": TEST_AUDIENCE})
        result = verify_clerk_token(token)
        assert result is not None
        assert result["sub"] == "user_clerk_test_123"

    def test_valid_token_with_wrong_aud_fails(self, rsa_keypair):
        from core.security.clerk import verify_clerk_token

        private_pem, _ = rsa_keypair
        token = _mint_token(private_pem, {"aud": "https://wrong-audience.example"})
        result = verify_clerk_token(token)
        assert result is None

    def test_valid_token_with_no_aud_fails(self, rsa_keypair):
        from core.security.clerk import verify_clerk_token

        private_pem, _ = rsa_keypair
        token = _mint_token(private_pem)  # no aud claim
        result = verify_clerk_token(token)
        assert result is None


# ---------------------------------------------------------------------------
# Tests: security invariants (always enforced regardless of audience config)
# ---------------------------------------------------------------------------


class TestSecurityInvariants:
    """Issuer and signature checks must always hold."""

    def test_issuer_mismatch_always_fails(self, rsa_keypair):
        from core.security.clerk import verify_clerk_token

        private_pem, _ = rsa_keypair
        token = _mint_token(private_pem, {"iss": "https://evil.example.com"})
        result = verify_clerk_token(token)
        assert result is None

    def test_expired_token_always_fails(self, rsa_keypair):
        from core.security.clerk import verify_clerk_token

        private_pem, _ = rsa_keypair
        past = int(time.time()) - 7200
        token = _mint_token(private_pem, {"iat": past, "exp": past + 60})
        result = verify_clerk_token(token)
        assert result is None

    def test_bad_signature_always_fails(self, jwks):
        from core.security.clerk import verify_clerk_token

        # Mint with a DIFFERENT key — signature won't match our JWKS
        other_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
        other_pem = other_key.private_bytes(
            serialization.Encoding.PEM,
            serialization.PrivateFormat.PKCS8,
            serialization.NoEncryption(),
        ).decode()
        token = _mint_token(other_pem)
        result = verify_clerk_token(token)
        assert result is None

    def test_missing_sub_claim_fails(self, rsa_keypair):
        from core.security.clerk import verify_clerk_token

        private_pem, _ = rsa_keypair
        now = int(time.time())
        claims = {"iss": TEST_ISSUER, "iat": now, "exp": now + 3600}
        token = jose_jwt.encode(claims, private_pem, algorithm="RS256", headers={"kid": TEST_KID})
        result = verify_clerk_token(token)
        assert result is None
