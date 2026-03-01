# CONTRACTS.md — Parcel Platform API Contracts

## CRITICAL: TRAILING SLASHES
The FastAPI backend has redirect_slashes=False set in backend/main.py.
All API endpoints are registered WITH trailing slashes.
Frontend calls must include trailing slashes or they will 404.
Correct:   /api/v1/deals/
Incorrect: /api/v1/deals

> This file is the source of truth for how the frontend and backend communicate.
> Backend agent: update this file every time you create or change an endpoint.
> Frontend agent: read this file before building any hooks or API calls.
> Ivan: review this file when coordinating between agents.

---

## Base URL

```
Development:  http://localhost:8000
Production:   https://[railway-url].railway.app
```

All endpoints are prefixed with `/api/v1` except `/health`.

---

## Standard Response Shapes

### Success
```json
{
  "data": { },
  "message": "optional success message"
}
```

### Error
```json
{
  "error": "Human readable message",
  "code": "ERROR_CODE_SNAKE_CASE",
  "details": { }
}
```

### Paginated List
```json
{
  "data": [ ],
  "total": 100,
  "page": 1,
  "per_page": 20,
  "has_more": true
}
```

---

## Auth Headers

All protected endpoints require:
```
Authorization: Bearer <access_token>
```

Tokens are JWT, stored in httpOnly cookies on the client.
Frontend sends cookies automatically — no manual header needed for browser requests.

---

## AUTH ENDPOINTS

### POST /api/v1/auth/register
**Status:** 🚀 Deployed to production

Request:
```json
{
  "name": "string",
  "email": "string",
  "password": "string",
  "role": "wholesaler | investor | agent"
}
```

Response `201`:
```json
{
  "user": {
    "id": "uuid",
    "name": "string",
    "email": "string",
    "role": "wholesaler | investor | agent",
    "created_at": "ISO8601"
  },
  "access_token": "string"
}
```

Errors:
- `400 EMAIL_ALREADY_EXISTS` — email is taken
- `400 INVALID_EMAIL` — bad email format
- `400 WEAK_PASSWORD` — password under 8 chars

---

### POST /api/v1/auth/login
**Status:** 🚀 Deployed to production

Request:
```json
{
  "email": "string",
  "password": "string"
}
```

Response `200`:
```json
{
  "user": {
    "id": "uuid",
    "name": "string",
    "email": "string",
    "role": "string"
  },
  "access_token": "string"
}
```

Errors:
- `401 INVALID_CREDENTIALS` — wrong email or password

---

### POST /api/v1/auth/logout
**Status:** 🚀 Deployed to production

Response `200`:
```json
{ "message": "Logged out successfully" }
```

---

### GET /api/v1/auth/me
**Status:** 🚀 Deployed to production
**Auth:** Required

Response `200`:
```json
{
  "id": "uuid",
  "name": "string",
  "email": "string",
  "role": "wholesaler | investor | agent",
  "team_id": "uuid | null",
  "created_at": "ISO8601"
}
```

---

## DEAL ENDPOINTS

### POST /api/v1/deals
**Status:** 🚀 Deployed to production
**Auth:** Required

Request:
```json
{
  "address": "string",
  "zip_code": "string",
  "property_type": "single_family | duplex | triplex | quad | commercial",
  "strategy": "wholesale | creative_finance | brrrr | buy_and_hold | flip",
  "inputs": {
    // strategy-specific fields — see calculator specs below
  }
}
```

Response `201`:
```json
{
  "id": "uuid",
  "address": "string",
  "zip_code": "string",
  "property_type": "string",
  "strategy": "string",
  "inputs": { },
  "outputs": {
    // calculated results — strategy-specific
  },
  "risk_score": 42,
  "status": "saved",
  "created_at": "ISO8601",
  "updated_at": "ISO8601"
}
```

---

### GET /api/v1/deals
**Status:** 🚀 Deployed to production
**Auth:** Required

Query params:
```
?strategy=wholesale
?status=saved|shared
?zip_code=53081
?min_roi=5
?max_roi=20
?page=1
?per_page=20
?sort=created_at|risk_score|roi  (default: created_at desc)
```

Response `200`: Paginated list of deals (see standard paginated shape above)

Each deal item:
```json
{
  "id": "uuid",
  "address": "string",
  "zip_code": "string",
  "strategy": "string",
  "primary_metric_label": "Cash-on-Cash Return",
  "primary_metric_value": 8.4,
  "risk_score": 42,
  "status": "saved | shared",
  "created_at": "ISO8601"
}
```

---

### GET /api/v1/deals/:id
**Status:** 🚀 Deployed to production
**Auth:** Required

Response `200`: Full deal object (same as POST /deals response)

Errors:
- `404 DEAL_NOT_FOUND`
- `403 FORBIDDEN` — deal belongs to another user

---

### PUT /api/v1/deals/:id
**Status:** 🚀 Deployed to production
**Auth:** Required

Request: Partial deal fields to update
Response `200`: Full updated deal object

---

### DELETE /api/v1/deals/:id
**Status:** 🚀 Deployed to production
**Auth:** Required

Soft delete only — sets `deleted_at` timestamp, does not remove from DB.

Response `200`:
```json
{ "message": "Deal archived successfully" }
```

---

### GET /api/v1/deals/:id/share
**Status:** 🚀 Deployed to production
**Auth:** NOT required (public endpoint)

Response `200`: Read-only deal object (subset of fields, no sensitive user data)

---

## PIPELINE ENDPOINTS

### GET /api/v1/pipeline
**Status:** 🚀 Deployed to production
**Auth:** Required

Response `200`:
```json
{
  "data": {
    "lead":             [ /* deal cards */ ],
    "analyzing":        [ /* deal cards */ ],
    "offer_sent":       [ /* deal cards */ ],
    "under_contract":   [ /* deal cards */ ],
    "due_diligence":    [ /* deal cards */ ],
    "closed":           [ /* deal cards */ ],
    "dead":             [ /* deal cards */ ]
  }
}
```

Each pipeline card:
```json
{
  "pipeline_id": "uuid",
  "deal_id": "uuid",
  "address": "string",
  "strategy": "string",
  "asking_price": 150000,
  "stage": "string",
  "days_in_stage": 4,
  "entered_stage_at": "ISO8601"
}
```

---

### POST /api/v1/pipeline
**Status:** 🚀 Deployed to production
**Auth:** Required

Request:
```json
{
  "deal_id": "uuid",
  "stage": "lead | analyzing | offer_sent | under_contract | due_diligence | closed | dead"
}
```

Response `201`: Pipeline entry object

---

### PUT /api/v1/pipeline/:id/stage
**Status:** 🚀 Deployed to production
**Auth:** Required

Request:
```json
{
  "stage": "string",
  "notes": "optional string"
}
```

Response `200`: Updated pipeline entry

---

### DELETE /api/v1/pipeline/:id
**Status:** 🚀 Deployed to production
**Auth:** Required

Response `200`:
```json
{ "message": "Removed from pipeline" }
```

---

## DASHBOARD ENDPOINTS

### GET /api/v1/dashboard/stats/
**Status:** 🚀 Deployed to production
**Auth:** Required

Response `200`:
```json
{
  "total_deals": 12,
  "active_pipeline_deals": 5,
  "deals_by_strategy": {
    "wholesale": 4,
    "creative_finance": 2,
    "brrrr": 3,
    "buy_and_hold": 2,
    "flip": 1
  },
  "pipeline_by_stage": {
    "lead": 2,
    "analyzing": 1,
    "offer_sent": 1,
    "under_contract": 0,
    "due_diligence": 1,
    "closed": 3,
    "dead": 1
  },
  "recent_deals": [
    {
      "id": "uuid",
      "address": "123 Main St",
      "strategy": "wholesale",
      "risk_score": 42,
      "status": "saved",
      "created_at": "ISO8601",
      "outputs": {}
    }
  ]
}
```

Notes:
- `deals_by_strategy` always includes all 5 strategies (defaulting to 0)
- `pipeline_by_stage` always includes all 7 stages (defaulting to 0)
- `active_pipeline_deals` = sum of all pipeline stages except "closed" and "dead"
- `recent_deals` returns the 5 most recent deals (newest first)
- Only non-deleted deals are counted

---

## DOCUMENT ENDPOINTS

### POST /api/v1/documents/upload
**Status:** ⬜ Not built yet
**Auth:** Required
**Content-Type:** `multipart/form-data`

Form fields:
```
file: File (PDF or DOCX, max 20MB)
doc_type: purchase_agreement | lease | assignment | subject_to | seller_finance | other
deal_id: uuid (optional — link to a deal)
```

Response `202` (accepted, processing async):
```json
{
  "id": "uuid",
  "filename": "string",
  "doc_type": "string",
  "processing_status": "pending",
  "created_at": "ISO8601"
}
```

---

### GET /api/v1/documents
**Status:** ⬜ Not built yet
**Auth:** Required

Response `200`: List of documents with processing status

Each item:
```json
{
  "id": "uuid",
  "filename": "string",
  "doc_type": "string",
  "processing_status": "pending | processing | ready | error",
  "deal_id": "uuid | null",
  "created_at": "ISO8601"
}
```

---

### GET /api/v1/documents/:id
**Status:** ⬜ Not built yet
**Auth:** Required

Response `200`:
```json
{
  "id": "uuid",
  "filename": "string",
  "doc_type": "string",
  "processing_status": "ready",
  "ai_summary": "Plain English summary of the document...",
  "ai_risk_flags": [
    {
      "clause": "string",
      "severity": "low | medium | high",
      "explanation": "string"
    }
  ],
  "ai_key_terms": [
    {
      "term": "string",
      "value": "string",
      "page": 2
    }
  ],
  "deal_id": "uuid | null",
  "created_at": "ISO8601"
}
```

---

### POST /api/v1/documents/:id/chat
**Status:** ⬜ Not built yet
**Auth:** Required

Request:
```json
{
  "message": "string",
  "history": [
    { "role": "user",      "content": "string" },
    { "role": "assistant", "content": "string" }
  ]
}
```

Response: SSE stream (text/event-stream)
```
data: {"delta": "Here"}
data: {"delta": " is"}
data: {"delta": " the answer..."}
data: {"done": true}
```

---

## CHAT ENDPOINTS

### POST /api/v1/chat
**Status:** 🚀 Deployed to production
**Auth:** Required

Request:
```json
{
  "message": "string",
  "context_type": "general | deal | document",
  "context_id": "uuid | null",
  "history": [
    { "role": "user",      "content": "string" },
    { "role": "assistant", "content": "string" }
  ]
}
```

Response: SSE stream (same format as document chat)

---

### GET /api/v1/chat/history
**Status:** 🚀 Deployed to production
**Auth:** Required

Response `200`: Last 50 messages for current user session

---

## PORTFOLIO ENDPOINTS

### GET /api/v1/portfolio
**Status:** ⬜ Not built yet
**Auth:** Required

Response `200`:
```json
{
  "summary": {
    "total_equity": 450000,
    "total_monthly_cash_flow": 2840,
    "total_deals_closed": 7,
    "avg_annualized_return": 14.2,
    "total_profit": 187000
  },
  "entries": [ /* portfolio entry objects */ ]
}
```

Each entry:
```json
{
  "id": "uuid",
  "deal_id": "uuid",
  "address": "string",
  "strategy": "string",
  "closed_date": "ISO8601",
  "closed_price": 185000,
  "profit": 28000,
  "monthly_cash_flow": 420,
  "notes": "string | null"
}
```

---

### POST /api/v1/portfolio
**Status:** ⬜ Not built yet
**Auth:** Required

Request:
```json
{
  "deal_id": "uuid",
  "closed_date": "ISO8601",
  "closed_price": 185000,
  "profit": 28000,
  "monthly_cash_flow": 420,
  "notes": "optional string"
}
```

Response `201`: Portfolio entry object

---

## TEAM ENDPOINTS

### POST /api/v1/teams
**Status:** ⬜ Not built yet
**Auth:** Required

Request:
```json
{ "name": "string" }
```

Response `201`:
```json
{
  "id": "uuid",
  "name": "string",
  "created_by": "uuid",
  "created_at": "ISO8601"
}
```

---

### GET /api/v1/teams/me
**Status:** ⬜ Not built yet
**Auth:** Required

Response `200`:
```json
{
  "id": "uuid",
  "name": "string",
  "members": [
    {
      "user_id": "uuid",
      "name": "string",
      "email": "string",
      "role": "owner | analyst | viewer",
      "joined_at": "ISO8601"
    }
  ]
}
```

---

### POST /api/v1/teams/invite
**Status:** ⬜ Not built yet
**Auth:** Required (owner only)

Request:
```json
{
  "email": "string",
  "role": "analyst | viewer"
}
```

Response `200`:
```json
{ "message": "Invite sent to email@example.com" }
```

---

### PUT /api/v1/teams/members/:id/role
**Status:** ⬜ Not built yet
**Auth:** Required (owner only)

Request:
```json
{ "role": "analyst | viewer" }
```

Response `200`: Updated member object

---

### DELETE /api/v1/teams/members/:id
**Status:** ⬜ Not built yet
**Auth:** Required (owner only)

Response `200`:
```json
{ "message": "Member removed from team" }
```

---

## CALCULATOR INPUT SPECS
> Frontend uses these to build the analyzer forms.
> Backend uses these to validate incoming deal inputs.

NOTE: wholesale.py and risk_score.py are fully implemented and deployed. buy_and_hold.py, flip.py, brrrr.py, and creative_finance.py are not yet implemented — backend returns 422 CALCULATOR_NOT_IMPLEMENTED for these strategies.

### Wholesale
```json
{
  "arv": 200000,
  "repair_costs": 30000,
  "desired_profit": 20000,
  "holding_costs": 5000,
  "closing_costs_pct": 3.0,
  "asking_price": 120000
}
```

### Creative Finance
```json
{
  "existing_loan_balance": 140000,
  "existing_interest_rate": 3.5,
  "monthly_piti": 1100,
  "monthly_rent_estimate": 1800,
  "monthly_expenses": 400,
  "finance_type": "subject_to | seller_finance",
  "new_rate": 6.0,
  "new_term_years": 30,
  "arv": 160000
}
```

### BRRRR
```json
{
  "purchase_price": 80000,
  "rehab_costs": 40000,
  "arv_post_rehab": 160000,
  "refinance_ltv_pct": 75,
  "new_loan_rate": 7.0,
  "new_loan_term_years": 30,
  "monthly_rent": 1600,
  "monthly_expenses": 500
}
```

### Buy & Hold
```json
{
  "purchase_price": 150000,
  "down_payment_pct": 20,
  "interest_rate": 7.0,
  "loan_term_years": 30,
  "monthly_rent": 1500,
  "monthly_taxes": 200,
  "monthly_insurance": 100,
  "vacancy_rate_pct": 8,
  "maintenance_pct": 5,
  "mgmt_fee_pct": 8
}
```

### Flip
```json
{
  "purchase_price": 100000,
  "rehab_budget": 35000,
  "arv": 175000,
  "holding_months": 6,
  "selling_costs_pct": 8,
  "financing_costs": 8000
}
```

---

## STATUS LEGEND

Use these statuses in comments next to each endpoint as you build:

- ⬜ Not built yet
- 🔨 In progress
- ✅ Built and tested locally
- 🚀 Deployed to production
