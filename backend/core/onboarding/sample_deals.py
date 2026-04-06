"""Sample deal definitions for onboarding personas.

Each persona gets a realistic Midwest deal with pre-generated AI narratives.
All records are marked is_sample=True and use real addresses.
"""

from dataclasses import dataclass, field
from typing import Optional


VALID_PERSONAS = frozenset({
    "wholesale", "flip", "buy_and_hold", "creative_finance",
    "brrrr", "hybrid", "agent", "beginner",
})

# Maps persona → AI experience level for narrative tone
PERSONA_EXPERIENCE_LEVEL = {
    "wholesale": "experienced",
    "flip": "experienced",
    "buy_and_hold": "intermediate",
    "creative_finance": "experienced",
    "brrrr": "experienced",
    "hybrid": "intermediate",
    "agent": "intermediate",
    "beginner": "beginner",
}


@dataclass
class SampleProperty:
    address_line1: str
    city: str
    state: str
    zip_code: str
    property_type: str
    bedrooms: int
    bathrooms: float
    sqft: int
    year_built: int
    county: str = "Milwaukee"


@dataclass
class SampleScenario:
    strategy: str
    purchase_price: Optional[float] = None
    after_repair_value: Optional[float] = None
    repair_cost: Optional[float] = None
    monthly_rent: Optional[float] = None
    down_payment_pct: Optional[float] = None
    interest_rate: Optional[float] = None
    loan_term_years: Optional[int] = None
    inputs_extended: Optional[dict] = None
    outputs: dict = field(default_factory=dict)
    ai_narrative: str = ""


@dataclass
class SampleDealSpec:
    """Complete sample deal definition for a persona."""
    persona: str
    property: SampleProperty
    scenarios: list[SampleScenario]
    experience_level: str = "intermediate"


# ---------------------------------------------------------------------------
# Pre-generated AI narratives (stored, NOT generated at onboarding time)
# ---------------------------------------------------------------------------

_NARRATIVE_WHOLESALE = """This wholesale opportunity at **2847 W Maple St** shows a distressed single-family in Milwaukee's 53208 zip. The numbers break down as follows:

**MAO analysis:** Using the 70% rule — `$135,000 × 0.70 − $38,000 = $56,500` — the maximum allowable offer is **$56,500**. The asking price of **$72,000** sits $15,500 above MAO, which means the assignment fee target of $8,500 would require negotiating the seller down to roughly $63,500.

**Assumptions stated:**
- ARV of $135,000 based on RentCast estimate (verify with 3 recent comps within 0.5 miles)
- Repair estimate of $38,000 — this is a 1958 build, so budget for potential electrical, plumbing, and foundation surprises
- Using standard 70% rule with 3% closing costs

**Risks flagged:**
- The 1958 build year means higher rehab variance — most contractors add 15-20% contingency for pre-1960 homes
- $38,000 repair estimate without a walkthrough is speculative — get a contractor bid before locking up
- Spread between asking ($72K) and MAO ($56.5K) is tight at $15.5K — limited room for assignment fee if seller won't negotiate

**What to verify:** Get 3 sold comps for the ARV. Walk the property with a contractor for actual repair numbers. Confirm there are no title issues or liens."""

_NARRATIVE_FLIP = """This flip candidate at **1523 E Lincoln Ave** in Milwaukee's Bay View neighborhood presents solid upside potential with manageable risk.

**Projected returns:** Purchase at **$145,000** + repairs of **$52,000** + estimated holding costs of $8,800 (5 months) + selling costs of $18,800 (8%) = total investment of **$224,600**. Against an ARV of **$235,000**, that leaves a gross profit of roughly **$10,400** — thin but workable if repair estimates hold.

- ROI: ~5.2% on total cash invested
- Annualized ROI: ~12.5% (5-month hold)

**Assumptions stated:**
- ARV of $235,000 assumes post-rehab condition comparable to recent sales in Bay View — this is a strong market but verify with active listings
- 5-month holding period assumes contractor availability and no permit delays
- Selling costs at 8% include 5-6% agent commission + 2-3% closing costs
- Financing costs estimated at $9,500 for hard money at ~12% annualized

**Risks flagged:**
- The 1972 build means potential asbestos in floor tiles and popcorn ceilings — budget $3-5K for abatement if present
- Profit margin is tight at ~4.4% of ARV — one $10K surprise wipes the profit
- Bay View market is competitive for flippers — ARV compression possible if 3+ flips hit market simultaneously

**What to verify:** Walk the property for actual scope. Get 3 contractor bids. Pull 5 sold comps within 0.25 miles in last 90 days. Check permit requirements with the city."""

_NARRATIVE_BUY_HOLD = """This duplex at **613 N 14th St** in Sheboygan offers steady cash flow characteristics typical of Midwest buy-and-hold investments.

**Cash flow analysis** at the asking price of **$185,000** with 20% down ($37,000):
- Gross monthly rent: **$2,700** ($1,350/unit × 2)
- Estimated monthly expenses: mortgage ($968), taxes ($280), insurance ($120), vacancy 8% ($216), maintenance 5% ($135), management 8% ($216) = **$1,935**
- **Monthly cash flow: $765** | **Annual: $9,180**

**Key metrics:**
- **Cap rate: 7.8%** — above the 6-7% threshold most investors target for Midwest multifamily
- **Cash-on-cash return: 24.8%** — strong, driven by the favorable price-to-rent ratio
- **DSCR: 1.79** — well above the 1.25 lender minimum
- **Cash-on-cash return** means for every dollar of your $37,000 down payment, you earn about 24.8 cents per year in cash flow

**Assumptions stated:**
- Assuming 8% vacancy, which is conservative for Sheboygan's current rental market (actual vacancy closer to 5-6%)
- Maintenance at 5% of gross rent — typical but the 1965 build year suggests budgeting 7-8% may be more realistic
- Management at 8% even if self-managing — accounts for your time and keeps the analysis honest

**Risks flagged:**
- 1965 build year = higher capex risk. Roof, furnace, and water heater replacements likely within 5-10 years — budget $15-20K in reserves
- Duplex tenant turnover tends to be higher than SFH — factor 2-3 weeks vacancy per turn
- Sheboygan is a smaller market — tenant pool is narrower than Milwaukee, which can extend vacancy periods

**What to verify:** Inspect both units. Get current lease terms and tenant payment history. Check city rental licensing requirements. Verify actual tax bill (assessed vs. market can diverge)."""

_NARRATIVE_CREATIVE = """This subject-to opportunity at **4215 S Howell Ave** leverages the seller's existing mortgage terms to create an arbitrage spread.

**Deal structure:** Seller carries the existing mortgage at **4% interest** with roughly $142,000 remaining balance. Buyer puts **$10,000 down** and takes over payments. With a wrap or lease-option to a tenant-buyer at market rate, the monthly spread is approximately **$312/month**.

**Financial breakdown:**
- Underlying PITI: ~$985/month (estimated at 4% on remaining balance)
- Market rent / wrap payment from tenant-buyer: ~$1,650/month
- Expenses (insurance, reserves): ~$353/month
- **Net monthly spread: $312**
- **Annual cash flow: $3,744** on $10,000 invested = **37.4% cash-on-cash**

**Assumptions stated:**
- Existing loan balance of ~$142K at 4% — must verify exact balance, rate, and remaining term with seller
- No balloon date on existing note — confirm this, as some conventional loans were modified with balloon provisions
- Market rent of $1,650 based on RentCast estimate — verify with 3 active listings within 0.5 miles
- Seller finance at 4% over 25 years with $10K down — these terms need to be negotiated and documented

**Risks flagged:**
- **Due-on-sale clause:** The existing lender can technically call the loan if they discover the transfer. Risk is low (lenders rarely enforce when payments are current) but not zero
- The 1985 build is relatively modern, reducing major capex surprises, but verify HVAC age and roof condition
- $10K total investment means minimal equity cushion — if the tenant-buyer defaults, you're covering PITI from cash reserves

**What to verify:** Get the seller's mortgage statement — verify exact balance, rate, payment, and whether there's an escrow shortage. Check for any second liens or judgments. Confirm the property's insurable condition. Have an attorney review the subject-to agreement and wrap note."""

_NARRATIVE_BRRRR = """This BRRRR candidate at **1847 N Palmer St** targets the classic forced-appreciation play — buy distressed, rehab to market, refinance out, and hold for cash flow.

**BRRRR math:**
- **All-in cost:** $58,000 (purchase) + $35,000 (rehab) = **$93,000**
- **After-repair value:** $120,000
- **Refi at 75% LTV:** $120,000 × 0.75 = **$90,000 loan proceeds**
- **Cash left in deal:** $93,000 − $90,000 = **$3,000**

Effectively infinite cash-on-cash return since you recover 96.8% of invested capital at refinance.

**Post-refi cash flow:**
- Monthly rent estimate: ~$1,100
- Refi mortgage (75% LTV at 7.25%, 30yr): ~$614
- Taxes + insurance + vacancy + maintenance: ~$380
- **Monthly cash flow: ~$106**

CoC 5.8%, below market. But the play here is equity capture + near-full capital recovery, not cash flow.

**Assumptions stated:**
- ARV of $120,000 assumes full renovation to market standard — verify with 3 recent sales of renovated properties in this zip
- Rehab at $35,000 for a 900 sqft, 1952 build — tight budget. Most 1950s homes in Milwaukee need $38-45K for a full BRRRR-grade reno
- Refi at 75% LTV with 7.25% rate — this requires a clean appraisal at $120K+ and seasoning period (typically 6 months)

**Risks flagged:**
- $35K rehab budget for a 1952 home is aggressive — foundation, knob-and-tube wiring, galvanized plumbing are common money pits in this vintage
- If appraisal comes in at $110K instead of $120K, you leave $10,500 in the deal instead of $3,000
- Post-refi cash flow is thin at $106/mo — one vacancy month or unexpected repair eats 2-3 months of profit

**What to verify:** Get a contractor walkthrough BEFORE making an offer. Check for lead paint (pre-1978). Verify the refi lender's seasoning requirements. Pull 5 renovated comps for the ARV."""

_NARRATIVE_BUY_HOLD_BEGINNER = """This duplex at **613 N 14th St** in Sheboygan is a great example of a buy-and-hold rental investment. Let me walk through exactly what the numbers mean.

**What is buy-and-hold?** You purchase a property, rent it out to tenants, and hold it long-term. Your returns come from monthly cash flow (rent minus expenses) and long-term appreciation.

**The purchase:**
- **Asking price: $185,000** for a duplex (two separate living units in one building)
- **Down payment: $37,000** (20% of purchase price — this is what you invest upfront)
- **Loan amount: $148,000** (the bank lends you the rest)

**Monthly income vs. expenses:**
- **Rent collected: $2,700/month** ($1,350 from each unit)
- **Your expenses:**
  - Mortgage payment: $968/month
  - Property taxes: $280/month
  - Insurance: $120/month
  - Vacancy reserve: $216/month (8% of rent — money set aside for months when a unit is empty)
  - Maintenance reserve: $135/month (5% of rent — for repairs like a broken water heater)
  - Property management: $216/month (8% of rent — even if you manage it yourself, count your time)

**Your monthly cash flow: $765** — this is what's left after ALL expenses. Over a year, that's **$9,180** in your pocket.

**Key metrics explained:**
- **Cash-on-cash return: 24.8%** — for every dollar of your $37,000 down payment, you earn about 24.8 cents per year in cash flow. For buy-and-hold rentals in the Midwest, most investors target 8-12%, so this deal is significantly above average
- **Cap rate: 7.8%** — this measures the property's return independent of financing. Above 6% is generally considered good for residential rentals
- **DSCR: 1.79** — this means the property's income covers the debt payments 1.79 times over. Lenders want at least 1.25, so this is very comfortable

**What's risky about this deal:**
- The building was built in **1965** — that means the roof, furnace, and plumbing could need replacement in the next 5-10 years. Budget **$15,000-20,000** in reserves for these big-ticket items
- The **maintenance budget of 5%** might be too low for a 60-year-old building. Many experienced investors use 7-8% for older properties
- Sheboygan is a **smaller market** — fewer tenants to choose from means vacancies could last longer than in Milwaukee

**Before making an offer, verify these things:**
1. Tour both units — check roof condition, furnace age, water heater age
2. Get current tenant lease terms and payment history from the seller
3. Confirm the actual tax bill (not just the assessed value)
4. Check Sheboygan's rental licensing requirements
5. Get quotes from a local property manager (even if you plan to self-manage initially)"""


# ---------------------------------------------------------------------------
# Sample deal specs per persona
# ---------------------------------------------------------------------------

SAMPLE_DEALS: dict[str, SampleDealSpec] = {
    "wholesale": SampleDealSpec(
        persona="wholesale",
        experience_level="experienced",
        property=SampleProperty(
            address_line1="2847 W Maple St",
            city="Milwaukee", state="WI", zip_code="53208",
            property_type="single_family", bedrooms=3, bathrooms=1.0,
            sqft=1100, year_built=1958,
        ),
        scenarios=[SampleScenario(
            strategy="wholesale",
            purchase_price=72000, after_repair_value=135000, repair_cost=38000,
            inputs_extended={"desired_profit": 8500, "holding_costs": 2000, "closing_costs_pct": 3.0},
            outputs={"mao": 56500, "profit_at_ask": -7000, "assignment_fee_target": 8500},
            ai_narrative=_NARRATIVE_WHOLESALE,
        )],
    ),

    "flip": SampleDealSpec(
        persona="flip",
        experience_level="experienced",
        property=SampleProperty(
            address_line1="1523 E Lincoln Ave",
            city="Milwaukee", state="WI", zip_code="53207",
            property_type="single_family", bedrooms=4, bathrooms=2.0,
            sqft=1800, year_built=1972,
        ),
        scenarios=[SampleScenario(
            strategy="flip",
            purchase_price=145000, after_repair_value=235000, repair_cost=52000,
            inputs_extended={"holding_months": 5, "selling_costs_pct": 8, "financing_costs": 9500},
            outputs={"gross_profit": 10400, "roi": 5.2, "total_cost": 224600},
            ai_narrative=_NARRATIVE_FLIP,
        )],
    ),

    "buy_and_hold": SampleDealSpec(
        persona="buy_and_hold",
        experience_level="intermediate",
        property=SampleProperty(
            address_line1="613 N 14th St",
            city="Sheboygan", state="WI", zip_code="53081",
            property_type="duplex", bedrooms=4, bathrooms=2.0,
            sqft=2200, year_built=1965, county="Sheboygan",
        ),
        scenarios=[SampleScenario(
            strategy="buy_and_hold",
            purchase_price=185000, monthly_rent=2700,
            down_payment_pct=20, interest_rate=7.25, loan_term_years=30,
            inputs_extended={"monthly_taxes": 280, "monthly_insurance": 120, "vacancy_rate_pct": 8, "maintenance_pct": 5, "mgmt_fee_pct": 8},
            outputs={"monthly_cash_flow": 765, "annual_cash_flow": 9180, "cap_rate": 7.8, "coc_return": 24.8, "dscr": 1.79, "noi": 14430},
            ai_narrative=_NARRATIVE_BUY_HOLD,
        )],
    ),

    "creative_finance": SampleDealSpec(
        persona="creative_finance",
        experience_level="experienced",
        property=SampleProperty(
            address_line1="4215 S Howell Ave",
            city="Milwaukee", state="WI", zip_code="53207",
            property_type="single_family", bedrooms=3, bathrooms=2.0,
            sqft=1400, year_built=1985,
        ),
        scenarios=[SampleScenario(
            strategy="creative_finance",
            purchase_price=165000, monthly_rent=1650,
            interest_rate=4.0, loan_term_years=25,
            inputs_extended={
                "existing_loan_balance": 142000, "existing_interest_rate": 4.0,
                "monthly_piti": 985, "finance_type": "subject_to",
                "down_payment": 10000,
            },
            outputs={"monthly_cash_flow": 312, "annual_cash_flow": 3744, "coc_return": 37.4, "wrap_spread": 312},
            ai_narrative=_NARRATIVE_CREATIVE,
        )],
    ),

    "brrrr": SampleDealSpec(
        persona="brrrr",
        experience_level="experienced",
        property=SampleProperty(
            address_line1="1847 N Palmer St",
            city="Milwaukee", state="WI", zip_code="53212",
            property_type="single_family", bedrooms=2, bathrooms=1.0,
            sqft=900, year_built=1952,
        ),
        scenarios=[SampleScenario(
            strategy="brrrr",
            purchase_price=58000, after_repair_value=120000, repair_cost=35000,
            monthly_rent=1100, interest_rate=7.25, loan_term_years=30,
            inputs_extended={"refinance_ltv_pct": 75},
            outputs={"money_left_in": 3000, "refi_proceeds": 90000, "monthly_cash_flow": 106, "total_invested": 93000},
            ai_narrative=_NARRATIVE_BRRRR,
        )],
    ),

    "hybrid": SampleDealSpec(
        persona="hybrid",
        experience_level="intermediate",
        property=SampleProperty(
            address_line1="613 N 14th St",
            city="Sheboygan", state="WI", zip_code="53081",
            property_type="duplex", bedrooms=4, bathrooms=2.0,
            sqft=2200, year_built=1965, county="Sheboygan",
        ),
        scenarios=[
            SampleScenario(
                strategy="buy_and_hold",
                purchase_price=185000, monthly_rent=2700,
                down_payment_pct=20, interest_rate=7.25, loan_term_years=30,
                outputs={"monthly_cash_flow": 765, "cap_rate": 7.8, "coc_return": 24.8},
                ai_narrative=_NARRATIVE_BUY_HOLD,
            ),
            SampleScenario(
                strategy="brrrr",
                purchase_price=185000, after_repair_value=240000, repair_cost=25000,
                monthly_rent=2700, interest_rate=7.25, loan_term_years=30,
                outputs={"money_left_in": 30000, "monthly_cash_flow": 420},
                ai_narrative="BRRRR scenario on this duplex: all-in $210K, ARV $240K, refi at 75% = $180K proceeds. Cash left in: $30K. Post-refi cash flow thin at $420/mo — the higher purchase price limits the BRRRR math compared to a distressed SFH. The buy-and-hold scenario is stronger for this property.",
            ),
            SampleScenario(
                strategy="wholesale",
                purchase_price=185000, after_repair_value=240000, repair_cost=25000,
                outputs={"mao": 143000, "profit_at_ask": -42000},
                ai_narrative="Wholesale viability is limited. MAO at 70% rule: $240K × 0.70 − $25K = $143K. Asking price of $185K exceeds MAO by $42K — this is not a wholesale deal at asking. Would need seller at $135-145K range to make assignment work.",
            ),
        ],
    ),

    "agent": SampleDealSpec(
        persona="agent",
        experience_level="intermediate",
        property=SampleProperty(
            address_line1="613 N 14th St",
            city="Sheboygan", state="WI", zip_code="53081",
            property_type="duplex", bedrooms=4, bathrooms=2.0,
            sqft=2200, year_built=1965, county="Sheboygan",
        ),
        scenarios=[SampleScenario(
            strategy="buy_and_hold",
            purchase_price=185000, monthly_rent=2700,
            down_payment_pct=20, interest_rate=7.25, loan_term_years=30,
            outputs={"monthly_cash_flow": 765, "cap_rate": 7.8, "coc_return": 24.8},
            ai_narrative=_NARRATIVE_BUY_HOLD,
        )],
    ),

    "beginner": SampleDealSpec(
        persona="beginner",
        experience_level="beginner",
        property=SampleProperty(
            address_line1="613 N 14th St",
            city="Sheboygan", state="WI", zip_code="53081",
            property_type="duplex", bedrooms=4, bathrooms=2.0,
            sqft=2200, year_built=1965, county="Sheboygan",
        ),
        scenarios=[SampleScenario(
            strategy="buy_and_hold",
            purchase_price=185000, monthly_rent=2700,
            down_payment_pct=20, interest_rate=7.25, loan_term_years=30,
            outputs={"monthly_cash_flow": 765, "cap_rate": 7.8, "coc_return": 24.8},
            ai_narrative=_NARRATIVE_BUY_HOLD_BEGINNER,
        )],
    ),
}


def get_sample_deal(persona: str) -> SampleDealSpec:
    """Get the sample deal spec for a persona. Falls back to buy_and_hold."""
    return SAMPLE_DEALS.get(persona, SAMPLE_DEALS["buy_and_hold"])
