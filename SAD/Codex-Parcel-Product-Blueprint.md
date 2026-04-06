# Codex Parcel Product Blueprint

Date: 2026-04-02

Prepared by:
- Codex

Primary inputs reviewed:
- `RESEARCH/00-MASTER-RESEARCH-SYNTHESIS.md`
- `RESEARCH/01-wholesale-flip-platforms.md`
- `RESEARCH/02-rental-portfolio-platforms.md`
- `RESEARCH/03-deal-analysis-platforms.md`
- `RESEARCH/04-bricked-ai-analysis.md`
- `RESEARCH/05-database-architecture.md`
- `RESEARCH/06-vector-db-rag.md`
- `RESEARCH/07-crm-workflow-requirements.md`
- `RESEARCH/08-property-data-apis.md`
- `RESEARCH/09-communication-infrastructure.md`
- `RESEARCH/10-skip-tracing-apis.md`
- `RESEARCH/11-legal-compliance.md`
- `RESEARCH/12-mls-idx-access.md`
- `RESEARCH/13-direct-mail-economics.md`
- `RESEARCH/14-mobile-ios-strategy.md`
- `RESEARCH/15-monetization-benchmarks.md`
- `RESEARCH/16-address-to-analysis-feasibility.md`
- `RESEARCH/17-creative-finance-operations.md`
- `RESEARCH/18-property-centric-domain-model.md`
- `RESEARCH/19-today-morning-briefing-jobs-to-be-done.md`
- `RESEARCH/20-ai-trust-explanation-design.md`
- `RESEARCH/21-portfolio-lite-boundary-definition.md`
- `RESEARCH/22-competitive-journey-teardowns.md`
- `RESEARCH/23-packaging-monetization-by-persona.md`
- `RESEARCH/24-notification-mobile-strategy.md`
- `RESEARCH/25-agent-referral-loop.md`
- `RESEARCH/26-dispositions-buyer-workflow.md`
- `RESEARCH/27-import-migration-strategy.md`
- `RESEARCH/28-collaboration-permissions-model.md`
- `RESEARCH/29-report-deliverable-system.md`
- `SAD/personas/00-persona-synthesis.md`
- `SAD/current-state-audit.md`
- `SAD/ia-review.md`

## Executive Verdict

Parcel should be built as a `property-centric investor operating system` with a strong `deal-analysis entry point`, a first-class `Today` operating layer, and a differentiated `creative-finance obligation engine`.

The product should not keep evolving as:

- a calculator app with a few workflow add-ons
- a wholesaler CRM with extra calculators
- a landlord operations suite
- an AI chatbot wrapped around real estate math

The best version of Parcel is:

- `Address-first` on the front door
- `Property-centric` in the data model
- `Deal-aware` in the acquisition workflow
- `Obligation-aware` after close
- `AI-narrated` across the whole system
- `Report-driven` at the edges where users share, sell, persuade, and collaborate

The right founder posture now is to stop collecting insight and start locking the operating model.

## 1. Product Definition

## What Parcel is

Parcel is the operating system for individual real estate investors and small investor teams who need one system to:

- find or import an opportunity
- analyze it across multiple strategies
- move it through acquisition and execution
- track the property after close
- monitor deadlines, obligations, and risk
- generate reports and shareable deliverables

Parcel is strongest when the investor is trying to bridge stages that are currently fragmented across tools:

- analysis -> pipeline
- pipeline -> property
- property -> portfolio
- portfolio -> obligations
- report -> action

## What Parcel is not

Parcel is not:

- a generic AI chatbot for real estate
- a wholesaler-only CRM
- a tenant portal
- a rent-processing platform
- a maintenance-ticketing system
- a full property-management accounting suite
- a loan servicer
- a public investor marketplace
- an MLS portal pretending to be a brokerage

Those exclusions are not temporary embarrassment.
They are strategic boundary decisions.

## Core promise

The product promise should be:

- `Enter an address, get a real analysis quickly, and keep moving without re-entering the deal everywhere else.`

The extended promise is:

- `Parcel stays useful after the initial analysis because it knows the property, the deal, the people, the obligations, and the next action.`

## Competitive position

Competitors each own one stage:

- DealCheck owns analysis
- REsimpli owns wholesaler CRM
- DealMachine owns field capture
- Stessa owns portfolio-lite finance
- FlipperForce owns rehab execution

Parcel's opportunity is not to out-specialize each of them at their single stage.
It is to connect stages without making the user rebuild context.

## Why users switch

Users switch to Parcel because it reduces:

- tool sprawl
- duplicate data entry
- spreadsheet dependence
- context switching
- missed deadlines and forgotten follow-ups

Specific switch triggers:

- Desiree: keep-vs-assign comparison and less data re-entry
- Carlos: real creative-finance monitoring
- Tamara: multi-strategy continuity and consolidated oversight
- James: branded reports and client-facing differentiation

## Why users stay

Users stay because Parcel becomes the place that knows:

- the property
- the deal history
- the assumptions
- the people involved
- the obligations coming due
- the reports sent and what happened after send

Retention should come from operational continuity, not feature novelty.

## 2. Persona Prioritization

## Primary personas for the next phase

## 1. Tamara, the hybrid investor

Tamara should be the center-of-gravity persona.

Why:

- she exercises the multi-strategy thesis honestly
- she prevents the product from collapsing into a wholesaler CRM
- she values analysis, pipeline, portfolio, rehab, and creative finance in one system
- she exposes migration and team-readiness needs early

If Parcel works for Tamara, it is much more likely to be a true investor OS.

## 2. Carlos, the creative-finance investor

Carlos should be the moat persona.

Why:

- creative finance is the strongest available differentiation
- his operational needs force Parcel to build obligations, monitoring, and exception handling correctly
- he defines the highest-trust version of Today

If Parcel fails Carlos, the moat is fake.

## 3. Desiree, the solo wholesaler

Desiree should be the operational sharpness persona.

Why:

- she tests whether Parcel can replace real daily workflows
- she drives urgency around CRM, follow-up, and dispositions
- she validates whether the product saves time or just looks strategic

If Parcel feels slow or vague to Desiree, it will not feel operational to anyone.

## 4. James, the agent serving investors

James should be the distribution persona.

Why:

- he validates branded reports and deliverables
- he turns reports into acquisition loops
- he proves that Parcel can be experienced through a client-facing surface, not only through an internal app

If Parcel works for James, it gains a growth channel.

## Secondary personas

- Marcus: useful for onboarding and AI explanation calibration
- Angela: useful for portfolio-lite discipline and price sensitivity
- Ray: useful for rehab execution and field updates

These personas matter, but they should not define the platform shape first.

## Deferred / distortion-risk persona

- Kyle should be deliberately deprioritized for roadmap-shaping decisions right now

Why:

- STR operations create a separate rabbit hole
- STR-specific data and workflow needs are real, but they are not core to Parcel's current strongest wedge

## Personas that can distort the roadmap if overweighted

- Desiree, if Parcel starts optimizing the whole product around wholesalers
- Angela, if Parcel drifts into landlord operations
- James, if Parcel over-rotates into white-label and client-service features too early
- Marcus, if the app becomes tutorial-first instead of operator-first

## 3. Canonical Domain Model

## Domain-model principle

The right model is:

- `Property` is the durable asset identity
- `Deal` is the transactional opportunity record
- `AnalysisScenario` is the strategy model layer
- `FinancingInstrument`, `Obligation`, `Transaction`, `Lease`, and `RehabProject` are the post-close operating layers
- `Contact` and `BuyerProfile` are the relationship layer
- `Report` is the outward-facing communication layer

Do not keep stretching `deals.inputs` and `deals.outputs` into permanent operating objects.

## Core entities

| Entity | First-class? | Purpose | Key rule |
|---|---|---|---|
| `Property` | Yes | Canonical asset record | Can exist before, during, and after deals |
| `Deal` | Yes | Acquisition, disposition, or negotiation record | Multiple deals can relate to one property over time |
| `AnalysisScenario` | Yes | One strategy-specific underwriting case | Many scenarios can hang off one property or one deal |
| `Contact` | Yes | Universal person/entity record | One contact can play many roles |
| `BuyerProfile` | Yes | Buy-box extension of a contact | Should not be reduced to generic tags only |
| `Task` | Yes | Action layer across records | Can attach to property, deal, contact, obligation, rehab, or report |
| `FinancingInstrument` | Yes | Mortgage, seller note, wrap, sub-to underlying loan, lease-option instrument | Instruments are persistent and have their own terms |
| `Obligation` | Yes | Scheduled or exception-driven requirement | Often generated from financing instruments, leases, or compliance rules |
| `Transaction` | Yes | Actual financial event | Supports variance vs pro forma and portfolio-lite visibility |
| `Lease` | Yes | Occupancy and rent obligation record | Parcel tracks timing and performance, not resident operations |
| `RehabProject` | Yes | Execution layer for flip / BRRRR work | Lives at property level, can relate to a specific deal |
| `Communication` | Yes | Call, text, email, meeting log | Must not be buried as notes only |
| `Document` | Yes | Uploaded or generated file / extracted artifact | Can link to property, deal, rehab, obligation, lease, or report |
| `Report` | Yes | Generated internal or external deliverable | Link-first, PDF-second |

## Relationship model

## Property

`Property` should own:

- address identity
- location / parcel identity
- physical characteristics
- canonical lifecycle state
- linked deals
- linked analyses
- linked documents
- linked rehab projects
- linked leases
- linked financing instruments
- linked obligations
- linked transactions

Rule:

- if the user still cares about the asset after the deal is done, it belongs under property continuity somewhere

## Deal

`Deal` should own:

- acquisition or disposition intent
- seller-side context
- pipeline stage
- active negotiation state
- target terms
- outcome
- parties in transaction roles

Rule:

- a property can have multiple deals over time
- a deal may die while the property persists

## AnalysisScenario

`AnalysisScenario` should own:

- strategy type
- assumption set
- calculated outputs
- risk flags
- AI narrative
- source confidence
- comparison role

Rule:

- scenarios are snapshots of reasoning, not the property itself
- users should be able to compare multiple scenarios for the same property without duplicating the whole property record

## Contact and BuyerProfile

`Contact` should be universal:

- seller
- buyer
- lender
- title company
- contractor
- insurance agent
- partner
- tenant if needed for visibility

`BuyerProfile` should extend `Contact` with:

- markets
- strategies
- price range
- asset type preference
- rehab tolerance
- close-speed preference
- proof-of-funds state
- disposition history

Rule:

- buyers are not just generic contacts with tags

## FinancingInstrument and Obligation

`FinancingInstrument` should model:

- conventional loans
- hard money
- seller notes
- subject-to underlying debt
- wraps
- lease-option instruments where relevant

`Obligation` should model:

- recurring payments
- balloon dates
- insurance renewals
- tax due dates
- verification tasks
- servicer transfer follow-up
- risk exceptions

Rule:

- obligations must be independently queryable across the portfolio
- Carlos cannot be forced to open each deal to know what is due

## Transaction

`Transaction` should track actual money movement or booked financial events relevant to investor oversight.

Examples:

- purchase closing cost
- rehab draw
- monthly rent inflow
- debt payment
- insurance premium
- tax payment
- assignment fee revenue

Rule:

- Parcel should track investor-relevant financial events
- Parcel should not become a full double-entry accounting system

## Lease

`Lease` should exist for:

- lease start and end
- rent amount
- renewal status
- vacancy / turnover timing
- property-unit visibility where needed

Rule:

- Parcel tracks lease timing and implications
- not resident portals, payment disputes, or maintenance workflow

## RehabProject

`RehabProject` should own:

- budget vs actual
- scope categories
- timeline / stage
- blockers
- photos / documents

Rule:

- rehab belongs to the property as a project, not to the calculator output

## Report

`Report` should be a first-class record tied to:

- property
- deal
- analysis scenario
- portfolio snapshot
- obligation summary
- rehab summary

It should store:

- audience
- brand context
- share-link state
- PDF generation state
- engagement metrics

Rule:

- reports are not just generated files
- they are trackable product artifacts

## 4. Core Operating Journeys

## 1. Address -> Analysis -> Save

Flow:

1. User enters an address.
2. Parcel enriches property data using high-confidence sources.
3. Parcel generates a draft analysis with visible assumptions.
4. User confirms or edits critical inputs.
5. Parcel creates the `Property`.
6. Parcel saves one or more `AnalysisScenarios`.
7. User chooses next action:
   - save only
   - move to pipeline
   - create report
   - compare strategies

Design rule:

- this is the activation promise
- do not block it behind CRM setup or heavy forms

## 2. Deal -> Pipeline -> Close

Flow:

1. User creates or promotes a deal from an analysis.
2. Parcel attaches seller-side context, contacts, stage, and tasks.
3. AI highlights risk and next actions inline.
4. Communication, documents, and notes accrue on the deal.
5. At close, Parcel resolves the deal and links or updates the property state.

Design rule:

- pipeline is for transactions in motion
- it is not the permanent home of the asset

## 3. Property -> Portfolio -> Obligations

Flow:

1. Closed or owned property becomes an active asset record.
2. User attaches financing instruments, lease data, rehab status, and key transactions.
3. Parcel derives obligations and monitoring events.
4. Property contributes to portfolio views and Today.
5. AI highlights refi windows, risk, underperformance, or expiring events.

Design rule:

- this is where Parcel becomes more than a CRM

## 4. Deal -> Buyer Matching -> Assign

Flow:

1. A marketable deal enters disposition-ready state.
2. Parcel matches the property against BuyerProfiles.
3. User blasts the best-fit buyers.
4. Parcel tracks opens, replies, tours, offers, and pass reasons.
5. Deal moves through disposition stages to assignment or close.

Design rule:

- dispositions must be as first-class as acquisition for wholesale and hybrid users

## 5. Today / Morning Briefing Loop

Flow:

1. Parcel aggregates due tasks, stale deals, active risks, upcoming lease events, rehab blockers, and obligation exceptions.
2. AI produces a concise morning briefing.
3. User triages Today.
4. Completed or snoozed items update the queue.
5. Dashboard reflects health; Today reflects action.

Design rule:

- Dashboard is orientation
- Today is work

## 6. Report Creation -> Share -> Engagement

Flow:

1. User generates a report from a scenario, property, portfolio, rehab, or obligation view.
2. Parcel renders a link-first deliverable.
3. User optionally exports PDF.
4. Recipient opens the report.
5. Parcel logs engagement and feeds it back into Today, contact history, and follow-up cues.

Design rule:

- reports are communication surfaces, not passive exports

## 5. Recommended IA

## IA principle

Parcel should organize around:

- daily work
- core records
- operating layers
- outward communication

It should not organize around:

- only acquisition
- only feature categories
- AI as a separate novelty module

## Desktop IA

Recommended sidebar:

### HOME

- `Today`
- `Dashboard`

### CORE

- `Analyze`
- `Pipeline`
- `Properties`
- `Portfolio`

### RELATIONSHIPS

- `Contacts`
- `Buyers`
- `Inbox`

### EXECUTION

- `Rehabs`
- `Obligations`

### OUTPUTS

- `Reports`
- `Documents`

### GROWTH

- `Marketing`
- `Drive`

Bottom:

- `Settings`
- `Compliance`

## IA notes

- `Today` should be the default post-login landing page for active users
- `Dashboard` should remain the business-health and orientation surface
- `Properties` must be top-level, not buried under Deals
- `Obligations` must be top-level for users with active financing / lease / compliance load
- `Rehabs` must be top-level for users with active projects
- `Buyers` should exist as a first-class view once dispositions ship
- `Marketing` can contain sequences, skip tracing, mail, and outbound operations

## Where AI lives

AI should be:

- embedded into Analyze, Today, Property, Deal, Report, Obligation, and Rehab surfaces
- globally summonable from anywhere

AI should not be treated as:

- a normal module in the same sense as Documents or Settings

A separate Chat page can still exist, but it should be secondary.

## Mobile IA

Recommended bottom tabs:

- `Today`
- `Analyze`
- `Pipeline`
- `Properties`
- `More`

Global mobile behaviors:

- persistent AI assistant entry from any major screen
- floating action button for:
  - add property
  - scan document
  - drive capture

Why not universal D4D tab:

- D4D matters strongly for a subset of users, not for the entire platform
- mobile's core job is Today, quick review, field capture, and urgent exception handling

## Today vs Dashboard

The split should be hard:

- `Today`: due now, urgent, stale, actionable, triage-oriented
- `Dashboard`: portfolio health, pipeline totals, trend views, strategic overview

Morning Briefing:

- always visible in both
- compact summary in Dashboard
- actionable briefing head in Today

## What should be subordinate instead of top-level

- `Tasks` should be a universal layer surfaced heavily in Today and on records, not filed under People
- `Communications` should live under Inbox / related records, not as abstract admin data
- per-deal creative details and rehab details should still live on the relevant property / deal pages

## 6. Build Order

## Phase 1: Lock the structural foundation

Ship first:

- property-centric schema
- analysis scenarios as first-class records
- contact model
- buyer-profile extension
- report model
- financing instrument and obligation model

Why first:

- without these objects, every next feature becomes a JSON blob or a UI patch

## Phase 2: Fix the front door

Ship next:

- address-first onboarding
- sample deals
- persona routing
- AI-narrated draft analysis
- save-to-property and save-to-deal flows

Why next:

- activation must match the product promise

## Phase 3: Build the operating loop

Ship:

- Today
- task model and action queue
- improved pipeline continuity
- property detail pages
- dashboard refactor around the new object model

Why:

- this creates daily return behavior

## Phase 4: Build the report system

Ship:

- report families
- brand kit
- share links
- PDF export from canonical report view
- engagement tracking

Why:

- this helps activation, retention, and distribution simultaneously

## Phase 5: Build the creative-finance moat

Ship:

- financing instruments
- obligation generation
- verification events
- balloon-date monitoring
- insurance / payment exception tracking
- creative-finance Today items

Why:

- this is the strongest strategic differentiation

## Phase 6: Build dispositions

Ship:

- buyers
- buy boxes
- property-to-buyer matching
- disposition stages
- buyer blasts
- response / offer tracking

Why:

- this completes the wholesaler and hybrid operating loop

## Phase 7: Expand portfolio-lite and rehab execution

Ship:

- transaction entry/import
- lease timelines
- rehab project views
- variance reporting
- lender / partner snapshots

Why:

- this strengthens hold, BRRRR, and flip use cases without drifting into PM software

## Phase 8: Communications and field capture

Ship:

- integrated comms
- notifications
- mobile-first field capture improvements
- D4D as a specialized mode, not the app's universal center

Why:

- this adds operating sharpness, but it should sit on top of the right record model first

## Phase 9: Team / Business layer

Ship:

- role presets
- assignment model
- selective permissions
- external secure sharing

Why:

- team-readiness matters, but the product should work beautifully for solo users first

## 7. Hard Product Boundaries

Parcel should explicitly not build these yet:

- tenant portal
- rent collection infrastructure
- maintenance request system
- vendor dispatching
- full double-entry accounting
- resident screening and leasing operations
- public buyer marketplace
- investor social network
- broad MLS browsing portal
- full white-label platform
- loan servicing platform
- legal-advice workflows disguised as compliance

The likely integration path instead:

- export or sync where needed
- preserve data visibility in Parcel
- avoid operational takeover where margin and complexity explode

## 8. Biggest Unresolved Founder Decisions

## 1. Which persona is the commercial spearhead?

The product can serve multiple personas, but the go-to-market center must be chosen:

- hybrid investor
- creative finance investor
- wholesaler
- investor-serving agent

My recommendation:

- build for Tamara and Carlos
- sell initially to Desiree and James too
- do not market as wholesaler-only

## 2. How aggressive should the creative-finance moat be in the first public story?

Should Parcel:

- market broadly and let creative-finance depth win in comparison
- or market creative finance more directly as the wedge?

My recommendation:

- broad marketing
- deep creative-finance proof inside product and comparison pages

## 3. How much native communications should Parcel own?

There is a big difference between:

- logging communications
- basic outbound workflows
- fully replacing dialers and SMS stacks

My recommendation:

- do not let comms become the roadmap tyrant before the object model is fixed

## 4. How far should white-label go?

James benefits from strong branding, but full white-label can kill the referral loop and increase support load.

My recommendation:

- strong user branding
- subtle Parcel attribution
- delayed true white-label

## 5. Should Today replace Dashboard as the default home?

My recommendation:

- yes, for active users
- keep Dashboard accessible as the strategic health surface

## 6. How deep should portfolio-lite go before integrations?

My recommendation:

- deep enough for visibility, obligations, and reporting
- not into resident operations or trust accounting

## 7. When should Business/team packaging become real?

My recommendation:

- keep the schema team-ready now
- keep the product solo-first until assignment, permissions, and report sharing feel natural

## 8. Which provider stack should power the front door?

My recommendation:

- RentCast for broad enrichment
- Bricked for deeper underwriting moments
- do not promise MLS-grade completeness everywhere on day one

## 9. Should Buyers be a separate nav destination or a filtered Contacts mode?

My recommendation:

- separate destination once dispositions are live
- use a shared underlying contact model

## 10. Should AI remain a visible Chat module at all?

My recommendation:

- yes, but as a secondary drill-down surface
- the primary AI experience should be embedded, narrated, and contextual

## What I would lock for v1.5 today

If I were locking Parcel v1.5 today, I would commit to this:

- Parcel is a property-centric investor operating system
- the front door is address-first analysis
- the default home is Today
- AI is the system voice, not the product category
- creative-finance obligations are the moat
- reports are first-class records and share surfaces
- dispositions are necessary, but marketplaces are later
- portfolio stays investor-lite, not PM-heavy
- mobile is Today + field capture + urgent exceptions
- team support exists, but solo clarity wins

That is a coherent product.

Anything that weakens that coherence should be treated as a distraction, even if it is individually attractive.
