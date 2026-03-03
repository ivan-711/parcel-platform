/** SSE streaming utility for AI chat — uses fetch + ReadableStream (not EventSource). */

import type { ChatRequest } from '@/types'
import { useAuthStore } from '@/stores/authStore'

const API_URL = (import.meta.env.VITE_API_URL ?? 'https://api.parceldesk.io').replace('http://', 'https://')

/**
 * Streams an AI chat response as an async generator yielding delta strings.
 * Uses a rolling buffer to handle SSE chunk boundaries.
 * Accepts an optional AbortSignal to cancel mid-stream.
 */
export async function* streamChat(
  params: ChatRequest,
  signal?: AbortSignal
): AsyncGenerator<string> {
  let res: Response
  try {
    res = await fetch(`${API_URL}/api/v1/chat/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(params),
      signal,
    })
  } catch (err) {
    if ((err as Error).name === 'AbortError') return
    throw err
  }

  if (res.status === 401) {
    useAuthStore.getState().clearAuth()
    throw new Error('Session expired')
  }

  if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`)

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })

      // SSE events are separated by double newlines
      const events = buffer.split('\n\n')
      buffer = events.pop() ?? ''

      for (const event of events) {
        for (const line of event.split('\n')) {
          if (!line.startsWith('data: ')) continue
          let json: { delta?: string; done?: boolean; error?: string }
          try {
            json = JSON.parse(line.slice(6)) as { delta?: string; done?: boolean; error?: string }
          } catch {
            continue
          }
          if (json.error) throw new Error(json.error)
          if (json.done) return
          if (json.delta) yield json.delta
        }
      }
    }
  } catch (err) {
    if ((err as Error).name === 'AbortError') return
    throw err
  } finally {
    reader.releaseLock()
  }
}
