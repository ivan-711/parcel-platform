# Persona 05: Kyle — The STR/Airbnb Investor

> **Status: FUTURE PERSONA.** Parcel does not currently have STR-specific data feeds (nightly rates, occupancy curves, seasonality indices) or an STR mode in the buy-and-hold calculator. Kyle represents a high-value adjacent segment that Parcel's architecture should not block and should actively plan toward. This document defines what it would take to earn Kyle's subscription and flags honest gaps in today's product.

---

## 1. Profile Summary

**Kyle Nakamura, 35, Asheville NC metro**

Kyle left a senior data-engineering role at a Series C fintech two years ago to manage his short-term rental portfolio full-time. He owns three properties: two mountain cabins near Asheville (a 2BR A-frame and a 3BR modern cabin) and a 1BR beach condo on Topsail Island. Gross revenue across the three properties ranges from $180K to $250K annually depending on season, with net operating income between $70K and $100K after cleaning, maintenance, property management software, and debt service.

Kyle thinks in spreadsheets. He built a custom Airtable base with 47 fields per property that tracks nightly rate adjustments, cleaning turnaround times, guest review velocity, and maintenance cost per booking. He monitors AirDNA weekly for comp set ADR and occupancy shifts. He runs PriceLabs dynamic pricing and Hospitable for automated guest messaging. He uses Stessa for bookkeeping and DealCheck for acquisition underwriting.

He wants to acquire his fourth property in the next 12 months — likely another mountain cabin or a lakefront property — and is exploring whether his next deal should be a long-term rental instead, because he is feeling the operational weight of STR management. This tension (STR vs LTR for the next deal) is the exact use case Parcel could own.

Kyle reads BiggerPockets forums daily, follows the STR Wealth podcast, and is active in two private Facebook groups for Airbnb investors. He is skeptical of tools that claim to "do everything" because he has tried several and found them shallow on STR-specific analytics. He will pay for depth but will churn instantly from surface-level features.

---

## 2. Current Tool Stack

| Tool | Monthly Cost | Function |
|------|-------------|----------|
| AirDNA Market Minder | $149 | Comp set tracking, ADR/occupancy benchmarks, market demand scoring |
| PriceLabs | $60 (3 listings) | Dynamic nightly pricing, min-stay rules, seasonal adjustments |
| Hospitable | $60 (3 listings) | Automated guest messaging, review management, multi-platform sync |
| Stessa | $0 (free tier) | Income/expense tracking, tax-ready reports, portfolio dashboard |
| DealCheck | $14 | Acquisition underwriting, rental property calculators |
| Airtable (Pro) | $20 | Custom operational database, maintenance tracking, KPI dashboards |
| Google Sheets | $0 | Ad-hoc modeling, STR vs LTR scenario comparisons |
| **Total** | **$303/mo** | |

Additional periodic costs: Kyle pays for occasional AirDNA one-time market reports ($100-200 each) when evaluating a new acquisition market, and has a $99/year BiggerPockets Pro membership for deal analysis tools and forums.

**Key observation:** Kyle's stack is fragmented across acquisition analysis (DealCheck), operations (PriceLabs + Hospitable), bookkeeping (Stessa), and market intelligence (AirDNA). No single tool bridges "should I buy this property?" with "should I Airbnb it or long-term rent it?" — and certainly none connect that decision back to portfolio-level analytics.

---

## 3. Detailed Daily/Weekly Workflow

### Daily (15-20 min)
1. **Check Hospitable dashboard** — Review automated messages sent overnight, handle any guest issues that require personal response. Check upcoming check-ins/check-outs for the day.
2. **Glance at PriceLabs** — Verify nightly rates for the next 14 days look reasonable. Override any automated price that seems too low for a holiday weekend or too high for a soft Tuesday.
3. **Scan Airbnb/VRBO host dashboards** — Check new bookings, read any new reviews, respond to guest inquiries that Hospitable flagged as needing manual attention.
4. **Update Airtable** — Log any maintenance requests, cleaning issues, or supply restocking needs. Mark completed tasks.

### Weekly (2-3 hours, usually Sunday evening)
1. **AirDNA comp analysis** — Pull up Market Minder for each property's submarket. Compare his ADR, occupancy rate, and RevPAR against the comp set (10-15 similar properties per location). Note any emerging trends — new listings entering the market, seasonal demand shifts.
2. **PriceLabs strategy review** — Adjust base prices, minimum stays, and orphan-day rules for the upcoming 4-6 weeks based on AirDNA data and his own booking pace.
3. **Financial reconciliation in Stessa** — Categorize any uncategorized transactions. Review cash flow by property. Note any expense anomalies.
4. **Airtable KPI update** — Update his rolling 30/60/90-day occupancy, ADR, and RevPAR per property. Compare against his own historical data and the targets he set at the start of the year.

### Monthly (half day)
1. **Portfolio performance review** — Stessa monthly P&L per property. Calculate cash-on-cash return, cap rate, and NOI per property using his custom Google Sheet model.
2. **Market scouting** — If actively looking to acquire, browse Redfin/Zillow for target markets. Run promising properties through DealCheck with both LTR and STR assumptions (STR assumptions are manual — he pulls AirDNA data and inputs it by hand into DealCheck's rental fields).
3. **Tax prep maintenance** — Ensure all expenses are properly categorized and documented. Review depreciation schedules.

### Quarterly
1. **Strategy reassessment** — Should any property convert from STR to LTR? Should he sell one to fund a better acquisition? Are his target markets still performing?
2. **Refinance/equity analysis** — Check current property values against loan balances. Evaluate cash-out refi opportunities using a custom spreadsheet.

---

## 4. Pain Points (Ranked)

### P1: No unified STR vs LTR comparison tool (Critical)
Kyle cannot run a side-by-side analysis of "What does this property return as an Airbnb vs. a long-term rental?" in any single tool. DealCheck handles LTR underwriting well but has no STR revenue model. AirDNA gives STR market data but has no financial calculator. He manually bridges the gap with Google Sheets every time, which takes 45-60 minutes per property and is error-prone.

### P2: Fragmented acquisition-to-operations pipeline (High)
When Kyle finds a deal, he analyzes it in DealCheck, pulls market data from AirDNA, models STR revenue in Google Sheets, and then if he buys it, manually recreates everything in Stessa and his Airtable base. There is no data continuity from "I found this property" to "I own and operate this property."

### P3: Seasonal cash flow modeling is manual and brittle (High)
STR income is highly seasonal. Kyle's mountain cabins earn 60% of their annual revenue in June-October and December-January. His beach condo peaks May-September. No tool in his stack models this seasonality into forward cash flow projections. He does it himself in a spreadsheet with 12 monthly revenue assumptions, and it breaks every time he changes an assumption.

### P4: Portfolio-level view across mixed strategies is nonexistent (Medium)
Kyle is considering making his next acquisition an LTR for diversification. If he does, he will have STR and LTR properties in the same portfolio. No tool he uses today can show him portfolio-level metrics across both strategies with appropriate KPIs for each (RevPAR for STR, gross rent multiplier for LTR).

### P5: Creative finance awareness gap (Medium)
Kyle acquired all three properties with conventional 10-25% down financing. He is aware of seller financing and subject-to deals from BiggerPockets but has never modeled one. He suspects creative finance could help him acquire his fourth property with less capital outlay but does not know how to structure the deal or evaluate the risk.

---

## 5. Jobs To Be Done

1. **When** I find a property in a market I am targeting, **I want to** instantly compare its projected return as an STR vs. LTR with real market data for both, **so I can** make a data-driven decision on the optimal strategy before making an offer.

2. **When** I am reviewing my portfolio performance, **I want to** see cash-on-cash return, equity growth, and NOI for all my properties in one dashboard regardless of whether they are STR or LTR, **so I can** identify underperformers and make strategic allocation decisions.

3. **When** I am evaluating a new market for STR acquisition, **I want to** see seasonality-adjusted revenue projections, comp set ADR/occupancy, and regulatory risk in the context of a full deal analysis, **so I can** avoid markets that look good on paper but underperform seasonally.

4. **When** I am considering creative finance structures for my next acquisition, **I want to** model seller financing or subject-to terms with STR revenue assumptions, **so I can** understand whether creative finance changes the return profile enough to justify the complexity.

5. **When** tax season arrives, **I want to** pull clean income/expense data organized by property with proper STR-specific categorization (cleaning fees, platform commissions, supplies, furnishing depreciation), **so I can** minimize my CPA bill and maximize deductions.

---

## 6. Journey Map

### 6.1 Awareness
**Trigger:** Kyle sees a BiggerPockets forum thread or YouTube video where someone analyzes a deal using Parcel's calculator, specifically a creative finance deal structure he has not seen modeled before. The visual clarity of the output and the AI-generated narrative catches his attention.

**Touchpoint:** Organic content, community mention, or a shared Parcel deal report link.

**Kyle's thought:** "Interesting — I have not seen a tool that narrates the deal analysis like that. The creative finance depth looks real. Wonder if it handles STR."

### 6.2 Evaluation
**Action:** Kyle visits parcel.deals, scans the landing page, and looks for any mention of STR, Airbnb, or short-term rental analysis.

**Honest reality at launch:** He will not find dedicated STR features. The landing page focuses on the five core strategies (wholesale, BRRRR, buy-and-hold, flip, creative finance). The buy-and-hold calculator uses monthly rent as its income assumption, not nightly rate * occupancy * seasonality.

**Kyle's thought:** "This looks strong for LTR and creative finance, but I do not see an STR mode. Let me try the free tier to see if the bones are good enough that STR could work with manual inputs."

**Critical moment:** If the landing page or onboarding actively acknowledges STR investors and signals that STR-specific features are on the roadmap, Kyle is much more likely to sign up and explore. If STR is completely absent from the messaging, he may bounce.

### 6.3 Onboarding
**Action:** Kyle signs up for the Free tier. He adds one of his existing properties to test the platform.

**Experience:** The property import and deal analysis flow works, but he immediately hits friction: the buy-and-hold calculator asks for "Monthly Rent" — a single number. Kyle's mountain cabin generates $0-800/night depending on season, with 55-75% occupancy. He cannot express this in a single monthly rent figure without doing the math himself.

**Kyle's thought:** "I can put in an annualized monthly average, but that hides the seasonality. This is the core problem with every LTR tool trying to serve STR investors."

**What Parcel CAN do for Kyle at this stage:**
- Creative finance calculators work regardless of income source — if Kyle manually inputs an average monthly income, he can model seller financing, subject-to, and wraparound structures.
- The AI analyst can narrate deal structure trade-offs.
- CRM and deal pipeline tracking work for acquisition sourcing.
- Portfolio view can show his properties with manually entered financials.

**What Parcel CANNOT do:**
- Pull STR market data (nightly rates, occupancy, seasonality curves).
- Model STR revenue with seasonal variation.
- Run STR vs LTR side-by-side comparison with real market data.
- Track STR-specific KPIs (RevPAR, ADR, occupancy rate).

### 6.4 Activation
**Activation event (realistic at launch):** Kyle uses the creative finance calculator to model a seller-financed acquisition of his fourth property using manually entered STR revenue assumptions. The AI analysis reveals that a subject-to structure with the seller's existing 3.2% rate produces a 22% cash-on-cash return versus 11% with conventional financing. This is a genuine insight Kyle has not quantified before.

**Kyle's thought:** "Okay, the creative finance depth is real and actually useful. I can live with manual STR numbers for now if the deal structuring is this good. But I need STR revenue modeling to really commit."

### 6.5 Engagement
**Usage pattern:** Kyle uses Parcel primarily for acquisition analysis on his fourth property. He runs 3-5 deal analyses per month, using the creative finance calculators as his primary tool and manually inputting STR revenue assumptions he calculates separately from AirDNA data.

**Engagement risks:**
- He still needs AirDNA for market data — Parcel does not reduce his tool spend.
- He still uses Stessa for bookkeeping — Parcel's portfolio management is lighter than what he needs.
- He still uses his custom Airtable for operational KPIs — Parcel does not track STR operations.

**Engagement strengths:**
- Creative finance modeling is genuinely better than anything else in his stack.
- The AI analyst provides deal narrative he cannot get elsewhere.
- CRM for tracking seller leads on off-market deals adds value.

### 6.6 Conversion
**Conversion scenario (Free to Plus at $29):** Kyle upgrades when he is actively pursuing his fourth acquisition and wants unlimited deal analyses, CRM capacity, and the ability to share deal reports with his lender or a potential partner.

**Conversion scenario (Plus to Pro at $79):** Kyle upgrades if/when Parcel ships an STR mode that integrates seasonal revenue modeling into the calculator. The Pro tier's advanced analytics and AI depth justify the price only when the tool can speak his language (RevPAR, ADR, occupancy).

**Conversion blocker:** At launch, Kyle is unlikely to go beyond Plus ($29). He is already spending $303/mo on his existing stack, and Parcel does not replace any of those tools — it adds to the spend. He needs to see STR features to justify Pro.

### 6.7 Retention
**Retention at launch (realistic):** Low-to-moderate. Kyle will retain his subscription during active acquisition periods and may churn between deals. Without STR-specific features, Parcel is a "deal analysis tool" for Kyle, not an "operating system."

**Retention with STR features (future):** High. If Parcel can replace DealCheck ($14) and partially replace AirDNA's acquisition analysis use case, Kyle saves money while gaining creative finance depth he cannot get elsewhere. If Parcel's portfolio view can handle mixed STR/LTR properties, it also competes with Stessa.

### 6.8 Advocacy
**Advocacy trigger:** Kyle shares a Parcel deal report in a BiggerPockets forum thread or Facebook group showing a creative finance STR acquisition analysis. The visual quality and AI narrative make other STR investors ask "What tool is this?"

**Advocacy blocker:** Kyle will not recommend Parcel to other STR investors until it has STR-specific features. He might recommend it narrowly for creative finance analysis but will caveat it with "you still need AirDNA and DealCheck for STR."

---

## 7. Feature Priority Matrix

| Feature | Priority | Exists Today? | Notes |
|---------|----------|--------------|-------|
| STR vs LTR side-by-side comparison | **MUST HAVE** | No | Kyle's #1 unmet need across all tools |
| Seasonal revenue modeling in calculator | **MUST HAVE** | No | 12-month revenue curve, not single monthly rent |
| STR market data integration (ADR, occupancy, RevPAR) | **MUST HAVE** | No | Requires data partner (AirDNA API, Mashvisor, or custom scraping) |
| Creative finance calculators | **MUST HAVE** | Yes | Primary value driver at launch. Works with manual STR inputs |
| AI deal analyst | **HIGH VALUE** | Yes | Needs STR context awareness to reach full value |
| CRM / deal pipeline | **HIGH VALUE** | Yes | Useful for tracking acquisition leads |
| Portfolio dashboard (mixed STR/LTR) | **HIGH VALUE** | Partial | Exists but no STR-specific KPIs (RevPAR, ADR, occupancy) |
| Buy-and-hold calculator (LTR mode) | **HIGH VALUE** | Yes | Works today; needs STR mode added |
| BRRRR calculator with STR refi assumptions | **HIGH VALUE** | Partial | Calculator exists; STR revenue assumptions not supported |
| Deal sharing / PDF reports | **HIGH VALUE** | Yes | Kyle shares analyses with lenders and partners |
| Comp set tracking / market monitoring | **HIGH VALUE** | No | Currently served by AirDNA |
| SMS/email outreach (Wave 4) | **NICE TO HAVE** | No | Useful for contacting off-market sellers |
| Skip tracing (Wave 5) | **NICE TO HAVE** | No | Relevant if Kyle pursues off-market deals |
| Direct mail (Wave 6) | **NICE TO HAVE** | No | Lower priority for Kyle's acquisition style |
| Wholesaling tools | **NOT RELEVANT** | Yes | Kyle does not wholesale |
| Flip calculator | **NOT RELEVANT** | Yes | Kyle does not flip |
| Full property management features | **NOT RELEVANT** | N/A | Kyle uses Hospitable + PriceLabs for operations |
| Guest messaging / review management | **NOT RELEVANT** | No | Firmly in Hospitable's territory |

---

## 8. Parcel's Voice for This Persona

Kyle is deeply analytical and has strong opinions formed by two years of hands-on STR operation. Parcel's AI should speak to him as a peer, not a teacher. Key principles:

**Acknowledge the STR context proactively:**
> "You've entered $4,200/mo as projected rent. For STR properties, this figure can vary 40-60% by season. When STR revenue modeling ships, you'll be able to input seasonal curves directly. For now, consider running this analysis at both your conservative (low-season average) and optimistic (annual average) figures to bracket the range."

**Use STR-native terminology when detected:**
> "At a $4,200 monthly average, this implies roughly $140/night at 100% occupancy — or more realistically, $185/night at 75% occupancy. Your actual ADR and occupancy targets should drive this number."

**Lead with creative finance as the differentiator:**
> "Most STR investors acquire with conventional financing because STR-focused tools don't model alternative structures. Here's what a subject-to acquisition looks like with the seller's existing 3.2% rate versus your best conventional quote at 7.1%..."

**Be honest about gaps:**
> "Parcel doesn't currently pull STR market data like nightly rates or occupancy benchmarks. We recommend cross-referencing with AirDNA or Mashvisor for those inputs. STR-native analytics are on our roadmap."

**Match Kyle's analytical depth:**
> "Your cash-on-cash drops from 18.2% to 11.7% if occupancy falls below 62% — that's your breakeven occupancy for debt service coverage. In shoulder seasons, your mountain markets typically run 45-55% occupancy, which means you need peak-season performance above 85% to hit your annual target."

---

## 9. Conversion Triggers & Churn Risks

### Conversion Triggers

| Trigger | Tier | Timing |
|---------|------|--------|
| Active acquisition — needs unlimited deal analyses and CRM | Free to Plus ($29) | When Kyle starts seriously pursuing property #4 |
| STR mode ships in buy-and-hold calculator | Plus to Pro ($79) | When Parcel can model seasonal STR revenue natively |
| STR vs LTR comparison with market data | Plus to Pro ($79) | Kyle's single most valuable unmet need |
| Creative finance insight on a real deal that changes his offer strategy | Free to Plus ($29) | Could happen immediately — strongest launch-day trigger |
| Portfolio view handles mixed STR/LTR with correct KPIs per type | Pro retention | Makes Parcel the single portfolio dashboard |
| Team/partner sharing for deal analysis | Pro to Business ($149) | If Kyle partners with other investors on acquisitions |

### Churn Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| **STR mode does not exist yet** | **Critical** | Acknowledge gap honestly in onboarding. Show roadmap. Offer to notify when STR features ship. Do not pretend monthly rent input is sufficient for STR. |
| Parcel adds to tool spend rather than replacing tools | High | Until STR features ship, Parcel is additive. Position as "creative finance depth you can't get elsewhere" rather than "replace your stack." |
| Seasonal cash flow modeling absent | High | Kyle's forward projections require 12-month granularity. Without it, portfolio view is less useful than his custom spreadsheet. |
| AirDNA integration never materializes | High | If STR market data remains out of scope, Kyle has no reason to consolidate into Parcel. |
| Calculator outputs feel "LTR-centric" | Medium | Terminology matters. "Monthly Rent" should become "Monthly Income" or offer an "STR Revenue" input mode. Small copy changes reduce friction. |
| Onboarding does not recognize STR investor profile | Medium | Add an onboarding question: "What's your primary strategy?" with STR as an option. Tailor the experience even if features are limited. |

---

## 10. Competitive Displacement

### Tools Parcel CAN replace at launch

| Tool | How | Confidence |
|------|-----|------------|
| DealCheck ($14/mo) | Parcel's calculators are deeper, especially on creative finance. Kyle can run LTR and manual-input STR analyses in Parcel. | High |
| Google Sheets (free) | Parcel's deal analysis replaces Kyle's ad-hoc scenario modeling spreadsheets for acquisition underwriting. | Medium |

### Tools Parcel CANNOT replace at launch

| Tool | Why | What would change this |
|------|-----|----------------------|
| AirDNA ($149/mo) | Parcel has no STR market data — no ADR, occupancy, RevPAR benchmarks, no comp set tracking. | STR data integration (API partnership or proprietary data) |
| PriceLabs ($60/mo) | Dynamic nightly pricing is a specialized operational tool. Not in Parcel's scope. | Never — this is outside Parcel's domain (operations, not investing) |
| Hospitable ($60/mo) | Guest messaging automation is operational, not investment analysis. | Never — outside Parcel's domain |
| Stessa (free) | Parcel's portfolio management is lighter than Stessa's bookkeeping. No bank account sync, no receipt scanning, no tax-ready exports. | Deeper portfolio management features, bank integrations, tax reporting |
| Airtable ($20/mo) | Kyle's custom operational database tracks granular STR metrics Parcel does not model. | STR KPI dashboards in portfolio view |

### Net tool spend impact at launch
Kyle's current spend: ~$303/mo. Parcel at Plus ($29) replaces DealCheck ($14). Net change: +$15/mo. Kyle is paying more, not less. This is acceptable only if the creative finance depth and AI analysis justify the premium.

### Net tool spend impact with STR features (future)
If Parcel's STR mode partially replaces AirDNA's acquisition analysis use case (not the ongoing monitoring), Kyle might downgrade AirDNA to a cheaper tier or use it only for periodic reports. Potential savings: $50-100/mo. Combined with DealCheck replacement, Parcel at Pro ($79) could be roughly cost-neutral against displaced tools.

---

## 11. STR Expansion Roadmap Notes

This section defines what Parcel would need to build to fully serve Kyle and the broader STR investor segment. It is organized by priority and includes schema considerations to avoid blocking this expansion in current development.

### 11.1 Schema Considerations (Do Not Block)

The current deal/property schema should be designed so that future STR fields can be added without migration pain:

- **`income_type` field on deals/properties:** Enum of `LTR | STR | HYBRID`. Default `LTR` today. All current calculator logic should key off this field rather than assuming LTR. When `STR` is selected, the calculator should expect different input fields.
- **`monthly_revenue` should not be the only income field.** The schema should support an alternative: `nightly_rate`, `occupancy_rate`, and `seasonal_adjustments` (a 12-element array of multipliers). The calculator can derive monthly revenue from these inputs.
- **Portfolio KPIs should be polymorphic.** The portfolio dashboard should support different KPI sets per `income_type`. STR properties show RevPAR, ADR, occupancy. LTR properties show gross rent multiplier, price-to-rent ratio.
- **Market data schema should have a `data_source` field.** When STR data is integrated, it will come from a different source than LTR comps. The schema should accommodate multiple data providers per market.

### 11.2 Feature Requirements (Prioritized)

**Phase 1: STR Calculator Mode (Minimum viable for Kyle)**
- Add STR income input to the buy-and-hold calculator: nightly rate, occupancy rate, average length of stay, cleaning fee per turnover, platform commission rate (Airbnb typically 3%, VRBO 5-8%).
- Add a 12-month seasonality curve: let the user input monthly occupancy and ADR adjustments (e.g., January = 0.4x, July = 1.6x).
- Generate monthly cash flow projections that reflect seasonal variation rather than flat monthly income.
- STR-specific expense categories: cleaning costs (variable with bookings, not fixed), furnishing budget, supplies, platform fees, short-term rental insurance premium, local STR taxes/permits.
- Update all calculators (BRRRR, creative finance) to accept STR income mode.

**Phase 2: STR vs LTR Comparison**
- Side-by-side view: same property, two income models.
- Show cash-on-cash, cap rate, NOI, and total return for both strategies.
- AI analyst narrates the trade-offs: "STR produces 34% higher cash-on-cash but requires 15 hours/month of management time and carries regulatory risk. LTR is hands-off but caps your return at 9.2%."
- Factor in STR-specific risks: regulatory changes, seasonality downside, higher vacancy during shoulder seasons, furnishing capex.

**Phase 3: STR Market Data Integration**
- Partner with or license data from AirDNA, Mashvisor, AllTheRooms, or Transparent (now Key Data Dashboard) for STR market data.
- Required data points per submarket: median ADR, median occupancy rate, RevPAR, seasonal demand curve, active listing count, new listing growth rate, regulatory status.
- Auto-populate STR revenue assumptions in the calculator based on market data — user can override.
- Comp set builder: let Kyle define 10-15 comparable properties and track their performance over time.

**Phase 4: Portfolio STR KPIs**
- Portfolio dashboard shows STR-specific KPIs alongside LTR KPIs for mixed portfolios.
- Per-property STR metrics: trailing 30/60/90 day ADR, occupancy, RevPAR.
- Portfolio-level metrics: blended yield across STR and LTR properties, seasonal cash flow forecast, debt service coverage ratio by month (critical for STR where some months may not cover debt service).
- Allow manual KPI entry (Kyle will input his own data from Airbnb dashboards) until automated data feeds exist.

### 11.3 Data Source Options

| Provider | Coverage | Cost Model | Integration Complexity |
|----------|----------|------------|----------------------|
| AirDNA | Best US coverage, global expanding | API license, per-query or flat fee, likely $2-10K/mo at scale | Well-documented API, JSON responses |
| Mashvisor | US coverage, lighter dataset | Lower cost, API available | Simpler API, less granular seasonality data |
| AllTheRooms | Global coverage | Enterprise pricing | More complex integration |
| Key Data Dashboard (Transparent) | Strong US coverage | Enterprise pricing | Newer API, good data quality |
| Manual user input (Phase 1) | N/A | $0 | No integration needed — user enters their own AirDNA data |

**Recommended approach:** Ship Phase 1 (calculator STR mode) with manual user input. This costs nothing, serves Kyle's immediate need, and validates demand before committing to a data licensing deal. If adoption is strong, negotiate an AirDNA API license for Phase 3.

### 11.4 Regulatory Awareness

STR regulations are a material risk factor that Kyle and all STR investors care about. Parcel should eventually surface:
- Municipal STR permit requirements and cap status.
- Recent regulatory changes or pending legislation.
- HOA restriction flags (many condos prohibit STR).

This data is difficult to source programmatically and may initially be best handled through AI analyst commentary that prompts the user to verify local regulations, rather than a structured database.

### 11.5 Wave Alignment

STR features do not cleanly fit into a single existing wave. Recommended approach:
- **Wave 3 (calculator upgrades):** Add STR mode to buy-and-hold and BRRRR calculators. This is calculator logic, not new data infrastructure.
- **New Wave (STR Data):** Dedicated wave for STR market data integration, comp set tracking, and portfolio STR KPIs. This requires a data partnership and is a larger initiative.
- **Wave 0 (schema):** Ensure the `income_type` field and polymorphic KPI support are in Wave 0 schema design or the earliest migration that touches the deal/property model.

---

*Document created 2026-04-02. This persona is classified as FUTURE — revisit when Wave 3 calculator upgrades are scoped to evaluate STR mode inclusion.*
