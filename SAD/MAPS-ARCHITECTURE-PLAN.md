# Google Maps Architecture Plan — Parcel Platform

## Context

Parcel is a real estate deal analysis SaaS. Core flow: user pastes a US address → gets AI-powered investment analysis across 5 strategies. The platform has zero map/location visualizations today. The only Google integration (`usePlacesAutocomplete.ts`) is broken in production because the API key is restricted to "Places API (New)" but the code uses the legacy `google.maps.places.Autocomplete`.

This plan is the foundation for all location and spatial features in Parcel.

---

## 1. Feature Set — Ranked by ROI

### Tier 1 — Ship Now (unblocks production + immediate value)

**A. Fix Address Autocomplete** — CRITICAL, production is broken
- Rewrite `usePlacesAutocomplete.ts` for Places API (New) using `PlaceAutocompleteElement`
- Extract lat/lng + place_id from autocomplete result (currently only extracts `formatted_address`)
- Send coordinates to backend with the address — free, included in autocomplete session

**B. Property Location Map on Analysis Results + Property Detail**
- Static satellite map centered on the property. Single pin.
- Replaces the "Map view not available" placeholder on `PropertyDetailPage.tsx:397-405`
- Investors need to evaluate neighborhood quality at a glance before driving to a property

**C. Geocode and Persist Coordinates (backend foundation)**
- Add `latitude`, `longitude`, `place_id` columns to Property model
- Persist coordinates during analysis enrichment flow
- This unblocks every Tier 2/3 feature

### Tier 2 — Next Sprint (competitive parity)

**D. Interactive Property Map + Comps Overlay**
- Subject property + Bricked.ai comparable sales as pins on one interactive map
- Distance from subject is a critical comp adjustment factor (FHA requires comps within 1 mile for urban)
- Geocode Bricked comps at enrichment time (backend, using Nominatim)

**E. Street View on Property Detail**
- Real estate investors evaluate curb appeal remotely via Street View
- This is a top-3 feature request in every real estate SaaS and the single biggest reason we must use Google Maps (not Mapbox — no Street View equivalent)
- Falls back gracefully for rural areas / new construction where Street View isn't available

### Tier 3 — Differentiators

**F. Pipeline Map View**
- Toggle between kanban and map on Pipeline page — all deals as colored pins
- Filterable by strategy, status, ROI
- Helps wholesalers spot geographic concentration risk and find package deal opportunities

**G. Portfolio Heat Map**
- Portfolio properties colored by cash flow performance (green/amber/red)
- No competitor (DealMachine, PropStream, Privy) does portfolio-level geographic analysis

### Cut — explicitly removed

| Feature | Why cut |
|---------|---------|
| **Driving for Dollars (GPS tracking)** | DealMachine's core product ($99-249/mo). Massive mobile investment, not Parcel's strength. |
| **Draw-to-Search polygon** | Requires a nationwide property database. Parcel enriches individual addresses on demand. |
| **Map-Based Property Search** | Same — needs a property database or is just Pipeline Map View. |
| **Neighborhood overlays (schools, transit, crime)** | Data licensing is expensive and complex. Low ROI vs analysis depth. Defer to Tier 3+. |
| **Heatmap Layer** | Google deprecated May 2025, decommissioned May 2026. Do not build on it. |
| **Territory management / bird-dogging** | Premature for current stage. Niche. |

---

## 2. Technical Architecture

### Library: `@vis.gl/react-google-maps` v1.8.x

Google-sponsored (vis.gl/OpenJS Foundation). 12KB gzipped, tree-shakeable, TypeScript-native. Provides `APIProvider`, `Map`, `AdvancedMarker`, `InfoWindow`, `useMap()`, `useMapsLibrary()`. Handles script loading with deduplication protection. Clear winner over alternatives:

| Library | Verdict | Why |
|---------|---------|-----|
| `@vis.gl/react-google-maps` | **USE THIS** | Google-sponsored, modern, lightweight, active (last commit Mar 2026) |
| `@react-google-maps/api` | Avoid | Still wraps deprecated `Marker` + legacy Autocomplete. v3+ requires commercial license. |
| `@googlemaps/react-wrapper` | Avoid | Deprecated path — Google now points to vis.gl. No components, just script loader. |
| Raw SDK + hooks | Unnecessary | vis.gl provides everything with less boilerplate |

### Why Google Maps (not Mapbox)

- **Street View** — non-negotiable for real estate. Mapbox has no equivalent.
- **Satellite imagery** — Google's is best-in-class for property evaluation.
- **Address autocomplete** — we already have the key, Places API (New) is cheap ($2.83/1K).
- **Cost at Parcel's scale** — ~$155/month at 1,000 users. Negligible vs SaaS revenue at $49-299/seat.

### Module/File Structure

```
frontend/src/
  components/
    maps/
      MapsProvider.tsx            — Lazy APIProvider wrapper (loads SDK only when needed)
      PlaceAutocompleteInput.tsx  — Places API (New) web component wrapper
      PropertyMap.tsx             — Static/interactive map for a single property
      CompsMap.tsx                — Subject + comp markers with price labels
      StreetViewCard.tsx          — Street View panorama with availability check
      PipelineMapView.tsx         — All pipeline deals on a map (Tier 3)
      PortfolioMap.tsx            — Performance-colored property markers (Tier 3)
  hooks/
    usePlacesAutocomplete.ts      — REWRITTEN for PlaceAutocompleteElement
  lib/
    maps-config.ts                — Map ID, default center/zoom, style config
  types/
    maps.ts                       — GeoPoint, MapMarker, CompMarker interfaces
```

### Script Loading Strategy

`APIProvider` goes inside a lazy-loaded `MapsProvider` — **NOT at the app root**. The Maps SDK is ~200KB. Non-map pages (Dashboard, Settings, Pipeline kanban) never load it.

```tsx
// MapsProvider.tsx — lazy-loaded by consuming pages
import { APIProvider } from '@vis.gl/react-google-maps'

const API_KEY = import.meta.env.VITE_GOOGLE_PLACES_API_KEY
export function MapsProvider({ children }: { children: ReactNode }) {
  if (!API_KEY) return <>{children}</>
  return <APIProvider apiKey={API_KEY}>{children}</APIProvider>
}
```

Pages that need maps:
```tsx
const MapsProvider = lazy(() => import('@/components/maps/MapsProvider'))

<Suspense fallback={<MapSkeleton />}>
  <MapsProvider>
    <PropertyMap lat={...} lng={...} />
  </MapsProvider>
</Suspense>
```

For **AnalyzePage** (autocomplete only, no rendered map): `APIProvider` loads only `libraries=places` (~40KB), not the full rendering engine (~200KB).

Add to `index.html` `<head>`:
```html
<link rel="preconnect" href="https://maps.googleapis.com" />
<link rel="preconnect" href="https://maps.gstatic.com" crossorigin />
```

---

## 3. Backend Changes

### A. Add geo columns to Property model

`backend/models/properties.py`:
```python
latitude = Column(Numeric(10, 7), nullable=True)   # 7 decimal = ~1cm precision
longitude = Column(Numeric(10, 7), nullable=True)
place_id = Column(String, nullable=True)             # Google Place ID for dedup
```

New Alembic migration. Backfill existing properties via a separate script (not in the migration).

### B. Geocoding Strategy

| Source | When | Method | Cost |
|--------|------|--------|------|
| Client-side (autocomplete) | User selects from dropdown | `place.location` from PlaceAutocompleteElement | Free (included in session) |
| Server-side fallback | User types without selecting | Nominatim (existing `geocode()` in `address_parser.py`) | Free |
| Bricked comps | During SSE enrichment | Nominatim batch (1 req/sec, ~5 comps = 5s) | Free |
| Future upgrade | If Nominatim proves unreliable | Google Geocoding API via backend proxy | $5/1K |

**Primary path:** Client sends lat/lng from autocomplete selection with the address. Backend persists immediately. Zero geocoding cost.

**Fallback:** If no coordinates provided (manual address entry), `parse_and_geocode()` (already exists in `address_parser.py`) runs server-side during analysis.

### C. API Changes

1. **Modify** `PropertyDetailResponse` + `PropertyListItem` schemas — add `latitude`, `longitude`, `place_id`
2. **Modify** comps response (`GET /api/analysis/scenarios/{id}/comps`) — include lat/lng per comp after backend geocoding
3. **New** (Tier 3): `GET /api/properties/geo-bounds?sw_lat=&sw_lng=&ne_lat=&ne_lng=` — returns properties in bounding box for pipeline map

---

## 4. Migration Plan for usePlacesAutocomplete.ts

### Migration: Places API (New) with PlaceAutocompleteElement

Rewrite `usePlacesAutocomplete.ts` to use `PlaceAutocompleteElement`:

- `PlaceAutocompleteElement` is a **web component** (renders its own `<input>`)
- Cannot attach to an existing React `<input>` like legacy `Autocomplete`
- Uses `gmp-placeselect` event instead of `place_changed`
- Returns `Place` class with `formattedAddress`, `location`, `id`, `addressComponents`
- Requires field masking: request `['formattedAddress', 'location', 'addressComponents']`

**Data to extract (vs current):**

| Field | Current (legacy) | New |
|-------|-----------------|-----|
| Formatted address | `place.formatted_address` | `place.formattedAddress` |
| Latitude | NOT EXTRACTED | `place.location.lat()` |
| Longitude | NOT EXTRACTED | `place.location.lng()` |
| Place ID | NOT EXTRACTED | `place.id` |

**Styling challenge:** `PlaceAutocompleteElement` has internal shadow DOM. Use `::part(input)` CSS and `color-scheme: dark` to match Parcel's dark theme. The dropdown (`.pac-container`) may need additional CSS overrides.

**Important:** Remove the custom script-loading logic (lines 15-42 of current hook). `APIProvider` handles script loading. Double-loading causes initialization errors.

---

## 5. Phased Implementation

### Phase 1: Foundation + Hotfix — Size: M

**Features:** Fix autocomplete, install library, create maps foundation, add geo columns

**Files to create:**
- `frontend/src/components/maps/MapsProvider.tsx`
- `frontend/src/components/maps/PlaceAutocompleteInput.tsx`
- `frontend/src/lib/maps-config.ts`
- `frontend/src/types/maps.ts`
- `backend/alembic/versions/..._add_geocoding_columns.py`

**Files to modify:**
- `frontend/package.json` — add `@vis.gl/react-google-maps`
- `frontend/src/hooks/usePlacesAutocomplete.ts` — rewrite for Places API (New)
- `frontend/src/pages/analyze/AnalyzePage.tsx` — use new autocomplete, send lat/lng
- `frontend/index.html` — preconnect hints
- `backend/models/properties.py` — add lat/lng/place_id columns
- `backend/routers/properties.py` — add lat/lng to response schemas
- `backend/routers/analysis.py` — accept lat/lng from frontend, persist coordinates
- `backend/core/property_data/service.py` — persist lat/lng during enrichment
- `frontend/src/types/index.ts` — add lat/lng to PropertyDetail type

**Dependencies:** None.

### Phase 2: Property Maps + Street View — Size: M

**Features:** Interactive map on property detail, Street View card, replace placeholder

**Files to create:**
- `frontend/src/components/maps/PropertyMap.tsx`
- `frontend/src/components/maps/StreetViewCard.tsx`

**Files to modify:**
- `frontend/src/pages/properties/PropertyDetailPage.tsx` — replace "Map view not available"
- `frontend/src/pages/analyze/AnalysisResultsPage.tsx` — add map above or alongside metrics

**Dependencies:** Phase 1 (lat/lng columns, MapsProvider).

### Phase 3: Comps Map — Size: S

**Features:** Subject + comp pins on interactive map, price labels, distance indicators

**Files to create:**
- `frontend/src/components/maps/CompsMap.tsx`

**Files to modify:**
- `backend/core/property_data/service.py` — geocode Bricked comps at enrichment
- `backend/routers/analysis.py` — include lat/lng in comps response
- `frontend/src/pages/analyze/AnalysisResultsPage.tsx` — add CompsMap

**Dependencies:** Phase 1 + Phase 2 (PropertyMap pattern reused).

### Phase 4: Pipeline Map View — Size: L

**Features:** Map/kanban toggle, colored pins by strategy/status, mobile bottom drawer

**Files to create:**
- `frontend/src/components/pipeline/PipelineMapView.tsx`

**Files to modify:**
- `frontend/src/pages/Pipeline.tsx` — add map toggle
- `backend/routers/properties.py` — add geo-bounds endpoint + spatial index

**Dependencies:** Phase 1 only. Can be done in parallel with Phase 2/3.

### Phase 5: Portfolio Map — Size: M

**Features:** Performance-colored markers (green/amber/red by cash flow)

**Dependencies:** Phase 1 + Phase 4 (reuses MapToggle pattern).

---

## 6. Cost Analysis

### Per-interaction costs

| Action | API | Free/mo | Paid rate | Typical calls |
|--------|-----|---------|-----------|---------------|
| Autocomplete | Places (New) | 10,000 | $2.83/1K | 1 per analysis |
| Map load | Dynamic Maps | 10,000 | $7.00/1K | 1 per property view |
| Street View | Dynamic SV | 5,000 | $14.00/1K | 1 per property view |
| Comp geocoding | Nominatim | Free | Free | ~5 per analysis |
| Pipeline map | Dynamic Maps | (shared) | $7.00/1K | 1 per pipeline visit |

### Projected monthly cost

| Users | Est. API calls/mo | Free tier covers | Overage cost |
|-------|-------------------|-----------------|--------------|
| 100 | ~15K | All | $0 |
| 500 | ~75K | ~35K | ~$200 |
| 1,000 | ~150K | ~35K | ~$575 |

### Cost minimization

1. **Session-based autocomplete** — PlaceAutocompleteElement bundles keystrokes + place details into one $2.83 charge (vs $17 legacy)
2. **Persist coordinates** — never geocode the same property twice
3. **Nominatim for comps** — free geocoding for Bricked comps (1 req/sec is fine for 5 comps)
4. **Lazy-load maps** — SDK never loads on Dashboard, Settings, etc.
5. **Static maps for Tier 1** — $2/1K vs $7/1K dynamic. Upgrade to interactive in Phase 2.

---

## 7. API Key Security

### Key restrictions (Google Cloud Console)

**HTTP referrer restrictions:**
- `https://parceldesk.io/*`
- `https://www.parceldesk.io/*`
- `https://*.vercel.app/*` (preview deploys)
- `http://localhost:5173/*` (local dev)

**API restrictions:** Places API (New), Maps JavaScript API, Street View Static API

### Backend geocoding key (separate)

For server-initiated geocoding (backfills, Bricked comps):
- Stored as `GOOGLE_GEOCODING_API_KEY` (no `VITE_` prefix)
- Restricted by IP address (Railway egress IPs)
- Restricted to Geocoding API only

---

## 8. Risks & Gotchas

| Risk | Mitigation |
|------|-----------|
| **200KB SDK bundle** | Lazy-load via MapsProvider. Non-map pages never load it. Preconnect hints save 100-200ms. |
| **Mobile jank with 10+ markers** | Limit markers to 20 on mobile. Use `gestureHandling: 'cooperative'`. Hide map controls. |
| **PlaceAutocompleteElement styling** | Shadow DOM limits CSS control. Use `::part(input)` + `color-scheme: dark`. Dropdown may need `.pac-container` overrides. |
| **Nominatim rate limit (1 req/sec)** | Acceptable for 5 comps. Queue concurrent requests. Switch to Google Geocoding if unreliable. |
| **google.maps.Marker deprecated** | Use `AdvancedMarkerElement` exclusively. Requires Map ID (free) in Cloud Console. |
| **Heatmap Layer decommissioned May 2026** | Do not use. Build custom heat visualization if needed later. |
| **Google outage / key exhaustion** | All map components fall back gracefully (plain text, existing CompsCard, "Map view not available"). Maps never block any workflow. |
| **Duplicate script loading** | Remove old script-loading logic from `usePlacesAutocomplete.ts`. `APIProvider` handles it. |

---

## 9. What to Do RIGHT NOW

Execute Phase 1 — migrate `usePlacesAutocomplete.ts` to Places API (New) with `@vis.gl/react-google-maps`, install the library, create `MapsProvider`, add geo columns. No legacy API hotfix — go straight to the proper solution.
