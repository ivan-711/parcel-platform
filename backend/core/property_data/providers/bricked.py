"""Bricked.ai provider — AI-generated comps, ARV, and repair estimates.

API docs: https://docs.bricked.ai
Auth: x-api-key header
Single endpoint: GET /v1/property/create?address=<addr>

Every call is logged as a DataSourceEvent (success AND failure).
Timeout: 45 seconds (Bricked uses AI processing, ~15-30s typical).
Single retry on 5xx errors.
"""

import asyncio
import json
import logging
import os
import time
from dataclasses import dataclass, field
from typing import Optional
from urllib.parse import quote

import httpx

logger = logging.getLogger(__name__)

BRICKED_API_KEY = os.getenv("BRICKED_API_KEY", "")
BRICKED_BASE_URL = os.getenv("BRICKED_BASE_URL", "https://api.bricked.ai")
TIMEOUT_SECONDS = 45  # Bricked takes 15-30s; generous timeout
COST_CENTS_PER_CALL = 43  # ~$0.43/comp on Growth plan ($129/mo for 300)


@dataclass
class BrickedResult:
    """Result from a Bricked.ai API call."""

    status: str  # success|failed|timeout|not_found|auth_error|rate_limited|subscription_inactive
    data: dict = field(default_factory=dict)
    error: Optional[str] = None
    latency_ms: int = 0


def _build_url(address: str, overrides: dict | None = None) -> str:
    """Build the Bricked API URL with query params."""
    params = {"address": quote(address, safe="")}
    if overrides:
        param_map = {
            "sqft": "squareFeet",
            "bedrooms": "bedrooms",
            "bathrooms": "bathrooms",
            "year_built": "yearBuilt",
        }
        for parcel_key, bricked_key in param_map.items():
            val = overrides.get(parcel_key)
            if val is not None:
                params[bricked_key] = str(val)
    query = "&".join(f"{k}={v}" for k, v in params.items())
    return f"{BRICKED_BASE_URL}/v1/property/create?{query}"


def _classify_error(status_code: int) -> BrickedResult:
    """Map HTTP error codes to BrickedResult."""
    error_map = {
        400: ("failed", "Invalid address or storage failure"),
        401: ("auth_error", "API key verification failed"),
        402: ("subscription_inactive", "Bricked subscription inactive"),
        404: ("not_found", "Property not found"),
        412: ("failed", "Missing required data (e.g., squareFeet)"),
        429: ("rate_limited", "Rate limit exceeded"),
    }
    if status_code in error_map:
        s, msg = error_map[status_code]
        return BrickedResult(status=s, error=msg)
    return BrickedResult(status="failed", error=f"HTTP {status_code}")


async def _make_request_async(
    address: str,
    overrides: dict | None = None,
) -> BrickedResult:
    """Async version — safe for use in FastAPI async endpoints and SSE generators."""
    if not BRICKED_API_KEY:
        return BrickedResult(status="failed", error="BRICKED_API_KEY not configured")

    url = _build_url(address, overrides)
    headers = {"Accept": "application/json", "x-api-key": BRICKED_API_KEY}

    async with httpx.AsyncClient(timeout=TIMEOUT_SECONDS) as client:
        for attempt in range(2):  # 1 initial + 1 retry
            start = time.time()
            try:
                resp = await client.get(url, headers=headers)
                latency_ms = int((time.time() - start) * 1000)

                if resp.status_code == 200:
                    data = resp.json() if resp.content else {}
                    return BrickedResult(status="success", data=data, latency_ms=latency_ms)

                if resp.status_code >= 500 and attempt == 0:
                    logger.warning("Bricked 5xx (%d), retrying in 2s", resp.status_code)
                    await asyncio.sleep(2)
                    continue

                result = _classify_error(resp.status_code)
                result.latency_ms = latency_ms
                return result

            except httpx.TimeoutException:
                latency_ms = int((time.time() - start) * 1000)
                return BrickedResult(status="timeout", error="Request timed out", latency_ms=latency_ms)
            except (httpx.ConnectError, httpx.RequestError):
                latency_ms = int((time.time() - start) * 1000)
                if attempt == 0:
                    logger.warning("Bricked connection error, retrying")
                    await asyncio.sleep(2)
                    continue
                return BrickedResult(status="failed", error="Connection error", latency_ms=latency_ms)
            except Exception as e:
                latency_ms = int((time.time() - start) * 1000)
                return BrickedResult(status="failed", error=str(e), latency_ms=latency_ms)

    return BrickedResult(status="failed", error="Max retries exceeded")


def _make_request(
    address: str,
    overrides: dict | None = None,
) -> BrickedResult:
    """Sync version — safe for Dramatiq workers and other sync contexts.

    Uses httpx synchronous client (not urllib) to avoid blocking the asyncio
    event loop if accidentally called from an async context.
    """
    if not BRICKED_API_KEY:
        return BrickedResult(status="failed", error="BRICKED_API_KEY not configured")

    url = _build_url(address, overrides)
    headers = {"Accept": "application/json", "x-api-key": BRICKED_API_KEY}

    with httpx.Client(timeout=TIMEOUT_SECONDS) as client:
        for attempt in range(2):  # 1 initial + 1 retry
            start = time.time()
            try:
                resp = client.get(url, headers=headers)
                latency_ms = int((time.time() - start) * 1000)

                if resp.status_code == 200:
                    data = resp.json() if resp.content else {}
                    return BrickedResult(status="success", data=data, latency_ms=latency_ms)

                if resp.status_code >= 500 and attempt == 0:
                    logger.warning("Bricked 5xx (%d), retrying in 2s", resp.status_code)
                    time.sleep(2)
                    continue

                result = _classify_error(resp.status_code)
                result.latency_ms = latency_ms
                return result

            except httpx.TimeoutException:
                latency_ms = int((time.time() - start) * 1000)
                return BrickedResult(status="timeout", error="Request timed out", latency_ms=latency_ms)
            except (httpx.ConnectError, httpx.RequestError):
                latency_ms = int((time.time() - start) * 1000)
                if attempt == 0:
                    logger.warning("Bricked connection error, retrying")
                    time.sleep(2)
                    continue
                return BrickedResult(status="failed", error="Connection error", latency_ms=latency_ms)
            except Exception as e:
                latency_ms = int((time.time() - start) * 1000)
                return BrickedResult(status="failed", error=str(e), latency_ms=latency_ms)

    return BrickedResult(status="failed", error="Max retries exceeded")


def fetch_property_analysis(
    address: str,
    property_hints: dict | None = None,
) -> BrickedResult:
    """Fetch full property analysis from Bricked.ai (sync).

    Args:
        address: Property address string.
        property_hints: Optional dict with RentCast-derived hints
                       (sqft, bedrooms, etc.) to pass as overrides,
                       helping Bricked avoid 412 errors when it
                       can't detect sqft from its own data.
    """
    return _make_request(address, overrides=property_hints)


async def fetch_property_analysis_async(
    address: str,
    property_hints: dict | None = None,
) -> BrickedResult:
    """Fetch full property analysis from Bricked.ai (async).

    Use this from FastAPI async endpoints and SSE generators to avoid
    blocking the event loop.
    """
    return await _make_request_async(address, overrides=property_hints)


# ---------------------------------------------------------------------------
# Field extraction
# ---------------------------------------------------------------------------

def extract_valuation_fields(data: dict) -> dict:
    """Extract CMV, ARV, and total repair cost from Bricked response."""
    return {
        "cmv": data.get("cmv"),
        "after_repair_value": data.get("arv"),
        "repair_cost": data.get("totalRepairCost"),
    }


def extract_property_fields(data: dict) -> dict:
    """Extract property details from Bricked response (backfill for missing RentCast fields)."""
    prop = data.get("property", {})
    details = prop.get("details", {})
    return {
        "bedrooms": details.get("bedrooms"),
        "bathrooms": details.get("bathrooms"),
        "sqft": details.get("squareFeet"),
        "lot_sqft": details.get("lotSquareFeet"),
        "year_built": details.get("yearBuilt"),
    }


def extract_comps_summary(data: dict, max_comps: int = 5) -> list[dict]:
    """Extract top N selected comps for scenario context.

    Returns a compact summary suitable for storing in inputs_extended
    and including in the AI narrator prompt.
    """
    comps = data.get("comps", [])

    # Prefer comps marked as selected
    selected = [c for c in comps if c.get("selected")]
    if not selected:
        selected = comps[:max_comps]
    else:
        selected = selected[:max_comps]

    summary = []
    for c in selected:
        prop = c.get("property", {})
        addr = prop.get("address", {})
        details = prop.get("details", {})
        summary.append({
            "address": addr.get("fullAddress", ""),
            "comp_type": c.get("compType"),
            "adjusted_value": c.get("adjusted_value"),
            "sqft": details.get("squareFeet"),
            "bedrooms": details.get("bedrooms"),
            "bathrooms": details.get("bathrooms"),
            "last_sale_amount": details.get("lastSaleAmount"),
            "last_sale_date": details.get("lastSaleDate"),
        })
    return summary


def extract_repairs_summary(data: dict) -> list[dict]:
    """Extract repairs list for scenario context."""
    repairs = data.get("repairs", [])
    return [
        {
            "repair": r.get("repair", ""),
            "cost": r.get("cost", 0),
            "description": r.get("description", ""),
        }
        for r in repairs
    ]


def extract_renovation_score(data: dict) -> dict | None:
    """Extract renovation score from Bricked response."""
    prop = data.get("property", {})
    details = prop.get("details", {})
    score_data = details.get("renovationScore")
    if isinstance(score_data, dict) and score_data.get("hasScore"):
        return {
            "has_score": True,
            "score": score_data.get("score"),
            "confidence": score_data.get("confidence"),
        }
    return None
