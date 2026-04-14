/**
 * Shared metric definitions — the single source of truth for labels,
 * descriptions, and formulas across the entire platform.
 */

export interface MetricDefinition {
  label: string
  description: string
  formula?: string
}

export const METRIC_DEFINITIONS: Record<string, MetricDefinition> = {
  // ========================
  // BUY & HOLD
  // ========================
  cap_rate: {
    label: 'Capitalization Rate',
    description: 'Capitalization rate measures property income relative to its price, independent of financing.',
    formula: 'Annual NOI / Purchase Price × 100',
  },
  coc_return: {
    label: 'Cash-on-Cash Return',
    description: 'Cash-on-cash return measures your annual cash flow relative to the total cash you invested (down payment).',
    formula: 'Annual Cash Flow / Down Payment × 100',
  },
  dscr: {
    label: 'Debt Service Coverage Ratio',
    description: 'Debt service coverage ratio compares your net operating income to your mortgage payment. Lenders typically require 1.25+.',
    formula: 'Monthly NOI / Monthly Mortgage Payment',
  },
  rent_to_price_ratio: {
    label: '1% Rule (Rent-to-Price)',
    description: 'The 1% rule — a quick screening filter. If monthly rent is at least 1% of purchase price, the deal is worth deeper analysis.',
    formula: '(Monthly Rent / Purchase Price) × 100',
  },
  debt_yield: {
    label: 'Debt Yield',
    description: 'Annual NOI divided by total debt. Above 10% is typically safe for lenders. Higher = less risk for the lender.',
    formula: 'Annual NOI / Total Loan Amount × 100',
  },
  annual_cash_flow: {
    label: 'Annual Cash Flow',
    description: 'Total net cash flow over a full year after all expenses and debt service.',
    formula: 'Monthly Cash Flow × 12',
  },
  monthly_cash_flow: {
    label: 'Monthly Cash Flow',
    description: 'Net monthly income after all expenses and debt service. Calculation varies by strategy.',
    formula: 'Income − Expenses − Debt Service',
  },
  five_year_total_return: {
    label: '5-Year Total Return',
    description: 'Projected total return over 5 years including cumulative cash flow, equity from appreciation, and principal paydown.',
    formula: '5yr Cash Flow + 5yr Appreciation + 5yr Principal Paid',
  },
  monthly_pi: {
    label: 'Monthly Mortgage Payment',
    description: 'Monthly principal and interest payment on your mortgage loan.',
    formula: 'PMT(rate/12, term×12, loan_amount)',
  },
  break_even_rent: {
    label: 'Break-Even Rent',
    description: 'The minimum monthly rent needed to cover all expenses. Anything above this is profit.',
    formula: 'Total Monthly Expenses / Number of Units',
  },
  expense_ratio: {
    label: 'Expense Ratio',
    description: 'What percentage of your effective income goes to expenses. Lower is better.',
    formula: '(Total Monthly Expenses / Effective Gross Income) × 100',
  },

  // ========================
  // WHOLESALE
  // ========================
  mao: {
    label: 'Maximum Allowable Offer (MAO)',
    description: 'Maximum Allowable Offer — the highest price you should pay to maintain your desired profit margin using the 70% rule.',
    formula: '(ARV × 70%) − Repair Costs − Desired Profit',
  },
  profit_at_ask: {
    label: 'Profit at Asking Price',
    description: 'Your expected profit if you buy at the current asking price. Positive means the deal works at asking.',
    formula: 'MAO − Asking Price',
  },
  break_even_price: {
    label: 'Break-Even Price',
    description: 'The price where you neither profit nor lose — your absolute ceiling.',
    formula: '(ARV × 70%) − Repair Costs',
  },
  recommendation: {
    label: 'Deal Verdict',
    description: 'Deal verdict based on asking price vs. your MAO. Strong = below MAO, Marginal = between MAO and break-even, Pass = above break-even.',
    formula: 'If asking ≤ MAO → Strong; If asking ≤ break-even → Marginal; Else → Pass',
  },
  mao_65: {
    label: 'MAO at 65% Rule',
    description: 'Conservative MAO using the 65% rule instead of 70% — builds in more margin.',
    formula: '(ARV × 65%) − Repair Costs − Desired Profit',
  },
  mao_75: {
    label: 'MAO at 75% Rule',
    description: 'Aggressive MAO using the 75% rule — tighter margin but more deals.',
    formula: '(ARV × 75%) − Repair Costs − Desired Profit',
  },
  closing_costs: {
    label: 'Closing Costs',
    description: 'Estimated closing costs as a percentage of ARV.',
    formula: 'ARV × Closing Cost %',
  },
  assignment_fee_pct_arv: {
    label: 'Assignment Fee (% of ARV)',
    description: 'Your assignment fee as a percentage of the property ARV.',
    formula: '(Desired Profit / ARV) × 100',
  },

  // ========================
  // FLIP
  // ========================
  roi: {
    label: 'Return on Investment',
    description: 'Total return on your invested capital over the entire flip.',
    formula: '(Gross Profit / Total Invested) × 100',
  },
  annualized_roi: {
    label: 'Annualized ROI',
    description: 'ROI adjusted for time — a 3-month flip at 15% ROI is far better than a 12-month flip at 15%.',
    formula: '(ROI / Holding Months) × 12',
  },
  total_cost: {
    label: 'Total Project Cost',
    description: 'Everything you spend — purchase price, rehab, financing, and selling costs.',
    formula: 'Purchase + Rehab + Financing + Selling Costs',
  },
  profit_margin_pct: {
    label: 'Profit Margin',
    description: 'What percentage of the sale price is profit.',
    formula: '(Gross Profit / ARV) × 100',
  },
  selling_costs: {
    label: 'Selling Costs',
    description: 'Agent commissions, title fees, and closing costs when you sell.',
    formula: 'ARV × Selling Cost %',
  },
  cost_per_sqft_rehab: {
    label: 'Rehab Cost per Sqft',
    description: 'Rehab budget divided by square footage — useful for comparing to local contractor benchmarks.',
    formula: 'Rehab Budget / Square Footage',
  },

  // ========================
  // BRRRR
  // ========================
  refi_proceeds: {
    label: 'Refinance Proceeds',
    description: 'Cash you get back from the refinance — ideally covers your entire initial investment.',
    formula: 'ARV Post-Rehab × Refinance LTV %',
  },
  equity_captured: {
    label: 'Equity Captured',
    description: 'The equity you own after the refinance — the difference between property value and new loan.',
    formula: 'ARV Post-Rehab − Refinance Proceeds',
  },
  capital_recycled_pct: {
    label: 'Capital Recycled',
    description: 'What percentage of your initial investment was returned by the refinance. 100%+ means infinite return.',
    formula: '(Refi Proceeds / All-In Cost) × 100',
  },
  infinite_return: {
    label: 'Infinite Return',
    description: 'True when refinance proceeds exceed your all-in cost — you have $0 left in the deal and still own the property.',
    formula: 'Money Left In Deal ≤ $0',
  },
  forced_appreciation: {
    label: 'Forced Appreciation',
    description: 'Value created through rehab — the difference between post-rehab value and your total purchase + rehab cost.',
    formula: 'ARV Post-Rehab − Purchase Price − Rehab Costs',
  },
  money_left_in: {
    label: 'Money Left in Deal',
    description: 'Cash that remains invested in the deal after the refinance. Lower is better — $0 means infinite return.',
    formula: 'max(0, All-In Cost − Refi Proceeds)',
  },

  // ========================
  // CREATIVE FINANCE
  // ========================
  equity_day_one: {
    label: 'Day-One Equity',
    description: 'Instant equity at closing — the gap between property value and the loan you are assuming or creating.',
    formula: 'ARV − Existing Loan Balance',
  },
  effective_yield: {
    label: 'Effective Yield',
    description: 'Annual cash flow as a percentage of your day-one equity position.',
    formula: '(Annual Cash Flow / Day-1 Equity) × 100',
  },
  wrap_spread_monthly: {
    label: 'Wrap Spread (Monthly)',
    description: 'Monthly profit from a wraparound mortgage — the difference between what your buyer pays you and what you pay the original lender.',
    formula: 'Wrap Payment − Your Monthly Payment',
  },
  sub_to_risk_score: {
    label: 'Subject-To Risk Score',
    description: 'Risk assessment for subject-to deals based on loan type and payment history. Lower is safer. FHA/VA loans carry less risk than conventional.',
    formula: 'Base 50 adjusted by loan type and payment history',
  },

  // ========================
  // HERO METRICS
  // ========================
  gross_profit: {
    label: 'Gross Profit',
    description: 'Total profit from the flip after all costs — purchase, rehab, financing, and selling.',
    formula: 'ARV − (Purchase + Rehab + Financing + Selling Costs)',
  },

  // ========================
  // GENERAL / EDUCATION
  // ========================
  ltv: {
    label: 'Loan-to-Value Ratio',
    description: 'What percentage of the property\'s value is covered by debt. Below 70% is conservative; above 80% means higher risk and often requires mortgage insurance.',
    formula: 'Loan Balance / Property Value × 100',
  },
  piti: {
    label: 'PITI (Principal, Interest, Taxes, Insurance)',
    description: 'The four components of a standard monthly mortgage payment. This is your baseline monthly cost before maintenance, vacancy, or management fees.',
    formula: 'Principal + Interest + Taxes + Insurance',
  },
  balloon_payment: {
    label: 'Balloon Payment',
    description: 'A large lump-sum payment due at the end of a loan term. Unlike a fully amortized mortgage, you must pay off the remaining balance all at once — typically by refinancing or selling.',
  },
  due_on_sale: {
    label: 'Due-on-Sale Clause',
    description: 'A mortgage clause letting the lender demand full repayment if the property is sold or transferred. The primary risk in subject-to deals — the lender could call the loan.',
  },
  wrap_spread: {
    label: 'Wrap Spread',
    description: 'Monthly profit from a wraparound mortgage — the difference between what your buyer pays you and what you owe on the underlying loan.',
    formula: 'Buyer Payment − Your Payment',
  },
  hard_money: {
    label: 'Hard Money Loan',
    description: 'Short-term, high-interest loans from private lenders. Fast to close (days vs weeks) and asset-based. Typical: 12–18 months, 10–15% interest, 2–4 points.',
  },
  financing_instrument: {
    label: 'Financing Instrument',
    description: 'A loan, mortgage, or line of credit attached to a property — bank loan, hard money, seller-financed note, or assumed mortgage.',
  },
  pipeline_lead: {
    label: 'Lead',
    description: 'A potential deal you\'ve identified but haven\'t contacted yet. Could be from a driving-for-dollars list, MLS alert, or direct mail response.',
  },
  pipeline_prospect: {
    label: 'Prospect',
    description: 'You\'ve made contact with the seller or listing agent and are exploring whether this deal is worth pursuing.',
  },
  pipeline_analyzing: {
    label: 'Analyzing',
    description: 'You\'re running the numbers — financial analysis, comparable sales, and strategy evaluation. This is where you decide whether to make an offer.',
  },
  pipeline_under_contract: {
    label: 'Under Contract',
    description: 'Signed purchase agreement. The deal is locked in but not closed yet. Now verify everything during due diligence.',
  },
  pipeline_due_diligence: {
    label: 'Due Diligence',
    description: 'The verification phase: inspections, title search, appraisal, and final number checks before closing. Issues found here can be negotiated or used to exit the contract.',
  },
}

const ALIASES: Record<string, string> = {
  one_percent_rule: 'rent_to_price_ratio',
}

export function getMetricDef(key: string): MetricDefinition | undefined {
  return METRIC_DEFINITIONS[key] ?? METRIC_DEFINITIONS[ALIASES[key]]
}
