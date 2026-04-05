# Sequences (Automated Follow-Up) — Design Spec

## Overview

Build automated multi-step follow-up sequences. Users create reusable sequence templates with ordered steps (SMS/email), enroll contacts, and the system sends messages on schedule. Replies auto-stop the sequence. Processing is triggered by a cron-called internal endpoint every 5 minutes.

## Design System

Same as all prior sprints — no new tokens.

## Architecture Decisions

- **Three models**: Sequence (template), SequenceStep (ordered messages), SequenceEnrollment (contact enrolled in a sequence with state machine).
- **SequenceEngine is stateless logic**: Takes a DB session and CommunicationService, processes due enrollments. No background threading — triggered externally.
- **Cron-triggered processing**: `POST /api/internal/process-sequences` validated by `INTERNAL_API_KEY` header. Railway cron calls every 5 minutes. No new scheduler dependency.
- **Template rendering is simple**: `{{variable}}` string replacement. No Jinja, no expressions. Variables come from contact + property + user data.
- **Reply handling hooks into Sprint 1**: When incoming SMS/email matches a contact, CommunicationService calls SequenceEngine.handle_reply() to stop active enrollments.
- **Manual trigger only for MVP**: trigger_type is always "manual" — users explicitly enroll contacts. Auto-triggers (new_lead, stage_change) come later.

---

## 1. Backend: Sequence Models + Migration

Create: `backend/models/sequences.py`

```
sequences table:
    id              UUID PK (TimestampMixin)
    created_by      UUID FK → users.id, NOT NULL, indexed
    team_id         UUID FK → teams.id, nullable

    name            String, NOT NULL
    description     Text, nullable
    status          String, NOT NULL, default "active"  — active | paused | archived

    trigger_type    String, nullable, default "manual"  — manual | new_lead | stage_change | stale_deal

    stop_on_reply           Boolean, default True
    stop_on_deal_created    Boolean, default False

    total_enrolled  Integer, default 0
    total_completed Integer, default 0
    total_replied   Integer, default 0

    deleted_at      DateTime, nullable

sequence_steps table:
    id              UUID PK (TimestampMixin)
    sequence_id     UUID FK → sequences.id, NOT NULL, indexed
    step_order      Integer, NOT NULL  — 1, 2, 3...
    channel         String, NOT NULL  — sms | email
    delay_days      Integer, NOT NULL, default 0
    delay_hours     Integer, NOT NULL, default 0
    subject         String, nullable  — email subject template
    body_template   Text, NOT NULL  — supports {{first_name}}, {{property_address}}, etc.
    deleted_at      DateTime, nullable

sequence_enrollments table:
    id              UUID PK (TimestampMixin)
    sequence_id     UUID FK → sequences.id, NOT NULL, indexed
    contact_id      UUID FK → contacts.id, NOT NULL, indexed
    property_id     UUID FK → properties.id, nullable
    deal_id         UUID FK → deals.id, nullable
    created_by      UUID FK → users.id, NOT NULL

    status          String, NOT NULL, default "active"  — active | completed | replied | stopped | failed
    current_step    Integer, NOT NULL, default 0  — index of last executed step (0 = not started)
    next_send_at    DateTime, nullable  — when step current_step+1 should fire

    enrolled_at     DateTime, server_default now()
    completed_at    DateTime, nullable
    stopped_at      DateTime, nullable
    stopped_reason  String, nullable  — reply_received | manual | deal_created | unsubscribed

    deleted_at      DateTime, nullable
```

Relationships:
- `Sequence.steps` → one-to-many, ordered by step_order, cascade
- `Sequence.enrollments` → one-to-many
- `SequenceStep.sequence` → back_populates
- `SequenceEnrollment.sequence` → back_populates
- `SequenceEnrollment.contact` → relationship

Register in `backend/models/__init__.py`. Migration creates all three tables with indexes.

---

## 2. Backend: Sequence Schemas

Create: `backend/schemas/sequences.py`

```
SequenceStepRequest:
    channel: str  — "sms" or "email"
    delay_days: int = 0
    delay_hours: int = 0
    subject: str | None  — required if channel == "email"
    body_template: str (min_length=1)

UpdateStepRequest:
    channel: str | None
    delay_days: int | None
    delay_hours: int | None
    subject: str | None
    body_template: str | None

CreateSequenceRequest:
    name: str (min_length=1)
    description: str | None
    stop_on_reply: bool = True
    stop_on_deal_created: bool = False
    steps: list[SequenceStepRequest] = []  — optional: create with steps inline

UpdateSequenceRequest:
    name: str | None
    description: str | None
    status: str | None  — active | paused | archived
    stop_on_reply: bool | None
    stop_on_deal_created: bool | None

StepResponse:
    id, sequence_id, step_order, channel, delay_days, delay_hours
    subject, body_template, created_at

SequenceResponse:
    id, name, description, status, trigger_type
    stop_on_reply, stop_on_deal_created
    total_enrolled, total_completed, total_replied
    steps: list[StepResponse]
    created_at, updated_at

SequenceListItem:
    id, name, description, status
    step_count: int
    total_enrolled, total_completed, total_replied
    reply_rate: float  — total_replied / total_enrolled * 100
    created_at

EnrollRequest:
    contact_id: UUID
    property_id: UUID | None
    deal_id: UUID | None

BulkEnrollRequest:
    contact_ids: list[UUID] (max_length=50)
    property_id: UUID | None
    deal_id: UUID | None

EnrollmentResponse:
    id, sequence_id, contact_id, property_id, deal_id
    status, current_step, next_send_at
    enrolled_at, completed_at, stopped_at, stopped_reason
    contact_name: str

EnrollmentListResponse:
    enrollments: list[EnrollmentResponse]
    total: int

SequenceAnalytics:
    total_enrolled: int
    active: int
    completed: int
    replied: int
    stopped: int
    failed: int
    reply_rate: float
    completion_rate: float
```

---

## 3. Backend: Sequence Engine

Create: `backend/core/communications/sequence_engine.py`

```python
class SequenceEngine:
    def __init__(self, db: Session, comm_service: CommunicationService):
        ...

    async def enroll(self, sequence_id, contact_id, user_id, team_id=None, property_id=None, deal_id=None) -> SequenceEnrollment:
        # 1. Validate sequence is active
        # 2. Check contact not already actively enrolled in this sequence
        # 3. Create SequenceEnrollment: status="active", current_step=0
        # 4. Calculate next_send_at from step 1's delay
        # 5. Increment sequence.total_enrolled
        # 6. Return enrollment

    async def process_due_enrollments(self) -> int:
        # 1. Query enrollments where status="active" AND next_send_at <= now()
        # 2. For each: execute_step()
        # 3. Return count processed

    async def execute_step(self, enrollment: SequenceEnrollment) -> bool:
        # 1. Get the next step (current_step + 1)
        # 2. If no more steps: mark enrollment completed, return
        # 3. Get contact + property for template context
        # 4. Render template with context
        # 5. Send via CommunicationService (SMS or email)
        # 6. Advance: enrollment.current_step += 1
        # 7. Calculate next_send_at for the following step (if any)
        # 8. If this was the last step: mark completed
        # 9. Return True on success, False on failure

    def handle_reply(self, contact_id: UUID, user_id: UUID) -> int:
        # 1. Find all active enrollments for this contact
        # 2. For each enrollment where sequence.stop_on_reply == True:
        #    - Set status="replied", stopped_at=now(), stopped_reason="reply_received"
        #    - Increment sequence.total_replied
        # 3. Return count of stopped enrollments

    def render_template(self, template: str, context: dict) -> str:
        # Simple {{variable}} replacement
        # Variables: first_name, last_name, full_name, property_address,
        #   property_city, property_state, asking_price, arv, cash_flow,
        #   sender_name, sender_phone, sender_company
```

### Template Context Building

```python
def _build_context(self, enrollment, contact, property, user) -> dict:
    return {
        "first_name": contact.first_name or "",
        "last_name": contact.last_name or "",
        "full_name": " ".join(filter(None, [contact.first_name, contact.last_name])),
        "property_address": property.address_line1 if property else "",
        "property_city": property.city if property else "",
        "property_state": property.state if property else "",
        "asking_price": "",  # from scenario if available
        "arv": "",
        "cash_flow": "",
        "sender_name": user.name or "",
        "sender_phone": "",  # not on user model yet
        "sender_company": "",
    }
```

### Next Send Calculation

```python
def _calculate_next_send_at(self, step: SequenceStep) -> datetime:
    return datetime.utcnow() + timedelta(days=step.delay_days, hours=step.delay_hours)
```

---

## 4. Backend: Internal Processing Endpoint

Create: add to `backend/routers/communications.py` or create a separate internal router.

```
POST /api/internal/process-sequences
```

- No user auth — validated by `X-Internal-Key` header matching `INTERNAL_API_KEY` env var
- Calls SequenceEngine.process_due_enrollments()
- Returns: `{processed: int, errors: int}`
- Railway cron calls this every 5 minutes

---

## 5. Backend: Reply Handling Integration

Modify: `backend/core/communications/service.py`

In `handle_incoming_sms()` and `handle_incoming_email()`, after creating the inbound Communication record, call:

```python
if contact:
    from core.communications.sequence_engine import SequenceEngine
    engine = SequenceEngine(self.db, self)
    engine.handle_reply(contact.id, contact.created_by)
```

---

## 6. Backend: Sequences Router

Create: `backend/routers/sequences.py`
Register in: `backend/main.py` at `/api` prefix.

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/sequences` | List user's sequences with stats |
| GET | `/sequences/:id` | Full sequence with steps |
| POST | `/sequences` | Create sequence (optionally with inline steps) |
| PATCH | `/sequences/:id` | Update sequence metadata/status |
| DELETE | `/sequences/:id` | Soft delete |
| POST | `/sequences/:id/steps` | Add a step |
| PATCH | `/sequences/:id/steps/:stepId` | Update step |
| DELETE | `/sequences/:id/steps/:stepId` | Soft delete step, reorder remaining |
| POST | `/sequences/:id/enroll` | Enroll a single contact |
| POST | `/sequences/:id/enroll-bulk` | Enroll multiple contacts (max 50) |
| DELETE | `/sequences/:id/enrollments/:enrollmentId` | Stop an enrollment |
| GET | `/sequences/:id/enrollments` | List enrollments with status |
| GET | `/sequences/:id/analytics` | Aggregate stats |

### Step Reordering

When a step is deleted, reorder remaining steps so step_order is contiguous (1, 2, 3...).

### Analytics

```python
{
    "total_enrolled": count all enrollments,
    "active": count status="active",
    "completed": count status="completed",
    "replied": count status="replied",
    "stopped": count status="stopped",
    "failed": count status="failed",
    "reply_rate": replied / total_enrolled * 100,
    "completion_rate": completed / total_enrolled * 100,
}
```

---

## 7. Frontend: Types + API + Hooks

### Types (add to `types/index.ts`)

```typescript
interface SequenceStep {
  id: string
  sequence_id: string
  step_order: number
  channel: 'sms' | 'email'
  delay_days: number
  delay_hours: number
  subject: string | null
  body_template: string
  created_at: string
}

interface SequenceListItem {
  id: string
  name: string
  description: string | null
  status: 'active' | 'paused' | 'archived'
  step_count: number
  total_enrolled: number
  total_completed: number
  total_replied: number
  reply_rate: number
  created_at: string
}

interface SequenceDetail {
  id: string
  name: string
  description: string | null
  status: 'active' | 'paused' | 'archived'
  trigger_type: string
  stop_on_reply: boolean
  stop_on_deal_created: boolean
  total_enrolled: number
  total_completed: number
  total_replied: number
  steps: SequenceStep[]
  created_at: string
  updated_at: string
}

interface CreateSequenceRequest {
  name: string
  description?: string
  stop_on_reply?: boolean
  stop_on_deal_created?: boolean
  steps?: {
    channel: 'sms' | 'email'
    delay_days?: number
    delay_hours?: number
    subject?: string
    body_template: string
  }[]
}

interface SequenceEnrollment {
  id: string
  sequence_id: string
  contact_id: string
  property_id: string | null
  deal_id: string | null
  status: 'active' | 'completed' | 'replied' | 'stopped' | 'failed'
  current_step: number
  next_send_at: string | null
  enrolled_at: string
  completed_at: string | null
  stopped_at: string | null
  stopped_reason: string | null
  contact_name: string
}

interface SequenceAnalytics {
  total_enrolled: number
  active: number
  completed: number
  replied: number
  stopped: number
  failed: number
  reply_rate: number
  completion_rate: number
}

interface EnrollRequest {
  contact_id: string
  property_id?: string
  deal_id?: string
}

interface BulkEnrollRequest {
  contact_ids: string[]
  property_id?: string
  deal_id?: string
}
```

### API Namespace

```typescript
api.sequences = {
  list: () => GET /api/sequences,
  get: (id) => GET /api/sequences/:id,
  create: (data) => POST /api/sequences,
  update: (id, data) => PATCH /api/sequences/:id,
  delete: (id) => DELETE /api/sequences/:id,
  steps: {
    add: (seqId, data) => POST /api/sequences/:seqId/steps,
    update: (seqId, stepId, data) => PATCH /api/sequences/:seqId/steps/:stepId,
    delete: (seqId, stepId) => DELETE /api/sequences/:seqId/steps/:stepId,
  },
  enroll: (seqId, data) => POST /api/sequences/:seqId/enroll,
  enrollBulk: (seqId, data) => POST /api/sequences/:seqId/enroll-bulk,
  stopEnrollment: (seqId, enrollmentId) => DELETE /api/sequences/:seqId/enrollments/:enrollmentId,
  enrollments: (seqId) => GET /api/sequences/:seqId/enrollments,
  analytics: (seqId) => GET /api/sequences/:seqId/analytics,
}
```

### Hooks (`hooks/useSequences.ts`)

- `useSequences()` — queryKey: `['sequences']`
- `useSequence(id)` — queryKey: `['sequences', id]`
- `useCreateSequence()` — invalidates `['sequences']`
- `useUpdateSequence(id)` — invalidates `['sequences']`
- `useDeleteSequence()` — invalidates `['sequences']`
- `useAddStep(seqId)` — invalidates `['sequences', seqId]`
- `useUpdateStep(seqId)` — invalidates `['sequences', seqId]`
- `useDeleteStep(seqId)` — invalidates `['sequences', seqId]`
- `useEnrollContact(seqId)` — invalidates `['sequences']`
- `useBulkEnroll(seqId)` — invalidates `['sequences']`
- `useStopEnrollment(seqId)` — invalidates `['sequences']`
- `useEnrollments(seqId)` — queryKey: `['sequences', seqId, 'enrollments']`
- `useSequenceAnalytics(seqId)` — queryKey: `['sequences', seqId, 'analytics']`

---

## 8. Frontend: Unlock Sequences Nav + Routes

Modify: `frontend/src/components/layout/nav-data.ts` — remove `locked: true` from Sequences

Modify: `frontend/src/App.tsx` — replace the LockedFeaturePage route for `/sequences` with:
- `/sequences` → SequencesListPage
- `/sequences/new` → SequenceBuilderPage
- `/sequences/:id` → SequenceBuilderPage (edit mode)

---

## 9. Frontend: Sequences List Page

Create: `frontend/src/pages/sequences/SequencesListPage.tsx`
Route: `/sequences`

### Layout

```
Header: "Sequences" + count + "Create Sequence" button
Sequence cards (single column, full width)
```

### Sequence Card

- Name (large) + description (muted)
- Status badge: Active (green), Paused (yellow), Archived (gray)
- Stats row: "23 enrolled · 8 completed · 12 active · 35% reply rate"
- Step preview: "3 steps over 7 days (SMS → SMS → Email)"
- Actions: Edit button → `/sequences/:id`, Pause/Resume toggle, Archive

### Empty State

"Create your first follow-up sequence to automate outreach."

---

## 10. Frontend: Sequence Builder Page

Create: `frontend/src/pages/sequences/SequenceBuilderPage.tsx`
Route: `/sequences/new` and `/sequences/:id`

### Layout

```
Header: "New Sequence" or sequence name + Save button
Sequence info: name input + description textarea
Stop rules: "Stop on reply" toggle + "Stop when deal created" toggle
Step timeline (vertical)
```

### Sequence Info Section

- Name input (required)
- Description textarea (optional)
- Stop on Reply toggle (default on)
- Stop on Deal Created toggle (default off)

### Step Timeline

Vertical timeline with connecting lines:

```
○ Step 1 — SMS · Immediately
  [Expanded step editor]
  |
○ Step 2 — SMS · 2 days later
  [Collapsed preview: "Just following up on {{property_address}}..."]
  |
○ Step 3 — Email · 5 days later
  [Collapsed preview]
  |
[+ Add Step] button
```

### Step Editor (expanded)

- Channel toggle: SMS | Email
- Delay: days input + hours input ("Wait X days, Y hours after previous step")
- Subject input (email only)
- Body template textarea with variable toolbar
- Variable insertion buttons: `{{first_name}}`, `{{property_address}}`, `{{sender_name}}`, etc.
  - Clicking inserts at cursor position in textarea
- Template preview: renders template with sample data below the textarea
- Delete step button (with confirmation)

### Sample Data for Preview

```
{
  first_name: "John",
  last_name: "Smith",
  full_name: "John Smith",
  property_address: "123 Main St",
  property_city: "Milwaukee",
  property_state: "WI",
  asking_price: "$85,000",
  sender_name: "Desiree",
}
```

### Save Flow

- New sequence: POST /api/sequences with inline steps
- Edit: PATCH sequence metadata, individual step CRUD
- Auto-save is not implemented (explicit Save button)

---

## 11. Frontend: Enroll Contacts

### Contact Detail Page

Modify: `frontend/src/pages/contacts/ContactDetailPage.tsx`

Add "Add to Sequence" button in the action buttons area. On click, shows a dropdown listing active sequences. Selecting one calls `POST /api/sequences/:id/enroll` with the contact_id.

Show enrollment status if contact is in an active sequence:
"In sequence: Seller Follow-Up (Step 2 of 3, next send: Apr 7 2:00 PM)"

### Buyer Detail Page

Modify: `frontend/src/pages/buyers/BuyerDetailPage.tsx`

Same "Add to Sequence" button pattern.

---

## 12. PostHog Events

- `sequence_created` — `{step_count, channels_used: ["sms", "email"]}`
- `sequence_step_added` — `{channel, delay_days}`
- `contact_enrolled` — `{sequence_id, has_property, has_deal}`
- `sequence_step_executed` — `{channel, step_order}`
- `sequence_reply_stopped` — `{step_reached, total_steps}`
- `sequence_completed` — `{total_steps}`

---

## Definition of Done

- [ ] Sequence, SequenceStep, SequenceEnrollment models with migration
- [ ] Sequence engine: enroll, process due, execute step, handle reply, render templates
- [ ] Internal processing endpoint (cron-triggered)
- [ ] Reply handling integrated into incoming SMS/email webhooks
- [ ] Full CRUD + enrollment + analytics endpoints
- [ ] Sequences nav unlocked, routes registered
- [ ] Sequences list page with stats and status badges
- [ ] Sequence builder with visual timeline, template editing, variable insertion
- [ ] Enroll contacts from contact/buyer detail pages
- [ ] Frontend build clean
- [ ] Backend syntax clean
