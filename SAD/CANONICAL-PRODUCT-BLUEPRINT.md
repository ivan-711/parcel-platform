# PARCEL — Canonical Product Blueprint

**Date:** 2026-04-03
**Status:** THE single source of truth. Supersedes all prior blueprints.
**Reconciled from:** Claude Code blueprint + Codex blueprint + 5 audit reports + IA review + persona synthesis + 29 research reports + locked design-session decisions + infrastructure validation (April 2026 web research)

---

## 1. Product Definition

Parcel is a modular, property-centric operating system for US real estate investors. It connects the stages currently fragmented across 3-7 tools: find an opportunity, analyze it across strategies, move it through acquisition, track the property after close, monitor obligations and risk, generate reports that build trust and win referrals.

Parcel's wedge is continuity. The same record survives from first look to owned asset without forcing data re-entry into other tools.

### Core Promise

**Enter an address, get a credible AI-narrated analysis in under 60 seconds, and keep moving without re-entering the deal anywhere else.**

The retention promise: Parcel stays useful after the first analysis because it knows the property, the deal, the people, the obligations, and the next action.

### Competitive Position

Competitors each own one lane. DealCheck owns analysis. REsimpli owns wholesaler CRM. DealMachine owns field capture. Stessa owns portfolio-lite. FreedomSoft owns wholesaler ops. No one connects lanes. No one has purpose-built creative finance tooling.

As of April 2026:
- The creative finance gap is verified wide open
- Smart Bricks (a16z-backed, $5M pre-seed Feb 2026) is the most credible new threat but targets institutional investors
- Bricked.ai restructured to 4 tiers ($49-$199), Growth tier at $129/mo with 300 comps
- RentCast dropped to $0-19/mo; API free tier 50 calls/mo
- DealMachine doubled entry price to $99/mo
- Invelo 2.0 relaunched as closest "investor OS" competitor but lacks creative finance depth

### What Parcel Is Not

- Not a tenant portal, rent collection system, or maintenance ticketing system
- Not full PM accounting, loan servicing, or double-entry bookkeeping
- Not a public marketplace, social network, or MLS portal
- Not a generic AI chatbot, wholesaler-only CRM, or white-label platform
- Not an STR operations suite or commercial underwriting tool

### AI Identity

AI is the analytical voice of the platform — confident analyst, not financial advisor. "The data shows this is high-risk — 8% equity cushion" not "You should not buy this."

AI adapts depth by experience level:
- Beginners: explanations woven in ("CapEx at 5% means $X/month for major repairs. For a 1965 build, 7-8% is safer.")
- Experienced: terse insights ("CapEx 5% low for 1965 build. Flagged.")

AI is embedded into Analyze, Today, Property, Deal, Report, Obligation, and Rehab surfaces. Globally summonable via floating launcher. Chat page exists as secondary drill-down, not primary experience.

### Business Model

- **Pricing:** Free / Plus ($29) / Pro ($79) / Business ($149)
- **Usage add-ons:** Comps (Bricked), skip traces (BatchData), direct mail (Lob), SMS (Twilio)
- **ARPU:** ~$76/mo direct subscription. ~$85/mo including referral value. Plan on $76.
- **Target:** Profitable solo-founder SaaS, clean enough to sell. US only.

### Why Users Switch / Why They Stay

| Persona | Switch Trigger | Retention Driver |
|---------|---------------|-----------------|
| Carlos | No other tool monitors subject-to obligations | System knows his instruments, deadlines, and risk |
| Desiree | One tool cheaper than her $522/mo stack | Pipeline + CRM continuity she'd lose by leaving |
| Tamara | Multi-strategy comparison in one place | All 5 strategies, one system of record |
| James | Branded reports in 2 minutes vs. 45 min in Canva | Every report is a growth channel |
| Angela | Portfolio intelligence without 4 tools | Lease dates, NOI, performance trends |
| Ray | Multi-flip budget view replaces the spreadsheet | Budget-vs-actual across projects |

---

## 2. Persona Prioritization

### Priority Order (locked)

| # | Persona | Role | Why This Priority | Growth Channel? | Distortion Risk |
|---|---------|------|-------------------|----------------|-----------------|
| 1 | **Carlos** | Creative Finance Investor | Blue ocean moat persona. Fastest converter (2-7 days). If Parcel fails Carlos, the moat is fake. | Yes (8-12 referrals/yr, ~$12K/24mo LTV) | Can pull too deep into servicing edge cases |
| 2 | **Desiree** | Solo Wholesaler | Largest segment, highest tool spend to displace ($472-522/mo). Tests daily workflow speed. | Some | Can distort into wholesaler CRM |
| 3 | **Tamara** | Hybrid Investor | Multi-strategy validation. Exercises OS thesis across all 5 strategies. Prevents wholesaler-CRM collapse. | Some | Least distorting; keeps product honest |
| 4 | **James** | RE Agent Serving Investors | Distribution persona. Every branded report = Parcel product demo. 3-5 client signups/90 days. | Yes (effective ARPU ~$179/mo) | Can over-rotate into white-label |
| 5 | **Angela** | Buy-and-Hold Landlord | Steady, low-churn portfolio intelligence. Validates price sensitivity. | No | Can pull into landlord ops |
| 6 | **Ray** | House Flipper | Rehab tracker value prop. Validates field updates and multi-project execution. | No | Can pull into contractor software |
| 7 | **Marcus** | Complete Beginner | Volume acquisition, long conversion. Useful for onboarding + AI calibration. | No | Can make product tutorial-heavy |
| 8 | **Kyle** | STR/Airbnb | FUTURE. Flag in schema, do not build for. STR is a separate product. | No | STR = separate rabbit hole |

### Growth Channel Analysis

Carlos and James are growth engines, not just users:
- **Carlos:** Mentors 4-5 investors, active in SubTo/Pace Morby communities. Est. 8-12 Pro referrals in Year 1.
- **James:** Serves 8-12 investor clients. Every branded report is a Parcel product demo.

### Underserved by Current Wave Plan

- **Desiree:** Full stack replacement not real until Wave 5 (skip tracing). Accept parallel-run with REsimpli/Launch Control for ~30 calendar weeks.
- **James:** Branded reports must ship in Wave 1C or his value proposition collapses.
- **Ray:** Rehab tracker easily pushed back. Explicitly assigned to Wave 1C.

---

## 3. Canonical Domain Model

### Principle

**Property is the durable root. Everything else attaches to it.**

The current codebase is deal-centric — Deal stores property identity, underwriting assumptions, and computed results in JSONB blobs. The first structural move: create Property, split AnalysisScenario out of Deal, refactor Deal into acquisition workflow.

### Entity Table

| Entity | Purpose | Attaches To | Lifecycle Rule |
|--------|---------|-------------|----------------|
| **Property** | Canonical asset/location record | Root | Exists before, during, after deals. Many deals over time. The durable identity. |
| **Deal** | Acquisition or disposition workflow | `property_id` required | Can die while property persists. Not the permanent asset home. |
| **AnalysisScenario** | Strategy-specific underwriting snapshot | `property_id` required; optional `deal_id` | Immutable snapshots. Create new to revise. Compare many per property. |
| **Contact** | Universal person/entity record | Linked via PartyRole | One contact, many roles (seller, buyer, lender, contractor, agent). |
| **BuyerProfile** | Buy-box extension of Contact | `contact_id` required | Markets, price range, strategy fit, proof-of-funds, history. |
| **Task** | Assignable action item | Polymorphic parent | Attach to property, deal, contact, obligation, rehab, or report. Powers Today. |
| **FinancingInstrument** | Mortgage, seller note, wrap, sub-to loan | `property_id` required | Persistent with own terms. Generates obligations. Multiple per property. |
| **Obligation** | Scheduled or exception-driven requirement | `property_id`; optional `financing_instrument_id` | Payments, balloons, insurance, verification. Independently queryable across portfolio. |
| **Transaction** | Investor-visible money event | `property_id` required | Actuals, not GL. Supports portfolio-lite and variance. |
| **Lease** | Occupancy/rent timing record | `property_id` required | Start, end, rent, renewal, vacancy. No tenant ops. |
| **RehabProject** | Rehab execution for flip/BRRRR | `property_id` required | Budget vs. actual. Categories roll into transactions. |
| **Communication** | Call/text/email/meeting log | Contact + Deal/Property | Linked to contacts, deals, properties. Schema from Wave 0, sending from Wave 4. |
| **Document** | Uploaded or generated file | Property, Deal, Report, etc. | Supports AI extraction and RAG. Stored in R2. |
| **Report** | Generated deliverable | Source links to property, deal, scenario | Link-first. Stores audience, brand, share state, engagement. |

### Key Column Specifications

These are the most architecturally significant columns. Full column lists are defined in Alembic migrations.

**Property (root entity):**
```
id, team_id, created_by, updated_at, is_deleted
address_line1, address_line2, city, state, zip_code, county, fips_code
location (PostGIS POINT — enables "within X miles" queries)
property_type (ENUM: single_family, multi_family, condo, townhouse, mobile, land, commercial, other)
bedrooms, bathrooms, sqft, lot_sqft, year_built
lifecycle_state (ENUM: prospect, analyzing, under_contract, owned, sold, archived)
acquisition_date, acquisition_price, current_estimated_value
parcel_number, zoning, flood_zone
source (ENUM: manual, import, api, d4d)
notes (TEXT)
search_vector (tsvector — GIN indexed for full-text search)
```

**AnalysisScenario:**
```
id, team_id, property_id (FK), deal_id (FK, optional), created_by, updated_at, is_deleted
strategy (ENUM: wholesale, brrrr, buy_and_hold, flip, creative_finance)
version (INT — monotonic per property+strategy)
assumptions (JSONB — typed keys: purchase_price, arv, rehab_cost, rent, vacancy_rate, capex_rate, etc.)
outputs (JSONB — typed keys: cash_flow, coc_return, noi, cap_rate, total_profit, irr, npv, etc.)
risk_score (DECIMAL), risk_factors (JSONB ARRAY — each: {factor, severity, explanation})
confidence (ENUM: high, medium, low, manual)
ai_narrative (TEXT — AI-generated analysis summary)
data_sources (JSONB ARRAY — each: {field, provider, timestamp, raw_value})
is_primary (BOOLEAN — one primary per property+strategy)
```

**FinancingInstrument:**
```
id, team_id, property_id (FK), deal_id (FK, optional), created_by, updated_at, is_deleted
instrument_type (ENUM: conventional, hard_money, seller_note, subject_to, wrap, lease_option, private_money, heloc)
lender_name, lender_contact_id (FK, optional)
original_balance, current_balance, interest_rate, term_months
payment_amount, payment_frequency (ENUM: monthly, quarterly, annual)
origination_date, maturity_date, balloon_date
is_assumable (BOOLEAN), due_on_sale_risk (ENUM: none, low, medium, high)
underlying_instrument_id (FK, self-referential — for wraps referencing sub-to loans)
status (ENUM: active, paid_off, defaulted, refinanced)
notes (TEXT)
```

**Obligation:**
```
id, team_id, property_id (FK), financing_instrument_id (FK, optional), lease_id (FK, optional)
created_by, updated_at, is_deleted
obligation_type (ENUM: payment, balloon, insurance_renewal, tax_due, verification, servicer_transfer, lease_renewal, inspection)
title (VARCHAR), description (TEXT)
due_date (DATE), recurrence_rule (VARCHAR — iCal RRULE format for recurring obligations)
amount (DECIMAL, optional)
severity (ENUM: info, warning, critical)
status (ENUM: upcoming, due, verified, missed, resolved, snoozed)
verified_by, verified_at, verification_notes
snoozed_until (DATE, optional)
```

**Deal:**
```
id, team_id, property_id (FK), created_by, updated_at, is_deleted
deal_type (ENUM: acquisition, disposition)
strategy (ENUM: wholesale, brrrr, buy_and_hold, flip, creative_finance)
stage (ENUM: lead, contacted, analyzing, offer_sent, under_contract, due_diligence, closing, closed_won, closed_lost, archived)
stage_entered_at (TIMESTAMP — for stale deal detection)
offer_price, contract_price, close_date
assignment_fee (DECIMAL, optional — for wholesale)
notes (TEXT)
source (ENUM: manual, import, d4d, skip_trace, referral, other)
```

### Required Support Entities

| Entity | Why It's Needed |
|--------|----------------|
| **PartyRole** | Contact-to-Deal/Property junction with role context. Without it, relationships are ambiguous. |
| **ImportJob** | Tracks migration provenance — what was mapped, what was lost, source file. |
| **DataSourceEvent** | API call provenance — which data from RentCast vs. Bricked vs. manual. Makes confidence labels defensible. |

### Relationship Hierarchy

```
Property (root)
├── Deal[] → AnalysisScenario[]
├── FinancingInstrument[] → Obligation[]
├── Lease[]
├── RehabProject[]
├── Transaction[]
├── Document[]
├── Report[]
├── Task[] (also attachable to Deal, Contact, etc.)
└── Communication[] (also linked to Contact, Deal)

Contact → BuyerProfile (optional)
       → PartyRole[] → Deal[], Property[]
       → Communication[], Task[]
```

### Schema Rules

1. All tables: `team_id` FK + RLS from Wave 0. Team UI ships on demand.
2. All tables: `created_by`, `updated_at`, `is_deleted` (soft delete).
3. Each module: own Alembic migration, FastAPI router, React lazy bundle.
4. Feature gating: tier + feature flag. Locked features show with upgrade prompt — not hidden, not trial-once.
5. JSONB for structured data only with typed keys. Never as catch-all blob.
6. `DataSourceEvent` linked to every auto-filled field. Confidence labels require provenance.

### Module Map

```
property-core    | analysis        | deals-pipeline
people           | portfolio       | finance-monitoring
rehabs           | reports         | documents-rag
communications   | outreach        | mobile-d4d
```

---

## 4. Core Operating Journeys

### Journey 1: Address → Analysis → Save

**Entities:** Property, AnalysisScenario, DataSourceEvent, optional Deal
**AI:** Narrates assumptions, flags risks, states confidence. No financial advice.
**Delivers in:** Wave 1A-1C

Flow: Address input → RentCast quick snapshot → Bricked deeper underwriting → AI draft analysis with confidence labels → user confirms/edits → save as Property + AnalysisScenario(s) → next action (save / pipeline / report / compare)

**Failure Mode Matrix:**

| Scenario | UX | Cost |
|----------|-----|------|
| Both APIs succeed | Full auto-fill, high-confidence analysis | ~$0.20-0.50 |
| RentCast OK, Bricked fail | Quick analysis immediately. Missing advanced fields labeled "Needs confirmation." Orange banner: "Advanced underwriting unavailable." | RentCast only |
| RentCast OK, Bricked partial | Fill available data, label gaps. AI adjusts confidence. | Normal |
| RentCast OK, Bricked timeout (>30s) | Progressive loading. At 30s: "Continue with available data" option. | Normal |
| RentCast fail, Bricked OK | Underwriting fills. Missing basics prompt manual entry. | Normal |
| Both fail | Manual entry form with AI assist. Banner: "Data services temporarily unavailable." | $0 |
| Quota exhausted | Quota banner + manual-entry path. Premium comps available by explicit user action only. | User-consented |

**Key policy:** No silent 10-60x cost fallback. No fake certainty. Always a path forward.

### Journey 2: Deal → Pipeline → Close

**Entities:** Deal, Property, Contact, Task, Communication, Document, Transaction
**AI:** Summarizes risk, suggests next action, surfaces stale deals.
**Delivers in:** Wave 1B-1C

Close actions convert deal outputs into Property, Transaction, and FinancingInstrument records. Pipeline is for transactions in motion, not permanent asset home.

**Failure modes:**
- Contact linked to deal is missing phone/email → CRM prompts enrichment, doesn't block pipeline
- Deal stage stale >14 days → surfaces in Today with "still active?" prompt
- Close action missing required fields → guided checklist before conversion

### Journey 3: Property → Portfolio → Obligations

**Entities:** Property, FinancingInstrument, Obligation, Lease, Transaction, RehabProject
**AI:** Monitors risk, flags underperformance, highlights refi/renewal windows. Powers Today for Carlos.
**Delivers in:** Wave 1B (property shell), Wave 2 (obligations), Wave 3A (richer portfolio)

This is where Parcel becomes more than a CRM. This is the moat.

**Failure modes:**
- Obligation date passes without verification → escalates in Today with increasing severity
- Payment source API unavailable → manual verification prompt, never auto-marks as verified
- Portfolio NOI calculation missing data → shows partial with "X properties excluded" label

### Journey 4: Deal → Buyer Matching → Assign

**Entities:** Deal, Property, BuyerProfile, Contact, Report, Communication
**AI:** Ranks buyers by fit, suggests packet content.
**Delivers in:** Wave 3B

Double-close: IN as disposition stage. Assignment contracts: OUT (link to DocuSign). Buyer import from spreadsheet: IN. Public marketplace: OUT.

**Failure modes:**
- Zero buyers match property criteria → show "No matches. Broaden criteria or add buyers" with import CTA
- Buyer's proof-of-funds expired → flag in match list, don't exclude
- Disposition deal closed but no Transaction created → close action includes Transaction creation step

### Journey 5: Today / Morning Briefing

**Entities:** Task, Obligation, Deal, Lease, RehabProject, Communication
**AI:** Concise morning briefing, ranked by urgency.
**Delivers in:** Wave 1B (basic: tasks + stale deals), Wave 2 (obligation-powered)

Dashboard reflects health. Today reflects action. Both show morning briefing — Today in actionable form, Dashboard as compact summary.

**Failure modes:**
- No items to show → "All clear" card with quick-action bar (add property, import, check portfolio)
- Obligation engine fails to generate alerts → Sentry cron monitor alert to founder; Today shows tasks + stale deals only
- Morning briefing AI generation fails → show raw item list without narrative; banner: "AI summary unavailable"

**Today item priority (descending):**
1. Missed obligations (critical severity)
2. Due-today obligations
3. Overdue tasks
4. Stale deals (>14 days in stage)
5. Upcoming obligations (next 7 days)
6. Due-soon tasks
7. Onboarding items (new users only)

### Journey 6: Report → Share → Referral Loop

**Entities:** Report, Property, AnalysisScenario, Contact
**AI:** Audience-aware narrative, analytical tone.
**Delivers in:** Wave 1C (basic branded report), Wave 3B (engagement tracking + buyer packets)

Reports are communication surfaces, not passive exports. Every James report is a Parcel product demo. Reports render as shareable web links first; PDF export via Playwright is secondary.

**Failure modes:**
- Playwright PDF generation fails → show error "PDF generation failed. Share via link instead." Link sharing always works.
- Report data stale (property updated since generation) → banner on shared link: "Updated data available. Regenerate?"
- Shared report accessed by non-user → "Powered by Parcel" CTA visible. No login wall on shared reports.

---

## 5. Information Architecture

### Today vs Dashboard

**Today is the default landing page.**[^1]

- Today: due now, urgent, stale, actionable, triage-oriented
- Dashboard: portfolio health, pipeline totals, trends, strategic overview
- Morning briefing: actionable head in Today, compact card in Dashboard
- Quiet state: Today collapses to "All clear" with quick-action bar

[^1]: Both Codex blueprints (original and final) support this. IA review agrees. Carlos's activation depends on it.

### Desktop Sidebar

```
HOME
  Today (default landing)
  Dashboard
  Chat (secondary AI surface)

DEALS
  Analyze
  Pipeline
  Properties

PEOPLE
  Contacts
  Buyers (Wave 3B)
  Inbox (Wave 4)

ASSETS
  Portfolio
  Obligations (Wave 2)
  Rehabs (Wave 1C)
  Transactions (Wave 3A)

OUTPUTS
  Reports
  Documents

OUTREACH (Wave 4+)
  Sequences (Wave 4)
  Skip Tracing (Wave 5)
  Mail Campaigns (Wave 6)
  D4D (Wave 7)

─── bottom ───
Settings
Compliance
```

AI is globally summonable via floating launcher (keyboard shortcut + header icon). Chat under HOME provides sidebar discoverability.[^2]

[^2]: Claude Code's floating-launcher-only approach was cleaner but risks discoverability. Chat in sidebar under HOME is the compromise.

### Mobile Bottom Tabs

Pre-Wave 7: `Today | Analyze | Pipeline | Chat | More`
Post-Wave 7: `Today | Analyze | Pipeline | D4D | More` (Chat moves to More)

Global mobile: AI floating icon (top-right). FAB: Add Property, Scan Document, Quick Analysis.

### Nav Evolution by Wave

| Wave | New Nav Items |
|------|--------------|
| 0 | None (schema only) |
| 1A | Today, Analyze (address-first) |
| 1B | Dashboard, Pipeline, Properties, Portfolio, Contacts |
| 1C | Reports, Documents, Chat, Rehabs |
| 2 | Obligations |
| 3A | Transactions |
| 3B | Buyers |
| 4 | Inbox, Sequences |
| 5 | Skip Tracing |
| 6 | Mail Campaigns |
| 7 | D4D (+ mobile bottom tab) |

Rule: Only shipped modules in nav. Locked-but-shipped features show with upgrade prompt. Unshipped = hidden.

### Module Gating

Three states: **Available** (shipped, usable) / **Locked** (shipped, requires upgrade) / **Planned** (not shipped, not in nav).

Persona-specific upgrade prompts:
- Marcus: Calm, explains why now. No feature walls.
- Angela: Lead with time saved. Short trial at gate.
- Desiree/Ray/Tamara: Terse. Workflow compression or revenue impact.
- Carlos: "Unlock subject-to monitoring" not "upgrade for advanced features."

---

## 6. Infrastructure Stack

### Validation Method

All tools validated via web research, April 2026. Pricing, versions, compatibility, and recent incidents verified for each.

### The Stack

| Layer | Pick | Why | Cost @100 users | Cost @10K users | Escape Hatch |
|-------|------|-----|----------------|-----------------|--------------|
| Database | **Railway PostgreSQL** (PG18 HA) | Already running. All 6 DB requirements met. Usage-based. $15-25/mo at seed. | $15-25 | $150-300 | PG-to-PG to Neon or Crunchy Bridge (2 hrs) |
| Extensions | **PostGIS + pgvector + pg_trgm** | Geospatial, vectors, fuzzy search in same instance. `CREATE EXTENSION` (5 min). | $0 | $0 | N/A |
| Vectors | **pgvector** (same instance) | <1M vectors = 10-30ms HNSW. RLS filtering. No extra service. | $0 | $0 | Qdrant Cloud ($25/mo) at 5M+ vectors |
| Auth | **Clerk** | Free through 50K MAU (expanded from 10K). Official Python SDK. Google, Apple, magic links, MFA. | $0 | $0 | Export users + rebuild (1-2 weeks) |
| File Storage | **Cloudflare R2** | Zero egress. S3 API (boto3). 10GB free. $0.015/GB. | $0 | $3-5 | S3/B2 (same API) |
| Background Jobs | **Dramatiq + Railway Redis** | Configurable retry, exponential backoff, DLQ. Redis as persistent broker. | $5-10 | $10-20 | Swap to Taskiq or Celery |
| Caching | **PG materialized views** → Upstash Redis | Mat views sufficient at <1K users. Upstash free: 500K cmds/mo. | $0 | $5-10 | Any Redis protocol |
| Search | **PG tsvector + GIN + pg_trgm** | Sub-100ms at <50K records. No extra service. | $0 | $0-30 | Meilisearch ($30/mo) |
| PDF Generation | **Playwright** (headless Chromium) | Pixel-perfect. Same HTML/CSS renders on screen and in PDF. JS charts supported. | $0 | $0 | Gotenberg (Docker) |
| Monitoring | **Sentry** | 5K errors/mo free. FastAPI integration. Dramatiq error reporting. | $0 | $26+ | BetterStack, Logfire |
| Hosting | **Railway** (API + workers) | Usage-based. Multi-service. Pro: $20/mo + usage. Up to 48GB RAM/service. | $10-15 | $30-50 | Docker deploys anywhere |
| Real-Time | **SSE** (existing for AI chat) | No real-time needed until teams. 30s polling sufficient. | $0 | $0 | WebSocket when needed |
| Offline (Wave 7) | **PowerSync** | Syncs PG → client SQLite. Free tier 2GB/mo. Capacitor SDK available (alpha). | $0 | $49+ | @capacitor-community/sqlite |

### Infrastructure Decisions — Detail

#### Database: Railway PostgreSQL (stay)

Railway's PG18 HA template includes PostGIS + pgvector pre-configured. Already running — zero migration effort. SQLAlchemy 2.x connects via `asyncpg` or `psycopg` without issues. No PgBouncer double-pooling risk (unlike Supabase). Add PgBouncer sidecar before 500+ concurrent connections.

Recent incidents: Feb 2026 abuse enforcement misconfiguration (~3% of deployments, 98-min resolution). Mar 2026 partial networking outage (22 min). Acceptable for a non-mission-critical SaaS.

**Why not Supabase:** Real production cost $125/mo+ (not advertised $25). You'd pay for Realtime/Storage/Auth you won't use. 41 incidents in 90 days. PgBouncer double-pooling with SQLAlchemy is a known issue.

**Why not Neon:** Cold starts (300-500ms) hurt first-request latency. Under sustained load, compute billing can exceed fixed providers. Owned by Databricks — unclear indie SaaS strategy.

#### Auth: Clerk

Free tier expanded to **50K MAU** (up from 10K in 2025). Official `clerk-sdk-python` v1.1.0 (March 2026). For FastAPI: `fastapi-clerk-auth` middleware validates JWTs against Clerk's JWKS endpoint.

What Clerk stores: identity data (email, name, avatar, OAuth tokens, MFA config, sessions). What Parcel stores: `clerk_user_id` FK in local `users` table + all domain data (tier, properties, preferences).

Organizations available on free tier (up to 100 orgs). API key generation is not native — build it yourself tied to Clerk org IDs.

Data export: Dashboard CSV with hashed passwords. Programmatic via `GetUserList` API. Open-source migration tool available. No vendor lock-in concern.

#### Background Jobs: Dramatiq + Railway Redis

**Critical finding:** Dramatiq is incompatible with Upstash Redis. Dramatiq's broker uses `KEYS`, `WATCH`, and Lua scripts restricted by serverless Redis (confirmed via GitHub issue #754). Use Railway Redis add-on (~$5/mo) as persistent broker instead.

Dramatiq v2.1.0 (released March 2026). Python 3.12+ compatible. Retry: exponential backoff, configurable `max_retries`, `min_backoff`, `max_backoff`, `max_age` per actor. Dead letter queue built-in (7-day retention). Cron/scheduling requires APScheduler (`dramatiq-apscheduler` package).

Deploy Dramatiq worker as separate Railway service with its own Dockerfile. Internal networking to Railway Redis and PostgreSQL.

#### PDF Generation: Playwright

Playwright Python v1.58.0. Headless Chromium adds ~250-300MB to container. Minimum 1GB RAM per browser instance; 2GB recommended.

**Deploy as separate Railway service** to isolate memory from API. Set `MALLOC_ARENA_MAX=2` and `PYTHONMALLOC=malloc` for memory optimization. Railway supports up to 48GB RAM per service (Hobby) — more than sufficient.

PDF settings: `page.pdf()` supports A4/Letter, margins, header/footer templates, print CSS, `@media print`. Custom fonts via `@font-face` in HTML. Use `page.wait_for_load_state()` to ensure web font loading.

Can run in Dramatiq worker: yes, but Playwright is sync-blocking per call. Wrap async code with `asyncio.run()` inside actor. Each worker process needs its own browser instance.

#### File Storage: Cloudflare R2

Free tier confirmed: 10GB storage, 1M Class A ops, 10M Class B ops. Zero egress (always, all tiers). S3 API compatible — boto3 with 2-line config change. Presigned URLs supported (must use S3 endpoint, not custom domains). CORS configurable per bucket. Max 5GB single upload, 5TB multipart. Custom domains via Cloudflare DNS with automatic CDN routing.

#### Monitoring: Sentry

Free Developer tier: 5K errors/mo, 5M spans (tracing), 1 cron monitor, 1 uptime monitor, 30-day retention, 1 user. FastAPI integration is first-class and auto-enabled. Dramatiq integration exists (`DramatiqIntegration`) — error reporting only, no tracing spans. Custom instrumentation required for deeper background job visibility.

### Cross-Tool Compatibility (verified)

| Check | Status | Notes |
|-------|--------|-------|
| Railway PG + SQLAlchemy pooling | **OK** | No PgBouncer double-pooling (unlike Supabase). Standard connection pooling works. |
| Dramatiq + Railway Redis | **OK** | Persistent Redis with full command support. No serverless restrictions. |
| Playwright on Railway | **OK** | Separate service. Set memory env vars. Railway example repo exists. |
| Region alignment | **OK** | Railway US-West for all services. R2 global CDN. Redis in same Railway project = internal network. |
| Clerk JWT + FastAPI | **OK** | JWKS validation via middleware. No latency concern. |

### Total Cost Model

| Scale | DB | Storage | Auth | Jobs + Redis | Cache | Search | Hosting | Monitor | **Total** |
|-------|-----|---------|------|-------------|-------|--------|---------|---------|-----------|
| 100 users | $15-25 | $0 | $0 | $5-10 | $0 | $0 | $10-15 | $0 | **$30-50/mo** |
| 1K users | $40-70 | $0-1 | $0 | $5-15 | $0-3 | $0 | $15-25 | $0 | **$60-115/mo** |
| 10K users | $150-300 | $3-5 | $0 | $10-20 | $5-10 | $0-30 | $30-50 | $26 | **$225-440/mo** |

At 10K users paying $29-149/mo, revenue is $29K-$149K/mo. Infrastructure at $225-440/mo is 0.3-1.5% of revenue.

---

## 7. Build Order

### Planning Assumptions

- Solo founder, 25-30 hrs/week on Parcel
- "Dev-weeks" below are effort estimates (~40 hrs each)
- Calendar time = dev-weeks × 1.5 (part-time adjustment) + 15% slippage
- Total roadmap: ~36-44 calendar weeks[^3]

[^3]: Claude Code estimated 22 weeks assuming full-time. Codex estimated 36-44 weeks at 25-30 hrs/week. Codex is honest.

### Wave 0: Schema Foundation + Infrastructure (4 dev-weeks)

**Ships:**
- `Property` table: address, PostGIS location, physical characteristics, lifecycle state
- `AnalysisScenario` table: strategy, assumptions, outputs, risk flags, AI narrative, confidence
- `Deal` refactor: acquisition workflow linked to Property. Extract JSONB into typed AnalysisScenario columns
- `Contact`, `Task`, `Communication`, `Transaction`, `Report` table stubs
- `PartyRole`, `ImportJob`, `DataSourceEvent` support tables
- PostGIS + pgvector + pg_trgm extensions enabled
- RLS policies on all tables with `team_id`
- Billing config updated: Free / Plus / Pro / Business at $29/$79/$149
- **Infrastructure setup:** Railway Redis add-on, Dramatiq worker service, Cloudflare R2 bucket, Clerk integration, Sentry integration

**Infrastructure migration effort:**
| Task | Effort |
|------|--------|
| PG extensions (`CREATE EXTENSION`) | 5 min |
| R2 bucket + boto3 config swap from S3 | ~1 hr |
| Clerk auth integration (replace custom JWT) | 2-3 days |
| Railway Redis + Dramatiq worker setup | ~4 hrs |
| Sentry integration | ~1 hr |

**Data migration (existing deals):**
- Write a one-time migration script that creates Property records from existing Deal address data
- Create AnalysisScenario records from existing Deal JSONB inputs/outputs
- Add `property_id` FK to existing Deal records
- Preserve all existing data — nothing deleted
- Run as Alembic data migration (not schema migration) so it's reversible
- Verify: every existing Deal must have a linked Property after migration

**Does not ship:** UI changes (except billing labels). Schema + infrastructure only.

### Wave 1A: Activation Front Door (3 dev-weeks)

**Ships:**
- Address-first onboarding (address input first, not strategy selector first)
- Persona question at signup: "What's your primary strategy?" → 8 branches
- Sample data per branch (clearly labeled "Demo", archivable)
- RentCast-based quick analysis with failure-mode UX
- Progressive loading and timeout handling (30s threshold)
- "Analyze your first deal" CTA
- Activation tracking (per-persona criteria)

**Persona activation:** Marcus (AI catches risk he'd miss)

### Wave 1B: Day-One Continuity (3 dev-weeks)

**Ships:**
- Property detail pages (first time users see properties as first-class)
- Core CRM: Contact CRUD, link to deals/properties, role tagging
- Pipeline refactor: deals linked to properties, close actions create/update Property
- Today view: task aggregation, stale deals, onboarding items
- Morning briefing card on Dashboard
- Manual communication logging (calls/meetings/notes against contacts and deals)
- Basic portfolio dashboard: owned properties with summary metrics

**Persona activations:** Angela (portfolio with all units), Desiree (CRM + pipeline)

### Wave 1C: Trust & Differentiation (3 dev-weeks)

**Ships:**
- Bricked integration for deeper underwriting
- Multi-strategy comparison view
- Branded report v1 (brand kit + Playwright PDF export)
- RAG document chat (pgvector-powered)
- RehabProject v1: budget vs. actual, scope categories
- Spreadsheet template import (CSV templates for properties, contacts, transactions)

**Persona activations:** Tamara (3-strategy comparison), James (branded report), Ray (rehab tracker)

### Wave 2: Creative Finance — The Moat (4 dev-weeks)

**Ships:**
- FinancingInstrument model (conventional, hard money, seller notes, sub-to, wraps, lease options)
- Obligation engine (payments, balloons, insurance, tax, verification, servicer transfers)
- Creative finance monitoring dashboard (top-level under ASSETS > Obligations)
- Obligation-powered Today items (balloon countdowns, payment verification, insurance compliance)
- Lease model (start/end, rent, renewal, vacancy)
- AI risk analysis for creative structures (due-on-sale exposure, equity cushion)
- Calculator upgrades (NPV, IRR, sensitivity)

**Persona activation:** Carlos (obligation alerts) — **This is the moat moment.**

### Wave 3A: Portfolio & Execution Depth (2 dev-weeks)

**Ships:**
- Transactions UI: manual entry, import, portfolio rollup
- Lease timeline visualization
- Rehab tracker improvements: photo uploads, trade-level detail
- Portfolio variance views (actual vs. pro forma)
- Calculator upgrades: 1031 exchange, sensitivity tables

**Persona activations:** Angela (lease visibility), Ray (flip execution depth)

### Wave 3B: Dispositions (3 dev-weeks)

**Ships:**
- BuyerProfile model: buy-box fields, match scoring, proof-of-funds, history
- Buyers as nav destination under PEOPLE
- Property-to-buyer matching (rules-based: geography > price > strategy > type)
- Disposition pipeline stages (marketed, interested, offer, contract, assigned/closed)
- Buyer import from CSV
- Deal packet generation
- Report engagement tracking (opens, time)
- "Powered by Parcel" CTA on shared reports

**Persona activations:** Desiree (close the disposition loop), James (engagement tracking)

### Wave 4: Communications (3 dev-weeks)

**Ships:**
- Twilio SMS: outbound, opt-in/opt-out, A2P 10DLC hard gate
- Email: basic outbound, templates
- Inbox view under PEOPLE
- Drip sequences: multi-step SMS/email with scheduling
- Sequence templates by use case
- Launch Control CSV/webhook bridge for transitional users

**Persona activation:** Desiree (SMS from Parcel)

### Wave 5: Skip Tracing (2 dev-weeks)

**Ships:**
- BatchData integration: per-match pricing, results linked to contacts
- Compliance gating, California review gate
- Usage-based billing for skip traces

**Persona activation:** Desiree (full stack replacement complete)

### Wave 6: Direct Mail (2 dev-weeks)

**Ships:**
- Lob integration: postcards, letters
- Campaign builder: audience from contacts, template design
- Mail tracking: delivery status, response attribution
- Usage-based billing

### Wave 7: iOS Native + D4D (7-8 dev-weeks)

**Ships:**
- Capacitor 8 wrapper (Node.js 22+, iOS 26 SDK, SPM)
- Push notifications (APNs), biometric auth, haptics, deep linking
- D4D: Transistor GPS v9, route tracking, photo/note capture, property creation from field
- D4D as mobile bottom tab (replaces Chat)
- PowerSync offline sync (Capacitor SDK — verify maturity before committing; fallback: @capacitor-community/sqlite)
- Privacy manifest + AI data disclosure (iOS Guideline 5.1.2(i))
- External web checkout link (exploit commission-free window)

### Timeline Summary

| Wave | Content | Dev-Weeks | Calendar Weeks (est.) |
|------|---------|-----------|----------------------|
| 0 | Schema foundation + infrastructure | 4 | 6-7 |
| 1A | Activation front door | 3 | 4-5 |
| 1B | Day-one continuity | 3 | 4-5 |
| 1C | Trust & differentiation | 3 | 4-5 |
| 2 | Creative finance (moat) | 4 | 6-7 |
| 3A | Portfolio & execution depth | 2 | 3-4 |
| 3B | Dispositions | 3 | 4-5 |
| 4 | Communications | 3 | 4-5 |
| 5 | Skip tracing | 2 | 3-4 |
| 6 | Direct mail | 2 | 3-4 |
| 7 | iOS + D4D | 7 | 10-12 |
| **Total** | | **36** | **~50-60 calendar weeks** |

Waves 3A+3B can partially overlap. Waves 6+7 can overlap. Optimistic total: ~40 calendar weeks. Realistic total with life interruptions: ~50-60.

### Intra-Wave Dependency Order

Within Wave 1, the build order must be:
1. Property + AnalysisScenario (1A depends on Wave 0)
2. Address-first analysis with RentCast (1A)
3. CRM + property detail + pipeline refactor (1B)
4. Branded report v1 (1C — depends on property/scenario model)
5. RAG chat (1C — depends on document + property model)

Do not start reports or RAG before the property/deal split is stable.

### Desiree's Stack Replacement Timeline

Desiree converts on CRM + multi-strategy comparison (Wave 1B-1C). She runs Parcel + REsimpli/Launch Control in parallel until Wave 5 (skip tracing). This is ~30 calendar weeks. Accept this. Do not pretend Parcel replaces her outbound engine in Wave 1. Ship a Launch Control CSV bridge in Wave 4 to reduce friction.

---

## 8. Audit Resolutions

### Blockers (all resolved)

| Item | Resolution |
|------|-----------|
| B1: API failure modes | Resolved: failure mode matrix in Journey 1. No silent premium fallback. |
| B2: Onboarding mechanics | Resolved: Section 9 — branching, sample data, empty states, activation criteria, re-onboarding. |
| B3: Spreadsheet migration | Resolved: template-first CSV import. No magic AI import in v1. |
| B4: Pricing inconsistency | Resolved: Free / Plus $29 / Pro $79 / Business $149. Updated Wave 0. |
| B5: Unified roadmap | Resolved: Section 7 — sub-waves with solo-dev estimates. |

### Fixes (all addressed)

| Item | Resolution |
|------|-----------|
| F1: Bricked pricing | Growth tier $129/mo assumed. Monitor for Scale upgrade. |
| F2: RentCast cheaper | Wave 1A uses RentCast as low-cost quick-analysis layer. |
| F3: DealMachine doubled | Desiree value prop improves ($522 → $79-119). |
| F4: TCPA rule struck down | Favorable. Build unified opt-out tracking for Jan 2027 revocation rule. |
| F5: iOS commission-free | Wave 7 includes external web checkout. Monitor court fee determination. |
| F6: Colorado AI Act | Impact assessment before June 30, 2026 if AI touches housing decisions. |
| F7: California Delete Act | Assess data broker classification before August 1, 2026. |
| F8: Calculators mislabeled | Wave 0 (shipped). Monitoring is Wave 2. |
| F9: Dispositions unassigned | Assigned to Wave 3B. |
| F10: Desiree ships late | Parallel-run acknowledged. Launch Control bridge in Wave 4. |
| F11: Transactions missing | Added under ASSETS in sidebar. |
| F12: Comms logging conflict | Schema Wave 0, manual logging Wave 1B, Twilio Wave 4. |
| F13: ARPU inflated | Plan on $76/mo direct. Report $85/mo with referrals separately. |
| F14: App Store AI disclosure | Wave 7 submission checklist includes iOS Guideline 5.1.2(i). |

### Infrastructure Audit Findings (from April 2026 validation)

| Finding | Impact |
|---------|--------|
| Dramatiq incompatible with Upstash Redis | Switched to Railway Redis (~$5/mo). Upstash still available for caching. |
| Clerk free tier expanded to 50K MAU | Positive. Auth costs $0 well past initial growth. |
| Upstash free tier is 500K cmds/mo (not 10K/day) | Positive. Caching upgrade path cheaper than expected. |
| PowerSync Capacitor SDK is alpha | Flagged for Wave 7. Fallback: @capacitor-community/sqlite. |
| Playwright needs separate Railway service | Memory isolation. Deploy as dedicated worker service. |
| Sentry Dramatiq integration lacks tracing | Error reporting only. Custom instrumentation for job visibility. |
| Railway Feb 2026 abuse enforcement incident | ~3% deployments affected, resolved in 98 min. Acceptable. |

---

## 9. Onboarding Specification

### Signup Flow

1. Email/password or Google OAuth (via Clerk)
2. "What's your primary strategy?" → 8 options: Wholesale, BRRRR, Buy and hold, Flip, Creative finance, Multiple strategies, Agent serving investors, I'm just getting started
3. Strategy-matched sample workspace (labeled "Demo")
4. "Analyze your first deal" prominent CTA

### Activation Criteria (per persona)

| Persona | Activation Event |
|---------|-----------------|
| Marcus | Completes first analysis + reads one AI explanation panel |
| Desiree | Compares 2+ strategies on one property + moves one deal into pipeline |
| Carlos | Creates one financing instrument + sees one obligation alert |
| Tamara | Saves one property with 3 strategy scenarios |
| James | Generates and shares one branded report |
| Angela | Adds 2 owned properties + sees portfolio totals |
| Ray | Adds one rehab project + sees budget vs. actual |
| Kyle | Runs one creative finance scenario + sees STR gap note |

### Sample Data Lifecycle

- Clearly labeled "Demo" with visual distinction
- User can delete anytime via Settings
- Auto-archives (hidden, not deleted) after user creates 3+ real records or after 14 days of inactivity
- Never counted in analytics, metrics, or billing

### Empty States

Every module gets a strategy-aware empty state:
- Today: onboarding checklist + sample morning briefing
- Pipeline: demo records + import CTA
- Properties: address input or CSV import
- Portfolio: "Close a deal to see it here" + sample card

### Re-onboarding

- Abandoned flow resumes at last incomplete step
- 7 days with no real data → Dashboard re-entry card: "Resume analysis" / "Import spreadsheet" / "Explore sample deals"
- "I'm just getting started" / "I'm exploring" → routes to Multiple Strategies branch (broadest experience)

### Spreadsheet Migration (template-first)

- CSV templates for: Properties, Contacts, Buyers, Deals, Transactions, Leases, Tasks
- Google Sheets-compatible versions
- Auto-detect common column names (Address / Property Address / Street)
- Preserve unmapped columns as metadata — never silent data loss
- Competitor-specific import playbooks ship Wave 4+ by demand
- "Smart import" is post-v1

---

## 10. Hard Product Boundaries

### Does Not Build (next 12 months)

| Category | Excluded | Integration Path |
|----------|----------|-----------------|
| Tenant ops | Portal, rent collection, maintenance, vendor dispatch | Export financial data. Sync lease dates. |
| Full accounting | Double-entry, trust accounting, 1099s | CSV/QBO export of transactions. |
| Screening | Credit checks, background checks, leasing | Link to services from contact. |
| Loan servicing | Payment processing, escrow | Track obligations, don't service them. |
| Marketplace | Buyer marketplace, deal marketplace, social | Future exploration post-profitability. |
| MLS | IDX feeds, agent search, browsing | User imports by address. |
| White-label | Custom domains, brand removal | Strong user branding + subtle Parcel attribution. |
| STR ops | Seasonal modeling, channel mgmt, guest comms | Flag STR in property type. Manual income. |
| Commercial | 5+ unit underwriting, syndication, DSCR | Out of scope v1. |
| International | Non-US data, compliance | US only. |
| AI decisioning | AI lead scoring, tenant screening, automated approval | AI is analytical, not decisioning. Colorado AI Act compliance. |

### Edge Cases Out of Scope v1

- Inherited properties: manual override for cost basis; no special flow
- Tax lien/deed: "Other" strategy; no dedicated workflow
- Land/vacant lots: manual entry; no land-specific calculator
- Mobile home: manual entry; flag chattel vs. real property
- Out-of-state: supported by default (address-based, not location-restricted)

---

## 11. Engineering Principles

### 1. Accuracy Over Speed

Never show a user a number you can't trace back to a source. Every auto-filled data point stores its provider, timestamp, and confidence level via `DataSourceEvent`. When sources disagree, show both — never silently average or pick one.

**Implementation:**
- Every API data fetch creates a `DataSourceEvent` record linking source, timestamp, raw value, and confidence
- AI narratives label assumptions: "Based on RentCast estimate (±8%)" not "Rent is $1,400"
- Confidence levels visible on every auto-filled input: green (verified), yellow (estimated), orange (needs confirmation)
- User can edit every auto-filled value; edits logged as manual override

### 2. Graceful Degradation

Every external dependency (Bricked, RentCast, Twilio, Lob, Clerk, Cloudflare R2) can fail. Every failure has a defined user experience that is never a blank screen, never a spinner that hangs, and never silently wrong data. Users always have a path forward.

**Implementation:**
- Journey 1 failure mode matrix (Section 4) is the template for all API-dependent surfaces
- Timeout thresholds: 10s soft (show partial), 30s hard (offer manual path)
- Circuit breaker pattern on all third-party API calls: track failure rate, trip at 50% over 5 min, retry after 60s
- Every degraded state has explicit UX copy and a manual fallback action

### 3. Long-Term Portability

No vendor-specific code in business logic. Database queries use SQLAlchemy, not provider client libraries. File storage uses boto3 S3 API, not R2-specific calls. Auth stores a local `users` table regardless of Clerk. Every vendor can be swapped without rewriting product code.

**Implementation:**
- SQLAlchemy 2.x ORM for all database access. No raw Supabase/Railway client calls in business logic.
- boto3 with S3-compatible endpoint for file storage. Config change = vendor change.
- `users` table with `clerk_user_id` FK. All domain data in Parcel's DB, not Clerk's.
- Background job definitions are framework-agnostic functions; Dramatiq decorators are thin wrappers.
- PDF templates are HTML/CSS — renderer (Playwright) is swappable without template changes.

### 4. Reliability Over Features

Background jobs must retry on failure. Obligation alerts must fire on schedule. Financial calculations must be tested against known-correct examples. If a feature can't be built reliably, it waits.

**Implementation:**
- Dramatiq actors: `max_retries=3`, exponential backoff, dead letter queue for investigation
- Obligation scheduler: cron job via APScheduler, idempotent execution, alert on missed runs via Sentry cron monitor
- Financial calculations: test suite with known-correct examples from real deals (wholesale, BRRRR, sub-to, wrap, flip)
- Every model migration includes at least one test verifying the migration applies and rolls back cleanly

### 5. Trust Through Transparency

The AI never states what it can't verify. Assumptions are labeled. Missing data is flagged, not hidden. Confidence levels are visible. Users can edit every auto-filled input.

**Implementation:**
- AI responses include source citations: "RentCast (fetched Apr 3)" or "User-provided"
- Missing data shows empty field with "Not available — enter manually" rather than placeholder or zero
- Confidence badges on every data-dependent surface (analysis, portfolio metrics, obligation calculations)
- Edit history on key financial fields: who changed what, when, from what value

### Module Structure

Each module follows the same pattern:
```
backend/modules/{module_name}/
├── models.py        # SQLAlchemy models
├── schemas.py       # Pydantic request/response schemas
├── router.py        # FastAPI router (/api/v1/{module})
├── service.py       # Business logic (no framework imports)
├── migrations/      # Alembic migrations for this module
└── tests/           # Module-specific tests

frontend/src/modules/{module_name}/
├── pages/           # Lazy-loaded route components
├── components/      # Module-specific UI components
├── hooks/           # Data fetching (TanStack Query)
├── types.ts         # TypeScript interfaces
└── index.ts         # Public API
```

### API Conventions

- All endpoints: `/api/v1/{module}/{resource}`
- Pydantic response models on every endpoint — no raw dicts
- Feature gating via FastAPI dependency injection (`Depends(require_tier("pro"))`)
- Pagination on all list endpoints: `?page=1&per_page=25` with `total_count` in response
- Soft delete: `DELETE` sets `is_deleted=true`, never hard deletes
- Consistent error responses: `{detail: string, code: string}`

### Testing Requirements

- Every model: at least one migration test (applies + rolls back)
- Every router: at least one happy-path integration test
- Financial calculations: tested against known-correct examples with ±0.01 tolerance
- No test-free merges on core models (Property, Deal, AnalysisScenario, FinancingInstrument, Obligation)

---

## 12. Unresolved Decisions for Founder

### 1. Go-to-Market Spearhead

**Options:** (A) Lead with creative finance, (B) Market broadly, (C) Segment by channel
**Recommendation:** C — Creative finance wedge in SubTo/Pace Morby communities. Broad messaging on BiggerPockets/Instagram/YouTube. Creative finance is the proof, not the headline.

### 2. First Paid Feature Gate

**Options:** (A) Multi-strategy comparison, (B) Branded reports, (C) 3rd saved property, (D) CRM
**Recommendation:** C for Plus ($29) — natural momentum moment. B for Pro ($79) — high-value, justified. Multi-strategy stays Free to drive activation.

### 3. Today's Data Sources Pre-Obligations

**Options:** (A) Tasks + stale deals + onboarding only, (B) Add lease dates, (C) Skip Today until Wave 2
**Recommendation:** A — enough to establish daily habit. Obligation-powered Today in Wave 2 is the upgrade.

### 4. Bricked API Tier

**Options:** Growth ($129/mo, 300 comps) vs. Scale ($199/mo, 500 comps)
**Recommendation:** Start Growth. Upgrade when usage exceeds 250/mo.

### 5. Communication Depth in Wave 1B

**Options:** (A) Schema only, (B) Manual logging, (C) Email integration
**Recommendation:** B — manual logging (calls/meetings/notes against contacts) is low-effort and immediately useful.

### 6. D4D as Permanent Bottom Tab

**Locked:** Yes. **Research says:** Not justified by broad persona demand (only 3/8 personas use heavily).
**Mitigation:** Keep Today first tab. Keep D4D tightly scoped. Don't let D4D language dominate marketing.

### 7. Auth Migration Timing

**Options:** (A) Wave 0 (clean break before users), (B) Wave 1A (with onboarding), (C) Enhance custom JWT instead
**Recommendation:** A — migrate to Clerk in Wave 0 before more users sign up. Custom auth lacks OAuth, magic links, MFA, token revocation, and CSRF. Each is days to add manually. Clerk is free through 50K MAU.

### 8. When Does Business/Team UI Become Real?

**Recommendation:** Demand-triggered after 10+ paying users clearly need multi-seat. Schema is ready from Wave 0. UI waits.

### 9. PowerSync Maturity at Wave 7

**Risk:** Capacitor SDK is alpha as of April 2026. Wave 7 is ~40+ calendar weeks out.
**Recommendation:** Monitor PowerSync quarterly. If Capacitor SDK isn't production-ready by Wave 6, fall back to `@capacitor-community/sqlite` with manual sync logic.

---

## 13. What Ships in v1.5

If forced to ship tomorrow:

### Ships

1. Property as root record. Deal-centric era ends.
2. AnalysisScenario as first-class. Multiple scenarios, side-by-side comparison, AI narratives.
3. Address-first activation. Under 60 seconds to AI-narrated analysis.
4. Today as daily operating surface. Tasks, stale deals, morning briefing.
5. Creative finance monitoring. FinancingInstrument + Obligation engine. Balloon countdowns.
6. Contact CRM with buyer extension. Disposition pipeline.
7. Branded reports. Link-first, Playwright PDF export, brand kit, engagement tracking.
8. Clean packaging at $29/$79/$149.

### Waits

1. SMS/Email sending (manual logging ships; Twilio waits)
2. Skip tracing (use BatchData directly)
3. Direct mail, D4D, iOS native
4. Team/Business permissions UI
5. Advanced portfolio analytics
6. Drip sequences and automation

### The Product in One Sentence

**Parcel is a property-centric investor operating system where the front door is address-first analysis, the daily surface is Today, the moat is creative finance monitoring, and the growth channel is branded reports.**

---

*This document supersedes FINAL-PRODUCT-BLUEPRINT.md, CODEX-FINAL-PRODUCT-BLUEPRINT.md, and all prior product-direction documents. It is the single canonical reference for Parcel development.*
