# Property Data API Providers -- Exhaustive Landscape Research

**Prepared for:** Ivan Flores / Parcel (parceldesk.io)
**Date:** 2026-04-02
**Purpose:** Evaluate property data API providers for Parcel's evolution into a full real estate investment OS/CRM with native iOS app

---

## Table of Contents

1. [RentCast (Current Integration Target)](#1-rentcast)
2. [Bricked.ai (Previously Researched)](#2-brickedai)
3. [ATTOM Data](#3-attom-data)
4. [HouseCanary](#4-housecanary)
5. [CoreLogic / Trestle](#5-corelogic--trestle)
6. [ICE Mortgage Technology (Black Knight)](#6-ice-mortgage-technology-black-knight)
7. [Bridge Interactive / Zillow Group APIs](#7-bridge-interactive--zillow-group-apis)
8. [RealtyMole (now RentCast)](#8-realtymole-now-rentcast)
9. [Rentometer](#9-rentometer)
10. [Estated (now ATTOM)](#10-estated-now-attom)
11. [Parcl Labs](#11-parcl-labs)
12. [Redfin](#12-redfin)
13. [Realtor.com](#13-realtorcom)
14. [BatchData](#14-batchdata)
15. [RealEstateAPI (REAPI)](#15-realestateapi-reapi)
16. [Realie.ai](#16-realieai)
17. [County Recorder/Assessor APIs](#17-county-recorderassessor-apis)
18. [RESO Web API Standard](#18-reso-web-api-standard)
19. [iOS Architecture Considerations](#19-ios-architecture-considerations)
20. [Provider Comparison Matrix](#20-provider-comparison-matrix)
21. [Recommendation](#21-recommendation)

---

## 1. RentCast

**Website:** https://www.rentcast.io
**Status:** Primary integration candidate for Parcel. No code integration found in codebase yet.

### Data Fields Returned

**Property Records (140M+ properties):**
- Structural attributes: beds, baths, sqft, year built, property type, lot size
- Tax assessment history and annual property tax amounts
- Sale transaction history (dates, amounts, buyer/seller)
- Owner contact details (name, mailing address)

**Value & Rent Estimates (AVM):**
- Home value estimate with confidence range
- Rent estimate with confidence range
- Comparable properties with attributes, listed prices/rents, distance metrics

**Active Listings:**
- For-sale and for-rent listings nationwide
- Listed price/rent, status, days on market
- MLS numbers and listing agent/contact details

**Market Data (38,000+ zip codes):**
- Average and median sale prices and rents
- Historical price and rent trends
- Listing composition statistics by property type and size

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/v1/properties` | GET | Search property records by address/location |
| `/v1/properties/random` | GET | Random property records |
| `/v1/properties/{id}` | GET | Property record by ID |
| `/v1/avm/value` | GET | Home value estimate |
| `/v1/avm/rent` | GET | Rent estimate |
| `/v1/listings/sale` | GET | For-sale listings |
| `/v1/listings/sale/{id}` | GET | Sale listing by ID |
| `/v1/listings/rental` | GET | Rental listings |
| `/v1/listings/rental/{id}` | GET | Rental listing by ID |
| `/v1/markets` | GET | Market statistics by zip |

### Pricing

| Plan | Monthly Cost | API Calls/Month | Overage Rate |
|------|-------------|-----------------|--------------|
| **Developer** | Free | 50 | $0.20/call |
| **Foundation** | $74 | 1,000 | $0.06/call |
| **Growth** | $199 | 5,000 | $0.03/call |
| **Scale** | $449 | 25,000 | $0.015/call |

**Cost at startup scale (1K lookups/mo):** $74/mo
**Cost at growth scale (10K lookups/mo):** $199-449/mo
**Cost at 100K+ lookups/mo:** Custom pricing needed

### Technical Details

- **Auth:** API key via `X-Api-Key` header
- **Format:** REST, JSON responses
- **Rate limits:** Not explicitly documented, but real-time usage dashboard available
- **SDKs:** No official SDK; REST-only. Zapier integration available.
- **iOS SDK:** None. REST API works fine from any HTTP client.
- **OpenAPI spec:** Not confirmed publicly

### Data Freshness

- 500,000+ record and listing updates processed daily
- Market data for current month updated daily
- Month-end snapshots saved as historical records
- Data sourced from public records, tax assessors, and online directories

### Geographic Coverage

- **Nationwide US** -- 140M+ properties, all 50 states
- ~96% of residential sale and rental listings covered
- ~90% of 5+ unit commercial apartment listings covered
- Market data for "most" US zip codes (some rural gaps possible)

### Contract Requirements

- No contracts, cancel anytime
- No minimum commitment
- Month-to-month billing

### Competitors Using RentCast

- DealCheck (documented as using RentCast for property data)
- Multiple proptech startups via Zapier/API integrations

### Strengths for Parcel

- Affordable startup pricing with free tier for development
- Clean REST API, no contract commitment
- Rent estimates are core to Parcel's value proposition
- 140M+ property records with owner data
- Good data freshness (daily updates)

### Weaknesses for Parcel

- No AI-powered comps or ARV estimates
- No repair cost estimates
- No MLS agent/listing detail depth (basic listing data only)
- No mortgage debt or equity data
- No parcel boundary/polygon data
- Limited to US only

---

## 2. Bricked.ai

**Website:** https://bricked.ai
**Status:** Fully researched in [04-bricked-ai-analysis.md](./04-bricked-ai-analysis.md). Summary here for landscape comparison.

### Data Fields Returned (Single API Call)

- **Valuations:** CMV (Current Market Value), ARV (After Repair Value)
- **AI-Selected Comps:** Full property profiles with adjusted values, comp type (CMV/ARV)
- **Repair Estimates:** Line-item breakdown with localized costs, natural language input
- **Property Profile:** beds, baths, sqft, year built, lot size, stories, basement, pool, garage, AC, heating, fireplaces, exterior wall, HOA
- **Ownership:** Owner names, ownership length, occupancy status, tax exemptions
- **Tax History:** Annual amounts, assessed values, year-over-year changes
- **Transaction History:** Sale dates, amounts, buyer/seller names
- **Mortgage/Debt:** Open balance, estimated equity, LTV/ITV ratios, detailed lien records
- **MLS:** Listing status, price, DOM, agent info, historic listings
- **Renovation Score:** Computer vision 0-1 score with confidence rating

### Pricing

| Plan | Monthly Cost | Comps/Month | API Access |
|------|-------------|-------------|------------|
| Basic | $49 | 100 | No |
| Growth | $129 | 300 | Yes |
| Scale | $199 | 500 | Yes |
| Enterprise | Custom | Unlimited | Yes |

**Cost per comp:** ~$0.40-0.49 depending on tier

### Key Differentiators

- Only AI comping tool with a documented, affordable REST API
- Bundled comps + ARV + CMV + repairs + property data in ONE call
- Computer vision renovation scoring
- Non-disclosure state support
- Clean OpenAPI 3.1 spec (Mintlify docs)

### What Bricked Already Covers (Avoid Paying Twice)

If Parcel integrates Bricked, it already gets property details, ownership, mortgage, tax, MLS data, and transaction history for every property analyzed. A separate provider would only be needed for:
- **Bulk property data access** (lead lists, portfolio screening)
- **Market-level analytics** (zip-level trends, investor metrics)
- **Rental estimates** (Bricked does not provide rent AVMs)
- **Active listing feeds** (beyond MLS data included in comps)

---

## 3. ATTOM Data

**Website:** https://www.attomdata.com
**Developer Portal:** https://api.developer.attomdata.com

### Data Fields Returned

ATTOM's database covers **158M+ US properties** with **9,000+ data fields** and **70 billion rows**.

**Property API:**
- Property characteristics (beds, baths, sqft, year built, lot size, stories, property type)
- Address and location data with geocoding
- Building permits
- School district information

**Sales API:**
- Most recent sale details
- Full sales history (10+ years)
- Sales trend snapshots (2-year averages/medians by geo)

**Assessment API:**
- Current assessments (appraised, assessed, market values)
- Assessment history
- Tax amounts

**Valuation APIs:**
- AVM snapshot with confidence scoring
- ATTOM AVM detail (comprehensive valuation)
- AVM history
- **Rental AVM** (126M+ residential rental value records)

**School API:**
- School search by location
- School profiles and district info

**Event API:**
- All property events (assessments, AVM calcs, sales)

**Additional Data (via bulk/enterprise):**
- Foreclosure/pre-foreclosure
- Hazard risk (flood, earthquake, wildfire, hurricane)
- Ownership and deed data
- Mortgage data

### API Endpoints (Detailed)

| Category | Key Endpoints | Description |
|----------|---------------|-------------|
| Property | `/property/detail`, `/property/snapshot`, `/property/basicprofile`, `/property/expandedprofile`, `/property/detailwithschools`, `/property/detailmortgage`, `/property/detailowner`, `/property/detailmortgageowner`, `/property/buildingpermits` | Property characteristics, bundled profiles |
| Sales | `/sale/detail`, `/sale/snapshot`, `/saleshistory/detail`, `/saleshistory/basichistory`, `/saleshistory/expandedhistory`, `/salestrend/snapshot` | Sales data and trends |
| Assessment | `/assessment/detail`, `/assessment/snapshot`, `/assessmenthistory/detail` | Tax assessments |
| Valuation | `/avm/snapshot`, `/attomavm/detail`, `/avmhistory/detail`, `/valuation/rentalavm` | AVMs including rental |
| School | `/school/search`, `/school/profile`, `/school/district` | School data |
| Event | `/allevents/detail` | All property events |
| Transaction | `/transaction/salestrend` | Aggregated trends |

### Pricing

| Tier | Estimated Monthly Cost | Notes |
|------|----------------------|-------|
| Free trial | $0 (30 days) | API key for testing |
| Startup | ~$95-500/mo | Per-call charges, basic access |
| Mid-tier | ~$500-850/mo | More endpoints, higher volume |
| Enterprise | $850-2,000+/mo | Full data suite, custom pricing |

- **Pricing model:** Yearly license (annual commitment typical)
- **Per-call pricing:** Only 200-response queries count toward allowances
- **Contract:** Annual commitment expected; custom negotiation required
- **Free trial:** 30-day developer trial with API key

### Technical Details

- **Auth:** API key in `APIKey` header
- **Format:** REST, JSON and XML
- **Max records per response:** 100
- **Default radius:** 5 miles (max 20 miles)
- **Max GeoIDs per request:** 3
- **Geographic identifiers:** Extensive system (state, county, zip, school district, neighborhood, subdivision)
- **Property type codes:** 0-90 numeric classification
- **SDKs:** None official
- **iOS SDK:** None

### Data Freshness

- Cloud data updated **daily**
- AVM models recalculated regularly
- County records dependent on county reporting frequency

### Geographic Coverage

- **Nationwide:** 158M+ properties, 3,000+ counties, 99% US population
- **GeoID system covers:** States, counties, ZCTAs, school districts, census places, neighborhoods, subdivisions

### Contract Requirements

- Annual license model (not month-to-month friendly)
- Custom pricing via sales consultation
- Complex negotiation process reported by users
- Not startup-friendly at lower tiers

### Competitors Using ATTOM

- AgentFire (hyper-local real estate websites)
- SetSchedule (AVM-powered homeowner valuations)
- Numerous proptech platforms, lenders, and insurers

### Strengths for Parcel

- Most comprehensive raw property data available
- Rental AVM endpoint valuable for Parcel's rental analysis
- Hazard risk data (flood, fire, earthquake) unique differentiator
- School data useful for family-oriented markets
- Daily data updates

### Weaknesses for Parcel

- Annual contract, not startup-friendly pricing
- No AI-powered comps or ARV
- No repair estimates
- Requires significant development to build useful features on top
- Complex, enterprise-focused sales process
- Overlap with data Bricked already provides per-property

---

## 4. HouseCanary

**Website:** https://www.housecanary.com
**API Docs:** https://api-docs.housecanary.com / https://api-docs-legacy.housecanary.com

### Data Fields Returned

HouseCanary provides **75+ data points** across property, block, block group, ZIP, MSA, and state levels.

**Property-Level Data:**
- Property details (beds, baths, sqft, year built, condition/quality scores, construction type, roof, zoning)
- Geocoding with census block/blockgroup/tract IDs
- Census geographic data
- Owner occupancy status
- Tax history (assessment year, value, tax amount)
- Sales history (amount, dates, grantee/grantor names)
- Mortgage liens (all historical, with amounts, rates, lender type, ARM details)
- Notice of Default (foreclosure) events
- FEMA disaster area declarations
- Flood risk assessment (zone, panel, risk level)
- Geographic features (slope, elevation, exposure, privacy scores)
- School data (nearby schools by level with scores, distance)

**Valuation Models:**
- **Sale AVM:** price_mean, price_upr, price_lwr, FSD (forecast standard deviation)
- **Rental AVM:** monthly rental valuation with range
- **Rental Value Forecast:** 3, 6, 12-month rental projections
- **Value by Six Conditions:** AVM adjusted for condition ratings C0-C5
- **Land Value:** separate land valuation model
- **LTV Details:** loan-to-value with itemized lien breakdown
- **Rental Value Percentile:** within-block rental ranking

**Market-Level Data:**
- HPI (Home Price Index) time series -- historical + 3-year forecast for 19,000+ ZIP codes
- RPI (Rental Price Index) time series -- historical + forecast
- Value distribution by block/blockgroup
- Market metrics by ZIP, MSA, state

### API Endpoints (Comprehensive)

**Property Endpoints (v2):**

| Endpoint | Data Returned |
|----------|---------------|
| `property/geocode` | Address info, coordinates, census IDs |
| `property/census` | Census geographic areas, FIPS, MSA |
| `property/details` | Full property attributes + assessment |
| `property/value` | Sale AVM (mean, upper, lower, FSD) |
| `property/rental_value` | Monthly rental AVM |
| `property/rental_value_forecast` | 3/6/12-month rental forecast |
| `property/rental_value_within_block` | Rental percentile ranking |
| `property/value_by_six_conditions` | Condition-adjusted AVM (C0-C5) |
| `property/land_value` | Land-only valuation |
| `property/ltv_details` | Loan-to-value with lien itemization |
| `property/ltv_origination` | LTV at origination |
| `property/sales_history` | All sales/transfers with dates, amounts |
| `property/tax_history` | Historical tax assessments |
| `property/mortgage_lien` | Mortgages since last arm's-length sale |
| `property/mortgage_lien_all` | All historical mortgages |
| `property/nod` | Notice of default events |
| `property/owner_occupied` | Occupancy status |
| `property/school` | Nearby schools by level with scores |
| `property/flood` | FEMA flood risk |
| `property/fema_disaster_area` | FEMA disaster declarations |
| `property/geo_features` | Topographic attributes |
| `property/component_mget` | Multi-endpoint batch request |

**Geographic Endpoints:**
- `block/value_distribution` -- value stats within census block
- `blockgroup/*` -- block group level data
- `zip/*` -- ZIP code level data
- `msa/hpi_ts` -- MSA home price index time series
- `metrodiv/hpi_ts` -- metro division HPI
- `state/*` -- state level data

### Pricing

**Subscription Plans:**

| Plan | Annual | Monthly | Valuation Reports/mo | API Access |
|------|--------|---------|---------------------|------------|
| Basic | $190/yr | $19/mo | 2 | No |
| Pro | $790/yr | $79/mo | 15 | Yes (Property Analytics) |
| Teams | $1,990/yr | $199/mo | 40 | Yes (All APIs) |
| Enterprise | Custom | Custom | Custom | Yes (All) |

**Per-Call API Pricing:**

| Endpoint Category | Basic | Pro | Teams | Enterprise |
|-------------------|-------|-----|-------|-----------|
| Basic Endpoints | $0.50 | $0.40 | $0.30 | Custom |
| Premium Endpoints | $4.00 | $3.00 | $2.50 | Custom |
| Premium Plus | $6.00 | $5.00 | $4.00 | Custom |
| Property Estimate | -- | -- | $0.05 | Custom |
| Market Pulse | -- | -- | $0.00 | Custom |

**Cost at startup scale (1K lookups/mo):**
- Pro plan ($79/mo) + ~$400-3,000 in per-call fees depending on endpoints
- Basic property endpoints: $79 + $400 = ~$479/mo
- With valuations: $79 + $3,000+ = $3,079+/mo

**Cost at growth scale (100K+ lookups/mo):** Enterprise pricing required

### Technical Details

- **Auth:** HTTP Basic Authentication (API Key + API Secret)
- **Format:** REST, JSON
- **Rate limits:**
  - Analytics API: 250 components/minute (self-serve), custom (enterprise)
  - Value/Rental Reports: 10 requests/minute
- **Batch requests:** POST with up to 100 items per request
- **Python SDK:** `pip install housecanary` -- official, maintained on PyPI/GitHub
- **iOS SDK:** None. REST API only.
- **SOC 2 Type I and II compliance**

### Data Freshness

- AVMs and rental valuations: **monthly** model refreshes
- Residential property data: **real-time** updates
- Bulk datasets: monthly updates
- **AVM accuracy:** Median absolute percentage error of **3.1%**

### Geographic Coverage

- **136M+ properties** for AVMs and rental valuations
- 19,000+ ZIP codes for HPI/RPI indices
- Block-level risk assessments
- Nationwide US coverage

### Contract Requirements

- Self-serve plans available (no contract for Basic/Pro/Teams)
- Enterprise requires custom agreement
- Per-call charges make costs unpredictable at scale

### Competitors Using HouseCanary

- Banks, mortgage lenders, and iBuyers (institutional-grade)
- Residential real estate investors and brokerages
- Portfolio monitoring and due diligence platforms

### Strengths for Parcel

- Best-in-class AVM accuracy (3.1% median error)
- Rental value forecasts (3/6/12 months) -- unique and valuable
- Condition-adjusted valuations (C0-C5) -- useful for rehab analysis
- Flood risk and FEMA disaster data
- Python SDK (quick FastAPI integration)
- Self-serve plans without enterprise negotiation

### Weaknesses for Parcel

- Per-call pricing adds up fast (premium endpoints are $2.50-6.00/call)
- No AI-powered comp selection
- No repair cost estimates
- Basic plan lacks API access entirely
- Rate limits (250/min) could constrain batch operations
- Overkill for early stage if only need rent estimates

---

## 5. CoreLogic / Trestle

**Website:** https://www.corelogic.com (now rebranding as Cotality)
**Trestle Platform:** https://trestle-documentation.corelogic.com

### Overview

CoreLogic is the largest property data company in the US, covering **99% of US properties**. Their Trestle platform is the primary API gateway for MLS data access. CoreLogic is enterprise-focused with no self-serve developer access.

### Data Fields Available

- MLS listing data (active, pending, sold, expired)
- Property characteristics and attributes
- Tax assessor data
- Deed and mortgage records
- AVMs
- Flood, natural hazard, and environmental risk data
- Market analytics and trends
- Ownership transfer history
- Building permits

### Pricing (Trestle Platform)

**Technology Provider (RESO Standardized):**

| Tier | Contracts | Monthly Fee/Connection |
|------|-----------|----------------------|
| Small | Up to 50 | $100 |
| Medium | 51-100 | $110 |
| Large | 101-500 | $125 |
| X-Large | 501-1,000 | $150 |
| XX-Large | 1,001+ | $175 |

**Broker Data Feeds:** $30-100/month per connection + MLO fees

**Historical per-call pricing examples (may be outdated):**
- Address Type Ahead: $0.005/call
- Subject Property Detail: $1.30/call
- Finance History: $2.30/call
- Involuntary Lien: $11.50/call

### Technical Details

- **Auth:** Varies by product
- **Format:** RESO Web API (OData-based REST)
- **MLS connections:** Per-MLS data agreements required
- **SDKs:** None public
- **iOS SDK:** None

### Access Requirements

- Must be an approved technology vendor
- Signed contracts with each MLS
- Data security compliance required
- MLO (MLS organization) fees apply separately
- Enterprise customers get tailored pricing

### Strengths for Parcel

- Most comprehensive MLS data coverage available
- 99% property coverage nationwide
- Industry standard (RESO compliant)

### Weaknesses for Parcel

- Enterprise-only, no self-serve access
- Complex MLS-by-MLS licensing
- Expensive: premium pricing + per-MLS fees
- Long onboarding process
- Overkill for a startup not focused on MLS display

### Verdict for Parcel

**Not suitable for current stage.** Revisit if/when Parcel needs direct MLS feed access for a brokerage-style product.

---

## 6. ICE Mortgage Technology (Black Knight)

**Website:** https://mortgagetech.ice.com
**Status:** ICE (Intercontinental Exchange) acquired Black Knight in 2023.

### Overview

ICE Mortgage Technology provides one of the most comprehensive US residential property databases, primarily serving mortgage lenders, servicers, and large institutional players. This is firmly enterprise territory.

### Data Available

- Comprehensive residential property database
- Automated valuations
- MLS platform (device-agnostic, used by agents)
- Mortgage lifecycle data
- Foreclosure/default data
- Property reports

### Access & Pricing

- **No public API pricing**
- **No self-serve developer access**
- Enterprise contracts only
- Developer Portal exists but requires partnership/sales engagement
- Primarily serves mortgage industry participants

### Verdict for Parcel

**Not suitable.** Pure enterprise play for mortgage industry. No startup-accessible path.

---

## 7. Bridge Interactive / Zillow Group APIs

**Bridge Website:** https://www.bridgeinteractive.com
**Zillow Developer Portal:** https://www.zillowgroup.com/developers/

### Bridge API

Bridge Interactive provides a REST API platform that aggregates MLS data and Zillow Group datasets.

**Key Features:**
- MLS data access (request access from individual MLSs)
- Zillow Public Records (parcel, assessment, transaction data)
- Zestimates (Zillow's AVM)
- RESTful interface (no industry-specific query language needed)
- Data replication tools for maintaining local copies

**Access Model:**
- No service fees from Bridge itself
- License agreements and fees between you and data provider (MLS)
- Must request and receive approval for each dataset

### Zillow Group APIs (~20 APIs Available)

| Category | APIs |
|----------|------|
| Public Data | Public Records, Neighborhood Data, Real Estate Metrics |
| Zestimate | Zestimates API (~100M properties) |
| Agents | Agent Reviews |
| MLS/Broker | MLS Listings, Performance Reporting |
| Mortgage | Rates, Reviews, Prospect Sync/Trigger, Rate Cloud, LOS Plugin |
| Rentals | Lead API, Feed Integrations |
| Transactions | Transaction Management |

### Zillow Public Records API

- **Access:** Invite-only
- **Data:** Parcel data, assessment data, transactional county data
- **Coverage:** Entire US, ~15 years historical
- **Auth:** Password + access token
- **Format:** REST, JSON

### Zestimates API

- **Coverage:** ~100M properties
- **Access:** Requires complex approval process (weeks-months)
- **Restriction:** Cannot store data locally -- display only
- **Pricing:** Not publicly disclosed, partner program
- **Terms:** Must add value to Zillow ecosystem

### Verdict for Parcel

**Not practical for current stage.** Zillow's complex approval process, invite-only access, and display-only restrictions (no local storage for Zestimates) make this unsuitable. The Bridge API for MLS access requires per-MLS licensing, similar to CoreLogic Trestle.

---

## 8. RealtyMole (now RentCast)

**Status:** RealtyMole has been fully absorbed into RentCast.

The legacy Realty Mole API was previously hosted on RapidAPI. Users are now directed to migrate to the RentCast API. A migration guide exists at https://developers.rentcast.io/reference/realty-mole-migration-guide.

All RealtyMole capabilities are now RentCast capabilities (see Section 1).

---

## 9. Rentometer

**Website:** https://www.rentometer.com
**API Docs:** https://www.rentometer.com/developers/api_docs

### Data Fields Returned

Rentometer is a **rent-data-only** provider. It does not provide property characteristics, ownership, tax, or sales data.

**Rent Summary (QuickView):**
- Mean, median, min, max rent for area
- 25th and 75th percentile rents
- Standard deviation
- Sample count and search radius
- QuickView URL link

**Nearby Comps:**
- Comparable rental properties list
- Address, coordinates, distance
- Rent price, beds, baths, property type, sqft, $/sqft
- Last seen date

**Pro Report:**
- Full PDF rent analysis report
- Asynchronous generation (poll for status, then download)

**Property Rents (Premium):**
- Specific property's historical rent listings
- Individual listing details (beds, baths, price, sqft, $/sqft, last seen)

### API Endpoints

| Endpoint | Credit Cost | Description |
|----------|-------------|-------------|
| `GET /api/v1/auth` | 0 | Verify auth + check credits |
| `GET /api/v1/summary` | 1 QuickView | Rent estimate summary |
| `GET /api/v1/nearby_comps` | 1 Premium | Nearby rental comps list |
| `GET /api/v1/property_rents` | 1 Premium | Specific property rent history |
| `GET /api/v1/request_pro_report` | 1 Pro Report | Request PDF generation |
| `GET /api/v1/pro_report_status` | 0 | Check report generation status |
| `GET /api/v1/download_pro_report` | 0 | Download generated PDF |

### Pricing

- **Pro Plan:** $29/month (2026 pricing, was $199/year previously)
- **Team Plan:** Starting $49/month
- **API Credits:** 200 QuickView credits included with Pro Standard subscription
- **Additional credits:** Purchasable via account page (specific pricing not publicly listed)
- **3-day trial** available (was free trial previously)
- Credits roll over at renewal as long as subscription is active

### Technical Details

- **Auth:** API key via `api_key` query parameter
- **Format:** REST, JSON responses
- **Rate limits:** Not explicitly documented
- **SDKs:** None
- **iOS SDK:** None
- **Input:** Address OR lat/lng + bedrooms (required)
- **Optional params:** baths, building_type, look_back_days (90-1460)

### Data Freshness

- Based on actual rental listings scraped from the web
- Look-back window configurable (90 days to 4 years)
- Updated regularly but no specific cadence published

### Geographic Coverage

- US focused
- Coverage varies by metro area (better in dense urban markets)

### Strengths for Parcel

- Best-in-class rent comp data specifically
- PDF report generation for user-facing exports
- Established brand (well-known in landlord/investor community)
- Affordable at low volume

### Weaknesses for Parcel

- Rent data only -- no property details, ownership, tax, valuations
- Credit-based pricing is confusing
- Pro plan required for API access
- Limited coverage in rural areas
- Overlaps significantly with RentCast's rent estimate capability
- Higher per-lookup cost than RentCast at scale

### Verdict for Parcel

**Low priority.** RentCast already provides rent estimates + property data at better pricing. Rentometer only adds value if its rent comps are significantly more accurate in specific markets. Consider as a supplementary source for rent validation only.

---

## 10. Estated (now ATTOM)

**Website:** https://estated.com
**Status:** Acquired by ATTOM Data Solutions. Documentation will be deprecated sometime in 2026.

### Historical Capabilities

- Standardized parcel-level attributes across 155M US properties
- Property data including ownership, tax, assessment, transaction history
- v4 API with sandbox (120 test properties)
- Clean REST API (was popular with startups)

### Current Status

- Estated documentation will be deprecated in 2026 (no specific date)
- All resources transitioning to ATTOM
- New users should go directly to ATTOM
- Existing Estated customers being migrated

### Verdict for Parcel

**Dead end.** Use ATTOM directly if the data is needed. Estated's startup-friendly pricing and simplicity are being absorbed into ATTOM's enterprise model.

---

## 11. Parcl Labs

**Website:** https://www.parcllabs.com
**API Docs:** https://docs.parcllabs.com

### Overview

Parcl Labs provides **market-level analytics** (not property-level data). It is a research/analytics platform, not a property data API in the traditional sense.

### Data Categories

| Category | Description |
|----------|-------------|
| **Market Metrics** | Housing stock, supply, price trends across sales/listings/rentals |
| **For Sale Market Metrics** | Real-time supply data on for-sale listings |
| **Rental Market Metrics** | Supply, rental concentration, yields |
| **Investor Metrics** | Investor ownership and transaction analytics |
| **Portfolio Metrics** | Investor activity segmented by portfolio size |
| **New Construction Metrics** | Supply, demand, pricing in new home markets |
| **Price Feed** | Daily updated Parcl Labs Price Feed |
| **Property** | Unit-level data combining attributes with sales/rental events |

### Key Endpoints

- Housing Event Counts (sales, new listings, new rentals, transfers)
- Housing Stock Ownership (investor-owned property counts and percentages)
- All Cash Transactions (counts and share of total)
- Portfolio Metrics by size (small/medium/large investor segmentation)
- Rental Price Feed (daily updated)

### Pricing

| Plan | Monthly Cost | Credits/Month |
|------|-------------|---------------|
| Basic | Free | 1,000 |
| Pro | $99 | 25,000 |
| Enterprise | Custom | Custom |

- Credit rollover available on Pro plan
- Pro includes private Slack channel with engineering team
- Annual billing option available

### Technical Details

- **Auth:** API key
- **Format:** REST, JSON
- **Python SDK:** `parcllabs-python` on GitHub
- **Coverage:** 70,000+ unique US markets (region, state, metro, city, county, town, zip, census place)
- **iOS SDK:** None
- **New features shipped weekly per roadmap

### Strengths for Parcel

- Excellent market-level analytics for investment research
- Investor activity metrics unique to Parcl Labs
- Free tier generous (1,000 credits/month)
- Python SDK available
- Rental price feed useful for market analysis

### Weaknesses for Parcel

- Not a property data API -- no individual property records
- No AVMs, comps, or valuations at property level
- No ownership, mortgage, or tax data for specific properties
- Analytics-focused, not transaction-data-focused

### Verdict for Parcel

**Valuable as market analytics layer** but not a replacement for property data APIs. Best used alongside a property-level provider (RentCast, ATTOM, or Bricked) to power market analysis dashboards and investment research features.

---

## 12. Redfin

**Website:** https://www.redfin.com

### API Availability

**Redfin does NOT have a public API.** There is no official developer program or API access.

### Available Options

1. **Unofficial/internal API:** An undocumented API exists that powers the Redfin website. A Python wrapper (`reteps/redfin` on GitHub) provides access, but it violates Redfin's ToS and could break at any time.

2. **Third-party scrapers:** Oxylabs, Scrapfly, PropAPIS, RealtyAPI offer Redfin data scraping services, but these violate ToS and carry legal risk.

3. **Redfin Data Center:** https://www.redfin.com/news/data-center/ -- free downloadable market-level data (not property-level) for research use.

### Verdict for Parcel

**Not a viable data source.** No official API, significant legal risk with scraping. Market-level data available for free but not useful for property-level features.

---

## 13. Realtor.com

**Website:** https://www.realtor.com

### API Availability

Realtor.com (operated by Move, Inc., a subsidiary of News Corp) does have APIs, but they are **heavily restricted**.

- Known for difficult access/approval process
- Licensing restrictions limit commercial use
- Data freshness can lag behind
- No public self-serve pricing

The Realtor.com API is primarily designed for real estate professionals (agents, brokers) and approved technology partners. Getting approved as a proptech startup building a competing investment platform would be extremely difficult.

### Verdict for Parcel

**Not viable.** Access restrictions and licensing requirements make this impractical for Parcel's use case.

---

## 14. BatchData

**Website:** https://batchdata.io

### Overview

BatchData is a property data platform covering **155M+ properties** with **1,000+ data points** per record. Marketed as developer-friendly with flexible pricing.

### Key Endpoints

- Property Search (filtered queries)
- Property Lookup (by address)
- Address Auto-Complete
- Skip Trace (bulk: up to 1,000 per call)

### Data Available

- Tax assessor records
- Deed history
- Real-time listing data
- Property characteristics
- Owner information
- Skip tracing (phone numbers, emails)

### Pricing

| Model | Cost | Notes |
|-------|------|-------|
| Pay-as-you-go | Starting ~$0.01/call | For testing and light usage |
| Monthly plan | Starting $500/mo | 20,000 calls included |
| Custom/Enterprise | Negotiated | Bulk data delivery available |

**Bulk delivery options:** Snowflake, BigQuery, Databricks, Parquet files

### Technical Details

- REST API
- Compatible with CRMs and investment platforms
- Zapier integration
- No SDKs documented
- No iOS SDK

### Strengths for Parcel

- Skip tracing in API (unique for lead gen features)
- Cloud data delivery options for analytics
- Developer-focused documentation

### Weaknesses for Parcel

- $500/mo minimum for monthly plan is steep for startup
- Less well-known than ATTOM or RentCast
- Limited community/ecosystem
- No AVM or valuation endpoints documented

### Verdict for Parcel

**Interesting for skip tracing** if Parcel builds wholesaling/acquisitions features. As a general property data provider, RentCast offers similar data at lower cost. Consider BatchData specifically for bulk skip trace operations.

---

## 15. RealEstateAPI (REAPI)

**Website:** https://www.realestateapi.com

### Overview

Self-described as "world's most expressive property data APIs," targeting proptech startups and developers. Covers 159M US properties.

### Key Features

- Property Search API (extensive filters)
- Property Details API (sqft, lot size, tax history, sale date, estimated value)
- Comps API
- Address Auto-Complete
- Parcel Boundaries
- Skip Trace (up to 1,000 per call)

### Pricing

- Starting at **$599/month**
- Free trial available
- Custom pricing for enterprise

### Integrations

- Salesforce, HubSpot CRM, Zoho CRM
- GoHighLevel, BoomTown, CINC
- Bubble (no-code)
- Zapier

### Verdict for Parcel

**Too expensive at startup scale.** $599/mo minimum is steep compared to RentCast ($74/mo) or even ATTOM. The CRM integrations are irrelevant to Parcel's custom-built platform. Skip tracing and parcel boundaries are nice, but not worth the premium.

---

## 16. Realie.ai

**Website:** https://www.realie.ai

### Overview

Newer entrant focused on affordability and county-level data accuracy. Sources data directly from county recorders and assessors across 3,100+ counties.

### Key Features

- County parcel data from 3,100+ counties
- 100+ data points per parcel
- Up to 100 parcels per API call (reduces call overhead)
- Free tier available

### Strengths

- Data sourced directly from counties (higher accuracy claims)
- Affordable startup pricing
- Batch capability (100 parcels/call)

### Weaknesses

- Newer company (less proven)
- Limited ecosystem and documentation
- No AVM or valuation endpoints
- No rental estimates

### Verdict for Parcel

**Worth watching** but too new/unproven to bet on as a primary provider. The county-direct data sourcing is compelling for accuracy, but Parcel needs more than parcel data.

---

## 17. County Recorder/Assessor APIs

### Free Public Data Sources

Several large counties offer free data access:

| County | Data Available | Access Method |
|--------|---------------|---------------|
| **Maricopa County, AZ** | Full assessor datasets, bulk downloads | Free web downloads, REST API at api.mcassessor.maricopa.gov |
| **Los Angeles County, CA** | Open data initiative, assessor records | LA County Open Data portal |
| **Cook County, IL** | Commercial valuation data (2021+) | data.gov catalog |

### Aggregator Services

- **TaxNetUSA:** Property tax API/web service
- **AssessorRecord.com:** REST API for assessor data across multiple jurisdictions, supports high-volume users

### Legal Considerations for Scraping

- **Public records are legally accessible** -- county assessor/recorder data is public by law
- **Website ToS still apply** -- scraping county websites may violate their ToS even though the data is public
- **MLS data is NOT public** -- scraping MLS/broker sites carries real legal risk
- **Safe path:** Use aggregator APIs (ATTOM, RentCast, Realie) that have proper licensing with counties
- **DIY aggregation** is technically possible but requires maintaining connections to 3,000+ counties

### Verdict for Parcel

**Not practical to build from scratch.** The data is public and free, but aggregating it from 3,000+ counties is a massive engineering effort. Use commercial aggregators instead. Only consider direct county API access for specific high-volume markets where data freshness matters.

---

## 18. RESO Web API Standard

### What It Is

RESO (Real Estate Standards Organization) defines the standard API protocol for accessing MLS data. It replaced the legacy RETS format.

### Key Facts

- **RESO Web API** is based on OData (RESTful)
- **Data Dictionary 2.x** is current standard (all MLSs required to certify by April 2025)
- Standard field names: ListingId, Status, ListPrice, LivingArea, etc.
- RETS is being retired across all MLSs

### Access Requirements for Non-Brokerages

1. Must be an **approved vendor** with each MLS
2. Signed contract with proof of compliance (data security, display rules, no resale)
3. Background checks and technical documentation required
4. Fees vary by MLS: $400-$12,875 for RESO certification (based on gross revenue)
5. Each MLS has separate licensing and fees

### How Startups Get MLS Access

- Partner with a brokerage that has MLS access (most common for startups)
- Apply as a technology vendor to individual MLSs (slow, expensive)
- Use an aggregator like CoreLogic Trestle, Bridge Interactive, or Spark API
- Some MLSs offer IDX/VOW feeds with lighter requirements

### Verdict for Parcel

**Not for current stage.** Direct MLS access requires brokerage partnerships or vendor approvals with individual MLSs. The cost and complexity are prohibitive until Parcel reaches a stage where MLS data display is a core product feature. In the meantime, Bricked.ai's MLS data inclusion in comps is sufficient.

---

## 19. iOS Architecture Considerations

### No Provider Offers an iOS SDK

None of the property data APIs researched provide a native iOS/Swift SDK. All are REST APIs designed for server-to-server communication. This means:

1. **All API calls should go through Parcel's FastAPI backend** -- not directly from the iOS app
2. **The backend acts as a caching/proxy layer** -- fetches from providers, normalizes data, serves to iOS
3. **No vendor lock-in at the client layer** -- swap providers server-side without app updates

### Recommended iOS Data Architecture

**Offline-First Pattern:**
1. **Server-side caching:** FastAPI backend caches property data in PostgreSQL after fetching from providers. Set TTL based on data type (property details: 30 days, valuations: 7 days, listings: 1 day).
2. **Client-side caching:** iOS app uses Core Data or Realm to cache API responses locally. Strategy options:
   - `cacheElseLoad` -- show cached data immediately, fetch fresh in background
   - `cacheAndLoad` -- show cached instantly + update when fresh data arrives
3. **Sync strategy:** Background fetch on app launch, pull-to-refresh for manual updates, push notifications for portfolio property changes.
4. **Storage options for iOS:**
   - **Core Data** (Apple-native, no dependencies)
   - **Realm/MongoDB** (popular for offline-first, cross-platform)
   - **SQLite** (via GRDB.swift or similar)
   - **SwiftData** (iOS 17+, modern Apple solution)

**PWA vs Native Implications:**
- PWA: Service worker caching + IndexedDB for offline data. Works for basic caching but limited background sync.
- Native iOS: Full offline-first with Core Data/Realm, background fetch, push notifications, richer caching strategies.
- **Recommendation:** Design the API layer for native from day one. The FastAPI backend should serve normalized, cacheable responses with ETags/Last-Modified headers.

### Provider-Specific iOS Notes

| Provider | iOS Consideration |
|----------|-------------------|
| RentCast | Clean REST, easy to cache property records and estimates |
| Bricked.ai | Single-call returns rich data -- cache entire comp report as one blob |
| HouseCanary | Python SDK is server-only; REST API from backend |
| ATTOM | JSON/XML responses, straightforward caching |
| Parcl Labs | Python SDK server-only; market data cacheable for 24h+ |
| Rentometer | Credit-based, cache aggressively to minimize API calls |

---

## 20. Provider Comparison Matrix

### Data Coverage Comparison

| Data Type | RentCast | Bricked.ai | ATTOM | HouseCanary | Parcl Labs | Rentometer |
|-----------|----------|------------|-------|-------------|------------|------------|
| Property details | Yes | Yes | Yes | Yes | Limited | No |
| Ownership/owner info | Yes | Yes | Yes | Yes (occupancy) | No | No |
| Tax history | Yes | Yes | Yes | Yes | No | No |
| Transaction history | Yes | Yes | Yes | Yes | No | No |
| Mortgage/debt | No | Yes | Yes | Yes (detailed) | No | No |
| Home value AVM | Yes | Yes (CMV) | Yes | Yes (3.1% error) | No | No |
| Rent estimate AVM | Yes | No | Yes (Rental AVM) | Yes + forecast | No | Yes |
| AI-selected comps | No | Yes | No | No | No | No |
| Repair estimates | No | Yes | No | No | No | No |
| Renovation scoring | No | Yes (CV) | No | No | No | No |
| ARV (after repair) | No | Yes | No | Yes (6 conditions) | No | No |
| Active listings | Yes | Via MLS | Partial | No | Yes | No |
| Rent comps | Yes | No | No | Yes | No | Yes |
| Market trends | Yes (zip) | No | Yes | Yes (HPI/RPI) | Yes (extensive) | Limited |
| Investor metrics | No | No | No | No | Yes | No |
| Flood/hazard risk | No | No | Yes | Yes | No | No |
| School data | No | Yes (district) | Yes | Yes (scored) | No | No |
| Foreclosure/NOD | No | No | Yes | Yes | No | No |
| Skip tracing | No | No | No | No | No | No |

### Pricing Comparison at Scale

| Lookups/Month | RentCast | Bricked.ai | ATTOM | HouseCanary (Pro) | Parcl Labs |
|---------------|----------|------------|-------|-------------------|------------|
| 50 (testing) | Free | $49 | Free trial | $19/mo + $0.40/call | Free |
| 300 | $74 | $129 (API) | ~$95+ | $79 + $120 = ~$199 | Free |
| 1,000 | $74 | Custom | ~$500+ | $79 + $400 = ~$479 | $99 |
| 5,000 | $199 | Custom | ~$500-850 | $199 + $1,500 = ~$1,699 | $99 |
| 25,000 | $449 | Custom | ~$850-2,000 | Custom | $99 |
| 100,000+ | Custom | Custom | Custom | Custom | Custom |

### API Quality Comparison

| Aspect | RentCast | Bricked.ai | ATTOM | HouseCanary | Parcl Labs |
|--------|----------|------------|-------|-------------|------------|
| REST API | Yes | Yes | Yes | Yes | Yes |
| OpenAPI spec | Unclear | Yes (3.1) | Yes | Yes | Yes |
| Python SDK | No | No | No | Yes (pip) | Yes (pip) |
| Documentation quality | Good | Excellent | Good | Excellent | Good |
| Free tier | Yes (50/mo) | No (3-day trial) | 30-day trial | No | Yes (1K/mo) |
| Rate limits | Undocumented | Undocumented | Per-plan | 250/min | Per-plan |
| Auth simplicity | API key header | API key header | API key header | Basic Auth | API key |
| Contract required | No | No | Annual typical | No (self-serve) | No |

---

## 21. Recommendation

### Tier 1: Start Immediately (Months 1-3)

#### 1. RentCast -- Primary Property Data + Rent Estimates
**Why:** Best cost-to-value ratio for Parcel's current needs.
- $74/mo gets 1,000 calls with property data, rent estimates, and listings
- Free tier (50 calls) for development and testing
- No contract, cancel anytime
- 140M+ properties with daily updates
- Rent estimates are core to Parcel's value proposition
- Clean REST API integrates easily with FastAPI backend

**Use for:** Property lookups, rent estimates, market data, active listings, owner information, tax history

**iOS note:** Cache property records locally with 30-day TTL, rent estimates with 7-day TTL. Serve through FastAPI as normalized responses.

#### 2. Bricked.ai -- AI Comps, ARV, and Repair Estimates
**Why:** Uniquely provides AI-powered underwriting data that no other provider offers at this price point.
- $129/mo (Growth) gets API access with 300 comps
- Single API call returns comps + CMV + ARV + repairs + full property profile
- Only tool with documented, affordable API for AI comps
- Renovation scoring via computer vision
- Non-disclosure state support

**Use for:** Deal analysis, comp generation, ARV/CMV valuations, repair cost estimates, property underwriting reports

**Overlap with RentCast:** Bricked returns property details, ownership, mortgage, and tax data per-property. Use RentCast for bulk lookups, market data, and rent estimates. Use Bricked only when a user triggers a full analysis (do not use Bricked for browsing/searching).

**iOS note:** Cache full Bricked analysis results as single blobs. These are expensive calls -- never re-fetch if cached within 7 days.

### Tier 2: Add at Growth Stage (Months 6-12)

#### 3. Parcl Labs -- Market Analytics Layer
**Why:** Best market-level analytics available, with a generous free tier.
- Free plan (1,000 credits/mo) sufficient for market dashboards
- Investor metrics (investor ownership %, all-cash %, portfolio segmentation) are unique
- Rental price feed and new construction metrics
- Python SDK for quick integration
- $99/mo Pro plan when volume grows

**Use for:** Market analysis dashboards, investment research features, market comparison tools, investor activity heatmaps

**Does NOT replace:** Property-level data, AVMs, or comps (complementary to RentCast + Bricked)

**iOS note:** Market data changes slowly -- cache for 24-48 hours. Pre-fetch for user's saved markets.

### Tier 3: Consider at Scale (12+ Months)

#### 4. HouseCanary -- Institutional-Grade Valuations (if needed)
**When to consider:** If Parcel needs to serve lenders, institutional investors, or needs AVM accuracy benchmarks (3.1% median error) for regulatory/compliance purposes.
- Adds rental value forecasts (3/6/12 month)
- Condition-adjusted valuations (C0-C5)
- Flood risk and FEMA disaster data
- Python SDK for FastAPI integration
- SOC 2 compliance

**Cost reality:** Pro plan ($79/mo) + per-call fees quickly reach $500+/mo for meaningful usage.

#### 5. ATTOM Data -- Full Property Intelligence (if needed)
**When to consider:** If Parcel needs hazard risk data (flood/fire/earthquake), foreclosure tracking, or building permit data that no other provider offers.
- Annual commitment and enterprise pricing make this a scale-stage choice
- 9,000+ data fields, most comprehensive raw data available
- Rental AVM and school data

**Cost reality:** $500+/mo minimum, annual contract typical.

### What to Avoid

| Provider | Why Skip |
|----------|----------|
| CoreLogic / Trestle | Enterprise-only, per-MLS licensing, too complex for startup |
| ICE / Black Knight | Mortgage industry only, no startup access |
| Zillow / Bridge APIs | Invite-only, display-only restrictions, complex approval |
| Redfin | No official API, scraping is illegal risk |
| Realtor.com | Restricted access, competing platform conflict |
| RealEstateAPI (REAPI) | $599/mo minimum, overpriced for what it provides |
| Estated | Being deprecated, absorbed into ATTOM |
| Rentometer | Redundant with RentCast's rent estimates at higher cost |

### Cost Projection

| Stage | Monthly Data Cost | Providers |
|-------|-------------------|-----------|
| **MVP (Months 1-3)** | ~$203/mo | RentCast Foundation ($74) + Bricked Growth ($129) |
| **Growth (Months 4-12)** | ~$302-502/mo | RentCast Growth ($199) + Bricked Scale ($199) + Parcl Labs Free-Pro ($0-99) |
| **Scale (Year 2)** | ~$700-1,500/mo | RentCast Scale ($449) + Bricked Enterprise (custom) + Parcl Pro ($99) + HouseCanary/ATTOM if needed |

### Architecture Summary

```
iOS App (native)
  |
  | (REST API, cached responses)
  |
FastAPI Backend (Railway)
  |
  |-- PostgreSQL (cached property data, user portfolios)
  |
  |-- RentCast API ---- Property data, rent estimates, listings, market data
  |-- Bricked.ai API -- AI comps, ARV/CMV, repairs (on-demand analysis)
  |-- Parcl Labs API -- Market analytics, investor metrics (background sync)
  |-- [Future] HouseCanary -- Institutional AVMs, flood risk, forecasts
```

**Key design principle:** The FastAPI backend is the single data layer. iOS never calls property APIs directly. Backend caches aggressively, normalizes responses across providers, and serves a unified property data model to the mobile app. This enables:
- Provider swaps without app updates
- Offline-first mobile experience
- Cost control via server-side caching
- Consistent data model regardless of source

---

## Sources

### RentCast
- [RentCast API](https://www.rentcast.io/api)
- [RentCast Pricing](https://www.rentcast.io/pricing)
- [RentCast Developer Docs](https://developers.rentcast.io/)
- [RentCast Data Sources & Quality](https://help.rentcast.io/en/articles/5535860-rental-data-sources-and-quality)

### Bricked.ai
- [Bricked.ai Homepage](https://bricked.ai)
- [Bricked API Documentation](https://docs.bricked.ai)
- [Full analysis: RESEARCH/04-bricked-ai-analysis.md](./04-bricked-ai-analysis.md)

### ATTOM Data
- [ATTOM Data Homepage](https://www.attomdata.com)
- [ATTOM Developer Portal](https://api.developer.attomdata.com/home)
- [ATTOM API Documentation](https://api.developer.attomdata.com/docs)
- [ATTOM Property Data API](https://www.attomdata.com/solutions/property-data-api/)
- [ATTOM Rental AVM](https://www.attomdata.com/data/property-valuation-data/rental-avm/)
- [ATTOM Pricing on Datarade](https://datarade.ai/data-providers/attom/profile)

### HouseCanary
- [HouseCanary Pricing](https://www.housecanary.com/pricing)
- [HouseCanary API Docs (Legacy)](https://api-docs-legacy.housecanary.com/)
- [HouseCanary API Docs](https://api-docs.housecanary.com/)
- [HouseCanary Python SDK](https://github.com/housecanary/hc-api-python)
- [HouseCanary Developer Tools](https://www.housecanary.com/resources/developer-tools)
- [HouseCanary Data Explorer](https://www.housecanary.com/products/data-explorer)
- [HouseCanary AVM Methodology](https://www.housecanary.com/resources/our-avm)

### CoreLogic / Trestle
- [CoreLogic API Data](https://www.corelogic.com/360-property-data/api-data/)
- [Trestle Documentation](https://trestle-documentation.corelogic.com/)
- [Trestle Data Pricing](https://trestle-documentation.corelogic.com/data-pricing.html)

### ICE / Black Knight
- [ICE Mortgage Technology](https://mortgagetech.ice.com)
- [ICE Residential Property Data](https://mortgagetech.ice.com/products/property-data/residential)

### Zillow / Bridge
- [Zillow Group Developers](https://www.zillowgroup.com/developers/)
- [Zillow Public Records API](https://www.zillowgroup.com/developers/api/public-data/public-records-api/)
- [Bridge Interactive Developers](https://www.bridgeinteractive.com/developers/)
- [Bridge API](https://www.bridgeinteractive.com/developers/bridge-api/)

### Rentometer
- [Rentometer API](https://www.rentometer.com/rentometer-api)
- [Rentometer API Docs](https://www.rentometer.com/developers/api_docs)
- [Rentometer API Pricing](https://www.rentometer.com/rentometer-api-pricing)
- [Rentometer Pricing (2026)](https://blog.iq.dwellsy.com/rentometer-what-is-it-pricing-and-accuracy/)

### Parcl Labs
- [Parcl Labs Homepage](https://www.parcllabs.com)
- [Parcl Labs API Docs](https://docs.parcllabs.com/docs/introduction)
- [Parcl Labs Usage & Pricing](https://docs.parcllabs.com/docs/usage-limitations)
- [Parcl Labs Python SDK](https://github.com/ParclLabs/parcllabs-python)

### BatchData
- [BatchData Pricing](https://batchdata.io/pricing)
- [BatchData API Guide](https://batchdata.io/blog/real-estate-api-documentation-examples)
- [BatchData Top APIs 2025](https://batchdata.io/blog/top-real-estate-apis-in-2025)

### RealEstateAPI
- [RealEstateAPI Homepage](https://www.realestateapi.com)
- [REAPI on RealEstateBees](https://realestatebees.com/software/realestateapi/)

### Realie.ai
- [Realie County Parcel Data](https://www.realie.ai/info/county-parcel-data-search)
- [Realie API Drawbacks Comparison](https://blog.realie.ai/blog/exploring-the-best-u-s-property-data-apis-and-their-drawbacks)

### RESO
- [RESO Web API](https://www.reso.org/reso-web-api/)
- [RESO Data Dictionary 2.0](https://www.wavgroup.com/2024/10/21/here-comes-reso-data-dictionary-2-0-all-mlss-must-certify-by-april-2025/)
- [NAR RETS/Web API](https://www.nar.realtor/real-estate-transaction-standards-rets)

### General Comparisons
- [HouseCanary: 10 Best Real Estate APIs in 2026](https://www.housecanary.com/blog/real-estate-api)
- [ScrapingBee: Best Real Estate APIs for Developers in 2026](https://www.scrapingbee.com/blog/best-real-estate-apis-for-developers/)
- [ATTOM: 10 Best Real Estate APIs in 2026](https://www.attomdata.com/news/attom-insights/best-apis-real-estate/)
- [HomeSage: Developer's Guide to Real Estate Data 2026](https://homesage.ai/developers-guide-to-real-estate-data-for-2026/)

### iOS Architecture
- [MongoDB: Offline-First with Realm](https://www.mongodb.com/developer/code-examples/swift/realm-api-cache/)
- [Swift by Sundell: Caching in Swift](https://www.swiftbysundell.com/articles/caching-in-swift/)
