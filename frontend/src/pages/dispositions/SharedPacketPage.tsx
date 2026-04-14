/** Public buyer packet page — no auth, no AppShell, light theme. */

import { useParams, Link } from 'react-router-dom'
import { Home, Bed, Bath, Maximize, Calendar, Mail, Phone } from 'lucide-react'
import { useSharedPacket } from '@/hooks/useDispositions'

/* ═══════════════════════════════════════════════════════════════════════════
   Helpers
═══════════════════════════════════════════════════════════════════════════ */

function formatCurrency(n: number | null | undefined): string {
  if (n === null || n === undefined) return 'N/A'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n)
}

function humanizeStrategy(s: string): string {
  const map: Record<string, string> = {
    buy_and_hold: 'Buy & Hold',
    brrrr: 'BRRRR',
    flip: 'Fix & Flip',
    wholesale: 'Wholesale',
    creative_finance: 'Creative Finance',
    subject_to: 'Subject To',
    seller_finance: 'Seller Finance',
    lease_option: 'Lease Option',
  }
  return map[s] ?? s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

/* ═══════════════════════════════════════════════════════════════════════════
   Sub-components
═══════════════════════════════════════════════════════════════════════════ */

function MetricCard({
  label,
  value,
  highlight = false,
}: {
  label: string
  value: string
  highlight?: boolean
}) {
  return (
    <div
      className={`rounded-xl p-4 space-y-1 ${
        highlight
          ? 'bg-violet-400 text-white'
          : 'bg-app-surface border border-border-default'
      }`}
    >
      <p
        className={`text-[11px] uppercase tracking-[0.08em] font-medium ${
          highlight ? 'text-violet-100' : 'text-text-muted'
        }`}
      >
        {label}
      </p>
      <p
        className={`text-[22px] font-semibold leading-tight ${
          highlight ? 'text-white' : 'text-text-primary'
        }`}
      >
        {value}
      </p>
    </div>
  )
}

function ParcelLogo() {
  return (
    <Link to="/" className="flex items-center gap-2 group">
      <div className="w-7 h-7 rounded-lg bg-violet-400 flex items-center justify-center">
        <span className="text-[11px] font-bold text-white">P</span>
      </div>
      <span className="text-sm font-semibold text-text-primary tracking-tight group-hover:text-violet-400 transition-colors">
        Parcel
      </span>
    </Link>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   Loading / Error states
═══════════════════════════════════════════════════════════════════════════ */

function LoadingState() {
  return (
    <div className="min-h-screen bg-app-bg flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-2 border-violet-400 border-t-transparent animate-spin" />
    </div>
  )
}

function ErrorState() {
  return (
    <div className="min-h-screen bg-app-bg flex items-center justify-center px-6">
      <div className="text-center space-y-3">
        <div className="w-12 h-12 rounded-2xl bg-layer-1 border border-border-default flex items-center justify-center mx-auto">
          <span className="text-xl text-text-muted">?</span>
        </div>
        <h2 className="text-lg font-semibold text-text-primary">Packet Not Found</h2>
        <p className="text-sm text-text-muted">
          This buyer packet is no longer available or the link has expired.
        </p>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   Main Page
═══════════════════════════════════════════════════════════════════════════ */

export default function SharedPacketPage() {
  const { shareToken } = useParams<{ shareToken: string }>()
  const { data: packet, isLoading, isError } = useSharedPacket(shareToken)

  if (isLoading) return <LoadingState />
  if (isError || !packet) return <ErrorState />

  const { packet_data, title, asking_price, assignment_fee, notes_to_buyer } = packet
  const { property, scenario, ai_narrative, seller_name, seller_email, seller_phone } = packet_data
  const outputs = scenario.outputs ?? {}

  const fullAddress = [
    property.address,
    property.city,
    property.state,
    property.zip_code,
  ]
    .filter(Boolean)
    .join(', ')

  const monthlyCashFlow = outputs.monthly_cash_flow as number | null | undefined
  const capRate = outputs.cap_rate as number | null | undefined

  return (
    <div className="min-h-screen bg-app-bg">
      {/* ── Header ── */}
      <header className="bg-app-surface border-b border-border-default sticky top-0 z-50">
        <div className="max-w-[720px] mx-auto px-6 h-14 flex items-center justify-between">
          <ParcelLogo />
          <span className="text-[10px] text-text-muted uppercase tracking-[0.08em] font-medium">
            Buyer Packet
          </span>
        </div>
      </header>

      <main className="max-w-[720px] mx-auto px-6 py-10 space-y-8">
        {/* ── Title & Address ── */}
        <div className="space-y-1">
          <h1
            className="text-[28px] leading-tight text-text-primary font-brand font-normal"
          >
            {title}
          </h1>
          <p className="text-[15px] text-text-muted">{fullAddress}</p>
        </div>

        {/* ── Property Details card ── */}
        <div className="bg-app-surface border border-border-default rounded-2xl p-6 space-y-4">
          <h2 className="text-[13px] font-semibold text-text-secondary uppercase tracking-[0.06em]">
            Property Details
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {property.property_type && (
              <div className="flex items-center gap-2">
                <Home size={15} className="text-text-muted shrink-0" />
                <div>
                  <p className="text-[11px] text-text-muted uppercase tracking-[0.06em]">Type</p>
                  <p className="text-[14px] font-medium text-text-primary">{property.property_type}</p>
                </div>
              </div>
            )}
            {property.bedrooms !== null && property.bedrooms !== undefined && (
              <div className="flex items-center gap-2">
                <Bed size={15} className="text-text-muted shrink-0" />
                <div>
                  <p className="text-[11px] text-text-muted uppercase tracking-[0.06em]">Beds</p>
                  <p className="text-[14px] font-medium text-text-primary">{property.bedrooms}</p>
                </div>
              </div>
            )}
            {property.bathrooms !== null && property.bathrooms !== undefined && (
              <div className="flex items-center gap-2">
                <Bath size={15} className="text-text-muted shrink-0" />
                <div>
                  <p className="text-[11px] text-text-muted uppercase tracking-[0.06em]">Baths</p>
                  <p className="text-[14px] font-medium text-text-primary">{property.bathrooms}</p>
                </div>
              </div>
            )}
            {property.sqft !== null && property.sqft !== undefined && (
              <div className="flex items-center gap-2">
                <Maximize size={15} className="text-text-muted shrink-0" />
                <div>
                  <p className="text-[11px] text-text-muted uppercase tracking-[0.06em]">Sq Ft</p>
                  <p className="text-[14px] font-medium text-text-primary">
                    {property.sqft.toLocaleString('en-US')}
                  </p>
                </div>
              </div>
            )}
            {property.year_built !== null && property.year_built !== undefined && (
              <div className="flex items-center gap-2">
                <Calendar size={15} className="text-text-muted shrink-0" />
                <div>
                  <p className="text-[11px] text-text-muted uppercase tracking-[0.06em]">Built</p>
                  <p className="text-[14px] font-medium text-text-primary">{property.year_built}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Financial Overview card ── */}
        <div className="bg-app-surface border border-border-default rounded-2xl p-6 space-y-4">
          <h2 className="text-[13px] font-semibold text-text-secondary uppercase tracking-[0.06em]">
            Financial Overview
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <MetricCard
              label="Asking Price"
              value={formatCurrency(asking_price)}
              highlight
            />
            {scenario.after_repair_value !== null && scenario.after_repair_value !== undefined && (
              <MetricCard label="ARV" value={formatCurrency(scenario.after_repair_value)} />
            )}
            {scenario.repair_cost !== null && scenario.repair_cost !== undefined && (
              <MetricCard label="Repair Estimate" value={formatCurrency(scenario.repair_cost)} />
            )}
            {assignment_fee !== null && assignment_fee !== undefined && (
              <MetricCard label="Assignment Fee" value={formatCurrency(assignment_fee)} />
            )}
            {monthlyCashFlow !== null && monthlyCashFlow !== undefined && (
              <MetricCard
                label="Projected Cash Flow"
                value={formatCurrency(monthlyCashFlow) + '/mo'}
              />
            )}
            {capRate !== null && capRate !== undefined && (
              <MetricCard
                label="Cap Rate"
                value={`${(capRate as number).toFixed(2)}%`}
              />
            )}
            <MetricCard label="Strategy" value={humanizeStrategy(scenario.strategy)} />
          </div>
        </div>

        {/* ── AI Narrative ── */}
        {ai_narrative && (
          <div className="space-y-3">
            <h2 className="text-[15px] font-semibold text-text-primary">Deal Analysis</h2>
            <p className="text-[14px] text-text-secondary leading-relaxed whitespace-pre-line">
              {ai_narrative}
            </p>
          </div>
        )}

        {/* ── Notes from seller ── */}
        {notes_to_buyer && (
          <div className="bg-violet-50 border border-violet-100 rounded-2xl p-5 space-y-2">
            <h2 className="text-[13px] font-semibold text-violet-700 uppercase tracking-[0.06em]">
              Notes from Seller
            </h2>
            <p className="text-[14px] text-text-secondary leading-relaxed whitespace-pre-line">
              {notes_to_buyer}
            </p>
          </div>
        )}

        {/* ── CTA ── */}
        {(seller_name || seller_email || seller_phone) && (
          <div className="bg-app-surface border border-border-default rounded-2xl p-6 space-y-4 text-center">
            <h2
              className="text-[22px] text-text-primary font-brand font-normal"
            >
              Interested?
            </h2>
            {seller_name && (
              <p className="text-[14px] text-text-muted">
                Contact <span className="font-medium text-text-primary">{seller_name}</span>
              </p>
            )}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              {seller_email && (
                <a
                  href={`mailto:${seller_email}`}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-400 text-white text-[14px] font-medium hover:bg-violet-500 transition-colors"
                >
                  <Mail size={15} />
                  {seller_email}
                </a>
              )}
              {seller_phone && (
                <a
                  href={`tel:${seller_phone}`}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-violet-400 text-violet-400 text-[14px] font-medium hover:bg-violet-50 transition-colors"
                >
                  <Phone size={15} />
                  {seller_phone}
                </a>
              )}
            </div>
          </div>
        )}
      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-border-default mt-12">
        <div className="max-w-[720px] mx-auto px-6 py-8 text-center">
          <p className="text-[12px] text-text-muted">Powered by Parcel</p>
        </div>
      </footer>
    </div>
  )
}
