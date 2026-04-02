/**
 * ComparePage — side-by-side deal comparison with glass KPI cards,
 * radar chart visualization, and automated summary verdict.
 */

import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { AlertTriangle, Scale, X } from 'lucide-react'
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

// ── Winner Logic ────────────────────────────────────────────────────────────

type MetricDirection = 'higher-is-better' | 'lower-is-better'

const METRIC_DIRECTIONS: Record<string, MetricDirection> = {
  // Higher is better
  mao: 'higher-is-better',
  profit_at_ask: 'higher-is-better',
  estimated_profit: 'higher-is-better',
  arv: 'higher-is-better',
  spread: 'higher-is-better',
  monthly_cash_flow: 'higher-is-better',
  coc_return: 'higher-is-better',
  cap_rate: 'higher-is-better',
  annual_cash_flow: 'higher-is-better',
  equity_day_one: 'higher-is-better',
  gross_profit: 'higher-is-better',
  net_profit: 'higher-is-better',
  roi: 'higher-is-better',
  annualized_roi: 'higher-is-better',
  refinance_proceeds: 'higher-is-better',
  arv_post_rehab: 'higher-is-better',
  annual_noi: 'higher-is-better',
  effective_yield: 'higher-is-better',
  dscr: 'higher-is-better',
  equity_captured: 'higher-is-better',
  // Lower is better
  risk_score: 'lower-is-better',
  money_left_in: 'lower-is-better',
  total_cost: 'lower-is-better',
  total_invested: 'lower-is-better',
  repair_costs: 'lower-is-better',
  holding_months: 'lower-is-better',
  break_even_price: 'lower-is-better',
  purchase_price: 'lower-is-better',
  break_even_rent: 'lower-is-better',
  cash_needed: 'lower-is-better',
}

/** Returns index of winner, or -1 if too close to call. */
function findWinner(values: (number | null)[], key: string, threshold = 0.05): number {
  const direction = METRIC_DIRECTIONS[key]
  if (!direction) return -1

  const nums = values.map((v) => (v !== null && !isNaN(v) ? v : null))
  const valid = nums.filter((v): v is number => v !== null)
  if (valid.length < 2) return -1

  const best = direction === 'higher-is-better' ? Math.max(...valid) : Math.min(...valid)
  const bestIdx = nums.indexOf(best)

  // All values identical → no winner
  if (valid.every((v) => v === best)) return -1

  const rest = valid.filter((v) => v !== best)
  if (rest.length === 0) return -1
  const secondBest = direction === 'higher-is-better' ? Math.max(...rest) : Math.min(...rest)
  const ratio = Math.abs(best - secondBest) / Math.max(Math.abs(best), 1)
  if (ratio < threshold) return -1
  return bestIdx
}

function getNumericValue(deal: DealResponse, key: string): number | null {
  if (key === 'risk_score') return deal.risk_score
  const val = deal.outputs?.[key]
  if (typeof val === 'number') return isNaN(val) ? null : val
  if (typeof val === 'string') { const n = parseFloat(val); return isNaN(n) ? null : n }
  return null
}

// ── Strategy Row Keys ───────────────────────────────────────────────────────

const STRATEGY_ROWS: Record<string, string[]> = {
  wholesale: ['mao', 'profit_at_ask', 'estimated_profit', 'arv', 'repair_costs', 'spread', 'break_even_price'],
  buy_and_hold: ['monthly_cash_flow', 'coc_return', 'cap_rate', 'purchase_price', 'annual_noi', 'dscr'],
  brrrr: ['monthly_cash_flow', 'money_left_in', 'refinance_proceeds', 'total_invested', 'arv_post_rehab', 'equity_captured', 'coc_return'],
  flip: ['gross_profit', 'net_profit', 'roi', 'annualized_roi', 'total_cost', 'arv', 'holding_months'],
  creative_finance: ['monthly_cash_flow', 'annual_cash_flow', 'equity_day_one', 'finance_type', 'dscr', 'effective_yield'],
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function truncateAddr(addr: string, max = 28): string {
  return addr.length > max ? addr.slice(0, max) + '...' : addr
}

function riskScoreColor(score: number | null): string {
  if (score === null) return 'text-text-muted'
  if (score <= 30) return 'text-[#6DBEA3]'
  if (score <= 60) return 'text-[#D4A867]'
  return 'text-[#D4766A]'
}

// ── KPI Comparison Card ─────────────────────────────────────────────────────

function KPICompareCard({
  metricKey,
  label,
  deals,
}: {
  metricKey: string
  label: string
  deals: DealResponse[]
}) {
  const values = deals.map((d) => getNumericValue(d, metricKey))
  const winnerIdx = findWinner(values, metricKey)

  return (
    <div className="bg-app-surface border border-border-strong rounded-xl p-5 shadow-xs edge-highlight">
      <p className="text-[11px] uppercase tracking-[0.08em] font-medium text-text-secondary mb-4">
        {label}
      </p>
      <div className="flex gap-6">
        {deals.map((deal, i) => {
          const raw = metricKey === 'risk_score' ? deal.risk_score : deal.outputs?.[metricKey]
          const numericRaw = typeof raw === 'string' ? parseFloat(raw as string) : raw
          const isNullish = raw === null || raw === undefined || (typeof numericRaw === 'number' && isNaN(numericRaw))
          const isWinner = winnerIdx === i

          const displayValue = isNullish
            ? 'N/A'
            : metricKey === 'risk_score'
              ? String(deal.risk_score)
              : formatOutputValue(metricKey, raw as number | string)

          return (
            <div key={deal.id} className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                {isWinner && (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-[#8B7AFF] shrink-0" aria-hidden="true" />
                    <span className="sr-only">(Best value)</span>
                  </>
                )}
                <p
                  className={cn(
                    'font-brand text-2xl md:text-3xl font-light tabular-nums truncate',
                    isNullish
                      ? 'text-text-muted'
                      : metricKey === 'risk_score'
                        ? riskScoreColor(deal.risk_score)
                        : isWinner ? 'text-text-primary' : 'text-text-secondary'
                  )}
                >
                  {displayValue}
                </p>
              </div>
              <p className="text-[11px] text-text-secondary mt-1 truncate">
                {truncateAddr(deal.address)}
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Summary Verdict ─────────────────────────────────────────────────────────

function SummaryVerdict({
  deals,
  metricKeys,
}: {
  deals: DealResponse[]
  metricKeys: string[]
}) {
  const results = useMemo(() => {
    const wins: number[] = deals.map(() => 0)
    const perMetric: Array<{ label: string; winnerIdx: number }> = []

    for (const key of metricKeys) {
      if (key === 'finance_type') continue
      const values = deals.map((d) => getNumericValue(d, key))
      const w = findWinner(values, key)
      if (w >= 0) {
        wins[w]++
        perMetric.push({ label: formatLabel(key), winnerIdx: w })
      }
    }

    // Also count risk_score
    const riskValues = deals.map((d) => d.risk_score)
    const riskWinner = findWinner(riskValues, 'risk_score')
    if (riskWinner >= 0) {
      wins[riskWinner]++
      perMetric.push({ label: 'Risk Score', winnerIdx: riskWinner })
    }

    const maxWins = Math.max(...wins)
    const overallWinner = wins.filter((w) => w === maxWins).length === 1
      ? wins.indexOf(maxWins)
      : -1

    return { wins, perMetric, overallWinner }
  }, [deals, metricKeys])

  if (results.perMetric.length === 0) {
    return (
      <div className="bg-app-surface border border-border-strong rounded-xl p-6 shadow-xs edge-highlight">
        <p className="text-[11px] uppercase tracking-[0.08em] font-medium text-text-secondary mb-3">Summary</p>
        <p className="text-sm text-text-secondary">These deals are closely matched across all metrics.</p>
      </div>
    )
  }

  return (
    <div className="bg-app-surface border border-border-strong rounded-xl p-6 shadow-xs edge-highlight">
      <p className="text-[11px] uppercase tracking-[0.08em] font-medium text-text-secondary mb-4">Summary</p>
      <div className="space-y-2">
        {results.perMetric.map(({ label, winnerIdx }) => (
          <p key={label} className="text-sm text-text-secondary">
            <span className="text-text-primary">{truncateAddr(deals[winnerIdx].address)}</span>
            {' '}wins on {label}
          </p>
        ))}
      </div>
      {results.overallWinner >= 0 && (
        <div className="mt-4 pt-4 border-t border-border-subtle">
          <div className="border-l-2 border-[#8B7AFF] pl-3">
            <p className="text-sm text-text-primary">
              {truncateAddr(deals[results.overallWinner].address)} leads overall with {results.wins[results.overallWinner]} metric wins
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main Page ───────────────────────────────────────────────────────────────

export default function ComparePage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const dealAId = searchParams.get('a') ?? ''
  const dealBId = searchParams.get('b') ?? ''

  const { data: allDeals, isLoading: loadingList, isError } = useDeals({ per_page: 100 })
  const { data: dealA, isLoading: loadingA, isError: errorA } = useDeal(dealAId)
  const { data: dealB, isLoading: loadingB, isError: errorB } = useDeal(dealBId)

  const dealOptions = useMemo(() => allDeals ?? [], [allDeals])

  const dealBOptions = useMemo(() => {
    if (!dealA) return dealOptions
    return dealOptions.filter((d) => d.strategy === dealA.strategy && d.id !== dealA.id)
  }, [dealA, dealOptions])

  const handleSelectA = (id: string) => {
    const params = new URLSearchParams(searchParams)
    params.set('a', id)
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

  const handleClearA = () => {
    const params = new URLSearchParams(searchParams)
    params.delete('a')
    params.delete('b')
    setSearchParams(params)
  }

  const handleClearB = () => {
    const params = new URLSearchParams(searchParams)
    params.delete('b')
    setSearchParams(params)
  }

  const strategyRows = useMemo(() => {
    if (!dealA && !dealB) return []
    const stratA = dealA?.strategy
    const stratB = dealB?.strategy
    const keysA = stratA ? (STRATEGY_ROWS[stratA] ?? []) : []
    const keysB = stratB ? (STRATEGY_ROWS[stratB] ?? []) : []
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
  const bothLoaded = dealA && dealB
  const deals = bothLoaded ? [dealA, dealB] : []
  const isLoading = loadingList || (!!dealAId && loadingA) || (!!dealBId && loadingB)

  return (
    <AppShell title="Compare Deals">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="max-w-5xl mx-auto space-y-8"
      >
        {/* Header */}
        <div>
          <h1 className="font-brand text-3xl font-light tracking-[-0.02em] text-text-primary">
            Compare Deals
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            Select deals to compare side by side
          </p>
        </div>

        {/* Deal selectors */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Deal A */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-medium text-text-secondary uppercase tracking-[0.08em]">Deal A</label>
            <div className="flex gap-2">
              <Select value={dealAId || undefined} onValueChange={handleSelectA}>
                <SelectTrigger className="bg-app-surface border-border-default text-text-primary text-sm flex-1">
                  <SelectValue placeholder="Select a deal..." />
                </SelectTrigger>
                <SelectContent className="bg-app-elevated border-border-default max-h-[300px]">
                  {loadingList ? (
                    <div className="px-3 py-2 text-sm text-text-secondary">Loading deals...</div>
                  ) : isError ? (
                    <div className="px-3 py-2 text-sm text-[#D4766A]">Failed to load deals</div>
                  ) : dealOptions.length === 0 ? (
                    <div className="px-3 py-2 text-sm text-text-secondary">No deals found</div>
                  ) : (
                    dealOptions.map((d) => (
                      <SelectItem
                        key={d.id}
                        value={d.id}
                        className="text-text-primary text-sm focus:bg-layer-2 focus:text-text-primary"
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
              {dealAId && (
                <button
                  onClick={handleClearA}
                  className="p-2 rounded-lg border border-border-default text-text-secondary hover:text-text-primary hover:bg-layer-2 transition-colors shrink-0"
                  aria-label="Clear Deal A"
                >
                  <X size={16} />
                </button>
              )}
            </div>
            {dealA && (
              <div className="flex items-center gap-2 mt-1">
                <StrategyBadge strategy={dealA.strategy as Strategy} />
                <span className="text-xs text-text-secondary">{truncateAddr(dealA.address, 40)}</span>
              </div>
            )}
          </div>

          {/* Deal B */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-medium text-text-secondary uppercase tracking-[0.08em]">Deal B</label>
            <div className="flex gap-2">
              <Select value={dealBId || undefined} onValueChange={handleSelectB} disabled={!dealAId}>
                <SelectTrigger className="bg-app-surface border-border-default text-text-primary text-sm flex-1">
                  <SelectValue placeholder={dealAId ? 'Select a deal...' : 'Select Deal A first'} />
                </SelectTrigger>
                <SelectContent className="bg-app-elevated border-border-default max-h-[300px]">
                  {dealBOptions.length === 0 ? (
                    <div className="px-3 py-2 text-sm text-text-secondary">No other deals with this strategy</div>
                  ) : (
                    dealBOptions.map((d) => (
                      <SelectItem
                        key={d.id}
                        value={d.id}
                        className="text-text-primary text-sm focus:bg-layer-2 focus:text-text-primary"
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
              {dealBId && (
                <button
                  onClick={handleClearB}
                  className="p-2 rounded-lg border border-border-default text-text-secondary hover:text-text-primary hover:bg-layer-2 transition-colors shrink-0"
                  aria-label="Clear Deal B"
                >
                  <X size={16} />
                </button>
              )}
            </div>
            {dealB && (
              <div className="flex items-center gap-2 mt-1">
                <StrategyBadge strategy={dealB.strategy as Strategy} />
                <span className="text-xs text-text-secondary">{truncateAddr(dealB.address, 40)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} lines={2} />
            ))}
          </div>
        )}

        {/* Error */}
        {(errorA || errorB) && (
          <div className="flex items-center gap-3 rounded-xl border border-[#D4766A]/20 bg-[#D4766A]/10 px-4 py-3">
            <AlertTriangle size={16} className="text-[#D4766A] shrink-0" />
            <p className="text-sm text-text-secondary">
              Failed to load {errorA && errorB ? 'both deals' : errorA ? 'Deal A' : 'Deal B'}.
            </p>
          </div>
        )}

        {/* Cross-strategy warning */}
        {crossStrategy && (
          <div className="flex items-center gap-3 rounded-xl border border-[#D4A867]/20 bg-[#D4A867]/10 px-4 py-3">
            <AlertTriangle size={16} className="text-[#D4A867] shrink-0" />
            <p className="text-sm text-[#D4A867]">
              These deals use different strategies — comparison may not be meaningful
            </p>
          </div>
        )}

        {/* KPI Comparison Cards */}
        {!isLoading && bothLoaded && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          >
            {/* Risk Score card — always shown */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <KPICompareCard metricKey="risk_score" label="Risk Score" deals={deals} />
            </div>

            {/* Strategy-specific metric cards */}
            {strategyRows.length > 0 && (
              <>
                <p className="text-[11px] uppercase tracking-[0.08em] font-medium text-text-secondary mb-3">
                  Strategy Outputs
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {strategyRows
                    .filter((key) => key !== 'finance_type')
                    .map((key) => (
                      <KPICompareCard
                        key={key}
                        metricKey={key}
                        label={formatLabel(key)}
                        deals={deals}
                      />
                    ))}
                </div>
              </>
            )}
          </motion.div>
        )}

        {/* Radar Chart */}
        {!isLoading && bothLoaded && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut', delay: 0.1 }}
          >
            <p className="font-brand text-xl font-light text-text-primary mb-4">
              Performance Overview
            </p>
            <ComparisonRadar
              deals={deals.map((d) => ({
                id: d.id,
                address: d.address,
                strategy: d.strategy as Strategy,
                outputs: d.outputs as Record<string, number | string>,
                riskScore: d.risk_score,
              }))}
            />
          </motion.div>
        )}

        {/* Summary Verdict */}
        {!isLoading && bothLoaded && strategyRows.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut', delay: 0.15 }}
          >
            <SummaryVerdict deals={deals} metricKeys={strategyRows} />
          </motion.div>
        )}

        {/* Empty state */}
        {!isLoading && !dealA && !dealB && (
          <div className="bg-app-surface border border-border-strong rounded-xl p-12 shadow-xs edge-highlight flex flex-col items-center justify-center text-center">
            <div className="w-12 h-12 rounded-full bg-layer-2 flex items-center justify-center mb-4">
              <Scale size={24} className="text-text-muted" />
            </div>
            <p className="text-sm text-text-secondary">
              Select at least two deals to compare their analysis results side by side.
            </p>
          </div>
        )}

        {/* One deal selected */}
        {!isLoading && dealA && !dealB && !dealBId && (
          <div className="bg-app-surface border border-border-strong rounded-xl p-8 shadow-xs edge-highlight text-center">
            <p className="text-sm text-text-secondary">
              Add another deal to compare
            </p>
          </div>
        )}
      </motion.div>
    </AppShell>
  )
}
