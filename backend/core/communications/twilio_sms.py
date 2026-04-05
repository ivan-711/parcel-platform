"""Twilio SMS provider implementation."""

from __future__ import annotations

import hashlib
import hmac
import math
import os
import re
from base64 import b64encode
from urllib.parse import urlencode

import httpx

from .base import BaseSMSProvider

# ---------------------------------------------------------------------------
# Environment configuration
# ---------------------------------------------------------------------------

TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID", "")
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN", "")
TWILIO_PHONE_NUMBER = os.getenv("TWILIO_PHONE_NUMBER", "")
TWILIO_STATUS_CALLBACK_URL = os.getenv("TWILIO_STATUS_CALLBACK_URL", "")

# ---------------------------------------------------------------------------
# Status + error code mappings
# ---------------------------------------------------------------------------

_STATUS_MAP: dict[str, str] = {
    "accepted": "queued",
    "queued": "queued",
    "sending": "queued",
    "sent": "sent",
    "delivered": "delivered",
    "undelivered": "failed",
    "failed": "failed",
}

_ERROR_CODES: dict[int, str] = {
    21211: "Invalid phone number",
    21614: "Not a mobile number",
    21610: "Recipient has opted out (STOP)",
    30003: "Handset unreachable",
    30004: "Message blocked by carrier",
    30005: "Unknown destination handset",
    30006: "Landline or unreachable carrier",
    30007: "Message filtered as carrier violation",
}

# ---------------------------------------------------------------------------
# Phone number helpers
# ---------------------------------------------------------------------------


def phone_digits(raw: str) -> str:
    """Strip all non-digit characters from a phone string."""
    return re.sub(r"\D", "", raw or "")


def normalize_phone(raw: str) -> str:
    """
    Normalize *raw* to E.164 format.

    Rules:
    - Strip non-digits.
    - 10-digit US number  → prepend +1
    - 11-digit number starting with 1 → prepend +
    - Already has leading + and valid length → pass through
    - Anything else → raise ValueError
    """
    if not raw:
        raise ValueError("Empty phone number")

    # If already E.164 (starts with +), validate and return.
    if raw.startswith("+"):
        digits = phone_digits(raw)
        if len(digits) < 7 or len(digits) > 15:
            raise ValueError(f"Invalid E.164 number: {raw}")
        return raw

    digits = phone_digits(raw)

    if len(digits) == 10:
        return f"+1{digits}"

    if len(digits) == 11 and digits.startswith("1"):
        return f"+{digits}"

    if 7 <= len(digits) <= 15:
        return f"+{digits}"

    raise ValueError(f"Cannot normalize phone number: {raw!r}")


# ---------------------------------------------------------------------------
# TwilioSMSProvider
# ---------------------------------------------------------------------------


class TwilioSMSProvider(BaseSMSProvider):
    """Twilio REST API SMS provider."""

    def __init__(
        self,
        account_sid: str | None = None,
        auth_token: str | None = None,
        default_from: str | None = None,
        status_callback_url: str | None = None,
    ) -> None:
        self.account_sid = account_sid or TWILIO_ACCOUNT_SID
        self.auth_token = auth_token or TWILIO_AUTH_TOKEN
        self.default_from = default_from or TWILIO_PHONE_NUMBER
        self.status_callback_url = status_callback_url or TWILIO_STATUS_CALLBACK_URL

        if not self.account_sid:
            raise ValueError("TWILIO_ACCOUNT_SID is required")
        if not self.auth_token:
            raise ValueError("TWILIO_AUTH_TOKEN is required")

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    @property
    def _messages_url(self) -> str:
        return (
            f"https://api.twilio.com/2010-04-01/Accounts"
            f"/{self.account_sid}/Messages.json"
        )

    @property
    def _auth(self) -> tuple[str, str]:
        return (self.account_sid, self.auth_token)

    @staticmethod
    def _segment_count(body: str) -> int:
        """Return the number of 160-character SMS segments."""
        if not body:
            return 1
        return math.ceil(len(body) / 160)

    # ------------------------------------------------------------------
    # BaseSMSProvider interface
    # ------------------------------------------------------------------

    async def send(
        self,
        to_phone: str,
        body: str,
        from_number: str | None = None,
    ) -> dict:
        """
        Send an SMS via Twilio.

        Returns::

            {
                "external_id": str,   # Twilio MessageSid
                "status": str,        # normalised status
                "cost_cents": int,    # 0 when not yet billed
                "segments": int,
            }

        Raises:
            ValueError  – phone validation / Twilio 400 errors
            RuntimeError – Twilio 429 rate-limit
            httpx.HTTPStatusError – other non-2xx errors
        """
        to_e164 = normalize_phone(to_phone)
        from_e164 = normalize_phone(from_number or self.default_from)

        params: dict[str, str] = {
            "To": to_e164,
            "From": from_e164,
            "Body": body,
        }
        if self.status_callback_url:
            params["StatusCallback"] = self.status_callback_url

        async with httpx.AsyncClient() as client:
            resp = await client.post(
                self._messages_url,
                data=params,
                auth=self._auth,
                timeout=15.0,
            )

        # --- error handling ---
        if resp.status_code == 429:
            raise RuntimeError("Twilio rate limit exceeded (429). Retry after back-off.")

        if resp.status_code == 400:
            try:
                err = resp.json()
                code = err.get("code", 0)
                msg = _ERROR_CODES.get(code) or err.get("message", "Invalid request")
            except Exception:
                msg = resp.text
            raise ValueError(f"Twilio 400: {msg}")

        resp.raise_for_status()

        data = resp.json()
        twilio_status = data.get("status", "queued")
        normalised_status = _STATUS_MAP.get(twilio_status, "queued")

        # Twilio returns price as a negative string like "-0.0075" (USD)
        price_str = data.get("price") or "0"
        try:
            cost_cents = abs(round(float(price_str) * 100))
        except (ValueError, TypeError):
            cost_cents = 0

        return {
            "external_id": data["sid"],
            "status": normalised_status,
            "cost_cents": cost_cents,
            "segments": self._segment_count(body),
        }

    # ------------------------------------------------------------------

    def validate_webhook(self, body: bytes, signature: str, url: str) -> bool:
        """
        Validate a Twilio webhook request using HMAC-SHA1.

        Twilio's algorithm:
        1. Start with the full URL (including https://).
        2. If the request is a POST with form params, sort them alphabetically
           by key and append key+value (no separator) to the URL string.
        3. Sign the resulting string with HMAC-SHA1 using the auth_token as key.
        4. Base64-encode the digest and compare to the X-Twilio-Signature header.
        """
        if not self.auth_token:
            return False
        if not signature:
            return False

        # Parse form-encoded body into sorted key-value pairs
        from urllib.parse import parse_qsl

        params = sorted(parse_qsl(body.decode("utf-8", errors="replace")))
        param_string = "".join(k + v for k, v in params)
        signing_string = url + param_string

        computed = hmac.new(
            self.auth_token.encode("utf-8"),
            signing_string.encode("utf-8"),
            hashlib.sha1,
        ).digest()
        computed_b64 = b64encode(computed).decode("utf-8")

        return hmac.compare_digest(computed_b64, signature)

    # ------------------------------------------------------------------

    def parse_incoming(self, payload: dict) -> dict:
        """
        Parse an inbound Twilio SMS webhook payload.

        Expected keys in *payload* (form-decoded dict from Twilio POST):
            From, Body, MessageSid

        Returns::

            {"from_phone": str, "body": str, "external_id": str}
        """
        return {
            "from_phone": payload.get("From", ""),
            "body": payload.get("Body", ""),
            "external_id": payload.get("MessageSid", ""),
        }

    # ------------------------------------------------------------------

    def parse_status(self, payload: dict) -> dict:
        """
        Parse a Twilio status-callback webhook payload.

        Returns::

            {"external_id": str, "status": str, "error_message": str | None}
        """
        twilio_status = payload.get("MessageStatus", payload.get("SmsStatus", ""))
        normalised = _STATUS_MAP.get(twilio_status, twilio_status)

        error_code_raw = payload.get("ErrorCode")
        error_message: str | None = None
        if error_code_raw:
            try:
                code = int(error_code_raw)
                error_message = _ERROR_CODES.get(code) or f"Twilio error {code}"
            except (ValueError, TypeError):
                error_message = str(error_code_raw)

        result: dict = {
            "external_id": payload.get("MessageSid", ""),
            "status": normalised,
            "error_message": error_message,
        }
        return result
