# Skip Tracing (BatchData Integration) — Design Spec

## Overview

Add skip tracing — property owner lookup by address via BatchData API. Returns phone numbers, emails, mailing address, and absentee owner detection. Includes single trace, batch CSV processing, 30-day result caching, contact matching/creation, tier-gated usage, and property detail integration.

## Design System

Same as all prior sprints — no new tokens.

## Architecture Decisions

- **BatchData provider follows bricked.py pattern**: async/sync duals, ProviderResult dataclass, error classification, retry on 5xx, DataSourceEvent cost logging.
- **30-day result caching**: Before calling BatchData, check for existing SkipTrace on the same address within 30 days. Return cached if exists — saves ~$0.12 per avoided call.
- **Contact matching before creation**: When user clicks "Create Contact", check existing contacts by phone/email match. Show "Already exists" with link if matched. Prevents duplicates.
- **Batch via Dramatiq**: CSV uploads dispatch a Dramatiq task. Frontend polls for progress via a status endpoint.
- **Tier gating via existing pattern**: `require_quota` dependency + `record_usage` after successful trace. Pro: 25/month, Business: 200/month.
- **Router prefix**: `/api/skip-tracing`

---

## 1. Backend: BatchData Provider

Create: `backend/core/skip_tracing/__init__.py` (empty)
Create: `backend/core/skip_tracing/batchdata_provider.py`

### ProviderResult Dataclass

```python
@dataclass
class SkipTraceResult:
    status: str  # success | not_found | failed | timeout | auth_error | rate_limited
    owner_first_name: str | None = None
    owner_last_name: str | None = None
    phones: list[dict] | None = None  # [{number, type, is_primary}]
    emails: list[dict] | None = None  # [{email, is_primary}]
    mailing_address: dict | None = None  # {line1, city, state, zip}
    is_absentee_owner: bool | None = None
    demographics: dict | None = None  # {age_range, income_range}
    raw_response: dict | None = None
    error: str | None = None
    latency_ms: int = 0
```

### Methods

**`async skip_trace_address(address, city, state, zip_code) -> SkipTraceResult`**
- POST to `https://api.batchdata.com/api/v1/property/skip-trace`
- Auth: `Authorization: Bearer {BATCHDATA_API_KEY}` header
- Body: `{"requests": [{"propertyAddress": {"street": address, "city": city, "state": state, "zip": zip_code}}]}`
- Timeout: 30 seconds
- Retry: once on 5xx with 2-second backoff
- Parse response: extract owner name, phones (with line type), emails, mailing address
- Detect absentee: mailing_address differs from property address
- Return SkipTraceResult

**`skip_trace_address_sync(...)` — sync version for Dramatiq tasks**

**`_extract_owner_data(response_data) -> dict`** — normalize BatchData response into our schema

### Phone Type Mapping

BatchData returns line types. Map to our labels:
- `Mobile` / `Wireless` → `mobile`
- `Landline` → `landline`
- `VoIP` / `VOIP` → `voip`
- Unknown → `unknown`

### Error Classification

Same pattern as bricked.py:
- 400 → failed (invalid request)
- 401/403 → auth_error
- 404 → not_found
- 429 → rate_limited
- 5xx → failed (retry once)
- Timeout → timeout

Env vars: `BATCHDATA_API_KEY`
Cost: `COST_CENTS_PER_TRACE = 12` (~$0.12 per successful hit)

---

## 2. Backend: SkipTrace Model + Migration

Create: `backend/models/skip_traces.py`

```
skip_traces table:
    id              UUID PK (TimestampMixin)
    property_id     UUID FK → properties.id, nullable, indexed
    contact_id      UUID FK → contacts.id, nullable, indexed  — set when contact created from results
    created_by      UUID FK → users.id, NOT NULL, indexed
    team_id         UUID, nullable

    # Input
    input_address   String, nullable
    input_name      String, nullable
    input_city      String, nullable
    input_state     String, nullable
    input_zip       String, nullable

    # Status
    status          String, NOT NULL, default "pending"
                    — pending | processing | found | not_found | failed

    # Results
    owner_first_name    String, nullable
    owner_last_name     String, nullable
    phones              JSONB, nullable  — [{number, type, is_primary}]
    emails              JSONB, nullable  — [{email, is_primary}]
    mailing_address     JSONB, nullable  — {line1, city, state, zip}
    is_absentee_owner   Boolean, nullable
    demographics        JSONB, nullable  — {age_range, income_range}
    raw_response        JSONB, nullable  — full BatchData response

    # Tracking
    cost_cents      Integer, nullable
    traced_at       DateTime, nullable
    batch_id        String, nullable, indexed  — groups batch traces together

    deleted_at      DateTime, nullable
```

Relationships:
- `SkipTrace.property` → relationship to Property
- `SkipTrace.contact` → relationship to Contact

Register in `backend/models/__init__.py`. Migration creates table with indexes.

---

## 3. Backend: Skip Trace Service

Create: `backend/core/skip_tracing/service.py`

```python
class SkipTraceService:
    def __init__(self, db: Session, provider: BatchDataProvider):
        ...

    async def trace_property(self, property_id, user_id, team_id=None) -> SkipTrace:
        # 1. Load property, get address
        # 2. Check cache (existing trace on same address within 30 days with status="found")
        # 3. Call provider
        # 4. Create SkipTrace record
        # 5. Log DataSourceEvent
        # 6. Return SkipTrace

    async def trace_address(self, address, city, state, zip_code, user_id, team_id=None, property_id=None) -> SkipTrace:
        # 1. Check cache by address match within 30 days
        # 2. Call provider
        # 3. Create SkipTrace record
        # 4. Return SkipTrace

    def create_contact_from_trace(self, skip_trace_id, user_id, team_id=None, contact_type="seller") -> Contact | dict:
        # 1. Load SkipTrace
        # 2. Check for existing contacts by phone/email match
        # 3. If match found: return {"existing": True, "contact": matched_contact}
        # 4. If no match: create Contact with owner name, primary phone, primary email
        # 5. Link contact to property if property_id exists
        # 6. Update SkipTrace.contact_id
        # 7. Return new Contact

    def check_cache(self, address, city, state, zip_code) -> SkipTrace | None:
        # Query SkipTrace where input_address matches and traced_at > 30 days ago and status="found"
```

### Contact Matching

Check existing contacts by:
1. Primary phone digits match (use `phone_digits()` from twilio_sms.py)
2. Primary email exact match (case-insensitive)
3. Only match contacts owned by the same user

---

## 4. Backend: Skip Trace Schemas

Create: `backend/schemas/skip_tracing.py`

```
TraceAddressRequest:
    property_id: UUID | None
    address: str | None
    city: str | None
    state: str | None
    zip_code: str | None
    # Validate: either property_id OR address fields required

TraceBatchRequest:
    records: list[{address, city, state, zip_code}] (max 100)
    auto_create_contacts: bool = False

SkipTraceResponse:
    id, property_id, contact_id, status
    owner_first_name, owner_last_name
    phones: list[PhoneResult]
    emails: list[EmailResult]
    mailing_address: dict | None
    is_absentee_owner: bool | None
    demographics: dict | None
    cost_cents: int | None
    traced_at: str | None
    created_at: str

PhoneResult:
    number: str
    type: str  — mobile | landline | voip | unknown
    is_primary: bool

EmailResult:
    email: str
    is_primary: bool

SkipTraceListItem:
    id, status, input_address, input_city, input_state
    owner_first_name, owner_last_name
    phone_count: int
    email_count: int
    is_absentee_owner: bool | None
    contact_id: UUID | None
    traced_at: str | None
    created_at: str

BatchStatusResponse:
    batch_id: str
    status: str  — processing | complete | failed
    total: int
    completed: int
    found: int
    not_found: int

CreateContactFromTraceRequest:
    contact_type: str = "seller"

CreateContactFromTraceResponse:
    existing: bool
    contact: ContactResponse

UsageResponse:
    used: int
    limit: int | None  — None = unlimited
    cost_total_cents: int
```

---

## 5. Backend: Skip Tracing Router

Create: `backend/routers/skip_tracing.py`
Register in: `backend/main.py` at `/api` prefix.

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/skip-tracing/trace` | Single address trace |
| POST | `/skip-tracing/trace-batch` | Batch trace (async via Dramatiq) |
| GET | `/skip-tracing/batch/{batch_id}/status` | Poll batch progress |
| GET | `/skip-tracing/history` | List past traces |
| GET | `/skip-tracing/{id}` | Single trace details |
| POST | `/skip-tracing/{id}/create-contact` | Create contact from results |
| GET | `/skip-tracing/usage` | Current month usage stats |

### POST /skip-tracing/trace

1. Tier gate: Pro+ only (use `require_quota` pattern)
2. If property_id: load property, use its address
3. If address fields: use directly
4. Check 30-day cache — return cached if exists (don't decrement quota)
5. Call SkipTraceService.trace_address()
6. Record usage via `record_usage`
7. PostHog: `skip_trace_single`
8. Return SkipTraceResponse

### POST /skip-tracing/trace-batch

1. Tier gate: Business only (or Pro with lower limit)
2. Max 100 records per request
3. Create SkipTrace records in "pending" status with shared batch_id
4. Dispatch Dramatiq task: `process_skip_trace_batch.send(batch_id, user_id)`
5. Return: `{batch_id, status: "processing", total: N}`

### GET /skip-tracing/batch/{batch_id}/status

1. Count SkipTrace records for this batch_id by status
2. Return BatchStatusResponse

### GET /skip-tracing/history

Filters: `?property_id`, `?status`, `?date_from`, `?date_to`
Pagination: `?page`, `?per_page`
Return list[SkipTraceListItem]

### POST /skip-tracing/{id}/create-contact

1. Load SkipTrace, validate ownership
2. Call service.create_contact_from_trace()
3. If existing contact found: return `{existing: true, contact: ...}`
4. If new contact created: return `{existing: false, contact: ...}`

### GET /skip-tracing/usage

Query current month's SkipTrace count for user. Return used + tier limit.

---

## 6. Backend: Tier Config Update

Modify: `backend/core/billing/tier_config.py`

Add `skip_traces_per_month` to TierLimits dataclass:
- Free: 0
- Plus: 0
- Pro: 25
- Business: 200

---

## 7. Backend: Dramatiq Batch Task

Create: `backend/core/tasks/skip_trace_batch.py`

```python
@dramatiq.actor(max_retries=2, min_backoff=10000)
def process_skip_trace_batch(batch_id: str, user_id: str, auto_create_contacts: bool = False):
    # 1. Load all SkipTrace records for batch_id
    # 2. For each pending record:
    #    a. Call provider (sync version)
    #    b. Update SkipTrace with results
    #    c. If auto_create_contacts and found: create Contact
    # 3. Log DataSourceEvent for each
```

Register in `backend/core/tasks/__init__.py`.

---

## 8. Frontend: Types + API + Hooks

### Types (add to `types/index.ts`)

```typescript
interface PhoneResult {
  number: string
  type: 'mobile' | 'landline' | 'voip' | 'unknown'
  is_primary: boolean
}

interface EmailResult {
  email: string
  is_primary: boolean
}

interface SkipTraceResult {
  id: string
  property_id: string | null
  contact_id: string | null
  status: 'pending' | 'processing' | 'found' | 'not_found' | 'failed'
  owner_first_name: string | null
  owner_last_name: string | null
  phones: PhoneResult[]
  emails: EmailResult[]
  mailing_address: { line1: string; city: string; state: string; zip: string } | null
  is_absentee_owner: boolean | null
  demographics: Record<string, unknown> | null
  cost_cents: number | null
  traced_at: string | null
  created_at: string
}

interface SkipTraceListItem {
  id: string
  status: string
  input_address: string | null
  input_city: string | null
  input_state: string | null
  owner_first_name: string | null
  owner_last_name: string | null
  phone_count: number
  email_count: number
  is_absentee_owner: boolean | null
  contact_id: string | null
  traced_at: string | null
  created_at: string
}

interface TraceAddressRequest {
  property_id?: string
  address?: string
  city?: string
  state?: string
  zip_code?: string
}

interface SkipTraceUsage {
  used: number
  limit: number | null
  cost_total_cents: number
}

interface CreateContactFromTraceResponse {
  existing: boolean
  contact: ContactDetail
}
```

### API Namespace

```typescript
api.skipTracing = {
  trace: (data) => POST /api/skip-tracing/trace,
  traceBatch: (data) => POST /api/skip-tracing/trace-batch,
  batchStatus: (batchId) => GET /api/skip-tracing/batch/:batchId/status,
  history: (filters?) => GET /api/skip-tracing/history,
  get: (id) => GET /api/skip-tracing/:id,
  createContact: (id, data?) => POST /api/skip-tracing/:id/create-contact,
  usage: () => GET /api/skip-tracing/usage,
}
```

### Hooks (`hooks/useSkipTracing.ts`)

- `useSkipTrace()` — mutation, invalidates `['skip-tracing']`
- `useSkipTraceHistory(filters?)` — queryKey: `['skip-tracing', 'history', filters]`
- `useSkipTraceDetail(id)` — queryKey: `['skip-tracing', id]`
- `useSkipTraceUsage()` — queryKey: `['skip-tracing', 'usage']`
- `useCreateContactFromTrace(id)` — mutation, invalidates `['skip-tracing']`, `['contacts']`

---

## 9. Frontend: Unlock Nav + Routes

Modify: `nav-data.ts` — remove `locked: true` from Skip Tracing

Modify: `App.tsx` — replace LockedFeaturePage route for `/skip-tracing` with:
- `/skip-tracing` → SkipTracingPage
- `/skip-tracing/batch` → BatchSkipTracePage

---

## 10. Frontend: Skip Tracing Page

Create: `frontend/src/pages/skip-tracing/SkipTracingPage.tsx`
Route: `/skip-tracing`

### Layout

```
Header: "Skip Tracing" + usage indicator + "Batch Upload" link
Trace Form section
Results section (inline, appears after trace)
History table section
```

### Trace Form

- Property selector dropdown (optional — pick from saved properties)
- OR manual address fields: street, city, state, zip
- "Skip Trace" violet button
- Loading state: "Searching records..." spinner

### Inline Results

After successful trace, show SkipTraceResultCard (see below) inline below the form.

### History Table

Columns: Date | Address | Status | Owner | Phones | Emails | Contact | Actions

- Status badges: Found (green), Not Found (yellow), Failed (red), Pending (blue)
- Phone count, primary number shown
- Email count, primary email shown
- Contact: "View" link if contact_id set, "Create Contact" button if not
- Actions: View Details expand, Re-Trace button

---

## 11. Frontend: SkipTraceResultCard Component

Create: `frontend/src/components/skip-tracing/SkipTraceResultCard.tsx`

### Layout

```
Owner Name (large)
─────────────────────
PHONES
  +1 (414) 555-1234  [Mobile] (primary)  [Copy] [Send SMS]
  +1 (414) 555-5678  [Landline]          [Copy]

EMAILS
  john@example.com   (primary)  [Copy] [Send Email]

MAILING ADDRESS
  456 Oak St, Chicago, IL 60601
  [ABSENTEE OWNER] badge (orange, prominent)

DEMOGRAPHICS (muted)
  Age: 45-54 · Income: $75K-$100K

ACTIONS
  [Create Contact] or [Contact: John Smith →]
  [Add to Sequence]
```

### Phone Type Badges

- mobile: green badge `bg-[#4ADE80]/15 text-[#4ADE80]`
- landline: gray badge `bg-[#8A8580]/15 text-[#8A8580]`
- voip: blue badge `bg-[#60A5FA]/15 text-[#60A5FA]`

### Absentee Owner Badge

Orange, prominent: `bg-[#F97316]/15 text-[#F97316] border-[#F97316]/30`
Text: "ABSENTEE OWNER"
This is a key indicator — absentee owners are more motivated sellers.

### Contact Actions

- If SkipTrace.contact_id is set: show "Contact: {name} →" link to `/contacts/:id`
- If not: show "Create Contact" button → calls `POST /api/skip-tracing/:id/create-contact`
  - If response `existing: true`: show toast "Contact already exists" + link
  - If response `existing: false`: show toast "Contact created" + link
- "Add to Sequence" button: creates contact first (if needed), then shows sequence dropdown (reuse pattern from ContactDetailPage)

### Copy + Action Buttons

- Copy: small ghost button, copies to clipboard, brief toast "Copied"
- Send SMS: navigates to contact (creates if needed) and opens compose with SMS pre-selected
- Send Email: same but email pre-selected

---

## 12. Frontend: Property Detail Integration

Modify: `frontend/src/pages/properties/PropertyDetailPage.tsx`

Add "Skip Trace Owner" button in the action buttons area (between Find Buyers and Delete).

Button click: calls `POST /api/skip-tracing/trace` with `property_id`. Shows loading state on button. On success: shows SkipTraceResultCard inline on the page (in a new section below the header).

If property has been traced recently (check via a query or the trace response indicating cache hit), show cached results automatically.

---

## 13. Frontend: Batch Skip Trace Page

Create: `frontend/src/pages/skip-tracing/BatchSkipTracePage.tsx`
Route: `/skip-tracing/batch`

### Layout

```
Header: "Batch Skip Trace" + back link to /skip-tracing
Upload zone: drag-and-drop CSV
Preview: first 5 rows parsed
"Trace All X Addresses" button
Auto-create contacts toggle
Progress bar during processing
Results table when complete
```

### CSV Format

Expected columns: address, city, state, zip (header row required)
Show format hint: "CSV with columns: address, city, state, zip"

### Processing

1. Upload → parse CSV client-side (use FileReader + split)
2. Show preview of first 5 rows
3. "Trace All" → POST /api/skip-tracing/trace-batch
4. Poll GET /api/skip-tracing/batch/:batchId/status every 3 seconds
5. Show progress: "Processing... 23 of 47 complete"
6. When complete: show results table with found/not_found per row

---

## 14. PostHog Events

- `skip_trace_single` — `{source: "page" | "property_detail", had_property_id}`
- `skip_trace_found` — `{phones_count, emails_count, is_absentee}`
- `skip_trace_not_found` — `{}`
- `skip_trace_contact_created` — `{skip_trace_id, contact_type, was_existing}`
- `skip_trace_batch_started` — `{record_count}`
- `skip_trace_batch_completed` — `{found_count, not_found_count}`
- `skip_trace_usage_viewed` — `{used, limit}`

---

## Definition of Done

- [ ] BatchData provider with address lookup and error handling
- [ ] SkipTrace model with migration
- [ ] Skip trace service with 30-day caching and contact matching/creation
- [ ] Single trace + batch + history + usage endpoints
- [ ] Tier gating (Pro: 25/mo, Business: 200/mo)
- [ ] Dramatiq batch processing task
- [ ] Skip Tracing nav unlocked, routes registered
- [ ] Skip Tracing page with trace form + inline results + history table
- [ ] SkipTraceResultCard with phone/email lists, type badges, absentee badge
- [ ] "Create Contact" with duplicate detection
- [ ] Property detail "Skip Trace Owner" button
- [ ] Batch CSV upload page
- [ ] Frontend build clean
- [ ] Backend syntax clean
