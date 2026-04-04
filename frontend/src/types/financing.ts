// frontend/src/types/financing.ts
/** Financing module types — derived from backend schemas (backend/schemas/financing.py). */

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export type FinancingInstrumentType =
  | 'conventional_mortgage'
  | 'sub_to_mortgage'
  | 'seller_finance'
  | 'wrap_mortgage'
  | 'lease_option'
  | 'hard_money'
  | 'private_money'
  | 'heloc'
  | 'land_contract'

export type ObligationType =
  | 'monthly_payment'
  | 'balloon_payment'
  | 'insurance_renewal'
  | 'option_expiration'
  | 'rate_adjustment'
  | 'manual'

export type ObligationStatus = 'active' | 'completed' | 'snoozed'
export type ObligationSeverity = 'normal' | 'high' | 'critical'
export type PaymentDirection = 'outgoing' | 'incoming'
export type RateType = 'fixed' | 'adjustable' | 'interest_only'

export type PaymentType =
  | 'regular'
  | 'extra_principal'
  | 'balloon'
  | 'late_fee'
  | 'insurance'
  | 'tax'

export type PaymentMethod = 'bank_transfer' | 'check' | 'cash' | 'auto_pay'

// ---------------------------------------------------------------------------
// Core entities
// ---------------------------------------------------------------------------

export interface FinancingInstrument {
  id: string
  property_id: string
  deal_id: string | null
  created_by: string
  team_id: string | null
  name: string
  instrument_type: string
  position: number
  status: string

  // Core terms
  original_balance: number | null
  current_balance: number | null
  interest_rate: number | null
  rate_type: string | null
  term_months: number | null
  amortization_months: number | null
  monthly_payment: number | null

  // Dates
  origination_date: string | null
  maturity_date: string | null
  first_payment_date: string | null

  // Balloon
  has_balloon: boolean
  balloon_date: string | null
  balloon_amount: number | null

  // Sub-to
  is_sub_to: boolean
  original_borrower: string | null
  servicer: string | null
  loan_number_last4: string | null
  due_on_sale_risk: string | null

  // Wrap
  is_wrap: boolean
  underlying_instrument_id: string | null
  wrap_rate: number | null
  wrap_payment: number | null

  // Lease option
  option_consideration: number | null
  option_expiration: string | null
  monthly_credit: number | null
  strike_price: number | null

  // Seller finance
  down_payment: number | null
  late_fee_pct: number | null
  late_fee_grace_days: number | null
  prepayment_penalty: boolean

  // Insurance/escrow
  requires_insurance: boolean
  insurance_verified_date: string | null
  escrow_amount: number | null

  // Extended
  terms_extended: Record<string, unknown> | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface InstrumentListItem extends FinancingInstrument {
  months_remaining: number | null
  next_payment_due: string | null
  payoff_amount_estimate: number | null
  wrap_spread: WrapSpreadSummary | null
}

export interface InstrumentDetail extends FinancingInstrument {
  obligations: Obligation[]
  recent_payments: Payment[]
  wrap_spread: WrapSpreadSummary | null
  amortization_schedule: AmortizationEntry[]
}

export interface PaginatedInstruments {
  items: InstrumentListItem[]
  total: number
  page: number
  per_page: number
  pages: number
}

// ---------------------------------------------------------------------------
// Obligation
// ---------------------------------------------------------------------------

export interface Obligation {
  id: string
  instrument_id: string
  property_id: string
  created_by: string
  team_id: string | null
  obligation_type: string
  title: string
  description: string | null
  amount: number | null
  amount_type: string | null
  due_date: string | null
  recurrence: string | null
  recurrence_day: number | null
  next_due: string | null
  end_date: string | null
  status: string
  alert_days_before: number[] | null
  severity: string
  created_at: string
  updated_at: string
  // Computed fields (from ObligationWithComputed)
  days_until_due: number | null
  is_overdue: boolean
  instrument_name: string | null
  property_address: string | null
}

export interface ObligationGrouped {
  critical: Obligation[]
  high: Obligation[]
  normal: Obligation[]
}

export interface PaginatedObligations {
  items: Obligation[]
  total: number
  page: number
  per_page: number
  pages: number
}

// ---------------------------------------------------------------------------
// Payment
// ---------------------------------------------------------------------------

export interface Payment {
  id: string
  instrument_id: string
  obligation_id: string | null
  property_id: string
  created_by: string
  team_id: string | null
  payment_type: string
  amount: number
  principal_portion: number | null
  interest_portion: number | null
  escrow_portion: number | null
  payment_date: string
  due_date: string | null
  is_late: boolean
  late_fee_amount: number | null
  payment_method: string | null
  confirmation_number: string | null
  direction: string
  notes: string | null
  created_at: string
  updated_at: string
}

export interface PaginatedPayments {
  items: Payment[]
  total: number
  page: number
  per_page: number
  pages: number
}

// ---------------------------------------------------------------------------
// Wrap Spread
// ---------------------------------------------------------------------------

export interface WrapSpreadSummary {
  monthly_incoming: number
  monthly_outgoing: number
  monthly_spread: number
  annual_spread: number
  spread_margin_pct: number
  underlying_rate: number
  wrap_rate: number
  rate_spread: number
}

// ---------------------------------------------------------------------------
// Amortization
// ---------------------------------------------------------------------------

export interface AmortizationEntry {
  month: number
  payment_date: string | null
  payment: number
  principal: number
  interest: number
  balance: number
}

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

export interface BalloonAlert {
  instrument_name: string
  property_address: string
  balloon_date: string | null
  balloon_amount: number | null
  days_until: number | null
}

export interface WrapSpreadItem {
  property_address: string
  monthly_spread: number
  annual_spread: number
}

export interface DueOnSaleRiskItem {
  property_address: string
  instrument_name: string
  risk_level: string
}

export interface FinancingDashboard {
  total_instruments: number
  total_balance: number
  total_monthly_obligations: number
  total_monthly_income: number
  net_monthly_cash_flow: number
  upcoming_balloons: BalloonAlert[]
  wrap_spreads: WrapSpreadItem[]
  due_on_sale_risks: DueOnSaleRiskItem[]
}

// ---------------------------------------------------------------------------
// Payment Summary
// ---------------------------------------------------------------------------

export interface PropertyPaymentSummary {
  property_id: string
  address: string
  total: number
}

export interface MonthlyHistory {
  month: string
  incoming: number
  outgoing: number
  net: number
}

export interface PaymentSummaryResponse {
  total_outgoing_monthly: number
  total_incoming_monthly: number
  net_monthly: number
  outgoing_by_property: PropertyPaymentSummary[]
  incoming_by_property: PropertyPaymentSummary[]
  payment_history: MonthlyHistory[]
}

// ---------------------------------------------------------------------------
// Request types
// ---------------------------------------------------------------------------

export interface CreateInstrumentRequest {
  property_id: string
  deal_id?: string
  name: string
  instrument_type: string
  position?: number
  status?: string
  original_balance?: number
  current_balance?: number
  interest_rate?: number
  rate_type?: string
  term_months?: number
  amortization_months?: number
  monthly_payment?: number
  origination_date?: string
  maturity_date?: string
  first_payment_date?: string
  has_balloon?: boolean
  balloon_date?: string
  balloon_amount?: number
  is_sub_to?: boolean
  original_borrower?: string
  servicer?: string
  loan_number_last4?: string
  due_on_sale_risk?: string
  is_wrap?: boolean
  underlying_instrument_id?: string
  wrap_rate?: number
  wrap_payment?: number
  option_consideration?: number
  option_expiration?: string
  monthly_credit?: number
  strike_price?: number
  down_payment?: number
  late_fee_pct?: number
  late_fee_grace_days?: number
  prepayment_penalty?: boolean
  requires_insurance?: boolean
  insurance_verified_date?: string
  escrow_amount?: number
  terms_extended?: Record<string, unknown>
  notes?: string
}

export interface UpdateInstrumentRequest {
  [key: string]: unknown
}

export interface CompleteObligationRequest {
  payment_amount?: number
  payment_date?: string
  payment_method?: string
}

export interface UpdateObligationRequest {
  title?: string
  description?: string
  amount?: number
  next_due?: string
  status?: string
  severity?: string
  alert_days_before?: number[]
}

export interface CreatePaymentRequest {
  instrument_id: string
  obligation_id?: string
  property_id: string
  payment_type: string
  amount: number
  principal_portion?: number
  interest_portion?: number
  escrow_portion?: number
  payment_date: string
  due_date?: string
  is_late?: boolean
  late_fee_amount?: number
  payment_method?: string
  confirmation_number?: string
  direction?: string
  notes?: string
}

// ---------------------------------------------------------------------------
// Filter types
// ---------------------------------------------------------------------------

export interface InstrumentFilters {
  property_id?: string
  status?: string
  instrument_type?: string
  page?: number
  per_page?: number
}

export interface ObligationFilters {
  instrument_id?: string
  property_id?: string
  status?: string
  severity?: string
  due_before?: string
  due_after?: string
  page?: number
  per_page?: number
}

export interface PaymentFilters {
  instrument_id?: string
  property_id?: string
  direction?: string
  date_from?: string
  date_to?: string
  page?: number
  per_page?: number
}
