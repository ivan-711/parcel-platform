# Match Scoring + Buyer Packets — Design Spec

## Overview

Build a 4-dimension match scoring engine, disposition endpoints for property→buyer and buyer→property matching, buyer packet generation with public share links, and a send-to-buyers flow. Replaces Sprint 1's simple property matching with scored results.

## Design System

Same as all prior sprints — no new tokens.

## Architecture Decisions

- **Match engine is pure logic**: `match_engine.py` is a stateless module. Takes dicts, returns scores. No DB access — the router handles queries and feeds data in.
- **BuyerPacketSend tracks delivery**: Separate from Communication records. A lightweight join table (packet_id, contact_id, sent_at, opened_at) gives disposition analytics without parsing Communication bodies.
- **Shared packet follows Report pattern**: Same `secrets.token_urlsafe(16)` token, same public endpoint pattern (no auth, view counting, bot filtering), same lazy-loaded frontend page.
- **Dispositions router is new**: `/api/dispositions` prefix. Does not extend buyers router — dispositions are a cross-cutting concern (property→buyers and buyer→properties).
- **Sprint 1 simple matching replaced**: `GET /api/buyers/:contactId/matches` still works but BuyerDetailPage switches to the scored endpoint.

---

## 1. Backend: Match Scoring Engine

Create: `backend/core/dispositions/__init__.py` (empty)
Create: `backend/core/dispositions/match_engine.py`

### Function Signature

```python
def score_property_against_buy_box(
    property_data: dict,
    scenario_data: dict | None,
    buy_box_data: dict,
) -> dict:
    """
    Score how well a property matches a buy box.
    
    Args:
        property_data: {city, state, zip_code, property_type, bedrooms, bathrooms, sqft, year_built}
        scenario_data: {purchase_price, after_repair_value, repair_cost, strategy, outputs: {monthly_cash_flow, cap_rate, ...}} or None
        buy_box_data: all BuyBox fields as dict
    
    Returns:
        {
            total_score: int (0-100),
            breakdown: {location: int, financial: int, property: int, strategy: int},
            match_level: "strong" | "moderate" | "weak" | "no_match",
            reasons: list[str]  — human-readable explanations
        }
    """
```

### Scoring Dimensions

**LOCATION (25 points)**:
- Property city, state, or zip_code matches any entry in `target_markets` (case-insensitive substring) → 25 points
- Property in same state as any target_market entry but different city → 10 points
- No target_markets specified → 25 points (no restriction)
- No match → 0 points
- Reasons: "Located in Milwaukee, WI (target market)" or "Same state (WI) but different city"

**FINANCIAL (25 points)**:
- `purchase_price` between `min_price` and `max_price` → 10 points
- `after_repair_value` between `min_arv` and `max_arv` → 5 points
- `monthly_cash_flow` (from scenario outputs) >= `min_cash_flow` → 5 points
- `cap_rate` (from scenario outputs) >= `min_cap_rate` → 3 points
- `repair_cost` <= `max_repair_cost` → 2 points
- Each unspecified buy box criterion → full points for that sub-dimension
- Each unmet criterion → 0 points for that sub-dimension + reason like "Price $200K exceeds max $150K"

**PROPERTY (25 points)**:
- `property_type` in `property_types` list → 10 points
- `bedrooms` >= `min_bedrooms` → 5 points
- `bathrooms` >= `min_bathrooms` → 3 points
- `sqft` >= `min_sqft` → 4 points
- `year_built` within `min_year_built` to `max_year_built` → 3 points
- Each unspecified criterion → full points
- Null property value vs. specified criterion → 0 points + reason

**STRATEGY (25 points)**:
- Scenario `strategy` in buy_box `strategies` list → 25 points
- `strategies` is null or empty → 25 points (buyer accepts any)
- No scenario → 0 points + reason "No analysis scenario"
- No match → 0 points + reason "Strategy 'flip' not in buyer's criteria"

### Match Levels

- 80-100: `"strong"`
- 60-79: `"moderate"`
- 40-59: `"weak"`
- 0-39: `"no_match"`

---

## 2. Backend: BuyerPacket + BuyerPacketSend Models

Create: `backend/models/buyer_packets.py`

```
buyer_packets table:
    id              UUID PK (TimestampMixin)
    property_id     UUID FK → properties.id, NOT NULL, indexed
    scenario_id     UUID FK → analysis_scenarios.id, NOT NULL
    created_by      UUID FK → users.id, NOT NULL, indexed
    team_id         UUID, nullable

    title           String, NOT NULL
    share_token     String, NOT NULL, unique, indexed

    packet_data     JSONB, NOT NULL  — frozen snapshot of property + scenario + outputs

    asking_price    Numeric(14, 2), nullable
    assignment_fee  Numeric(14, 2), nullable

    is_public       Boolean, default True
    view_count      Integer, default 0
    last_viewed_at  DateTime, nullable

    notes_to_buyer  Text, nullable  — personal message from seller

    deleted_at      DateTime, nullable

buyer_packet_sends table:
    id              UUID PK (TimestampMixin)
    packet_id       UUID FK → buyer_packets.id, NOT NULL, indexed
    contact_id      UUID FK → contacts.id, NOT NULL, indexed
    communication_id UUID FK → communications.id, nullable
    sent_at         DateTime, NOT NULL
    opened_at       DateTime, nullable  — set when buyer views packet via share link
```

Relationships:
- `BuyerPacket.sends` → one-to-many to BuyerPacketSend
- `BuyerPacket.property` → relationship
- `BuyerPacket.scenario` → relationship
- `BuyerPacketSend.packet` → back_populates
- `BuyerPacketSend.contact` → relationship

Register both models in `backend/models/__init__.py`.

Migration creates both tables with indexes on `property_id`, `created_by`, `share_token`, `packet_id`, `contact_id`.

---

## 3. Backend: Buyer Packet Schemas

Create: `backend/schemas/dispositions.py`

```
MatchBreakdown:
    location: int
    financial: int
    property: int
    strategy: int

PropertyMatchResult:
    contact_id: UUID
    buyer_name: str
    company: str | None
    buy_box_id: UUID
    buy_box_name: str
    score: int
    match_level: str
    breakdown: MatchBreakdown
    reasons: list[str]
    funding_type: str | None
    has_pof: bool
    can_close_days: int | None

PropertyMatchResponse:
    property: {id, address, city, state, zip_code, strategy, purchase_price}
    matches: list[PropertyMatchResult]

BuyerMatchResult:
    property_id: UUID
    address: str
    city: str
    state: str
    zip_code: str
    strategy: str | None
    purchase_price: float | None
    buy_box_name: str
    score: int
    match_level: str
    breakdown: MatchBreakdown

BuyerMatchResponse:
    buyer: {id, name, company}
    matches: list[BuyerMatchResult]

MatchPreviewRequest:
    property_id: UUID
    buy_box_id: UUID

MatchPreviewResponse:
    score: int
    match_level: str
    breakdown: MatchBreakdown
    reasons: list[str]

CreatePacketRequest:
    property_id: UUID
    scenario_id: UUID
    title: str | None  — auto-generated if not provided
    asking_price: float | None
    assignment_fee: float | None
    notes_to_buyer: str | None

PacketResponse:
    id: UUID
    property_id: UUID
    scenario_id: UUID
    title: str
    share_token: str
    share_url: str  — computed: {FRONTEND_URL}/packets/view/{share_token}
    asking_price: float | None
    assignment_fee: float | None
    notes_to_buyer: str | None
    is_public: bool
    view_count: int
    last_viewed_at: str | None
    send_count: int  — count of sends
    created_at: str
    updated_at: str

PacketListItem:
    id: UUID
    title: str
    share_url: str
    property_address: str
    asking_price: float | None
    view_count: int
    send_count: int
    created_at: str

SharedPacketResponse:
    title: str
    packet_data: dict  — frozen snapshot
    asking_price: float | None
    assignment_fee: float | None
    notes_to_buyer: str | None
    created_at: str

SendPacketRequest:
    buyer_contact_ids: list[UUID]  — max 50
    message: str | None

SendPacketResponse:
    sent_count: int
    buyer_names: list[str]
```

---

## 4. Backend: Dispositions Router

Create: `backend/routers/dispositions.py`
Register in: `backend/main.py` at `/api/dispositions` prefix.

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/matches/property/{property_id}` | Buyers matching a property |
| GET | `/matches/buyer/{contact_id}` | Properties matching a buyer |
| POST | `/match-preview` | Single property × buy box score |
| POST | `/packets` | Create buyer packet |
| GET | `/packets` | List user's packets |
| GET | `/packets/share/{share_token}` | Public view (no auth) |
| POST | `/packets/{packet_id}/send` | Send to selected buyers |

### GET /matches/property/{property_id}

Query params: `?min_score=40`, `?funding_type=cash`, `?has_pof=true`

Logic:
1. Validate property ownership (created_by = current_user.id, not deleted)
2. Get primary scenario for property (most recent, not deleted)
3. Get all buyer contacts for user (contact_type = "buyer", not deleted)
4. For each buyer, get active buy boxes (is_active=True, deleted_at is null)
5. For each buy box, call `score_property_against_buy_box()`
6. Keep highest score per buyer (if multiple buy boxes, best one wins)
7. Filter by min_score (default 40), funding_type, has_pof
8. Sort by score desc
9. Return PropertyMatchResponse

### GET /matches/buyer/{contact_id}

Logic:
1. Validate buyer contact ownership
2. Get all active buy boxes for this buyer
3. Get all user's properties (not deleted, not archived)
4. For each property, get primary scenario
5. Score each property against each buy box, keep best score per property
6. Filter by min_score (default 40)
7. Sort by score desc, limit 50
8. Return BuyerMatchResponse

### POST /match-preview

Logic:
1. Validate property_id ownership
2. Validate buy_box_id ownership
3. Get property + scenario + buy box
4. Call score function
5. Return MatchPreviewResponse

### POST /packets

Logic:
1. Validate property_id and scenario_id ownership
2. Freeze snapshot: property details, scenario inputs/outputs, AI narrative
3. Generate share_token via `secrets.token_urlsafe(16)`
4. Auto-generate title if not provided: "{address} — {strategy} Analysis"
5. Create BuyerPacket record
6. Return PacketResponse with share_url

### GET /packets

List user's packets with send counts. Ordered by created_at desc.

### GET /packets/share/{share_token}

Public — no auth dependency.
1. Find packet by share_token where is_public=True and deleted_at is null
2. Increment view_count, set last_viewed_at
3. Return SharedPacketResponse

View counting follows the same bot-filtering and dedup pattern as reports (skip bot user agents, skip owner via JWT cookie check). But simplified — no ReportView-style table, just increment the counter with basic dedup.

### POST /packets/{packet_id}/send

Logic:
1. Validate packet ownership
2. Validate all buyer_contact_ids are owned buyer contacts (max 50)
3. For each buyer:
   a. Create Communication record: channel="packet", direction="outbound", subject=packet.title, body=message, contact_id=buyer, property_id=packet.property_id, occurred_at=now
   b. Create BuyerPacketSend record: packet_id, contact_id, communication_id, sent_at=now
4. Return SendPacketResponse with count and names

---

## 5. Frontend: Types + API + Hooks

### Types (add to `types/index.ts`)

```typescript
interface MatchBreakdown {
  location: number
  financial: number
  property: number
  strategy: number
}

interface PropertyMatchResult {
  contact_id: string
  buyer_name: string
  company: string | null
  buy_box_id: string
  buy_box_name: string
  score: number
  match_level: 'strong' | 'moderate' | 'weak' | 'no_match'
  breakdown: MatchBreakdown
  reasons: string[]
  funding_type: string | null
  has_pof: boolean
  can_close_days: number | null
}

interface PropertyMatchResponse {
  property: {
    id: string
    address: string
    city: string
    state: string
    zip_code: string
    strategy: string | null
    purchase_price: number | null
  }
  matches: PropertyMatchResult[]
}

interface BuyerMatchResult {
  property_id: string
  address: string
  city: string
  state: string
  zip_code: string
  strategy: string | null
  purchase_price: number | null
  buy_box_name: string
  score: number
  match_level: 'strong' | 'moderate' | 'weak' | 'no_match'
  breakdown: MatchBreakdown
}

interface BuyerMatchResponse {
  buyer: { id: string; name: string; company: string | null }
  matches: BuyerMatchResult[]
}

interface CreatePacketRequest {
  property_id: string
  scenario_id: string
  title?: string
  asking_price?: number
  assignment_fee?: number
  notes_to_buyer?: string
}

interface PacketListItem {
  id: string
  title: string
  share_url: string
  property_address: string
  asking_price: number | null
  view_count: number
  send_count: number
  created_at: string
}

interface SharedPacketData {
  title: string
  packet_data: {
    property: {
      address: string
      city: string
      state: string
      zip_code: string
      property_type: string | null
      bedrooms: number | null
      bathrooms: number | null
      sqft: number | null
      year_built: number | null
    }
    scenario: {
      strategy: string
      purchase_price: number | null
      after_repair_value: number | null
      repair_cost: number | null
      monthly_rent: number | null
      outputs: Record<string, unknown>
    }
    ai_narrative: string | null
    seller_name: string | null
    seller_email: string | null
    seller_phone: string | null
  }
  asking_price: number | null
  assignment_fee: number | null
  notes_to_buyer: string | null
  created_at: string
}

interface SendPacketRequest {
  buyer_contact_ids: string[]
  message?: string
}
```

### API Namespace

```typescript
api.dispositions = {
  matchProperty: (propertyId, filters?) => GET /api/dispositions/matches/property/:propertyId,
  matchBuyer: (contactId, filters?) => GET /api/dispositions/matches/buyer/:contactId,
  matchPreview: (data) => POST /api/dispositions/match-preview,
  packets: {
    create: (data) => POST /api/dispositions/packets,
    list: () => GET /api/dispositions/packets,
    send: (packetId, data) => POST /api/dispositions/packets/:packetId/send,
  },
  sharedPacket: (shareToken) => GET /api/dispositions/packets/share/:shareToken,
}
```

### Hooks (`hooks/useDispositions.ts`)

- `usePropertyMatches(propertyId, filters?)` — queryKey: `['dispositions', 'property', propertyId, filters]`
- `useBuyerMatches(contactId)` — queryKey: `['dispositions', 'buyer', contactId]`
- `useMatchPreview(propertyId, buyBoxId)` — queryKey: `['dispositions', 'preview', propertyId, buyBoxId]`, enabled only when both set
- `usePackets()` — queryKey: `['dispositions', 'packets']`
- `useCreatePacket()` — invalidates `['dispositions', 'packets']`
- `useSendPacket(packetId)` — invalidates `['dispositions', 'packets']`, `['buyers']`
- `useSharedPacket(shareToken)` — queryKey: `['shared-packet', shareToken]`, no auth

---

## 6. Frontend: Routes + Nav

Modify: `App.tsx` — add routes:
- `/dispositions/matches/:propertyId` → MatchResultsPage (lazy)
- `/packets/view/:shareToken` → SharedPacketPage (lazy, public)

No new nav item — dispositions are reached via "Find Buyers" buttons, not sidebar nav.

---

## 7. Frontend: Match Results Page

Create: `frontend/src/pages/dispositions/MatchResultsPage.tsx`
Route: `/dispositions/matches/:propertyId`

### Layout

```
Header: property address + strategy badge + purchase price
Filter bar: min score slider (40-100) + funding type pills + POF toggle
Match cards (single column, full width)
```

### Filter Bar

- Score slider: range 40-100, step 10, shows current value
- Funding pills: All | Cash | Hard Money | Conventional | Creative
- POF toggle: "Has POF" button

### Match Card

Each card shows:
- Buyer name (large) + company (muted) — click → `/buyers/:contactId`
- Score: large number with color ring/badge
  - Strong (80+): green
  - Moderate (60-79): yellow/amber
  - Weak (40-59): orange
- Match level text badge: "STRONG MATCH" / "MODERATE" / "WEAK"
- Breakdown: 4 horizontal mini-bars labeled Location, Financial, Property, Strategy — each shows X/25
- Funding badge + POF badge + "Closes in X days" if can_close_days
- Reasons list: checkmark (green) for met criteria, X (red) for unmet
- Actions row: "Send Packet" button (primary), "View Buyer" link (ghost)

### Create & Send Packet Flow

1. Select buyers via checkboxes on match cards
2. "Send Packet to X Buyers" button appears in sticky footer
3. Click opens CreatePacketModal:
   - Title (pre-filled: "{address} — {strategy} Analysis")
   - Asking price (number input, pre-filled from scenario purchase_price)
   - Assignment fee (number input, optional)
   - Notes to buyer (textarea)
   - "Create & Send" button
4. On submit: POST /api/dispositions/packets → POST /api/dispositions/packets/:id/send → toast → clear selection

### Empty State

"No buyers match this property's criteria. Add buyers with buy boxes to start matching."

---

## 8. Frontend: Create Packet Modal

Create: `frontend/src/components/dispositions/CreatePacketModal.tsx`

Shadcn Dialog with:
- Title input (pre-filled)
- Asking price (formatted number input)
- Assignment fee (formatted number input, optional)
- Notes to buyer (textarea, placeholder: "Add a personal message...")
- Selected buyer count display: "Sending to X buyers"
- Cancel + "Create & Send" buttons

Props: `propertyId`, `scenarioId`, `selectedBuyerIds`, `onSuccess`, `open`, `onOpenChange`

---

## 9. Frontend: Shared Packet Page

Create: `frontend/src/pages/dispositions/SharedPacketPage.tsx`
Route: `/packets/view/:shareToken`

Public page, no auth. Same lazy-load pattern as SharedReportPage.

### Layout

```
Header: Parcel logo + packet title
Property section: address, type, beds/baths/sqft, year built
Financial section: asking price, ARV, repair estimate, projected cash flow, cap rate
AI narrative section (if available)
Notes from seller (if provided)
CTA: "Interested? Contact [Name]" with phone/email
Footer: "Powered by Parcel" + link
```

### Design

- Clean, minimal layout — no sidebar, no nav
- White/light background for readability (public page, not in-app)
- Property metrics in a card grid
- Financial metrics highlighted with colored badges
- CTA section with prominent contact info
- Responsive — works on mobile (buyers check these on their phones)

---

## 10. Frontend: "Find Buyers" Entry Points

### Pipeline Deal Card

Modify: `frontend/src/components/pipeline/deal-card.tsx` or side panel

Add "Find Buyers" button in deal actions. Navigates to `/dispositions/matches/:propertyId` using the deal's property_id.

### Property Detail Page

Modify: property detail page action buttons area.

Add "Find Buyers" button. Same navigation.

### Analysis Results Page

Modify: analysis results page (post-calculation).

Add "Find Buyers" button after results are displayed. Same navigation.

All three buttons use the same pattern: `navigate(\`/dispositions/matches/${propertyId}\`)`.

---

## 11. Frontend: Buyer Detail Enhancement

Modify: `frontend/src/pages/buyers/BuyerDetailPage.tsx`

Replace the existing "Matching Properties" section (which calls `GET /api/buyers/:contactId/matches`) with scored results from `GET /api/dispositions/matches/buyer/:contactId`.

Each property card now shows:
- Address, city/state
- Score number + match level badge (colored)
- Buy box name that matched
- Purchase price + strategy
- "Send Packet" button → opens CreatePacketModal for that property

---

## 12. PostHog Events

- `match_scored` — `{property_id, total_matches, strong_count, avg_score}`
- `buyer_packet_created` — `{property_id, buyer_count}`
- `buyer_packet_viewed` — `{share_token_prefix}`
- `buyer_packet_sent` — `{buyer_count, property_id}`
- `find_buyers_clicked` — `{source: "pipeline" | "property" | "analysis"}`

---

## Definition of Done

- [ ] Match scoring engine with 4-dimension scoring (location, financial, property, strategy)
- [ ] Match endpoints: property→buyers, buyer→properties, preview
- [ ] BuyerPacket + BuyerPacketSend models with migration
- [ ] Packet CRUD + public share endpoint
- [ ] "Find Buyers" button on pipeline, property, and analysis pages
- [ ] Match results page with score visualization and breakdown
- [ ] Create & send packet flow with buyer selection
- [ ] Shared packet page (public, no auth)
- [ ] Buyer detail shows scored matching properties
- [ ] Frontend build clean
- [ ] Backend syntax clean
