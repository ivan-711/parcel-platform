import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type {
  PropertyFilters,
  PropertyUpdateRequest,
} from '@/types'

export function useProperties(filters: PropertyFilters = {}) {
  return useQuery({
    queryKey: ['properties', filters],
    queryFn: () => api.properties.list(filters),
    placeholderData: (prev) => prev,
  })
}

export function useProperty(id: string | undefined) {
  return useQuery({
    queryKey: ['property', id],
    queryFn: () => api.properties.get(id!),
    enabled: !!id,
  })
}

export function usePropertyScenarios(id: string | undefined) {
  return useQuery({
    queryKey: ['property-scenarios', id],
    queryFn: () => api.properties.scenarios(id!),
    enabled: !!id,
  })
}

export function usePropertyActivity(id: string | undefined, limit = 20) {
  return useQuery({
    queryKey: ['property-activity', id, limit],
    queryFn: () => api.properties.activity(id!, limit),
    enabled: !!id,
  })
}

export function useDeleteProperty() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.properties.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['properties'] })
    },
  })
}

export function useUpdateProperty(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: PropertyUpdateRequest) =>
      api.properties.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['property', id] })
      qc.invalidateQueries({ queryKey: ['properties'] })
    },
  })
}
