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

/**
 * Get Clerk session token if Clerk is active. Returns null when Clerk is
 * not configured or no active session exists.
 */
async function getClerkToken(): Promise<string | null> {
  if (!import.meta.env.VITE_CLERK_PUBLISHABLE_KEY) return null
  try {
    const { useAuth } = await import('@clerk/clerk-react')
    // This won't work outside of React — Clerk tokens are fetched in components.
    // Instead, we use a module-level token cache set by the auth store.
    return _clerkTokenCache
  } catch {
    return null
  }
}

/** Module-level Clerk token cache — set by authStore when Clerk is active. */
let _clerkTokenCache: string | null = null

/** Called by authStore to set the current Clerk session token. */
export function setClerkToken(token: string | null) {
  _clerkTokenCache = token
}

/** Get the current auth headers for manual fetch calls (SSE streams). */
export function getAuthHeaders(): Record<string, string> {
  if (_clerkTokenCache) return { Authorization: `Bearer ${_clerkTokenCache}` }
  return {}
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    ...(options?.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
    ...(options?.headers as Record<string, string>),
  }

  // Add Clerk Bearer token if available
  if (_clerkTokenCache) {
    headers['Authorization'] = `Bearer ${_clerkTokenCache}`
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
    list: (strategy?: string) => {
      const qs = strategy ? `?strategy=${strategy}` : ''
      return request<{ data: Record<string, PipelineCardResponse[]> }>(`/api/v1/pipeline/${qs}`)
    },
    add: (data: PipelineCreateRequest) =>
      request<PipelineCardResponse>('/api/v1/pipeline/', { method: 'POST', body: JSON.stringify(data) }),
    updateStage: (pipelineId: string, body: { stage: string; notes?: string }) =>
      request<{ id: string; deal_id: string; stage: string; notes: string | null; created_at: string }>(
        `/api/v1/pipeline/${pipelineId}/stage/`,
        { method: 'PUT', body: JSON.stringify(body) }
      ),
    remove: (pipelineId: string) =>
      request<{ message: string }>(`/api/v1/pipeline/${pipelineId}/`, { method: 'DELETE' }),
    stats: () =>
      request<import('@/types').PipelineStatsResponse>('/api/v1/pipeline/stats'),
  },
  chat: {
    history: () => request<{ messages: ChatMessage[] }>('/api/v1/chat/history/'),
    sessions: () => request<{ sessions: import('@/types').ChatSessionItem[] }>('/api/v1/chat/sessions/'),
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
    upload: (formData: FormData, propertyId?: string) => {
      const params = propertyId ? `?property_id=${propertyId}` : ''
      return request<DocumentResponse>(`/api/v1/documents/${params}`, {
        method: 'POST',
        body: formData,
      })
    },
    status: (id: string) =>
      request<import('@/types').DocumentStatusResponse>(`/api/v1/documents/${id}/status`),
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
  recentActivity: {
    list: (limit = 10) =>
      request<Array<{ type: string; description: string; timestamp: string; entity_id: string | null; entity_type: string | null }>>(`/api/activity/recent?limit=${limit}`),
  },
  properties: {
    list: (filters?: import('@/types').PropertyFilters) => {
      const params = new URLSearchParams()
      if (filters?.status) params.set('status', filters.status)
      if (filters?.strategy) params.set('strategy', filters.strategy)
      if (filters?.q) params.set('q', filters.q)
      if (filters?.page) params.set('page', String(filters.page))
      if (filters?.per_page) params.set('per_page', String(filters.per_page))
      const qs = params.toString()
      return request<import('@/types').PropertyListResponse>(`/api/properties${qs ? '?' + qs : ''}`)
    },
    get: (id: string) =>
      request<import('@/types').PropertyDetail>(`/api/properties/${id}`),
    update: (id: string, data: import('@/types').PropertyUpdateRequest) =>
      request<import('@/types').PropertyDetail>(`/api/properties/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      request<void>(`/api/properties/${id}`, { method: 'DELETE' }),
    scenarios: (propertyId: string) =>
      request<import('@/types').ScenarioDetail[]>(`/api/properties/${propertyId}/scenarios`),
    createScenario: (propertyId: string, strategy: string) =>
      request<import('@/types').ScenarioDetail>(`/api/properties/${propertyId}/scenarios`, {
        method: 'POST',
        body: JSON.stringify({ strategy }),
      }),
    activity: (id: string, limit = 20) =>
      request<import('@/types').PropertyActivityEvent[]>(`/api/properties/${id}/activity?limit=${limit}`),
  },
  today: {
    get: () => request<import('@/types').TodayResponse>('/api/today'),
  },
  tasks: {
    list: (filters?: import('@/types').TaskFilters) => {
      const params = new URLSearchParams()
      if (filters?.status) params.set('status', filters.status)
      if (filters?.priority) params.set('priority', filters.priority)
      if (filters?.property_id) params.set('property_id', filters.property_id)
      if (filters?.deal_id) params.set('deal_id', filters.deal_id)
      if (filters?.contact_id) params.set('contact_id', filters.contact_id)
      if (filters?.page) params.set('page', String(filters.page))
      if (filters?.per_page) params.set('per_page', String(filters.per_page))
      const qs = params.toString()
      return request<import('@/types').TaskListResponse>(`/api/tasks${qs ? '?' + qs : ''}`)
    },
    get: (id: string) => request<import('@/types').TaskItem>(`/api/tasks/${id}`),
    today: () => request<import('@/types').TasksTodayResponse>('/api/tasks/today'),
    create: (data: import('@/types').CreateTaskRequest) =>
      request<import('@/types').TaskItem>('/api/tasks', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: import('@/types').UpdateTaskRequest) =>
      request<import('@/types').TaskItem>(`/api/tasks/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id: string) => request<void>(`/api/tasks/${id}`, { method: 'DELETE' }),
    complete: (id: string) =>
      request<import('@/types').TaskItem>(`/api/tasks/${id}/complete`, { method: 'POST' }),
    snooze: (id: string, until: string) =>
      request<import('@/types').TaskItem>(`/api/tasks/${id}/snooze`, { method: 'POST', body: JSON.stringify({ until }) }),
  },
  contacts: {
    list: (filters?: import('@/types').ContactFilters) => {
      const params = new URLSearchParams()
      if (filters?.type) params.set('type', filters.type)
      if (filters?.q) params.set('q', filters.q)
      if (filters?.page) params.set('page', String(filters.page))
      if (filters?.per_page) params.set('per_page', String(filters.per_page))
      const qs = params.toString()
      return request<import('@/types').ContactListResponse>(`/api/contacts${qs ? '?' + qs : ''}`)
    },
    get: (id: string) =>
      request<import('@/types').ContactDetail>(`/api/contacts/${id}`),
    create: (data: import('@/types').CreateContactRequest) =>
      request<import('@/types').ContactDetail>('/api/contacts', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: string, data: import('@/types').UpdateContactRequest) =>
      request<import('@/types').ContactDetail>(`/api/contacts/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      request<void>(`/api/contacts/${id}`, { method: 'DELETE' }),
    communications: (id: string, limit = 50) =>
      request<import('@/types').CommunicationItem[]>(`/api/contacts/${id}/communications?limit=${limit}`),
    logCommunication: (id: string, data: import('@/types').CreateCommunicationRequest) =>
      request<import('@/types').CommunicationItem>(`/api/contacts/${id}/communications`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    deals: (id: string) =>
      request<import('@/types').LinkedDeal[]>(`/api/contacts/${id}/deals`),
    linkDeal: (contactId: string, dealId: string, role?: string) =>
      request<{ message: string }>(`/api/contacts/${contactId}/deals/${dealId}`, {
        method: 'POST',
        body: JSON.stringify({ role }),
      }),
    unlinkDeal: (contactId: string, dealId: string) =>
      request<void>(`/api/contacts/${contactId}/deals/${dealId}`, { method: 'DELETE' }),
  },
  analysis: {
    quick: (address: string, strategy?: string) =>
      request<Record<string, unknown>>('/api/analysis/quick', {
        method: 'POST',
        body: JSON.stringify({ address, strategy }),
      }),
    calculate: (strategy: string, inputs: Record<string, number | string>) =>
      request<import('@/types').CalculateResponse>('/api/analysis/calculate', {
        method: 'POST',
        body: JSON.stringify({ strategy, inputs }),
      }),
    saveAsProperty: (address: string, strategy: string, inputs: Record<string, number | string>) =>
      request<Record<string, unknown>>('/api/analysis/quick', {
        method: 'POST',
        body: JSON.stringify({ address, strategy }),
      }),
    regenerateNarrative: (scenarioId: string, experienceLevel?: string) =>
      request<import('@/types').ScenarioDetail>(`/api/analysis/scenarios/${scenarioId}/regenerate-narrative`, {
        method: 'POST',
        body: JSON.stringify({ experience_level: experienceLevel }),
      }),
    getComps: (scenarioId: string) =>
      request<{
        comps: Array<{
          address: string
          comp_type: string | null
          adjusted_value: number | null
          sqft: number | null
          bedrooms: number | null
          bathrooms: number | null
          last_sale_amount: number | null
          last_sale_date: string | null
        }>
        repairs: Array<{ repair: string; cost: number; description: string }>
        renovation_score: { has_score: boolean; score: number; confidence: number } | null
        share_link: string | null
        after_repair_value: number | null
        repair_cost: number | null
      }>(`/api/analysis/scenarios/${scenarioId}/comps`),
  },
  onboarding: {
    status: () =>
      request<import('@/types').OnboardingStatus>('/api/onboarding/status'),
    setPersona: (persona: string) =>
      request<import('@/types').PersonaResponse>('/api/onboarding/persona', {
        method: 'POST',
        body: JSON.stringify({ persona }),
      }),
    clearSampleData: () =>
      request<{ message: string; count: number }>('/api/onboarding/sample-data', {
        method: 'DELETE',
      }),
  },
  reports: {
    list: (page = 1, perPage = 20) =>
      request<import('@/types').ReportListResponse>(`/api/reports?page=${page}&per_page=${perPage}`),
    get: (id: string) =>
      request<import('@/types').ReportResponse>(`/api/reports/${id}`),
    create: (data: import('@/types').CreateReportRequest) =>
      request<import('@/types').ReportResponse>('/api/reports/', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: string, data: { title?: string; audience?: string; is_public?: boolean }) =>
      request<import('@/types').ReportResponse>(`/api/reports/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      request<{ message: string }>(`/api/reports/${id}`, { method: 'DELETE' }),
    getShared: (token: string) =>
      requestPublic<import('@/types').SharedReportResponse>(`/api/reports/share/${token}`),
    logView: (token: string, data: { sections_viewed?: string[]; time_spent_seconds?: number }) =>
      fetch(`${API_URL}/api/reports/share/${token}/view`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        keepalive: true,
      }),
    triggerPdf: (id: string) =>
      request<import('@/types').PdfStatusResponse>(`/api/reports/${id}/pdf`, { method: 'POST' }),
    pdfStatus: (id: string) =>
      request<import('@/types').PdfStatusResponse>(`/api/reports/${id}/pdf/status`),
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
  financing: {
    instruments: {
      list: (filters?: import('@/types/financing').InstrumentFilters) => {
        const params = new URLSearchParams()
        if (filters?.property_id) params.set('property_id', filters.property_id)
        if (filters?.status) params.set('status', filters.status)
        if (filters?.instrument_type) params.set('instrument_type', filters.instrument_type)
        if (filters?.page) params.set('page', String(filters.page))
        if (filters?.per_page) params.set('per_page', String(filters.per_page))
        const qs = params.toString()
        return request<import('@/types/financing').PaginatedInstruments>(`/api/financing/instruments${qs ? '?' + qs : ''}`)
      },
      get: (id: string) =>
        request<import('@/types/financing').InstrumentDetail>(`/api/financing/instruments/${id}`),
      create: (data: import('@/types/financing').CreateInstrumentRequest) =>
        request<import('@/types/financing').FinancingInstrument>('/api/financing/instruments', {
          method: 'POST',
          body: JSON.stringify(data),
        }),
      update: (id: string, data: import('@/types/financing').UpdateInstrumentRequest) =>
        request<import('@/types/financing').FinancingInstrument>(`/api/financing/instruments/${id}`, {
          method: 'PATCH',
          body: JSON.stringify(data),
        }),
      delete: (id: string) =>
        request<void>(`/api/financing/instruments/${id}`, { method: 'DELETE' }),
    },
    obligations: {
      list: (filters?: import('@/types/financing').ObligationFilters) => {
        const params = new URLSearchParams()
        if (filters?.instrument_id) params.set('instrument_id', filters.instrument_id)
        if (filters?.property_id) params.set('property_id', filters.property_id)
        if (filters?.status) params.set('status', filters.status)
        if (filters?.severity) params.set('severity', filters.severity)
        if (filters?.due_before) params.set('due_before', filters.due_before)
        if (filters?.due_after) params.set('due_after', filters.due_after)
        if (filters?.page) params.set('page', String(filters.page))
        if (filters?.per_page) params.set('per_page', String(filters.per_page))
        const qs = params.toString()
        return request<import('@/types/financing').PaginatedObligations>(`/api/financing/obligations${qs ? '?' + qs : ''}`)
      },
      upcoming: () =>
        request<import('@/types/financing').ObligationGrouped>('/api/financing/obligations/upcoming'),
      update: (id: string, data: import('@/types/financing').UpdateObligationRequest) =>
        request<import('@/types/financing').Obligation>(`/api/financing/obligations/${id}`, {
          method: 'PATCH',
          body: JSON.stringify(data),
        }),
      complete: (id: string, data: import('@/types/financing').CompleteObligationRequest) =>
        request<import('@/types/financing').Obligation>(`/api/financing/obligations/${id}/complete`, {
          method: 'POST',
          body: JSON.stringify(data),
        }),
    },
    payments: {
      list: (filters?: import('@/types/financing').PaymentFilters) => {
        const params = new URLSearchParams()
        if (filters?.instrument_id) params.set('instrument_id', filters.instrument_id)
        if (filters?.property_id) params.set('property_id', filters.property_id)
        if (filters?.direction) params.set('direction', filters.direction)
        if (filters?.date_from) params.set('date_from', filters.date_from)
        if (filters?.date_to) params.set('date_to', filters.date_to)
        if (filters?.page) params.set('page', String(filters.page))
        if (filters?.per_page) params.set('per_page', String(filters.per_page))
        const qs = params.toString()
        return request<import('@/types/financing').PaginatedPayments>(`/api/financing/payments${qs ? '?' + qs : ''}`)
      },
      create: (data: import('@/types/financing').CreatePaymentRequest) =>
        request<import('@/types/financing').Payment>('/api/financing/payments', {
          method: 'POST',
          body: JSON.stringify(data),
        }),
      summary: () =>
        request<import('@/types/financing').PaymentSummaryResponse>('/api/financing/payments/summary'),
    },
    dashboard: () =>
      request<import('@/types/financing').FinancingDashboard>('/api/financing/dashboard'),
  },
}
