/** Strategy-aware KPI definitions — shared by ResultsPage and PDF export. */

export type RenderMode = 'standard' | 'color_coded' | 'badge'

export interface KPIDefinition {
  key: string
  label: string
  format: 'currency' | 'percent' | 'decimal' | 'percent_or_infinite'
  renderMode: RenderMode
}

/** Get KPI definitions per strategy. */
export function getStrategyKPIs(strategy: string): KPIDefinition[] {
  switch (strategy) {
    case 'buy_and_hold':
      return [
        { key: 'cap_rate', label: 'Cap Rate', format: 'percent', renderMode: 'standard' },
        { key: 'coc_return', label: 'Cash-on-Cash Return', format: 'percent', renderMode: 'standard' },
        { key: 'monthly_cash_flow', label: 'Monthly Cash Flow', format: 'currency', renderMode: 'color_coded' },
        { key: 'annual_noi', label: 'Annual NOI', format: 'currency', renderMode: 'standard' },
      ]
    case 'flip':
      return [
        { key: 'gross_profit', label: 'Gross Profit', format: 'currency', renderMode: 'standard' },
        { key: 'roi', label: 'ROI', format: 'percent', renderMode: 'standard' },
        { key: 'annualized_roi', label: 'Annualized ROI', format: 'percent', renderMode: 'standard' },
        { key: 'total_cost', label: 'Total Cost', format: 'currency', renderMode: 'standard' },
      ]
    case 'brrrr':
      return [
        { key: 'money_left_in', label: 'Money Left In', format: 'currency', renderMode: 'standard' },
        { key: 'coc_return', label: 'Cash-on-Cash', format: 'percent_or_infinite', renderMode: 'standard' },
        { key: 'monthly_cash_flow', label: 'Monthly Cash Flow', format: 'currency', renderMode: 'color_coded' },
        { key: 'equity_captured', label: 'Equity Captured', format: 'currency', renderMode: 'standard' },
      ]
    case 'creative_finance':
      return [
        { key: 'monthly_cash_flow', label: 'Monthly Cash Flow', format: 'currency', renderMode: 'color_coded' },
        { key: 'dscr', label: 'DSCR', format: 'decimal', renderMode: 'standard' },
        { key: 'equity_day_one', label: 'Equity Day One', format: 'currency', renderMode: 'standard' },
        { key: 'effective_yield', label: 'Effective Yield', format: 'percent', renderMode: 'standard' },
      ]
    case 'wholesale':
    default:
      return [
        { key: 'mao', label: 'MAO', format: 'currency', renderMode: 'standard' },
        { key: 'profit_at_ask', label: 'Profit at Ask', format: 'currency', renderMode: 'color_coded' },
        { key: 'break_even_price', label: 'Break-Even Price', format: 'currency', renderMode: 'standard' },
        { key: 'recommendation', label: 'Recommendation', format: 'currency', renderMode: 'badge' },
      ]
  }
}
