/** Documents page — upload files and view AI analysis results. */

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { AppShell } from '@/components/layout/AppShell'
import { cn } from '@/lib/utils'
import { api } from '@/lib/api'
import { UploadZone } from '@/components/documents/upload-zone'
import { DocumentList } from '@/components/documents/document-list'
import { RightPanelContent } from '@/components/documents/document-detail'

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
          <DocumentList
            documents={documents}
            isLoading={isLoading}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />
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
