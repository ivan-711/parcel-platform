/** API client — all backend calls go through this module. Never use fetch directly in components. */

import type {
  AuthResponse,
  User,
  DealCreateRequest,
  DealResponse,
  DealListItem,
  DealsFilters,
  DashboardStats,
  PipelineCreateRequest,
  PipelineCardResponse,
  ChatMessage,
  ChatRequest,
} from '@/types'

const API_URL = (import.meta.env.VITE_API_URL ?? 'https://parcel-platform-production.up.railway.app').replace('http://', 'https://')

// Exported separately so it can be used as an async generator (not compatible with the request() wrapper)
export async function* streamChat(body: ChatRequest): AsyncGenerator<string> {
  const token = localStorage.getItem('parcel_token')
  const res = await fetch(`${API_URL}/api/v1/chat/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    credentials: 'include',
    body: JSON.stringify(body),
  })
  if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`)

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const parsed = JSON.parse(line.slice(6)) as { delta?: string; done?: boolean }
      if (parsed.done) return
      if (parsed.delta) yield parsed.delta
    }
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = localStorage.getItem('parcel_token')

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options?.headers as Record<string, string>),
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const res = await fetch(`${API_URL}${path}`, {
    credentials: 'include',
    ...options,
    headers,
  })

  if (res.status === 401) {
    localStorage.removeItem('parcel_token')
    window.location.href = '/login'
    throw new Error('Session expired')
  }

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Unknown error' }))
    throw new Error((error as { error?: string }).error ?? `HTTP ${res.status}`)
  }

  return res.json() as Promise<T>
}

export const api = {
  health: {
    check: () => request<{ status: string }>('/health'),
  },
  auth: {
    login: (email: string, password: string) =>
      request<AuthResponse>('/api/v1/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }),
    register: (name: string, email: string, password: string, role: string) =>
      request<AuthResponse>('/api/v1/auth/register', {
        method: 'POST',
        body: JSON.stringify({ name, email, password, role }),
      }),
    logout: () =>
      request<{ message: string }>('/api/v1/auth/logout', { method: 'POST' }),
    me: () => request<User>('/api/v1/auth/me'),
  },
  dashboard: {
    stats: () => request<DashboardStats>('/api/v1/dashboard/stats/'),
  },
  deals: {
    create: (data: DealCreateRequest) =>
      request<DealResponse>('/api/v1/deals/', { method: 'POST', body: JSON.stringify(data) }),
    get: (id: string) =>
      request<DealResponse>(`/api/v1/deals/${id}`),
    update: (id: string, data: Record<string, unknown>) =>
      request<DealResponse>(`/api/v1/deals/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    list: (filters?: DealsFilters) => {
      const params = new URLSearchParams()
      if (filters?.strategy) params.set('strategy', filters.strategy)
      if (filters?.status) params.set('status', filters.status)
      if (filters?.page) params.set('page', String(filters.page))
      if (filters?.per_page) params.set('per_page', String(filters.per_page))
      if (filters?.sort) params.set('sort', filters.sort)
      const qs = params.toString()
      return request<DealListItem[]>(`/api/v1/deals/${qs ? '?' + qs : ''}`)
    },
  },
  pipeline: {
    list: () =>
      request<{ data: Record<string, PipelineCardResponse[]> }>('/api/v1/pipeline/'),
    add: (data: PipelineCreateRequest) =>
      request<PipelineCardResponse>('/api/v1/pipeline/', { method: 'POST', body: JSON.stringify(data) }),
    updateStage: (pipelineId: string, body: { stage: string; notes?: string }) =>
      request<{ id: string; deal_id: string; stage: string; notes: string | null; created_at: string }>(
        `/api/v1/pipeline/${pipelineId}/stage/`,
        { method: 'PUT', body: JSON.stringify(body) }
      ),
    remove: (pipelineId: string) =>
      request<{ message: string }>(`/api/v1/pipeline/${pipelineId}/`, { method: 'DELETE' }),
  },
  chat: {
    history: () => request<{ messages: ChatMessage[] }>('/api/v1/chat/history/'),
  },
}
