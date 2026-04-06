# Parcel Codebase Structure

## Repo layout

Top-level directories with the most value:

- `frontend/` — product UI
- `backend/` — API, data model, business logic
- `RESEARCH/` — product and market research corpus
- `SAD/` — synthesis, blueprints, audits, personas
- `UI-DESIGN/`, `UI-RESEARCH/`, `LUXURY-*`, `BILLING-*` — design and research support material

## Frontend structure

Main folders:

- `frontend/src/pages/`
- `frontend/src/components/`
- `frontend/src/hooks/`
- `frontend/src/lib/`
- `frontend/src/stores/`
- `frontend/src/types/`
- `frontend/src/__tests__/`

Current page map:

- auth pages: login, register, reset, forgot
- marketing: landing, pricing
- app pages:
  - dashboard
  - analyze
  - results
  - deals
  - compare
  - pipeline
  - portfolio
  - documents
  - chat
  - settings

This is useful because it shows the current product in the route tree:

- analyze-first
- deal-first
- module destinations

Not:

- property-first
- today-first
- obligations/reports/dispositions-first

## Backend structure

Main folders:

- `backend/routers/`
- `backend/models/`
- `backend/schemas/`
- `backend/core/`
- `backend/alembic/`
- `backend/tests/`
- `backend/scripts/`

Key router modules:

- `auth.py`
- `dashboard.py`
- `deals.py`
- `pipeline.py`
- `portfolio.py`
- `chat.py`
- `documents.py`
- `settings.py`
- `billing.py`
- `webhooks.py`

Key model modules:

- `users.py`
- `deals.py`
- `pipeline_entries.py`
- `portfolio_entries.py`
- `documents.py`
- `chat_messages.py`
- `subscriptions.py`
- `usage_records.py`
- `teams.py`
- `team_members.py`

## Structural observations

### Good

- the repo is not chaotic
- concerns are separated at a workable level
- migrations and tests are present
- frontend and backend boundaries are understandable

### Weak

- no first-class `properties` area in the backend
- no first-class `contacts`, `buyers`, `tasks`, `obligations`, `transactions`, `leases`, `rehabs`, `reports`
- route structure still mirrors the old module set
- several research/design directories exist outside execution code, which is useful strategically but increases context sprawl

## Naming pattern

The current names describe the current product accurately:

- `MyDeals`
- `Pipeline`
- `PortfolioEntry`
- `ShareDeal`
- `ComparePage`

The next product direction will likely want different top-level nouns:

- `Properties`
- `Today`
- `Reports`
- `Contacts`
- `Tasks`
- `Obligations`
- `Dispositions`

That means future work is not just adding files. It will also involve renaming the conceptual center of the app.
