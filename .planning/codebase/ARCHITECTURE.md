# Parcel Codebase Architecture

## High-level architecture

Parcel is currently a classic SPA + API application:

- React frontend calls a single FastAPI backend
- backend talks directly to the relational database
- backend also talks directly to external services like Anthropic, S3, Stripe, and email

This is simple and workable.

## Current architectural center of gravity

The current system is **deal-centric**.

That is the most important architectural fact in the entire codebase.

Examples:

- `Deal` is the root business object in `backend/models/deals.py`
- `PipelineEntry` attaches to `Deal`
- `PortfolioEntry` attaches to `Deal`
- deal results are the main analysis outcome
- frontend routes revolve around:
  - `/analyze`
  - `/deals`
  - `/pipeline`
  - `/portfolio`
  - `/chat`

The architecture currently treats “deal” as the permanent container for:

- property identity
- strategy
- underwriting inputs
- outputs
- risk score
- sharing
- pipeline progression
- portfolio handoff

That conflicts with the new property-centric blueprint.

## Frontend architecture

The frontend uses:

- route-level lazy loading in `frontend/src/App.tsx`
- per-page `AppShell` wrapping
- React Query hooks for server state
- Zustand for auth/billing local state
- a central API client in `frontend/src/lib/api.ts`

Positive pattern:

- components generally do not fetch directly with `fetch`
- hooks + `api.ts` create a decent seam for later backend changes

Negative pattern:

- the page and route model still mirrors the old product structure
- AI remains a dedicated `Chat` destination instead of a system-wide behavior
- the shell nav groups are UI-first, not domain-first

## Backend architecture

The backend is a light modular monolith:

- `routers/` for HTTP endpoints
- `models/` for SQLAlchemy entities
- `schemas/` for API contracts
- `core/` for business helpers and integrations

This is acceptable.

The bigger issue is not folder layout. It is that the domain layer is still thin and implicit.

Examples:

- calculators live under `backend/core/calculators/`
- deal creation dynamically imports calculators in `backend/routers/deals.py`
- document processing is direct and linear
- chat context is assembled in router code

This means business logic is still organized by feature endpoints, not by durable platform concepts like:

- Property
- AnalysisScenario
- Obligation
- FinancingInstrument
- Task
- Report

## Data flow

### Current analysis flow

1. frontend submits a deal-analysis payload
2. backend runs a strategy calculator
3. backend saves one `Deal` with `inputs` and `outputs` JSONB
4. frontend renders the results page for that deal

### Current pipeline flow

1. user adds a deal to pipeline
2. backend creates `PipelineEntry`
3. frontend renders kanban columns

### Current portfolio flow

1. user records a closed deal
2. backend creates `PortfolioEntry`
3. frontend uses that for KPI/charts

This is not a bad MVP architecture. It is just not the target architecture anymore.

## Architectural verdict

The codebase is structurally clean enough to evolve.

But the next direction requires a real architectural pivot:

- from deal-centric to property-centric
- from route-feature thinking to domain-object thinking
- from synchronous request-thread work to queued workflows
- from “chat page” AI to embedded system intelligence
