/** AI floating button — opens the chat slide-over panel. */

import { useState } from 'react'
import { Sparkles } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { ChatSlideOver } from '@/components/chat/ChatSlideOver'

function trackEvent(event: string, props?: Record<string, unknown>) {
  try { (window as any).posthog?.capture?.(event, props) } catch { /* ignore */ }
}

export function AIFloatingButton() {
  const { pathname } = useLocation()
  const [chatOpen, setChatOpen] = useState(false)

  // Hide on the chat page — redundant
  if (pathname.startsWith('/chat')) return null

  return (
    <>
      <button
        onClick={() => {
          trackEvent('chat_opened', { source: 'floating_button' })
          setChatOpen(true)
        }}
        aria-label="AI Assistant"
        className="fixed z-40 bottom-[88px] right-4 md:bottom-8 md:right-8 w-12 h-12 rounded-full bg-[#8B7AFF] hover:bg-[#7B6AEF] shadow-lg shadow-[#8B7AFF]/20 flex items-center justify-center transition-colors cursor-pointer group"
      >
        {/* Pulse ring */}
        <span className="absolute inset-0 rounded-full bg-[#8B7AFF]/30 animate-ping opacity-20 group-hover:opacity-0" />
        <Sparkles size={20} className="text-white relative z-10" />
      </button>

      <ChatSlideOver open={chatOpen} onOpenChange={setChatOpen} />
    </>
  )
}
