// frontend/src/hooks/useFinancing.ts
/** Financing query and mutation hooks — wraps api.financing with React Query. */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
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
  const userId = useAuthStore((s) => s.user?.id)
  return useQuery({
    queryKey: ['u', userId, 'financing', 'instruments', filters],
    queryFn: () => api.financing.instruments.list(filters),
    staleTime: 30_000,
  })
}

export function useInstrument(id: string | undefined) {
  const userId = useAuthStore((s) => s.user?.id)
  return useQuery({
    queryKey: ['u', userId, 'financing', 'instruments', id],
    queryFn: () => api.financing.instruments.get(id!),
    enabled: !!id,
    staleTime: 30_000,
  })
}

export function useCreateInstrument() {
  const userId = useAuthStore((s) => s.user?.id)
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateInstrumentRequest) => api.financing.instruments.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['u', userId, 'financing'] })
      toast.success('Instrument created')
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to create instrument')
    },
  })
}

export function useUpdateInstrument() {
  const userId = useAuthStore((s) => s.user?.id)
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateInstrumentRequest }) =>
      api.financing.instruments.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['u', userId, 'financing'] })
      toast.success('Instrument updated')
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to update instrument')
    },
  })
}

export function useDeleteInstrument() {
  const userId = useAuthStore((s) => s.user?.id)
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.financing.instruments.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['u', userId, 'financing'] })
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
  const userId = useAuthStore((s) => s.user?.id)
  return useQuery({
    queryKey: ['u', userId, 'financing', 'obligations', filters],
    queryFn: () => api.financing.obligations.list(filters),
    staleTime: 30_000,
  })
}

export function useUpcomingObligations() {
  const userId = useAuthStore((s) => s.user?.id)
  return useQuery({
    queryKey: ['u', userId, 'financing', 'obligations', 'upcoming'],
    queryFn: () => api.financing.obligations.upcoming(),
    staleTime: 30_000,
  })
}

export function useCompleteObligation() {
  const userId = useAuthStore((s) => s.user?.id)
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: CompleteObligationRequest }) =>
      api.financing.obligations.complete(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['u', userId, 'financing'] })
      queryClient.invalidateQueries({ queryKey: ['u', userId, 'today'] })
      toast.success('Obligation completed')
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to complete obligation')
    },
  })
}

export function useUpdateObligation() {
  const userId = useAuthStore((s) => s.user?.id)
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateObligationRequest }) =>
      api.financing.obligations.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['u', userId, 'financing'] })
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
  const userId = useAuthStore((s) => s.user?.id)
  return useQuery({
    queryKey: ['u', userId, 'financing', 'payments', filters],
    queryFn: () => api.financing.payments.list(filters),
    staleTime: 30_000,
  })
}

export function usePaymentSummary() {
  const userId = useAuthStore((s) => s.user?.id)
  return useQuery({
    queryKey: ['u', userId, 'financing', 'payments', 'summary'],
    queryFn: () => api.financing.payments.summary(),
    staleTime: 30_000,
  })
}

export function useRecordPayment() {
  const userId = useAuthStore((s) => s.user?.id)
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreatePaymentRequest) => api.financing.payments.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['u', userId, 'financing'] })
      queryClient.invalidateQueries({ queryKey: ['u', userId, 'today'] })
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
  const userId = useAuthStore((s) => s.user?.id)
  return useQuery({
    queryKey: ['u', userId, 'financing', 'dashboard'],
    queryFn: () => api.financing.dashboard(),
    staleTime: 30_000,
  })
}
