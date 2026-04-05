/** Buyer and buy box query/mutation hooks. */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import type { BuyerFilters, QuickAddBuyerRequest, CreateBuyBoxRequest } from '@/types'

export function useBuyers(filters?: BuyerFilters) {
  return useQuery({
    queryKey: ['buyers', filters],
    queryFn: () => api.buyers.list(filters),
    staleTime: 30_000,
  })
}

export function useBuyer(contactId: string | undefined) {
  return useQuery({
    queryKey: ['buyers', contactId],
    queryFn: () => api.buyers.get(contactId!),
    enabled: !!contactId,
    staleTime: 30_000,
  })
}

export function useBuyerMatches(contactId: string | undefined) {
  return useQuery({
    queryKey: ['buyers', contactId, 'matches'],
    queryFn: () => api.buyers.matches(contactId!),
    enabled: !!contactId,
    staleTime: 30_000,
  })
}

export function useQuickAddBuyer() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: QuickAddBuyerRequest) => api.buyers.quickAdd(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['buyers'] })
      queryClient.invalidateQueries({ queryKey: ['contacts'] })
      toast.success('Buyer added')
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to add buyer'),
  })
}

export function useCreateBuyBox(contactId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateBuyBoxRequest) => api.buyers.buyBoxes.create(contactId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['buyers'] })
      toast.success('Buy box created')
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to create buy box'),
  })
}

export function useUpdateBuyBox(contactId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ boxId, data }: { boxId: string; data: Record<string, unknown> }) =>
      api.buyers.buyBoxes.update(contactId, boxId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['buyers'] })
      toast.success('Buy box updated')
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to update buy box'),
  })
}

export function useDeleteBuyBox(contactId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (boxId: string) => api.buyers.buyBoxes.delete(contactId, boxId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['buyers'] })
      toast.success('Buy box removed')
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to remove buy box'),
  })
}
