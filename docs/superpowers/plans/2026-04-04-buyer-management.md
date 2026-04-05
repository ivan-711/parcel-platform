# Buyer Management + Buy Boxes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build buyer management with buy box criteria, dedicated buyer pages, quick-add flow, and simple property matching — extending the existing Contact system.

**Architecture:** New BuyBox model (one-to-many from Contact). Separate buyers router wraps contact queries filtered to `contact_type="buyer"` and adds buy box CRUD + matching. Frontend: dedicated buyer list/detail pages, add-buyer modal with two-step flow, reusable buy box editor.

**Tech Stack:** Python (FastAPI, SQLAlchemy, Alembic), TypeScript (React, TanStack Query, Tailwind)

---

## Task 1: BuyBox Model + Migration

**Files:**
- Create: `backend/models/buy_boxes.py`
- Create: `backend/alembic/versions/l2m3n4o5p6q7_add_buy_boxes.py`
- Modify: `backend/models/contacts.py`
- Modify: `backend/models/__init__.py`

- [ ] **Step 1: Create buy box model**

```python
# backend/models/buy_boxes.py
"""BuyBox model — investment criteria for buyer contacts."""

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import relationship

from database import Base
from models.base import TimestampMixin


class BuyBox(TimestampMixin, Base):
    """Investment criteria defining what a buyer wants to purchase."""

    __tablename__ = "buy_boxes"

    contact_id = Column(UUID(as_uuid=True), ForeignKey("contacts.id"), nullable=False, index=True)
    created_by = Column(UUID(as_uuid=True), nullable=False, index=True)
    team_id = Column(UUID(as_uuid=True), nullable=True)

    name = Column(String, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)

    # Location criteria
    target_markets = Column(JSONB, nullable=True)
    max_distance_miles = Column(Integer, nullable=True)

    # Financial criteria
    min_price = Column(Numeric(14, 2), nullable=True)
    max_price = Column(Numeric(14, 2), nullable=True)
    min_arv = Column(Numeric(14, 2), nullable=True)
    max_arv = Column(Numeric(14, 2), nullable=True)
    min_cash_flow = Column(Numeric(10, 2), nullable=True)
    min_cap_rate = Column(Numeric(6, 4), nullable=True)
    min_coc_return = Column(Numeric(6, 4), nullable=True)
    max_repair_cost = Column(Numeric(14, 2), nullable=True)

    # Property criteria
    property_types = Column(JSONB, nullable=True)
    min_bedrooms = Column(Integer, nullable=True)
    min_bathrooms = Column(Integer, nullable=True)
    min_sqft = Column(Integer, nullable=True)
    max_year_built = Column(Integer, nullable=True)
    min_year_built = Column(Integer, nullable=True)

    # Strategy criteria
    strategies = Column(JSONB, nullable=True)

    # Buyer preferences
    funding_type = Column(String, nullable=True)
    can_close_days = Column(Integer, nullable=True)
    proof_of_funds = Column(Boolean, default=False, nullable=False)

    notes = Column(Text, nullable=True)
    deleted_at = Column(DateTime, nullable=True)

    # Relationships
    contact = relationship("Contact", back_populates="buy_boxes")
```

- [ ] **Step 2: Add relationship to Contact model**

In `backend/models/contacts.py`, add import and relationship:

```python
from sqlalchemy.orm import relationship
```

After `is_deleted` column (line 29), add:
```python
    # Relationships
    buy_boxes = relationship("BuyBox", back_populates="contact", cascade="all, delete-orphan")
```

- [ ] **Step 3: Register in __init__.py**

In `backend/models/__init__.py`, after the Wave 3 imports, add:
```python
from models.buy_boxes import BuyBox
```

And add to `__all__`:
```python
    "BuyBox",
```

- [ ] **Step 4: Create migration**

```python
# backend/alembic/versions/l2m3n4o5p6q7_add_buy_boxes.py
"""Add buy_boxes table.

Revision ID: l2m3n4o5p6q7
Revises: k1l2m3n4o5p6
Create Date: 2026-04-04
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "l2m3n4o5p6q7"
down_revision: Union[str, Sequence[str], None] = "k1l2m3n4o5p6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "buy_boxes",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False, server_default=sa.text("gen_random_uuid()")),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("contact_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("team_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("target_markets", postgresql.JSONB(), nullable=True),
        sa.Column("max_distance_miles", sa.Integer(), nullable=True),
        sa.Column("min_price", sa.Numeric(14, 2), nullable=True),
        sa.Column("max_price", sa.Numeric(14, 2), nullable=True),
        sa.Column("min_arv", sa.Numeric(14, 2), nullable=True),
        sa.Column("max_arv", sa.Numeric(14, 2), nullable=True),
        sa.Column("min_cash_flow", sa.Numeric(10, 2), nullable=True),
        sa.Column("min_cap_rate", sa.Numeric(6, 4), nullable=True),
        sa.Column("min_coc_return", sa.Numeric(6, 4), nullable=True),
        sa.Column("max_repair_cost", sa.Numeric(14, 2), nullable=True),
        sa.Column("property_types", postgresql.JSONB(), nullable=True),
        sa.Column("min_bedrooms", sa.Integer(), nullable=True),
        sa.Column("min_bathrooms", sa.Integer(), nullable=True),
        sa.Column("min_sqft", sa.Integer(), nullable=True),
        sa.Column("max_year_built", sa.Integer(), nullable=True),
        sa.Column("min_year_built", sa.Integer(), nullable=True),
        sa.Column("strategies", postgresql.JSONB(), nullable=True),
        sa.Column("funding_type", sa.String(), nullable=True),
        sa.Column("can_close_days", sa.Integer(), nullable=True),
        sa.Column("proof_of_funds", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("deleted_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["contact_id"], ["contacts.id"]),
    )
    op.create_index("ix_buy_boxes_contact_id", "buy_boxes", ["contact_id"])
    op.create_index("ix_buy_boxes_created_by", "buy_boxes", ["created_by"])


def downgrade() -> None:
    op.drop_table("buy_boxes")
```

- [ ] **Step 5: Verify syntax**

Run: `cd backend && python3 -m py_compile models/buy_boxes.py && python3 -m py_compile alembic/versions/l2m3n4o5p6q7_add_buy_boxes.py && echo "OK"`

- [ ] **Step 6: Commit**

```bash
git add backend/models/buy_boxes.py backend/models/contacts.py backend/models/__init__.py backend/alembic/versions/l2m3n4o5p6q7_add_buy_boxes.py
git commit -m "feat: add BuyBox model with migration"
```

---

## Task 2: Buyer Schemas + Router

**Files:**
- Create: `backend/schemas/buyers.py`
- Create: `backend/routers/buyers.py`
- Modify: `backend/main.py`

This is a large task — the router has 7 endpoints. The implementer should read the spec at `docs/superpowers/specs/2026-04-04-buyer-management-design.md` sections 2-3 for the full schema and endpoint definitions.

- [ ] **Step 1: Create buyer schemas**

Create `backend/schemas/buyers.py` with all schemas from the spec: `BuyBoxResponse`, `CreateBuyBoxRequest`, `UpdateBuyBoxRequest`, `BuyerListItem`, `BuyerDetailResponse`, `QuickAddBuyerRequest`, `MatchingPropertyItem`.

- [ ] **Step 2: Create buyer router**

Create `backend/routers/buyers.py` with 7 endpoints:
- `GET /buyers` — list buyer contacts with buy boxes, filters (funding_type, has_pof, market, strategy, q)
- `GET /buyers/:contactId` — full buyer profile with buy boxes, deals, stats
- `POST /buyers/:contactId/buy-boxes` — create buy box (validate contact is buyer + owned)
- `PATCH /buyers/:contactId/buy-boxes/:boxId` — update buy box
- `DELETE /buyers/:contactId/buy-boxes/:boxId` — soft delete
- `POST /buyers/quick-add` — create contact (type=buyer) + buy box in one transaction
- `GET /buyers/:contactId/matches` — simple property matching from buy box criteria

The router should follow the exact patterns in the financing and rehab routers: `get_current_user` dependency, ownership validation, soft delete, PostHog tracking.

Key implementation details for the matching endpoint:
```python
# For each active buy box, build a property query:
q = db.query(Property).filter(
    Property.created_by == current_user.id,
    Property.is_deleted == False,
    Property.status != "archived",
)
if box.min_price is not None:
    # Need to join with AnalysisScenario to get purchase_price
    # Or filter on scenario outputs
if box.property_types:
    q = q.filter(Property.property_type.in_(box.property_types))
if box.min_bedrooms:
    q = q.filter(Property.bedrooms >= box.min_bedrooms)
# ... etc
```

For target_markets matching: check if any market string appears in `Property.city`, `Property.state`, or `Property.zip_code`.

- [ ] **Step 3: Register in main.py**

Add `buyers` to imports and register:
```python
app.include_router(buyers.router, prefix="/api")
```

- [ ] **Step 4: Verify syntax**

Run: `cd backend && python3 -m py_compile schemas/buyers.py && python3 -m py_compile routers/buyers.py && python3 -m py_compile main.py && echo "OK"`

- [ ] **Step 5: Commit**

```bash
git add backend/schemas/buyers.py backend/routers/buyers.py backend/main.py
git commit -m "feat: add buyer endpoints with buy box CRUD, quick-add, and property matching"
```

---

## Task 3: Frontend Types + API + Hooks

**Files:**
- Modify: `frontend/src/types/index.ts`
- Modify: `frontend/src/lib/api.ts`
- Create: `frontend/src/hooks/useBuyers.ts`

- [ ] **Step 1: Add buyer types**

At the end of `frontend/src/types/index.ts`, add all buyer types from the spec section 4: `BuyBox`, `BuyerListItem`, `BuyerDetail`, `MatchingPropertyItem`, `CreateBuyBoxRequest`, `QuickAddBuyerRequest`, and filter types.

- [ ] **Step 2: Add buyer API namespace**

In `frontend/src/lib/api.ts`, add `buyers` namespace with methods for list, get, quickAdd, matches, and buyBoxes (create, update, delete).

- [ ] **Step 3: Create buyer hooks**

Create `frontend/src/hooks/useBuyers.ts` with: `useBuyers`, `useBuyer`, `useBuyerMatches`, `useQuickAddBuyer`, `useCreateBuyBox`, `useUpdateBuyBox`, `useDeleteBuyBox`.

- [ ] **Step 4: Verify build**

Run: `cd frontend && npx vite build 2>&1 | tail -5`

- [ ] **Step 5: Commit**

```bash
git add frontend/src/types/index.ts frontend/src/lib/api.ts frontend/src/hooks/useBuyers.ts
git commit -m "feat: add buyer types, API client, and React Query hooks"
```

---

## Task 4: Nav + Routes

**Files:**
- Modify: `frontend/src/components/layout/nav-data.ts`
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: Unlock Buyers in nav**

In `nav-data.ts`, find the Buyers entry (line 62):
```typescript
      { label: 'Buyers', path: '/buyers', icon: Tag, locked: true },
```
Remove `, locked: true`.

- [ ] **Step 2: Add routes in App.tsx**

Add lazy imports:
```typescript
const BuyersListPage = lazy(() => import('@/pages/buyers/BuyersListPage'))
const BuyerDetailPage = lazy(() => import('@/pages/buyers/BuyerDetailPage'))
```

Add routes (before locked features block):
```typescript
        <Route path="/buyers" element={<ProtectedRoute><PageErrorBoundary><BuyersListPage /></PageErrorBoundary></ProtectedRoute>} />
        <Route path="/buyers/:contactId" element={<ProtectedRoute><PageErrorBoundary><BuyerDetailPage /></PageErrorBoundary></ProtectedRoute>} />
```

Remove locked `/buyers` route.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/layout/nav-data.ts frontend/src/App.tsx
git commit -m "feat: unlock Buyers nav, add buyer routes"
```

---

## Task 5: Buy Box Editor Component

**Files:**
- Create: `frontend/src/components/buyers/BuyBoxEditor.tsx`

Reusable component for creating/editing buy boxes. Used in both AddBuyerModal and BuyerDetailPage.

Read the spec section 9 for field list. The component should have:
- Name text input
- Target Markets tag input (type city/zip, enter to add, X to remove)
- Price Range min/max
- Property Types checkbox group (SFH, Duplex, Triplex, Fourplex, Multi-Family)
- Strategies checkbox group (Buy & Hold, BRRRR, Flip, Wholesale, Creative)
- Min Bedrooms, Min Bathrooms inputs
- Funding Type dropdown (Cash, Hard Money, Conventional, Creative)
- Close Timeline (days)
- Proof of Funds toggle
- Notes textarea

Props: `value: Partial<CreateBuyBoxRequest>`, `onChange: (value) => void`

Design system: same inputs as AddInstrumentModal and AddTransactionModal.

- [ ] **Step 1: Create BuyBoxEditor**

Create `frontend/src/components/buyers/BuyBoxEditor.tsx` following the spec.

- [ ] **Step 2: Verify build**

Run: `cd frontend && npx vite build 2>&1 | tail -5`

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/buyers/BuyBoxEditor.tsx
git commit -m "feat: add reusable buy box editor component"
```

---

## Task 6: Add Buyer Modal

**Files:**
- Create: `frontend/src/components/buyers/AddBuyerModal.tsx`

Two-step Shadcn Dialog:

Step 1: Contact info — first name (required), last name, phone, email, company, funding type dropdown, POF toggle
Step 2: First buy box — uses BuyBoxEditor component with name pre-filled

Submit: `POST /api/buyers/quick-add` via `useQuickAddBuyer()` hook.

Read the spec section 8 for details.

- [ ] **Step 1: Create AddBuyerModal**

Create `frontend/src/components/buyers/AddBuyerModal.tsx` following the spec.

- [ ] **Step 2: Verify build**

Run: `cd frontend && npx vite build 2>&1 | tail -5`

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/buyers/AddBuyerModal.tsx
git commit -m "feat: add two-step buyer creation modal"
```

---

## Task 7: Buyers List Page

**Files:**
- Create: `frontend/src/pages/buyers/BuyersListPage.tsx`

Read the spec section 6. The page has:
- Header with title + "Add Buyer" button
- Filter bar: funding type pills, market search, strategy dropdown, POF toggle
- Buyer cards grid (2 cols desktop, 1 mobile)
- Each card: name, company, contact info, funding badge, POF badge, buy box summary, deal stats
- Empty state

Funding badge colors:
- Cash: `bg-[#4ADE80]/15 text-[#4ADE80]`
- Hard Money: `bg-[#FBBF24]/15 text-[#FBBF24]`
- Conventional: `bg-[#60A5FA]/15 text-[#60A5FA]`
- Creative: `bg-[#8B7AFF]/15 text-[#8B7AFF]`

Buy box summary: derive from first active buy box — show property types, price range, markets, strategies in one line.

- [ ] **Step 1: Create BuyersListPage**

Create `frontend/src/pages/buyers/BuyersListPage.tsx` following the spec.

- [ ] **Step 2: Verify build**

Run: `cd frontend && npx vite build 2>&1 | tail -5`

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/buyers/BuyersListPage.tsx
git commit -m "feat: add buyers list page with funding badges, filters, buy box summaries"
```

---

## Task 8: Buyer Detail Page

**Files:**
- Create: `frontend/src/pages/buyers/BuyerDetailPage.tsx`

Read the spec section 7. The page has:
- Header with name, company, funding badge, POF, breadcrumb to /buyers
- Buy Boxes section: expandable cards with all criteria, add/delete buttons
- Matching Properties section: count + list from `useBuyerMatches(contactId)`
- Deal History: linked deals from buyer data
- Communication Log: reuse pattern from ContactDetailPage

The buy box cards show:
- Collapsed: name + one-line summary
- Expanded: full criteria grid using same labels as BuyBoxEditor

- [ ] **Step 1: Create BuyerDetailPage**

Create `frontend/src/pages/buyers/BuyerDetailPage.tsx` following the spec.

- [ ] **Step 2: Verify build**

Run: `cd frontend && npx vite build 2>&1 | tail -5`

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/buyers/BuyerDetailPage.tsx
git commit -m "feat: add buyer detail page with buy boxes, matching properties, deal history"
```

---

## Summary

| Task | Files | Description |
|------|-------|-------------|
| 1 | `buy_boxes.py`, migration, `contacts.py`, `__init__.py` | BuyBox model + migration |
| 2 | `schemas/buyers.py`, `routers/buyers.py`, `main.py` | 7 endpoints: list, detail, buy box CRUD, quick-add, matching |
| 3 | `types/index.ts`, `api.ts`, `useBuyers.ts` | Frontend types, API, hooks |
| 4 | `nav-data.ts`, `App.tsx` | Unlock nav, add routes |
| 5 | `BuyBoxEditor.tsx` | Reusable buy box criteria editor |
| 6 | `AddBuyerModal.tsx` | Two-step buyer creation modal |
| 7 | `BuyersListPage.tsx` | Buyer cards with filters and badges |
| 8 | `BuyerDetailPage.tsx` | Detail with buy boxes, matching, deals |
