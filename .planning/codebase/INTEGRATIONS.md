# Parcel Codebase Integrations

## Summary

Parcel already integrates with a few important external systems, but not the ones the new product direction will depend on most heavily.

The current integrations support:

- AI chat
- file uploads
- billing
- transactional email

The next direction will additionally require:

- property data providers
- auth provider
- background-job infrastructure
- map/geospatial services
- offline/mobile sync infrastructure later

## Current live integrations

### Anthropic

Used for AI chat and likely offer-letter/document flows.

Relevant files:

- `backend/core/ai/chat_specialist.py`
- `backend/routers/chat.py`

Current behavior:

- chat is a dedicated module
- uses a strong domain prompt
- supports deal/document context injection
- persists chat history to DB for real users

### Stripe

Used for billing and subscription lifecycle.

Relevant files:

- `backend/core/billing/stripe_service.py`
- `backend/routers/billing.py`
- `backend/routers/webhooks.py`
- `backend/models/subscriptions.py`
- `backend/models/usage_records.py`
- `backend/models/webhook_events.py`

### S3-compatible object storage

Currently implemented with boto3 against AWS-style env vars.

Relevant files:

- `backend/core/storage/s3_service.py`
- `backend/routers/documents.py`

Current design note:

- the storage abstraction is thin, which is good
- this should make a move to R2 or another S3-compatible provider straightforward

### Resend

Used for password reset email and likely other transactional messages.

Relevant files:

- `backend/core/email.py`
- `backend/routers/auth.py`

## Current missing integrations relative to the new direction

### Auth provider

The codebase still uses custom JWT auth.

Missing target integration:

- Clerk

### Property data providers

Not yet present in code:

- RentCast
- Bricked
- HouseCanary or equivalent fallback

This is a major gap because the new product promise starts with address-first analysis.

### Background jobs / queue

Not yet present in code:

- Dramatiq
- Redis / Upstash
- durable scheduled jobs

Current document processing uses FastAPI `BackgroundTasks`, which is not enough for the roadmap.

### Database capabilities

Not yet present in code:

- `PostGIS`
- `pgvector`
- RLS policies

### Mapping / route / geo services

Not visibly integrated yet:

- map tiles / clustering
- route polylines
- GPS-oriented field capture services

## Integration assessment

What exists now is coherent for an MVP.

What is missing is exactly what the new direction depends on:

- property enrichment
- jobs/alerts
- auth modernization
- geo infrastructure

That means the next wave is less about adding “more pages” and more about adding the infrastructure integrations that make the OS vision real.
