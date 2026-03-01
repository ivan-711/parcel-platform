/**
 * AI Chat page — streaming real estate specialist backed by Claude.
 * Messages persist per session; history is loaded on mount.
 */
import { useState, useRef, useEffect, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { Send } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { SkeletonCard } from '@/components/ui/SkeletonCard'
import { api, streamChat } from '@/lib/api'
import type { ChatMessage } from '@/types'

// ---------------------------------------------------------------------------
// Markdown renderer — bold and inline code only (no external dep)
// ---------------------------------------------------------------------------

function parseInlineMarkdown(text: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = []
  // Match **bold** or `code` spans
  const regex = /(\*\*(.+?)\*\*|`([^`]+)`)/g
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index))
    }
    if (match[2] !== undefined) {
      nodes.push(<strong key={match.index}>{match[2]}</strong>)
    } else if (match[3] !== undefined) {
      nodes.push(
        <code
          key={match.index}
          className="font-mono text-[0.85em] bg-app-elevated px-1.5 py-0.5 rounded text-accent-primary"
        >
          {match[3]}
        </code>
      )
    }
    lastIndex = regex.lastIndex
  }
  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex))
  }
  return nodes
}

function renderMarkdown(content: string): React.ReactNode {
  const lines = content.split('\n')
  const result: React.ReactNode[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    // Table detection (line with | chars)
    if (line.includes('|') && line.trim().startsWith('|')) {
      const tableLines: string[] = []
      while (i < lines.length && lines[i].includes('|')) {
        tableLines.push(lines[i])
        i++
      }
      // Filter out separator rows (---|---)
      const dataRows = tableLines.filter(l => !/^[\s|:-]+$/.test(l))
      if (dataRows.length > 1) {
        const header = dataRows[0].split('|').map(c => c.trim()).filter(Boolean)
        const rows = dataRows.slice(1)
        result.push(
          <div key={`table-${i}`} className="overflow-x-auto my-3">
            <table className="text-sm border-collapse w-full">
              <thead>
                <tr>
                  {header.map((h, hi) => (
                    <th key={hi} className="text-left px-3 py-1.5 border border-border-subtle text-text-muted text-xs uppercase tracking-wide">
                      {parseInlineMarkdown(h)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, ri) => (
                  <tr key={ri}>
                    {row.split('|').map(c => c.trim()).filter(Boolean).map((cell, ci) => (
                      <td key={ci} className="px-3 py-1.5 border border-border-subtle text-text-secondary">
                        {parseInlineMarkdown(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      }
      continue
    }

    // Bullet list
    if (/^[-*] /.test(line.trim())) {
      const listItems: string[] = []
      while (i < lines.length && /^[-*] /.test(lines[i].trim())) {
        listItems.push(lines[i].trim().replace(/^[-*] /, ''))
        i++
      }
      result.push(
        <ul key={`ul-${i}`} className="list-disc list-inside my-2 space-y-1">
          {listItems.map((item, li) => (
            <li key={li} className="text-text-secondary text-sm">
              {parseInlineMarkdown(item)}
            </li>
          ))}
        </ul>
      )
      continue
    }

    // Empty line — spacing
    if (line.trim() === '') {
      result.push(<div key={`gap-${i}`} className="h-2" />)
      i++
      continue
    }

    // Paragraph
    result.push(
      <p key={`p-${i}`} className="text-sm text-text-secondary leading-relaxed">
        {parseInlineMarkdown(line)}
      </p>
    )
    i++
  }

  return <>{result}</>
}

// ---------------------------------------------------------------------------
// Suggested questions shown in empty state
// ---------------------------------------------------------------------------

const SUGGESTED_QUESTIONS = [
  'What is a good cap rate for buy-and-hold in the Midwest?',
  'Walk me through how to calculate MAO for a wholesale deal.',
  'What is the 70% rule and when does it apply to flips?',
  'How does a BRRRR deal work step by step?',
]

// ---------------------------------------------------------------------------
// Message bubble
// ---------------------------------------------------------------------------

interface MessageBubbleProps {
  message: ChatMessage
  isStreaming?: boolean
}

function MessageBubble({ message, isStreaming }: MessageBubbleProps) {
  const isUser = message.role === 'user'

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
    >
      <div
        className={`max-w-[78%] rounded-xl px-4 py-3 ${
          isUser
            ? 'bg-accent-primary text-white'
            : 'bg-app-surface border border-border-subtle'
        }`}
      >
        {isUser ? (
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
        ) : (
          <div>
            {renderMarkdown(message.content)}
            {isStreaming && (
              <span className="inline-block w-[2px] h-4 bg-text-muted ml-0.5 align-middle animate-blink" />
            )}
          </div>
        )}
      </div>
    </motion.div>
  )
}

// ---------------------------------------------------------------------------
// Main Chat page
// ---------------------------------------------------------------------------

export default function Chat() {
  const [sessionId] = useState<string>(() => crypto.randomUUID())
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Load history on mount
  const { data: historyData, isLoading: historyLoading } = useQuery({
    queryKey: ['chat-history'],
    queryFn: () => api.chat.history(),
    staleTime: Infinity,
  })

  useEffect(() => {
    if (historyData?.messages && messages.length === 0) {
      setMessages(historyData.messages)
    }
  }, [historyData]) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-scroll on new message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isStreaming) return

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text.trim(),
      context_type: null,
      created_at: new Date().toISOString(),
    }

    const assistantMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: '',
      context_type: null,
      created_at: new Date().toISOString(),
    }

    setMessages(prev => [...prev, userMsg, assistantMsg])
    setInput('')
    setIsStreaming(true)

    try {
      const history = messages.map(m => ({ role: m.role, content: m.content }))
      const stream = streamChat({
        message: text.trim(),
        context_type: 'general',
        context_id: null,
        history,
        session_id: sessionId,
      })

      for await (const chunk of stream) {
        setMessages(prev => {
          const updated = [...prev]
          const last = updated[updated.length - 1]
          updated[updated.length - 1] = { ...last, content: last.content + chunk }
          return updated
        })
      }
    } catch {
      setMessages(prev => {
        const updated = [...prev]
        updated[updated.length - 1] = {
          ...updated[updated.length - 1],
          content: 'Something went wrong. Please try again.',
        }
        return updated
      })
    } finally {
      setIsStreaming(false)
    }
  }, [isStreaming, messages, sessionId])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void sendMessage(input)
    }
  }

  const isEmpty = !historyLoading && messages.length === 0

  return (
    <AppShell title="AI Chat">
      <div className="flex flex-col h-[calc(100vh-52px-48px)] -m-6">

        {/* Message list */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
          {historyLoading ? (
            <div className="space-y-4">
              <SkeletonCard lines={2} className="max-w-[60%]" />
              <SkeletonCard lines={3} className="max-w-[78%] ml-auto" />
              <SkeletonCard lines={4} className="max-w-[70%]" />
            </div>
          ) : isEmpty ? (
            <EmptyState onSelect={(q) => void sendMessage(q)} />
          ) : (
            <AnimatePresence initial={false}>
              {messages.map((msg, idx) => (
                <MessageBubble
                  key={msg.id}
                  message={msg}
                  isStreaming={isStreaming && idx === messages.length - 1 && msg.role === 'assistant'}
                />
              ))}
            </AnimatePresence>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input bar */}
        <div className="shrink-0 border-t border-border-subtle bg-app-bg px-6 py-4">
          <div className="flex gap-3 items-end max-w-4xl mx-auto">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isStreaming}
              placeholder="Ask me anything about real estate investing…"
              rows={1}
              className="flex-1 resize-none bg-app-surface border border-border-subtle rounded-xl px-4 py-3 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-primary transition-colors disabled:opacity-50 leading-relaxed"
              style={{ maxHeight: '140px', overflowY: 'auto' }}
              onInput={e => {
                const el = e.currentTarget
                el.style.height = 'auto'
                el.style.height = `${Math.min(el.scrollHeight, 140)}px`
              }}
            />
            <button
              onClick={() => void sendMessage(input)}
              disabled={isStreaming || !input.trim()}
              className="shrink-0 w-10 h-10 rounded-xl bg-accent-primary flex items-center justify-center text-white hover:bg-accent-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              aria-label="Send message"
            >
              {isStreaming ? (
                <span className="text-[10px] font-mono font-bold">···</span>
              ) : (
                <Send size={16} />
              )}
            </button>
          </div>
          <p className="text-center text-[11px] text-text-muted mt-2">
            Enter to send · Shift+Enter for new line
          </p>
        </div>
      </div>
    </AppShell>
  )
}

// ---------------------------------------------------------------------------
// Empty state with suggested questions
// ---------------------------------------------------------------------------

function EmptyState({ onSelect }: { onSelect: (q: string) => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col items-center justify-center h-full text-center px-6"
    >
      <div className="w-12 h-12 rounded-2xl bg-accent-primary/10 border border-accent-primary/20 flex items-center justify-center mb-4">
        <span className="text-accent-primary font-mono text-lg font-bold">AI</span>
      </div>
      <h2 className="text-text-primary font-semibold text-lg mb-1">
        Real Estate Specialist
      </h2>
      <p className="text-text-muted text-sm mb-8 max-w-sm">
        Ask me anything about real estate investing — deal analysis, strategies, underwriting, and more.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-2xl">
        {SUGGESTED_QUESTIONS.map((q) => (
          <button
            key={q}
            onClick={() => onSelect(q)}
            className="text-left px-4 py-3 rounded-xl border border-border-subtle bg-app-surface hover:border-accent-primary/40 hover:bg-app-elevated transition-colors cursor-pointer"
          >
            <span className="text-sm text-text-secondary leading-snug">{q}</span>
          </button>
        ))}
      </div>
    </motion.div>
  )
}
