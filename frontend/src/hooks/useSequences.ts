/** Sequence management hooks — CRUD, steps, enrollment, and analytics. */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import type {
  CreateSequenceRequest,
  UpdateSequenceRequest,
  EnrollRequest,
  BulkEnrollRequest,
} from '@/types'

// ---------------------------------------------------------------------------
// Query hooks
// ---------------------------------------------------------------------------

export function useSequences() {
  const userId = useAuthStore((s) => s.user?.id)
  return useQuery({
    queryKey: ['u', userId, 'sequences'],
    queryFn: () => api.sequences.list(),
    staleTime: 30_000,
  })
}

export function useSequence(id: string | undefined) {
  const userId = useAuthStore((s) => s.user?.id)
  return useQuery({
    queryKey: ['u', userId, 'sequences', id],
    queryFn: () => api.sequences.get(id!),
    enabled: !!id,
    staleTime: 30_000,
  })
}

export function useEnrollments(seqId: string | undefined) {
  const userId = useAuthStore((s) => s.user?.id)
  return useQuery({
    queryKey: ['u', userId, 'sequences', seqId, 'enrollments'],
    queryFn: () => api.sequences.enrollments(seqId!),
    enabled: !!seqId,
    staleTime: 15_000,
  })
}

export function useSequenceAnalytics(seqId: string | undefined) {
  const userId = useAuthStore((s) => s.user?.id)
  return useQuery({
    queryKey: ['u', userId, 'sequences', seqId, 'analytics'],
    queryFn: () => api.sequences.analytics(seqId!),
    enabled: !!seqId,
    staleTime: 60_000,
  })
}

// ---------------------------------------------------------------------------
// Sequence CRUD mutations
// ---------------------------------------------------------------------------

export function useCreateSequence() {
  const userId = useAuthStore((s) => s.user?.id)
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateSequenceRequest) => api.sequences.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['u', userId, 'sequences'] })
      toast.success('Sequence created')
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to create sequence'),
  })
}

export function useUpdateSequence() {
  const userId = useAuthStore((s) => s.user?.id)
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateSequenceRequest }) =>
      api.sequences.update(id, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['u', userId, 'sequences'] })
      queryClient.invalidateQueries({ queryKey: ['u', userId, 'sequences', variables.id] })
      toast.success('Sequence updated')
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to update sequence'),
  })
}

export function useDeleteSequence() {
  const userId = useAuthStore((s) => s.user?.id)
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.sequences.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['u', userId, 'sequences'] })
      toast.success('Sequence deleted')
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to delete sequence'),
  })
}

// ---------------------------------------------------------------------------
// Step mutations
// ---------------------------------------------------------------------------

export function useAddStep(seqId: string) {
  const userId = useAuthStore((s) => s.user?.id)
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: { channel: string; delay_days?: number; delay_hours?: number; subject?: string; body_template: string }) =>
      api.sequences.steps.add(seqId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['u', userId, 'sequences', seqId] })
      toast.success('Step added')
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to add step'),
  })
}

export function useUpdateStep(seqId: string) {
  const userId = useAuthStore((s) => s.user?.id)
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ stepId, data }: { stepId: string; data: Record<string, unknown> }) =>
      api.sequences.steps.update(seqId, stepId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['u', userId, 'sequences', seqId] })
      toast.success('Step updated')
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to update step'),
  })
}

export function useDeleteStep(seqId: string) {
  const userId = useAuthStore((s) => s.user?.id)
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (stepId: string) => api.sequences.steps.delete(seqId, stepId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['u', userId, 'sequences', seqId] })
      toast.success('Step deleted')
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to delete step'),
  })
}

// ---------------------------------------------------------------------------
// Enrollment mutations
// ---------------------------------------------------------------------------

export function useEnrollContact(seqId: string) {
  const userId = useAuthStore((s) => s.user?.id)
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: EnrollRequest) => api.sequences.enroll(seqId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['u', userId, 'sequences', seqId] })
      queryClient.invalidateQueries({ queryKey: ['u', userId, 'sequences', seqId, 'enrollments'] })
      toast.success('Contact enrolled')
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to enroll contact'),
  })
}

export function useBulkEnroll(seqId: string) {
  const userId = useAuthStore((s) => s.user?.id)
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: BulkEnrollRequest) => api.sequences.enrollBulk(seqId, data),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['u', userId, 'sequences', seqId] })
      queryClient.invalidateQueries({ queryKey: ['u', userId, 'sequences', seqId, 'enrollments'] })
      toast.success(`${result.enrolled} contact${result.enrolled !== 1 ? 's' : ''} enrolled`)
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to bulk enroll'),
  })
}

export function useStopEnrollment(seqId: string) {
  const userId = useAuthStore((s) => s.user?.id)
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (enrollmentId: string) => api.sequences.stopEnrollment(seqId, enrollmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['u', userId, 'sequences', seqId] })
      queryClient.invalidateQueries({ queryKey: ['u', userId, 'sequences', seqId, 'enrollments'] })
      toast.success('Enrollment stopped')
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to stop enrollment'),
  })
}
