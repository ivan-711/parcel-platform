# Address-to-Analysis Feasibility Research

Date: 2026-04-02

Research question:
- Can Parcel credibly deliver "enter an address, get a full AI-narrated analysis in under 60 seconds" for US real estate investors?
- What data can be auto-filled with acceptable confidence?
- Which providers are best for Parcel's current stage?

Inputs used:
- `RESEARCH/08-property-data-apis.md`
- `RESEARCH/12-mls-idx-access.md`
- `SAD/personas/00-persona-synthesis.md`
- `SAD/current-state-audit.md`
- Fresh external research on RentCast, Bricked, ATTOM, HouseCanary, Regrid, DealCheck, and Stessa

## Executive Verdict

Yes, Parcel can build an address-first experience that feels fast and high-value.

No, Parcel should not pretend that an address alone can produce a fully trustworthy final analysis for every deal with no user confirmation.

The right product promise is:

- `Address-first`
- `Auto-filled where confidence is high`
- `AI-narrated draft analysis with explicit assumptions`
- `Fast user confirmation for the few fields that matter most`

That is credible.

"Pure one-click final underwriting from address only" is not.

## Key Findings

### 1. Competitors already train users to expect partial auto-fill, not blind certainty

DealCheck's official help center is explicit:
- users can import dozens of property data points from public records and listings
- users still choose which estimates to use
- users still customize financing, closing costs, rehab, and operating assumptions
- some properties will return incomplete data, and manual entry is expected

Sources:
- https://help.dealcheck.io/en/articles/2046991-how-to-import-property-data-from-public-records-listings
- https://help.dealcheck.io/en/articles/2066703-why-is-some-information-missing-when-searching-public-records-listings-for-a-specific-property

This is important. Parcel does not need to beat reality. It needs to beat friction.

### 2. Address-first onboarding is already a proven pattern for portfolio software

Stessa's official onboarding flow starts with:
- property address
- unit
- "Get Property Details"

Source:
- https://www.stessa.com/get-started/

That confirms the pattern is familiar and credible for investors. The difference is that Parcel wants to turn that into underwriting and next-action intelligence, not just portfolio setup.

### 3. The provider market is good enough for Parcel to ship a strong v1

The current market gives Parcel a practical stack:

- `RentCast` for broad self-serve property/rent/listing enrichment
- `Bricked` for on-demand full underwriting, comps, ARV, and repair estimates
- `ATTOM` or `HouseCanary` only when Parcel needs deeper or more institutional-grade data
- `Regrid` as an optional parcel-boundary and APN enhancement layer, not the primary underwriting engine

## Provider Findings

## 1. RentCast

What it offers:
- 140M+ residential and commercial properties
- 500K property records updated every day
- property data, owner details, value estimates, rent estimates, active listings, and market data
- self-serve API plans with public pricing
- request metrics in the API dashboard, including latencies and error rates

Current official pricing signals:
- 50 free API calls/month
- `Foundation`: $74/month for 1,000 requests
- `Growth`: $199/month for 5,000 requests
- `Scale`: $449/month for 25,000 requests

Sources:
- https://www.rentcast.io/api
- https://www.rentcast.io/
- https://help.rentcast.io/en/articles/7992900-rentcast-property-data-api
- https://help.rentcast.io/en/articles/5535860-rental-data-sources-and-quality

Assessment for Parcel:
- Best MVP base layer
- Best self-serve economics
- Strongest default source for property facts + rent estimates
- Good fit for broad onboarding enrichment and search

Limitations:
- rent and value estimates are still estimates
- does not solve rehab/condition certainty
- does not solve acquisition-specific inputs like financing structure or seller terms

## 2. Bricked

What it offers:
- address-to-property-analysis endpoint
- 150M+ properties indexed
- 17-second average time to comp
- property details, ownership, mortgage debt, MLS context, images, comps, CMV, ARV
- AI-powered repair estimates
- explicit override fields for beds, baths, square feet, year built, and land use

Current official pricing signals:
- `Basic`: $49/month, 100 comps
- `Growth`: $129/month, 300 comps, API access
- `Scale`: $199/month, 500 comps

Sources:
- https://bricked.ai/
- https://docs.bricked.ai/api-reference/introduction
- https://docs.bricked.ai/api-reference/property/create

Assessment for Parcel:
- Best on-demand underwriting layer
- Best fit when user crosses from "property lookup" into "analyze this deal"
- Strong fit for AI-narrated ARV/repair underwriting

Limitations:
- more expensive than using a base data provider for every browse/search action
- should not be used as a background enrichment call for every address typed into the app
- still benefits from user overrides, which the API explicitly supports

## 3. ATTOM

What it offers:
- 158M+ US properties
- 99% population coverage
- 9,000+ attributes
- 70B+ rows of transaction-level data
- property, valuation, mortgage, foreclosure, hazard, climate, school, neighborhood, and boundary data
- free trial API key and 30-day trial
- scalable but not transparently self-serve priced like RentCast

Sources:
- https://www.attomdata.com/solutions/property-data-api/
- https://www.attomdata.com/solutions/property-data-api/how-it-works/
- https://www.attomdata.com/data/

Assessment for Parcel:
- best "full property intelligence" fallback or scale-stage layer
- useful when Parcel needs hazard risk, permit data, foreclosure depth, or deeper ownership/mortgage context

Limitations:
- overkill for a fast startup MVP flow
- pricing/packaging is less startup-friendly than RentCast

## 4. HouseCanary

What it offers:
- 136M+ properties
- 3.1% median absolute percentage error on valuations
- API access plus usage-based charges
- confidence-oriented valuation analytics

Current official pricing signals:
- `Pro`: $79/month
- API usage billed separately
- property analytics API basic endpoints start around $0.40/call on Pro pricing

Sources:
- https://www.housecanary.com/pricing
- https://www.housecanary.com/resources/about-us
- https://www.housecanary.com/products/data-explorer

Assessment for Parcel:
- good premium validation layer later
- potentially useful if Parcel wants a second-opinion valuation or enterprise-grade confidence benchmarking

Limitations:
- not the best MVP default
- cost structure is harder to justify early if RentCast + Bricked already cover most of Parcel's use case

## 5. Regrid

What it offers:
- 149M+ parcel boundaries and records
- address, point, parcel-number, polygon, and radius search
- ~200 requests/minute and 10 simultaneous requests by default
- strong parcel/APN and map-boundary support
- explicit guidance that point search can be more accurate than direct address search

Sources:
- https://regrid.com/api
- https://support.regrid.com/api/using-the-parcel-api-v1
- https://support.regrid.com/api/parcel-api-v1-endpoints

Assessment for Parcel:
- useful if Parcel wants parcel boundaries, APN normalization, and map-grade parcel identity
- strong optional enrichment layer for mobile, maps, and D4D later

Limitations:
- not the best single source for investor underwriting
- better as an identity/boundary layer than a first-call analysis engine

## What Parcel Can Auto-Fill vs. What Users Must Confirm

### High-confidence auto-fill

Usually safe to prefill and show immediately:
- normalized address
- city/state/zip/county
- latitude/longitude
- parcel/APN when available
- property type
- beds/baths/square feet
- lot size
- year built
- last sale date and price
- listing status and listing price if active
- photos when licensed through the provider

### Medium-confidence auto-fill

Should be shown with visible confidence language and easy override:
- rent estimate
- value estimate / AVM
- tax amount
- HOA amount
- owner occupancy
- open mortgage balance and lender detail
- zoning and land-use classification

### Low-confidence or user-required inputs

These should not be silently inferred as "final":
- rehab budget
- current condition
- CapEx assumptions
- insurance expense
- operating-expense assumptions
- financing structure
- down payment or cash available
- intended strategy
- seller-finance or subject-to terms
- lease-option credits

Critical inference:
- Parcel can absolutely start with an address
- Parcel cannot derive a trustworthy creative-finance deal structure from public property data alone

## Recommended Product Flow

## 1. Two-stage analysis, not one blocking wizard

The fastest credible flow is:

### Stage A: Property Snapshot

Input:
- address

Parallel calls:
- RentCast property lookup
- optional Regrid parcel normalization if needed

Return quickly:
- property facts
- last sale
- list price if active
- rent/value estimate ranges
- confidence badges

### Stage B: Full Underwrite

Triggered when user clicks `Analyze` or confirms the property:
- Bricked underwriting call
- Parcel calculator logic
- AI narration

This lets Parcel feel instant while reserving the expensive call for actual analysis intent.

## 2. Progressive confidence, not fake certainty

Recommended UI language:
- `Imported from records`
- `Estimated`
- `Needs confirmation`
- `Missing - add manually`

DealCheck's official pattern validates this. Missing data is normal. Good UX handles it honestly.

## 3. Default the user into a smart draft, not a blank form

Best next step after address lookup:
- pre-populate the likely strategy fields
- ask only for the 3-5 missing decisions that meaningfully change the outcome

Examples:
- `What condition is the property in?`
- `How would you likely finance it?`
- `Do you want to analyze this as rental, BRRRR, flip, wholesale, or compare all?`

## 4. Use caching aggressively

Implication from provider mix:
- RentCast lookups can be cached longer
- Bricked analyses should be cached by normalized address + override set
- the same property should not be recomputed repeatedly during onboarding

## Recommended Stack for Parcel

### MVP recommendation

- `RentCast` as the primary enrichment layer
- `Bricked` as the full-analysis layer

Why:
- best startup economics
- strongest investor-relevant output mix
- direct fit for Parcel's activation promise

### Add later if needed

- `Regrid` for parcel boundaries / APN / map precision
- `ATTOM` if Parcel needs hazard, permit, foreclosure, or richer ownership depth
- `HouseCanary` if Parcel needs second-opinion valuation confidence at a higher end of the market

## Product Recommendation

Parcel should not market:
- "Type any address and we know everything"

Parcel should market:
- "Type an address and Parcel builds the fastest investor-ready draft in your workflow, with AI explaining what matters and what still needs your judgment."

That is stronger, more believable, and still compelling.

## Sources

### Local
- `RESEARCH/08-property-data-apis.md`
- `RESEARCH/12-mls-idx-access.md`
- `SAD/current-state-audit.md`

### External
- RentCast:
  - https://www.rentcast.io/api
  - https://www.rentcast.io/
  - https://help.rentcast.io/en/articles/7992900-rentcast-property-data-api
  - https://help.rentcast.io/en/articles/5535860-rental-data-sources-and-quality
- Bricked:
  - https://bricked.ai/
  - https://docs.bricked.ai/api-reference/introduction
  - https://docs.bricked.ai/api-reference/property/create
- ATTOM:
  - https://www.attomdata.com/solutions/property-data-api/
  - https://www.attomdata.com/solutions/property-data-api/how-it-works/
  - https://www.attomdata.com/data/
- HouseCanary:
  - https://www.housecanary.com/pricing
  - https://www.housecanary.com/resources/about-us
  - https://www.housecanary.com/products/data-explorer
- Regrid:
  - https://regrid.com/api
  - https://support.regrid.com/api/using-the-parcel-api-v1
  - https://support.regrid.com/api/parcel-api-v1-endpoints
- DealCheck:
  - https://help.dealcheck.io/en/articles/2046991-how-to-import-property-data-from-public-records-listings
  - https://help.dealcheck.io/en/articles/2066703-why-is-some-information-missing-when-searching-public-records-listings-for-a-specific-property
- Stessa:
  - https://www.stessa.com/get-started/

