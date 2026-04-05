"""SendGrid email provider — sends transactional email and handles event webhooks."""

import hashlib
import hmac
import logging
import os
from typing import Any

import httpx

from core.communications.base import BaseEmailProvider

logger = logging.getLogger(__name__)

SENDGRID_API_URL = "https://api.sendgrid.com/v3/mail/send"

# Normalise SendGrid event types to internal status values.
_EVENT_MAP: dict[str, str] = {
    "processed": "queued",
    "delivered": "delivered",
    "bounce": "bounced",
    "dropped": "failed",
    "deferred": "queued",
    "open": "opened",
    "click": "clicked",
    "spamreport": "failed",
    "unsubscribe": "failed",
}


class SendGridEmailProvider(BaseEmailProvider):
    """Concrete email provider backed by the SendGrid v3 API."""

    def __init__(self) -> None:
        self._api_key: str = os.getenv("SENDGRID_API_KEY", "")
        self._webhook_key: str = os.getenv("SENDGRID_WEBHOOK_VERIFICATION_KEY", "")
        self._default_from: str = os.getenv(
            "DEFAULT_FROM_EMAIL", "noreply@parceldesk.io"
        )

    # ------------------------------------------------------------------
    # BaseEmailProvider interface
    # ------------------------------------------------------------------

    async def send(
        self,
        to_email: str,
        subject: str,
        body_html: str,
        body_text: str,
        from_email: str,
        reply_to: str | None = None,
    ) -> dict[str, Any]:
        """Send a transactional email via the SendGrid v3 API.

        Returns:
            {external_id: str | None, status: "queued"}

        Raises:
            RuntimeError on 429 rate limit or any 4xx/5xx error.
        """
        resolved_from = from_email or self._default_from

        payload: dict[str, Any] = {
            "personalizations": [{"to": [{"email": to_email}]}],
            "from": {"email": resolved_from},
            "subject": subject,
            "content": [
                {"type": "text/plain", "value": body_text},
                {"type": "text/html", "value": body_html},
            ],
            "tracking_settings": {
                "click_tracking": {"enable": True, "enable_text": True},
                "open_tracking": {"enable": True},
            },
        }

        if reply_to:
            payload["reply_to"] = {"email": reply_to}

        headers = {
            "Authorization": f"Bearer {self._api_key}",
            "Content-Type": "application/json",
        }

        async with httpx.AsyncClient(timeout=15) as client:
            response = await client.post(SENDGRID_API_URL, json=payload, headers=headers)

        if response.status_code == 429:
            raise RuntimeError("SendGrid rate limit exceeded (429)")

        if response.status_code >= 400:
            body_excerpt = response.text[:400]
            raise RuntimeError(
                f"SendGrid send failed ({response.status_code}): {body_excerpt}"
            )

        # 202 Accepted — message queued; ID is in the response header.
        external_id: str | None = response.headers.get("x-message-id")
        logger.debug("SendGrid queued message %s to %s", external_id, to_email)
        return {"external_id": external_id, "status": "queued"}

    def validate_webhook(self, body: bytes, signature: str) -> bool:
        """Validate a SendGrid event-webhook signature using HMAC-SHA256.

        SendGrid signs the raw request body with the webhook verification key
        and sends the hex digest in the ``X-Twilio-Email-Event-Webhook-Signature``
        header (or the simpler ``X-SendGrid-Signature`` header depending on the
        webhook type).  Both carry the same hex-encoded HMAC value.

        Returns True when the computed digest matches *signature*.
        """
        if not self._webhook_key:
            logger.warning("SENDGRID_WEBHOOK_VERIFICATION_KEY not set — skipping validation")
            return False

        expected = hmac.new(
            self._webhook_key.encode(), body, hashlib.sha256
        ).hexdigest()
        return hmac.compare_digest(expected, signature)

    def parse_incoming(self, payload: dict[str, Any]) -> dict[str, Any]:
        """Parse an inbound email from SendGrid Inbound Parse multipart form data.

        SendGrid delivers inbound mail as a multipart/form-data POST.  The
        ``payload`` dict is the decoded form fields (e.g. from FastAPI's
        ``Request.form()``).

        Returns:
            {
                from_email: str,
                subject: str,
                body_text: str,
                body_html: str,
                headers: dict[str, str],
                external_id: str | None,
            }
        """
        raw_headers: str = payload.get("headers", "")
        parsed_headers: dict[str, str] = _parse_header_block(raw_headers)

        # Message-ID from the inbound headers is the closest thing to an
        # external_id for inbound mail.
        message_id = parsed_headers.get("message-id") or parsed_headers.get("Message-ID")
        if message_id:
            # Strip surrounding angle brackets if present: <id@domain>
            message_id = message_id.strip("<>")

        return {
            "from_email": payload.get("from", ""),
            "subject": payload.get("subject", ""),
            "body_text": payload.get("text", ""),
            "body_html": payload.get("html", ""),
            "headers": parsed_headers,
            "external_id": message_id,
        }

    def parse_events(self, payload: list[dict[str, Any]]) -> list[dict[str, Any]]:
        """Parse a batch of SendGrid event-webhook events.

        SendGrid POSTs a JSON array of events.  Each item may contain:
            event        — raw SendGrid event type
            sg_message_id — provider message ID (may include a filter suffix after ".")
            timestamp    — Unix timestamp (int)

        Returns a list of normalised dicts:
            {
                external_id: str,
                event_type: str,   — normalised via _EVENT_MAP
                timestamp: int,
                raw: dict,         — original event payload
            }
        """
        results: list[dict[str, Any]] = []

        for event in payload:
            raw_event_type: str = event.get("event", "")
            normalised = _EVENT_MAP.get(raw_event_type, raw_event_type)

            # sg_message_id may have a filter suffix: "abc123.filter0"
            sg_id: str = event.get("sg_message_id", "")
            external_id = sg_id.split(".")[0] if sg_id else ""

            results.append(
                {
                    "external_id": external_id,
                    "event_type": normalised,
                    "timestamp": event.get("timestamp", 0),
                    "raw": event,
                }
            )

        return results


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _parse_header_block(raw: str) -> dict[str, str]:
    """Parse a raw HTTP-style header block into a lowercase-key dict.

    SendGrid Inbound Parse delivers headers as a single string, one
    ``Key: Value`` pair per line.
    """
    headers: dict[str, str] = {}
    for line in raw.splitlines():
        if ":" in line:
            key, _, value = line.partition(":")
            headers[key.strip().lower()] = value.strip()
    return headers
