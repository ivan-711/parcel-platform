import { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useDropzone } from 'react-dropzone'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Upload,
  FileSearch,
  FileText,
  Download,
  Trash2,
  MessageSquare,
  Check,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Loader2,
  Clock,
} from 'lucide-react'
import { toast } from 'sonner'
import { AppShell } from '@/components/layout/AppShell'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { api } from '@/lib/api'
import {
  formatFileSize,
  formatDocumentType,
  formatLabel,
  formatCurrency,
  isCurrencyKey,
} from '@/lib/format'
import type { DocumentListItem, DocumentResponse } from '@/types'

const ACCEPTED_TYPES: Record<string, string[]> = {
  'application/pdf': ['.pdf'],
  'image/png': ['.png'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
}
const MAX_FILE_SIZE = 25 * 1024 * 1024

const fadeUp = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 8 },
  transition: { duration: 0.2 },
}

/* ---------- Upload Zone ---------- */

function UploadZone({ onUpload, isUploading }: { onUpload: (file: File) => void; isUploading: boolean }) {
  const onDrop = useCallback(
    (accepted: File[]) => {
      if (accepted.length > 0) onUpload(accepted[0])
    },
    [onUpload],
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_TYPES,
    maxSize: MAX_FILE_SIZE,
    multiple: false,
    disabled: isUploading,
    onDropRejected: (rejections) => {
      const err = rejections[0]?.errors[0]
      if (err?.code === 'file-too-large') toast.error('File too large — max 25 MB')
      else if (err?.code === 'file-invalid-type') toast.error('Unsupported file type')
      else toast.error('Upload failed — please try again')
    },
  })

  return (
    <div
      {...getRootProps()}
      className={cn(
        'border border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors',
        isDragActive
          ? 'border-accent-primary bg-accent-primary/10'
          : 'border-border-subtle hover:border-border-default',
        isUploading && 'pointer-events-none opacity-60',
      )}
    >
      <input {...getInputProps()} />
      {isUploading ? (
        <div className="flex flex-col items-center gap-2 py-2">
          <Loader2 size={20} className="text-accent-primary animate-spin" />
          <p className="text-xs text-text-muted">Uploading...</p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2 py-2">
          <Upload size={20} className="text-text-muted" />
          <p className="text-xs text-text-secondary">
            {isDragActive ? 'Drop file here' : 'Drag & drop or click to upload'}
          </p>
          <p className="text-[10px] text-text-muted">PDF, DOCX, PNG, JPG — max 25 MB</p>
        </div>
      )}
    </div>
  )
}

/* ---------- Status Badge ---------- */

function StatusBadge({ status }: { status: DocumentListItem['status'] }) {
  if (status === 'completed') {
    return (
      <span className="flex items-center gap-1 text-[10px] text-emerald-400">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
        Done
      </span>
    )
  }
  if (status === 'failed') {
    return (
      <span className="flex items-center gap-1 text-[10px] text-red-400">
        <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
        Failed
      </span>
    )
  }
  return (
    <span className="flex items-center gap-1 text-[10px] text-amber-400">
      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
      Processing
    </span>
  )
}

/* ---------- Document List Item ---------- */

function DocRow({
  doc,
  isSelected,
  onSelect,
}: {
  doc: DocumentListItem
  isSelected: boolean
  onSelect: () => void
}) {
  return (
    <button
      onClick={onSelect}
      className={cn(
        'w-full text-left px-3 py-2.5 rounded-lg transition-colors',
        isSelected
          ? 'bg-accent-primary/10 border border-accent-primary/30'
          : 'hover:bg-app-elevated/50 border border-transparent',
      )}
    >
      <div className="flex items-start gap-2.5">
        <FileText size={14} className="text-text-muted mt-0.5 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-sm text-text-primary truncate">{doc.original_filename}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[10px] text-text-muted font-mono">
              {formatFileSize(doc.file_size_bytes)}
            </span>
            <StatusBadge status={doc.status} />
          </div>
        </div>
      </div>
    </button>
  )
}

/* ---------- Skeleton List ---------- */

function SkeletonList() {
  return (
    <div className="space-y-2 px-1">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="px-3 py-2.5 rounded-lg space-y-2">
          <div className="h-3.5 w-4/5 rounded bg-app-elevated animate-pulse" />
          <div className="h-2.5 w-2/5 rounded bg-app-elevated animate-pulse" />
        </div>
      ))}
    </div>
  )
}

/* ---------- Processing Steps ---------- */

function ProcessingSteps({ status }: { status: 'pending' | 'processing' }) {
  const steps = [
    { label: 'Uploading to secure storage', done: true },
    { label: 'Extracting document content', done: status === 'processing', active: status === 'processing' },
    { label: 'Running AI analysis', done: false, active: false },
  ]

  // If processing, step 2 is active and step 3 is waiting
  // If pending, step 1 is done, step 2 is waiting, step 3 is waiting

  return (
    <div className="space-y-3">
      {steps.map((step, i) => {
        const isActive = status === 'processing' && i === 1
        const isWaiting = !step.done && !isActive

        return (
          <div key={i} className="flex items-center gap-3">
            {step.done && !isActive ? (
              <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <Check size={12} className="text-emerald-400" />
              </div>
            ) : isActive ? (
              <div className="w-5 h-5 rounded-full bg-accent-primary/20 flex items-center justify-center">
                <Loader2 size={12} className="text-accent-primary animate-spin" />
              </div>
            ) : (
              <div className="w-5 h-5 rounded-full bg-app-elevated flex items-center justify-center">
                <Clock size={10} className="text-text-muted" />
              </div>
            )}
            <span
              className={cn(
                'text-sm',
                step.done && !isActive && 'text-text-secondary',
                isActive && 'text-text-primary',
                isWaiting && 'text-text-muted',
              )}
            >
              {step.label}
            </span>
          </div>
        )
      })}
    </div>
  )
}

/* ---------- Severity Indicator ---------- */

function SeverityDot({ severity }: { severity: 'high' | 'medium' | 'low' }) {
  const colors = {
    high: 'bg-red-400',
    medium: 'bg-amber-400',
    low: 'bg-blue-400',
  }
  return <span className={cn('w-2 h-2 rounded-full shrink-0', colors[severity])} />
}

/* ---------- Extracted Number Value ---------- */

function NumberValue({ keyName, value }: { keyName: string; value: number | string }) {
  const formatted =
    typeof value === 'string'
      ? value
      : isCurrencyKey(keyName)
        ? formatCurrency(value)
        : value.toLocaleString('en-US', { maximumFractionDigits: 2 })

  return <span className="font-mono text-sm text-text-primary">{formatted}</span>
}

/* ---------- Detail Panel ---------- */

function DetailPanel({
  doc,
  onDelete,
  isDeleting,
  onBack,
  showBack,
}: {
  doc: DocumentResponse
  onDelete: () => void
  isDeleting: boolean
  onBack: () => void
  showBack: boolean
}) {
  const navigate = useNavigate()
  const [showAllTerms, setShowAllTerms] = useState(false)

  const visibleTerms =
    showAllTerms || doc.key_terms.length <= 8 ? doc.key_terms : doc.key_terms.slice(0, 8)

  const numbers = doc.extracted_numbers ? Object.entries(doc.extracted_numbers) : []

  return (
    <div className="space-y-4">
      {/* Mobile back button */}
      {showBack && (
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary transition-colors md:hidden"
        >
          <ChevronLeft size={16} />
          Back to list
        </button>
      )}

      {/* Header */}
      <motion.div {...fadeUp} className="rounded-xl border border-border-subtle bg-app-surface p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-semibold text-text-primary truncate">
              {doc.original_filename}
            </h2>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <Badge className="bg-accent-primary/15 text-accent-primary border-accent-primary/25 text-[10px]">
                {formatDocumentType(doc.document_type)}
              </Badge>
              <span className="text-xs text-text-muted font-mono">
                {formatFileSize(doc.file_size_bytes)}
              </span>
              <span className="text-xs text-text-muted">
                {new Date(doc.created_at).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 mt-3">
          {doc.presigned_url && (
            <a href={doc.presigned_url} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5">
                <Download size={12} />
                Download
              </Button>
            </a>
          )}
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs gap-1.5"
            onClick={() => navigate(`/chat?context=document&id=${doc.id}`)}
          >
            <MessageSquare size={12} />
            Chat
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs gap-1.5 text-red-400 hover:text-red-300 hover:border-red-400/30"
            onClick={onDelete}
            disabled={isDeleting}
          >
            <Trash2 size={12} />
            Delete
          </Button>
        </div>
      </motion.div>

      {/* AI Summary */}
      {doc.ai_summary && (
        <motion.div
          {...fadeUp}
          transition={{ ...fadeUp.transition, delay: 0.05 }}
          className="rounded-xl border border-border-subtle bg-app-surface p-4"
        >
          <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">
            AI Summary
          </h3>
          <p className="text-sm text-text-primary leading-relaxed">{doc.ai_summary}</p>
          {doc.parties.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {doc.parties.map((party, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1 rounded-full bg-app-elevated px-2 py-0.5 text-[10px] text-text-secondary"
                >
                  {party.name}
                  <span className="text-text-muted">({party.role})</span>
                </span>
              ))}
            </div>
          )}
        </motion.div>
      )}

      {/* Risk Flags */}
      {doc.risk_flags.length > 0 && (
        <motion.div
          {...fadeUp}
          transition={{ ...fadeUp.transition, delay: 0.1 }}
          className="rounded-xl border border-border-subtle bg-app-surface p-4"
        >
          <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">
            Risk Flags
          </h3>
          <div className="space-y-3">
            {doc.risk_flags.map((flag, i) => (
              <div key={i} className="flex gap-2.5">
                <SeverityDot severity={flag.severity} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-text-primary">{flag.description}</p>
                  <p className="text-xs text-text-muted mt-0.5 italic">"{flag.quote}"</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Extracted Numbers */}
      {numbers.length > 0 && (
        <motion.div
          {...fadeUp}
          transition={{ ...fadeUp.transition, delay: 0.15 }}
          className="rounded-xl border border-border-subtle bg-app-surface p-4"
        >
          <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">
            Extracted Numbers
          </h3>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
            {numbers.map(([key, value]) => (
              <div key={key} className="flex flex-col">
                <span className="text-[10px] text-text-muted uppercase tracking-wide">
                  {formatLabel(key)}
                </span>
                <NumberValue keyName={key} value={value} />
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Key Terms */}
      {doc.key_terms.length > 0 && (
        <motion.div
          {...fadeUp}
          transition={{ ...fadeUp.transition, delay: 0.2 }}
          className="rounded-xl border border-border-subtle bg-app-surface p-4"
        >
          <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">
            Key Terms
          </h3>
          <ul className="space-y-1">
            {visibleTerms.map((term, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-text-primary">
                <span className="text-text-muted mt-1">•</span>
                {term}
              </li>
            ))}
          </ul>
          {doc.key_terms.length > 8 && (
            <button
              onClick={() => setShowAllTerms(!showAllTerms)}
              className="flex items-center gap-1 mt-2 text-xs text-accent-primary hover:text-accent-primary/80 transition-colors"
            >
              {showAllTerms ? (
                <>
                  <ChevronUp size={12} /> Show less
                </>
              ) : (
                <>
                  <ChevronDown size={12} /> Show all {doc.key_terms.length} terms
                </>
              )}
            </button>
          )}
        </motion.div>
      )}
    </div>
  )
}

/* ---------- Right Panel Content ---------- */

function RightPanelContent({
  selectedId,
  onClearSelection,
  isMobileDetail,
}: {
  selectedId: string | null
  onClearSelection: () => void
  isMobileDetail: boolean
}) {
  const queryClient = useQueryClient()

  const { data: doc, isLoading } = useQuery({
    queryKey: ['document', selectedId],
    queryFn: () => api.documents.get(selectedId!),
    enabled: !!selectedId,
    refetchInterval: (query) => {
      const status = query.state.data?.status
      if (!status) return false
      return status === 'pending' || status === 'processing' ? 3000 : false
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.documents.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] })
      onClearSelection()
      toast.success('Document deleted')
    },
    onError: () => toast.error('Failed to delete document'),
  })

  if (!selectedId) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-6">
        <FileSearch size={40} className="text-text-muted mb-3" />
        <p className="text-sm text-text-secondary">Select a document to view AI analysis</p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-3 p-1">
        <div className="rounded-xl border border-border-subtle bg-app-surface p-4 space-y-3">
          <div className="h-4 w-3/5 rounded bg-app-elevated animate-pulse" />
          <div className="h-3 w-2/5 rounded bg-app-elevated animate-pulse" />
        </div>
        <div className="rounded-xl border border-border-subtle bg-app-surface p-4 space-y-2">
          <div className="h-3 w-full rounded bg-app-elevated animate-pulse" />
          <div className="h-3 w-full rounded bg-app-elevated animate-pulse" />
          <div className="h-3 w-3/4 rounded bg-app-elevated animate-pulse" />
        </div>
      </div>
    )
  }

  if (!doc) return null

  if (doc.status === 'pending' || doc.status === 'processing') {
    return (
      <div className="flex flex-col items-center justify-center h-full px-6">
        {isMobileDetail && (
          <button
            onClick={onClearSelection}
            className="self-start flex items-center gap-1 mb-6 text-sm text-text-secondary hover:text-text-primary transition-colors md:hidden"
          >
            <ChevronLeft size={16} />
            Back to list
          </button>
        )}
        <div className="rounded-xl border border-border-subtle bg-app-surface p-6 w-full max-w-sm">
          <h3 className="text-sm font-semibold text-text-primary mb-4">Analyzing document...</h3>
          <ProcessingSteps status={doc.status} />
          <p className="text-[10px] text-text-muted mt-4">This usually takes 15–30 seconds</p>
        </div>
      </div>
    )
  }

  if (doc.status === 'failed') {
    return (
      <div className="p-1">
        {isMobileDetail && (
          <button
            onClick={onClearSelection}
            className="flex items-center gap-1 mb-4 text-sm text-text-secondary hover:text-text-primary transition-colors md:hidden"
          >
            <ChevronLeft size={16} />
            Back to list
          </button>
        )}
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle size={16} className="text-red-400 mt-0.5 shrink-0" />
            <div>
              <h3 className="text-sm font-semibold text-red-400">Analysis failed</h3>
              <p className="text-xs text-text-secondary mt-1">
                {doc.processing_error ?? 'An unexpected error occurred while processing this document.'}
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3 h-7 text-xs text-red-400 border-red-500/30 hover:border-red-400/50"
                onClick={() => deleteMutation.mutate(doc.id)}
                disabled={deleteMutation.isPending}
              >
                <Trash2 size={12} className="mr-1.5" />
                Delete
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <AnimatePresence mode="wait">
      <DetailPanel
        key={doc.id}
        doc={doc}
        onDelete={() => deleteMutation.mutate(doc.id)}
        isDeleting={deleteMutation.isPending}
        onBack={onClearSelection}
        showBack={isMobileDetail}
      />
    </AnimatePresence>
  )
}

/* ---------- Main Page ---------- */

/** Documents page — upload files and view AI analysis results. */
export default function DocumentsPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const queryClient = useQueryClient()

  const { data: documents, isLoading } = useQuery({
    queryKey: ['documents'],
    queryFn: api.documents.list,
  })

  const uploadMutation = useMutation({
    mutationFn: (file: File) => {
      const formData = new FormData()
      formData.append('file', file)
      return api.documents.upload(formData)
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['documents'] })
      setSelectedId(data.id)
      toast.success('Document uploaded')
    },
    onError: () => toast.error('Upload failed — please try again'),
  })

  const showMobileDetail = selectedId !== null

  return (
    <AppShell title="Documents" noPadding>
      <div className="flex h-full">
        {/* Left Panel */}
        <div
          className={cn(
            'w-full md:w-[320px] md:shrink-0 border-r border-border-subtle overflow-y-auto p-3 space-y-3',
            showMobileDetail && 'hidden md:block',
          )}
        >
          <UploadZone onUpload={(f) => uploadMutation.mutate(f)} isUploading={uploadMutation.isPending} />

          {isLoading ? (
            <SkeletonList />
          ) : !documents || documents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileText size={28} className="text-text-muted mb-2" />
              <p className="text-sm text-text-secondary">No documents yet</p>
              <p className="text-xs text-text-muted mt-0.5">Upload a file to get started</p>
            </div>
          ) : (
            <div className="space-y-1">
              {documents.map((doc) => (
                <DocRow
                  key={doc.id}
                  doc={doc}
                  isSelected={selectedId === doc.id}
                  onSelect={() => setSelectedId(doc.id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Right Panel */}
        <div
          className={cn(
            'flex-1 overflow-y-auto p-4',
            !showMobileDetail && 'hidden md:block',
          )}
        >
          <RightPanelContent
            selectedId={selectedId}
            onClearSelection={() => setSelectedId(null)}
            isMobileDetail={showMobileDetail}
          />
        </div>
      </div>
    </AppShell>
  )
}
