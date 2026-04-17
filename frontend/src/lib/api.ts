/** API client — all backend calls go through this module. Never use fetch directly in components. */

import { useAuthStore } from '@/stores/authStore'
import { useBillingStore } from '@/stores/billingStore'
import type {
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

const _rawUrl = import.meta.env.VITE_API_URL ?? 'https://api.parceldesk.io'
const API_URL = _rawUrl.includes('localhost') || _rawUrl.includes('127.0.0.1') ? _rawUrl : _rawUrl.replace('http://', 'https://')

/** Module-level Clerk token cache — set by authStore when Clerk is active. */
let _clerkTokenCache: string | null = null

/** Stored reference to Clerk's getToken() for on-demand token refresh. */
let _clerkTokenGetter: (() => Promise<string | null>) | null = null

/** Called by authStore to set the current Clerk session token. */
export function setClerkToken(token: string | null) {
  _clerkTokenCache = token
}

/** Called by AuthSyncProvider to store Clerk's getToken() for on-demand use. */
export function setClerkTokenGetter(getter: (() => Promise<string | null>) | null) {
  _clerkTokenGetter = getter
}

/** Get the current auth headers synchronously (may be empty if token not yet cached). */
export function getAuthHeaders(): Record<string, string> {
  if (_clerkTokenCache) return { Authorization: `Bearer ${_clerkTokenCache}` }
  return {}
}

/** Ensure auth headers are available — always fetches a fresh token via Clerk's getToken(). */
export async function ensureAuthHeaders(): Promise<Record<string, string>> {
  if (_clerkTokenGetter) {
    try {
      const token = await _clerkTokenGetter()
      if (token) {
        _clerkTokenCache = token
        return { Authorization: `Bearer ${token}` }
      }
    } catch { /* token fetch failed — fall through to cache */ }
  }
  if (_clerkTokenCache) return { Authorization: `Bearer ${_clerkTokenCache}` }
  return {}
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const authHeaders = await ensureAuthHeaders()
  const headers: Record<string, string> = {
    ...(options?.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
    ...authHeaders,
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
    // Clerk handles token lifecycle — on 401, just clear local state
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
    me: () => request<User>('/api/v1/auth/me'),
    updateMe: (data: UpdateProfileRequest) =>
      request<UserProfileResponse>('/api/v1/auth/me/', {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    deleteAccount: (confirmation: string) =>
      request<{ message: string }>('/api/v1/auth/delete-account', {
        method: 'POST',
        body: JSON.stringify({ confirmation }),
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
      return request<import('@/types').PropertyListResponse>(`/api/properties/${qs ? '?' + qs : ''}`)
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
    get: () => request<import('@/types').TodayResponse>('/api/today/'),
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
      return request<import('@/types').TaskListResponse>(`/api/tasks/${qs ? '?' + qs : ''}`)
    },
    get: (id: string) => request<import('@/types').TaskItem>(`/api/tasks/${id}`),
    today: () => request<import('@/types').TasksTodayResponse>('/api/tasks/today'),
    create: (data: import('@/types').CreateTaskRequest) =>
      request<import('@/types').TaskItem>('/api/tasks/', { method: 'POST', body: JSON.stringify(data) }),
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
      return request<import('@/types').ContactListResponse>(`/api/contacts/${qs ? '?' + qs : ''}`)
    },
    get: (id: string) =>
      request<import('@/types').ContactDetail>(`/api/contacts/${id}`),
    create: (data: import('@/types').CreateContactRequest) =>
      request<import('@/types').ContactDetail>('/api/contacts/', {
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
    saveAsProperty: (address: string, strategy: string, _inputs?: Record<string, number | string>) =>
      request<Record<string, unknown>>('/api/analysis/quick', {
        method: 'POST',
        body: JSON.stringify({ address, strategy }),
      }),
    getScenario: (scenarioId: string) =>
      request<import('@/types').ScenarioDetail>(`/api/analysis/scenarios/${scenarioId}`),
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
    compare: (inputs: Record<string, number | string>) =>
      request<import('@/types').CompareResponse>('/api/analysis/compare', {
        method: 'POST',
        body: JSON.stringify({ inputs }),
      }),
    reverseCalculate: (strategy: string, targetMetric: string, targetValue: number, inputs: Record<string, number | string>) =>
      request<import('@/types').ReverseCalculateResponse>('/api/analysis/reverse-calculate', {
        method: 'POST',
        body: JSON.stringify({ strategy, target_metric: targetMetric, target_value: targetValue, inputs }),
      }),
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
    dismissBanner: () =>
      request<{ dismissed: boolean }>('/api/onboarding/dismiss-banner', {
        method: 'POST',
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
  serviceStatus: () =>
    request<Record<string, boolean>>('/api/service-status'),
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
  transactions: {
    list: (filters?: import('@/types').TransactionFilters) => {
      const params = new URLSearchParams()
      if (filters?.property_id) params.set('property_id', filters.property_id)
      if (filters?.category) params.set('category', filters.category)
      if (filters?.transaction_type) params.set('transaction_type', filters.transaction_type)
      if (filters?.date_from) params.set('date_from', filters.date_from)
      if (filters?.date_to) params.set('date_to', filters.date_to)
      if (filters?.page) params.set('page', String(filters.page))
      if (filters?.per_page) params.set('per_page', String(filters.per_page))
      const qs = params.toString()
      return request<import('@/types').PaginatedTransactions>(`/api/transactions${qs ? '?' + qs : ''}`)
    },
    create: (data: import('@/types').CreateTransactionRequest) =>
      request<import('@/types').Transaction>('/api/transactions', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: string, data: Record<string, unknown>) =>
      request<import('@/types').Transaction>(`/api/transactions/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      request<void>(`/api/transactions/${id}`, { method: 'DELETE' }),
    summary: (filters?: { property_id?: string; date_from?: string; date_to?: string }) => {
      const params = new URLSearchParams()
      if (filters?.property_id) params.set('property_id', filters.property_id)
      if (filters?.date_from) params.set('date_from', filters.date_from)
      if (filters?.date_to) params.set('date_to', filters.date_to)
      const qs = params.toString()
      return request<import('@/types').TransactionSummary>(`/api/transactions/summary${qs ? '?' + qs : ''}`)
    },
    bulkCreate: (data: { transactions: import('@/types').CreateTransactionRequest[] }) =>
      request<import('@/types').BulkCreateResponse>('/api/transactions/bulk', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },
  portfolioV2: {
    overview: () => request<import('@/types').PortfolioOverview>('/api/portfolio/overview'),
  },
  rehab: {
    projects: {
      list: (filters?: { property_id?: string; status?: string }) => {
        const params = new URLSearchParams()
        if (filters?.property_id) params.set('property_id', filters.property_id)
        if (filters?.status) params.set('status', filters.status)
        const qs = params.toString()
        return request<import('@/types').RehabProject[]>(`/api/rehab/projects${qs ? '?' + qs : ''}`)
      },
      get: (id: string) =>
        request<import('@/types').RehabProjectDetail>(`/api/rehab/projects/${id}`),
      create: (data: import('@/types').CreateRehabProjectRequest) =>
        request<import('@/types').RehabProject>('/api/rehab/projects', {
          method: 'POST',
          body: JSON.stringify(data),
        }),
      update: (id: string, data: Record<string, unknown>) =>
        request<import('@/types').RehabProject>(`/api/rehab/projects/${id}`, {
          method: 'PATCH',
          body: JSON.stringify(data),
        }),
      delete: (id: string) =>
        request<void>(`/api/rehab/projects/${id}`, { method: 'DELETE' }),
      summary: (id: string) =>
        request<import('@/types').RehabProjectSummary>(`/api/rehab/projects/${id}/summary`),
    },
    items: {
      create: (projectId: string, data: import('@/types').CreateRehabItemRequest) =>
        request<import('@/types').RehabItem>(`/api/rehab/projects/${projectId}/items`, {
          method: 'POST',
          body: JSON.stringify(data),
        }),
      update: (projectId: string, itemId: string, data: Record<string, unknown>) =>
        request<import('@/types').RehabItem>(`/api/rehab/projects/${projectId}/items/${itemId}`, {
          method: 'PATCH',
          body: JSON.stringify(data),
        }),
      delete: (projectId: string, itemId: string) =>
        request<void>(`/api/rehab/projects/${projectId}/items/${itemId}`, { method: 'DELETE' }),
      bulkCreate: (projectId: string, data: { items: import('@/types').CreateRehabItemRequest[] }) =>
        request<import('@/types').RehabItem[]>(`/api/rehab/projects/${projectId}/items/bulk`, {
          method: 'POST',
          body: JSON.stringify(data),
        }),
    },
  },
  buyers: {
    list: (filters?: import('@/types').BuyerFilters) => {
      const params = new URLSearchParams()
      if (filters?.funding_type) params.set('funding_type', filters.funding_type)
      if (filters?.has_pof) params.set('has_pof', 'true')
      if (filters?.market) params.set('market', filters.market)
      if (filters?.strategy) params.set('strategy', filters.strategy)
      if (filters?.q) params.set('q', filters.q)
      const qs = params.toString()
      return request<import('@/types').BuyerListItem[]>(`/api/buyers${qs ? '?' + qs : ''}`)
    },
    get: (contactId: string) =>
      request<import('@/types').BuyerDetail>(`/api/buyers/${contactId}`),
    quickAdd: (data: import('@/types').QuickAddBuyerRequest) =>
      request<import('@/types').BuyerListItem>('/api/buyers/quick-add', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    matches: (contactId: string) =>
      request<import('@/types').MatchingPropertyItem[]>(`/api/buyers/${contactId}/matches`),
    buyBoxes: {
      create: (contactId: string, data: import('@/types').CreateBuyBoxRequest) =>
        request<import('@/types').BuyBox>(`/api/buyers/${contactId}/buy-boxes`, {
          method: 'POST',
          body: JSON.stringify(data),
        }),
      update: (contactId: string, boxId: string, data: Record<string, unknown>) =>
        request<import('@/types').BuyBox>(`/api/buyers/${contactId}/buy-boxes/${boxId}`, {
          method: 'PATCH',
          body: JSON.stringify(data),
        }),
      delete: (contactId: string, boxId: string) =>
        request<void>(`/api/buyers/${contactId}/buy-boxes/${boxId}`, { method: 'DELETE' }),
    },
  },
  dispositions: {
    matchProperty: (propertyId: string, filters?: import('@/types').MatchFilters) => {
      const params = new URLSearchParams()
      if (filters?.min_score != null) params.set('min_score', String(filters.min_score))
      if (filters?.funding_type) params.set('funding_type', filters.funding_type)
      if (filters?.has_pof) params.set('has_pof', 'true')
      const qs = params.toString()
      return request<import('@/types').PropertyMatchResponse>(`/api/dispositions/matches/property/${propertyId}${qs ? '?' + qs : ''}`)
    },
    matchBuyer: (contactId: string, filters?: { min_score?: number }) => {
      const params = new URLSearchParams()
      if (filters?.min_score != null) params.set('min_score', String(filters.min_score))
      const qs = params.toString()
      return request<import('@/types').BuyerMatchResponse>(`/api/dispositions/matches/buyer/${contactId}${qs ? '?' + qs : ''}`)
    },
    matchPreview: (data: import('@/types').MatchPreviewRequest) =>
      request<import('@/types').MatchPreviewResponse>('/api/dispositions/match-preview', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    packets: {
      create: (data: import('@/types').CreatePacketRequest) =>
        request<{ id: string; share_url: string }>('/api/dispositions/packets', {
          method: 'POST',
          body: JSON.stringify(data),
        }),
      list: () =>
        request<import('@/types').PacketListItem[]>('/api/dispositions/packets'),
      send: (packetId: string, data: import('@/types').SendPacketRequest) =>
        request<import('@/types').SendPacketResponse>(`/api/dispositions/packets/${packetId}/send`, {
          method: 'POST',
          body: JSON.stringify(data),
        }),
    },
    sharedPacket: (shareToken: string) =>
      requestPublic<import('@/types').SharedPacketData>(`/api/dispositions/packets/share/${shareToken}`),
  },
  communications: {
    sendSMS: (data: import('@/types').SendSMSRequest) =>
      request<import('@/types').ThreadMessage>('/api/communications/send-sms', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    sendEmail: (data: import('@/types').SendEmailRequest) =>
      request<import('@/types').ThreadMessage>('/api/communications/send-email', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    thread: (contactId: string) =>
      request<import('@/types').ThreadResponse>(`/api/communications/thread/${contactId}`),
  },
  sequences: {
    list: () => request<import('@/types').SequenceListItem[]>('/api/sequences/'),
    get: (id: string) => request<import('@/types').SequenceDetail>(`/api/sequences/${id}`),
    create: (data: import('@/types').CreateSequenceRequest) =>
      request<import('@/types').SequenceDetail>('/api/sequences/', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: import('@/types').UpdateSequenceRequest) =>
      request<import('@/types').SequenceDetail>(`/api/sequences/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id: string) => request<void>(`/api/sequences/${id}`, { method: 'DELETE' }),
    steps: {
      add: (seqId: string, data: { channel: string; delay_days?: number; delay_hours?: number; subject?: string; body_template: string }) =>
        request<import('@/types').SequenceStep>(`/api/sequences/${seqId}/steps`, { method: 'POST', body: JSON.stringify(data) }),
      update: (seqId: string, stepId: string, data: Record<string, unknown>) =>
        request<import('@/types').SequenceStep>(`/api/sequences/${seqId}/steps/${stepId}`, { method: 'PATCH', body: JSON.stringify(data) }),
      delete: (seqId: string, stepId: string) =>
        request<void>(`/api/sequences/${seqId}/steps/${stepId}`, { method: 'DELETE' }),
    },
    enroll: (seqId: string, data: import('@/types').EnrollRequest) =>
      request<import('@/types').SequenceEnrollment>(`/api/sequences/${seqId}/enroll`, { method: 'POST', body: JSON.stringify(data) }),
    enrollBulk: (seqId: string, data: import('@/types').BulkEnrollRequest) =>
      request<{ enrolled: number; errors: string[] }>(`/api/sequences/${seqId}/enroll-bulk`, { method: 'POST', body: JSON.stringify(data) }),
    stopEnrollment: (seqId: string, enrollmentId: string) =>
      request<void>(`/api/sequences/${seqId}/enrollments/${enrollmentId}`, { method: 'DELETE' }),
    enrollments: (seqId: string) =>
      request<{ enrollments: import('@/types').SequenceEnrollment[]; total: number }>(`/api/sequences/${seqId}/enrollments`),
    analytics: (seqId: string) =>
      request<import('@/types').SequenceAnalytics>(`/api/sequences/${seqId}/analytics`),
  },
  skipTracing: {
    trace: (data: import('@/types').TraceAddressRequest) =>
      request<import('@/types').SkipTraceResult>('/api/skip-tracing/trace', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    traceBatch: (data: { records: { address: string; city: string; state: string; zip_code: string }[]; auto_create_contacts?: boolean }) =>
      request<{ batch_id: string; status: string; total: number }>('/api/skip-tracing/trace-batch', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    batchStatus: (batchId: string) =>
      request<import('@/types').BatchStatusResponse>(`/api/skip-tracing/batch/${batchId}/status`),
    history: (filters?: import('@/types').SkipTraceHistoryFilters) => {
      const params = new URLSearchParams()
      if (filters?.property_id) params.set('property_id', filters.property_id)
      if (filters?.status) params.set('status', filters.status)
      if (filters?.date_from) params.set('date_from', filters.date_from)
      if (filters?.date_to) params.set('date_to', filters.date_to)
      if (filters?.page) params.set('page', String(filters.page))
      if (filters?.per_page) params.set('per_page', String(filters.per_page))
      const qs = params.toString()
      return request<{ items: import('@/types').SkipTraceListItem[]; total: number }>(`/api/skip-tracing/history${qs ? '?' + qs : ''}`)
    },
    get: (id: string) =>
      request<import('@/types').SkipTraceResult>(`/api/skip-tracing/${id}`),
    createContact: (id: string, data?: { contact_type?: string }) =>
      request<import('@/types').CreateContactFromTraceResponse>(`/api/skip-tracing/${id}/create-contact`, {
        method: 'POST',
        body: JSON.stringify(data ?? {}),
      }),
    usage: () =>
      request<import('@/types').SkipTraceUsage>('/api/skip-tracing/usage'),
  },
  mailCampaigns: {
    list: () => request<import('@/types').MailCampaignListItem[]>('/api/mail-campaigns/'),
    get: (id: string) => request<import('@/types').MailCampaignDetail>(`/api/mail-campaigns/${id}`),
    create: (data: import('@/types').CreateMailCampaignRequest) =>
      request<import('@/types').MailCampaignDetail>('/api/mail-campaigns/', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: import('@/types').UpdateMailCampaignRequest) =>
      request<import('@/types').MailCampaignDetail>(`/api/mail-campaigns/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id: string) => request<void>(`/api/mail-campaigns/${id}`, { method: 'DELETE' }),
    addRecipients: (id: string, data: import('@/types').AddRecipientsRequest) =>
      request<import('@/types').MailRecipient[]>(`/api/mail-campaigns/${id}/recipients`, { method: 'POST', body: JSON.stringify(data) }),
    removeRecipient: (campaignId: string, recipientId: string) =>
      request<void>(`/api/mail-campaigns/${campaignId}/recipients/${recipientId}`, { method: 'DELETE' }),
    verify: (id: string) =>
      request<import('@/types').MailVerifyResponse>(`/api/mail-campaigns/${id}/verify`, { method: 'POST' }),
    send: (id: string) =>
      request<{ status: string }>(`/api/mail-campaigns/${id}/send`, { method: 'POST' }),
    cancel: (id: string) =>
      request<{ status: string }>(`/api/mail-campaigns/${id}/cancel`, { method: 'POST' }),
    preview: (id: string) =>
      request<{ front_html: string; back_html: string }>(`/api/mail-campaigns/${id}/preview`),
    analytics: (id: string) =>
      request<import('@/types').MailCampaignAnalytics>(`/api/mail-campaigns/${id}/analytics`),
    quickSend: (data: import('@/types').QuickSendRequest) =>
      request<{ lob_id: string; status: string }>('/api/mail-campaigns/quick-send', { method: 'POST', body: JSON.stringify(data) }),
  },
}
