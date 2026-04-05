/** Batch skip trace page — CSV upload, preview, run, and progress. */

import { useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Upload, FileText, X } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { useBatchStatus } from '@/hooks/useSkipTracing'
import { api } from '@/lib/api'
import { toast } from 'sonner'

// ---------------------------------------------------------------------------
// CSV parsing
// ---------------------------------------------------------------------------

type CsvRecord = {
  address: string
  city: string
  state: string
  zip_code: string
}

function parseCSV(text: string): CsvRecord[] {
  const lines = text.trim().split('\n')
  if (lines.length < 2) return []
  const header = lines[0].toLowerCase().split(',').map((h) => h.trim())
  const addrIdx = header.indexOf('address')
  const cityIdx = header.indexOf('city')
  const stateIdx = header.indexOf('state')
  const zipIdx = header.findIndex((h) => h === 'zip' || h === 'zip_code')

  return lines
    .slice(1)
    .map((line) => {
      const cols = line.split(',').map((c) => c.trim())
      return {
        address: cols[addrIdx] || '',
        city: cols[cityIdx] || '',
        state: cols[stateIdx] || '',
        zip_code: cols[zipIdx] || '',
      }
    })
    .filter((r) => r.address)
}

// ---------------------------------------------------------------------------
// BatchSkipTracePage
// ---------------------------------------------------------------------------

export default function BatchSkipTracePage() {
  const [file, setFile] = useState<File | null>(null)
  const [records, setRecords] = useState<CsvRecord[]>([])
  const [batchId, setBatchId] = useState<string | null>(null)
  const [autoCreate, setAutoCreate] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { data: batchStatus } = useBatchStatus(batchId ?? undefined)

  function handleFile(f: File) {
    if (!f.name.endsWith('.csv')) {
      toast.error('Please upload a CSV file')
      return
    }
    setFile(f)
    setBatchId(null)
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      const parsed = parseCSV(text)
      setRecords(parsed)
      if (parsed.length === 0) {
        toast.error('No valid records found. Ensure CSV has address, city, state, zip columns.')
      }
    }
    reader.readAsText(f)
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(true)
  }

  function handleDragLeave() {
    setDragOver(false)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const dropped = e.dataTransfer.files[0]
    if (dropped) handleFile(dropped)
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0]
    if (selected) handleFile(selected)
  }

  function clearFile() {
    setFile(null)
    setRecords([])
    setBatchId(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function handleTraceAll() {
    if (records.length === 0) return
    setIsSubmitting(true)
    try {
      const result = await api.skipTracing.traceBatch({
        records,
        auto_create_contacts: autoCreate,
      })
      setBatchId(result.batch_id)
      try {
        ;(window as any).posthog?.capture?.('skip_trace_batch_started', {
          record_count: records.length,
          auto_create: autoCreate,
        })
      } catch {}
      toast.success(`Batch started — ${records.length} addresses queued`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to start batch')
    } finally {
      setIsSubmitting(false)
    }
  }

  const isComplete = batchStatus?.status === 'complete'
  const isFailed = batchStatus?.status === 'failed'

  const progress =
    batchStatus && batchStatus.total > 0
      ? Math.round((batchStatus.completed / batchStatus.total) * 100)
      : 0

  return (
    <AppShell
      title="Batch Skip Trace"
      breadcrumbs={[
        { label: 'Skip Tracing', href: '/skip-tracing' },
        { label: 'Batch Upload' },
      ]}
    >
      <div className="max-w-3xl space-y-6">

        {/* Back link */}
        <div className="flex items-center gap-3">
          <Link
            to="/skip-tracing"
            className="inline-flex items-center gap-1.5 text-sm text-[#8A8580] hover:text-[#C5C0B8] transition-colors"
          >
            <ArrowLeft size={14} />
            Back to Skip Tracing
          </Link>
        </div>

        <div>
          <h1
            className="text-2xl text-[#F0EDE8] mb-1"
            style={{ fontFamily: 'Satoshi, sans-serif', fontWeight: 300 }}
          >
            Batch Skip Trace
          </h1>
          <p className="text-sm text-[#8A8580]">
            Upload a CSV with address, city, state, and zip columns to trace multiple owners at once.
          </p>
        </div>

        {/* Drop zone */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`bg-[#0C0B0A] border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
            dragOver
              ? 'border-[#8B7AFF]/60 bg-[#8B7AFF]/5'
              : 'border-[#1E1D1B] hover:border-[#8B7AFF]/30'
          }`}
        >
          {file ? (
            <div className="flex items-center justify-center gap-3">
              <FileText size={20} className="text-[#8B7AFF]" />
              <span className="text-sm text-[#F0EDE8]">{file.name}</span>
              <span className="text-xs text-[#8A8580]">({records.length} records)</span>
              <button
                onClick={clearFile}
                className="ml-2 inline-flex items-center p-1 rounded text-[#8A8580] hover:text-[#F87171] hover:bg-[#F87171]/10 transition-colors"
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <Upload size={24} className="text-[#8A8580]" />
              <div>
                <p className="text-sm text-[#C5C0B8]">Drag and drop your CSV here</p>
                <p className="text-xs text-[#8A8580] mt-1">or</p>
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm border border-[#1E1D1B] text-[#C5C0B8] hover:border-[#8B7AFF]/30 hover:text-[#8B7AFF] transition-colors cursor-pointer"
              >
                Browse Files
              </button>
              <p className="text-xs text-[#8A8580]">
                Required columns: <span className="font-mono text-[#C5C0B8]">address, city, state, zip</span>
              </p>
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={handleInputChange}
          />
        </div>

        {/* Preview table */}
        {records.length > 0 && (
          <div className="bg-[#141311] border border-[#1E1D1B] rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-[#1E1D1B]">
              <h3 className="text-[11px] uppercase tracking-wider text-[#8A8580] font-medium">
                Preview — first {Math.min(5, records.length)} of {records.length} rows
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#1E1D1B]">
                    {['Address', 'City', 'State', 'Zip'].map((col) => (
                      <th
                        key={col}
                        className="px-4 py-2 text-left text-[10px] uppercase tracking-wider text-[#8A8580] font-medium"
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1E1D1B]">
                  {records.slice(0, 5).map((row, i) => (
                    <tr key={i}>
                      <td className="px-4 py-2 text-[#F0EDE8]">{row.address}</td>
                      <td className="px-4 py-2 text-[#C5C0B8]">{row.city}</td>
                      <td className="px-4 py-2 text-[#C5C0B8]">{row.state}</td>
                      <td className="px-4 py-2 text-[#C5C0B8]">{row.zip_code}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Controls */}
        {records.length > 0 && !batchId && (
          <div className="bg-[#141311] border border-[#1E1D1B] rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            {/* Auto-create toggle */}
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <button
                role="switch"
                aria-checked={autoCreate}
                onClick={() => setAutoCreate((v) => !v)}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                  autoCreate ? 'bg-[#8B7AFF]' : 'bg-[#1E1D1B]'
                }`}
              >
                <span
                  className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${
                    autoCreate ? 'translate-x-[18px]' : 'translate-x-[2px]'
                  }`}
                />
              </button>
              <span className="text-sm text-[#C5C0B8]">Auto-create contacts on match</span>
            </label>

            <button
              onClick={handleTraceAll}
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium bg-[#8B7AFF] text-white hover:bg-[#7B6AEF] transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'Starting...' : `Trace All ${records.length} Addresses`}
            </button>
          </div>
        )}

        {/* Progress */}
        {batchId && batchStatus && !isComplete && !isFailed && (
          <div className="bg-[#141311] border border-[#1E1D1B] rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-[11px] uppercase tracking-wider text-[#8A8580] font-medium">Processing</h3>
              <span className="text-xs text-[#8A8580]">
                {batchStatus.completed} / {batchStatus.total}
              </span>
            </div>
            <div className="w-full h-1.5 bg-[#1E1D1B] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#8B7AFF] rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="flex items-center gap-4 text-xs text-[#8A8580]">
              <span>
                <span className="text-[#4ADE80]">{batchStatus.found ?? 0}</span> found
              </span>
              <span>
                <span className="text-[#F87171]">{batchStatus.not_found ?? 0}</span> not found
              </span>
            </div>
          </div>
        )}

        {/* Results summary */}
        {isComplete && batchStatus && (
          <div className="bg-[#141311] border border-[#1E1D1B] rounded-xl p-5">
            <h3 className="text-[11px] uppercase tracking-wider text-[#8A8580] font-medium mb-3">Complete</h3>
            <p className="text-sm text-[#F0EDE8]">
              {batchStatus.total} addresses processed:{' '}
              <span className="text-[#4ADE80]">{batchStatus.found ?? 0} found</span>,{' '}
              <span className="text-[#8A8580]">{batchStatus.not_found ?? 0} not found</span>
            </p>
            <Link
              to="/skip-tracing"
              className="inline-flex items-center gap-1.5 mt-4 text-sm text-[#8B7AFF] hover:text-[#A89FFF] transition-colors"
            >
              View history →
            </Link>
          </div>
        )}

        {/* Failed state */}
        {isFailed && (
          <div className="bg-[#141311] border border-[#F87171]/20 rounded-xl p-5">
            <p className="text-sm text-[#F87171]">Batch processing failed. Please try again.</p>
            <button
              onClick={clearFile}
              className="mt-3 text-sm text-[#8A8580] hover:text-[#C5C0B8] transition-colors"
            >
              Start over
            </button>
          </div>
        )}

      </div>
    </AppShell>
  )
}
