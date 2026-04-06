/**
 * ChatPanel — reusable chat UI with streaming, citations, and markdown rendering.
 * Used by both ChatPage (full page) and ChatSlideOver (floating panel).
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import { Sparkles, Send, Square, Copy, RotateCcw } from 'lucide-react'
import { api } from '@/lib/api'
import { streamChatWithCitations } from '@/lib/chat-stream'
import { cn } from '@/lib/utils'
import { CitationList } from './CitationBadge'
import type { Citation } from '@/types'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface UIMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  isStreaming: boolean
  citations: Citation[] | null
}

interface ChatPanelProps {
  fullPage?: boolean
  defaultContextType?: 'general' | 'deal' | 'document'
  defaultContextId?: string | null
}

// ---------------------------------------------------------------------------
// Markdown components — semantic tokens, both themes
// ---------------------------------------------------------------------------

const MD_COMPONENTS: React.ComponentProps<typeof ReactMarkdown>['components'] = {
  p: ({ children }) => (
    <p className="text-sm text-text-primary/90 leading-relaxed mb-3 last:mb-0">{children}</p>
  ),
  strong: ({ children }) => (
    <strong className="font-semibold text-text-primary">{children}</strong>
  ),
  // @ts-expect-error react-markdown passes inline prop not in types
  code: ({ inline, children }) =>
    inline ? (
      <code className="font-mono text-[13px] bg-[#8B7AFF]/10 text-[#8B7AFF] px-1.5 py-0.5 rounded">
        {children}
      </code>
    ) : (
      <pre className="bg-app-bg rounded-lg p-4 overflow-x-auto my-3 border border-border-default">
        <code className="font-mono text-[13px] text-text-primary/90 leading-relaxed">
          {children}
        </code>
      </pre>
    ),
  ul: ({ children }) => <ul className="space-y-1.5 my-2 pl-1">{children}</ul>,
  ol: ({ children }) => <ol className="space-y-1.5 my-2 pl-1 list-decimal list-inside">{children}</ol>,
  li: ({ children }) => (
    <li className="text-sm text-text-primary/90 flex items-start gap-2">
      <span className="text-[#8B7AFF] mt-0.5 shrink-0">&#9656;</span>
      <span className="leading-relaxed">{children}</span>
    </li>
  ),
  table: ({ children }) => (
    <div className="overflow-x-auto my-3 rounded-lg border border-border-default">
      <table className="w-full">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-layer-2">{children}</thead>,
  th: ({ children }) => (
    <th className="px-3 py-2 text-[11px] uppercase tracking-wide text-text-secondary text-left font-medium border-b border-border-default">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="px-3 py-2 font-mono text-[13px] text-text-secondary border-t border-border-subtle">
      {children}
    </td>
  ),
  h3: ({ children }) => (
    <h3 className="text-[15px] font-semibold text-text-primary mt-4 mb-2">{children}</h3>
  ),
  a: ({ children, href }) => (
    <a href={href} className="text-[#8B7AFF] hover:text-[#6C5CE7] underline underline-offset-2 transition-colors" target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  ),
}

// ---------------------------------------------------------------------------
// Suggested questions
// ---------------------------------------------------------------------------

const SUGGESTED_QUESTIONS = [
  { category: 'Wholesale', question: 'How do I calculate MAO for a wholesale deal?' },
  { category: 'Creative Finance', question: 'Explain subject-to financing with a real example.' },
  { category: 'BRRRR', question: 'What makes a good BRRRR deal vs a bad one?' },
  { category: 'Buy & Hold', question: 'What cap rate should I target in the Midwest?' },
  { category: 'Risk', question: "What's a healthy DSCR for a rental property?" },
  { category: 'Flip', question: 'How should I estimate holding costs on a 6-month flip?' },
]

// ---------------------------------------------------------------------------
// MessageRow — renders a single message (extracted to reduce duplication)
// ---------------------------------------------------------------------------

function MessageRow({
  msg,
  copiedId,
  onCopy,
  onRegenerate,
}: {
  msg: UIMessage
  copiedId: string | null
  onCopy: (id: string, content: string) => void
  onRegenerate: (id: string) => void
}) {
  return (
    <div className="max-w-3xl mx-auto flex gap-4">
      {msg.role === 'assistant' && (
        <div className="w-8 h-8 rounded-lg bg-[#8B7AFF]/10 border border-[#8B7AFF]/15 flex items-center justify-center shrink-0 mt-0.5">
          <Sparkles size={14} className="text-[#8B7AFF]" />
        </div>
      )}

      {msg.role === 'user' ? (
        <div className="flex-1 min-w-0 flex justify-end">
          <div className="max-w-[85%]">
            <p className="text-sm text-text-primary leading-relaxed whitespace-pre-wrap">
              {msg.content}
            </p>
          </div>
        </div>
      ) : (
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-text-secondary mb-1.5">Parcel AI</p>
          <ReactMarkdown components={MD_COMPONENTS}>{msg.content}</ReactMarkdown>

          {/* Typing dots */}
          {msg.isStreaming && !msg.content && (
            <span className="inline-flex items-center gap-1.5 py-1" role="status" aria-label="AI is thinking">
              <span className="w-1.5 h-1.5 rounded-full bg-[#8B7AFF]/60 animate-[typing_1.4s_ease-in-out_infinite]" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#8B7AFF]/60 animate-[typing_1.4s_ease-in-out_0.2s_infinite]" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#8B7AFF]/60 animate-[typing_1.4s_ease-in-out_0.4s_infinite]" />
            </span>
          )}

          {/* Streaming cursor */}
          {msg.isStreaming && msg.content && (
            <span className="inline-block w-[2px] h-[18px] bg-[#8B7AFF] animate-pulse ml-0.5 align-text-bottom rounded-full" aria-hidden="true" />
          )}

          {/* Complete: actions + citations */}
          {!msg.isStreaming && msg.content && (
            <>
              {msg.citations && msg.citations.length > 0 && (
                <CitationList citations={msg.citations} />
              )}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.3 }}
                className="flex items-center gap-3 mt-3 pt-2 border-t border-border-subtle"
              >
                <button
                  onClick={() => onCopy(msg.id, msg.content)}
                  className="flex items-center gap-1.5 text-xs text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
                >
                  <Copy size={12} />
                  {copiedId === msg.id ? 'Copied!' : 'Copy'}
                </button>
                <button
                  onClick={() => onRegenerate(msg.id)}
                  className="flex items-center gap-1.5 text-xs text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
                >
                  <RotateCcw size={12} />
                  Regenerate
                </button>
              </motion.div>
            </>
          )}
        </div>
      )}

      {msg.role === 'user' && (
        <div className="w-8 h-8 rounded-full bg-[#8B7AFF] flex items-center justify-center shrink-0 mt-0.5">
          <span className="text-xs font-semibold text-white">U</span>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// ChatPanel
// ---------------------------------------------------------------------------

export function ChatPanel({
  fullPage = false,
  defaultContextType = 'general',
  defaultContextId = null,
}: ChatPanelProps) {
  const contextType = defaultContextType
  const contextId = defaultContextId

  const [messages, setMessages] = useState<UIMessage[]>([])
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [sessionId] = useState(() => crypto.randomUUID())
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const abortRef = useRef<AbortController | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Load chat history
  const { data: historyData, isLoading: historyLoading } = useQuery({
    queryKey: ['chat-history', contextType, contextId],
    queryFn: () => api.chat.history(),
    staleTime: Infinity,
  })

  useEffect(() => {
    const historyMessages = historyData?.messages ?? []
    if (historyMessages.length > 0 && messages.length === 0) {
      setMessages(
        historyMessages.map((m) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          isStreaming: false,
          citations: m.citations ?? null,
        }))
      )
    }
  }, [historyData]) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = useCallback(
    async (text: string) => {
      if (!text.trim() || isStreaming) return

      const userMsg: UIMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        content: text.trim(),
        isStreaming: false,
        citations: null,
      }
      const assistantId = crypto.randomUUID()
      const assistantMsg: UIMessage = {
        id: assistantId,
        role: 'assistant',
        content: '',
        isStreaming: true,
        citations: null,
      }

      setMessages((prev) => [...prev, userMsg, assistantMsg])
      setInput('')
      setIsStreaming(true)
      if (textareaRef.current) textareaRef.current.style.height = '48px'

      const controller = new AbortController()
      abortRef.current = controller

      const historyPayload = messages.map((m) => ({ role: m.role, content: m.content }))

      try {
        const gen = streamChatWithCitations(
          {
            message: text.trim(),
            context_type: contextType,
            context_id: contextId,
            history: historyPayload,
            session_id: sessionId,
          },
          controller.signal
        )

        for await (const event of gen) {
          if (event.type === 'delta') {
            setMessages((prev) =>
              prev.map((m) => (m.id === assistantId ? { ...m, content: m.content + event.text } : m))
            )
          } else if (event.type === 'citations') {
            setMessages((prev) =>
              prev.map((m) => (m.id === assistantId ? { ...m, citations: event.citations } : m))
            )
          }
        }
      } catch (err) {
        if ((err as Error).name === 'AbortError') return
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, content: 'Sorry, something went wrong. Please try again.' }
              : m
          )
        )
      } finally {
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantId ? { ...m, isStreaming: false } : m))
        )
        setIsStreaming(false)
        abortRef.current = null
      }
    },
    [messages, isStreaming, contextType, contextId, sessionId]
  )

  const handleStop = () => abortRef.current?.abort()

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void handleSend(input)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
    const ta = e.target
    ta.style.height = '48px'
    ta.style.height = Math.min(ta.scrollHeight, 140) + 'px'
  }

  const handleCopy = (msgId: string, content: string) => {
    void navigator.clipboard.writeText(content)
    setCopiedId(msgId)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const handleRegenerate = (msgId: string) => {
    const idx = messages.findIndex((m) => m.id === msgId)
    if (idx < 1) return
    const userMsg = messages[idx - 1]
    if (userMsg.role !== 'user') return
    setMessages((prev) => prev.filter((m) => m.id !== msgId))
    void handleSend(userMsg.content)
  }

  const showEmpty = !historyLoading && messages.length === 0

  return (
    <div className={cn('flex flex-col bg-app-bg', fullPage ? 'h-[calc(100dvh-4rem)] md:h-full' : 'h-full')}>
      {/* Header */}
      <div className="shrink-0 px-6 py-4 border-b border-border-default bg-app-bg">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#8B7AFF]/10 border border-[#8B7AFF]/15 flex items-center justify-center">
            <Sparkles size={15} className="text-[#8B7AFF]" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-text-primary">AI Specialist</h2>
            <p className="text-[11px] text-text-secondary">Real estate investment advisor</p>
          </div>
        </div>
        {contextType !== 'general' && contextId && (
          <div className="max-w-3xl mx-auto mt-3 flex items-center gap-2 text-[12px] text-text-secondary">
            <span className="w-1.5 h-1.5 rounded-full bg-[#8B7AFF] shrink-0 animate-pulse" />
            {contextType === 'deal'
              ? 'Deal context active — AI knows the details of this deal'
              : 'Document context active — AI has read this document'}
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto overscroll-contain" role="log" aria-live="polite">
        {historyLoading ? (
          <div className="space-y-0">
            <div className="w-full py-5 px-6 bg-app-bg border-b border-border-subtle">
              <div className="max-w-3xl mx-auto flex justify-end">
                <div className="h-5 w-48 rounded bg-layer-3 animate-pulse" />
              </div>
            </div>
            <div className="w-full py-5 px-6 bg-app-recessed border-b border-border-subtle">
              <div className="max-w-3xl mx-auto flex gap-4">
                <div className="w-8 h-8 rounded-lg bg-layer-3 animate-pulse shrink-0" />
                <div className="space-y-2 flex-1">
                  <div className="h-4 w-24 rounded bg-layer-3 animate-pulse" />
                  <div className="h-4 w-64 rounded bg-layer-3 animate-pulse" />
                  <div className="h-4 w-40 rounded bg-layer-3 animate-pulse" />
                </div>
              </div>
            </div>
          </div>
        ) : showEmpty ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col items-center justify-center h-full min-h-[400px] space-y-8 px-6"
          >
            <div className="flex flex-col items-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-[#8B7AFF]/10 border border-[#8B7AFF]/15 flex items-center justify-center">
                <Sparkles size={24} className="text-[#8B7AFF]" />
              </div>
              <div className="text-center space-y-1">
                <h3 className="text-lg font-semibold text-text-primary">Parcel AI</h3>
                <p className="text-sm text-text-secondary max-w-sm">
                  Ask about deal analysis, financing structures, market comps,
                  or any real estate investment question.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full max-w-lg">
              {SUGGESTED_QUESTIONS.map((q, index) => (
                <motion.button
                  key={q.question}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: index * 0.05 }}
                  onClick={() => void handleSend(q.question)}
                  className="text-left p-3.5 rounded-xl border border-border-default bg-app-surface hover:border-[#8B7AFF]/30 hover:bg-[#8B7AFF]/[0.04] transition-all group cursor-pointer"
                  aria-label={q.question}
                >
                  <p className="text-[11px] uppercase tracking-wide text-text-secondary font-medium group-hover:text-[#8B7AFF] transition-colors">
                    {q.category}
                  </p>
                  <p className="text-[13px] text-text-secondary leading-snug mt-1">{q.question}</p>
                </motion.button>
              ))}
            </div>
          </motion.div>
        ) : (
          <div>
            {/* Older messages */}
            {messages.slice(0, -3).map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  'w-full py-5 px-6 border-b border-border-subtle',
                  msg.role === 'user' ? 'bg-app-bg' : 'bg-app-recessed'
                )}
              >
                <MessageRow msg={msg} copiedId={copiedId} onCopy={handleCopy} onRegenerate={handleRegenerate} />
              </div>
            ))}
            {/* Recent messages animate */}
            <AnimatePresence initial={false}>
              {messages.slice(-3).map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
                  className={cn(
                    'w-full py-5 px-6 border-b border-border-subtle',
                    msg.role === 'user' ? 'bg-app-bg' : 'bg-app-recessed'
                  )}
                >
                  <MessageRow msg={msg} copiedId={copiedId} onCopy={handleCopy} onRegenerate={handleRegenerate} />
                </motion.div>
              ))}
            </AnimatePresence>
            <div ref={messagesEndRef} />
          </div>
        )}
        {(historyLoading || showEmpty) && <div ref={messagesEndRef} />}
      </div>

      {/* Input area */}
      <div className="shrink-0 px-6 py-4 border-t border-border-default bg-[#0C0B0A]/95 backdrop-blur-md pb-[calc(1rem+env(safe-area-inset-bottom,0px))]">
        <div className="max-w-3xl mx-auto">
          <div className="flex gap-3 items-end">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Ask about deals, strategies, or financing..."
              aria-label="Type your message"
              disabled={isStreaming}
              rows={1}
              className={cn(
                'flex-1 resize-none rounded-xl border border-border-default bg-app-recessed',
                'px-4 py-3 text-sm text-text-primary placeholder:text-text-disabled',
                'focus:outline-none focus:ring-2 focus:ring-[#8B7AFF]/20',
                'focus:border-[#8B7AFF]/40 transition-all',
                'min-h-[48px] max-h-[140px] leading-relaxed',
                isStreaming && 'opacity-50'
              )}
              style={{ height: '48px', overflowY: 'auto' }}
            />
            {isStreaming ? (
              <button
                onClick={handleStop}
                className="w-10 h-10 rounded-xl bg-[#D4766A]/10 border border-[#D4766A]/20 flex items-center justify-center text-[#D4766A] hover:bg-[#D4766A]/20 transition-colors shrink-0 cursor-pointer"
                aria-label="Stop generating"
              >
                <Square size={14} fill="currentColor" />
              </button>
            ) : (
              <button
                onClick={() => void handleSend(input)}
                disabled={!input.trim()}
                className={cn(
                  'w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors',
                  input.trim()
                    ? 'bg-[#8B7AFF] hover:bg-[#6C5CE7] text-white shadow-[0_0_20px_rgba(139,122,255,0.3)] cursor-pointer'
                    : 'bg-layer-2 border border-border-default text-text-disabled cursor-not-allowed'
                )}
                aria-label="Send message"
              >
                <Send size={14} />
              </button>
            )}
          </div>
          <div className="flex justify-between items-center mt-2">
            <p className="text-[11px] text-text-secondary">
              Enter to send &middot; Shift+Enter for new line
            </p>
          </div>
          <p className="text-[11px] text-text-secondary mt-1 italic">
            AI responses are for informational purposes only and may contain errors. Not financial advice.
          </p>
        </div>
      </div>
    </div>
  )
}
