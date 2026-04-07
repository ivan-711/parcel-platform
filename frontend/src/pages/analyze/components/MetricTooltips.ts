/**
 * Metric tooltip definitions — descriptions, formulas, and live "This Property" calculations.
 * Formulas match backend/core/calculators/ exactly.
 */

type Outputs = Record<string, number | string | boolean | null | undefined>

export interface MetricTooltipDef {
  description: string
  formula: string
  compute: (outputs: Outputs) => string | null
}

// --- helpers ---
const $ = (v: number) =>
  '$' + Math.abs(v).toLocaleString(undefined, { maximumFractionDigits: 0 })

const pct = (v: number) => v.toLocaleString(undefined, { maximumFractionDigits: 2 }) + '%'

function num(outputs: Outputs, key: string): number | null {
  const v = outputs[key]
  return typeof v === 'number' && Number.isFinite(v) ? v : null
}

// --- definitions keyed by metric output field name ---

export const METRIC_TOOLTIPS: Record<string, MetricTooltipDef> = {
  // ========================
  // BUY & HOLD
  // ========================
  cap_rate: {
    description: 'Capitalization rate measures property income relative to its price, independent of financing.',
    formula: 'Annual NOI / Purchase Price × 100',
    compute: (o) => {
      const noi = num(o, 'annual_noi')
      const price = num(o, 'purchase_price')
      const result = num(o, 'cap_rate')
      if (noi == null || price == null || result == null) return null
      return `${$(noi)} / ${$(price)} × 100 = ${pct(result)}`
    },
  },

  coc_return: {
    description: 'Cash-on-cash return measures your annual cash flow relative to the total cash you invested (down payment).',
    formula: 'Annual Cash Flow / Down Payment × 100',
    compute: (o) => {
      const cf = num(o, 'annual_cash_flow')
      const dp = num(o, 'down_payment')
      const result = num(o, 'coc_return')
      if (cf == null || dp == null || result == null) return null
      return `${$(cf)} / ${$(dp)} × 100 = ${pct(result)}`
    },
  },

  dscr: {
    description: 'Debt service coverage ratio compares your net operating income to your mortgage payment. Lenders typically require 1.25+.',
    formula: 'Monthly NOI / Monthly Mortgage Payment',
    compute: (o) => {
      const noi = num(o, 'monthly_noi')
      const pi = num(o, 'monthly_pi')
      const result = num(o, 'dscr')
      // creative_finance uses rent / payment instead
      const rent = num(o, 'monthly_rent_estimate')
      const pmt = num(o, 'monthly_payment')
      if (result == null) return null
      if (noi != null && pi != null && pi > 0) return `${$(noi)} / ${$(pi)} = ${result.toFixed(2)}`
      if (rent != null && pmt != null && pmt > 0) return `${$(rent)} / ${$(pmt)} = ${result.toFixed(2)}`
      return null
    },
  },

  rent_to_price_ratio: {
    description: 'The 1% rule — a quick screening filter. If monthly rent is at least 1% of purchase price, the deal is worth deeper analysis.',
    formula: '(Monthly Rent / Purchase Price) × 100',
    compute: (o) => {
      const rent = num(o, 'monthly_rent')
      const price = num(o, 'purchase_price')
      const result = num(o, 'rent_to_price_ratio')
      if (rent == null || price == null || result == null) return null
      return `(${$(rent)} / ${$(price)}) × 100 = ${pct(result)}`
    },
  },

  debt_yield: {
    description: 'Annual NOI divided by total debt. Above 10% is typically safe for lenders. Higher = less risk for the lender.',
    formula: 'Annual NOI / Total Loan Amount × 100',
    compute: (o) => {
      const result = num(o, 'debt_yield')
      if (result == null) return null
      return `Debt Yield = ${pct(result)}`
    },
  },

  annual_cash_flow: {
    description: 'Total net cash flow over a full year after all expenses and debt service.',
    formula: 'Monthly Cash Flow × 12',
    compute: (o) => {
      const mcf = num(o, 'monthly_cash_flow')
      const result = num(o, 'annual_cash_flow')
      if (mcf == null || result == null) return null
      return `${$(mcf)} × 12 = ${$(result)}`
    },
  },

  monthly_cash_flow: {
    description: 'Net monthly income after all expenses and debt service. Calculation varies by strategy.',
    formula: 'Income − Expenses − Debt Service',
    compute: (o) => {
      const result = num(o, 'monthly_cash_flow')
      if (result == null) return null
      // Buy & hold: EGI - total expenses
      const egi = num(o, 'effective_gross_income')
      const exp = num(o, 'total_monthly_expenses')
      if (egi != null && exp != null) return `${$(egi)} − ${$(exp)} = ${$(result)}`
      // BRRRR/Creative: rent - payment - expenses
      const rent = num(o, 'monthly_rent') ?? num(o, 'monthly_rent_estimate')
      const pmt = num(o, 'monthly_pi') ?? num(o, 'monthly_payment')
      const opex = num(o, 'monthly_expenses')
      if (rent != null && pmt != null && opex != null) return `${$(rent)} − ${$(pmt)} − ${$(opex)} = ${$(result)}`
      return `${$(result)}/mo`
    },
  },

  five_year_total_return: {
    description: 'Projected total return over 5 years including cumulative cash flow, equity from appreciation, and principal paydown.',
    formula: '5yr Cash Flow + 5yr Appreciation + 5yr Principal Paid',
    compute: (o) => {
      const result = num(o, 'five_year_total_return')
      const equity = num(o, 'five_year_equity')
      if (result == null) return null
      if (equity != null) return `Cash Flow + ${$(equity)} equity = ${$(result)} total`
      return `${$(result)}`
    },
  },

  monthly_pi: {
    description: 'Monthly principal and interest payment on your mortgage loan.',
    formula: 'PMT(rate/12, term×12, loan_amount)',
    compute: (o) => {
      const result = num(o, 'monthly_pi')
      const loan = num(o, 'loan_amount')
      if (result == null) return null
      if (loan != null) return `Loan ${$(loan)} → ${$(result)}/mo`
      return `${$(result)}/mo`
    },
  },

  break_even_rent: {
    description: 'The minimum monthly rent needed to cover all expenses. Anything above this is profit.',
    formula: 'Total Monthly Expenses / Number of Units',
    compute: (o) => {
      const exp = num(o, 'total_monthly_expenses')
      const result = num(o, 'break_even_rent')
      if (exp == null || result == null) return null
      const units = num(o, 'number_of_units') ?? 1
      return `${$(exp)} / ${units} unit${units !== 1 ? 's' : ''} = ${$(result)}`
    },
  },

  expense_ratio: {
    description: 'What percentage of your effective income goes to expenses. Lower is better.',
    formula: '(Total Monthly Expenses / Effective Gross Income) × 100',
    compute: (o) => {
      const exp = num(o, 'total_monthly_expenses')
      const egi = num(o, 'effective_gross_income')
      const result = num(o, 'expense_ratio')
      if (exp == null || egi == null || result == null) return null
      return `(${$(exp)} / ${$(egi)}) × 100 = ${pct(result)}`
    },
  },

  // ========================
  // WHOLESALE
  // ========================
  mao: {
    description: 'Maximum Allowable Offer — the highest price you should pay to maintain your desired profit margin using the 70% rule.',
    formula: '(ARV × 70%) − Repair Costs − Desired Profit',
    compute: (o) => {
      const result = num(o, 'mao')
      if (result == null) return null
      return `${$(result)}`
    },
  },

  profit_at_ask: {
    description: 'Your expected profit if you buy at the current asking price. Positive means the deal works at asking.',
    formula: 'MAO − Asking Price',
    compute: (o) => {
      const mao = num(o, 'mao')
      const result = num(o, 'profit_at_ask')
      if (mao == null || result == null) return null
      return `${$(mao)} − asking = ${$(result)}`
    },
  },

  break_even_price: {
    description: 'The price where you neither profit nor lose — your absolute ceiling.',
    formula: '(ARV × 70%) − Repair Costs',
    compute: (o) => {
      const result = num(o, 'break_even_price')
      if (result == null) return null
      return `${$(result)}`
    },
  },

  recommendation: {
    description: 'Deal verdict based on asking price vs. your MAO. Strong = below MAO, Marginal = between MAO and break-even, Pass = above break-even.',
    formula: 'If asking ≤ MAO → Strong; If asking ≤ break-even → Marginal; Else → Pass',
    compute: () => null,
  },

  mao_65: {
    description: 'Conservative MAO using the 65% rule instead of 70% — builds in more margin.',
    formula: '(ARV × 65%) − Repair Costs − Desired Profit',
    compute: (o) => {
      const result = num(o, 'mao_65')
      if (result == null) return null
      return `${$(result)}`
    },
  },

  mao_75: {
    description: 'Aggressive MAO using the 75% rule — tighter margin but more deals.',
    formula: '(ARV × 75%) − Repair Costs − Desired Profit',
    compute: (o) => {
      const result = num(o, 'mao_75')
      if (result == null) return null
      return `${$(result)}`
    },
  },

  closing_costs: {
    description: 'Estimated closing costs as a percentage of ARV.',
    formula: 'ARV × Closing Cost %',
    compute: (o) => {
      const result = num(o, 'closing_costs')
      if (result == null) return null
      return `${$(result)}`
    },
  },

  assignment_fee_pct_arv: {
    description: 'Your assignment fee as a percentage of the property ARV.',
    formula: '(Desired Profit / ARV) × 100',
    compute: (o) => {
      const result = num(o, 'assignment_fee_pct_arv')
      if (result == null) return null
      return `${pct(result)}`
    },
  },

  // ========================
  // FLIP
  // ========================
  roi: {
    description: 'Total return on your invested capital over the entire flip.',
    formula: '(Gross Profit / Total Invested) × 100',
    compute: (o) => {
      const profit = num(o, 'gross_profit')
      const invested = num(o, 'total_invested')
      const result = num(o, 'roi')
      if (profit == null || invested == null || result == null) return null
      return `(${$(profit)} / ${$(invested)}) × 100 = ${pct(result)}`
    },
  },

  annualized_roi: {
    description: 'ROI adjusted for time — a 3-month flip at 15% ROI is far better than a 12-month flip at 15%.',
    formula: '(ROI / Holding Months) × 12',
    compute: (o) => {
      const roi = num(o, 'roi')
      const result = num(o, 'annualized_roi')
      if (roi == null || result == null) return null
      return `(${pct(roi)} / months) × 12 = ${pct(result)}`
    },
  },

  total_cost: {
    description: 'Everything you spend — purchase price, rehab, financing, and selling costs.',
    formula: 'Purchase + Rehab + Financing + Selling Costs',
    compute: (o) => {
      const result = num(o, 'total_cost')
      if (result == null) return null
      return `${$(result)}`
    },
  },

  profit_margin_pct: {
    description: 'What percentage of the sale price is profit.',
    formula: '(Gross Profit / ARV) × 100',
    compute: (o) => {
      const profit = num(o, 'gross_profit')
      const result = num(o, 'profit_margin_pct')
      if (profit == null || result == null) return null
      return `${$(profit)} / ARV × 100 = ${pct(result)}`
    },
  },

  selling_costs: {
    description: 'Agent commissions, title fees, and closing costs when you sell.',
    formula: 'ARV × Selling Cost %',
    compute: (o) => {
      const result = num(o, 'selling_costs')
      if (result == null) return null
      return `${$(result)}`
    },
  },

  cost_per_sqft_rehab: {
    description: 'Rehab budget divided by square footage — useful for comparing to local contractor benchmarks.',
    formula: 'Rehab Budget / Square Footage',
    compute: (o) => {
      const result = num(o, 'cost_per_sqft_rehab')
      if (result == null) return null
      return `$${result.toFixed(2)}/sqft`
    },
  },

  // ========================
  // BRRRR
  // ========================
  refi_proceeds: {
    description: 'Cash you get back from the refinance — ideally covers your entire initial investment.',
    formula: 'ARV Post-Rehab × Refinance LTV %',
    compute: (o) => {
      const result = num(o, 'refi_proceeds')
      if (result == null) return null
      return `${$(result)}`
    },
  },

  equity_captured: {
    description: 'The equity you own after the refinance — the difference between property value and new loan.',
    formula: 'ARV Post-Rehab − Refinance Proceeds',
    compute: (o) => {
      const arv = num(o, 'arv_post_rehab')
      const refi = num(o, 'refi_proceeds')
      const result = num(o, 'equity_captured')
      if (result == null) return null
      if (arv != null && refi != null) return `${$(arv)} − ${$(refi)} = ${$(result)}`
      return `${$(result)}`
    },
  },

  capital_recycled_pct: {
    description: 'What percentage of your initial investment was returned by the refinance. 100%+ means infinite return.',
    formula: '(Refi Proceeds / All-In Cost) × 100',
    compute: (o) => {
      const refi = num(o, 'refi_proceeds')
      const allIn = num(o, 'all_in')
      const result = num(o, 'capital_recycled_pct')
      if (refi == null || allIn == null || result == null) return null
      return `(${$(refi)} / ${$(allIn)}) × 100 = ${pct(result)}`
    },
  },

  infinite_return: {
    description: 'True when refinance proceeds exceed your all-in cost — you have $0 left in the deal and still own the property.',
    formula: 'Money Left In Deal ≤ $0',
    compute: (o) => {
      const mli = num(o, 'money_left_in')
      const v = o.infinite_return
      if (v == null) return null
      return v ? `${$(mli ?? 0)} left → Infinite return` : `${$(mli ?? 0)} still in deal`
    },
  },

  forced_appreciation: {
    description: 'Value created through rehab — the difference between post-rehab value and your total purchase + rehab cost.',
    formula: 'ARV Post-Rehab − Purchase Price − Rehab Costs',
    compute: (o) => {
      const result = num(o, 'forced_appreciation')
      if (result == null) return null
      return `${$(result)} in forced equity`
    },
  },

  money_left_in: {
    description: 'Cash that remains invested in the deal after the refinance. Lower is better — $0 means infinite return.',
    formula: 'max(0, All-In Cost − Refi Proceeds)',
    compute: (o) => {
      const allIn = num(o, 'all_in')
      const refi = num(o, 'refi_proceeds')
      const result = num(o, 'money_left_in')
      if (allIn == null || refi == null || result == null) return null
      return `max(0, ${$(allIn)} − ${$(refi)}) = ${$(result)}`
    },
  },

  // ========================
  // CREATIVE FINANCE
  // ========================
  equity_day_one: {
    description: 'Instant equity at closing — the gap between property value and the loan you are assuming or creating.',
    formula: 'ARV − Existing Loan Balance',
    compute: (o) => {
      const result = num(o, 'equity_day_one')
      if (result == null) return null
      return `${$(result)}`
    },
  },

  effective_yield: {
    description: 'Annual cash flow as a percentage of your day-one equity position.',
    formula: '(Annual Cash Flow / Day-1 Equity) × 100',
    compute: (o) => {
      const cf = num(o, 'annual_cash_flow')
      const equity = num(o, 'equity_day_one')
      const result = num(o, 'effective_yield')
      if (cf == null || equity == null || result == null) return null
      return `(${$(cf)} / ${$(equity)}) × 100 = ${pct(result)}`
    },
  },

  wrap_spread_monthly: {
    description: 'Monthly profit from a wraparound mortgage — the difference between what your buyer pays you and what you pay the original lender.',
    formula: 'Wrap Payment − Your Monthly Payment',
    compute: (o) => {
      const result = num(o, 'wrap_spread_monthly')
      if (result == null) return null
      return `${$(result)}/mo spread`
    },
  },

  sub_to_risk_score: {
    description: 'Risk assessment for subject-to deals based on loan type and payment history. Lower is safer. FHA/VA loans carry less risk than conventional.',
    formula: 'Base 50 adjusted by loan type and payment history',
    compute: (o) => {
      const result = num(o, 'sub_to_risk_score')
      if (result == null) return null
      return `${result}/100 risk`
    },
  },

  // ========================
  // HERO METRICS (used by the primary display)
  // ========================
  gross_profit: {
    description: 'Total profit from the flip after all costs — purchase, rehab, financing, and selling.',
    formula: 'ARV − (Purchase + Rehab + Financing + Selling Costs)',
    compute: (o) => {
      const arv = num(o, 'arv') ?? num(o, 'after_repair_value')
      const tc = num(o, 'total_cost')
      const result = num(o, 'gross_profit')
      if (result == null) return null
      if (arv != null && tc != null) return `${$(arv)} − ${$(tc)} = ${$(result)}`
      return `${$(result)}`
    },
  },
}
