// frontend/src/pages/dispositions/MatchResultsPage.tsx
import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
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
  strong: 'var(--color-profit)',
  moderate: 'var(--color-warning)',
  weak: 'rgb(249, 115, 22)',
  no_match: 'var(--color-text-muted)',
}

const MATCH_LEVEL_BG: Record<string, string> = {
  strong: 'bg-profit-bg text-profit border-profit/30',
  moderate: 'bg-warning-bg text-warning border-warning/30',
  weak: 'bg-orange-500/15 text-orange-500 border-orange-500/30',
  no_match: 'bg-text-muted/15 text-text-muted border-text-muted/30',
}

const FUNDING_COLORS: Record<string, string> = {
  cash: 'bg-profit-bg text-profit border-profit/30',
  hard_money: 'bg-warning-bg text-warning border-warning/30',
  conventional: 'bg-info-bg text-info border-info/30',
  creative: 'bg-violet-400/15 text-violet-400 border-violet-400/30',
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
  const color = pct >= 80 ? 'var(--color-profit)' : pct >= 56 ? 'var(--color-warning)' : 'rgb(249, 115, 22)'

  return (
    <div className="flex items-center gap-2">
      <span className="w-16 text-[10px] text-text-muted shrink-0">{label}</span>
      <div className="flex-1 h-1.5 bg-border-default rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-[10px] text-text-secondary tabular-nums w-8 text-right">
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
  const scoreColor = MATCH_LEVEL_COLORS[match.match_level] ?? 'var(--color-text-muted)'
  const levelBadge = MATCH_LEVEL_BG[match.match_level] ?? MATCH_LEVEL_BG.no_match
  const fundingBadge = match.funding_type ? (FUNDING_COLORS[match.funding_type] ?? 'bg-border-default text-text-secondary border-border-strong') : null

  // Partition reasons: lines starting with '+' or positive cues = positive, else negative
  const positiveReasons = match.reasons.filter((r) => !r.startsWith('✗') && !r.startsWith('—') && !r.toLowerCase().startsWith('no '))
  const negativeReasons = match.reasons.filter((r) => r.startsWith('✗') || r.startsWith('—') || r.toLowerCase().startsWith('no '))

  return (
    <div
      className={cn(
        'relative bg-app-recessed border rounded-xl p-4 transition-all cursor-pointer',
        selected
          ? 'border-violet-400 ring-1 ring-violet-400/40'
          : 'border-border-default hover:border-border-strong'
      )}
      role="checkbox"
      aria-checked={selected}
      aria-label={`Select buyer ${match.buyer_name}, match score ${match.score}`}
      tabIndex={0}
      onClick={onToggle}
      onKeyDown={(e) => {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault()
          onToggle()
        }
      }}
    >
      {/* Top row: checkbox + buyer info + score */}
      <div className="flex items-start gap-3">
        {/* Checkbox */}
        <div
          aria-hidden="true"
          className={cn(
            'w-4 h-4 mt-0.5 rounded border flex items-center justify-center shrink-0 transition-colors',
            selected
              ? 'bg-violet-400 border-violet-400'
              : 'border-border-strong bg-app-bg'
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
              className="text-sm text-text-primary hover:text-violet-400 transition-colors font-medium"
            >
              {match.buyer_name}
            </Link>
            {match.company && (
              <span className="text-[11px] text-text-muted">{match.company}</span>
            )}
          </div>
          <p className="text-[11px] text-text-muted mt-0.5">{match.buy_box_name}</p>
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
          <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] border bg-profit-bg text-profit border-profit/25">
            <ShieldCheck size={9} />
            POF
          </span>
        )}
        {match.can_close_days != null && (
          <span className="px-2 py-0.5 rounded text-[10px] border bg-border-default text-text-secondary border-border-strong">
            Close in {match.can_close_days}d
          </span>
        )}
      </div>

      {/* Reasons */}
      {match.reasons.length > 0 && (
        <div className="mt-3 pl-7 space-y-0.5">
          {positiveReasons.slice(0, 3).map((r, i) => (
            <div key={i} className="flex items-start gap-1.5">
              <CheckCircle2 size={10} className="text-profit mt-0.5 shrink-0" />
              <span className="text-[11px] text-text-secondary">{r}</span>
            </div>
          ))}
          {negativeReasons.slice(0, 2).map((r, i) => (
            <div key={i} className="flex items-start gap-1.5">
              <XCircle size={10} className="text-orange-500 mt-0.5 shrink-0" />
              <span className="text-[11px] text-text-muted">{r.replace(/^[✗—]\s*/, '')}</span>
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

  const property = data?.property
  const primaryScenarioId = data?.property?.scenario_id ?? ''
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
      <div className="min-h-screen bg-app-bg">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-6 pb-28">

          {/* Breadcrumb */}
          <div className="flex items-center gap-2">
            <Link
              to={propertyId ? `/properties/${propertyId}` : '/properties'}
              className="flex items-center gap-1.5 text-[13px] text-text-muted hover:text-text-secondary transition-colors"
            >
              <ArrowLeft size={14} />
              Back
            </Link>
            <span className="text-border-default">/</span>
            <span className="text-[13px] text-text-secondary">Match Results</span>
          </div>

          {/* Header */}
          {property && (
            <div className="space-y-1">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h1 className="font-brand font-light text-xl text-text-primary">
                    {property.address}
                  </h1>
                  <p className="text-sm text-text-muted mt-0.5">
                    {property.city}, {property.state}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {property.strategy && (
                    <span className="px-2.5 py-1 rounded-lg text-[11px] border bg-violet-400/10 text-violet-400 border-violet-400/25">
                      {strategyLabel(property.strategy)}
                    </span>
                  )}
                  {property.purchase_price != null && (
                    <span className="text-sm text-text-secondary font-medium tabular-nums">
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
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] bg-app-recessed border border-border-default text-text-secondary hover:border-border-strong transition-colors"
              >
                Score: {currentMinScoreLabel}
                <ChevronDown size={12} />
              </button>
              {minScoreOpen && (
                <div className="absolute top-full left-0 mt-1 z-20 bg-app-recessed border border-border-default rounded-xl shadow-xl overflow-hidden min-w-[120px]">
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
                          ? 'text-violet-400 bg-violet-400/10'
                          : 'text-text-secondary hover:bg-border-default'
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
                    ? 'bg-violet-400 border-violet-400 text-white'
                    : 'bg-app-recessed border-border-default text-text-secondary hover:border-border-strong'
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
                  ? 'bg-profit-bg border-profit/30 text-profit'
                  : 'bg-app-recessed border-border-default text-text-secondary hover:border-border-strong'
              )}
            >
              <ShieldCheck size={11} />
              POF only
            </button>
          </div>

          {/* Results count + select all */}
          {!isLoading && matches.length > 0 && (
            <div className="flex items-center justify-between">
              <p className="text-[12px] text-text-muted">
                {matches.length} buyer{matches.length !== 1 ? 's' : ''} matched
              </p>
              <button
                onClick={toggleAll}
                aria-label={allSelected ? 'Deselect all buyers' : 'Select all buyers'}
                className="text-[12px] text-violet-400 hover:text-violet-500 transition-colors"
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
                  className="h-40 rounded-xl bg-app-recessed border border-border-default animate-pulse"
                />
              ))}
            </div>
          )}

          {/* Error */}
          {isError && !isLoading && (
            <div className="rounded-xl bg-app-recessed border border-border-default p-6 text-center">
              <p className="text-sm text-text-secondary">Failed to load matches. Please try again.</p>
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
              <div className="bg-app-recessed border border-violet-400/40 rounded-xl px-4 py-3 flex items-center justify-between shadow-2xl">
                <p className="text-[13px] text-text-secondary">
                  <span className="text-text-primary font-medium">{selectedCount}</span>{' '}
                  buyer{selectedCount !== 1 ? 's' : ''} selected
                </p>
                <button
                  onClick={() => setShowPacketModal(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-violet-400 text-white hover:opacity-90 transition-opacity"
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
