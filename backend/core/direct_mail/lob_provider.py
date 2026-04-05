"""Lob provider — direct mail (postcards, letters, address verification) via Lob API.

API docs: https://docs.lob.com
Auth: HTTP Basic — API key as username, empty password
Endpoints:
  POST /v1/us_verifications  — address verification
  POST /v1/postcards         — send postcard
  POST /v1/letters           — send letter
  GET  /v1/postcards/{id}    — postcard status / tracking
  GET  /v1/letters/{id}      — letter status / tracking

Every call is logged externally by the task layer; this module is pure I/O.
Timeout: 15 seconds.
Single retry on 5xx errors with 2s backoff (send endpoints only).
"""

import asyncio
import logging
import os
import time
from dataclasses import dataclass
from typing import Optional

import httpx

logger = logging.getLogger(__name__)

LOB_API_KEY = os.getenv("LOB_API_KEY", "")
LOB_BASE_URL = "https://api.lob.com/v1"
TIMEOUT_SECONDS = 15
COST_CENTS = {
    "postcard_4x6": 63,
    "postcard_6x9": 84,
    "postcard_6x11": 95,
    "letter": 105,
}


@dataclass
class MailSendResult:
    """Result from a Lob postcard or letter send call."""

    status: str  # success | failed | timeout | auth_error | rate_limited
    lob_id: Optional[str] = None
    expected_delivery: Optional[str] = None
    cost_cents: int = 0
    raw_response: Optional[dict] = None
    error: Optional[str] = None
    latency_ms: int = 0


@dataclass
class AddressVerifyResult:
    """Result from a Lob address verification call."""

    deliverability: str  # deliverable | deliverable_missing_unit | undeliverable | no_match
    primary_line: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None
    error: Optional[str] = None


def _classify_error(status_code: int) -> MailSendResult:
    """Map HTTP error codes to MailSendResult."""
    error_map = {
        400: ("failed", "Invalid request"),
        401: ("auth_error", "API key verification failed"),
        403: ("auth_error", "Access denied"),
        404: ("not_found", "Resource not found"),
        422: ("failed", "Unprocessable request"),
        429: ("rate_limited", "Rate limit exceeded"),
    }
    if status_code in error_map:
        s, msg = error_map[status_code]
        return MailSendResult(status=s, error=msg)
    return MailSendResult(status="failed", error=f"HTTP {status_code}")


def _format_lob_address(address: dict) -> dict:
    """Convert our internal address format to Lob's expected format.

    Input:  {name, line1, city, state, zip}
    Output: {name, address_line1, address_city, address_state, address_zip}
    """
    return {
        "name": address.get("name", ""),
        "address_line1": address.get("line1", ""),
        "address_city": address.get("city", ""),
        "address_state": address.get("state", ""),
        "address_zip": address.get("zip", ""),
    }


class LobProvider:
    """Lob direct mail provider.

    Instantiate once and reuse.  Both async and sync call paths are
    provided so the same class works in FastAPI endpoints and Dramatiq workers.
    """

    def _build_auth(self) -> tuple:
        """Lob uses HTTP Basic auth — API key as username, empty password."""
        return (LOB_API_KEY, "")

    # ------------------------------------------------------------------
    # Address verification (async only — fast endpoint, no retry needed)
    # ------------------------------------------------------------------

    async def verify_address(self, address: dict) -> AddressVerifyResult:
        """Verify a US address via Lob's /us_verifications endpoint.

        Args:
            address: dict with keys line1, city, state, zip

        Returns:
            AddressVerifyResult with deliverability and standardized components.
        """
        if not LOB_API_KEY:
            return AddressVerifyResult(
                deliverability="no_match", error="LOB_API_KEY not configured"
            )

        url = f"{LOB_BASE_URL}/us_verifications"
        payload = {
            "primary_line": address.get("line1", ""),
            "city": address.get("city", ""),
            "state": address.get("state", ""),
            "zip_code": address.get("zip", ""),
        }

        async with httpx.AsyncClient(timeout=TIMEOUT_SECONDS) as client:
            try:
                resp = await client.post(url, auth=self._build_auth(), json=payload)

                if resp.status_code == 200:
                    data = resp.json() if resp.content else {}
                    components = data.get("components", {})
                    return AddressVerifyResult(
                        deliverability=data.get("deliverability", "no_match"),
                        primary_line=data.get("primary_line"),
                        city=components.get("city"),
                        state=components.get("state"),
                        zip_code=components.get("zip_code"),
                    )

                return AddressVerifyResult(
                    deliverability="no_match",
                    error=f"HTTP {resp.status_code}",
                )

            except httpx.TimeoutException:
                return AddressVerifyResult(
                    deliverability="no_match", error="Request timed out"
                )
            except Exception as e:
                return AddressVerifyResult(deliverability="no_match", error=str(e))

    # ------------------------------------------------------------------
    # Async path (FastAPI / SSE)
    # ------------------------------------------------------------------

    async def send_postcard(
        self,
        to_address: dict,
        front_html: str,
        back_html: str,
        from_address: dict,
        size: str = "4x6",
    ) -> MailSendResult:
        """Send a postcard via Lob — safe for FastAPI async endpoints and SSE generators.

        Args:
            to_address:   Recipient address dict {name, line1, city, state, zip}
            front_html:   HTML string for the postcard front
            back_html:    HTML string for the postcard back
            from_address: Sender address dict {name, line1, city, state, zip}
            size:         Postcard size: "4x6" (default), "6x9", or "6x11"

        Returns:
            MailSendResult with lob_id, expected_delivery, and cost_cents.
        """
        if not LOB_API_KEY:
            return MailSendResult(status="failed", error="LOB_API_KEY not configured")

        url = f"{LOB_BASE_URL}/postcards"
        payload = {
            "to": _format_lob_address(to_address),
            "from": _format_lob_address(from_address),
            "front": front_html,
            "back": back_html,
            "size": size,
        }
        cost_key = f"postcard_{size}"

        async with httpx.AsyncClient(timeout=TIMEOUT_SECONDS) as client:
            for attempt in range(2):  # 1 initial + 1 retry
                start = time.time()
                try:
                    resp = await client.post(url, auth=self._build_auth(), json=payload)
                    latency_ms = int((time.time() - start) * 1000)

                    if resp.status_code == 200:
                        data = resp.json() if resp.content else {}
                        return MailSendResult(
                            status="success",
                            lob_id=data.get("id"),
                            expected_delivery=data.get("expected_delivery_date"),
                            cost_cents=COST_CENTS.get(cost_key, 0),
                            raw_response=data,
                            latency_ms=latency_ms,
                        )

                    if resp.status_code >= 500 and attempt == 0:
                        logger.warning("Lob 5xx (%d), retrying in 2s", resp.status_code)
                        await asyncio.sleep(2)
                        continue

                    result = _classify_error(resp.status_code)
                    result.latency_ms = latency_ms
                    return result

                except httpx.TimeoutException:
                    latency_ms = int((time.time() - start) * 1000)
                    return MailSendResult(
                        status="timeout", error="Request timed out", latency_ms=latency_ms
                    )
                except (httpx.ConnectError, httpx.RequestError):
                    latency_ms = int((time.time() - start) * 1000)
                    if attempt == 0:
                        logger.warning("Lob connection error, retrying")
                        await asyncio.sleep(2)
                        continue
                    return MailSendResult(
                        status="failed", error="Connection error", latency_ms=latency_ms
                    )
                except Exception as e:
                    latency_ms = int((time.time() - start) * 1000)
                    return MailSendResult(status="failed", error=str(e), latency_ms=latency_ms)

        return MailSendResult(status="failed", error="Max retries exceeded")

    async def send_letter(
        self,
        to_address: dict,
        html_content: str,
        from_address: dict,
    ) -> MailSendResult:
        """Send a letter via Lob — safe for FastAPI async endpoints and SSE generators.

        Args:
            to_address:   Recipient address dict {name, line1, city, state, zip}
            html_content: HTML string for the letter body
            from_address: Sender address dict {name, line1, city, state, zip}

        Returns:
            MailSendResult with lob_id, expected_delivery, and cost_cents.
        """
        if not LOB_API_KEY:
            return MailSendResult(status="failed", error="LOB_API_KEY not configured")

        url = f"{LOB_BASE_URL}/letters"
        payload = {
            "to": _format_lob_address(to_address),
            "from": _format_lob_address(from_address),
            "file": html_content,
            "color": False,
        }

        async with httpx.AsyncClient(timeout=TIMEOUT_SECONDS) as client:
            for attempt in range(2):  # 1 initial + 1 retry
                start = time.time()
                try:
                    resp = await client.post(url, auth=self._build_auth(), json=payload)
                    latency_ms = int((time.time() - start) * 1000)

                    if resp.status_code == 200:
                        data = resp.json() if resp.content else {}
                        return MailSendResult(
                            status="success",
                            lob_id=data.get("id"),
                            expected_delivery=data.get("expected_delivery_date"),
                            cost_cents=COST_CENTS.get("letter", 0),
                            raw_response=data,
                            latency_ms=latency_ms,
                        )

                    if resp.status_code >= 500 and attempt == 0:
                        logger.warning("Lob 5xx (%d), retrying in 2s", resp.status_code)
                        await asyncio.sleep(2)
                        continue

                    result = _classify_error(resp.status_code)
                    result.latency_ms = latency_ms
                    return result

                except httpx.TimeoutException:
                    latency_ms = int((time.time() - start) * 1000)
                    return MailSendResult(
                        status="timeout", error="Request timed out", latency_ms=latency_ms
                    )
                except (httpx.ConnectError, httpx.RequestError):
                    latency_ms = int((time.time() - start) * 1000)
                    if attempt == 0:
                        logger.warning("Lob connection error, retrying")
                        await asyncio.sleep(2)
                        continue
                    return MailSendResult(
                        status="failed", error="Connection error", latency_ms=latency_ms
                    )
                except Exception as e:
                    latency_ms = int((time.time() - start) * 1000)
                    return MailSendResult(status="failed", error=str(e), latency_ms=latency_ms)

        return MailSendResult(status="failed", error="Max retries exceeded")

    async def get_status(self, lob_id: str) -> dict:
        """Retrieve tracking events for a postcard or letter by Lob ID.

        ID prefix determines resource type:
          psc_ → postcards
          ltr_ → letters

        Args:
            lob_id: Lob resource ID (e.g. "psc_xxx" or "ltr_xxx")

        Returns:
            Raw Lob API response dict, or {"error": ...} on failure.
        """
        if not LOB_API_KEY:
            return {"error": "LOB_API_KEY not configured"}

        if lob_id.startswith("psc_"):
            resource_type = "postcards"
        elif lob_id.startswith("ltr_"):
            resource_type = "letters"
        else:
            return {"error": f"Unknown Lob ID prefix: {lob_id}"}

        url = f"{LOB_BASE_URL}/{resource_type}/{lob_id}"

        async with httpx.AsyncClient(timeout=TIMEOUT_SECONDS) as client:
            try:
                resp = await client.get(url, auth=self._build_auth())
                if resp.status_code == 200:
                    return resp.json() if resp.content else {}
                return {"error": f"HTTP {resp.status_code}"}
            except httpx.TimeoutException:
                return {"error": "Request timed out"}
            except Exception as e:
                return {"error": str(e)}

    # ------------------------------------------------------------------
    # Sync path (Dramatiq workers)
    # ------------------------------------------------------------------

    def send_postcard_sync(
        self,
        to_address: dict,
        front_html: str,
        back_html: str,
        from_address: dict,
        size: str = "4x6",
    ) -> MailSendResult:
        """Send a postcard via Lob — safe for Dramatiq workers and other sync contexts.

        Uses httpx synchronous client to avoid blocking the asyncio event loop
        if accidentally called from an async context.
        """
        if not LOB_API_KEY:
            return MailSendResult(status="failed", error="LOB_API_KEY not configured")

        url = f"{LOB_BASE_URL}/postcards"
        payload = {
            "to": _format_lob_address(to_address),
            "from": _format_lob_address(from_address),
            "front": front_html,
            "back": back_html,
            "size": size,
        }
        cost_key = f"postcard_{size}"

        with httpx.Client(timeout=TIMEOUT_SECONDS) as client:
            for attempt in range(2):  # 1 initial + 1 retry
                start = time.time()
                try:
                    resp = client.post(url, auth=self._build_auth(), json=payload)
                    latency_ms = int((time.time() - start) * 1000)

                    if resp.status_code == 200:
                        data = resp.json() if resp.content else {}
                        return MailSendResult(
                            status="success",
                            lob_id=data.get("id"),
                            expected_delivery=data.get("expected_delivery_date"),
                            cost_cents=COST_CENTS.get(cost_key, 0),
                            raw_response=data,
                            latency_ms=latency_ms,
                        )

                    if resp.status_code >= 500 and attempt == 0:
                        logger.warning("Lob 5xx (%d), retrying in 2s", resp.status_code)
                        time.sleep(2)
                        continue

                    result = _classify_error(resp.status_code)
                    result.latency_ms = latency_ms
                    return result

                except httpx.TimeoutException:
                    latency_ms = int((time.time() - start) * 1000)
                    return MailSendResult(
                        status="timeout", error="Request timed out", latency_ms=latency_ms
                    )
                except (httpx.ConnectError, httpx.RequestError):
                    latency_ms = int((time.time() - start) * 1000)
                    if attempt == 0:
                        logger.warning("Lob connection error, retrying")
                        time.sleep(2)
                        continue
                    return MailSendResult(
                        status="failed", error="Connection error", latency_ms=latency_ms
                    )
                except Exception as e:
                    latency_ms = int((time.time() - start) * 1000)
                    return MailSendResult(status="failed", error=str(e), latency_ms=latency_ms)

        return MailSendResult(status="failed", error="Max retries exceeded")

    def send_letter_sync(
        self,
        to_address: dict,
        html_content: str,
        from_address: dict,
    ) -> MailSendResult:
        """Send a letter via Lob — safe for Dramatiq workers and other sync contexts.

        Uses httpx synchronous client to avoid blocking the asyncio event loop
        if accidentally called from an async context.
        """
        if not LOB_API_KEY:
            return MailSendResult(status="failed", error="LOB_API_KEY not configured")

        url = f"{LOB_BASE_URL}/letters"
        payload = {
            "to": _format_lob_address(to_address),
            "from": _format_lob_address(from_address),
            "file": html_content,
            "color": False,
        }

        with httpx.Client(timeout=TIMEOUT_SECONDS) as client:
            for attempt in range(2):  # 1 initial + 1 retry
                start = time.time()
                try:
                    resp = client.post(url, auth=self._build_auth(), json=payload)
                    latency_ms = int((time.time() - start) * 1000)

                    if resp.status_code == 200:
                        data = resp.json() if resp.content else {}
                        return MailSendResult(
                            status="success",
                            lob_id=data.get("id"),
                            expected_delivery=data.get("expected_delivery_date"),
                            cost_cents=COST_CENTS.get("letter", 0),
                            raw_response=data,
                            latency_ms=latency_ms,
                        )

                    if resp.status_code >= 500 and attempt == 0:
                        logger.warning("Lob 5xx (%d), retrying in 2s", resp.status_code)
                        time.sleep(2)
                        continue

                    result = _classify_error(resp.status_code)
                    result.latency_ms = latency_ms
                    return result

                except httpx.TimeoutException:
                    latency_ms = int((time.time() - start) * 1000)
                    return MailSendResult(
                        status="timeout", error="Request timed out", latency_ms=latency_ms
                    )
                except (httpx.ConnectError, httpx.RequestError):
                    latency_ms = int((time.time() - start) * 1000)
                    if attempt == 0:
                        logger.warning("Lob connection error, retrying")
                        time.sleep(2)
                        continue
                    return MailSendResult(
                        status="failed", error="Connection error", latency_ms=latency_ms
                    )
                except Exception as e:
                    latency_ms = int((time.time() - start) * 1000)
                    return MailSendResult(status="failed", error=str(e), latency_ms=latency_ms)

        return MailSendResult(status="failed", error="Max retries exceeded")
