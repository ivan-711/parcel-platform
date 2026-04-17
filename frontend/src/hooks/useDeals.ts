/** Deal mutation and query hooks — wraps api.deals and api.pipeline with React Query. */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import type { DealCreateRequest, DealsFilters, PipelineCreateRequest } from '@/types'

/** Fetches a paginated, filterable list of the current user's deals. */
export function useDeals(filters: DealsFilters) {
  const userId = useAuthStore((s) => s.user?.id)
  return useQuery({
    queryKey: ['u', userId, 'deals', filters],
    queryFn: () => api.deals.list(filters),
    staleTime: 30_000,
  })
}

export function useCreateDeal() {
  const navigate = useNavigate()

  return useMutation({
    mutationFn: (data: DealCreateRequest) => api.deals.create(data),
    onSuccess: (deal) => {
      navigate(deal.property_id ? `/analyze/results/${deal.property_id}` : `/analyze/deal/${deal.id}`)
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to analyze deal — try again')
    },
  })
}

export function useDeal(dealId: string) {
  const userId = useAuthStore((s) => s.user?.id)
  return useQuery({
    queryKey: ['u', userId, 'deals', dealId],
    queryFn: () => api.deals.get(dealId),
    enabled: !!dealId,
  })
}

export function useAddToPipeline() {
  const userId = useAuthStore((s) => s.user?.id)
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: PipelineCreateRequest) => api.pipeline.add(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['u', userId, 'pipeline'] })
    },
  })
}

export function useUpdateDeal(dealId: string) {
  const userId = useAuthStore((s) => s.user?.id)
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: Record<string, unknown>) => api.deals.update(dealId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['u', userId, 'deals', dealId] })
    },
  })
}
