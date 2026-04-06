# PARCEL Adversarial Review — Wave 4

Reviewed `SAD/CANONICAL-PRODUCT-BLUEPRINT.md`, `SAD/adversarial-review-wave-3b.md`, the Wave 4 commit range `47559d2^..0fed667`, and the official Twilio/SendGrid webhook security flows where the implementation was security-critical. Wave 4 covered communications infrastructure plus sequences.

## Critical Issues

### 1. SendGrid webhook security is broken: events use the wrong verification scheme, and inbound parse is completely unauthenticated
- File path: `backend/core/communications/sendgrid_email.py:103-120`, `backend/routers/webhooks/communications.py:127-191`
- What the problem is: `SendGridEmailProvider.validate_webhook()` implements an HMAC-SHA256 shared-secret check over the raw body, but SendGrid Event Webhook security uses a timestamped asymmetric signature flow. The route also ignores the required timestamp header entirely. Separately, `POST /sendgrid/incoming` accepts any multipart form post with no signature or source validation at all.
- Why it matters: a forged inbound email can be posted directly into Parcel, matched to a real contact, and stop active sequences. A forged event payload can also mark messages as bounced/opened/clicked. If SendGrid security is actually enabled, legitimate signed events may fail verification because Parcel is checking the wrong thing.
- Specific suggested fix: implement SendGrid's actual signed webhook verification end-to-end for events, including timestamp validation and replay window enforcement; secure inbound parse with SendGrid's parse-webhook security mechanism; reject missing security headers; add integration tests for valid, invalid, and replayed callbacks.

### 2. Twilio webhook validation fails open when `TWILIO_AUTH_TOKEN` is unset, and inbound/status webhooks are replayable
- File path: `backend/core/communications/twilio_sms.py:224-252`, `backend/routers/webhooks/communications.py:19-24`, `backend/routers/webhooks/communications.py:48-55`, `backend/routers/webhooks/communications.py:92-99`, `backend/core/communications/service.py:123-156`, `backend/core/communications/service.py:200-255`
- What the problem is: the webhook router bypasses `TwilioSMSProvider.__init__()` via `__new__`, then populates `_sms.auth_token` from env. If the env var is missing, `validate_webhook()` still computes HMAC using the empty string, so an attacker can forge a valid signature for any request body. There is also no replay protection or deduplication on `MessageSid` / `external_id`, so signed or retried requests can be replayed indefinitely.
- Why it matters: in a misconfigured environment, unauthenticated actors can inject inbound SMS, fake delivery failures, and stop sequences. Even in a correctly configured environment, provider retries or captured requests can create duplicate communications, duplicate failure tasks, and repeated state transitions.
- Specific suggested fix: fail closed when Twilio credentials are missing, do not instantiate a partially initialized provider, require webhook secret presence before verifying, and enforce idempotency on inbound/status webhooks using `MessageSid` plus a replay window / processed-event table.

### 3. Sequence cron cannot execute steps from the shipped async endpoint
- File path: `backend/core/communications/sequence_engine.py:171-204`, `backend/routers/sequences.py:646-674`
- What the problem is: `SequenceEngine.execute_step()` calls `asyncio.get_event_loop().run_until_complete(...)` for both SMS and email sends. The internal processor endpoint is an `async def`, so it runs inside an already-running event loop. In production that raises `RuntimeError: This event loop is already running`.
- Why it matters: the core automation path is broken. Due enrollments hit the exception path in `process_due_enrollments()`, get marked `failed`, and never send.
- Specific suggested fix: make the engine async end-to-end and `await` `CommunicationService.send_sms/send_email`, or move processing into a synchronous worker context that never calls `run_until_complete()` inside an active loop. Add a cron endpoint test that processes a due enrollment successfully.

### 4. Paused, archived, deleted sequences and deleted contacts still send messages
- File path: `backend/core/communications/sequence_engine.py:109-218`, `backend/routers/sequences.py:293-302`, `backend/routers/contacts.py:334-343`
- What the problem is: `process_due_enrollments()` filters only on `SequenceEnrollment.status == "active"` and `next_send_at <= now`; it never checks `Sequence.status`, `Sequence.deleted_at`, or `Contact.is_deleted`. `delete_sequence()` only timestamps the sequence row. `delete_contact()` only flips `contacts.is_deleted`.
- Why it matters: archiving a sequence or deleting a contact does not actually stop already-enrolled automation. Parcel can continue sending SMS/email to deleted contacts or through sequences the user thinks are paused or gone.
- Specific suggested fix: join `Sequence` and `Contact` in the due query, require `Sequence.status == "active"` and `deleted_at is null`, require contact not deleted, and stop/soft-delete active enrollments when a contact or sequence is deleted/archived.

### 5. The system can double-enroll and double-send because there is no database or row-level concurrency control
- File path: `backend/models/sequences.py:67-93`, `backend/alembic/versions/o5p6q7r8s9t0_add_sequences.py:53-76`, `backend/core/communications/sequence_engine.py:52-103`, `backend/core/communications/sequence_engine.py:109-131`
- What the problem is: active-enrollment uniqueness is enforced only with a read-then-insert application check. There is no unique constraint on `(sequence_id, contact_id)` for active rows. Due processing also does an unlocked `.all()` scan with no `FOR UPDATE SKIP LOCKED` or other claim step.
- Why it matters: two simultaneous enroll requests can create duplicate active enrollments, and two overlapping cron runs can pick up the same due row and send the same paid message twice.
- Specific suggested fix: add a partial unique index for active, non-deleted enrollments, and process due rows with a lock/claim pattern such as `SELECT ... FOR UPDATE SKIP LOCKED` or an atomic status transition before sending.

## Security Issues

### 1. Outbound send and enroll endpoints accept foreign `deal_id` / `property_id` values without ownership checks
- File path: `backend/routers/communications.py:64-123`, `backend/routers/sequences.py:418-514`
- What the problem is: both communications send routes and both enroll routes validate only the contact. They pass `deal_id` and `property_id` straight through into persisted `Communication` / `SequenceEnrollment` rows without verifying those entities belong to the authenticated user.
- Why it matters: a user who can guess another tenant's UUID can attach their communication history or enrollments to another tenant's property/deal records, which is a direct cross-tenant integrity violation.
- Specific suggested fix: validate `deal_id` and `property_id` ownership exactly the same way Wave 3B hardened buyer packet creation, or drop those parameters until ownership enforcement is in place.

### 2. The blueprint's A2P 10DLC hard gate is not enforced anywhere, and Parcel still has no durable SMS opt-out state
- File path: `SAD/CANONICAL-PRODUCT-BLUEPRINT.md:654-658`, `frontend/src/pages/settings/SettingsPage.tsx:47-84`, `backend/routers/communications.py:64-91`, `backend/core/communications/service.py:123-157`
- What the problem is: the only compliance implementation is a client-side localStorage form. The backend never checks compliance status before sending SMS, and inbound STOP-like replies are only treated as generic replies that stop sequences; there is no persisted suppression list preventing future manual sends.
- Why it matters: this is a regulatory and carrier-compliance gap on a real-SMS feature with real cost exposure. Users can continue attempting outbound SMS from an unregistered or opted-out number path.
- Specific suggested fix: persist compliance state on the user/team record, enforce it in `POST /api/communications/send-sms` and sequence execution, and add durable opt-out suppression that blocks future sends until an explicit opt-in is captured.

### 3. There is no rate limiting on outbound send, webhook, or internal cron routes
- File path: `backend/routers/communications.py:64-123`, `backend/routers/webhooks/communications.py:38-191`, `backend/routers/sequences.py:646-674`
- What the problem is: the project has `slowapi` configured globally, but none of the Wave 4 routes apply per-route limits. That includes paid send endpoints, public webhook endpoints, and the internal processing endpoint.
- Why it matters: a compromised session, UI bug, or replay storm can burn SMS/email spend quickly. Public webhook endpoints also have no backstop against flood traffic.
- Specific suggested fix: add explicit limits per user on outbound send routes, provider-aware limits on webhook routes, and a conservative limit on the internal processor path in addition to the API key check.

## High Priority

### 1. Editing a sequence in the builder does not persist any step changes
- File path: `frontend/src/pages/sequences/SequenceBuilderPage.tsx:372-453`
- What the problem is: edit mode hydrates `steps` into local state, but `handleSave()` only calls `PATCH /api/sequences/{id}` with metadata. Added, removed, or edited steps are never sent to the backend, even though step CRUD hooks exist elsewhere in the codebase.
- Why it matters: users can spend time "editing" a live sequence and leave the page believing the content changed when the persisted steps are untouched.
- Specific suggested fix: in edit mode, diff local steps against the original sequence and call the step add/update/delete endpoints, or move the builder to a single backend endpoint that updates the whole sequence transactionally.

### 2. Deleting or reordering steps mid-enrollment changes which message sends next
- File path: `backend/routers/sequences.py:385-410`, `backend/core/communications/sequence_engine.py:140-218`
- What the problem is: active enrollments track `current_step` as a zero-based array index into the current active step list. `DELETE /steps/{step_id}` reorders the remaining steps, but existing enrollments are not migrated. If a prior step is removed, the next send can skip a message or jump to the wrong template.
- Why it matters: active sequences can silently send the wrong copy to real contacts after step maintenance.
- Specific suggested fix: store progress against a stable step identifier rather than list index, or recalculate `current_step` for affected active enrollments whenever steps are deleted/reordered.

### 3. `stop_on_deal_created` is exposed in the model, API, and UI but never implemented
- File path: `backend/models/sequences.py:25-27`, `backend/routers/sequences.py:206-272`, `frontend/src/pages/sequences/SequenceBuilderPage.tsx:526-545`, `backend/core/communications/sequence_engine.py`
- What the problem is: the product lets users toggle "Stop when deal created", but no backend code ever observes deal creation or stops enrollments for that reason.
- Why it matters: the UI advertises a safety rule that does nothing, so users can think follow-up will stop automatically after converting a lead when it will not.
- Specific suggested fix: wire deal creation/linking flows to a sequence stop handler, and add an automated test proving enrollments stop with `stopped_reason = "deal_created"` when the toggle is on.

### 4. Provider, validation, and configuration errors bubble out as generic 500s
- File path: `backend/routers/communications.py:50-123`, `backend/core/communications/twilio_sms.py:147-220`, `backend/core/communications/sendgrid_email.py:45-101`
- What the problem is: the router never catches `ValueError` / `RuntimeError` / `httpx.HTTPStatusError` from the providers. Missing Twilio credentials, a missing Twilio sending number, invalid phone/email data, SendGrid auth failures, and provider 429s all become generic server errors.
- Why it matters: users get opaque failures, retries are blind, and transient provider errors are indistinguishable from app bugs.
- Specific suggested fix: map provider exceptions to explicit 4xx/429/503 responses with stable error codes; preflight configuration before constructing the service; validate phone/email format before attempting to send.

### 5. Phone normalization and SMS segment accounting are wrong for production traffic
- File path: `backend/core/communications/twilio_sms.py:61-93`, `backend/core/communications/twilio_sms.py:136-141`, `frontend/src/components/communications/ConversationThread.tsx:116-119`, `frontend/src/components/communications/ConversationThread.tsx:233-242`
- What the problem is: `normalize_phone()` returns `+1 (414) 555-1234` unchanged even though it is not valid E.164, and it also accepts 7-digit local numbers by converting them to `+5551234`. Segment counting uses plain `160`-char math and ignores concatenated GSM/UCS-2 rules, while the frontend shows the same simplified math to users.
- Why it matters: valid-looking US inputs can still fail at Twilio, and the product underestimates message count/cost for longer or Unicode SMS bodies.
- Specific suggested fix: canonicalize all `+` inputs down to `+digits`, reject short/non-US numbers in the outbound path, and switch both backend and frontend segment counting to real GSM-7/UCS-2 logic.

### 6. Unmatched inbound messages are effectively black-holed
- File path: `backend/core/communications/service.py:123-194`
- What the problem is: when no unique contact match is found, Parcel still creates a `Communication`, but it writes `created_by = 00000000-0000-0000-0000-000000000000`, `team_id = null`, and no `contact_id`. There is no inbox or admin queue that can surface these rows.
- Why it matters: real seller/buyer replies can land in the database and still be invisible to every user, which is operationally the same as losing the message.
- Specific suggested fix: route unmatched inbound traffic to a visible system inbox, an owner-resolution queue, or at minimum create a triage task for the affected Twilio/SendGrid destination instead of writing unowned rows.

## Medium Priority

### 1. Empty active sequences can be created and then offered in enrollment UI
- File path: `backend/schemas/sequences.py:52-58`, `backend/routers/sequences.py:195-239`, `frontend/src/pages/sequences/SequenceBuilderPage.tsx:423-456`, `frontend/src/pages/contacts/ContactDetailPage.tsx:41-42`, `frontend/src/pages/buyers/BuyerDetailPage.tsx:93-95`
- What the problem is: the API allows `steps = []`, the builder allows save with just a name, and the contact/buyer dropdowns show all active sequences without filtering out zero-step sequences.
- Why it matters: users can create active sequences that can never enroll successfully, then hit a backend 422 only after selecting them from the UI.
- Specific suggested fix: require at least one step before activation, or add a `draft` state and filter drafts/empty sequences out of enrollment surfaces.

### 2. Due processing and list queries will degrade badly at scale
- File path: `backend/core/communications/sequence_engine.py:109-218`, `backend/routers/sequences.py:117-157`, `backend/routers/sequences.py:570-590`
- What the problem is: `process_due_enrollments()` loads all due rows at once and then performs per-enrollment queries for steps, contact, property, user, and sequence with a commit inside the loop. `list_sequences()` does a step-count query per sequence, and `list_enrollments()` does a contact lookup per enrollment.
- Why it matters: at 1000 due enrollments, this becomes thousands of round trips plus per-row commits on the hot path that is supposed to run every five minutes.
- Specific suggested fix: batch due rows, preload related entities, use grouped counts, and minimize per-enrollment commits. The internal processor should be designed for bulk throughput, not one-row-at-a-time ORM churn.

### 3. Delivery status handling is not idempotent and creates duplicate tasks on repeated failures
- File path: `backend/core/communications/service.py:200-255`, `backend/routers/webhooks/communications.py:82-119`, `backend/routers/webhooks/communications.py:155-191`
- What the problem is: `update_delivery_status()` creates a new high-priority task every time `new_status == "failed"`, with no check that the status actually changed. Because the webhook routes also do not dedupe events, a provider retry or replay can create multiple identical failure tasks for the same message.
- Why it matters: the task queue becomes noisy and users lose trust in delivery alerts.
- Specific suggested fix: update tasks only on an actual state transition into `failed`, add dedupe on provider event IDs / message IDs, and persist last processed status per `external_id`.

### 4. Enrollment UI is incomplete relative to the spec
- File path: `docs/superpowers/specs/2026-04-05-sequences-design.md:576-581`, `frontend/src/pages/contacts/ContactDetailPage.tsx:138-176`, `frontend/src/pages/buyers/BuyerDetailPage.tsx:195-220`
- What the problem is: the UI filters to active sequences and can enroll a contact, but it does not show current enrollment status, disable sequences the contact is already in, or expose the stop-enrollment endpoint anywhere.
- Why it matters: users only learn about duplicate enrollment from a failed API call, and there is no way to manage enrollment lifecycle from the contact/buyer surfaces that created it.
- Specific suggested fix: fetch active enrollments for the current contact, display "In sequence..." status, disable already-active entries in the dropdown, and surface an unenroll action that calls `DELETE /api/sequences/{seq_id}/enrollments/{enrollment_id}`.

### 5. The enrollments API contract is already out of sync with the frontend client
- File path: `backend/routers/sequences.py:561-590`, `frontend/src/lib/api.ts:805-806`
- What the problem is: the backend returns `list[EnrollmentResponse]`, while the frontend client is typed to expect `{ enrollments: SequenceEnrollment[]; total: number }`.
- Why it matters: the current hooks look finished but will break immediately once a page actually tries to render enrollments.
- Specific suggested fix: choose one contract, update both sides to match, and add an integration test that exercises the hook against the real API shape.

## Low Priority

### 1. The SMS compliance badge never actually flips to registered
- File path: `frontend/src/pages/settings/SettingsPage.tsx:47-84`, `frontend/src/pages/settings/SettingsPage.tsx:96-98`
- What the problem is: the component reads `sms_compliance_status` from localStorage but never writes it on submit. Saving the form stores only `sms_compliance_info`, so the badge remains "Not Registered".
- Why it matters: even as a temporary UI-only flow, the page gives contradictory feedback.
- Specific suggested fix: either persist and update the status together with the form save, or remove the status badge until the backend-backed compliance state exists.

### 2. Email compose injects raw user text into HTML without escaping
- File path: `frontend/src/components/communications/ConversationThread.tsx:129-145`
- What the problem is: the compose UI wraps `body` directly into `<p>${body.replace(...)} </p>` with no escaping. User-entered `<`, `>`, and quotes become raw HTML.
- Why it matters: malformed or unexpected markup can leak into outbound email rendering and make preview vs. delivered content diverge.
- Specific suggested fix: HTML-escape the composed body before inserting `<br>` tags, or generate the HTML server-side from the plain-text body.

### 3. Wave 4 shipped without targeted automated coverage for the highest-risk paths
- File path: `backend/tests/`, `frontend/src/__tests__/`
- What the problem is: there are no focused tests for Twilio/SendGrid send flows, webhook verification, SequenceEngine processing, cron overlap/idempotency, or the sequence builder/edit contract.
- Why it matters: several of the bugs above are integration failures that lightweight endpoint and UI tests would have caught immediately.
- Specific suggested fix: add backend tests for webhook verification, due-processing success/failure, pause/delete semantics, and active-enrollment uniqueness; add frontend tests for sequence edit persistence, enrollment status display, and compose/send behavior.

## Previous Fix Regression Check

- JWT enforcement: held. The new `/api/communications` and `/api/sequences` routes consistently use `get_current_user`; the intentionally unauthenticated routes are limited to webhooks and the internal cron endpoint.
- Cross-tenant isolation: regressed. Wave 3B hardened ownership checks in several places, but Wave 4 reintroduced foreign-ID trust by accepting arbitrary `deal_id` / `property_id` values on send and enroll requests.
- Bulk limits: partially held. `BulkEnrollRequest` still caps bulk enrollment at 50 contacts, but there is still no rate limiting or idempotency protection on the paid-send or webhook paths.

## Positive Findings

- The internal cron endpoint fails closed when `INTERNAL_API_KEY` is unset or wrong.
- The Twilio provider uses async `httpx` and normalizes provider statuses into a consistent internal enum, which is the right abstraction direction even though the current normalization logic needs hardening.
- The sequence router consistently enforces sequence ownership before step and enrollment management.
- The contact and buyer enrollment dropdowns at least filter to active sequences, which prevents obviously archived/paused sequences from showing up in the UI.
- Conversation threads have a clear empty state, delivery status badges, and polling, so the user-facing surface is directionally correct once the backend integrity issues are fixed.
