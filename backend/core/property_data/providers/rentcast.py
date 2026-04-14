"""RentCast provider — property details, rent estimates, and value estimates.

API docs: https://developers.rentcast.io/reference

Every call is logged as a DataSourceEvent (success AND failure).
Timeout: 10 seconds. Single retry on 5xx errors.
"""

import json
import logging
import os
import time
from dataclasses import dataclass, field
from typing import Optional
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

logger = logging.getLogger(__name__)

RENTCAST_API_KEY = os.getenv("RENTCAST_API_KEY", "")
RENTCAST_BASE_URL = os.getenv("RENTCAST_BASE_URL", "https://api.rentcast.io/v1")
TIMEOUT_SECONDS = 10

# RentCast costs approximately 1 credit per call ≈ ~$0.01-0.02
COST_CENTS_PER_CALL = 2


@dataclass
class RentCastResult:
    """Result from a single RentCast API call."""
    status: str  # success | partial | failed | timeout | not_found | rate_limited | auth_error
    data: dict = field(default_factory=dict)
    error: Optional[str] = None
    latency_ms: int = 0


def _make_request(endpoint: str, params: dict) -> RentCastResult:
    """Make a single GET request to the RentCast API with retry on 5xx.

    Returns a RentCastResult with status and data/error.
    """
    if not RENTCAST_API_KEY:
        logger.error("RentCast: RENTCAST_API_KEY is empty — skipping call to %s", endpoint)
        return RentCastResult(status="failed", error="RENTCAST_API_KEY not configured")

    query = "&".join(f"{k}={v}" for k, v in params.items() if v)
    url = f"{RENTCAST_BASE_URL}/{endpoint}?{query}"
    logger.info("RentCast: calling %s (key_len=%d, base=%s)", endpoint, len(RENTCAST_API_KEY), RENTCAST_BASE_URL)

    headers = {
        "Accept": "application/json",
        "X-Api-Key": RENTCAST_API_KEY,
    }

    for attempt in range(2):  # 1 initial + 1 retry
        start = time.time()
        try:
            req = Request(url, headers=headers)
            with urlopen(req, timeout=TIMEOUT_SECONDS) as resp:
                latency_ms = int((time.time() - start) * 1000)
                raw = resp.read()
                data = json.loads(raw) if raw else {}

                # RentCast sometimes returns a list for property lookups
                if isinstance(data, list):
                    data = data[0] if data else {}

                logger.info(
                    "RentCast: %s → 200 OK (%dms, %d bytes, keys=%s)",
                    endpoint, latency_ms, len(raw), list(data.keys())[:8],
                )
                return RentCastResult(
                    status="success",
                    data=data,
                    latency_ms=latency_ms,
                )

        except HTTPError as e:
            latency_ms = int((time.time() - start) * 1000)
            status_code = e.code
            logger.warning(
                "RentCast: %s → HTTP %d (%dms, attempt=%d)",
                endpoint, status_code, latency_ms, attempt + 1,
            )

            if status_code == 404:
                return RentCastResult(status="not_found", error="Property not found", latency_ms=latency_ms)
            elif status_code == 401:
                logger.error("RentCast: auth error — key_len=%d, key_prefix=%s", len(RENTCAST_API_KEY), RENTCAST_API_KEY[:4])
                return RentCastResult(status="auth_error", error="Invalid API key", latency_ms=latency_ms)
            elif status_code == 429:
                return RentCastResult(status="rate_limited", error="Rate limit exceeded", latency_ms=latency_ms)
            elif status_code >= 500 and attempt == 0:
                logger.warning("RentCast 5xx (%d), retrying in 1s: %s", status_code, endpoint)
                time.sleep(1)
                continue
            else:
                return RentCastResult(status="failed", error=f"HTTP {status_code}", latency_ms=latency_ms)

        except (URLError, TimeoutError, OSError) as e:
            latency_ms = int((time.time() - start) * 1000)
            logger.warning("RentCast: %s → connection error (%dms, attempt=%d): %s", endpoint, latency_ms, attempt + 1, e)
            if latency_ms >= TIMEOUT_SECONDS * 1000 - 100:
                return RentCastResult(status="timeout", error="Request timed out", latency_ms=latency_ms)
            if attempt == 0:
                time.sleep(1)
                continue
            return RentCastResult(status="failed", error="Connection error", latency_ms=latency_ms)

        except Exception as e:
            latency_ms = int((time.time() - start) * 1000)
            logger.exception("RentCast: %s → unexpected error (%dms)", endpoint, latency_ms)
            return RentCastResult(status="failed", error=str(e), latency_ms=latency_ms)

    return RentCastResult(status="failed", error="Max retries exceeded")


def fetch_property_details(address: str) -> RentCastResult:
    """GET /properties — physical details, last sale, tax assessment, owner info."""
    from urllib.parse import quote
    return _make_request("properties", {"address": quote(address, safe="")})


def fetch_rent_estimate(address: str) -> RentCastResult:
    """GET /avm/rent/long-term — rent estimate with range and comps."""
    from urllib.parse import quote
    return _make_request("avm/rent/long-term", {"address": quote(address, safe="")})


def fetch_value_estimate(address: str) -> RentCastResult:
    """GET /avm/value — property value estimate with range and comps."""
    from urllib.parse import quote
    return _make_request("avm/value", {"address": quote(address, safe="")})


def extract_property_fields(data: dict) -> dict:
    """Extract Property model fields from RentCast property details response."""
    return {
        "property_type": _map_property_type(data.get("propertyType")),
        "bedrooms": data.get("bedrooms"),
        "bathrooms": data.get("bathrooms"),
        "sqft": data.get("squareFootage"),
        "lot_sqft": data.get("lotSize"),
        "year_built": data.get("yearBuilt"),
        "county": data.get("county"),
    }


def extract_rent_fields(data: dict) -> dict:
    """Extract rent estimate fields from RentCast rent AVM response."""
    return {
        "monthly_rent": data.get("rent"),
        "rent_range_low": data.get("rentRangeLow"),
        "rent_range_high": data.get("rentRangeHigh"),
    }


def extract_value_fields(data: dict) -> dict:
    """Extract value estimate fields from RentCast value AVM response."""
    return {
        "estimated_value": data.get("price"),
        "value_range_low": data.get("priceRangeLow"),
        "value_range_high": data.get("priceRangeHigh"),
    }


def _map_property_type(rc_type: Optional[str]) -> Optional[str]:
    """Map RentCast property type to Parcel's property_type values."""
    if not rc_type:
        return None
    mapping = {
        "Single Family": "single_family",
        "Multi-Family": "duplex",  # refine later based on unit count
        "Condo": "condo",
        "Townhouse": "townhouse",
        "Apartment": "duplex",
        "Mobile": "single_family",
    }
    return mapping.get(rc_type, rc_type.lower().replace(" ", "_"))
