/** Skip Tracing page — address form, inline results, and history table. */

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, Upload } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { EmptyState } from '@/components/EmptyState'
import { SkipTraceResultCard } from '@/components/skip-tracing/SkipTraceResultCard'
import { useSkipTrace, useSkipTraceHistory, useSkipTraceUsage, useCreateContactFromTrace } from '@/hooks/useSkipTracing'
import { cn } from '@/lib/utils'
import type { SkipTraceResult, SkipTraceListItem } from '@/types'

// ---------------------------------------------------------------------------
// Status badge
// ---------------------------------------------------------------------------

const STATUS_STYLES: Record<string, string> = {
  found:     'bg-[#4ADE80]/15 text-[#4ADE80]',
  not_found: 'bg-[#FBBF24]/15 text-[#FBBF24]',
  failed:    'bg-[#EF4444]/15 text-[#EF4444]',
  pending:   'bg-[#60A5FA]/15 text-[#60A5FA]',
  processing:'bg-[#60A5FA]/15 text-[#60A5FA]',
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
        STATUS_STYLES[status] ?? 'bg-[#8A8580]/15 text-[#8A8580]',
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
        className="text-xs text-[#8B7AFF] hover:text-[#7B6AEF] transition-colors"
      >
        View →
      </Link>
    )
  }

  if (row.status !== 'found') {
    return <span className="text-xs text-[#8A8580]">—</span>
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
      className="text-xs text-[#8B7AFF] hover:text-[#7B6AEF] transition-colors disabled:opacity-50"
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
        <div key={n} className="h-10 bg-[#141311] border border-[#1E1D1B] rounded-lg" />
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

  const skipTrace = useSkipTrace()
  const { data: history, isLoading: historyLoading } = useSkipTraceHistory()
  const { data: usage } = useSkipTraceUsage()

  function handleTrace() {
    skipTrace.mutate(
      { address: street || undefined, city: city || undefined, state: state || undefined, zip_code: zip || undefined },
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
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">

        {/* ── Header ── */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1
              className="text-2xl text-[#F0EDE8]"
              style={{ fontFamily: 'Satoshi, sans-serif', fontWeight: 300 }}
            >
              Skip Tracing
            </h1>
            {usageLabel && (
              <p className="text-xs text-[#8A8580] mt-0.5">{usageLabel}</p>
            )}
          </div>

          <Link
            to="/skip-tracing/batch"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm border border-[#1E1D1B] text-[#C5C0B8] hover:border-[#8B7AFF]/40 hover:text-[#F0EDE8] transition-colors"
          >
            <Upload size={14} />
            Batch Upload
          </Link>
        </div>

        {/* ── Trace Form ── */}
        <div className="bg-[#141311] border border-[#1E1D1B] rounded-xl p-5 space-y-4">
          <p className="text-xs text-[#8A8580] uppercase tracking-wide font-medium">Trace an Address</p>

          {/* Street */}
          <input
            type="text"
            placeholder="Street address"
            value={street}
            onChange={(e) => setStreet(e.target.value)}
            className="w-full bg-[#0C0B0A] border border-[#1E1D1B] rounded-lg px-3 py-2.5 text-sm text-[#F0EDE8] placeholder:text-[#8A8580] focus:outline-none focus:border-[#8B7AFF]/60 transition-colors"
          />

          {/* City / State / Zip */}
          <div className="grid grid-cols-3 gap-3">
            <input
              type="text"
              placeholder="City"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="bg-[#0C0B0A] border border-[#1E1D1B] rounded-lg px-3 py-2.5 text-sm text-[#F0EDE8] placeholder:text-[#8A8580] focus:outline-none focus:border-[#8B7AFF]/60 transition-colors"
            />
            <input
              type="text"
              placeholder="State"
              value={state}
              onChange={(e) => setState(e.target.value)}
              maxLength={2}
              className="bg-[#0C0B0A] border border-[#1E1D1B] rounded-lg px-3 py-2.5 text-sm text-[#F0EDE8] placeholder:text-[#8A8580] focus:outline-none focus:border-[#8B7AFF]/60 transition-colors"
            />
            <input
              type="text"
              placeholder="ZIP"
              value={zip}
              onChange={(e) => setZip(e.target.value)}
              maxLength={10}
              className="bg-[#0C0B0A] border border-[#1E1D1B] rounded-lg px-3 py-2.5 text-sm text-[#F0EDE8] placeholder:text-[#8A8580] focus:outline-none focus:border-[#8B7AFF]/60 transition-colors"
            />
          </div>

          <button
            onClick={handleTrace}
            disabled={skipTrace.isPending || (!street && !zip)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm bg-[#8B7AFF] text-white hover:bg-[#7B6AEF] transition-colors disabled:opacity-50"
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
        </div>

        {/* ── Inline Result ── */}
        {inlineResult && (
          <SkipTraceResultCard result={inlineResult} />
        )}

        {/* ── History Table ── */}
        <div className="space-y-3">
          <h2
            className="text-sm text-[#C5C0B8] uppercase tracking-wide font-medium"
          >
            History
          </h2>

          {historyLoading ? (
            <TableSkeleton />
          ) : rows.length === 0 ? (
            <EmptyState
              icon={Search}
              heading="No skip traces yet"
              description="Trace an address above to find property owners."
            />
          ) : (
            <div className="bg-[#141311] border border-[#1E1D1B] rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#1E1D1B]">
                      {['Date', 'Address', 'Status', 'Owner', 'Phones', 'Emails', 'Contact', 'Actions'].map((col) => (
                        <th
                          key={col}
                          className="text-left px-4 py-3 text-xs text-[#8A8580] uppercase tracking-wide font-medium whitespace-nowrap"
                        >
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1E1D1B]">
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
                        <tr key={row.id} className="hover:bg-[#1E1D1B]/40 transition-colors">
                          <td className="px-4 py-3 text-xs text-[#8A8580] whitespace-nowrap">{date}</td>
                          <td className="px-4 py-3 text-xs text-[#C5C0B8] max-w-[180px] truncate">{address}</td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <StatusBadge status={row.status} />
                          </td>
                          <td className="px-4 py-3 text-xs text-[#C5C0B8] whitespace-nowrap">{ownerName}</td>
                          <td className="px-4 py-3 text-xs text-[#C5C0B8] whitespace-nowrap">
                            {row.phone_count > 0 ? `${row.phone_count}` : '—'}
                          </td>
                          <td className="px-4 py-3 text-xs text-[#C5C0B8] whitespace-nowrap">
                            {row.email_count > 0 ? `${row.email_count}` : '—'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <HistoryContactCell row={row} />
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <Link
                              to={`/skip-tracing/${row.id}`}
                              className="text-xs text-[#8A8580] hover:text-[#C5C0B8] transition-colors"
                            >
                              View
                            </Link>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  )
}
