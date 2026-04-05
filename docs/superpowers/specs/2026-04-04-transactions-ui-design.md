# Transactions UI — Design Spec

## Overview

Build full transaction CRUD + summary endpoints, a transactions page with table/filters/chart, wire real transactions into property detail and Today cash flow. The Transaction model already exists — this sprint adds the API layer and frontend.

## Design System

Same as all prior sprints — no new tokens.

## Architecture Decisions

- **Amount storage**: Frontend always sends positive amounts. Backend applies sign based on category: `income` → positive, `expense` → negative, `transfer` → positive. Stored as signed in `amount` column.
- **Category vs type**: `category` column stores broad grouping (income/expense/transfer). `transaction_type` column stores granular type (rent/mortgage/insurance/etc.).
- **Router prefix**: `/api/transactions` — follows newer router pattern (not `/api/v1`).
- **Existing model used as-is**: No migration needed — all columns already exist.

## Existing Model Reference

`backend/models/transactions.py` — columns:
- `id` (UUID), `created_by` (UUID), `team_id` (UUID nullable), `property_id` (UUID FK), `deal_id` (UUID nullable FK)
- `transaction_type` (String), `amount` (Numeric 12,2), `description` (String nullable)
- `occurred_at` (Date), `category` (String nullable), `vendor` (String nullable)
- `is_deleted` (Boolean, default False), `created_at`, `updated_at` (timestamps)

---

## 1. Backend: Transaction Schemas

Create: `backend/schemas/transactions.py`

```python
class CreateTransactionRequest:
    property_id: UUID
    amount: Decimal = Field(gt=0)          # always positive, sign applied by backend
    transaction_date: date                  # maps to occurred_at
    category: str                           # income | expense | transfer
    transaction_type: str                   # rent, mortgage, insurance, etc.
    description: Optional[str] = None
    notes: Optional[str] = None             # maps to vendor field for now
    is_recurring: bool = False
    recurrence_interval: Optional[str] = None  # monthly | quarterly | annually
    deal_id: Optional[UUID] = None

class UpdateTransactionRequest:
    # all fields optional (PATCH)

class TransactionResponse:
    # all model fields + property_address (computed)

class PaginatedTransactions:
    items: list[TransactionResponse]
    total, page, per_page, pages

class TransactionSummaryResponse:
    by_month: list[MonthlySummary]     # month, income, expenses, net
    by_category: list[CategorySummary]  # category, total
    by_property: list[PropertySummary]  # property_id, address, income, expenses, net

class BulkCreateRequest:
    transactions: list[CreateTransactionRequest]

class BulkCreateResponse:
    created: int
    errors: list[str]
```

## 2. Backend: Transaction Router

Create: `backend/routers/transactions.py`
Register in: `backend/main.py`

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/transactions` | List with filters + pagination |
| POST | `/api/transactions` | Create single transaction |
| PATCH | `/api/transactions/:id` | Update fields |
| DELETE | `/api/transactions/:id` | Soft delete |
| GET | `/api/transactions/summary` | Monthly aggregation |
| POST | `/api/transactions/bulk` | Bulk create |

### Sign Logic

On create/bulk: `stored_amount = amount if category == 'income' else -amount if category == 'expense' else amount`

### Property Ownership

All endpoints validate `property_id` belongs to `current_user.id` via `_validate_property_ownership` (same pattern as financing router).

### Summary Endpoint

Aggregates from all non-deleted transactions for the user within date range:
- `by_month`: group by `occurred_at` month, sum positive as income, sum abs(negative) as expenses
- `by_category`: group by `category`, sum amounts
- `by_property`: group by `property_id`, resolve address, sum income/expenses

---

## 3. Frontend: Types + API + Hooks

### Types (add to `frontend/src/types/index.ts`)

```typescript
interface Transaction {
  id: string
  property_id: string
  deal_id: string | null
  created_by: string
  transaction_type: string
  amount: number          // signed: positive = income, negative = expense
  description: string | null
  occurred_at: string
  category: string | null
  vendor: string | null
  is_deleted: boolean
  created_at: string
  updated_at: string
  property_address: string | null  // computed
}

interface TransactionFilters {
  property_id?: string
  category?: string
  transaction_type?: string
  date_from?: string
  date_to?: string
  page?: number
  per_page?: number
}

interface TransactionSummary {
  by_month: { month: string; income: number; expenses: number; net: number }[]
  by_category: { category: string; total: number }[]
  by_property: { property_id: string; address: string; income: number; expenses: number; net: number }[]
}

interface CreateTransactionRequest {
  property_id: string
  amount: number           // always positive
  transaction_date: string
  category: string
  transaction_type: string
  description?: string
  notes?: string
  is_recurring?: boolean
  recurrence_interval?: string
}
```

### API Namespace

```typescript
api.transactions = {
  list: (filters?) => GET /api/transactions,
  create: (data) => POST /api/transactions,
  update: (id, data) => PATCH /api/transactions/:id,
  delete: (id) => DELETE /api/transactions/:id,
  summary: (filters?) => GET /api/transactions/summary,
  bulkCreate: (data) => POST /api/transactions/bulk,
}
```

### Hooks (`frontend/src/hooks/useTransactions.ts`)

- `useTransactions(filters)` — queryKey: `['transactions', filters]`
- `useTransactionSummary(filters)` — queryKey: `['transactions', 'summary', filters]`
- `useCreateTransaction()` — invalidates `['transactions']`, `['today']`
- `useUpdateTransaction()` — invalidates `['transactions']`
- `useDeleteTransaction()` — invalidates `['transactions']`
- `useBulkCreateTransactions()` — invalidates `['transactions']`

---

## 4. Frontend: Transactions Page

Rewrite: `frontend/src/pages/transactions/TransactionsPage.tsx`

### Layout

```
Header: "Transactions" title + "Add Transaction" button
KPI row: Total Income | Total Expenses | Net (this month)
Filter bar: Category pills + Property dropdown + Type dropdown + Date range
Transaction table
Monthly summary chart (below table)
```

### KPI Row

3 stat cards derived from summary endpoint filtered to current month:
- Total Income (green)
- Total Expenses (red)
- Net (green if positive, red if negative)

### Filter Bar

- Category pills: All | Income | Expenses | Transfer
- Property dropdown: list of user's properties
- Date range: This Month | Last 3 Months | This Year | All (pill selector)

### Transaction Table

Columns: Date | Property | Description | Category | Type | Amount | Actions

- Date: formatted as "Mar 15, 2026"
- Property: address_line1 (truncated)
- Category badge: Income = green, Expense = red, Transfer = blue
- Type badge: styled pill with the transaction_type
- Amount: green `+$X` for income, red `-$X` for expense
- Actions: Edit (pencil), Delete (trash) with confirm

### Monthly Summary Chart

Recharts BarChart showing last 12 months:
- Green bars: monthly income
- Red bars: monthly expenses  
- Cream line: net (income - expenses)
- X-axis: month labels (Jan, Feb, etc.)

### Empty State

When no transactions exist: "No transactions yet — start tracking your income and expenses."

---

## 5. Add Transaction Modal

Create: `frontend/src/components/transactions/AddTransactionModal.tsx`

Shadcn Dialog with fields:

- **Property** (select, required) — dropdown of user's properties
- **Amount** ($, positive number, required)
- **Category** (pills: Income | Expense | Transfer, required)
- **Type** (dropdown, changes based on category):
  - Income: Rent, Late Fee, Application Fee, Laundry, Parking, Other Income
  - Expense: Mortgage, Insurance, Property Tax, Maintenance, CapEx, HOA, Utilities, Management, Other Expense
  - Transfer: Owner Draw, Capital Contribution, Deposit, Refund
- **Date** (date picker, defaults to today)
- **Description** (text, optional)
- **Recurring** (toggle) — if on: recurrence_interval dropdown (Monthly, Quarterly, Annually)
- **Notes** (textarea, optional)

Submit: `POST /api/transactions` → close modal → toast → invalidate queries

Pre-fill `property_id` when opened from property detail context.

---

## 6. Property Detail: Real Transactions

Modify: `frontend/src/pages/properties/PropertyDetailPage.tsx` — FinancialsTab

Replace the transaction stub with:
- Recent transactions table (last 20 from `useTransactions({ property_id, per_page: 20 })`)
- "Add Transaction" button (opens AddTransactionModal with property_id pre-filled)
- Mini income vs expense summary for current month

---

## 7. Today Cash Flow: Real Data

Modify the TodayCashFlowChart or its data source.

The Today endpoint already returns `portfolio_summary.total_cash_flow`. If the backend `today.py` can include monthly transaction actuals, the chart can show:
- **Projected**: monthly_cash_flow from primary scenarios (existing)
- **Actual**: sum of real transaction data per month (new)

Add to the Today endpoint response a `monthly_actuals` array (last 6 months of income - expenses from transactions). The frontend chart overlays both lines.

---

## 8. PostHog Events

- `transaction_created` — `{category, type, amount, property_id, is_recurring}`
- `transaction_deleted` — `{transaction_id}`
- `transactions_page_viewed` — `{count, date_range}`
- `transactions_summary_viewed`
- `transaction_bulk_created` — `{count}`

---

## Definition of Done

- [ ] Transaction CRUD + summary + bulk endpoints working
- [ ] Transactions page with table, filters, date range, monthly chart
- [ ] Add Transaction modal with category-specific types and recurring support
- [ ] Property detail Financials tab shows real transactions
- [ ] Today cash flow chart uses real transaction data
- [ ] Monthly summary chart (income vs expenses)
- [ ] Frontend build clean
- [ ] No TypeScript errors
