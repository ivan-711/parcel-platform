# Notification and Mobile Strategy

Date: 2026-04-02

Research question:
- What should Parcel's mobile product actually optimize for by persona?
- Which events deserve push notifications versus in-app, email, or local reminders?
- How should Parcel avoid becoming both noisy and irrelevant on mobile?

Inputs used:
- `RESEARCH/14-mobile-ios-strategy.md`
- `RESEARCH/19-today-morning-briefing-jobs-to-be-done.md`
- `RESEARCH/17-creative-finance-operations.md`
- `SAD/personas/01-marcus-complete-beginner.md`
- `SAD/personas/02-desiree-solo-wholesaler.md`
- `SAD/personas/03-ray-house-flipper.md`
- `SAD/personas/04-angela-buy-hold-landlord.md`
- `SAD/personas/06-carlos-creative-finance.md`
- `SAD/personas/07-tamara-hybrid-investor.md`
- `SAD/current-state-audit.md`
- `frontend/src/components/layout/MobileTabBar.tsx`
- Fresh external research on REsimpli, DealMachine, PropStream, FlipperForce, Apple notification guidelines, and Android notification guidance

## Executive Verdict

Parcel should not treat mobile as a smaller desktop app.

Mobile should optimize for four jobs:

1. `Check Today`
2. `Capture from the field`
3. `Handle urgent exceptions`
4. `Review a single property / deal quickly`

Parcel should not optimize mobile first for:
- dense dashboard analysis
- long-form report reading
- deep back-office configuration

Its notification strategy should be:
- sparse
- high-signal
- role-aware
- user-tunable

The right system is:
- `Today` is the canonical action surface
- `Push` is for urgency and immediacy
- `Email` is for digest and summary
- `In-app` is for full context
- `Local reminders` are for user-owned deadlines and follow-through

## What Competitors Reveal

## 1. Field-first products put field work at the center

DealMachine opens to the map by default.

Source:
- https://help.dealmachine.com/en/articles/2890078-where-to-view-your-leads

PropStream Mobile organizes its bottom toolbar around:
- Search
- Favorites
- Drive
- History
- More

Sources:
- https://www.propstream.com/propstream-mobile-overview-introducing-propstream-mobile
- https://www.propstream.com/propstream-mobile

These are good models for mobile field workflows, but not good universal models for Parcel.

Lesson:
- field work should get optimized paths
- but field work should not define the entire mobile identity of a multi-strategy platform

## 2. Urgent acquisition tools use immediate notifications tied to money

REsimpli's Speed to Lead:
- phone rings when a lead hits the site
- text includes lead property address, source, and campaign details

Sources:
- https://resimpli.com/features/speed-to-lead/
- https://resimpli.com/features/

Lesson:
- push and call-level urgency only work when the event is immediately monetizable
- this is good for wholesaler lead capture, not for every user and every event

## 3. Flip execution tools use mobile for field updates, not full management

FlipperForce's field app emphasizes:
- real-time project updates
- photo capture
- receipt capture

Sources:
- https://flipperforce.com/software-features/flipperforce-field-mobile-app
- https://flipperforce.com/pricing

Lesson:
- mobile is strongest when it closes the loop between field observation and system record

## 4. Platform guidelines penalize noisy notification behavior

Apple's current notification guidance emphasizes:
- accurately represent urgency
- use Time Sensitive only for information relevant in the moment
- never use Time Sensitive for marketing
- request permission in context

Android's guidance similarly frames notifications as:
- reminders
- communication
- timely information outside the app UI

Sources:
- https://developer.apple.com/design/human-interface-guidelines/managing-notifications
- https://developer.apple.com/documentation/usernotifications/asking-permission-to-use-notifications
- https://developer.android.com/design/patterns/notifications_k

Lesson:
- Parcel should treat notification trust as a product asset
- if urgency is inflated, users will mute the app

## Mobile Strategy by Persona

## Marcus

Mobile job:
- quick deal check
- revisit saved properties
- receive gentle nudges

Needs:
- low-frequency push
- address paste / share-in to Parcel
- Today summary

Do not spam him with:
- every minor market update
- too many educational pushes

## Desiree

Mobile job:
- speed-to-lead
- follow-up reminders
- quick seller context review
- D4D capture later

Needs:
- immediate push for hot inbound lead
- follow-up due reminders
- one-tap open to lead / property / call context

## Ray

Mobile job:
- jobsite updates
- photo uploads
- receipt capture
- quick rehab budget check

Needs:
- camera-first actions
- offline-safe field capture
- weekly summary digest more than constant push

## Angela

Mobile job:
- morning portfolio check
- lease and rent awareness
- quick property review

Needs:
- calm, low-volume notifications
- lease expiration reminders
- payment / vacancy exceptions only

## Carlos

Mobile job:
- morning obligation check
- urgent payment / insurance / balloon exception handling
- property-level risk review

Needs:
- highest-value mobile experience of all personas
- urgent alerts when something is truly wrong
- Today view centered on obligations

## Tamara

Mobile job:
- mixed workflow triage
- D4D notes
- quick review across pipeline, rehab, portfolio, and notes

Needs:
- Today as home base
- field capture
- selective push on high-value items

## Notification Taxonomy

## 1. Push notifications

Use push only for events that are:
- urgent
- actionable
- time-bound
- meaningfully worse if seen late

Examples that deserve push:
- new hot lead for wholesalers if user enabled it
- underlying mortgage payment not verified
- payment failed or note materially late
- insurance lapse / cancellation risk
- balloon deadline milestone if action window begins now
- rehab budget overrun beyond threshold
- task due today if user explicitly opted in

Examples that do not deserve push by default:
- generic market updates
- product tips
- low-priority weekly stats
- "you have not logged in lately"

## 2. Email digests

Use email for:
- daily productivity summaries
- weekly portfolio summaries
- weekly rehab summary
- weekly obligation summary
- weekly deal pipeline summary

This is where REsimpli's `Daily Productivity Email` is directionally useful.

Source:
- https://resimpli.com/pricing/

## 3. In-app notifications / Today view

Use in-app for:
- the full queue
- items that matter but are not interrupt-worthy
- cross-module prioritization

This should be the canonical source of truth.

## 4. Local reminders

Use local notifications for:
- user-created reminders
- snoozed Today items
- follow-through on tasks the user explicitly accepted

This is especially useful once Parcel is running in a native shell.

## Channel Rules Parcel Should Use

### Push

Good for:
- interrupt now

### Email

Good for:
- review later

### In-app

Good for:
- full context and triage

### Local

Good for:
- personal commitment follow-through

## Recommended Urgency Levels

## Critical / time-sensitive push

Reserved for:
- Carlos-grade financial or compliance exceptions
- potentially deal-killing or money-losing events

Examples:
- subject-to payment failure
- insurance cancellation / lapse on subject-to
- today-is-the-deadline type events

This should be rare.

## Active push

Reserved for:
- new inbound lead
- follow-up due now
- rehab issue requiring same-day attention

## Passive / digest only

Reserved for:
- portfolio performance summaries
- AI observations
- productivity stats
- opportunity nudges

## Mobile IA Recommendation

Based on the current app and the research, mobile should evolve toward:

- `Today`
- `Analyze`
- `Pipeline`
- `D4D` or `Capture` when shipped
- `More`

Not:
- `Chat` as a permanent primary tab

Why:
- Chat is not the primary mobile job
- Today is
- field capture may become primary for specific personas later

This aligns with the earlier IA and Today research.

## What Mobile Should Prioritize in Phases

## Phase 1: Make mobile useful for checking and capturing

Must have:
- Today view
- responsive property / deal detail pages
- camera upload for photos and receipts
- quick notes
- reminder handling

## Phase 2: Native shell for reliability

From the existing mobile strategy research, Capacitor-first remains the right path for:
- reliable push
- biometrics
- local notifications
- background-safe native integrations

Source:
- `RESEARCH/14-mobile-ios-strategy.md`

## Phase 3: Role-specific accelerators

- D4D and route workflows for wholesaler / hybrid personas
- rehab photo / receipt capture for flippers
- obligation-first home state for creative-finance users

## Practical Notification Rules for Parcel

1. Ask for push permission only after the user experiences value.

Do not ask on first launch.

Better timing:
- after first saved lead
- after first monitored obligation
- after first Today item is completed

2. Make notification settings persona-aware but user-controlled.

Default suggestions can vary, but the user must be able to manage:
- lead alerts
- obligation alerts
- task reminders
- weekly summaries
- marketing / product updates

3. Every push must deep-link to the exact object and suggested action.

Bad:
- "Payment issue detected"

Good:
- "412 Saguaro Dr payment not verified. Review lender status and mark outcome."

4. Use digests to reduce noise.

If multiple low-priority items occur, summarize them:
- "3 items need review today"

5. Do not let push become the primary product.

Today remains the control center.
Push should pull the user into Today or directly into a relevant record.

## Product Implications for Parcel

1. Replace `Chat` as a primary mobile tab with `Today` once the Today system exists.

2. Build mobile around:
- fast triage
- fast capture
- fast exception handling

3. Model notification events as first-class records with:
- type
- severity
- source object
- due date
- preferred channels
- user preference state

4. Treat Carlos's use case as the highest bar for mobile urgency design.

If Parcel can serve:
- morning obligation review
- urgent risk alerts
- quick resolution paths

it will have a strong mobile core.

## Bottom-Line Recommendation

Parcel mobile should be the investor's quick-control surface, not a shrunk desktop dashboard.

The winning pattern is:
- Today first
- capture fast
- push rarely
- interrupt only when the user would be genuinely worse off seeing it later

That keeps mobile useful for:
- Carlos's risk management
- Desiree's lead urgency
- Ray's field execution
- Tamara's mixed-workflow oversight
- Angela's calm portfolio review

without turning the app into a noisy CRM clone.

## Sources

External:
- https://help.dealmachine.com/en/articles/2890078-where-to-view-your-leads
- https://resimpli.com/features/
- https://resimpli.com/features/speed-to-lead/
- https://www.propstream.com/propstream-mobile
- https://www.propstream.com/propstream-mobile-overview-introducing-propstream-mobile
- https://flipperforce.com/software-features/flipperforce-field-mobile-app
- https://flipperforce.com/pricing
- https://developer.apple.com/design/human-interface-guidelines/managing-notifications
- https://developer.apple.com/documentation/usernotifications/asking-permission-to-use-notifications
- https://developer.android.com/design/patterns/notifications_k

Internal:
- `RESEARCH/14-mobile-ios-strategy.md`
- `RESEARCH/17-creative-finance-operations.md`
- `RESEARCH/19-today-morning-briefing-jobs-to-be-done.md`
- `SAD/current-state-audit.md`
- `SAD/personas/01-marcus-complete-beginner.md`
- `SAD/personas/02-desiree-solo-wholesaler.md`
- `SAD/personas/03-ray-house-flipper.md`
- `SAD/personas/04-angela-buy-hold-landlord.md`
- `SAD/personas/06-carlos-creative-finance.md`
- `SAD/personas/07-tamara-hybrid-investor.md`
- `frontend/src/components/layout/MobileTabBar.tsx`
