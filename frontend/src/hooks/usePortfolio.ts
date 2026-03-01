/** Portfolio query hook — fetches summary metrics and closed deal entries. */

import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

export function usePortfolio() {
  return useQuery({
    queryKey: ['portfolio'],
    queryFn: () => api.portfolio.summary(),
    staleTime: 30_000,
  })
}
