// frontend/src/pages/buyers/BuyerDetailPage.tsx
import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  ChevronDown,
  ChevronRight,
  Plus,
  Trash2,
  ShieldCheck,
  ArrowLeft,
  Repeat,
} from 'lucide-react'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
import { AppShell } from '@/components/layout/AppShell'
import { EmptyState } from '@/components/EmptyState'
import { BuyBoxEditor } from '@/components/buyers/BuyBoxEditor'
import { cn } from '@/lib/utils'
import {
  useBuyer,
  useCreateBuyBox,
  useDeleteBuyBox,
} from '@/hooks/useBuyers'
import { useBuyerMatches } from '@/hooks/useDispositions'
import { useSequences } from '@/hooks/useSequences'
import { api } from '@/lib/api'
import type {
  BuyerDetail,
  BuyBox,
  CreateBuyBoxRequest,
  BuyerMatchResult,
} from '@/types'

// ── Constants ────────────────────────────────────────────
const FUNDING_COLORS: Record<string, string> = {
  cash: 'bg-[#4ADE80]/15 text-[#4ADE80] border-[#4ADE80]/30',
  hard_money: 'bg-[#FBBF24]/15 text-[#FBBF24] border-[#FBBF24]/30',
  conventional: 'bg-[#60A5FA]/15 text-[#60A5FA] border-[#60A5FA]/30',
  creative: 'bg-[#8B7AFF]/15 text-[#8B7AFF] border-[#8B7AFF]/30',
}

const STRATEGY_LABELS: Record<string, string> = {
  buy_and_hold: 'Buy & Hold',
  brrrr: 'BRRRR',
  flip: 'Flip',
  wholesale: 'Wholesale',
  creative_finance: 'Creative Finance',
}

// ── Helpers ──────────────────────────────────────────────
function fundingLabel(ft: string | null | undefined): string {
  if (!ft) return ''
  return ft.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function formatPrice(n: number | null | undefined): string {
  if (n == null) return ''
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  return `$${Math.round(n / 1000).toLocaleString()}K`
}

function formatVolume(n: number | null | undefined): string {
  if (n == null || n === 0) return '$0'
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `$${Math.round(n / 1000).toLocaleString()}K`
  return `$${n.toLocaleString()}`
}

function buyBoxSummary(box: BuyBox): string {
  const parts: string[] = []
  if (box.property_types?.length) parts.push(box.property_types.map(t => t.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())).join('/'))
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

function humanizeStrategy(s: string): string {
  return STRATEGY_LABELS[s] ?? s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

// ── Main Component ───────────────────────────────────────
export default function BuyerDetailPage() {
  const { contactId } = useParams<{ contactId: string }>()
  const { data, isLoading, isError } = useBuyer(contactId)
  const { data: matchesData } = useBuyerMatches(contactId)
  const [seqDropdownOpen, setSeqDropdownOpen] = useState(false)
  const { data: sequences } = useSequences()
  const activeSequences = (sequences ?? []).filter(s => s.status === 'active')
  const queryClient = useQueryClient()

  const buyer = data as BuyerDetail | undefined
  const matches = matchesData?.matches ?? []

  // PostHog event
  if (buyer) {
    try {
      ;(window as any).posthog?.capture?.('buyer_detail_viewed', {
        contact_id: contactId,
        buy_box_count: buyer.buy_boxes?.length ?? 0,
      })
    } catch {
      /* ignore */
    }
  }

  // ── Loading ──────────────────────────────────────────
  if (isLoading) {
    return (
      <AppShell title="Buyer">
        <div className="space-y-4">
          <div className="h-6 w-48 bg-[#141311] rounded animate-pulse" />
          <div className="h-48 bg-[#141311] rounded-xl animate-pulse" />
          <div className="h-40 bg-[#141311] rounded-xl animate-pulse" />
          <div className="h-32 bg-[#141311] rounded-xl animate-pulse" />
        </div>
      </AppShell>
    )
  }

  // ── Error ────────────────────────────────────────────
  if (isError || !buyer) {
    return (
      <AppShell title="Buyer">
        <div className="text-center py-20 space-y-4">
          <p className="text-[#C5C0B8]">Buyer not found</p>
          <Link
            to="/buyers"
            className="inline-flex items-center gap-1.5 text-sm text-[#8B7AFF] hover:underline"
          >
            <ArrowLeft size={14} /> Back to Buyers
          </Link>
        </div>
      </AppShell>
    )
  }

  const fullName = [buyer.first_name, buyer.last_name].filter(Boolean).join(' ')
  const ft = buyer.funding_type?.toLowerCase().replace(/\s+/g, '_') ?? ''
  const fundingCls = FUNDING_COLORS[ft] ?? ''

  return (
    <AppShell title={fullName}>
      <div className="space-y-6 max-w-4xl">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-xs text-[#8A8580]">
          <Link to="/buyers" className="hover:text-[#C5C0B8] transition-colors">
            Buyers
          </Link>
          <span>/</span>
          <span className="text-[#C5C0B8]">{fullName}</span>
        </nav>

        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1
              className="text-xl sm:text-2xl text-[#F0EDE8]"
              style={{ fontFamily: 'Satoshi, sans-serif', fontWeight: 300 }}
            >
              {fullName}
            </h1>
            {buyer.company && (
              <p className="text-sm text-[#8A8580] mt-0.5">{buyer.company}</p>
            )}
            <p className="text-xs text-[#8A8580] mt-2">
              {buyer.total_deals_closed} deal{buyer.total_deals_closed !== 1 ? 's' : ''} &middot;{' '}
              {formatVolume(buyer.total_deal_volume)} volume
            </p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
            {ft && (
              <span
                className={cn(
                  'text-[10px] uppercase tracking-wider px-2 py-0.5 rounded border',
                  fundingCls,
                )}
              >
                {fundingLabel(buyer.funding_type)}
              </span>
            )}
            {buyer.has_pof && (
              <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded border bg-[#4ADE80]/15 text-[#4ADE80] border-[#4ADE80]/30 inline-flex items-center gap-1">
                <ShieldCheck size={11} /> POF &#x2713;
              </span>
            )}
            {seqDropdownOpen && (
              <div className="fixed inset-0 z-10" onClick={() => setSeqDropdownOpen(false)} />
            )}
            <div className="relative">
              <button
                onClick={() => setSeqDropdownOpen(v => !v)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-[#C5C0B8] border border-[#1E1D1B] hover:bg-[#141311] hover:text-[#F0EDE8] transition-colors cursor-pointer"
              >
                <Repeat size={14} />
                Add to Sequence
              </button>
              {seqDropdownOpen && activeSequences.length > 0 && (
                <div className="absolute right-0 top-full mt-1 w-56 bg-[#141311] border border-[#1E1D1B] rounded-xl shadow-xl z-20 py-1">
                  {activeSequences.map(seq => (
                    <button
                      key={seq.id}
                      onClick={async () => {
                        try {
                          await api.sequences.enroll(seq.id, { contact_id: contactId! })
                          toast.success(`Enrolled in "${seq.name}"`)
                          queryClient.invalidateQueries({ queryKey: ['sequences'] })
                          setSeqDropdownOpen(false)
                        } catch (err) {
                          toast.error(err instanceof Error ? err.message : 'Failed to enroll')
                        }
                      }}
                      className="w-full text-left px-3 py-2 text-sm text-[#C5C0B8] hover:bg-[#1E1D1B] hover:text-[#F0EDE8] transition-colors"
                    >
                      {seq.name}
                      <span className="text-[10px] text-[#8A8580] ml-1">
                        ({seq.step_count} steps)
                      </span>
                    </button>
                  ))}
                </div>
              )}
              {seqDropdownOpen && activeSequences.length === 0 && (
                <div className="absolute right-0 top-full mt-1 w-56 bg-[#141311] border border-[#1E1D1B] rounded-xl shadow-xl z-20 p-3">
                  <p className="text-xs text-[#8A8580]">No active sequences. Create one first.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Buy Boxes Section */}
        <BuyBoxesSection contactId={contactId!} buyBoxes={buyer.buy_boxes ?? []} />

        {/* Matching Properties Section */}
        <MatchingPropertiesSection matches={matches} />

        {/* Deal History Section */}
        <DealHistorySection
          totalDealsClosed={buyer.total_deals_closed}
          totalDealVolume={buyer.total_deal_volume}
        />
      </div>
    </AppShell>
  )
}

// ── Buy Boxes Section ────────────────────────────────────
function BuyBoxesSection({
  contactId,
  buyBoxes,
}: {
  contactId: string
  buyBoxes: BuyBox[]
}) {
  const [showEditor, setShowEditor] = useState(false)
  const [newBox, setNewBox] = useState<Partial<CreateBuyBoxRequest>>({ name: '' })
  const createMutation = useCreateBuyBox(contactId)

  function handleSave() {
    if (!newBox.name?.trim()) return
    createMutation.mutate(newBox as CreateBuyBoxRequest, {
      onSuccess: () => {
        setShowEditor(false)
        setNewBox({ name: '' })
      },
    })
  }

  return (
    <section className="bg-[#141311] border border-[#1E1D1B] rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h2
          className="text-base text-[#F0EDE8]"
          style={{ fontFamily: 'Satoshi, sans-serif', fontWeight: 300 }}
        >
          Buy Boxes
        </h2>
        <button
          onClick={() => setShowEditor((v) => !v)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-[#8B7AFF] text-white hover:bg-[#7B6AEF] transition-colors cursor-pointer"
        >
          <Plus size={13} /> Add Buy Box
        </button>
      </div>

      {/* Inline editor */}
      {showEditor && (
        <div className="mb-4 p-4 bg-[#0C0B0A] border border-[#1E1D1B] rounded-lg space-y-4">
          <BuyBoxEditor value={newBox} onChange={setNewBox} />
          <div className="flex items-center gap-2 pt-2">
            <button
              onClick={handleSave}
              disabled={createMutation.isPending || !newBox.name?.trim()}
              className="px-4 py-2 text-xs rounded-lg bg-[#8B7AFF] text-white hover:bg-[#7B6AEF] transition-colors disabled:opacity-50 cursor-pointer"
            >
              {createMutation.isPending ? 'Saving...' : 'Save'}
            </button>
            <button
              onClick={() => {
                setShowEditor(false)
                setNewBox({ name: '' })
              }}
              className="px-4 py-2 text-xs rounded-lg text-[#8A8580] hover:text-[#C5C0B8] transition-colors cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Buy box list */}
      {buyBoxes.length === 0 && !showEditor ? (
        <p className="text-sm text-[#8A8580]">No buy boxes yet</p>
      ) : (
        <div className="space-y-2">
          {buyBoxes.map((box) => (
            <BuyBoxCard key={box.id} contactId={contactId} box={box} />
          ))}
        </div>
      )}
    </section>
  )
}

// ── Buy Box Card ─────────────────────────────────────────
function BuyBoxCard({ contactId, box }: { contactId: string; box: BuyBox }) {
  const [expanded, setExpanded] = useState(false)
  const deleteMutation = useDeleteBuyBox(contactId)

  function handleDelete() {
    if (!confirm(`Delete buy box "${box.name}"?`)) return
    deleteMutation.mutate(box.id)
  }

  const summary = buyBoxSummary(box)

  return (
    <div className="border border-[#1E1D1B] rounded-lg overflow-hidden">
      {/* Collapsed header */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[#1E1D1B]/50 transition-colors cursor-pointer"
      >
        {expanded ? (
          <ChevronDown size={14} className="text-[#8A8580] shrink-0" />
        ) : (
          <ChevronRight size={14} className="text-[#8A8580] shrink-0" />
        )}
        <div className="min-w-0 flex-1">
          <p className="text-sm text-[#F0EDE8] truncate">{box.name}</p>
          {!expanded && summary && (
            <p className="text-xs text-[#8A8580] truncate mt-0.5">{summary}</p>
          )}
        </div>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="px-4 pb-4 pt-1 border-t border-[#1E1D1B]">
          <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-xs mt-3">
            {box.target_markets?.length ? (
              <DetailField label="Markets" value={box.target_markets.join(', ')} />
            ) : null}
            {(box.min_price != null || box.max_price != null) && (
              <DetailField
                label="Price Range"
                value={`${formatPrice(box.min_price) || '---'} - ${formatPrice(box.max_price) || '---'}`}
              />
            )}
            {box.property_types?.length ? (
              <DetailField label="Property Types" value={box.property_types.map(t => t.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())).join(', ')} />
            ) : null}
            {box.strategies?.length ? (
              <DetailField
                label="Strategies"
                value={box.strategies.map(humanizeStrategy).join(', ')}
              />
            ) : null}
            {box.min_bedrooms != null && (
              <DetailField label="Bedrooms" value={`${box.min_bedrooms}+`} />
            )}
            {box.min_bathrooms != null && (
              <DetailField label="Bathrooms" value={`${box.min_bathrooms}+`} />
            )}
            {box.funding_type && (
              <DetailField label="Funding" value={fundingLabel(box.funding_type)} />
            )}
            {box.can_close_days != null && (
              <DetailField label="Close Timeline" value={`${box.can_close_days} days`} />
            )}
            <DetailField label="POF" value={box.proof_of_funds ? 'Yes' : 'No'} />
            {box.notes && <DetailField label="Notes" value={box.notes} span2 />}
          </div>

          <div className="mt-4 pt-3 border-t border-[#1E1D1B]">
            <button
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              className="inline-flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 transition-colors cursor-pointer disabled:opacity-50"
            >
              <Trash2 size={12} />
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Detail Field ─────────────────────────────────────────
function DetailField({
  label,
  value,
  span2,
}: {
  label: string
  value: string
  span2?: boolean
}) {
  return (
    <div className={span2 ? 'col-span-2' : ''}>
      <p className="text-[10px] uppercase tracking-wider text-[#8A8580] mb-0.5">{label}</p>
      <p className="text-[#C5C0B8]">{value}</p>
    </div>
  )
}

const MATCH_LEVEL_COLORS: Record<string, { text: string; bg: string }> = {
  strong:   { text: 'text-[#4ADE80]', bg: 'bg-[#4ADE80]/15' },
  moderate: { text: 'text-[#FBBF24]', bg: 'bg-[#FBBF24]/15' },
  weak:     { text: 'text-[#F97316]', bg: 'bg-[#F97316]/15' },
  no_match: { text: 'text-[#8A8580]', bg: 'bg-[#1E1D1B]' },
}

// ── Matching Properties Section ──────────────────────────
function MatchingPropertiesSection({ matches }: { matches: BuyerMatchResult[] }) {
  return (
    <section className="bg-[#141311] border border-[#1E1D1B] rounded-xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <h2
          className="text-base text-[#F0EDE8]"
          style={{ fontFamily: 'Satoshi, sans-serif', fontWeight: 300 }}
        >
          Matching Properties
        </h2>
        {matches.length > 0 && (
          <span className="px-2 py-0.5 text-xs rounded-full bg-[#1E1D1B] text-[#8A8580]">
            {matches.length}
          </span>
        )}
      </div>

      {matches.length === 0 ? (
        <p className="text-sm text-[#8A8580]">No properties match this buyer's criteria</p>
      ) : (
        <div className="space-y-2">
          {matches.map((match) => {
            const levelColors = MATCH_LEVEL_COLORS[match.match_level] ?? MATCH_LEVEL_COLORS.no_match
            return (
              <Link
                key={match.property_id}
                to={`/properties/${match.property_id}`}
                className="flex items-center justify-between gap-4 p-3 rounded-lg border border-[#1E1D1B] hover:border-[#8B7AFF]/30 transition-colors group"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-[#F0EDE8] group-hover:text-[#8B7AFF] transition-colors truncate">
                    {match.address}
                  </p>
                  <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                    <span className={cn('text-xs font-medium tabular-nums', levelColors.text)}>
                      {match.score}
                    </span>
                    <span className={cn('text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded', levelColors.bg, levelColors.text)}>
                      {match.match_level.replace('_', ' ')}
                    </span>
                    <span className="text-[10px] text-[#8A8580] truncate">{match.buy_box_name}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 text-xs">
                  {match.purchase_price != null && (
                    <span className="text-[#F0EDE8] font-medium">
                      {formatPrice(match.purchase_price)}
                    </span>
                  )}
                  {match.strategy && (
                    <span className="px-2 py-0.5 rounded bg-[#8B7AFF]/15 text-[#8B7AFF] border border-[#8B7AFF]/30">
                      {humanizeStrategy(match.strategy)}
                    </span>
                  )}
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </section>
  )
}

// ── Deal History Section ─────────────────────────────────
function DealHistorySection({
  totalDealsClosed,
  totalDealVolume,
}: {
  totalDealsClosed: number
  totalDealVolume: number
}) {
  return (
    <section className="bg-[#141311] border border-[#1E1D1B] rounded-xl p-5">
      <h2
        className="text-base text-[#F0EDE8] mb-4"
        style={{ fontFamily: 'Satoshi, sans-serif', fontWeight: 300 }}
      >
        Deal History
      </h2>

      {totalDealsClosed === 0 ? (
        <p className="text-sm text-[#8A8580]">No deals closed with this buyer yet</p>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 rounded-lg bg-[#0C0B0A] border border-[#1E1D1B]">
            <p className="text-[10px] uppercase tracking-wider text-[#8A8580] mb-1">Deals Closed</p>
            <p className="text-2xl text-[#F0EDE8]" style={{ fontFamily: 'Satoshi, sans-serif', fontWeight: 300 }}>
              {totalDealsClosed}
            </p>
          </div>
          <div className="p-4 rounded-lg bg-[#0C0B0A] border border-[#1E1D1B]">
            <p className="text-[10px] uppercase tracking-wider text-[#8A8580] mb-1">Total Volume</p>
            <p className="text-2xl text-[#F0EDE8]" style={{ fontFamily: 'Satoshi, sans-serif', fontWeight: 300 }}>
              {formatVolume(totalDealVolume)}
            </p>
          </div>
        </div>
      )}
    </section>
  )
}
