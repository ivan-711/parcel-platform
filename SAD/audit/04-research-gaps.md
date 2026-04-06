# Research Gap Analysis

**Date:** 2026-04-02
**Purpose:** Identify missing, shallow, or misaligned research before Product Blueprint creation
**Inputs:** All persona documents (01-08 + synthesis), Master Research Synthesis, Reports 16-29

---

## 1. Missing Topics Not Covered by Any Research Report

**Severity: BLOCKER**

The following topics are entirely absent from the 29 research reports and would be needed by a Product Blueprint:

### 1a. Onboarding flow mechanics beyond branching

The persona synthesis (section 3) defines onboarding *branching* — which path each persona takes. But no research document covers:

- Progressive disclosure sequencing (what shows on screen 1, 2, 3)
- Empty-state design for each module (pipeline with no deals, portfolio with no properties)
- Sample data lifecycle (when does demo data get removed? Can users delete it? Does it persist?)
- Onboarding completion criteria (what constitutes "activated" for analytics purposes?)
- Re-onboarding for users who abandon mid-flow and return days later
- Onboarding for users who do not fit any of the 8 branches (e.g., land investors, note buyers, mobile home investors)

**What is needed:** A dedicated onboarding UX research doc or a section in the Product Blueprint that defines the mechanics, not just the branching logic.

**Blocks Blueprint?** Yes — the Blueprint must define activation flows, and the current research only defines which door users walk through, not what they experience inside.

### 1b. Error handling and failure UX strategy

No research document addresses:

- What users see when API calls fail (Bricked, RentCast, skip trace providers)
- How partial data responses are presented (e.g., property found but no rent estimate available)
- Retry behavior and user communication during outages
- Form validation patterns and error messaging philosophy
- Rate limiting UX (what happens when a user exhausts API quotas mid-session?)
- Calculation edge cases (division by zero, negative cash flow display, NaN results)

**What is needed:** A platform-wide error handling and graceful degradation strategy.

**Blocks Blueprint?** No — can be resolved during Blueprint creation as a cross-cutting UX principle, but should be flagged as a required section.

### 1c. Offline and poor-connectivity behavior

Report 14 (mobile/iOS) and report 24 (notification/mobile) discuss mobile strategy but neither addresses:

- What happens when a user opens Parcel with no connectivity (field visits, rural properties)
- Whether any data should be cached locally for offline viewing
- Whether D4D (Wave 7) needs offline photo/note capture
- Sync conflict resolution if a user edits offline and online data has changed

**What is needed:** A statement of offline scope — even if the answer is "Parcel requires connectivity and does not support offline mode in v1."

**Blocks Blueprint?** No — can be resolved with a scoping decision during Blueprint creation.

### 1d. Data migration from spreadsheets — actual format research

Report 27 covers migration from *competing tools* (REsimpli, Follow Up Boss, DealMachine, Stessa) but does not address the most common migration source for 5 of 8 personas: **personal spreadsheets and Google Sheets.**

Missing:

- Common spreadsheet structures investors actually use (column patterns for deal logs, rent rolls, expense trackers)
- How to detect and map freeform spreadsheet layouts
- Whether Parcel should offer a spreadsheet template that users fill before import
- How to handle formula-dependent cells (e.g., Carlos's 23-tab workbook with cross-references)

Marcus, Ray, Angela, Carlos, and Tamara all use spreadsheets as primary tools. This is likely the highest-volume migration path.

**What is needed:** Research on actual investor spreadsheet patterns, or a pragmatic "template-first" migration strategy.

**Blocks Blueprint?** Yes — the Blueprint needs to specify the import experience, and spreadsheets are the dominant source for 5/8 personas.

### 1e. Legal/compliance for generated documents

Report 11 covers legal compliance for communications (TCPA, CAN-SPAM, fair housing). No report addresses:

- Whether AI-generated deal analyses carry disclaimer requirements
- Whether branded reports need specific disclosures (e.g., "not an appraisal," "not financial advice")
- Assignment contract generation legality by state (varies significantly)
- Whether Parcel-generated buyer marketing materials need fair housing compliance language
- Liability implications of AI narration that users rely on for investment decisions

**What is needed:** A legal review of generated/exported content, distinct from communications compliance.

**Blocks Blueprint?** No — can be resolved in parallel, but the Blueprint should include placeholder disclaimer requirements.

---

## 2. Dispositions / Buyer Workflow (Report 26) — Depth Assessment

**Severity: SIGNIFICANT**

Report 26 is strong on the strategic case and the BuyerProfile data model. It correctly identifies the build sequence (internal buyer CRM before marketplace). However, several operational details are missing:

### What is covered well
- BuyerProfile schema and buy-box fields
- Rules-based match scoring concept
- Disposition pipeline stages
- Buyer interaction history tracking
- Buyer-facing deal packets concept

### What is missing

**2a. Buyer matching algorithm specifics**
The report says "rules-based matching is enough" but does not define:
- Weighting between match criteria (is geography more important than price range?)
- Partial match handling (buyer wants SFR, property is duplex — score 0 or partial?)
- Match threshold for inclusion in "top buyers" vs. "near matches"
- How match scores evolve with buyer behavior data over time

**2b. Assignment contract generation**
The report does not address:
- Whether Parcel should generate assignment contracts or link to DocuSign/external signing
- State-specific assignment contract variations
- Double-close workflow support (when assignment is not possible or not desirable)
- EMD (earnest money deposit) tracking on the disposition side
- Title company coordination workflow

**2c. Buyer list management operations**
Missing details on:
- Bulk buyer import from spreadsheets (Desiree has 187 buyers in Google Sheets)
- Buyer list segmentation beyond buy-box (e.g., VIP buyers, first-time buyers, problematic buyers)
- Buyer communication preferences (some prefer text, others email, some want property photos)
- Buyer "do not contact" / opt-out handling
- Buyer entity vs. individual tracking (many buyers buy through LLCs)

**2d. Double-close workflows**
Not mentioned at all. Double closes are common when:
- Assignment fees are too large to disclose
- The contract prohibits assignment
- The investor wants to maintain seller/buyer confidentiality

This is a real operational workflow for Desiree and Tamara.

**Blocks Blueprint?** No — the strategic direction is clear. Algorithmic details and contract workflows can be specified during Blueprint creation, but double-close support should be scoped as in/out.

---

## 3. Import / Migration Strategy (Report 27) — Depth Assessment

**Severity: SIGNIFICANT**

Report 27 covers the migration philosophy well (phased, context-preserving, progressive displacement). It correctly identifies migration playbooks by source tool. However:

### What is missing

**3a. Actual export formats of target competitors**
The report does not document:
- REsimpli CSV export columns (what fields are available, what field names are used)
- PropStream export format and field mapping
- DealCheck export capabilities and limitations
- Stessa transaction export format (CSV/QIF/QFX/OFX column structures)
- Whether any of these tools have API-based export (vs. manual CSV download only)

This matters because migration playbooks require knowing what data is actually available to import, not just what Parcel would like to receive.

**3b. CSV column mapping specifics**
The report recommends field mapping preview and validation but does not specify:
- Auto-detection patterns for common column names (e.g., "Property Address" vs. "Address" vs. "Street")
- Required vs. optional fields for each import type
- Maximum file size and row count limits
- Character encoding handling (UTF-8, Excel ANSI exports)
- Date format detection (MM/DD/YYYY vs. YYYY-MM-DD vs. text dates)

**3c. Data loss risk assessment**
The report says "preserve unmapped data" but does not assess:
- Which specific data is at highest risk of loss during each migration path
- Whether users should be warned about specific data that cannot migrate (e.g., call recordings, voicemail logs)
- Post-migration validation — how does a user confirm the import worked correctly?
- Rollback capability — can a user undo a bad import?

**Blocks Blueprint?** No — the strategic direction is sound. Detailed column mappings can be documented during implementation, but the Blueprint should specify the import UX flow and error handling.

---

## 4. Collaboration / Permissions Model (Report 28) — Persona Coverage Assessment

**Severity: SIGNIFICANT**

Report 28 covers Tamara, James, and Desiree well. The role preset model (Owner / Admin / Analyst / Assistant / Viewer) is reasonable. However:

### What is missing

**4a. James sharing reports with clients — not addressed as a collaboration pattern**
The report correctly separates internal seats from external sharing. But James's core use case — sending branded analyses to investor clients who are NOT Parcel users — is not detailed:
- Can James's client click a share link and interact with the report without a Parcel account?
- Does the client see a "Powered by Parcel" CTA that invites them to sign up?
- Can James track which clients opened which reports from within his CRM?
- Can James create a "client workspace" or "client portal" view that aggregates all reports sent to one client?

Report 25 (agent referral loop) and report 29 (report system) partially cover this, but report 28 does not integrate those patterns into the permissions model. The collaboration model needs to explicitly address the authenticated-viewer vs. unauthenticated-viewer distinction.

**4b. Partnership structures**
Not addressed:
- Two investors co-investing on a property (e.g., Carlos + a mentee doing a JV deal)
- Shared property records between separate Parcel accounts
- Revenue/expense split tracking for co-owned properties
- How a mentor (Carlos) grants a mentee temporary access to review a deal without sharing their entire portfolio

**4c. VA access levels — granularity gap**
The Assistant/VA role is described at a high level but real VA workflows need more specificity:
- Can a VA see financial details (purchase price, mortgage balance, rent amounts)?
- Can a VA run skip traces (which cost money)?
- Can a VA send SMS campaigns (which cost money and carry compliance risk)?
- Can a VA import/export data?
- Task-only access pattern: VA can only see and update assigned tasks, nothing else

**4d. Accountant/CPA access**
Not mentioned. Angela and Tamara both reference CPA interactions:
- Read-only access to financial transactions and tax reports
- Time-limited access (e.g., tax season only)
- Export permissions for CPA use

**Blocks Blueprint?** No — the role framework is solid enough to proceed. Client-facing sharing should be resolved by integrating reports 25, 28, and 29 during Blueprint creation.

---

## 5. Report / Deliverable System (Report 29) — Competitive Examples Assessment

**Severity: MINOR**

Report 29 is strategically strong. It correctly identifies report families, audience modes, and engagement tracking. However:

### What is missing

**5a. No screenshots or concrete visual descriptions of competitor report outputs**
The report references DealCheck, FlipperForce, Stessa, and Homebot reports but does not include:
- Descriptions of what a DealCheck PDF report actually contains (sections, layout, data density)
- Visual benchmarks for what "professional" looks like in this market
- Typography, color, and density patterns across competitors
- What a FlipperForce "investment packet" vs. "estimate report" vs. "scope-of-work report" actually contains
- What Stessa's SREO and Rent Roll reports look like

This matters because the Blueprint will need to spec report layouts, and there are no visual benchmarks in the research.

**5b. Report performance constraints**
Not addressed:
- PDF generation time expectations (current Parcel PDF generation already exists — what is acceptable?)
- Maximum report length / page count
- Image/chart rendering in PDF vs. web
- Print-friendliness requirements (some lenders print reports)

**Blocks Blueprint?** No — this is a design-phase concern. The Blueprint can define report families and content requirements without visual benchmarks, but the design phase will need competitor visual research.

---

## 6. Address-to-Analysis (Report 16) — API Failure Mode Assessment

**Severity: BLOCKER**

Report 16 is excellent on the provider landscape, the two-stage analysis flow, and the confidence framework. However, it has a critical gap:

### What is missing

**6a. Bricked API failure modes and fallback UX**
The master synthesis (section 5) identifies Bricked vendor risk as "High" and outlines a technical fallback plan (switch to HouseCanary, then ATTOM, then in-house). But neither report 16 nor the master synthesis addresses:

- **What does the user see when Bricked is down?** The two-stage flow (Stage A: RentCast snapshot, Stage B: Bricked full underwrite) means Stage A can succeed while Stage B fails. The user experience for this scenario is undefined.
- **Partial Bricked responses.** What if Bricked returns property data but no comps? Or comps but no repair estimate? The report defines confidence tiers for auto-filled data but not for partial API responses.
- **Bricked timeout handling.** The report cites "17-second average time to comp." What is the P99? What timeout should Parcel set? What does the user see during the wait?
- **RentCast failure.** If Stage A (RentCast) also fails, does the user get a blank form? An error? A degraded experience with manual-only entry?
- **Graceful degradation UX.** No mockup or description of what the "analysis with incomplete data" state looks like. The confidence labels ("Imported from records," "Estimated," "Needs confirmation," "Missing — add manually") are defined but not mapped to specific failure scenarios.
- **Cost implications of fallback.** If Bricked is unavailable and Parcel falls back to HouseCanary at $0.40-6.00/call, that is 10-60x more expensive per call. Is that sustainable? Does it trigger a different user experience?

**What is needed:** A failure mode matrix mapping each provider failure scenario to a specific user-facing experience and a cost model for fallback providers.

**Blocks Blueprint?** Yes — the address-to-analysis flow is the core activation experience. The Blueprint must define what happens when it partially or fully fails, because that experience will occur for real users.

---

## 7. Persona Activation Timing — Wave Alignment Assessment

**Severity: SIGNIFICANT**

The persona synthesis defines activation features and the Feature Demand Heatmap assigns waves. This section cross-references whether each primary persona can reach their "aha moment" in the wave that delivers their activation feature.

| Persona | Activation Feature | Wave | Achievable? | Notes |
|---|---|---|---|---|
| **Marcus** | AI deal narration (flood zone catch) | Wave 1 | Yes | Requires AI narration + address-to-analysis. Both Wave 1. No dependency gap. |
| **Desiree** | Multi-strategy comparison (keep vs. assign) | Wave 1 | Partially | Multi-strategy comparison is Wave 1, but Desiree's *full* activation also needs CRM/pipeline (Wave 1) and buyer disposition workflow. Dispositions are not assigned to any wave in the heatmap. This is a gap. |
| **Ray** | Portfolio dashboard (multi-flip budget view) | Wave 1 | Partially | Portfolio dashboard is Wave 1, but Ray's aha moment requires rehab tracker data feeding into it. Rehab tracker is Wave 1 but listed as MUST HAVE only for Ray. If rehab tracker ships late in Wave 1, the portfolio dashboard shows empty flip data. Sequencing within Wave 1 matters. |
| **Angela** | Portfolio dashboard (all units in one view) | Wave 1 | Yes | Portfolio dashboard Wave 1 + property detail pages Wave 1. Her data is simpler (addresses, rents, mortgages). No dependency gap. |
| **Kyle** | Creative finance calculator (sub-to modeling) | Wave 2 | Yes, but deferred value | Creative finance calculators are Wave 2. Kyle is explicitly labeled a "Future Persona" and his 3 STR-specific MUST HAVEs do not exist yet. His activation in Wave 2 is on creative finance, not STR — which is honest but limited. |
| **Carlos** | Creative finance monitoring (obligation alerts) | Wave 2 | Yes | Creative finance monitoring is Wave 2. No dependency on earlier waves beyond basic property/portfolio infrastructure from Wave 1. |
| **Tamara** | Multi-strategy comparison (3-exit analysis) | Wave 1 | Yes | Multi-strategy comparison is Wave 1. She also needs CRM and pipeline (Wave 1). Full value grows in Wave 2 when creative finance is added. |
| **James** | Branded PDF report (client deliverable) | Wave 1 | Yes | Branded PDF reports are Wave 1. Requires calculators (Wave 0/1) + report generation + brand kit. All Wave 1. |

### Gaps identified

**7a. Desiree's disposition workflow has no wave assignment.**
Dispositions (buyer CRM, match scoring, buyer blasts, disposition pipeline) are discussed in report 26 but are not present in the Feature Demand Heatmap's wave assignments. Desiree's full activation requires this. Without it, she can analyze deals but cannot efficiently close them — which is her primary revenue-generating activity.

**7b. Intra-wave sequencing is not defined.**
Wave 1 contains at least 12 features. The build order within Wave 1 determines whether personas like Ray (who needs rehab tracker before portfolio dashboard makes sense) actually get activated early or late in the wave.

**Blocks Blueprint?** Yes — the Blueprint must assign dispositions to a wave, and should define intra-wave sequencing for Wave 1 to ensure activation features ship in dependency order.

---

## 8. MUST HAVE Feature Timing — Cross-Reference Assessment

**Severity: SIGNIFICANT**

This section checks whether any MUST HAVE feature for a primary persona is shipping too late.

### Features where timing is correct
- Calculators (Wave 0/1): MUST HAVE for 6 personas. Ships first. Correct.
- AI deal narration (Wave 1): MUST HAVE for 4 personas. Ships early. Correct.
- Pipeline/Kanban (Wave 1): MUST HAVE for 4 personas. Ships early. Correct.
- Property detail pages (Wave 1): MUST HAVE for 4 personas. Ships early. Correct.
- Creative finance calculators (Wave 2): MUST HAVE for 3 personas. Ships in Wave 2. Correct — Carlos and Kyle are not Wave 1 activation targets.
- Creative finance monitoring (Wave 2): MUST HAVE for 2 personas. Ships in Wave 2. Correct.

### Features where timing is potentially problematic

**8a. SMS/Email comms — Wave 4, but MUST HAVE for Desiree**
SMS is the primary lead-engagement channel for Desiree. She currently spends $150/mo on Launch Control for this capability. It is rated MUST HAVE for her. It does not ship until Wave 4.

Risk: Desiree converts to Pro in 5-7 days on the strength of multi-strategy comparison and CRM. But she cannot fully replace her stack until Wave 4 delivers SMS. This means she runs Parcel + Launch Control in parallel for potentially months, which creates friction and churn risk.

Mitigation options:
- Accept this as a known limitation and position Parcel as "analysis + CRM first, comms later"
- Move SMS to Wave 2 or 3 for Desiree's segment
- Build a Zapier/webhook integration to Launch Control as a bridge

**8b. Skip tracing — Wave 5, but MUST HAVE for Desiree**
Skip tracing is rated MUST HAVE for Desiree. It does not ship until Wave 5. She currently uses REsimpli and batch services for this. Without skip tracing, Desiree cannot fully replace REsimpli.

Same pattern as SMS: Parcel handles analysis and pipeline but forces Desiree to keep paying for REsimpli's operational features. This is acknowledged in the persona synthesis but worth flagging as a revenue risk — Desiree may not pay $79/mo for Parcel on top of $149/mo for REsimpli if the overlap is insufficient.

**8c. Dispositions — no wave assignment, but operationally MUST HAVE for Desiree**
As noted in gap 7a, dispositions have no wave assignment despite being the mechanism by which Desiree actually earns money. The Feature Demand Heatmap does not include "Dispositions" as a row item at all, even though report 26 was written specifically because this was identified as a gap.

**Blocks Blueprint?** Partially — the Blueprint should explicitly address Desiree's stack-replacement timeline and either accelerate SMS/skip trace or document the parallel-run expectation. Dispositions must be assigned to a wave.

---

## 9. Edge Cases Not Covered by Any Persona

**Severity: MINOR**

The 8 personas cover the mainstream investor archetypes well. However, several real-world user scenarios fall outside their coverage:

### 9a. Inherited properties
None of the personas acquired property through inheritance. Inherited properties have unique characteristics:
- No purchase price (cost basis is fair market value at date of death)
- Stepped-up basis affects capital gains calculations differently
- May have deferred maintenance from elderly owner
- Often involves probate, which affects timeline and legal requirements
- The user may not be an "investor" in the traditional sense — they are deciding what to do with a property they received

This affects calculator inputs (what is the "purchase price" for an inherited property?) and AI narration (the system should not assume a traditional acquisition).

### 9b. Tax lien and tax deed purchases
None of the personas pursue tax lien or tax deed strategies. These are common entry points for investors in many states:
- Purchase mechanics differ from traditional acquisition (auction, redemption periods)
- Due diligence differs (title issues, occupant status, property condition uncertainty)
- Calculator assumptions differ (no traditional financing, uncertain rehab scope)

### 9c. Land-only and vacant lot deals
All personas focus on improved properties (houses, duplexes, etc.). Land investing is a distinct strategy with:
- No rent income, no comps based on improvements
- Value driven by zoning, entitlements, and development potential
- Different calculator needs (no CapEx, no vacancy, no rent estimates)
- Often financed via seller financing (overlap with Carlos's strategy)

### 9d. Mobile home and manufactured housing investments
Not addressed by any persona. This is a growing niche with:
- Different financing rules (chattel vs. real property)
- Different depreciation schedules
- Park-owned vs. lot-owned distinctions
- Lower price points that attract beginners like Marcus

### 9e. Commercial/multi-family (5+ units)
All personas focus on 1-4 unit residential. The jump to 5+ units involves:
- Commercial underwriting (DSCR-based, not personal DTI)
- Different valuation methods (income approach, not comps)
- Different financing (commercial loans, syndication)
- Different calculator requirements

### 9f. Out-of-state investing
Marcus, Angela, and Kyle are described as investing in or near their home market. Many investors (especially beginners influenced by BiggerPockets) invest out-of-state. This affects:
- Market data requirements (user needs data for unfamiliar markets)
- Property management assumptions (self-manage is not feasible)
- Trust in AI analysis (user cannot drive by the property)

**What is needed:** Not full personas for each edge case, but acknowledgment in the Blueprint of which scenarios the v1 product explicitly does or does not support, and what calculator/UX guardrails are needed for common edge cases.

**Blocks Blueprint?** No — these can be handled as scoping decisions. The Blueprint should include an "explicitly out of scope for v1" section that names these scenarios.

---

## Summary Table

| # | Gap | Severity | Blocks Blueprint? | Resolution Path |
|---|---|---|---|---|
| 1a | Onboarding flow mechanics | BLOCKER | Yes | Define activation criteria, empty states, re-onboarding in Blueprint |
| 1b | Error handling strategy | MINOR | No | Define as cross-cutting UX principle during Blueprint |
| 1c | Offline behavior | MINOR | No | Scoping decision during Blueprint |
| 1d | Spreadsheet migration formats | BLOCKER | Yes | Research investor spreadsheet patterns or define template-first strategy |
| 1e | Legal compliance for generated content | MINOR | No | Parallel legal review; Blueprint includes placeholder disclaimers |
| 2 | Dispositions depth (buyer matching, contracts, double-close) | SIGNIFICANT | No | Specify during Blueprint; strategic direction is clear |
| 3 | Import format specifics (competitor CSV columns, mapping) | SIGNIFICANT | No | Document during implementation; Blueprint defines UX flow |
| 4 | Collaboration gaps (client sharing, JV, VA granularity, CPA) | SIGNIFICANT | No | Integrate reports 25, 28, 29 during Blueprint |
| 5 | Report visual benchmarks | MINOR | No | Design-phase research; Blueprint defines content requirements |
| 6 | API failure modes and fallback UX | BLOCKER | Yes | Failure mode matrix required before Blueprint finalizes address-to-analysis flow |
| 7a | Dispositions not assigned to a wave | SIGNIFICANT | Yes | Assign to wave during Blueprint |
| 7b | Intra-wave sequencing undefined | SIGNIFICANT | Yes | Define dependency order within Wave 1 during Blueprint |
| 8a | SMS ships Wave 4, MUST HAVE for Desiree | SIGNIFICANT | Partially | Document parallel-run expectation or accelerate |
| 8b | Skip tracing ships Wave 5, MUST HAVE for Desiree | SIGNIFICANT | Partially | Document parallel-run expectation or accelerate |
| 8c | Dispositions unscheduled, MUST HAVE for Desiree | SIGNIFICANT | Yes | Assign to wave |
| 9 | Edge cases (inherited, tax lien, land, mobile home, commercial, out-of-state) | MINOR | No | Scoping decisions in Blueprint "out of scope" section |

### BLOCKER count: 3
1. Onboarding flow mechanics (1a)
2. Spreadsheet migration research (1d)
3. API failure mode matrix (6)

### Items that must be resolved DURING Blueprint creation: 8
All SIGNIFICANT items can be resolved during Blueprint creation without additional standalone research, using the existing reports as foundation.

### Items that can wait until design/implementation: 6
All MINOR items are deferrable.

---

*This audit covers the 29 research reports, 8 persona documents, and the persona synthesis. It does not audit reports 01-15 in depth, as those were synthesized into the Master Research Synthesis and are not the focus of this gap analysis.*
