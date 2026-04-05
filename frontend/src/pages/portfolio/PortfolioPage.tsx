/** Portfolio dashboard — property-centric overview with charts and sortable table. */

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Landmark, ArrowUpDown } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { EmptyState } from '@/components/EmptyState'
import { SkeletonCard } from '@/components/ui/SkeletonCard'
import { cn } from '@/lib/utils'
import { usePortfolioOverview } from '@/hooks/usePortfolio'
import EquityGrowthChart from '@/components/portfolio/EquityGrowthChart'
import StrategyAllocationChart from '@/components/portfolio/StrategyAllocationChart'
import CashFlowBenchmarkChart from '@/components/portfolio/CashFlowBenchmarkChart'
import IncomeExpenseChart from '@/components/portfolio/IncomeExpenseChart'

/* -- Helpers -- */

function fmt$(v: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(v)
}

function fmtPct(v: number | null | undefined): string {
  if (v === null || v === undefined) return '—'
  return `${v.toFixed(1)}%`
}

/* -- Strategy badge -- */

const STRATEGY_BADGE: Record<string, { label: string; bg: string; text: string }> = {
  buy_and_hold: { label: 'Buy & Hold', bg: 'bg-[#8B7AFF]/15', text: 'text-[#8B7AFF]' },
  brrrr:        { label: 'BRRRR',      bg: 'bg-[#60A5FA]/15', text: 'text-[#60A5FA]' },
  creative_finance: { label: 'Creative Finance', bg: 'bg-[#2DD4BF]/15', text: 'text-[#2DD4BF]' },
  flip:         { label: 'Flip',        bg: 'bg-[#FBBF24]/15', text: 'text-[#FBBF24]' },
  wholesale:    { label: 'Wholesale',   bg: 'bg-[#F87171]/15', text: 'text-[#F87171]' },
}

function StrategyBadge({ strategy }: { strategy: string | null }) {
  if (!strategy) return <span className="text-[#8A8580]">—</span>
  const cfg = STRATEGY_BADGE[strategy]
  if (!cfg) return <span className="text-[#8A8580]">{strategy}</span>
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium', cfg.bg, cfg.text)}>
      {cfg.label}
    </span>
  )
}

/* -- Sortable table types -- */

type SortKey =
  | 'address'
  | 'estimated_value'
  | 'equity'
  | 'monthly_cash_flow'
  | 'cap_rate'
  | 'coc_return'
  | 'strategy'
  | 'instruments_count'

type SortDir = 'asc' | 'desc'

interface PropertyRow {
  id: string
  address: string
  estimated_value: number
  equity: number
  monthly_cash_flow: number
  cap_rate: number | null
  coc_return: number | null
  strategy: string | null
  instruments_count: number
}

function sortProperties(rows: PropertyRow[], key: SortKey, dir: SortDir): PropertyRow[] {
  return [...rows].sort((a, b) => {
    const av = a[key] ?? -Infinity
    const bv = b[key] ?? -Infinity
    if (av < bv) return dir === 'asc' ? -1 : 1
    if (av > bv) return dir === 'asc' ? 1 : -1
    return 0
  })
}

/* -- KPI Dot -- */

function StatusDot({ color }: { color: 'green' | 'yellow' | 'red' | 'neutral' }) {
  const fill = {
    green: 'bg-[#4ADE80]',
    yellow: 'bg-[#FBBF24]',
    red: 'bg-[#F87171]',
    neutral: 'bg-[#8A8580]',
  }[color]
  return <span className={cn('inline-block w-2 h-2 rounded-full mr-2', fill)} />
}

/* -- Main Page -- */

export default function PortfolioPage() {
  const { data, isLoading, isError } = usePortfolioOverview()
  const [sortBy, setSortBy] = useState<SortKey>('monthly_cash_flow')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  function toggleSort(key: SortKey) {
    if (sortBy === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortBy(key)
      setSortDir('desc')
    }
  }

  /* Loading */
  if (isLoading) {
    return (
      <AppShell title="Portfolio">
        <div className="space-y-6">
          <SkeletonCard lines={3} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <SkeletonCard lines={4} />
            <SkeletonCard lines={4} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonCard key={i} lines={2} />
            ))}
          </div>
          <SkeletonCard lines={6} />
        </div>
      </AppShell>
    )
  }

  /* Error */
  if (isError || !data) {
    return (
      <AppShell title="Portfolio">
        <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-[#F87171]/10 flex items-center justify-center">
            <Landmark className="w-6 h-6 text-[#F87171]" />
          </div>
          <p className="text-base font-medium text-[#F0EDE8]">Failed to load portfolio</p>
          <p className="text-sm text-[#C5C0B8]">Check your connection and try again.</p>
        </div>
      </AppShell>
    )
  }

  const { summary, properties, equity_history, cash_flow_history, allocation } = data

  /* Empty state */
  if (summary.total_properties === 0) {
    return (
      <AppShell title="Portfolio">
        <EmptyState
          icon={Landmark}
          heading="No owned properties yet"
          description="Properties with status 'owned' will appear here."
        />
      </AppShell>
    )
  }

  /* KPI threshold helpers */
  const ltvColor: 'green' | 'yellow' | 'red' =
    summary.ltv_ratio < 70 ? 'green' : summary.ltv_ratio < 80 ? 'yellow' : 'red'
  const capColor: 'green' | 'yellow' | 'red' =
    summary.avg_cap_rate > 7 ? 'green' : summary.avg_cap_rate > 5 ? 'yellow' : 'red'
  const cfColor = summary.total_monthly_cash_flow >= 0 ? 'green' as const : 'red' as const

  /* Sorted properties */
  const sorted = sortProperties(
    properties.map((p) => ({
      id: p.id,
      address: p.address,
      estimated_value: p.estimated_value,
      equity: p.equity,
      monthly_cash_flow: p.monthly_cash_flow,
      cap_rate: p.cap_rate,
      coc_return: p.coc_return,
      strategy: p.strategy,
      instruments_count: p.instruments_count,
    })),
    sortBy,
    sortDir,
  )

  /* Column header */
  function ColHeader({ label, field, align }: { label: string; field: SortKey; align?: 'right' }) {
    const active = sortBy === field
    return (
      <th
        className={cn(
          'px-4 py-3 text-xs font-medium uppercase tracking-wider cursor-pointer select-none hover:text-[#F0EDE8] transition-colors',
          align === 'right' ? 'text-right' : 'text-left',
          active ? 'text-[#F0EDE8]' : 'text-[#8A8580]',
        )}
        onClick={() => toggleSort(field)}
      >
        <span className="inline-flex items-center gap-1">
          {label}
          <ArrowUpDown size={12} className={active ? 'text-[#8B7AFF]' : 'opacity-30'} />
        </span>
      </th>
    )
  }

  return (
    <AppShell title="Portfolio">
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1
            className="text-2xl sm:text-3xl text-[#F0EDE8]"
            style={{ fontFamily: 'Satoshi, sans-serif', fontWeight: 300 }}
          >
            Portfolio
          </h1>
          <p className="text-sm text-[#8A8580] mt-1">
            {summary.total_properties} Properties &middot; {fmt$(summary.total_estimated_value)}
          </p>
        </div>

        {/* Hero Card */}
        <div className="bg-[#141311] border border-[#1E1D1B] rounded-xl p-6 sm:p-8 shadow-xs border-l-4 border-l-[#8B7AFF]">
          <p className="text-xs font-medium uppercase tracking-wider text-[#8A8580] mb-2">
            Portfolio Equity
          </p>
          <p
            className="text-3xl sm:text-4xl text-[#F0EDE8] tabular-nums"
            style={{ fontFamily: 'Satoshi, sans-serif', fontWeight: 300 }}
          >
            {fmt$(summary.total_equity)}
          </p>
          <p className="text-sm text-[#C5C0B8] mt-2 tabular-nums">
            CoC Return: {fmtPct(summary.avg_coc_return)}
          </p>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-[#141311] border border-[#1E1D1B] rounded-xl p-5 shadow-xs">
            <p className="text-xs font-medium uppercase tracking-wider text-[#8A8580] mb-4">
              Equity Growth
            </p>
            <EquityGrowthChart data={equity_history} />
          </div>
          <div className="bg-[#141311] border border-[#1E1D1B] rounded-xl p-5 shadow-xs">
            <p className="text-xs font-medium uppercase tracking-wider text-[#8A8580] mb-4">
              Strategy Allocation
            </p>
            <StrategyAllocationChart byStrategy={allocation.by_strategy} byValue={allocation.by_value} />
          </div>
        </div>

        {/* Cash Flow Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-[#141311] border border-[#1E1D1B] rounded-xl p-5 shadow-xs">
            <p className="text-xs font-medium uppercase tracking-wider text-[#8A8580] mb-4">
              Cash Flow by Property
            </p>
            <CashFlowBenchmarkChart
              properties={properties.map((p) => ({
                address: p.address,
                monthly_cash_flow: p.monthly_cash_flow,
              }))}
            />
          </div>
          <div className="bg-[#141311] border border-[#1E1D1B] rounded-xl p-5 shadow-xs">
            <p className="text-xs font-medium uppercase tracking-wider text-[#8A8580] mb-4">
              Income vs Expenses
            </p>
            <IncomeExpenseChart data={cash_flow_history} />
          </div>
        </div>

        {/* KPI Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* LTV */}
          <div className="bg-[#141311] border border-[#1E1D1B] rounded-xl p-5 shadow-xs">
            <p className="text-xs font-medium uppercase tracking-wider text-[#8A8580] mb-2">
              LTV Ratio
            </p>
            <p className="text-xl text-[#F0EDE8] tabular-nums flex items-center">
              <StatusDot color={ltvColor} />
              {fmtPct(summary.ltv_ratio)}
            </p>
          </div>
          {/* Avg Cap Rate */}
          <div className="bg-[#141311] border border-[#1E1D1B] rounded-xl p-5 shadow-xs">
            <p className="text-xs font-medium uppercase tracking-wider text-[#8A8580] mb-2">
              Avg Cap Rate
            </p>
            <p className="text-xl text-[#F0EDE8] tabular-nums flex items-center">
              <StatusDot color={capColor} />
              {fmtPct(summary.avg_cap_rate)}
            </p>
          </div>
          {/* Monthly CF */}
          <div className="bg-[#141311] border border-[#1E1D1B] rounded-xl p-5 shadow-xs">
            <p className="text-xs font-medium uppercase tracking-wider text-[#8A8580] mb-2">
              Monthly Cash Flow
            </p>
            <p className={cn('text-xl tabular-nums flex items-center', cfColor === 'green' ? 'text-[#4ADE80]' : 'text-[#F87171]')}>
              <StatusDot color={cfColor} />
              {fmt$(summary.total_monthly_cash_flow)}
            </p>
          </div>
          {/* Annual CF */}
          <div className="bg-[#141311] border border-[#1E1D1B] rounded-xl p-5 shadow-xs">
            <p className="text-xs font-medium uppercase tracking-wider text-[#8A8580] mb-2">
              Annual Cash Flow
            </p>
            <p className="text-xl text-[#F0EDE8] tabular-nums">
              {fmt$(summary.total_annual_cash_flow)}
            </p>
          </div>
        </div>

        {/* Property Performance Table */}
        <div className="space-y-3">
          <h2
            className="text-lg text-[#F0EDE8]"
            style={{ fontFamily: 'Satoshi, sans-serif', fontWeight: 300 }}
          >
            Property Performance
          </h2>

          <div className="rounded-xl border border-[#1E1D1B] bg-[#141311] overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#1E1D1B]">
                    <ColHeader label="Property" field="address" />
                    <ColHeader label="Value" field="estimated_value" align="right" />
                    <ColHeader label="Equity" field="equity" align="right" />
                    <ColHeader label="Monthly CF" field="monthly_cash_flow" align="right" />
                    <ColHeader label="Cap Rate" field="cap_rate" align="right" />
                    <ColHeader label="CoC Return" field="coc_return" align="right" />
                    <ColHeader label="Strategy" field="strategy" />
                    <ColHeader label="Instruments" field="instruments_count" align="right" />
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((p) => (
                    <tr
                      key={p.id}
                      className="border-b border-[#1E1D1B]/50 last:border-0 hover:bg-[#1E1D1B]/30 transition-colors"
                    >
                      <td className="px-4 py-3 text-sm">
                        <Link
                          to={`/properties/${p.id}`}
                          className="text-[#F0EDE8] hover:text-[#8B7AFF] transition-colors"
                        >
                          {p.address}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-[#F0EDE8] tabular-nums">
                        {fmt$(p.estimated_value)}
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-[#F0EDE8] tabular-nums">
                        {fmt$(p.equity)}
                      </td>
                      <td className={cn(
                        'px-4 py-3 text-sm text-right tabular-nums',
                        p.monthly_cash_flow >= 0 ? 'text-[#4ADE80]' : 'text-[#F87171]',
                      )}>
                        {fmt$(p.monthly_cash_flow)}
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-[#C5C0B8] tabular-nums">
                        {fmtPct(p.cap_rate)}
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-[#C5C0B8] tabular-nums">
                        {fmtPct(p.coc_return)}
                      </td>
                      <td className="px-4 py-3">
                        <StrategyBadge strategy={p.strategy} />
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-[#C5C0B8] tabular-nums">
                        {p.instruments_count}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  )
}
