import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import type {
  PropertyFilters,
  PropertyUpdateRequest,
} from '@/types'

export function useProperties(filters: PropertyFilters = {}) {
  const userId = useAuthStore((s) => s.user?.id)
  return useQuery({
    queryKey: ['u', userId, 'properties', filters],
    queryFn: () => api.properties.list(filters),
    placeholderData: (prev) => prev,
  })
}

export function useProperty(id: string | undefined) {
  const userId = useAuthStore((s) => s.user?.id)
  return useQuery({
    queryKey: ['u', userId, 'property', id],
    queryFn: () => api.properties.get(id!),
    enabled: !!id,
  })
}

export function usePropertyScenarios(id: string | undefined) {
  const userId = useAuthStore((s) => s.user?.id)
  return useQuery({
    queryKey: ['u', userId, 'property-scenarios', id],
    queryFn: () => api.properties.scenarios(id!),
    enabled: !!id,
  })
}

export function usePropertyActivity(id: string | undefined, limit = 20) {
  const userId = useAuthStore((s) => s.user?.id)
  return useQuery({
    queryKey: ['u', userId, 'property-activity', id, limit],
    queryFn: () => api.properties.activity(id!, limit),
    enabled: !!id,
  })
}

export function useDeleteProperty() {
  const userId = useAuthStore((s) => s.user?.id)
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.properties.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['u', userId, 'properties'] })
    },
  })
}

export function useUpdateProperty(id: string) {
  const userId = useAuthStore((s) => s.user?.id)
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: PropertyUpdateRequest) =>
      api.properties.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['u', userId, 'property', id] })
      qc.invalidateQueries({ queryKey: ['u', userId, 'properties'] })
    },
  })
}
