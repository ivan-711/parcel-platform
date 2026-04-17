/** Dashboard stats query hook — fetches aggregated deal and pipeline metrics. */

import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'

export function useDashboard() {
  const userId = useAuthStore((s) => s.user?.id)
  return useQuery({
    queryKey: ['u', userId, 'dashboard-stats'],
    queryFn: () => api.dashboard.stats(),
    staleTime: 30_000,
  })
}
