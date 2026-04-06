import { useState, useMemo } from 'react'
import { cn } from '@/lib/utils'
import type { ScenarioDetail } from '@/types'

type SensitivityMetric = 'cash_flow' | 'cap_rate' | 'coc_return' | 'roi'

const METRIC_OPTIONS: { value: SensitivityMetric; label: string }[] = [
  { value: 'cash_flow', label: 'Cash Flow' },
  { value: 'cap_rate', label: 'Cap Rate' },
  { value: 'coc_return', label: 'CoC Return' },
  { value: 'roi', label: 'ROI' },
]

interface Props {
  scenario: ScenarioDetail
}

function calcMetric(
  metric: SensitivityMetric,
  price: number,
  rate: number,
  downPct: number,
  rent: number,
  termYears: number,
  expenseRatio: number,
): number {
  const loan = price * (1 - downPct / 100)
  const monthlyRate = rate / 100 / 12
  const n = termYears * 12
  const pmt = monthlyRate > 0
    ? loan * (monthlyRate * Math.pow(1 + monthlyRate, n)) / (Math.pow(1 + monthlyRate, n) - 1)
    : n > 0 ? loan / n : 0
  const expenses = rent * expenseRatio
  const cashFlow = rent - pmt - expenses
  const downPayment = price * (downPct / 100)
  const noi = (rent - expenses + (rent * 0.15)) * 12

  switch (metric) {
    case 'cash_flow':
      return Math.round(cashFlow)
    case 'cap_rate':
      return price > 0 ? Math.round((noi / price) * 1000) / 10 : 0
    case 'coc_return':
      return downPayment > 0 ? Math.round((cashFlow * 12 / downPayment) * 1000) / 10 : 0
    case 'roi':
      return downPayment > 0 ? Math.round((cashFlow * 12 / downPayment) * 1000) / 10 : 0
  }
}

function formatCell(value: number, metric: SensitivityMetric): string {
  if (metric === 'cash_flow') return `$${value.toLocaleString()}`
  return `${value.toFixed(1)}%`
}

export function SensitivityMatrix({ scenario }: Props) {
  const [activeMetric, setActiveMetric] = useState<SensitivityMetric>('cash_flow')

  const strategy = scenario.strategy
  // Only show sensitivity for strategies where price/rate analysis is meaningful
  const supportedStrategies = ['buy_and_hold', 'brrrr', 'creative_finance']

  const basePrice = Number(scenario.purchase_price) || 150000
  const baseRate = Number(scenario.interest_rate) || 7.0
  const downPct = Number(scenario.down_payment_pct) || 20
  const rent = Number(scenario.monthly_rent) || 1200
  const termYears = scenario.loan_term_years || 30
  const expenseRatio = 0.35

  const priceDeltas = [-0.10, -0.05, 0, 0.05, 0.10]
  const rateDeltas = [-1, -0.5, 0, 0.5, 1]

  const matrix = useMemo(() =>
    priceDeltas.map(pd => ({
      priceLabel: pd === 0 ? `$${(basePrice / 1000).toFixed(0)}k` : `${pd > 0 ? '+' : ''}${(pd * 100).toFixed(0)}%`,
      cells: rateDeltas.map(rd => ({
        value: calcMetric(activeMetric, Math.round(basePrice * (1 + pd)), baseRate + rd, downPct, rent, termYears, expenseRatio),
        rateLabel: rd === 0 ? `${baseRate.toFixed(1)}%` : `${rd > 0 ? '+' : ''}${rd.toFixed(1)}%`,
      })),
    })),
  [basePrice, baseRate, downPct, rent, termYears, expenseRatio, activeMetric])

  const isPositive = (v: number) => activeMetric === 'cash_flow' ? v > 0 : v > 0

  if (!supportedStrategies.includes(strategy)) return null

  return (
    <div className="bg-[var(--chart-bg)] border border-[var(--chart-border)] rounded-xl p-5">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h3 className="text-[11px] text-[var(--chart-axis-text)] uppercase tracking-wider font-medium">
          Sensitivity Analysis
        </h3>
        <div className="flex items-center gap-1 p-0.5 bg-app-bg rounded-lg border border-[var(--chart-border)]">
          {METRIC_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => {
                setActiveMetric(opt.value)
                try { (window as any).posthog?.capture?.('sensitivity_metric_changed', { from_metric: activeMetric, to_metric: opt.value, strategy: scenario.strategy }) } catch { /* ignore */ }
              }}
              className={cn(
                'px-2 py-1 text-[10px] rounded transition-colors cursor-pointer',
                activeMetric === opt.value
                  ? 'bg-[#8B7AFF]/15 text-[#8B7AFF]'
                  : 'text-[var(--chart-axis-text)] hover:text-[#C5C0B8]'
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-center text-sm">
          <thead>
            <tr>
              <th className="text-[10px] text-[var(--chart-axis-text)] uppercase p-2">Price \ Rate</th>
              {rateDeltas.map((rd, i) => (
                <th key={i} className="text-[10px] text-[var(--chart-axis-text)] uppercase p-2">
                  {rd === 0 ? `${baseRate.toFixed(1)}%` : `${rd > 0 ? '+' : ''}${rd.toFixed(1)}%`}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {matrix.map((row, ri) => (
              <tr key={ri}>
                <td className="text-[10px] text-[var(--chart-axis-text)] p-2 text-left">{row.priceLabel}</td>
                {row.cells.map((cell, ci) => {
                  const isCenter = ri === 2 && ci === 2
                  const positive = isPositive(cell.value)
                  const strong = activeMetric === 'cash_flow' ? cell.value > 200 : cell.value > 8
                  const bg = strong ? 'rgba(74,222,128,0.15)' :
                             positive ? 'rgba(74,222,128,0.07)' :
                             'rgba(248,113,113,0.1)'
                  return (
                    <td
                      key={ci}
                      className={`p-2 text-sm font-light ${isCenter ? 'ring-1 ring-[#8B7AFF] rounded' : ''}`}
                      style={{ backgroundColor: bg, color: positive ? '#F0EDE8' : '#F87171' }}
                    >
                      {formatCell(cell.value, activeMetric)}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
