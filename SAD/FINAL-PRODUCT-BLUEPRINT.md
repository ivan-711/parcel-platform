# FINAL PRODUCT BLUEPRINT — Parcel

**Date:** 2026-04-02
**Status:** Canonical source of truth for all Parcel development
**Inputs reconciled:** Codex Blueprint, Codex Pressure Test, 5 audit reports, IA review, persona synthesis, 29 research reports, locked design-session decisions

---

## 1. Product Definition

### What Parcel Is

Parcel is the operating system for real estate investors. It connects the stages that are currently fragmented across 3-7 tools: find an opportunity, analyze it across strategies, move it through acquisition, track the property after close, monitor obligations and risk, and generate reports that build trust.

Parcel is strongest at the seams between stages:

- analysis → pipeline
- pipeline → property
- property → portfolio
- portfolio → obligations
- report → action → referral

### Core Promise

**Enter an address, get a real analysis in under 60 seconds, and keep moving without re-entering data everywhere else.**

The extended promise: Parcel stays useful after the initial analysis because it knows the property, the deal, the people, the obligations, and the next action.

### Competitive Position

Competitors each own one stage. DealCheck owns analysis. REsimpli owns wholesaler CRM. DealMachine owns field capture. Stessa owns portfolio-lite. FlipperForce owns rehab execution. No one connects stages without forcing the user to rebuild context, and no one has built purpose-built creative finance tooling.

As of April 2026, the creative finance gap is verified wide open. REsimpli blogs about creative finance but has zero specialized tooling. Smart Bricks (a16z-backed, $5M pre-seed, Feb 2026) is the most credible new threat but targets institutional investors, not the SMB creative finance segment.

### What Parcel Is Not

These are strategic boundary decisions, not temporary gaps:

- Not a tenant portal, rent-processing platform, or maintenance ticketing system
- Not a full property management accounting suite or loan servicer
- Not a public investor marketplace or social network
- Not an MLS browsing portal or white-label brokerage tool
- Not a generic AI chatbot wrapped around real estate math
- Not a wholesaler-only CRM

### AI Identity

AI is the analytical voice of the platform. It speaks as a confident analyst: "The data shows this is high-risk — the underlying mortgage balance leaves only 8% equity cushion" — not as a financial advisor: "You should not buy this."

AI adapts depth by user experience level:
- **Beginners (Marcus):** Explanations woven into analysis — "CapEx at 5% means you're setting aside $X/month for major repairs like roof, HVAC, and plumbing. For a 1965 build, some investors use 7-8%."
- **Experienced (Carlos, Tamara):** Terse insights — "CapEx 5% is low for 1965 build. Flagged."

AI is embedded into Analyze, Today, Property, Deal, Report, Obligation, and Rehab surfaces. It is globally summonable from anywhere. The Chat page persists as a secondary drill-down surface, not the primary AI experience.

### Why Users Switch

| Persona | Switch Trigger |
|---------|---------------|
| Carlos | Real creative-finance monitoring — no other tool does this |
| Desiree | Keep-vs-assign comparison + less data re-entry across tools |
| Tamara | Multi-strategy continuity and consolidated oversight |
| James | Branded reports that differentiate him from every other agent |
| Angela | Portfolio intelligence without 4 disconnected tools |
| Ray | Multi-flip budget view that replaces the spreadsheet |

### Why Users Stay

Parcel becomes the system that knows the property, the deal history, the assumptions, the people, the obligations coming due, and the reports sent. Retention comes from operational continuity, not feature novelty.

### Business Model

- **Pricing:** Free / Plus ($29) / Pro ($79) / Business ($149)
- **Usage add-ons:** Comps (Bricked API), skip traces (BatchData), direct mail (Lob), SMS (Twilio)
- **Blended ARPU:** ~$76/mo direct subscription, ~$85/mo including referral value
- **Target:** Profitable solo-founder SaaS, clean enough to sell
- **Geography:** US only

---

## 2. Persona Prioritization

### Priority Order (locked)

| # | Persona | Role | Why This Priority |
|---|---------|------|-------------------|
| 1 | **Carlos** | Creative Finance Investor | Blue ocean moat persona. Fastest converter (2-7 days). If Parcel fails Carlos, the moat is fake. His operational needs force Parcel to build obligations, monitoring, and exception handling correctly. |
| 2 | **Desiree** | Solo Wholesaler | Largest market segment, highest tool spend to displace ($472-522/mo). Tests whether Parcel can replace real daily workflows. If Parcel feels slow to Desiree, it fails everyone. |
| 3 | **Tamara** | Hybrid Investor | Multi-strategy validation persona. Exercises the OS thesis honestly across all 5 strategies. Prevents the product from collapsing into a wholesaler CRM. If Parcel works for Tamara, it works for everyone. |
| 4 | **James** | RE Agent Serving Investors | Distribution persona. Validates branded reports. Each James account drives 3-5 client sign-ups within 90 days. Reports become product demos disguised as deliverables. |
| 5 | **Angela** | Buy-and-Hold Landlord | Steady, low-churn portfolio intelligence user. Validates portfolio-lite discipline and price sensitivity. |
| 6 | **Ray** | House Flipper | Rehab tracker value prop. Validates field updates and multi-project execution. |
| 7 | **Marcus** | Complete Beginner | Volume acquisition, long conversion path. Useful for onboarding and AI explanation calibration. Should not define platform shape. |
| 8 | **Kyle** | STR/Airbnb Investor | FUTURE persona. Flag in schema, do not build for. STR-specific needs create a separate rabbit hole. |

### Distortion Risks

Codex correctly identifies that overweighting any single persona warps the product:

- **Desiree overweighted** → product becomes another wholesaler CRM (the REsimpli trap)
- **Angela overweighted** → product drifts into landlord operations (the Stessa trap)
- **James overweighted** → product over-rotates into white-label and client-service features too early
- **Marcus overweighted** → app becomes tutorial-first instead of operator-first

The locked ordering puts Carlos first specifically to prevent these distortions. Creative finance is the moat; operational breadth is the platform.

### Growth Channel Personas

Carlos and James are growth engines, not just users:

- **Carlos:** Mentors 4-5 investors, active in SubTo/Pace Morby communities. Est. 8-12 Pro referrals in Year 1. Effective 24-month LTV including referrals: ~$12,000.
- **James:** Serves 8-12 investor clients. Every branded report is a Parcel product demo. Est. 3-5 client sign-ups within 90 days. Effective ARPU including referrals: ~$179/mo.

---

## 3. Canonical Domain Model

### Design Principle

**Property is the durable root. Everything else attaches to it.**

The current codebase is deal-centric — `Deal` stores property identity, underwriting assumptions, and computed results in JSONB blobs. The pressure test is clear: this must change before the platform can become an operating system. The first structural move is Property → AnalysisScenario separation, then Deal refactoring.

### Entity Table

| Entity | First-Class? | Purpose | Lifecycle Rule |
|--------|-------------|---------|----------------|
| **Property** | Yes | Canonical asset/location record | Exists before, during, and after deals. Can have multiple deals over time. The durable identity. |
| **Deal** | Yes | Acquisition, disposition, or negotiation record | Multiple deals per property over time. A deal can die while the property persists. Not the permanent home of the asset. |
| **AnalysisScenario** | Yes | One strategy-specific underwriting case | Many scenarios per property or deal. Snapshots of reasoning, not the property itself. Immutable once saved; create new scenario to revise. |
| **Contact** | Yes | Universal person/entity record (seller, buyer, lender, contractor, agent, partner, tenant) | One contact plays many roles. Not strategy-specific. |
| **BuyerProfile** | Yes | Buy-box extension of a Contact | Markets, strategies, price range, asset type, rehab tolerance, proof-of-funds, disposition history. Buyers are not just contacts with tags. |
| **Task** | Yes | Action item attachable to any entity | Polymorphic: can attach to property, deal, contact, obligation, rehab, or report. Surfaced in Today. Assignable (team-ready). |
| **FinancingInstrument** | Yes | Mortgage, seller note, wrap, sub-to underlying loan, lease-option instrument | Persistent with own terms. Generates obligations. Multiple instruments per property. |
| **Obligation** | Yes | Scheduled or exception-driven requirement | Payments, balloon dates, insurance renewals, tax due dates, verification tasks. Must be independently queryable across portfolio — Carlos cannot open each deal to see what's due. |
| **Transaction** | Yes | Actual financial event | Purchase costs, rehab draws, rent inflows, debt payments, insurance, taxes, assignment fees. Parcel tracks investor-relevant events, not double-entry accounting. |
| **Lease** | Yes | Occupancy and rent obligation record | Start, end, rent amount, renewal status, vacancy timing. Parcel tracks timing and performance, not resident operations. |
| **RehabProject** | Yes | Execution layer for flip/BRRRR work | Budget vs. actual, scope categories, timeline, blockers, photos. Lives at property level. |
| **Communication** | Yes | Call, text, email, meeting log | Must not be buried as notes. Linked to contacts, deals, properties. Logged from Wave 0 schema, active sending from Wave 4. |
| **Document** | Yes | Uploaded or generated file/artifact | Links to property, deal, rehab, obligation, lease, or report. Supports AI extraction and RAG. |
| **Report** | Yes | Generated internal or external deliverable | Link-first, PDF-second. Stores audience, brand context, share-link state, engagement metrics. First-class trackable records. |

### Relationship Hierarchy

```
Property (root)
├── Deal[] (acquisition/disposition attempts)
│   └── AnalysisScenario[] (strategy-specific underwriting)
├── FinancingInstrument[] (loans, notes, wraps)
│   └── Obligation[] (payments, balloons, insurance, verification)
├── Lease[] (occupancy, rent, renewal)
├── RehabProject[] (budget, scope, timeline)
├── Transaction[] (financial events)
├── Document[] (files, extracted artifacts)
├── Report[] (deliverables)
├── Task[] (action items — also attachable to Deal, Contact, etc.)
└── Communication[] (logs — also linked to Contact, Deal)

Contact (relationship layer)
├── BuyerProfile (optional buy-box extension)
├── Deal[] (as party: seller, buyer, agent, etc.)
├── Communication[]
└── Task[]
```

### Schema Foundation Rules

1. All tables include `team_id` foreign key and RLS from Wave 0. Team UI ships later.
2. Each module has its own Alembic migration file, FastAPI router, and React lazy-loaded bundle.
3. Feature gating by tier + feature flag. Locked features show in UI with upgrade prompt — not hidden, not trial-once.
4. `created_by`, `updated_at`, `is_deleted` (soft delete) on all entities.

---

## 4. Core Operating Journeys

### Journey 1: Address → Analysis → Save

**Entities:** Property, AnalysisScenario, Deal (optional)
**AI role:** Generates draft narrative with visible assumptions, flags risks, adapts explanation depth to user experience level
**Delivers in:** Wave 0-1

Flow:
1. User enters any US address
2. Parcel enriches via RentCast (Stage A: broad snapshot) and Bricked (Stage B: deeper underwriting) — data auto-fills with confidence labels
3. AI generates draft analysis with visible assumptions and risk flags
4. User confirms or edits critical inputs
5. System creates `Property` + one or more `AnalysisScenario` records
6. User chooses next action: save only, move to pipeline, create report, compare strategies

**Failure modes (resolves audit blocker B1):**
| Scenario | User Experience | Cost Impact |
|----------|----------------|-------------|
| Both APIs succeed | Full auto-fill, high-confidence analysis | Normal ($0.20-0.50/call) |
| RentCast succeeds, Bricked fails | Stage A data fills (property details, rent estimate). Stage B fields show "Estimated" or "Missing — add manually" labels. AI narrative acknowledges reduced confidence. | Reduced (RentCast only) |
| RentCast fails, Bricked succeeds | Bricked data fills underwriting fields. Missing basic property details prompt manual entry. | Normal |
| Both APIs fail | Manual entry form with AI assist. Banner: "Property data services temporarily unavailable. Enter details manually and I'll analyze them." All fields editable. | $0 |
| Bricked returns partial data | Fill what's available, label missing fields. AI adjusts confidence in narrative. | Normal |
| Bricked timeout (>30s) | Show progressive loading ("Pulling property data... Running comps..."). At 30s, offer "Continue with available data" option. | Normal |

Fallback provider priority: Bricked → HouseCanary → manual entry. Do not automatically fall back to HouseCanary at $0.40-6.00/call without user consent — show pricing and let them choose.

**Design rule:** This is the activation promise. Do not block it behind CRM setup, heavy forms, or account configuration. Under 60 seconds from address entry to AI-narrated analysis.

### Journey 2: Deal → Pipeline → Close

**Entities:** Deal, Property, Contact, Task, Communication, AnalysisScenario
**AI role:** Highlights risk and next actions inline. Surfaces stale deals and missing follow-ups in Today.
**Delivers in:** Wave 1

Flow:
1. User creates or promotes a deal from an analysis
2. Parcel attaches seller-side context, contacts, stage, and tasks
3. Communication, documents, and notes accrue on the deal
4. AI highlights risk and next actions inline
5. At close, Parcel resolves the deal and transitions the property to owned-asset state

**Design rule:** Pipeline is for transactions in motion. It is not the permanent home of the asset. Closed deals create or update Properties.

### Journey 3: Property → Portfolio → Obligations

**Entities:** Property, FinancingInstrument, Obligation, Lease, Transaction, RehabProject
**AI role:** Highlights refi windows, risk, underperformance, expiring events. Powers Today items for Carlos.
**Delivers in:** Wave 2 (creative finance layer) + Wave 1 (basic property/portfolio)

Flow:
1. Closed or owned property becomes an active asset record
2. User attaches financing instruments, lease data, rehab status, key transactions
3. Parcel derives obligations and monitoring events from instruments
4. Property contributes to portfolio views and Today
5. AI surfaces: balloon dates approaching, insurance renewals, underperforming assets, refi windows

**Design rule:** This is where Parcel becomes more than a CRM. This is the moat.

### Journey 4: Deal → Buyer Matching → Assign (Dispositions)

**Entities:** Deal, Property, BuyerProfile, Contact, Communication, Report
**AI role:** Ranks buyer matches, suggests blast list, tracks engagement
**Delivers in:** Wave 1 (basic contacts + buyer schema) + Wave 4 (buyer matching + disposition pipeline)

Flow:
1. A marketable deal enters disposition-ready state
2. Parcel matches the property against BuyerProfiles using rules-based scoring (geography > price range > strategy > asset type)
3. User blasts best-fit buyers with deal packet
4. Parcel tracks opens, replies, interest, offers, and pass reasons
5. Deal moves through disposition stages to assignment or double-close

**Scope decisions:**
- Assignment contract generation: OUT for v1. Link to DocuSign or manual upload.
- Double-close workflow: IN as a disposition pipeline stage, not a separate flow.
- Buyer import from spreadsheet: IN. Desiree has 187 buyers in Google Sheets.

### Journey 5: Today / Morning Briefing Loop

**Entities:** Task, Obligation, Deal, Property, Lease, RehabProject
**AI role:** Produces concise morning briefing prioritized by urgency and impact
**Delivers in:** Wave 1 (basic Today with tasks) + Wave 2 (obligation-powered Today)

Flow:
1. Parcel aggregates: due tasks, stale deals, active risks, upcoming lease events, rehab blockers, obligation exceptions
2. AI produces a morning briefing — severity-grouped, deep-linked to relevant entities
3. User triages: complete, snooze, or drill into each item
4. Completed items update the queue
5. Dashboard reflects health; Today reflects action

### Journey 6: Report → Share → Referral Loop

**Entities:** Report, Property, AnalysisScenario, Contact, Document
**AI role:** Generates narrative sections of reports, adapts language to audience
**Delivers in:** Wave 1 (basic reports + branded PDF) + Wave 3 (report families + engagement tracking)

Flow:
1. User generates a report from a scenario, property, portfolio, rehab, or obligation view
2. Parcel renders a link-first deliverable with optional branded PDF export
3. Recipient opens the report via share link — no Parcel account required
4. Parcel logs engagement (opened, time spent, forwarded)
5. Engagement feeds back into Today, contact history, and follow-up cues
6. James's recipients see subtle "Powered by Parcel" CTA

**Design rule:** Reports are communication surfaces, not passive exports. They are trackable product artifacts.

---

## 5. Information Architecture

### The Today vs Dashboard Decision

**Decision: Today is the default landing page. Dashboard is the orientation surface.**

Reasoning:
1. Codex recommends Today as default for active users. The IA review agrees that a collapsible Dashboard card is insufficient for Carlos-grade obligation monitoring.
2. The morning briefing needs a real action surface, not just a card on a health dashboard.
3. "Dashboard is orientation. Today is work." (Codex) This is the clearest framing.
4. Carlos's activation literally depends on seeing obligations consolidated in one operational view. A card cannot replace that.
5. For new users with no data, Today shows the onboarding CTA and sample deal — it is never empty.

**Implementation:**
- `Today` is the post-login landing page for all users
- `Dashboard` is accessible one click away — portfolio health, pipeline totals, trend views, strategic overview
- Morning briefing appears at the top of Today (actionable, severity-grouped) AND as a compact summary card on Dashboard (read-only overview)
- When nothing is urgent, Today collapses to a single-line "All clear" state with the quick-action bar prominent

### Desktop Sidebar

The locked decision specifies grouped sections with collapsible headers. The locked groups (DEALS, PEOPLE, OUTREACH, TOOLS) conflict with both Codex and the IA review, which argue the groupings are too acquisition-CRM-shaped. After reconciliation, here is the final sidebar using modified group names that better reflect the OS thesis while preserving the collapsible-header pattern:

```
HOME
  Today (default landing)
  Dashboard

DEALS
  Analyze
  Pipeline
  Properties

PEOPLE
  Contacts
  Buyers (ships with dispositions, Wave 4)
  Inbox

ASSETS
  Portfolio
  Obligations (ships Wave 2)
  Rehabs (ships Wave 1)
  Transactions (ships Wave 1)

OUTPUTS
  Reports
  Documents

OUTREACH (ships progressively Wave 4-6)
  Sequences
  Skip Tracing
  Mail Campaigns
  D4D (ships Wave 7)

─── bottom ───
Settings
Compliance
```

**Key decisions and why:**

1. **Properties under DEALS, not ASSETS.** Codex and IA review argue Properties should be top-level or under ASSETS. But Properties in the acquisition context is where users first encounter them — from an analysis or pipeline entry. Once a property is owned, it also appears in Portfolio (under ASSETS). Properties is the bridge between acquisition and ownership. Placing it under DEALS keeps the "find → analyze → track" flow intact while Portfolio serves the "own → monitor → report" flow.

2. **Obligations top-level under ASSETS.** The IA review is right: Carlos needs a portfolio-wide obligation view, not just a deal sub-page. Making it top-level under ASSETS (visible by default for users with creative finance onboarding branch) satisfies the moat persona.

3. **Transactions under ASSETS.** The audit found Transactions was missing from the Codex Blueprint sidebar entirely. Financial tracking per-deal is P0 in the master synthesis. It belongs here.

4. **HOME group added.** Neither Codex's nor Ivan's original grouping had a HOME section. Today and Dashboard need a home that is not DEALS.

5. **OUTPUTS added.** Reports and Documents are outward-facing artifacts, distinct from deal-management or asset-management. This matches Codex's recommendation.

6. **Progressive reveal.** Only shipped modules appear in the sidebar. Unshipped modules are not shown as "coming soon" dead ends. Upgrade prompts appear contextually within workflows when a user hits a gated feature.

**Where Codex had a point worth revisiting:** Codex recommended Chat/AI as a global assistant launcher (header or command bar), not a sidebar module. This is correct. AI should be a persistent floating entry point (keyboard shortcut + header icon), not a sidebar destination. The Chat page persists as a secondary surface accessible from the AI launcher, not from the sidebar.

### Mobile Bottom Tabs

**Pre-Wave 7 (no D4D):**
```
Today | Analyze | Pipeline | Chat | More
```

**Post-Wave 7 (D4D ships):**
```
Today | Analyze | Pipeline | D4D | More
```

Chat moves into More when D4D ships. The IA review argues against D4D as a universal tab because only ~35% of users (Desiree 15%, Tamara 10%, Ray 10%) actively use it. However, Ivan locked D4D in the mobile tabs post-Wave 7. The compromise: D4D is a bottom tab, but users who never use it can swap it for Chat or Properties via a one-time preference (future, not Wave 7).

**Global mobile behaviors:**
- Persistent AI assistant entry from any screen (floating icon, top-right)
- Floating action button: Add Property, Scan Document, Quick Analysis

### Module Gating Pattern

Three states (from IA review — this is sharper than Codex's recommendation):

- **Available:** Shipped and usable on the current plan
- **Locked:** Shipped, relevant to the current workflow, requires upgrade. Show contextual prompt with persona-appropriate copy.
- **Planned:** Not shipped. Do not put in nav. Use roadmap surfaces, empty states, or pricing-page comparisons.

Persona-specific upgrade prompt style:
- Marcus: Calm, explains why it matters now. No feature catalog walls.
- Angela: Lead with time saved and outcomes. Offer a short trial at the gate.
- Desiree/Ray/Tamara: Terse. Lead with workflow compression or revenue impact.
- Carlos: Named risk-control language. "Unlock subject-to monitoring" not "upgrade for advanced features."

---

## 6. Reconciled Build Order

### Wave 0: Schema Foundation (Weeks 1-3)

The pressure test is clear: Property and AnalysisScenario must exist before CRM or any other module. Wave 0 is expanded from 2 weeks to 3 to accommodate this structural prerequisite.

**Ships:**
- `Property` table with address identity, location (PostGIS), physical characteristics, lifecycle state
- `AnalysisScenario` table — split from Deal.inputs/outputs. Strategy type, assumption set, calculated outputs, risk flags, AI narrative, source confidence
- Refactor `Deal` into acquisition/transaction workflow object linked to Property (not replacing Property)
- `Contact` table (universal person/entity — schema only, no CRM UI yet)
- `Task` table (polymorphic attachment — schema only)
- `Communication` table (schema only — passive logging structure)
- `Transaction` table (schema only)
- `Report` table (schema only)
- Extract JSONB fields from Deal into typed columns on AnalysisScenario
- PostGIS extension enabled
- pgvector extension enabled
- RLS policies on all tables with `team_id`
- Tier/billing config updated: Free / Plus / Pro / Business at $29/$79/$149

**Does not ship:** UI changes (except billing label updates). This is a schema-only wave.

**Solo-dev estimate:** 3 weeks

### Wave 1: Core Platform (Weeks 4-8)

**Ships:**
- Address-first onboarding with Bricked + RentCast integration (PropertyDataService)
- Persona question at signup → pre-loaded sample deal → "Analyze your first deal" CTA
- Property detail pages (the first time users see properties as first-class records)
- AnalysisScenario UI — create, compare, revise scenarios for a property
- Pipeline continuity (deals linked to properties, closed deals create/update property records)
- Contact CRM — basic CRUD, link contacts to deals/properties, role tagging
- Today view — task aggregation, stale deal surfacing, onboarding items for new users
- Basic portfolio dashboard — owned properties with summary metrics
- AI deal narration embedded in analysis results (not just Chat page)
- Branded PDF reports (basic — property analysis + brand kit)
- RehabProject — basic budget vs. actual, scope categories, property-level attachment
- Transaction logging — manual entry for acquisition events
- Consent records for TCPA compliance
- RAG document chat (pgvector-powered, leveraging existing document ingestion)

**Persona activation delivered:**
- Marcus: AI catches a risk he'd miss (flood zone, high CapEx) ✓
- Tamara: Multi-strategy comparison on a real lead ✓
- James: Branded PDF report ✓
- Angela: Portfolio dashboard with all units ✓
- Ray: Multi-flip budget view (requires rehab data entry) ✓

**Solo-dev estimate:** 5 weeks

### Wave 2: Creative Finance Module — The Moat (Weeks 9-12)

**Ships:**
- FinancingInstrument model — conventional loans, hard money, seller notes, sub-to underlying debt, wraps, lease options
- Obligation engine — recurring payments, balloon dates, insurance renewals, tax due dates, verification tasks, servicer transfer follow-up
- Creative finance monitoring dashboard — portfolio-wide obligation view (top-level under ASSETS > Obligations)
- Obligation-powered Today items — balloon countdowns, payment verifications, insurance compliance
- Lease model — start/end, rent, renewal status, vacancy timing
- AI risk analysis for creative finance structures — due-on-sale exposure, equity cushion warnings
- Creative finance calculator upgrades — NPV, IRR sensitivity analysis

**Persona activation delivered:**
- Carlos: Obligation alerts and balloon countdowns ✓ (This is the moat moment)

**Solo-dev estimate:** 4 weeks

### Wave 3: Reports & Calculator Upgrades (Weeks 9-12, parallel with Wave 2)

**Ships:**
- Report families — analysis report, portfolio snapshot, obligation summary, rehab summary
- Report share links with engagement tracking (opened, time spent)
- Brand kit (logo, colors, contact info) applied to all report types
- PDF export from canonical report view (server-side, replacing client-side generation)
- Audience concept on reports (internal, client, lender, partner)
- Calculator upgrades — 1031 exchange modeling, sensitivity tables, multi-scenario comparison view
- "Powered by Parcel" CTA on shared reports (subtle, not obnoxious)

**Persona activation delivered:**
- James: Full branded report workflow with engagement tracking ✓

**Solo-dev estimate:** 4 weeks (parallel with Wave 2; combined calendar time: weeks 9-12)

### Wave 4: Dispositions & Communications (Weeks 13-17)

**Ships:**
- BuyerProfile model — buy-box fields, match scoring, proof-of-funds state, disposition history
- Buyers as a separate nav destination under PEOPLE
- Property-to-buyer matching (rules-based: geography > price > strategy > asset type)
- Disposition pipeline stages (marketed, interested, offer received, under contract, assigned/closed)
- Buyer import from CSV/spreadsheet
- Deal packet generation for buyer blasts
- Twilio SMS integration — outbound messaging, opt-in/opt-out tracking, A2P 10DLC registration gate
- Email integration — basic outbound, template support
- Communication logging — all SMS/email/call records linked to contacts and deals
- Inbox view under PEOPLE

**Persona activation delivered:**
- Desiree: Can now close the disposition loop and send SMS from Parcel ✓

**Audit note on Desiree timing:** SMS and dispositions were originally Waves 4 and 5 respectively. Merging them into Wave 4 accelerates Desiree's stack replacement. She still cannot fully replace REsimpli until skip tracing ships in Wave 5, but the parallel-run window shrinks from 3 waves to 1.

**Solo-dev estimate:** 5 weeks

### Wave 5: Skip Tracing & Sequences (Weeks 13-17, parallel with Wave 4)

**Ships:**
- Skip tracing integration (BatchData) — per-match pricing, results linked to contacts
- Drip sequences — multi-step SMS/email campaigns with scheduling
- Sequence templates by use case (seller outreach, buyer follow-up, past-due follow-up)
- Usage-based billing for skip traces (metered, per-match)

**Solo-dev estimate:** 4 weeks (parallel with Wave 4; combined calendar time: weeks 13-17)

### Wave 6: Direct Mail (Weeks 18-20)

**Ships:**
- Lob integration — postcards and letters
- Mail campaign builder — audience selection from contacts, template design
- Mail tracking — delivery status, response attribution
- Usage-based billing for direct mail

**Solo-dev estimate:** 3 weeks

### Wave 7: iOS Native + D4D (Weeks 18-22, overlapping with Wave 6)

**Ships:**
- Capacitor 8 wrapper — WKWebView with native features
- Push notifications (APNs)
- Biometric auth (Face ID / Touch ID)
- Haptic feedback on key actions
- Deep linking from notifications to entities
- D4D mode — Transistor GPS v9, route tracking, photo/note capture, property creation from field
- D4D as mobile bottom tab (replaces Chat)
- Privacy manifest + AI data disclosure for App Store submission

**Solo-dev estimate:** 5 weeks (starts week 18, overlaps with Wave 6)

### Timeline Summary

| Wave | Content | Calendar Weeks | Solo-Dev Weeks |
|------|---------|---------------|----------------|
| 0 | Schema foundation | 1-3 | 3 |
| 1 | Core platform | 4-8 | 5 |
| 2 | Creative finance (moat) | 9-12 | 4 |
| 3 | Reports & calculators (parallel) | 9-12 | 4 |
| 4 | Dispositions & communications | 13-17 | 5 |
| 5 | Skip tracing & sequences (parallel) | 13-17 | 4 |
| 6 | Direct mail | 18-20 | 3 |
| 7 | iOS native + D4D (overlapping) | 18-22 | 5 |
| **Total** | | **~22 weeks** | **33 dev-weeks** |

Parallel waves (2+3, 4+5, 6+7) share calendar time. Solo developer works on one wave at a time within each parallel pair; the "parallel" label means they share the same calendar window and can be interleaved. Total calendar time: ~22 weeks (~5.5 months).

**Post-Wave 7 (unscheduled, sequenced by demand):**
- Team/Business layer — role presets, assignment model, selective permissions, external sharing
- Advanced portfolio — variance reporting, lender/partner snapshots, performance trends
- Import sophistication — competitor CSV mapping, spreadsheet template import
- White-label polish — deeper branding, custom domains (delayed per Codex recommendation)
- Mobile enhancement — offline support for D4D, advanced notification rules

---

## 7. Audit Resolutions

### Blockers

| # | Blocker | Resolution |
|---|---------|------------|
| B1 | API failure mode matrix | **Resolved in Section 4, Journey 1.** Failure mode table defines UX for every provider failure scenario. Fallback: Bricked → HouseCanary (user-consented, higher cost) → manual entry. |
| B2 | Onboarding flow mechanics | **Resolved in Section 4 + below.** Onboarding spec follows. |
| B3 | Spreadsheet migration | **Resolved: template-first strategy.** Parcel provides a CSV template per entity type (properties, contacts, buyers, transactions). Users reformat their data to match. Auto-detection of common column names (Address vs. Property Address vs. Street) handles 80% of cases. Competitor-specific import playbooks (REsimpli, PropStream, DealCheck) ship in Wave 4+ based on user demand. |
| B4 | Pricing/tier inconsistency | **Resolved.** Canonical: Free / Plus ($29) / Pro ($79) / Business ($149). All documents and codebase updated in Wave 0. |
| B5 | Unified roadmap | **Resolved in Section 6.** Seven waves with calendar-week estimates and persona activation mapping. |

### Onboarding Specification (resolves B2)

**Signup flow:**
1. Email/password or Google OAuth
2. Single persona question: "What best describes you?" → 8 branches (A-H per persona synthesis)
3. Pre-loaded sample deal matching their strategy (eliminates empty state)
4. "Analyze your first deal" prominent CTA — address entry → AI-narrated analysis in <60 seconds

**Empty state design:**
- Every module shows a purposeful empty state, not a blank page
- Pipeline empty: "No deals yet. Analyze a property to create your first deal." + sample pipeline visible
- Portfolio empty: "No owned properties yet. Close a deal from your pipeline to see it here." + sample portfolio card
- Today empty: Onboarding checklist (analyze a deal, save a property, add a contact) + sample morning briefing

**Activation criteria (for analytics):**
- **Activated:** User has saved at least 1 real property (not sample data)
- **Engaged:** User has returned on 3+ separate days within first 14 days
- **Converted:** User has upgraded to a paid plan

**Sample data lifecycle:**
- Sample data is clearly labeled "[Sample]" and visually distinct (dotted border or badge)
- User can delete sample data at any time via a "Clear sample data" action in Settings
- Sample data auto-archives (hidden, not deleted) after user creates 3+ real records
- Sample data is never counted in analytics, portfolio metrics, or billing quotas

**Re-onboarding:**
- Users who abandon mid-flow and return see their progress preserved
- If they completed the persona question but not "analyze first deal," the CTA remains prominent on Today
- No forced re-onboarding wizard — just persistent, gentle CTAs

**Users who don't fit 8 branches:**
- "Other / I'm exploring" option routes to Tamara's branch (multi-strategy) — the broadest experience that doesn't assume a single strategy

### Fixes

| # | Fix | Resolution |
|---|-----|------------|
| F1 | Bricked pricing restructured | Acknowledged. API access at Growth tier ($129/mo, 300 comps/mo). Evaluate Scale ($199/mo, 500 comps) if usage exceeds 300/mo. Budget for $129-199/mo. |
| F2 | RentCast price dropped | Acknowledged. Free API tier (50 calls/mo) for development. Reduces vendor costs. |
| F3 | DealMachine entry price doubled | Desiree's tool stack updated to $522/mo. Value proposition math improves ($522 → $79-119). |
| F4 | TCPA one-to-one consent struck down | Legal doc to be updated. Favorable for Parcel users. Cross-channel revocation still coming (Jan 2027) — build unified opt-out tracking. |
| F5 | iOS commission-free window | Implement web checkout link to parceldesk.io in Wave 7 iOS build. Monitor district court fee determination. Maintain dual payment path (IAP + web checkout). |
| F6 | Colorado AI Act | Added to compliance checklist. Impact assessment required before June 30, 2026 if AI features touch housing decisions (tenant scoring, lead prioritization). Wave 2 creative finance AI should be reviewed. |
| F7 | California Delete Act | Assess data broker classification before August 1, 2026. Skip trace data providers (BatchData) likely qualify. Parcel may qualify if it stores and surfaces personal data about non-users. |
| F8 | Creative finance calculators mislabeled | Calculators are Wave 0 (already shipped). "Creative finance monitoring" is correctly Wave 2. Persona synthesis heatmap to be corrected. |
| F9 | Dispositions unassigned | **Assigned to Wave 4.** Merged with Communications to accelerate Desiree's stack replacement. |
| F10 | Desiree's MUST HAVEs ship late | SMS moves to Wave 4 (from original Wave 4 — no change). Skip tracing remains Wave 5. Desiree runs Parcel + REsimpli in parallel until Wave 5. This is acknowledged and acceptable — Parcel replaces analysis + CRM first, operational tools second. No Zapier bridge needed; the parallel-run is ~4 weeks (Wave 5 starts week 13). |
| F11 | Transactions missing from sidebar | **Added under ASSETS** in Section 5. |
| F12 | Communications logging priority | Basic `Communication` table ships in Wave 0 schema. Passive logging UI ships in Wave 1. Active sending (SMS/email) ships in Wave 4. This resolves the P0-vs-Phase-8 conflict. |
| F13 | ARPU inflated | Report two figures: direct subscription ARPU ~$76/mo, including referral value ~$85/mo. Financial models should use $76/mo for conservative planning. |
| F14 | App Store AI disclosure | Added to Wave 7 submission checklist. Privacy manifest + AI data disclosure (Claude integration) prepared before first App Store submission. |

---

## 8. Hard Product Boundaries

### Parcel Does Not Build

| Category | What's Excluded | Why | Integration Path |
|----------|----------------|-----|-----------------|
| Tenant operations | Tenant portal, rent collection, maintenance requests, vendor dispatching | Margin and complexity explosion. Stessa/Buildium/AppFolio own this. | Export financial data. Sync lease dates. |
| Full accounting | Double-entry bookkeeping, trust accounting, 1099 generation | QuickBooks/Xero own this. Parcel tracks investor-relevant events only. | CSV/QBO export of transactions. |
| Resident screening | Credit checks, background checks, leasing workflows | Requires tenant-facing infrastructure and compliance burden. | Link to TransUnion/Experian from contact record. |
| Loan servicing | Payment processing on behalf of lenders, escrow management | Regulatory burden; not core to investor OS. | Track obligations, don't service them. |
| Public marketplace | Buyer marketplace, deal marketplace, investor social network | Network effects are speculative; product-market fit first. | Future exploration post-profitability. |
| MLS portal | MLS browsing, IDX feeds, agent search | Requires broker relationships and ongoing data licensing. | User imports properties by address. |
| Full white-label | Custom domains, complete brand removal, client-facing separate instances | Increases support load, kills referral loop. | Strong user branding + subtle Parcel attribution. |
| STR-specific ops | Seasonal revenue modeling, channel management, guest communication, cleaning scheduling | Kyle is a future persona. STR ops are a separate product. | Flag STR in property type. Manual income entry. |
| Commercial (5+ units) | Commercial underwriting, DSCR-based analysis, syndication | Different valuation methods, financing, and user base. | Out of scope for v1. |
| International | Non-US property data, international compliance | US-only data providers. International adds 10x compliance. | US only. |

### Edge Cases Explicitly Out of Scope for v1

- Inherited properties (no purchase price → cost basis is FMV at death — calculator needs a manual override field, not a special flow)
- Tax lien/tax deed purchases (different acquisition mechanics — acknowledge in "Other" strategy option, don't build dedicated flow)
- Land-only / vacant lot deals (no rent income, no comps — allow manual entry, don't build land-specific calculator)
- Mobile home / manufactured housing (different financing rules — allow manual entry, flag chattel vs. real property)
- Out-of-state investing (supported by default — Parcel is address-based, not location-restricted)

---

## 9. Unresolved Decisions Requiring Founder Judgment

### Decision 1: Go-to-Market Spearhead

**Question:** Should Parcel market primarily to creative finance investors (Carlos, the moat) or broadly across all strategies?

**Options:**
- A) Lead with creative finance depth — SubTo communities, Pace Morby ecosystem, "the only tool that monitors your subject-to obligations"
- B) Market broadly — "all 5 strategies, one platform" — let creative finance depth win in comparison
- C) Segment: creative finance messaging to SubTo/creative communities, broad messaging everywhere else

**Research says:** Creative finance search terms have near-zero competition. Broad RE investor tools are a crowded space. Carlos converts in 2-7 days and generates 8-12 referrals/year.

**Recommendation:** Option C. Use creative finance as the wedge in niche communities where Carlos lives (SubTo Discord, Pace Morby, creative finance meetups). Use broad messaging on BiggerPockets, Instagram, and YouTube where Tamara, Desiree, and Marcus discover tools. Creative finance depth is the proof, not the headline.

### Decision 2: First Paid Feature Gate

**Question:** What is the first feature that requires Plus or Pro?

**Options:**
- A) Multi-strategy comparison (forces upgrade when users try to compare strategies)
- B) Branded PDF reports (forces upgrade when users try to share professionally)
- C) Third saved property (forces upgrade based on usage volume)
- D) CRM / Contacts (forces upgrade when users try to track people)

**Research says:** Multi-strategy comparison is the activation feature for 3 MUST HAVE personas. Gating it could kill activation. Branded reports gate James. Volume-based gating (3rd property) works for Angela and Ray.

**Recommendation:** Option C for Plus ($29) — the 3rd saved property is a natural moment of momentum, not frustration. Option B for Pro ($79) — branded reports are high-value and justify the price jump. Multi-strategy comparison should be available on Free to drive activation.

### Decision 3: Today's Data Sources Before Obligations Exist

**Question:** Wave 1 ships Today, but obligations don't ship until Wave 2. What populates Today in Wave 1?

**Options:**
- A) Tasks + stale deals + onboarding items only
- B) Tasks + stale deals + lease dates + onboarding items
- C) Skip Today in Wave 1, ship it with Wave 2

**Recommendation:** Option A. Today with tasks, stale deals, and onboarding items is useful enough to establish the daily-return habit. Obligation-powered Today in Wave 2 is the upgrade moment. Do not skip Today — it is the retention loop.

### Decision 4: Bricked API Tier

**Question:** Growth ($129/mo, 300 comps) or Scale ($199/mo, 500 comps)?

**Research says:** At launch, 300 comps/mo is likely sufficient. At $0.43/comp on Growth vs. $0.40/comp on Scale, the per-unit cost difference is marginal.

**Recommendation:** Start on Growth ($129/mo). Upgrade to Scale when monthly comp usage consistently exceeds 250. Monitor in Wave 1.

### Decision 5: Communication Logging Depth in Wave 1

**Question:** How much communication infrastructure ships in Wave 1 (before Twilio integration in Wave 4)?

**Options:**
- A) Schema only — `Communication` table exists but no UI
- B) Manual logging — users can log calls/meetings/notes against contacts and deals
- C) Email integration — connect Gmail/Outlook, auto-log emails to contacts

**Recommendation:** Option B. Manual logging is low-effort to build and immediately useful for Desiree and Tamara who track seller conversations. Email integration (Option C) is high-effort and can wait for Wave 4.

---

## 10. What I Would Lock for v1.5 Today

If Parcel ships tomorrow, here is what makes the cut and what waits.

### Ships in v1.5

1. **Property as the root record.** Every analysis creates a Property. Every deal links to a Property. The deal-centric era ends.
2. **AnalysisScenario as first-class.** Multiple scenarios per property. Side-by-side comparison. Immutable snapshots with AI narratives.
3. **Address-first activation.** Enter an address, get AI-narrated analysis with real data in under 60 seconds. This is the front door.
4. **Today as the daily operating surface.** Tasks, stale deals, obligation alerts (when available), morning briefing. The reason to open Parcel every day.
5. **Creative finance monitoring.** FinancingInstrument + Obligation engine. Balloon countdowns. Insurance compliance tracking. The moat.
6. **Contact CRM with buyer extension.** Universal contacts. Buyer profiles with buy-box matching. Disposition pipeline.
7. **Branded reports.** Link-first with PDF export. Brand kit. Engagement tracking. The growth channel.
8. **Free / Plus ($29) / Pro ($79) / Business ($149).** Clean packaging with usage-based add-ons.

### Waits

1. **SMS/Email sending.** Manual logging ships in v1.5. Twilio integration waits. Users can use Launch Control / Mailchimp alongside Parcel.
2. **Skip tracing.** Users can use BatchData directly. Integration waits.
3. **Direct mail.** Nice-to-have, not activation-critical. Waits.
4. **D4D / iOS native.** The web app works on mobile Safari. Native wrapping with D4D waits.
5. **Team/Business permissions.** Schema is team-ready from day one. UI waits until there's paying demand.
6. **Advanced portfolio analytics.** Basic portfolio dashboard ships. Variance reporting, lender snapshots, and performance trends wait.
7. **Drip sequences and automation.** Manual outreach first. Automation second.

### The Product in One Sentence

**Parcel is a property-centric investor operating system where the front door is address-first analysis, the daily surface is Today, the moat is creative finance monitoring, and the growth channel is branded reports.**

Anything that weakens that coherence is a distraction, even if individually attractive.

---

*This document reconciles the Codex Blueprint, Codex Pressure Test, 5 audit reports (competitor, legal, consistency, gaps, technical), IA review, persona synthesis, and locked design-session decisions into a single canonical source of truth. It supersedes all prior product-direction documents for implementation purposes.*
