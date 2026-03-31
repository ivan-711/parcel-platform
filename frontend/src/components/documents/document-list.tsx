/** DocumentList — left panel containing the document file list with status badges. */

import { FileText } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatFileSize } from '@/lib/format'
import type { DocumentListItem } from '@/types'

/** StatusBadge — colored dot + label indicating document processing status. */
function StatusBadge({ status }: { status: DocumentListItem['status'] }) {
  if (status === 'complete') {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-sky-700 bg-sky-50 rounded-full px-2 py-0.5">
        <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
        Done
      </span>
    )
  }
  if (status === 'failed') {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-red-700 bg-red-50 rounded-full px-2 py-0.5">
        <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
        Failed
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-700 bg-amber-50 rounded-full px-2 py-0.5">
      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
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
          ? 'bg-lime-50 border border-lime-300'
          : 'hover:bg-gray-50 border border-transparent',
      )}
    >
      <div className="flex items-start gap-2.5">
        <FileText size={14} className="text-gray-400 mt-0.5 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-sm text-gray-900 truncate">{doc.original_filename}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[10px] text-gray-400 tabular-nums">
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
          <div className="h-3.5 w-4/5 rounded bg-gray-100 animate-pulse" />
          <div className="h-2.5 w-2/5 rounded bg-gray-100 animate-pulse" />
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
        <FileText size={28} className="text-gray-400 mb-2" />
        <p className="text-sm text-gray-600">No documents yet</p>
        <p className="text-xs text-gray-400 mt-0.5">Upload a file to get started</p>
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
