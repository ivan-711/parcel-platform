/** Deal comparison page — side-by-side analysis of two deals with winner highlighting. */

import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { AlertTriangle } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { StrategyBadge } from '@/components/ui/StrategyBadge'
import { SkeletonCard } from '@/components/ui/SkeletonCard'
import { ComparisonRadar } from '@/components/charts/ComparisonRadar'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useDeals, useDeal } from '@/hooks/useDeals'
import { formatLabel, formatOutputValue } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { Strategy, DealResponse } from '@/types'

/** Output keys where a higher numeric value is better. */
const HIGHER_IS_BETTER = new Set([
  'mao', 'profit_at_ask', 'estimated_profit', 'arv', 'spread',
  'monthly_cash_flow', 'coc_return', 'cap_rate',
  'annual_cash_flow', 'equity_day_one',
  'gross_profit', 'net_profit', 'roi', 'annualized_roi',
  'refinance_proceeds', 'arv_post_rehab',
  'annual_noi', 'effective_yield', 'dscr', 'equity_captured',
])

/** Output keys where a lower numeric value is better. */
const LOWER_IS_BETTER = new Set([
  'risk_score', 'money_left_in', 'total_cost', 'total_invested',
  'repair_costs', 'holding_months', 'break_even_price',
])

/** Strategy-specific output keys to display in the comparison table. */
const STRATEGY_ROWS: Record<string, string[]> = {
  wholesale: ['mao', 'profit_at_ask', 'estimated_profit', 'arv', 'repair_costs', 'spread', 'break_even_price'],
  buy_and_hold: ['monthly_cash_flow', 'coc_return', 'cap_rate', 'purchase_price', 'annual_noi', 'dscr'],
  brrrr: ['monthly_cash_flow', 'money_left_in', 'refinance_proceeds', 'total_invested', 'arv_post_rehab', 'equity_captured', 'coc_return'],
  flip: ['gross_profit', 'net_profit', 'roi', 'annualized_roi', 'total_cost', 'arv', 'holding_months'],
  creative_finance: ['monthly_cash_flow', 'annual_cash_flow', 'equity_day_one', 'finance_type', 'dscr', 'effective_yield'],
}

function getNumericValue(deal: DealResponse, key: string): number | null {
  if (key === 'risk_score') return deal.risk_score
  const val = deal.outputs?.[key]
  return typeof val === 'number' ? val : null
}

function riskScoreColor(score: number | null): string {
  if (score === null) return 'text-text-muted'
  if (score <= 30) return 'text-accent-success'
  if (score <= 60) return 'text-yellow-400'
  return 'text-accent-danger'
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function statusLabel(status: string): string {
  return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

export default function ComparePage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const dealAId = searchParams.get('a') ?? ''
  const dealBId = searchParams.get('b') ?? ''

  const { data: allDeals, isLoading: loadingList, isError } = useDeals({ per_page: 100 })
  const { data: dealA, isLoading: loadingA } = useDeal(dealAId)
  const { data: dealB, isLoading: loadingB } = useDeal(dealBId)

  const dealOptions = useMemo(() => allDeals ?? [], [allDeals])

  /** Filter Deal B options to same strategy as Deal A (if Deal A is selected). */
  const dealBOptions = useMemo(() => {
    if (!dealA) return dealOptions
    return dealOptions.filter((d) => d.strategy === dealA.strategy && d.id !== dealA.id)
  }, [dealA, dealOptions])

  const handleSelectA = (id: string) => {
    const params = new URLSearchParams(searchParams)
    params.set('a', id)
    // Clear B if its strategy no longer matches
    if (dealBId) {
      const selectedA = dealOptions.find((d) => d.id === id)
      const currentB = dealOptions.find((d) => d.id === dealBId)
      if (selectedA && currentB && selectedA.strategy !== currentB.strategy) {
        params.delete('b')
      }
    }
    setSearchParams(params)
  }

  const handleSelectB = (id: string) => {
    const params = new URLSearchParams(searchParams)
    params.set('b', id)
    setSearchParams(params)
  }

  /** Determine which rows to show based on strategies. */
  const strategyRows = useMemo(() => {
    if (!dealA && !dealB) return []
    const stratA = dealA?.strategy
    const stratB = dealB?.strategy
    const keysA = stratA ? (STRATEGY_ROWS[stratA] ?? []) : []
    const keysB = stratB ? (STRATEGY_ROWS[stratB] ?? []) : []
    // Union of both strategy rows, preserving order from A first
    const seen = new Set<string>()
    const combined: string[] = []
    for (const k of [...keysA, ...keysB]) {
      if (!seen.has(k)) {
        seen.add(k)
        combined.push(k)
      }
    }
    return combined
  }, [dealA, dealB])

  const crossStrategy = dealA && dealB && dealA.strategy !== dealB.strategy

  const isLoading = loadingList || (dealAId && loadingA) || (dealBId && loadingB)

  return (
    <AppShell title="Compare Deals">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="max-w-5xl mx-auto space-y-6"
      >
        <h1 className="text-2xl font-semibold text-text-primary">Compare Deals</h1>

        {/* Deal selectors */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-text-muted uppercase tracking-wide">Deal A</label>
            <Select value={dealAId || undefined} onValueChange={handleSelectA}>
              <SelectTrigger className="bg-app-surface border-border-subtle text-text-primary text-sm">
                <SelectValue placeholder="Select a deal..." />
              </SelectTrigger>
              <SelectContent className="bg-app-surface border-border-subtle max-h-[300px]">
                {loadingList ? (
                  <div className="px-3 py-2 text-sm text-text-muted">Loading deals...</div>
                ) : isError ? (
                  <div className="px-3 py-2 text-sm text-accent-danger">Failed to load deals</div>
                ) : dealOptions.length === 0 ? (
                  <div className="px-3 py-2 text-sm text-text-muted">No deals found</div>
                ) : (
                  dealOptions.map((d) => (
                    <SelectItem
                      key={d.id}
                      value={d.id}
                      className="text-text-primary text-sm focus:bg-app-elevated focus:text-text-primary"
                    >
                      <span className="flex items-center gap-2">
                        {d.address}
                        <StrategyBadge strategy={d.strategy as Strategy} />
                      </span>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-text-muted uppercase tracking-wide">Deal B</label>
            <Select value={dealBId || undefined} onValueChange={handleSelectB} disabled={!dealAId}>
              <SelectTrigger className="bg-app-surface border-border-subtle text-text-primary text-sm">
                <SelectValue placeholder={dealAId ? 'Select a deal...' : 'Select Deal A first'} />
              </SelectTrigger>
              <SelectContent className="bg-app-surface border-border-subtle max-h-[300px]">
                {dealBOptions.length === 0 ? (
                  <div className="px-3 py-2 text-sm text-text-muted">No other deals with this strategy</div>
                ) : (
                  dealBOptions.map((d) => (
                    <SelectItem
                      key={d.id}
                      value={d.id}
                      className="text-text-primary text-sm focus:bg-app-elevated focus:text-text-primary"
                    >
                      <span className="flex items-center gap-2">
                        {d.address}
                        <StrategyBadge strategy={d.strategy as Strategy} />
                      </span>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Loading skeleton */}
        {isLoading && (
          <div className="space-y-4">
            <SkeletonCard lines={8} />
          </div>
        )}

        {/* Cross-strategy warning */}
        {crossStrategy && (
          <div className="flex items-center gap-3 rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-4 py-3">
            <AlertTriangle size={16} className="text-yellow-400 shrink-0" />
            <p className="text-sm text-yellow-300">
              These deals use different strategies — comparison may not be meaningful
            </p>
          </div>
        )}

        {/* Radar chart — shown when both deals are loaded */}
        {!isLoading && dealA && dealB && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut', delay: 0.1 }}
          >
            <ComparisonRadar
              deals={[dealA, dealB].map((d) => ({
                id: d.id,
                address: d.address,
                strategy: d.strategy as Strategy,
                outputs: d.outputs as Record<string, number | string>,
                riskScore: d.risk_score,
              }))}
            />
          </motion.div>
        )}

        {/* Comparison table */}
        {!isLoading && (dealA || dealB) && (
          <div className="rounded-xl border border-border-subtle bg-app-surface overflow-hidden">
            {/* Common rows */}
            <ComparisonRow label="Address" valueA={dealA?.address ?? '—'} valueB={dealB?.address} />
            <ComparisonRow
              label="Strategy"
              valueA={dealA ? <StrategyBadge strategy={dealA.strategy as Strategy} /> : '—'}
              valueB={dealB ? <StrategyBadge strategy={dealB.strategy as Strategy} /> : undefined}
            />
            <ComparisonRow
              label="Risk Score"
              valueA={
                dealA ? (
                  <span className={cn('font-mono font-semibold', riskScoreColor(dealA.risk_score))}>
                    {dealA.risk_score ?? '—'}
                  </span>
                ) : '—'
              }
              valueB={
                dealB ? (
                  <span className={cn('font-mono font-semibold', riskScoreColor(dealB.risk_score))}>
                    {dealB.risk_score ?? '—'}
                  </span>
                ) : undefined
              }
              winnerSide={getWinnerSide(dealA?.risk_score ?? null, dealB?.risk_score ?? null, 'risk_score')}
            />
            <ComparisonRow
              label="Status"
              valueA={dealA ? statusLabel(dealA.status) : '—'}
              valueB={dealB ? statusLabel(dealB.status) : undefined}
            />
            <ComparisonRow
              label="Created"
              valueA={dealA ? formatDate(dealA.created_at) : '—'}
              valueB={dealB ? formatDate(dealB.created_at) : undefined}
            />

            {/* Divider */}
            {strategyRows.length > 0 && (
              <div className="px-4 py-2.5 bg-app-elevated border-y border-border-subtle">
                <p className="text-xs font-semibold text-text-muted uppercase tracking-wide">Strategy Outputs</p>
              </div>
            )}

            {/* Strategy-specific rows */}
            {strategyRows.map((key) => {
              const valA = dealA ? dealA.outputs?.[key] : undefined
              const valB = dealB ? dealB.outputs?.[key] : undefined
              const numA = dealA ? getNumericValue(dealA, key) : null
              const numB = dealB ? getNumericValue(dealB, key) : null

              return (
                <ComparisonRow
                  key={key}
                  label={formatLabel(key)}
                  valueA={
                    dealA ? (
                      <span className="font-mono">{formatOutputValue(key, valA as number | string | null | undefined)}</span>
                    ) : '—'
                  }
                  valueB={
                    dealB ? (
                      <span className="font-mono">{formatOutputValue(key, valB as number | string | null | undefined)}</span>
                    ) : undefined
                  }
                  winnerSide={getWinnerSide(numA, numB, key)}
                />
              )
            })}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !dealA && !dealB && (
          <div className="flex flex-col items-center justify-center py-16 space-y-3">
            <p className="text-sm text-text-muted">Select two deals above to compare their analysis results side by side.</p>
          </div>
        )}
      </motion.div>
    </AppShell>
  )
}

/** Determine which side "wins" for a given metric. */
function getWinnerSide(a: number | null, b: number | null, key: string): 'a' | 'b' | null {
  if (a === null || b === null || a === b) return null
  if (HIGHER_IS_BETTER.has(key)) return a > b ? 'a' : 'b'
  if (LOWER_IS_BETTER.has(key)) return a < b ? 'a' : 'b'
  return null
}

/** Single comparison row with optional winner highlighting. */
function ComparisonRow({
  label,
  valueA,
  valueB,
  winnerSide,
}: {
  label: string
  valueA: React.ReactNode
  valueB?: React.ReactNode
  winnerSide?: 'a' | 'b' | null
}) {
  return (
    <div className="grid grid-cols-[180px_1fr_1fr] border-b border-border-subtle last:border-0">
      <div className="px-4 py-3 text-sm text-text-secondary bg-app-elevated/30">
        {label}
      </div>
      <div
        className={cn(
          'px-4 py-3 text-sm text-text-primary',
          winnerSide === 'a' && 'border-l-2 border-[#10B981]'
        )}
      >
        {valueA}
      </div>
      <div
        className={cn(
          'px-4 py-3 text-sm text-text-primary border-l border-border-subtle',
          winnerSide === 'b' && 'border-l-2 border-[#10B981]'
        )}
      >
        {valueB ?? <span className="text-text-muted">Select a deal to compare</span>}
      </div>
    </div>
  )
}
