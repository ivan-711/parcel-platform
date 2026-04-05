# Direct Mail Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add direct mail campaigns — postcards and letters via Lob API with campaign builder, address verification, batch sending, delivery tracking, and quick-send integration.

**Architecture:** LobProvider (httpx, async/sync) → DirectMailService (campaign orchestration) → mail_campaigns router (13 endpoints + tier gating) → Dramatiq tasks (send + delivery poll) → frontend 4-step builder + analytics + quick-send.

**Tech Stack:** FastAPI, SQLAlchemy, httpx, Dramatiq, Pydantic, React 18, TypeScript, TanStack React Query, Tailwind CSS

---

### Task 1: Mail Campaign Models + Migration + Tier Config

**Files:**
- Create: `backend/models/mail_campaigns.py`
- Modify: `backend/models/__init__.py`
- Modify: `backend/core/billing/tier_config.py`
- Create: `backend/alembic/versions/s9t0u1v2w3x4_add_mail_campaigns.py`

- [ ] **Step 1: Create models**

Two models in one file: MailCampaign (campaign template + stats) and MailRecipient (per-recipient tracking). Follow existing model patterns (TimestampMixin, Base, soft delete).

MailCampaign: created_by (UUID FK users.id indexed), team_id, name, description, status (default "draft"), mail_type (postcard_4x6/postcard_6x9/postcard_6x11/letter), template_front_html, template_back_html, from_address (JSONB), scheduled_date (Date), sent_at, total_recipients/sent/delivered/returned/cost_cents (Integer defaults 0), deleted_at. Relationship: recipients (one-to-many cascade).

MailRecipient: campaign_id (UUID FK indexed), contact_id (FK nullable), property_id (FK nullable), to_name, to_address (JSONB NOT NULL), address_verified (Boolean default False), deliverability, lob_mail_id, status (default "pending"), cost_cents, rendered_front, rendered_back, deleted_at. Relationships: campaign back_populates, contact, property.

- [ ] **Step 2: Register in `__init__.py`**

Add imports and `__all__` entries for MailCampaign and MailRecipient.

- [ ] **Step 3: Update tier config**

Add `mail_pieces_per_month: Optional[int]` to TierLimits. Values: Free=0, Plus=0, Pro=0, Business=100.

- [ ] **Step 4: Create migration**

Previous revision: `r8s9t0u1v2w3` (add_skip_traces). Create both tables with indexes on created_by, campaign_id.

- [ ] **Step 5: Verify + Commit**

```bash
cd /Users/ivanflores/parcel-platform/backend && python3 -c "import ast; ast.parse(open('models/mail_campaigns.py').read()); ast.parse(open('core/billing/tier_config.py').read()); print('OK')"
git add backend/models/mail_campaigns.py backend/models/__init__.py backend/core/billing/tier_config.py backend/alembic/versions/s9t0u1v2w3x4_add_mail_campaigns.py
git commit -m "feat: MailCampaign + MailRecipient models, migration, tier config (Business: 100/mo)"
```

---

### Task 2: Lob Provider

**Files:**
- Create: `backend/core/direct_mail/__init__.py`
- Create: `backend/core/direct_mail/lob_provider.py`

- [ ] **Step 1: Create provider**

Follow batchdata_provider.py pattern exactly. Module-level config: `LOB_API_KEY`, `LOB_BASE_URL = "https://api.lob.com/v1"`, `TIMEOUT_SECONDS = 15`. Cost constants: `COST_CENTS = {"postcard_4x6": 63, "postcard_6x9": 84, "postcard_6x11": 95, "letter": 105}`.

Two result dataclasses: `MailSendResult` (status, lob_id, expected_delivery, cost_cents, raw_response, error, latency_ms) and `AddressVerifyResult` (deliverability, primary_line, city, state, zip_code, error).

LobProvider class with:
- `async verify_address(address: dict) -> AddressVerifyResult` — POST to `/us_verifications`
- `async send_postcard(to_address, front_html, back_html, from_address, size="4x6") -> MailSendResult` — POST to `/postcards`
- `async send_letter(to_address, html_content, from_address) -> MailSendResult` — POST to `/letters`
- `async get_status(lob_id) -> dict` — GET piece status
- Sync versions: `send_postcard_sync`, `send_letter_sync` for Dramatiq

Auth: HTTP Basic (`(LOB_API_KEY, "")`) — Lob uses API key as username, empty password.

Lob address format: `{"name": "John Smith", "address_line1": "123 Main St", "address_city": "Milwaukee", "address_state": "WI", "address_zip": "53201"}`

Error classification: same pattern (400→failed, 401→auth_error, 404→not_found, 422→failed, 429→rate_limited).

- [ ] **Step 2: Verify + Commit**

```bash
cd /Users/ivanflores/parcel-platform/backend && python3 -c "from core.direct_mail.lob_provider import LobProvider; print('OK')"
git add backend/core/direct_mail/__init__.py backend/core/direct_mail/lob_provider.py
git commit -m "feat: Lob provider (postcards, letters, address verification, async/sync)"
```

---

### Task 3: Direct Mail Service + Dramatiq Tasks

**Files:**
- Create: `backend/core/direct_mail/service.py`
- Create: `backend/core/tasks/mail_campaign.py`
- Modify: `backend/core/tasks/__init__.py`

- [ ] **Step 1: Create service**

DirectMailService with db + LobProvider. Methods:

- `create_campaign(name, mail_type, template_front, template_back, from_address, user_id, team_id)` → MailCampaign
- `add_recipients(campaign_id, recipients, user_id)` → list[MailRecipient]. Validate campaign ownership, status=draft. Create MailRecipient records. Update total_recipients.
- `async verify_addresses(campaign_id, user_id)` → dict{total, deliverable, undeliverable, no_match}. For each unverified recipient, call provider.verify_address(). Update address_verified, deliverability.
- `async send_single(recipient: MailRecipient, campaign: MailCampaign)` → None. Render template, call send_postcard/letter based on mail_type. Update recipient status, lob_mail_id, cost_cents. 
- `render_template(template, context)` → str. Same `{{variable}}` regex as sequences.
- `_build_context(recipient)` → dict. recipient_name, property_address, sender_name, sender_phone, sender_company from from_address and related records.

- [ ] **Step 2: Create Dramatiq tasks**

Follow skip_trace_batch.py pattern:

`send_mail_campaign(campaign_id, user_id)` — load campaign + verified recipients, iterate and send each via provider sync methods, update totals, set campaign status="sent".

`check_mail_delivery(campaign_id)` — for each sent recipient with lob_mail_id, call provider get_status, update status to in_transit/delivered/returned, update campaign totals.

Register in `__init__.py`: add `from core.tasks import mail_campaign` in REDIS_URL block.

- [ ] **Step 3: Verify + Commit**

```bash
cd /Users/ivanflores/parcel-platform/backend && python3 -c "import ast; ast.parse(open('core/direct_mail/service.py').read()); print('OK')"
git add backend/core/direct_mail/service.py backend/core/tasks/mail_campaign.py backend/core/tasks/__init__.py
git commit -m "feat: DirectMailService + Dramatiq tasks for campaign sending and delivery tracking"
```

---

### Task 4: Schemas + Router

**Files:**
- Create: `backend/schemas/mail_campaigns.py`
- Create: `backend/routers/mail_campaigns.py`
- Modify: `backend/main.py`
- Modify: `backend/.env.example`

- [ ] **Step 1: Create schemas**

All Pydantic schemas: CreateCampaignRequest, UpdateCampaignRequest, AddRecipientsRequest (with RecipientInput), CampaignResponse, CampaignListItem, RecipientResponse, VerifyResponse, CampaignAnalytics, QuickSendRequest.

- [ ] **Step 2: Create router**

13 endpoints at prefix `/mail-campaigns`:

1. POST `/` — create campaign (draft)
2. GET `/` — list campaigns
3. GET `/{id}` — detail with recipients
4. PATCH `/{id}` — update (draft only)
5. DELETE `/{id}` — soft delete (draft only)
6. POST `/{id}/recipients` — add recipients (max 500)
7. DELETE `/{id}/recipients/{rid}` — remove recipient
8. POST `/{id}/verify` — verify addresses via Lob
9. POST `/{id}/send` — send campaign (dispatch Dramatiq task), tier gate: `require_quota("mail_pieces_per_month")`, record_usage per recipient
10. POST `/{id}/cancel` — cancel (only draft/scheduled)
11. GET `/{id}/preview` — render template with sample data
12. GET `/{id}/analytics` — delivery stats
13. POST `/quick-send` — send single mail piece, tier gate

- [ ] **Step 3: Register router + env vars**

Add to main.py imports + registration. Add `LOB_API_KEY=` and `LOB_ENV=test` to .env.example.

- [ ] **Step 4: Verify + Commit**

```bash
cd /Users/ivanflores/parcel-platform/backend && python3 -c "import ast; ast.parse(open('schemas/mail_campaigns.py').read()); ast.parse(open('routers/mail_campaigns.py').read()); print('OK')"
git add backend/schemas/mail_campaigns.py backend/routers/mail_campaigns.py backend/main.py backend/.env.example
git commit -m "feat: mail campaigns router (13 endpoints), tier gating, quick-send"
```

---

### Task 5: Frontend Types + API + Hooks

**Files:**
- Modify: `frontend/src/types/index.ts`
- Modify: `frontend/src/lib/api.ts`
- Create: `frontend/src/hooks/useMailCampaigns.ts`

- [ ] **Step 1: Add types**

MailCampaignListItem, MailCampaignDetail, MailRecipient, CreateCampaignRequest, AddRecipientsRequest, RecipientInput, VerifyResponse, CampaignAnalytics, QuickSendRequest.

- [ ] **Step 2: Add API namespace**

`api.mailCampaigns = { list, get, create, update, delete, addRecipients, removeRecipient, verify, send, cancel, preview, analytics, quickSend }`

- [ ] **Step 3: Create hooks**

useMailCampaigns, useMailCampaign(id), useCreateCampaign, useUpdateCampaign, useDeleteCampaign, useAddRecipients, useRemoveRecipient, useVerifyAddresses, useSendCampaign, useCancelCampaign, useCampaignAnalytics, useQuickSend.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/types/index.ts frontend/src/lib/api.ts frontend/src/hooks/useMailCampaigns.ts
git commit -m "feat: mail campaign types, API namespace, and React Query hooks"
```

---

### Task 6: Nav + Routes + Campaign List Page

**Files:**
- Modify: `frontend/src/components/layout/nav-data.ts`
- Modify: `frontend/src/App.tsx`
- Create: `frontend/src/pages/mail/MailCampaignsPage.tsx`

- [ ] **Step 1: Unlock nav + add routes**

Remove `locked: true` from Mail Campaigns. Add lazy imports and routes: `/mail-campaigns`, `/mail-campaigns/new`, `/mail-campaigns/:id`, `/mail-campaigns/:id/analytics`.

- [ ] **Step 2: Create list page**

Campaign cards with: name, status badge (Draft gray, Scheduled blue, Sending yellow, Sent green, Cancelled red), mail type label, stats row, sent/scheduled date, actions (Edit, Send, Analytics, Delete). Empty state. AppShell wrapper.

- [ ] **Step 3: Verify + Commit**

```bash
cd /Users/ivanflores/parcel-platform/frontend && npx vite build 2>&1 | tail -5
git add frontend/src/components/layout/nav-data.ts frontend/src/App.tsx frontend/src/pages/mail/MailCampaignsPage.tsx
git commit -m "feat: mail campaigns list page with status badges and stats"
```

---

### Task 7: Campaign Builder Page (4-Step)

**Files:**
- Create: `frontend/src/pages/mail/CampaignBuilderPage.tsx`

- [ ] **Step 1: Create the builder**

4-step flow managed with local state:

**Step 1 — Setup**: name input, mail type selector (4 cards: Postcard 4x6, 6x9, 6x11, Letter), from address fields (name, line1, city, state, zip — pre-fill from user.brand_kit if available).

**Step 2 — Design**: front template textarea (full width) + back template textarea (postcards only). Variable insertion buttons: {{recipient_name}}, {{property_address}}, {{sender_name}}, {{sender_phone}}, {{sender_company}}. Live preview below each textarea rendered with sample data. Insert at cursor via textarea ref + selectionStart.

**Step 3 — Recipients**: "Add from Contacts" button (dropdown of contacts with addresses), "Add from Skip Traces" (dropdown of found traces with mailing addresses), "Add from CSV" (file upload). Recipients table: name, address, verified status, deliverability badge, remove button. "Verify All Addresses" button calls verify endpoint. Count of deliverable/undeliverable.

**Step 4 — Review**: campaign summary card, template preview, recipient count, estimated cost (mail_type cost × verified recipients), schedule date picker or "Send Now" button.

For new campaigns: create campaign on Step 1 save (POST), then add recipients/verify/send as separate API calls. Navigate between steps with state tracking. Show step progress indicator (same pattern as AddBuyerModal).

Dark theme. Satoshi 300 headings. AppShell wrapper.

- [ ] **Step 2: Verify + Commit**

```bash
cd /Users/ivanflores/parcel-platform/frontend && npx vite build 2>&1 | tail -5
git add frontend/src/pages/mail/CampaignBuilderPage.tsx
git commit -m "feat: 4-step mail campaign builder (setup, design, recipients, review)"
```

---

### Task 8: Campaign Analytics + Quick Send

**Files:**
- Create: `frontend/src/pages/mail/CampaignAnalyticsPage.tsx`
- Modify: `frontend/src/pages/properties/PropertyDetailPage.tsx`
- Modify: `frontend/src/pages/contacts/ContactDetailPage.tsx`

- [ ] **Step 1: Create analytics page**

Route: `/mail-campaigns/:id/analytics`. Shows: delivery funnel (Sent → In Transit → Delivered / Returned as horizontal bars), recipient table with per-row status badges, cost summary card. Use useCampaignAnalytics hook.

- [ ] **Step 2: Add quick-send to PropertyDetailPage**

Add "Send Mail" button in action buttons. On click: opens a simple modal (or navigates to `/mail-campaigns/new` with property pre-selected). For MVP, just link to the campaign builder.

- [ ] **Step 3: Add quick-send to ContactDetailPage**

Same pattern — "Send Mail" button that links to campaign builder.

- [ ] **Step 4: Verify + Commit**

```bash
cd /Users/ivanflores/parcel-platform/frontend && npx vite build 2>&1 | tail -5
git add frontend/src/pages/mail/CampaignAnalyticsPage.tsx frontend/src/pages/properties/PropertyDetailPage.tsx frontend/src/pages/contacts/ContactDetailPage.tsx
git commit -m "feat: campaign analytics page + quick-send buttons on property/contact detail"
```

---

### Task 9: Final Verification

- [ ] **Step 1: Backend syntax**

```bash
cd /Users/ivanflores/parcel-platform/backend && python3 -c "import ast; [ast.parse(open(f).read()) for f in ['models/mail_campaigns.py','core/direct_mail/lob_provider.py','core/direct_mail/service.py','schemas/mail_campaigns.py','routers/mail_campaigns.py','core/billing/tier_config.py']]; print('ALL OK')"
```

- [ ] **Step 2: Frontend build**

```bash
cd /Users/ivanflores/parcel-platform/frontend && npx vite build 2>&1 | tail -5
```

- [ ] **Step 3: Fix any issues**
