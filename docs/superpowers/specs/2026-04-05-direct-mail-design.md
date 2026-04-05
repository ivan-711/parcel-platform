# Direct Mail (Lob Integration) — Design Spec

## Overview

Add direct mail campaigns — send postcards and letters to property owners via Lob API. Includes campaign builder with 4-step flow, address verification, template personalization, batch sending via Dramatiq, delivery tracking, and quick-send from property/contact detail pages.

## Design System

Same as all prior sprints — no new tokens.

## Architecture Decisions

- **LobProvider follows batchdata_provider pattern**: async/sync duals, MailSendResult dataclass, error classification, retry on 5xx, DataSourceEvent cost logging.
- **Lob auth is HTTP Basic**: API key as username, empty password. Test key for dev, live key for production.
- **Campaign status state machine**: draft → scheduled → sending → sent. Cancelled is a terminal state reachable from draft or scheduled.
- **Template rendering reuses sequence pattern**: `{{variable}}` regex replacement. Plain HTML textarea, no rich editor dependency.
- **Address verification is a separate step**: Verify addresses before sending. Undeliverable addresses are flagged but not auto-removed — user decides.
- **Sending is async via Dramatiq**: Campaign send dispatches a task that iterates recipients and calls Lob per piece.
- **Router prefix**: `/api/mail-campaigns`

---

## 1. Backend: Lob Provider

Create: `backend/core/direct_mail/__init__.py` (empty)
Create: `backend/core/direct_mail/lob_provider.py`

### MailSendResult Dataclass

```python
@dataclass
class MailSendResult:
    status: str  # success | failed | timeout | auth_error | rate_limited
    lob_id: str | None = None  # Lob mail piece ID (psc_xxx or ltr_xxx)
    expected_delivery: str | None = None  # ISO date
    cost_cents: int = 0
    raw_response: dict | None = None
    error: str | None = None
    latency_ms: int = 0
```

### AddressVerifyResult Dataclass

```python
@dataclass
class AddressVerifyResult:
    deliverability: str  # deliverable | deliverable_missing_unit | undeliverable | no_match
    primary_line: str | None = None
    city: str | None = None
    state: str | None = None
    zip_code: str | None = None
    error: str | None = None
```

### Methods

**`async verify_address(address: dict) -> AddressVerifyResult`**
- POST to `https://api.lob.com/v1/us_verifications`
- Body: `{"primary_line": address["line1"], "city": address["city"], "state": address["state"], "zip_code": address["zip"]}`
- Auth: HTTP Basic (api_key, "")
- Returns deliverability status + standardized address

**`async send_postcard(to_address, front_html, back_html, from_address, size="4x6") -> MailSendResult`**
- POST to `https://api.lob.com/v1/postcards`
- Body includes: `to`, `from`, `front` (HTML), `back` (HTML), `size` (4x6/6x9/6x11)
- Returns Lob postcard ID, expected delivery date, cost

**`async send_letter(to_address, html_content, from_address) -> MailSendResult`**
- POST to `https://api.lob.com/v1/letters`
- Body includes: `to`, `from`, `file` (HTML content), `color` (false for B&W)
- Returns Lob letter ID, expected delivery, cost

**`async get_status(lob_id) -> dict`**
- GET to `https://api.lob.com/v1/postcards/{id}` or `/letters/{id}` (detect from prefix)
- Returns tracking events array

**Sync versions** of send_postcard and send_letter for Dramatiq tasks.

### Cost Constants

```python
COST_CENTS_POSTCARD_4X6 = 63   # ~$0.63
COST_CENTS_POSTCARD_6X9 = 84   # ~$0.84
COST_CENTS_LETTER = 105         # ~$1.05
```

Env vars: `LOB_API_KEY`, `LOB_ENV` (test/live, defaults to test)

---

## 2. Backend: Mail Campaign Models + Migration

Create: `backend/models/mail_campaigns.py`

```
mail_campaigns table:
    id              UUID PK (TimestampMixin)
    created_by      UUID FK → users.id, NOT NULL, indexed
    team_id         UUID, nullable

    name            String, NOT NULL
    description     Text, nullable
    status          String, NOT NULL, default "draft"
                    — draft | scheduled | sending | sent | cancelled

    mail_type       String, NOT NULL  — postcard_4x6 | postcard_6x9 | postcard_6x11 | letter

    template_front_html  Text, nullable  — postcard front / letter content
    template_back_html   Text, nullable  — postcard back

    from_address    JSONB, nullable  — {name, line1, city, state, zip}

    scheduled_date  Date, nullable
    sent_at         DateTime, nullable

    total_recipients    Integer, default 0
    total_sent          Integer, default 0
    total_delivered     Integer, default 0
    total_returned      Integer, default 0
    total_cost_cents    Integer, default 0

    deleted_at      DateTime, nullable

mail_recipients table:
    id              UUID PK (TimestampMixin)
    campaign_id     UUID FK → mail_campaigns.id, NOT NULL, indexed
    contact_id      UUID FK → contacts.id, nullable
    property_id     UUID FK → properties.id, nullable

    to_name         String, nullable
    to_address      JSONB, NOT NULL  — {line1, line2, city, state, zip}

    address_verified    Boolean, default False
    deliverability      String, nullable  — deliverable | undeliverable | no_match

    lob_mail_id     String, nullable  — Lob's piece ID
    status          String, NOT NULL, default "pending"
                    — pending | verified | sent | in_transit | delivered | returned | failed

    cost_cents      Integer, nullable

    rendered_front  Text, nullable  — personalized HTML
    rendered_back   Text, nullable

    deleted_at      DateTime, nullable
```

Relationships:
- `MailCampaign.recipients` → one-to-many, cascade
- `MailRecipient.campaign` → back_populates
- `MailRecipient.contact` → relationship
- `MailRecipient.property` → relationship

Register in `__init__.py`. Migration creates both tables with indexes.

---

## 3. Backend: Direct Mail Service

Create: `backend/core/direct_mail/service.py`

```python
class DirectMailService:
    def __init__(self, db: Session, provider: LobProvider):
        ...

    def create_campaign(self, name, mail_type, template_front, template_back, from_address, user_id, team_id=None) -> MailCampaign:
        # Create campaign in draft status

    def add_recipients(self, campaign_id, recipients: list[dict], user_id) -> list[MailRecipient]:
        # recipients: [{contact_id?, property_id?, to_name, to_address: {line1, city, state, zip}}]
        # Create MailRecipient records, update campaign.total_recipients

    async def verify_addresses(self, campaign_id, user_id) -> dict:
        # For each recipient with address_verified=False:
        #   Call provider.verify_address()
        #   Update address_verified, deliverability, standardized address
        # Return: {total, deliverable, undeliverable, no_match}

    async def send_campaign(self, campaign_id, user_id) -> None:
        # 1. Validate campaign is in draft/scheduled status
        # 2. Set status = "sending"
        # 3. For each verified recipient:
        #   a. Render template with recipient context
        #   b. Call provider.send_postcard() or send_letter()
        #   c. Update recipient: lob_mail_id, status="sent", cost_cents
        #   d. Log DataSourceEvent
        # 4. Update campaign: status="sent", sent_at, total_sent, total_cost_cents

    def render_template(self, template: str, context: dict) -> str:
        # Same {{variable}} pattern as SequenceEngine

    def _build_recipient_context(self, recipient: MailRecipient) -> dict:
        # recipient_name, property_address, sender_name, sender_phone, sender_company
```

---

## 4. Backend: Mail Campaign Schemas

Create: `backend/schemas/mail_campaigns.py`

```
CreateCampaignRequest:
    name: str (min_length=1)
    mail_type: str  — postcard_4x6 | postcard_6x9 | postcard_6x11 | letter
    template_front_html: str | None
    template_back_html: str | None
    from_address: dict | None  — {name, line1, city, state, zip}
    description: str | None

UpdateCampaignRequest:
    name: str | None
    template_front_html: str | None
    template_back_html: str | None
    from_address: dict | None
    description: str | None
    scheduled_date: str | None

AddRecipientsRequest:
    recipients: list[RecipientInput] (max 500)

RecipientInput:
    contact_id: UUID | None
    property_id: UUID | None
    to_name: str | None
    to_address: {line1: str, line2?: str, city: str, state: str, zip: str}

CampaignResponse:
    id, name, description, status, mail_type
    template_front_html, template_back_html, from_address
    scheduled_date, sent_at
    total_recipients, total_sent, total_delivered, total_returned, total_cost_cents
    created_at, updated_at

CampaignListItem:
    id, name, status, mail_type
    total_recipients, total_sent, total_delivered, total_returned, total_cost_cents
    scheduled_date, sent_at, created_at

RecipientResponse:
    id, campaign_id, contact_id, property_id
    to_name, to_address
    address_verified, deliverability
    status, cost_cents, lob_mail_id
    created_at

VerifyResponse:
    total: int
    deliverable: int
    undeliverable: int
    no_match: int

CampaignAnalytics:
    total_recipients, total_sent, total_delivered, total_returned
    total_cost_cents
    delivery_rate: float
    return_rate: float

QuickSendRequest:
    mail_type: str
    to_name: str | None
    to_address: dict
    from_address: dict | None
    front_html: str
    back_html: str | None
```

---

## 5. Backend: Mail Campaign Router

Create: `backend/routers/mail_campaigns.py`
Register in: `backend/main.py` at `/api` prefix.

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/mail-campaigns` | Create campaign (draft) |
| GET | `/mail-campaigns` | List campaigns with stats |
| GET | `/mail-campaigns/{id}` | Full campaign with recipients |
| PATCH | `/mail-campaigns/{id}` | Update (draft only) |
| DELETE | `/mail-campaigns/{id}` | Soft delete (draft only) |
| POST | `/mail-campaigns/{id}/recipients` | Add recipients |
| DELETE | `/mail-campaigns/{id}/recipients/{rid}` | Remove recipient |
| POST | `/mail-campaigns/{id}/verify` | Verify addresses via Lob |
| POST | `/mail-campaigns/{id}/send` | Send campaign (async) |
| POST | `/mail-campaigns/{id}/cancel` | Cancel scheduled campaign |
| GET | `/mail-campaigns/{id}/preview` | Render template with sample data |
| GET | `/mail-campaigns/{id}/analytics` | Delivery stats |
| POST | `/mail-campaigns/quick-send` | Send single mail piece |

### Tier Gating

Add `mail_pieces_per_month` to TierLimits:
- Free: 0
- Plus: 0
- Pro: 0
- Business: 100

Use `require_quota("mail_pieces_per_month")` on send and quick-send endpoints.

---

## 6. Backend: Dramatiq Tasks

Create: `backend/core/tasks/mail_campaign.py`

**`send_mail_campaign(campaign_id, user_id)`**
- Load campaign + verified recipients
- For each recipient: render template, call Lob sync, update status
- Update campaign totals

**`check_mail_delivery(campaign_id)`**
- For each sent recipient with lob_mail_id
- Call Lob get_status sync
- Update recipient status (in_transit, delivered, returned)
- Update campaign totals

Register in `__init__.py`.

---

## 7. Frontend: Types + API + Hooks

### Types

```typescript
interface MailCampaignListItem {
  id: string; name: string; status: string; mail_type: string
  total_recipients: number; total_sent: number; total_delivered: number
  total_returned: number; total_cost_cents: number
  scheduled_date: string | null; sent_at: string | null; created_at: string
}

interface MailCampaignDetail extends MailCampaignListItem {
  description: string | null
  template_front_html: string | null; template_back_html: string | null
  from_address: { name?: string; line1: string; city: string; state: string; zip: string } | null
  recipients: MailRecipient[]
}

interface MailRecipient {
  id: string; campaign_id: string; contact_id: string | null; property_id: string | null
  to_name: string | null
  to_address: { line1: string; line2?: string; city: string; state: string; zip: string }
  address_verified: boolean; deliverability: string | null
  status: string; cost_cents: number | null; lob_mail_id: string | null
  created_at: string
}

interface CreateCampaignRequest { name: string; mail_type: string; ... }
interface AddRecipientsRequest { recipients: RecipientInput[] }
interface QuickSendRequest { mail_type: string; to_address: dict; front_html: string; ... }
interface VerifyResponse { total: number; deliverable: number; undeliverable: number; no_match: number }
interface CampaignAnalytics { ... }
```

### API + Hooks

Standard CRUD + action hooks following existing patterns.

---

## 8. Frontend: Unlock Nav + Routes

Remove `locked: true` from Mail Campaigns in nav-data.ts.

Routes:
- `/mail-campaigns` → MailCampaignsPage
- `/mail-campaigns/new` → CampaignBuilderPage
- `/mail-campaigns/:id` → CampaignBuilderPage (edit)
- `/mail-campaigns/:id/analytics` → CampaignAnalyticsPage

---

## 9. Frontend: Mail Campaigns List Page

Create: `frontend/src/pages/mail/MailCampaignsPage.tsx`

Campaign cards with: name, status badge (Draft gray, Scheduled blue, Sending yellow, Sent green, Cancelled red), mail type, stats row, actions.

---

## 10. Frontend: Campaign Builder (4-Step)

Create: `frontend/src/pages/mail/CampaignBuilderPage.tsx`

**Step 1: Setup** — name, mail type selector (cards), from address
**Step 2: Design** — front/back HTML textareas with variable buttons, live preview
**Step 3: Recipients** — add from contacts/skip traces/CSV, verify addresses, deliverability badges
**Step 4: Review** — summary, cost estimate, schedule or send now

---

## 11. Frontend: Campaign Analytics

Create: `frontend/src/pages/mail/CampaignAnalyticsPage.tsx`

Delivery funnel (sent → in_transit → delivered / returned), recipient table with per-row status, cost summary.

---

## 12. Frontend: Quick Send Integration

Add "Send Mail" button on PropertyDetailPage and ContactDetailPage action areas. Opens a modal with mail type, template, preview, and send.

---

## 13. PostHog Events

- `mail_campaign_created` — `{mail_type, recipient_count}`
- `mail_campaign_sent` — `{recipient_count, total_cost_cents}`
- `mail_addresses_verified` — `{total, deliverable, undeliverable}`
- `mail_quick_send` — `{mail_type, source}`

---

## Definition of Done

- [ ] Lob provider with postcard, letter, address verification
- [ ] MailCampaign + MailRecipient models with migration
- [ ] Campaign service: create, recipients, verify, send, delivery check
- [ ] Dramatiq tasks for async sending and delivery polling
- [ ] Full CRUD + send + verify + analytics endpoints
- [ ] Tier gating (Business: 100/mo)
- [ ] Mail Campaigns nav unlocked, routes registered
- [ ] Campaign list page with stats and badges
- [ ] 4-step campaign builder (setup, design, recipients, review)
- [ ] Template editor with variable insertion and preview
- [ ] Campaign analytics with delivery funnel
- [ ] Quick send from property/contact detail
- [ ] Frontend build clean
- [ ] Backend syntax clean
