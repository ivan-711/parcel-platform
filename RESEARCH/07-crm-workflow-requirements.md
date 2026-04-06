# 07 -- CRM & Workflow Requirements by RE Investment Strategy

> Research Date: 2026-04-02
> Purpose: Inform expansion of Parcel from deal calculator to full RE operating system / CRM
> Methodology: 20+ web searches across BiggerPockets forums, investor blogs, RE CRM vendor sites, Reddit, YouTube investor channels, course outlines, and IRS documentation

---

## Table of Contents

1. [Strategy 1: Wholesale](#strategy-1-wholesale)
2. [Strategy 2: BRRRR](#strategy-2-brrrr-buy-rehab-rent-refinance-repeat)
3. [Strategy 3: Buy-and-Hold (Rental)](#strategy-3-buy-and-hold-rental)
4. [Strategy 4: Fix-and-Flip](#strategy-4-fix-and-flip)
5. [Strategy 5: Creative Finance](#strategy-5-creative-finance)
6. [Cross-Strategy Analysis](#cross-strategy-analysis)
   - [Shared Feature Matrix](#1-shared-feature-matrix)
   - [Contact Type Taxonomy](#2-contact-type-taxonomy)
   - [Universal Pipeline Template](#3-universal-pipeline-template)
   - [Communication Channel Priority](#4-communication-channel-priority)
   - [Integration Requirements](#5-integration-requirements)

---

## Strategy 1: Wholesale

### 1.1 Contact Types Needed

**Sellers (Motivated)**
- Primary contact type. The entire wholesale business revolves around finding and closing motivated sellers.
- Fields: Name, phone(s), email, mailing address, property address, motivation level (1-10 scale), timeline to sell, asking price, property condition notes, source/list origin, last contact date, follow-up date, communication log
- Typical database: An active wholesaler contacts 10,000+ leads per month via combined channels. A solo operator may have 500-2,000 active seller leads at any time; a team operation may have 5,000-20,000+.

**Cash Buyers (Investors)**
- The disposition side of the business. Wholesalers maintain a "buyers list" segmented by buy box criteria.
- Fields: Name, phone, email, entity name, buying criteria (zip codes, property types, price range, condition tolerance), proof of funds status, transaction history, preferred communication method, speed of close
- Typical list size: 50-500+ active buyers, segmented by geography and property type

**Title Companies / Closing Agents**
- Fields: Company name, contact person, phone, email, address, turnaround time, assignment-friendly (yes/no), double-close capable (yes/no), fee schedule, preferred by market area

**Skip Tracing Providers**
- Not a "contact" per se but a critical service layer. PropStream, BatchSkipTracing, REsimpli each aggregate 10+ billion data points.
- Fields: Service name, cost per trace, hit rate, API availability

**Virtual Assistants / Cold Callers**
- Fields: Name, hourly rate, hours/week, dialer access, CRM login credentials, performance metrics (calls/day, appointments set, conversion rate)

**Transaction Coordinators**
- Fields: Name, contact info, fee structure, active deals assigned, closing timeline tracking

**Relationship Graph**
```
Deal
 |-- Seller (1)
 |-- Property (1)
 |-- Buyer/Assignee (1)
 |-- Title Company (1)
 |-- Acquisition Manager (1)
 |-- Disposition Manager (1)
 |-- Transaction Coordinator (1)
```

### 1.2 Workflow / Pipeline Stages

Based on REsimpli's recommended pipeline and BiggerPockets forum data, the standard wholesale pipeline is:

**Acquisition Pipeline:**

| Stage | Description | Actions | Decisions | Documents | Timeline |
|-------|------------|---------|-----------|-----------|----------|
| **New Lead** | Lead just entered system, no contact made | Call, text, or email immediately. Speed-to-lead is critical -- respond within 2-3 minutes for inbound | Is this a valid lead? Correct contact info? | None yet | Immediate |
| **Contacted** | Reached out, had some form of communication (even voicemail) | Attempt further contact, set short-term follow-up | Is seller motivated? What's the timeline? | None yet | 1-3 days |
| **Qualified** | Seller has motivation, timeline, and realistic expectations | Schedule appointment or prepare offer, pull comps, estimate ARV and repairs | Is this worth pursuing? Does the math work? | Comp analysis, repair estimate | 1-7 days |
| **Appointment Set** | In-person or virtual meeting scheduled | View property, build rapport, assess condition, make verbal offer | Can we get this under contract at our number? | Property photos, condition notes | 1-3 days |
| **Offer Made** | Written offer submitted, awaiting response | Track communication, follow up aggressively, negotiate counter-offers | Will seller accept? Should we raise our offer? | Purchase agreement / LOI | 1-14 days |
| **Under Contract** | Seller accepted, property in escrow | Coordinate with title company, begin marketing to buyers | Can we find a buyer at target assignment fee? | Executed purchase agreement, earnest money receipt | 1-30 days |
| **Assigned / Closed** | Deal done, assignment fee collected | Tag as won, request testimonials, track for tax purposes | N/A | Assignment agreement, closing statement, 1099-S | Closing day |
| **Dead / Lost** | Lead did not convert | Tag reason for loss, move to long-term nurture drip | Should we revisit in 3-6 months? | None | Ongoing |

**Disposition Pipeline:**

| Stage | Description | Actions |
|-------|------------|---------|
| **New Contract** | Property under contract, ready to market | Blast to buyers list, post on investor groups |
| **Marketing** | Active outreach to cash buyers | Send property details with photos, ARV, repair estimate, asking price |
| **Buyer Interested** | One or more buyers express interest | Schedule property viewing, share assignment agreement |
| **Under Assignment** | Assignment agreement signed with end buyer | Coordinate with title company for double-close or assignment closing |
| **Closed** | Assignment fee paid | Record revenue, update buyer relationship score |

**Key Conversion Metrics (from BiggerPockets forum data):**
- Cost per lead: $43-57 (high-volume texting) to $4,400 (direct mail per deal)
- Leads to deal: ~23:1 (4.3% conversion)
- Leads to appointments: ~50% (of qualified leads with equity)
- Offer acceptance rate: ~13.5%
- 80% of deals close between the 5th and 12th contact touchpoint
- Average assignment fee: $5,000-$20,000+

**Average timeline from lead to close: 30-90 days**

### 1.3 Task & Reminder Patterns

**Recurring Daily Tasks:**
- Cold call 80-450 contacts (depending on dialer and VA support)
- Send SMS campaigns to new lists
- Follow up with leads from prior days (call-backs, re-engagements)
- Check CRM for overdue follow-ups
- Review new inbound leads (speed-to-lead)

**Follow-Up Cadences:**
- Hot lead: Call every 1-2 days for the first week, then every 3-5 days
- Warm lead: Call/text weekly for 4 weeks, then bi-weekly
- Nurture/cold lead: Monthly check-in via automated drip (SMS + email + RVM)
- Long-term nurture: Quarterly touch for 12+ months
- One experienced wholesaler shared: "It will take 7-15 touch points if not significantly more" before converting a lead.

**Critical Deadlines:**
- Inspection/option period: 5-10 business days (right to cancel with EMD refund)
- Earnest money deposit deadline: Typically within 3 business days of contract execution
- Closing date: 14-30 days (wholesalers prefer fast closes)
- Assignment marketing window: Must find buyer before closing date

**Consequences of Missing Deadlines:**
- Missed inspection period = lose right to terminate, committed to purchase
- Missed closing date = potential default, loss of earnest money ($500-$5,000 typical for wholesale)
- Failed to find buyer = must close yourself (need funds) or default on contract

### 1.4 Communication Needs

**Channel Priority (highest to lowest):**
1. **Cold Calling** -- Still the #1 channel for wholesale. VAs make 80-450 calls/day using power dialers (BatchDialer, Mojo, PhoneBurner). Call logging and recording is essential.
2. **SMS/Texting** -- Mass texting campaigns via Launch Control, REsimpli, BatchLeads. Cost: ~$0.03/message. Compliance with TCPA and DNC lists is critical.
3. **Ringless Voicemail (RVM)** -- "Monster callback rates" at lowest cost. ~$0.03-0.05/drop. 10,000 drops for ~$760.
4. **Direct Mail** -- Postcards ($0.30-$0.70 each) and handwritten-style letters ($1-$3). Still massive in wholesale. Typical spend: $1,000-$5,000/month.
5. **Email** -- Used for drip nurture sequences, not primary outreach. $36 ROI per $1 spent (general marketing stat).

**Drip Campaign Structure:**
- Day 0: Instant SMS ("Hey [Name], saw your property at [Address] -- are you still thinking about selling?")
- Day 0: Call task assigned to team
- Day 1: Follow-up call attempt
- Day 3: Email ("Still interested in selling your property?")
- Day 5: RVM drop
- Day 7: SMS check-in
- Day 10: Direct mail postcard
- Day 14-30: Weekly SMS/call rotation
- Day 30+: Monthly nurture drip

**Volume benchmarks:**
- Solo wholesaler: 100-200 outbound touches/day
- Small team (2-3 VAs): 500-1,000 outbound touches/day
- Scaled operation: 5,000-10,000+ contacts/month across all channels

### 1.5 Financial Tracking Per-Deal

| Item | Typical Amount | Notes |
|------|---------------|-------|
| Earnest money deposit | $500-$5,000 | Refundable within inspection period |
| Marketing cost per deal | $2,000-$6,000 | Varies by channel and market |
| Assignment fee revenue | $5,000-$20,000+ | Wholesaler's profit |
| Title/closing costs | $500-$2,000 | Paid by buyer or split |
| Option fee (TX) | $100-$500 | Non-refundable, credited at closing |
| Double close transactional funding | 1-2% of purchase price | If doing double close instead of assignment |

**What needs tracking:**
- Marketing spend by channel with attribution to closed deals (ROI per channel)
- Earnest money deposits outstanding (which escrow accounts, refund deadlines)
- Assignment fee per deal
- Cost per lead, cost per appointment, cost per deal
- Revenue by buyer (track repeat buyers)

### 1.6 Due Diligence Checklist

Wholesale due diligence is lighter than other strategies because the wholesaler typically does not close on the property:

- [ ] Verify seller identity and ownership (county records, deed)
- [ ] Title search (check for liens, judgments, lis pendens, tax liens)
- [ ] Confirm property is free of code violations
- [ ] Verify property condition (at minimum, drive-by or photos)
- [ ] Pull comps for ARV estimate (3-5 comparable sales)
- [ ] Estimate repairs (rough scope of work for buyer)
- [ ] Verify zoning (residential vs commercial, any restrictions)
- [ ] Check for HOA (get estoppel letter if applicable)
- [ ] Municipal lien search
- [ ] Confirm property taxes are current or calculate arrears
- [ ] Review existing mortgage balance (verify equity exists for deal to work)
- [ ] Confirm property is insurable

### 1.7 Post-Close Needs

Wholesale is the simplest post-close:
- Record assignment fee as income (1099-S reporting)
- Track deal for tax purposes (ordinary income, not capital gains)
- Update buyer relationship score (did they close fast? Will they buy again?)
- Move seller to "closed" status, add to testimonial/referral request sequence
- Analyze deal metrics: actual assignment fee vs projected, marketing cost attribution
- Archive all documents (purchase agreement, assignment, closing statement, photos)

### 1.8 Marketing & Lead Generation

**Primary Channels:**
| Channel | Cost | Response Rate | Cost per Deal | Notes |
|---------|------|--------------|---------------|-------|
| Driving for Dollars | Gas + time | Highest quality | ~$2,700/deal | DealMachine app, photograph distressed properties |
| Cold Calling | $4-8/hr (VA) | 2-5% contact rate | Varies | BatchDialer, Mojo, PhoneBurner |
| SMS/Texting | $0.03/msg | 5-15% response | Varies | Launch Control, BatchLeads |
| Direct Mail | $0.30-$3/piece | 1-5% response | ~$4,400-$6,200/deal | Postcards, yellow letters, Ballpoint Marketing |
| Ringless Voicemail | $0.03-0.05/drop | High callback | Lowest cost | The Message Ninja, VoiceDrop |
| Bandit Signs | $2.50-3/sign | 3-5 leads/100 signs/week | ~$250-300/campaign | Check local regulations |
| Facebook/PPC Ads | $10-50/lead | Variable | $3,000-8,000/deal | Motivated Leads, Carrot websites |
| Networking/REI Meetups | Free | Relationship-based | Zero (time only) | Source for buyers AND deals |

**List Sources:**
- Tax delinquent (county records)
- Probate (court records, USLeadList)
- Pre-foreclosure / Lis Pendens (PropStream, PropertyRadar)
- Absentee owners (county records, PropStream)
- High equity / Free & Clear (PropStream, BatchLeads)
- Vacant properties (USPS data, driving for dollars)
- Code violations (municipal records)
- Divorce filings (court records)
- Bankruptcy (PACER)
- Tired landlords / eviction filings (court records)
- Expired listings (MLS access)

**List Stacking:** Combining multiple distress signals dramatically increases lead quality. Example stacks:
- Vacant + Tax delinquent + Absentee = highest motivation
- Pre-foreclosure + High equity + Absentee = urgent + has equity
- Code violations + Absentee + Tax delinquent = property is a burden

**Monthly marketing spend:**
- Beginner: $500-$2,000
- Intermediate: $3,000-$7,000
- Scaled operation: $10,000-$20,000+

---

## Strategy 2: BRRRR (Buy, Rehab, Rent, Refinance, Repeat)

### 2.1 Contact Types Needed

**Sellers (Motivated / Distressed Property Owners)**
- Same as wholesale. BRRRR investors often wholesale some deals and keep the best ones.
- Additional field: "BRRRR candidate score" (does ARV support refinance that recovers capital?)

**Hard Money / Private Lenders**
- Critical for the "Buy" phase. BRRRR investors rarely use conventional loans initially.
- Fields: Lender name, contact info, loan terms (rate, points, LTV, term length), seasoning requirements for refinance, speed of funding, draw schedule process, past deals funded, current available capital
- Typical: 3-10 lender relationships

**Contractors (General + Specialty)**
- The rehab team. Often the same contractors used repeatedly.
- Fields: Company name, contact, trade specialty (GC, plumber, electrician, HVAC, roofer, painter, flooring), hourly rate or bid history, license/insurance info, availability, quality rating, past project photos, payment terms
- Typical: 5-20 contractor contacts

**Property Managers**
- For the "Rent" phase. May self-manage or hire out.
- Fields: Company name, contact, fee structure (% of rent, leasing fee, maintenance markup), properties managed, tenant placement success rate, eviction rate, communication responsiveness

**Conventional / DSCR Lenders (Refinance)**
- For the "Refinance" phase. Different from the acquisition lender.
- Fields: Lender name, contact, DSCR requirements, LTV caps, seasoning period, credit score minimums, rate sheet, processing time, documentation requirements
- Typical: Contact 3-5 refinance lenders per deal

**Tenants**
- For the "Rent" phase.
- Fields: Name, phone, email, lease start/end dates, rent amount, security deposit, payment history, maintenance requests, screening results (credit, criminal, employment, rental history)

**Appraisers**
- Fields: Name, contact, fee, turnaround time, market area coverage, past appraisal accuracy

**Insurance Agents**
- Fields: Name, contact, company, policy types offered, coverage amounts, premium quotes, claims history

**Relationship Graph:**
```
BRRRR Deal
 |-- Seller (1)
 |-- Property (1)
 |-- Hard Money Lender (1) -- acquisition
 |-- Contractor(s) (1-10) -- rehab
 |-- Property Manager (0-1) -- rent
 |-- Tenant(s) (1+) -- rent
 |-- DSCR/Conventional Lender (1) -- refinance
 |-- Appraiser (1) -- refinance
 |-- Insurance Agent (1)
 |-- Title Company (1)
```

### 2.2 Workflow / Pipeline Stages

The BRRRR pipeline is the most complex, spanning 5 distinct phases:

**Phase 1: BUY (Acquisition)**

| Stage | Description | Timeline |
|-------|------------|----------|
| Lead sourced | Property identified (same channels as wholesale) | Ongoing |
| Analyzed | ARV calculated, repair estimate done, BRRRR numbers run (purchase + rehab + holding < 75% ARV) | 1-3 days |
| Offer made | Purchase offer submitted | 1-7 days |
| Under contract | Offer accepted, due diligence begins | 1-3 days |
| Due diligence | Inspection, title search, insurance quotes, lender coordination | 7-14 days |
| Closed - purchased | Property acquired, typically with hard money loan | Day 30-45 |

**Phase 2: REHAB**

| Stage | Description | Timeline |
|-------|------------|----------|
| Scope of work created | Detailed room-by-room rehab plan with budget | Week 1 |
| Contractors hired | GC or specialty contractors selected, contracts signed | Week 1-2 |
| Permits pulled | If structural work, electrical, plumbing changes needed | Week 1-3 |
| Rehab in progress | Track against scope, budget, and timeline | 2-6 months |
| Draw requests | Pay contractors per milestone completion (retainage 5-10%) | Per milestone |
| Inspections passed | Building inspector approvals for permitted work | As needed |
| Rehab complete | All work done, punch list items cleared, final photos taken | Month 2-6 |

**Phase 3: RENT**

| Stage | Description | Timeline |
|-------|------------|----------|
| Market-ready | Property cleaned, photographed, listed for rent | 1-3 days |
| Marketing | Listed on Zillow, Apartments.com, Facebook Marketplace, yard sign | 1-4 weeks |
| Showings | Schedule and conduct property showings | Ongoing |
| Applications received | Collect and review tenant applications | 1-2 weeks |
| Tenant screened | Credit check, criminal background, employment verification, rental history | 3-7 days |
| Lease signed | Execute lease agreement, collect security deposit + first month | 1-3 days |
| Tenant moved in | Keys handed over, lease begins | Move-in day |

**Phase 4: REFINANCE**

| Stage | Description | Timeline |
|-------|------------|----------|
| Seasoning wait | Must own property 3-12 months depending on lender (DSCR: 3-6 months, conventional: 6-12 months) | 3-12 months |
| Lender shopping | Contact 3-5 lenders, get pre-qualified, compare terms | 1-2 weeks |
| Documentation prep | Gather purchase closing statement, rehab receipts, lease agreement, rent rolls, insurance dec page, entity docs | 1-2 weeks |
| Appraisal binder created | Before/after photos, itemized rehab costs, permits, comparable sales analysis | 2-3 days |
| Appraisal ordered | Lender sends appraiser to verify ARV | 1-2 weeks |
| Underwriting | Lender reviews DSCR (rent/PITIA >= 1.0-1.25), credit, LTV | 2-4 weeks |
| Closing | Cash-out refinance closes, original hard money loan paid off, remaining equity returned to investor | Day 30-45 |

**Phase 5: REPEAT**

| Stage | Description |
|-------|------------|
| Capital recovered | Calculate actual cash recovered vs invested |
| Next deal sourcing | Re-deploy capital into next BRRRR acquisition |
| Portfolio tracking | Add property to ongoing rental portfolio tracking |

**Key Metrics:**
- Target: Purchase + Rehab = 70-75% of ARV
- Refinance LTV: 70-80% of appraised value
- DSCR requirement: Rent >= 1.0-1.25x PITIA payment
- Credit score needed: 660-720+ (better score = better rate)
- Overall timeline: 9-18 months per cycle (accelerated: 6-9 months with no-seasoning DSCR lender)

### 2.3 Task & Reminder Patterns

**Rehab Phase Tasks:**
- Weekly contractor check-in / site visit
- Weekly budget vs actual review
- Photo documentation at each milestone
- Draw request processing (every 2-4 weeks)
- Permit inspection scheduling
- Material procurement tracking

**Rent Phase Tasks:**
- Daily: Check listing inquiries, respond to showing requests
- Weekly: Conduct showings, review applications
- Monthly: Collect rent, pay mortgage/insurance/taxes

**Refinance Phase Tasks:**
- Monthly: Check seasoning calendar countdown
- Bi-weekly: Shop lender rates
- One-time: Compile appraisal binder, submit application
- Track: Appraisal date, underwriting status, clear-to-close, closing date

**Critical Deadlines:**
- Hard money loan term expiration (typically 6-12 months -- MUST refinance before this)
- Property tax payment dates
- Insurance renewal dates
- Lease expiration dates
- Seasoning period completion date
- Appraisal scheduling window

**Consequences of missed deadlines:**
- Hard money loan expires = extension fees ($$$) or default
- Missed refinance window = stuck paying high-interest hard money rates
- Vacant too long = holding costs eat into profit

### 2.4 Communication Needs

BRRRR communication is less outbound-marketing-heavy than wholesale:

- **Seller outreach**: Same as wholesale (cold calling, SMS, direct mail) for acquisition
- **Contractor communication**: Phone calls, texts, in-app messaging (FlipperForce mobile app)
- **Tenant communication**: Property management portal, text/email for maintenance requests
- **Lender communication**: Email and phone for loan applications and document submission
- **No mass marketing needed post-acquisition** (unlike wholesale which is marketing-driven end-to-end)

### 2.5 Financial Tracking Per-Deal

| Item | Typical Range | Notes |
|------|--------------|-------|
| Purchase price | Market-dependent | Hard money covers 70-90% of purchase |
| Hard money down payment | 10-30% of purchase | Cash out of pocket |
| Hard money interest | 10-14% annual | Monthly payments during rehab |
| Hard money points | 1-3 points | Origination fee at closing |
| Rehab budget | $20,000-$150,000+ | Track actual vs projected by line item |
| Holding costs (monthly) | Mortgage + taxes + insurance + utilities | Track monthly during rehab and lease-up |
| Tenant placement costs | 50-100% of first month's rent | If using property manager |
| Appraisal fee | $400-$600 | For refinance |
| Refinance closing costs | 2-5% of loan amount | Title, origination, recording fees |
| Cash-out proceeds | Ideally recovers all invested capital | Goal: 100% capital recovery |

**Budget vs Actual tracking is critical.** The BRRRR only works when total invested (purchase + rehab + holding + closing) < 75% of ARV. A 10-15% contingency is standard.

### 2.6 Due Diligence Checklist

- [ ] ARV analysis (3-5 comparable sales within 0.5 mile, sold within 6 months)
- [ ] Repair estimate (detailed scope of work, contractor bids)
- [ ] BRRRR calculator run (purchase + rehab + holding < 75% ARV)
- [ ] Title search (liens, judgments, clouds on title)
- [ ] Property inspection (structural, roof, foundation, HVAC, plumbing, electrical)
- [ ] Zoning verification (residential use, ADU potential, short-term rental allowed?)
- [ ] Environmental check (lead paint for pre-1978, asbestos, mold, underground tanks)
- [ ] Permit history review (unpermitted additions?)
- [ ] Insurance quotes (landlord/dwelling policy)
- [ ] HOA review (restrictions, special assessments, financial health)
- [ ] Market rent analysis (comparable rentals in area)
- [ ] DSCR pre-qualification (will the rent cover the refinanced mortgage?)
- [ ] Flood zone check (FEMA flood maps, insurance requirements)
- [ ] Hard money lender pre-approval (confirm they'll fund this deal)

### 2.7 Post-Close Needs

Post-close for BRRRR is extensive because the property becomes a long-term hold:

**Ongoing Property Management:**
- Rent collection (monthly)
- Maintenance request handling (work order system)
- Tenant communication
- Lease renewal management
- Annual rent increase evaluation
- Property tax monitoring
- Insurance renewal and verification
- Mortgage payment tracking on refinanced loan

**Financial Tracking:**
- Monthly P&L per property
- Annual Schedule E preparation (rental income/expenses for taxes)
- Depreciation tracking (27.5-year schedule for residential)
- Capital expenditure vs repair classification
- Cash-on-cash return calculation
- Portfolio-level performance dashboard

**Refinance Monitoring:**
- Track new loan terms (rate, balance, maturity date)
- Monitor equity position as market values change
- Evaluate future refinance opportunities as rates change

### 2.8 Marketing & Lead Generation

BRRRR investors use the same acquisition channels as wholesalers:
- Direct mail, cold calling, texting, driving for dollars
- Additionally: MLS (working with investor-friendly agents for listed deals)
- Additionally: Wholesale deal flow (buying contracts from wholesalers)
- Additionally: Auction sites (Auction.com, HubZu, county tax sales)
- Additionally: REI networking (BiggerPockets meetups, local REIA groups)

The key difference is BRRRR investors are pickier -- they need deals where the math supports a full capital recovery through refinance.

---

## Strategy 3: Buy-and-Hold (Rental)

### 3.1 Contact Types Needed

**All BRRRR contact types, plus:**

**Tenants (Primary ongoing relationship)**
- The most important contact type post-acquisition for this strategy
- Fields: Full name, phone, email, emergency contact, employer, income verification, SSN (for screening), lease dates, rent amount, security deposit amount, payment history (on-time/late/missed), maintenance request history, move-in condition report, lease violations, renewal status
- Volume: 1 tenant record per unit; a 10-unit portfolio = 10+ active tenant records plus historical

**Property Managers**
- Many buy-and-hold investors self-manage small portfolios but hire out at 10+ units
- Fields: Company name, primary contact, management fee (8-12% of collected rent), leasing fee (50-100% of first month), maintenance markup, eviction handling, accounting/reporting capabilities, vendor network

**Vendors / Service Providers**
- Fields: Company name, trade (plumber, electrician, HVAC, handyman, landscaper, cleaning), contact info, hourly rate, emergency availability, insurance certificate on file, past work quality rating
- Typical: 10-20 vendor contacts

**Accountant / Tax Preparer**
- Fields: Name, contact, firm, fee structure, familiarity with RE investor tax strategies (depreciation, 1031 exchanges, cost segregation)

**Insurance Agent**
- Fields: Agent name, carrier, policy numbers, coverage amounts, premium amounts, renewal dates, umbrella policy details

**Real Estate Attorney**
- Fields: Name, firm, contact, specialty (eviction, entity structuring, lease review), fee structure

**Relationship Graph:**
```
Rental Property
 |-- Owner/Investor (1)
 |-- Property Manager (0-1)
 |-- Tenant(s) (1+ per unit)
 |-- Lease(s) (1 per tenant)
 |-- Vendors (multiple, by trade)
 |-- Insurance Policy (1+)
 |-- Mortgage/Loan (0-1)
 |-- Tax Records (annual)
```

### 3.2 Workflow / Pipeline Stages

Buy-and-hold has two distinct pipelines: acquisition and ongoing management.

**Acquisition Pipeline:**

| Stage | Description | Timeline |
|-------|------------|----------|
| Market research | Identify target markets based on rent-to-price ratio, job growth, population trends | Ongoing |
| Property analysis | Run cash flow analysis: rent - PITIA - vacancy - maintenance - capex - management = NOI | 1-2 days |
| Offer submitted | Make offer based on analysis (analyze 20+ properties before first offer) | 1-7 days |
| Under contract | Due diligence period begins | 1-3 days |
| Due diligence | Inspection, title, insurance, appraisal, tenant estoppel (if occupied) | 7-30 days |
| Financing approved | Conventional loan, DSCR loan, or cash purchase | 30-45 days |
| Closed | Property acquired | Closing day |
| Rent-ready prep | Any needed repairs, cleaning, marketing materials | 1-4 weeks |

**Tenant Lifecycle Pipeline:**

| Stage | Description | Timeline |
|-------|------------|----------|
| **Vacancy** | Unit is available | Minimize this |
| **Marketing** | Listed on Zillow, Apartments.com, Facebook, yard sign | 1-4 weeks |
| **Showings** | Conduct property tours | Ongoing |
| **Application** | Receive and review applications | 3-7 days |
| **Screening** | Credit, criminal, employment, rental history verification | 2-5 days |
| **Lease execution** | Sign lease, collect security deposit and first month | 1-3 days |
| **Move-in** | Keys, condition report, welcome packet | Move-in day |
| **Active tenancy** | Rent collection, maintenance, communication | Lease term |
| **Lease renewal** | Evaluate rent increase, send renewal offer (60-90 days before expiration) | 60-90 days prior |
| **Move-out** | Notice given, schedule move-out inspection | 30-60 days |
| **Turn** | Inspect, repair, clean, repaint, re-market | 1-3 weeks |

**Key metrics:**
- Cash-on-cash return target: 8-12%+
- Cap rate target: 5-10% (market dependent)
- Vacancy rate: Budget 5-10%
- Maintenance reserve: 5-10% of rent
- CapEx reserve: 5-10% of rent
- Average tenant stay: 2-3 years

### 3.3 Task & Reminder Patterns

**Monthly Tasks:**
- Collect rent (1st of month, grace period typically 3-5 days)
- Pay mortgage, insurance, property tax (or verify escrow payments)
- Review maintenance requests and schedule vendor visits
- Reconcile income and expenses per property
- Late rent notices (if applicable, day 5-6)

**Quarterly Tasks:**
- Drive-by or scheduled property inspection
- Review utility bills (if landlord-paid)
- Review vendor contracts and pricing
- Evaluate market rents for upcoming renewals

**Annual Tasks:**
- Lease renewal assessment (60-90 days before expiration)
- Insurance policy renewal and coverage review
- Property tax appeal evaluation
- Prepare Schedule E for tax filing
- 1099 issuance to contractors paid > $600
- HVAC servicing
- Gutter cleaning
- Evaluate refinance opportunities
- Annual rent increase letters

**Critical Deadlines:**
- Rent due date (1st) and grace period end (3rd-5th)
- Late fee initiation date
- Lease expiration date (must send renewal offer 60-90 days prior)
- Eviction filing deadlines (vary by state, typically after 30-day notice period)
- Property tax payment deadlines (semi-annual)
- Insurance renewal date
- Required maintenance response times (24-48 hours for emergencies per most state laws)

### 3.4 Communication Needs

**Tenant Communication:**
- Tenant portal for rent payment and maintenance requests (TurboTenant, DoorLoop, Buildium)
- Text/email for general communication
- Phone for emergencies
- Mail for legal notices (lease violations, rent increases, non-renewal)

**Vendor Communication:**
- Phone/text for scheduling and emergency dispatch
- Email for bids and invoices
- Work order system integration

**Low outbound marketing volume** -- primarily needed during vacancy periods:
- Rental listing syndication (Zillow, Apartments.com, Facebook Marketplace)
- Yard signs
- No cold calling, no direct mail, no SMS campaigns

### 3.5 Financial Tracking Per-Deal

**Acquisition Costs:**
- Purchase price, down payment (20-25% for investment property)
- Closing costs (3-6% of purchase price)
- Initial repairs / rent-ready costs
- Loan origination fees

**Ongoing Monthly Tracking:**
| Income | Expenses |
|--------|----------|
| Rent collected | Mortgage (P&I) |
| Late fees | Property taxes |
| Pet fees | Insurance |
| Laundry income | Property management fee |
| Application fees | Maintenance/repairs |
| | Utilities (if landlord-paid) |
| | HOA fees |
| | Vacancy reserve |
| | CapEx reserve |
| | Lawn/snow service |
| | Pest control |

**Annual Tax Tracking:**
- Gross rental income
- All deductible expenses (IRS Topic 414)
- Depreciation (27.5-year straight-line for residential building value)
- Land vs building value split (land does not depreciate)
- Capital improvements vs repairs (capitalize improvements, deduct repairs)
- Loan interest deduction
- 1099-S for any property sales
- Schedule E preparation
- Depreciation recapture tracking (taxed at 25% upon sale)

### 3.6 Due Diligence Checklist

All items from BRRRR checklist, plus:

- [ ] Tenant estoppel letters (if buying with existing tenants -- verify lease terms, rent amounts, deposits held, any special agreements)
- [ ] Existing lease review (terms, expiration, tenant quality assessment)
- [ ] Rent roll analysis (if multi-unit: current rents vs market rents)
- [ ] Vacancy history
- [ ] Utility expense verification (request 12 months of utility bills)
- [ ] Property tax assessment review (potential for increase post-sale?)
- [ ] Existing maintenance/repair records
- [ ] Lead-based paint disclosure (required for pre-1978 properties)
- [ ] Section 8 / housing voucher verification (if applicable)
- [ ] Local landlord-tenant law review (rent control, eviction rules, required disclosures)

### 3.7 Post-Close Needs

This is the most post-close-intensive strategy:

**Property Management System (ongoing, indefinite):**
- Rent collection with payment tracking (on-time, late, partial, missed)
- Maintenance request submission, tracking, and resolution
- Work order creation, vendor assignment, completion tracking
- Lease management (storage, renewal alerts, amendment tracking)
- Tenant communication portal
- Move-in / move-out inspection with photo documentation
- Security deposit tracking and return (per state law timelines)

**Financial Management (ongoing, indefinite):**
- Monthly P&L per property and portfolio-wide
- Annual tax document preparation
- Expense categorization (repair vs capital improvement)
- Depreciation schedule maintenance
- Cash flow forecasting
- Rent increase analysis (market comps)
- Insurance claim tracking

**The key gap in the market:** No single platform handles both deal acquisition CRM AND ongoing property management well. REsimpli excels at acquisitions. TurboTenant/DoorLoop/Buildium excel at property management. Investors are forced to use 2+ systems.

### 3.8 Marketing & Lead Generation

Buy-and-hold investors find deals through:
- MLS (primary channel -- working with investor-friendly agents)
- Wholesale deal flow (buying assignments from wholesalers)
- Direct marketing (same as wholesale, but lower volume)
- Auction sites
- FSBO listings
- Off-market networking
- Turnkey providers (fully renovated, tenanted properties sold as investment packages)

Monthly marketing spend: Generally lower than wholesale ($0-$5,000/month) since many buy-and-hold investors work with agents on MLS deals.

---

## Strategy 4: Fix-and-Flip

### 4.1 Contact Types Needed

**Sellers (same as wholesale)**

**Hard Money / Private Lenders**
- Same as BRRRR, but the loan term is shorter (6-12 months) and the exit strategy is "sell" not "refinance"
- Additional fields: Draw schedule terms, inspection requirements per draw, extension policy, extension fees

**Contractors (CRITICAL -- the most important relationship)**
- This is the make-or-break contact type for flippers
- Fields: Everything from BRRRR plus -- quality of finish work (low/mid/high end), speed rating, specialty (gut rehab vs cosmetic), crew size, material procurement capability, warranty offered, references, portfolio photos
- Typical: 10-30 contractor/vendor contacts (GC, subs for each trade, material suppliers)

**Real Estate Agent (Listing Agent)**
- For the sale phase. Different from buying agent.
- Fields: Name, brokerage, contact info, commission rate, market expertise, listing marketing capabilities, staging vendor network, photographer contacts, MLS access, track record (average days on market, list-to-sale ratio)

**Stager / Interior Designer**
- Fields: Name, contact, fee structure (per room or flat), style specialty, availability, past project photos

**Photographer / Videographer**
- Fields: Name, contact, rate, turnaround time, portfolio quality, drone capability

**Relationship Graph:**
```
Flip Deal
 |-- Seller (1)
 |-- Property (1)
 |-- Hard Money Lender (1)
 |-- General Contractor (1)
 |   |-- Subcontractors (3-10)
 |-- Inspector (1)
 |-- Listing Agent (1)
 |-- Stager (0-1)
 |-- Photographer (1)
 |-- Title Company (1-2: buy side + sell side)
 |-- Buyer(s) (end buyer of finished product)
```

### 4.2 Workflow / Pipeline Stages

**Acquisition Phase** (same as BRRRR -- see Section 2.2, Phase 1)

**Rehab Phase:**

| Stage | Description | Key Actions | Timeline |
|-------|------------|-------------|----------|
| Scope of work | Detailed room-by-room renovation plan | Budget by category, material selections, finish levels | Week 1 |
| Contractor bidding | Get 2-3 bids per trade | Compare pricing, availability, references | Week 1-2 |
| Permits | Pull required permits | Submit applications, wait for approval | 1-4 weeks |
| Demo | Demolition and prep work | Remove old finishes, expose systems for inspection | Week 1-2 of rehab |
| Rough-in | Structural, plumbing, electrical, HVAC | Schedule inspections for each trade | Week 2-6 |
| Inspections | Municipal inspections of rough-in work | Must pass before covering walls | 1-2 weeks |
| Finish work | Drywall, paint, flooring, cabinets, fixtures, landscaping | Track budget vs actual closely | Week 4-12 |
| Punch list | Final walkthrough, fix all deficiencies | Detailed checklist, retainage released after completion | 3-7 days |
| Final inspection | Certificate of occupancy (if needed) | Schedule with building department | 1-2 weeks |
| Staging | Professional staging of the finished product | Schedule stager, photographer | 2-5 days |

**Sale Phase:**

| Stage | Description | Timeline |
|-------|------------|----------|
| Pre-listing prep | Professional photos, video tour, floor plan, listing description | 3-7 days |
| Listed on MLS | Property goes live | Day 1 |
| Showings | Open houses and private showings | 1-4 weeks |
| Offers received | Review and negotiate offers | 1-2 weeks |
| Under contract | Buyer's offer accepted, buyer's due diligence begins | 1-3 days |
| Buyer inspections | Home inspection, appraisal | 2-4 weeks |
| Buyer financing | Buyer's loan in underwriting | 3-5 weeks |
| Clear to close | All conditions met | 1-2 days |
| Closing | Title transfer, funds disbursed | Day 30-60 from contract |

**Key Metrics:**
- Overall timeline: 4-12 months (purchase to sale)
- Rehab duration: 4-8 weeks (cosmetic) to 4-6 months (full gut)
- Days on market after listing: 30-90 days
- Buyer closing period: 30-60 days
- Target profit margin: 10-20% of ARV (after all costs)

**Draw Schedule Structure (typical):**
A $75,000 renovation example:
- Draw 1 ($15,000): Demo, framing, structural work complete
- Draw 2 ($25,000): Roof, siding, windows, rough-ins complete, inspections passed
- Draw 3 ($15,000): Drywall, paint prep complete
- Draw 4 ($15,000): Finish work (floors, cabinets, fixtures) complete
- Draw 5 ($5,000): Final punch list, landscaping, cleaning
- Retainage (5-10%) released after all punch list items cleared

### 4.3 Task & Reminder Patterns

**During Rehab:**
- Daily: Check contractor progress (via app or site visit)
- Bi-weekly: Budget vs actual review
- Weekly: Photo documentation
- Per milestone: Process draw requests
- As needed: Material procurement, permit inspections

**During Sale:**
- Daily: Monitor showing feedback from listing agent
- Weekly: Review market activity and comparable sales
- Bi-weekly: Price adjustment evaluation if no offers

**Critical Deadlines:**
- Hard money loan expiration date (usually 6-12 months)
- Permit expiration dates
- Contractor completion dates per scope
- Listing agreement term
- Buyer inspection period (7-14 days)
- Buyer financing contingency deadline (30-60 days)
- Closing date

**Consequences of missing deadlines:**
- Late rehab = extra months of holding costs ($2,000-$5,000+/month in interest, taxes, insurance, utilities)
- Hard money loan extension = 1-2 additional points + continued high interest
- Missed market window = price reductions, potentially selling at a loss

### 4.4 Communication Needs

**Rehab Phase:**
- Contractor: Phone, text, project management app (FlipperForce mobile app for real-time updates and photo sharing)
- Lender: Email/phone for draw requests and project updates
- Inspector: Phone for scheduling

**Sale Phase:**
- Listing agent: Phone/text/email for showing feedback, offer presentation
- Buyer's agent: Through listing agent
- Title company: Email for closing coordination

**No mass outbound marketing** -- the sale is handled through MLS and agent network.

### 4.5 Financial Tracking Per-Deal

This is the most financially complex strategy on a per-deal basis:

| Category | Line Items | Notes |
|----------|-----------|-------|
| **Acquisition** | Purchase price, earnest money, closing costs, loan origination | Hard money: 1-3 points + 10-14% interest |
| **Rehab** | Every line item by category (demo, structural, plumbing, electrical, HVAC, roofing, flooring, paint, cabinets, fixtures, appliances, landscaping, etc.) | Track budget vs actual per line item |
| **Holding Costs** | Monthly: hard money interest, property taxes, insurance, utilities, lawn care | Budget per month x estimated hold period |
| **Selling Costs** | Agent commission (5-6%), title/closing costs, staging, photography, transfer taxes, seller concessions | Can be 8-10% of sale price total |
| **Profit/Loss** | Sale price - (acquisition + rehab + holding + selling) = NET PROFIT | Target 10-20% of ARV |

**The 10-15% contingency rule:** Always add 10-15% to rehab budget. As one investor noted: "That contingency isn't pessimism, it's REALISM."

**Variance Tracking is THE critical feature:**
- Budget line item vs actual spent
- Projected timeline vs actual timeline
- Projected ARV vs actual sale price
- Projected profit vs actual profit
- Holding cost projection vs actual (directly tied to timeline slippage)

### 4.6 Due Diligence Checklist

Same as BRRRR (Section 2.6), plus:
- [ ] Detailed scope of work with contractor bids (before closing on purchase)
- [ ] Permit feasibility check (can you get permits for planned work?)
- [ ] Market absorption analysis (how fast are flips selling in this area?)
- [ ] Comparable SOLD properties (not just listed -- actual recent sales of renovated homes)
- [ ] ARV confidence level (how tight is the comp range?)
- [ ] Exit strategy analysis (if flip doesn't sell, can you rent it? BRRRR it?)

### 4.7 Post-Close Needs

Post-close for flips is relatively simple (it's a one-time event):

**Immediately after closing:**
- Record sale on P&L
- Calculate actual profit vs projected
- Reconcile all expenses against budget
- Analyze timeline performance (actual vs projected hold period)
- Close out hard money loan (should be paid from sale proceeds)
- Collect all contractor lien waivers

**Tax Tracking:**
- Short-term capital gains (held < 1 year = ordinary income rate)
- OR ordinary income (if classified as dealer/flipper by IRS)
- Self-employment tax may apply
- 1099-S reporting
- Track cost basis: purchase + rehab + closing costs
- Keep ALL receipts and invoices for 7 years

**Post-Mortem Analysis:**
- What went right? What went wrong?
- Was budget accurate? Where were the overages?
- How did actual ARV compare to projected?
- Contractor performance review
- Agent performance review
- Update templates and estimates for future deals

### 4.8 Marketing & Lead Generation

Same acquisition channels as wholesale (Section 1.8).

For the SALE side:
- MLS listing (primary channel)
- Professional photography + video tour
- Social media marketing (Instagram, Facebook)
- Open houses
- Agent network and broker open
- Zillow / Realtor.com / Redfin syndication (automatic through MLS)

---

## Strategy 5: Creative Finance

Creative finance encompasses: Seller Financing, Subject-To, Lease Options, Wraparound Mortgages, and Novation Agreements.

### 5.1 Contact Types Needed

**Sellers (Unique Relationship -- Ongoing)**
- Unlike wholesale or traditional purchases, the seller relationship CONTINUES after closing in most creative finance structures
- Fields: All standard seller fields, plus -- existing mortgage details (lender, balance, rate, payment, escrow), willingness to carry financing, financial situation, property ownership duration, existing liens/judgments, motivation level
- Additional for Subject-To: Lender name, loan number, payment portal access, monthly payment amount, escrow balance, insurance policy details
- Additional for Seller Finance: Desired down payment, interest rate acceptable, balloon term, amortization period

**Real Estate Attorney (CRITICAL)**
- Creative deals are legally complex. An attorney who understands these structures is essential.
- Fields: Name, firm, specialties (subject-to, seller finance, lease options, wraps), state bar number, fee structure, contract templates available, closing capabilities

**Note Servicing Company**
- Third-party servicers handle payment collection, escrow, and compliance for seller-financed notes
- Fields: Company name, contact, fee per loan per month, services offered (payment collection, tax/insurance escrow, late notices, 1098 forms, online portals), states covered
- Key companies: Evergreen Note Servicing, Opendoor Loan Servicing, Unified Mortgage Service, Note Servicing Center

**Title Company (Must be creative-finance-friendly)**
- Not all title companies will close subject-to or seller-finance deals
- Fields: All standard fields, plus -- creative finance experience, trust/land trust closing capability, subject-to closing experience

**Insurance Agent (CRITICAL for Subject-To)**
- Insurance changes are the #1 way lenders discover property transfers in subject-to deals
- Fields: Agent name, carrier, experience with subject-to insurance structuring, ability to keep mortgagee clause correct while changing named insured

**Tenants (if renting out the property)**
- Same as buy-and-hold (Section 3.1)

**Tenant-Buyers (for Lease Options)**
- Special contact type unique to creative finance
- Fields: Name, contact info, option fee paid, monthly rent amount, rent credit percentage, option expiration date, purchase price agreed, lease term, payment history, exercise intent

**Relationship Graph:**
```
Creative Finance Deal
 |-- Seller (1) -- ONGOING relationship
 |-- Property (1)
 |-- Buyer/Investor (1)
 |-- Real Estate Attorney (1)
 |-- Title Company (1)
 |-- Note Servicing Company (0-1)
 |-- Insurance Agent (1)
 |-- Original Lender (1) -- for subject-to
 |-- Tenant or Tenant-Buyer (0-1)
```

### 5.2 Workflow / Pipeline Stages

**Acquisition Pipeline (unique to creative finance):**

| Stage | Description | Key Decisions | Timeline |
|-------|------------|--------------|----------|
| Lead sourced | Motivated seller identified (same channels as wholesale) | Does this seller's situation fit creative terms? | Ongoing |
| Seller qualification | Determine seller's mortgage details, equity, motivation, timeline | Which creative structure fits? (Sub-To vs Seller Finance vs Lease Option vs Wrap) | 1-3 calls |
| Structure determined | Pick the right deal structure based on seller/property situation | Is the existing loan assumable? What's the loan balance vs value? Does seller need cash now or monthly income? | 1-7 days |
| Terms negotiated | Agree on price, down payment, interest rate, term, balloon date | Can we make the numbers work for both parties? | 1-14 days |
| Attorney review | Attorney drafts/reviews all documents | Are the contracts legally sound for this state? | 3-10 days |
| Due diligence | Title search, inspection, insurance verification, mortgage verification | Is the deal clean? Any hidden issues? | 7-14 days |
| Closing | Title company closes the transaction | All documents signed, deed recorded, insurance transferred | Day 30-60 |

**Deal Structure-Specific Stages:**

**Subject-To:**
1. Verify existing mortgage details (balance, rate, payment, escrow)
2. Get third-party authorization from seller (to contact lender)
3. Set up payment portal access for buyer
4. Transfer insurance (carefully -- mortgagee clause must stay correct)
5. Record deed (transfer ownership)
6. Set up ongoing payment tracking
7. Monitor for due-on-sale clause enforcement

**Seller Finance:**
1. Agree on terms (price, down payment, rate, amortization, balloon date)
2. Promissory note drafted by attorney
3. Deed of trust / mortgage recorded
4. Set up note servicing (third-party servicer recommended)
5. Payment tracking begins
6. Balloon date alert set

**Lease Option:**
1. Lease agreement signed
2. Option agreement signed (separate document)
3. Option fee collected (non-refundable, typically 1-5% of purchase price)
4. Rent credit tracking begins
5. Option period countdown (1-5 years)
6. Exercise notification deadline alerts
7. If exercised: transition to purchase closing
8. If expired: Option fee retained, tenant moves out or signs new lease

**Wraparound Mortgage:**
1. Existing loan stays in place
2. New wrap note created at higher rate
3. Buyer makes payments to wrap holder
4. Wrap holder makes payments on underlying loan
5. Spread tracking (wrap payment - underlying payment = income)
6. Underlying loan balance monitoring
7. Insurance verification ongoing

### 5.3 Task & Reminder Patterns

**Monthly Tasks:**
- Verify payment received from buyer/tenant-buyer
- Make payment on underlying mortgage (subject-to / wrap)
- Verify insurance is current and correctly structured
- Review note servicing reports
- Reconcile escrow accounts

**Quarterly Tasks:**
- Verify property taxes are being paid (through escrow or directly)
- Review loan balance on underlying mortgage
- Check for any lender communications (due-on-sale monitoring)
- Property condition check (if rented out)

**Annual Tasks:**
- Insurance renewal verification
- Property tax payment verification
- 1098 interest statement preparation (seller finance)
- Tax return preparation (different treatment than rental income)
- Review balloon dates approaching

**CRITICAL Deadlines (unique to creative finance):**
- Balloon payment due date (seller finance) -- potentially the most important date in the entire deal
- Lease option expiration date
- Insurance renewal dates (a lapse could trigger lender notice)
- Property tax payment dates (delinquency could trigger lender notice)
- Monthly mortgage payment dates (subject-to -- late payment damages seller's credit)
- Note servicing fee payments

**Consequences of missing deadlines:**
- Missed balloon date = default on seller finance note, potential foreclosure by seller
- Missed underlying mortgage payment (sub-to) = damages seller's credit, could trigger lender scrutiny
- Insurance lapse = lender force-places insurance (expensive) AND discovers ownership transfer
- Missed lease option expiration = tenant-buyer loses option, forfeits option fee and rent credits

### 5.4 Communication Needs

**Seller Communication (ongoing):**
- Monthly or quarterly check-ins (seller needs reassurance payments are being made)
- Payment confirmation sharing
- Annual tax document coordination
- Any issues with lender communications (subject-to)

**Note Servicer Communication:**
- Monthly: Payment processing confirmation
- As needed: Late payment notifications, escrow adjustments

**Tenant/Tenant-Buyer Communication:**
- Same as buy-and-hold for standard rentals
- Additional for lease option: Rent credit statements, option exercise reminders, purchase preparation guidance

**Attorney Communication:**
- Contract preparation and review
- Dispute resolution
- Balloon refinance guidance

**No mass outbound marketing** -- creative finance acquisition uses the same marketing as wholesale, but the deal structure is negotiated differently.

### 5.5 Financial Tracking Per-Deal

**Subject-To Financial Tracking:**

| Item | Description | Frequency |
|------|------------|-----------|
| Underlying mortgage payment | Payment to seller's lender | Monthly |
| Rental income received | From tenant | Monthly |
| Cash flow spread | Rent - mortgage payment - expenses | Monthly |
| Insurance premium | Maintain correct policy | Annual |
| Property taxes | Pay or verify escrow covers | Semi-annual |
| Remaining loan balance | Track paydown of underlying note | Monthly |
| Equity position | Property value - loan balance | Quarterly |

**Seller Finance Financial Tracking:**

| Item | Description | Frequency |
|------|------------|-----------|
| Monthly payment to seller | Principal + Interest | Monthly |
| Amortization schedule | Track P&I split, remaining balance | Monthly |
| Balloon payment amount | Outstanding balance at balloon date | Track continuously |
| Rent collected (if renting) | Tenant payments | Monthly |
| Cash flow | Rent - seller note payment - expenses | Monthly |
| Interest paid (deductible) | For tax reporting | Annual |

**Lease Option Financial Tracking:**

| Item | Description | Frequency |
|------|------------|-----------|
| Option fee collected | Non-refundable, credited if exercised | One-time |
| Monthly rent | From tenant-buyer | Monthly |
| Rent credits accumulated | Percentage of rent credited toward purchase | Monthly |
| Purchase price | Fixed or formula-based | Set at signing |
| Option expiration date | Countdown | Continuous |
| Current property value | Monitor appreciation | Quarterly |

**Wrap Mortgage Financial Tracking:**

| Item | Description | Frequency |
|------|------------|-----------|
| Wrap payment received | From buyer | Monthly |
| Underlying mortgage payment | To original lender | Monthly |
| Spread income | Wrap payment - underlying payment | Monthly |
| Underlying loan balance | Paydown tracking | Monthly |
| Wrap note balance | Buyer's remaining balance | Monthly |

### 5.6 Due Diligence Checklist

All standard due diligence items (Section 2.6), plus:

**Subject-To Specific:**
- [ ] Verify exact mortgage balance, rate, payment amount, escrow details
- [ ] Review mortgage documents for due-on-sale clause language
- [ ] Verify mortgage is current (no arrears)
- [ ] Get third-party authorization signed by seller
- [ ] Verify loan type (FHA/VA/conventional -- FHA/VA have stricter due-on-sale enforcement)
- [ ] Check for second mortgages, HELOCs, or other liens
- [ ] Verify property tax status
- [ ] Set up insurance correctly (maintain mortgagee clause, add buyer as additional insured)
- [ ] Confirm lender's mailing address for insurance notification routing

**Seller Finance Specific:**
- [ ] Verify seller owns property free and clear OR has enough equity for the deal to work
- [ ] Title search for any existing liens
- [ ] Attorney review of promissory note and deed of trust
- [ ] Confirm usury law compliance (state-specific interest rate caps)
- [ ] Dodd-Frank compliance if applicable (residential seller finance rules)
- [ ] Set up note servicing with third-party servicer

**Lease Option Specific:**
- [ ] Verify option agreement is separate from lease (important for legal protection)
- [ ] Confirm option fee amount and rent credit formula
- [ ] Verify exercise notice requirements and timeline
- [ ] Check local laws on lease option structures (some states have restrictions)
- [ ] Ensure purchase price is documented (fixed or formula)

### 5.7 Post-Close Needs

Creative finance has the MOST intensive post-close requirements because deals create ongoing financial obligations:

**Subject-To Post-Close:**
- Monthly payment monitoring on underlying mortgage (NEVER miss a payment)
- Insurance verification (annually and any time a change is made)
- Property tax monitoring
- Seller credit report monitoring (seller's credit is at stake)
- Lender communication monitoring (watch for due-on-sale enforcement letters)
- Exit strategy planning: refinance into own name within 2-5 years

**Seller Finance Post-Close:**
- Payment receipt tracking (via note servicer or direct)
- Amortization schedule maintenance
- Balloon date countdown and refinance planning
- Annual 1098 issuance to buyer (interest deduction)
- Default monitoring and cure period enforcement

**Lease Option Post-Close:**
- All standard property management tasks
- Rent credit accounting per payment
- Option period countdown
- Exercise notification tracking
- If exercised: coordinate closing with title company, credit option fee and rent credits
- If expired: notification to tenant-buyer, security deposit handling, re-lease or sell

**Wrap Mortgage Post-Close:**
- Receive wrap payments from buyer
- Make underlying mortgage payments
- Track both loan balances
- Insurance and tax verification
- Spread income tracking for tax purposes

### 5.8 Marketing & Lead Generation

Creative finance uses the same outbound marketing as wholesale to find motivated sellers.

**Key difference:** Creative finance marketers often specifically target:
- Sellers with low equity (can't sell traditionally -- perfect for subject-to)
- Sellers who want monthly income vs lump sum (perfect for seller finance)
- Pre-foreclosure homeowners (subject-to saves them from foreclosure)
- Free-and-clear owners who want passive income (seller finance)
- Out-of-state owners tired of managing rentals (subject-to or seller finance)

**Marketing messaging is different:**
- "We can take over your payments and save your credit" (subject-to)
- "Get monthly income from your property without being a landlord" (seller finance)
- "We'll buy your house without bank financing" (all creative structures)

---

## Cross-Strategy Analysis

### 1. Shared Feature Matrix

| Feature | Wholesale | BRRRR | Buy-Hold | Flip | Creative |
|---------|-----------|-------|----------|------|----------|
| **Lead/Contact Management** | YES | YES | YES | YES | YES |
| **Deal Pipeline Tracking** | YES | YES | YES | YES | YES |
| **Property Analysis/Calculator** | YES | YES | YES | YES | YES |
| **Task/Reminder System** | YES | YES | YES | YES | YES |
| **Document Storage** | YES | YES | YES | YES | YES |
| **Communication Logging** | YES | YES | YES | YES | YES |
| **Cold Calling/Dialer** | YES | YES | Low | YES | YES |
| **SMS Campaigns** | YES | YES | Low | YES | YES |
| **Direct Mail Integration** | YES | YES | Low | YES | YES |
| **Drip Campaign Automation** | YES | YES | Low | YES | YES |
| **Skip Tracing** | YES | YES | Low | YES | YES |
| **List Management/Stacking** | YES | YES | Low | YES | YES |
| **Cash Buyer List (Dispo)** | YES | No | No | No | No |
| **Rehab Budget Tracking** | No | YES | Low | YES | Low |
| **Contractor Management** | No | YES | Low | YES | Low |
| **Draw Schedule Tracking** | No | YES | No | YES | No |
| **Tenant Management** | No | YES | YES | No | YES* |
| **Rent Collection** | No | YES | YES | No | YES* |
| **Maintenance/Work Orders** | No | YES | YES | No | YES* |
| **Lease Management** | No | YES | YES | No | YES* |
| **Refinance Tracking** | No | YES | Opt | No | No |
| **Amortization/Loan Tracking** | No | YES | YES | No | YES |
| **Note Servicing Integration** | No | No | No | No | YES |
| **Balloon Date Alerts** | No | No | No | No | YES |
| **Insurance Verification** | Low | YES | YES | Low | YES |
| **Wrap Payment Tracking** | No | No | No | No | YES |
| **Rent Credit Tracking** | No | No | No | No | YES |
| **Option Period Tracking** | No | No | No | No | YES |
| **Listing/Sale Phase Mgmt** | No | No | No | YES | No |
| **Staging/Photo Tracking** | No | No | No | YES | No |
| **Portfolio P&L Dashboard** | No | YES | YES | No | YES |
| **Tax Document Prep** | Low | YES | YES | YES | YES |

*YES = Creative finance if property is being rented out*

**Universal features (needed by ALL strategies):**
1. Contact/Lead Management (CRM core)
2. Deal Pipeline with customizable stages
3. Property data and analysis
4. Task and reminder system
5. Document storage and management
6. Communication logging (calls, texts, emails)
7. Financial tracking per deal
8. Reporting and dashboards
9. Mobile access

**Strategy-specific features:**
- Wholesale only: Cash buyer list / disposition pipeline
- BRRRR only: Refinance tracking with seasoning countdown
- Buy-and-Hold only: Full property management (tenants, maintenance, leases, rent)
- Flip only: Rehab project management with draw schedules + sale phase tracking
- Creative only: Note servicing, balloon alerts, wrap payment tracking, rent credits, option period tracking

### 2. Contact Type Taxonomy

| Contact Type | Strategies | Key Attributes |
|-------------|-----------|----------------|
| **Motivated Seller** | ALL | Name, phones (mobile + landline), email, mailing address, property address, motivation level (1-10), timeline, asking price, source/list origin, property condition, existing mortgage details, follow-up date, communication log, status |
| **Cash Buyer** | Wholesale | Name, entity name, phone, email, buy box (zip codes, property types, price range, condition tolerance), proof of funds, transaction history, response speed, last deal date |
| **Hard Money Lender** | BRRRR, Flip | Company, contact, loan programs, rates, points, LTV limits, draw process, seasoning requirements, speed of funding, extension policy |
| **DSCR / Conventional Lender** | BRRRR, Buy-Hold | Company, contact, DSCR requirements, LTV caps, seasoning period, credit score requirements, rate sheet, processing time |
| **General Contractor** | BRRRR, Flip, Creative* | Company, contact, license #, insurance cert, trades covered, crew size, availability, quality rating, bid history, payment terms |
| **Subcontractor** | BRRRR, Flip | Company, contact, specific trade, license, insurance, hourly rate, bid history, quality rating |
| **Property Manager** | BRRRR, Buy-Hold, Creative* | Company, contact, management fee %, leasing fee, maintenance markup, properties managed, tenant placement rate |
| **Tenant** | BRRRR, Buy-Hold, Creative* | Full name, phones, email, emergency contact, employer, income, SSN, lease dates, rent amount, deposit, payment history, maintenance requests |
| **Tenant-Buyer** | Creative (Lease Option) | All tenant fields + option fee paid, purchase price, option expiration, rent credit %, accumulated credits, exercise intent |
| **Real Estate Agent** | ALL (varies) | Name, brokerage, license #, specialties, commission, market areas, investor-friendly (y/n), transaction history |
| **Listing Agent** | Flip | All agent fields + listing marketing capabilities, staging network, photographer contacts, avg DOM, list-to-sale ratio |
| **Title Company** | ALL | Company, contact, address, fee schedule, turnaround, assignment-friendly, double-close capable, creative-finance experienced |
| **Real Estate Attorney** | ALL (critical for Creative) | Name, firm, specialties, state bar #, fee structure, contract templates, closing capability |
| **Insurance Agent** | ALL | Name, carrier, policy types, premium quotes, renewal dates, subject-to experience (for Creative) |
| **Appraiser** | BRRRR, Flip, Buy-Hold | Name, contact, fee, turnaround, market areas, accuracy track record |
| **Note Servicing Company** | Creative | Company, contact, fee/loan/month, services, states covered, portal access |
| **Transaction Coordinator** | Wholesale, Flip | Name, contact, fee, active deals, closing timeline tracking |
| **Virtual Assistant / Cold Caller** | Wholesale, BRRRR, Flip, Creative | Name, rate, hours, dialer access, CRM access, performance metrics |
| **Accountant / Tax Preparer** | ALL | Name, firm, fee, RE investor experience (depreciation, 1031, cost seg) |

### 3. Universal Pipeline Template

**Acquisition Pipeline (applicable to all 5 strategies):**

```
Lead Source --> New Lead --> Contacted --> Qualified --> Appointment -->
Offer Made --> Negotiation --> Under Contract --> Due Diligence -->
Clear to Close --> CLOSED (Acquired)
```

**Post-Acquisition (strategy-specific branching):**

```
CLOSED (Acquired)
  |
  |-- [Wholesale] --> Marketing to Buyers --> Buyer Found --> 
  |                   Assignment Signed --> CLOSED (Assigned)
  |
  |-- [BRRRR] --> Rehab --> Rent-Ready --> Tenant Placed --> 
  |               Seasoning --> Refinance Applied --> Appraised --> 
  |               Underwriting --> CLOSED (Refinanced) --> [REPEAT]
  |
  |-- [Buy-Hold] --> Rent-Ready --> Marketing --> Showings --> 
  |                  Screening --> Lease Signed --> Active Tenancy -->
  |                  [Ongoing Management Loop]
  |
  |-- [Flip] --> Rehab --> Staged --> Listed --> Showings --> 
  |              Offer Received --> Under Contract (Sell Side) --> 
  |              Buyer DD --> CLOSED (Sold) --> P&L Reconciliation
  |
  |-- [Creative] --> Structure Finalized --> Attorney Review --> 
                     Closing --> [Ongoing Payment/Monitoring Loop]
```

**Common Dead/Lost stages (all strategies):**
- Dead -- Not Motivated
- Dead -- No Equity
- Dead -- Wrong Number / Bad Data
- Dead -- Do Not Contact
- Nurture -- Not Ready Now (long-term drip)
- Nurture -- Revisit in X Months

### 4. Communication Channel Priority

| Channel | Wholesale | BRRRR | Buy-Hold | Flip | Creative |
|---------|-----------|-------|----------|------|----------|
| Cold Calling | **#1** | **#1** | Low | **#1** | **#1** |
| SMS/Texting | **#2** | **#2** | Moderate | **#2** | **#2** |
| Ringless Voicemail | **#3** | **#3** | Low | **#3** | **#3** |
| Direct Mail | **#4** | **#4** | Low | **#4** | **#4** |
| Email | **#5** | **#5** | **#2** | **#5** | **#5** |
| Tenant Portal | N/A | **#1*** | **#1*** | N/A | **#1*** |
| Property Mgmt App | N/A | Moderate | **#1*** | N/A | Moderate |
| MLS Listing Syndication | N/A | N/A | Low | **#1**** | N/A |
| Social Media Ads | Moderate | Low | Low | Moderate | Low |

*Post-acquisition / management phase*
**Sale phase*

**Key Insight:** All acquisition-focused strategies share the same communication channel priority. The differentiation happens post-acquisition: rental strategies need tenant portals, flips need listing/marketing channels, creative needs ongoing seller/servicer communication.

### 5. Integration Requirements

**Tier 1: Must-Have Integrations (needed by most investors)**

| Service Category | Specific Tools | API/Integration Type | Used By |
|-----------------|---------------|---------------------|---------|
| **Property Data** | PropStream, BatchLeads, PropertyRadar | API | All |
| **Skip Tracing** | BatchSkipTracing, PropStream, REsimpli built-in | API or native | Wholesale, BRRRR, Flip, Creative |
| **Power Dialer** | BatchDialer, Mojo, PhoneBurner | API + Zapier | Wholesale, BRRRR, Flip, Creative |
| **SMS Platform** | Launch Control, REsimpli built-in, Twilio | API | Wholesale, BRRRR, Flip, Creative |
| **Direct Mail** | Ballpoint Marketing, REsimpli built-in, PostcardMania | API + Zapier | Wholesale, BRRRR, Flip, Creative |
| **E-Signature** | DocuSign, DotLoop, PandaDoc | API | All |
| **Accounting** | QuickBooks, Stessa, REsimpli built-in | API or export | All |
| **Automation** | Zapier, Make (Integromat) | API | All |
| **Phone System** | VoIP (OpenPhone, CallRail, Google Voice) | API | All |

**Tier 2: Strategy-Specific Integrations**

| Service Category | Specific Tools | Used By |
|-----------------|---------------|---------|
| **MLS Access** | RESO Web API, local MLS IDX feeds | Buy-Hold, Flip, BRRRR |
| **County Records** | PropStream (aggregates), DataTree, ATTOM | All |
| **Rehab Management** | FlipperForce, Rehab Valuator | BRRRR, Flip |
| **Property Management** | TurboTenant, DoorLoop, Buildium, RentRedi | Buy-Hold, BRRRR, Creative |
| **Tenant Screening** | TransUnion SmartMove, RentPrep | Buy-Hold, BRRRR |
| **Rent Collection** | Zelle, Venmo (informal), property mgmt platforms | Buy-Hold, BRRRR, Creative |
| **Note Servicing** | Evergreen, Opendoor Loan Servicing | Creative |
| **Driving for Dollars** | DealMachine | Wholesale, BRRRR, Flip, Creative |
| **Ringless Voicemail** | The Message Ninja, VoiceDrop, SlyBroadcast | Wholesale, BRRRR, Flip, Creative |
| **Hard Money Lenders** | LendingHome, Kiavi, Lima One, Easy Street | BRRRR, Flip |
| **DSCR Lenders** | Visio, DSCR lender networks | BRRRR, Buy-Hold |
| **Auction Platforms** | Auction.com, HubZu, Xome | BRRRR, Flip, Buy-Hold |

**Tier 3: Emerging/Advanced Integrations**

| Service Category | Description | Used By |
|-----------------|-------------|---------|
| **AI Call Analysis** | Transcribe and analyze seller calls for motivation scoring | Wholesale, Creative |
| **Virtual Driving for Dollars** | Satellite imagery analysis for property distress signals | All acquisition |
| **Comp Analysis APIs** | Automated ARV estimation from comparable sales | All |
| **Permit Tracking** | Municipal permit status monitoring | BRRRR, Flip |
| **Credit Monitoring** | Seller credit monitoring for subject-to deals | Creative |
| **Loan Balance APIs** | Track underlying loan paydown for subject-to/wraps | Creative |

---

## Key Takeaways for Parcel Platform Expansion

### The Market Gap

The existing CRM landscape for RE investors is fragmented:
- **REsimpli, FreedomSoft, InvestorFuse**: Excel at acquisition (wholesale-focused CRM). Strong in lead management, communication, marketing.
- **FlipperForce, Rehab Valuator**: Excel at rehab project management (flip-focused). Strong in budget tracking, contractor management.
- **TurboTenant, DoorLoop, Buildium**: Excel at property management (rental-focused). Strong in tenant management, rent collection, maintenance.
- **Nothing covers creative finance well.** Payment tracking, balloon date monitoring, wrap management, and note servicing integration are largely absent from existing platforms.

No single platform handles the complete lifecycle across all 5 strategies. Investors typically use 2-4 separate tools.

### Parcel's Opportunity

1. **Universal Acquisition Pipeline** -- All strategies share the same lead-to-contract workflow. Build this once, customize with strategy-specific stages.
2. **Strategy-Specific Post-Acquisition Modules** -- Plug-in modules for rehab tracking, tenant management, refinance tracking, and creative finance monitoring.
3. **The Creative Finance Gap** -- This is the most underserved segment. No CRM handles subject-to payment monitoring, balloon date alerts, wrap spread tracking, or lease option rent credit accounting well. Parcel could own this niche.
4. **Calculator-to-CRM Bridge** -- Parcel already has deal calculators. The natural extension is: analyze a deal in the calculator, then push it into the CRM pipeline with one click. No competitor does this seamlessly.
5. **Portfolio Dashboard** -- Investors who do multiple strategies need a single view showing: deals in pipeline (by strategy), active rehabs (budget/timeline status), rental portfolio (cash flow/vacancy), creative finance deals (payment status/balloon countdown), and overall portfolio performance.

### Contact Volume Benchmarks for CRM Design

| Investor Type | Active Contacts | Total Records |
|--------------|----------------|---------------|
| Solo wholesaler | 500-2,000 leads | 5,000-20,000+ |
| Wholesaling team (3-5 people) | 2,000-10,000 leads | 20,000-100,000+ |
| BRRRR investor (5-10 properties) | 200-500 contacts | 1,000-5,000 |
| Buy-and-hold (20+ units) | 100-300 active contacts | 500-2,000 |
| Fix-and-flip (5-10 flips/year) | 300-1,000 contacts | 3,000-15,000 |
| Creative finance (10+ deals) | 200-500 active contacts | 1,000-5,000 |

### Priority Feature Ranking (by impact across strategies)

1. **Contact/Lead Management** (all strategies)
2. **Customizable Deal Pipeline** (all strategies)
3. **Task/Reminder System with deadline tracking** (all strategies)
4. **Communication Logging** (all strategies)
5. **Property Analysis Calculator Integration** (all strategies -- Parcel's existing strength)
6. **Document Storage** (all strategies)
7. **Drip Campaign Automation** (wholesale, BRRRR, flip, creative acquisition)
8. **Financial Tracking Per-Deal** (all strategies, strategy-specific templates)
9. **Portfolio Dashboard** (BRRRR, buy-hold, creative)
10. **Rehab Budget/Timeline Tracking** (BRRRR, flip)
11. **Tenant/Property Management** (buy-hold, BRRRR, creative)
12. **Creative Finance Monitoring** (creative -- unique competitive advantage)
13. **Skip Tracing Integration** (wholesale, BRRRR, flip, creative)
14. **Dialer/SMS Integration** (wholesale, BRRRR, flip, creative)
15. **Direct Mail Integration** (wholesale, BRRRR, flip, creative)
