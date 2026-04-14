/**
 * Metric tooltip definitions — descriptions, formulas, and live "This Property" calculations.
 * Formulas match backend/core/calculators/ exactly.
 *
 * Descriptions & formulas are sourced from the shared metric-definitions module.
 */

import { METRIC_DEFINITIONS } from '@/lib/metric-definitions'

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
    description: METRIC_DEFINITIONS.cap_rate.description,
    formula: METRIC_DEFINITIONS.cap_rate.formula!,
    compute: (o) => {
      const noi = num(o, 'annual_noi')
      const price = num(o, 'purchase_price')
      const result = num(o, 'cap_rate')
      if (noi == null || price == null || result == null) return null
      return `${$(noi)} / ${$(price)} × 100 = ${pct(result)}`
    },
  },

  coc_return: {
    description: METRIC_DEFINITIONS.coc_return.description,
    formula: METRIC_DEFINITIONS.coc_return.formula!,
    compute: (o) => {
      const cf = num(o, 'annual_cash_flow')
      const dp = num(o, 'down_payment')
      const result = num(o, 'coc_return')
      if (cf == null || dp == null || result == null) return null
      return `${$(cf)} / ${$(dp)} × 100 = ${pct(result)}`
    },
  },

  dscr: {
    description: METRIC_DEFINITIONS.dscr.description,
    formula: METRIC_DEFINITIONS.dscr.formula!,
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
    description: METRIC_DEFINITIONS.rent_to_price_ratio.description,
    formula: METRIC_DEFINITIONS.rent_to_price_ratio.formula!,
    compute: (o) => {
      const rent = num(o, 'monthly_rent')
      const price = num(o, 'purchase_price')
      const result = num(o, 'rent_to_price_ratio')
      if (rent == null || price == null || result == null) return null
      return `(${$(rent)} / ${$(price)}) × 100 = ${pct(result)}`
    },
  },

  debt_yield: {
    description: METRIC_DEFINITIONS.debt_yield.description,
    formula: METRIC_DEFINITIONS.debt_yield.formula!,
    compute: (o) => {
      const result = num(o, 'debt_yield')
      if (result == null) return null
      return `Debt Yield = ${pct(result)}`
    },
  },

  annual_cash_flow: {
    description: METRIC_DEFINITIONS.annual_cash_flow.description,
    formula: METRIC_DEFINITIONS.annual_cash_flow.formula!,
    compute: (o) => {
      const mcf = num(o, 'monthly_cash_flow')
      const result = num(o, 'annual_cash_flow')
      if (mcf == null || result == null) return null
      return `${$(mcf)} × 12 = ${$(result)}`
    },
  },

  monthly_cash_flow: {
    description: METRIC_DEFINITIONS.monthly_cash_flow.description,
    formula: METRIC_DEFINITIONS.monthly_cash_flow.formula!,
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
    description: METRIC_DEFINITIONS.five_year_total_return.description,
    formula: METRIC_DEFINITIONS.five_year_total_return.formula!,
    compute: (o) => {
      const result = num(o, 'five_year_total_return')
      const equity = num(o, 'five_year_equity')
      if (result == null) return null
      if (equity != null) return `Cash Flow + ${$(equity)} equity = ${$(result)} total`
      return `${$(result)}`
    },
  },

  monthly_pi: {
    description: METRIC_DEFINITIONS.monthly_pi.description,
    formula: METRIC_DEFINITIONS.monthly_pi.formula!,
    compute: (o) => {
      const result = num(o, 'monthly_pi')
      const loan = num(o, 'loan_amount')
      if (result == null) return null
      if (loan != null) return `Loan ${$(loan)} → ${$(result)}/mo`
      return `${$(result)}/mo`
    },
  },

  break_even_rent: {
    description: METRIC_DEFINITIONS.break_even_rent.description,
    formula: METRIC_DEFINITIONS.break_even_rent.formula!,
    compute: (o) => {
      const exp = num(o, 'total_monthly_expenses')
      const result = num(o, 'break_even_rent')
      if (exp == null || result == null) return null
      const units = num(o, 'number_of_units') ?? 1
      return `${$(exp)} / ${units} unit${units !== 1 ? 's' : ''} = ${$(result)}`
    },
  },

  expense_ratio: {
    description: METRIC_DEFINITIONS.expense_ratio.description,
    formula: METRIC_DEFINITIONS.expense_ratio.formula!,
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
    description: METRIC_DEFINITIONS.mao.description,
    formula: METRIC_DEFINITIONS.mao.formula!,
    compute: (o) => {
      const result = num(o, 'mao')
      if (result == null) return null
      return `${$(result)}`
    },
  },

  profit_at_ask: {
    description: METRIC_DEFINITIONS.profit_at_ask.description,
    formula: METRIC_DEFINITIONS.profit_at_ask.formula!,
    compute: (o) => {
      const mao = num(o, 'mao')
      const result = num(o, 'profit_at_ask')
      if (mao == null || result == null) return null
      return `${$(mao)} − asking = ${$(result)}`
    },
  },

  break_even_price: {
    description: METRIC_DEFINITIONS.break_even_price.description,
    formula: METRIC_DEFINITIONS.break_even_price.formula!,
    compute: (o) => {
      const result = num(o, 'break_even_price')
      if (result == null) return null
      return `${$(result)}`
    },
  },

  recommendation: {
    description: METRIC_DEFINITIONS.recommendation.description,
    formula: METRIC_DEFINITIONS.recommendation.formula!,
    compute: () => null,
  },

  mao_65: {
    description: METRIC_DEFINITIONS.mao_65.description,
    formula: METRIC_DEFINITIONS.mao_65.formula!,
    compute: (o) => {
      const result = num(o, 'mao_65')
      if (result == null) return null
      return `${$(result)}`
    },
  },

  mao_75: {
    description: METRIC_DEFINITIONS.mao_75.description,
    formula: METRIC_DEFINITIONS.mao_75.formula!,
    compute: (o) => {
      const result = num(o, 'mao_75')
      if (result == null) return null
      return `${$(result)}`
    },
  },

  closing_costs: {
    description: METRIC_DEFINITIONS.closing_costs.description,
    formula: METRIC_DEFINITIONS.closing_costs.formula!,
    compute: (o) => {
      const result = num(o, 'closing_costs')
      if (result == null) return null
      return `${$(result)}`
    },
  },

  assignment_fee_pct_arv: {
    description: METRIC_DEFINITIONS.assignment_fee_pct_arv.description,
    formula: METRIC_DEFINITIONS.assignment_fee_pct_arv.formula!,
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
    description: METRIC_DEFINITIONS.roi.description,
    formula: METRIC_DEFINITIONS.roi.formula!,
    compute: (o) => {
      const profit = num(o, 'gross_profit')
      const invested = num(o, 'total_invested')
      const result = num(o, 'roi')
      if (profit == null || invested == null || result == null) return null
      return `(${$(profit)} / ${$(invested)}) × 100 = ${pct(result)}`
    },
  },

  annualized_roi: {
    description: METRIC_DEFINITIONS.annualized_roi.description,
    formula: METRIC_DEFINITIONS.annualized_roi.formula!,
    compute: (o) => {
      const roi = num(o, 'roi')
      const result = num(o, 'annualized_roi')
      if (roi == null || result == null) return null
      return `(${pct(roi)} / months) × 12 = ${pct(result)}`
    },
  },

  total_cost: {
    description: METRIC_DEFINITIONS.total_cost.description,
    formula: METRIC_DEFINITIONS.total_cost.formula!,
    compute: (o) => {
      const result = num(o, 'total_cost')
      if (result == null) return null
      return `${$(result)}`
    },
  },

  profit_margin_pct: {
    description: METRIC_DEFINITIONS.profit_margin_pct.description,
    formula: METRIC_DEFINITIONS.profit_margin_pct.formula!,
    compute: (o) => {
      const profit = num(o, 'gross_profit')
      const result = num(o, 'profit_margin_pct')
      if (profit == null || result == null) return null
      return `${$(profit)} / ARV × 100 = ${pct(result)}`
    },
  },

  selling_costs: {
    description: METRIC_DEFINITIONS.selling_costs.description,
    formula: METRIC_DEFINITIONS.selling_costs.formula!,
    compute: (o) => {
      const result = num(o, 'selling_costs')
      if (result == null) return null
      return `${$(result)}`
    },
  },

  cost_per_sqft_rehab: {
    description: METRIC_DEFINITIONS.cost_per_sqft_rehab.description,
    formula: METRIC_DEFINITIONS.cost_per_sqft_rehab.formula!,
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
    description: METRIC_DEFINITIONS.refi_proceeds.description,
    formula: METRIC_DEFINITIONS.refi_proceeds.formula!,
    compute: (o) => {
      const result = num(o, 'refi_proceeds')
      if (result == null) return null
      return `${$(result)}`
    },
  },

  equity_captured: {
    description: METRIC_DEFINITIONS.equity_captured.description,
    formula: METRIC_DEFINITIONS.equity_captured.formula!,
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
    description: METRIC_DEFINITIONS.capital_recycled_pct.description,
    formula: METRIC_DEFINITIONS.capital_recycled_pct.formula!,
    compute: (o) => {
      const refi = num(o, 'refi_proceeds')
      const allIn = num(o, 'all_in')
      const result = num(o, 'capital_recycled_pct')
      if (refi == null || allIn == null || result == null) return null
      return `(${$(refi)} / ${$(allIn)}) × 100 = ${pct(result)}`
    },
  },

  infinite_return: {
    description: METRIC_DEFINITIONS.infinite_return.description,
    formula: METRIC_DEFINITIONS.infinite_return.formula!,
    compute: (o) => {
      const mli = num(o, 'money_left_in')
      const v = o.infinite_return
      if (v == null) return null
      return v ? `${$(mli ?? 0)} left → Infinite return` : `${$(mli ?? 0)} still in deal`
    },
  },

  forced_appreciation: {
    description: METRIC_DEFINITIONS.forced_appreciation.description,
    formula: METRIC_DEFINITIONS.forced_appreciation.formula!,
    compute: (o) => {
      const result = num(o, 'forced_appreciation')
      if (result == null) return null
      return `${$(result)} in forced equity`
    },
  },

  money_left_in: {
    description: METRIC_DEFINITIONS.money_left_in.description,
    formula: METRIC_DEFINITIONS.money_left_in.formula!,
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
    description: METRIC_DEFINITIONS.equity_day_one.description,
    formula: METRIC_DEFINITIONS.equity_day_one.formula!,
    compute: (o) => {
      const result = num(o, 'equity_day_one')
      if (result == null) return null
      return `${$(result)}`
    },
  },

  effective_yield: {
    description: METRIC_DEFINITIONS.effective_yield.description,
    formula: METRIC_DEFINITIONS.effective_yield.formula!,
    compute: (o) => {
      const cf = num(o, 'annual_cash_flow')
      const equity = num(o, 'equity_day_one')
      const result = num(o, 'effective_yield')
      if (cf == null || equity == null || result == null) return null
      return `(${$(cf)} / ${$(equity)}) × 100 = ${pct(result)}`
    },
  },

  wrap_spread_monthly: {
    description: METRIC_DEFINITIONS.wrap_spread_monthly.description,
    formula: METRIC_DEFINITIONS.wrap_spread_monthly.formula!,
    compute: (o) => {
      const result = num(o, 'wrap_spread_monthly')
      if (result == null) return null
      return `${$(result)}/mo spread`
    },
  },

  sub_to_risk_score: {
    description: METRIC_DEFINITIONS.sub_to_risk_score.description,
    formula: METRIC_DEFINITIONS.sub_to_risk_score.formula!,
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
    description: METRIC_DEFINITIONS.gross_profit.description,
    formula: METRIC_DEFINITIONS.gross_profit.formula!,
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
