/** DocumentDetail — right panel showing AI analysis results for a selected document. */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FileSearch,
  Download,
  Trash2,
  MessageSquare,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  AlertCircle,
} from 'lucide-react'
import { toast } from 'sonner'
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
import { ProcessingSteps } from './processing-steps'
import { fadeUp } from './constants'
import type { DocumentResponse } from '@/types'

/** SeverityDot — colored dot indicating risk flag severity level. */
function SeverityDot({ severity }: { severity: 'high' | 'medium' | 'low' }) {
  const colors = {
    high: 'bg-red-400',
    medium: 'bg-amber-400',
    low: 'bg-blue-400',
  }
  return <span className={cn('w-2 h-2 rounded-full shrink-0', colors[severity])} />
}

/** NumberValue — formatted extracted number value using JetBrains Mono. */
function NumberValue({ keyName, value }: { keyName: string; value: number | string }) {
  const formatted =
    typeof value === 'string'
      ? value
      : isCurrencyKey(keyName)
        ? formatCurrency(value)
        : value.toLocaleString('en-US', { maximumFractionDigits: 2 })

  return <span className="font-mono text-sm text-text-primary">{formatted}</span>
}

/** DetailPanel — full analysis detail view for a completed document. */
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
          <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-[0.08em] mb-2">
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
          <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-[0.08em] mb-2">
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
          <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-[0.08em] mb-2">
            Extracted Numbers
          </h3>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
            {numbers.map(([key, value]) => (
              <div key={key} className="flex flex-col">
                <span className="text-[10px] text-text-muted uppercase tracking-[0.08em]">
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
          <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-[0.08em] mb-2">
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

/** RightPanelContent — handles data fetching and state routing for the detail panel. */
interface RightPanelContentProps {
  selectedId: string | null
  onClearSelection: () => void
  isMobileDetail: boolean
}

export function RightPanelContent({
  selectedId,
  onClearSelection,
  isMobileDetail,
}: RightPanelContentProps) {
  const queryClient = useQueryClient()

  const { data: doc, isLoading, isError } = useQuery({
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

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-6 gap-3">
        <AlertCircle size={32} className="text-accent-danger" />
        <p className="text-sm text-text-secondary">Failed to load document</p>
        <button
          onClick={() => queryClient.invalidateQueries({ queryKey: ['document', selectedId] })}
          className="text-xs font-medium text-accent-primary hover:text-accent-primary/80 transition-colors"
        >
          Try again
        </button>
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
      <motion.div
        key={doc.id}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
      >
        <DetailPanel
          doc={doc}
          onDelete={() => deleteMutation.mutate(doc.id)}
          isDeleting={deleteMutation.isPending}
          onBack={onClearSelection}
          showBack={isMobileDetail}
        />
      </motion.div>
    </AnimatePresence>
  )
}
