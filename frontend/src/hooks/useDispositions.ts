/** Disposition match scoring and buyer packet hooks. */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import type { MatchFilters, CreatePacketRequest, SendPacketRequest } from '@/types'

export function usePropertyMatches(propertyId: string | undefined, filters?: MatchFilters) {
  const userId = useAuthStore((s) => s.user?.id)
  return useQuery({
    queryKey: ['u', userId, 'dispositions', 'property', propertyId, filters],
    queryFn: () => api.dispositions.matchProperty(propertyId!, filters),
    enabled: !!propertyId,
    staleTime: 30_000,
  })
}

export function useBuyerMatches(contactId: string | undefined) {
  const userId = useAuthStore((s) => s.user?.id)
  return useQuery({
    queryKey: ['u', userId, 'dispositions', 'buyer', contactId],
    queryFn: () => api.dispositions.matchBuyer(contactId!),
    enabled: !!contactId,
    staleTime: 30_000,
  })
}

export function useMatchPreview(propertyId: string | undefined, buyBoxId: string | undefined) {
  const userId = useAuthStore((s) => s.user?.id)
  return useQuery({
    queryKey: ['u', userId, 'dispositions', 'preview', propertyId, buyBoxId],
    queryFn: () => api.dispositions.matchPreview({ property_id: propertyId!, buy_box_id: buyBoxId! }),
    enabled: !!propertyId && !!buyBoxId,
    staleTime: 30_000,
  })
}

export function usePackets() {
  const userId = useAuthStore((s) => s.user?.id)
  return useQuery({
    queryKey: ['u', userId, 'dispositions', 'packets'],
    queryFn: () => api.dispositions.packets.list(),
    staleTime: 30_000,
  })
}

export function useCreatePacket() {
  const userId = useAuthStore((s) => s.user?.id)
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreatePacketRequest) => api.dispositions.packets.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['u', userId, 'dispositions', 'packets'] })
      toast.success('Buyer packet created')
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to create packet'),
  })
}

export function useSendPacket(packetId: string) {
  const userId = useAuthStore((s) => s.user?.id)
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: SendPacketRequest) => api.dispositions.packets.send(packetId, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['u', userId, 'dispositions', 'packets'] })
      queryClient.invalidateQueries({ queryKey: ['u', userId, 'buyers'] })
      toast.success(`Packet sent to ${data.sent_count} buyer${data.sent_count !== 1 ? 's' : ''}`)
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to send packet'),
  })
}

export function useSharedPacket(shareToken: string | undefined) {
  return useQuery({
    queryKey: ['shared-packet', shareToken],
    queryFn: () => api.dispositions.sharedPacket(shareToken!),
    enabled: !!shareToken,
    staleTime: Infinity,
  })
}
