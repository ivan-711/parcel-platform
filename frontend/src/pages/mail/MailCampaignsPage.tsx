/** Mail campaigns list page — shows all campaigns with status badges, stats, and actions. */

import { Link } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { Mail, Plus, Trash2, BarChart2, Edit2, Lock } from 'lucide-react'
import { ErrorState } from '@/components/ui/ErrorState'
import { useBillingStatus } from '@/hooks/useBilling'
import { useAuthStore } from '@/stores/authStore'
import { AppShell } from '@/components/layout/AppShell'
import { EmptyState } from '@/components/EmptyState'
import { useMailCampaigns, useDeleteMailCampaign } from '@/hooks/useMailCampaigns'
import { cn } from '@/lib/utils'
import type { MailCampaignListItem } from '@/types'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STATUS_STYLES: Record<MailCampaignListItem['status'], string> = {
  draft:     'bg-[#8A8580]/15 text-[#8A8580]',
  scheduled: 'bg-[#60A5FA]/15 text-[#60A5FA]',
  sending:   'bg-[#FBBF24]/15 text-[#FBBF24]',
  sent:      'bg-[#4ADE80]/15 text-[#4ADE80]',
  cancelled: 'bg-[#EF4444]/15 text-[#EF4444]',
}

const MAIL_TYPE_LABELS: Record<string, string> = {
  postcard_4x6:  '4×6 Postcard',
  postcard_6x9:  '6×9 Postcard',
  postcard_6x11: '6×11 Postcard',
  letter:        'Letter',
}

function formatCost(cents: number) {
  return `$${(cents / 100).toFixed(2)}`
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return null
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

// ---------------------------------------------------------------------------
// Status badge
// ---------------------------------------------------------------------------

function StatusBadge({ status }: { status: MailCampaignListItem['status'] }) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize',
        STATUS_STYLES[status] ?? STATUS_STYLES.draft,
      )}
    >
      {status}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Skeleton card
// ---------------------------------------------------------------------------

function SkeletonCard() {
  return (
    <div className="bg-[#141311] border border-[#1E1D1B] rounded-xl p-4 space-y-3 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-4 w-48 bg-[#1E1D1B] rounded" />
        <div className="h-5 w-16 bg-[#1E1D1B] rounded" />
      </div>
      <div className="h-3 w-32 bg-[#1E1D1B] rounded" />
      <div className="h-3 w-64 bg-[#1E1D1B] rounded" />
      <div className="flex justify-between">
        <div className="h-3 w-24 bg-[#1E1D1B] rounded" />
        <div className="flex gap-2">
          <div className="h-6 w-12 bg-[#1E1D1B] rounded" />
          <div className="h-6 w-16 bg-[#1E1D1B] rounded" />
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Campaign card
// ---------------------------------------------------------------------------

function CampaignCard({ campaign }: { campaign: MailCampaignListItem }) {
  const deleteMutation = useDeleteMailCampaign()
  const isDraft = campaign.status === 'draft'

  function handleDelete() {
    if (!confirm(`Delete "${campaign.name}"? This cannot be undone.`)) return
    deleteMutation.mutate(campaign.id)
  }

  const dateLabel = campaign.sent_at
    ? `Sent ${formatDate(campaign.sent_at)}`
    : campaign.scheduled_date
    ? `Scheduled ${formatDate(campaign.scheduled_date)}`
    : `Created ${formatDate(campaign.created_at)}`

  return (
    <div className="bg-[#141311] border border-[#1E1D1B] rounded-xl p-4 hover:border-[#8B7AFF]/30 transition-colors">
      {/* Row 1: name + status */}
      <div className="flex items-center justify-between gap-3 mb-1">
        <span
          className="text-sm text-[#F0EDE8] truncate"
          style={{ fontFamily: 'Satoshi, sans-serif', fontWeight: 300 }}
        >
          {campaign.name}
        </span>
        <StatusBadge status={campaign.status} />
      </div>

      {/* Row 2: mail type + date */}
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs text-[#8A8580]">
          {MAIL_TYPE_LABELS[campaign.mail_type] ?? campaign.mail_type}
        </span>
        <span className="text-[#1E1D1B]">·</span>
        <span className="text-xs text-[#8A8580]">{dateLabel}</span>
      </div>

      {/* Row 3: stats */}
      <p className="text-xs text-[#8A8580] mb-3">
        {campaign.total_recipients} recipients
        {' · '}
        {campaign.total_delivered} delivered
        {' · '}
        {campaign.total_returned} returned
        {' · '}
        {formatCost(campaign.total_cost_cents)} spent
      </p>

      {/* Row 4: actions */}
      <div className="flex items-center justify-end gap-1">
        {isDraft && (
          <Link
            to={`/mail-campaigns/${campaign.id}`}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs text-[#8A8580] hover:text-[#F0EDE8] hover:bg-[#1E1D1B] transition-colors"
          >
            <Edit2 size={12} />
            Edit
          </Link>
        )}

        <Link
          to={`/mail-campaigns/${campaign.id}/analytics`}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs text-[#8A8580] hover:text-[#F0EDE8] hover:bg-[#1E1D1B] transition-colors"
        >
          <BarChart2 size={12} />
          Analytics
        </Link>

        {isDraft && (
          <button
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs text-[#8A8580] hover:text-[#EF4444] hover:bg-[#1E1D1B] transition-colors disabled:opacity-40"
          >
            <Trash2 size={12} />
            Delete
          </button>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function MailCampaignsPage() {
  const queryClient = useQueryClient()
  const { data: campaigns, isLoading, isError, error } = useMailCampaigns()
  const { data: billing } = useBillingStatus()
  const user = useAuthStore((s) => s.user)
  const count = campaigns?.length ?? 0

  // Tier gate: Direct mail requires Titanium (business)
  const userPlan = billing?.plan ?? user?.plan_tier ?? 'free'
  if (userPlan !== 'business') {
    return (
      <AppShell title="Mail Campaigns">
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)] px-4 text-center">
          <div className="max-w-sm">
            <div className="w-14 h-14 rounded-2xl bg-[#8B7AFF]/10 flex items-center justify-center mx-auto mb-6">
              <Lock size={24} className="text-[#8B7AFF]" />
            </div>
            <h1 className="text-2xl text-text-primary mb-3" style={{ fontFamily: 'Satoshi, sans-serif', fontWeight: 300 }}>
              Available on Titanium
            </h1>
            <p className="text-sm text-text-secondary mb-6">
              Direct mail campaigns are available on the Titanium plan. Send postcards and letters to property owners at scale.
            </p>
            <Link
              to="/pricing"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-medium bg-[#8B7AFF] text-white hover:bg-[#7B6AEF] transition-colors"
            >
              View Plans
            </Link>
          </div>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell title="Mail Campaigns">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h1
              className="text-2xl text-[#F0EDE8]"
              style={{ fontFamily: 'Satoshi, sans-serif', fontWeight: 300 }}
            >
              Mail Campaigns
            </h1>
            {count > 0 && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-[#1E1D1B] text-[#8A8580]">
                {count}
              </span>
            )}
          </div>

          <Link
            to="/mail-campaigns/new"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm bg-[#8B7AFF] text-white hover:bg-[#7B6AEF] transition-colors"
            style={{ fontFamily: 'Satoshi, sans-serif', fontWeight: 300 }}
          >
            <Plus size={15} />
            Create Campaign
          </Link>
        </div>

        {/* Body */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((n) => <SkeletonCard key={n} />)}
          </div>
        ) : isError ? (
          <ErrorState
            message={error instanceof Error ? error.message : 'Failed to load campaigns'}
            onRetry={() => queryClient.invalidateQueries({ queryKey: ['mail-campaigns'] })}
          />
        ) : count === 0 ? (
          <EmptyState
            icon={Mail}
            heading="No campaigns yet"
            description="Create your first mail campaign to reach property owners."
            ctaLabel="Create Campaign"
            ctaHref="/mail-campaigns/new"
          />
        ) : (
          <div className="space-y-3">
            {campaigns!.map((campaign) => (
              <CampaignCard key={campaign.id} campaign={campaign} />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  )
}
