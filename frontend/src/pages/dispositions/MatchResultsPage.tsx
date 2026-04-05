// frontend/src/pages/dispositions/MatchResultsPage.tsx
import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowLeft,
  Users,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  Send,
  ChevronDown,
} from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { EmptyState } from '@/components/EmptyState'
import { CreatePacketModal } from '@/components/dispositions/CreatePacketModal'
import { cn } from '@/lib/utils'
import { usePropertyMatches } from '@/hooks/useDispositions'
import { api } from '@/lib/api'
import type { PropertyMatchResult, MatchFilters } from '@/types'

// ---------------------------------------------------------------------------
// PostHog tracking
// ---------------------------------------------------------------------------
function trackEvent(event: string, props?: Record<string, unknown>) {
  try { (window as any).posthog?.capture?.(event, props) } catch { /* ignore */ }
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const MIN_SCORE_OPTIONS = [
  { value: 0, label: 'Any score' },
  { value: 40, label: '40+' },
  { value: 50, label: '50+' },
  { value: 60, label: '60+' },
  { value: 70, label: '70+' },
  { value: 80, label: '80+' },
]

const FUNDING_PILLS = [
  { value: '', label: 'All' },
  { value: 'cash', label: 'Cash' },
  { value: 'hard_money', label: 'Hard Money' },
  { value: 'conventional', label: 'Conventional' },
  { value: 'creative', label: 'Creative' },
] as const

const MATCH_LEVEL_COLORS: Record<string, string> = {
  strong: '#4ADE80',
  moderate: '#FBBF24',
  weak: '#F97316',
  no_match: '#8A8580',
}

const MATCH_LEVEL_BG: Record<string, string> = {
  strong: 'bg-[#4ADE80]/15 text-[#4ADE80] border-[#4ADE80]/30',
  moderate: 'bg-[#FBBF24]/15 text-[#FBBF24] border-[#FBBF24]/30',
  weak: 'bg-[#F97316]/15 text-[#F97316] border-[#F97316]/30',
  no_match: 'bg-[#8A8580]/15 text-[#8A8580] border-[#8A8580]/30',
}

const FUNDING_COLORS: Record<string, string> = {
  cash: 'bg-[#4ADE80]/15 text-[#4ADE80] border-[#4ADE80]/30',
  hard_money: 'bg-[#FBBF24]/15 text-[#FBBF24] border-[#FBBF24]/30',
  conventional: 'bg-[#60A5FA]/15 text-[#60A5FA] border-[#60A5FA]/30',
  creative: 'bg-[#8B7AFF]/15 text-[#8B7AFF] border-[#8B7AFF]/30',
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function strategyLabel(s: string | null): string {
  if (!s) return ''
  const map: Record<string, string> = {
    wholesale: 'Wholesale',
    flip: 'Flip',
    buy_and_hold: 'Buy & Hold',
    brrrr: 'BRRRR',
    creative_finance: 'Creative Finance',
  }
  return map[s] ?? s
}

function fundingLabel(ft: string | null | undefined): string {
  if (!ft) return ''
  return ft.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function formatPrice(n: number | null | undefined): string {
  if (n == null) return ''
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000) return `$${Math.round(n / 1000)}K`
  return `$${n.toLocaleString()}`
}

// ---------------------------------------------------------------------------
// ScoreBar sub-component
// ---------------------------------------------------------------------------
function ScoreBar({
  label,
  value,
  max = 25,
}: {
  label: string
  value: number
  max?: number
}) {
  const pct = Math.min(100, (value / max) * 100)
  const color = pct >= 80 ? '#4ADE80' : pct >= 56 ? '#FBBF24' : '#F97316'

  return (
    <div className="flex items-center gap-2">
      <span className="w-16 text-[10px] text-[#8A8580] shrink-0">{label}</span>
      <div className="flex-1 h-1.5 bg-[#1E1D1B] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-[10px] text-[#C5C0B8] tabular-nums w-8 text-right">
        {value}/{max}
      </span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// MatchCard sub-component
// ---------------------------------------------------------------------------
function MatchCard({
  match,
  selected,
  onToggle,
}: {
  match: PropertyMatchResult
  selected: boolean
  onToggle: () => void
}) {
  const scoreColor = MATCH_LEVEL_COLORS[match.match_level] ?? '#8A8580'
  const levelBadge = MATCH_LEVEL_BG[match.match_level] ?? MATCH_LEVEL_BG.no_match
  const fundingBadge = match.funding_type ? (FUNDING_COLORS[match.funding_type] ?? 'bg-[#1E1D1B] text-[#C5C0B8] border-[#2A2826]') : null

  // Partition reasons: lines starting with '+' or positive cues = positive, else negative
  const positiveReasons = match.reasons.filter((r) => !r.startsWith('✗') && !r.startsWith('—') && !r.toLowerCase().startsWith('no '))
  const negativeReasons = match.reasons.filter((r) => r.startsWith('✗') || r.startsWith('—') || r.toLowerCase().startsWith('no '))

  return (
    <div
      className={cn(
        'relative bg-[#141311] border rounded-xl p-4 transition-all cursor-pointer',
        selected
          ? 'border-[#8B7AFF] ring-1 ring-[#8B7AFF]/40'
          : 'border-[#1E1D1B] hover:border-[#2A2826]'
      )}
      onClick={onToggle}
    >
      {/* Top row: checkbox + buyer info + score */}
      <div className="flex items-start gap-3">
        {/* Checkbox */}
        <div
          className={cn(
            'w-4 h-4 mt-0.5 rounded border flex items-center justify-center shrink-0 transition-colors',
            selected
              ? 'bg-[#8B7AFF] border-[#8B7AFF]'
              : 'border-[#2A2826] bg-[#0C0B0A]'
          )}
        >
          {selected && (
            <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
              <path d="M1 3.5L3.5 6L8 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </div>

        {/* Buyer info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              to={`/buyers/${match.contact_id}`}
              onClick={(e) => e.stopPropagation()}
              className="text-sm text-[#F0EDE8] hover:text-[#8B7AFF] transition-colors font-medium"
            >
              {match.buyer_name}
            </Link>
            {match.company && (
              <span className="text-[11px] text-[#8A8580]">{match.company}</span>
            )}
          </div>
          <p className="text-[11px] text-[#8A8580] mt-0.5">{match.buy_box_name}</p>
        </div>

        {/* Score */}
        <div className="flex flex-col items-end shrink-0">
          <span
            className="text-2xl font-semibold tabular-nums leading-none"
            style={{ color: scoreColor }}
          >
            {match.score}
          </span>
          <span
            className={cn(
              'mt-1 px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase tracking-widest border',
              levelBadge
            )}
          >
            {match.match_level === 'no_match' ? 'No Match' : match.match_level}
          </span>
        </div>
      </div>

      {/* Score breakdown bars */}
      <div className="mt-3 space-y-1.5 pl-7">
        <ScoreBar label="Location" value={match.breakdown.location} />
        <ScoreBar label="Financial" value={match.breakdown.financial} />
        <ScoreBar label="Property" value={match.breakdown.property} />
        <ScoreBar label="Strategy" value={match.breakdown.strategy} />
      </div>

      {/* Badges row */}
      <div className="mt-3 pl-7 flex flex-wrap gap-1.5">
        {fundingBadge && match.funding_type && (
          <span className={cn('px-2 py-0.5 rounded text-[10px] border', fundingBadge)}>
            {fundingLabel(match.funding_type)}
          </span>
        )}
        {match.has_pof && (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] border bg-[#4ADE80]/10 text-[#4ADE80] border-[#4ADE80]/25">
            <ShieldCheck size={9} />
            POF
          </span>
        )}
        {match.can_close_days != null && (
          <span className="px-2 py-0.5 rounded text-[10px] border bg-[#1E1D1B] text-[#C5C0B8] border-[#2A2826]">
            Close in {match.can_close_days}d
          </span>
        )}
      </div>

      {/* Reasons */}
      {match.reasons.length > 0 && (
        <div className="mt-3 pl-7 space-y-0.5">
          {positiveReasons.slice(0, 3).map((r, i) => (
            <div key={i} className="flex items-start gap-1.5">
              <CheckCircle2 size={10} className="text-[#4ADE80] mt-0.5 shrink-0" />
              <span className="text-[11px] text-[#C5C0B8]">{r}</span>
            </div>
          ))}
          {negativeReasons.slice(0, 2).map((r, i) => (
            <div key={i} className="flex items-start gap-1.5">
              <XCircle size={10} className="text-[#F97316] mt-0.5 shrink-0" />
              <span className="text-[11px] text-[#8A8580]">{r.replace(/^[✗—]\s*/, '')}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------
export default function MatchResultsPage() {
  const { propertyId } = useParams<{ propertyId: string }>()

  // Track on mount
  useEffect(() => {
    trackEvent('find_buyers_clicked', { source: 'match_page', property_id: propertyId })
  }, [propertyId])

  const [filters, setFilters] = useState<MatchFilters>({})
  const [selectedBuyers, setSelectedBuyers] = useState<Set<string>>(new Set())
  const [showPacketModal, setShowPacketModal] = useState(false)
  const [minScoreOpen, setMinScoreOpen] = useState(false)

  const { data, isLoading, isError } = usePropertyMatches(propertyId, filters)

  // Fetch scenarios to get primary scenario ID
  const scenariosQuery = useQuery({
    queryKey: ['property-scenarios', propertyId],
    queryFn: () => api.properties.scenarios(propertyId!),
    enabled: !!propertyId,
    staleTime: 60_000,
  })
  const primaryScenarioId = scenariosQuery.data?.[0]?.id ?? ''

  const property = data?.property
  const matches = data?.matches ?? []

  function toggleBuyer(contactId: string) {
    setSelectedBuyers((prev) => {
      const next = new Set(prev)
      if (next.has(contactId)) next.delete(contactId)
      else next.add(contactId)
      return next
    })
  }

  function toggleAll() {
    if (selectedBuyers.size === matches.length) {
      setSelectedBuyers(new Set())
    } else {
      setSelectedBuyers(new Set(matches.map((m) => m.contact_id)))
    }
  }

  const selectedCount = selectedBuyers.size
  const allSelected = matches.length > 0 && selectedCount === matches.length

  const currentMinScore = filters.min_score ?? 0
  const currentMinScoreLabel =
    MIN_SCORE_OPTIONS.find((o) => o.value === currentMinScore)?.label ?? 'Any score'

  return (
    <AppShell>
      <div className="min-h-screen bg-[#0C0B0A]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-6 pb-28">

          {/* Breadcrumb */}
          <div className="flex items-center gap-2">
            <Link
              to={propertyId ? `/properties/${propertyId}` : '/properties'}
              className="flex items-center gap-1.5 text-[13px] text-[#8A8580] hover:text-[#C5C0B8] transition-colors"
            >
              <ArrowLeft size={14} />
              Back
            </Link>
            <span className="text-[#1E1D1B]">/</span>
            <span className="text-[13px] text-[#C5C0B8]">Match Results</span>
          </div>

          {/* Header */}
          {property && (
            <div className="space-y-1">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h1
                    className="text-xl text-[#F0EDE8]"
                    style={{ fontFamily: 'Satoshi, sans-serif', fontWeight: 300 }}
                  >
                    {property.address}
                  </h1>
                  <p className="text-sm text-[#8A8580] mt-0.5">
                    {property.city}, {property.state}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {property.strategy && (
                    <span className="px-2.5 py-1 rounded-lg text-[11px] border bg-[#8B7AFF]/10 text-[#8B7AFF] border-[#8B7AFF]/25">
                      {strategyLabel(property.strategy)}
                    </span>
                  )}
                  {property.purchase_price != null && (
                    <span className="text-sm text-[#C5C0B8] font-medium tabular-nums">
                      {formatPrice(property.purchase_price)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Filter bar */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Min score dropdown */}
            <div className="relative">
              <button
                onClick={() => setMinScoreOpen((v) => !v)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] bg-[#141311] border border-[#1E1D1B] text-[#C5C0B8] hover:border-[#2A2826] transition-colors"
              >
                Score: {currentMinScoreLabel}
                <ChevronDown size={12} />
              </button>
              {minScoreOpen && (
                <div className="absolute top-full left-0 mt-1 z-20 bg-[#141311] border border-[#1E1D1B] rounded-xl shadow-xl overflow-hidden min-w-[120px]">
                  {MIN_SCORE_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => {
                        setFilters((f) => ({ ...f, min_score: opt.value || undefined }))
                        setMinScoreOpen(false)
                      }}
                      className={cn(
                        'w-full text-left px-3 py-2 text-[12px] transition-colors',
                        (filters.min_score ?? 0) === opt.value
                          ? 'text-[#8B7AFF] bg-[#8B7AFF]/10'
                          : 'text-[#C5C0B8] hover:bg-[#1E1D1B]'
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Funding type pills */}
            {FUNDING_PILLS.map((pill) => (
              <button
                key={pill.value}
                onClick={() =>
                  setFilters((f) => ({ ...f, funding_type: pill.value || undefined }))
                }
                className={cn(
                  'px-3 py-1.5 rounded-lg text-[12px] border transition-colors',
                  filters.funding_type === (pill.value || undefined)
                    ? 'bg-[#8B7AFF] border-[#8B7AFF] text-white'
                    : 'bg-[#141311] border-[#1E1D1B] text-[#C5C0B8] hover:border-[#2A2826]'
                )}
              >
                {pill.label}
              </button>
            ))}

            {/* POF toggle */}
            <button
              onClick={() =>
                setFilters((f) => ({ ...f, has_pof: f.has_pof ? undefined : true }))
              }
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] border transition-colors',
                filters.has_pof
                  ? 'bg-[#4ADE80]/15 border-[#4ADE80]/30 text-[#4ADE80]'
                  : 'bg-[#141311] border-[#1E1D1B] text-[#C5C0B8] hover:border-[#2A2826]'
              )}
            >
              <ShieldCheck size={11} />
              POF only
            </button>
          </div>

          {/* Results count + select all */}
          {!isLoading && matches.length > 0 && (
            <div className="flex items-center justify-between">
              <p className="text-[12px] text-[#8A8580]">
                {matches.length} buyer{matches.length !== 1 ? 's' : ''} matched
              </p>
              <button
                onClick={toggleAll}
                className="text-[12px] text-[#8B7AFF] hover:text-[#7B6AEF] transition-colors"
              >
                {allSelected ? 'Deselect all' : 'Select all'}
              </button>
            </div>
          )}

          {/* Loading */}
          {isLoading && (
            <div className="space-y-3">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="h-40 rounded-xl bg-[#141311] border border-[#1E1D1B] animate-pulse"
                />
              ))}
            </div>
          )}

          {/* Error */}
          {isError && !isLoading && (
            <div className="rounded-xl bg-[#141311] border border-[#1E1D1B] p-6 text-center">
              <p className="text-sm text-[#C5C0B8]">Failed to load matches. Please try again.</p>
            </div>
          )}

          {/* Empty state */}
          {!isLoading && !isError && matches.length === 0 && (
            <EmptyState
              icon={Users}
              heading="No buyers match"
              description="No buyers match this property's criteria. Add buyers with buy boxes to start matching."
              ctaLabel="Add Buyer"
              ctaHref="/buyers"
            />
          )}

          {/* Match cards */}
          {!isLoading && !isError && matches.length > 0 && (
            <div className="space-y-3">
              {matches.map((match) => (
                <MatchCard
                  key={`${match.contact_id}-${match.buy_box_id}`}
                  match={match}
                  selected={selectedBuyers.has(match.contact_id)}
                  onToggle={() => toggleBuyer(match.contact_id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Sticky send bar */}
        {selectedCount > 0 && (
          <div className="fixed bottom-0 inset-x-0 z-40 pb-safe">
            <div className="max-w-3xl mx-auto px-4 sm:px-6 pb-4">
              <div className="bg-[#141311] border border-[#8B7AFF]/40 rounded-xl px-4 py-3 flex items-center justify-between shadow-2xl">
                <p className="text-[13px] text-[#C5C0B8]">
                  <span className="text-[#F0EDE8] font-medium">{selectedCount}</span>{' '}
                  buyer{selectedCount !== 1 ? 's' : ''} selected
                </p>
                <button
                  onClick={() => setShowPacketModal(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-[#8B7AFF] text-white hover:opacity-90 transition-opacity"
                >
                  <Send size={14} />
                  Send Packet
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Create Packet Modal */}
        {property && (
          <CreatePacketModal
            open={showPacketModal}
            onOpenChange={setShowPacketModal}
            propertyId={property.id}
            scenarioId={primaryScenarioId}
            propertyAddress={property.address}
            strategy={property.strategy}
            purchasePrice={property.purchase_price}
            selectedBuyerIds={Array.from(selectedBuyers)}
            onSuccess={() => {
              setSelectedBuyers(new Set())
            }}
          />
        )}
      </div>
    </AppShell>
  )
}
