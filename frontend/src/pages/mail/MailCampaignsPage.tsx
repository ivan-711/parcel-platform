/** Mail campaigns list page — shows all campaigns with status badges, stats, and actions. */

import { Link } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Mail, Plus, Trash2, BarChart2, Edit2 } from 'lucide-react'
import { ErrorState } from '@/components/ui/ErrorState'
import { AppShell } from '@/components/layout/AppShell'
import { ComingSoonGate } from '@/components/ComingSoonGate'
import { FeatureGate } from '@/components/billing/FeatureGate'
import { EmptyState } from '@/components/EmptyState'
import { useMailCampaigns, useDeleteMailCampaign } from '@/hooks/useMailCampaigns'
import { cn } from '@/lib/utils'
import { safeStaggerContainer, safeStaggerItem } from '@/lib/motion'
import type { MailCampaignListItem } from '@/types'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STATUS_STYLES: Record<MailCampaignListItem['status'], string> = {
  draft:     'bg-text-muted/15 text-text-muted',
  scheduled: 'bg-info/15 text-info',
  sending:   'bg-warning/15 text-warning',
  sent:      'bg-profit/15 text-profit',
  cancelled: 'bg-loss/15 text-loss',
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
    <div className="bg-app-recessed border border-border-default rounded-xl p-4 space-y-3 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-4 w-48 bg-border-default rounded" />
        <div className="h-5 w-16 bg-border-default rounded" />
      </div>
      <div className="h-3 w-32 bg-border-default rounded" />
      <div className="h-3 w-64 bg-border-default rounded" />
      <div className="flex justify-between">
        <div className="h-3 w-24 bg-border-default rounded" />
        <div className="flex gap-2">
          <div className="h-6 w-12 bg-border-default rounded" />
          <div className="h-6 w-16 bg-border-default rounded" />
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
    <div className="bg-app-recessed border border-border-default rounded-xl p-4 hover:border-violet-400/30 transition-colors">
      {/* Row 1: name + status */}
      <div className="flex items-center justify-between gap-3 mb-1">
        <span
          className="text-sm text-text-primary font-brand font-light truncate"
        >
          {campaign.name}
        </span>
        <StatusBadge status={campaign.status} />
      </div>

      {/* Row 2: mail type + date */}
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs text-text-muted">
          {MAIL_TYPE_LABELS[campaign.mail_type] ?? campaign.mail_type}
        </span>
        <span className="text-border-default">·</span>
        <span className="text-xs text-text-muted">{dateLabel}</span>
      </div>

      {/* Row 3: stats */}
      <p className="text-xs text-text-muted mb-3">
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
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs text-text-muted hover:text-text-primary hover:bg-border-default transition-colors"
          >
            <Edit2 size={12} />
            Edit
          </Link>
        )}

        <Link
          to={`/mail-campaigns/${campaign.id}/analytics`}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs text-text-muted hover:text-text-primary hover:bg-border-default transition-colors"
        >
          <BarChart2 size={12} />
          Analytics
        </Link>

        {isDraft && (
          <button
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs text-text-muted hover:text-loss hover:bg-border-default transition-colors disabled:opacity-40"
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
  const count = campaigns?.length ?? 0

  return (
    <AppShell title="Mail Campaigns">
      <ComingSoonGate service="direct_mail" featureName="Direct Mail">
      <FeatureGate feature="mail_campaigns">
      <motion.div
        variants={safeStaggerContainer(100)}
        initial="hidden"
        animate="visible"
        className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6"
      >
        {/* Header */}
        <motion.div variants={safeStaggerItem} className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h1
              className="text-2xl text-text-primary font-brand font-light"
            >
              Mail Campaigns
            </h1>
            {count > 0 && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-border-default text-text-muted">
                {count}
              </span>
            )}
          </div>

          <Link
            to="/mail-campaigns/new"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-brand font-light bg-violet-400 text-white hover:bg-violet-500 transition-colors"
          >
            <Plus size={15} />
            Create Campaign
          </Link>
        </motion.div>

        {/* Body */}
        <motion.div variants={safeStaggerItem}>
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
        </motion.div>
      </motion.div>
      </FeatureGate>
      </ComingSoonGate>
    </AppShell>
  )
}
