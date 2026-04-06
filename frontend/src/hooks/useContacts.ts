import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type {
  ContactFilters,
  CreateContactRequest,
  UpdateContactRequest,
  CreateCommunicationRequest,
} from '@/types'

export function useContacts(filters: ContactFilters = {}) {
  return useQuery({
    queryKey: ['contacts', filters],
    queryFn: () => api.contacts.list(filters),
    placeholderData: (prev) => prev,
  })
}

export function useContact(id: string | undefined) {
  return useQuery({
    queryKey: ['contact', id],
    queryFn: () => api.contacts.get(id!),
    enabled: !!id,
  })
}

export function useContactCommunications(id: string | undefined) {
  return useQuery({
    queryKey: ['contact-communications', id],
    queryFn: () => api.contacts.communications(id!),
    enabled: !!id,
  })
}

export function useContactDeals(id: string | undefined) {
  return useQuery({
    queryKey: ['contact-deals', id],
    queryFn: () => api.contacts.deals(id!),
    enabled: !!id,
  })
}

export function useCreateContact() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateContactRequest) => api.contacts.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contacts'] })
    },
  })
}

export function useUpdateContact(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: UpdateContactRequest) => api.contacts.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contact', id] })
      qc.invalidateQueries({ queryKey: ['contacts'] })
    },
  })
}

export function useDeleteContact() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.contacts.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contacts'] })
    },
  })
}

export function useLogCommunication(contactId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateCommunicationRequest) =>
      api.contacts.logCommunication(contactId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contact-communications', contactId] })
      qc.invalidateQueries({ queryKey: ['contacts'] })
    },
  })
}

export function useLinkDeal(contactId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ dealId, role }: { dealId: string; role?: string }) =>
      api.contacts.linkDeal(contactId, dealId, role),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contact-deals', contactId] })
      qc.invalidateQueries({ queryKey: ['contacts'] })
    },
  })
}
