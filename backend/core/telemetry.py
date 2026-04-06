"""Telemetry wrapper — PostHog event tracking with graceful no-op fallback."""

import logging
import os
from typing import Any, Optional

logger = logging.getLogger(__name__)

_posthog_client = None
_initialized = False


def _ensure_init():
    """Lazily initialize the PostHog client on first use."""
    global _posthog_client, _initialized
    if _initialized:
        return
    _initialized = True

    api_key = os.getenv("POSTHOG_API_KEY")
    if not api_key:
        logger.info("POSTHOG_API_KEY not set — telemetry disabled")
        return

    try:
        import posthog

        posthog.project_api_key = api_key
        host = os.getenv("POSTHOG_HOST")
        if host:
            posthog.host = host
        _posthog_client = posthog
        logger.info("PostHog telemetry initialized")
    except Exception:
        logger.warning("Failed to initialize PostHog", exc_info=True)


def track_event(
    user_id: Any,
    event_name: str,
    properties: Optional[dict[str, Any]] = None,
) -> None:
    """Track a server-side event. No-ops if PostHog is not configured."""
    _ensure_init()
    if _posthog_client is None:
        return
    try:
        _posthog_client.capture(
            distinct_id=str(user_id),
            event=event_name,
            properties=properties or {},
        )
    except Exception:
        logger.warning("Failed to track event %s", event_name, exc_info=True)


def identify_user(
    user_id: Any,
    properties: Optional[dict[str, Any]] = None,
) -> None:
    """Identify a user with traits. No-ops if PostHog is not configured."""
    _ensure_init()
    if _posthog_client is None:
        return
    try:
        _posthog_client.identify(
            distinct_id=str(user_id),
            properties=properties or {},
        )
    except Exception:
        logger.warning("Failed to identify user %s", user_id, exc_info=True)
