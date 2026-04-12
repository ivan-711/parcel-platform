// frontend/src/pages/buyers/BuyersListPage.tsx
import { useState, useMemo, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Tag, Plus, Phone, Mail, Search, ShieldCheck } from 'lucide-react'
import { prefersReducedMotion } from '@/lib/motion'
import { AppShell } from '@/components/layout/AppShell'
import { EmptyState } from '@/components/EmptyState'
import { AddBuyerModal } from '@/components/buyers/AddBuyerModal'
import { cn } from '@/lib/utils'
import { useBuyers } from '@/hooks/useBuyers'
import type { BuyerFilters, BuyerListItem, BuyBox } from '@/types'

// ── Funding badge colors ──────────────────────────────────
const FUNDING_COLORS: Record<string, string> = {
  cash: 'bg-profit-bg text-profit border-profit/30',
  hard_money: 'bg-warning-bg text-warning border-warning/30',
  conventional: 'bg-info-bg text-info border-info/30',
  creative: 'bg-violet-400/15 text-violet-400 border-violet-400/30',
}

const FUNDING_PILLS = [
  { value: '', label: 'All' },
  { value: 'cash', label: 'Cash' },
  { value: 'hard_money', label: 'Hard Money' },
  { value: 'conventional', label: 'Conventional' },
  { value: 'creative', label: 'Creative' },
] as const

const STRATEGY_OPTIONS = [
  { value: '', label: 'All Strategies' },
  { value: 'buy_and_hold', label: 'Buy & Hold' },
  { value: 'brrrr', label: 'BRRRR' },
  { value: 'flip', label: 'Flip' },
  { value: 'wholesale', label: 'Wholesale' },
  { value: 'creative_finance', label: 'Creative Finance' },
] as const

// ── Helpers ───────────────────────────────────────────────
function fundingLabel(ft: string | null | undefined): string {
  if (!ft) return ''
  return ft.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function formatPrice(n: number | null | undefined): string {
  if (n == null) return ''
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  return `$${Math.round(n / 1000)}K`
}

function formatPropertyType(pt: string): string {
  return pt.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function buyBoxSummary(box: BuyBox): string {
  const parts: string[] = []
  if (box.property_types?.length) parts.push(box.property_types.map(formatPropertyType).join(' / '))
  if (box.min_price != null || box.max_price != null) {
    const lo = formatPrice(box.min_price)
    const hi = formatPrice(box.max_price)
    if (lo && hi) parts.push(`${lo}-${hi}`)
    else if (lo) parts.push(`${lo}+`)
    else if (hi) parts.push(`Up to ${hi}`)
  }
  const markets = box.target_markets ?? (box as unknown as Record<string, unknown>).markets as string[] | undefined
  if (markets?.length) parts.push(markets[0])
  return parts.join(' \u00B7 ')
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  const months = Math.floor(days / 30)
  return `${months}mo ago`
}

// ── Component ─────────────────────────────────────────────
export default function BuyersListPage() {
  const [fundingFilter, setFundingFilter] = useState('')
  const [marketSearch, setMarketSearch] = useState('')
  const [debouncedMarket, setDebouncedMarket] = useState('')
  const [strategyFilter, setStrategyFilter] = useState('')
  const [pofOnly, setPofOnly] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)

  // Debounce market search
  const debounceTimer = useMemo(() => ({ current: null as ReturnType<typeof setTimeout> | null }), [])
  const handleMarketChange = useCallback(
    (value: string) => {
      setMarketSearch(value)
      if (debounceTimer.current) clearTimeout(debounceTimer.current)
      debounceTimer.current = setTimeout(() => setDebouncedMarket(value), 300)
    },
    [debounceTimer],
  )

  const filters: BuyerFilters = {
    funding_type: fundingFilter || undefined,
    has_pof: pofOnly || undefined,
    market: debouncedMarket || undefined,
    strategy: strategyFilter || undefined,
  }

  const { data: buyers, isLoading } = useBuyers(filters)
  const list: BuyerListItem[] = (buyers as BuyerListItem[] | undefined) ?? []

  return (
    <AppShell title="Buyer List">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <h1
              className="text-xl sm:text-2xl text-text-primary font-brand font-light"
            >
              Buyer List
            </h1>
            {list.length > 0 && (
              <span className="px-2 py-0.5 text-xs rounded-full bg-border-default text-text-muted">
                {list.length}
              </span>
            )}
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg bg-violet-400 text-white hover:bg-violet-500 transition-colors cursor-pointer"
          >
            <Plus size={14} /> Add Buyer
          </button>
        </div>

        {/* Filter bar */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Funding pills */}
          <div className="flex items-center gap-1 p-1 bg-app-recessed rounded-lg border border-border-default">
            {FUNDING_PILLS.map(p => (
              <button
                key={p.value}
                onClick={() => setFundingFilter(p.value)}
                className={cn(
                  'px-3 py-1.5 text-xs rounded-md transition-colors cursor-pointer whitespace-nowrap',
                  fundingFilter === p.value
                    ? 'bg-violet-400/15 text-violet-400'
                    : 'text-text-muted hover:text-text-secondary',
                )}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Market search */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
            <input
              type="text"
              placeholder="Search market..."
              value={marketSearch}
              onChange={e => handleMarketChange(e.target.value)}
              className="pl-8 pr-3 py-2 w-44 bg-app-recessed border border-border-default rounded-lg text-xs text-text-primary placeholder-text-muted focus:border-violet-400 outline-none"
            />
          </div>

          {/* Strategy dropdown */}
          <select
            value={strategyFilter}
            onChange={e => setStrategyFilter(e.target.value)}
            className="px-3 py-2 bg-app-recessed border border-border-default rounded-lg text-xs text-text-primary focus:border-violet-400 outline-none cursor-pointer"
          >
            {STRATEGY_OPTIONS.map(s => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>

          {/* POF toggle */}
          <button
            onClick={() => setPofOnly(v => !v)}
            className={cn(
              'inline-flex items-center gap-1.5 px-3 py-2 text-xs rounded-lg border transition-colors cursor-pointer',
              pofOnly
                ? 'bg-profit-bg text-profit border-profit/30'
                : 'bg-app-recessed text-text-muted border-border-default hover:text-text-secondary',
            )}
          >
            <ShieldCheck size={13} /> Has POF
          </button>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-40 bg-app-recessed rounded-xl animate-pulse" />
            ))}
          </div>
        ) : list.length === 0 ? (
          <EmptyState
            icon={Tag}
            heading="No buyers yet"
            description="Build your buyer list to start matching deals."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {list.map(buyer => (
              <BuyerCard key={buyer.id} buyer={buyer} />
            ))}
          </div>
        )}
      </div>

      <AddBuyerModal open={showAddModal} onOpenChange={setShowAddModal} />
    </AppShell>
  )
}

// ── Buyer Card ────────────────────────────────────────────
function BuyerCard({ buyer }: { buyer: BuyerListItem }) {
  const fullName = [buyer.first_name, buyer.last_name].filter(Boolean).join(' ')
    || (buyer as unknown as Record<string, unknown>).name as string
    || 'Unknown'
  const ft = (buyer.funding_type ?? ((buyer as unknown as Record<string, unknown>).funding_types as string[] | undefined)?.[0] ?? '')
    .toLowerCase().replace(/\s+/g, '_')
  const fundingCls = FUNDING_COLORS[ft] ?? 'bg-border-default text-text-muted border-border-default'
  const firstBox = buyer.buy_boxes?.[0]
  const summary = firstBox ? buyBoxSummary(firstBox) : null

  return (
    <motion.div whileHover={prefersReducedMotion ? undefined : { y: -2 }}>
    <Link
      to={`/buyers/${buyer.id}`}
      className="block bg-app-recessed border border-border-default rounded-xl p-4 hover:border-violet-400/30 transition-shadow duration-200 hover:shadow-lg group"
    >
      {/* Row 1: Name + badges */}
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="min-w-0">
          <p className="text-sm text-text-primary font-medium truncate group-hover:text-violet-400 transition-colors">
            {fullName}
          </p>
          {buyer.company && (
            <p className="text-xs text-text-muted truncate">{buyer.company}</p>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {ft && (
            <span className={cn('text-[10px] uppercase tracking-wider px-2 py-0.5 rounded border', fundingCls)}>
              {fundingLabel(buyer.funding_type)}
            </span>
          )}
          {buyer.has_pof && (
            <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded border bg-profit-bg text-profit border-profit/30">
              POF &#x2713;
            </span>
          )}
        </div>
      </div>

      {/* Row 2: Contact */}
      <div className="flex items-center gap-4 text-xs text-text-secondary mb-3">
        {buyer.phone && (
          <span className="inline-flex items-center gap-1">
            <Phone size={12} className="text-text-muted" /> {buyer.phone}
          </span>
        )}
        {buyer.email && (
          <span className="inline-flex items-center gap-1 truncate">
            <Mail size={12} className="text-text-muted" /> {buyer.email}
          </span>
        )}
      </div>

      {/* Row 3: Buy box summary */}
      {summary && (
        <p className="text-xs text-text-muted mb-3 truncate">{summary}</p>
      )}

      {/* Row 4: Stats */}
      <div className="flex items-center gap-4 text-[11px] text-text-muted">
        {(buyer.deal_count ?? (buyer as unknown as Record<string, unknown>).total_deals) != null && (
          <span>{buyer.deal_count ?? (buyer as unknown as Record<string, unknown>).total_deals as number} deal{(buyer.deal_count ?? (buyer as unknown as Record<string, unknown>).total_deals as number) !== 1 ? 's' : ''}</span>
        )}
        {buyer.last_communication && (
          <span>Last contact {relativeTime(buyer.last_communication)}</span>
        )}
      </div>
    </Link>
    </motion.div>
  )
}
