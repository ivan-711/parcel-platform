// frontend/src/hooks/useFinancing.ts
/** Financing query and mutation hooks — wraps api.financing with React Query. */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import type {
  InstrumentFilters,
  ObligationFilters,
  PaymentFilters,
  CreateInstrumentRequest,
  UpdateInstrumentRequest,
  CompleteObligationRequest,
  UpdateObligationRequest,
  CreatePaymentRequest,
} from '@/types/financing'

// ---------------------------------------------------------------------------
// Instruments
// ---------------------------------------------------------------------------

export function useInstruments(filters?: InstrumentFilters) {
  return useQuery({
    queryKey: ['financing', 'instruments', filters],
    queryFn: () => api.financing.instruments.list(filters),
    staleTime: 30_000,
  })
}

export function useInstrument(id: string | undefined) {
  return useQuery({
    queryKey: ['financing', 'instruments', id],
    queryFn: () => api.financing.instruments.get(id!),
    enabled: !!id,
    staleTime: 30_000,
  })
}

export function useCreateInstrument() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateInstrumentRequest) => api.financing.instruments.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financing'] })
      toast.success('Instrument created')
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to create instrument')
    },
  })
}

export function useUpdateInstrument() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateInstrumentRequest }) =>
      api.financing.instruments.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financing'] })
      toast.success('Instrument updated')
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to update instrument')
    },
  })
}

export function useDeleteInstrument() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.financing.instruments.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financing'] })
      toast.success('Instrument deleted')
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to delete instrument')
    },
  })
}

// ---------------------------------------------------------------------------
// Obligations
// ---------------------------------------------------------------------------

export function useObligations(filters?: ObligationFilters) {
  return useQuery({
    queryKey: ['financing', 'obligations', filters],
    queryFn: () => api.financing.obligations.list(filters),
    staleTime: 30_000,
  })
}

export function useUpcomingObligations() {
  return useQuery({
    queryKey: ['financing', 'obligations', 'upcoming'],
    queryFn: () => api.financing.obligations.upcoming(),
    staleTime: 30_000,
  })
}

export function useCompleteObligation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: CompleteObligationRequest }) =>
      api.financing.obligations.complete(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financing'] })
      queryClient.invalidateQueries({ queryKey: ['today'] })
      toast.success('Obligation completed')
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to complete obligation')
    },
  })
}

export function useUpdateObligation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateObligationRequest }) =>
      api.financing.obligations.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financing'] })
      toast.success('Obligation updated')
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to update obligation')
    },
  })
}

// ---------------------------------------------------------------------------
// Payments
// ---------------------------------------------------------------------------

export function usePayments(filters?: PaymentFilters) {
  return useQuery({
    queryKey: ['financing', 'payments', filters],
    queryFn: () => api.financing.payments.list(filters),
    staleTime: 30_000,
  })
}

export function usePaymentSummary() {
  return useQuery({
    queryKey: ['financing', 'payments', 'summary'],
    queryFn: () => api.financing.payments.summary(),
    staleTime: 30_000,
  })
}

export function useRecordPayment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreatePaymentRequest) => api.financing.payments.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financing'] })
      queryClient.invalidateQueries({ queryKey: ['today'] })
      toast.success('Payment recorded')
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to record payment')
    },
  })
}

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

export function useFinancingDashboard() {
  return useQuery({
    queryKey: ['financing', 'dashboard'],
    queryFn: () => api.financing.dashboard(),
    staleTime: 30_000,
  })
}
