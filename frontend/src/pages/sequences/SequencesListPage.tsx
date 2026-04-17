/** Sequences list page — shows all sequences with stats, status badges, and step previews. */

import { Link } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { ErrorState } from '@/components/ui/ErrorState'
import { Repeat, Plus, Pause, Play, Archive, Lock } from 'lucide-react'
import { useBillingStatus } from '@/hooks/useBilling'
import { useAuthStore } from '@/stores/authStore'
import { toast } from 'sonner'
import { AppShell } from '@/components/layout/AppShell'
import { ComingSoonGate } from '@/components/ComingSoonGate'
import { EmptyState } from '@/components/EmptyState'
import { useSequences } from '@/hooks/useSequences'
import { useUpdateSequence } from '@/hooks/useSequences'
import { cn } from '@/lib/utils'
import { safeStaggerContainer, safeStaggerItem } from '@/lib/motion'
import { api } from '@/lib/api'
import type { SequenceListItem } from '@/types'

// ---------------------------------------------------------------------------
// Status badge
// ---------------------------------------------------------------------------

const STATUS_STYLES: Record<string, string> = {
  active:   'bg-profit/15 text-profit',
  paused:   'bg-warning/15 text-warning',
  archived: 'bg-text-muted/15 text-text-muted',
}

function StatusBadge({ status }: { status: SequenceListItem['status'] }) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize',
        STATUS_STYLES[status] ?? STATUS_STYLES.archived,
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
        <div className="h-4 w-40 bg-border-default rounded" />
        <div className="h-5 w-16 bg-border-default rounded" />
      </div>
      <div className="h-3 w-64 bg-border-default rounded" />
      <div className="h-3 w-48 bg-border-default rounded" />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sequence card
// ---------------------------------------------------------------------------

function SequenceCard({ seq }: { seq: SequenceListItem }) {
  const queryClient = useQueryClient()
  const userId = useAuthStore((s) => s.user?.id)
  const updateSeq = useUpdateSequence()

  async function handleTogglePause() {
    const nextStatus = seq.status === 'active' ? 'paused' : 'active'
    try {
      await api.sequences.update(seq.id, { status: nextStatus })
      queryClient.invalidateQueries({ queryKey: ['u', userId, 'sequences'] })
      toast.success(nextStatus === 'paused' ? 'Sequence paused' : 'Sequence resumed')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update sequence')
    }
  }

  async function handleArchive() {
    try {
      await api.sequences.update(seq.id, { status: 'archived' })
      queryClient.invalidateQueries({ queryKey: ['u', userId, 'sequences'] })
      toast.success('Sequence archived')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to archive sequence')
    }
  }

  const replyRate = typeof seq.reply_rate === 'number'
    ? `${seq.reply_rate.toFixed(1)}%`
    : '0%'

  return (
    <div className="bg-app-recessed border border-border-default rounded-xl p-4 hover:border-violet-400/30 transition-colors">
      {/* Row 1: name + status */}
      <div className="flex items-center justify-between gap-3 mb-1">
        <Link
          to={`/sequences/${seq.id}`}
          className="text-sm text-text-primary font-brand font-light hover:text-violet-400 transition-colors truncate"
        >
          {seq.name}
        </Link>
        <StatusBadge status={seq.status} />
      </div>

      {/* Row 2: description */}
      {seq.description && (
        <p className="text-xs text-text-muted mb-3 line-clamp-2">{seq.description}</p>
      )}

      {/* Row 3: stats */}
      <p className="text-xs text-text-muted mb-3">
        {seq.total_enrolled} enrolled
        {' · '}
        {seq.total_completed} completed
        {' · '}
        {seq.total_replied} replied
        {' · '}
        {replyRate} reply rate
      </p>

      {/* Row 4: step preview + actions */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-text-muted">
          {seq.step_count} {seq.step_count === 1 ? 'step' : 'steps'}
        </span>

        <div className="flex items-center gap-1">
          {/* Edit */}
          <Link
            to={`/sequences/${seq.id}`}
            className="inline-flex items-center px-2.5 py-1 rounded text-xs text-text-muted hover:text-text-primary hover:bg-border-default transition-colors"
          >
            Edit
          </Link>

          {/* Pause / Resume — only for active or paused */}
          {seq.status !== 'archived' && (
            <button
              onClick={handleTogglePause}
              disabled={updateSeq.isPending}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs text-text-muted hover:text-text-primary hover:bg-border-default transition-colors disabled:opacity-40"
            >
              {seq.status === 'active' ? (
                <><Pause size={12} /> Pause</>
              ) : (
                <><Play size={12} /> Resume</>
              )}
            </button>
          )}

          {/* Archive — only for non-archived */}
          {seq.status !== 'archived' && (
            <button
              onClick={handleArchive}
              disabled={updateSeq.isPending}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs text-text-muted hover:text-text-primary hover:bg-border-default transition-colors disabled:opacity-40"
            >
              <Archive size={12} /> Archive
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function SequencesListPage() {
  const queryClient = useQueryClient()
  const { data: sequences, isLoading, isError, error } = useSequences()
  const { data: billing } = useBillingStatus()
  const user = useAuthStore((s) => s.user)
  const userId = user?.id

  const count = sequences?.length ?? 0

  // Tier gate: Sequences require Carbon (pro) or higher
  const userPlan = billing?.plan ?? user?.plan_tier ?? 'free'
  const tierOrder: Record<string, number> = { free: 0, pro: 1, business: 2 }
  if ((tierOrder[userPlan] ?? 0) < 1) {
    return (
      <AppShell title="Sequences">
        <ComingSoonGate service="email_outbound" featureName="Sequences">
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)] px-4 text-center">
          <div className="max-w-sm">
            <div className="w-14 h-14 rounded-2xl bg-violet-400/10 flex items-center justify-center mx-auto mb-6">
              <Lock size={24} className="text-violet-400" />
            </div>
            <h1 className="text-2xl text-text-primary mb-3 font-brand font-light">
              Available on Carbon
            </h1>
            <p className="text-sm text-text-secondary mb-6">
              Automated follow-up sequences are available on the Carbon plan. Set up multi-step outreach workflows.
            </p>
            <Link
              to="/pricing"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-medium bg-violet-400 text-white hover:bg-violet-500 transition-colors"
            >
              View Plans
            </Link>
          </div>
        </div>
        </ComingSoonGate>
      </AppShell>
    )
  }

  return (
    <AppShell title="Sequences">
      <ComingSoonGate service="email_outbound" featureName="Sequences">
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
              Sequences
            </h1>
            {count > 0 && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-border-default text-text-muted">
                {count}
              </span>
            )}
          </div>

          <Link
            to="/sequences/new"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-brand font-light bg-violet-400 text-white hover:bg-violet-500 transition-colors"
          >
            <Plus size={15} />
            Create Sequence
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
            message={error instanceof Error ? error.message : 'Failed to load sequences'}
            onRetry={() => queryClient.invalidateQueries({ queryKey: ['u', userId, 'sequences'] })}
          />
        ) : count === 0 ? (
          <EmptyState
            icon={Repeat}
            heading="No sequences yet"
            description="Create your first follow-up sequence to automate outreach."
            ctaLabel="Create Sequence"
            ctaHref="/sequences/new"
          />
        ) : (
          <div className="space-y-3">
            {sequences!.map((seq) => (
              <SequenceCard key={seq.id} seq={seq} />
            ))}
          </div>
        )}
        </motion.div>
      </motion.div>
      </ComingSoonGate>
    </AppShell>
  )
}
