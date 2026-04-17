/** Portfolio query hooks. */

import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'

/** Legacy portfolio (v1 deal entries). */
export function usePortfolio() {
  const userId = useAuthStore((s) => s.user?.id)
  return useQuery({
    queryKey: ['u', userId, 'portfolio'],
    queryFn: () => api.portfolio.summary(),
    staleTime: 30_000,
  })
}

/** Portfolio V2 — property-centric overview. */
export function usePortfolioOverview() {
  const userId = useAuthStore((s) => s.user?.id)
  return useQuery({
    queryKey: ['u', userId, 'portfolio', 'overview'],
    queryFn: () => api.portfolioV2.overview(),
    staleTime: 30_000,
  })
}
