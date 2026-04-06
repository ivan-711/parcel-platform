/**
 * AI Chat page — full-page wrapper around ChatPanel with context awareness.
 */

import { useSearchParams } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { FeatureGate } from '@/components/billing/FeatureGate'
import { ChatPanel } from '@/components/chat/ChatPanel'

export default function ChatPage() {
  const [searchParams] = useSearchParams()
  const contextParam = searchParams.get('context') as 'deal' | 'document' | null
  const contextId = searchParams.get('id')
  const contextType = contextParam ?? 'general'

  return (
    <AppShell title="AI Chat" noPadding>
      <FeatureGate feature="ai_chat">
        <ChatPanel
          fullPage
          defaultContextType={contextType}
          defaultContextId={contextId}
        />
      </FeatureGate>
    </AppShell>
  )
}
