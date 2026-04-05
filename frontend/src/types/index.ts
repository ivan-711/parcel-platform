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
  plan_tier: PlanTier
  trial_ends_at: string | null
  trial_active?: boolean
  created_at: string
}

// ---------------------------------------------------------------------------
// Billing types
// ---------------------------------------------------------------------------

export type PlanTier = 'free' | 'plus' | 'pro' | 'business'
export type SubscriptionStatus = 'active' | 'trialing' | 'past_due' | 'canceled' | 'incomplete' | 'unpaid'
export type BillingCycle = 'monthly' | 'annual'

export const PLAN_RANK: Record<PlanTier, number> = { free: 0, plus: 1, pro: 2, business: 3 }

export function hasAccess(current: PlanTier, required: PlanTier): boolean {
  return PLAN_RANK[current] >= PLAN_RANK[required]
}

export interface UsageMetric {
  metric: string
  display_name: string
  current: number
  limit: number | null
  resets_at: string | null
  warning: boolean
}

export interface BillingStatus {
  plan: PlanTier
  status: SubscriptionStatus | null
  interval: BillingCycle | null
  current_period_end: string | null
  cancel_at_period_end: boolean
  trial_ends_at: string | null
  trial_active: boolean
  usage: UsageMetric[]
}

export interface CheckoutRequest {
  plan: 'plus' | 'pro' | 'business'
  interval: BillingCycle
}

export interface CheckoutResponse {
  checkout_url: string
}

export interface PortalResponse {
  portal_url: string
}

export interface CancelRequest {
  reason?: string
  immediate?: boolean
}

export interface CancelResponse {
  status: string
  cancel_at: string | null
  message: string
}

export type GatedFeature =
  | 'ai_chat' | 'pdf_export' | 'pipeline' | 'portfolio'
  | 'offer_letter' | 'compare_deals' | 'document_upload'

export const FEATURE_LABELS: Record<GatedFeature, { label: string; tier: PlanTier; description: string }> = {
  ai_chat:         { label: 'AI Deal Chat',           tier: 'pro', description: 'Ask AI questions about your deals' },
  pdf_export:      { label: 'PDF Reports',            tier: 'pro', description: 'Download branded PDF deal reports' },
  pipeline:        { label: 'Deal Pipeline',          tier: 'pro', description: 'Organize deals across pipeline stages' },
  portfolio:       { label: 'Portfolio Tracking',      tier: 'pro', description: 'Track closed deals and cash flow' },
  offer_letter:    { label: 'Offer Letter Generator',  tier: 'pro', description: 'Generate professional offer letters' },
  compare_deals:   { label: 'Deal Comparison',         tier: 'pro', description: 'Compare deals side-by-side' },
  document_upload: { label: 'Document AI',             tier: 'pro', description: 'Upload and analyze deal documents' },
}

export interface AuthResponse {
  user: User
}

// ---------------------------------------------------------------------------
// Onboarding types
// ---------------------------------------------------------------------------

export type OnboardingPersona =
  | 'wholesale' | 'flip' | 'buy_and_hold' | 'creative_finance'
  | 'brrrr' | 'hybrid' | 'agent' | 'beginner'

export interface OnboardingStatus {
  completed: boolean
  persona: OnboardingPersona | null
  has_sample_data: boolean
  has_real_data: boolean
  real_property_count: number
}

export interface OnboardingProperty {
  id: string
  address_line1: string
  city: string
  state: string
  zip_code: string
  property_type: string | null
  bedrooms: number | null
  bathrooms: number | null
  sqft: number | null
  year_built: number | null
  is_sample: boolean
}

export interface OnboardingScenario {
  id: string
  property_id: string
  strategy: string
  purchase_price: number | null
  after_repair_value: number | null
  repair_cost: number | null
  monthly_rent: number | null
  outputs: Record<string, unknown>
  ai_narrative: string | null
  is_sample: boolean
}

export interface PersonaResponse {
  persona: OnboardingPersona
  sample_property: OnboardingProperty
  sample_scenarios: OnboardingScenario[]
}

// ---------------------------------------------------------------------------
// Analysis types
// ---------------------------------------------------------------------------

export interface PropertyDetail {
  id: string
  address_line1: string
  address_line2: string | null
  city: string
  state: string
  zip_code: string
  county: string | null
  property_type: string | null
  bedrooms: number | null
  bathrooms: number | null
  sqft: number | null
  lot_sqft: number | null
  year_built: number | null
  status: string
  data_sources: Record<string, { source: string; timestamp: string; confidence: string }> | null
  is_sample: boolean
  created_at: string
  updated_at: string
}

export interface ScenarioDetail {
  id: string
  property_id: string
  strategy: string
  purchase_price: number | null
  after_repair_value: number | null
  repair_cost: number | null
  monthly_rent: number | null
  down_payment_pct: number | null
  interest_rate: number | null
  loan_term_years: number | null
  inputs_extended: Record<string, number | string> | null
  outputs: Record<string, number | string | null>
  risk_score: number | null
  risk_flags: Array<{ flag: string; severity: string; explanation: string }> | null
  ai_narrative: string | null
  ai_narrative_generated_at: string | null
  source_confidence: Record<string, { source: string; confidence: string; fetched_at: string }> | null
  is_sample: boolean
  is_snapshot: boolean
  created_at: string
}

// ---------------------------------------------------------------------------
// Properties list types
// ---------------------------------------------------------------------------

export interface ScenarioSummary {
  id: string
  strategy: Strategy
  purchase_price: number | null
  risk_score: number | null
  outputs: Record<string, number | string | null>
  created_at: string
}

export interface PropertyListItem {
  id: string
  address_line1: string
  address_line2: string | null
  city: string
  state: string
  zip_code: string
  property_type: string | null
  bedrooms: number | null
  bathrooms: number | null
  sqft: number | null
  year_built: number | null
  status: string
  is_sample: boolean
  created_at: string
  updated_at: string
  primary_scenario: ScenarioSummary | null
  deal_count: number
}

export interface PropertyListResponse {
  properties: PropertyListItem[]
  total: number
  page: number
  per_page: number
}

export interface PropertyFilters {
  status?: string
  strategy?: string
  q?: string
  page?: number
  per_page?: number
}

export interface PropertyUpdateRequest {
  address_line1?: string
  city?: string
  state?: string
  zip_code?: string
  property_type?: string
  bedrooms?: number
  bathrooms?: number
  sqft?: number
  year_built?: number
  status?: string
}

export interface PropertyActivityEvent {
  type: string
  description: string
  timestamp: string
  entity_id: string | null
  entity_type: string | null
}

// ---------------------------------------------------------------------------
// Contact types
// ---------------------------------------------------------------------------

export type ContactType =
  | 'seller'
  | 'buyer'
  | 'agent'
  | 'lender'
  | 'contractor'
  | 'tenant'
  | 'partner'
  | 'other'

export interface ContactItem {
  id: string
  first_name: string
  last_name: string | null
  email: string | null
  phone: string | null
  company: string | null
  contact_type: ContactType | null
  deal_count: number
  last_communication: string | null
  created_at: string
  updated_at: string
}

export interface ContactDetail {
  id: string
  first_name: string
  last_name: string | null
  email: string | null
  phone: string | null
  company: string | null
  contact_type: ContactType | null
  notes: string | null
  tags: string[] | null
  is_deleted: boolean
  created_at: string
  updated_at: string
}

export interface ContactListResponse {
  contacts: ContactItem[]
  total: number
  page: number
  per_page: number
}

export interface ContactFilters {
  type?: string
  q?: string
  page?: number
  per_page?: number
}

export interface CreateContactRequest {
  first_name: string
  last_name?: string
  email?: string
  phone?: string
  company?: string
  contact_type?: ContactType
  notes?: string
  tags?: string[]
}

export interface UpdateContactRequest {
  first_name?: string
  last_name?: string
  email?: string
  phone?: string
  company?: string
  contact_type?: ContactType
  notes?: string
  tags?: string[]
}

export interface CommunicationItem {
  id: string
  channel: 'call' | 'sms' | 'email' | 'meeting' | 'note'
  direction: 'inbound' | 'outbound' | null
  subject: string | null
  body: string | null
  deal_id: string | null
  property_id: string | null
  occurred_at: string
  created_at: string
}

export interface CreateCommunicationRequest {
  channel: string
  occurred_at: string
  direction?: string
  subject?: string
  body?: string
  deal_id?: string
  property_id?: string
}

export interface LinkedDeal {
  deal_id: string
  address: string
  strategy: string
  status: string
  role: string | null
  created_at: string
}

// ---------------------------------------------------------------------------
// Today view types
// ---------------------------------------------------------------------------

export interface TodayPortfolioSummary {
  total_value: number
  total_cash_flow: number
  property_count: number
  deal_count: number
  change_pct: number
  monthly_actuals?: { month: string; net: number }[]
}

export interface TodayBriefingItem {
  id: string
  severity: 'urgent' | 'warning' | 'info'
  title: string
  description: string
  entity_type: string | null
  entity_id: string | null
  action_url: string | null
  created_at: string
}

export interface TodayPipelineSummary {
  total_active: number
  by_stage: Record<string, number>
  total_value: number
}

export interface TodayActivityItem {
  type: string
  description: string
  timestamp: string
  entity_id: string | null
  entity_type: string | null
}

export interface TodayResponse {
  greeting: string
  date: string
  portfolio_summary: TodayPortfolioSummary
  briefing_items: TodayBriefingItem[]
  pipeline_summary: TodayPipelineSummary
  recent_activity: TodayActivityItem[]
  has_sample_data: boolean
  has_real_data: boolean
}

// ---------------------------------------------------------------------------
// Task types
// ---------------------------------------------------------------------------

export type TaskStatus = 'open' | 'due' | 'snoozed' | 'done' | 'canceled'
export type TaskPriority = 'low' | 'normal' | 'high' | 'urgent'

export interface TaskItem {
  id: string
  title: string
  description: string | null
  status: TaskStatus
  priority: TaskPriority
  due_date: string | null
  completed_at: string | null
  property_id: string | null
  deal_id: string | null
  contact_id: string | null
  assigned_to: string | null
  is_deleted: boolean
  created_at: string
  updated_at: string
}

export interface TaskListResponse {
  tasks: TaskItem[]
  total: number
  page: number
  per_page: number
}

export interface TaskFilters {
  status?: string
  priority?: string
  property_id?: string
  deal_id?: string
  contact_id?: string
  page?: number
  per_page?: number
}

export interface CreateTaskRequest {
  title: string
  description?: string
  status?: string
  priority?: string
  due_date?: string
  property_id?: string
  deal_id?: string
  contact_id?: string
}

export interface UpdateTaskRequest {
  title?: string
  description?: string
  status?: string
  priority?: string
  due_date?: string
  property_id?: string
  deal_id?: string
  contact_id?: string
}

export interface TasksTodayResponse {
  due_today: TaskItem[]
  overdue: TaskItem[]
  urgent: TaskItem[]
}

// ---------------------------------------------------------------------------
// Calculator types
// ---------------------------------------------------------------------------

export interface CalculateRequest {
  strategy: string
  inputs: Record<string, number | string>
}

export interface CalculateResponse {
  strategy: string
  outputs: Record<string, number | string | null>
  risk_score: number
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
  city: string | null
  state: string | null
  property_type: string | null
  is_sample: boolean
}

export interface PipelineStatsResponse {
  by_stage: Record<string, number>
  by_strategy: Record<string, number>
  total_value: number
  total_active: number
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
  closed_deals: number
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

export interface Citation {
  chunk_id: string
  document_id: string
  document_name: string
  content_preview: string
  relevance_score: number
  page_number: number | null
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  context_type: string | null
  context_id: string | null
  citations: Citation[] | null
  created_at: string
}

export interface ChatSessionItem {
  session_id: string
  title: string
  last_message_at: string
  message_count: number
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
  property_id: string | null
  original_filename: string
  file_type: string
  file_size_bytes: number
  status: 'pending' | 'processing' | 'complete' | 'failed'
  embedding_status: 'pending' | 'processing' | 'complete' | 'failed'
  embedding_meta: { total_chunks?: number; processed_chunks?: number; error?: string } | null
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

export interface DocumentStatusResponse {
  status: string
  embedding_status: string
  embedding_meta: { total_chunks?: number; processed_chunks?: number; error?: string } | null
  chunks_count: number
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
  embedding_status: 'pending' | 'processing' | 'complete' | 'failed'
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

// ---------------------------------------------------------------------------
// Report types
// ---------------------------------------------------------------------------

export interface BrandKit {
  logo_url?: string
  primary_color?: string
  company_name?: string
  phone?: string
  email?: string
  website?: string
}

export interface ReportDataSnapshot {
  property: {
    address_line1: string
    city: string
    state: string
    zip_code: string
    property_type: string | null
    bedrooms: number | null
    bathrooms: number | null
    sqft: number | null
    year_built: number | null
  }
  scenario: {
    strategy: string
    purchase_price: number | null
    after_repair_value: number | null
    repair_cost: number | null
    monthly_rent: number | null
    inputs_extended: Record<string, unknown> | null
    outputs: Record<string, number | string> | null
    risk_score: number | null
    risk_flags: Array<{ flag: string; severity: string; explanation: string }> | null
    ai_narrative: string | null
  }
  brand_kit: BrandKit | null
}

export interface ReportResponse {
  id: string
  title: string
  report_type: string
  property_id: string | null
  scenario_id: string | null
  audience: string | null
  share_token: string | null
  share_url: string | null
  is_public: boolean
  view_count: number
  last_viewed_at: string | null
  property_address: string | null
  pdf_status: 'none' | 'generating' | 'ready'
  created_at: string
  updated_at: string
  report_data: ReportDataSnapshot | null
}

export interface ReportListResponse {
  reports: ReportResponse[]
  total: number
  page: number
  per_page: number
  pages: number
}

export interface SharedReportResponse {
  title: string
  report_type: string
  report_data: ReportDataSnapshot
  created_at: string
}

export interface CreateReportRequest {
  title: string
  report_type: string
  property_id: string
  scenario_id: string
  audience?: string
}

export interface PdfStatusResponse {
  status: 'none' | 'generating' | 'ready'
  download_url?: string
}

// ---------------------------------------------------------------------------
// Strategy Comparison types
// ---------------------------------------------------------------------------

export interface StrategyResult {
  strategy: string
  key_metric: number | null
  key_metric_label: string
  roi: number | null
  risk_score: number
  time_horizon: string
  break_even_months: number | null
  five_year_total_return: number | null
  monthly_cash_flow: number | null
  verdict: string
  outputs: Record<string, number | string | null>
}

export interface CompareResponse {
  strategies: StrategyResult[]
  recommendation: string
  recommendation_reason: string
}

// ---------------------------------------------------------------------------
// Transaction types
// ---------------------------------------------------------------------------

export interface Transaction {
  id: string
  property_id: string
  deal_id: string | null
  created_by: string
  team_id: string | null
  transaction_type: string
  amount: number
  description: string | null
  occurred_at: string
  category: string | null
  vendor: string | null
  is_deleted: boolean
  created_at: string
  updated_at: string
  property_address: string | null
}

export interface TransactionFilters {
  property_id?: string
  category?: string
  transaction_type?: string
  date_from?: string
  date_to?: string
  page?: number
  per_page?: number
}

export interface PaginatedTransactions {
  items: Transaction[]
  total: number
  page: number
  per_page: number
  pages: number
}

export interface TransactionMonthlySummary {
  month: string
  income: number
  expenses: number
  net: number
}

export interface TransactionSummary {
  by_month: TransactionMonthlySummary[]
  by_category: { category: string; total: number }[]
  by_property: { property_id: string; address: string; income: number; expenses: number; net: number }[]
}

export interface CreateTransactionRequest {
  property_id: string
  amount: number
  transaction_date: string
  category: string
  transaction_type: string
  description?: string
  notes?: string
  is_recurring?: boolean
  recurrence_interval?: string
  deal_id?: string
}

export interface BulkCreateResponse {
  created: number
  errors: string[]
}

// ---------------------------------------------------------------------------
// Rehab types
// ---------------------------------------------------------------------------

export interface RehabProject {
  id: string
  property_id: string
  deal_id: string | null
  created_by: string
  team_id: string | null
  name: string
  status: string
  estimated_budget: number | null
  actual_spent: number | null
  start_date: string | null
  target_completion: string | null
  actual_completion: string | null
  notes: string | null
  created_at: string
  updated_at: string
  item_count: number
  total_estimated: number
  total_actual: number
  budget_variance: number
  completion_pct: number
  property_address: string
}

export interface RehabItem {
  id: string
  project_id: string
  created_by: string
  category: string
  description: string
  estimated_cost: number | null
  actual_cost: number | null
  status: string
  contractor_name: string | null
  contractor_bid: number | null
  priority: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface RehabProjectDetail extends RehabProject {
  items: RehabItem[]
}

export interface RehabCategorySummary {
  category: string
  estimated: number
  actual: number
  variance: number
  item_count: number
  completed_count: number
}

export interface RehabProjectSummary {
  total_estimated: number
  total_actual: number
  total_variance: number
  overall_completion_pct: number
  by_category: RehabCategorySummary[]
}

export interface CreateRehabProjectRequest {
  property_id: string
  name: string
  deal_id?: string
  status?: string
  start_date?: string
  target_completion?: string
  notes?: string
  import_bricked?: boolean
}

export interface CreateRehabItemRequest {
  category: string
  description: string
  estimated_cost?: number
  actual_cost?: number
  status?: string
  contractor_name?: string
  contractor_bid?: number
  priority?: string
  notes?: string
}

// ---------------------------------------------------------------------------
// Portfolio V2 types
// ---------------------------------------------------------------------------

export interface PortfolioPropertyItem {
  id: string
  address: string
  city: string
  state: string
  zip_code: string
  estimated_value: number
  purchase_price: number | null
  equity: number
  debt: number
  monthly_income: number
  monthly_expenses: number
  monthly_cash_flow: number
  cap_rate: number | null
  coc_return: number | null
  appreciation_pct: number
  strategy: string | null
  instruments_count: number
  has_obligations: boolean
}

export interface PortfolioOverview {
  summary: {
    total_properties: number
    total_estimated_value: number
    total_equity: number
    total_debt: number
    total_monthly_income: number
    total_monthly_expenses: number
    total_monthly_cash_flow: number
    total_annual_cash_flow: number
    avg_cap_rate: number
    avg_coc_return: number
    ltv_ratio: number
  }
  properties: PortfolioPropertyItem[]
  equity_history: { month: string; total_equity: number; total_value: number }[]
  cash_flow_history: { month: string; income: number; expenses: number; net: number }[]
  allocation: {
    by_strategy: Record<string, number>
    by_value: Record<string, number>
  }
}

// ---------------------------------------------------------------------------
// Buyer + Buy Box types
// ---------------------------------------------------------------------------

export interface BuyBox {
  id: string
  contact_id: string
  name: string
  is_active: boolean
  target_markets: string[] | null
  max_distance_miles: number | null
  min_price: number | null
  max_price: number | null
  min_arv: number | null
  max_arv: number | null
  min_cash_flow: number | null
  min_cap_rate: number | null
  min_coc_return: number | null
  max_repair_cost: number | null
  property_types: string[] | null
  min_bedrooms: number | null
  min_bathrooms: number | null
  min_sqft: number | null
  max_year_built: number | null
  min_year_built: number | null
  strategies: string[] | null
  funding_type: string | null
  can_close_days: number | null
  proof_of_funds: boolean
  notes: string | null
  created_at: string
  updated_at: string
}

export interface BuyerListItem {
  id: string
  first_name: string
  last_name: string | null
  email: string | null
  phone: string | null
  company: string | null
  contact_type: string | null
  buy_boxes: BuyBox[]
  deal_count: number
  last_communication: string | null
  funding_type: string | null
  has_pof: boolean
}

export interface BuyerDetail extends BuyerListItem {
  notes: string | null
  tags: string[] | null
  deals: LinkedDeal[]
  total_deals_closed: number
  total_deal_volume: number
}

export interface MatchingPropertyItem {
  id: string
  address: string
  city: string
  state: string
  zip_code: string
  purchase_price: number | null
  after_repair_value: number | null
  property_type: string | null
  bedrooms: number | null
  bathrooms: number | null
  sqft: number | null
  strategy: string | null
}

export interface CreateBuyBoxRequest {
  name: string
  is_active?: boolean
  target_markets?: string[]
  min_price?: number
  max_price?: number
  min_arv?: number
  max_arv?: number
  min_cash_flow?: number
  min_cap_rate?: number
  min_coc_return?: number
  max_repair_cost?: number
  property_types?: string[]
  min_bedrooms?: number
  min_bathrooms?: number
  min_sqft?: number
  max_year_built?: number
  min_year_built?: number
  strategies?: string[]
  funding_type?: string
  can_close_days?: number
  proof_of_funds?: boolean
  notes?: string
}

export interface QuickAddBuyerRequest {
  first_name: string
  last_name?: string
  phone?: string
  email?: string
  company?: string
  funding_type?: string
  proof_of_funds?: boolean
  buy_box: CreateBuyBoxRequest
}

export interface BuyerFilters {
  funding_type?: string
  has_pof?: boolean
  market?: string
  strategy?: string
  q?: string
}
