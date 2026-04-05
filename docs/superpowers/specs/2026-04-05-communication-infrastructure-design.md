# Communication Infrastructure + Two-Way SMS/Email — Design Spec

## Overview

Replace manual-only communication logging with real two-way SMS (Twilio) and email (SendGrid, swappable). Adds provider abstraction, webhook handlers for inbound messages and delivery tracking, conversation thread UI, and A2P 10DLC compliance info page.

## Design System

Same as all prior sprints — no new tokens.

## Architecture Decisions

- **Provider abstraction**: Base classes for SMS and email providers. Twilio SMS and SendGrid email are first implementations. Swappable without changing service layer.
- **httpx over SDKs**: Use httpx for both Twilio and SendGrid API calls. No new heavy dependencies. httpx is already in the project.
- **Communication model extended, not replaced**: Add delivery tracking fields to existing Communication model. Existing records get `status = "logged"` — they're manual activity logs. New real messages start at `queued`.
- **Webhook router is separate**: `/api/webhooks/communications` prefix. No auth — validated by provider signatures instead.
- **Contact matching for inbound**: Phone normalized to digits-only for fuzzy match. Email exact match. Unmatched inbound messages still logged (contact_id = null).
- **Thread view coexists with activity log**: ContactDetailPage shows conversation thread for SMS/email messages and keeps the existing log for calls/meetings/notes.

---

## 1. Backend: Communication Model Updates

Modify: `backend/models/communications.py`

Add columns:

```
external_id       String, nullable    — Twilio MessageSid or SendGrid message ID
status            String, default "logged"  — logged | queued | sent | delivered | failed | bounced | opened | clicked
status_updated_at DateTime, nullable
error_message     String, nullable
cost_cents        Integer, nullable   — SMS cost in cents (e.g. 1 for $0.0079 rounded)
metadata          JSONB, nullable     — delivery details, open/click tracking, segments count
```

Migration adds columns with defaults. Existing rows get `status = "logged"`.

---

## 2. Backend: Provider Base Classes

Create: `backend/core/communications/__init__.py` (empty)
Create: `backend/core/communications/base.py`

```python
class BaseSMSProvider:
    async def send(self, to_phone: str, body: str, from_number: str) -> dict:
        """Send SMS. Returns {external_id, status, cost_cents, segments}."""
        raise NotImplementedError

    def validate_webhook(self, request_body: bytes, signature: str, url: str) -> bool:
        """Validate incoming webhook signature."""
        raise NotImplementedError

    def parse_incoming(self, payload: dict) -> dict:
        """Parse incoming SMS webhook. Returns {from_phone, body, external_id}."""
        raise NotImplementedError

    def parse_status(self, payload: dict) -> dict:
        """Parse status callback. Returns {external_id, status, error_message?}."""
        raise NotImplementedError


class BaseEmailProvider:
    async def send(self, to_email: str, subject: str, body_html: str, body_text: str, from_email: str, reply_to: str | None = None) -> dict:
        """Send email. Returns {external_id, status}."""
        raise NotImplementedError

    def validate_webhook(self, request_body: bytes, signature: str) -> bool:
        """Validate incoming webhook signature."""
        raise NotImplementedError

    def parse_incoming(self, payload: dict) -> dict:
        """Parse inbound email. Returns {from_email, subject, body, external_id}."""
        raise NotImplementedError

    def parse_events(self, payload: list[dict]) -> list[dict]:
        """Parse event webhook. Returns [{external_id, event_type, timestamp, metadata}]."""
        raise NotImplementedError
```

---

## 3. Backend: Twilio SMS Provider

Create: `backend/core/communications/twilio_sms.py`

Implements `BaseSMSProvider`.

### send()
- POST to `https://api.twilio.com/2010-04-01/Accounts/{SID}/Messages.json`
- Auth: HTTP Basic with account_sid:auth_token
- Body: `From`, `To` (E.164), `Body`, `StatusCallback` (our webhook URL)
- Returns: `{external_id: MessageSid, status: "queued", cost_cents: 1, segments: N}`
- Error handling: catch 400 (invalid number), 429 (rate limit), 500 (Twilio down)

### validate_webhook()
- Implements Twilio request validation: sort POST params, build validation string, HMAC-SHA1 with auth_token, compare to X-Twilio-Signature header
- Reference: https://www.twilio.com/docs/usage/security#validating-requests

### parse_incoming()
- Extract: `From`, `Body`, `MessageSid` from form-encoded POST

### parse_status()
- Extract: `MessageSid`, `MessageStatus` (queued/sent/delivered/undelivered/failed), `ErrorCode`
- Map ErrorCode to human-readable error_message

### Phone normalization
- `normalize_phone(phone: str) -> str`: strip all non-digit chars, prepend +1 if 10 digits, validate E.164 format
- Used before sending and for contact matching

Env vars: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`, `TWILIO_STATUS_CALLBACK_URL`

---

## 4. Backend: SendGrid Email Provider

Create: `backend/core/communications/sendgrid_email.py`

Implements `BaseEmailProvider`.

### send()
- POST to `https://api.sendgrid.com/v3/mail/send`
- Auth: Bearer token (SENDGRID_API_KEY)
- Body: JSON with personalizations, from, subject, content (text/plain + text/html)
- Open/click tracking enabled via tracking_settings
- Returns: `{external_id: x-message-id header, status: "queued"}`

### validate_webhook()
- SendGrid Event Webhook uses signature verification with a verification key
- Verify using the Event Webhook Verification Key + ECDSA signature

### parse_incoming()
- SendGrid Inbound Parse posts multipart form data
- Extract: `from`, `subject`, `text`, `html`, `headers` (for Message-ID)

### parse_events()
- Batch events array, each with: `event` (delivered/bounce/open/click/dropped/spamreport), `sg_message_id`, `timestamp`
- Map to our status enum

Env vars: `SENDGRID_API_KEY`, `SENDGRID_WEBHOOK_VERIFICATION_KEY`, `DEFAULT_FROM_EMAIL`

---

## 5. Backend: Communication Service

Create: `backend/core/communications/service.py`

```python
class CommunicationService:
    def __init__(self, db: Session, sms_provider: BaseSMSProvider, email_provider: BaseEmailProvider):
        ...

    async def send_sms(self, to_phone, body, from_user_id, contact_id=None, deal_id=None, property_id=None) -> Communication:
        # 1. Normalize phone
        # 2. Call sms_provider.send()
        # 3. Create Communication record: channel="sms", direction="outbound", status=result.status, external_id=result.external_id
        # 4. Return Communication

    async def send_email(self, to_email, subject, body_html, body_text, from_user_id, from_email=None, reply_to=None, contact_id=None, deal_id=None, property_id=None) -> Communication:
        # 1. Call email_provider.send()
        # 2. Create Communication record: channel="email", direction="outbound"
        # 3. Return Communication

    def handle_incoming_sms(self, from_phone, body, external_id) -> Communication:
        # 1. Normalize phone
        # 2. Match contact by phone (fuzzy: digits-only comparison)
        # 3. Create Communication: channel="sms", direction="inbound", contact_id=matched or None
        # 4. Return Communication

    def handle_incoming_email(self, from_email, subject, body, external_id) -> Communication:
        # 1. Match contact by email (exact, case-insensitive)
        # 2. Create Communication: channel="email", direction="inbound"
        # 3. Return Communication

    def update_delivery_status(self, external_id, status, error_message=None) -> Communication | None:
        # 1. Find Communication by external_id
        # 2. Update status, status_updated_at, error_message
        # 3. If failed: create Task for the user ("SMS to [contact] failed")
        # 4. Return Communication

    def match_contact_by_phone(self, phone, user_id) -> Contact | None:
        # Normalize to digits, query contacts with digit-only phone comparison
        # Filter: created_by = user_id, is_deleted = False

    def match_contact_by_email(self, email, user_id) -> Contact | None:
        # Case-insensitive exact match on Contact.email
```

### Contact Matching for Inbound

For inbound SMS, we need to determine which user the message belongs to. The Twilio phone number is per-account (shared across users for now). Matching strategy:
1. Normalize inbound phone to digits-only
2. Query ALL contacts (across all users) where phone digits match
3. If exactly one match: assign to that user's contact
4. If multiple matches (different users): log without contact_id (ambiguous)
5. If no match: log without contact_id

Future: per-user Twilio numbers resolve ambiguity.

---

## 6. Backend: Communication Schemas

Create: `backend/schemas/communications.py`

```
SendSMSRequest:
    contact_id: UUID
    body: str (min_length=1, max_length=1600)  — 10 SMS segments max
    deal_id: UUID | None
    property_id: UUID | None

SendEmailRequest:
    contact_id: UUID
    subject: str (min_length=1)
    body_html: str (min_length=1)
    body_text: str | None
    deal_id: UUID | None
    property_id: UUID | None

CommunicationResponse:
    id: UUID
    channel: str
    direction: str | None
    subject: str | None
    body: str | None
    status: str
    error_message: str | None
    external_id: str | None
    contact_id: UUID | None
    deal_id: UUID | None
    property_id: UUID | None
    occurred_at: str
    created_at: str

ThreadResponse:
    contact: {id, name, phone, email}
    messages: list[CommunicationResponse]
    total: int
```

---

## 7. Backend: Communications Router

Create: `backend/routers/communications.py`
Register in: `backend/main.py` at `/api` prefix.

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/communications/send-sms` | Send SMS to a contact |
| POST | `/communications/send-email` | Send email to a contact |
| GET | `/communications/thread/{contact_id}` | Conversation thread |

### POST /communications/send-sms

1. Validate contact ownership and has phone number
2. Validate body length (1-1600 chars)
3. Call CommunicationService.send_sms()
4. PostHog: `sms_sent`
5. Return CommunicationResponse

### POST /communications/send-email

1. Validate contact ownership and has email
2. Call CommunicationService.send_email()
3. PostHog: `email_sent`
4. Return CommunicationResponse

### GET /communications/thread/{contact_id}

1. Validate contact ownership
2. Query all Communications for this contact, ordered by occurred_at ASC
3. Return ThreadResponse with contact info + messages

---

## 8. Backend: Webhook Router

Create: `backend/routers/webhooks/communications.py`
Register in: `backend/main.py` at `/api/webhooks/communications` prefix.

No auth dependency — validated by provider signatures.

### POST /twilio/incoming

1. Validate Twilio signature (reject forged requests)
2. Parse: From, Body, MessageSid
3. Call CommunicationService.handle_incoming_sms()
4. PostHog: `sms_received`
5. Return TwiML empty response: `<?xml version="1.0"?><Response></Response>`

### POST /twilio/status

1. Validate Twilio signature
2. Parse: MessageSid, MessageStatus, ErrorCode
3. Call CommunicationService.update_delivery_status()
4. PostHog: `delivery_status_updated`
5. Return 200

### POST /sendgrid/incoming

1. Validate SendGrid signature (if configured)
2. Parse inbound email from multipart form
3. Call CommunicationService.handle_incoming_email()
4. PostHog: `email_received`
5. Return 200

### POST /sendgrid/events

1. Validate SendGrid Event Webhook signature
2. Parse events array
3. For each event: call CommunicationService.update_delivery_status() with mapped status
4. Return 200

---

## 9. Frontend: Types + API + Hooks

### Types (add to `types/index.ts`)

```typescript
interface SendSMSRequest {
  contact_id: string
  body: string
  deal_id?: string
  property_id?: string
}

interface SendEmailRequest {
  contact_id: string
  subject: string
  body_html: string
  body_text?: string
  deal_id?: string
  property_id?: string
}

interface ThreadMessage {
  id: string
  channel: 'sms' | 'email' | 'call' | 'meeting' | 'note' | 'packet'
  direction: 'inbound' | 'outbound' | null
  subject: string | null
  body: string | null
  status: 'logged' | 'queued' | 'sent' | 'delivered' | 'failed' | 'bounced' | 'opened' | 'clicked'
  error_message: string | null
  external_id: string | null
  contact_id: string | null
  deal_id: string | null
  property_id: string | null
  occurred_at: string
  created_at: string
}

interface ThreadContact {
  id: string
  name: string
  phone: string | null
  email: string | null
}

interface ThreadResponse {
  contact: ThreadContact
  messages: ThreadMessage[]
  total: number
}
```

### API Namespace

```typescript
api.communications = {
  sendSMS: (data) => POST /api/communications/send-sms,
  sendEmail: (data) => POST /api/communications/send-email,
  thread: (contactId) => GET /api/communications/thread/:contactId,
}
```

### Hooks (`hooks/useCommunications.ts`)

- `useThread(contactId)` — queryKey: `['communications', 'thread', contactId]`
- `useSendSMS()` — invalidates `['communications']`, `['contacts']`
- `useSendEmail()` — invalidates `['communications']`, `['contacts']`

---

## 10. Frontend: Conversation Thread

Create: `frontend/src/components/communications/ConversationThread.tsx`

iMessage-style conversation view:

### Layout
```
Messages area (scrollable, flex-col)
  Incoming message: left-aligned, dark card bg-[#141311]
  Outgoing message: right-aligned, violet bubble bg-[#8B7AFF]/15
  Each: body text + timestamp + status badge + channel icon
Compose area (bottom, sticky)
  Channel toggle: SMS | Email
  SMS: textarea (auto-grow) + char counter + Send button
  Email: subject input + body textarea + Send button
```

### Message Bubble

- Outgoing (direction="outbound"): right-aligned, `bg-[#8B7AFF]/15 border-[#8B7AFF]/30`
- Incoming (direction="inbound"): left-aligned, `bg-[#141311] border-[#1E1D1B]`
- Body text: `text-sm text-[#F0EDE8]`
- Timestamp: `text-[10px] text-[#8A8580]`
- Status badge: inline after timestamp
- Channel icon: small SMS or Email icon

### Auto-scroll
- Scroll to bottom on mount and when new messages arrive
- Use `useRef` on messages container + `scrollIntoView({ behavior: 'smooth' })`

### Compose Area

- SMS mode: textarea with char counter showing `{length}/160` (warn at >160 = multiple segments)
- Email mode: subject input + body textarea
- Send button: violet, disabled when empty or sending
- Enter to send (SMS only), Ctrl+Enter for email

---

## 11. Frontend: Status Badge

Create: `frontend/src/components/communications/StatusBadge.tsx`

Small inline badge:

| Status | Color | Icon |
|--------|-------|------|
| logged | gray (#8A8580) | Edit3 |
| queued | gray | Clock |
| sent | muted blue (#60A5FA) | Check |
| delivered | green (#4ADE80) | CheckCheck |
| opened | blue (#60A5FA) | Eye |
| clicked | violet (#8B7AFF) | ExternalLink |
| failed | red (#EF4444) | AlertCircle + tooltip with error_message |
| bounced | red (#EF4444) | XCircle |

Size: `text-[10px]` with icon 10px. Inline display.

---

## 12. Frontend: Contact Detail Integration

Modify: `frontend/src/pages/contacts/ContactDetailPage.tsx`

### Changes

1. Add "Send Message" button next to existing action buttons
2. Replace the CommunicationLog section with ConversationThread when contact has phone or email
3. Keep LogActivityForm for manual logging (calls, meetings, notes)
4. Show both: ConversationThread (top) + LogActivityForm (below, collapsed by default)

### Send Message Flow

"Send Message" button → scrolls to compose area at bottom of ConversationThread (no modal needed — inline compose is better for conversation flow).

---

## 13. Frontend: A2P Compliance Section

Modify: `frontend/src/pages/settings/SettingsPage.tsx` (add section, not new page)

### SMS Compliance Card

Add a card in Settings for SMS compliance:

```
SMS Compliance
Status: Not Registered (red) | Pending (yellow) | Approved (green)

To send SMS at scale, US regulations require A2P 10DLC brand registration.

[Register Your Brand] button → expands form:
  - Business name
  - Business type dropdown (Sole Proprietor, LLC, Corporation, Partnership)
  - EIN (optional)
  - Business address
  - Website
  - Use case: pre-filled "Real estate investor communications with property sellers and buyers"

Submit → saves to user settings, shows "Registration info saved. Contact support to complete Twilio registration."
```

For MVP: info collection only. Actual Twilio registration is manual. The compliance status is stored in user settings/metadata.

### SMS Warning on Compose

In ConversationThread compose area, show a warning banner when SMS is selected and brand is not registered:
"Unregistered numbers have lower delivery rates and daily limits. Register your brand in Settings."

---

## 14. PostHog Events

- `sms_sent` — `{contact_id, body_length, has_deal, has_property}`
- `email_sent` — `{contact_id, has_subject, body_length}`
- `sms_received` — `{matched_contact: boolean}`
- `email_received` — `{matched_contact: boolean}`
- `delivery_status_updated` — `{channel, status}`
- `conversation_thread_viewed` — `{contact_id, message_count}`
- `compose_channel_switched` — `{from, to}`

---

## Definition of Done

- [ ] Communication model extended with delivery tracking fields + migration
- [ ] Provider base classes + Twilio SMS provider + SendGrid email provider
- [ ] CommunicationService orchestrates sending, receiving, status tracking
- [ ] Webhook endpoints for Twilio incoming/status and SendGrid incoming/events
- [ ] Twilio webhook signature validation
- [ ] Send SMS and Send Email endpoints with contact validation
- [ ] Conversation thread endpoint returns chronological messages
- [ ] ConversationThread component (iMessage-style bubbles)
- [ ] StatusBadge component for delivery status
- [ ] Contact detail page integration (thread + compose)
- [ ] A2P compliance info section in Settings
- [ ] Frontend build clean
- [ ] Backend syntax clean
