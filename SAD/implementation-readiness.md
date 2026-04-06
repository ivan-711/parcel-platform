# Implementation Readiness Checklist

**Date:** 2026-04-02
**Reference:** SAD/CANONICAL-PRODUCT-BLUEPRINT.md

---

## 1. Is the canonical blueprint complete enough to begin Wave 0?

**Yes.** Wave 0 is a schema-only wave. The blueprint provides:

- Complete entity list with lifecycle rules and relationships
- Explicit support entities (PartyRole, ImportJob, DataSourceEvent)
- Schema foundation rules (team_id, RLS, soft delete, module structure)
- Module map for organizing migrations and routers
- Clear scope boundary (no UI changes except billing labels)

There are no ambiguities that would block starting Wave 0. The Property model, AnalysisScenario split, and Deal refactor are well-defined. The relationship hierarchy is clear. RLS policies follow a standard pattern (team_id scoping).

---

## 2. Questions That Need Founder Answers Before Wave 0

### Must answer before starting:

**Q1: How should existing Deal records be migrated?**
The Deal refactor is the hardest part of Wave 0. Current deals have property-like fields (address, zip, property_type) and analysis fields (inputs/outputs JSONB). Options:
- (A) Write a migration that creates a Property for every existing Deal and splits the JSONB into AnalysisScenario columns. Existing deal IDs preserved.
- (B) Mark existing deals as "legacy" and start fresh with the new model. Old deals viewable but not editable.
- (C) Run both models in parallel during Wave 0-1, with a migration path that happens gradually.

**Recommendation:** Option A. Clean break. One migration script. The current deal count is small enough (likely <1000 records across all users) that a batch migration is safe.

**Q2: Which PostgreSQL extensions should be enabled now vs. later?**
- PostGIS: Needed for D4D (Wave 7) and any location-based queries. Enable now (zero cost when unused) or defer?
- pgvector: Needed for RAG chat (Wave 1C). Enable now or defer?

**Recommendation:** Enable both now. They're free to enable and avoid a future migration headache.

**Q3: Should the billing tier rename (Starter→Plus, Team→Business) be user-facing in Wave 0?**
This means updating the pricing page, settings UI, and any user-facing tier labels. It's small but it is UI work.

**Recommendation:** Yes, do it in Wave 0. It's a 2-hour task and prevents confusion for any users during Wave 1.

### Can defer until Wave 1A:

- Bricked API tier selection (Growth vs. Scale) — not needed until Wave 1C
- Sample data content per persona branch — needed for Wave 1A
- Exact onboarding question wording — needed for Wave 1A

---

## 3. First Claude Code Prompt for Wave 0

```
PARCEL Wave 0 — Schema Foundation

You are implementing Wave 0 of the Parcel product blueprint. This is a schema-only wave — no UI changes except billing label updates.

Read the canonical blueprint: ~/parcel-platform/SAD/CANONICAL-PRODUCT-BLUEPRINT.md (Section 3: Domain Model and Section 6: Wave 0).

Read the current codebase state: ~/parcel-platform/SAD/current-state-audit.md

Read the pressure test: ~/parcel-platform/SAD/Codex-Blueprint-Codebase-Pressure-Test.md (Section: "What Must Change First Structurally")

Then execute Wave 0 in this order:

TASK 1: Create the Property model
- New file: backend/models/property.py
- Fields: id (UUID), team_id (FK), address, city, state, zip, county, latitude (float), longitude (float), property_type (enum), year_built, sqft, bedrooms, bathrooms, lot_size, lifecycle_state (enum: lead, prospect, under_contract, owned, sold, archived), created_by, created_at, updated_at, is_deleted
- Add PostGIS Point column for geolocation
- Alembic migration in a new file (not appended to existing)

TASK 2: Create the AnalysisScenario model
- New file: backend/models/analysis_scenario.py
- Fields: id (UUID), team_id (FK), property_id (FK to Property), deal_id (FK to Deal, nullable), strategy (enum matching existing 5 strategies), assumptions (JSONB — structured, not a catch-all), outputs (JSONB — structured), risk_score (float), risk_factors (JSONB array), ai_narrative (text), source_confidence (enum: verified, estimated, needs_confirmation, manual), created_by, created_at, updated_at, is_deleted
- Own Alembic migration

TASK 3: Refactor the Deal model
- Modify backend/models/deals.py
- Add property_id FK (nullable initially for migration)
- Keep existing inputs/outputs columns temporarily (removed after migration)
- Add deal_type enum (acquisition, disposition)
- Own Alembic migration

TASK 4: Write the data migration
- Create a migration that:
  1. For each existing Deal, creates a Property from the deal's address/property fields
  2. Creates an AnalysisScenario from the deal's inputs/outputs/risk data
  3. Sets deal.property_id to the new property
  4. Preserves all existing pipeline_entries and portfolio_entries relationships

TASK 5: Create remaining entity stubs
- backend/models/contact.py (Contact + PartyRole)
- backend/models/task.py (Task with polymorphic parent)
- backend/models/communication.py (Communication log)
- backend/models/transaction.py (Transaction)
- backend/models/report.py (Report + share state)
- backend/models/data_source_event.py (DataSourceEvent)
- backend/models/import_job.py (ImportJob)
- Each with own Alembic migration
- All tables include: id, team_id, created_by, created_at, updated_at, is_deleted

TASK 6: Enable PostgreSQL extensions
- PostGIS
- pgvector

TASK 7: Update billing config
- backend/core/billing/tier_config.py: rename starter→plus, team→business, update prices to $29/$79/$149
- frontend/src/types/index.ts: update tier types
- frontend/src/pages/PricingPage.tsx: update labels and prices

TASK 8: Add RLS policies
- Write RLS policies scoping all new tables by team_id
- Ensure existing tables also have team_id scoping

After each task, run: npx vite build 2>&1 | tail -5 and backend tests to verify nothing breaks.

Do NOT modify:
- backend/core/calculators/ (no-touch zone)
- backend/core/ai/chat_specialist.py (no-touch zone)
- Any frontend page components beyond billing labels
```

---

## 4. First 5 Concrete Technical Tasks (Priority Order)

### Task 1: Create Property model + migration
**File:** `backend/models/property.py` + new Alembic migration
**Why first:** Everything else depends on Property existing. It's the root of the entire domain model.
**Estimated effort:** 3-4 hours
**Verify:** Migration runs cleanly, `pytest` passes, existing deals still work.

### Task 2: Create AnalysisScenario model + migration
**File:** `backend/models/analysis_scenario.py` + new Alembic migration
**Why second:** AnalysisScenario depends on Property. Deal refactor depends on AnalysisScenario existing.
**Estimated effort:** 3-4 hours
**Verify:** Migration runs, FK to Property works, existing deal tests pass.

### Task 3: Refactor Deal model — add property_id FK
**File:** `backend/models/deals.py` + new Alembic migration
**Why third:** This is the riskiest change — it modifies the existing core model. Must be done carefully.
**Estimated effort:** 4-6 hours (includes updating routers and tests)
**Verify:** All 53 backend tests still pass. Frontend build succeeds. Existing deals still accessible.

### Task 4: Data migration — Deal → Property + AnalysisScenario
**File:** New Alembic migration (data migration, not schema)
**Why fourth:** Now that all three models exist, migrate existing data. One script, one pass.
**Estimated effort:** 4-6 hours (includes testing with real data patterns)
**Verify:** Every existing Deal has a corresponding Property and AnalysisScenario. Pipeline and portfolio entries still resolve correctly. No orphaned records.

### Task 5: Create entity stubs (Contact, Task, Communication, Transaction, Report, support tables)
**Files:** 7 new model files + 7 Alembic migrations
**Why fifth:** These are schema stubs with no UI. Low risk, straightforward. All follow the same pattern established in Tasks 1-2.
**Estimated effort:** 6-8 hours (7 tables, ~1 hour each)
**Verify:** All migrations run in sequence. All FK relationships valid. `pytest` passes.

### After these 5 tasks:
- Enable PostGIS + pgvector (Task 6 from the prompt — 1 hour)
- Update billing labels (Task 7 — 2 hours)
- Add RLS policies (Task 8 — 3-4 hours)

**Total Wave 0 estimated effort: ~30-35 hours = ~4 dev-weeks at 25-30 hrs/week on Parcel**

---

## 5. Final Assessment

**We are ready to start building.**

The research phase produced 29 reports, 8 personas, 5 audits, 2 independent blueprints, and a canonical reconciliation. The domain model is clear. The build order is defined. The first prompt is written. The blockers are resolved.

The risk is no longer "do we know what to build?" — it's "do we execute the structural foundation correctly before layering features on top?" The Deal refactor (Tasks 3-4) is the make-or-break moment of Wave 0. Get Property and AnalysisScenario right, and everything after that is accretive. Get them wrong, and every future wave fights the schema.

Start with Task 1. Today.
