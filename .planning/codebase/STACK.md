# Parcel Codebase Stack

## Summary

Parcel is currently a two-app monorepo:

- `frontend/` — React + TypeScript + Vite SPA
- `backend/` — FastAPI + SQLAlchemy + PostgreSQL-style backend

The stack is good for a solo founder. The problem is not the base stack. The problem is that the current domain model and route structure are still shaped like a deal-analysis app, not the investor operating system described in the product blueprint.

## Frontend stack

- Language: TypeScript
- Framework: React 18
- Build tool: Vite 6
- Routing: `react-router-dom`
- Data fetching: `@tanstack/react-query`
- State: Zustand
- Forms/validation: `react-hook-form`, `zod`
- Styling: Tailwind CSS + custom token system in `frontend/src/index.css`
- Motion: Framer Motion, GSAP, Lenis
- Charts: Recharts
- PDF/export: `jspdf`, `@react-pdf/renderer`
- UI primitives: Radix UI
- Tests: Vitest + Testing Library

Key files:

- `frontend/package.json`
- `frontend/src/App.tsx`
- `frontend/src/lib/api.ts`
- `frontend/src/index.css`

## Backend stack

- Language: Python
- Framework: FastAPI
- ORM: SQLAlchemy 2
- Migrations: Alembic
- DB driver: `psycopg2-binary`
- Auth: custom JWT + bcrypt-style password flow
- Rate limiting: SlowAPI
- Email: Resend
- Storage SDK: boto3
- Billing: Stripe
- AI: Anthropic SDK
- Document extraction: `pdfplumber`, `python-docx`
- Tests: pytest

Key files:

- `backend/main.py`
- `backend/database.py`
- `backend/requirements.txt`
- `backend/routers/`
- `backend/models/`

## Current database shape

The backend assumes PostgreSQL features already:

- UUID columns
- JSONB fields
- Alembic migrations

But it does **not** currently implement:

- `PostGIS`
- `pgvector`
- row-level security
- async jobs
- Redis-backed caching or queues

## Current stack strengths

- mainstream, understandable tooling
- easy solo-founder iteration speed
- no obviously exotic dependency choices
- a clean enough split between frontend app and API app
- existing billing/document/upload foundations are already useful

## Current stack mismatches with the new direction

- custom auth is still in place while the new direction assumes Clerk
- sync SQLAlchemy + direct request-thread work will not age well once enrichment, PDFs, and alerts become core
- current PDF path is still client-first, while the roadmap now wants server-side branded reports
- storage is S3-compatible already, but not yet modeled for broader document/report lifecycles
- plan tiers still use `free / starter / pro / team` instead of the newer pricing direction

## Health snapshot

- backend tests currently pass
- frontend tests currently fail
- frontend build currently fails with TypeScript issues

That means the stack is viable, but the frontend app shell and product layer are not “cleanly ready” for the next direction yet.
