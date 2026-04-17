import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'

export function useToday() {
  const userId = useAuthStore((s) => s.user?.id)
  return useQuery({
    queryKey: ['u', userId, 'today'],
    queryFn: () => api.today.get(),
    staleTime: 2 * 60_000,
    refetchInterval: 5 * 60_000,
  })
}
