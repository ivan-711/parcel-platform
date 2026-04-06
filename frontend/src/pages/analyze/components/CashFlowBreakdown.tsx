/**
 * Proportional breakdown list showing how gross rent flows through
 * deductions to net cash flow. Pure CSS — no charting library needed.
 * Data comes from scenario.outputs.monthly_expense_breakdown.
 */

import { useMemo } from 'react'
import type { ScenarioDetail } from '@/types'

interface Deduction {
  key: string
  label: string
  amount: number
}

const EXPENSE_LABELS: Record<string, string> = {
  mortgage: 'Mortgage',
  taxes: 'Taxes',
  insurance: 'Insurance',
  vacancy: 'Vacancy',
  maintenance: 'Maintenance',
  capex: 'CapEx',
  management: 'Management',
  hoa: 'HOA',
  other: 'Other',
}

const EXPENSE_ORDER = ['mortgage', 'taxes', 'insurance', 'vacancy', 'maintenance', 'management', 'capex', 'hoa', 'other']

interface BreakdownData {
  grossRent: number
  deductions: Deduction[]
  netCashFlow: number
}

function extractBreakdown(scenario: ScenarioDetail): BreakdownData | null {
  const outputs = scenario.outputs || {}
  const breakdown = outputs.monthly_expense_breakdown as Record<string, number> | undefined
  if (!breakdown) return null

  const vacancyAmt = typeof breakdown.vacancy === 'number' ? breakdown.vacancy : 0
  const egi = typeof outputs.effective_gross_income === 'number' ? outputs.effective_gross_income : null
  const rent = typeof scenario.monthly_rent === 'number' ? Number(scenario.monthly_rent) : null
  const grossRent = egi != null ? egi + vacancyAmt : rent
  if (!grossRent || grossRent <= 0) return null

  const deductions: Deduction[] = []
  for (const key of EXPENSE_ORDER) {
    const amount = typeof breakdown[key] === 'number' ? Math.round(breakdown[key]) : 0
    if (amount <= 0) continue
    deductions.push({ key, label: EXPENSE_LABELS[key] || key, amount })
  }

  const netCashFlow = typeof outputs.monthly_cash_flow === 'number'
    ? Math.round(outputs.monthly_cash_flow)
    : Math.round(grossRent - deductions.reduce((s, d) => s + d.amount, 0))

  return { grossRent: Math.round(grossRent), deductions, netCashFlow }
}

const fmt = (v: number) => '$' + Math.abs(v).toLocaleString(undefined, { maximumFractionDigits: 0 })

interface Props {
  scenario: ScenarioDetail
}

export function CashFlowBreakdown({ scenario }: Props) {
  const data = useMemo(() => extractBreakdown(scenario), [
    scenario.outputs?.monthly_expense_breakdown,
    scenario.outputs?.effective_gross_income,
    scenario.outputs?.monthly_cash_flow,
    scenario.monthly_rent,
  ])

  if (!data || data.deductions.length === 0) return null

  const { grossRent, deductions, netCashFlow } = data
  const netPositive = netCashFlow >= 0
  const netPct = grossRent > 0 ? (netCashFlow / grossRent) * 100 : 0

  return (
    <div className="bg-[var(--chart-bg)] border border-[var(--chart-border)] rounded-xl p-4 md:p-5">
      <h3 className="text-[10px] uppercase tracking-wider font-medium text-[var(--chart-axis-text)] mb-4">
        Monthly Cash Flow Breakdown
      </h3>

      {/* Gross rent header */}
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium text-[var(--chart-label-text)]">Gross Rent</span>
        <span className="text-sm font-medium tabular-nums text-[var(--text-primary)]">{fmt(grossRent)}</span>
      </div>

      <div className="border-t border-[var(--chart-grid)] my-2.5" />

      {/* Deduction rows */}
      <div className="space-y-2">
        {deductions.map(d => {
          const pct = (d.amount / grossRent) * 100
          return (
            <div key={d.key} className="flex items-center gap-3">
              <span className="w-[88px] sm:w-[104px] shrink-0 text-xs text-[var(--chart-axis-text)]">{d.label}</span>
              <div className="flex-1 h-[6px] rounded-full bg-[var(--chart-grid)] overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.min(pct, 100)}%`,
                    backgroundColor: 'var(--chart-negative)',
                    opacity: 0.75,
                  }}
                />
              </div>
              <span className="w-14 text-right text-sm tabular-nums font-medium text-[var(--text-primary)]">
                {fmt(d.amount)}
              </span>
              <span className="w-12 text-right text-[10px] tabular-nums text-[var(--chart-axis-text)] hidden sm:block">
                {pct.toFixed(1)}%
              </span>
            </div>
          )
        })}
      </div>

      <div className="border-t border-[var(--chart-grid)] my-2.5" />

      {/* Net cash flow footer */}
      <div className="flex items-center gap-3">
        <span className="w-[88px] sm:w-[104px] shrink-0 text-xs font-medium text-[var(--chart-label-text)]">
          Net Cash Flow
        </span>
        <div className="flex-1 h-[6px] rounded-full bg-[var(--chart-grid)] overflow-hidden">
          <div
            className="h-full rounded-full"
            style={{
              width: `${Math.min(Math.abs(netPct), 100)}%`,
              backgroundColor: netPositive ? 'var(--chart-accent)' : 'var(--chart-negative)',
            }}
          />
        </div>
        <span className={`w-14 text-right text-sm tabular-nums font-medium ${
          netPositive ? 'text-[var(--chart-positive)]' : 'text-[var(--chart-negative)]'
        }`}>
          {netCashFlow < 0 ? '-' : ''}{fmt(netCashFlow)}
        </span>
        <span className="w-12 text-right text-[10px] tabular-nums text-[var(--chart-axis-text)] hidden sm:block">
          {netPct.toFixed(1)}%
        </span>
      </div>
    </div>
  )
}
