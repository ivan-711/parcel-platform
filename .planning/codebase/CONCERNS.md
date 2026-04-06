# Parcel Codebase Concerns

## 1. The domain model is still deal-centric

This is the biggest concern by far.

Current state:

- `Deal` stores address, strategy, inputs, outputs, risk, and status
- `PipelineEntry` and `PortfolioEntry` both attach to `Deal`

Why this matters:

- the new product direction wants `Property` as the durable root
- Parcel cannot become a true investor OS while “the deal” remains the main container for the asset lifecycle

## 2. The frontend nav still encodes the old product

Current shell:

- Dashboard
- Analyze
- My Deals
- Pipeline
- Portfolio
- Chat
- Documents
- Pricing
- Settings

Why this matters:

- this is still a module menu for a deals platform
- it is not the IA of a property-centric system with `Today`, `Reports`, `Contacts`, `Obligations`, and `Dispositions`

## 3. AI is still mostly a destination

The current AI implementation is strongest in:

- dedicated chat
- document context
- offer-letter support

Why this matters:

- the new direction says AI should be the analytical voice of the platform
- the current code still expresses AI primarily as a place the user goes

## 4. Pricing and feature gating are stale

The code still uses:

- `starter`
- `team`
- old feature assumptions

Why this matters:

- pricing is not just copy
- it influences feature gates, tier checks, plan badges, and purchase flows

## 5. Portfolio is not yet a real portfolio layer

Current portfolio model:

- one `PortfolioEntry` attached to a closed deal
- summary charts based on those entries

Why this matters:

- the new direction needs portfolio-lite, not just historical closed-deal tracking
- there is no true property ownership layer yet

## 6. No async/job architecture yet

Current state:

- document processing uses FastAPI `BackgroundTasks`
- no queue
- no Redis
- no durable scheduled work

Why this matters:

- obligations
- morning briefings
- report generation
- enrichment
- batch processing

All depend on real async infrastructure.

## 7. Frontend build and test drift

Current state:

- frontend tests fail
- frontend build fails

Why this matters:

- the new direction already implies major frontend restructuring
- doing that on top of a non-green frontend increases risk and slows iteration

## 8. Team readiness is more structural than real

Current state:

- `team_id` exists on several models
- team/member models exist

Why this matters:

- this is good schema foresight
- but it is not yet real multi-tenant enforcement
- there is no visible RLS or robust authorization model yet

## 9. Website direction and app direction are not fully aligned

The landing page is visually ambitious and cinematic.

The app itself is more pragmatic and product-functional.

Why this matters:

- this is not inherently wrong
- but the product promise on the marketing side is already broader than what the in-app object model can currently sustain

## 10. The codebase is still very salvageable

Important counterpoint:

- this is not a broken codebase
- it is not spaghetti
- the backend especially is in workable shape

The concern is not “bad engineering.”

The concern is “the old product shape is encoded in too many places.”
