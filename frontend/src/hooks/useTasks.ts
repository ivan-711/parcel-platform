import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { TaskFilters, CreateTaskRequest, UpdateTaskRequest } from '@/types'

export function useTasksList(filters: TaskFilters = {}, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['tasks', filters],
    queryFn: () => api.tasks.list(filters),
    placeholderData: (prev) => prev,
    enabled: options?.enabled ?? true,
  })
}

export function useTask(id: string | undefined) {
  return useQuery({
    queryKey: ['task', id],
    queryFn: () => api.tasks.get(id!),
    enabled: !!id,
  })
}

export function useTasksToday() {
  return useQuery({
    queryKey: ['tasks-today'],
    queryFn: () => api.tasks.today(),
    staleTime: 2 * 60_000,
    refetchInterval: 5 * 60_000,
  })
}

export function useCreateTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateTaskRequest) => api.tasks.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] })
      qc.invalidateQueries({ queryKey: ['tasks-today'] })
      qc.invalidateQueries({ queryKey: ['today'] })
    },
  })
}

export function useUpdateTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateTaskRequest }) =>
      api.tasks.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] })
      qc.invalidateQueries({ queryKey: ['tasks-today'] })
      qc.invalidateQueries({ queryKey: ['today'] })
    },
  })
}

export function useCompleteTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.tasks.complete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] })
      qc.invalidateQueries({ queryKey: ['tasks-today'] })
      qc.invalidateQueries({ queryKey: ['today'] })
    },
  })
}

export function useSnoozeTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, until }: { id: string; until: string }) =>
      api.tasks.snooze(id, until),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] })
      qc.invalidateQueries({ queryKey: ['tasks-today'] })
      qc.invalidateQueries({ queryKey: ['today'] })
    },
  })
}

export function useDeleteTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.tasks.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] })
      qc.invalidateQueries({ queryKey: ['tasks-today'] })
      qc.invalidateQueries({ queryKey: ['today'] })
    },
  })
}
