/** Transaction query and mutation hooks. */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import type { TransactionFilters, CreateTransactionRequest } from '@/types'

export function useTransactions(filters?: TransactionFilters) {
  return useQuery({
    queryKey: ['transactions', filters],
    queryFn: () => api.transactions.list(filters),
    staleTime: 30_000,
  })
}

export function useTransactionSummary(filters?: { property_id?: string; date_from?: string; date_to?: string }) {
  return useQuery({
    queryKey: ['transactions', 'summary', filters],
    queryFn: () => api.transactions.summary(filters),
    staleTime: 30_000,
  })
}

export function useCreateTransaction() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateTransactionRequest) => api.transactions.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['today'] })
      toast.success('Transaction recorded')
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to create transaction')
    },
  })
}

export function useUpdateTransaction() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      api.transactions.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      toast.success('Transaction updated')
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to update transaction')
    },
  })
}

export function useDeleteTransaction() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.transactions.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['today'] })
      toast.success('Transaction deleted')
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to delete transaction')
    },
  })
}

export function useBulkCreateTransactions() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: { transactions: CreateTransactionRequest[] }) =>
      api.transactions.bulkCreate(data),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['today'] })
      toast.success(`${result.created} transactions imported`)
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to import transactions')
    },
  })
}
