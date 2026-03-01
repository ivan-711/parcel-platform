/**
 * AI Chat page — streaming real estate specialist with context awareness,
 * history loading, react-markdown rendering, and AbortController stop button.
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import { Sparkles, Send, Square } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { api } from '@/lib/api'
import { streamChat } from '@/lib/chat-stream'
import { cn } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface UIMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  isStreaming: boolean
}

// ---------------------------------------------------------------------------
// Markdown component map — matches Parcel design system
// ---------------------------------------------------------------------------

const MD: React.ComponentProps<typeof ReactMarkdown>['components'] = {
  p: ({ children }) => (
    <p className="text-[14px] text-[#F1F5F9] leading-relaxed mb-3 last:mb-0">{children}</p>
  ),
  strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
  // @ts-expect-error react-markdown passes inline prop not in types
  code: ({ inline, children }) =>
    inline ? (
      <code className="font-mono text-[13px] bg-[#16162A] text-[#C4B5FD] px-1.5 py-0.5 rounded">
        {children}
      </code>
    ) : (
      <pre className="bg-[#16162A] rounded-lg p-3 overflow-x-auto my-2">
        <code className="font-mono text-[13px] text-[#C4B5FD]">{children}</code>
      </pre>
    ),
  ul: ({ children }) => <ul className="space-y-1 my-2 pl-1">{children}</ul>,
  ol: ({ children }) => <ol className="space-y-1 my-2 pl-1 list-decimal list-inside">{children}</ol>,
  li: ({ children }) => (
    <li className="text-[14px] text-[#F1F5F9] flex items-start gap-2">
      <span className="text-[#6366F1] mt-0.5 shrink-0">▸</span>
      <span>{children}</span>
    </li>
  ),
  table: ({ children }) => (
    <div className="overflow-x-auto my-3">
      <table className="w-full border border-[#1A1A2E] rounded-lg overflow-hidden">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-[#16162A]">{children}</thead>,
  th: ({ children }) => (
    <th className="px-3 py-2 text-[11px] uppercase tracking-wider text-[#94A3B8] text-left font-medium">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="px-3 py-2 font-mono text-[13px] text-[#F1F5F9] border-t border-[#1A1A2E]">
      {children}
    </td>
  ),
  h3: ({ children }) => (
    <h3 className="text-[15px] font-semibold text-white mt-4 mb-2">{children}</h3>
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
// ChatPage
// ---------------------------------------------------------------------------

export default function ChatPage() {
  const [searchParams] = useSearchParams()
  const contextParam = searchParams.get('context') as 'deal' | 'document' | null
  const contextId = searchParams.get('id')
  const contextType = contextParam ?? 'general'

  const [messages, setMessages] = useState<UIMessage[]>([])
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [sessionId] = useState(() => crypto.randomUUID())

  const abortRef = useRef<AbortController | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Load chat history
  const { data: history, isLoading: historyLoading } = useQuery({
    queryKey: ['chat-history', contextType, contextId],
    queryFn: () => api.chat.history(),
    staleTime: Infinity,
  })

  useEffect(() => {
    if (history && history.length > 0 && messages.length === 0) {
      setMessages(
        history.map((m) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          isStreaming: false,
        }))
      )
    }
  }, [history]) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-scroll on new content
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
      }
      const assistantId = crypto.randomUUID()
      const assistantMsg: UIMessage = {
        id: assistantId,
        role: 'assistant',
        content: '',
        isStreaming: true,
      }

      setMessages((prev) => [...prev, userMsg, assistantMsg])
      setInput('')
      setIsStreaming(true)
      if (textareaRef.current) textareaRef.current.style.height = '48px'

      const controller = new AbortController()
      abortRef.current = controller

      const historyPayload = messages.map((m) => ({ role: m.role, content: m.content }))

      try {
        const gen = streamChat(
          {
            message: text.trim(),
            context_type: contextType as 'general' | 'deal' | 'document',
            context_id: contextId,
            history: historyPayload,
            session_id: sessionId,
          },
          controller.signal
        )

        for await (const delta of gen) {
          setMessages((prev) =>
            prev.map((m) => (m.id === assistantId ? { ...m, content: m.content + delta } : m))
          )
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

  const showEmpty = !historyLoading && messages.length === 0

  return (
    <AppShell title="AI Chat" noPadding>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="shrink-0 px-6 py-4 border-b border-[#1A1A2E] bg-[#08080F]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#6366F1]/10 border border-[#6366F1]/20 flex items-center justify-center">
              <Sparkles size={15} className="text-[#6366F1]" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-[#F1F5F9]">AI Specialist</h2>
              <p className="text-[11px] text-[#475569]">Real estate investment advisor</p>
            </div>
          </div>
          {contextType !== 'general' && contextId && (
            <div className="mt-3 flex items-center gap-2 text-[12px] text-[#94A3B8]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#6366F1] shrink-0" />
              {contextType === 'deal'
                ? 'Deal context active — AI knows the details of this deal'
                : 'Document context active — AI has read this document'}
            </div>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
          {historyLoading ? (
            <div className="space-y-4">
              {/* Skeleton bubbles — alternating left/right */}
              <div className="flex justify-end">
                <div className="h-10 w-48 rounded-2xl rounded-tr-sm bg-[#0F0F1A] border border-[#1A1A2E] animate-pulse" />
              </div>
              <div className="flex gap-3">
                <div className="w-7 h-7 rounded-lg bg-[#0F0F1A] border border-[#1A1A2E] animate-pulse shrink-0" />
                <div className="h-16 w-64 rounded-2xl rounded-tl-sm bg-[#0F0F1A] border border-[#1A1A2E] animate-pulse" />
              </div>
              <div className="flex justify-end">
                <div className="h-10 w-40 rounded-2xl rounded-tr-sm bg-[#0F0F1A] border border-[#1A1A2E] animate-pulse" />
              </div>
            </div>
          ) : showEmpty ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col items-center justify-center h-full min-h-[400px] space-y-6"
            >
              <div className="flex flex-col items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-[#6366F1]/10 border border-[#6366F1]/20 flex items-center justify-center">
                  <Sparkles size={22} className="text-[#6366F1]" />
                </div>
                <div className="text-center space-y-1">
                  <h3 className="text-base font-semibold text-[#F1F5F9]">Real Estate AI Specialist</h3>
                  <p className="text-sm text-[#94A3B8]">
                    Ask anything about deals, strategies, or financing structures.
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 w-full max-w-[480px]">
                {SUGGESTED_QUESTIONS.map((q) => (
                  <button
                    key={q.question}
                    onClick={() => void handleSend(q.question)}
                    className="text-left p-3 rounded-xl border border-[#252540] bg-[#0F0F1A] hover:border-[#6366F1]/40 hover:bg-[#16162A] transition-colors cursor-pointer space-y-0.5"
                  >
                    <p className="text-[11px] uppercase tracking-wide text-[#475569] font-medium">
                      {q.category}
                    </p>
                    <p className="text-[13px] text-[#94A3B8] leading-snug">{q.question}</p>
                  </button>
                ))}
              </div>
            </motion.div>
          ) : (
            <AnimatePresence initial={false}>
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                  className={cn('flex gap-3', msg.role === 'user' ? 'justify-end' : 'justify-start')}
                >
                  {msg.role === 'assistant' && (
                    <div className="w-7 h-7 rounded-lg bg-[#6366F1]/10 border border-[#6366F1]/20 flex items-center justify-center shrink-0 mt-0.5">
                      <Sparkles size={13} className="text-[#6366F1]" />
                    </div>
                  )}
                  <div
                    className={cn(
                      'max-w-[75%] rounded-2xl px-4 py-3',
                      msg.role === 'user'
                        ? 'bg-[#6366F1] text-white rounded-tr-sm'
                        : 'bg-[#0F0F1A] border border-[#1A1A2E] rounded-tl-sm'
                    )}
                  >
                    {msg.role === 'user' ? (
                      <p className="text-[14px] leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                    ) : (
                      <>
                        <ReactMarkdown components={MD}>{msg.content}</ReactMarkdown>
                        {msg.isStreaming && (
                          <span className="inline-block w-0.5 h-4 bg-indigo-500 animate-pulse ml-0.5 align-middle" />
                        )}
                      </>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        <div className="shrink-0 px-6 py-4 border-t border-[#1A1A2E] bg-[#08080F]">
          <div className="flex gap-3 items-end">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Ask about deals, strategies, or financing..."
              disabled={isStreaming}
              rows={1}
              className={cn(
                'flex-1 resize-none rounded-xl border border-[#252540] bg-[#0F0F1A] px-4 py-3',
                'text-[14px] text-[#F1F5F9] placeholder:text-[#475569]',
                'focus:outline-none focus:border-[#6366F1]/50 transition-colors',
                'min-h-[48px] max-h-[140px] leading-relaxed',
                isStreaming && 'opacity-50'
              )}
              style={{ height: '48px', overflowY: 'auto' }}
            />
            {isStreaming ? (
              <button
                onClick={handleStop}
                className="w-11 h-11 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 hover:bg-red-500/20 transition-colors shrink-0 cursor-pointer"
                aria-label="Stop generating"
              >
                <Square size={14} fill="currentColor" />
              </button>
            ) : (
              <button
                onClick={() => void handleSend(input)}
                disabled={!input.trim()}
                className={cn(
                  'w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-colors',
                  input.trim()
                    ? 'bg-[#6366F1] hover:bg-[#6366F1]/90 text-white cursor-pointer'
                    : 'bg-[#0F0F1A] border border-[#252540] text-[#475569] cursor-not-allowed'
                )}
                aria-label="Send message"
              >
                <Send size={14} />
              </button>
            )}
          </div>
          <p className="text-[11px] text-[#475569] mt-2">
            Press Enter to send · Shift+Enter for new line
          </p>
        </div>
      </div>
    </AppShell>
  )
}
