import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

export function useToday() {
  return useQuery({
    queryKey: ['today'],
    queryFn: () => api.today.get(),
    staleTime: 2 * 60_000,
    refetchInterval: 5 * 60_000,
  })
}
