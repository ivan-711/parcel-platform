# Creative Finance Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the complete frontend for Parcel's creative finance module — Obligations page, Financing Dashboard, property financing tab, instrument/payment modals, types, API client, and React Query hooks.

**Architecture:** All financing data comes from 13 existing backend endpoints under `/api/financing/`. Frontend follows established patterns: lazy-loaded pages in AppShell, React Query hooks for data, Shadcn Dialog for simple modals, custom modals for multi-step wizards. All styling uses existing design tokens (no new colors/fonts).

**Tech Stack:** React 18, TypeScript, TanStack React Query, Framer Motion, Lucide icons, Tailwind CSS, Sonner toasts

---

## Task 1: Financing Types

**Files:**
- Create: `frontend/src/types/financing.ts`

All types derived from backend schemas in `backend/schemas/financing.py`. These types are used by every subsequent task.

- [ ] **Step 1: Create financing types file**

```typescript
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
```

- [ ] **Step 2: Verify no TypeScript errors**

Run: `cd /Users/ivanflores/parcel-platform/frontend && npx tsc --noEmit --pretty 2>&1 | tail -10`

Expected: No errors from `financing.ts`

- [ ] **Step 3: Commit**

```bash
git add frontend/src/types/financing.ts
git commit -m "feat: add financing module TypeScript types"
```

---

## Task 2: API Client — Financing Namespace

**Files:**
- Modify: `frontend/src/lib/api.ts:526` (add before closing brace of `api` object)

- [ ] **Step 1: Add financing namespace to API client**

Add the following before the final closing `}` of the `api` object (after the `billing` namespace ending at line 525):

```typescript
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
```

- [ ] **Step 2: Verify build**

Run: `cd /Users/ivanflores/parcel-platform/frontend && npx vite build 2>&1 | tail -5`

Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add frontend/src/lib/api.ts
git commit -m "feat: add financing namespace to API client"
```

---

## Task 3: React Query Hooks

**Files:**
- Create: `frontend/src/hooks/useFinancing.ts`

- [ ] **Step 1: Create financing hooks**

```typescript
// frontend/src/hooks/useFinancing.ts
/** Financing query and mutation hooks — wraps api.financing with React Query. */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import type {
  InstrumentFilters,
  ObligationFilters,
  PaymentFilters,
  CreateInstrumentRequest,
  UpdateInstrumentRequest,
  CompleteObligationRequest,
  UpdateObligationRequest,
  CreatePaymentRequest,
} from '@/types/financing'

// ---------------------------------------------------------------------------
// Instruments
// ---------------------------------------------------------------------------

export function useInstruments(filters?: InstrumentFilters) {
  return useQuery({
    queryKey: ['financing', 'instruments', filters],
    queryFn: () => api.financing.instruments.list(filters),
    staleTime: 30_000,
  })
}

export function useInstrument(id: string | undefined) {
  return useQuery({
    queryKey: ['financing', 'instruments', id],
    queryFn: () => api.financing.instruments.get(id!),
    enabled: !!id,
    staleTime: 30_000,
  })
}

export function useCreateInstrument() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateInstrumentRequest) => api.financing.instruments.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financing'] })
      toast.success('Instrument created')
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to create instrument')
    },
  })
}

export function useUpdateInstrument() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateInstrumentRequest }) =>
      api.financing.instruments.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financing'] })
      toast.success('Instrument updated')
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to update instrument')
    },
  })
}

export function useDeleteInstrument() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.financing.instruments.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financing'] })
      toast.success('Instrument deleted')
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to delete instrument')
    },
  })
}

// ---------------------------------------------------------------------------
// Obligations
// ---------------------------------------------------------------------------

export function useObligations(filters?: ObligationFilters) {
  return useQuery({
    queryKey: ['financing', 'obligations', filters],
    queryFn: () => api.financing.obligations.list(filters),
    staleTime: 30_000,
  })
}

export function useUpcomingObligations() {
  return useQuery({
    queryKey: ['financing', 'obligations', 'upcoming'],
    queryFn: () => api.financing.obligations.upcoming(),
    staleTime: 30_000,
  })
}

export function useCompleteObligation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: CompleteObligationRequest }) =>
      api.financing.obligations.complete(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financing'] })
      queryClient.invalidateQueries({ queryKey: ['today'] })
      toast.success('Obligation completed')
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to complete obligation')
    },
  })
}

export function useUpdateObligation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateObligationRequest }) =>
      api.financing.obligations.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financing'] })
      toast.success('Obligation updated')
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to update obligation')
    },
  })
}

// ---------------------------------------------------------------------------
// Payments
// ---------------------------------------------------------------------------

export function usePayments(filters?: PaymentFilters) {
  return useQuery({
    queryKey: ['financing', 'payments', filters],
    queryFn: () => api.financing.payments.list(filters),
    staleTime: 30_000,
  })
}

export function usePaymentSummary() {
  return useQuery({
    queryKey: ['financing', 'payments', 'summary'],
    queryFn: () => api.financing.payments.summary(),
    staleTime: 30_000,
  })
}

export function useRecordPayment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreatePaymentRequest) => api.financing.payments.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financing'] })
      queryClient.invalidateQueries({ queryKey: ['today'] })
      toast.success('Payment recorded')
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to record payment')
    },
  })
}

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

export function useFinancingDashboard() {
  return useQuery({
    queryKey: ['financing', 'dashboard'],
    queryFn: () => api.financing.dashboard(),
    staleTime: 30_000,
  })
}
```

- [ ] **Step 2: Verify build**

Run: `cd /Users/ivanflores/parcel-platform/frontend && npx vite build 2>&1 | tail -5`

Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add frontend/src/hooks/useFinancing.ts
git commit -m "feat: add React Query hooks for financing module"
```

---

## Task 4: Nav + Routes

**Files:**
- Modify: `frontend/src/components/layout/nav-data.ts:1-90`
- Modify: `frontend/src/App.tsx:1-203`

- [ ] **Step 1: Update nav-data.ts — unlock Obligations, add Financing**

In `nav-data.ts`, add `Landmark` to the lucide-react import (line 1). Then modify the ASSETS section (lines 66-73) to add Financing and unlock Obligations.

Add `Landmark` to the import on line 1:

```typescript
import {
  Calendar,
  LayoutGrid,
  Search,
  KanbanSquare,
  Building,
  Users,
  Tag,
  BarChart3,
  AlertTriangle,
  Hammer,
  DollarSign,
  FileText,
  Folder,
  Repeat,
  Mail,
  MapPin,
  Settings,
  Shield,
  MessageSquare,
  MoreHorizontal,
  Landmark,
} from 'lucide-react'
```

Replace the ASSETS section (lines 66-73):

```typescript
  {
    label: 'ASSETS',
    items: [
      { label: 'Portfolio', path: '/portfolio', icon: BarChart3 },
      { label: 'Financing', path: '/financing', icon: Landmark },
      { label: 'Obligations', path: '/obligations', icon: AlertTriangle },
      { label: 'Rehabs', path: '/rehabs', icon: Hammer, locked: true },
      { label: 'Transactions', path: '/transactions', icon: DollarSign },
    ],
  },
```

- [ ] **Step 2: Update App.tsx — add lazy imports and routes**

Add lazy imports after line 43 (`const LockedFeaturePage = ...`):

```typescript
const ObligationsPage = lazy(() => import('@/pages/financing/ObligationsPage'))
const FinancingDashboardPage = lazy(() => import('@/pages/financing/FinancingDashboardPage'))
```

Add routes after the `/transactions` route (line 164), before the locked feature routes block:

```typescript
        <Route path="/obligations" element={<ProtectedRoute><PageErrorBoundary><ObligationsPage /></PageErrorBoundary></ProtectedRoute>} />
        <Route path="/financing" element={<ProtectedRoute><PageErrorBoundary><FinancingDashboardPage /></PageErrorBoundary></ProtectedRoute>} />
```

Remove the locked `/obligations` route from the locked features block (line 169):

```typescript
        <Route path="/obligations" element={<ProtectedRoute><LockedFeaturePage /></ProtectedRoute>} />
```

Delete that line entirely.

- [ ] **Step 3: Verify build**

Run: `cd /Users/ivanflores/parcel-platform/frontend && npx vite build 2>&1 | tail -5`

Expected: Build will fail because the page components don't exist yet. That's expected — we'll create them in the next tasks. For now verify no syntax errors by checking TypeScript:

Run: `cd /Users/ivanflores/parcel-platform/frontend && npx tsc --noEmit 2>&1 | grep -v "Cannot find module" | tail -10`

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/layout/nav-data.ts frontend/src/App.tsx
git commit -m "feat: unlock Obligations nav, add Financing route and nav item"
```

---

## Task 5: Obligations Page

**Files:**
- Create: `frontend/src/pages/financing/ObligationsPage.tsx`

This is the largest single component. It shows all obligations grouped by severity with inline complete/snooze flows.

- [ ] **Step 1: Create ObligationsPage**

```typescript
// frontend/src/pages/financing/ObligationsPage.tsx
import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  AlertTriangle,
  DollarSign,
  Shield,
  Calendar,
  TrendingUp,
  Check,
  Clock,
  MoreHorizontal,
  CheckCircle,
  ChevronDown,
  ChevronRight,
} from 'lucide-react'
import { toast } from 'sonner'
import { AppShell } from '@/components/layout/AppShell'
import { EmptyState } from '@/components/EmptyState'
import { cn } from '@/lib/utils'
import { duration, ease } from '@/lib/motion'
import { useObligations, useCompleteObligation, useUpdateObligation } from '@/hooks/useFinancing'
import type { Obligation, CompleteObligationRequest } from '@/types/financing'

type TimeFilter = '7' | '30' | '90' | 'all'

const TIME_FILTERS: { label: string; value: TimeFilter }[] = [
  { label: 'Next 7 Days', value: '7' },
  { label: 'Next 30 Days', value: '30' },
  { label: 'Next 90 Days', value: '90' },
  { label: 'All', value: 'all' },
]

const OBLIGATION_ICONS: Record<string, React.ElementType> = {
  monthly_payment: DollarSign,
  balloon_payment: AlertTriangle,
  insurance_renewal: Shield,
  option_expiration: Calendar,
  rate_adjustment: TrendingUp,
  manual: Calendar,
}

const SEVERITY_COLORS: Record<string, { border: string; header: string; text: string }> = {
  overdue: { border: 'border-l-[#F87171]', header: 'bg-[#F87171]/10 text-[#F87171]', text: 'text-[#F87171]' },
  critical: { border: 'border-l-[#FBBF24]', header: 'bg-[#FBBF24]/10 text-[#FBBF24]', text: 'text-[#FBBF24]' },
  high: { border: 'border-l-[#FBBF24]', header: 'bg-[#FBBF24]/10 text-[#FBBF24]', text: 'text-[#FBBF24]' },
  normal: { border: 'border-l-[#8A8580]', header: 'bg-[#1E1D1B] text-[#C5C0B8]', text: 'text-[#C5C0B8]' },
}

function getDateFilter(filter: TimeFilter): string | undefined {
  if (filter === 'all') return undefined
  const d = new Date()
  d.setDate(d.getDate() + Number(filter))
  return d.toISOString().split('T')[0]
}

export default function ObligationsPage() {
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('30')
  const dueBefore = getDateFilter(timeFilter)

  const { data, isLoading } = useObligations({
    status: 'active',
    due_before: dueBefore,
    per_page: 200,
  })

  const obligations = data?.items ?? []

  // Group obligations
  const groups = useMemo(() => {
    const overdue: Obligation[] = []
    const critical: Obligation[] = []
    const high: Obligation[] = []
    const normal: Obligation[] = []

    for (const ob of obligations) {
      if (ob.is_overdue) {
        overdue.push(ob)
      } else if (ob.severity === 'critical') {
        critical.push(ob)
      } else if (ob.severity === 'high') {
        high.push(ob)
      } else {
        normal.push(ob)
      }
    }

    return { overdue, critical, high, normal }
  }, [obligations])

  const totalActive = obligations.length
  const overdueCount = groups.overdue.length
  const dueThisWeek = obligations.filter((o) => {
    if (!o.days_until_due || o.is_overdue) return false
    return o.days_until_due <= 7
  }).length

  // PostHog
  try {
    (window as any).posthog?.capture?.('obligations_page_viewed', {
      total_active: totalActive,
      overdue_count: overdueCount,
    })
  } catch { /* ignore */ }

  if (isLoading) {
    return (
      <AppShell title="Obligations">
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-[#141311] rounded-xl animate-pulse" />
          ))}
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell title="Obligations">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1
            className="text-xl sm:text-2xl text-[#F0EDE8] mb-4"
            style={{ fontFamily: 'Satoshi, sans-serif', fontWeight: 300 }}
          >
            Obligations
          </h1>

          {/* KPI row */}
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <KpiChip label="Active" value={totalActive} />
            <KpiChip label="Due This Week" value={dueThisWeek} />
            <KpiChip label="Overdue" value={overdueCount} variant={overdueCount > 0 ? 'danger' : 'default'} />
          </div>

          {/* Time filter */}
          <div className="flex items-center gap-1 p-1 bg-[#141311] rounded-lg border border-[#1E1D1B] w-fit">
            {TIME_FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setTimeFilter(f.value)}
                className={cn(
                  'px-3 py-1.5 text-xs rounded-md transition-colors cursor-pointer',
                  timeFilter === f.value
                    ? 'bg-[#8B7AFF]/15 text-[#8B7AFF]'
                    : 'text-[#8A8580] hover:text-[#C5C0B8]'
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Empty state */}
        {obligations.length === 0 && (
          <EmptyState
            icon={CheckCircle}
            heading="All clear — no upcoming obligations"
            description="Add financing instruments to your properties to start tracking obligations."
          />
        )}

        {/* Obligation groups */}
        {groups.overdue.length > 0 && (
          <ObligationGroup label="OVERDUE" severity="overdue" obligations={groups.overdue} />
        )}
        {groups.critical.length > 0 && (
          <ObligationGroup label="CRITICAL" severity="critical" obligations={groups.critical} />
        )}
        {groups.high.length > 0 && (
          <ObligationGroup label="HIGH" severity="high" obligations={groups.high} />
        )}
        {groups.normal.length > 0 && (
          <ObligationGroup label="NORMAL" severity="normal" obligations={groups.normal} />
        )}
      </div>
    </AppShell>
  )
}

/* ─── KPI Chip ─── */

function KpiChip({ label, value, variant = 'default' }: { label: string; value: number; variant?: 'default' | 'danger' }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-[#141311] border border-[#1E1D1B] rounded-lg">
      <span
        className={cn(
          'text-base font-medium tabular-nums',
          variant === 'danger' && value > 0 ? 'text-[#F87171]' : 'text-[#F0EDE8]'
        )}
      >
        {value}
      </span>
      <span className="text-xs text-[#8A8580]">{label}</span>
    </div>
  )
}

/* ─── Obligation Group ─── */

function ObligationGroup({
  label,
  severity,
  obligations,
}: {
  label: string
  severity: string
  obligations: Obligation[]
}) {
  const [collapsed, setCollapsed] = useState(false)
  const colors = SEVERITY_COLORS[severity] || SEVERITY_COLORS.normal

  return (
    <div>
      <button
        onClick={() => setCollapsed(!collapsed)}
        className={cn(
          'flex items-center gap-2 w-full px-3 py-2 rounded-lg text-xs font-medium uppercase tracking-wider mb-2 cursor-pointer',
          colors.header
        )}
      >
        {collapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
        {label}
        <span className="ml-auto opacity-70">{obligations.length}</span>
      </button>
      <AnimatePresence>
        {!collapsed && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: duration.normal, ease: ease.luxury as any }}
            className="space-y-2 overflow-hidden"
          >
            {obligations.map((ob) => (
              <ObligationCard key={ob.id} obligation={ob} severity={severity} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ─── Obligation Card ─── */

function ObligationCard({ obligation, severity }: { obligation: Obligation; severity: string }) {
  const navigate = useNavigate()
  const [showComplete, setShowComplete] = useState(false)
  const [showSnooze, setShowSnooze] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const completeMutation = useCompleteObligation()
  const updateMutation = useUpdateObligation()

  const colors = SEVERITY_COLORS[severity] || SEVERITY_COLORS.normal
  const Icon = OBLIGATION_ICONS[obligation.obligation_type] || Calendar

  const daysText = obligation.is_overdue
    ? `${Math.abs(obligation.days_until_due ?? 0)} days overdue`
    : obligation.days_until_due != null
      ? `in ${obligation.days_until_due} days`
      : ''

  const isBalloon = obligation.obligation_type === 'balloon_payment'

  return (
    <motion.div
      layout
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: duration.fast }}
      className={cn(
        'bg-[#141311] border border-[#1E1D1B] border-l-[3px] rounded-xl p-4',
        colors.border
      )}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className="w-8 h-8 rounded-lg bg-[#0C0B0A] flex items-center justify-center shrink-0">
          <Icon size={14} className={colors.text} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm text-[#F0EDE8] font-medium">{obligation.title}</p>
              <p className="text-xs text-[#8A8580] mt-0.5 truncate">
                {obligation.instrument_name}
                {obligation.property_address && ` · ${obligation.property_address}`}
              </p>
            </div>

            <div className="text-right shrink-0">
              {obligation.amount != null && (
                <p className="text-base text-[#F0EDE8] font-medium tabular-nums">
                  ${Number(obligation.amount).toLocaleString()}
                </p>
              )}
              {isBalloon && obligation.days_until_due != null && !obligation.is_overdue && (
                <p className={cn('text-2xl font-bold tabular-nums mt-1', colors.text)}>
                  {obligation.days_until_due} <span className="text-xs font-normal">DAYS</span>
                </p>
              )}
            </div>
          </div>

          {/* Due date line */}
          <div className="flex items-center gap-3 mt-2">
            {obligation.next_due && (
              <span className="text-xs text-[#8A8580]">
                Due {new Date(obligation.next_due).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            )}
            {daysText && (
              <span className={cn('text-xs font-medium', obligation.is_overdue ? 'text-[#F87171]' : colors.text)}>
                {daysText}
              </span>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 mt-3">
            <button
              onClick={() => { setShowComplete(!showComplete); setShowSnooze(false) }}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-md bg-[#4ADE80]/10 text-[#4ADE80] hover:bg-[#4ADE80]/20 transition-colors cursor-pointer"
            >
              <Check size={12} /> Complete
            </button>
            <button
              onClick={() => { setShowSnooze(!showSnooze); setShowComplete(false) }}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-md bg-[#1E1D1B] text-[#C5C0B8] hover:bg-[#2A2826] transition-colors cursor-pointer"
            >
              <Clock size={12} /> Snooze
            </button>
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-1.5 rounded-md text-[#8A8580] hover:bg-[#1E1D1B] transition-colors cursor-pointer"
              >
                <MoreHorizontal size={14} />
              </button>
              {showMenu && (
                <div className="absolute right-0 top-8 z-10 w-44 bg-[#141311] border border-[#1E1D1B] rounded-lg shadow-xl py-1">
                  <button
                    onClick={() => { navigate(`/properties/${obligation.property_id}?tab=financing`); setShowMenu(false) }}
                    className="w-full text-left px-3 py-2 text-xs text-[#C5C0B8] hover:bg-[#1E1D1B] cursor-pointer"
                  >
                    View Property
                  </button>
                  <button
                    onClick={() => setShowMenu(false)}
                    className="w-full text-left px-3 py-2 text-xs text-[#C5C0B8] hover:bg-[#1E1D1B] cursor-pointer"
                  >
                    Edit
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Complete inline form */}
      <AnimatePresence>
        {showComplete && (
          <CompleteForm
            obligation={obligation}
            onComplete={(data) => {
              completeMutation.mutate(
                { id: obligation.id, data },
                {
                  onSuccess: () => {
                    setShowComplete(false)
                    try {
                      (window as any).posthog?.capture?.('obligation_completed_ui', {
                        obligation_type: obligation.obligation_type,
                        was_overdue: obligation.is_overdue,
                        had_payment: !!data.payment_amount,
                      })
                    } catch { /* ignore */ }
                  },
                }
              )
            }}
            isPending={completeMutation.isPending}
          />
        )}
      </AnimatePresence>

      {/* Snooze form */}
      <AnimatePresence>
        {showSnooze && (
          <SnoozeForm
            onSnooze={(newDate) => {
              const daysFromNow = Math.round((new Date(newDate).getTime() - Date.now()) / 86_400_000)
              updateMutation.mutate(
                { id: obligation.id, data: { status: 'snoozed', next_due: newDate } },
                {
                  onSuccess: () => {
                    setShowSnooze(false)
                    try {
                      (window as any).posthog?.capture?.('obligation_snoozed', {
                        obligation_type: obligation.obligation_type,
                        snooze_days: daysFromNow,
                      })
                    } catch { /* ignore */ }
                  },
                }
              )
            }}
            isPending={updateMutation.isPending}
          />
        )}
      </AnimatePresence>

      {/* Click outside to close menu */}
      {showMenu && <div className="fixed inset-0 z-0" onClick={() => setShowMenu(false)} />}
    </motion.div>
  )
}

/* ─── Complete Form ─── */

function CompleteForm({
  obligation,
  onComplete,
  isPending,
}: {
  obligation: Obligation
  onComplete: (data: CompleteObligationRequest) => void
  isPending: boolean
}) {
  const [amount, setAmount] = useState(obligation.amount != null ? String(obligation.amount) : '')
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0])
  const [method, setMethod] = useState('bank_transfer')

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="mt-3 pt-3 border-t border-[#1E1D1B] overflow-hidden"
    >
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="text-[10px] uppercase tracking-wider text-[#8A8580] mb-1 block">Amount</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full px-3 py-2 bg-[#0C0B0A] border border-[#1E1D1B] rounded-lg text-sm text-[#F0EDE8] focus:border-[#8B7AFF] outline-none"
            placeholder="0.00"
          />
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-wider text-[#8A8580] mb-1 block">Date</label>
          <input
            type="date"
            value={paymentDate}
            onChange={(e) => setPaymentDate(e.target.value)}
            className="w-full px-3 py-2 bg-[#0C0B0A] border border-[#1E1D1B] rounded-lg text-sm text-[#F0EDE8] focus:border-[#8B7AFF] outline-none"
          />
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-wider text-[#8A8580] mb-1 block">Method</label>
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            className="w-full px-3 py-2 bg-[#0C0B0A] border border-[#1E1D1B] rounded-lg text-sm text-[#F0EDE8] focus:border-[#8B7AFF] outline-none"
          >
            <option value="bank_transfer">Bank Transfer</option>
            <option value="check">Check</option>
            <option value="cash">Cash</option>
            <option value="auto_pay">Auto-Pay</option>
          </select>
        </div>
      </div>
      <button
        onClick={() => onComplete({
          payment_amount: amount ? Number(amount) : undefined,
          payment_date: paymentDate,
          payment_method: method,
        })}
        disabled={isPending}
        className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg bg-[#4ADE80] text-[#0C0B0A] font-medium hover:bg-[#3FCF70] transition-colors disabled:opacity-50 cursor-pointer"
      >
        <Check size={14} />
        {isPending ? 'Recording...' : 'Record Payment'}
      </button>
    </motion.div>
  )
}

/* ─── Snooze Form ─── */

function SnoozeForm({
  onSnooze,
  isPending,
}: {
  onSnooze: (date: string) => void
  isPending: boolean
}) {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 7)
  const [snoozeDate, setSnoozeDate] = useState(tomorrow.toISOString().split('T')[0])

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="mt-3 pt-3 border-t border-[#1E1D1B] overflow-hidden"
    >
      <div className="flex items-end gap-3">
        <div className="flex-1">
          <label className="text-[10px] uppercase tracking-wider text-[#8A8580] mb-1 block">Snooze until</label>
          <input
            type="date"
            value={snoozeDate}
            onChange={(e) => setSnoozeDate(e.target.value)}
            className="w-full px-3 py-2 bg-[#0C0B0A] border border-[#1E1D1B] rounded-lg text-sm text-[#F0EDE8] focus:border-[#8B7AFF] outline-none"
          />
        </div>
        <button
          onClick={() => onSnooze(snoozeDate)}
          disabled={isPending}
          className="px-4 py-2 text-sm rounded-lg bg-[#1E1D1B] text-[#C5C0B8] hover:bg-[#2A2826] transition-colors disabled:opacity-50 cursor-pointer"
        >
          {isPending ? 'Snoozing...' : 'Snooze'}
        </button>
      </div>
    </motion.div>
  )
}
```

- [ ] **Step 2: Verify build**

Run: `cd /Users/ivanflores/parcel-platform/frontend && npx vite build 2>&1 | tail -5`

Expected: Build succeeds (or only fails on FinancingDashboardPage not existing yet)

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/financing/ObligationsPage.tsx
git commit -m "feat: add Obligations page with severity groups, complete/snooze flows"
```

---

## Task 6: Financing Dashboard Page

**Files:**
- Create: `frontend/src/pages/financing/FinancingDashboardPage.tsx`

- [ ] **Step 1: Create FinancingDashboardPage**

```typescript
// frontend/src/pages/financing/FinancingDashboardPage.tsx
import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Landmark,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { EmptyState } from '@/components/EmptyState'
import { cn } from '@/lib/utils'
import { useFinancingDashboard } from '@/hooks/useFinancing'
import type { BalloonAlert, DueOnSaleRiskItem } from '@/types/financing'

export default function FinancingDashboardPage() {
  const { data, isLoading } = useFinancingDashboard()

  // PostHog
  if (data) {
    try {
      (window as any).posthog?.capture?.('financing_dashboard_viewed', {
        total_instruments: data.total_instruments,
        has_wraps: data.wrap_spreads.length > 0,
        total_balance: data.total_balance,
      })
    } catch { /* ignore */ }
  }

  if (isLoading) {
    return (
      <AppShell title="Financing">
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 bg-[#141311] rounded-xl animate-pulse" />
            ))}
          </div>
          <div className="h-60 bg-[#141311] rounded-xl animate-pulse" />
        </div>
      </AppShell>
    )
  }

  if (!data || data.total_instruments === 0) {
    return (
      <AppShell title="Financing">
        <EmptyState
          icon={Landmark}
          heading="No financing instruments yet"
          description="Add instruments to your properties to see your financing overview here."
          ctaLabel="View Properties"
          ctaHref="/properties"
        />
      </AppShell>
    )
  }

  const urgentBalloons = data.upcoming_balloons.filter((b) => (b.days_until ?? 999) < 90)

  return (
    <AppShell title="Financing">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1
            className="text-xl sm:text-2xl text-[#F0EDE8]"
            style={{ fontFamily: 'Satoshi, sans-serif', fontWeight: 300 }}
          >
            Financing Dashboard
          </h1>
          <Link
            to="/obligations"
            className="text-xs text-[#8B7AFF] hover:text-[#A89FFF] transition-colors"
          >
            View Obligations →
          </Link>
        </div>

        {/* KPI Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiCard
            label="Active Instruments"
            value={String(data.total_instruments)}
            icon={Landmark}
          />
          <KpiCard
            label="Total Debt Balance"
            value={`$${formatCompact(data.total_balance)}`}
            icon={DollarSign}
          />
          <KpiCard
            label="Monthly Net Cash Flow"
            value={`${data.net_monthly_cash_flow >= 0 ? '+' : ''}$${formatCompact(Math.abs(data.net_monthly_cash_flow))}`}
            icon={data.net_monthly_cash_flow >= 0 ? ArrowUpRight : ArrowDownRight}
            variant={data.net_monthly_cash_flow >= 0 ? 'success' : 'danger'}
          />
          <KpiCard
            label="Upcoming Balloons"
            value={String(data.upcoming_balloons.length)}
            icon={AlertTriangle}
            variant={urgentBalloons.length > 0 ? 'danger' : 'default'}
            subtitle={urgentBalloons.length > 0 ? `${urgentBalloons.length} within 90 days` : undefined}
          />
        </div>

        {/* Wrap Spreads */}
        {data.wrap_spreads.length > 0 && (
          <Section title="Active Wrap Spreads">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[10px] uppercase tracking-wider text-[#8A8580] border-b border-[#1E1D1B]">
                    <th className="text-left py-2 pr-4">Property</th>
                    <th className="text-right py-2 px-4">Monthly Spread</th>
                    <th className="text-right py-2 pl-4">Annual Spread</th>
                  </tr>
                </thead>
                <tbody>
                  {data.wrap_spreads.map((ws, i) => (
                    <tr key={i} className="border-b border-[#1E1D1B]/50 last:border-0">
                      <td className="py-3 pr-4 text-[#F0EDE8]">{ws.property_address}</td>
                      <td className="py-3 px-4 text-right text-[#4ADE80] tabular-nums font-medium">
                        ${ws.monthly_spread.toLocaleString()}
                      </td>
                      <td className="py-3 pl-4 text-right text-[#C5C0B8] tabular-nums">
                        ${ws.annual_spread.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-[#1E1D1B]">
                    <td className="py-3 pr-4 text-xs text-[#8A8580] font-medium">TOTAL</td>
                    <td className="py-3 px-4 text-right text-[#4ADE80] tabular-nums font-medium">
                      ${data.wrap_spreads.reduce((s, w) => s + w.monthly_spread, 0).toLocaleString()}
                    </td>
                    <td className="py-3 pl-4 text-right text-[#C5C0B8] tabular-nums">
                      ${data.wrap_spreads.reduce((s, w) => s + w.annual_spread, 0).toLocaleString()}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </Section>
        )}

        {/* Due-on-Sale Risk Monitor */}
        {data.due_on_sale_risks.length > 0 && (
          <Section title="Due-on-Sale Risk">
            <div className="space-y-2">
              {data.due_on_sale_risks.map((risk, i) => (
                <DueOnSaleRiskCard key={i} risk={risk} />
              ))}
            </div>
          </Section>
        )}

        {/* Upcoming Balloons Timeline */}
        {data.upcoming_balloons.length > 0 && (
          <Section title="Upcoming Balloons">
            <div className="flex gap-3 overflow-x-auto scrollbar-luxury pb-1">
              {data.upcoming_balloons.map((balloon, i) => (
                <BalloonCard key={i} balloon={balloon} />
              ))}
            </div>
          </Section>
        )}
      </div>
    </AppShell>
  )
}

/* ─── KPI Card ─── */

function KpiCard({
  label,
  value,
  icon: Icon,
  variant = 'default',
  subtitle,
}: {
  label: string
  value: string
  icon: React.ElementType
  variant?: 'default' | 'success' | 'danger'
  subtitle?: string
}) {
  const valueColor =
    variant === 'success' ? 'text-[#4ADE80]' :
    variant === 'danger' ? 'text-[#F87171]' :
    'text-[#F0EDE8]'

  return (
    <div className="bg-[#141311] border border-[#1E1D1B] rounded-xl p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon size={14} className="text-[#8A8580]" />
        <span className="text-[10px] uppercase tracking-wider text-[#8A8580]">{label}</span>
      </div>
      <p className={cn('text-xl font-medium tabular-nums', valueColor)}>{value}</p>
      {subtitle && <p className="text-xs text-[#F87171] mt-1">{subtitle}</p>}
    </div>
  )
}

/* ─── Section ─── */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-[#141311] border border-[#1E1D1B] rounded-xl p-5">
      <h3 className="text-[11px] uppercase tracking-wider text-[#8A8580] font-medium mb-4">
        {title}
      </h3>
      {children}
    </div>
  )
}

/* ─── Due-on-Sale Risk Card ─── */

const RISK_BADGE: Record<string, string> = {
  high: 'bg-[#F87171]/15 text-[#F87171] border-[#F87171]/30',
  medium: 'bg-[#FBBF24]/15 text-[#FBBF24] border-[#FBBF24]/30',
  low: 'bg-[#4ADE80]/15 text-[#4ADE80] border-[#4ADE80]/30',
}

function DueOnSaleRiskCard({ risk }: { risk: DueOnSaleRiskItem }) {
  const badge = RISK_BADGE[risk.risk_level] || RISK_BADGE.low
  return (
    <div className="flex items-center justify-between p-3 rounded-lg bg-[#0C0B0A] border border-[#1E1D1B]">
      <div className="min-w-0">
        <p className="text-sm text-[#F0EDE8] truncate">{risk.property_address}</p>
        <p className="text-xs text-[#8A8580] mt-0.5">{risk.instrument_name}</p>
      </div>
      <span className={cn('text-[10px] uppercase tracking-wider px-2 py-0.5 rounded border shrink-0 ml-3', badge)}>
        {risk.risk_level}
      </span>
    </div>
  )
}

/* ─── Balloon Card ─── */

function BalloonCard({ balloon }: { balloon: BalloonAlert }) {
  const days = balloon.days_until ?? 999
  const color =
    days < 90 ? 'text-[#F87171]' :
    days < 180 ? 'text-[#FBBF24]' :
    'text-[#4ADE80]'

  const borderColor =
    days < 90 ? 'border-l-[#F87171]' :
    days < 180 ? 'border-l-[#FBBF24]' :
    'border-l-[#4ADE80]'

  return (
    <div className={cn('flex-shrink-0 w-[260px] bg-[#0C0B0A] border border-[#1E1D1B] border-l-[3px] rounded-xl p-4', borderColor)}>
      <p className="text-sm text-[#F0EDE8] font-medium truncate">{balloon.property_address}</p>
      <p className="text-xs text-[#8A8580] mt-1">{balloon.instrument_name}</p>
      {balloon.balloon_amount != null && (
        <p className="text-lg text-[#F0EDE8] font-medium tabular-nums mt-2">
          ${Number(balloon.balloon_amount).toLocaleString()}
        </p>
      )}
      <div className="flex items-center justify-between mt-2">
        {balloon.balloon_date && (
          <span className="text-xs text-[#8A8580]">
            {new Date(balloon.balloon_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </span>
        )}
        <span className={cn('text-sm font-bold tabular-nums', color)}>
          {days} days
        </span>
      </div>
    </div>
  )
}

/* ─── Helpers ─── */

function formatCompact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`
  return n.toLocaleString()
}
```

- [ ] **Step 2: Verify build**

Run: `cd /Users/ivanflores/parcel-platform/frontend && npx vite build 2>&1 | tail -5`

Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/financing/FinancingDashboardPage.tsx
git commit -m "feat: add Financing Dashboard with KPIs, wrap spreads, balloon timeline, risk monitor"
```

---

## Task 7: Property Detail — Financing Tab

**Files:**
- Modify: `frontend/src/pages/properties/PropertyDetailPage.tsx`

Add a "Financing" tab between Financials and Documents.

- [ ] **Step 1: Add imports and tab definition**

Add `Landmark` to the lucide-react import at line 1. Add financing hook import after the existing hook imports. Add financing types import.

At the top, add to imports:

```typescript
import { useInstruments } from '@/hooks/useFinancing'
import type { InstrumentListItem } from '@/types/financing'
```

Add `Landmark` to the lucide-react import list.

Change the TABS array (line 35-40) to include Financing:

```typescript
const TABS = [
  { key: 'overview', label: 'Overview', icon: Building },
  { key: 'financials', label: 'Financials', icon: BarChart3 },
  { key: 'financing', label: 'Financing', icon: Landmark },
  { key: 'documents', label: 'Documents', icon: FileText },
  { key: 'activity', label: 'Activity', icon: Activity },
] as const
```

- [ ] **Step 2: Add instruments data fetch and tab content**

In `PropertyDetailPage` component, add the instruments query after the existing queries (after line 79):

```typescript
  const { data: instrumentsData } = useInstruments({ property_id: propertyId })
```

Add the financing tab content rendering after the financials tab block and before the documents tab block:

```typescript
          {activeTab === 'financing' && (
            <FinancingTab
              instruments={instrumentsData?.items ?? []}
              propertyId={propertyId!}
              propertyAddress={property.address_line1}
            />
          )}
```

- [ ] **Step 3: Create the FinancingTab component**

Add this component after the FinancialsTab component (after line 463):

```typescript
/* ─── Financing Tab ─── */

const INSTRUMENT_TYPE_COLORS: Record<string, string> = {
  sub_to_mortgage: 'bg-[#FBBF24]/15 text-[#FBBF24] border-[#FBBF24]/30',
  seller_finance: 'bg-[#8B7AFF]/15 text-[#A89FFF] border-[#8B7AFF]/30',
  wrap_mortgage: 'bg-[#60A5FA]/15 text-[#93C5FD] border-[#60A5FA]/30',
  lease_option: 'bg-[#2DD4BF]/15 text-[#2DD4BF] border-[#2DD4BF]/30',
  conventional_mortgage: 'bg-[#8A8580]/15 text-[#C5C0B8] border-[#8A8580]/30',
  hard_money: 'bg-[#F87171]/15 text-[#F87171] border-[#F87171]/30',
  private_money: 'bg-[#C084FC]/15 text-[#C084FC] border-[#C084FC]/30',
  heloc: 'bg-[#34D399]/15 text-[#34D399] border-[#34D399]/30',
  land_contract: 'bg-[#FB923C]/15 text-[#FB923C] border-[#FB923C]/30',
}

const INSTRUMENT_STATUS_COLORS: Record<string, string> = {
  active: 'bg-[#4ADE80]/15 text-[#4ADE80] border-[#4ADE80]/30',
  paid_off: 'bg-[#8A8580]/15 text-[#C5C0B8] border-[#8A8580]/30',
  defaulted: 'bg-[#F87171]/15 text-[#F87171] border-[#F87171]/30',
}

function FinancingTab({
  instruments,
  propertyId,
  propertyAddress,
}: {
  instruments: InstrumentListItem[]
  propertyId: string
  propertyAddress: string
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // Find wrap + underlying pairs for visualization
  const wrapInstrument = instruments.find((i) => i.is_wrap)
  const underlyingInstrument = wrapInstrument?.underlying_instrument_id
    ? instruments.find((i) => i.id === wrapInstrument.underlying_instrument_id)
    : null

  if (instruments.length === 0) {
    return (
      <div className="space-y-4">
        <EmptyState
          icon={Landmark}
          heading="No financing instruments"
          description="Add an instrument to track mortgages, wraps, and other financing on this property."
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Wrap visualization */}
      {wrapInstrument && underlyingInstrument && wrapInstrument.wrap_spread && (
        <Card title="Wrap Flow">
          <div className="flex items-center justify-center gap-4 py-4 flex-wrap">
            <div className="text-center p-3 bg-[#0C0B0A] rounded-lg border border-[#1E1D1B]">
              <p className="text-[10px] uppercase tracking-wider text-[#8A8580] mb-1">Buyer Pays You</p>
              <p className="text-lg text-[#F0EDE8] font-medium tabular-nums">
                ${Number(wrapInstrument.wrap_payment ?? 0).toLocaleString()}/mo
              </p>
            </div>
            <div className="text-[#8A8580]">→</div>
            <div className="text-center p-3 bg-[#4ADE80]/5 rounded-lg border border-[#4ADE80]/20">
              <p className="text-[10px] uppercase tracking-wider text-[#4ADE80] mb-1">Your Spread</p>
              <p className="text-lg text-[#4ADE80] font-medium tabular-nums">
                ${wrapInstrument.wrap_spread.monthly_spread.toLocaleString()}/mo
              </p>
            </div>
            <div className="text-[#8A8580]">→</div>
            <div className="text-center p-3 bg-[#0C0B0A] rounded-lg border border-[#1E1D1B]">
              <p className="text-[10px] uppercase tracking-wider text-[#8A8580] mb-1">You Pay Lender</p>
              <p className="text-lg text-[#F0EDE8] font-medium tabular-nums">
                ${Number(underlyingInstrument.monthly_payment ?? 0).toLocaleString()}/mo
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Instruments list */}
      <Card title="Instruments">
        <div className="space-y-3">
          {instruments.map((inst) => {
            const typeColor = INSTRUMENT_TYPE_COLORS[inst.instrument_type] || INSTRUMENT_TYPE_COLORS.conventional_mortgage
            const statusColor = INSTRUMENT_STATUS_COLORS[inst.status] || INSTRUMENT_STATUS_COLORS.active
            const isExpanded = expandedId === inst.id
            const typeLabel = inst.instrument_type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())

            return (
              <div key={inst.id} className="bg-[#0C0B0A] border border-[#1E1D1B] rounded-lg overflow-hidden">
                <button
                  onClick={() => {
                    setExpandedId(isExpanded ? null : inst.id)
                    try {
                      (window as any).posthog?.capture?.('instrument_detail_expanded', {
                        instrument_type: inst.instrument_type,
                        property_id: propertyId,
                      })
                    } catch { /* ignore */ }
                  }}
                  className="w-full text-left p-4 hover:bg-[#141311] transition-colors cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm text-[#F0EDE8] font-medium">{inst.name}</span>
                        <span className={cn('text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded border', typeColor)}>
                          {typeLabel}
                        </span>
                        <span className={cn('text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded border', statusColor)}>
                          {inst.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1.5 text-xs text-[#8A8580]">
                        <span>Position: {inst.position}{inst.position === 1 ? 'st' : inst.position === 2 ? 'nd' : 'rd'}</span>
                        {inst.interest_rate != null && <span>{Number(inst.interest_rate)}% rate</span>}
                        {inst.monthly_payment != null && <span>${Number(inst.monthly_payment).toLocaleString()}/mo</span>}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      {inst.current_balance != null && (
                        <p className="text-base text-[#F0EDE8] font-medium tabular-nums">
                          ${Number(inst.current_balance).toLocaleString()}
                        </p>
                      )}
                      {inst.maturity_date && (
                        <p className="text-xs text-[#8A8580] mt-0.5">
                          Matures {new Date(inst.maturity_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Balloon callout */}
                  {inst.has_balloon && inst.balloon_amount != null && (
                    <div className="mt-2 px-2 py-1 bg-[#FBBF24]/10 rounded text-xs text-[#FBBF24] inline-block">
                      BALLOON: ${Number(inst.balloon_amount).toLocaleString()}
                      {inst.balloon_date && ` · ${new Date(inst.balloon_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`}
                    </div>
                  )}

                  {/* Wrap spread inline */}
                  {inst.wrap_spread && (
                    <div className="mt-2 px-2 py-1 bg-[#4ADE80]/10 rounded text-xs text-[#4ADE80] inline-block">
                      Spread: ${inst.wrap_spread.monthly_spread.toLocaleString()}/mo
                    </div>
                  )}
                </button>

                {/* Expanded detail — will be implemented in Task 7 Step 4 */}
                {isExpanded && <InstrumentExpandedDetail instrumentId={inst.id} />}
              </div>
            )
          })}
        </div>
      </Card>
    </div>
  )
}

/* ─── Instrument Expanded Detail ─── */

function InstrumentExpandedDetail({ instrumentId }: { instrumentId: string }) {
  const { data: detail, isLoading } = useInstrument(instrumentId)

  if (isLoading) {
    return <div className="p-4 border-t border-[#1E1D1B]"><div className="h-20 bg-[#141311] rounded animate-pulse" /></div>
  }

  if (!detail) return null

  return (
    <div className="p-4 border-t border-[#1E1D1B] space-y-4">
      {/* Amortization schedule (next 12 months) */}
      {detail.amortization_schedule.length > 0 && (
        <div>
          <h4 className="text-[10px] uppercase tracking-wider text-[#8A8580] mb-2">Amortization (Next 12 Months)</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-[10px] uppercase tracking-wider text-[#8A8580] border-b border-[#1E1D1B]">
                  <th className="text-left py-1.5 pr-3">Month</th>
                  <th className="text-right py-1.5 px-3">Payment</th>
                  <th className="text-right py-1.5 px-3">Principal</th>
                  <th className="text-right py-1.5 px-3">Interest</th>
                  <th className="text-right py-1.5 pl-3">Balance</th>
                </tr>
              </thead>
              <tbody>
                {detail.amortization_schedule.slice(0, 12).map((row) => (
                  <tr key={row.month} className="border-b border-[#1E1D1B]/30 last:border-0">
                    <td className="py-1.5 pr-3 text-[#C5C0B8]">{row.month}</td>
                    <td className="py-1.5 px-3 text-right text-[#F0EDE8] tabular-nums">${row.payment.toLocaleString()}</td>
                    <td className="py-1.5 px-3 text-right text-[#C5C0B8] tabular-nums">${row.principal.toLocaleString()}</td>
                    <td className="py-1.5 px-3 text-right text-[#C5C0B8] tabular-nums">${row.interest.toLocaleString()}</td>
                    <td className="py-1.5 pl-3 text-right text-[#F0EDE8] tabular-nums">${row.balance.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Recent payments */}
      {detail.recent_payments.length > 0 && (
        <div>
          <h4 className="text-[10px] uppercase tracking-wider text-[#8A8580] mb-2">Recent Payments</h4>
          <div className="space-y-1">
            {detail.recent_payments.slice(0, 10).map((p) => (
              <div key={p.id} className="flex items-center justify-between py-1.5 text-xs">
                <span className="text-[#C5C0B8]">
                  {new Date(p.payment_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
                <span className={cn('tabular-nums font-medium', p.direction === 'incoming' ? 'text-[#4ADE80]' : 'text-[#F0EDE8]')}>
                  {p.direction === 'incoming' ? '+' : '-'}${Number(p.amount).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active obligations */}
      {detail.obligations.length > 0 && (
        <div>
          <h4 className="text-[10px] uppercase tracking-wider text-[#8A8580] mb-2">Active Obligations</h4>
          <div className="space-y-1">
            {detail.obligations.filter((o) => o.status === 'active').map((ob) => (
              <div key={ob.id} className="flex items-center justify-between py-1.5 text-xs">
                <span className="text-[#C5C0B8]">{ob.title}</span>
                <span className="text-[#8A8580]">
                  {ob.next_due ? new Date(ob.next_due).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Add missing import for useState**

Make sure `useState` is imported at the top of `PropertyDetailPage.tsx`. Check if it's already imported from react — if not, add it. The existing file imports `useParams, useSearchParams, Link, useNavigate` from react-router-dom but does not appear to import `useState`. Add to the top:

```typescript
import { useState } from 'react'
```

Also import `useInstrument` hook:

```typescript
import { useInstruments, useInstrument } from '@/hooks/useFinancing'
```

- [ ] **Step 5: Verify build**

Run: `cd /Users/ivanflores/parcel-platform/frontend && npx vite build 2>&1 | tail -5`

Expected: Build succeeds

- [ ] **Step 6: Commit**

```bash
git add frontend/src/pages/properties/PropertyDetailPage.tsx
git commit -m "feat: add Financing tab to property detail with instruments, wrap viz, amortization"
```

---

## Task 8: Add Instrument Modal

**Files:**
- Create: `frontend/src/components/financing/AddInstrumentModal.tsx`
- Modify: `frontend/src/pages/properties/PropertyDetailPage.tsx` (add button to open modal)

- [ ] **Step 1: Create AddInstrumentModal**

```typescript
// frontend/src/components/financing/AddInstrumentModal.tsx
import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  Building,
  ArrowRight,
  ArrowLeft,
  DollarSign,
  FileText,
  Shield,
  Key,
  Landmark,
  Layers,
  BookOpen,
  Home,
  Check,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useCreateInstrument } from '@/hooks/useFinancing'
import type { CreateInstrumentRequest, FinancingInstrumentType } from '@/types/financing'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  propertyId: string
  propertyAddress: string
  /** Existing instruments on this property — for wrap underlying selector */
  existingInstruments?: { id: string; name: string }[]
}

const INSTRUMENT_TYPES: {
  type: FinancingInstrumentType
  label: string
  description: string
  icon: React.ElementType
}[] = [
  { type: 'conventional_mortgage', label: 'Conventional Mortgage', description: 'Standard bank loan', icon: Landmark },
  { type: 'sub_to_mortgage', label: 'Sub-To Mortgage', description: 'Subject to existing loan', icon: Key },
  { type: 'seller_finance', label: 'Seller Finance', description: 'Owner-financed purchase', icon: Home },
  { type: 'wrap_mortgage', label: 'Wrap Mortgage', description: 'Wrap around existing debt', icon: Layers },
  { type: 'lease_option', label: 'Lease Option', description: 'Lease with purchase option', icon: BookOpen },
  { type: 'hard_money', label: 'Hard Money', description: 'Short-term asset-based loan', icon: DollarSign },
  { type: 'private_money', label: 'Private Money', description: 'Private lender financing', icon: DollarSign },
  { type: 'heloc', label: 'HELOC', description: 'Home equity line of credit', icon: FileText },
  { type: 'land_contract', label: 'Land Contract', description: 'Contract for deed', icon: Building },
]

export function AddInstrumentModal({ open, onOpenChange, propertyId, propertyAddress, existingInstruments = [] }: Props) {
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState<Partial<CreateInstrumentRequest>>({
    property_id: propertyId,
    requires_insurance: true,
  })

  const createMutation = useCreateInstrument()

  const selectedType = INSTRUMENT_TYPES.find((t) => t.type === formData.instrument_type)

  function updateField<K extends keyof CreateInstrumentRequest>(key: K, value: CreateInstrumentRequest[K]) {
    setFormData((prev) => ({ ...prev, [key]: value }))
  }

  // Auto-calculations
  const calculatedPayment = useMemo(() => {
    const bal = formData.original_balance
    const rate = formData.interest_rate
    const term = formData.term_months
    if (!bal || !rate || !term || rate <= 0 || term <= 0) return null
    const r = Number(rate) / 100 / 12
    const n = Number(term)
    const p = Number(bal)
    return Math.round((p * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1) * 100) / 100
  }, [formData.original_balance, formData.interest_rate, formData.term_months])

  const calculatedMaturity = useMemo(() => {
    if (!formData.origination_date || !formData.term_months) return null
    const d = new Date(formData.origination_date)
    d.setMonth(d.getMonth() + Number(formData.term_months))
    return d.toISOString().split('T')[0]
  }, [formData.origination_date, formData.term_months])

  function handleSubmit() {
    const data: CreateInstrumentRequest = {
      property_id: propertyId,
      name: formData.name || `${selectedType?.label ?? 'Instrument'} — ${propertyAddress}`,
      instrument_type: formData.instrument_type!,
      position: formData.position ?? 1,
      original_balance: formData.original_balance,
      current_balance: formData.current_balance ?? formData.original_balance,
      interest_rate: formData.interest_rate,
      rate_type: formData.rate_type,
      term_months: formData.term_months,
      monthly_payment: formData.monthly_payment ?? calculatedPayment ?? undefined,
      origination_date: formData.origination_date,
      maturity_date: formData.maturity_date ?? calculatedMaturity ?? undefined,
      first_payment_date: formData.first_payment_date,
      has_balloon: formData.has_balloon ?? false,
      balloon_date: formData.balloon_date,
      balloon_amount: formData.balloon_amount,
      requires_insurance: formData.requires_insurance ?? true,
      escrow_amount: formData.escrow_amount,
      // Sub-to fields
      is_sub_to: formData.instrument_type === 'sub_to_mortgage',
      original_borrower: formData.original_borrower,
      servicer: formData.servicer,
      loan_number_last4: formData.loan_number_last4,
      // Wrap fields
      is_wrap: formData.instrument_type === 'wrap_mortgage',
      underlying_instrument_id: formData.underlying_instrument_id,
      wrap_rate: formData.wrap_rate,
      wrap_payment: formData.wrap_payment,
      // Lease option
      option_consideration: formData.option_consideration,
      option_expiration: formData.option_expiration,
      monthly_credit: formData.monthly_credit,
      strike_price: formData.strike_price,
      // Seller finance
      down_payment: formData.down_payment,
      late_fee_pct: formData.late_fee_pct,
      late_fee_grace_days: formData.late_fee_grace_days,
      prepayment_penalty: formData.prepayment_penalty,
      notes: formData.notes,
    }

    createMutation.mutate(data, {
      onSuccess: () => {
        try {
          (window as any).posthog?.capture?.('instrument_created', {
            instrument_type: data.instrument_type,
            has_balloon: data.has_balloon,
            is_wrap: data.is_wrap,
          })
        } catch { /* ignore */ }
        onOpenChange(false)
        setStep(1)
        setFormData({ property_id: propertyId, requires_insurance: true })
      },
    })
  }

  function handleClose() {
    onOpenChange(false)
    setStep(1)
    setFormData({ property_id: propertyId, requires_insurance: true })
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-[#0C0B0A]/75 backdrop-blur-sm" onClick={handleClose} />

      <div className="relative w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto bg-[#141311] border border-[#1E1D1B] rounded-2xl shadow-2xl scrollbar-luxury">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-[#141311] border-b border-[#1E1D1B] px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg text-[#F0EDE8]" style={{ fontFamily: 'Satoshi, sans-serif', fontWeight: 300 }}>
              Add Instrument
            </h2>
            <p className="text-xs text-[#8A8580] mt-0.5">Step {step} of 4</p>
          </div>
          <button onClick={handleClose} className="p-2 rounded-lg text-[#8A8580] hover:bg-[#1E1D1B] transition-colors cursor-pointer">
            <X size={18} />
          </button>
        </div>

        {/* Step progress */}
        <div className="px-6 pt-4">
          <div className="flex gap-1">
            {[1, 2, 3, 4].map((s) => (
              <div
                key={s}
                className={cn(
                  'h-1 rounded-full flex-1 transition-colors',
                  s <= step ? 'bg-[#8B7AFF]' : 'bg-[#1E1D1B]'
                )}
              />
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-4">
          {step === 1 && (
            <Step1TypeSelect
              selectedType={formData.instrument_type}
              onSelect={(type) => {
                updateField('instrument_type', type)
                updateField('name', `${INSTRUMENT_TYPES.find((t) => t.type === type)?.label ?? ''} — ${propertyAddress}`)
                try {
                  (window as any).posthog?.capture?.('add_instrument_step', { step: 1, instrument_type: type })
                } catch { /* ignore */ }
                setStep(2)
              }}
            />
          )}
          {step === 2 && (
            <Step2CoreTerms
              formData={formData}
              updateField={updateField}
              calculatedPayment={calculatedPayment}
              calculatedMaturity={calculatedMaturity}
              existingInstruments={existingInstruments}
            />
          )}
          {step === 3 && (
            <Step3BalloonInsurance formData={formData} updateField={updateField} />
          )}
          {step === 4 && (
            <Step4Review formData={formData} selectedType={selectedType} calculatedPayment={calculatedPayment} calculatedMaturity={calculatedMaturity} />
          )}
        </div>

        {/* Footer */}
        {step > 1 && (
          <div className="sticky bottom-0 bg-[#141311] border-t border-[#1E1D1B] px-6 py-4 flex items-center justify-between">
            <button
              onClick={() => setStep(step - 1)}
              className="inline-flex items-center gap-1 px-3 py-2 text-sm text-[#C5C0B8] hover:text-[#F0EDE8] transition-colors cursor-pointer"
            >
              <ArrowLeft size={14} /> Back
            </button>
            {step < 4 ? (
              <button
                onClick={() => {
                  try {
                    (window as any).posthog?.capture?.('add_instrument_step', { step, instrument_type: formData.instrument_type })
                  } catch { /* ignore */ }
                  setStep(step + 1)
                }}
                className="inline-flex items-center gap-1 px-4 py-2 text-sm rounded-lg bg-[#8B7AFF] text-white hover:bg-[#7B6AEF] transition-colors cursor-pointer"
              >
                Continue <ArrowRight size={14} />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={createMutation.isPending}
                className="inline-flex items-center gap-1 px-4 py-2 text-sm rounded-lg bg-[#8B7AFF] text-white hover:bg-[#7B6AEF] transition-colors disabled:opacity-50 cursor-pointer"
              >
                <Check size={14} />
                {createMutation.isPending ? 'Creating...' : 'Create Instrument'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

/* ─── Step 1: Type Select ─── */

function Step1TypeSelect({
  selectedType,
  onSelect,
}: {
  selectedType: string | undefined
  onSelect: (type: FinancingInstrumentType) => void
}) {
  return (
    <div>
      <p className="text-sm text-[#C5C0B8] mb-4">What type of financing instrument is this?</p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {INSTRUMENT_TYPES.map((t) => {
          const Icon = t.icon
          return (
            <button
              key={t.type}
              onClick={() => onSelect(t.type)}
              className={cn(
                'text-left p-3 rounded-lg border transition-colors cursor-pointer',
                selectedType === t.type
                  ? 'bg-[#8B7AFF]/10 border-[#8B7AFF]/40 text-[#F0EDE8]'
                  : 'bg-[#0C0B0A] border-[#1E1D1B] text-[#C5C0B8] hover:border-[#8B7AFF]/20'
              )}
            >
              <Icon size={16} className="text-[#8A8580] mb-1.5" />
              <p className="text-sm font-medium">{t.label}</p>
              <p className="text-[10px] text-[#8A8580] mt-0.5">{t.description}</p>
            </button>
          )
        })}
      </div>
    </div>
  )
}

/* ─── Step 2: Core Terms ─── */

function Step2CoreTerms({
  formData,
  updateField,
  calculatedPayment,
  calculatedMaturity,
  existingInstruments,
}: {
  formData: Partial<CreateInstrumentRequest>
  updateField: <K extends keyof CreateInstrumentRequest>(key: K, value: CreateInstrumentRequest[K]) => void
  calculatedPayment: number | null
  calculatedMaturity: string | null
  existingInstruments: { id: string; name: string }[]
}) {
  const instrumentType = formData.instrument_type
  return (
    <div className="space-y-4">
      <FormField label="Name">
        <input
          type="text"
          value={formData.name ?? ''}
          onChange={(e) => updateField('name', e.target.value)}
          className="w-full px-3 py-2 bg-[#0C0B0A] border border-[#1E1D1B] rounded-lg text-sm text-[#F0EDE8] focus:border-[#8B7AFF] outline-none"
        />
      </FormField>

      <div className="grid grid-cols-2 gap-3">
        <FormField label="Position">
          <select
            value={formData.position ?? 1}
            onChange={(e) => updateField('position', Number(e.target.value))}
            className="w-full px-3 py-2 bg-[#0C0B0A] border border-[#1E1D1B] rounded-lg text-sm text-[#F0EDE8] focus:border-[#8B7AFF] outline-none"
          >
            <option value={1}>1st Position</option>
            <option value={2}>2nd Position</option>
            <option value={3}>3rd Position</option>
          </select>
        </FormField>
        <FormField label="Rate Type">
          <select
            value={formData.rate_type ?? 'fixed'}
            onChange={(e) => updateField('rate_type', e.target.value)}
            className="w-full px-3 py-2 bg-[#0C0B0A] border border-[#1E1D1B] rounded-lg text-sm text-[#F0EDE8] focus:border-[#8B7AFF] outline-none"
          >
            <option value="fixed">Fixed</option>
            <option value="adjustable">Adjustable</option>
            <option value="interest_only">Interest Only</option>
          </select>
        </FormField>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <NumberField label="Original Balance ($)" value={formData.original_balance} onChange={(v) => updateField('original_balance', v)} />
        <NumberField label="Current Balance ($)" value={formData.current_balance ?? formData.original_balance} onChange={(v) => updateField('current_balance', v)} />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <NumberField label="Interest Rate (%)" value={formData.interest_rate} onChange={(v) => updateField('interest_rate', v)} step="0.01" />
        <NumberField label="Term (months)" value={formData.term_months} onChange={(v) => updateField('term_months', v)} />
        <div>
          <NumberField
            label="Monthly Payment ($)"
            value={formData.monthly_payment ?? calculatedPayment}
            onChange={(v) => updateField('monthly_payment', v)}
          />
          {calculatedPayment && !formData.monthly_payment && (
            <span className="text-[10px] text-[#8B7AFF] mt-0.5 block">Calculated</span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <FormField label="Origination Date">
          <input type="date" value={formData.origination_date ?? ''} onChange={(e) => updateField('origination_date', e.target.value)} className="w-full px-3 py-2 bg-[#0C0B0A] border border-[#1E1D1B] rounded-lg text-sm text-[#F0EDE8] focus:border-[#8B7AFF] outline-none" />
        </FormField>
        <div>
          <FormField label="Maturity Date">
            <input type="date" value={formData.maturity_date ?? calculatedMaturity ?? ''} onChange={(e) => updateField('maturity_date', e.target.value)} className="w-full px-3 py-2 bg-[#0C0B0A] border border-[#1E1D1B] rounded-lg text-sm text-[#F0EDE8] focus:border-[#8B7AFF] outline-none" />
          </FormField>
          {calculatedMaturity && !formData.maturity_date && (
            <span className="text-[10px] text-[#8B7AFF] mt-0.5 block">Calculated</span>
          )}
        </div>
      </div>

      {/* Sub-to specific */}
      {instrumentType === 'sub_to_mortgage' && (
        <div className="space-y-3 pt-3 border-t border-[#1E1D1B]">
          <p className="text-xs text-[#8A8580] font-medium uppercase tracking-wider">Sub-To Details</p>
          <FormField label="Original Borrower">
            <input type="text" value={formData.original_borrower ?? ''} onChange={(e) => updateField('original_borrower', e.target.value)} className="w-full px-3 py-2 bg-[#0C0B0A] border border-[#1E1D1B] rounded-lg text-sm text-[#F0EDE8] focus:border-[#8B7AFF] outline-none" />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Servicer">
              <input type="text" value={formData.servicer ?? ''} onChange={(e) => updateField('servicer', e.target.value)} className="w-full px-3 py-2 bg-[#0C0B0A] border border-[#1E1D1B] rounded-lg text-sm text-[#F0EDE8] focus:border-[#8B7AFF] outline-none" />
            </FormField>
            <FormField label="Loan # (last 4)">
              <input type="text" maxLength={4} value={formData.loan_number_last4 ?? ''} onChange={(e) => updateField('loan_number_last4', e.target.value)} className="w-full px-3 py-2 bg-[#0C0B0A] border border-[#1E1D1B] rounded-lg text-sm text-[#F0EDE8] focus:border-[#8B7AFF] outline-none" />
            </FormField>
          </div>
        </div>
      )}

      {/* Wrap specific */}
      {instrumentType === 'wrap_mortgage' && (
        <div className="space-y-3 pt-3 border-t border-[#1E1D1B]">
          <p className="text-xs text-[#8A8580] font-medium uppercase tracking-wider">Wrap Details</p>
          {existingInstruments.length > 0 && (
            <FormField label="Underlying Instrument">
              <select
                value={formData.underlying_instrument_id ?? ''}
                onChange={(e) => updateField('underlying_instrument_id', e.target.value || undefined)}
                className="w-full px-3 py-2 bg-[#0C0B0A] border border-[#1E1D1B] rounded-lg text-sm text-[#F0EDE8] focus:border-[#8B7AFF] outline-none"
              >
                <option value="">Select instrument...</option>
                {existingInstruments.map((inst) => (
                  <option key={inst.id} value={inst.id}>{inst.name}</option>
                ))}
              </select>
            </FormField>
          )}
          <div className="grid grid-cols-2 gap-3">
            <NumberField label="Wrap Rate (%)" value={formData.wrap_rate} onChange={(v) => updateField('wrap_rate', v)} step="0.01" />
            <NumberField label="Wrap Payment ($)" value={formData.wrap_payment} onChange={(v) => updateField('wrap_payment', v)} />
          </div>
        </div>
      )}

      {/* Lease option specific */}
      {instrumentType === 'lease_option' && (
        <div className="space-y-3 pt-3 border-t border-[#1E1D1B]">
          <p className="text-xs text-[#8A8580] font-medium uppercase tracking-wider">Lease Option Details</p>
          <div className="grid grid-cols-2 gap-3">
            <NumberField label="Option Consideration ($)" value={formData.option_consideration} onChange={(v) => updateField('option_consideration', v)} />
            <FormField label="Option Expiration">
              <input type="date" value={formData.option_expiration ?? ''} onChange={(e) => updateField('option_expiration', e.target.value)} className="w-full px-3 py-2 bg-[#0C0B0A] border border-[#1E1D1B] rounded-lg text-sm text-[#F0EDE8] focus:border-[#8B7AFF] outline-none" />
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <NumberField label="Monthly Credit ($)" value={formData.monthly_credit} onChange={(v) => updateField('monthly_credit', v)} />
            <NumberField label="Strike Price ($)" value={formData.strike_price} onChange={(v) => updateField('strike_price', v)} />
          </div>
        </div>
      )}

      {/* Seller finance specific */}
      {instrumentType === 'seller_finance' && (
        <div className="space-y-3 pt-3 border-t border-[#1E1D1B]">
          <p className="text-xs text-[#8A8580] font-medium uppercase tracking-wider">Seller Finance Details</p>
          <div className="grid grid-cols-3 gap-3">
            <NumberField label="Down Payment ($)" value={formData.down_payment} onChange={(v) => updateField('down_payment', v)} />
            <NumberField label="Late Fee (%)" value={formData.late_fee_pct} onChange={(v) => updateField('late_fee_pct', v)} step="0.1" />
            <NumberField label="Grace Days" value={formData.late_fee_grace_days} onChange={(v) => updateField('late_fee_grace_days', v)} />
          </div>
          <label className="flex items-center gap-2 text-sm text-[#C5C0B8] cursor-pointer">
            <input
              type="checkbox"
              checked={formData.prepayment_penalty ?? false}
              onChange={(e) => updateField('prepayment_penalty', e.target.checked)}
              className="rounded border-[#1E1D1B] bg-[#0C0B0A]"
            />
            Prepayment penalty
          </label>
        </div>
      )}
    </div>
  )
}

/* ─── Step 3: Balloon & Insurance ─── */

function Step3BalloonInsurance({
  formData,
  updateField,
}: {
  formData: Partial<CreateInstrumentRequest>
  updateField: <K extends keyof CreateInstrumentRequest>(key: K, value: CreateInstrumentRequest[K]) => void
}) {
  return (
    <div className="space-y-4">
      {/* Balloon */}
      <div>
        <label className="flex items-center gap-2 text-sm text-[#C5C0B8] cursor-pointer mb-3">
          <input
            type="checkbox"
            checked={formData.has_balloon ?? false}
            onChange={(e) => updateField('has_balloon', e.target.checked)}
            className="rounded border-[#1E1D1B] bg-[#0C0B0A]"
          />
          Has balloon payment
        </label>
        {formData.has_balloon && (
          <div className="grid grid-cols-2 gap-3 ml-6">
            <FormField label="Balloon Date">
              <input type="date" value={formData.balloon_date ?? ''} onChange={(e) => updateField('balloon_date', e.target.value)} className="w-full px-3 py-2 bg-[#0C0B0A] border border-[#1E1D1B] rounded-lg text-sm text-[#F0EDE8] focus:border-[#8B7AFF] outline-none" />
            </FormField>
            <NumberField label="Balloon Amount ($)" value={formData.balloon_amount} onChange={(v) => updateField('balloon_amount', v)} />
          </div>
        )}
      </div>

      {/* Insurance */}
      <div>
        <label className="flex items-center gap-2 text-sm text-[#C5C0B8] cursor-pointer mb-3">
          <input
            type="checkbox"
            checked={formData.requires_insurance ?? true}
            onChange={(e) => updateField('requires_insurance', e.target.checked)}
            className="rounded border-[#1E1D1B] bg-[#0C0B0A]"
          />
          Requires insurance
        </label>
        {formData.requires_insurance && (
          <div className="ml-6">
            <NumberField label="Escrow Amount ($)" value={formData.escrow_amount} onChange={(v) => updateField('escrow_amount', v)} />
          </div>
        )}
      </div>

      {/* Notes */}
      <FormField label="Notes (optional)">
        <textarea
          value={formData.notes ?? ''}
          onChange={(e) => updateField('notes', e.target.value)}
          rows={3}
          className="w-full px-3 py-2 bg-[#0C0B0A] border border-[#1E1D1B] rounded-lg text-sm text-[#F0EDE8] focus:border-[#8B7AFF] outline-none resize-none"
        />
      </FormField>
    </div>
  )
}

/* ─── Step 4: Review ─── */

function Step4Review({
  formData,
  selectedType,
  calculatedPayment,
  calculatedMaturity,
}: {
  formData: Partial<CreateInstrumentRequest>
  selectedType: { label: string } | undefined
  calculatedPayment: number | null
  calculatedMaturity: string | null
}) {
  const rows: [string, string][] = [
    ['Type', selectedType?.label ?? '—'],
    ['Name', formData.name ?? '—'],
    ['Position', formData.position ? `${formData.position}${formData.position === 1 ? 'st' : formData.position === 2 ? 'nd' : 'rd'}` : '1st'],
    ['Original Balance', formData.original_balance ? `$${Number(formData.original_balance).toLocaleString()}` : '—'],
    ['Interest Rate', formData.interest_rate ? `${formData.interest_rate}%` : '—'],
    ['Term', formData.term_months ? `${formData.term_months} months` : '—'],
    ['Monthly Payment', (formData.monthly_payment ?? calculatedPayment) ? `$${(formData.monthly_payment ?? calculatedPayment!).toLocaleString()}` : '—'],
    ['Maturity Date', (formData.maturity_date ?? calculatedMaturity) ?? '—'],
  ]

  if (formData.has_balloon) {
    rows.push(['Balloon Amount', formData.balloon_amount ? `$${Number(formData.balloon_amount).toLocaleString()}` : '—'])
    rows.push(['Balloon Date', formData.balloon_date ?? '—'])
  }

  return (
    <div>
      <p className="text-sm text-[#C5C0B8] mb-4">Review your instrument details before creating.</p>
      <div className="bg-[#0C0B0A] border border-[#1E1D1B] rounded-lg p-4 space-y-2">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between py-1 text-sm">
            <span className="text-[#8A8580]">{label}</span>
            <span className="text-[#F0EDE8] tabular-nums">{value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ─── Shared Form Components ─── */

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-[10px] uppercase tracking-wider text-[#8A8580] mb-1 block">{label}</label>
      {children}
    </div>
  )
}

function NumberField({
  label,
  value,
  onChange,
  step = '1',
}: {
  label: string
  value: number | null | undefined
  onChange: (v: number | undefined) => void
  step?: string
}) {
  return (
    <FormField label={label}>
      <input
        type="number"
        step={step}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value ? Number(e.target.value) : undefined)}
        className="w-full px-3 py-2 bg-[#0C0B0A] border border-[#1E1D1B] rounded-lg text-sm text-[#F0EDE8] focus:border-[#8B7AFF] outline-none"
        placeholder="0"
      />
    </FormField>
  )
}
```

- [ ] **Step 2: Add "Add Instrument" button to FinancingTab in PropertyDetailPage**

In the `FinancingTab` component, add state for the modal and the button. Add import for `AddInstrumentModal` at the top of `PropertyDetailPage.tsx`:

```typescript
import { AddInstrumentModal } from '@/components/financing/AddInstrumentModal'
```

In the `FinancingTab` component, add `showAddModal` state and the modal + button:

After the opening of the FinancingTab function, add:
```typescript
  const [showAddModal, setShowAddModal] = useState(false)
```

Before the closing `</div>` of the FinancingTab return, add the button and modal:
```typescript
      {/* Add Instrument button */}
      <button
        onClick={() => setShowAddModal(true)}
        className="inline-flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg bg-[#8B7AFF] text-white hover:bg-[#7B6AEF] transition-colors cursor-pointer"
      >
        <Landmark size={14} />
        Add Instrument
      </button>

      <AddInstrumentModal
        open={showAddModal}
        onOpenChange={setShowAddModal}
        propertyId={propertyId}
        propertyAddress={propertyAddress}
        existingInstruments={instruments.map((i) => ({ id: i.id, name: i.name }))}
      />
```

- [ ] **Step 3: Verify build**

Run: `cd /Users/ivanflores/parcel-platform/frontend && npx vite build 2>&1 | tail -5`

Expected: Build succeeds

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/financing/AddInstrumentModal.tsx frontend/src/pages/properties/PropertyDetailPage.tsx
git commit -m "feat: add multi-step Add Instrument modal with type-specific fields and auto-calc"
```

---

## Task 9: Record Payment Modal

**Files:**
- Create: `frontend/src/components/financing/RecordPaymentModal.tsx`

- [ ] **Step 1: Create RecordPaymentModal**

```typescript
// frontend/src/components/financing/RecordPaymentModal.tsx
import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { useRecordPayment } from '@/hooks/useFinancing'
import type { CreatePaymentRequest } from '@/types/financing'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Pre-fill instrument and property if opened from context */
  defaults?: {
    instrumentId?: string
    instrumentName?: string
    propertyId?: string
    amount?: number
    direction?: 'outgoing' | 'incoming'
    obligationId?: string
  }
  /** Available instruments for selector */
  instruments?: { id: string; name: string; property_id: string }[]
}

export function RecordPaymentModal({ open, onOpenChange, defaults, instruments = [] }: Props) {
  const recordMutation = useRecordPayment()

  const [instrumentId, setInstrumentId] = useState(defaults?.instrumentId ?? '')
  const [propertyId] = useState(defaults?.propertyId ?? '')
  const [amount, setAmount] = useState(defaults?.amount ? String(defaults.amount) : '')
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0])
  const [direction, setDirection] = useState<string>(defaults?.direction ?? 'outgoing')
  const [paymentType, setPaymentType] = useState('regular')
  const [principalPortion, setPrincipalPortion] = useState('')
  const [interestPortion, setInterestPortion] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('bank_transfer')
  const [confirmationNumber, setConfirmationNumber] = useState('')
  const [notes, setNotes] = useState('')

  function handleSubmit() {
    const selectedInstrument = instruments.find((i) => i.id === instrumentId)
    const data: CreatePaymentRequest = {
      instrument_id: instrumentId,
      property_id: selectedInstrument?.property_id ?? propertyId,
      obligation_id: defaults?.obligationId,
      payment_type: paymentType,
      amount: Number(amount),
      principal_portion: principalPortion ? Number(principalPortion) : undefined,
      interest_portion: interestPortion ? Number(interestPortion) : undefined,
      payment_date: paymentDate,
      direction,
      payment_method: paymentMethod,
      confirmation_number: confirmationNumber || undefined,
      notes: notes || undefined,
    }

    recordMutation.mutate(data, {
      onSuccess: () => {
        try {
          (window as any).posthog?.capture?.('payment_recorded_ui', {
            direction,
            amount: Number(amount),
            instrument_type: 'unknown',
          })
        } catch { /* ignore */ }
        onOpenChange(false)
      },
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] bg-[#141311] border-[#1E1D1B]">
        <DialogHeader>
          <DialogTitle
            className="text-[#F0EDE8]"
            style={{ fontFamily: 'Satoshi, sans-serif', fontWeight: 300 }}
          >
            Record Payment
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Instrument selector */}
          {!defaults?.instrumentId && instruments.length > 0 && (
            <Field label="Instrument">
              <select
                value={instrumentId}
                onChange={(e) => setInstrumentId(e.target.value)}
                className="w-full px-3 py-2 bg-[#0C0B0A] border border-[#1E1D1B] rounded-lg text-sm text-[#F0EDE8] focus:border-[#8B7AFF] outline-none"
              >
                <option value="">Select instrument...</option>
                {instruments.map((i) => (
                  <option key={i.id} value={i.id}>{i.name}</option>
                ))}
              </select>
            </Field>
          )}
          {defaults?.instrumentName && (
            <Field label="Instrument">
              <p className="text-sm text-[#F0EDE8]">{defaults.instrumentName}</p>
            </Field>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Field label="Amount ($)">
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-3 py-2 bg-[#0C0B0A] border border-[#1E1D1B] rounded-lg text-sm text-[#F0EDE8] focus:border-[#8B7AFF] outline-none"
                placeholder="0.00"
              />
            </Field>
            <Field label="Payment Date">
              <input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full px-3 py-2 bg-[#0C0B0A] border border-[#1E1D1B] rounded-lg text-sm text-[#F0EDE8] focus:border-[#8B7AFF] outline-none"
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Direction">
              <select
                value={direction}
                onChange={(e) => setDirection(e.target.value)}
                className="w-full px-3 py-2 bg-[#0C0B0A] border border-[#1E1D1B] rounded-lg text-sm text-[#F0EDE8] focus:border-[#8B7AFF] outline-none"
              >
                <option value="outgoing">Outgoing (you pay)</option>
                <option value="incoming">Incoming (you collect)</option>
              </select>
            </Field>
            <Field label="Payment Type">
              <select
                value={paymentType}
                onChange={(e) => setPaymentType(e.target.value)}
                className="w-full px-3 py-2 bg-[#0C0B0A] border border-[#1E1D1B] rounded-lg text-sm text-[#F0EDE8] focus:border-[#8B7AFF] outline-none"
              >
                <option value="regular">Regular</option>
                <option value="extra_principal">Extra Principal</option>
                <option value="balloon">Balloon</option>
                <option value="late_fee">Late Fee</option>
                <option value="insurance">Insurance</option>
                <option value="tax">Tax</option>
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Principal Portion ($)">
              <input
                type="number"
                value={principalPortion}
                onChange={(e) => setPrincipalPortion(e.target.value)}
                className="w-full px-3 py-2 bg-[#0C0B0A] border border-[#1E1D1B] rounded-lg text-sm text-[#F0EDE8] focus:border-[#8B7AFF] outline-none"
                placeholder="Auto"
              />
            </Field>
            <Field label="Interest Portion ($)">
              <input
                type="number"
                value={interestPortion}
                onChange={(e) => setInterestPortion(e.target.value)}
                className="w-full px-3 py-2 bg-[#0C0B0A] border border-[#1E1D1B] rounded-lg text-sm text-[#F0EDE8] focus:border-[#8B7AFF] outline-none"
                placeholder="Auto"
              />
            </Field>
          </div>

          <Field label="Payment Method">
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full px-3 py-2 bg-[#0C0B0A] border border-[#1E1D1B] rounded-lg text-sm text-[#F0EDE8] focus:border-[#8B7AFF] outline-none"
            >
              <option value="bank_transfer">Bank Transfer</option>
              <option value="check">Check</option>
              <option value="cash">Cash</option>
              <option value="auto_pay">Auto-Pay</option>
            </select>
          </Field>

          <Field label="Confirmation # (optional)">
            <input
              type="text"
              value={confirmationNumber}
              onChange={(e) => setConfirmationNumber(e.target.value)}
              className="w-full px-3 py-2 bg-[#0C0B0A] border border-[#1E1D1B] rounded-lg text-sm text-[#F0EDE8] focus:border-[#8B7AFF] outline-none"
              placeholder="Optional"
            />
          </Field>

          <Field label="Notes (optional)">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 bg-[#0C0B0A] border border-[#1E1D1B] rounded-lg text-sm text-[#F0EDE8] focus:border-[#8B7AFF] outline-none resize-none"
            />
          </Field>

          <button
            onClick={handleSubmit}
            disabled={!instrumentId || !amount || recordMutation.isPending}
            className="w-full py-2.5 text-sm rounded-lg bg-[#8B7AFF] text-white font-medium hover:bg-[#7B6AEF] transition-colors disabled:opacity-50 cursor-pointer"
          >
            {recordMutation.isPending ? 'Recording...' : 'Record Payment'}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-[10px] uppercase tracking-wider text-[#8A8580] mb-1 block">{label}</label>
      {children}
    </div>
  )
}
```

- [ ] **Step 2: Verify build**

Run: `cd /Users/ivanflores/parcel-platform/frontend && npx vite build 2>&1 | tail -5`

Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/financing/RecordPaymentModal.tsx
git commit -m "feat: add Record Payment modal with P&I breakdown and method selector"
```

---

## Task 10: Today Briefing Verification + Final Wiring

**Files:**
- Verify: `frontend/src/components/today/BriefingCards.tsx`
- Final build verification

- [ ] **Step 1: Verify BriefingCards handles obligation entity_types**

Read `frontend/src/components/today/BriefingCards.tsx`. The component navigates using `item.action_url` from the backend — it does NOT need changes because the backend sets the correct `action_url` for obligation briefing items. The existing severity-based icon and color mapping (urgent=red, warning=yellow, info=blue) already handles obligation alerts correctly.

No changes needed.

- [ ] **Step 2: Final build verification**

Run: `cd /Users/ivanflores/parcel-platform/frontend && npx vite build 2>&1 | tail -10`

Expected: Build succeeds with no errors

Run: `cd /Users/ivanflores/parcel-platform/frontend && npx tsc --noEmit 2>&1 | tail -10`

Expected: No TypeScript errors

- [ ] **Step 3: Verify all routes accessible**

Check that the pages directory was created:

Run: `ls -la /Users/ivanflores/parcel-platform/frontend/src/pages/financing/`

Expected: `ObligationsPage.tsx` and `FinancingDashboardPage.tsx`

Check that the components directory was created:

Run: `ls -la /Users/ivanflores/parcel-platform/frontend/src/components/financing/`

Expected: `AddInstrumentModal.tsx` and `RecordPaymentModal.tsx`

- [ ] **Step 4: Final commit (if any fixups needed)**

```bash
git add -A
git commit -m "fix: final wiring and build fixes for financing module"
```

---

## Summary

| Task | Files | Description |
|------|-------|-------------|
| 1 | `types/financing.ts` | All financing TypeScript types |
| 2 | `lib/api.ts` | API client financing namespace |
| 3 | `hooks/useFinancing.ts` | React Query hooks with invalidation |
| 4 | `nav-data.ts`, `App.tsx` | Nav unlock + route registration |
| 5 | `pages/financing/ObligationsPage.tsx` | Obligations command center |
| 6 | `pages/financing/FinancingDashboardPage.tsx` | Financing overview dashboard |
| 7 | `pages/properties/PropertyDetailPage.tsx` | Financing tab with instruments + wrap viz |
| 8 | `components/financing/AddInstrumentModal.tsx` | Multi-step instrument wizard |
| 9 | `components/financing/RecordPaymentModal.tsx` | Payment recording modal |
| 10 | Verification | Build check + route verification |
