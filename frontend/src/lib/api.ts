/** API client — all backend calls go through this module. Never use fetch directly in components. */

import { useAuthStore } from '@/stores/authStore'
import { useBillingStore } from '@/stores/billingStore'
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
  SharedDealResponse,
  ShareDealActionResponse,
  PortfolioSummaryResponse,
  PortfolioEntry,
  AddPortfolioEntryRequest,
  UpdateProfileRequest,
  UserProfileResponse,
  DocumentResponse,
  PaginatedDocuments,
  ActivityResponse,
  OfferLetterResponse,
  NotificationPreferences,
  BillingStatus,
  CheckoutRequest,
  CheckoutResponse,
  PortalResponse,
  CancelRequest,
  CancelResponse,
} from '@/types'

const API_URL = (import.meta.env.VITE_API_URL ?? 'https://api.parceldesk.io').replace('http://', 'https://')

/** Track whether a refresh is in progress to avoid concurrent refresh attempts. */
let refreshPromise: Promise<boolean> | null = null

/** Attempt to refresh the access token using the refresh cookie. Returns true on success. */
async function attemptRefresh(): Promise<boolean> {
  try {
    const res = await fetch(`${API_URL}/api/v1/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    })
    if (!res.ok) return false
    const data = await res.json() as { user: User }
    useAuthStore.getState().setAuth(data.user)
    return true
  } catch {
    return false
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    ...(options?.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
    ...(options?.headers as Record<string, string>),
  }

  let res: Response
  try {
    res = await fetch(`${API_URL}${path}`, {
      credentials: 'include',
      ...options,
      headers,
    })
  } catch {
    throw new Error('Network error — please check your connection and try again.')
  }

  if (res.status === 401) {
    // Don't attempt refresh for the refresh endpoint itself
    if (path === '/api/v1/auth/refresh') {
      useAuthStore.getState().clearAuth()
      throw new Error('Session expired')
    }

    // Deduplicate concurrent refresh attempts
    if (!refreshPromise) {
      refreshPromise = attemptRefresh().finally(() => { refreshPromise = null })
    }
    const refreshed = await refreshPromise

    if (refreshed) {
      // Retry the original request with the new access token
      const retryRes = await fetch(`${API_URL}${path}`, {
        credentials: 'include',
        ...options,
        headers,
      })
      if (retryRes.ok) {
        if (retryRes.status === 204) return {} as T
        return retryRes.json() as Promise<T>
      }
      if (retryRes.status === 401) {
        useAuthStore.getState().clearAuth()
        throw new Error('Session expired')
      }
      const retryError = await retryRes.json().catch(() => ({ error: 'Unknown error' }))
      throw new Error((retryError as { error?: string }).error ?? `HTTP ${retryRes.status}`)
    }

    useAuthStore.getState().clearAuth()
    throw new Error('Session expired')
  }

  if (res.status === 402) {
    const error = await res.json().catch(() => ({ error: 'Upgrade required' }))
    const parsed = error as { error?: string; code?: string; feature?: string; upgrade_url?: string }
    useBillingStore.getState().setPaywallError({
      feature: parsed.feature,
      code: parsed.code,
      upgrade_url: parsed.upgrade_url,
    })
    throw new Error(parsed.error ?? 'Upgrade required')
  }

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Unknown error' }))
    throw new Error((error as { error?: string }).error ?? `HTTP ${res.status}`)
  }

  if (res.status === 204) {
    return {} as T
  }

  return res.json() as Promise<T>
}

/** Public request — no auth header, no 401 redirect. Used for unauthenticated endpoints. */
async function requestPublic<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    credentials: 'include',
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers as Record<string, string>),
    },
  })

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
      requestPublic<AuthResponse>('/api/v1/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }),
    register: (name: string, email: string, password: string, role: string) =>
      requestPublic<AuthResponse>('/api/v1/auth/register', {
        method: 'POST',
        body: JSON.stringify({ name, email, password, role }),
      }),
    logout: () =>
      request<{ message: string }>('/api/v1/auth/logout', { method: 'POST' }),
    refresh: () =>
      request<AuthResponse>('/api/v1/auth/refresh', { method: 'POST' }),
    forgotPassword: (email: string) =>
      requestPublic<{ message: string }>('/api/v1/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      }),
    resetPassword: (token: string, password: string) =>
      requestPublic<{ message: string }>('/api/v1/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token, password }),
      }),
    me: () => request<User>('/api/v1/auth/me'),
    updateMe: (data: UpdateProfileRequest) =>
      request<UserProfileResponse>('/api/v1/auth/me/', {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
  },
  dashboard: {
    stats: () => request<DashboardStats>('/api/v1/dashboard/stats/'),
  },
  activity: {
    list: () => request<ActivityResponse>('/api/v1/dashboard/activity/'),
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
      if (filters?.q) params.set('q', filters.q)
      if (filters?.page) params.set('page', String(filters.page))
      if (filters?.per_page) params.set('per_page', String(filters.per_page))
      if (filters?.sort) params.set('sort', filters.sort)
      const qs = params.toString()
      return request<DealListItem[]>(`/api/v1/deals/${qs ? '?' + qs : ''}`)
    },
    getShared: (id: string) =>
      requestPublic<SharedDealResponse>(`/api/v1/deals/${id}/share/`),
    share: (id: string) =>
      request<ShareDealActionResponse>(`/api/v1/deals/${id}/share/`, { method: 'PUT' }),
    delete: (id: string) =>
      request<{ message: string }>(`/api/v1/deals/${id}`, { method: 'DELETE' }),
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
  portfolio: {
    summary: () =>
      request<PortfolioSummaryResponse>('/api/v1/portfolio/'),
    addEntry: (data: AddPortfolioEntryRequest) =>
      request<PortfolioEntry>('/api/v1/portfolio/', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: string, data: { closed_date: string; closed_price: number; profit: number; monthly_cash_flow: number; notes?: string }) =>
      request<PortfolioEntry>(`/api/v1/portfolio/${id}/`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
  },
  documents: {
    list: (page = 1, perPage = 20) => {
      const params = new URLSearchParams()
      params.set('page', String(page))
      params.set('per_page', String(perPage))
      return request<PaginatedDocuments>(`/api/v1/documents/?${params.toString()}`)
    },
    get: (id: string) => request<DocumentResponse>(`/api/v1/documents/${id}`),
    upload: (formData: FormData) =>
      request<DocumentResponse>('/api/v1/documents/', {
        method: 'POST',
        body: formData,
      }),
    delete: (id: string) =>
      request<{ message: string }>(`/api/v1/documents/${id}`, { method: 'DELETE' }),
  },
  offerLetter: {
    generate: (dealId: string) =>
      request<OfferLetterResponse>(`/api/v1/deals/${dealId}/offer-letter/`, { method: 'POST' }),
  },
  notifications: {
    get: () =>
      request<NotificationPreferences>('/api/v1/settings/notifications/'),
    update: (prefs: NotificationPreferences) =>
      request<NotificationPreferences>('/api/v1/settings/notifications/', {
        method: 'PATCH',
        body: JSON.stringify(prefs),
      }),
  },
  billing: {
    status: () =>
      request<BillingStatus>('/api/v1/billing/status'),
    checkout: (data: CheckoutRequest) =>
      request<CheckoutResponse>('/api/v1/billing/checkout', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    portal: () =>
      request<PortalResponse>('/api/v1/billing/portal', { method: 'POST' }),
    cancel: (data: CancelRequest) =>
      request<CancelResponse>('/api/v1/billing/cancel', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },
}
