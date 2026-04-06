# Parcel Codebase Testing

## Current test setup

### Backend

- framework: pytest
- location: `backend/tests/`
- current status: passing

Observed run:

- `53 passed`

Coverage areas:

- auth
- API lifecycle
- calculators
- demo chat

### Frontend

- framework: Vitest + Testing Library
- location: `frontend/src/__tests__/`
- current status: failing

Observed run:

- `5 failed`, `39 passed`

### Frontend build

Current status: failing

Observed issues:

- unused imports / variables
- private property access issue in landing animation code

## What the failures mean

### Backend

Backend is in much better shape than the frontend for directional change.

That matters because:

- the backend can support a staged domain-model refactor
- there is already enough test confidence to keep evolving without total guesswork

### Frontend

The frontend failures are not catastrophic product bugs. They are signs of drift:

- tests assert old class names / UI expectations
- build errors show unfinished or partially cleaned-up design iteration

This usually means the UI layer is being redesigned faster than the test suite is being kept honest.

## Biggest testing gaps relative to the new direction

Missing future-critical coverage:

- property-centric flows
- scenario comparison persistence
- obligations / alerts
- reports
- contacts / buyer workflows
- jobs / async processing
- role/team data isolation

## Testing recommendation

Near-term:

- restore green frontend build
- fix brittle frontend tests or replace style-assertion-heavy ones

Before major product pivot:

- add backend tests for new root entities
- add API tests for property/deal/scenario separation
- keep frontend tests focused on user flows, not implementation details

## Verdict

The backend test story is good enough to support evolution.

The frontend test story is not strong enough yet to protect a large IA and product-shape transition without cleanup.
