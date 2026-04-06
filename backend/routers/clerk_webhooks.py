"""Clerk webhook receiver — syncs user lifecycle events to the local users table.

Webhook signature verification uses Svix (Clerk's webhook delivery provider).
All requests without valid signatures are rejected with 401.
"""

import json
import logging
import os

from fastapi import APIRouter, Depends, Request
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from database import get_db
from models.users import User

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/webhooks", tags=["clerk-webhooks"])

CLERK_WEBHOOK_SECRET = os.getenv("CLERK_WEBHOOK_SECRET", "")


def _verify_webhook_signature(body: bytes, headers: dict) -> bool:
    """Verify Clerk webhook signature using Svix headers.

    Clerk sends these headers: svix-id, svix-timestamp, svix-signature.
    We verify using the CLERK_WEBHOOK_SECRET.
    """
    try:
        from svix.webhooks import Webhook
        wh = Webhook(CLERK_WEBHOOK_SECRET)
        wh.verify(body, headers)
        return True
    except ImportError:
        # svix not installed — fall back to manual HMAC verification
        import hashlib
        import hmac
        import base64

        msg_id = headers.get("svix-id", "")
        timestamp = headers.get("svix-timestamp", "")
        signature = headers.get("svix-signature", "")

        if not msg_id or not timestamp or not signature:
            return False

        # Reject stale timestamps (>5 minutes old) to prevent replay attacks
        import time
        try:
            ts = int(timestamp)
            if abs(time.time() - ts) > 300:
                logger.warning("Webhook timestamp too old: %s", timestamp)
                return False
        except (ValueError, TypeError):
            return False

        signed_content = f"{msg_id}.{timestamp}.".encode() + body

        # CLERK_WEBHOOK_SECRET starts with "whsec_" — strip prefix and base64 decode
        secret = CLERK_WEBHOOK_SECRET
        if secret.startswith("whsec_"):
            secret = secret[6:]
        try:
            secret_bytes = base64.b64decode(secret)
        except Exception:
            return False

        expected = base64.b64encode(
            hmac.new(secret_bytes, signed_content, hashlib.sha256).digest()
        ).decode()

        # Signature header can contain multiple signatures separated by spaces
        for sig in signature.split(" "):
            sig_value = sig.split(",", 1)[-1] if "," in sig else sig
            if hmac.compare_digest(expected, sig_value):
                return True
        return False
    except Exception:
        logger.warning("Webhook signature verification failed", exc_info=True)
        return False


@router.post("/clerk")
async def clerk_webhook(
    request: Request,
    db: Session = Depends(get_db),
) -> JSONResponse:
    """Receive Clerk webhook events. Rejects unsigned/invalid requests."""
    if not CLERK_WEBHOOK_SECRET:
        logger.warning("CLERK_WEBHOOK_SECRET not set — webhook rejected")
        return JSONResponse(status_code=500, content={"error": "Not configured"})

    # Read raw body BEFORE parsing JSON — signature must be verified on raw bytes
    body = await request.body()

    # Verify signature
    sig_headers = {
        "svix-id": request.headers.get("svix-id", ""),
        "svix-timestamp": request.headers.get("svix-timestamp", ""),
        "svix-signature": request.headers.get("svix-signature", ""),
    }
    if not _verify_webhook_signature(body, sig_headers):
        logger.warning("Clerk webhook signature verification FAILED")
        return JSONResponse(status_code=401, content={"error": "Invalid signature"})

    try:
        payload = json.loads(body)
    except Exception:
        return JSONResponse(status_code=400, content={"error": "Invalid JSON"})

    event_type = payload.get("type", "")
    data = payload.get("data", {})

    try:
        if event_type == "user.created":
            _handle_user_created(db, data)
        elif event_type == "user.updated":
            _handle_user_updated(db, data)
        elif event_type == "user.deleted":
            _handle_user_deleted(db, data)
        else:
            logger.debug("Ignoring Clerk event type: %s", event_type)
    except Exception:
        logger.exception("Error processing Clerk webhook %s", event_type)
        return JSONResponse(status_code=500, content={"error": "Processing failed"})

    return JSONResponse(status_code=200, content={"status": "ok"})


def _get_primary_email(data: dict) -> str | None:
    """Extract the primary email from Clerk user data."""
    email_addresses = data.get("email_addresses", [])
    primary_email_id = data.get("primary_email_address_id")

    for email_obj in email_addresses:
        if email_obj.get("id") == primary_email_id:
            return email_obj.get("email_address")

    # Fallback: return first email
    if email_addresses:
        return email_addresses[0].get("email_address")
    return None


def _handle_user_created(db: Session, data: dict) -> None:
    """Create a local user row when a new user signs up via Clerk."""
    clerk_id = data.get("id")
    email = _get_primary_email(data)
    first_name = data.get("first_name", "")
    last_name = data.get("last_name", "")
    name = f"{first_name} {last_name}".strip() or email or "User"

    if not clerk_id or not email:
        logger.warning("user.created missing id or email: %s", data)
        return

    # Check if user already exists (e.g., migrated from legacy auth)
    existing = db.query(User).filter(User.email == email).first()
    if existing:
        existing.clerk_user_id = clerk_id
        if not existing.name or existing.name == email:
            existing.name = name
        db.commit()
        logger.info("Linked existing user %s to Clerk %s", existing.id, clerk_id)
        return

    user = User(
        name=name,
        email=email,
        clerk_user_id=clerk_id,
        role="investor",
    )
    db.add(user)
    db.commit()
    logger.info("Created local user for Clerk %s: %s", clerk_id, email)


def _handle_user_updated(db: Session, data: dict) -> None:
    """Sync email/name changes from Clerk to the local user."""
    clerk_id = data.get("id")
    if not clerk_id:
        return

    user = db.query(User).filter(User.clerk_user_id == clerk_id).first()
    if not user:
        logger.warning("user.updated for unknown Clerk ID: %s", clerk_id)
        return

    email = _get_primary_email(data)
    if email and email != user.email:
        user.email = email

    first_name = data.get("first_name", "")
    last_name = data.get("last_name", "")
    name = f"{first_name} {last_name}".strip()
    if name and name != user.name:
        user.name = name

    db.commit()
    logger.info("Updated local user %s from Clerk", user.id)


def _handle_user_deleted(db: Session, data: dict) -> None:
    """Handle user deletion from Clerk — downgrade to free, keep data."""
    clerk_id = data.get("id")
    if not clerk_id:
        return

    user = db.query(User).filter(User.clerk_user_id == clerk_id).first()
    if not user:
        return

    # Don't delete the user — just remove the Clerk link and downgrade
    user.clerk_user_id = None
    user.plan_tier = "free"
    db.commit()
    logger.info("Unlinked Clerk user %s (user %s downgraded to free)", clerk_id, user.id)
