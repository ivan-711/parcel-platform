/** Sequences list page — shows all sequences with stats, status badges, and step previews. */

import { Link } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { ErrorState } from '@/components/ui/ErrorState'
import { Repeat, Plus, Pause, Play, Archive } from 'lucide-react'
import { toast } from 'sonner'
import { AppShell } from '@/components/layout/AppShell'
import { EmptyState } from '@/components/EmptyState'
import { useSequences } from '@/hooks/useSequences'
import { useUpdateSequence } from '@/hooks/useSequences'
import { cn } from '@/lib/utils'
import { api } from '@/lib/api'
import type { SequenceListItem } from '@/types'

// ---------------------------------------------------------------------------
// Status badge
// ---------------------------------------------------------------------------

const STATUS_STYLES: Record<string, string> = {
  active:   'bg-[#4ADE80]/15 text-[#4ADE80]',
  paused:   'bg-[#FBBF24]/15 text-[#FBBF24]',
  archived: 'bg-[#8A8580]/15 text-[#8A8580]',
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
    <div className="bg-[#141311] border border-[#1E1D1B] rounded-xl p-4 space-y-3 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-4 w-40 bg-[#1E1D1B] rounded" />
        <div className="h-5 w-16 bg-[#1E1D1B] rounded" />
      </div>
      <div className="h-3 w-64 bg-[#1E1D1B] rounded" />
      <div className="h-3 w-48 bg-[#1E1D1B] rounded" />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sequence card
// ---------------------------------------------------------------------------

function SequenceCard({ seq }: { seq: SequenceListItem }) {
  const queryClient = useQueryClient()
  const updateSeq = useUpdateSequence()

  async function handleTogglePause() {
    const nextStatus = seq.status === 'active' ? 'paused' : 'active'
    try {
      await api.sequences.update(seq.id, { status: nextStatus })
      queryClient.invalidateQueries({ queryKey: ['sequences'] })
      toast.success(nextStatus === 'paused' ? 'Sequence paused' : 'Sequence resumed')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update sequence')
    }
  }

  async function handleArchive() {
    try {
      await api.sequences.update(seq.id, { status: 'archived' })
      queryClient.invalidateQueries({ queryKey: ['sequences'] })
      toast.success('Sequence archived')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to archive sequence')
    }
  }

  const replyRate = typeof seq.reply_rate === 'number'
    ? `${seq.reply_rate.toFixed(1)}%`
    : '0%'

  return (
    <div className="bg-[#141311] border border-[#1E1D1B] rounded-xl p-4 hover:border-[#8B7AFF]/30 transition-colors">
      {/* Row 1: name + status */}
      <div className="flex items-center justify-between gap-3 mb-1">
        <Link
          to={`/sequences/${seq.id}`}
          className="text-sm text-[#F0EDE8] hover:text-[#8B7AFF] transition-colors truncate"
          style={{ fontFamily: 'Satoshi, sans-serif', fontWeight: 300 }}
        >
          {seq.name}
        </Link>
        <StatusBadge status={seq.status} />
      </div>

      {/* Row 2: description */}
      {seq.description && (
        <p className="text-xs text-[#8A8580] mb-3 line-clamp-2">{seq.description}</p>
      )}

      {/* Row 3: stats */}
      <p className="text-xs text-[#8A8580] mb-3">
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
        <span className="text-xs text-[#8A8580]">
          {seq.step_count} {seq.step_count === 1 ? 'step' : 'steps'}
        </span>

        <div className="flex items-center gap-1">
          {/* Edit */}
          <Link
            to={`/sequences/${seq.id}`}
            className="inline-flex items-center px-2.5 py-1 rounded text-xs text-[#8A8580] hover:text-[#F0EDE8] hover:bg-[#1E1D1B] transition-colors"
          >
            Edit
          </Link>

          {/* Pause / Resume — only for active or paused */}
          {seq.status !== 'archived' && (
            <button
              onClick={handleTogglePause}
              disabled={updateSeq.isPending}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs text-[#8A8580] hover:text-[#F0EDE8] hover:bg-[#1E1D1B] transition-colors disabled:opacity-40"
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
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs text-[#8A8580] hover:text-[#F0EDE8] hover:bg-[#1E1D1B] transition-colors disabled:opacity-40"
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

  const count = sequences?.length ?? 0

  return (
    <AppShell title="Sequences">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h1
              className="text-2xl text-[#F0EDE8]"
              style={{ fontFamily: 'Satoshi, sans-serif', fontWeight: 300 }}
            >
              Sequences
            </h1>
            {count > 0 && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-[#1E1D1B] text-[#8A8580]">
                {count}
              </span>
            )}
          </div>

          <Link
            to="/sequences/new"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm bg-[#8B7AFF] text-white hover:bg-[#7B6AEF] transition-colors"
            style={{ fontFamily: 'Satoshi, sans-serif', fontWeight: 300 }}
          >
            <Plus size={15} />
            Create Sequence
          </Link>
        </div>

        {/* Body */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((n) => <SkeletonCard key={n} />)}
          </div>
        ) : isError ? (
          <ErrorState
            message={error instanceof Error ? error.message : 'Failed to load sequences'}
            onRetry={() => queryClient.invalidateQueries({ queryKey: ['sequences'] })}
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
      </div>
    </AppShell>
  )
}
