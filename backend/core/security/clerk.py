"""Clerk JWT verification for dual-mode auth.

Verifies Clerk-issued JWTs (RS256) using JWKS fetched from Clerk's API.
Falls back gracefully if Clerk is not configured.
"""

import logging
import os
from typing import Optional

from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

CLERK_SECRET_KEY = os.getenv("CLERK_SECRET_KEY", "")
CLERK_ISSUER_URL = os.getenv("CLERK_ISSUER_URL", "")  # e.g. "https://clerk.your-domain.com"
CLERK_JWKS_URL = None

# Derive the JWKS URL and issuer from the publishable key
_pk = os.getenv("CLERK_PUBLISHABLE_KEY", "")
if _pk.startswith("pk_"):
    import base64
    try:
        _parts = _pk.split("_", 2)
        if len(_parts) == 3:
            _domain = base64.b64decode(_parts[2] + "==").decode().rstrip("$")
            CLERK_JWKS_URL = f"https://{_domain}/.well-known/jwks.json"
            if not CLERK_ISSUER_URL:
                CLERK_ISSUER_URL = f"https://{_domain}"
            logger.info("Clerk JWKS URL: %s", CLERK_JWKS_URL)
    except Exception:
        logger.warning("Could not derive JWKS URL from CLERK_PUBLISHABLE_KEY")

# Require CLERK_ISSUER_URL when Clerk is otherwise configured
if CLERK_SECRET_KEY and CLERK_JWKS_URL and not CLERK_ISSUER_URL:
    raise RuntimeError(
        "CLERK_ISSUER_URL must be set when Clerk is enabled. "
        "Set it to your Clerk frontend API URL (e.g. https://clerk.your-domain.com)."
    )

if CLERK_SECRET_KEY and not os.getenv("CLERK_JWT_AUDIENCE", ""):
    logger.info(
        "CLERK_JWT_AUDIENCE is not set — audience validation disabled. "
        "Issuer and signature checks remain enforced."
    )

if CLERK_SECRET_KEY:
    logger.info(
        "Clerk auth configured: issuer=%s, audience_check=%s",
        CLERK_ISSUER_URL,
        "enabled" if os.getenv("CLERK_JWT_AUDIENCE", "").strip() else "disabled",
    )

_jwks_client = None


def _get_jwks_client():
    """Lazily create the JWKS client."""
    global _jwks_client
    if _jwks_client is not None:
        return _jwks_client
    if not CLERK_JWKS_URL:
        return None
    try:
        import urllib.request
        import json

        response = urllib.request.urlopen(CLERK_JWKS_URL, timeout=5)
        jwks_data = json.loads(response.read())
        _jwks_client = jwks_data
        return _jwks_client
    except Exception:
        logger.warning("Failed to fetch Clerk JWKS", exc_info=True)
        return None


def verify_clerk_token(token: str) -> Optional[dict]:
    """Verify a Clerk JWT and return claims.

    Returns dict with 'sub' (Clerk user ID) on success, None on failure.
    """
    if not CLERK_JWKS_URL:
        return None

    try:
        from jose import jwt as jose_jwt

        jwks = _get_jwks_client()
        if not jwks:
            return None

        # Decode without verification first to get the key ID
        unverified_header = jose_jwt.get_unverified_header(token)
        kid = unverified_header.get("kid")

        # Find the matching key
        rsa_key = None
        for key in jwks.get("keys", []):
            if key.get("kid") == kid:
                rsa_key = key
                break

        if not rsa_key:
            logger.warning("No matching key found for kid=%s", kid)
            return None

        # Verify the token — issuer and signature always enforced,
        # audience only when CLERK_JWT_AUDIENCE is set.
        audience = os.getenv("CLERK_JWT_AUDIENCE", "").strip() or None

        decode_kwargs = {
            "algorithms": ["RS256"],
            "issuer": CLERK_ISSUER_URL,
        }
        if audience:
            decode_kwargs["audience"] = audience
            decode_kwargs["options"] = {"verify_aud": True}
        else:
            decode_kwargs["options"] = {"verify_aud": False}

        payload = jose_jwt.decode(token, rsa_key, **decode_kwargs)

        # python-jose doesn't reject tokens missing 'aud' even when
        # audience is specified, so enforce it manually.
        if audience and payload.get("aud") != audience:
            logger.warning("Clerk token audience mismatch: expected=%s, got=%s", audience, payload.get("aud"))
            return None

        # Validate sub claim exists
        sub = payload.get("sub")
        if not sub:
            logger.warning("Clerk token missing 'sub' claim")
            return None

        return {
            "sub": sub,
            "email": payload.get("email"),
            "name": payload.get("name"),
        }
    except Exception:
        logger.debug("Clerk token verification failed", exc_info=True)
        return None


def is_clerk_configured() -> bool:
    """Check if Clerk is configured for this environment."""
    return bool(CLERK_SECRET_KEY and CLERK_JWKS_URL)


def fetch_clerk_user(clerk_user_id: str) -> Optional[dict]:
    """Fetch user details from Clerk Backend API.

    Returns dict with email, name, etc. or None on failure.
    """
    if not CLERK_SECRET_KEY:
        return None
    try:
        import urllib.request
        import json

        req = urllib.request.Request(
            f"https://api.clerk.com/v1/users/{clerk_user_id}",
            headers={
                "Authorization": f"Bearer {CLERK_SECRET_KEY}",
                "User-Agent": "parcel-platform/1.0",
            },
        )
        response = urllib.request.urlopen(req, timeout=5)
        data = json.loads(response.read())
        # Build a simplified user dict
        emails = data.get("email_addresses", [])
        primary_email = None
        primary_email_id = data.get("primary_email_address_id")
        for em in emails:
            if em.get("id") == primary_email_id:
                primary_email = em.get("email_address")
                break
        if not primary_email and emails:
            primary_email = emails[0].get("email_address")

        first = data.get("first_name") or ""
        last = data.get("last_name") or ""
        name = f"{first} {last}".strip() or None

        return {"email": primary_email, "name": name}
    except Exception:
        logger.warning("Failed to fetch Clerk user %s", clerk_user_id, exc_info=True)
        return None
