/** DocumentList — left panel containing the document file list with status badges. */

import { FileText } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatFileSize } from '@/lib/format'
import type { DocumentListItem } from '@/types'

/** StatusBadge — colored dot + label indicating document processing status. */
function StatusBadge({ status }: { status: DocumentListItem['status'] }) {
  if (status === 'complete') {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-[#6DBEA3] bg-[#6DBEA3]/10 border border-[#6DBEA3]/20 rounded-full px-2 py-0.5">
        <span className="w-1.5 h-1.5 rounded-full bg-[#6DBEA3]" />
        Done
      </span>
    )
  }
  if (status === 'failed') {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-[#D4766A] bg-[#D4766A]/10 border border-[#D4766A]/20 rounded-full px-2 py-0.5">
        <span className="w-1.5 h-1.5 rounded-full bg-[#D4766A]" />
        Failed
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-medium text-[#D4A867] bg-[#D4A867]/10 border border-[#D4A867]/20 rounded-full px-2 py-0.5">
      <span className="w-1.5 h-1.5 rounded-full bg-[#D4A867] animate-pulse" />
      Processing
    </span>
  )
}

/** DocRow — a single document row in the list. */
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
          ? 'bg-[#8B7AFF]/[0.08] border border-[#8B7AFF]/25'
          : 'hover:bg-white/[0.04] border border-transparent',
      )}
    >
      <div className="flex items-start gap-2.5">
        <FileText size={14} className="text-[#5C5A56] mt-0.5 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-sm text-[#F0EDE8] truncate">{doc.original_filename}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[10px] text-[#A09D98] tabular-nums">
              {formatFileSize(doc.file_size_bytes)}
            </span>
            <StatusBadge status={doc.status} />
          </div>
        </div>
      </div>
    </button>
  )
}

/** SkeletonList — placeholder loading state for the document list. */
function SkeletonList() {
  return (
    <div className="space-y-2 px-1">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="px-3 py-2.5 rounded-lg space-y-2">
          <div className="h-3.5 w-4/5 rounded bg-white/[0.06] animate-pulse" />
          <div className="h-2.5 w-2/5 rounded bg-white/[0.06] animate-pulse" />
        </div>
      ))}
    </div>
  )
}

interface DocumentListProps {
  documents: DocumentListItem[] | undefined
  isLoading: boolean
  selectedId: string | null
  onSelect: (id: string) => void
}

export function DocumentList({ documents, isLoading, selectedId, onSelect }: DocumentListProps) {
  if (isLoading) {
    return <SkeletonList />
  }

  if (!documents || documents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <FileText size={28} className="text-[#5C5A56] mb-2" />
        <p className="text-sm text-[#A09D98]">No documents yet</p>
        <p className="text-xs text-[#A09D98] mt-0.5">Upload a file to get started</p>
      </div>
    )
  }

  return (
    <div className="space-y-1">
      {documents.map((doc) => (
        <DocRow
          key={doc.id}
          doc={doc}
          isSelected={selectedId === doc.id}
          onSelect={() => onSelect(doc.id)}
        />
      ))}
    </div>
  )
}
