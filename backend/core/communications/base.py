"""Abstract base classes for communication providers."""

from __future__ import annotations


class BaseSMSProvider:
    """Interface for SMS providers (Twilio, etc.)."""

    async def send(self, to_phone: str, body: str, from_number: str) -> dict:
        """Send SMS. Returns {external_id, status, cost_cents, segments}."""
        raise NotImplementedError

    def validate_webhook(self, body: bytes, signature: str, url: str) -> bool:
        """Validate incoming webhook signature from provider."""
        raise NotImplementedError

    def parse_incoming(self, payload: dict) -> dict:
        """Parse incoming SMS. Returns {from_phone, body, external_id}."""
        raise NotImplementedError

    def parse_status(self, payload: dict) -> dict:
        """Parse status callback. Returns {external_id, status, error_message?}."""
        raise NotImplementedError


class BaseEmailProvider:
    """Interface for email providers (SendGrid, Postmark, etc.)."""

    async def send(
        self,
        to_email: str,
        subject: str,
        body_html: str,
        body_text: str,
        from_email: str,
        reply_to: str | None = None,
    ) -> dict:
        """Send email. Returns {external_id, status}."""
        raise NotImplementedError

    def validate_webhook(self, body: bytes, signature: str) -> bool:
        """Validate incoming webhook signature."""
        raise NotImplementedError

    def parse_incoming(self, payload: dict) -> dict:
        """Parse inbound email. Returns {from_email, subject, body, external_id}."""
        raise NotImplementedError

    def parse_events(self, payload: list[dict]) -> list[dict]:
        """Parse event webhook. Returns [{external_id, event_type, timestamp}]."""
        raise NotImplementedError
