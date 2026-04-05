# Buyer Management + Buy Boxes — Design Spec

## Overview

Build buyer management and buy box criteria tracking. Buyers are contacts with `contact_type = "buyer"` plus a new BuyBox model for investment criteria. Includes dedicated buyer list page, detail page with buy boxes and simple property matching, quick-add flow, and buy box editor.

## Design System

Same as all prior sprints — no new tokens.

## Architecture Decisions

- **Buyers are contacts**: No separate Buyer model. Buyers are contacts where `contact_type = "buyer"`. The existing Contact CRUD, communications, and deal linking all work for buyers out of the box.
- **BuyBox is a new model**: One-to-many from Contact to BuyBox. A buyer can have multiple buy boxes (e.g., "Cash deals under $100K" and "Milwaukee rentals").
- **Separate router**: `buyers.py` wraps contact queries filtered to `contact_type = "buyer"` and adds buy box management. Does not duplicate contact CRUD — the existing `/api/contacts` endpoints still work for buyers.
- **Simple property matching**: Buyer detail shows properties matching buy box criteria (price, property_type, location). No scoring — just a filtered list. Full match scoring comes in Sprint 2.
- **Router prefix**: `/api/buyers`.

---

## 1. Backend: BuyBox Model + Migration

Create: `backend/models/buy_boxes.py`

```
buy_boxes table:
  id              UUID PK
  contact_id      UUID FK → contacts.id, NOT NULL, indexed
  created_by      UUID, NOT NULL, indexed
  team_id         UUID, nullable
  name            String, NOT NULL
  is_active       Boolean, default True

  # Location
  target_markets  JSONB, nullable  — ["Milwaukee, WI", "53081"]
  max_distance_miles Integer, nullable

  # Financial
  min_price       Numeric(14,2), nullable
  max_price       Numeric(14,2), nullable
  min_arv         Numeric(14,2), nullable
  max_arv         Numeric(14,2), nullable
  min_cash_flow   Numeric(10,2), nullable
  min_cap_rate    Numeric(6,4), nullable
  min_coc_return  Numeric(6,4), nullable
  max_repair_cost Numeric(14,2), nullable

  # Property
  property_types  JSONB, nullable  — ["SFH", "Duplex"]
  min_bedrooms    Integer, nullable
  min_bathrooms   Integer, nullable
  min_sqft        Integer, nullable
  max_year_built  Integer, nullable
  min_year_built  Integer, nullable

  # Strategy
  strategies      JSONB, nullable  — ["buy_and_hold", "brrrr"]

  # Preferences
  funding_type    String, nullable — cash | hard_money | conventional | creative
  can_close_days  Integer, nullable
  proof_of_funds  Boolean, default False

  notes           Text, nullable
  deleted_at      DateTime, nullable
  created_at, updated_at (TimestampMixin)
```

Relationships:
- `Contact.buy_boxes` → one-to-many with cascade
- `BuyBox.contact` → back_populates

Migration creates `buy_boxes` table with indexes on `contact_id` and `created_by`.

---

## 2. Backend: Buyer Schemas

Create: `backend/schemas/buyers.py`

```
BuyBoxResponse:
    All model fields

CreateBuyBoxRequest:
    name: str (required)
    is_active: bool = True
    target_markets: list[str] | None
    min_price, max_price, min_arv, max_arv: Decimal | None
    min_cash_flow, min_cap_rate, min_coc_return, max_repair_cost: Decimal | None
    property_types: list[str] | None
    min_bedrooms, min_bathrooms, min_sqft: int | None
    max_year_built, min_year_built: int | None
    strategies: list[str] | None
    funding_type: str | None
    can_close_days: int | None
    proof_of_funds: bool = False
    notes: str | None

UpdateBuyBoxRequest:
    All fields optional

BuyerResponse:
    # Contact fields
    id, first_name, last_name, email, phone, company, contact_type, notes, tags
    created_at, updated_at
    # Buyer extras
    buy_boxes: list[BuyBoxResponse]
    deal_count: int
    last_communication: str | None
    # Computed
    funding_type: str | None  — from primary (first active) buy box
    has_pof: bool             — any buy box has proof_of_funds

BuyerDetailResponse(BuyerResponse):
    deals: list[LinkedDeal]
    total_deals_closed: int
    total_deal_volume: float

QuickAddBuyerRequest:
    first_name: str
    last_name: str | None
    phone: str | None
    email: str | None
    company: str | None
    funding_type: str | None
    proof_of_funds: bool = False
    buy_box: CreateBuyBoxRequest

MatchingProperty:
    id, address, city, state, zip_code
    purchase_price, after_repair_value
    property_type, bedrooms, bathrooms, sqft
    strategy: str | None
```

---

## 3. Backend: Buyer Router

Create: `backend/routers/buyers.py`
Register in: `backend/main.py`

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/buyers` | List buyer contacts with buy boxes |
| GET | `/api/buyers/:contactId` | Full buyer profile |
| POST | `/api/buyers/:contactId/buy-boxes` | Create buy box |
| PATCH | `/api/buyers/:contactId/buy-boxes/:boxId` | Update buy box |
| DELETE | `/api/buyers/:contactId/buy-boxes/:boxId` | Soft delete buy box |
| POST | `/api/buyers/quick-add` | Create contact + buy box in one request |
| GET | `/api/buyers/:contactId/matches` | Properties matching buy box criteria |

### Filters on GET /api/buyers

- `?funding_type=cash` — filter by funding type in any active buy box
- `?has_pof=true` — only buyers with proof_of_funds in any box
- `?market=Milwaukee` — search in target_markets JSONB
- `?strategy=buy_and_hold` — search in strategies JSONB
- `?q=search` — name/email/phone text search (reuse contact search pattern)

### GET /api/buyers/:contactId/matches

Simple property matching from buy box criteria:
1. Get all active buy boxes for this buyer
2. For each box, query properties (status != "archived", not deleted) matching:
   - `purchase_price` between `min_price` and `max_price` (if set)
   - `property_type` in `property_types` array (if set)
   - `city`/`state`/`zip_code` matches `target_markets` entries (if set)
   - `bedrooms >= min_bedrooms`, `bathrooms >= min_bathrooms`, `sqft >= min_sqft` (if set)
3. Deduplicate across buy boxes
4. Return up to 20 matching properties

---

## 4. Frontend: Types + API + Hooks

### Types (add to `types/index.ts`)

```typescript
interface BuyBox {
  id: string
  contact_id: string
  name: string
  is_active: boolean
  target_markets: string[] | null
  min_price: number | null
  max_price: number | null
  min_arv: number | null
  max_arv: number | null
  min_cash_flow: number | null
  min_cap_rate: number | null
  min_coc_return: number | null
  max_repair_cost: number | null
  property_types: string[] | null
  min_bedrooms: number | null
  min_bathrooms: number | null
  min_sqft: number | null
  max_year_built: number | null
  min_year_built: number | null
  strategies: string[] | null
  funding_type: string | null
  can_close_days: number | null
  proof_of_funds: boolean
  notes: string | null
  created_at: string
  updated_at: string
}

interface BuyerListItem {
  id: string
  first_name: string
  last_name: string | null
  email: string | null
  phone: string | null
  company: string | null
  contact_type: string
  buy_boxes: BuyBox[]
  deal_count: number
  last_communication: string | null
  funding_type: string | null
  has_pof: boolean
}

interface BuyerDetail extends BuyerListItem {
  notes: string | null
  tags: string[] | null
  deals: LinkedDeal[]
  total_deals_closed: number
  total_deal_volume: number
}

interface MatchingPropertyItem {
  id: string
  address: string
  city: string
  state: string
  zip_code: string
  purchase_price: number | null
  after_repair_value: number | null
  property_type: string | null
  bedrooms: number | null
  bathrooms: number | null
  sqft: number | null
  strategy: string | null
}

interface CreateBuyBoxRequest {
  name: string
  is_active?: boolean
  target_markets?: string[]
  min_price?: number
  max_price?: number
  property_types?: string[]
  strategies?: string[]
  funding_type?: string
  can_close_days?: number
  proof_of_funds?: boolean
  // ... all other optional fields
}

interface QuickAddBuyerRequest {
  first_name: string
  last_name?: string
  phone?: string
  email?: string
  company?: string
  funding_type?: string
  proof_of_funds?: boolean
  buy_box: CreateBuyBoxRequest
}
```

### API Namespace

```typescript
api.buyers = {
  list: (filters?) => GET /api/buyers,
  get: (contactId) => GET /api/buyers/:contactId,
  quickAdd: (data) => POST /api/buyers/quick-add,
  matches: (contactId) => GET /api/buyers/:contactId/matches,
  buyBoxes: {
    create: (contactId, data) => POST /api/buyers/:contactId/buy-boxes,
    update: (contactId, boxId, data) => PATCH /api/buyers/:contactId/buy-boxes/:boxId,
    delete: (contactId, boxId) => DELETE /api/buyers/:contactId/buy-boxes/:boxId,
  },
}
```

### Hooks (`hooks/useBuyers.ts`)

- `useBuyers(filters?)` — queryKey: `['buyers', filters]`
- `useBuyer(contactId)` — queryKey: `['buyers', contactId]`
- `useBuyerMatches(contactId)` — queryKey: `['buyers', contactId, 'matches']`
- `useQuickAddBuyer()` — invalidates `['buyers']`, `['contacts']`
- `useCreateBuyBox(contactId)` — invalidates `['buyers']`
- `useUpdateBuyBox(contactId)` — invalidates `['buyers']`
- `useDeleteBuyBox(contactId)` — invalidates `['buyers']`

---

## 5. Frontend: Unlock Buyers Nav + Routes

Modify: `nav-data.ts` — remove `locked: true` from Buyers

Modify: `App.tsx` — add routes:
- `/buyers` → BuyersListPage
- `/buyers/:contactId` → BuyerDetailPage

Remove `/buyers` from locked features block.

---

## 6. Frontend: Buyers List Page

Create: `frontend/src/pages/buyers/BuyersListPage.tsx`
Route: `/buyers`

### Layout

```
Header: "Buyer List" + count + "Add Buyer" button
Filter bar: Funding pills + Market search + Strategy filter + POF toggle
Buyer cards grid (2 cols desktop, 1 mobile)
```

### Filter Bar

- Funding type pills: All | Cash | Hard Money | Conventional | Creative
- Market search: text input with debounce
- Strategy dropdown: All | Buy & Hold | BRRRR | Flip | etc.
- "Has POF" toggle button

### Buyer Card

- Name (large) + company (muted)
- Phone + email icons
- Funding badge: Cash (green), Hard Money (orange), Conventional (blue), Creative (violet)
- POF badge: "POF ✓" green if true
- Buy box summary line: "SFH/Duplex · $50K-$150K · Milwaukee · Buy & Hold"
- Deal stats: "12 deals · $1.8M volume · 14 days avg close"
- Last contact relative time
- Click → `/buyers/:id`

### Empty State

"No buyers yet. Build your buyer list to start matching deals."

---

## 7. Frontend: Buyer Detail Page

Create: `frontend/src/pages/buyers/BuyerDetailPage.tsx`
Route: `/buyers/:contactId`

### Layout

```
Header: Name + company + funding badge + POF + action buttons
Buy Boxes section (expandable cards)
Matching Properties section (simple list)
Deal History section
Communication Log (reuse existing)
```

### Buy Boxes Section

- List of buy box cards, each expandable
- Collapsed: name + one-line summary ("SFH · $50K-$150K · Milwaukee")
- Expanded: all criteria fields displayed in a grid
- "Add Buy Box" button → opens BuyBoxEditor
- Edit/Delete on each box

### Matching Properties

- Count: "X properties match this buyer's criteria"
- List of matching property cards (compact): address, price, type, beds/baths
- Click → navigates to property detail

### Deal History + Communication Log

Reuse patterns from ContactDetailPage.

---

## 8. Frontend: Add Buyer Modal

Create: `frontend/src/components/buyers/AddBuyerModal.tsx`

Two-step Shadcn Dialog:

Step 1: Contact info — name, phone, email, company, funding type dropdown, POF toggle
Step 2: First buy box — name, target markets (tag input), price range, property types (checkboxes), strategies (checkboxes), close timeline

Submit: `POST /api/buyers/quick-add` → close → toast → invalidate

---

## 9. Frontend: Buy Box Editor

Create: `frontend/src/components/buyers/BuyBoxEditor.tsx`

Reusable component for create/edit. Fields:
- Name (text)
- Target Markets (tag input — type, enter to add, X to remove)
- Price Range (min/max with $ formatting)
- Property Types (checkbox group: SFH, Duplex, Triplex, Fourplex, Multi-Family)
- Strategies (checkbox group: Buy & Hold, BRRRR, Flip, Wholesale, Creative)
- Min Bedrooms, Min Bathrooms (number inputs)
- Funding Type (dropdown)
- Close Timeline (number, days)
- Proof of Funds (toggle)
- Notes (textarea)

Used in both AddBuyerModal (Step 2) and BuyerDetailPage (edit mode).

---

## 10. PostHog Events

- `buyer_created` — `{funding_type, has_pof}`
- `buy_box_created` — `{has_price_range, has_markets, strategies_count}`
- `buyer_detail_viewed` — `{contact_id, buy_box_count}`
- `buyers_list_viewed` — `{count}`
- `buyer_matches_viewed` — `{contact_id, match_count}`

---

## Definition of Done

- [ ] BuyBox model with migration
- [ ] Buyer endpoints: list, detail, quick-add, buy box CRUD, simple matching
- [ ] Buyers nav unlocked, routes registered
- [ ] Buyers list page with funding badges, POF, buy box summaries, filters
- [ ] Buyer detail page with buy boxes, matching properties, deal history
- [ ] Add Buyer two-step modal
- [ ] Buy Box editor component
- [ ] Frontend build clean
- [ ] Backend syntax clean
