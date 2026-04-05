# Skip Tracing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add skip tracing — property owner lookup via BatchData API with single/batch trace, 30-day caching, contact matching/creation, tier-gated usage, and full frontend (trace page, result cards, property detail integration, batch CSV upload).

**Architecture:** BatchDataProvider (httpx, follows bricked.py pattern) → SkipTraceService (cache, trace, contact create) → skip_tracing router (7 endpoints + tier gating) → Dramatiq batch task → frontend pages + components.

**Tech Stack:** FastAPI, SQLAlchemy, httpx, Dramatiq, Pydantic, React 18, TypeScript, TanStack React Query, Tailwind CSS

---

### Task 1: SkipTrace Model + Migration + Tier Config

**Files:**
- Create: `backend/models/skip_traces.py`
- Modify: `backend/models/__init__.py`
- Modify: `backend/core/billing/tier_config.py`
- Create: `backend/alembic/versions/r8s9t0u1v2w3_add_skip_traces.py`

- [ ] **Step 1: Create the SkipTrace model**

```python
# backend/models/skip_traces.py
"""SkipTrace model — property owner lookup results from BatchData."""

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import relationship

from database import Base
from models.base import TimestampMixin


class SkipTrace(TimestampMixin, Base):
    """A skip trace result — owner info, phones, emails from BatchData."""

    __tablename__ = "skip_traces"

    property_id = Column(UUID(as_uuid=True), ForeignKey("properties.id"), nullable=True, index=True)
    contact_id = Column(UUID(as_uuid=True), ForeignKey("contacts.id"), nullable=True, index=True)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    team_id = Column(UUID(as_uuid=True), nullable=True)

    # Input
    input_address = Column(String, nullable=True)
    input_name = Column(String, nullable=True)
    input_city = Column(String, nullable=True)
    input_state = Column(String, nullable=True)
    input_zip = Column(String, nullable=True)

    # Status
    status = Column(String, nullable=False, default="pending")
    # pending | processing | found | not_found | failed

    # Results
    owner_first_name = Column(String, nullable=True)
    owner_last_name = Column(String, nullable=True)
    phones = Column(JSONB, nullable=True)  # [{number, type, is_primary}]
    emails = Column(JSONB, nullable=True)  # [{email, is_primary}]
    mailing_address = Column(JSONB, nullable=True)  # {line1, city, state, zip}
    is_absentee_owner = Column(Boolean, nullable=True)
    demographics = Column(JSONB, nullable=True)  # {age_range, income_range}
    raw_response = Column(JSONB, nullable=True)

    # Tracking
    cost_cents = Column(Integer, nullable=True)
    traced_at = Column(DateTime, nullable=True)
    batch_id = Column(String, nullable=True, index=True)

    deleted_at = Column(DateTime, nullable=True)

    # Relationships
    property = relationship("Property")
    contact = relationship("Contact")
```

- [ ] **Step 2: Register in `__init__.py`**

Add after Sequence imports:
```python
from models.skip_traces import SkipTrace
```
Add `"SkipTrace"` to `__all__`.

- [ ] **Step 3: Update tier config**

In `backend/core/billing/tier_config.py`, add `skip_traces_per_month: Optional[int]` to the `TierLimits` dataclass. Set values:
- Free: `skip_traces_per_month=0`
- Plus: `skip_traces_per_month=0`
- Pro: `skip_traces_per_month=25`
- Business: `skip_traces_per_month=200`

- [ ] **Step 4: Create migration**

```python
# backend/alembic/versions/r8s9t0u1v2w3_add_skip_traces.py
"""Add skip_traces table.

Revision ID: r8s9t0u1v2w3
Revises: q7r8s9t0u1v2
Create Date: 2026-04-05
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, JSONB

revision = "r8s9t0u1v2w3"
down_revision = "q7r8s9t0u1v2"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "skip_traces",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("property_id", UUID(as_uuid=True), sa.ForeignKey("properties.id"), nullable=True),
        sa.Column("contact_id", UUID(as_uuid=True), sa.ForeignKey("contacts.id"), nullable=True),
        sa.Column("created_by", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("team_id", UUID(as_uuid=True), nullable=True),
        sa.Column("input_address", sa.String, nullable=True),
        sa.Column("input_name", sa.String, nullable=True),
        sa.Column("input_city", sa.String, nullable=True),
        sa.Column("input_state", sa.String, nullable=True),
        sa.Column("input_zip", sa.String, nullable=True),
        sa.Column("status", sa.String, nullable=False, server_default="pending"),
        sa.Column("owner_first_name", sa.String, nullable=True),
        sa.Column("owner_last_name", sa.String, nullable=True),
        sa.Column("phones", JSONB, nullable=True),
        sa.Column("emails", JSONB, nullable=True),
        sa.Column("mailing_address", JSONB, nullable=True),
        sa.Column("is_absentee_owner", sa.Boolean, nullable=True),
        sa.Column("demographics", JSONB, nullable=True),
        sa.Column("raw_response", JSONB, nullable=True),
        sa.Column("cost_cents", sa.Integer, nullable=True),
        sa.Column("traced_at", sa.DateTime, nullable=True),
        sa.Column("batch_id", sa.String, nullable=True),
        sa.Column("deleted_at", sa.DateTime, nullable=True),
        sa.Column("created_at", sa.DateTime, nullable=False),
        sa.Column("updated_at", sa.DateTime, nullable=False),
    )
    op.create_index("ix_skip_traces_property_id", "skip_traces", ["property_id"])
    op.create_index("ix_skip_traces_contact_id", "skip_traces", ["contact_id"])
    op.create_index("ix_skip_traces_created_by", "skip_traces", ["created_by"])
    op.create_index("ix_skip_traces_batch_id", "skip_traces", ["batch_id"])


def downgrade() -> None:
    op.drop_table("skip_traces")
```

- [ ] **Step 5: Verify + Commit**

```bash
cd /Users/ivanflores/parcel-platform/backend && python3 -c "import ast; ast.parse(open('models/skip_traces.py').read()); ast.parse(open('core/billing/tier_config.py').read()); print('OK')"
git add backend/models/skip_traces.py backend/models/__init__.py backend/core/billing/tier_config.py backend/alembic/versions/r8s9t0u1v2w3_add_skip_traces.py
git commit -m "feat: SkipTrace model, migration, and tier config (Pro: 25/mo, Business: 200/mo)"
```

---

### Task 2: BatchData Provider

**Files:**
- Create: `backend/core/skip_tracing/__init__.py`
- Create: `backend/core/skip_tracing/batchdata_provider.py`

- [ ] **Step 1: Create the provider**

Follow the bricked.py pattern exactly:
- Module-level config: `BATCHDATA_API_KEY`, `BATCHDATA_BASE_URL`, `TIMEOUT_SECONDS=30`, `COST_CENTS_PER_TRACE=12`
- `SkipTraceResult` dataclass: status, owner_first_name, owner_last_name, phones, emails, mailing_address, is_absentee_owner, demographics, raw_response, error, latency_ms
- `_classify_error(status_code)` — maps HTTP errors to result statuses
- `async skip_trace_address(address, city, state, zip_code)` — POST to BatchData API, retry once on 5xx, 2s backoff
- `skip_trace_address_sync(...)` — sync version for Dramatiq
- `_extract_owner_data(response_data)` — normalize BatchData response into phones [{number, type, is_primary}], emails [{email, is_primary}], mailing_address, demographics
- Phone type mapping: Mobile/Wireless→mobile, Landline→landline, VoIP/VOIP→voip, else→unknown
- Absentee detection: mailing_address differs from input property address

Auth: `Authorization: Bearer {BATCHDATA_API_KEY}` header.

Request body format (BatchData Property Skip Trace API):
```python
{
    "requests": [{
        "propertyAddress": {
            "street": address,
            "city": city,
            "state": state,
            "zip": zip_code
        }
    }]
}
```

Response parsing — BatchData returns nested owner/person data. Extract:
- Owner name from person data (first, last)
- Phones from `phoneNumbers` array with `lineType`
- Emails from `emailAddresses` array
- Mailing address from person's address (compare with property address for absentee detection)

- [ ] **Step 2: Verify + Commit**

```bash
cd /Users/ivanflores/parcel-platform/backend && python3 -c "from core.skip_tracing.batchdata_provider import BatchDataProvider; print('OK')"
git add backend/core/skip_tracing/__init__.py backend/core/skip_tracing/batchdata_provider.py
git commit -m "feat: BatchData provider (async/sync, retry, phone type mapping, absentee detection)"
```

---

### Task 3: Skip Trace Service

**Files:**
- Create: `backend/core/skip_tracing/service.py`

- [ ] **Step 1: Create the service**

```python
class SkipTraceService:
    def __init__(self, db: Session, provider: BatchDataProvider):
        ...

    async def trace_address(self, address, city, state, zip_code, user_id, team_id=None, property_id=None) -> SkipTrace:
        # 1. Check 30-day cache: query SkipTrace where same address fields, status="found", traced_at > now-30d
        # 2. If cache hit: return cached (don't count against quota)
        # 3. Call provider.skip_trace_address()
        # 4. Create SkipTrace record with results
        # 5. Log DataSourceEvent: provider="batchdata", request_type="skip_trace", cost_cents
        # 6. Return SkipTrace

    async def trace_property(self, property_id, user_id, team_id=None) -> SkipTrace:
        # 1. Load property, extract address fields
        # 2. Call trace_address() with property_id linkage

    def create_contact_from_trace(self, skip_trace_id, user_id, team_id=None, contact_type="seller") -> dict:
        # 1. Load SkipTrace, validate ownership
        # 2. Get primary phone and email from results
        # 3. Check existing contacts by phone match (digits-only) or email match (case-insensitive)
        # 4. If match: return {"existing": True, "contact": matched_contact}
        # 5. Create Contact: first_name, last_name, phone (primary), email (primary), contact_type
        # 6. Link to property if property_id exists
        # 7. Update SkipTrace.contact_id
        # 8. Return {"existing": False, "contact": new_contact}

    def _check_cache(self, address, city, state, zip_code, user_id) -> SkipTrace | None:
        # Case-insensitive address match, status="found", traced_at within 30 days, same user
```

Contact matching for duplicates uses:
- `phone_digits()` from `core.communications.twilio_sms` for phone normalization
- `func.lower(Contact.email) == email.lower()` for email matching
- Only match contacts owned by same user

- [ ] **Step 2: Verify + Commit**

```bash
cd /Users/ivanflores/parcel-platform/backend && python3 -c "import ast; ast.parse(open('core/skip_tracing/service.py').read()); print('OK')"
git add backend/core/skip_tracing/service.py
git commit -m "feat: SkipTraceService — trace, cache, contact matching/creation"
```

---

### Task 4: Schemas + Router + Batch Task

**Files:**
- Create: `backend/schemas/skip_tracing.py`
- Create: `backend/routers/skip_tracing.py`
- Create: `backend/core/tasks/skip_trace_batch.py`
- Modify: `backend/core/tasks/__init__.py`
- Modify: `backend/main.py`
- Modify: `backend/.env.example`

- [ ] **Step 1: Create schemas**

Schemas: TraceAddressRequest (with validator: either property_id or address required), TraceBatchRequest (records max 100, auto_create_contacts bool), SkipTraceResponse (full result), SkipTraceListItem (summary for table), BatchStatusResponse, CreateContactFromTraceRequest, CreateContactFromTraceResponse (existing bool + contact), UsageResponse (used + limit + cost_total_cents), PhoneResult, EmailResult.

- [ ] **Step 2: Create router**

7 endpoints at prefix `/skip-tracing`:

1. **POST /trace** — tier gate: `require_quota("skip_traces_per_month")`, call service, `record_usage` on success
2. **POST /trace-batch** — validate max 100, create pending SkipTrace records with batch_id, dispatch Dramatiq task, return batch_id
3. **GET /batch/{batch_id}/status** — count by status for batch_id, return progress
4. **GET /history** — list traces with filters (property_id, status, date_from, date_to, page, per_page)
5. **GET /{id}** — single trace detail
6. **POST /{id}/create-contact** — call service.create_contact_from_trace()
7. **GET /usage** — count current month's traces + tier limit

- [ ] **Step 3: Create batch Dramatiq task**

Follow document_processing.py pattern:
```python
if dramatiq:
    @dramatiq.actor(max_retries=2, min_backoff=10000)
    def process_skip_trace_batch(batch_id: str, user_id: str, auto_create: bool = False):
        # 1. Load all SkipTrace for batch_id where status="pending"
        # 2. For each: call provider sync, update record, log DataSourceEvent
        # 3. If auto_create and found: create Contact
        # 4. Record usage per successful trace
```

Register in `__init__.py`: add `from core.tasks import skip_trace_batch` in the `if REDIS_URL:` block.

- [ ] **Step 4: Register router + env vars**

Add to main.py imports and router registrations. Add `BATCHDATA_API_KEY=` to .env.example.

- [ ] **Step 5: Verify + Commit**

```bash
cd /Users/ivanflores/parcel-platform/backend && python3 -c "import ast; ast.parse(open('schemas/skip_tracing.py').read()); ast.parse(open('routers/skip_tracing.py').read()); print('OK')"
git add backend/schemas/skip_tracing.py backend/routers/skip_tracing.py backend/core/tasks/skip_trace_batch.py backend/core/tasks/__init__.py backend/main.py backend/.env.example
git commit -m "feat: skip tracing router (7 endpoints), batch Dramatiq task, tier gating"
```

---

### Task 5: Frontend Types + API + Hooks

**Files:**
- Modify: `frontend/src/types/index.ts`
- Modify: `frontend/src/lib/api.ts`
- Create: `frontend/src/hooks/useSkipTracing.ts`

- [ ] **Step 1: Add types**

PhoneResult, EmailResult, SkipTraceResult, SkipTraceListItem, TraceAddressRequest, SkipTraceUsage, CreateContactFromTraceResponse, BatchStatusResponse.

- [ ] **Step 2: Add API namespace**

`api.skipTracing = { trace, traceBatch, batchStatus, history, get, createContact, usage }`

- [ ] **Step 3: Create hooks**

`useSkipTrace()` (mutation), `useSkipTraceHistory(filters)`, `useSkipTraceDetail(id)`, `useSkipTraceUsage()`, `useCreateContactFromTrace(id)` (mutation), `useBatchStatus(batchId)` (poll with refetchInterval).

- [ ] **Step 4: Commit**

```bash
git add frontend/src/types/index.ts frontend/src/lib/api.ts frontend/src/hooks/useSkipTracing.ts
git commit -m "feat: skip tracing types, API namespace, and React Query hooks"
```

---

### Task 6: Skip Tracing Page + SkipTraceResultCard

**Files:**
- Modify: `frontend/src/components/layout/nav-data.ts`
- Modify: `frontend/src/App.tsx`
- Create: `frontend/src/pages/skip-tracing/SkipTracingPage.tsx`
- Create: `frontend/src/components/skip-tracing/SkipTraceResultCard.tsx`

- [ ] **Step 1: Unlock nav + add routes**

Remove `locked: true` from Skip Tracing in nav-data.ts. Add lazy imports and routes in App.tsx: `/skip-tracing` → SkipTracingPage, `/skip-tracing/batch` → BatchSkipTracePage.

- [ ] **Step 2: Create SkipTraceResultCard**

Shows full trace results: owner name, phones with type badges (mobile=green, landline=gray, voip=blue), emails, mailing address, absentee owner badge (orange), demographics. Actions: Create Contact (or "Already exists" link), Copy buttons, Send SMS/Email buttons, Add to Sequence.

- [ ] **Step 3: Create SkipTracingPage**

Three sections: trace form (address fields or property selector + "Skip Trace" button), inline results (SkipTraceResultCard), and history table.

History table columns: Date, Address, Status badge, Owner, Phone count, Email count, Contact link/button, Actions.

Usage indicator in header: "12 of 25 used this month"

- [ ] **Step 4: Verify build + Commit**

```bash
cd /Users/ivanflores/parcel-platform/frontend && npx vite build 2>&1 | tail -5
git add frontend/src/components/layout/nav-data.ts frontend/src/App.tsx frontend/src/pages/skip-tracing/SkipTracingPage.tsx frontend/src/components/skip-tracing/SkipTraceResultCard.tsx
git commit -m "feat: skip tracing page with trace form, result cards, history table"
```

---

### Task 7: Property Detail Integration + Batch Page

**Files:**
- Modify: `frontend/src/pages/properties/PropertyDetailPage.tsx`
- Create: `frontend/src/pages/skip-tracing/BatchSkipTracePage.tsx`

- [ ] **Step 1: Add "Skip Trace Owner" to PropertyDetailPage**

Add button in action buttons area (between Find Buyers and Delete). On click: calls `POST /api/skip-tracing/trace` with property_id. Shows loading state. On success: shows SkipTraceResultCard inline in a new section.

- [ ] **Step 2: Create BatchSkipTracePage**

CSV upload with drag-and-drop zone, parse client-side (FileReader + split), preview first 5 rows, "Trace All X Addresses" button, auto-create contacts toggle, progress polling, results table.

- [ ] **Step 3: Verify build + Commit**

```bash
cd /Users/ivanflores/parcel-platform/frontend && npx vite build 2>&1 | tail -5
git add frontend/src/pages/properties/PropertyDetailPage.tsx frontend/src/pages/skip-tracing/BatchSkipTracePage.tsx
git commit -m "feat: property detail Skip Trace Owner button + batch CSV upload page"
```

---

### Task 8: Final Verification

- [ ] **Step 1: Backend syntax**

```bash
cd /Users/ivanflores/parcel-platform/backend && python3 -c "import ast; [ast.parse(open(f).read()) for f in ['models/skip_traces.py','core/skip_tracing/batchdata_provider.py','core/skip_tracing/service.py','schemas/skip_tracing.py','routers/skip_tracing.py','core/billing/tier_config.py']]; print('ALL OK')"
```

- [ ] **Step 2: Frontend build**

```bash
cd /Users/ivanflores/parcel-platform/frontend && npx vite build 2>&1 | tail -5
```

- [ ] **Step 3: Fix any issues**
