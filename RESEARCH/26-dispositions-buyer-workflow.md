# Dispositions / Buyer Workflow

Date: 2026-04-02

Research question:
- What buyer-side and dispositions workflows are still missing from Parcel's strategy?
- Which parts of dispositions are table stakes versus overkill for Parcel's current phase?
- How should Parcel support wholesalers and hybrid investors without turning into InvestorLift on day one?

Inputs used:
- `SAD/personas/02-desiree-solo-wholesaler.md`
- `SAD/personas/08-james-agent-serving-investors.md`
- `SAD/personas/07-tamara-hybrid-investor.md`
- `RESEARCH/07-crm-workflow-requirements.md`
- `RESEARCH/22-competitive-journey-teardowns.md`
- `SAD/current-state-audit.md`
- Fresh external research on REsimpli, FreedomSoft, and InvestorLift

## Executive Verdict

Parcel cannot credibly serve wholesalers and hybrid investors if it stops at acquisition-side CRM.

It needs first-class dispositions.

But it does not need a public marketplace first.

The correct build order is:

1. internal buyer CRM
2. property-to-buyer matching
3. buyer blast + response tracking
4. disposition pipeline and buyer history
5. only later, optional broader network / marketplace ideas

That sequence matches Desiree's actual pain and avoids overbuilding.

## Why This Matters for Parcel

Desiree's current workflow exposes the gap clearly:

- she keeps a 187-person buyer list in Google Sheets
- she filters manually by area and budget
- she blasts deal details from her phone
- buyer feedback, responsiveness, and history are not structurally tracked

This is not a side task.
It is how assignment fees actually get realized.

If Parcel wants to own `find -> analyze -> acquire -> finance -> track`, then for wholesale and hybrid users it also needs to own:

- `market -> match -> assign -> close`

Without that, Parcel handles half the wholesaler operating loop.

## What External Products Reveal

## 1. REsimpli treats buyer management as operational, not optional

REsimpli's current positioning and content emphasize:

- free cash buyer searches
- buyer management
- email and SMS marketing to buyers
- behavior- and criteria-based tagging
- top responsive buyers
- click/open-rate tracking for property blasts

Its own buyer-management content recommends tagging buyers by:

- strategy
- location
- responsiveness

and filtering blasts by:

- zip code
- price range
- buyer activity
- tags

Sources:
- https://resimpli.com/
- https://resimpli.com/pricing/
- https://resimpli.com/blog/how-to-manage-cash-buyers-resimpli/

Lesson:
- buyer disposition is not just a contact list
- matching and targeting are core
- behavior history matters

## 2. FreedomSoft frames dispositions as a distinct capability

FreedomSoft explicitly markets:

- dispositions
- team permissions
- KPIs + reports

and describes dispositions as:

- finding active buyers
- managing closing detail

Its import flows also separate:

- seller prospects / leads
- buyer prospects
- active buyers
- contacts

Sources:
- https://freedomsoft.com/dispositions-management/
- https://helpdesk.freedomsoft.com/hc/en-us/articles/360020971653-How-to-Import-Prospects-Leads-Buyers-and-Contacts-into-FreedomSoft

Lesson:
- buyer workflow deserves its own structure
- buyers are not just another generic contact tag

## 3. InvestorLift shows what the far end of the category looks like

InvestorLift's current positioning is unapologetically dispositions-first:

- "turn every deal into a bidding war"
- AI that finds buyers instantly
- buyer network depth
- buyer interest signals
- built-in messaging
- review / trust layer between wholesalers and buyers

Sources:
- https://get.investorlift.com/
- https://community.investorlift.com/getting-started-14/boost-your-wholesaling-efficiency-with-investorlift-messenger-467
- https://community.investorlift.com/the-lift-2/building-credibility-the-power-of-two-way-reviews-for-wholesalers-474

Lesson:
- the category can go very deep
- but the first useful step is not a national marketplace
- the first useful step is structured buyer intelligence and fast matching

## Parcel's Real User Need

For Desiree, the main jobs are:

- know which buyers fit this specific deal
- blast the right buyers quickly
- track who opened, replied, toured, and offered
- know which buyers waste time
- close the assignment without losing context

For Tamara, the buyer workflow matters when deciding:

- keep
- flip
- assign
- partner

For James, buyer-side tracking matters when he wants to:

- route the same opportunity to multiple investor clients
- know each client's buy box and history
- avoid re-sending irrelevant deals

These are closely related but not identical.
Parcel should support them through one underlying model.

## Recommended Parcel Model

## 1. Introduce `BuyerProfile` as a first-class record

This can be implemented as a specialized contact subtype or related entity, but it should be first-class in the product model.

BuyerProfile should include:

- legal / preferred name
- entity name
- markets
- strategies
- asset types
- price range
- ARV range
- rehab tolerance
- occupancy / tenant preference if relevant
- financing type / cash availability
- proof-of-funds status
- preferred closing speed
- notes
- tags

This is the minimum viable buy box.

## 2. Add property-to-buyer match scoring

Every marketable opportunity should be matched against known buyers.

The score does not need to be magical AI at first.
Rules-based matching is enough:

- geography match
- strategy match
- price match
- asset-type match
- rehab tolerance match

Output should be:

- top buyer matches
- reasons matched
- near matches

This directly eliminates Desiree's current spreadsheet filtering ritual.

## 3. Build a real disposition pipeline

Parcel's pipeline should not stop at seller-side stages.

For marketed deals, Parcel should support stages like:

- ready to market
- buyer list drafted
- blast sent
- tours / access scheduled
- offers received
- best and final
- assigned / sold
- backup buyer
- closed
- fell apart

This is distinct from the acquisition pipeline and should either:

- live as a sub-pipeline on the deal
- or be a dedicated disposition workflow attached to the deal

The important part is that it is explicit.

## 4. Track buyer interaction history per opportunity

Parcel should record:

- which buyers received the deal
- when
- whether they opened the link
- whether they replied
- whether they requested access
- what offer they made
- why they passed

This turns disposition from guesswork into learnable process.

Later, this history can power:

- buyer responsiveness score
- most-likely-to-close signal
- buyer fit recommendations

## 5. Support buyer-facing deal packets

The buyer blast should not just be a text blob.

Parcel should support a buyer-safe marketing packet / link with:

- property basics
- photos
- asking price / assignment setup
- comps or summary
- rehab summary if applicable
- offer / contact CTA

This is where Parcel's report system and dispositions intersect.

## What Parcel Should Build Later, Not Now

## 1. Do not start with a public buyer marketplace

InvestorLift shows the long-term category ceiling, but that is not Parcel's current best move.

Why not now:

- it creates trust and moderation problems
- it shifts focus from the core OS
- it adds cold-start risk
- it is not required to replace Desiree's spreadsheet workflow

Parcel's near-term win is:

- private buyer intelligence
- internal matching
- better blast tooling

## 2. Do not build auction mechanics first

The problem to solve is not "dynamic bidding infrastructure."
It is "I need to know who to send this to, and what happened."

## 3. Do not collapse buyers into generic contacts only

That loses the buy box.
And once the buy box is lost, the matching workflow collapses.

## Product Implications

Parcel should add the following to the roadmap:

- `BuyerProfile` data model
- buy box schema
- buyer-specific search and filtering
- match scoring from deal -> buyer
- disposition stages
- buyer blast workflow
- engagement tracking on buyer packets
- buyer response / offer logging
- buyer history and reliability notes

Strong follow-on features:

- top buyers by market / strategy
- pass-reason analytics
- repeat-buyer ranking
- trust / review data after close

## Strategic Conclusion

Parcel does not need to become InvestorLift to be credible.

But it does need to stop treating dispositions as an afterthought.

For wholesalers and hybrid investors, the operating system is incomplete until the platform can answer:

- who should I send this deal to?
- who actually engaged?
- who offered?
- who closes reliably?

That is the dispositions layer Parcel still needs.

## Sources

- https://resimpli.com/
- https://resimpli.com/pricing/
- https://resimpli.com/blog/how-to-manage-cash-buyers-resimpli/
- https://freedomsoft.com/dispositions-management/
- https://helpdesk.freedomsoft.com/hc/en-us/articles/360020971653-How-to-Import-Prospects-Leads-Buyers-and-Contacts-into-FreedomSoft
- https://get.investorlift.com/
- https://community.investorlift.com/getting-started-14/boost-your-wholesaling-efficiency-with-investorlift-messenger-467
- https://community.investorlift.com/the-lift-2/building-credibility-the-power-of-two-way-reviews-for-wholesalers-474
