/** Portfolio query hooks. */

import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

/** Legacy portfolio (v1 deal entries). */
export function usePortfolio() {
  return useQuery({
    queryKey: ['portfolio'],
    queryFn: () => api.portfolio.summary(),
    staleTime: 30_000,
  })
}

/** Portfolio V2 — property-centric overview. */
export function usePortfolioOverview() {
  return useQuery({
    queryKey: ['portfolio', 'overview'],
    queryFn: () => api.portfolioV2.overview(),
    staleTime: 30_000,
  })
}
