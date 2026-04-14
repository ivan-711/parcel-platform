# Internal Consistency Audit

Date: 2026-04-02

Scope: All files in `RESEARCH/` (29 documents) and `SAD/` (Blueprint, current-state-audit, ia-review, 9 persona files). Excludes `SAD/audit/`.

---

## 1. Contradictions

### 1. Pricing: Master Synthesis uses $69/mo Pro; persona documents and packaging research use $79/mo Pro

**Severity: CRITICAL**

The master synthesis (`RESEARCH/00-MASTER-RESEARCH-SYNTHESIS.md`) was written with the assumption that Parcel Pro is $69/mo:

> "At $69/month Pro, Parcel can undercut the $149-599/month acquisition CRMs while offering broader strategy coverage." (line 64)

> "At Parcel's $69/mo Pro pricing, spending ~$2/user on Bricked data leaves significant margin." (line 333)

The monetization benchmarks (`RESEARCH/15-monetization-benchmarks.md`) explicitly recommends raising Pro to $79/mo:

> "Raise Pro to $79/mo -- grandfather existing Pro users at $69 for 12 months" (line 544)

The persona documents and packaging research (`RESEARCH/23-packaging-monetization-by-persona.md`) already assume $79/mo Pro as fact:

> "Parcel Pro at $79/mo replaces REsimpli ($149), DealCheck (free but limited), and DealMachine ($49)" (`SAD/personas/02-desiree-solo-wholesaler.md`, line 141)

The persona synthesis table shows target tiers at `Plus ($29) / Pro ($79) / Business ($149)`:

> "| Target Parcel tier | Plus ($29) -> Pro ($79) |" (`SAD/personas/00-persona-synthesis.md`, line 17)

Meanwhile, the current codebase still uses `Free / Starter / Pro / Team` with $69 pricing (`SAD/current-state-audit.md`, lines 162-176).

The Codex Blueprint (`SAD/Codex-Parcel-Product-Blueprint.md`) uses `Free / Plus / Pro / Business` language but never states specific dollar amounts.

**Canonical version:** The persona and packaging documents ($79/mo Pro, $29/mo Plus, $149/mo Business) represent the intended future state. The master synthesis's $69 figure is stale.

**Recommended resolution:** Update the master synthesis pricing references from $69 to $79. Update the current codebase tier names from `Starter` to `Plus` and reflect the new pricing. Add a versioning note to the master synthesis marking Sections 1 and 5 as superseded by `RESEARCH/23-packaging-monetization-by-persona.md`.

---

### 2. Tier naming: Three different naming schemes across documents

**Severity: CRITICAL**

| Source | Tier Names |
|---|---|
| Codebase (`tier_config.py`, `PricingPage.tsx`) | Free, Starter, Pro, Team |
| Master Synthesis (`00-MASTER-RESEARCH-SYNTHESIS.md`) | Free, Pro (only two mentioned) |
| Monetization Benchmarks (`15-monetization-benchmarks.md`) | Free, Plus ($29), Pro ($79), Business ($149) |
| Packaging Research (`23-packaging-monetization-by-persona.md`) | Free, Plus, Pro, Business |
| Persona Synthesis (`00-persona-synthesis.md`) | Plus, Pro, Business |
| Codex Blueprint (`Codex-Parcel-Product-Blueprint.md`) | Does not specify tier names |

The packaging research explicitly says the current naming is wrong:

> "Parcel should not keep the current Free / Starter / Pro / Team framing." (`RESEARCH/23-packaging-monetization-by-persona.md`, lines 22-28)

**Canonical version:** Free / Plus ($29) / Pro ($79) / Business ($149) from `RESEARCH/23-packaging-monetization-by-persona.md`.

**Recommended resolution:** Reconcile all documents to use the canonical names. Update the codebase. This is a product-facing inconsistency that will confuse anyone working from these documents.

---

### 3. FreedomSoft pricing: Conflicting figures across documents

**Severity: LOW**

| Source | Start | Grow | Scale |
|---|---|---|---|
| `RESEARCH/01-wholesale-flip-platforms.md` (line 784-786) | $197/mo ($147 annual) | $297/mo ($247 annual) | $497/mo ($597 annual) |
| `RESEARCH/00-MASTER-RESEARCH-SYNTHESIS.md` (line 80) | $147-597/mo (range) | | |
| `RESEARCH/15-monetization-benchmarks.md` (line 35) | Start $197/mo | Grow $297/mo | Scale $497/mo |
| `RESEARCH/23-packaging-monetization-by-persona.md` (lines 135-136) | Start $197/mo monthly | Grow $297/mo monthly | Scale $797/mo monthly |

The Scale tier is $497 in most documents but $797 in the packaging research. The wholesale-flip-platforms report itself notes "Pricing varies between sources" (line 788).

**Recommended resolution:** Verify current FreedomSoft pricing at freedomsoft.com/pricing and update all documents consistently. This is minor since FreedomSoft pricing is used for competitive comparison only, not for Parcel's own pricing decisions.

---

### 4. DealMachine pricing: $49/mo in persona vs $99-$279/mo in competitor research

**Severity: MODERATE**

Desiree's tool stack says:

> "DealMachine | $49/mo | Driving for dollars." (`SAD/personas/02-desiree-solo-wholesaler.md`, line 32)

The master synthesis says:

> "DealMachine | D4D + Lead Gen | $99-279/mo" (`RESEARCH/00-MASTER-RESEARCH-SYNTHESIS.md`, line 77)

The monetization benchmarks say:

> "DealMachine | No (7-day trial) | Starter $99/mo ($1,190/yr) | Pro $149/mo ($1,790/yr) | Pro Plus $232/mo ($2,790/yr)" (`RESEARCH/15-monetization-benchmarks.md`, line 30)

The $49/mo figure in Desiree's persona does not match any known DealMachine tier. It may reflect an older pricing tier, a promotional rate, or an error during persona construction.

**Recommended resolution:** Verify DealMachine's current pricing. If $49/mo is not a real tier, update Desiree's tool stack to the Starter tier ($99/mo) and recalculate her total monthly spend from $472 to $522.

---

### 5. DealCheck pricing: $14/mo in Kyle's stack vs $10-$20/mo in competitor research

**Severity: LOW**

Kyle's tool stack says:

> "DealCheck | $14 | Acquisition underwriting" (`SAD/personas/05-kyle-str-airbnb-investor.md`, line 29)

The monetization benchmarks say:

> "DealCheck | Starter: free, 15 properties | Plus $10/mo annual | Pro $20/mo annual" (`RESEARCH/15-monetization-benchmarks.md`, line 72)

$14/mo does not correspond to either the $10 Plus or $20 Pro tier. It could be a legacy price or a monthly-vs-annual billing mismatch.

**Recommended resolution:** Clarify which DealCheck tier Kyle uses and whether $14 is the monthly billing rate for the Plus plan (which might be $10 annual / $14 monthly). Minor impact.

---

### 6. IA sidebar structure: Blueprint and ia-review propose different groupings

**Severity: MODERATE**

The Codex Blueprint proposes:

> HOME: Today, Dashboard / CORE: Analyze, Pipeline, Properties, Portfolio / RELATIONSHIPS: Contacts, Buyers, Inbox / EXECUTION: Rehabs, Obligations / OUTPUTS: Reports, Documents / GROWTH: Marketing, Drive (`SAD/Codex-Parcel-Product-Blueprint.md`, lines 567-601)

The ia-review proposes:

> HOME: Dashboard, Today / ACQUISITION: Analyze, Pipeline, Contacts, Inbox / ASSETS: Properties, Portfolio, Transactions, Documents, Reports / MARKETING: Sequences, Skip Tracing, Mail Campaigns, D4D / PROJECTS: Rehabs, Monitoring (`SAD/ia-review.md`, lines 366-398)

Key disagreements:
- Blueprint puts `Today` first under HOME; ia-review puts `Dashboard` first
- Blueprint separates `Contacts` and `Buyers` under RELATIONSHIPS; ia-review puts `Contacts` under ACQUISITION
- Blueprint has `Obligations` under EXECUTION; ia-review calls it `Monitoring` under PROJECTS
- Blueprint omits `Transactions` as top-level; ia-review includes it under ASSETS
- Blueprint has `Drive` under GROWTH; ia-review puts `D4D` under MARKETING

Both documents agree on the key structural principles: Properties is top-level, AI is globally accessible, Today is necessary, and D4D should not be a universal bottom tab.

**Recommended resolution:** The Blueprint should be treated as canonical since it is the final synthesis. However, the `Transactions` top-level destination from the ia-review should be adopted -- the master synthesis marks financial tracking as P0/P1, and the Blueprint omits it from the sidebar.

---

### 7. Mobile bottom tabs: Blueprint and ia-review disagree slightly

**Severity: LOW**

Blueprint recommends:

> Today, Analyze, Pipeline, Properties, More (`SAD/Codex-Parcel-Product-Blueprint.md`, lines 630-635)

ia-review recommends:

> Dashboard, Analyze, Pipeline, AI, More (`SAD/ia-review.md`, lines 114-120)

Key disagreements:
- Blueprint uses `Today` as the first tab; ia-review uses `Dashboard`
- Blueprint includes `Properties` as a tab; ia-review includes `AI`
- ia-review explicitly argues against `Properties` as a permanent tab and for `AI` as globally accessible

**Recommended resolution:** Lock the Blueprint version since it was written after the ia-review and represents the final decision. The ia-review's `AI` tab argument has merit but conflicts with the Blueprint's own recommendation that AI should be "globally summonable" rather than occupying a tab slot.

---

## 2. Stale Assumptions

### 8. Master synthesis assumes $69/mo Pro and two-tier pricing

**Severity: CRITICAL**

The master synthesis (reports 01-15) was the first document written. It assumes a two-tier model (Free + Pro at $69). All cost projections, unit economics, and competitive positioning arguments in Sections 1, 5, 8, and 16 use this pricing.

The later research (reports 16-29) and all persona/SAD documents assume the four-tier model (Free / Plus $29 / Pro $79 / Business $149). The unit economics have shifted: Pro now generates $79/user/mo instead of $69, but the Plus tier at $29 creates a new segment of lower-revenue users.

**Canonical version:** Four-tier model from `RESEARCH/23-packaging-monetization-by-persona.md`. The master synthesis pricing sections are stale.

**Recommended resolution:** Either update the master synthesis or add a prominent header marking Sections 1, 5, 8, and 16 as superseded by the packaging research.

---

### 9. Master synthesis lists Communication Logging as P0; Blueprint defers communications to Phase 8

**Severity: MODERATE**

The master synthesis marks "Communication Logging" as P0:

> "Communication Logging | 3 | 5 | M | Med | P0 | Single table for calls, SMS, email, in-person" (`RESEARCH/00-MASTER-RESEARCH-SYNTHESIS.md`, line 124)

The Blueprint defers all communications to Phase 8:

> "Phase 8: Communications and field capture" (`SAD/Codex-Parcel-Product-Blueprint.md`, line 774)

The persona synthesis places SMS/Email comms at Wave 4, not Wave 0/1.

This is not necessarily a contradiction -- the master synthesis may mean "logging" (a passive table) while the Blueprint means "integrated comms" (active SMS/email sending). But the P0 designation creates an expectation that communication records will exist from the start, while the Blueprint timeline suggests they will not.

**Recommended resolution:** Clarify whether a basic `communications` table (passive logging of manual entries) should ship in Phase 1 as the master synthesis implies, or whether all communication data modeling waits until Phase 8 as the Blueprint implies. The domain model research (`RESEARCH/18-property-centric-domain-model.md`) lists `Communication` as a first-class entity, supporting earlier inclusion.

---

### 10. Master synthesis marks Tenant Management as P2; Blueprint explicitly excludes it

**Severity: LOW**

Master synthesis:

> "Tenant Management | Rental, BRRRR, Creative | 3 | 3 | L | High | P2 | Lease tracking, rent collection, maintenance requests" (`RESEARCH/00-MASTER-RESEARCH-SYNTHESIS.md`, line 169)

Blueprint:

> "Parcel should explicitly not build these yet: tenant portal, rent collection infrastructure, maintenance request system" (`SAD/Codex-Parcel-Product-Blueprint.md`, lines 807-809)

Portfolio-lite boundary research:

> "Parcel should not own: resident self-service, rent processing infrastructure, maintenance operations, screening and leasing workflows" (`RESEARCH/21-portfolio-lite-boundary-definition.md`, lines 36-39)

The master synthesis conflates "lease tracking" with "rent collection and maintenance requests" under one P2 item. The later research cleanly separates lease timing visibility (yes, Parcel does this) from resident operations (no, Parcel does not).

**Canonical version:** The portfolio-lite research and Blueprint supersede the master synthesis on this point. Lease tracking is in scope; tenant management, rent collection, and maintenance requests are explicitly out.

---

## 3. Persona-Pricing Alignment

### 11. Desiree's total tool spend may be understated due to DealMachine pricing discrepancy

**Severity: MODERATE**

Desiree's tool stack totals $472-500+/mo, which includes DealMachine at $49/mo. If DealMachine's actual entry price is $99/mo (Starter tier per `RESEARCH/15-monetization-benchmarks.md`), her real spend is $522-550+/mo.

This affects the Parcel value proposition claim:

> "Parcel Pro at $79/mo replaces REsimpli ($149), DealCheck (free but limited), and DealMachine ($49) -- a $198/mo savings on day one."

If DealMachine is $99, the savings increases to $248/mo, which actually strengthens the value proposition. But the persona document should use accurate vendor pricing.

**Recommended resolution:** Verify DealMachine pricing. Update Desiree's tool stack and total spend accordingly. The value proposition math improves either way.

---

### 12. Kyle's DealCheck spend ($14/mo) does not match published tiers

**Severity: LOW**

As noted in item 5. Kyle's $303/mo total tool spend would change by $4-6 depending on the actual DealCheck tier. Negligible impact on strategy.

---

### 13. Tamara's tool stack total ($174/mo) is accurate

**Severity: N/A (CONFIRMED CONSISTENT)**

Tamara's stack: REsimpli $149 + DealCheck $10 + QuickBooks $15 = $174. The REsimpli figure matches the Basic tier from `RESEARCH/15-monetization-benchmarks.md` (Lite at $69, Basic at $149). However, note that Tamara is listed at REsimpli $149, which is their Basic tier, while the persona synthesis table lists her current spend as "~$174." These are consistent.

---

### 14. Blended ARPU calculation ($85.25/mo) uses referral-inflated James ARPU

**Severity: MODERATE**

The persona synthesis blended ARPU table uses $179/mo for James, which includes an estimated $100/mo in "referred subscriptions." This inflates the blended ARPU. James's own subscription is $79-99/mo.

If calculated without referral value:
- James ARPU = $89 (midpoint of $79-99) instead of $179
- Blended ARPU drops from $85.25 to ~$76.25

Referral revenue is real but uncertain and belongs in a separate line item, not in per-user ARPU calculations used for financial planning.

**Recommended resolution:** Report two ARPU figures: one for direct subscription revenue (~$76/mo) and one including estimated referral value (~$85/mo). This prevents planning errors.

---

## 4. Timeline Realism

### 15. Blueprint Phase 1 (schema) + Phase 2 (front door) are each massive for a solo developer

**Severity: CRITICAL**

Blueprint Phase 1 includes:

> "property-centric schema, analysis scenarios as first-class records, contact model, buyer-profile extension, report model, financing instrument and obligation model" (`SAD/Codex-Parcel-Product-Blueprint.md`, lines 675-681)

That is 6-8 new database tables with relationships, migrations, and backend API surfaces. For a solo developer, this is 3-6 weeks of focused work minimum.

Phase 2 includes:

> "address-first onboarding, sample deals, persona routing, AI-narrated draft analysis, save-to-property and save-to-deal flows" (`SAD/Codex-Parcel-Product-Blueprint.md`, lines 689-695)

This involves API integrations (RentCast and/or Bricked), 8 onboarding branches (one per persona), AI prompt engineering, and new frontend flows. Another 4-8 weeks.

The Blueprint does not provide explicit time estimates, but Phases 1-3 together represent the minimum viable "investor OS" and would take a solo developer approximately 10-20 weeks (2.5-5 months).

The Blueprint has 9 phases total. At solo-developer velocity, the full roadmap is 12-24 months of focused work.

**Recommended resolution:** Add explicit time estimates per phase. Consider which Phase 1 entities can be deferred. For example, `BuyerProfile`, `Report`, and `FinancingInstrument` could ship in later phases without blocking the core property/deal/contact/scenario schema.

---

### 16. Wave 1 in the persona synthesis is overloaded

**Severity: CRITICAL**

The persona synthesis Feature Demand Heatmap places the following in Wave 1:

- Calculators (5 strategies) -- already built
- AI deal narration
- Pipeline / Kanban -- already built
- Property detail pages
- CRM / Contacts
- Portfolio dashboard -- partially built
- Multi-strategy comparison
- Branded PDF reports
- Tasks
- Morning briefing
- RAG document chat
- Rehab tracker

That is 10+ new features beyond what currently exists. Even if "Wave 1" is meant as "the first major release" rather than a sprint, this is an enormous scope for a solo developer. The heatmap does not define what "Wave 1" means in calendar time.

**Recommended resolution:** Define Wave 1 in calendar terms. Split it into sub-waves (1a, 1b, 1c) with explicit priorities. At minimum, Wave 1a should be: property schema, contacts, property detail pages, and pipeline improvements. Wave 1b: multi-strategy comparison, branded reports, and tasks. Wave 1c: morning briefing, RAG, and rehab tracker.

---

## 5. IA-Persona Alignment

### 17. Both Blueprint and ia-review correctly prioritize Properties as top-level

**Severity: N/A (CONFIRMED CONSISTENT)**

The persona synthesis shows that 4 personas (Marcus, Ray, Angela, Tamara) rate Property detail pages as MUST HAVE. The ia-review explicitly argues Properties must not be under DEALS. The Blueprint makes Properties a top-level CORE item. This is internally consistent.

---

### 18. Today as a first-class destination is well-supported by persona evidence

**Severity: N/A (CONFIRMED CONSISTENT)**

The morning briefing research (`RESEARCH/19-today-morning-briefing-jobs-to-be-done.md`) and the persona analysis both support a dedicated Today view. The Blueprint makes it the first item under HOME and the default post-login landing page. The ia-review agrees on the need but disagrees on the mobile tab slot (Dashboard vs Today first). This is a minor disagreement, not a persona misalignment.

---

### 19. D4D correctly deprioritized as a universal nav item

**Severity: N/A (CONFIRMED CONSISTENT)**

The ia-review makes the strongest argument for this: D4D is primary for only Desiree (15% of user base) and Tamara (10%), secondary for Ray (10%). Making it a universal bottom tab would bias the product toward a subset. Both the ia-review and Blueprint agree on using a floating action or pinnable shortcut instead. The persona synthesis confirms D4D has 0 MUST HAVE ratings and 3 HIGH VALUE ratings.

---

### 20. Obligations/Monitoring needs a stronger navigation home for Carlos

**Severity: MODERATE**

Carlos is designated as the "moat persona" by the Blueprint. His activation feature is creative finance monitoring. The Blueprint gives Obligations a top-level slot under EXECUTION. The ia-review gives Monitoring a slot under PROJECTS (contextual, only when relevant).

However, the ia-review's conditional visibility ("only show when relevant") could delay Carlos's discovery of the feature. The persona document explicitly states:

> "Seeing 'subject-to monitoring' as a named capability is itself a conversion trigger" (`SAD/ia-review.md`, line 36)

The Blueprint and ia-review agree on the need but slightly disagree on visibility. The Blueprint's unconditional EXECUTION > Obligations is better aligned with Carlos's persona.

**Recommended resolution:** Make Obligations visible by default for users who select the creative finance onboarding branch, regardless of whether they have active instruments yet. This matches both the Blueprint's structure and Carlos's persona needs.

---

## 6. Domain Model Coverage

### 21. Proposed navigation covers all 12 domain model entities

**Severity: N/A (CONFIRMED CONSISTENT)**

Cross-referencing the Blueprint's sidebar against the domain model entities from `RESEARCH/18-property-centric-domain-model.md`:

| Entity | Navigation Home | Coverage |
|---|---|---|
| Property | CORE > Properties | Covered |
| Deal | CORE > Pipeline + Analyze | Covered |
| AnalysisScenario | Within Analyze flow / Property detail | Covered (subordinate) |
| Contact | RELATIONSHIPS > Contacts | Covered |
| BuyerProfile | RELATIONSHIPS > Buyers | Covered |
| Task | Surfaced in Today, embedded in records | Covered (cross-cutting) |
| Obligation | EXECUTION > Obligations | Covered |
| Transaction | **Missing from Blueprint sidebar** | Gap |
| Lease | Within Properties / Portfolio | Covered (subordinate) |
| RehabProject | EXECUTION > Rehabs | Covered |
| FinancingInstrument | Within Properties / Obligations | Covered (subordinate) |
| Report | OUTPUTS > Reports | Covered |

**Gap: Transaction has no explicit top-level home in the Blueprint sidebar.**

The ia-review includes `Transactions` under ASSETS. The master synthesis marks Financial Tracking Per-Deal as P0. The portfolio-lite research (`RESEARCH/21-portfolio-lite-boundary-definition.md`) confirms Parcel should track "investor-relevant financial events."

**Recommended resolution:** Add `Transactions` to the Blueprint sidebar under CORE or OUTPUTS. The ia-review's placement under ASSETS (alongside Properties, Portfolio, Documents) is the best fit.

---

## 7. Feature-Wave Conflicts

### 22. Creative finance calculators: Wave 0/1 in code vs Wave 2 in persona synthesis

**Severity: MODERATE**

The current codebase already has creative finance calculators built and shipping:

> "calculator implementations under backend/core/calculators/ ... all 5 forms wired in frontend" (`SAD/current-state-audit.md`, lines 86-89)

But the persona synthesis places "Creative finance calculators" in Wave 2:

> "Creative finance calculators | Wave 2 | 3 (Carlos, Tamara, Kyle)" (`SAD/personas/00-persona-synthesis.md`, line 37)

The calculators exist today (Wave 0). What the personas actually need in Wave 2 is creative finance **monitoring** (obligation alerts, balloon tracking, payment verification) -- which is a different feature.

**Recommended resolution:** Relabel the persona synthesis heatmap entry. "Creative finance calculators" should be marked Wave 0 (shipped). "Creative finance monitoring" is already correctly listed separately as Wave 2. The current listing double-counts the calculator as if it does not exist yet.

---

### 23. RAG document chat: Wave 1 in persona synthesis vs no explicit phase in Blueprint

**Severity: LOW**

The persona synthesis places RAG document chat in Wave 1. The Blueprint does not explicitly mention RAG in any phase. The master synthesis marks RAG as P1. The vector DB research (`RESEARCH/06-vector-db-rag.md`) provides a full architecture.

The Blueprint's Phase 1 (schema foundation) would need to include `document_chunks` with pgvector if RAG is truly Wave 1. This is not mentioned.

**Recommended resolution:** Explicitly place RAG in the Blueprint's phase list. It fits naturally in Phase 3 (operating loop) or Phase 4 (report system), not Phase 1.

---

### 24. Skip tracing: Wave 5 in persona synthesis vs P2 in master synthesis

**Severity: LOW**

These are consistent -- Wave 5 and P2 both indicate "not immediate, but before D4D and direct mail." No conflict, just different labeling systems (waves vs priority tiers). Both agree skip tracing ships after CRM but before D4D.

---

### 25. Blueprint phase numbering vs persona wave numbering are parallel but not mapped

**Severity: MODERATE**

The Blueprint uses Phase 1-9. The persona synthesis uses Wave 0-7. These two numbering systems are not explicitly mapped to each other.

Best-effort mapping based on feature content:

| Persona Waves | Blueprint Phases | Content |
|---|---|---|
| Wave 0/1 | Phase 1-3 | Schema, front door, operating loop, core features |
| Wave 2 | Phase 5 | Creative finance monitoring |
| Wave 3 | Phase 4 | Reports |
| Wave 4 | Phase 8 | Communications |
| Wave 5 | Phase 8 | Skip tracing |
| Wave 6 | Phase 8 | Direct mail |
| Wave 7 | Phase 8 | D4D |
| -- | Phase 6 | Dispositions (not wave-numbered) |
| -- | Phase 7 | Portfolio-lite + rehab execution (not wave-numbered) |
| -- | Phase 9 | Team/Business layer (not wave-numbered) |

The Blueprint has Phases 6, 7, and 9 that do not appear in the persona wave system. The persona synthesis has no wave for dispositions, portfolio expansion, or team features.

**Recommended resolution:** Create a single canonical roadmap that maps persona waves to Blueprint phases. This is the most operationally urgent consistency fix because the current state forces anyone planning work to mentally merge two separate numbering systems.

---

## Summary of Issues by Severity

| Severity | Count | Items |
|---|---|---|
| CRITICAL | 4 | 1 (pricing), 2 (tier naming), 15 (Phase 1 scope), 16 (Wave 1 overload) |
| MODERATE | 7 | 4 (DealMachine pricing), 6 (IA structure), 9 (comms P0 vs Phase 8), 11 (Desiree spend), 14 (ARPU), 20 (Obligations visibility), 22 (creative calc wave), 25 (wave-phase mapping) |
| LOW | 5 | 3 (FreedomSoft pricing), 5 (DealCheck pricing), 7 (mobile tabs), 10 (tenant mgmt), 23 (RAG phase), 24 (skip trace labeling) |
| CONFIRMED CONSISTENT | 5 | 13, 17, 18, 19, 21 |

## Recommended Priority Actions

1. **Unify pricing and tier naming across all documents.** Canonical: Free / Plus ($29) / Pro ($79) / Business ($149). Update master synthesis, codebase, and any document still using $69 or Starter/Team naming.

2. **Create a single canonical roadmap** that maps persona waves to Blueprint phases with calendar-time estimates for a solo developer. This is the most impactful consistency fix.

3. **Split Wave 1 / Phase 1-3 into sub-phases** with explicit scope cuts. The current "Wave 1" is 10+ features and the Blueprint's Phases 1-3 are 3-5 months of solo work.

4. **Add Transactions to the Blueprint sidebar** under CORE or ASSETS.

5. **Verify DealMachine pricing** and update Desiree's persona tool stack.

6. **Relabel creative finance calculators** from Wave 2 to Wave 0 (already shipped) in the persona synthesis heatmap.
