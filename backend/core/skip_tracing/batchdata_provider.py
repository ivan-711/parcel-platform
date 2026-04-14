"""BatchData provider — skip tracing (owner contact lookup) via BatchData API.

API docs: https://docs.batchdata.com
Auth: Bearer token in Authorization header
Endpoint: POST /api/v1/property/skip-trace

Every call is logged externally by the task layer; this module is pure I/O.
Timeout: 30 seconds.
Single retry on 5xx errors with 2s backoff.
"""

import asyncio
import logging
import os
import time
from dataclasses import dataclass
from typing import Optional

import httpx

logger = logging.getLogger(__name__)

BATCHDATA_API_KEY = os.getenv("BATCHDATA_API_KEY", "")
BATCHDATA_BASE_URL = "https://api.batchdata.com/api/v1"
TIMEOUT_SECONDS = 30
COST_CENTS_PER_TRACE = 12  # ~$0.12 per successful hit


@dataclass
class SkipTraceResult:
    """Result from a BatchData skip trace call."""

    status: str  # success | not_found | failed | timeout | auth_error | rate_limited
    owner_first_name: Optional[str] = None
    owner_last_name: Optional[str] = None
    phones: Optional[list] = None   # [{number, type, is_primary}]
    emails: Optional[list] = None   # [{email, is_primary}]
    mailing_address: Optional[dict] = None  # {line1, city, state, zip}
    is_absentee_owner: Optional[bool] = None
    demographics: Optional[dict] = None
    raw_response: Optional[dict] = None
    error: Optional[str] = None
    latency_ms: int = 0


def _classify_error(status_code: int) -> SkipTraceResult:
    """Map HTTP error codes to SkipTraceResult."""
    error_map = {
        400: ("failed", "Invalid address or request"),
        401: ("auth_error", "API key verification failed"),
        403: ("auth_error", "Access denied"),
        404: ("not_found", "No records found for this address"),
        429: ("rate_limited", "Rate limit exceeded"),
    }
    if status_code in error_map:
        s, msg = error_map[status_code]
        return SkipTraceResult(status=s, error=msg)
    return SkipTraceResult(status="failed", error=f"HTTP {status_code}")


class BatchDataProvider:
    """BatchData skip trace provider.

    Instantiate once and reuse.  Both async and sync call paths are
    provided so the same class works in FastAPI endpoints and Dramatiq workers.
    """

    def _build_payload(self, address: str, city: str, state: str, zip_code: str) -> dict:
        return {
            "requests": [
                {
                    "propertyAddress": {
                        "street": address,
                        "city": city,
                        "state": state,
                        "zip": zip_code,
                    }
                }
            ]
        }

    def _build_headers(self) -> dict:
        return {
            "Authorization": f"Bearer {BATCHDATA_API_KEY}",
            "Content-Type": "application/json",
        }

    # ------------------------------------------------------------------
    # Response extraction
    # ------------------------------------------------------------------

    def _normalize_phone_type(self, raw_type: str) -> str:
        """Map BatchData lineType to a canonical type string."""
        t = (raw_type or "").strip()
        if t in ("Mobile", "Wireless"):
            return "mobile"
        if t == "Landline":
            return "landline"
        if t in ("VoIP", "VOIP"):
            return "voip"
        return "unknown"

    def _extract_owner_data(self, data: dict) -> dict:
        """Extract and normalize owner contact data from a BatchData response.

        BatchData response shape (simplified)::

            {
              "results": {
                "persons": [{
                  "name": {"first": "John", "last": "Smith"},
                  "phoneNumbers": [
                      {"phoneNumber": "+14145551234", "lineType": "Mobile"}
                  ],
                  "emailAddresses": [{"emailAddress": "john@example.com"}],
                  "addresses": [
                      {"street": "456 Oak St", "city": "Chicago",
                       "state": "IL", "zip": "60601"}
                  ]
                }]
              }
            }
        """
        extracted: dict = {
            "owner_first_name": None,
            "owner_last_name": None,
            "phones": [],
            "emails": [],
            "mailing_address": None,
            "demographics": None,
        }

        results = data.get("results", {})
        persons = results.get("persons", [])
        if not persons:
            return extracted

        person = persons[0]

        # Name
        name = person.get("name", {})
        extracted["owner_first_name"] = name.get("first") or None
        extracted["owner_last_name"] = name.get("last") or None

        # Phone numbers
        phones = []
        for idx, ph in enumerate(person.get("phoneNumbers", [])):
            raw_number = ph.get("phoneNumber", "")
            if raw_number:
                phones.append({
                    "number": raw_number,
                    "type": self._normalize_phone_type(ph.get("lineType", "")),
                    "is_primary": idx == 0,
                })
        extracted["phones"] = phones or None

        # Email addresses
        emails = []
        for idx, em in enumerate(person.get("emailAddresses", [])):
            addr = em.get("emailAddress", "")
            if addr:
                emails.append({
                    "email": addr,
                    "is_primary": idx == 0,
                })
        extracted["emails"] = emails or None

        # Mailing address (first address on record)
        addresses = person.get("addresses", [])
        if addresses:
            first_addr = addresses[0]
            extracted["mailing_address"] = {
                "line1": first_addr.get("street", ""),
                "city": first_addr.get("city", ""),
                "state": first_addr.get("state", ""),
                "zip": first_addr.get("zip", ""),
            }

        # Demographics — include if present in response
        demographics = {}
        age_range = person.get("ageRange") or person.get("age_range")
        income_range = person.get("incomeRange") or person.get("income_range")
        if age_range:
            demographics["age_range"] = age_range
        if income_range:
            demographics["income_range"] = income_range
        extracted["demographics"] = demographics if demographics else None

        return extracted

    def _is_absentee(self, extracted: dict, city: str, state: str) -> Optional[bool]:
        """Detect absentee ownership by comparing mailing address to subject property."""
        mailing = extracted.get("mailing_address")
        if not mailing:
            return None
        mailing_city = (mailing.get("city") or "").strip().lower()
        mailing_state = (mailing.get("state") or "").strip().lower()
        input_city = (city or "").strip().lower()
        input_state = (state or "").strip().lower()
        if not mailing_city or not mailing_state:
            return None
        return mailing_city != input_city or mailing_state != input_state

    # ------------------------------------------------------------------
    # Async path (FastAPI / SSE)
    # ------------------------------------------------------------------

    async def skip_trace_address(
        self, address: str, city: str, state: str, zip_code: str
    ) -> SkipTraceResult:
        """Async skip trace — safe for FastAPI async endpoints and SSE generators."""
        if not BATCHDATA_API_KEY:
            return SkipTraceResult(status="failed", error="BATCHDATA_API_KEY not configured")

        url = f"{BATCHDATA_BASE_URL}/property/skip-trace"
        headers = self._build_headers()
        payload = self._build_payload(address, city, state, zip_code)

        async with httpx.AsyncClient(timeout=TIMEOUT_SECONDS) as client:
            for attempt in range(2):  # 1 initial + 1 retry
                start = time.time()
                try:
                    resp = await client.post(url, headers=headers, json=payload)
                    latency_ms = int((time.time() - start) * 1000)

                    if resp.status_code == 200:
                        data = resp.json() if resp.content else {}
                        extracted = self._extract_owner_data(data)
                        persons = data.get("results", {}).get("persons", [])
                        if not persons:
                            return SkipTraceResult(
                                status="not_found",
                                raw_response=data,
                                latency_ms=latency_ms,
                            )
                        return SkipTraceResult(
                            status="success",
                            owner_first_name=extracted["owner_first_name"],
                            owner_last_name=extracted["owner_last_name"],
                            phones=extracted["phones"],
                            emails=extracted["emails"],
                            mailing_address=extracted["mailing_address"],
                            is_absentee_owner=self._is_absentee(extracted, city, state),
                            demographics=extracted["demographics"],
                            raw_response=data,
                            latency_ms=latency_ms,
                        )

                    if resp.status_code >= 500 and attempt == 0:
                        logger.warning("BatchData 5xx (%d), retrying in 2s", resp.status_code)
                        await asyncio.sleep(2)
                        continue

                    result = _classify_error(resp.status_code)
                    result.latency_ms = latency_ms
                    return result

                except httpx.TimeoutException:
                    latency_ms = int((time.time() - start) * 1000)
                    return SkipTraceResult(
                        status="timeout", error="Request timed out", latency_ms=latency_ms
                    )
                except (httpx.ConnectError, httpx.RequestError):
                    latency_ms = int((time.time() - start) * 1000)
                    if attempt == 0:
                        logger.warning("BatchData connection error, retrying")
                        await asyncio.sleep(2)
                        continue
                    return SkipTraceResult(
                        status="failed", error="Connection error", latency_ms=latency_ms
                    )
                except Exception as e:
                    latency_ms = int((time.time() - start) * 1000)
                    return SkipTraceResult(status="failed", error=str(e), latency_ms=latency_ms)

        return SkipTraceResult(status="failed", error="Max retries exceeded")

    # ------------------------------------------------------------------
    # Sync path (Dramatiq workers)
    # ------------------------------------------------------------------

    def skip_trace_address_sync(
        self, address: str, city: str, state: str, zip_code: str
    ) -> SkipTraceResult:
        """Sync skip trace — safe for Dramatiq workers and other sync contexts.

        Uses httpx synchronous client to avoid blocking the asyncio event loop
        if accidentally called from an async context.
        """
        if not BATCHDATA_API_KEY:
            return SkipTraceResult(status="failed", error="BATCHDATA_API_KEY not configured")

        url = f"{BATCHDATA_BASE_URL}/property/skip-trace"
        headers = self._build_headers()
        payload = self._build_payload(address, city, state, zip_code)

        with httpx.Client(timeout=TIMEOUT_SECONDS) as client:
            for attempt in range(2):  # 1 initial + 1 retry
                start = time.time()
                try:
                    resp = client.post(url, headers=headers, json=payload)
                    latency_ms = int((time.time() - start) * 1000)

                    if resp.status_code == 200:
                        data = resp.json() if resp.content else {}
                        extracted = self._extract_owner_data(data)
                        persons = data.get("results", {}).get("persons", [])
                        if not persons:
                            return SkipTraceResult(
                                status="not_found",
                                raw_response=data,
                                latency_ms=latency_ms,
                            )
                        return SkipTraceResult(
                            status="success",
                            owner_first_name=extracted["owner_first_name"],
                            owner_last_name=extracted["owner_last_name"],
                            phones=extracted["phones"],
                            emails=extracted["emails"],
                            mailing_address=extracted["mailing_address"],
                            is_absentee_owner=self._is_absentee(extracted, city, state),
                            demographics=extracted["demographics"],
                            raw_response=data,
                            latency_ms=latency_ms,
                        )

                    if resp.status_code >= 500 and attempt == 0:
                        logger.warning("BatchData 5xx (%d), retrying in 2s", resp.status_code)
                        time.sleep(2)
                        continue

                    result = _classify_error(resp.status_code)
                    result.latency_ms = latency_ms
                    return result

                except httpx.TimeoutException:
                    latency_ms = int((time.time() - start) * 1000)
                    return SkipTraceResult(
                        status="timeout", error="Request timed out", latency_ms=latency_ms
                    )
                except (httpx.ConnectError, httpx.RequestError):
                    latency_ms = int((time.time() - start) * 1000)
                    if attempt == 0:
                        logger.warning("BatchData connection error, retrying")
                        time.sleep(2)
                        continue
                    return SkipTraceResult(
                        status="failed", error="Connection error", latency_ms=latency_ms
                    )
                except Exception as e:
                    latency_ms = int((time.time() - start) * 1000)
                    return SkipTraceResult(status="failed", error=str(e), latency_ms=latency_ms)

        return SkipTraceResult(status="failed", error="Max retries exceeded")
