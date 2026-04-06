import { useState } from 'react'
import { Phone, MessageSquare, Mail, Calendar, Edit3 } from 'lucide-react'
import { toast } from 'sonner'
import { useLogCommunication } from '@/hooks/useContacts'
import { cn } from '@/lib/utils'

const CHANNELS = [
  { value: 'call', label: 'Call', icon: Phone },
  { value: 'sms', label: 'SMS', icon: MessageSquare },
  { value: 'email', label: 'Email', icon: Mail },
  { value: 'meeting', label: 'Meeting', icon: Calendar },
  { value: 'note', label: 'Note', icon: Edit3 },
] as const

interface Props {
  contactId: string
  onLogged?: () => void
}

export function LogActivityForm({ contactId, onLogged }: Props) {
  const [channel, setChannel] = useState('note')
  const [direction, setDirection] = useState<'inbound' | 'outbound'>('outbound')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')

  const logMutation = useLogCommunication(contactId)

  const showDirection = ['call', 'sms', 'email'].includes(channel)

  const handleSave = () => {
    logMutation.mutate(
      {
        channel,
        occurred_at: new Date().toISOString(),
        ...(showDirection && { direction }),
        ...(subject && { subject }),
        ...(body && { body }),
      },
      {
        onSuccess: () => {
          toast.success('Activity logged')
          setSubject('')
          setBody('')
          onLogged?.()
          try {
            (window as any).posthog?.capture?.('communication_logged', {
              contact_id: contactId,
              channel,
              direction: showDirection ? direction : null,
            })
          } catch { /* ignore */ }
        },
        onError: () => toast.error('Failed to log activity'),
      }
    )
  }

  return (
    <div className="bg-[#0C0B0A] border border-[#1E1D1B] rounded-xl p-4 space-y-3">
      {/* Channel selector */}
      <div className="flex items-center gap-1.5">
        {CHANNELS.map((ch) => {
          const Icon = ch.icon
          return (
            <button
              key={ch.value}
              onClick={() => setChannel(ch.value)}
              className={cn(
                'flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer',
                channel === ch.value
                  ? 'bg-[#8B7AFF]/15 text-[#A89FFF] border border-[#8B7AFF]/30'
                  : 'text-[#8A8580] hover:text-[#C5C0B8]'
              )}
            >
              <Icon size={12} />
              {ch.label}
            </button>
          )
        })}
      </div>

      {/* Direction toggle */}
      {showDirection && (
        <div className="flex items-center gap-1.5">
          {(['inbound', 'outbound'] as const).map(d => (
            <button
              key={d}
              onClick={() => setDirection(d)}
              className={cn(
                'text-xs px-3 py-1 rounded-lg transition-colors cursor-pointer capitalize',
                direction === d
                  ? 'bg-[#141311] text-[#F0EDE8] border border-[#1E1D1B]'
                  : 'text-[#8A8580] hover:text-[#C5C0B8]'
              )}
            >
              {d}
            </button>
          ))}
        </div>
      )}

      {/* Subject */}
      <input
        type="text"
        value={subject}
        onChange={e => setSubject(e.target.value)}
        placeholder="Subject (optional)"
        className="w-full h-9 px-3 rounded-lg bg-[#141311] border border-[#1E1D1B] text-sm text-[#F0EDE8] placeholder-[#8A8580]/60 focus:outline-none focus:border-[#8B7AFF]/40 focus:ring-2 focus:ring-[#8B7AFF]/20 transition-all"
      />

      {/* Notes */}
      <textarea
        value={body}
        onChange={e => setBody(e.target.value)}
        placeholder="Notes..."
        rows={2}
        className="w-full px-3 py-2 rounded-lg bg-[#141311] border border-[#1E1D1B] text-sm text-[#F0EDE8] placeholder-[#8A8580]/60 focus:outline-none focus:border-[#8B7AFF]/40 focus:ring-2 focus:ring-[#8B7AFF]/20 transition-all resize-none"
      />

      {/* Save */}
      <button
        onClick={handleSave}
        disabled={logMutation.isPending}
        className="px-4 py-2 rounded-lg text-sm font-medium bg-[#8B7AFF] text-white hover:bg-[#7B6AEF] transition-colors disabled:opacity-40 cursor-pointer"
      >
        {logMutation.isPending ? 'Saving...' : 'Log Activity'}
      </button>
    </div>
  )
}
