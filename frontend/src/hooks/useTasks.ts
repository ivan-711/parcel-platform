import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import type { TaskFilters, CreateTaskRequest, UpdateTaskRequest } from '@/types'

export function useTasksList(filters: TaskFilters = {}, options?: { enabled?: boolean }) {
  const userId = useAuthStore((s) => s.user?.id)
  return useQuery({
    queryKey: ['u', userId, 'tasks', filters],
    queryFn: () => api.tasks.list(filters),
    placeholderData: (prev) => prev,
    enabled: options?.enabled ?? true,
  })
}

export function useTask(id: string | undefined) {
  const userId = useAuthStore((s) => s.user?.id)
  return useQuery({
    queryKey: ['u', userId, 'task', id],
    queryFn: () => api.tasks.get(id!),
    enabled: !!id,
  })
}

export function useTasksToday() {
  const userId = useAuthStore((s) => s.user?.id)
  return useQuery({
    queryKey: ['u', userId, 'tasks-today'],
    queryFn: () => api.tasks.today(),
    staleTime: 2 * 60_000,
    refetchInterval: 5 * 60_000,
  })
}

export function useCreateTask() {
  const userId = useAuthStore((s) => s.user?.id)
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateTaskRequest) => api.tasks.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['u', userId, 'tasks'] })
      qc.invalidateQueries({ queryKey: ['u', userId, 'tasks-today'] })
      qc.invalidateQueries({ queryKey: ['u', userId, 'today'] })
    },
  })
}

export function useUpdateTask() {
  const userId = useAuthStore((s) => s.user?.id)
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateTaskRequest }) =>
      api.tasks.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['u', userId, 'tasks'] })
      qc.invalidateQueries({ queryKey: ['u', userId, 'tasks-today'] })
      qc.invalidateQueries({ queryKey: ['u', userId, 'today'] })
    },
  })
}

export function useCompleteTask() {
  const userId = useAuthStore((s) => s.user?.id)
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.tasks.complete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['u', userId, 'tasks'] })
      qc.invalidateQueries({ queryKey: ['u', userId, 'tasks-today'] })
      qc.invalidateQueries({ queryKey: ['u', userId, 'today'] })
    },
  })
}

export function useSnoozeTask() {
  const userId = useAuthStore((s) => s.user?.id)
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, until }: { id: string; until: string }) =>
      api.tasks.snooze(id, until),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['u', userId, 'tasks'] })
      qc.invalidateQueries({ queryKey: ['u', userId, 'tasks-today'] })
      qc.invalidateQueries({ queryKey: ['u', userId, 'today'] })
    },
  })
}

export function useDeleteTask() {
  const userId = useAuthStore((s) => s.user?.id)
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.tasks.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['u', userId, 'tasks'] })
      qc.invalidateQueries({ queryKey: ['u', userId, 'tasks-today'] })
      qc.invalidateQueries({ queryKey: ['u', userId, 'today'] })
    },
  })
}
