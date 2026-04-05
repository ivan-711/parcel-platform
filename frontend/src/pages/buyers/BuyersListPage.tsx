// frontend/src/pages/buyers/BuyersListPage.tsx
import { useState, useMemo, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Tag, Plus, Phone, Mail, Search, ShieldCheck } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { EmptyState } from '@/components/EmptyState'
import { AddBuyerModal } from '@/components/buyers/AddBuyerModal'
import { cn } from '@/lib/utils'
import { useBuyers } from '@/hooks/useBuyers'
import type { BuyerFilters, BuyerListItem, BuyBox } from '@/types'

// ── Funding badge colors ──────────────────────────────────
const FUNDING_COLORS: Record<string, string> = {
  cash: 'bg-[#4ADE80]/15 text-[#4ADE80] border-[#4ADE80]/30',
  hard_money: 'bg-[#FBBF24]/15 text-[#FBBF24] border-[#FBBF24]/30',
  conventional: 'bg-[#60A5FA]/15 text-[#60A5FA] border-[#60A5FA]/30',
  creative: 'bg-[#8B7AFF]/15 text-[#8B7AFF] border-[#8B7AFF]/30',
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

function buyBoxSummary(box: BuyBox): string {
  const parts: string[] = []
  if (box.property_types?.length) parts.push(box.property_types.join('/'))
  if (box.min_price != null || box.max_price != null) {
    const lo = formatPrice(box.min_price)
    const hi = formatPrice(box.max_price)
    if (lo && hi) parts.push(`${lo}-${hi}`)
    else if (lo) parts.push(`${lo}+`)
    else if (hi) parts.push(`Up to ${hi}`)
  }
  if (box.target_markets?.length) parts.push(box.target_markets[0])
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
              className="text-xl sm:text-2xl text-[#F0EDE8]"
              style={{ fontFamily: 'Satoshi, sans-serif', fontWeight: 300 }}
            >
              Buyer List
            </h1>
            {list.length > 0 && (
              <span className="px-2 py-0.5 text-xs rounded-full bg-[#1E1D1B] text-[#8A8580]">
                {list.length}
              </span>
            )}
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg bg-[#8B7AFF] text-white hover:bg-[#7B6AEF] transition-colors cursor-pointer"
          >
            <Plus size={14} /> Add Buyer
          </button>
        </div>

        {/* Filter bar */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Funding pills */}
          <div className="flex items-center gap-1 p-1 bg-[#141311] rounded-lg border border-[#1E1D1B]">
            {FUNDING_PILLS.map(p => (
              <button
                key={p.value}
                onClick={() => setFundingFilter(p.value)}
                className={cn(
                  'px-3 py-1.5 text-xs rounded-md transition-colors cursor-pointer whitespace-nowrap',
                  fundingFilter === p.value
                    ? 'bg-[#8B7AFF]/15 text-[#8B7AFF]'
                    : 'text-[#8A8580] hover:text-[#C5C0B8]',
                )}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Market search */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8A8580] pointer-events-none" />
            <input
              type="text"
              placeholder="Search market..."
              value={marketSearch}
              onChange={e => handleMarketChange(e.target.value)}
              className="pl-8 pr-3 py-2 w-44 bg-[#141311] border border-[#1E1D1B] rounded-lg text-xs text-[#F0EDE8] placeholder-[#8A8580] focus:border-[#8B7AFF] outline-none"
            />
          </div>

          {/* Strategy dropdown */}
          <select
            value={strategyFilter}
            onChange={e => setStrategyFilter(e.target.value)}
            className="px-3 py-2 bg-[#141311] border border-[#1E1D1B] rounded-lg text-xs text-[#F0EDE8] focus:border-[#8B7AFF] outline-none cursor-pointer"
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
                ? 'bg-[#4ADE80]/15 text-[#4ADE80] border-[#4ADE80]/30'
                : 'bg-[#141311] text-[#8A8580] border-[#1E1D1B] hover:text-[#C5C0B8]',
            )}
          >
            <ShieldCheck size={13} /> Has POF
          </button>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-40 bg-[#141311] rounded-xl animate-pulse" />
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
  const ft = buyer.funding_type?.toLowerCase().replace(/\s+/g, '_') ?? ''
  const fundingCls = FUNDING_COLORS[ft] ?? 'bg-[#1E1D1B] text-[#8A8580] border-[#1E1D1B]'
  const firstBox = buyer.buy_boxes?.[0]
  const summary = firstBox ? buyBoxSummary(firstBox) : null

  return (
    <Link
      to={`/buyers/${buyer.id}`}
      className="block bg-[#141311] border border-[#1E1D1B] rounded-xl p-4 hover:border-[#8B7AFF]/30 transition-colors group"
    >
      {/* Row 1: Name + badges */}
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="min-w-0">
          <p className="text-sm text-[#F0EDE8] font-medium truncate group-hover:text-[#8B7AFF] transition-colors">
            {fullName}
          </p>
          {buyer.company && (
            <p className="text-xs text-[#8A8580] truncate">{buyer.company}</p>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {ft && (
            <span className={cn('text-[10px] uppercase tracking-wider px-2 py-0.5 rounded border', fundingCls)}>
              {fundingLabel(buyer.funding_type)}
            </span>
          )}
          {buyer.has_pof && (
            <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded border bg-[#4ADE80]/15 text-[#4ADE80] border-[#4ADE80]/30">
              POF &#x2713;
            </span>
          )}
        </div>
      </div>

      {/* Row 2: Contact */}
      <div className="flex items-center gap-4 text-xs text-[#C5C0B8] mb-3">
        {buyer.phone && (
          <span className="inline-flex items-center gap-1">
            <Phone size={12} className="text-[#8A8580]" /> {buyer.phone}
          </span>
        )}
        {buyer.email && (
          <span className="inline-flex items-center gap-1 truncate">
            <Mail size={12} className="text-[#8A8580]" /> {buyer.email}
          </span>
        )}
      </div>

      {/* Row 3: Buy box summary */}
      {summary && (
        <p className="text-xs text-[#8A8580] mb-3 truncate">{summary}</p>
      )}

      {/* Row 4: Stats */}
      <div className="flex items-center gap-4 text-[11px] text-[#8A8580]">
        <span>{buyer.deal_count} deal{buyer.deal_count !== 1 ? 's' : ''}</span>
        {buyer.last_communication && (
          <span>Last contact {relativeTime(buyer.last_communication)}</span>
        )}
      </div>
    </Link>
  )
}
