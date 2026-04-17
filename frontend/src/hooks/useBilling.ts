/** TanStack Query hooks for billing endpoints. */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import type { BillingStatus, CheckoutRequest, CheckoutResponse, PortalResponse, CancelRequest, CancelResponse } from '@/types'

export function useBillingStatus() {
  const userId = useAuthStore((s) => s.user?.id)
  return useQuery<BillingStatus>({
    queryKey: ['u', userId, 'billing', 'status'],
    queryFn: () => api.billing.status(),
    staleTime: 60_000,
    refetchOnWindowFocus: true,
  })
}

export function useCheckout() {
  return useMutation<CheckoutResponse, Error, CheckoutRequest>({
    mutationFn: (data) => api.billing.checkout(data),
    onSuccess: (data) => {
      window.location.href = data.checkout_url
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to start checkout — try again')
    },
  })
}

export function usePortal() {
  return useMutation<PortalResponse, Error, void>({
    mutationFn: () => api.billing.portal(),
    onSuccess: (data) => {
      window.location.href = data.portal_url
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to open billing portal — try again')
    },
  })
}

export function useCancelSubscription() {
  const userId = useAuthStore((s) => s.user?.id)
  const queryClient = useQueryClient()
  return useMutation<CancelResponse, Error, CancelRequest>({
    mutationFn: (data) => api.billing.cancel(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['u', userId, 'billing'] })
      queryClient.invalidateQueries({ queryKey: ['u', userId, 'auth', 'me'] })
      toast.success('Subscription canceled')
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to cancel subscription — try again')
    },
  })
}
