/** Skip Tracing page — address form, inline results, and history table. */

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Search, Upload } from 'lucide-react'
import { ErrorState } from '@/components/ui/ErrorState'
import { AppShell } from '@/components/layout/AppShell'
import { ComingSoonGate } from '@/components/ComingSoonGate'
import { FeatureGate } from '@/components/billing/FeatureGate'
import { EmptyState } from '@/components/EmptyState'
import { SkipTraceResultCard } from '@/components/skip-tracing/SkipTraceResultCard'
import { useSkipTrace, useSkipTraceHistory, useSkipTraceUsage, useCreateContactFromTrace } from '@/hooks/useSkipTracing'
import { cn } from '@/lib/utils'
import { safeStaggerContainer, safeStaggerItem } from '@/lib/motion'
import type { SkipTraceResult, SkipTraceListItem } from '@/types'

// ---------------------------------------------------------------------------
// Status badge
// ---------------------------------------------------------------------------

const STATUS_STYLES: Record<string, string> = {
  found:     'bg-profit-bg text-profit',
  not_found: 'bg-warning-bg text-warning',
  failed:    'bg-error-bg text-error',
  pending:   'bg-info-bg text-info',
  processing:'bg-info-bg text-info',
}

const STATUS_LABELS: Record<string, string> = {
  found:     'Found',
  not_found: 'Not Found',
  failed:    'Failed',
  pending:   'Pending',
  processing:'Processing',
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
        STATUS_STYLES[status] ?? 'bg-text-muted/15 text-text-muted',
      )}
    >
      {STATUS_LABELS[status] ?? status}
    </span>
  )
}

// ---------------------------------------------------------------------------
// History row — Create contact action
// ---------------------------------------------------------------------------

function HistoryContactCell({ row }: { row: SkipTraceListItem }) {
  const createContact = useCreateContactFromTrace()
  const [contactId, setContactId] = useState<string | null>(row.contact_id)

  if (contactId) {
    return (
      <Link
        to={`/contacts/${contactId}`}
        className="text-xs text-accent-primary hover:text-accent-hover transition-colors"
      >
        View →
      </Link>
    )
  }

  if (row.status !== 'found') {
    return <span className="text-xs text-text-muted">—</span>
  }

  return (
    <button
      onClick={() =>
        createContact.mutate(
          { id: row.id },
          { onSuccess: (data) => setContactId(data.contact_id) },
        )
      }
      disabled={createContact.isPending}
      className="text-xs text-accent-primary hover:text-accent-hover transition-colors disabled:opacity-50"
    >
      {createContact.isPending ? 'Creating…' : 'Create'}
    </button>
  )
}

// ---------------------------------------------------------------------------
// History table skeleton
// ---------------------------------------------------------------------------

function TableSkeleton() {
  return (
    <div className="space-y-2 animate-pulse">
      {[1, 2, 3].map((n) => (
        <div key={n} className="h-10 bg-app-recessed border border-border-default rounded-lg" />
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// SkipTracingPage
// ---------------------------------------------------------------------------

export default function SkipTracingPage() {
  const [street, setStreet] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [zip, setZip] = useState('')
  const [inlineResult, setInlineResult] = useState<SkipTraceResult | null>(null)

  const queryClient = useQueryClient()
  const skipTrace = useSkipTrace()
  const { data: historyData, isLoading: historyLoading, isError: historyError, error: historyErr } = useSkipTraceHistory()
  const history = historyData?.items
  const { data: usage } = useSkipTraceUsage()

  function handleTrace() {
    skipTrace.mutate(
      { address: street || undefined, city: city || undefined, state: state || undefined, zip_code: zip || undefined, compliance_acknowledged: true },
      {
        onSuccess: (result) => {
          setInlineResult(result as SkipTraceResult)
        },
      },
    )
  }

  const usageLabel = usage
    ? `${usage.used} of ${usage.limit ?? '∞'} used this month`
    : null

  const rows: SkipTraceListItem[] = history ?? []

  return (
    <AppShell title="Skip Tracing">
      <ComingSoonGate service="skip_tracing" featureName="Skip Tracing">
      <FeatureGate feature="skip_tracing">
      <motion.div
        variants={safeStaggerContainer(100)}
        initial="hidden"
        animate="visible"
        className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6"
      >

        {/* ── Header ── */}
        <motion.div variants={safeStaggerItem} className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1
              className="text-2xl text-text-primary font-brand font-light"
            >
              Skip Tracing
            </h1>
            {usageLabel && (
              <p className="text-xs text-text-muted mt-0.5">{usageLabel}</p>
            )}
          </div>

          <Link
            to="/skip-tracing/batch"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm border border-border-default text-text-secondary hover:border-accent-primary/40 hover:text-text-primary transition-colors"
          >
            <Upload size={14} />
            Batch Upload
          </Link>
        </motion.div>

        {/* ── Trace Form ── */}
        <motion.div variants={safeStaggerItem} className="bg-app-recessed border border-border-default rounded-xl p-5 space-y-4">
          <p className="text-xs text-text-muted uppercase tracking-wide font-medium">Trace an Address</p>

          {/* Street */}
          <input
            type="text"
            placeholder="Street address"
            value={street}
            onChange={(e) => setStreet(e.target.value)}
            className="w-full bg-app-bg border border-border-default rounded-lg px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-primary/60 transition-colors"
          />

          {/* City / State / Zip */}
          <div className="grid grid-cols-3 gap-3">
            <input
              type="text"
              placeholder="City"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="bg-app-bg border border-border-default rounded-lg px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-primary/60 transition-colors"
            />
            <input
              type="text"
              placeholder="State"
              value={state}
              onChange={(e) => setState(e.target.value)}
              maxLength={2}
              className="bg-app-bg border border-border-default rounded-lg px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-primary/60 transition-colors"
            />
            <input
              type="text"
              placeholder="ZIP"
              value={zip}
              onChange={(e) => setZip(e.target.value)}
              maxLength={10}
              className="bg-app-bg border border-border-default rounded-lg px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-primary/60 transition-colors"
            />
          </div>

          <button
            onClick={handleTrace}
            disabled={skipTrace.isPending || (!street && !zip)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm bg-accent-primary text-accent-text-on-accent hover:bg-accent-hover transition-colors disabled:opacity-50"
          >
            {skipTrace.isPending ? (
              <>
                <span className="inline-block w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Searching records…
              </>
            ) : (
              <>
                <Search size={14} />
                Skip Trace
              </>
            )}
          </button>
        </motion.div>

        {/* ── Inline Result ── */}
        {inlineResult && (
          <SkipTraceResultCard result={inlineResult} />
        )}

        {/* ── History Table ── */}
        <motion.div variants={safeStaggerItem} className="space-y-3">
          <h2
            className="text-sm text-text-secondary uppercase tracking-wide font-medium"
          >
            History
          </h2>

          {historyLoading ? (
            <TableSkeleton />
          ) : historyError ? (
            <ErrorState
              message={historyErr instanceof Error ? historyErr.message : 'Failed to load history'}
              onRetry={() => queryClient.invalidateQueries({ queryKey: ['skip-tracing', 'history'] })}
            />
          ) : rows.length === 0 ? (
            <EmptyState
              icon={Search}
              heading="No skip traces yet"
              description="Trace an address above to find property owners."
            />
          ) : (
            <div className="bg-app-recessed border border-border-default rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border-default">
                      {['Date', 'Address', 'Status', 'Owner', 'Phones', 'Emails', 'Contact'].map((col) => (
                        <th
                          key={col}
                          className="text-left px-4 py-3 text-xs text-text-muted uppercase tracking-wide font-medium whitespace-nowrap"
                        >
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-default">
                    {rows.map((row) => {
                      const date = row.traced_at
                        ? new Date(row.traced_at).toLocaleDateString()
                        : new Date(row.created_at).toLocaleDateString()

                      const address = [row.input_address, row.input_city, row.input_state]
                        .filter(Boolean)
                        .join(', ') || '—'

                      const ownerName = [row.owner_first_name, row.owner_last_name]
                        .filter(Boolean)
                        .join(' ') || '—'

                      return (
                        <tr key={row.id} className="hover:bg-border-default/40 transition-colors">
                          <td className="px-4 py-3 text-xs text-text-muted whitespace-nowrap">{date}</td>
                          <td className="px-4 py-3 text-xs text-text-secondary max-w-[180px] truncate">{address}</td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <StatusBadge status={row.status} />
                          </td>
                          <td className="px-4 py-3 text-xs text-text-secondary whitespace-nowrap">{ownerName}</td>
                          <td className="px-4 py-3 text-xs text-text-secondary whitespace-nowrap">
                            {row.phone_count > 0 ? `${row.phone_count}` : '—'}
                          </td>
                          <td className="px-4 py-3 text-xs text-text-secondary whitespace-nowrap">
                            {row.email_count > 0 ? `${row.email_count}` : '—'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <HistoryContactCell row={row} />
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>
      </FeatureGate>
      </ComingSoonGate>
    </AppShell>
  )
}
