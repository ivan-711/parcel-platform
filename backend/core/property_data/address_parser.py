"""Address parser — normalize freeform address strings and geocode via Nominatim."""

import logging
import os
import re
import time
from dataclasses import dataclass, field
from typing import Optional
from urllib.parse import quote_plus, urlencode
from urllib.request import Request, urlopen
import json

logger = logging.getLogger(__name__)

# Rate limit: Nominatim requires max 1 req/sec
_last_nominatim_call = 0.0

NOMINATIM_USER_AGENT = os.getenv("NOMINATIM_USER_AGENT", "parcel-platform/1.0")

# Common abbreviation map for street name normalization
_ABBREVIATIONS = {
    "street": "St", "st": "St", "st.": "St",
    "avenue": "Ave", "ave": "Ave", "ave.": "Ave",
    "boulevard": "Blvd", "blvd": "Blvd", "blvd.": "Blvd",
    "drive": "Dr", "dr": "Dr", "dr.": "Dr",
    "lane": "Ln", "ln": "Ln", "ln.": "Ln",
    "road": "Rd", "rd": "Rd", "rd.": "Rd",
    "court": "Ct", "ct": "Ct", "ct.": "Ct",
    "place": "Pl", "pl": "Pl", "pl.": "Pl",
    "circle": "Cir", "cir": "Cir", "cir.": "Cir",
    "terrace": "Ter", "ter": "Ter", "ter.": "Ter",
    "north": "N", "n": "N", "n.": "N",
    "south": "S", "s": "S", "s.": "S",
    "east": "E", "e": "E", "e.": "E",
    "west": "W", "w": "W", "w.": "W",
    "northeast": "NE", "ne": "NE",
    "northwest": "NW", "nw": "NW",
    "southeast": "SE", "se": "SE",
    "southwest": "SW", "sw": "SW",
}

# US state name → 2-letter code
_STATE_CODES = {
    "alabama": "AL", "alaska": "AK", "arizona": "AZ", "arkansas": "AR",
    "california": "CA", "colorado": "CO", "connecticut": "CT", "delaware": "DE",
    "florida": "FL", "georgia": "GA", "hawaii": "HI", "idaho": "ID",
    "illinois": "IL", "indiana": "IN", "iowa": "IA", "kansas": "KS",
    "kentucky": "KY", "louisiana": "LA", "maine": "ME", "maryland": "MD",
    "massachusetts": "MA", "michigan": "MI", "minnesota": "MN", "mississippi": "MS",
    "missouri": "MO", "montana": "MT", "nebraska": "NE", "nevada": "NV",
    "new hampshire": "NH", "new jersey": "NJ", "new mexico": "NM", "new york": "NY",
    "north carolina": "NC", "north dakota": "ND", "ohio": "OH", "oklahoma": "OK",
    "oregon": "OR", "pennsylvania": "PA", "rhode island": "RI", "south carolina": "SC",
    "south dakota": "SD", "tennessee": "TN", "texas": "TX", "utah": "UT",
    "vermont": "VT", "virginia": "VA", "washington": "WA", "west virginia": "WV",
    "wisconsin": "WI", "wyoming": "WY", "district of columbia": "DC",
}

# Reverse lookup for validation
_VALID_STATE_CODES = set(_STATE_CODES.values())


@dataclass
class ParsedAddress:
    """Result of parsing a freeform address string."""
    address_line1: str = ""
    address_line2: Optional[str] = None
    city: str = ""
    state: str = ""
    zip_code: str = ""
    county: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    raw_input: str = ""
    parse_confidence: str = "low"  # high | medium | low


def _normalize_word(word: str) -> str:
    """Normalize a single word using the abbreviation map."""
    return _ABBREVIATIONS.get(word.lower().rstrip("."), word)


def _normalize_street(line: str) -> str:
    """Normalize street abbreviations and directionals."""
    words = line.split()
    return " ".join(_normalize_word(w) for w in words)


def _resolve_state(token: str) -> str:
    """Resolve a state name or abbreviation to a 2-letter code."""
    upper = token.upper().strip()
    if upper in _VALID_STATE_CODES:
        return upper
    return _STATE_CODES.get(token.lower().strip(), upper[:2])


def parse_address(raw: str) -> ParsedAddress:
    """Parse a freeform address string into structured components.

    Handles formats like:
    - "613 N 14th St, Sheboygan, WI 53081"
    - "613 North 14th Street, Sheboygan WI 53081"
    - "613 N. 14th St."

    If parsing fails, returns the raw string as address_line1.
    """
    raw = raw.strip()
    if not raw:
        return ParsedAddress(address_line1="", raw_input=raw)

    result = ParsedAddress(raw_input=raw)

    # Strip trailing country name (Google Places appends ", USA" or ", United States")
    cleaned = re.sub(r',\s*(?:USA|United States)\s*$', '', raw, flags=re.IGNORECASE)

    # Extract zip code (5 or 5+4 digit pattern at or near the end)
    zip_match = re.search(r'\b(\d{5}(?:-\d{4})?)\s*$', cleaned)
    if zip_match:
        result.zip_code = zip_match.group(1)
        raw_no_zip = cleaned[:zip_match.start()].strip().rstrip(",").strip()
    else:
        raw_no_zip = cleaned

    # Split by commas
    parts = [p.strip() for p in raw_no_zip.split(",") if p.strip()]

    if len(parts) >= 3:
        # "613 N 14th St, Sheboygan, WI" or "613 N 14th St, Sheboygan, WI 53081"
        result.address_line1 = _normalize_street(parts[0])
        result.city = parts[1].strip()
        # State part may contain a zip that was already extracted: "WI 53081" → "WI"
        state_part = parts[2].strip()
        state_tokens = state_part.split()
        result.state = _resolve_state(state_tokens[0])
        # If zip wasn't found earlier but is embedded in state part, grab it
        if not result.zip_code and len(state_tokens) > 1:
            maybe_zip = state_tokens[-1]
            if re.fullmatch(r'\d{5}(?:-\d{4})?', maybe_zip):
                result.zip_code = maybe_zip
        result.parse_confidence = "high"

    elif len(parts) == 2:
        # "613 N 14th St, Sheboygan WI" or "613 N 14th St, Sheboygan"
        result.address_line1 = _normalize_street(parts[0])
        city_state = parts[1].strip()

        # Try to split "Sheboygan WI" or "Sheboygan Falls WI"
        tokens = city_state.rsplit(None, 1)
        if len(tokens) == 2 and (tokens[1].upper() in _VALID_STATE_CODES or tokens[1].lower() in _STATE_CODES):
            result.city = tokens[0]
            result.state = _resolve_state(tokens[1])
            result.parse_confidence = "high"
        else:
            result.city = city_state
            result.parse_confidence = "medium"

    elif len(parts) == 1:
        # Single string — try to split on last known state pattern
        result.address_line1 = _normalize_street(parts[0])
        result.parse_confidence = "low"
    else:
        result.address_line1 = raw
        result.parse_confidence = "low"

    return result


def geocode(address: str) -> tuple[Optional[float], Optional[float]]:
    """Geocode an address via Nominatim (OpenStreetMap). Returns (lat, lng) or (None, None).

    Respects Nominatim's 1 request/second rate limit.
    """
    global _last_nominatim_call

    # Rate limit enforcement
    elapsed = time.time() - _last_nominatim_call
    if elapsed < 1.0:
        time.sleep(1.0 - elapsed)

    try:
        params = urlencode({
            "q": address,
            "format": "json",
            "limit": 1,
            "countrycodes": "us",
        })
        url = f"https://nominatim.openstreetmap.org/search?{params}"
        req = Request(url, headers={"User-Agent": NOMINATIM_USER_AGENT})

        _last_nominatim_call = time.time()
        with urlopen(req, timeout=5) as resp:
            data = json.loads(resp.read())

        if data and len(data) > 0:
            lat = float(data[0]["lat"])
            lng = float(data[0]["lon"])
            logger.debug("Geocoded '%s' → (%s, %s)", address, lat, lng)
            return lat, lng

        logger.debug("Geocode returned no results for '%s'", address)
        return None, None

    except Exception:
        logger.warning("Geocode failed for '%s'", address, exc_info=True)
        return None, None


def parse_and_geocode(raw: str) -> ParsedAddress:
    """Parse an address and attempt geocoding. Non-blocking on geocode failure."""
    parsed = parse_address(raw)

    # Only geocode if we have enough info
    if parsed.address_line1 and (parsed.city or parsed.zip_code):
        geocode_query = raw  # use the original for best geocoding results
        lat, lng = geocode(geocode_query)
        parsed.latitude = lat
        parsed.longitude = lng

    return parsed
