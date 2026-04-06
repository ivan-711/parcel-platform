# Portfolio-Lite Boundary Definition Research

Date: 2026-04-02

Research question:
- What should Parcel include in `light portfolio management`?
- What should Parcel explicitly avoid so it does not drift into landlord / property-management software?
- Where is the product boundary that best supports Parcel's investor OS vision?

Inputs used:
- `RESEARCH/00-MASTER-RESEARCH-SYNTHESIS.md`
- `RESEARCH/02-rental-portfolio-platforms.md`
- `RESEARCH/05-database-architecture.md`
- `RESEARCH/07-crm-workflow-requirements.md`
- `RESEARCH/15-monetization-benchmarks.md`
- `RESEARCH/18-property-centric-domain-model.md`
- `SAD/current-state-audit.md`
- `SAD/personas/04-angela-buy-hold-landlord.md`
- `SAD/personas/05-kyle-str-airbnb-investor.md`
- `SAD/personas/07-tamara-hybrid-investor.md`
- Fresh external research on Stessa, Baselane, TurboTenant, Buildium, DoorLoop, and AppFolio

## Executive Verdict

Parcel should own:
- investor visibility
- asset-level performance
- acquisition-to-hold continuity
- deadlines and obligations
- scenario analysis
- reporting that helps users decide, monitor, and communicate

Parcel should not own:
- resident self-service
- rent processing infrastructure
- maintenance operations
- screening and leasing workflows
- full property-management accounting
- owner / resident / vendor portals

The clean boundary is:

- `Parcel = investor operating system`
- `Not Parcel = landlord operations system`

That means Parcel should be strong at:
- knowing what you own
- how it is performing
- what is due next
- how actual results compare with pro forma
- what risks or refinancing opportunities exist

It should stay intentionally weak or integration-led for:
- collecting rent
- handling tenant support
- coordinating repairs
- running resident portals
- performing trust accounting

## Why This Boundary Matters

### 1. Your stated vision already sets the constraint

The locked-in product vision is explicit:
- "Light portfolio management"
- "Not a tenant portal"
- "Not rent processing"
- "Not maintenance ticketing"
- "Parcel is the investor's tool, not the landlord operations tool"

That is not a side note. It is a strategic moat-protection decision.

### 2. The personas want investor outcomes, not PM complexity

Angela wants:
- one portfolio view
- lease timeline visibility
- income / expense understanding
- deal + portfolio context together

She does not need:
- a resident portal
- automated vendor dispatch
- a full service desk

Tamara wants:
- Stessa replacement at the dashboard and reporting layer
- portfolio equity and cash flow
- property detail pages
- creative note monitoring

She does not need Parcel to become Buildium.

Kyle's future persona is the strongest warning sign:
- he already uses specialist operations tools for STR execution
- Parcel becomes interesting when it unifies acquisition, analysis, and portfolio-level insight
- if Parcel tries to absorb STR and landlord operations too early, scope explodes and the core gets diluted

## What the Market Shows

## 1. Stessa is still "light" compared with PM suites, and it is already a lot

Stessa's own navigation and help docs show that even a finance-first investor tool includes:
- dashboard
- rent collection
- leases and tenants
- maintenance
- transactions
- reports
- cash management / banking

It also supports:
- rent roll
- tenant ledger
- valuation tracking
- tax package outputs

Sources:
- https://support.stessa.com/en/articles/11049493-navigating-your-account
- https://support.stessa.com/en/articles/2423532-how-to-manage-property-leases-tenants-in-stessa
- https://support.stessa.com/en/articles/4610851-understanding-your-rent-roll-report
- https://support.stessa.com/en/articles/4806958-tenant-ledger-how-to-track-charges-payments-balances

Inference:
- even "light" landlord finance software accumulates a large operational surface quickly

## 2. Baselane is financial-first, but still crosses into rent collection and leases

Baselane explicitly positions itself around:
- banking
- integrated bookkeeping
- financial reporting
- leases
- tenant screening
- rent collection
- tenant portal

Source:
- https://support.baselane.com/hc/en-us/articles/25483594517403-What-is-Baselane

Inference:
- once Parcel moves into money movement and tenant workflows, it is no longer just portfolio-lite

## 3. TurboTenant is a clean example of where the PM slope begins

TurboTenant markets itself as:
- a one-stop shop for finding and managing tenants

Its core surface includes:
- listing syndication
- screening
- leases
- rent payments
- maintenance requests
- messaging
- tenant portal

Sources:
- https://www.turbotenant.com/
- https://www.turbotenant.com/property-management-paid/
- https://support.turbotenant.com/en/articles/8240028-about-your-tenant-portal
- https://support.turbotenant.com/en/articles/11990457-how-to-submit-a-maintenance-request-in-your-tenant-portal

Inference:
- this is the operational branch Parcel should avoid owning

## 4. Buildium, DoorLoop, and AppFolio show what "full PM" really means

Buildium's feature set includes:
- resident portal
- owner portal
- online rent payments
- maintenance requests
- inspections
- accounting
- communication tools

Sources:
- https://www.buildium.com/features-2/
- https://www.buildium.com/features/resident-center/
- https://www.buildium.com/features/online-rent-payments/

DoorLoop includes:
- tenant portal
- owner portal
- maintenance request workflows
- request updates and communication

Sources:
- https://support.doorloop.com/en/articles/6337601-tenant-portal-overview
- https://support.doorloop.com/en/articles/6865767-how-to-make-maintenance-requests-through-the-tenant-portal
- https://support.doorloop.com/en/articles/8344889-customize-owner-portal-settings

AppFolio explicitly separates:
- resident portal
- owner portal
- vendor portal
- investor portal

Source:
- https://www.appfolio.com/login

Inference:
- the moment Parcel builds portals for residents, owners, or vendors, it has entered a different business category

## Recommended Scope: What Portfolio-Lite Should Include

## 1. Portfolio overview

Parcel should show:
- portfolio value / equity estimate
- debt and obligations summary
- monthly and trailing cash flow
- occupancy / vacancy summary
- upcoming lease expirations
- upcoming refinance / balloon / insurance / tax dates
- performance versus original pro forma
- concentration risk by geography / strategy / lender / structure

This is investor intelligence, not PM execution.

## 2. Property detail pages

Parcel should make the property page the durable operating record for the investor.

Include:
- property identity and characteristics
- acquisition history
- current strategy
- current occupancy status
- key lease terms
- debt / financing snapshot
- obligations and deadlines
- simplified transactions
- documents and notes
- scenario history

## 3. Lease tracking, but in a lite form

Parcel should support:
- tenant / occupant names
- unit
- monthly rent
- deposit amount
- lease start / end
- renewal status
- payment status summary

Parcel should not initially support:
- resident portal access
- full tenant messaging workflow
- application workflows
- lease generation and signing as a core lane
- legal notice automation

Why:
- Angela needs awareness, not a resident operating system

## 4. Transactions, but not full accounting

Parcel should track:
- rent received
- mortgage / note payments
- taxes
- insurance
- rehab costs
- operating expenses
- assignment fees
- closing costs

This should support:
- property-level and portfolio-level reporting
- variance vs pro forma
- lender / CPA / partner summaries

Parcel should avoid becoming:
- a general ledger system
- a bank feed reconciliation engine
- a trust-accounting product

At least in the core roadmap.

## 5. Obligations and monitoring

This is where Parcel should go deeper than portfolio tools:
- balloon dates
- seasoning timelines
- insurance renewals
- note payment verification
- lease option deadlines
- refinance readiness

This is investor-specific and defensible.

## 6. Reporting and exports

Parcel should absolutely support:
- lender-facing summaries
- partner / spouse review packets
- rent-roll-style summaries
- portfolio snapshots
- tax-prep-friendly exports

This is high-value without dragging the product into PM operations.

## Recommended Scope: What Parcel Should Explicitly Exclude

## 1. Resident / tenant portals

Do not build:
- tenant dashboards
- tenant self-service apps
- renter communications hub
- proof-of-insurance upload workflows for residents

## 2. Rent collection and payment operations

Do not build as a core lane:
- ACH rent collection
- recurring resident autopay
- late-fee automation
- payout rails
- payment disputes

This adds:
- support burden
- compliance burden
- operational complexity

without strengthening Parcel's core moat enough.

## 3. Maintenance operations

Do not build:
- maintenance ticket intake
- work order routing
- vendor dispatch
- technician portals
- maintenance communication threads

Parcel can track a maintenance issue as:
- a note
- an expense
- a risk flag

It should not become the execution system.

## 4. Tenant acquisition workflows

Do not build:
- listing syndication
- tenant screening
- application review
- showing coordination

Those features are useful but they pull Parcel toward TurboTenant / Buildium territory.

## 5. Full bookkeeping / PM accounting

Avoid:
- double-entry ledger ambitions
- bank reconciliation depth
- trust accounting
- owner disbursement logic
- resident balance operations

If Parcel ever touches these, it should be via:
- imports
- exports
- integrations

not as the core product spine.

## A Practical Boundary Test

Before Parcel adds a portfolio feature, ask:

Does this help the investor:
- decide?
- monitor?
- compare?
- report?
- de-risk?

If yes, it likely belongs.

Or does it mostly help:
- a resident pay
- a tenant request service
- a manager process paperwork
- a back office reconcile transactions

If yes, it likely does not belong.

## Recommended Integration Strategy

Instead of building landlord operations deeply, Parcel should prefer:
- CSV import from Stessa / QuickBooks / spreadsheets
- simple transaction import
- accounting export for CPA / bookkeeper workflows
- integration hooks for PM systems later if demand exists

This gives Parcel:
- continuity across the investor lifecycle
- without owning every operational subsystem

## Product Implications for Parcel

1. Keep `Portfolio` as an investor performance and monitoring surface, not a PM workspace.

2. Add first-class support for:
- properties
- leases lite
- transactions lite
- obligations
- reports

3. Do not let roadmap pressure turn `Leases` into a full tenant-management module by accident.

4. Prioritize:
- performance vs projection
- debt / obligation monitoring
- cross-strategy rollups
- refinance and deadline awareness

5. Treat PM-grade features as:
- outside core scope
- integration opportunities
- or very-late optional modules if the business ever chooses to expand categories deliberately

## Bottom-Line Recommendation

Parcel should be the place an investor answers:
- What do I own?
- What is it earning?
- What is at risk?
- What is due next?
- How does reality compare to the original deal thesis?

Parcel should not be the place a resident:
- pays rent
- opens a maintenance request
- uploads insurance
- manages a portal account

That line keeps Parcel focused, differentiated, and compatible with the vision that matters most.

## Sources

External:
- https://support.stessa.com/en/articles/11049493-navigating-your-account
- https://support.stessa.com/en/articles/2423532-how-to-manage-property-leases-tenants-in-stessa
- https://support.stessa.com/en/articles/4610851-understanding-your-rent-roll-report
- https://support.stessa.com/en/articles/4806958-tenant-ledger-how-to-track-charges-payments-balances
- https://support.baselane.com/hc/en-us/articles/25483594517403-What-is-Baselane
- https://www.turbotenant.com/
- https://www.turbotenant.com/property-management-paid/
- https://support.turbotenant.com/en/articles/8240028-about-your-tenant-portal
- https://support.turbotenant.com/en/articles/11990457-how-to-submit-a-maintenance-request-in-your-tenant-portal
- https://www.buildium.com/features-2/
- https://www.buildium.com/features/resident-center/
- https://www.buildium.com/features/online-rent-payments/
- https://support.doorloop.com/en/articles/6337601-tenant-portal-overview
- https://support.doorloop.com/en/articles/6865767-how-to-make-maintenance-requests-through-the-tenant-portal
- https://support.doorloop.com/en/articles/8344889-customize-owner-portal-settings
- https://www.appfolio.com/login

Internal:
- `SAD/personas/04-angela-buy-hold-landlord.md`
- `SAD/personas/05-kyle-str-airbnb-investor.md`
- `SAD/personas/07-tamara-hybrid-investor.md`
- `SAD/current-state-audit.md`
- `RESEARCH/02-rental-portfolio-platforms.md`
- `RESEARCH/18-property-centric-domain-model.md`
