# Packaging and Monetization by Persona

Date: 2026-04-02

Research question:
- What pricing and packaging structure best fits Parcel's personas and product scope?
- Which features should be plan-based versus usage-based?
- How should Parcel package value without copying wholesaler CRM pricing or landlord per-unit pricing?

Inputs used:
- `RESEARCH/15-monetization-benchmarks.md`
- `SAD/personas/00-persona-synthesis.md`
- `SAD/current-state-audit.md`
- `backend/core/billing/tier_config.py`
- `frontend/src/pages/PricingPage.tsx`
- Fresh external research on official pricing pages for DealCheck, REsimpli, DealMachine, PropStream, Stessa, FreedomSoft, FlipperForce, and Bricked

## Executive Verdict

Parcel should not keep the current `Free / Starter / Pro / Team` framing.

It should move to:

- `Free`
- `Plus`
- `Pro`
- `Business`

That structure matches:
- the persona documents
- the product vision
- the market's actual willingness-to-pay bands

It also lets Parcel do something most competitors do poorly:
- charge landlords and beginners gently
- charge active operators more without pretending everyone is a wholesaler team

## Why the Current Packaging Is Wrong

Current code and UI still reflect a narrower product:
- `FREE`
- `STARTER`
- `PRO`
- `TEAM`

And the current pricing page effectively markets:
- Free
- Pro
- Team

with a strong emphasis on analyses, chat, and saved deals.

That does not fit the product you are actually moving toward.

Problems:

### 1. `Starter` is the wrong mental model

In the current market, `Starter` usually means:
- a lower-end operator plan
- or a stripped-down team / CRM plan

That is not Parcel's real segmentation problem.

The real segmentation problem is:
- beginner / light investor
- landlord / hold-heavy solo investor
- active solo operator
- team / delegation / scale

`Plus` fits that much better than `Starter`.

### 2. Current tiers under-describe investor OS value

The current billing config mainly gates:
- analyses
- AI messages
- saved deals
- documents
- pipeline
- portfolio
- offer letters
- comparison
- team seats

That is still calculator-era packaging.

It does not express:
- creative-finance monitoring
- Today / Morning Briefing
- rehab tracking
- reporting depth
- communications
- team workflows

### 3. Persona strategy is already converging elsewhere

The persona synthesis already assumes:
- Marcus: Plus -> Pro
- Angela: Plus -> Pro
- Kyle: Plus -> Pro
- Desiree / Ray / Carlos / James: Pro
- Tamara: Pro -> Business

Source:
- `SAD/personas/00-persona-synthesis.md`

The product, personas, and pricing pages need to stop disagreeing.

## Market Reality: Current Pricing Bands

## Analysis-first tools stay cheap

DealCheck:
- Free
- Plus $10/mo
- Pro $20/mo

Source:
- https://dealcheck.io/pricing/

Lesson:
- pure analysis is cheap
- Parcel cannot justify premium pricing on calculator depth alone

## Acquisition CRMs charge aggressively

REsimpli:
- Basic $149/mo
- Pro $299/mo
- Enterprise $599/mo

FreedomSoft:
- Start $197/mo monthly
- Grow $297/mo monthly
- Scale $797/mo monthly

DealMachine:
- Starter $119/mo monthly
- Pro $179/mo monthly
- Pro Plus $279/mo monthly

PropStream:
- Essentials $99/mo monthly
- Pro $199/mo monthly
- Elite $699/mo monthly

Sources:
- https://resimpli.com/pricing/
- https://freedomsoft.com/pricing/
- https://www.dealmachine.com/pricing
- https://www.propstream.com/pricing

Lesson:
- once data, CRM, dialer, and marketing are bundled, investors tolerate much higher price points
- but those tools are mostly wholesaler-shaped

## Portfolio tools stay low unless they own operations or banking

Stessa:
- Essentials free
- Manage $15/mo monthly
- Pro $35/mo monthly

Source:
- https://www.stessa.com/pricing/

Lesson:
- landlords are price-sensitive
- portfolio visibility alone does not justify $79+ unless Parcel clearly replaces multiple tools or adds strategic value Stessa lacks

## Workflow-deep niche tools can command mid-tier pricing

FlipperForce:
- Solo all-in-one $79/mo
- Teams $199/mo
- Business $499/mo
- free 30-day trial, no credit card required

Bricked:
- $49 / $129 / $199

Sources:
- https://flipperforce.com/pricing
- https://bricked.ai/

Lesson:
- if Parcel owns a differentiated workflow deeply enough, $79+ is credible

## Recommended Packaging Structure

## 1. Free

Purpose:
- evaluation
- beginner trust-building
- first aha

Target users:
- Marcus
- Angela evaluating
- Ray evaluating
- Kyle evaluating
- early James / Desiree test drive

What Free should do:
- let a user analyze real properties
- let them experience AI narration
- let them save a small number of records
- show the shape of the system

What Free should not try to do:
- be useful forever for active operators
- include full CRM or full monitoring depth

Recommended Free positioning:
- "Get your first real win"

Recommended Free limits:
- 3-5 analyses/month
- limited saved properties / deals
- limited AI queries
- one sample portfolio or limited portfolio objects
- read-only preview of Today / monitoring features

## 2. Plus

Purpose:
- solo investor value tier
- the layer that replaces calculator + spreadsheet + light portfolio fragmentation

Target users:
- Marcus
- Angela
- Kyle

Recommended price zone:
- $24-39/mo

My recommendation:
- `Plus $29/mo`
- annual equivalent around `$24/mo`

Why:
- fits landlord and beginner budget comfort
- matches persona assumptions
- clears the decision threshold without feeling like a wholesaler CRM price

What Plus should include:
- unlimited analyses
- full property records
- portfolio-lite
- Today / Morning Briefing
- AI deal narration
- basic document AI
- multi-strategy comparison
- branded PDF basics

What Plus should not include:
- heavy communications tooling
- advanced team features
- deep creative-finance monitoring
- high-cost data usage bundles

## 3. Pro

Purpose:
- active investor operator tier
- the real investor OS for solo pros

Target users:
- Desiree
- Ray
- Carlos
- Tamara
- James

Recommended price zone:
- $69-99/mo

My recommendation:
- `Pro $79/mo`
- annual equivalent around `$65/mo`

Why:
- already supported by persona work
- clearly below REsimpli / DealMachine / PropStream entry pricing
- high enough to signal serious operating value

What Pro should include:
- everything in Plus
- CRM / contacts
- pipeline / tasks
- rehab tracking
- creative-finance monitoring
- advanced reports
- communications basics
- more document AI
- deeper Today / alerting

This is the tier where Parcel becomes defensible.

## 4. Business

Purpose:
- delegation and collaboration tier
- team-ready operations

Target users:
- Tamara after hiring a VA
- James if working with an assistant / coordinator
- small acquisition or investor teams

Recommended price zone:
- $149-199/mo

My recommendation:
- `Business $149/mo`
- annual equivalent around `$125/mo`

Why:
- gives a clear step above Pro without entering REsimpli / FreedomSoft pricing absurdity
- matches the hybrid investor and small-team persona logic

What Business should include:
- seats included
- permissions
- shared work queues
- team analytics
- advanced automations
- higher data / AI / document limits
- admin and collaboration controls

## Plan-Based vs Usage-Based

## Keep core platform value plan-based

These should be included in tiers, not sold as credits:
- analyses
- core AI narration
- Today / Morning Briefing
- property records
- portfolio-lite
- pipeline
- tasks
- creative monitoring at plan-appropriate depth

Why:
- these are core product identity
- credit-metering them will make the product feel anxious and fragmented

## Make expensive external-cost features usage-based

These should be add-ons or metered:
- skip tracing
- direct mail
- phone / SMS minutes beyond included bundle
- premium comps / ARV runs if using high-cost providers
- premium property data enrichment

Why:
- the cost structure is variable
- the market already expects usage pricing here

## Add seats as an expansion dimension, not a primary axis

Do not make Parcel primarily per-seat.

Instead:
- Plus: 1 user
- Pro: 1 user included
- Business: several seats included
- extra seats as add-on where needed

Why:
- solo-first remains true
- teams still have an upgrade path

## Workflow-Based Packaging Rules

## Free should sell the aha

Examples:
- Marcus: AI catches a flood zone or assumption miss
- Angela: first portfolio snapshot
- Ray: second flip in one dashboard
- Carlos: first obligation alert preview

## Plus should sell continuity

Examples:
- analysis -> property -> portfolio
- deal -> performance vs projection
- lease dates and portfolio awareness

## Pro should sell operating leverage

Examples:
- follow-up and CRM for Desiree
- rehab execution for Ray
- creative monitoring for Carlos
- multi-strategy + CRM + portfolio for Tamara
- branded reports + CRM for James

## Business should sell delegation

Examples:
- assign work
- permissions
- shared queues
- team visibility

## Recommended Feature Mapping

### Free

- limited analyses
- limited AI
- limited saved records
- core calculators
- first AI narration experience
- sample data

### Plus

- unlimited analyses
- full multi-strategy comparison
- portfolio-lite
- Today / Morning Briefing
- property records
- moderate AI and documents
- basic reporting

### Pro

- CRM / pipeline / tasks
- rehab tracker
- creative-finance monitoring
- advanced reporting
- richer documents and AI
- basic communications
- more automation

### Business

- seats and permissions
- shared pipelines / Today views
- advanced analytics
- admin controls
- higher usage bundles

## Trial Strategy

## Recommended trial posture

Use:
- free tier for open evaluation
- or a limited-time `Pro trial` on top of free

Do not rely only on a credit-card trial.

Why:
- DealCheck and Stessa prove freemium works for lower-friction adoption
- FlipperForce proves no-card trials work for deeper workflow products
- personas like Carlos want to test with real data fast
- beginners like Marcus and Angela need trust before payment

Recommended pattern:
- `Free forever`
- `7-day Pro trial` unlocked when the user hits a high-intent moment

Examples:
- tries fourth comparison
- uploads first important document
- adds second active project
- enables first obligation monitor

## Product and Code Implications

1. Rename billing model from `Starter/Team` toward `Plus/Business`.

2. Re-map limits around real product categories instead of just:
- analyses
- saved deals
- chat messages

3. Align pricing page copy with personas:
- beginners / landlords should see calm ROI framing
- active operators should see stack replacement and workflow leverage

4. Explicitly separate:
- subscription value
- metered usage add-ons

5. Stop marketing Parcel as if all users are wholesalers or team operators.

## Bottom-Line Recommendation

Lock the pricing architecture to:

- Free
- Plus at ~$29
- Pro at ~$79
- Business at ~$149

with usage-based add-ons for:
- skip trace
- mail
- heavy communications
- premium data

That structure is the cleanest fit for:
- the personas
- the product scope
- the market's current price expectations
- the reality that Parcel is broader than an analyzer but cheaper and more solo-friendly than wholesaler CRMs

## Sources

External:
- https://dealcheck.io/pricing/
- https://resimpli.com/pricing/
- https://www.dealmachine.com/pricing
- https://www.propstream.com/pricing
- https://freedomsoft.com/pricing/
- https://www.stessa.com/pricing/
- https://flipperforce.com/pricing
- https://bricked.ai/

Internal:
- `RESEARCH/15-monetization-benchmarks.md`
- `SAD/personas/00-persona-synthesis.md`
- `SAD/current-state-audit.md`
- `backend/core/billing/tier_config.py`
- `frontend/src/pages/PricingPage.tsx`
