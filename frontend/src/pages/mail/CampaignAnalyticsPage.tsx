import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Mail } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { EmptyState } from '@/components/EmptyState'
import { useCampaignAnalytics, useMailCampaign } from '@/hooks/useMailCampaigns'
import { cn } from '@/lib/utils'
import type { MailRecipient } from '@/types'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAIL_TYPE_LABELS: Record<string, string> = {
  postcard_4x6:  '4×6 Postcard',
  postcard_6x9:  '6×9 Postcard',
  postcard_6x11: '6×11 Postcard',
  letter:        'Letter',
}

const CAMPAIGN_STATUS_STYLES: Record<string, string> = {
  draft:     'bg-text-muted/15 text-text-muted',
  scheduled: 'bg-info/15 text-info',
  sending:   'bg-warning/15 text-warning',
  sent:      'bg-profit/15 text-profit',
  cancelled: 'bg-loss/15 text-loss',
}

const RECIPIENT_STATUS_STYLES: Record<string, string> = {
  pending:    'bg-text-muted/15 text-text-muted',
  queued:     'bg-text-muted/15 text-text-secondary',
  in_transit: 'bg-warning/15 text-warning',
  delivered:  'bg-profit/15 text-profit',
  returned:   'bg-loss/15 text-loss',
  cancelled:  'bg-border-default text-text-muted',
  failed:     'bg-loss/15 text-loss',
}

function formatCost(cents: number | null) {
  if (cents == null) return '—'
  return `$${(cents / 100).toFixed(2)}`
}

function formatCostDollars(cents: number) {
  return `$${(cents / 100).toFixed(2)}`
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function CampaignStatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize',
        CAMPAIGN_STATUS_STYLES[status] ?? CAMPAIGN_STATUS_STYLES.draft,
      )}
    >
      {status}
    </span>
  )
}

function RecipientStatusBadge({ status }: { status: string }) {
  const label = status.replace(/_/g, ' ')
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize',
        RECIPIENT_STATUS_STYLES[status] ?? RECIPIENT_STATUS_STYLES.pending,
      )}
    >
      {label}
    </span>
  )
}

function KpiCard({
  label,
  value,
  color,
}: {
  label: string
  value: number
  color: 'blue' | 'yellow' | 'green' | 'red'
}) {
  const colorMap = {
    blue:   'text-info',
    yellow: 'text-warning',
    green:  'text-profit',
    red:    'text-loss',
  }
  return (
    <div className="bg-app-recessed border border-border-default rounded-xl p-5 flex flex-col gap-1">
      <p className={cn('text-3xl tabular-nums font-brand font-light', colorMap[color])}>
        {value.toLocaleString()}
      </p>
      <p className="text-xs text-text-muted uppercase tracking-wider">{label}</p>
    </div>
  )
}

function RecipientRow({ recipient }: { recipient: MailRecipient }) {
  const addr = recipient.to_address
  const addressStr = [addr.line1, addr.line2, addr.city, addr.state, addr.zip]
    .filter(Boolean)
    .join(', ')

  return (
    <tr className="border-b border-border-default last:border-0 hover:bg-app-recessed/50 transition-colors">
      <td className="px-4 py-3 text-sm text-text-primary whitespace-nowrap">
        {recipient.to_name ?? <span className="text-text-muted">—</span>}
      </td>
      <td className="px-4 py-3 text-sm text-text-secondary">{addressStr}</td>
      <td className="px-4 py-3">
        <RecipientStatusBadge status={recipient.status} />
      </td>
      <td className="px-4 py-3 text-xs text-text-muted font-mono whitespace-nowrap">
        {recipient.lob_mail_id ?? <span className="text-text-muted">—</span>}
      </td>
      <td className="px-4 py-3 text-sm text-text-secondary tabular-nums text-right whitespace-nowrap">
        {formatCost(recipient.cost_cents)}
      </td>
    </tr>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function CampaignAnalyticsPage() {
  const { id } = useParams<{ id: string }>()

  const { data: campaign, isLoading: campaignLoading, isError: campaignError } = useMailCampaign(id)
  const { data: analytics, isLoading: analyticsLoading } = useCampaignAnalytics(id)

  const isLoading = campaignLoading || analyticsLoading

  if (isLoading) {
    return (
      <AppShell title="Campaign Analytics">
        <div className="space-y-4">
          <div className="h-6 w-48 bg-app-recessed rounded animate-pulse" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[0, 1, 2, 3].map(i => (
              <div key={i} className="h-24 bg-app-recessed rounded-xl animate-pulse" />
            ))}
          </div>
          <div className="h-6 bg-app-recessed rounded-full animate-pulse" />
          <div className="h-32 bg-app-recessed rounded-xl animate-pulse" />
          <div className="h-64 bg-app-recessed rounded-xl animate-pulse" />
        </div>
      </AppShell>
    )
  }

  if (campaignError || !campaign) {
    return (
      <AppShell title="Campaign Analytics">
        <EmptyState
          icon={Mail}
          heading="Campaign not found"
          description="This campaign may have been deleted."
          ctaLabel="Back to Mail Campaigns"
          ctaHref="/mail-campaigns"
        />
      </AppShell>
    )
  }

  const sent        = analytics?.total_sent ?? campaign.total_sent ?? 0
  const delivered   = analytics?.total_delivered ?? campaign.total_delivered ?? 0
  const returned    = analytics?.total_returned ?? campaign.total_returned ?? 0
  const totalCost   = analytics?.total_cost_cents ?? campaign.total_cost_cents ?? 0
  const recipients  = campaign.recipients ?? []

  // In-transit = sent but not yet delivered or returned
  const inTransit = Math.max(0, sent - delivered - returned)

  const deliveryRate = sent > 0 ? Math.round((delivered / sent) * 100) : 0
  const avgCostCents = sent > 0 ? totalCost / sent : 0

  const mailTypeLabel = MAIL_TYPE_LABELS[campaign.mail_type] ?? campaign.mail_type

  return (
    <AppShell
      title={`${campaign.name} — Analytics`}
      breadcrumbs={[
        { label: 'Mail Campaigns', href: '/mail-campaigns' },
        { label: campaign.name, href: `/mail-campaigns/${campaign.id}` },
        { label: 'Analytics' },
      ]}
    >
      <div className="space-y-6">
        {/* Back link + Header */}
        <div>
          <Link
            to="/mail-campaigns"
            className="inline-flex items-center gap-1.5 text-xs text-text-muted hover:text-text-secondary transition-colors mb-4"
          >
            <ArrowLeft size={13} />
            Mail Campaigns
          </Link>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h1
                className="text-xl sm:text-2xl text-text-primary font-brand font-light mb-1"
              >
                {campaign.name}
              </h1>
              <p className="text-sm text-text-muted">{mailTypeLabel}</p>
            </div>
            <CampaignStatusBadge status={campaign.status} />
          </div>
        </div>

        {/* Delivery Funnel — 4 KPI cards */}
        <div>
          <h2 className="text-[11px] uppercase tracking-wider text-text-muted font-medium mb-3">
            Delivery Funnel
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <KpiCard label="Total Sent"  value={sent}       color="blue"   />
            <KpiCard label="In Transit"  value={inTransit}  color="yellow" />
            <KpiCard label="Delivered"   value={delivered}  color="green"  />
            <KpiCard label="Returned"    value={returned}   color="red"    />
          </div>
        </div>

        {/* Delivery Rate Bar */}
        <div className="bg-app-recessed border border-border-default rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[11px] uppercase tracking-wider text-text-muted font-medium">
              Delivery Rate
            </h2>
            <span className="text-sm text-profit tabular-nums font-medium">
              {deliveryRate}% delivered
            </span>
          </div>
          <div className="h-2.5 bg-border-default rounded-full overflow-hidden">
            <div
              className="h-full bg-profit rounded-full transition-all duration-500"
              style={{ width: `${deliveryRate}%` }}
            />
          </div>
          {sent === 0 && (
            <p className="text-xs text-text-muted mt-2">No mail sent yet.</p>
          )}
        </div>

        {/* Cost Summary */}
        <div className="bg-app-recessed border border-border-default rounded-xl p-5">
          <h2 className="text-[11px] uppercase tracking-wider text-text-muted font-medium mb-4">
            Cost Summary
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-app-bg rounded-lg p-4">
              <p className="text-[10px] uppercase tracking-wider text-text-muted mb-1">Total Cost</p>
              <p className="text-lg text-text-primary tabular-nums font-brand font-light">
                {formatCostDollars(totalCost)}
              </p>
            </div>
            <div className="bg-app-bg rounded-lg p-4">
              <p className="text-[10px] uppercase tracking-wider text-text-muted mb-1">Avg. Cost / Piece</p>
              <p className="text-lg text-text-primary tabular-nums font-brand font-light">
                {sent > 0 ? formatCostDollars(avgCostCents) : '—'}
              </p>
            </div>
            <div className="bg-app-bg rounded-lg p-4">
              <p className="text-[10px] uppercase tracking-wider text-text-muted mb-1">Mail Type</p>
              <p className="text-base text-text-primary">{mailTypeLabel}</p>
            </div>
          </div>
        </div>

        {/* Recipients Table */}
        <div>
          <h2 className="text-[11px] uppercase tracking-wider text-text-muted font-medium mb-3">
            Recipients ({recipients.length})
          </h2>
          <div className="bg-app-recessed border border-border-default rounded-xl overflow-hidden">
            {recipients.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-sm text-text-muted">No recipients added to this campaign.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border-default">
                      <th className="px-4 py-3 text-left text-[10px] uppercase tracking-wider text-text-muted font-medium">Name</th>
                      <th className="px-4 py-3 text-left text-[10px] uppercase tracking-wider text-text-muted font-medium">Address</th>
                      <th className="px-4 py-3 text-left text-[10px] uppercase tracking-wider text-text-muted font-medium">Status</th>
                      <th className="px-4 py-3 text-left text-[10px] uppercase tracking-wider text-text-muted font-medium">Lob ID</th>
                      <th className="px-4 py-3 text-right text-[10px] uppercase tracking-wider text-text-muted font-medium">Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recipients.map(r => (
                      <RecipientRow key={r.id} recipient={r} />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  )
}
