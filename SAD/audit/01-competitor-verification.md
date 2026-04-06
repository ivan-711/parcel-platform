# Competitor & Vendor Verification Audit

**Audit Date:** 2026-04-02
**Research Method:** Web search + direct site verification
**Scope:** All competitors and vendors referenced in Parcel platform research

---

## COMPETITORS

### 1. Bricked.ai

**Status:** CHANGED -- CRITICAL UPDATE

| Field | Research Assumption | Verified (Apr 2026) |
|-------|---------------------|---------------------|
| Active? | Yes | Yes -- launched publicly Jan 10, 2026 |
| Pricing | $129/mo | Restructured into 4 tiers (see below) |
| API ready? | Assumed production-ready | Yes -- available on Growth plan and above |

**Current pricing tiers:**

- **Basic** -- $49/mo (100 comps/mo, instant offer price, AI repair estimates)
- **Growth** -- $129/mo (300 comps/mo, API access, 2 team seats)
- **Scale** -- $199/mo (500 comps/mo, unlimited team seats)
- **Enterprise** -- Custom (unlimited comps, priority queue)

**Key changes:**
- The $129/mo price now corresponds to the Growth tier, not the base plan.
- A $49/mo Basic tier was added -- this is a new low-end option.
- API access requires the Growth plan ($129/mo) or higher. API docs available at docs.bricked.ai.
- All plans include a 3-day free trial.
- No reports of outages or shutdowns found. Platform appears stable post-launch.

**Impact on Parcel:** If Parcel planned to use Bricked API at $129/mo, that assumption holds -- but only at the Growth tier (300 comps/mo). Evaluate whether 300 comps/mo is sufficient for production usage or if Scale/Enterprise is needed.

---

### 2. RentCast

**Status:** CHANGED

| Field | Research Assumption | Verified (Apr 2026) |
|-------|---------------------|---------------------|
| Active? | Yes | Yes |
| Consumer pricing | $74/mo | Dramatically reduced: Free or $12-19/mo |
| API pricing | Unclear | Tiered, starts free (50 calls/mo) |

**Current consumer pricing:**
- **Free** -- $0/mo (5 properties, 5 rental comps)
- **Pro** -- $12/mo annual / $19/mo monthly (50+ properties, 20 comps)

**API pricing:**
- **Developer** -- Free (50 API calls/mo)
- Paid tiers available but exact pricing requires contacting RentCast or visiting their API pricing page. Plans are monthly, no long-term contracts, with per-request overage fees.

**Key changes:**
- Consumer pricing dropped significantly from $74/mo to $12-19/mo range.
- API now has a free developer tier -- useful for prototyping integrations.
- 140M+ property records database.

**Impact on Parcel:** RentCast is now much cheaper as a data source. Their API free tier enables low-cost prototyping. However, the $74/mo assumption in cost models needs updating.

---

### 3. REsimpli

**Status:** CHANGED

| Field | Research Assumption | Verified (Apr 2026) |
|-------|---------------------|---------------------|
| Active? | Yes | Yes -- branding as "#1 AI-powered CRM" |
| Pricing | $149-599/mo | $69-599/mo (added Lite tier) |
| Creative finance? | Unknown | Content marketing only, no dedicated tooling |

**Current pricing:**
- **Lite** -- $69/mo (new, for new investors, limited features)
- **Basic** -- $149/mo (solopreneurs, core CRM/automation)
- **Pro** -- $299/mo (teams of 2-5, most popular)
- **Enterprise** -- $599/mo (larger teams)
- 30-day free trial on all plans. 29% savings on annual billing.

**Creative finance assessment:**
- REsimpli publishes extensive blog content about subject-to deals, seller financing, and creative finance strategies.
- The CRM supports tagging, organizing, and managing creative deals (contract storage, payment tracking, seller communication).
- However, there is NO dedicated creative finance calculator, subject-to deal analyzer, or specialized workflow for creative finance deal structures.
- Creative finance support is generic CRM capability, not purpose-built tooling.

**Impact on Parcel:** REsimpli remains a generalist CRM competitor. The creative finance gap Parcel identified is still open -- REsimpli has content marketing around creative finance but no specialized tooling. This is a confirmed competitive advantage for Parcel.

---

### 4. FreedomSoft

**Status:** CHANGED

| Field | Research Assumption | Verified (Apr 2026) |
|-------|---------------------|---------------------|
| Active? | Yes | Yes |
| Pricing | $147-597/mo | $147-597/mo (annual) / $197-497/mo (monthly) |

**Current pricing (annual billing):**
- **Start** -- $147/mo ($1,997/yr, 6 users, 3 websites, 1 phone, 3K leads/mo)
- **Grow** -- $247/mo ($2,997/yr, 8 users, 6 websites, 3 phones, 6K leads/mo)
- **Scale** -- $597/mo ($4,997/yr, 12 users, 6 websites, 6 phones, 12K leads/mo)

**Monthly billing is higher:** $197/mo (Start), $297/mo (Grow), $497/mo (Scale)

**Key changes:**
- Pricing has shifted slightly. Annual rates are similar to previous research, but monthly rates are higher ($197-497).
- 30-day money-back guarantee.
- Still positioned as all-in-one investor software (leads, marketing, pipeline, deals).

**Impact on Parcel:** FreedomSoft remains expensive. No creative finance-specific features found. Parcel's price positioning well below FreedomSoft remains valid.

---

### 5. DealCheck

**Status:** VERIFIED -- NO MAJOR CHANGES

| Field | Research Assumption | Verified (Apr 2026) |
|-------|---------------------|---------------------|
| Active? | Yes | Yes |
| Pricing | $10-20/mo | $0-20/mo (unchanged) |
| CRM added? | Unknown | Minimal -- still primarily analysis tool |
| AI features? | Unknown | Basic AI for auto-filling property data, no agentic AI |

**Current pricing:**
- **Starter** -- Free ($0, 15 properties)
- **Plus** -- $10/mo (50 properties, more comps/photos)
- **Pro** -- $20/mo (unlimited properties, full features)
- 14-day free trial on paid plans.

**Key changes:**
- DealCheck remains focused on property analysis, NOT CRM. No significant CRM or AI feature expansion.
- Uses RentCast as its property data API backend.
- No creative finance deal structuring tools.

**Impact on Parcel:** DealCheck is a narrow analysis tool, not a platform competitor. Parcel's scope is much broader. However, DealCheck's $10-20/mo price point for analysis-only is worth noting for feature-level competition.

---

### 6. DealMachine

**Status:** CHANGED -- PRICE INCREASE

| Field | Research Assumption | Verified (Apr 2026) |
|-------|---------------------|---------------------|
| Active? | Yes | Yes |
| Pricing | $49-279/mo | $99-149/mo+ (significant restructuring) |

**Current pricing:**
- **Starter** -- $99/mo ($1,190/yr, 1 user, 20K leads, 10K exports/mo)
- **Pro** -- $149/mo ($1,790/yr, 3 users, 60K leads, 30K exports/mo)

**Key changes:**
- Entry price increased from $49 to $99/mo -- significant jump.
- Simplified to fewer tiers. Previous $49 tier eliminated.
- Now includes unlimited contact info, MLS & county comps, AI-powered dialer.
- Mail pricing starts at $0.67-0.72/piece.
- 17% savings on annual billing.

**Impact on Parcel:** DealMachine's price increase narrows Parcel's pricing disadvantage if any existed. The "driving for dollars" niche is still DealMachine's core -- not a direct platform competitor.

---

### 7. PropStream

**Status:** VERIFIED -- MINOR CHANGES

| Field | Research Assumption | Verified (Apr 2026) |
|-------|---------------------|---------------------|
| Active? | Yes | Yes |
| Pricing | $99/mo | $99/mo Essentials (unchanged), $199/mo Pro (new) |

**Current pricing:**
- **Essentials** -- $99/mo (7-day free trial, 50 free leads, 165+ filters)
- **Pro** -- $199/mo (includes skip tracing)
- Add-on: BatchDialer ($50-150/mo separate, 20% discount for PropStream subscribers)

**Key changes:**
- Base $99/mo unchanged.
- Added a $199/mo Pro tier with bundled skip tracing.
- BatchDialer (PropStream's dialer) just restructured pricing (March 2026).
- 160M+ U.S. properties.

**Impact on Parcel:** PropStream remains the data/list-building leader. Not a CRM competitor. Parcel should position as complementary or integrating PropStream data rather than competing head-on on property data.

---

### 8. Stessa

**Status:** CHANGED -- STILL FREE, BUT ADDED PAID TIERS

| Field | Research Assumption | Verified (Apr 2026) |
|-------|---------------------|---------------------|
| Active? | Yes | Yes (owned by Yardi) |
| Free? | Yes (post-Yardi) | Yes -- Essentials plan remains free |
| Paid tiers? | Unknown | Yes -- $12-35/mo paid options added |

**Current pricing:**
- **Essentials** -- Free (unlimited properties, bank feeds, basic reports, rent collection, 2.31% APY cash management)
- **Manage** -- $12/mo annual
- **Pro** -- $28/mo annual / $35/mo monthly

**Key changes:**
- Free tier is still generous: unlimited properties, bank feeds, basic reports.
- Added paid Manage and Pro tiers for advanced features.
- Stessa Cash Management offers 2.31% APY -- a unique differentiator.
- Focused on rental portfolio tracking and landlord tools, NOT deal acquisition.

**Impact on Parcel:** Stessa serves a different segment (buy-and-hold landlords) from Parcel's target (active investors doing creative finance, wholesaling, flips). Not a direct threat but worth monitoring if they expand scope.

---

## VENDORS

### 9. Twilio SMS

**Status:** VERIFIED

| Field | Research Assumption | Verified (Apr 2026) |
|-------|---------------------|---------------------|
| Active? | Yes | Yes |
| SMS rate | ~$0.0079/msg | $0.0083/msg (slight increase) |

**Current pricing:**
- **Outbound SMS (US):** $0.0083 per segment sent
- **Inbound SMS (US):** $0.0083 per segment received
- **Failed message fee:** $0.001 per failed message
- **Local number:** $1.15/mo
- **Toll-free number:** $2.15/mo
- Volume discounts available automatically as usage scales.
- Additional carrier surcharges apply per message (varies by carrier).

**Impact on Parcel:** Marginal price increase. Budget models using ~$0.008/msg are still approximately correct. Factor in carrier surcharges for accurate cost modeling.

---

### 10. BatchData Skip Tracing

**Status:** CHANGED -- REBRANDED AND RESTRUCTURED

| Field | Research Assumption | Verified (Apr 2026) |
|-------|---------------------|---------------------|
| Active? | Yes | Yes (BatchSkipTracing merged into BatchData Aug 2025) |
| Pricing model | Per-match | Dual: pay-per-match OR subscription |

**Current pricing:**
- **Pay-per-match:** ~$0.07-0.09 per match, no monthly fee, no minimums
- **Subscription plans:**
  - Starting at $500/mo
  - $5,000/mo for up to 100K skip traces
  - $10,000/mo for up to 300K skip traces
- Volume discounts: as low as $0.07 for 150K+ records.

**Key changes:**
- BatchSkipTracing merged into BatchData platform (Aug 15, 2025) -- single interface now.
- Added subscription model alongside pay-per-match.
- Pay-per-match model still available and viable for lower-volume usage.

**Impact on Parcel:** Pay-per-match at $0.07-0.09 is the right model for Parcel's usage level. No subscription needed unless volume exceeds tens of thousands per month. Cost assumptions remain approximately valid.

---

### 11. Lob Direct Mail

**Status:** VERIFIED

| Field | Research Assumption | Verified (Apr 2026) |
|-------|---------------------|---------------------|
| Active? | Yes | Yes |
| API free? | Yes | Yes (Developer plan: 1 user, 500 mailings) |

**Current pricing (Growth plan per-piece, inclusive of print + postage):**
- **Postcards:** $0.48/piece
- **Letters:** $0.69/piece
- **Checks:** $0.87/piece

**Platform plans:**
- **Developer** -- Free (1 user, 500 mailings, 10 templates)
- **Startup** -- $260/mo (3 users, 3K mailings, 10 templates)
- **Growth** -- $550/mo (5 users, 6K mailings, 25 templates)
- **Enterprise** -- Custom pricing (20+ users, custom volume)

**Key changes:**
- USPS postage rates updated July 13, 2025 (routine adjustment).
- Per-piece costs may have slightly increased due to USPS changes.

**Impact on Parcel:** Lob's Developer plan (free, 500 mailings) is viable for MVP. Growth plan at $550/mo is a significant platform cost to factor in. Per-piece costs ($0.48-0.69) are competitive for programmatic direct mail.

---

### 12. Melissa Data Address Verification

**Status:** VERIFIED

| Field | Research Assumption | Verified (Apr 2026) |
|-------|---------------------|---------------------|
| Active? | Yes | Yes |
| Pricing model | Credit-based | Credit-based (confirmed) |

**Current pricing:**
- **Free tier:** 1,000 credits/mo (renews monthly)
- **Paid:** Starting at $30 for 10,000 credits
- **Enterprise:** Up to $12,600 for higher tiers, annual rates available on request
- **Shopify integration:** $0.03 per unique checkout session, $100/mo cap

**Key changes:**
- Credit-based model unchanged.
- Free tier (1,000 credits/mo) is generous enough for development and low-volume validation.

**Impact on Parcel:** Free tier sufficient for MVP address verification. At scale, $30/10K credits is reasonable. No pricing surprises.

---

## NEW MARKET ENTRANTS & TRENDS

### AI-Powered RE Investor Tools (New in 2025-2026)

#### Smart Bricks -- CONCERN (Direct Threat)
- **What:** AI infrastructure layer for real estate investing. Autonomous reasoning systems for deal discovery, underwriting, and execution.
- **Funding:** $5M pre-seed led by a16z (Feb 2026). Angels from OpenAI, Anthropic, Airbnb, Google DeepMind.
- **Founder:** Mohamed Mohamed (Forbes 30U30, ex-BCG/McKinsey/Blackstone/Goldman).
- **Positioning:** "Compresses 3-6 month deal process into minutes." Ingests 1M+ data feeds, surfaces top 0.1% of properties by risk-adjusted return.
- **Threat level:** HIGH. Well-funded, elite team, agentic AI approach. However, currently focused on institutional-scale global investing, not SMB/creative finance investors. Monitor closely.

#### Fundrise RealAI -- NEW
- **What:** AI platform for single/multifamily RE analysis and data.
- **Pricing:** Free for first dozen uses, then $69/mo standard plan.
- **Launched:** Jan 2026.
- **Threat level:** LOW-MEDIUM. Focused on data consumers and passive investors, not active deal operators.

#### Breezy -- NEW
- **What:** "World's first independent AI operating system for residential real estate."
- **Founders:** James Harris (top agent) + Afterpay co-founders Nick Molnar & Anthony Eisen.
- **Funding:** $10M pre-seed.
- **Launched:** Feb 2026 (waitlist, H1 2026 broader launch).
- **Focus:** Real estate agents, not investors. Auto-comps, conversation capture, pipeline automation.
- **Threat level:** LOW for Parcel's segment. Agent-focused, not investor-focused.

#### Lofty AOS -- NEW
- **What:** Agentic AI operating system for brokerages and agents.
- **Launched:** Feb 2026.
- **Threat level:** LOW. Brokerage/agent focused, not investor segment.

#### Cambio -- NEW
- **What:** AI-powered commercial real estate operations (asset management, lease audits, compliance).
- **Funding:** $18M Series A at $100M valuation (Jan 2026). Led by Maverick Ventures + YC.
- **Customers:** Institutional CRE (Principal RE, Nuveen, LaSalle, Oxford Properties).
- **Threat level:** NONE. Institutional CRE focus, completely different segment.

#### Invelo 2.0 -- UPDATED
- **What:** All-in-one RE investor platform (prospecting, CRM, marketing, automation).
- **Changes:** Launched 2.0 with restructured pricing, retired free plan in favor of 7-day trial.
- **Threat level:** MEDIUM. Closest to "investor OS" positioning. Worth monitoring as a direct competitor.

### Creative Finance-Specific Platforms

**Finding: NO platform found that specifically serves creative finance investors with purpose-built tooling.** REsimpli publishes content about creative finance but has no dedicated deal structuring, subject-to calculators, or seller finance payment tracking. This gap remains wide open and is Parcel's primary competitive advantage.

### "All-in-One RE Investor OS" Claimants

| Platform | Claim | Actual Focus |
|----------|-------|--------------|
| REsimpli | "#1 AI-powered CRM for RE investors" | Wholesaling/acquisition CRM |
| FreedomSoft | "All-in-one software for RE investors" | Lead gen + marketing + CRM |
| Invelo | "Prospect, market & close deals" | Prospecting + CRM + marketing |
| PropStream | "Most trusted RE data" | Data/list building (not CRM) |
| Breezy | "AI OS for residential RE" | Agents, not investors |
| Lofty | "Agentic AI OS" | Brokerages, not investors |

**None of these serve creative finance investors specifically.** The "all-in-one" claims are either wholesaling-focused or agent/brokerage-focused.

### Funding & Market Trends

- **$16.7B** invested globally in proptech in 2025 (67.9% YoY increase).
- **$1.7B** raised in Jan 2026 alone (176% increase from Jan 2025).
- Average deal size rose from $12.8M to $34M -- investors making bigger bets.
- Capital concentrated in: payments/closings/procurement workflows, and AI-enabled solutions with strong data foundations.
- **EliseAI** reached $2.2B valuation (AI property management for multifamily).
- **Juniper Square** launched AI CRM for investor relations (fundraising/LP management).
- **Arrived Homes** (Bezos-backed) raised $27M for fractional rental home marketplace.
- **Bilt Rewards** raised $250M at $13B valuation (rent payments/rewards).

---

## SUMMARY OF STATUS CHANGES

| Entity | Previous | Current | Direction |
|--------|----------|---------|-----------|
| Bricked.ai | $129/mo flat | $49-199/mo tiered | Restructured (API at $129+) |
| RentCast | $74/mo | $0-19/mo consumer, API free tier | Dramatically cheaper |
| REsimpli | $149-599/mo | $69-599/mo | Added cheaper Lite tier |
| FreedomSoft | $147-597/mo | $147-597/mo annual | Essentially unchanged |
| DealCheck | $10-20/mo | $0-20/mo | Unchanged |
| DealMachine | $49-279/mo | $99-149/mo | Entry price doubled |
| PropStream | $99/mo | $99-199/mo | Added Pro tier |
| Stessa | Free | Free + $12-35/mo paid tiers | Still free at base |
| Twilio SMS | ~$0.0079/msg | $0.0083/msg | Marginal increase |
| BatchData | Per-match | Per-match + subscription | Added subscription option |
| Lob | Free API + per-piece | Free dev plan + $260-550/mo | Unchanged structure |
| Melissa Data | Credit-based | Credit-based, $30/10K | Unchanged |

---

## KEY TAKEAWAYS FOR PARCEL

1. **Creative finance gap is CONFIRMED WIDE OPEN.** No competitor has built purpose-built creative finance deal structuring, subject-to analysis, or seller finance management tools. This is Parcel's clearest competitive moat.

2. **Bricked.ai API dependency is viable.** API is production-ready at $129/mo (Growth tier, 300 comps/mo). Evaluate if 300 comps/mo is sufficient or if Scale ($199/mo, 500 comps) is needed.

3. **New threat: Smart Bricks.** a16z-backed, agentic AI for RE investing. Currently institutional-focused but could move downstream. Monitor quarterly.

4. **New threat: Invelo 2.0.** Closest "investor OS" competitor. Launched 2.0 with enhanced features. No creative finance tools found, but worth deep analysis.

5. **Market timing is favorable.** Proptech funding is surging ($16.7B in 2025, accelerating in 2026). Investor appetite for AI-enabled RE tools is at an all-time high.

6. **Vendor costs are stable.** No major surprises in Twilio, BatchData, Lob, or Melissa pricing. Cost models from research phase remain approximately valid.

7. **RentCast got much cheaper.** If using RentCast as a data source, costs dropped significantly. Free API tier available for development.
