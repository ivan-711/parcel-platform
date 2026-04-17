import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import type {
  ContactFilters,
  CreateContactRequest,
  UpdateContactRequest,
  CreateCommunicationRequest,
} from '@/types'

export function useContacts(filters: ContactFilters = {}) {
  const userId = useAuthStore((s) => s.user?.id)
  return useQuery({
    queryKey: ['u', userId, 'contacts', filters],
    queryFn: () => api.contacts.list(filters),
    placeholderData: (prev) => prev,
  })
}

export function useContact(id: string | undefined) {
  const userId = useAuthStore((s) => s.user?.id)
  return useQuery({
    queryKey: ['u', userId, 'contact', id],
    queryFn: () => api.contacts.get(id!),
    enabled: !!id,
  })
}

export function useContactCommunications(id: string | undefined) {
  const userId = useAuthStore((s) => s.user?.id)
  return useQuery({
    queryKey: ['u', userId, 'contact-communications', id],
    queryFn: () => api.contacts.communications(id!),
    enabled: !!id,
  })
}

export function useContactDeals(id: string | undefined) {
  const userId = useAuthStore((s) => s.user?.id)
  return useQuery({
    queryKey: ['u', userId, 'contact-deals', id],
    queryFn: () => api.contacts.deals(id!),
    enabled: !!id,
  })
}

export function useCreateContact() {
  const userId = useAuthStore((s) => s.user?.id)
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateContactRequest) => api.contacts.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['u', userId, 'contacts'] })
    },
  })
}

export function useUpdateContact(id: string) {
  const userId = useAuthStore((s) => s.user?.id)
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: UpdateContactRequest) => api.contacts.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['u', userId, 'contact', id] })
      qc.invalidateQueries({ queryKey: ['u', userId, 'contacts'] })
    },
  })
}

export function useDeleteContact() {
  const userId = useAuthStore((s) => s.user?.id)
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.contacts.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['u', userId, 'contacts'] })
    },
  })
}

export function useLogCommunication(contactId: string) {
  const userId = useAuthStore((s) => s.user?.id)
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateCommunicationRequest) =>
      api.contacts.logCommunication(contactId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['u', userId, 'contact-communications', contactId] })
      qc.invalidateQueries({ queryKey: ['u', userId, 'contacts'] })
    },
  })
}

export function useLinkDeal(contactId: string) {
  const userId = useAuthStore((s) => s.user?.id)
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ dealId, role }: { dealId: string; role?: string }) =>
      api.contacts.linkDeal(contactId, dealId, role),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['u', userId, 'contact-deals', contactId] })
      qc.invalidateQueries({ queryKey: ['u', userId, 'contacts'] })
    },
  })
}
