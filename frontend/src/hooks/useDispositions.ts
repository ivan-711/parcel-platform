/** Disposition match scoring and buyer packet hooks. */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import type { MatchFilters, CreatePacketRequest, SendPacketRequest } from '@/types'

export function usePropertyMatches(propertyId: string | undefined, filters?: MatchFilters) {
  return useQuery({
    queryKey: ['dispositions', 'property', propertyId, filters],
    queryFn: () => api.dispositions.matchProperty(propertyId!, filters),
    enabled: !!propertyId,
    staleTime: 30_000,
  })
}

export function useBuyerMatches(contactId: string | undefined) {
  return useQuery({
    queryKey: ['dispositions', 'buyer', contactId],
    queryFn: () => api.dispositions.matchBuyer(contactId!),
    enabled: !!contactId,
    staleTime: 30_000,
  })
}

export function useMatchPreview(propertyId: string | undefined, buyBoxId: string | undefined) {
  return useQuery({
    queryKey: ['dispositions', 'preview', propertyId, buyBoxId],
    queryFn: () => api.dispositions.matchPreview({ property_id: propertyId!, buy_box_id: buyBoxId! }),
    enabled: !!propertyId && !!buyBoxId,
    staleTime: 30_000,
  })
}

export function usePackets() {
  return useQuery({
    queryKey: ['dispositions', 'packets'],
    queryFn: () => api.dispositions.packets.list(),
    staleTime: 30_000,
  })
}

export function useCreatePacket() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreatePacketRequest) => api.dispositions.packets.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dispositions', 'packets'] })
      toast.success('Buyer packet created')
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to create packet'),
  })
}

export function useSendPacket(packetId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: SendPacketRequest) => api.dispositions.packets.send(packetId, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['dispositions', 'packets'] })
      queryClient.invalidateQueries({ queryKey: ['buyers'] })
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
