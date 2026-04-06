# MLS & IDX Data Access Research for Parcel

> **Date:** 2026-04-02
> **Context:** Parcel (parceldesk.io) is a real estate investment SaaS platform, NOT a brokerage. This document researches how non-brokerage tech companies access MLS data, what it costs, and what path makes sense for Parcel.

---

## Table of Contents

1. [RESO Web API Standard](#1-reso-web-api-standard)
2. [IDX Feed Licensing](#2-idx-feed-licensing)
3. [VOW Feeds — Richer Data for Investors](#3-vow-feeds--richer-data-for-investors)
4. [Data Aggregators and Gateways](#4-data-aggregators-and-gateways)
5. [How Competitors Access MLS Data](#5-how-competitors-access-mls-data)
6. [Data Access Paths for a Non-Brokerage SaaS](#6-data-access-paths-for-a-non-brokerage-saas)
7. [What Data Can Parcel Show](#7-what-data-can-parcel-show)
8. [NAR Settlement (2024) and Clear Cooperation Changes](#8-nar-settlement-2024-and-clear-cooperation-changes)
9. [Cost Analysis](#9-cost-analysis)
10. [Non-MLS Data Providers (Public Records, AVMs)](#10-non-mls-data-providers-public-records-avms)
11. [iOS and Mobile Considerations](#11-ios-and-mobile-considerations)
12. [Recommended Path for Parcel](#12-recommended-path-for-parcel)

---

## 1. RESO Web API Standard

### What is RESO?

RESO (Real Estate Standards Organization) is the industry body that defines how MLS data is structured and transmitted. Their two core standards are:

- **RESO Data Dictionary** — Defines field names, types, and lookup values so "ListPrice" means the same thing regardless of which MLS you query. Version 2.0 is current (ratified April 2024, mandatory compliance by April 2025). Contains 1,700+ fields and 3,100+ lookups.
- **RESO Web API** — The transport layer. Built on OData v4 (REST + JSON), secured with OAuth 2.0 over TLS. Current version is Web API Core 2.0.0. Replaces the legacy RETS (Real Estate Transaction Standard) protocol.

### Technical Specs

| Aspect | Detail |
|---|---|
| Protocol | REST over HTTPS |
| Data format | JSON (OData v4) |
| Auth | OAuth 2.0 bearer tokens |
| Query syntax | OData v4 — `$filter`, `$select`, `$expand`, `$orderby`, `$top`, `$skip` |
| Resources | Property, Member, Office, Media, OpenHouse, Teams, TeamMembers, PropertyRooms, PropertyUnitTypes |
| Relationships | One-to-many (e.g., one Property → many Media) via `$expand` |

**Example queries:**
```
GET /odata/Property?$filter=StandardStatus eq 'Active' and ListPrice gt 200000&$top=25&$select=ListingId,ListPrice,BedroomsTotal
GET /odata/Property?$expand=Media,OpenHouse&$filter=ModificationTimestamp ge 2026-04-01T00:00:00Z
GET /odata/Media?$filter=ResourceName eq 'Property' and ResourceRecordKey eq '12345'
```

### MLS Adoption

- NAR requires all REALTOR-owned MLSs to provide production-level Web API access.
- ~500 MLSs exist in the US (down from 645+ in 2018 due to consolidation).
- ~93% are RESO certified as of 2025.
- All MLSs were required to certify on Data Dictionary 2.0 by April 2025.
- RETS is being sunset; most MLSs now deliver data exclusively via Web API.

### How You Get Access

You do NOT get access from RESO directly. RESO defines the standard; each individual MLS grants access. After signing a data licensing agreement with a specific MLS (or through an aggregator), you receive credentials from that MLS's technology provider.

---

## 2. IDX Feed Licensing

### What is IDX?

IDX (Internet Data Exchange) is a **policy and licensing framework** — not a technology. It governs how MLS listing data can be displayed on consumer-facing websites. NAR requires every REALTOR-owned MLS to offer IDX data licensing.

### Can a Non-Brokerage Get IDX Access?

**Not directly.** IDX feeds are licensed to MLS participants (brokerages and agents). However, technology vendors can access IDX data through a **three-party agreement**:

1. **MLS Organization** — Owns the data
2. **Brokerage/Agent** — MLS member who sponsors the vendor
3. **Technology Vendor** — Builds the product

**Critical requirement:** A vendor cannot apply on its own. At least one active MLS subscriber (agent or brokerage) must request your services before the MLS will grant access.

### IDX Display Rules

| Allowed | Restricted / Varies |
|---|---|
| Active listings from all MLS participants | Sold listings (MLS-dependent, some require VOW) |
| List price, beds, baths, sqft, photos | Expired/withdrawn listings (often prohibited) |
| Address, property description | Days on market (IDX varies; VOW typically includes) |
| Open house dates | Price reduction history (IDX varies) |
| Listing agent name, office, contact | Original list price vs. current (VOW usually) |

### Attribution Requirements (Critical for Compliance)

- Must display: "Listed by [Brokerage Name]" with agent name and contact
- Must use "Listed by" — not "Presented by" or similar
- Must display MLS logo(s) per local rules
- Attribution must be legible — cannot hide via small font or low-contrast text
- Must include required disclaimers per MLS
- Photos are copyrighted — must have license, cannot scrape
- Listing data must be refreshed within 24-48 hours
- Removed/expired listings must be taken down promptly

### Penalties for Non-Compliance

- Feed suspension
- Loss of API credentials
- Compliance review from the MLS board
- Potential legal action for copyright infringement (especially photos)

---

## 3. VOW Feeds — Richer Data for Investors

### What is VOW?

VOW (Virtual Office Website) is an alternative data licensing framework established via a 2008 DOJ settlement with NAR. It provides **significantly richer data** than IDX, including:

- Sold listings going back 5+ years
- Expired and canceled listings
- Original list price and all price changes
- Days on market
- Full sales history per property
- Agent remarks (private notes)

### Access Restriction

VOW data is **not publicly accessible**. A brokerage-client relationship must be established before a user can view VOW data. Users typically register and acknowledge the relationship.

### Why VOW Matters for Parcel

For a real estate investment platform, sold comps, expired listings, and price history are the most valuable data points. IDX alone does not reliably provide these. A VOW feed (or equivalent licensed data) is the path to investor-grade MLS data.

---

## 4. Data Aggregators and Gateways

Instead of negotiating with 500 individual MLSs, aggregators normalize data from many MLSs into a single API.

### Trestle (CoreLogic / Cotality)

| Detail | Info |
|---|---|
| Coverage | 120+ MLS markets, 210M+ property records, 2.1B+ media files |
| API | RESO Web API compliant (OData v4) |
| Base URL | `https://api.cotality.com` (migrating from `api-trestle.corelogic.com`) |
| Resources | Property, Media, Member, Office, OpenHouse, PropertyRooms, Teams, TaxAssessment, and more |
| Pricing | ~$75-85/month per MLS connection; month-to-month; no fees until connections are granted |
| Auth | OAuth 2.0 |
| Vendor access | Sign up at `trestle.corelogic.com/SubscriptionWizard`; support via `trestlesupport@cotality.com` |
| Premium tiers | "Premium Quotas" available for large data refresh cycles |

**Strengths:** Largest MLS data gateway. 1,750+ standardized fields. Single contract covers multiple MLSs. RESO Platinum certified.

**Weakness:** You still need data licensing approval from each individual MLS — Trestle is the pipe, not the license.

### Spark API (FBS / Flexmls)

| Detail | Info |
|---|---|
| Coverage | MLSs that use Flexmls as their MLS platform |
| Developer signup | Free registration; demo credentials in ~3 business days |
| Per-MLS cost | $50/month per MLS accessed |
| API roles | IDX, Private, VOW — determines data scope |
| Data types | Listings, Contacts, Market Stats |
| Standard | RESO Web API compliant |

**Strengths:** Straightforward developer onboarding. Automated data licensing via "Spark Datamart" which handles plan types, approvals, and usage tracking.

**Weakness:** Only covers Flexmls-powered MLSs, not universal.

### Bridge Interactive (Zillow Group)

| Detail | Info |
|---|---|
| Coverage | Multiple MLSs in US and Canada |
| Complementary data | Zillow public records (148M properties, 3,200 counties), Zestimates |
| API | RESO Platinum certified Web API |
| Rate limits | Default 1,000 requests/day |
| Access | Dashboard-based; request access per MLS |

**Strengths:** Zillow public records data alongside MLS feeds. RESO certified.

**Weakness:** Owned by Zillow Group — potential competitive concerns if Parcel competes with Zillow's investor offerings.

### MLS Grid

| Detail | Info |
|---|---|
| Coverage | 30+ participating MLSs (founding member: Canopy MLS) |
| API | RESO Web API compliant, Data Dictionary compliant |
| Pricing varies by MLS | OneKey MLS: $250/mo + $20/mo per license; Heartland MLS: $100 setup + $175/mo; Stellar MLS: $450/yr per office capped at $7,500 |
| Value prop | Single data feed, single license agreement, single set of display rules |

**Strengths:** Designed specifically for broker-vendor data delivery. Standardized compliance across MLSs.

### Constellation Data Labs (formerly Constellation1)

| Detail | Info |
|---|---|
| Used by | Redfin (chose them for MLS data aggregation in 2022) |
| Architecture | Serverless cloud-based; real-time data processing |
| Standards | Latest RESO Data Dictionary and transport protocols |
| Scale | National-scale aggregation (powers Redfin's nationwide coverage) |

**Strengths:** Enterprise-grade. Proven at Redfin scale.

**Weakness:** Likely enterprise pricing. Not clearly available for startup-tier customers.

### ListHub (Move Inc. / News Corp)

| Detail | Info |
|---|---|
| Model | Listing syndication network — brokers push listings to publishers |
| Coverage | 600+ MLSs, 60,000+ brokerages, 150+ publishers, reaches 900+ consumer sites |
| Publishers must agree to | Data used only for consumer display, regular updates, removed when off-market, traffic/lead reporting |
| Cost | "Low six figures annually" for a national license |

**Strengths:** Fastest path to nationwide listing coverage.

**Weakness:** Very expensive for startups. Designed for large consumer portals (homes.com, realtor.com, etc.), not investment analytics platforms.

### SimplyRETS

| Detail | Info |
|---|---|
| Model | Developer-friendly wrapper around RETS/RESO Web API feeds |
| Pricing | Estimated ~$49/month entry level |
| Setup | Team applies data mappings, syncs, and QA tests; not charged until activated |
| Free trial | Demo data only (no live MLS data in trial) |

**Strengths:** Simplest developer experience. Good for prototyping.

**Weakness:** Still requires underlying MLS feed access — SimplyRETS is a middleware layer.

### RPR (Realtors Property Resource)

| Detail | Info |
|---|---|
| Coverage | 130M+ property records nationwide |
| Access | **Exclusively for REALTORS** — no third-party access |
| API | Available only to authorized real estate industry organizations |
| Workaround | REALTORS can create and share branded RPR reports with non-members |

**Not viable for Parcel** — RPR is locked to NAR members only.

---

## 5. How Competitors Access MLS Data

### PropStream

- **Model:** Data aggregator purchasing from "best-in-class sources" including MLS data providers, public records, and private data vendors
- **Coverage:** 160M+ properties nationwide
- **MLS data disruption:** Lost MLS sold/failed listing data circa 2023-2024 when NAR tightened rules. **Restored in December 2024** via a "proprietary algorithm that meets MLS regulations/requirements"
- **Key insight:** PropStream does NOT directly access MLSs as a member. They purchase processed/aggregated MLS data through licensing agreements with data vendors, then apply their own algorithms
- **Non-disclosure states:** Cannot show sale prices where public records don't include them
- **Pricing:** ~$99/month for investors

### Privy

- **Model:** Direct MLS data feeds via partnerships with individual MLS organizations
- **Coverage:** 90+ major markets (expanding market by market via MLS partnerships)
- **Data refresh:** Every 15 minutes
- **How they do it:** Privy negotiates direct partnerships with each MLS (e.g., MLS United in Mississippi, Imagine MLS in Kentucky). They position themselves as a technology platform serving both agents AND investors
- **Agent angle:** Privy Pro Agents get leads from investors, creating a value prop for brokerages to sponsor access
- **Pricing:** $79/month (investor plan), $37/month (agent plan)

### DealMachine

- **Model:** Primarily public records + some MLS data integration
- **Data sources:** County records (daily updates), 150M+ properties, 700+ data points
- **MLS access:** Limited — DealMachine is primarily a driving-for-dollars and direct mail platform
- **Core value:** Property owner contact info, not listing data
- **Pricing:** Varies by plan

### Mashvisor

- **Model:** Multi-source aggregation — MLS, Zillow, Airbnb, Redfin, Rentometer, Furnished Finder, Census data
- **Processing:** AI/ML algorithms for projections; not raw MLS pass-through
- **Developer API:** Available — provides active MLS/off-market listings, historical sales, rental comps
- **Key insight:** Mashvisor doesn't claim direct MLS access; they aggregate from sources that already publish listing data

### Zillow

- **Model:** Brokerage-level IDX feed agreements + direct MLS syndication deals + ListHub + scraping public portals
- **How it works:** MLS "Terms of Service" allow the MLS to license listing data to third parties including Zillow. Zillow has direct feeds from most MLSs. Where syndication gaps exist, they negotiate directly with large brokerages
- **Public records:** 148M properties via county assessor/recorder offices (through Bridge Interactive)
- **Scale advantage:** Too large for MLSs to refuse

### Redfin

- **Model:** **Redfin IS a brokerage.** They hold brokerage licenses across all 50 states, making them direct MLS participants
- **Data aggregation:** Uses Constellation Data Labs (formerly Constellation1) for MLS data processing and aggregation
- **IDX/VOW:** As a broker, Redfin accesses both IDX and VOW feeds directly
- **Key insight:** Redfin's strategy was to become a brokerage specifically to unlock MLS data access, then build technology on top. This is the most powerful but most expensive path

---

## 6. Data Access Paths for a Non-Brokerage SaaS

Ranked from most feasible to least feasible for Parcel:

### Path A: Use a Data Aggregator (No MLS, Public Records + AVMs)

**How:** Contract with ATTOM, HouseCanary, RentCast, or BatchData for property data without touching MLS directly.

| Pros | Cons |
|---|---|
| No MLS licensing required | No active listing data (for-sale properties) |
| Immediate access | No listing photos |
| Nationwide coverage | No real-time MLS feeds |
| Rich tax, deed, foreclosure, AVM data | Less accurate than direct MLS |
| Startup-friendly pricing available | |

**Best for:** MVPs focused on property analysis, comps from public records, and investment calculators rather than listing search.

### Path B: Partner with a Brokerage (White-Label MLS Access)

**How:** Find a brokerage willing to sponsor your MLS vendor access. The brokerage signs the three-party agreement with the MLS. You build the technology; they provide the license.

| Pros | Cons |
|---|---|
| Access real MLS data (IDX or VOW) | Need a willing brokerage partner per MLS market |
| Can show active listings, sold comps | Brokerage must remain active and in good standing |
| Lower cost than becoming a brokerage | Scale is slow (market by market) |
| Standard path for most real estate tech vendors | Brokerage may want revenue share or equity |

**Best for:** Entering 1-5 initial markets with full MLS data. This is how most proptech startups begin.

### Path C: Apply as a Technology Vendor Directly to MLSs

**How:** Apply through MLS data delivery platforms (Trestle, MLS Grid, Bridge) with a sponsoring subscriber.

| Pros | Cons |
|---|---|
| Direct relationship with MLS | Still need at least one MLS subscriber to sponsor |
| Standardized via RESO Web API | Each MLS has its own approval process |
| Can choose specific markets | Vendor pre-approval process varies |
| More control than brokerage dependency | Some MLSs restrict data to agent-facing tools only |

**Key restriction:** Many MLSs restrict vendor data to products "intended for MLS members (agents, teams, brokerages)." A consumer-facing or investor-facing tool using MLS data may not be approved unless it includes an agent-facing component.

### Path D: Obtain a Brokerage License

**How:** Parcel (or a subsidiary) gets a real estate brokerage license, joins MLSs, and becomes a direct participant.

| Pros | Cons |
|---|---|
| Full, unrestricted MLS access | Requires a licensed broker (principal broker) |
| IDX + VOW + BBO feeds | Per-state licensing requirements |
| Most data-rich path | MLS membership fees per market |
| No dependency on partner brokerages | Regulatory and compliance burden |
| How Redfin solved this problem | Ongoing continuing education requirements |

**Best for:** Long-term play if Parcel wants to be the investment-grade data platform. High upfront cost, maximum data access.

### Path E: Public Records Only

**How:** Skip MLS entirely. Use county assessor/recorder data, foreclosure filings, and third-party AVMs.

| Pros | Cons |
|---|---|
| Zero MLS licensing friction | No active listing data |
| ATTOM, BatchData cover 155M+ properties | No listing photos |
| Tax, deed, mortgage, foreclosure data | No agent/office info |
| Fastest to launch | Investors expect listing data |

**Best for:** If Parcel's core value prop is analysis/calculators rather than property discovery.

---

## 7. What Data Can Parcel Show

### With IDX License (via brokerage partnership or vendor agreement)

| Data Point | Available? | Notes |
|---|---|---|
| Active listings | Yes | Core IDX feature |
| List price | Yes | |
| Property details (beds, baths, sqft) | Yes | |
| Photos | Yes | Must attribute listing brokerage; copyright applies |
| Listing agent / office | Yes | Must display per "Listed by" rules |
| Pending / under contract | Yes | Most MLSs include |
| Open house dates | Yes | |
| Sold listings | Varies | Some MLSs include in IDX; many require VOW |
| Days on market | Varies | MLS-dependent; more reliably available via VOW |
| Price reduction history | Varies | MLS-dependent |
| Expired / withdrawn | Usually no | Typically requires VOW; some MLSs prohibit entirely |
| Original list price | Varies | More common in VOW feeds |
| Agent remarks (private) | No | Never in IDX; sometimes in VOW |

### With VOW License (requires registered user + brokerage relationship)

| Data Point | Available? |
|---|---|
| Everything in IDX | Yes |
| Sold listings (5+ years) | Yes |
| Expired / canceled listings | Yes |
| Days on market | Yes |
| Full price history | Yes |
| Original list price | Yes |
| Agent private remarks | Sometimes |

### With Public Records Only (ATTOM, BatchData, etc.)

| Data Point | Available? |
|---|---|
| Property ownership | Yes |
| Tax assessments | Yes |
| Deed / sale records | Yes (disclosure states) |
| Mortgage info | Yes |
| Foreclosure / pre-foreclosure | Yes |
| Liens / bankruptcies | Yes |
| AVM (estimated value) | Yes |
| Active for-sale listings | No |
| Listing photos | No |
| Agent info | No |

---

## 8. NAR Settlement (2024) and Clear Cooperation Changes

### NAR Settlement (August 17, 2024)

The $418M settlement primarily affected **agent commissions**, not data access:

- **Compensation offers prohibited on MLS** — Buyer agent compensation can no longer appear in MLS listings
- **Buyer agreements required** — Agents must have written agreements before touring homes
- **Data sharing via API required** — Statewide data shares must deliver through a common API

**Impact on tech companies:** Minimal direct impact on MLS data licensing for vendors. The settlement did not open up MLS data to non-members or create new access pathways.

### Clear Cooperation Policy Update (March 2025)

- New "Multiple Listing Options for Sellers" policy effective March 25, 2025 (implementation by September 30, 2025)
- Creates "delayed marketing exempt listings" — sellers can delay IDX syndication (Zillow, Realtor.com, etc.) while still submitting to MLS for agent-to-agent visibility
- **Zillow's response:** Will permanently refuse to display any listing that uses the delayed marketing exemption, even after the delay period ends

**Impact on Parcel:** If Parcel receives data via IDX feeds, some listings may be delayed or never appear on Parcel during their marketing window. This makes VOW or direct MLS feeds more valuable than IDX for completeness.

---

## 9. Cost Analysis

### Individual MLS Access (Direct)

| Cost Component | Range |
|---|---|
| Board / association membership | $200-600/year |
| Monthly MLS access | $20-50/month |
| IDX setup fee | $0-250 one-time |
| Monthly IDX data fee | $5-30/month |
| **Total per MLS (year 1)** | **$500-1,500** |

### Aggregator / Gateway Costs

| Provider | Cost |
|---|---|
| Trestle (CoreLogic) | ~$75-85/month per MLS connection |
| Spark API (FBS) | $50/month per MLS |
| MLS Grid | $175-250/month per MLS (varies) |
| SimplyRETS | ~$49/month entry |
| ListHub (national) | ~$100,000+/year |

### Non-MLS Data Providers

| Provider | Cost | Coverage |
|---|---|---|
| ATTOM | $95-500+/month; enterprise contracts higher | 158M properties, 9,000 attributes |
| HouseCanary | $79-199/month; API: $0.40-5.00 per call | 136M properties, 114M AVMs |
| RentCast | Free (50 calls/mo) to paid tiers | 140K+ properties |
| BatchData | $500-5,000+/month | 155M properties, 700-1,000 data points |
| Mashvisor API | Custom pricing | MLS + Airbnb + public records |

### Scaling Cost Reality

| Scenario | Estimated Annual Cost |
|---|---|
| MVP: 1 market + public records API | $2,000-5,000 |
| Growth: 5 markets via Trestle + ATTOM | $10,000-20,000 |
| Scale: 25 markets via aggregator + VOW | $40,000-80,000 |
| National: ListHub or equivalent | $100,000-250,000+ |
| National: Own brokerage + direct MLS | $150,000-300,000+ (plus broker salary) |

---

## 10. Non-MLS Data Providers (Public Records, AVMs)

For a platform that starts WITHOUT MLS access, these providers fill significant gaps:

### ATTOM Data Solutions

- **Coverage:** 158M US properties, 99% population coverage
- **Data:** Tax assessments, deed/sale records, valuations, foreclosures, liens, schools, demographics, boundaries, environmental risk
- **API:** REST, JSON/XML
- **Pricing:** Starts ~$95/month; enterprise custom
- **30-day free trial** available
- **Best for:** Comprehensive property intelligence without MLS

### HouseCanary

- **Coverage:** 136M properties
- **Data:** AVMs (114M), rental valuations (97M), market forecasts
- **API:** Tiered pricing from $79/month
- **Best for:** Property valuation and rental estimates

### RentCast

- **Coverage:** 140K+ property records
- **Data:** Property details, owner info, AVM/rent estimates, comps, active listings, market trends
- **API:** Free plan (50 calls/month); paid tiers scale
- **Best for:** Rental analysis focus

### BatchData

- **Coverage:** 155M US properties
- **Data:** 700-1,000+ data points per property; owner contact info, skip tracing
- **API:** $500-5,000+/month
- **Best for:** Lead generation and owner outreach

---

## 11. iOS and Mobile Considerations

### Displaying MLS Data in a Native App

- **Attribution:** All MLS compliance rules apply equally to mobile — listing agent, brokerage name, MLS logos, and disclaimers must be displayed
- **Font size:** Attribution must be "reasonably prominent" and legible on mobile screens — cannot be hidden by small font
- **Photo display:** MLS photos may include watermarks; apps must not crop or alter watermarks

### Photo Caching and Storage

- **Caching limits:** Many MLSs restrict how long you can cache listing photos locally. Must purge when listing is removed from MLS
- **Storage cost:** Photos dominate bandwidth and storage — a single listing may have 25-50 high-res images
- **Strategy:** Use thumbnail/progressive loading; full-res on demand; respect TTL from MLS

### Offline Listing Data

- **Precedent:** MLS Mobile (iOS) specifically supports offline mode for showings in dead zones
- **Compliance:** Offline cached data must still be refreshed within MLS-required intervals (typically 24-48 hours) when connectivity returns
- **Implementation:** Cache property details and thumbnails; full photo sets only when user favorites/saves

### Map-Based Search

- **Standard:** MapKit (iOS native) or Google Maps SDK
- **Clustering:** Essential — MLS markets can have 50,000+ active listings
- **Geospatial queries:** RESO Web API supports lat/long coordinates; filter by bounding box for map viewport
- **Performance:** Paginate results; use `$top` and `$skip` with geographic filters

---

## 12. Recommended Path for Parcel

### Phase 1: Launch with Public Records (No MLS)

**Timeline:** Immediate

1. Contract with **ATTOM** or **HouseCanary** for property data API
2. Build property analysis tools using tax, deed, sale, and AVM data
3. This covers: ownership lookup, estimated values, sale history (disclosure states), foreclosure/pre-foreclosure data, mortgage info, liens
4. **What you CAN'T do yet:** Show active for-sale listings, listing photos, or real-time MLS status

**Cost:** $1,000-5,000/year

### Phase 2: Add MLS Data in One Market

**Timeline:** 3-6 months after launch

1. Identify your largest user market (likely a major metro)
2. **Partner with a brokerage** in that market — find a broker willing to sponsor your MLS vendor access
3. Sign three-party agreement (MLS + Brokerage + Parcel)
4. Connect via **Trestle** or **MLS Grid** (whichever the MLS uses)
5. Implement IDX compliance: attribution, disclaimers, refresh intervals, photo rules
6. Consider **VOW** licensing for sold comps and expired listings (requires user registration acknowledging brokerage relationship)

**Cost:** $3,000-8,000/year for first market

### Phase 3: Expand to 5-10 Markets

**Timeline:** 6-18 months

1. Use Trestle as your primary aggregation gateway (one API, multiple MLSs)
2. Need brokerage partnerships OR sponsoring subscribers in each market
3. Consider the **Privy model**: build an agent-facing feature set that creates value for agents, so they sponsor your MLS access in their market
4. Negotiate VOW access where available for investment-grade data

**Cost:** $15,000-40,000/year

### Phase 4: Consider Brokerage License (Optional)

**Timeline:** 12-24 months if user demand justifies

1. Form a subsidiary or affiliate that holds a brokerage license
2. Hire a principal broker (or license an existing team member)
3. Join MLSs directly as a participant — unlocks IDX + VOW + BBO
4. This is the Redfin playbook: become a brokerage to unlock data, then build technology on top

**Cost:** $50,000-150,000+/year (broker salary, licensing, MLS fees)

### Decision Framework

| If Parcel's core value is... | Recommended path |
|---|---|
| Investment calculators and analysis tools | Phase 1 only (public records + AVMs) |
| Property discovery + analysis for investors | Phase 1 → Phase 2 (MLS in key markets) |
| Comprehensive nationwide property platform | Phase 1 → 2 → 3 → 4 (full MLS via brokerage) |
| Competing with PropStream/Privy | Phase 2 → 3 minimum; Phase 4 for full parity |

---

## Key Takeaways

1. **A non-brokerage SaaS cannot get MLS data on its own.** You need either a brokerage partner, an MLS subscriber sponsor, or you become a brokerage yourself.

2. **IDX is the minimum; VOW is what investors actually need.** Sold comps, expired listings, and price history — the data investors care most about — typically require VOW licensing, not basic IDX.

3. **Aggregators (Trestle, Bridge, MLS Grid) are the pipe, not the license.** They normalize the API, but each MLS still requires its own data licensing agreement.

4. **PropStream's model is instructive:** They buy aggregated/processed MLS data from third-party vendors and apply proprietary algorithms to stay compliant with MLS rules. They lost MLS data in 2023 and had to rebuild access.

5. **Privy's model is the closest analog to Parcel:** Direct MLS partnerships, market-by-market expansion, agent-facing features to justify MLS access, investor-facing analytics on top.

6. **The NAR 2024 settlement did not open MLS data access** to non-members. It primarily affected commission structures.

7. **Start with public records.** ATTOM or HouseCanary gives you 150M+ properties, tax/deed/AVM data, and foreclosures — enough to build an investment analysis MVP without touching MLS complexity.

8. **Budget $50-100K/year** once you're in 5+ MLS markets with real data. Below that, public records + 1-2 MLS markets is achievable for under $10K/year.

---

## Sources

- [RESO Web API](https://www.reso.org/reso-web-api/)
- [RESO Data Dictionary](https://www.reso.org/data-dictionary/)
- [RESO Data Dictionary 2.0 Wiki](https://ddwiki.reso.org/display/DDW20/Data+Dictionary+v2.0+Introduction)
- [RESO Certification Map](https://www.reso.org/certification/)
- [NAR IDX Policy (Policy Statement 7.58)](https://www.nar.realtor/handbook-on-multiple-listing-policy/advertising-print-and-electronic-section-1-internet-data-exchange-idx-policy-policy-statement-7-58)
- [NAR VOW Policy](https://www.nar.realtor/handbook-on-multiple-listing-policy/virtual-office-websites-policy-governing-use-of-mls-data-in-connection-with-internet-brokerage)
- [NAR MLS Participation Qualification](https://www.nar.realtor/about-nar/policies/qualification-for-mls-participation-and-idx)
- [NAR 2024 Settlement FAQ](https://www.nar.realtor/the-facts/nar-settlement-faqs)
- [NAR 2024 MLS Changes Summary](https://www.nar.realtor/about-nar/policies/summary-of-2024-mls-changes)
- [NAR Clear Cooperation Policy](https://www.nar.realtor/about-nar/policies/mls-clear-cooperation-policy)
- [NAR Multiple Listing Options for Sellers (March 2025)](https://www.nar.realtor/newsroom/nar-introduces-new-mls-policy-to-expand-choice-for-consumers)
- [Trestle Documentation (CoreLogic/Cotality)](https://trestle-documentation.corelogic.com/)
- [Trestle for Technology Providers](https://trestle.corelogic.com/Home/Providers)
- [Spark API Documentation](https://sparkplatform.com/docs)
- [Spark API Pricing](https://flexmls.com/flexmls-academy/mls-administrators/introducing-tiered-pricing-plans-for-spark-api-subscriptions/)
- [Bridge Interactive](https://www.bridgeinteractive.com/)
- [Bridge API Documentation](https://bridgedataoutput.com/docs/platform/API/bridge)
- [MLS Grid](https://www.mlsgrid.com/)
- [MLS Grid FAQ](https://www.mlsgrid.com/faq)
- [MLS Grid Documentation](https://docs.mlsgrid.com/)
- [SimplyRETS](https://simplyrets.com)
- [ListHub](https://realtyna.com/blog/what-is-listhub/)
- [RPR (Realtors Property Resource)](https://www.narrpr.com/)
- [Constellation Data Labs (Redfin partnership)](https://www.cdatalabs.com/news/redfin-real-estate-api)
- [Guide to Licensing Listing Data for RE Tech Startups](https://blog.aaronkardell.com/p/your-guide-to-licensing-listing-data)
- [How Many MLSs in the US (Realtyna)](https://realtyna.com/blog/how-many-mls-united-states/)
- [PropStream MLS Update (Dec 2024)](https://www.propstream.com/news/important-propstream-mls-update-our-failed-and-sold-data-is-back)
- [PropStream: Beyond the MLS (RISMedia)](https://www.rismedia.com/2025/01/15/beyond-the-mls-propstream-revolutionizing-real-estate-data-search/)
- [Privy Real Estate](https://www.privy.pro/)
- [Privy Review (Real Estate Skills)](https://www.realestateskills.com/blog/privy)
- [DealMachine MLS Data](https://www.dealmachine.com/mls-data)
- [Mashvisor API](https://www.mashvisor.com/data-api)
- [ATTOM Property Data API](https://www.attomdata.com/solutions/property-data-api/)
- [HouseCanary Pricing](https://www.housecanary.com/pricing)
- [RentCast API](https://www.rentcast.io/api)
- [BatchData](https://batchdata.io/)
- [Repliers: MLS Data Integration Compliance Guide](https://repliers.com/mls-data-integration-compliance-guide/)
- [IDX Broker Sold/Pending Listings](https://support.idxbroker.com/hc/en-us/articles/34489735120539-Sold-and-Pending-Listings)
- [SmartMLS Photo Copyright](https://smartmls.com/photos/)
- [Unlock MLS Photography Guidelines](https://www.unlockmls.com/photography-guidelines)
- [Unlock MLS Data Licensing](https://www.unlockmls.com/data-licensing)
- [Repliers: Guide to Vendor Approvals and MLS Access](https://help.repliers.com/en/article/guide-to-vendor-approvals-and-mls-access-1bu6n3a/)
- [RESO Web API Overview (Curiosum)](https://www.curiosum.com/blog/understanding-reso-web-api)
- [Real Estate Listing Data Terminology (SimplyRETS)](https://simplyrets.com/blog/real-estate-listing-data-terminology)
