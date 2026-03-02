/** Shared TypeScript types — single source of truth derived from API contracts. */

// ---------------------------------------------------------------------------
// Generic utility types
// ---------------------------------------------------------------------------

/** Standard API error response shape. */
export interface ApiError {
  error: string
  code: string
}

/** Paginated list response from the API. */
export interface Paginated<T> {
  data: T[]
  total: number
  page: number
  per_page: number
  total_pages: number
}

/** Wrapper for API responses that may fail. */
export type Result<T, E = ApiError> =
  | { ok: true; data: T }
  | { ok: false; error: E }

/** Extract the resolved value type from a Promise-returning function. */
export type AsyncReturnType<T extends (...args: unknown[]) => Promise<unknown>> =
  T extends (...args: unknown[]) => Promise<infer R> ? R : never

// ---------------------------------------------------------------------------
// Domain types
// ---------------------------------------------------------------------------

export interface User {
  id: string
  name: string
  email: string
  role: 'wholesaler' | 'investor' | 'agent'
  team_id?: string | null
  created_at: string
}

export interface AuthResponse {
  user: User
}

export type Strategy = 'wholesale' | 'creative_finance' | 'brrrr' | 'buy_and_hold' | 'flip'

export interface DealCreateRequest {
  address: string
  zip_code: string
  property_type: string
  strategy: Strategy
  inputs: Record<string, number | string>
}

export interface DealResponse {
  id: string
  user_id: string
  team_id: string | null
  address: string
  zip_code: string
  property_type: string
  strategy: Strategy
  inputs: Record<string, number>
  outputs: Record<string, number | string>
  risk_score: number | null
  risk_factors: Record<string, number | string> | null
  status: string
  deleted_at: string | null
  created_at: string
  updated_at: string
}

export interface PipelineCreateRequest {
  deal_id: string
  stage: string
}

export interface PipelineCardResponse {
  pipeline_id: string
  deal_id: string
  address: string
  strategy: string
  asking_price: number | null
  stage: string
  days_in_stage: number
  entered_stage_at: string
}

export interface RecentDeal {
  id: string
  address: string
  strategy: Strategy
  risk_score: number | null
  status: string
  created_at: string
  outputs: Record<string, unknown>
}

export interface DashboardStats {
  total_deals: number
  active_pipeline_deals: number
  deals_by_strategy: Record<string, number>
  pipeline_by_stage: Record<string, number>
  recent_deals: RecentDeal[]
}

export interface DealListItem {
  id: string
  address: string
  zip_code: string
  strategy: Strategy
  primary_metric_label: string | null
  primary_metric_value: number | null
  risk_score: number | null
  status: string
  created_at: string
}

export interface DealsFilters {
  strategy?: string
  status?: string
  q?: string
  page?: number
  per_page?: number
  sort?: string
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  context_type: string | null
  context_id: string | null
  created_at: string
}

export interface ChatRequest {
  message: string
  context_type: 'general' | 'deal' | 'document'
  context_id: string | null
  history: { role: string; content: string }[]
  session_id: string
}

export interface SharedDealResponse {
  id: string
  address: string
  zip_code: string
  property_type: string
  strategy: Strategy
  inputs: Record<string, number | string>
  outputs: Record<string, number | string>
  risk_score: number | null
  primary_metric_label: string | null
  primary_metric_value: number | null
  risk_factors: Record<string, number | string> | null
  shared_by: { name: string }
  created_at: string
}

export interface ShareDealActionResponse extends DealResponse {
  share_url: string
}

export interface PortfolioEntry {
  id: string
  deal_id: string
  address: string
  strategy: Strategy
  closed_date: string
  closed_price: number
  profit: number
  monthly_cash_flow: number
  notes: string | null
}

export interface PortfolioSummaryResponse {
  summary: {
    total_equity: number
    total_monthly_cash_flow: number
    total_deals_closed: number
    avg_annualized_return: number
    total_profit: number
  }
  entries: PortfolioEntry[]
}

export interface AddPortfolioEntryRequest {
  deal_id: string
  closed_date: string
  closed_price: number
  profit: number
  monthly_cash_flow: number
  notes?: string
}

export interface UserProfileResponse {
  id: string
  email: string
  name: string
  role: string
  created_at: string
}

export interface UpdateProfileRequest {
  name?: string
  email?: string
  current_password?: string
  new_password?: string
}

export interface RiskFlag {
  severity: 'high' | 'medium' | 'low'
  description: string
  quote: string
}

export interface DocumentParty {
  name: string
  role: string
}

export interface DocumentResponse {
  id: string
  user_id: string
  original_filename: string
  file_type: string
  file_size_bytes: number
  status: 'pending' | 'processing' | 'complete' | 'failed'
  document_type: string | null
  ai_summary: string | null
  parties: DocumentParty[]
  risk_flags: RiskFlag[]
  extracted_numbers: Record<string, number | string> | null
  key_terms: string[]
  processing_error: string | null
  presigned_url: string | null
  created_at: string
  updated_at: string
}

export interface ActivityItem {
  id: string
  activity_type: 'deal_analyzed' | 'pipeline_moved' | 'document_analyzed' | 'deal_closed'
  text: string
  timestamp: string
  metadata: {
    strategy?: string
    address?: string
    stage?: string
  }
}

export interface ActivityResponse {
  activities: ActivityItem[]
}

export interface OfferLetterResponse {
  deal_id: string
  address: string
  strategy: string
  offer_letter: string
  generated_at: string
}

export interface FilterPreset {
  id: string
  name: string
  filters: DealsFilters
}

export interface NotificationPreferences {
  email_notifications: boolean
}

export interface DocumentListItem {
  id: string
  original_filename: string
  file_type: string
  file_size_bytes: number
  status: 'pending' | 'processing' | 'complete' | 'failed'
  document_type: string | null
  ai_summary: string | null
  presigned_url: string | null
  created_at: string
}

/** Paginated document list response from GET /documents. */
export interface PaginatedDocuments {
  items: DocumentListItem[]
  total: number
  page: number
  per_page: number
  pages: number
}
