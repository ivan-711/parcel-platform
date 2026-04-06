# Property-Centric Domain Model Research

Date: 2026-04-02

Research question:
- What domain model best supports Parcel's goal of becoming an investor operating system across acquisition, analysis, execution, and light portfolio operations?
- What should be anchored on `property`, what should remain on `deal`, and what must become first-class operational entities?

Inputs used:
- `RESEARCH/05-database-architecture.md`
- `RESEARCH/07-crm-workflow-requirements.md`
- `RESEARCH/02-rental-portfolio-platforms.md`
- `SAD/current-state-audit.md`
- Fresh external research on Stessa, DealCheck, REsimpli, and FreedomSoft

## Executive Verdict

Parcel should be `property-centric`, but not `property-only`.

The correct model is:
- `property` as the durable real-world asset record
- `deal` as the acquisition / disposition / negotiation record
- `analysis scenario` as the strategy-specific model layer
- `instrument`, `obligation`, `transaction`, `lease`, and `rehab project` as post-close operating layers

The biggest modeling mistake Parcel can make now is to keep stretching the current `deals.inputs` and `deals.outputs` JSONB model into places where real operating entities should exist.

## Why Property Must Become the Anchor

The current repo is deal-centric. That is fine for an analysis MVP, but it breaks down as soon as the product needs continuity across time.

A property can:
- be sourced as a lead
- be analyzed across multiple strategies
- go under contract
- be acquired with a creative structure
- enter rehab
- stabilize as a rental
- refinance later
- carry leases, expenses, insurance, taxes, and documents for years

That continuity belongs to `property`, not to a single `deal`.

Stessa's public product structure reinforces this:
- start with a property address
- then layer transactions, leases, tenants, and banking around the property

Sources:
- https://www.stessa.com/get-started/
- https://www.stessa.com/blog/rent-collection-expenses-unit/

DealCheck reinforces the opposite side:
- property analysis starts from a property record and imported property data
- then users customize deal assumptions and reports around that property

Sources:
- https://dealcheck.io/
- https://help.dealcheck.io/en/articles/2046991-how-to-import-property-data-from-public-records-listings

Inference:
- property should be the canonical identity layer
- deal and analysis should sit on top of it

## Why Deal Must Still Exist

If Parcel makes `property` the only core object, it will lose acquisition and decision history.

Parcel still needs a `deal` object because investors need to track:
- who the seller is
- where the opportunity sits in pipeline
- what offer was made
- what strategy is currently preferred
- why the deal died or closed
- which contacts were involved in that transaction

FreedomSoft and REsimpli are useful contrasts here:
- both are heavily lead / pipeline / inbox oriented
- both treat acquisition workflow as a first-class operating system concern

Sources:
- https://freedomsoft.com/crm-overview/
- https://resimpli.com/features/crm/

Inference:
- Parcel should not become a pure asset-management tool
- it needs the acquisition system too
- but acquisition should not be the only mental model

## Recommended Core Model

## 1. Property

Meaning:
- the real-world parcel / address / asset identity

What belongs here:
- normalized address
- lat/lng
- APN / parcel number
- property characteristics
- canonical photos
- county / zoning / school / geo context
- current high-level lifecycle status

Rule:
- a property can exist before a deal exists

## 2. Deal

Meaning:
- a specific acquisition, disposition, or financing opportunity tied to a property

What belongs here:
- current strategy preference
- pipeline stage
- seller-side context
- target purchase terms
- negotiation notes
- contacts in transaction roles
- closing outcome

Rule:
- one property can have many deals over time

Examples:
- analyzed as wholesale in 2026 and passed
- revisited as BRRRR in 2027
- later sold through a disposition deal

## 3. Analysis Scenario

Meaning:
- one strategy-specific or scenario-specific underwriting model

Why it should be separate:
- the same property or deal may need:
  - wholesale
  - BRRRR
  - flip
  - buy-and-hold
  - creative-finance
  - multiple financing assumptions within each

Recommended rule:
- one deal can have many analysis scenarios
- one scenario has one strategy and one assumption set

This is better than forcing every strategy comparison into a single JSON blob forever.

## 4. Contact

Meaning:
- person or entity participating in the system

Roles can include:
- seller
- buyer
- tenant
- lender
- contractor
- insurance agent
- title company
- property manager

Recommended rule:
- one contact can have many roles
- roles should be modeled via junctions / extensions, not duplicate contact records

This matches the existing architecture recommendation in `RESEARCH/05-database-architecture.md`.

## 5. Financing Instrument

Meaning:
- the actual debt or option structure attached to a property or deal

Examples:
- conventional loan
- DSCR loan
- hard money loan
- seller-finance note
- subject-to underlying mortgage
- wrap mortgage
- lease option

What belongs here:
- instrument type
- balance
- rate
- payment amount
- amortization
- balloon date
- lender / note holder
- servicing details

Rule:
- a property can have many instruments over time
- a creative-finance property may have multiple simultaneous instruments

## 6. Obligation

Meaning:
- something time-bound and operationally critical that must happen

Examples:
- payment due
- insurance renewal
- balloon date
- lease option exercise deadline
- tax due date
- seasoning milestone

This must be first-class for Parcel's retention loop and creative-finance moat.

## 7. Transaction

Meaning:
- append-only financial event

Examples:
- assignment fee
- rent payment
- mortgage payment
- insurance premium
- rehab draw
- closing cost
- CapEx expense

Recommended rule:
- transactions should link to property and optionally to:
  - deal
  - instrument
  - lease
  - rehab project
  - contact

## 8. Lease

Meaning:
- occupancy agreement tied to a property or unit

Needed for:
- Angela / landlord workflows
- BRRRR stabilization
- creative-finance lease options
- unit-level reporting later

## 9. Rehab Project

Meaning:
- a scoped operational project on a property

Needed for:
- Ray / flip workflows
- BRRRR rehab cycles
- budget vs actual
- contractor assignments

## 10. Tasks, Documents, Communications, and Events

These are cross-cutting layers.

They should all be linkable to multiple entity types:
- property
- deal
- contact
- lease
- rehab project
- instrument

This is why putting `Tasks` under `People` in the IA was wrong.

## Recommended Relationship Model

```text
Property
  |- Deals (many)
  |    |- AnalysisScenarios (many)
  |    |- PipelineEvents (many)
  |    |- DealContacts (many)
  |
  |- FinancingInstruments (many)
  |    |- Obligations (many)
  |    |- VerificationEvents (many)
  |
  |- Leases (many)
  |- RehabProjects (many)
  |- Transactions (many)
  |- Documents (many)
  |- Tasks (many)
  |- Communications (many)
```

Optional future extension:
- if Parcel later needs re-acquisition history, syndication, or ownership-period segmentation, add a `holdings` or `ownership_periods` layer between `property` and the operating modules

## Practical Modeling Rules

## Rule 1: Do not force property identity into deal JSON

Property facts should live on `properties`, not only inside `deals.inputs`.

Why:
- deduplication
- faster search
- easier updates
- reuse across many deals and scenarios

## Rule 2: Do not make one status field do everything

You need separate states for:
- property lifecycle
- deal lifecycle
- lease lifecycle
- rehab lifecycle
- instrument lifecycle

If one `status` column tries to describe all of that, the model will rot.

## Rule 3: Pipeline should be event-sourced

The local architecture research is right here:
- keep immutable `pipeline_events`
- materialize current pipeline state separately

Why:
- history
- analytics
- undo / explainability
- cleaner timelines

## Rule 4: Financial records should be append-only

The local architecture research is also right here:
- no soft delete for financial transactions
- corrections should be reversing entries

That becomes more important once creative-finance monitoring exists.

## Rule 5: Documents and tasks must support polymorphic linking

Example:
- a lease PDF may link to both a property and a lease
- an insurance declaration may link to a property and a financing instrument
- a title task may link to a deal and a contact

## Anti-Patterns to Avoid

## 1. "Everything is a deal"

This causes:
- weak portfolio continuity
- weak property search
- awkward post-close modeling
- no clean home for leases, instruments, or obligations

## 2. "Everything is a property"

This causes:
- weak acquisition history
- poor pipeline modeling
- negotiation and seller context gets buried

## 3. "Everything stays in JSONB"

Good for:
- flexible scenario payloads
- extracted AI blobs

Bad for:
- search
- reporting
- performance
- entity relationships

## 4. "Contacts are columns"

Examples to avoid:
- `seller_name`
- `tenant_name`
- `lender_name`
- `contractor_name`

That kills reuse and relationship history.

## 5. "Creative finance is just another strategy enum"

It is a strategy, but operationally it also introduces:
- instruments
- obligations
- verification events
- risk signals

That requires first-class objects.

## Recommended Phased Implementation

## Phase 1

Add:
- `properties`
- link `deals.property_id`
- move key property facts out of deal-only storage

## Phase 2

Add:
- `analysis_scenarios`
- `contacts`
- `deal_contacts`
- `tasks`
- `documents` linked beyond user-only scope

## Phase 3

Add:
- `financing_instruments`
- `obligations`
- `verification_events`
- `transactions`

## Phase 4

Add:
- `leases`
- `rehab_projects`
- `communications`
- `pipeline_events`

This sequence keeps Parcel moving from analysis MVP to operating system without needing a rewrite.

## Final Recommendation

Parcel should be modeled as:

- `Property-first`
- `Deal-aware`
- `Instrument- and obligation-capable`
- `Transaction- and document-linked`

That gives you the broadest room to support:
- beginners
- wholesalers
- flippers
- landlords
- hybrid investors
- creative-finance operators

without forcing the platform to feel like a wholesaler CRM with calculators bolted on.

## Sources

### Local
- `RESEARCH/05-database-architecture.md`
- `RESEARCH/07-crm-workflow-requirements.md`
- `RESEARCH/02-rental-portfolio-platforms.md`
- `SAD/current-state-audit.md`

### External
- Stessa:
  - https://www.stessa.com/get-started/
  - https://www.stessa.com/blog/rent-collection-expenses-unit/
  - https://www.stessa.com/
- DealCheck:
  - https://dealcheck.io/
  - https://help.dealcheck.io/en/articles/2046991-how-to-import-property-data-from-public-records-listings
- REsimpli:
  - https://resimpli.com/features/crm/
  - https://resimpli.com/blog/resimpli-features/
- FreedomSoft:
  - https://freedomsoft.com/crm-overview/

