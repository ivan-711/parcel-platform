# Research Audit Synthesis

**Date:** 2026-04-02
**Scope:** 5 parallel audits covering competitors, legal, internal consistency, research gaps, and technical stack
**Purpose:** Determine whether the research foundation is solid enough to produce the Product Blueprint

---

## BLOCKERS -- Must Resolve Before Running the Product Blueprint

### B1. API Failure Mode Matrix Missing (Audit 04, Gap 6)

The address-to-analysis flow is the core activation experience. No research document defines what users see when:
- Bricked API is down (Stage B fails while Stage A succeeds)
- Bricked returns partial data (comps but no repair estimate, or vice versa)
- RentCast (Stage A) also fails -- user gets a blank form?
- Fallback to HouseCanary at 10-60x cost per call

**Required action:** Write a failure mode matrix mapping each provider failure scenario to a specific UX response and cost model. This can be a 1-2 page addendum, not a full research report.

### B2. Onboarding Flow Mechanics Undefined (Audit 04, Gap 1a)

The persona synthesis defines which onboarding *branch* each persona takes, but no document covers:
- Empty-state design for each module
- Progressive disclosure sequencing (screen 1, 2, 3)
- Sample data lifecycle (when removed? user-deletable?)
- Activation completion criteria for analytics
- Re-onboarding for users who abandon and return
- Users who don't fit any of the 8 branches

**Required action:** Define onboarding mechanics in the Blueprint itself. This does not need a standalone research doc -- the Blueprint must include an onboarding specification section.

### B3. Spreadsheet Migration Not Researched (Audit 04, Gap 1d)

Report 27 covers migration from competing tools but ignores the #1 migration source for 5/8 personas: **personal spreadsheets and Google Sheets**. Marcus, Ray, Angela, Carlos, and Tamara all use spreadsheets as primary tools.

**Required action:** Either research common investor spreadsheet patterns or define a "template-first" migration strategy in the Blueprint (provide a Parcel CSV template, users reformat their data to match).

### B4. Pricing and Tier Naming Inconsistency (Audit 03, Items 1-2)

Three different naming schemes and two different price points exist across documents:

| Source | Tiers | Pro Price |
|--------|-------|-----------|
| Codebase | Free / Starter / Pro / Team | $69/mo |
| Master Synthesis | Free / Pro | $69/mo |
| Packaging Research + Personas | Free / Plus / Pro / Business | $79/mo |

**Canonical:** Free / Plus ($29) / Pro ($79) / Business ($149) from RESEARCH/23-packaging-monetization-by-persona.md.

**Required action:** Reconcile all documents before Blueprint. The Blueprint must use a single canonical pricing and tier scheme, and every reference must be consistent. This is a 30-minute document editing task, not research.

### B5. No Unified Roadmap Mapping Waves to Phases (Audit 03, Items 15-16, 25)

Two parallel numbering systems exist (persona Waves 0-7, Blueprint Phases 1-9) with no explicit mapping. Wave 1 contains 12+ features. Phase 1-3 is 10-20 weeks of solo-developer work. Neither system has calendar-time estimates.

**Required action:** Create a single canonical roadmap before starting the Blueprint. Map persona waves to Blueprint phases with explicit scope boundaries and solo-developer time estimates. Split Wave 1 into sub-waves (1a, 1b, 1c).

---

## FIXES -- Update Documents but Don't Block the Blueprint

### F1. Bricked.ai Pricing Restructured (Audit 01)

Bricked restructured from flat $129/mo to 4 tiers ($49-Custom). API access requires Growth tier ($129/mo, 300 comps/mo). Platform is active and stable.

**Action:** Update cost models. Evaluate whether 300 comps/mo is sufficient or if Scale ($199/mo, 500 comps) is needed.

### F2. RentCast Price Dropped Dramatically (Audit 01)

Consumer pricing dropped from $74/mo to $0-19/mo. API has a free developer tier (50 calls/mo).

**Action:** Update cost models. This reduces vendor costs.

### F3. DealMachine Entry Price Doubled (Audit 01)

Entry price went from $49/mo to $99/mo. Desiree's persona tool stack uses $49 (now incorrect).

**Action:** Update Desiree's tool stack to $99/mo. Recalculate total spend from $472 to $522. Value proposition math actually improves.

### F4. TCPA One-to-One Consent Rule Struck Down (Audit 02)

The Eleventh Circuit vacated the rule entirely (January 2025), not just postponed it. The research says "postponed to January 2026" -- that is wrong.

**Action:** Update RESEARCH/11-legal-compliance.md. This is actually favorable for Parcel users.

### F5. iOS Commission-Free Window Exists NOW (Audit 02)

External payment links are allowed. Apple currently cannot charge a commission (pending district court fee determination). This is a temporary window -- eventual commission expected at 12-27%.

**Action:** Implement web checkout linking to parceldesk.io immediately in the iOS app. This is a strategic timing advantage.

### F6. Colorado AI Act Effective June 30, 2026 (Audit 02)

AI systems used in housing decisions are classified "high-risk." Requires impact assessments before deployment. Relevant if Parcel builds AI-powered tenant screening or lead scoring.

**Action:** Add to compliance checklist. Not blocking for Blueprint but must be addressed before any AI housing features launch.

### F7. California Delete Act DROP Platform (Audit 02)

Data brokers must process consumer deletion requests starting August 1, 2026. $200/day/request penalties. Parcel may qualify as a data broker if it provides access to skip trace data.

**Action:** Assess whether Parcel qualifies as a "data broker." Add to legal review checklist.

### F8. Creative Finance Calculators Mislabeled as Wave 2 (Audit 03, Item 22)

Calculators are already built and shipping (Wave 0). The persona synthesis lists them as Wave 2, which double-counts them.

**Action:** Relabel to Wave 0 (shipped). "Creative finance monitoring" is correctly separate at Wave 2.

### F9. Dispositions Not Assigned to Any Wave (Audit 04, Gap 7a)

Report 26 was written because dispositions were identified as a gap, but the Feature Demand Heatmap never assigned dispositions to a wave. This is a MUST HAVE for Desiree.

**Action:** Assign dispositions to a wave in the Blueprint. Should be Wave 2 or early Wave 3 at latest.

### F10. Desiree's MUST HAVEs Ship Late (Audit 04, Gaps 8a-8c)

SMS (Wave 4) and skip tracing (Wave 5) are MUST HAVE for Desiree but ship many waves after her activation. She cannot fully replace REsimpli until Wave 5, meaning she runs both platforms in parallel.

**Action:** Either accelerate SMS/skip trace or explicitly document the parallel-run expectation. Consider a Zapier/webhook bridge to Launch Control as interim.

### F11. Transactions Missing from Blueprint Sidebar (Audit 03, Item 21)

The ia-review includes Transactions under ASSETS. The master synthesis marks Financial Tracking Per-Deal as P0. The Blueprint omits Transactions from the sidebar entirely.

**Action:** Add Transactions to the Blueprint sidebar, likely under CORE or ASSETS.

### F12. Communications Logging Priority Conflict (Audit 03, Item 9)

Master synthesis marks Communication Logging as P0. Blueprint defers all communications to Phase 8. Clarify whether a basic communications table (passive logging) ships in Phase 1 or waits.

**Action:** Clarify in Blueprint. Recommend adding a basic communications table in Phase 1 schema.

### F13. ARPU Calculation Inflated (Audit 03, Item 14)

Blended ARPU ($85.25/mo) includes referral-inflated James ARPU ($179/mo with $100 estimated referral value). Direct subscription ARPU is ~$76/mo.

**Action:** Report two ARPU figures: direct (~$76) and including referrals (~$85).

### F14. App Store AI Data Disclosure Required (Audit 02, Audit 05)

Apple Guideline 5.1.2(i) now requires explicit disclosure when personal data is shared with third-party AI. Relevant for Parcel's Claude AI integration.

**Action:** Add AI data disclosure consent to the iOS app submission checklist.

---

## NOTES -- Acknowledge in Blueprint, Resolve Later

### N1. Smart Bricks -- New Competitive Threat (Audit 01)

$5M pre-seed from a16z (Feb 2026). Agentic AI for RE investing. Currently institutional-focused but well-funded with elite team (ex-BCG/McKinsey/Blackstone/Goldman, OpenAI/Anthropic angels).

**Note:** Monitor quarterly. No action needed unless they pivot to SMB/creative finance.

### N2. Invelo 2.0 -- Closest "Investor OS" Competitor (Audit 01)

Relaunched with restructured pricing. No creative finance tools found. Worth a deeper competitive analysis.

**Note:** Parcel's creative finance moat remains wide open. No competitor has purpose-built creative finance tooling.

### N3. Proptech Funding Surge (Audit 01)

$16.7B invested globally in proptech in 2025 (68% YoY). $1.7B in Jan 2026 alone (176% YoY). Market timing is favorable for AI-enabled RE tools.

### N4. Capacitor 8 is Current Version (Audit 05)

Requires Node.js 22+, Xcode 26+, uses Swift Package Manager by default. Since Parcel hasn't started Capacitor setup, starting on v8 is cleaner than migrating.

**Note:** Pin setup instructions to Capacitor 8. Ensure Node.js 22+ in Railway and local dev.

### N5. Vite 8 and React 19 Available (Audit 05)

Parcel is on Vite 6 + React 18. Both upgrades available but should NOT be combined with the Capacitor initiative.

**Note:** Plan a dedicated upgrade sprint after mobile app is stable.

### N6. Transistor GPS Plugin at v9 (Audit 05)

Actively maintained, v8 license keys don't work with v9. Verify pricing before purchase.

### N7. Edge Cases Not Covered by Personas (Audit 04, Gap 9)

Inherited properties, tax liens, land-only deals, mobile homes, commercial (5+ units), out-of-state investing -- none covered by the 8 personas.

**Note:** Blueprint should include an "explicitly out of scope for v1" section.

### N8. Connor v. Woosender Proceeding (Audit 02)

Case proceeding past motion to dismiss. New related filing (Connor v. Accident LLC, Feb 2026). Pattern of platform-liability litigation growing.

**Note:** Continue positioning Parcel as neutral tool provider. Strengthen audit trails.

### N9. A2P 10DLC Full Blocking Active (Audit 02)

Carriers now blacklist (not just rate-limit) repeat violators. Hard-block SMS features until registration is verified.

### N10. Report Visual Benchmarks Missing (Audit 04, Gap 5)

No screenshots or descriptions of competitor report outputs (DealCheck, FlipperForce, Stessa). Needed during design phase, not Blueprint.

### N11. Collaboration Model Gaps (Audit 04, Gap 4)

Client-facing sharing UX, JV deal structures, VA granularity, CPA access -- all need specification. Resolvable during Blueprint by integrating reports 25, 28, and 29.

### N12. PostgreSQL on Railway Fully Verified (Audit 05)

pgvector, PostGIS, pg_cron all available. Pre-built HA template bundles them. No changes needed.

### N13. Embedding Pricing Stable (Audit 05)

OpenAI text-embedding-3-small still $0.02/MTok. Cheaper alternatives exist (Mistral $0.01/MTok). Ollama viable for dev, not production at scale.

---

## Verdict

### Is the research foundation solid enough to produce the Product Blueprint?

## YES -- with 5 pre-conditions

The 29 research reports, 8 persona documents, and SAD artifacts form a comprehensive foundation. The competitive moat (creative finance tooling) is verified as wide open. The technical stack is validated. Vendor costs are stable. Legal landscape has no blockers.

**However, these 5 items must be resolved before or during Blueprint creation:**

1. **Write an API failure mode matrix** (~1-2 pages) mapping Bricked/RentCast failure scenarios to user-facing UX responses
2. **Define onboarding mechanics** in the Blueprint (not just branching logic -- empty states, activation criteria, progressive disclosure)
3. **Define spreadsheet migration strategy** (template-first approach or actual spreadsheet pattern research)
4. **Reconcile pricing/tier naming** across all documents to a single canonical scheme
5. **Create a unified roadmap** mapping persona waves to Blueprint phases with solo-developer time estimates

Items 1 and 3 require ~2 hours of focused work each. Items 4 and 5 require ~1 hour each. Item 2 is addressed within the Blueprint itself. Total pre-work: ~6 hours.

The 14 FIXES should be applied during Blueprint creation. The 13 NOTES should be acknowledged in the Blueprint and resolved during design/implementation.

---

*Generated from 5 parallel audit agents. Source reports: 01-competitor-verification.md, 02-legal-compliance-update.md, 03-internal-consistency.md, 04-research-gaps.md, 05-technical-stack-verification.md*
