/** Dashboard stats query hook — fetches aggregated deal and pipeline metrics. */

import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

export function useDashboard() {
  return useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => api.dashboard.stats(),
    staleTime: 30_000,
  })
}
