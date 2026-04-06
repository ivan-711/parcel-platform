/** Hook for polling document processing status until complete or failed. */

import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

export function useDocumentStatus(documentId: string | null) {
  return useQuery({
    queryKey: ['document-status', documentId],
    queryFn: () => api.documents.status(documentId!),
    enabled: !!documentId,
    refetchInterval: (query) => {
      const data = query.state.data
      if (!data) return 3000
      // Stop polling once both stages are done
      const metadataDone = data.status === 'complete' || data.status === 'failed'
      const embeddingDone = data.embedding_status === 'complete' || data.embedding_status === 'failed'
      if (metadataDone && embeddingDone) return false
      return 3000
    },
  })
}
