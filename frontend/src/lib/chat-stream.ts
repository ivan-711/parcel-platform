/** SSE streaming utility for AI chat — uses fetch + ReadableStream (not EventSource). */

import type { ChatRequest, Citation } from '@/types'
import { useAuthStore } from '@/stores/authStore'
import { ensureAuthHeaders } from '@/lib/api'

const API_URL = (import.meta.env.VITE_API_URL ?? 'https://api.parceldesk.io').replace('http://', 'https://')

/** Result type that can be a text delta or a citations payload. */
export type StreamEvent =
  | { type: 'delta'; text: string }
  | { type: 'citations'; citations: Citation[] }

/**
 * Streams an AI chat response as an async generator yielding StreamEvents.
 * Text deltas arrive as { type: 'delta', text }, citations arrive at the end.
 */
export async function* streamChatWithCitations(
  params: ChatRequest,
  signal?: AbortSignal
): AsyncGenerator<StreamEvent> {
  let res: Response
  try {
    const authHeaders = await ensureAuthHeaders()
    res = await fetch(`${API_URL}/api/v1/chat/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders },
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

      const events = buffer.split('\n\n')
      buffer = events.pop() ?? ''

      for (const event of events) {
        for (const line of event.split('\n')) {
          if (!line.startsWith('data: ')) continue
          let json: { delta?: string; done?: boolean; citations?: Citation[]; error?: string }
          try {
            json = JSON.parse(line.slice(6))
          } catch {
            continue
          }
          if (json.error) throw new Error(json.error)
          if (json.done) {
            if (json.citations && json.citations.length > 0) {
              yield { type: 'citations', citations: json.citations }
            }
            return
          }
          if (json.delta) yield { type: 'delta', text: json.delta }
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

/**
 * Streams an AI chat response as an async generator yielding delta strings.
 * Legacy API — use streamChatWithCitations for citation support.
 */
export async function* streamChat(
  params: ChatRequest,
  signal?: AbortSignal
): AsyncGenerator<string> {
  let res: Response
  try {
    const authHeaders = await ensureAuthHeaders()
    res = await fetch(`${API_URL}/api/v1/chat/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders },
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
