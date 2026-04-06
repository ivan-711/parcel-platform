# Persona 06: Carlos Medina — The Creative Finance Investor

> **Classification:** Primary Persona | Blue Ocean Target
> **Archetype:** Sophisticated operator managing complex financial structures with inadequate tools
> **Revenue Tier:** Pro ($79/mo) — immediate conversion, no trial hesitation
> **Strategic Importance:** CRITICAL — Carlos represents Parcel's primary competitive differentiation. No competing product serves his post-closing monitoring needs. Every feature built for Carlos widens the moat.

---

## 1. Profile Summary

| Attribute | Detail |
|---|---|
| **Name** | Carlos Medina |
| **Age** | 42 |
| **Location** | Phoenix, AZ (one of the highest-volume creative finance markets in the US) |
| **Experience** | 8 years in real estate investing; 3 years focused on creative finance |
| **Portfolio** | 14 properties: 6 subject-to, 4 seller financed, 2 lease options, 2 traditional |
| **Monthly Cash Flow** | ~$8,400/mo net across portfolio |
| **Education** | B.S. in Business Administration; self-taught in creative finance structures |
| **Community** | Pace Morby's SubTo community member (3 years), now a mentor |
| **Current Monthly Tool Spend** | $24-50/mo |
| **Target Parcel Tier** | Pro ($79/mo) |

Carlos is a deliberate, systems-oriented investor who transitioned to creative finance out of necessity. After five years of conventional investing, he hit the Fannie Mae 10-loan ceiling and watched deals slip away while banks told him no. A friend introduced him to Pace Morby's SubTo community in 2023, and within six months he had closed his first subject-to deal — acquiring a property with a 3.2% underlying mortgage rate that he could never touch in the current rate environment.

Three years later, Carlos has built a 14-property portfolio using four distinct creative finance structures. He is meticulous about compliance, deeply aware of the risks inherent in each structure, and frustrated that no technology exists to help him manage the post-closing complexity that comes with these deals.

Carlos mentors 4-5 newer investors in his local SubTo meetup group. He runs a monthly "Creative Finance Office Hours" session at a coworking space in Tempe. He is active in three Discord communities and one Facebook group. When he finds a tool that works, he tells everyone. When a tool fails him, he tells everyone louder. His endorsement carries weight because he is known for rigor — he does not recommend things casually.

He is not a "guru" or influencer. He is a practitioner who teaches because he remembers how confusing the transition to creative finance was. He has a day job as a project manager at a mid-size construction company, which means his real estate operations must be systematized and efficient — he cannot babysit a spreadsheet all day.

Carlos thinks in terms of risk mitigation first, returns second. He has seen investors in his community lose properties to due-on-sale clause enforcement, miss balloon payments, and let insurance lapse on subject-to properties. He is borderline paranoid about these scenarios, which is exactly why his current system — a Google Sheets workbook with 23 tabs — exists at all.

---

## 2. Current Tool Stack

### Primary Tools

| Tool | Cost | Function | Pain Level |
|---|---|---|---|
| **Google Sheets** (master workbook) | $0 | Portfolio tracking, payment schedules, balloon dates, insurance tracking | Extreme — single point of failure |
| **Google Calendar** | $0 | Reminders for payments, balloon dates, insurance renewals, lease option deadlines | High — no context in reminders, easy to dismiss |
| **Podio** | $24/mo | Lead management, deal pipeline, seller follow-up CRM | Moderate — works for acquisition, useless post-closing |
| **DealCheck** | $0-14/mo | Initial deal analysis, quick ARV/cash flow estimates | Low — good for analysis, no creative finance depth |
| **Dropbox** | $12/mo | Document storage: contracts, insurance policies, mortgage statements | Moderate — no connection to dates or alerts |
| **Venmo/Zelle** | $0 | Collecting tenant payments | Low |

**Total Monthly Spend: $36-50/mo**

### The Google Sheets Workbook — Carlos's Lifeline

This workbook is the operational center of Carlos's business. It has evolved organically over three years and is held together with manual effort. Structure:

**Tab 1: Portfolio Dashboard**
- Summary of all 14 properties: address, acquisition date, structure type, monthly cash flow, equity position
- Conditional formatting flags properties with upcoming deadlines (turns red within 30 days)
- Manual updates required weekly

**Tabs 2-7: Subject-To Properties (one tab each)**
- Underlying mortgage details: lender, original borrower, loan number, remaining balance, interest rate, P&I payment amount, escrow amount
- Monthly payment tracking: date due, date paid, confirmation number (manually entered)
- Underlying mortgage payoff schedule (amortization table pasted from lender statement)
- Insurance policy details: carrier, policy number, expiration date, premium, additional insured status
- Property tax status and payment schedule
- Tenant/buyer details and payment received tracking
- Notes section for lender correspondence

**Tabs 8-11: Seller Financed Properties (one tab each)**
- Seller/note holder contact info
- Promissory note terms: principal, interest rate, monthly payment, balloon date, balloon amount
- Amortization schedule
- Payment history (sent to seller)
- Late payment grace period and penalty terms
- Balloon date countdown (formula: =DATEDIF(TODAY(), balloon_date, "d"))
- Insurance and tax tracking

**Tabs 12-13: Lease Option Properties (one tab each)**
- Lease terms: start date, monthly rent, lease duration, renewal options
- Option terms: option fee paid, strike price, option expiration date
- Monthly rent credit tracking and accumulated credit balance
- Landlord/seller contact and payment routing
- Option exercise deadline countdown
- Improvement tracking (costs that may affect option exercise decision)

**Tabs 14-15: Traditional Properties**
- Standard mortgage tracking
- Simpler than creative finance tabs

**Tab 16: Master Calendar**
- All dates across all properties in chronological list
- Color-coded by type: red = mortgage payment, orange = balloon date, yellow = insurance renewal, blue = lease option deadline
- Manually maintained — most error-prone tab

**Tab 17: Insurance Tracker**
- All 14 policies: carrier, policy number, premium, renewal date, additional insured requirements
- Subject-to properties require maintaining insurance with the original borrower still listed
- Annual renewal workflow tracked here

**Tab 18: Cash Flow Summary**
- Monthly incoming (tenant payments, lease option payments)
- Monthly outgoing (underlying mortgages, seller finance payments, insurance, taxes, maintenance)
- Net cash flow by property and portfolio-wide

**Tabs 19-23: Deal Analysis Archive**
- Historical analysis for deals closed and deals passed on
- Templates for each creative finance structure

### What Breaks

1. **No automated alerts.** Calendar reminders fire, but they carry no context. "Pay mortgage — 123 Main St" tells Carlos nothing about the underlying loan balance, rate, or consequences of missing the payment.

2. **Version control is nonexistent.** Carlos has accidentally overwritten formulas. He once deleted a balloon date countdown and did not notice for two weeks.

3. **No relationship between data.** The insurance tab does not know about the subject-to tab. If an insurance policy lapses, there is no automatic flag on the property record that says "this subject-to property now has a catastrophic risk."

4. **Collaboration is dangerous.** Carlos's wife helps manage the portfolio. Shared editing in Google Sheets has caused formula corruption twice.

5. **Mobile access is terrible.** Checking on a property from his phone means scrolling through a 23-tab spreadsheet on a 6-inch screen.

6. **No historical trend analysis.** Carlos cannot easily answer: "What is my average time from lead to close for subject-to deals?" or "How has my portfolio cash flow trended over 12 months?"

---

## 3. Detailed Daily/Weekly Workflow

### Daily Morning Ritual (6:15 AM - 6:45 AM, before day job)

**6:15 AM — Payment Check**
Carlos opens Google Sheets on his laptop. He checks which mortgage payments or seller finance payments are due within the next 7 days. For subject-to properties, he must make underlying mortgage payments on behalf of the original borrower. He cross-references his bank account to confirm that scheduled payments went through.

For each subject-to property due this week:
1. Log into the underlying lender's portal (he has 4 different lender portals bookmarked)
2. Verify the auto-pay is still active and the correct amount
3. Confirm the payment posted (or is scheduled)
4. Record the confirmation number in his Google Sheet
5. Check that the loan balance matches his amortization projection (catches any escrow adjustments)

This process takes 15-20 minutes for 6 subject-to properties across 4 lenders.

**6:35 AM — Calendar Scan**
He reviews Google Calendar for the next 14 days. He is looking for:
- Insurance renewal deadlines
- Balloon payment dates approaching (his nearest balloon is 14 months away, but he checks compulsively)
- Lease option exercise windows
- Property tax due dates
- Tenant lease renewal dates

**6:45 AM — Mental Risk Assessment**
Before closing the laptop, Carlos does a mental walkthrough: "Is there anything that could blow up this week?" He is thinking about:
- Lenders who might notice the insurance change on a subject-to
- Sellers who might call about a late payment
- Tenants with upcoming lease expirations
- Any property where the underlying mortgage rate is adjustable (one of his subject-to properties has an ARM that resets in 9 months)

### Weekly Workflow (Sunday Afternoon, 2 hours)

**Hour 1: Portfolio Reconciliation**
- Compare bank statements against his Google Sheets payment records
- Update cash flow tab with actual income received vs. expected
- Flag any tenant late payments
- Update loan balances based on amortization schedules
- Check all 14 property insurance policies are active (logs into carrier portals or checks email for cancellation notices)

**Hour 2: Pipeline and Strategic Review**
- Review leads in Podio — any new creative finance opportunities?
- Run DealCheck analysis on 1-2 potential deals
- Update his "deal criteria" notes based on current interest rate environment
- Prepare for his Tuesday mentoring session if applicable

### Monthly Workflow (First Saturday, 3-4 hours)

- Full financial reconciliation across all properties
- Update net equity estimates (based on Zillow/Redfin comps — no formal appraisals)
- Review all balloon date countdowns — recalculate if any terms have changed
- Review insurance policies — any rate changes, coverage gaps, or carrier concerns?
- Generate a "portfolio health report" (manual, in a Google Doc) for his wife
- Review tax implications — he tracks depreciation schedules for each property in a separate spreadsheet his CPA set up
- Evaluate which properties are candidates for refinance to conventional (exit from creative finance structure)

### Quarterly Workflow

- Meet with his CPA to review entity structure and tax position
- Review all underlying mortgage statements for subject-to properties — look for escrow adjustments, rate changes (ARM properties), or any lender correspondence to the original borrower
- Evaluate portfolio-level risk: "If two tenants stopped paying simultaneously, which properties am I most exposed on?"
- Assess whether any balloon dates require action (refinance preparation starts 6-12 months before a balloon is due)

---

## 4. Pain Points (Ranked by Severity)

### P1: Underlying Mortgage Payment Monitoring — Existential Risk

**The problem:** Carlos makes underlying mortgage payments on 6 subject-to properties. These payments go to the original lender, on the original borrower's loan. If a payment is missed or late:
- The lender may investigate and discover the property was transferred
- This could trigger the **due-on-sale clause**, requiring the full loan balance to be paid immediately
- Carlos would need to refinance (at today's higher rates, destroying his cash flow) or lose the property
- **Dollar risk per property: $180,000-$340,000 (remaining loan balances)**
- **Total portfolio exposure: ~$1.5M across 6 subject-to properties**

Carlos's current "system" is auto-pay through lender portals plus manual verification in Google Sheets. Auto-pay has failed twice in three years (once due to a bank routing number change, once due to a lender system update). Both times, Carlos caught it within 48 hours because of his morning ritual. If he had been traveling or sick, the payment could have gone 30+ days late.

**What Carlos needs:** A system that independently monitors payment status across all underlying mortgages, alerts him immediately if a payment fails or is late, and tracks lender behavior patterns that might indicate due-on-sale investigation.

### P2: Balloon Date Management — Portfolio-Threatening Risk

**The problem:** Four of Carlos's seller-financed properties have balloon payments. These are large lump-sum payments due at a specific future date, typically requiring refinance or sale.

| Property | Balloon Amount | Balloon Date | Months Remaining |
|---|---|---|---|
| 412 Saguaro Dr | $187,000 | June 2027 | 14 |
| 8891 Camelback Rd | $224,000 | March 2028 | 23 |
| 1150 Desert Ridge Pkwy | $156,000 | November 2028 | 31 |
| 3305 McDowell Rd | $198,000 | August 2029 | 40 |

If Carlos misses a balloon payment, the seller can foreclose. There is no grace period on most balloon clauses. Preparation requires:
- Beginning the refinance process 6-9 months before the balloon date
- Ensuring the property appraises high enough to support conventional financing
- Having credit and DTI ratios in order
- Maintaining a cash reserve as backup

**Dollar risk: $765,000 in balloon obligations over the next 40 months.**

Carlos currently tracks this with a countdown formula in Google Sheets and a Google Calendar reminder set 9 months before each date. If the formula breaks or the calendar reminder is accidentally dismissed, there is no backup system.

**What Carlos needs:** Automated balloon date tracking with multi-stage alerts (12 months, 9 months, 6 months, 90 days, 30 days), integrated refinance preparation checklists, and AI analysis of whether the property's current value supports refinance.

### P3: Insurance Compliance Gaps — Catastrophic Exposure

**The problem:** Subject-to properties have specific insurance requirements:
- The original borrower must remain on the policy (or the lender may investigate)
- Carlos must be listed as additional insured
- Coverage must meet the lender's minimum requirements
- If insurance lapses, the lender will force-place expensive insurance and may investigate ownership

Carlos tracks 14 insurance policies across 8 different carriers. Renewal dates are scattered throughout the year. Each policy has different requirements depending on the deal structure.

For subject-to properties specifically:
- The original borrower's name must stay on the policy
- Carlos needs to coordinate with sellers who may not understand why they are still on an insurance policy for a house they "sold"
- One seller has already called their insurance carrier to cancel "their" policy, requiring an emergency intervention by Carlos

**Dollar risk: Force-placed insurance costs 3-5x market rate. Lender investigation of an insurance change is one of the top triggers for due-on-sale enforcement. Worst case: loan acceleration on a $300K+ mortgage.**

**What Carlos needs:** Centralized insurance tracking with renewal countdowns, automatic alerts 60/30/15 days before expiration, flagging of any policy changes that could alert a lender, and integration awareness of which policies are on subject-to properties (higher risk).

### P4: No Unified View Across Deal Structures — Operational Friction

**The problem:** Carlos manages four fundamentally different financial structures, each with different obligations, timelines, and risk profiles. His Google Sheets workbook treats each property as an island. He cannot answer basic portfolio questions without manual calculation:

- "What is my total monthly obligation across all structures?"
- "Which properties have deadlines in the next 90 days?"
- "What is my blended portfolio risk — how many properties have exposure to due-on-sale vs. balloon vs. option expiration?"
- "If interest rates drop 100bps, which properties should I refinance to conventional first?"

Every portfolio-level decision requires opening multiple tabs, doing mental math, and hoping the data is current.

**What Carlos needs:** A unified dashboard that normalizes creative finance structures into a single risk-aware portfolio view, with filterable views by structure type, risk category, and timeline.

### P5: Deal Analysis Tools Ignore Creative Finance — Acquisition Friction

**The problem:** DealCheck and every other calculator Carlos has tried assume conventional financing. They have fields for "down payment," "interest rate," and "loan term." They do not have fields for:

- Subject-to existing mortgage assumption (inheriting someone else's loan terms)
- Seller finance with custom amortization and balloon
- Lease option with rent credits accumulating toward purchase price
- Wrap mortgages (lending to a buyer at a higher rate than your underlying obligation)
- Hybrid structures (e.g., seller finance on the equity above the existing subject-to mortgage)

Carlos runs his own analysis in Google Sheets, which takes 30-45 minutes per deal. A conventional deal analysis in DealCheck takes 5 minutes.

**What Carlos needs:** Deal analysis calculators purpose-built for creative finance structures, with fields that match how these deals are actually structured, and output that includes the unique risks and cash flows of each structure type.

---

## 5. Jobs To Be Done

### JTBD 1: Post-Closing Obligation Monitoring
**When** I close a creative finance deal, **I want** every post-closing obligation (mortgage payments, balloon dates, insurance renewals, lease option deadlines) automatically tracked and monitored, **so that** I never miss a critical date that could cost me a property.

### JTBD 2: Risk-Aware Portfolio Visibility
**When** I review my portfolio, **I want** a single view that shows me the risk profile of every property across all creative finance structures, **so that** I can make strategic decisions about refinancing, selling, or acquiring without spending two hours in a spreadsheet.

### JTBD 3: Creative Finance Deal Analysis
**When** I evaluate a new creative finance opportunity, **I want** to model the specific structure (subject-to, seller finance, lease option, wrap) with accurate cash flows and risk metrics, **so that** I can make an informed acquisition decision in minutes instead of building a spreadsheet from scratch.

### JTBD 4: Lender and Seller Relationship Management
**When** I manage ongoing relationships with underlying lenders (subject-to) and note holders (seller finance), **I want** to track all communications, payment histories, and behavioral patterns, **so that** I can detect early warning signs of due-on-sale enforcement or seller disputes.

### JTBD 5: Community Knowledge Sharing
**When** I mentor newer creative finance investors, **I want** to share portfolio structures and deal analyses as templates, **so that** I can teach effectively and demonstrate the real-world complexity of creative finance management.

---

## 6. Journey Map

### Stage 1: Awareness

**Trigger:** Carlos is in a SubTo Discord channel. Someone asks: "What do you use to track your subject-to payments and balloon dates?" The thread fills with answers: Google Sheets, Notion templates, Stessa (doesn't work for creative finance), and general frustration. Carlos has had this conversation thirty times.

**This time is different:** Someone replies, "I just started using Parcel — it has subject-to monitoring with automatic payment tracking and balloon countdowns." Carlos has never heard of Parcel. He pauses scrolling.

**Emotional state:** Skeptical but alert. He has been burned by tools that claim to support creative finance and then offer a single "other" dropdown in their financing type selector.

**Action:** Clicks the link. Lands on Parcel's marketing page.

**Critical moment:** Within 10 seconds, Carlos needs to see the words "subject-to," "seller finance," "lease option," or "creative finance" used correctly and prominently — not buried in a footnote. If the landing page looks like another conventional-finance tool with creative finance as an afterthought, he bounces.

### Stage 2: Evaluation

**Duration:** 15-20 minutes of intense scrutiny. Carlos is not a casual browser. He is evaluating whether this tool understands his world.

**What he looks for, in order:**
1. Does the product page mention specific creative finance structures by name?
2. Are there screenshots showing subject-to payment tracking, balloon date monitoring, or insurance compliance tracking?
3. Is there a demo or video showing the creative finance features in action?
4. What is the pricing? (He will pay $79/mo without hesitation if the features are real.)
5. Is there a free trial? (He wants to test with real data before committing.)

**What he does NOT care about:**
- Conventional mortgage tracking (he has 2 traditional properties — they are simple)
- Wholesaling features
- Skip tracing or direct mail (he sources deals through relationships and community)

**Emotional state:** Growing excitement mixed with protective skepticism. He has imagined this tool in his head for three years. If the screenshots match his imagination, his heart rate goes up.

**Critical moment:** Carlos looks for specificity. If a feature says "track your financing terms," that is generic — every tool says that. If a feature says "monitor underlying mortgage payments on subject-to acquisitions with due-on-sale risk alerts," Carlos knows this tool was built for him.

**Action:** Signs up for a trial. Immediately. Does not compare pricing tiers. Goes straight to the highest tier that includes creative finance features.

### Stage 3: Onboarding

**Duration:** 2-3 hours over his first weekend.

**Carlos's onboarding is not casual exploration.** He arrives with 14 properties, each with specific financial structures, and he needs to enter all of them to evaluate whether Parcel can replace his Google Sheets workbook. This is a migration, not a test drive.

**What he enters first:** His most complex subject-to property. This is the acid test. He needs to enter:
- The underlying mortgage details (lender, loan number, remaining balance, rate, monthly payment)
- The acquisition terms (what he paid, how the deal was structured)
- The insurance policy details (with original borrower still listed)
- The tenant/buyer occupying the property
- The monthly cash flow (rent received minus mortgage payment minus expenses)

**If the data model accommodates all of this,** Carlos enters the remaining 13 properties over the next two hours.

**If any field is missing — if he cannot specify "subject-to" as a structure type, if there is no field for "underlying mortgage lender," if balloon dates do not have countdown alerts — he closes the tab.** There is no "I'll use it for my traditional properties." He came for creative finance. That is the only test.

**AI interaction during onboarding:** When Carlos enters his first subject-to property, Parcel's AI should recognize the structure and proactively ask: "I see this is a subject-to acquisition. Would you like me to set up underlying mortgage payment monitoring and due-on-sale risk alerts?" This is the moment Carlos realizes the tool was built for him.

**Emotional state:** Cautiously hopeful during data entry. Either deeply satisfied or deeply disappointed by the end of hour one.

### Stage 4: Activation

**Activation event:** Carlos opens Parcel on a Monday morning and sees:

> "3 upcoming obligations this week: Underlying mortgage payment on 412 Saguaro Dr due Wednesday ($1,847.23 to Wells Fargo). Seller finance payment on 8891 Camelback Rd due Friday ($1,200.00 to David Chen). Insurance renewal for 1150 Desert Ridge Pkwy in 23 days — renewal quote not yet received."

This replaces his 30-minute morning spreadsheet ritual with a 2-minute dashboard scan. **Carlos's spreadsheet was a survival mechanism. Parcel just made it obsolete.**

**Secondary activation:** The balloon date dashboard shows all four balloon payments with countdowns, color-coded by urgency, with refinance preparation milestones auto-generated. Carlos has never seen his balloon exposure visualized this way. He screenshots it and sends it to his wife.

**Emotional state:** Relief. This is not excitement about a shiny new tool. This is the relief of a person who has been holding a complex system together with manual effort for three years and has finally found something that can share the load.

**Time to activation:** Same weekend as signup. Carlos does not have a 14-day ramp. He either activates fully in 48 hours or churns.

### Stage 5: Engagement

**Week 1-2:** Carlos is in Parcel daily. He is validating that the system matches his spreadsheet. He cross-references every payment date, every balloon countdown, every insurance renewal. He finds one discrepancy in an amortization calculation and reports it. This is not a complaint — this is Carlos investing in the tool's accuracy because he wants to trust it.

**Week 3-4:** Carlos begins to trust the system. He stops opening his Google Sheet for daily checks. He still opens it weekly "just in case" but finds nothing that Parcel missed. He starts using the deal analysis calculators for a new subject-to opportunity.

**Month 2:** The Google Sheet is archived. Carlos has fully migrated. He is now using Parcel for:
- Daily obligation monitoring (replaces morning spreadsheet ritual)
- Balloon date tracking with refinance preparation timeline
- Insurance compliance monitoring
- Cash flow tracking across all structures
- New deal analysis for creative finance opportunities
- Portfolio risk assessment

**Month 3+:** Carlos starts requesting features. He wants wrap mortgage tracking (a structure where he seller-finances a property to a buyer while still making payments on the underlying subject-to mortgage). He wants portfolio-level scenario modeling ("If rates drop to 5.5%, which properties should I refinance first?"). He is not a passive user. He is a co-designer.

### Stage 6: Conversion

**Timing:** Carlos converts to Pro ($79/mo) within the first week — likely within the first 48 hours.

**Decision process:** There is no deliberation. Carlos currently spends $36-50/mo on tools that do not solve his core problem. Parcel solves his core problem. He has been willing to pay for this solution since before it existed. The $79 price point is justified by a single prevented catastrophe — one avoided due-on-sale enforcement is worth more than a lifetime subscription.

**Carlos skips Free and Plus entirely.** He does not evaluate whether the free tier meets his needs. He goes to the pricing page, identifies which tier includes creative finance monitoring, and subscribes.

**Internal justification:** "One missed underlying mortgage payment could cost me $300K. Parcel costs $79/mo. This is the cheapest insurance policy in my portfolio."

### Stage 7: Retention

**What keeps Carlos:**
- Zero missed obligations in the first 6 months. The system works. He trusts it.
- AI insights he could not generate from his spreadsheet: "Your subject-to property at 2240 Baseline has an ARM that resets in 9 months. Based on current rate projections, your payment could increase by $340/mo. Consider refinancing to conventional before the reset."
- Continuous feature development in creative finance. Carlos sees Parcel shipping features that deepen the creative finance capabilities, confirming that this is a core focus, not a side feature.

**What would cause churn:**
- A false negative: the system fails to alert him to a missed payment or an insurance lapse. One failure destroys trust permanently.
- Feature stagnation: if creative finance features stop evolving while conventional features get attention, Carlos concludes he is not the target customer.
- Data integrity issues: if amortization calculations are wrong, balloon countdowns are off, or payment amounts do not match lender statements, Carlos goes back to his spreadsheet.

### Stage 8: Advocacy

**Carlos is the highest-leverage advocate in Parcel's user base.**

He mentors 4-5 investors who will all need the same tool. He speaks at a monthly meetup of 20-30 creative finance investors. He is active in Discord communities with hundreds of members.

**How he advocates:**
- At his Tuesday mentoring session: "Let me show you how I track my subject-to obligations. This is Parcel." He shares his screen. The mentees see a dashboard purpose-built for their strategy. They sign up that night.
- In Discord: when the inevitable "what tool do you use?" thread appears, Carlos writes a detailed post explaining his migration from Google Sheets to Parcel. He includes screenshots. The post gets pinned.
- One-on-one: when a mentee closes their first subject-to deal and asks "now what do I do about tracking the underlying mortgage?", Carlos says "set it up in Parcel" and walks them through onboarding.

**Carlos does not advocate because Parcel asked him to.** He advocates because he spent three years looking for this tool and wants every creative finance investor to stop using spreadsheets for life-or-death financial obligations.

**Estimated referral value:** 8-12 direct referrals in Year 1, each at Pro tier ($79/mo). Carlos's advocacy alone could generate $7,500-$11,400 in ARR beyond his own subscription.

---

## 7. Feature Priority Matrix

| Feature | Priority | Rationale |
|---|---|---|
| **Subject-to underlying mortgage monitoring** | MUST HAVE | Core activation trigger. Without this, Carlos does not sign up. |
| **Balloon date tracking with countdown alerts** | MUST HAVE | Second activation trigger. Multi-stage alerts (12mo/9mo/6mo/90d/30d) are non-negotiable. |
| **Insurance compliance tracking** | MUST HAVE | Third pillar of creative finance monitoring. Lapse = catastrophic risk. |
| **Seller finance payment tracking (outbound)** | MUST HAVE | 4 properties with seller note holders expecting monthly payments. |
| **Creative finance deal calculators** | MUST HAVE | Subject-to, seller finance, lease option, wrap — with correct fields and output. |
| **Lease option deadline tracking** | MUST HAVE | Option expiration dates, rent credit accumulation, exercise windows. |
| **Unified portfolio dashboard** | MUST HAVE | All 14 properties, all structures, all obligations in one view. |
| **AI risk analysis and insights** | HIGH VALUE | Rate change impact modeling, refinance timing suggestions, risk scoring. |
| **Cash flow tracking by structure type** | HIGH VALUE | Monthly P&L across creative finance and conventional properties. |
| **Mobile dashboard** | HIGH VALUE | Morning check from phone instead of laptop. Must show obligations due today/this week. |
| **Document storage linked to properties** | HIGH VALUE | Contracts, insurance policies, lender correspondence — connected to the right property. |
| **CRM for sellers/note holders** | HIGH VALUE | Track relationships with people Carlos owes money to (sellers, note holders). |
| **Amortization schedule visualization** | HIGH VALUE | Visual payoff timeline for underlying mortgages and seller notes. |
| **Wrap mortgage tracking** | HIGH VALUE | Carlos has not yet done a wrap, but plans to. This is his next structure. |
| **Portfolio scenario modeling** | NICE TO HAVE | "If rates hit X, which properties should I refi?" — strategic but not urgent. |
| **Comparable property analysis** | NICE TO HAVE | Useful for refinance appraisal prep but not a daily need. |
| **Lead management/CRM for acquisition** | NICE TO HAVE | Carlos uses Podio and would switch if Parcel's CRM is good, but it is not why he signs up. |
| **Skip tracing** | NOT RELEVANT | Carlos sources deals through community and relationships. |
| **Direct mail campaigns** | NOT RELEVANT | Not his acquisition strategy. |
| **Wholesale deal management** | NOT RELEVANT | Carlos does not wholesale. |
| **Tenant screening** | NOT RELEVANT | He uses a separate service and has minimal turnover. |

---

## 8. Parcel's Voice for This Persona

Carlos is a sophisticated operator. He uses terms like "due-on-sale clause," "equitable interest," "performance mortgage," and "option consideration" in everyday conversation. Parcel's AI must match this level of fluency. Talking down to Carlos — explaining what a subject-to is, or defining "balloon payment" — would signal that the product was not built for him.

### Voice Principles for Carlos

- **Assume expertise.** Carlos does not need definitions. He needs analysis.
- **Quantify risk.** Carlos thinks in dollar exposure, not abstract "risk levels."
- **Be specific about structures.** Reference the exact creative finance terms and their implications.
- **Surface what a spreadsheet cannot.** The AI's value is in connecting data points across properties and structures that Carlos would have to manually cross-reference.

### Example AI Insights at Carlos's Level

**Insight 1: Balloon Date Warning with Refinance Analysis**

> "Your balloon payment on 412 Saguaro Dr ($187,000) is due in 14 months. Based on the property's estimated current value of $310,000 and a conventional 30-year rate of 6.75%, a refinance would result in a monthly payment of $1,612 — an increase of $364/mo over your current seller finance payment of $1,248. Your cash flow on this property would drop from $547/mo to $183/mo. Recommendation: Begin refinance conversations with lenders now to lock a rate. If rates decrease before closing, you preserve more cash flow. If you wait, you risk rate increases compressing your margin further — or worse, being unable to close before the balloon date."

**Insight 2: Underlying Mortgage ARM Reset Impact**

> "The underlying mortgage on 2240 E Baseline Rd has an adjustable rate that resets in 9 months. The current rate is 3.25% with a 2% periodic cap. If the index rate remains at current levels, your payment will increase from $1,423/mo to approximately $1,763/mo — a $340/mo increase that reduces your net cash flow on this property from $412/mo to $72/mo. This property becomes a candidate for refinance to conventional, but at today's rates your new payment would be $1,890/mo, making it cash-flow negative. Consider: (1) negotiating a rate cap extension with the original borrower's lender is not possible since you are not the borrower of record, (2) selling the property before the reset while capturing the equity, or (3) raising the tenant's rent by $300/mo at the next lease renewal to absorb the increase."

**Insight 3: Insurance Gap Detection**

> "The insurance policy on 745 N 32nd St (subject-to, underlying lender: Chase) expires in 18 days. No renewal confirmation has been logged. This property has the original borrower, Maria Gonzalez, listed as the named insured — which is required to avoid triggering a lender inquiry. If this policy lapses, Chase will force-place coverage at approximately $3,200/yr (versus your current premium of $1,140/yr) and the escrow adjustment may prompt a review of the loan file. Immediate action: Contact your insurance agent to confirm renewal and verify that Maria Gonzalez remains as named insured with you as additional insured."

### Contrast: How the AI Would Address Marcus (Beginner Wholesaler)

For the same concept of insurance tracking, the AI would say to Marcus:

> "Quick reminder: the insurance on your property at 1220 Oak St renews in 3 weeks. Make sure your coverage stays active — your lender requires it. Want me to add a reminder for 1 week before?"

The difference: Marcus gets a simple reminder with a brief explanation of why it matters. Carlos gets a risk-quantified alert with specific dollar exposure, structural implications (named insured requirements for subject-to), and concrete next steps that reference the unique dynamics of his deal structure.

---

## 9. Conversion Triggers and Churn Risks

### Conversion Triggers

| Trigger | Confidence | Notes |
|---|---|---|
| Sees "subject-to monitoring" as a named feature | Very High | This phrase alone signals the product understands his world |
| Enters a subject-to property and sees fields for underlying mortgage details | Very High | Data model validation — the tool was built for this |
| Receives first automated payment obligation alert | Very High | Replaces his morning spreadsheet ritual — this is the activation moment |
| Balloon date countdown dashboard with multi-stage alerts | High | Visual proof that the tool manages his highest-stakes deadlines |
| AI insight that references due-on-sale risk or balloon preparation | High | Confirms the AI understands creative finance at his level |
| Referral from a trusted community member | High | Carlos trusts practitioners, not marketing |
| Free trial with no credit card required | Moderate | Lowers friction, but Carlos is willing to pay regardless |

### Churn Risks

| Risk | Severity | Mitigation |
|---|---|---|
| Missed obligation alert (false negative) | CRITICAL — immediate churn | Triple-redundant alert system: in-app, email, SMS. Never suppress or batch creative finance payment alerts. |
| Inaccurate amortization or payment calculations | CRITICAL — immediate churn | Validate against actual lender statements during onboarding. Allow manual override with audit trail. |
| Creative finance features deprioritized in roadmap | HIGH — 90-day churn | Visible creative finance roadmap. Regular feature releases in this category. Carlos watches the changelog. |
| No mobile experience for morning obligation check | HIGH — gradual disengagement | Mobile-responsive dashboard at minimum. Native app preferred. Morning check must work on a phone. |
| Onboarding too slow or generic | HIGH — never activates | Creative finance-specific onboarding path. Do not make Carlos sit through wholesaling tutorials. |
| Data export unavailable | MODERATE — anxiety-driven churn | Carlos will not fully commit if he cannot export his data. He has been burned by platform lock-in. |
| No wrap mortgage support when he needs it | MODERATE — future churn | Roadmap transparency. If Carlos sees wraps on the roadmap, he will wait. If not, he starts to doubt the product's direction. |

---

## 10. Competitive Displacement

### The Central Fact: There Are No Direct Competitors

No existing real estate investing tool provides creative finance post-closing monitoring. This is not a competitive landscape analysis — it is a vacuum analysis. Carlos is not choosing between Parcel and another tool. He is choosing between Parcel and the Google Sheets workbook he has spent three years building.

### Current Tool-by-Tool Displacement

**Google Sheets (his master workbook)**
- What it does: Everything. Poorly.
- Why it persists: Because nothing else can hold creative finance data structures.
- What Parcel replaces: The entire workbook. Every tab. Every formula. Every manual update.
- Displacement difficulty: HIGH — Carlos has invested hundreds of hours in this workbook. It is customized to his exact needs. Parcel must match its flexibility while exceeding its reliability.

**Google Calendar (payment and deadline reminders)**
- What it does: Fires reminders with no context.
- Why it persists: Free, simple, ubiquitous.
- What Parcel replaces: All financial obligation reminders. Calendar events become Parcel alerts with full context (dollar amount, risk implications, next steps).
- Displacement difficulty: LOW — Calendar reminders are acknowledged as inadequate. Carlos wants to replace them.

**Podio ($24/mo — lead management CRM)**
- What it does: Manages acquisition pipeline and seller follow-up.
- Why it persists: It works for the front end of the deal lifecycle.
- What Parcel replaces: Potentially the full CRM if Parcel's lead management is competent (Wave 1). But this is not why Carlos adopts Parcel.
- Displacement difficulty: MODERATE — Podio is entrenched in his acquisition workflow. Parcel should integrate or replace gradually.
- Displacement timing: Month 3-6. Carlos adopts Parcel for post-closing first, then evaluates whether to consolidate CRM.

**DealCheck ($0-14/mo — deal analysis)**
- What it does: Quick conventional deal analysis. Cash flow projections, ARV estimates.
- Why it persists: Fast and good at what it does — conventional deals.
- What Parcel replaces: Creative finance deal analysis that DealCheck cannot do. Carlos may keep DealCheck for quick conventional screening.
- Displacement difficulty: LOW for creative finance analysis (DealCheck has no offering). MODERATE for conventional analysis (DealCheck is fast and familiar).

**Dropbox ($12/mo — document storage)**
- What it does: Stores contracts, insurance policies, lender correspondence.
- Why it persists: Simple cloud storage.
- What Parcel replaces: Property-linked document storage. Documents connected to the property they belong to, with dates and alerts attached.
- Displacement difficulty: LOW — Carlos wants documents linked to properties, not dumped in a folder hierarchy.

### Why Traditional RE Software Fails Carlos

| Tool | Why Carlos Tried It | Why He Left |
|---|---|---|
| **Stessa** | Free portfolio tracking | No creative finance structure support. "Subject-to" is not a financing type. No underlying mortgage tracking. |
| **RentRedi** | Property management focus | Designed for landlords collecting rent, not investors managing complex financing obligations. |
| **Baselane** | Banking + property management | Same as above. Conventional financing assumptions throughout. |
| **REI Hub** | Bookkeeping for RE investors | Accounting tool, not portfolio monitoring. Does not track obligations or deadlines. |
| **Buildium/AppFolio** | Full property management | Enterprise PM software. Overkill for Carlos's 14 properties. No creative finance awareness. |

### The Competitive Moat

Every tool above assumes the investor owns the property free-and-clear or has a conventional mortgage. The data model is: property + mortgage + tenant = portfolio.

Carlos's data model is: property + underlying mortgage (that he does not legally own) + seller note (with balloon) + insurance (with named insured requirements) + original borrower relationship + tenant + cash flow that depends on all of the above = one property.

No tool has this data model. Parcel does. This is the moat.

---

## 11. Creative Finance Deep Dive

This section documents the specific financial structures Carlos uses and the monitoring requirements for each. It exists to educate the product team on what "creative finance monitoring" means in concrete terms.

### Structure 1: Subject-To (6 properties)

**What it is:** Carlos acquires a property "subject to" the existing mortgage. The mortgage stays in the original borrower's name. Carlos takes title to the property but does not assume the loan. The original borrower remains legally responsible for the mortgage, but Carlos makes the payments.

**Why investors use it:** Carlos acquired properties with 3.0-3.5% mortgage rates locked in during 2020-2021. These rates are unobtainable today. By taking the property subject-to the existing financing, Carlos inherits a below-market rate, dramatically improving cash flow.

**The risks:**
- **Due-on-sale clause:** Almost every mortgage contains a clause that allows the lender to demand full repayment if the property is transferred. Technically, every subject-to acquisition violates this clause. In practice, most lenders do not enforce it as long as payments are current. But "most" is not "all," and enforcement is unpredictable.
- **Lender triggers:** The things that cause a lender to investigate: missed payments, insurance changes, property tax billing address changes, and random portfolio audits. Carlos must ensure none of these triggers fire.
- **Original borrower risk:** The original borrower's credit is tied to this mortgage. If Carlos misses a payment, the original borrower's credit is damaged, and they may take legal action. If the original borrower files bankruptcy, the mortgage could be affected.

**What Parcel must monitor for each subject-to property:**

| Obligation | Frequency | Alert Threshold | Consequence of Failure |
|---|---|---|---|
| Underlying mortgage payment | Monthly | 3 days before due, day of, 1 day late | Due-on-sale investigation; borrower credit damage |
| Insurance policy active with correct named insured | Annual renewal + continuous | 60/30/15 days before renewal; immediate if lapse detected | Force-placed insurance; lender investigation |
| Property tax payments current | Semi-annual or annual | 30 days before due | Tax lien; lender escrow investigation |
| Escrow analysis changes | Annual | When lender issues new escrow analysis | Payment amount changes; must update auto-pay |
| Loan balance reconciliation | Monthly | When statement available | Detect unexpected charges, rate changes (ARM), or lender communications |
| Original borrower status | Ongoing | Any communication from borrower or their representatives | Borrower may attempt to interfere with property or loan |

### Structure 2: Seller Financing (4 properties)

**What it is:** The seller acts as the bank. Carlos purchases the property and makes monthly payments directly to the seller per the terms of a promissory note. There is no institutional lender. The seller holds a lien (mortgage or deed of trust) on the property until the note is paid off or Carlos refinances.

**Why investors use it:** Flexible terms. Carlos can negotiate interest rates, amortization periods, down payments, and balloon dates that no bank would offer. He has seller-financed deals at 4-6% interest with 5-7 year balloon dates — better than conventional rates at the time of acquisition.

**The risks:**
- **Balloon payments:** The most acute risk. Seller finance notes almost always include a balloon payment — a date by which the remaining balance must be paid in full. If Carlos cannot refinance or sell before the balloon date, the seller can foreclose.
- **Seller death or estate complications:** If the seller dies, the note becomes part of their estate. Heirs may not honor informal agreements or may demand full payoff. Carlos needs to know who holds his notes and track any changes.
- **Seller disputes:** Unlike a bank, an individual seller may dispute payment receipts, claim late payments that were on time, or attempt to modify terms unilaterally. Documentation is critical.

**What Parcel must monitor for each seller-financed property:**

| Obligation | Frequency | Alert Threshold | Consequence of Failure |
|---|---|---|---|
| Monthly payment to seller | Monthly | 3 days before due, day of, grace period expiration | Late fees; potential default; seller may accelerate note |
| Balloon date countdown | Ongoing | 12mo/9mo/6mo/90d/30d milestone alerts | Loss of property if balloon is not paid or refinanced |
| Refinance preparation milestones | Starting 9 months before balloon | Monthly check-ins on credit, DTI, appraisal readiness | Insufficient preparation time leads to missed balloon |
| Amortization schedule accuracy | Monthly | After each payment, verify principal/interest split and remaining balance | Disputes with seller over balance owed |
| Insurance and property tax | Annual/semi-annual | Same as subject-to | Seller may have right to force-place or call note due |
| Seller contact and status | Quarterly | Confirm seller is reachable and note terms unchanged | Estate complications if seller becomes unreachable |

### Structure 3: Lease Option (2 properties)

**What it is:** Carlos leases a property from a seller with an option to purchase at a predetermined price within a specified timeframe. He pays a monthly lease payment (often above market rent), and a portion of each payment may be credited toward the purchase price ("rent credits"). He also pays an upfront "option consideration" fee for the right to buy.

**Why investors use it:** Low capital outlay to control a property. Carlos can lease-option a property, sublease it to a tenant at a higher rate, and generate cash flow while his option appreciates. If the market moves unfavorably, he can walk away (losing only the option fee and rent credits).

**The risks:**
- **Option expiration:** If Carlos does not exercise the option before the deadline, he loses the option fee, all accumulated rent credits, and any improvements he made to the property. This can represent $15,000-$40,000 in lost capital per property.
- **Lease compliance:** If Carlos violates any lease term, the seller may have grounds to terminate the lease and void the option. This includes late rent payments, unauthorized modifications, or subletting restrictions.
- **Rent credit disputes:** Without meticulous tracking, the seller and Carlos may disagree on how much has been credited toward the purchase price.

**What Parcel must monitor for each lease option property:**

| Obligation | Frequency | Alert Threshold | Consequence of Failure |
|---|---|---|---|
| Monthly lease payment | Monthly | 3 days before due, day of, grace period | Lease violation; potential option forfeiture |
| Rent credit accumulation | Monthly | After each payment, update running credit balance | Disputes with seller over credited amount |
| Option exercise deadline | Ongoing | 12mo/9mo/6mo/90d/30d milestone alerts | Loss of option fee + all rent credits + improvements |
| Lease compliance | Ongoing | Any noted violation or seller complaint | Grounds for lease termination and option forfeiture |
| Property value vs. strike price | Quarterly | Track estimated value against option exercise price | Inform exercise decision — is the option in the money? |
| Subtenant payment collection | Monthly | Track sublease income against lease obligation | Negative cash flow if subtenant stops paying |

### Structure 4: Wrap Mortgage (future — Carlos plans to use this)

**What it is:** Carlos sells a property to a buyer using seller financing, but the underlying mortgage (subject-to or conventional) remains in place. Carlos collects a monthly payment from the buyer at a higher interest rate than his underlying obligation, keeping the spread. The buyer's mortgage "wraps around" the existing mortgage.

**Example:** Carlos acquired a property subject-to at 3.25%. He sells it via wrap mortgage at 7.5%. His underlying payment is $1,423/mo. His buyer pays him $2,100/mo. Carlos keeps the $677/mo spread and the amortization differential.

**Why investors use it:** Maximizes yield. Carlos earns income on both the spread (rate differential) and the amortization (his underlying mortgage pays down faster at the lower rate while the buyer's balance pays down slower at the higher rate).

**The risks:**
- **Double due-on-sale exposure:** The underlying lender could call the loan due (same as subject-to). The wrap buyer could default, leaving Carlos responsible for the underlying payment.
- **Regulatory risk:** Wraps are subject to Dodd-Frank safe harbor rules. If structured improperly, Carlos could face RESPA or TILA violations. The note terms must comply with state and federal lending regulations.
- **Cash flow dependency:** If the wrap buyer stops paying, Carlos must continue making the underlying mortgage payment out of pocket or face due-on-sale risk.

**What Parcel must monitor for wrap mortgages:**

| Obligation | Frequency | Alert Threshold | Consequence of Failure |
|---|---|---|---|
| Wrap buyer payment received | Monthly | Due date, 3 days late, 15 days late, 30 days late | Must still pay underlying; foreclosure proceedings on wrap |
| Underlying mortgage payment made | Monthly | Same as subject-to monitoring | Due-on-sale risk; buyer's property at risk |
| Spread tracking | Monthly | Monitor that buyer payment exceeds underlying obligation | Negative spread = cash flow problem |
| Wrap note amortization vs. underlying amortization | Monthly | Track both balances and the equity gap | Carlos's equity is the difference between what the buyer owes and what he owes on the underlying |
| Dodd-Frank compliance | At origination + ongoing | Confirm safe harbor compliance at deal setup | Regulatory enforcement; note could be voided |
| Insurance (dual layer) | Annual | Wrap buyer must maintain insurance; Carlos must verify underlying policy also current | Dual exposure: lender risk + buyer default risk |

### Summary: Why Creative Finance Monitoring Is a Product Category

Traditional real estate software tracks: property, mortgage, tenant, cash flow.

Creative finance requires tracking: property, underlying financing (that may be in someone else's name), secondary financing (seller notes with balloons), option agreements (with expiration dates and rent credits), insurance (with complex named-insured requirements), relationships with original borrowers, relationships with sellers/note holders, regulatory compliance, and cash flows that depend on the interaction between multiple financial instruments on the same property.

This is not a feature addition to existing RE software. It is a fundamentally different data model and monitoring paradigm. Parcel's Wave 2 architecture was designed from the ground up to support these structures. No competitor can bolt this onto their existing product without a ground-up rebuild of their data model.

Carlos knows this. He has asked every RE software company he has encountered whether they support subject-to tracking. The answer has always been no. When Parcel's answer is yes, Carlos does not evaluate further. He converts.

---

## Appendix: Key Metrics for Carlos Cohort

| Metric | Target |
|---|---|
| Time to first property entered | < 30 minutes |
| Time to full portfolio migration | < 1 weekend (48 hours) |
| Time to activation (first obligation alert received) | < 7 days |
| Time to conversion (Pro subscription) | < 7 days |
| Monthly active usage | Daily (morning obligation check) |
| Net Promoter Score | 9-10 (if creative finance monitoring works) / 1-2 (if it does not) |
| Referral rate | 8-12 direct referrals in Year 1 |
| Churn rate (if product delivers) | < 2% monthly |
| Churn rate (if product fails on creative finance) | 100% within 30 days |
| Lifetime value (3-year horizon at $79/mo) | $2,844 |
| Lifetime value including referrals | $10,000-$14,000 |

---

*This persona document is classified as a strategic asset. Carlos represents Parcel's primary competitive differentiation. Product decisions affecting creative finance features should be evaluated against Carlos's needs before any other persona. If a feature serves Carlos, it widens the moat. If a feature ignores Carlos, it is a missed opportunity in Parcel's blue ocean.*
