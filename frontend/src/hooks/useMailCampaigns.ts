/** Mail campaign CRUD and action hooks. */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import type { CreateMailCampaignRequest, UpdateMailCampaignRequest, AddRecipientsRequest, QuickSendRequest } from '@/types'

export function useMailCampaigns() {
  const userId = useAuthStore((s) => s.user?.id)
  return useQuery({ queryKey: ['u', userId, 'mail-campaigns'], queryFn: () => api.mailCampaigns.list(), staleTime: 30_000 })
}

export function useMailCampaign(id: string | undefined) {
  const userId = useAuthStore((s) => s.user?.id)
  return useQuery({ queryKey: ['u', userId, 'mail-campaigns', id], queryFn: () => api.mailCampaigns.get(id!), enabled: !!id, staleTime: 30_000 })
}

export function useCreateMailCampaign() {
  const userId = useAuthStore((s) => s.user?.id)
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateMailCampaignRequest) => api.mailCampaigns.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['u', userId, 'mail-campaigns'] }); toast.success('Campaign created') },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to create campaign'),
  })
}

export function useUpdateMailCampaign(id: string) {
  const userId = useAuthStore((s) => s.user?.id)
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: UpdateMailCampaignRequest) => api.mailCampaigns.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['u', userId, 'mail-campaigns'] }); toast.success('Campaign updated') },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to update'),
  })
}

export function useDeleteMailCampaign() {
  const userId = useAuthStore((s) => s.user?.id)
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.mailCampaigns.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['u', userId, 'mail-campaigns'] }); toast.success('Campaign deleted') },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to delete'),
  })
}

export function useAddRecipients(campaignId: string) {
  const userId = useAuthStore((s) => s.user?.id)
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: AddRecipientsRequest) => api.mailCampaigns.addRecipients(campaignId, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['u', userId, 'mail-campaigns', campaignId] }); toast.success('Recipients added') },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to add recipients'),
  })
}

export function useRemoveRecipient(campaignId: string) {
  const userId = useAuthStore((s) => s.user?.id)
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (recipientId: string) => api.mailCampaigns.removeRecipient(campaignId, recipientId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['u', userId, 'mail-campaigns', campaignId] }) },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to remove'),
  })
}

export function useVerifyAddresses(campaignId: string) {
  const userId = useAuthStore((s) => s.user?.id)
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.mailCampaigns.verify(campaignId),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['u', userId, 'mail-campaigns', campaignId] })
      toast.success(`${data.deliverable} deliverable, ${data.undeliverable} undeliverable`)
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Verification failed'),
  })
}

export function useSendCampaign(campaignId: string) {
  const userId = useAuthStore((s) => s.user?.id)
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.mailCampaigns.send(campaignId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['u', userId, 'mail-campaigns'] }); toast.success('Campaign sending started') },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to send'),
  })
}

export function useCancelCampaign(campaignId: string) {
  const userId = useAuthStore((s) => s.user?.id)
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.mailCampaigns.cancel(campaignId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['u', userId, 'mail-campaigns'] }); toast.success('Campaign cancelled') },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to cancel'),
  })
}

export function useCampaignAnalytics(id: string | undefined) {
  const userId = useAuthStore((s) => s.user?.id)
  return useQuery({
    queryKey: ['u', userId, 'mail-campaigns', id, 'analytics'],
    queryFn: () => api.mailCampaigns.analytics(id!),
    enabled: !!id,
    staleTime: 30_000,
  })
}

export function useQuickSend() {
  return useMutation({
    mutationFn: (data: QuickSendRequest) => api.mailCampaigns.quickSend(data),
    onSuccess: () => { toast.success('Mail piece sent') },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to send'),
  })
}
