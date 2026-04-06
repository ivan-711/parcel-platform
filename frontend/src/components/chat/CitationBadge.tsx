/** CitationBadge — inline [N] badge with popover showing source text. */

import { useState } from 'react'
import { FileText, X } from 'lucide-react'
import type { Citation } from '@/types'

function trackEvent(event: string, props?: Record<string, unknown>) {
  try { (window as any).posthog?.capture?.(event, props) } catch { /* ignore */ }
}

interface CitationBadgeProps {
  index: number
  citation: Citation
}

export function CitationBadge({ index, citation }: CitationBadgeProps) {
  const [open, setOpen] = useState(false)

  return (
    <span className="relative inline-block">
      <button
        onClick={() => {
          setOpen(!open)
          if (!open) {
            trackEvent('chat_citation_clicked', {
              document_id: citation.document_id,
              chunk_id: citation.chunk_id,
            })
          }
        }}
        className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-[#8B7AFF]/10 text-[#8B7AFF] text-xs font-mono hover:bg-[#8B7AFF]/20 transition-colors cursor-pointer"
      >
        [{index}]
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />
          {/* Popover */}
          <div className="absolute bottom-full left-0 mb-2 z-50 w-72 rounded-lg border border-border-default bg-app-elevated shadow-lg p-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <FileText size={12} className="text-[#8B7AFF] shrink-0" />
                <span className="text-xs font-medium text-text-primary truncate">
                  {citation.document_name}
                </span>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="text-text-secondary hover:text-text-primary transition-colors shrink-0"
              >
                <X size={12} />
              </button>
            </div>
            {citation.page_number && (
              <span className="inline-block text-[10px] text-text-secondary bg-layer-2 rounded px-1.5 py-0.5 mb-2">
                Page {citation.page_number}
              </span>
            )}
            <p className="text-xs text-text-secondary leading-relaxed line-clamp-6">
              {citation.content_preview}
            </p>
            <div className="mt-2 flex items-center gap-1.5">
              <div className="h-1 flex-1 bg-layer-3 rounded-full overflow-hidden max-w-[60px]">
                <div
                  className="h-full bg-[#8B7AFF] rounded-full"
                  style={{ width: `${Math.round(citation.relevance_score * 100)}%` }}
                />
              </div>
              <span className="text-[10px] text-text-secondary tabular-nums">
                {Math.round(citation.relevance_score * 100)}% match
              </span>
            </div>
          </div>
        </>
      )}
    </span>
  )
}

/** CitationList — rendered below assistant message showing all sources. */
export function CitationList({ citations }: { citations: Citation[] }) {
  if (!citations.length) return null

  return (
    <div className="mt-3 pt-2 border-t border-border-subtle">
      <p className="text-[10px] font-medium text-text-secondary uppercase tracking-wide mb-1.5">
        Sources
      </p>
      <div className="flex flex-wrap gap-1.5">
        {citations.map((c, i) => (
          <CitationBadge key={c.chunk_id} index={i + 1} citation={c} />
        ))}
      </div>
    </div>
  )
}
