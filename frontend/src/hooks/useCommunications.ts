/** Communication thread and send hooks. */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import type { SendSMSRequest, SendEmailRequest } from '@/types'

export function useThread(contactId: string | undefined) {
  return useQuery({
    queryKey: ['communications', 'thread', contactId],
    queryFn: () => api.communications.thread(contactId!),
    enabled: !!contactId,
    staleTime: 10_000,
    refetchInterval: 30_000,
  })
}

export function useSendSMS() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: SendSMSRequest) => api.communications.sendSMS(data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['communications', 'thread', variables.contact_id] })
      queryClient.invalidateQueries({ queryKey: ['contact-communications', variables.contact_id] })
      toast.success('SMS sent')
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to send SMS'),
  })
}

export function useSendEmail() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: SendEmailRequest) => api.communications.sendEmail(data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['communications', 'thread', variables.contact_id] })
      queryClient.invalidateQueries({ queryKey: ['contact-communications', variables.contact_id] })
      toast.success('Email sent')
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to send email'),
  })
}
