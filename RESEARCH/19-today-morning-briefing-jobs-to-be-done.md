# Today / Morning Briefing Research

Date: 2026-04-02

Research question:
- What should Parcel users see first when they open the product?
- Is a dashboard card enough for the morning briefing, or does Parcel need a dedicated `Today` view?
- What belongs in `Dashboard` versus `Today` for Parcel's target personas?

Inputs used:
- `RESEARCH/00-MASTER-RESEARCH-SYNTHESIS.md`
- `RESEARCH/02-rental-portfolio-platforms.md`
- `SAD/current-state-audit.md`
- `SAD/personas/01-marcus-complete-beginner.md`
- `SAD/personas/02-desiree-solo-wholesaler.md`
- `SAD/personas/04-angela-buy-hold-landlord.md`
- `SAD/personas/06-carlos-creative-finance.md`
- `SAD/personas/07-tamara-hybrid-investor.md`
- Fresh external research on REsimpli, FreedomSoft, DealMachine, Stessa, Todoist, and Asana

## Executive Verdict

Parcel should have both:

- a `Dashboard` for orientation and business health
- a dedicated `Today` view for action and triage

The `Morning Briefing` should not be only a collapsible card living on the dashboard forever.

The correct model is:

- `Dashboard` = "How is the business / portfolio doing?"
- `Today` = "What needs my attention right now?"
- `Morning Briefing` = the AI summary that sits at the top of both

If Parcel stops at a dashboard card, it will underserve the highest-value personas:
- Carlos needs operational risk management, not a decorative summary
- Tamara needs cross-strategy triage, not just KPIs
- Desiree needs a daily follow-up queue
- Angela needs lease and rent-related visibility without digging

## Why a Dedicated Today View Is Necessary

### 1. The personas describe a daily triage problem, not just a dashboard problem

Carlos already has a daily ritual built around:
- payment checks
- calendar scanning
- deadline review
- risk assessment

His current workflow is effectively a manual `Today` page spread across:
- lender portals
- Google Calendar
- Google Sheets

Tamara explicitly lacks a dashboard that answers:
- "What needs my attention today across all strategies?"

Angela needs:
- lease expiration visibility
- rent and vacancy awareness
- quick portfolio review without navigation overhead

Desiree's current workflow in REsimpli starts by filtering:
- follow-ups due today
- stale leads
- urgent seller timelines

These are all action-queue jobs, not KPI-card jobs.

### 2. Competitors split "snapshot" and "work queue," even if they do it imperfectly

REsimpli's official marketing highlights:
- KPI Dashboard
- Daily Productivity Email
- pending tasks
- upcoming appointments
- offers
- abandoned leads

That is important. Even a wholesaler-first CRM knows a generic dashboard is not enough; it also needs a daily action digest.

Sources:
- https://resimpli.com/home2/
- https://resimpli.com/blog/dialer-changes/
- https://resimpli.com/blog/quick-demo-on-changes-to-tasks-section-in-leads/

FreedomSoft frames its KPI dashboard as a way to:
- see where deals get stuck
- clear bottlenecks
- keep closings on pace
- run the business from a central command center

That is closer to an operating surface than a vanity dashboard, but it is still acquisition-centric.

Source:
- https://freedomsoft.com/kpi-dashboard/

Stessa, by contrast, explicitly positions `Dashboard` as a quick snapshot of:
- net cash flow
- net worth
- cash-on-cash return
- monthly expenses

Its other work lives elsewhere:
- rent collection
- properties
- maintenance
- reports

This is useful evidence. Portfolio software uses the dashboard as orientation, not as the only action surface.

Sources:
- https://support.stessa.com/en/articles/11049493-navigating-your-account
- https://support.stessa.com/en/articles/2423532-how-to-manage-property-leases-tenants-in-stessa
- https://support.stessa.com/en/articles/4610851-understanding-your-rent-roll-report

DealMachine goes even further in the opposite direction:
- when you open the app or website, the default is the map
- you toggle to leads when you want the list view

That makes sense for a field-capture-first product, but it is not the right primary model for Parcel's broader investor OS vision.

Source:
- https://help.dealmachine.com/en/articles/2890078-where-to-view-your-leads

### 3. Productivity tools reinforce the same pattern: Today and Upcoming should be separate

Todoist's `Today` view presents:
- every task due today across all projects
- a triage flow for reviewing, reprioritizing, and rescheduling

Asana's `My Tasks` includes distinct sections for:
- Today
- Upcoming
- Later

This matters because Parcel's users are not just looking for insight. They are looking for prioritization across multiple work streams.

Sources:
- https://www.todoist.com/help/articles/plan-your-day-with-the-today-view-UVUXaiSs
- https://asana.com/resources/asana-tips-my-tasks

## Recommended Product Model

## 1. Dashboard

Purpose:
- orient the user
- summarize business / portfolio health
- show trends and status at a glance

What belongs here:
- KPI cards
- pipeline summary
- portfolio summary
- rehab summary
- obligation summary
- recent activity
- a compact Morning Briefing at the top

What does not belong here:
- the full queue of today's work
- every overdue item
- a long scrolling action list masquerading as a dashboard

## 2. Today

Purpose:
- unify urgent and time-sensitive work across all modules
- answer "What should I do next?"

This should be a first-class destination, not just a widget.

Recommended sections:
- `Do Today` — due or overdue actions that require action now
- `At Risk` — late payments, broken assumptions, missing verification, stalled deals
- `Due Soon` — next 7-14 day items like lease expirations, seasoning dates, appraisals, insurance renewals
- `Suggested` — non-urgent but high-leverage actions surfaced by AI
- `Completed Today` — closed feedback loop for habit formation

## 3. Morning Briefing

Purpose:
- summarize the most important items before the user enters the work queue
- create the "daily return" habit

Recommended shape:
- always present at top of Dashboard
- repeated in condensed form at top of Today
- expands when there are meaningful items
- collapses when quiet, but never disappears completely

Do not make it permanently dismissible.

Why:
- if it can be dismissed globally, Carlos can lose a mission-critical risk surface
- if it is too sticky and verbose, beginners and casual users will tune it out

The right compromise:
- allow dismiss / snooze at the item level
- keep the container itself persistent
- show quiet-state summary when there is nothing urgent

Example quiet state:
- "Nothing urgent today. 2 items are due this week. Your next highest-leverage action is reviewing the Third Ward seller-finance scenario."

## Persona-Specific Requirements

### Marcus

Needs:
- a clear next step
- gentle prioritization
- light education woven into the queue

His Today view should include:
- analysis items that have stalled
- major misses the AI found
- one recommended next action

### Desiree

Needs:
- follow-up queue
- stale lead rescue
- seller timeline urgency

Her Today view should feel like:
- a sharper replacement for REsimpli's "follow-up due today" workflow

### Angela

Needs:
- lease expirations
- rent collection status
- vacancy / turn reminders
- portfolio-level signals

Her Dashboard may do more of the work than for other personas, but Today still matters.

### Carlos

Needs:
- missed or unverified payments
- balloon timeline alerts
- insurance renewal / policy change risk
- refinance readiness milestones

For him, Today is not optional. It is the operational nerve center.

### Tamara

Needs:
- cross-strategy triage
- stale pipeline deals
- rehab variance alerts
- BRRRR seasoning / refi milestones
- note payment issues

Her Today view is where Parcel starts to feel like the all-in-one system instead of a calculator stack.

## How Items Should Be Ranked

Parcel should rank Today items using a combination of:
- time urgency
- dollar risk
- reversibility
- user role / persona
- confidence in the triggering signal

Practical rule:
- a potential six-figure default risk should outrank a routine follow-up
- a beginner's only active deal should outrank a low-value reminder in a mature portfolio

## Design Recommendations

### 1. Briefing items must be action-shaped

Each item should include:
- issue
- why it matters
- recommended next step
- deep link

Bad:
- "Balloon date approaching"

Good:
- "412 Saguaro Dr balloon due in 14 months. Refi prep should start now. Review payoff and appraisal readiness."

### 2. Show horizons, not just "today"

Parcel should support:
- `Today`
- `This Week`
- `Upcoming`

Why:
- Carlos's balloon dates and Angela's lease renewals often need action before the actual due date
- pure due-date views create late action, not smart action

### 3. Support triage behaviors

Users need to:
- mark done
- snooze
- reschedule
- assign
- open source record

Without this, Today becomes another report instead of a workflow surface.

### 4. Keep Dashboard and Today visually distinct

Dashboard should feel:
- aggregate
- calm
- trend-oriented

Today should feel:
- prioritized
- finite
- action-oriented

## Product Implications for Parcel

1. Add a dedicated `Today` destination before Parcel goes deeper into creative monitoring, rehab tracking, and portfolio obligations. Otherwise those modules will feel disconnected.

2. Keep the Morning Briefing as a persistent top card on Dashboard, but make it the summary of a larger action system, not the whole system.

3. Model briefing items as first-class objects backed by:
- tasks
- obligations
- risk flags
- activity signals
- AI-generated recommendations

4. Treat `Today` as a cross-object view:
- deals
- properties
- contacts
- leases
- financing instruments
- obligations
- rehab projects

5. Mobile should prioritize Today over a dense dashboard. For field or on-the-go users, Today is the more actionable starting surface.

## Bottom-Line Recommendation

Parcel should ship:

- `Dashboard` as the strategic snapshot
- `Morning Briefing` as the summary card
- `Today` as the daily action workspace

If forced to choose only one addition beyond the current dashboard, build `Today`, not more dashboard cards.

That is the stronger foundation for:
- Carlos's operational risk management
- Tamara's cross-strategy oversight
- Desiree's daily seller follow-up
- Angela's lease and portfolio review
- Marcus's next-step confidence

## Sources

External:
- https://resimpli.com/home2/
- https://resimpli.com/blog/dialer-changes/
- https://resimpli.com/blog/quick-demo-on-changes-to-tasks-section-in-leads/
- https://freedomsoft.com/kpi-dashboard/
- https://help.dealmachine.com/en/articles/2890078-where-to-view-your-leads
- https://support.stessa.com/en/articles/11049493-navigating-your-account
- https://support.stessa.com/en/articles/2423532-how-to-manage-property-leases-tenants-in-stessa
- https://support.stessa.com/en/articles/4610851-understanding-your-rent-roll-report
- https://www.todoist.com/help/articles/plan-your-day-with-the-today-view-UVUXaiSs
- https://asana.com/resources/asana-tips-my-tasks

Internal:
- `SAD/personas/01-marcus-complete-beginner.md`
- `SAD/personas/02-desiree-solo-wholesaler.md`
- `SAD/personas/04-angela-buy-hold-landlord.md`
- `SAD/personas/06-carlos-creative-finance.md`
- `SAD/personas/07-tamara-hybrid-investor.md`
- `SAD/current-state-audit.md`
