/** Rehab project and item query/mutation hooks. */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import type { CreateRehabProjectRequest, CreateRehabItemRequest } from '@/types'

export function useRehabProjects(filters?: { property_id?: string; status?: string }) {
  return useQuery({
    queryKey: ['rehab', 'projects', filters],
    queryFn: () => api.rehab.projects.list(filters),
    staleTime: 30_000,
  })
}

export function useRehabProject(id: string | undefined) {
  return useQuery({
    queryKey: ['rehab', 'projects', id],
    queryFn: () => api.rehab.projects.get(id!),
    enabled: !!id,
    staleTime: 30_000,
  })
}

export function useRehabSummary(id: string | undefined) {
  return useQuery({
    queryKey: ['rehab', 'summary', id],
    queryFn: () => api.rehab.projects.summary(id!),
    enabled: !!id,
    staleTime: 30_000,
  })
}

export function useCreateRehabProject() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateRehabProjectRequest) => api.rehab.projects.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rehab'] })
      toast.success('Rehab project created')
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to create project'),
  })
}

export function useUpdateRehabProject() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      api.rehab.projects.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rehab'] })
      toast.success('Project updated')
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to update project'),
  })
}

export function useDeleteRehabProject() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.rehab.projects.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rehab'] })
      toast.success('Project deleted')
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to delete project'),
  })
}

export function useCreateRehabItem(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateRehabItemRequest) => api.rehab.items.create(projectId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rehab'] })
      toast.success('Item added')
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to add item'),
  })
}

export function useUpdateRehabItem(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ itemId, data }: { itemId: string; data: Record<string, unknown> }) =>
      api.rehab.items.update(projectId, itemId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rehab'] })
      toast.success('Item updated')
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to update item'),
  })
}

export function useDeleteRehabItem(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (itemId: string) => api.rehab.items.delete(projectId, itemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rehab'] })
      toast.success('Item removed')
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to remove item'),
  })
}
