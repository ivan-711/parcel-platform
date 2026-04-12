/** ConversationThread — iMessage-style SMS/email thread with compose area. */

import { useState, useRef, useEffect, KeyboardEvent } from 'react'
import { MessageSquare, Mail, Send, Loader2, type LucideIcon } from 'lucide-react'
import { useThread, useSendSMS, useSendEmail } from '@/hooks/useCommunications'
import type { ThreadMessage } from '@/types'
import { cn } from '@/lib/utils'
import { StatusBadge } from './StatusBadge'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const CHANNEL_ICON: Record<string, LucideIcon> = {
  sms:   MessageSquare,
  email: Mail,
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function formatTime(iso: string): string {
  const d = new Date(iso)
  const now = new Date()

  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()

  const hhmm = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

  if (sameDay(d, now)) return hhmm

  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  if (sameDay(d, yesterday)) return `Yesterday ${hhmm}`

  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86_400_000)
  if (diffDays < 7) return `${diffDays}d ago ${hhmm}`

  const mon = d.toLocaleString('default', { month: 'short' })
  return `${mon} ${d.getDate()} ${hhmm}`
}

// ---------------------------------------------------------------------------
// MessageBubble
// ---------------------------------------------------------------------------

function MessageBubble({ message }: { message: ThreadMessage }) {
  const isOutbound = message.direction === 'outbound'
  const ChannelIcon = CHANNEL_ICON[message.channel] ?? MessageSquare

  return (
    <div className={cn('flex w-full', isOutbound ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[75%] px-3 py-2 rounded-xl border space-y-1',
          isOutbound
            ? 'bg-violet-400/15 border-violet-400/30'
            : 'bg-app-recessed border-border-default'
        )}
      >
        {/* Subject (email only) */}
        {message.channel === 'email' && message.subject && (
          <p className="text-[10px] text-text-muted font-medium truncate">{message.subject}</p>
        )}

        {/* Body */}
        <p className="text-sm text-text-primary whitespace-pre-wrap break-words">
          {message.body ?? ''}
        </p>

        {/* Meta: timestamp + channel + status */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] text-text-muted">{formatTime(message.occurred_at)}</span>
          <ChannelIcon size={10} className="text-text-muted" />
          <StatusBadge status={message.status} errorMessage={message.error_message} />
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// ConversationThread
// ---------------------------------------------------------------------------

interface Props {
  contactId: string
  contactPhone: string | null
  contactEmail: string | null
}

export function ConversationThread({ contactId, contactPhone, contactEmail }: Props) {
  const { data } = useThread(contactId)
  const sendSMS = useSendSMS()
  const sendEmail = useSendEmail()

  // Default channel: SMS if phone available, else email
  const defaultChannel = contactPhone ? 'sms' : 'email'
  const [channel, setChannel] = useState<'sms' | 'email'>(defaultChannel)
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')

  const bottomRef = useRef<HTMLDivElement>(null)
  const messages = (data?.messages ?? []).filter(
    m => m.channel === 'sms' || m.channel === 'email'
  )

  // Auto-scroll on mount and when message count changes
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  const isSending = sendSMS.isPending || sendEmail.isPending
  const canSend = body.trim().length > 0 && !isSending && (channel === 'sms' ? !!contactPhone : !!contactEmail)

  // SMS character counter
  const smsLen = body.length
  const smsSegments = Math.ceil(smsLen / 160) || 1
  const smsWarn = smsLen > 160

  function handleSend() {
    if (!canSend) return

    if (channel === 'sms') {
      sendSMS.mutate(
        { contact_id: contactId, body },
        { onSuccess: () => setBody('') }
      )
    } else {
      sendEmail.mutate(
        {
          contact_id: contactId,
          subject: subject || '(no subject)',
          body_html: `<p>${escapeHtml(body).replace(/\n/g, '<br>')}</p>`,
          body_text: body,
        },
        {
          onSuccess: () => {
            setBody('')
            setSubject('')
          },
        }
      )
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (channel === 'sms') {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleSend()
      }
    } else {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault()
        handleSend()
      }
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Messages area */}
      <div className="flex flex-col gap-2 max-h-[400px] overflow-y-auto pr-1">
        {messages.length === 0 ? (
          <p className="text-sm text-text-muted text-center py-8">
            No messages yet. Send the first one below.
          </p>
        ) : (
          messages.map(msg => (
            <MessageBubble key={msg.id} message={msg} />
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Compose area */}
      <div className="bg-app-bg border border-border-default rounded-xl p-3 space-y-2.5">
        {/* Channel toggle */}
        <div className="flex items-center gap-1.5">
          {contactPhone && (
            <button
              onClick={() => setChannel('sms')}
              className={cn(
                'flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer',
                channel === 'sms'
                  ? 'bg-violet-400/15 text-violet-300 border border-violet-400/30'
                  : 'text-text-muted hover:text-text-secondary'
              )}
            >
              <MessageSquare size={12} />
              SMS
            </button>
          )}
          {contactEmail && (
            <button
              onClick={() => setChannel('email')}
              className={cn(
                'flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer',
                channel === 'email'
                  ? 'bg-violet-400/15 text-violet-300 border border-violet-400/30'
                  : 'text-text-muted hover:text-text-secondary'
              )}
            >
              <Mail size={12} />
              Email
            </button>
          )}
        </div>

        {/* Email subject */}
        {channel === 'email' && (
          <input
            type="text"
            value={subject}
            onChange={e => setSubject(e.target.value)}
            placeholder="Subject"
            className="w-full h-9 px-3 rounded-lg bg-app-recessed border border-border-default text-sm text-text-primary placeholder-text-muted/60 focus:outline-none focus:border-violet-400/40 focus:ring-2 focus:ring-violet-400/20 transition-all"
          />
        )}

        {/* Body + Send row */}
        <div className="flex items-end gap-2">
          <div className="flex-1 relative">
            <textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={channel === 'sms' ? 'Send a text…' : 'Write your email…'}
              rows={channel === 'email' ? 3 : 2}
              className="w-full px-3 py-2 rounded-lg bg-app-recessed border border-border-default text-sm text-text-primary placeholder-text-muted/60 focus:outline-none focus:border-violet-400/40 focus:ring-2 focus:ring-violet-400/20 transition-all resize-none"
            />
            {/* SMS character counter */}
            {channel === 'sms' && smsLen > 0 && (
              <span
                className={cn(
                  'absolute bottom-2 right-2 text-[10px] pointer-events-none',
                  smsWarn ? 'text-loss' : 'text-text-muted'
                )}
              >
                {smsLen}/160{smsWarn ? ` (${smsSegments} msg)` : ''}
              </span>
            )}
          </div>

          {/* Send button */}
          <button
            onClick={handleSend}
            disabled={!canSend}
            className="w-9 h-9 flex items-center justify-center rounded-lg bg-violet-400 text-white hover:bg-violet-500 transition-colors disabled:opacity-40 cursor-pointer flex-shrink-0"
            title={channel === 'sms' ? 'Send (Enter)' : 'Send (Ctrl+Enter)'}
            aria-label="Send message"
          >
            {isSending ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Send size={16} />
            )}
          </button>
        </div>

        {/* Keyboard hint */}
        <p className="text-[10px] text-text-muted/60">
          {channel === 'sms' ? 'Press Enter to send' : 'Press Ctrl+Enter to send'}
        </p>
      </div>
    </div>
  )
}
