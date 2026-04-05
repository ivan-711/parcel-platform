/** Skip tracing query and mutation hooks. */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import type { TraceAddressRequest, SkipTraceHistoryFilters } from '@/types'

export function useSkipTrace() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: TraceAddressRequest) => api.skipTracing.trace(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['skip-tracing'] })
      toast.success('Skip trace complete')
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Skip trace failed'),
  })
}

export function useSkipTraceHistory(filters?: SkipTraceHistoryFilters) {
  return useQuery({
    queryKey: ['skip-tracing', 'history', filters],
    queryFn: () => api.skipTracing.history(filters),
    staleTime: 30_000,
  })
}

export function useSkipTraceDetail(id: string | undefined) {
  return useQuery({
    queryKey: ['skip-tracing', id],
    queryFn: () => api.skipTracing.get(id!),
    enabled: !!id,
    staleTime: 30_000,
  })
}

export function useSkipTraceUsage() {
  return useQuery({
    queryKey: ['skip-tracing', 'usage'],
    queryFn: () => api.skipTracing.usage(),
    staleTime: 60_000,
  })
}

export function useCreateContactFromTrace() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, contactType }: { id: string; contactType?: string }) =>
      api.skipTracing.createContact(id, contactType ? { contact_type: contactType } : undefined),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['skip-tracing'] })
      queryClient.invalidateQueries({ queryKey: ['contacts'] })
      if (data.existing) {
        toast.success(`Contact already exists: ${data.contact_name}`)
      } else {
        toast.success(`Contact created: ${data.contact_name}`)
      }
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to create contact'),
  })
}

export function useBatchStatus(batchId: string | undefined) {
  return useQuery({
    queryKey: ['skip-tracing', 'batch', batchId],
    queryFn: () => api.skipTracing.batchStatus(batchId!),
    enabled: !!batchId,
    refetchInterval: (query) => {
      const data = query.state.data
      if (data && (data.status === 'complete' || data.status === 'failed')) return false
      return 3000 // poll every 3 seconds while processing
    },
    staleTime: 0,
  })
}
