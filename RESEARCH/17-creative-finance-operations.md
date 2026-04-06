# Creative Finance Operations Research

Date: 2026-04-02

Research question:
- What does Parcel need to understand operationally, beyond calculators, to build a real creative-finance moat?
- Which workflows, obligations, and alerts are truly mission-critical?
- Where should Parcel stop short of becoming a servicer?

Inputs used:
- `SAD/personas/06-carlos-creative-finance.md`
- `RESEARCH/00-MASTER-RESEARCH-SYNTHESIS.md`
- `RESEARCH/05-database-architecture.md`
- Fresh external research on due-on-sale, balloon-payment risk, escrow/insurance handling, and seller-finance servicing patterns

## Executive Verdict

The moat is not "creative finance calculator support."

The moat is `post-closing operational control` for non-standard financing structures.

Parcel wins here only if it becomes the place where an investor can answer:
- What must be paid next?
- What must be verified next?
- What is at risk right now?
- What deadline is approaching that could blow up the deal?

The calculator gets the deal into the portfolio.
The monitoring system keeps it from blowing up.

## Why This Matters

Carlos's persona already surfaced the key truth:
- subject-to risk is not theoretical
- balloon dates are not admin clutter
- insurance handling is not a side note

Fresh external research supports that these are real operational categories:

- the due-on-sale clause is a real lender right tied to unauthorized transfer
- balloon payments can force refinance, sale, or foreclosure if not resolved
- servicers track periodic statements, escrow, taxes, and insurance for a reason
- private note servicers explicitly sell balloon notices, insurance tracking, impounds, multi-lender handling, and wrap/AITD servicing because these are real operational burdens

Sources:
- https://law.justia.com/codes/us/2013/title-12/chapter-13/section-1701j-3/
- https://www.consumerfinance.gov/language/cfpb-in-english/mortgages-key-terms/
- https://www.consumerfinance.gov/rules-policy/regulations/1024/37
- https://www.consumerfinance.gov/rules-policy/regulations/1026/41/
- https://noteservicingcenter.com/seller-financing/
- https://noteservicingcenter.com/pricing-comparison/
- https://noteservicingcenter.com/borrowers-benefits/

## Core Operating Structures Parcel Must Support

## 1. Subject-to

What it is:
- investor acquires control of the property while the original loan remains in place
- investor makes payments on the seller's existing mortgage

Core operational risks:
- missed or late underlying mortgage payment
- lender scrutiny from transfer-related signals
- escrow/tax/insurance problems
- force-placed insurance risk
- seller interference or confusion
- servicer transfer or statement mismatch

Operational data Parcel must track:
- current servicer / lender
- loan number or masked reference
- unpaid principal balance
- interest rate and loan type
- monthly PITI amount
- due date and grace period
- escrow included or not
- autopay enabled or not
- last verified payment date
- next payment due
- maturity date
- ARM reset date if applicable
- insurance policy details
- original borrower / named insured arrangement

Product inference from sources:
- Parcel cannot know due-on-sale enforcement probability with certainty
- Parcel can monitor the signals that usually precede trouble:
  - missed payment
  - insurance lapse or policy change
  - force-placed insurance notice
  - servicer transfer
  - seller-reported lender contact

## 2. Seller finance

What it is:
- seller becomes lender
- buyer makes scheduled payments on a private note

Core operational risks:
- balloon date missed
- principal / interest misapplied
- late fee disputes
- undocumented note modifications
- tax and insurance not impounded or not paid
- weak servicing records during refinance or payoff

Operational data Parcel must track:
- note amount
- interest rate
- amortization term
- payment amount
- payment frequency
- payment start date
- balloon date and amount
- late fee terms
- escrow / impound rules for tax and insurance
- tax service and insurance tracking status
- payoff balance logic
- modification history

Strong evidence from servicer market:
- Note Servicing Center explicitly offers:
  - impound accounts
  - tax and insurance handling
  - late notices
  - year-end statements
  - IRS 1098 / 1099 reporting
  - balloon payment notices
  - optional insurance tracking

That is a clear signal about what investors actually struggle to manage.

Sources:
- https://noteservicingcenter.com/seller-financing/
- https://noteservicingcenter.com/pricing-comparison/
- https://noteservicingcenter.com/seller-financing-back-to-the-future/

## 3. Lease option

What it is:
- occupant pays rent plus optional credits toward later purchase
- option exercise has a hard deadline and specific rules

Core operational risks:
- option expiration missed
- unclear rent-credit ledger
- dispute over exercise terms
- maintenance or default responsibility ambiguity

Operational data Parcel must track:
- option consideration
- option start and end date
- strike / purchase price
- monthly rent
- monthly rent credit
- cumulative credit earned
- exercise notice window
- cure/default terms
- extension rights if any

This structure is simpler than subject-to or seller finance on payment-servicing complexity, but deadline and ledger accuracy are mission-critical.

## 4. Wrap / AITD

What it is:
- investor receives payments from a downstream buyer while still owing one or more upstream obligations

Core operational risks:
- spread compression
- incoming payment timing mismatch vs outgoing payment timing
- buyer default while underlying payment remains due
- multiple lenders or note holders
- cross-default complexity

Operational data Parcel must track:
- upstream payment schedule
- downstream payment schedule
- monthly spread
- spread after escrow and servicing costs
- upstream balloon dates
- downstream balloon dates
- number of lenders / instruments
- late status on either side

Strong evidence from servicer market:
- Note Servicing Center prices AITD/wrap servicing separately and charges per lender
- they also offer multi-lender servicing and insurance tracking

Inference:
- Parcel should treat wraps as a dual-sided obligation system, not just another calculator variant

## What Parcel Should Monitor

These should be first-class objects, not buried notes.

### A. Payments

Track:
- due date
- grace period
- expected amount
- source of truth
- verification status
- cleared date
- exception reason

Verification sources can include:
- servicer statement
- private servicer ledger
- manual proof upload
- user-marked paid with attachment

### B. Balloon deadlines

Track:
- date
- expected payoff amount
- refinance target date
- owner / assignee responsible
- readiness checklist

Recommended alert ladder:
- 12 months
- 9 months
- 6 months
- 90 days
- 30 days
- overdue

### C. Insurance

Track:
- carrier
- policy number
- effective / expiration dates
- insured parties
- mortgagee / loss-payee information
- proof-of-insurance on file
- renewal quote status
- lender-sensitive status changes

The CFPB's force-placed insurance materials are a reminder that insurance failure can quickly become expensive and highly visible to the lender.

Sources:
- https://www.consumerfinance.gov/rules-policy/regulations/1024/37
- https://www.consumerfinance.gov/ask-cfpb/what-can-i-do-if-my-mortgage-lender-servicer-is-charging-me-for-force-placed-homeowners-insurance-en-219/

### D. Taxes / escrow

Track:
- escrow yes/no
- next tax due dates
- whether taxes are servicer-paid or borrower-paid
- escrow shortage / mismatch flags
- verification of payment

CFPB guidance is explicit that servicers use escrow to make sure taxes and insurance get paid, and that borrowers should monitor statements and bills for issues.

Sources:
- https://www.consumerfinance.gov/ask-cfpb/what-is-an-escrow-or-impound-account-en-140/
- https://www.consumerfinance.gov/ask-cfpb/what-should-i-do-if-im-having-problems-with-my-escrow-or-impound-account-en-2082/

### E. Statements and servicing events

Track:
- last monthly statement received
- last statement reviewed
- servicer transfer
- address / payment-instruction changes
- late notices
- notice-of-error history

The operational point is simple:
- if Parcel helps investors verify what changed month to month, it becomes useful even without becoming the payment processor

## What Parcel Should Build vs. What It Should Not Build

## Build

- instrument ledger for each creative-finance structure
- obligations table
- verification workflow
- exception states
- alert engine
- timeline of servicing / insurance / payment events
- document slots for note, deed, insurance declarations, monthly statements, payoff letters
- AI narration on risk and next action

## Do not build first

- actual payment processing
- escrow administration
- tax remittance
- regulated loan servicing workflows
- customer-support interactions with lenders or borrowers

Parcel should start as:
- `monitoring`
- `verification`
- `decision support`

not:
- `servicer of record`

## Recommended Product Surfaces

## 1. Monitoring dashboard

Top-level destination for:
- upcoming payments
- unverified payments
- upcoming balloons
- insurance renewals
- exceptions and missing documents

## 2. Today / Morning Briefing

This should summarize:
- what is due this week
- what is overdue
- what changed since yesterday
- what requires proof or action

This is the daily-return habit surface for Carlos.

## 3. Instrument detail page

Each subject-to loan, seller note, lease option, or wrap should have:
- terms
- timeline
- required documents
- obligation list
- payment history
- verification history

## 4. Refinance readiness checklist

Especially for balloons:
- months remaining
- target refinance start
- current estimate vs payoff
- missing documents
- lender-shopping checklist

## Minimal Schema Implications

Parcel's existing recommended schema needs at least these creative-finance additions:

- `financing_instruments`
- `instrument_payment_schedules`
- `obligations`
- `insurance_policies`
- `verification_events`
- `servicing_events`

Each obligation should minimally include:
- instrument_id
- obligation_type
- due_date
- expected_amount
- status
- severity
- last_verified_at
- source_type
- source_reference
- resolved_at
- notes

## Final Recommendation

If Parcel wants the creative-finance moat to be real, the first winning release is not:
- better seller-finance math

It is:
- a unified obligations dashboard
- daily briefing
- verification workflow
- balloon and insurance countdowns
- property-level instrument history

That is the gap almost nobody serves.

## Sources

### Local
- `SAD/personas/06-carlos-creative-finance.md`
- `RESEARCH/00-MASTER-RESEARCH-SYNTHESIS.md`
- `RESEARCH/05-database-architecture.md`

### External
- Due-on-sale:
  - https://law.justia.com/codes/us/2013/title-12/chapter-13/section-1701j-3/
- CFPB:
  - https://www.consumerfinance.gov/language/cfpb-in-english/mortgages-key-terms/
  - https://www.consumerfinance.gov/rules-policy/regulations/1024/37
  - https://www.consumerfinance.gov/rules-policy/regulations/1026/41/
  - https://www.consumerfinance.gov/ask-cfpb/what-is-an-escrow-or-impound-account-en-140/
  - https://www.consumerfinance.gov/ask-cfpb/what-should-i-do-if-im-having-problems-with-my-escrow-or-impound-account-en-2082/
  - https://www.consumerfinance.gov/ask-cfpb/what-can-i-do-if-my-mortgage-lender-servicer-is-charging-me-for-force-placed-homeowners-insurance-en-219/
- Note Servicing Center:
  - https://noteservicingcenter.com/seller-financing/
  - https://noteservicingcenter.com/pricing-comparison/
  - https://noteservicingcenter.com/borrowers-benefits/
  - https://noteservicingcenter.com/seller-financing-back-to-the-future/
  - https://noteservicingcenter.com/seller-financing-pitfalls-the-high-cost-of-diy-mortgage-servicing/

