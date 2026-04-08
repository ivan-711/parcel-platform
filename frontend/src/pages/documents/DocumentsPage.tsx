/** Documents page — upload files and view AI analysis results with pagination. */

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { AlertTriangle } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { FeatureGate } from '@/components/billing/FeatureGate'
import { cn } from '@/lib/utils'
import { api } from '@/lib/api'
import { UploadZone } from '@/components/documents/upload-zone'
import { DocumentList } from '@/components/documents/document-list'
import { RightPanelContent } from '@/components/documents/document-detail'

/** PaginationControls — Previous/Next buttons with page indicator for document list. */
function PaginationControls({
  page,
  pages,
  onPageChange,
}: {
  page: number
  pages: number
  onPageChange: (page: number) => void
}) {
  if (pages <= 1) return null

  return (
    <div className="flex items-center justify-between px-3 py-2 border-t border-border-subtle">
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        aria-label="Previous page"
        className={cn(
          'flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs transition-colors',
          'border border-border-default bg-app-surface hover:bg-app-elevated',
          'text-text-secondary',
          page <= 1 && 'opacity-50 cursor-not-allowed hover:bg-app-surface',
        )}
      >
        <ChevronLeft size={14} />
        Previous
      </button>

      <span className="text-xs text-text-secondary">
        Page <span className="tabular-nums text-text-primary">{page}</span> of{' '}
        <span className="tabular-nums text-text-primary">{pages}</span>
      </span>

      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page >= pages}
        aria-label="Next page"
        className={cn(
          'flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs transition-colors',
          'border border-border-default bg-app-surface hover:bg-app-elevated',
          'text-text-secondary',
          page >= pages && 'opacity-50 cursor-not-allowed hover:bg-app-surface',
        )}
      >
        Next
        <ChevronRight size={14} />
      </button>
    </div>
  )
}

export default function DocumentsPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const queryClient = useQueryClient()

  const { data, isLoading, isError } = useQuery({
    queryKey: ['documents', page],
    queryFn: () => api.documents.list(page),
    placeholderData: (previousData) => previousData,
  })

  const uploadMutation = useMutation({
    mutationFn: (file: File) => {
      const formData = new FormData()
      formData.append('file', file)
      return api.documents.upload(formData)
    },
    onSuccess: (resp) => {
      queryClient.invalidateQueries({ queryKey: ['documents'] })
      setPage(1)
      setSelectedId(resp.id)
      toast.success('Document uploaded')
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Upload failed — please try again'),
  })

  const showMobileDetail = selectedId !== null

  if (isError) {
    return (
      <AppShell title="Documents">
        <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-[#D4766A]/10 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-[#D4766A]" />
          </div>
          <p className="text-base font-medium text-text-primary">Failed to load documents</p>
          <p className="text-sm text-text-secondary">Check your connection and try again.</p>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell title="Documents" noPadding>
      <FeatureGate feature="document_upload">
      <div className="flex h-full">
        {/* Left Panel */}
        <div
          className={cn(
            'w-full md:w-[320px] md:shrink-0 border-r border-border-subtle flex flex-col bg-app-surface',
            showMobileDetail && 'hidden md:flex',
          )}
        >
          <div className="overflow-y-auto flex-1 p-3 space-y-3">
            <UploadZone onUpload={(f) => uploadMutation.mutate(f)} isUploading={uploadMutation.isPending} />
            <DocumentList
              documents={data?.items}
              isLoading={isLoading}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />
          </div>
          <PaginationControls
            page={data?.page ?? 1}
            pages={data?.pages ?? 1}
            onPageChange={setPage}
          />
        </div>

        {/* Right Panel */}
        <div
          className={cn(
            'flex-1 overflow-y-auto p-4 bg-app-bg',
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
      </FeatureGate>
    </AppShell>
  )
}
