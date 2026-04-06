import { Phone, MessageSquare, Mail, Calendar, Edit3 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { CommunicationItem } from '@/types'

const CHANNEL_ICONS: Record<string, React.ElementType> = {
  call: Phone,
  sms: MessageSquare,
  email: Mail,
  meeting: Calendar,
  note: Edit3,
}

const CHANNEL_COLORS: Record<string, string> = {
  call: 'text-[#4ADE80] bg-[#4ADE80]/10',
  sms: 'text-[#60A5FA] bg-[#60A5FA]/10',
  email: 'text-[#8B7AFF] bg-[#8B7AFF]/10',
  meeting: 'text-[#FBBF24] bg-[#FBBF24]/10',
  note: 'text-[#8A8580] bg-[#8A8580]/10',
}

interface Props {
  communications: CommunicationItem[]
  loading?: boolean
}

export function CommunicationLog({ communications, loading }: Props) {
  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-16 bg-[#141311] rounded-lg animate-pulse" />
        ))}
      </div>
    )
  }

  if (communications.length === 0) {
    return (
      <p className="text-sm text-[#8A8580] py-6 text-center">
        No communications logged yet.
      </p>
    )
  }

  return (
    <div className="space-y-0">
      {communications.map((comm) => {
        const Icon = CHANNEL_ICONS[comm.channel] || Edit3
        const colors = CHANNEL_COLORS[comm.channel] || CHANNEL_COLORS.note
        return (
          <div
            key={comm.id}
            className="flex items-start gap-3 py-3 border-b border-[#1E1D1B] last:border-0"
          >
            <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5', colors)}>
              <Icon size={14} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm text-[#F0EDE8] font-medium capitalize">
                  {comm.channel}
                </span>
                {comm.direction && (
                  <span className="text-[10px] uppercase tracking-wider text-[#8A8580]">
                    {comm.direction}
                  </span>
                )}
              </div>
              {comm.subject && (
                <p className="text-sm text-[#C5C0B8] mt-0.5">{comm.subject}</p>
              )}
              {comm.body && (
                <p className="text-xs text-[#8A8580] mt-1 line-clamp-2">{comm.body}</p>
              )}
              <p className="text-[10px] text-[#8A8580]/60 mt-1">
                {formatTime(comm.occurred_at)}
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function formatTime(dateStr: string): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffDays === 0) return `Today at ${d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`
  if (diffDays === 1) return `Yesterday at ${d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`
  if (diffDays < 7) return `${diffDays}d ago`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
