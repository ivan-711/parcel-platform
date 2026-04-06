# Report / Deliverable System

Date: 2026-04-02

Research question:
- What kinds of reports and deliverables do Parcel's personas actually need?
- How do competitors use reports: as export utilities, or as core product surfaces?
- What deliverable system would strengthen activation, trust, collaboration, and referrals for Parcel?

Inputs used:
- `SAD/personas/08-james-agent-serving-investors.md`
- `SAD/personas/07-tamara-hybrid-investor.md`
- `SAD/personas/06-carlos-creative-finance.md`
- `SAD/personas/02-desiree-solo-wholesaler.md`
- `RESEARCH/20-ai-trust-explanation-design.md`
- `RESEARCH/25-agent-referral-loop.md`
- `SAD/current-state-audit.md`
- Fresh external research on DealCheck, FlipperForce, Stessa, and Homebot

## Executive Verdict

Parcel should not think about reports as exports.

Reports are one of the product's highest-leverage surfaces.

They do four jobs at once:

- communicate analysis
- build trust
- support real-world transactions
- distribute the product

The correct system is:

- interactive share link first
- PDF export second
- spreadsheet / data export where operationally necessary

If Parcel treats reports as a footer button, it will miss one of its clearest product advantages.

## Why This Matters by Persona

## James

James's strongest value moment is not just "I analyzed the deal."
It is:

- "I sent a professional, branded analysis that made my client see me differently."

Reports are central to:

- his differentiation
- client acquisition
- repeat service
- referrals

## Tamara

Tamara needs reports that can travel across counterparties:

- lenders
- private money partners
- VAs
- herself across time

One of her conversion triggers is a branded PDF report that impresses a lender.

## Carlos

Carlos's workflow introduces a different deliverable need:

- obligation summaries
- payment verification history
- balloon-date visibility
- risk and exception reporting

This is not a marketing report.
It is an operational trust document.

## Desiree

Desiree needs buyer-facing packets and fast deal summaries to support dispositions.

That means the report system also needs lighter-weight, marketable outputs.

## What External Products Reveal

## 1. DealCheck treats reports as a core outcome, not a nice-to-have

DealCheck explicitly supports:

- PDF reports
- shareable online report links
- personalization with name, logo, and contact info
- reports for buyers and investors

Sources:
- https://dealcheck.io/features/
- https://dealcheck.io/features/real-estate-wholesaling-calculator/

Lesson:
- professional outputs are central to analysis software value
- white-labeled presentation materially affects adoption

## 2. FlipperForce uses different report types for different execution jobs

FlipperForce's help center groups deal-analysis reporting around:

- investment packet
- estimate report
- scope-of-work report

It also supports task export to CSV or PDF and uses project-stage/status notifications for team visibility.

Sources:
- https://help.flipperforce.com/en/collections/7868074-deal-analysis-reports
- https://help.flipperforce.com/en/articles/8826714-how-to-export-your-tasks-to-csv-or-pdf
- https://help.flipperforce.com/en/articles/10949571-what-are-project-stages-how-do-i-update-them-and-why-are-they-important

Lesson:
- different jobs need different report families
- one monolithic "property report" is not enough

## 3. Stessa uses standardized portfolio reports as lender / partner artifacts

Stessa's current reporting includes:

- Schedule of Real Estate Owned (SREO)
- Rent Roll
- PDF and Excel export options

Its help content explicitly frames these reports as useful for:

- sharing with lenders and partners
- getting a portfolio-wide snapshot
- verifying lease and tenant data

Sources:
- https://support.stessa.com/en/articles/4697651-schedule-of-real-estate-owned-sreo
- https://support.stessa.com/en/articles/4610851-understanding-your-rent-roll-report

Lesson:
- portfolio-lite still needs institutional outputs
- lender- and partner-readable reports are real product requirements

## 4. Homebot proves that repeated branded insight delivery creates trust and engagement

Homebot's current model emphasizes:

- branded client-facing experiences
- recurring insight delivery
- engagement tracking
- acting on client behavior after delivery

Sources:
- https://homebot.ai/
- https://homebot.ai/lead-generation
- https://homebot.ai/what-is-homebot

Lesson:
- a deliverable can be a living product surface, not a dead file
- who opened and what they cared about is part of the workflow

## Recommended Parcel Deliverable System

## 1. Make web share links the canonical format

Every important Parcel output should exist first as a live web deliverable.

Reasons:

- easier on mobile
- supports engagement tracking
- supports updates after revision
- allows contextual CTAs
- better for referrals and collaboration

PDF should be generated from that same underlying representation.

## 2. Create report families, not one generic report template

Parcel should support distinct deliverable families:

- `Analysis Packet`
- `Quick Deal Summary`
- `Buyer Marketing Sheet`
- `Lender Packet`
- `Partner / Investor Update`
- `Portfolio Snapshot`
- `Creative Finance Obligation Summary`
- `Rehab Status Packet`

Each family should share a design system, but differ in:

- density
- audience
- CTA
- level of explanation

## 3. Separate audience modes explicitly

Parcel should let the user choose the audience when generating or sharing:

- self / internal
- buyer
- lender
- partner
- client

That choice should drive:

- included sections
- language density
- branding
- assumptions shown
- action buttons

This is better than one cluttered report trying to serve every reader.

## 4. Show assumptions, timestamps, and confidence

Because Parcel's AI voice is core to the product, every deliverable should clearly show:

- data timestamp
- assumptions used
- important warnings
- confidence / missing-data notes where relevant

This protects trust.

It is especially important for:

- Carlos's obligation summaries
- James's client-facing deal packets
- Tamara's lender-facing outputs

## 5. Add engagement and response telemetry

For link-based deliverables, Parcel should track:

- opened / not opened
- first opened at
- last opened at
- number of opens
- CTA clicks
- strategy tabs viewed where applicable

This belongs on:

- the report record
- the related contact timeline
- the Today / briefing system

## 6. Build a real brand layer

Parcel needs a brand kit that can control:

- logo
- brand colors
- profile photo / signature
- legal / contact details
- footer text

This should be per workspace, and per user where the role needs it.

James is the clearest case.

## 7. Preserve Parcel attribution strategically

Full white-label should not be the default.

Recommended approach:

- strong user branding always
- subtle Parcel attribution on public links and certain PDF footers by tier
- optional expanded white-label only for higher-tier / approved cases later

This protects the referral loop without undercutting user ownership.

## Recommended Parcel Report Families

## Analysis Packet

Audience:
- investor client
- self
- partner

Should include:

- property overview
- strategy outputs
- AI thesis
- risks
- comps / assumptions
- next-step CTA

## Quick Deal Summary

Audience:
- text follow-up
- fast sharing
- mobile

Should include:

- headline numbers
- short thesis
- red flags
- ask / next action

## Buyer Marketing Sheet

Audience:
- cash buyers
- disposition outreach

Should include:

- marketable summary
- asking price / assignment detail
- photos
- neighborhood / comp highlights
- offer / access CTA

## Lender Packet

Audience:
- lender
- capital partner

Should include:

- property summary
- capital stack / financing
- scope and timeline if relevant
- projected outcomes
- borrower / sponsor summary if provided

## Portfolio Snapshot

Audience:
- owner
- lender
- partner

Should include:

- property roll-up
- debt / equity snapshot
- income trend
- lease dates / occupancy where relevant
- notable upcoming obligations

## Creative Finance Obligation Summary

Audience:
- self
- partner
- lender / advisor where appropriate

Should include:

- instrument terms
- next payment / due date
- balloon date
- verification status
- exception flags

## Rehab Status Packet

Audience:
- partner
- lender
- contractor review

Should include:

- budget vs actual
- percent complete
- timeline status
- recent updates
- outstanding blockers

## What Parcel Should Not Do

## 1. Do not make PDF the only serious output

That would throw away:

- tracking
- iteration
- mobile readability
- product-led distribution

## 2. Do not collapse all outputs into a single "export report" action

Different audiences need different artifacts.

## 3. Do not let AI narration float without grounding

Every claim in a deliverable should tie back to:

- data
- assumptions
- explicit uncertainty when needed

## Product Implications

Parcel should add:

- report record model
- share-link infrastructure
- branded rendering system
- PDF export from canonical link view
- audience-specific report templates
- engagement analytics
- report history on property / deal / contact records

High-value follow-ons:

- saved report templates by persona
- sample report library
- password-protected links / expirations
- lender / buyer / partner CTA modules

## Strategic Conclusion

Parcel's reports are not a support feature.

They are where:

- the AI becomes visible
- trust gets earned
- deals move forward
- referrals begin

If Parcel builds a strong deliverable system, it strengthens activation, retention, and growth at the same time.

## Sources

- https://dealcheck.io/features/
- https://dealcheck.io/features/real-estate-wholesaling-calculator/
- https://help.flipperforce.com/en/collections/7868074-deal-analysis-reports
- https://help.flipperforce.com/en/articles/8826714-how-to-export-your-tasks-to-csv-or-pdf
- https://help.flipperforce.com/en/articles/10949571-what-are-project-stages-how-do-i-update-them-and-why-are-they-important
- https://support.stessa.com/en/articles/4697651-schedule-of-real-estate-owned-sreo
- https://support.stessa.com/en/articles/4610851-understanding-your-rent-roll-report
- https://homebot.ai/
- https://homebot.ai/lead-generation
- https://homebot.ai/what-is-homebot
