# PARCEL — Final Product Blueprint (Codex Edition)

Date: 2026-04-02

Prepared by:
- Codex

Primary inputs reviewed:
- `SAD/Codex-Parcel-Product-Blueprint.md`
- `SAD/Codex-Blueprint-Codebase-Pressure-Test.md`
- `SAD/audit/00-audit-synthesis.md`
- `SAD/audit/01-competitor-verification.md`
- `SAD/audit/02-legal-compliance-update.md`
- `SAD/audit/03-internal-consistency.md`
- `SAD/audit/04-research-gaps.md`
- `SAD/audit/05-technical-stack-verification.md`
- `SAD/personas/00-persona-synthesis.md`
- `SAD/personas/01-marcus-complete-beginner.md`
- `SAD/personas/02-desiree-solo-wholesaler.md`
- `SAD/personas/03-ray-house-flipper.md`
- `SAD/personas/04-angela-buy-hold-landlord.md`
- `SAD/personas/05-kyle-str-airbnb-investor.md`
- `SAD/personas/06-carlos-creative-finance.md`
- `SAD/personas/07-tamara-hybrid-investor.md`
- `SAD/personas/08-james-agent-serving-investors.md`

## 1. Product Definition

### What Parcel is

Parcel is a modular, property-centric operating system for US real estate investors who need one system to:

- start with an address
- analyze it across 5 strategies
- turn it into a live deal
- carry it through acquisition
- track the asset after close
- monitor obligations, deadlines, and risk
- produce reports that help close deals and win referrals

Parcel is not just “analysis plus CRM.” Its actual wedge is continuity. The same record should survive from first look to owned asset without forcing the investor to re-enter facts into four other tools.

### What Parcel is not

Parcel is not:

- a chatbot product
- a wholesaler-only CRM
- a tenant portal
- a rent collection system
- a maintenance ticketing system
- full property management software
- a servicing platform
- a public buyer marketplace
- a social network for investors
- a broad MLS portal
- an STR operations suite
- a legal-advice engine

### Core promise

The front-door promise is:

- `Enter an address, get a credible AI-narrated analysis in under 60 seconds, and keep moving without re-entering the deal anywhere else.`

The retention promise is:

- `Parcel stays useful after the first analysis because it knows the property, the deal, the people, the obligations, and the next action.`

### Competitive position

Parcel should be positioned as:

- broad across strategies
- deep where competitors are shallow
- strongest where tool handoffs currently break

The clearest market position is:

- `the only investor OS that connects address-first analysis, pipeline, portfolio-lite tracking, and creative-finance obligation monitoring in one system`

Competitors still each own one lane:

- DealCheck: fast calculators
- REsimpli: wholesaler CRM
- DealMachine: D4D and field capture
- PropStream: property data and list building
- Stessa: rental portfolio visibility
- FreedomSoft: broad wholesaler ops

Parcel wins when it eliminates the seams between those lanes.

### Why users switch

Users switch because Parcel cuts:

- duplicate entry
- spreadsheet dependency
- tool switching
- missed follow-ups
- weak reporting
- blind spots after close

Persona-specific switch triggers:

- Carlos: no one else monitors subject-to and seller-finance obligations properly
- Desiree: one analysis + CRM + pipeline flow is cheaper and faster than her stitched stack
- Tamara: multi-strategy comparison finally exists in one place
- James: branded investor reports stop being a manual Canva process

### Why users stay

Users stay when Parcel becomes the system of memory for:

- what the property is
- what assumptions were made
- what strategy won
- who is involved
- what is due next
- what reports were sent
- what happened after they were sent

That is the retention engine. Not AI novelty. Not a prettier CRM.

### Activation and onboarding mechanics

This resolves audit blocker `B2`.

#### One-question branching

Signup asks one question:

- `What’s your primary strategy?`

Options:

- Wholesale
- BRRRR
- Buy and hold
- Flip
- Creative finance
- Multiple strategies
- Agent serving investors
- I’m just getting started

This keeps the “one question” rule while still covering Tamara and James honestly.

#### Sample data policy

- Every new account gets a strategy-matched sample workspace.
- Sample data is clearly labeled `Demo`.
- Demo records can be archived or deleted at any time.
- After the user creates their first real property or imports real data, Parcel prompts:
  - `Keep demo workspace`
  - `Archive demo workspace`
  - `Delete demo workspace`
- Default after 14 days of inactivity: archive, not delete.

#### Empty-state design rule

Every major module gets a strategy-aware empty state:

- Dashboard: morning briefing + sample data CTA
- Analyze: address input first
- Pipeline: demo records or import CTA
- Properties: add address or import CSV
- Portfolio: add owned property or import template
- Reports: preview sample report before first generated report

#### Activation completion criteria

| Persona | Activation event |
|---|---|
| Marcus | completes first address analysis and reads one AI explanation panel |
| Desiree | compares at least 2 strategies on one property and moves one deal into pipeline |
| Carlos | creates one financing instrument and sees one obligation alert |
| Tamara | saves one property with 3 strategy scenarios attached |
| James | generates and shares one branded report |
| Angela | adds 2 owned properties and sees portfolio totals |
| Ray | adds one active rehab project and sees budget vs actual |
| Kyle | runs one creative-finance scenario and sees the gap note on STR support |

#### Re-onboarding

- If a user abandons onboarding, their next session resumes at the last incomplete step.
- If they have no real data after 7 days, Dashboard shows a re-entry card:
  - `Resume your first analysis`
  - `Import a spreadsheet`
  - `Explore sample deals`
- If they do not fit any branch cleanly, route them to `General investor` with address-first analysis and manual import options.

#### Spreadsheet migration policy

This resolves audit blocker `B3`.

v1 should be template-first, not “AI magic spreadsheet import.”

- Provide Parcel CSV templates for:
  - Properties
  - Deals
  - Contacts
  - Buyers
  - Transactions
  - Leases
  - Tasks
- Provide a Google Sheets-compatible version of each template.
- Preserve unmapped columns as imported notes/metadata, never silent data loss.
- Build “messy spreadsheet auto-detection” later. Do not promise it in v1.

## 2. Persona Prioritization

Locked priority order is correct. The product should respect it.

| Rank | Persona | Role in roadmap | Growth channel? | Roadmap distortion if overweighted? | Wave-plan concern |
|---|---|---|---|---|---|
| 1 | Carlos | Moat persona | Yes | Can pull product too deep into servicing/compliance-heavy edge cases | Needs obligations by Wave 2 exactly as planned |
| 2 | Desiree | Volume segment and speed test | Some | Can distort Parcel into a wholesaler CRM + marketing stack | Full replacement is late until Wave 5 |
| 3 | Tamara | Product integrity persona | Some | Least distorting; keeps the product honest | Needs multi-strategy and property continuity very early |
| 4 | James | Distribution persona | Yes, strongly | Can distort product into white-label report software | Needs reports earlier than most roadmaps would normally place them |
| 5 | Angela | Margin-discipline persona | No | Can pull Parcel into landlord ops if overweighted | Needs portfolio-lite and lease visibility earlier than tenant tooling |
| 6 | Ray | Execution persona | No | Can pull product into contractor software | Rehab must stay investor-level, not Procore-lite |
| 7 | Marcus | Acquisition-volume persona | No | Can make the product tutorial-heavy and timid | Needs the best onboarding, not the deepest ops |
| 8 | Kyle | Future adjacency | No | STR can turn into a separate product | Do not build toward him now |

### Growth channels vs normal users

Growth-channel personas:

- Carlos: small population, high trust, high referral velocity inside creative-finance communities
- James: direct channel because every report can produce new investor signups

Normal but strategically important users:

- Desiree
- Tamara
- Angela
- Ray
- Marcus

### Who is underserved by the current wave plan

Most underserved:

- Desiree: her full stack replacement is not real until communications and skip tracing arrive
- James: if branded reports ship late, his entire value proposition collapses
- Ray: rehab value is easy to push too far back because the current wave list does not name it explicitly enough

Correctly served by the current wave plan:

- Carlos
- Tamara
- Marcus

### Revenue posture

Canonical pricing:

- Free
- Plus: $29/mo
- Pro: $79/mo
- Business: $149/mo

Use two ARPU figures in planning:

- direct subscription ARPU: about `$76/mo`
- blended including referral lift: about `$85/mo`

Do not plan the company on referral-inflated ARPU.

## 3. Canonical Domain Model

Domain-model rule:

- `Property` is the durable root.
- `Deal` is a pursuit or transaction record tied to a property.
- `AnalysisScenario` is a strategy snapshot.
- Everything else either extends the property, the deal, the people layer, or the outward communication layer.

### Entity model

| Entity | Class | What it is | Attaches to | Lifecycle rules |
|---|---|---|---|---|
| `Property` | First-class | Canonical record for the address/asset | Root object | Exists before, during, and after a deal; one property can have many deals, scenarios, reports, documents, transactions, instruments, and tasks |
| `Deal` | First-class | Acquisition or disposition workflow record | `property_id` required | A property may have many deals over time; a deal can die while the property persists |
| `AnalysisScenario` | First-class | One strategy-specific underwriting snapshot | `property_id` required; optional `deal_id` | Immutable-ish snapshots; create new revisions rather than overwriting silently; compare many per property |
| `Contact` | First-class | Universal person/entity record | Linked through role tables to property, deal, report, communication | One contact can play many roles: seller, buyer, lender, contractor, insurer, tenant, title rep |
| `BuyerProfile` | First-class extension | Investor buy-box and disposition metadata | `contact_id` required | Exists only when a contact is a buyer; carries markets, price range, strategy fit, proof-of-funds state, behavior history |
| `Task` | First-class | Assignable action item | Polymorphic parent: property, deal, contact, rehab, obligation, report | Statuses: open, due, snoozed, done, canceled; powers morning briefing and Today queue |
| `Obligation` | First-class | Something that must happen on a date or in response to an exception | `property_id` required; optional `financing_instrument_id`, `lease_id`, `deal_id` | Generated from instruments, leases, or compliance rules; statuses: upcoming, due, verified, missed, resolved |
| `Transaction` | First-class | Investor-visible money event | `property_id` required; optional deal, rehab, lease, instrument links | Actuals only; not a full GL; supports portfolio-lite, rehab actuals, and variance against pro forma |
| `Lease` | First-class bounded object | Occupancy / rent timing record | `property_id` required | Track start/end, renewal, rent, deposit, vacancy turnover; no tenant portal or rent collection ownership |
| `RehabProject` | First-class bounded object | Rehab execution record for a property | `property_id` required; optional originating `deal_id` | Statuses: planned, active, blocked, complete; budget categories roll up into transactions |
| `FinancingInstrument` | First-class | Mortgage, seller note, wrap, subject-to loan, hard money, lease-option paper | `property_id` required; optional `deal_id` | Created at close or imported later; generates obligations and expected payment schedules |
| `Report` / `Deliverable` | First-class | External or internal artifact generated from canonical records | Source links to property, deal, scenario, portfolio, obligation, rehab | Link-first; PDF is a rendering; must store audience, brand, share state, and engagement events |

### Required support entities

These are not optional even though they are not in the user’s required entity list:

- `Communication`
- `Document`
- `PartyRole`
- `ImportJob`
- `DataSourceEvent`

Reason:

- without `Communication`, outreach and audit trails collapse into notes
- without `Document`, RAG and reports are just file uploads
- without `ImportJob`, migration quality is opaque
- without `DataSourceEvent`, AI confidence and provider provenance are not defensible

### Attachment rules

- `Property` owns continuity.
- `Deal` owns active pursuit.
- `AnalysisScenario` owns strategy logic.
- `FinancingInstrument` owns terms.
- `Obligation` owns due-now risk.
- `Transaction` owns actual money movement.
- `Lease` owns occupancy timing.
- `RehabProject` owns execution variance.
- `Report` owns external communication and proof.

### Team-ready schema rule

From Wave 0 onward:

- every first-class entity gets `team_id`
- RLS and ownership policy are designed in from the start
- team UI is deferred until there is paying demand

### Module rule

Approach C stays locked:

- each major module owns its migration
- each major module owns its FastAPI router
- each major module owns its React lazy bundle
- each module is gated by tier plus feature flag

Recommended module map:

- `property-core`
- `analysis`
- `deals-pipeline`
- `people`
- `portfolio`
- `finance-monitoring`
- `rehabs`
- `reports`
- `documents-rag`
- `communications`
- `outreach`
- `mobile-d4d`

## 4. Core Operating Journeys

### Address -> analysis -> save

| Element | Spec |
|---|---|
| Entities | `Property`, `AnalysisScenario`, optional `Deal`, `DataSourceEvent` |
| AI behavior | Narrates assumptions, flags missing fields, states confidence, explains risk without giving financial advice |
| Waves | `Wave 1A-1C` |
| Screen flow | `Analyze` -> address input -> draft analysis -> compare strategies -> save modal -> property/deal destination |

User sees:

- address field first, not strategy first
- imported facts separated from assumptions
- a quick analysis screen within seconds
- a deeper underwriting pass if provider data arrives cleanly
- a `Save as Property`, `Move to Pipeline`, and `Create Report` action row

#### Failure mode matrix

This resolves audit blocker `B1`.

| Scenario | UX response | Cost policy |
|---|---|---|
| RentCast ok, Bricked ok | full draft analysis with advanced comps/repair | normal path |
| RentCast ok, Bricked partial | show quick analysis immediately, mark missing advanced fields as `Needs confirmation`, queue async retry | no fallback vendor by default |
| RentCast ok, Bricked timeout/down | show snapshot analysis in under 15 seconds with orange banner: `Advanced underwriting unavailable, continue with quick analysis or retry` | no silent HouseCanary fallback |
| RentCast partial, Bricked ok | render analysis with visible missing basics and strong confidence labels | no fallback vendor by default |
| RentCast fail, address parse ok | open guided manual draft with local benchmark defaults and sample comps hint | no premium fallback automatically |
| Both primary providers fail | save blank property shell, offer manual analysis, sample local deal, or retry later | fallback provider is manual opt-in only |
| Quota exhausted | show quota banner and manual-entry path; Plus/Pro/Business can trigger premium comps manually | premium fallback only by explicit user action |

The key policy:

- no silent 10-60x cost fallback
- no fake certainty when provider data is incomplete
- always give the user a path forward

### Deal -> pipeline -> close

| Element | Spec |
|---|---|
| Entities | `Property`, `Deal`, `Contact`, `Task`, `Communication`, `Document`, `Transaction` |
| AI behavior | Summarizes risk, suggests next action, identifies stale deals and expiring deadlines |
| Waves | `Wave 1B-1C`, improved through `Wave 4` |
| Screen flow | property or analysis -> create deal -> pipeline board -> deal detail -> close outcome |

User sees:

- pipeline stages tied to real deal records, not orphan cards
- seller context, notes, docs, and tasks on one deal page
- close actions that convert deal outputs into property, transaction, and financing records

### Property -> portfolio -> obligations

| Element | Spec |
|---|---|
| Entities | `Property`, `FinancingInstrument`, `Obligation`, `Lease`, `Transaction`, `RehabProject` |
| AI behavior | Monitors upcoming risk, flags underperformance, highlights refi or renewal windows |
| Waves | `Wave 1B` for property shell, `Wave 2` for obligations, `Wave 3A` for richer portfolio-lite |
| Screen flow | property detail -> financing / leases / transactions tabs -> portfolio summary -> obligation details |

User sees:

- portfolio totals built from real property records
- obligation alerts tied to specific instruments and leases
- Carlos-style subject-to and seller-finance monitoring without spreadsheet gymnastics

### Deal -> buyer matching -> assign

| Element | Spec |
|---|---|
| Entities | `Deal`, `Property`, `BuyerProfile`, `Contact`, `Report`, `Communication`, `Task` |
| AI behavior | Ranks buyers by fit, suggests packet content, surfaces likely pass reasons based on history |
| Waves | `Wave 3B` |
| Screen flow | deal detail -> mark disposition-ready -> buyer matches -> send packet -> response tracking -> assignment or double-close outcome |

User sees:

- a disposition-ready state inside the deal
- top-fit buyers
- buyer packet creation
- tracked responses, tours, offers, pass reasons

Design call:

- double-close workflow is in scope
- public buyer marketplace is not

### Morning briefing / Today loop

This is the reconciled position.

`Dashboard` remains the primary home.
`Today` exists as an action mode launched from Dashboard, not as the main brand label.

Why:

- solo users open Parcel to orient first, not just clear tasks
- locked mobile tabs already commit to `Dashboard`, not `Today`
- the morning briefing card is habit-forming
- Carlos and Tamara still need a dense due-now view, which the expandable Today queue solves

| Element | Spec |
|---|---|
| Entities | `Task`, `Obligation`, `Deal`, `Lease`, `RehabProject`, `Communication` |
| AI behavior | Produces a concise morning briefing with ranked actions and plain-language risk explanation |
| Waves | Dashboard card in `Wave 1B`; dense action queue in `Wave 2` |
| Screen flow | Dashboard -> morning briefing card -> `See all actions` -> Today queue drawer/page |

User sees on Dashboard:

- morning briefing card at the top
- quiet state collapses to one line
- active state expands into 3-7 ranked items
- every item deep-links to its source record

User sees in Today mode:

- all due tasks
- all due or missed obligations
- stale deals
- pending report follow-ups
- snooze, complete, assign, dismiss actions

### Report -> share -> referral loop

| Element | Spec |
|---|---|
| Entities | `Report`, `Property`, `AnalysisScenario`, `Contact`, `Deal`, `Communication` |
| AI behavior | Writes audience-aware narrative, not just generic summary; keeps tone analytical |
| Waves | report v1 in `Wave 1C`; buyer packets and deeper engagement in `Wave 3B` |
| Screen flow | property/deal/scenario -> create report -> preview -> share link -> PDF export -> engagement events |

User sees:

- branded report preview
- share link first
- optional PDF export
- open/click engagement events feeding back into follow-up tasks

This is what makes James a channel instead of just a seat.

## 5. Information Architecture

### Final desktop nav

The locked section labels are workable if the items are disciplined.

#### DEALS

- `Dashboard`
- `Analyze`
- `Pipeline`
- `Properties`
- `Portfolio`
- `Obligations`
- `Transactions`
- `Rehabs`

#### PEOPLE

- `Contacts`
- `Buyers`

#### OUTREACH

- `Communications`
- `Sequences`
- `Skip Tracing`
- `Direct Mail`
- `D4D`

#### TOOLS

- `Reports`
- `Documents`
- `AI` / `Chat`

Bottom:

- `Settings`
- `Compliance`

### Final mobile nav

Locked mobile tabs stand.

Before Wave 7:

- `Dashboard`
- `Analyze`
- `Pipeline`
- `Chat`
- `More`

After Wave 7:

- `Dashboard`
- `Analyze`
- `Pipeline`
- `D4D`
- `More`

Rules:

- `Dashboard` owns morning briefing and Today actions
- AI is globally summonable from every screen
- `Chat` loses tab priority after D4D ships
- `Properties`, `Portfolio`, `Obligations`, and `Reports` live under `More` on mobile

### Today vs Dashboard — final ruling

My position:

- `Dashboard` is the correct primary home
- `Today` should exist, but as a deep action view launched from Dashboard, not as the top nav label

Why this is the right compromise:

- It respects the locked mobile IA.
- It preserves the morning briefing as the daily habit surface.
- It still gives Carlos a serious due-now workspace.
- It prevents nav sprawl for beginners and casual users.

What would be wrong:

- `Dashboard` with only KPIs and no action queue
- or a separate top-level `Today` that steals the main mental model from the rest of the product

### Entity-to-nav map

| Entity / feature | Primary home | Secondary home |
|---|---|---|
| `Property` | Deals > Properties | Analyze results, Portfolio |
| `Deal` | Deals > Pipeline | Property detail |
| `AnalysisScenario` | Deals > Analyze | Property detail |
| `Contact` | People > Contacts | Deal / Property detail |
| `BuyerProfile` | People > Buyers | Deal disposition panel |
| `Task` | Dashboard morning briefing / Today queue | Any record side panel |
| `Obligation` | Deals > Obligations | Dashboard briefing, Property financing tab |
| `Transaction` | Deals > Transactions | Portfolio and Property financial tab |
| `Lease` | Deals > Portfolio / Property lease tab | Dashboard briefing |
| `RehabProject` | Deals > Rehabs | Property detail |
| `FinancingInstrument` | Property financing tab | Obligations |
| `Report` | Tools > Reports | Property / Deal / Buyer packet actions |
| `Document` | Tools > Documents | Property, Deal, Report |
| `Communication` | Outreach > Communications | Contact, Deal, Buyer, Dashboard briefing |

### Nav evolution across waves

- `Wave 0`: keep nav lean; only show shipped sections
- `Wave 1`: Dashboard, Analyze, Pipeline, Properties, Portfolio, Contacts, Reports, Documents, AI
- `Wave 2`: add Obligations
- `Wave 3A`: add Transactions and Rehabs
- `Wave 3B`: add Buyers
- `Wave 4`: open Communications and Sequences
- `Wave 5`: add Skip Tracing
- `Wave 6`: add Direct Mail
- `Wave 7`: add D4D and promote it to mobile bottom tab

Rule on visibility:

- shipped but paid features: visible with upgrade prompts
- truly unshipped modules: hidden
- do not clutter the nav with `coming soon`

### Pushback on locked mobile D4D tab

If this were not locked, I would not make D4D a universal bottom tab. The research still says it is not central for the full user base. Because the decision is locked, the mitigation is:

- keep `Dashboard` first
- keep D4D tightly scoped
- avoid letting D4D language dominate core product marketing

## 6. Build Order

This resolves audit blocker `B5`.

Assumption:

- solo founder
- roughly `25-30 hrs/week`
- non-trivial interruptions from full-time work, family, and school

Planning rule:

- estimates below are working-time estimates
- add `15-20%` calendar slippage
- total roadmap is about `36-44 weeks`, not “a few sprints”

### Final wave plan

| Wave | Duration | What ships | Why now | Personas served |
|---|---|---|---|---|
| `Wave 0` | 4-5 weeks | module scaffolds, `properties`, `analysis_scenarios`, deal refactor, `contacts`, `tasks`, communications log stub, tier rename, PostGIS/pgvector/RLS, team-ready FKs | Structural prerequisite | Tamara, Marcus, Angela |
| `Wave 1A` | 3 weeks | address-first onboarding, persona branching, sample data lifecycle, RentCast-based quick analysis, failure-mode UX | Activation promise | Marcus, Tamara |
| `Wave 1B` | 3 weeks | property detail v1, core CRM, pipeline refactor, morning briefing card, tasks surfaced in Dashboard | Day-one continuity | Desiree, Angela |
| `Wave 1C` | 2 weeks | Bricked integration, multi-strategy comparison, branded report v1, RAG document chat, spreadsheet template import | Trust and differentiation | James, Tamara |
| `Wave 2` | 4 weeks | creative finance module: financing instruments, obligations, balloon tracking, payment verification workflow, obligation-driven Today queue | Moat | Carlos |
| `Wave 3A` | 2 weeks | calculator upgrades, transactions UI, lease timelines, rehab tracker v1, portfolio-lite variance views | Portfolio and flip depth | Angela, Ray |
| `Wave 3B` | 3 weeks | dispositions: buyers, buy boxes, match scoring, buyer packets, assignment/double-close stages | Wholesale completion loop | Desiree, James, Tamara |
| `Wave 4` | 3 weeks | Twilio communications, inbox, sequences, A2P hard-gating, Launch Control bridge for transitional users | Reduce parallel-stack pain | Desiree |
| `Wave 5` | 2 weeks | skip tracing, compliance gating, provider abstraction, California review gate | More stack replacement | Desiree, Tamara |
| `Wave 6` | 2 weeks | direct mail v1, campaign templates, attribution into reports and Dashboard | Scale layer | Desiree, Tamara |
| `Wave 7` | 7-8 weeks | iOS app via Capacitor 8 + native plugins, D4D flow, push, biometrics, camera, geolocation, external web checkout | Field capture and mobile habit | Desiree, Tamara, Ray |

### Intra-wave sequencing that matters

This resolves audit gap `7b`.

Inside `Wave 1`, the order must be:

1. `Property` and `AnalysisScenario`
2. address-first analysis
3. CRM + property detail
4. report v1
5. RAG chat

If report or RAG work starts before the property/deal split is stable, the app hardens the wrong model.

### Persona timing judgment

- Marcus: served by `Wave 1A`
- Tamara: credibly served by `Wave 1C`, fully strengthened by `Wave 2`
- Carlos: properly served only when `Wave 2` ships
- James: must get report v1 by `Wave 1C`; later is too late
- Angela: basic value by `Wave 1B`, real value by `Wave 3A`
- Ray: partial value by `Wave 1C`, real flip ops value by `Wave 3A`
- Desiree: partial replacement by `Wave 1B`; full replacement only by `Wave 5`

### Explicit call on Desiree

The audit is right. Desiree converts fast, but she does not fully replace her stack until communications and skip tracing exist.

Recommendation:

- accept a temporary parallel-run period
- make it explicit in positioning
- ship a Launch Control / CSV / webhook bridge in `Wave 4`
- do not pretend Parcel replaces her outbound engine in `Wave 1`

### iOS technical note

Wave 7 should start on:

- Capacitor 8
- Node.js 22+
- iOS 26 SDK
- external web checkout link in the US app while the commission-free window exists

## 7. Audit Resolutions

| Audit item | Resolution in this blueprint |
|---|---|
| `B1` API failure mode matrix missing | Added under `Address -> analysis -> save`; no silent premium fallback, always a degraded UX path |
| `B2` Onboarding mechanics undefined | Added in Product Definition: branching, sample data lifecycle, empty states, activation criteria, re-onboarding |
| `B3` Spreadsheet migration not researched | Resolved with template-first import strategy; no fake smart import promise |
| `B4` Pricing inconsistency | Canonical pricing locked to `Free / Plus $29 / Pro $79 / Business $149` |
| `B5` No unified roadmap | Replaced with one wave plan, subwaves, and solo-dev estimates |
| `F1` Bricked pricing changed | Assumed Growth tier minimum; no architecture depends on Basic tier access |
| `F2` RentCast price dropped | Wave 1A uses RentCast heavily as low-cost quick-analysis layer |
| `F3` DealMachine price doubled | Desiree value prop improves; no change except updated comparison math |
| `F4` TCPA one-to-one consent rule struck down | Communications design keeps compliance rails but does not rely on stale rule assumptions |
| `F5` iOS commission-free window exists now | Wave 7 includes external web checkout in US app immediately |
| `F6` Colorado AI Act effective June 30, 2026 | Hard boundary: no tenant screening or lead-scoring AI; AI remains analytical, logged, and non-decisioning |
| `F7` California Delete Act / data broker risk | Skip tracing stays gated, legal-reviewed, and should not launch casually in California without determination |
| `F8` Creative finance calculators mislabeled | Treat calculators as already shipped logic; `Wave 2` is monitoring, not basic calculators |
| `F9` Dispositions missing from roadmap | Added as `Wave 3B` |
| `F10` Desiree MUST HAVEs ship late | Explicitly documented parallel-run expectation and Launch Control bridge |
| `F11` Transactions missing from nav | Added under `Deals > Transactions` |
| `F12` Communications logging conflict | `Communication` schema stub in Wave 0; active Twilio workflows in Wave 4 |
| `F13` ARPU inflated | Product plan uses direct ARPU and referral-included ARPU separately |
| `F14` App Store AI data disclosure required | Wave 7 includes AI disclosure requirement in shipping checklist |

## 8. Hard Product Boundaries

The biggest risk is scope creep. Kill these for the next 6 months:

- tenant portal
- rent collection processing
- maintenance ticket workflow
- contractor mobile app
- property manager accounting
- full double-entry bookkeeping
- tenant screening
- lease signing workflow
- AI lead scoring
- AI tenant screening
- public buyer marketplace
- investor social feed
- wholesaler dialer
- predictive “best neighborhood” recommender
- commercial 5+ unit underwriting
- land investing workflows
- mobile-home-specific workflows
- STR revenue management
- inherited-property legal workflows
- tax lien / deed workflows
- fully automated spreadsheet import magic
- white-label app
- nationwide MLS browsing product

What Parcel should do instead:

- own investor visibility
- own investor decisions
- own investor obligations
- export or integrate where operations get ugly

## 9. Unresolved Decisions

### 1. Should D4D really be a permanent bottom tab after Wave 7?

- Options: universal permanent tab, persona-aware tab, More-only
- Research says: universal D4D is not justified by broad persona demand
- Locked decision says: permanent bottom tab
- Recommendation: honor the lock, but keep D4D minimal and do not let it define the product story

### 2. How much should Parcel automate premium provider fallback?

- Options: automatic HouseCanary fallback, manual fallback, no fallback
- Research says: silent fallback is too expensive and hides degraded confidence
- Recommendation: manual premium fallback only

### 3. Should buyer matching stay rules-based or become behavior-weighted quickly?

- Options: simple rules engine, hybrid scoring, ML-style adaptation
- Research says: rules-based is enough early and easier to trust
- Recommendation: start rules-based; add behavior weighting later

### 4. How far should communications go in the first year?

- Options: passive logging only, basic two-way SMS/email, full dialer/campaign OS
- Research says: Desiree needs real comms, but outbound tooling can consume the roadmap
- Recommendation: basic two-way comms plus sequences; do not chase dialer parity

### 5. Should reports be link-first or PDF-first?

- Options: PDF-first, link-first, equal weight
- Research says: link-first creates engagement loops; PDF still matters for lenders and agents
- Recommendation: link-first canonical, PDF export secondary

### 6. When should Business/team UI become real?

- Options: early, mid-roadmap, demand-triggered
- Research says: schema now, UI later
- Recommendation: demand-triggered after at least 10 paying users clearly need multi-seat workflows

### 7. Should Obligations be a top-level destination?

- Options: property sub-tab only, dashboard-only, top-level nav item
- Research says: Carlos converts on named monitoring capability
- Recommendation: top-level nav item beginning Wave 2

### 8. How much should James’s client-facing layer look like white-label software?

- Options: simple branded reports, client portal, full white-label
- Research says: branded reports and share links are enough early
- Recommendation: stop at branded reports plus share pages; no client portal buildout yet

## 10. What I Would Lock for v1.5 Today

If I had to decide right now, I would not try to “finish the investor OS.” I would ship the narrowest version that proves the thesis with the highest-value personas.

### Month 1

- Rename pricing and tier constants everywhere
- Build Wave 0 properly:
  - `Property`
  - `AnalysisScenario`
  - deal refactor
  - `Contact`
  - `Task`
  - communications log stub
  - team-ready keys and RLS
- Make current deal creation write through the new model, not the old one

This is the structural point of no return. Do not skip it.

### Month 2

- Ship address-first onboarding
- Add persona question and demo workspace
- Build the failure-aware quick-analysis flow on top of RentCast
- Ship property detail v1
- Put the morning briefing card on Dashboard
- Add contacts and basic task actions

This gets Marcus, Angela, and Tamara a real first experience.

### Month 3

- Add Bricked advanced underwriting
- Ship multi-strategy comparison
- Ship branded report v1
- Ship RAG doc chat
- Start Wave 2 immediately with financing instruments and obligations for subject-to and seller-finance records

This is the point where James gets his hook and Carlos finally sees that Parcel is not just another calculator.

### What waits after that

- dispositions in `Wave 3B`
- Twilio in `Wave 4`
- skip tracing in `Wave 5`
- direct mail in `Wave 6`
- iOS D4D in `Wave 7`

### Final call

If forced to choose between “more modules” and “the right skeleton,” choose the skeleton every time.

Parcel wins if it becomes:

- the fastest credible analysis front door
- the cleanest property/deal continuity model
- the first serious creative-finance monitoring product in the category
- the best investor report generator in the hands of James and Tamara

Parcel loses if it becomes:

- a prettier wholesaler CRM
- a calculator with tabs
- a half-built landlord app
