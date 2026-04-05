# Transactions UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build transaction CRUD + summary endpoints, a transactions page with table/filters/chart, add-transaction modal, wire real transactions into property detail and Today cash flow.

**Architecture:** New transaction router with 6 endpoints using existing Transaction model (no migration). Frontend follows established patterns: Shadcn Dialog for modal, React Query hooks, Recharts for charts. Amount sign is applied server-side based on category.

**Tech Stack:** Python (FastAPI, SQLAlchemy), TypeScript (React, TanStack Query, Recharts, Tailwind)

---

## Task 1: Transaction Schemas

**Files:**
- Create: `backend/schemas/transactions.py`

- [ ] **Step 1: Create transaction schemas**

```python
"""Pydantic schemas for transaction endpoints."""

from datetime import date
from decimal import Decimal
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field


class CreateTransactionRequest(BaseModel):
    property_id: UUID
    amount: Decimal = Field(..., gt=0)
    transaction_date: date
    category: str  # income | expense | transfer
    transaction_type: str  # rent, mortgage, insurance, etc.
    description: Optional[str] = None
    notes: Optional[str] = None
    is_recurring: bool = False
    recurrence_interval: Optional[str] = None  # monthly | quarterly | annually
    deal_id: Optional[UUID] = None


class UpdateTransactionRequest(BaseModel):
    amount: Optional[Decimal] = Field(None, gt=0)
    transaction_date: Optional[date] = None
    category: Optional[str] = None
    transaction_type: Optional[str] = None
    description: Optional[str] = None
    notes: Optional[str] = None
    deal_id: Optional[UUID] = None


class TransactionResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: UUID
    property_id: UUID
    deal_id: Optional[UUID] = None
    created_by: UUID
    team_id: Optional[UUID] = None
    transaction_type: str
    amount: Decimal
    description: Optional[str] = None
    occurred_at: date
    category: Optional[str] = None
    vendor: Optional[str] = None
    is_deleted: bool
    created_at: str
    updated_at: str
    # Computed
    property_address: Optional[str] = None


class PaginatedTransactions(BaseModel):
    items: list[TransactionResponse]
    total: int
    page: int
    per_page: int
    pages: int


class MonthlySummary(BaseModel):
    month: str
    income: float
    expenses: float
    net: float


class CategorySummary(BaseModel):
    category: str
    total: float


class PropertySummary(BaseModel):
    property_id: UUID
    address: str
    income: float
    expenses: float
    net: float


class TransactionSummaryResponse(BaseModel):
    by_month: list[MonthlySummary] = []
    by_category: list[CategorySummary] = []
    by_property: list[PropertySummary] = []


class BulkCreateRequest(BaseModel):
    transactions: list[CreateTransactionRequest]


class BulkCreateResponse(BaseModel):
    created: int
    errors: list[str] = []
```

- [ ] **Step 2: Verify syntax**

Run: `cd backend && python3 -m py_compile schemas/transactions.py && echo "OK"`

- [ ] **Step 3: Commit**

```bash
git add backend/schemas/transactions.py
git commit -m "feat: add transaction Pydantic schemas"
```

---

## Task 2: Transaction Router

**Files:**
- Create: `backend/routers/transactions.py`
- Modify: `backend/main.py`

- [ ] **Step 1: Create the transaction router**

```python
"""Transaction router — CRUD, summary, and bulk operations."""

import math
from datetime import date, datetime
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from core.security.jwt import get_current_user
from database import get_db
from models.properties import Property
from models.transactions import Transaction
from models.users import User
from schemas.transactions import (
    BulkCreateRequest,
    BulkCreateResponse,
    CategorySummary,
    CreateTransactionRequest,
    MonthlySummary,
    PaginatedTransactions,
    PropertySummary,
    TransactionResponse,
    TransactionSummaryResponse,
    UpdateTransactionRequest,
)

router = APIRouter(prefix="/transactions", tags=["transactions"])


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _validate_property_ownership(db: Session, property_id: UUID, user_id: UUID) -> Property:
    prop = (
        db.query(Property)
        .filter(
            Property.id == property_id,
            Property.created_by == user_id,
            Property.is_deleted == False,  # noqa: E712
        )
        .first()
    )
    if not prop:
        raise HTTPException(status_code=404, detail={"error": "Property not found", "code": "PROPERTY_NOT_FOUND"})
    return prop


def _apply_sign(amount: float, category: str) -> float:
    """Apply sign to amount based on category. Income = positive, expense = negative, transfer = positive."""
    if category == "expense":
        return -abs(amount)
    return abs(amount)


def _get_transaction_or_404(db: Session, txn_id: UUID, user_id: UUID) -> Transaction:
    txn = (
        db.query(Transaction)
        .filter(
            Transaction.id == txn_id,
            Transaction.created_by == user_id,
            Transaction.is_deleted == False,  # noqa: E712
        )
        .first()
    )
    if not txn:
        raise HTTPException(status_code=404, detail={"error": "Transaction not found", "code": "TRANSACTION_NOT_FOUND"})
    return txn


def _txn_to_response(txn: Transaction, prop_address: str = "") -> dict:
    resp = TransactionResponse.model_validate(txn, from_attributes=True)
    resp.property_address = prop_address
    return resp


# ---------------------------------------------------------------------------
# CRUD
# ---------------------------------------------------------------------------

@router.get("", response_model=PaginatedTransactions)
async def list_transactions(
    property_id: Optional[UUID] = Query(None),
    category: Optional[str] = Query(None),
    transaction_type: Optional[str] = Query(None),
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    q = db.query(Transaction).filter(
        Transaction.created_by == current_user.id,
        Transaction.is_deleted == False,  # noqa: E712
    )
    if property_id:
        q = q.filter(Transaction.property_id == property_id)
    if category:
        q = q.filter(Transaction.category == category)
    if transaction_type:
        q = q.filter(Transaction.transaction_type == transaction_type)
    if date_from:
        q = q.filter(Transaction.occurred_at >= date_from)
    if date_to:
        q = q.filter(Transaction.occurred_at <= date_to)

    total = q.count()
    transactions = (
        q.order_by(Transaction.occurred_at.desc())
        .offset((page - 1) * per_page)
        .limit(per_page)
        .all()
    )

    # Resolve property addresses
    prop_ids = {t.property_id for t in transactions}
    props = {}
    if prop_ids:
        for p in db.query(Property).filter(Property.id.in_(prop_ids)).all():
            props[p.id] = p.address_line1 or ""

    items = []
    for txn in transactions:
        resp = TransactionResponse.model_validate(txn, from_attributes=True)
        resp.property_address = props.get(txn.property_id, "")
        items.append(resp)

    return PaginatedTransactions(
        items=items,
        total=total,
        page=page,
        per_page=per_page,
        pages=math.ceil(total / per_page) if total else 0,
    )


@router.post("", response_model=TransactionResponse, status_code=status.HTTP_201_CREATED)
async def create_transaction(
    body: CreateTransactionRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    prop = _validate_property_ownership(db, body.property_id, current_user.id)

    signed_amount = _apply_sign(float(body.amount), body.category)

    txn = Transaction(
        property_id=body.property_id,
        deal_id=body.deal_id,
        created_by=current_user.id,
        team_id=current_user.team_id,
        transaction_type=body.transaction_type,
        amount=signed_amount,
        description=body.description,
        occurred_at=body.transaction_date,
        category=body.category,
        vendor=body.notes,
    )
    db.add(txn)
    db.commit()
    db.refresh(txn)

    try:
        from core.telemetry import track_event
        track_event(current_user.id, "transaction_created", {
            "category": body.category,
            "type": body.transaction_type,
            "amount": float(body.amount),
            "property_id": str(body.property_id),
            "is_recurring": body.is_recurring,
        })
    except Exception:
        pass

    resp = TransactionResponse.model_validate(txn, from_attributes=True)
    resp.property_address = prop.address_line1 or ""
    return resp


@router.patch("/{transaction_id}", response_model=TransactionResponse)
async def update_transaction(
    transaction_id: UUID,
    body: UpdateTransactionRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    txn = _get_transaction_or_404(db, transaction_id, current_user.id)
    update_data = body.model_dump(exclude_unset=True)

    # Reapply sign if category or amount changed
    new_category = update_data.get("category", txn.category)
    if "amount" in update_data:
        update_data["amount"] = _apply_sign(float(update_data["amount"]), new_category)
    elif "category" in update_data and txn.amount is not None:
        update_data["amount"] = _apply_sign(abs(float(txn.amount)), new_category)

    # Map transaction_date to occurred_at
    if "transaction_date" in update_data:
        update_data["occurred_at"] = update_data.pop("transaction_date")

    # Map notes to vendor
    if "notes" in update_data:
        update_data["vendor"] = update_data.pop("notes")

    for key, value in update_data.items():
        if hasattr(txn, key):
            setattr(txn, key, value)

    db.commit()
    db.refresh(txn)

    prop = db.query(Property).get(txn.property_id)
    resp = TransactionResponse.model_validate(txn, from_attributes=True)
    resp.property_address = prop.address_line1 if prop else ""
    return resp


@router.delete("/{transaction_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_transaction(
    transaction_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    txn = _get_transaction_or_404(db, transaction_id, current_user.id)
    txn.is_deleted = True
    db.commit()

    try:
        from core.telemetry import track_event
        track_event(current_user.id, "transaction_deleted", {"transaction_id": str(transaction_id)})
    except Exception:
        pass


# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------

@router.get("/summary", response_model=TransactionSummaryResponse)
async def transaction_summary(
    property_id: Optional[UUID] = Query(None),
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    q = db.query(Transaction).filter(
        Transaction.created_by == current_user.id,
        Transaction.is_deleted == False,  # noqa: E712
    )
    if property_id:
        q = q.filter(Transaction.property_id == property_id)
    if date_from:
        q = q.filter(Transaction.occurred_at >= date_from)
    if date_to:
        q = q.filter(Transaction.occurred_at <= date_to)

    transactions = q.all()

    # By month
    monthly: dict[str, dict] = {}
    for t in transactions:
        key = t.occurred_at.strftime("%Y-%m")
        if key not in monthly:
            monthly[key] = {"income": 0.0, "expenses": 0.0}
        amt = float(t.amount or 0)
        if amt >= 0:
            monthly[key]["income"] += amt
        else:
            monthly[key]["expenses"] += abs(amt)

    by_month = sorted([
        MonthlySummary(month=k, income=round(v["income"], 2), expenses=round(v["expenses"], 2), net=round(v["income"] - v["expenses"], 2))
        for k, v in monthly.items()
    ], key=lambda m: m.month)

    # By category
    cat_totals: dict[str, float] = {}
    for t in transactions:
        cat = t.category or "uncategorized"
        cat_totals[cat] = cat_totals.get(cat, 0) + float(t.amount or 0)

    by_category = [CategorySummary(category=k, total=round(v, 2)) for k, v in cat_totals.items()]

    # By property
    prop_totals: dict[UUID, dict] = {}
    for t in transactions:
        if t.property_id not in prop_totals:
            prop_totals[t.property_id] = {"income": 0.0, "expenses": 0.0}
        amt = float(t.amount or 0)
        if amt >= 0:
            prop_totals[t.property_id]["income"] += amt
        else:
            prop_totals[t.property_id]["expenses"] += abs(amt)

    prop_ids = set(prop_totals.keys())
    props = {}
    if prop_ids:
        for p in db.query(Property).filter(Property.id.in_(prop_ids)).all():
            props[p.id] = p.address_line1 or str(p.id)

    by_property = [
        PropertySummary(
            property_id=pid,
            address=props.get(pid, str(pid)),
            income=round(v["income"], 2),
            expenses=round(v["expenses"], 2),
            net=round(v["income"] - v["expenses"], 2),
        )
        for pid, v in prop_totals.items()
    ]

    return TransactionSummaryResponse(by_month=by_month, by_category=by_category, by_property=by_property)


# ---------------------------------------------------------------------------
# Bulk
# ---------------------------------------------------------------------------

@router.post("/bulk", response_model=BulkCreateResponse, status_code=status.HTTP_201_CREATED)
async def bulk_create_transactions(
    body: BulkCreateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    created = 0
    errors: list[str] = []

    # Pre-validate all property IDs
    prop_ids = {t.property_id for t in body.transactions}
    valid_props = set()
    for pid in prop_ids:
        prop = (
            db.query(Property)
            .filter(Property.id == pid, Property.created_by == current_user.id, Property.is_deleted == False)  # noqa: E712
            .first()
        )
        if prop:
            valid_props.add(pid)

    for i, txn_data in enumerate(body.transactions):
        if txn_data.property_id not in valid_props:
            errors.append(f"Row {i + 1}: property not found or not owned")
            continue

        try:
            signed_amount = _apply_sign(float(txn_data.amount), txn_data.category)
            txn = Transaction(
                property_id=txn_data.property_id,
                deal_id=txn_data.deal_id,
                created_by=current_user.id,
                team_id=current_user.team_id,
                transaction_type=txn_data.transaction_type,
                amount=signed_amount,
                description=txn_data.description,
                occurred_at=txn_data.transaction_date,
                category=txn_data.category,
                vendor=txn_data.notes,
            )
            db.add(txn)
            created += 1
        except Exception as e:
            errors.append(f"Row {i + 1}: {str(e)[:80]}")

    if created > 0:
        db.commit()

    try:
        from core.telemetry import track_event
        track_event(current_user.id, "transaction_bulk_created", {"count": created})
    except Exception:
        pass

    return BulkCreateResponse(created=created, errors=errors)
```

- [ ] **Step 2: Register in main.py**

In `backend/main.py`, add to the import line (line 64):
```python
from routers import webhooks, billing, clerk_webhooks, analysis, onboarding, calculators, properties, activity, contacts, today, tasks, reports, financing, transactions  # noqa: E402
```

And add after the financing router registration (after line 86):
```python
app.include_router(transactions.router, prefix="/api")
```

- [ ] **Step 3: Verify syntax**

Run: `cd backend && python3 -m py_compile routers/transactions.py && python3 -m py_compile main.py && echo "OK"`

- [ ] **Step 4: Commit**

```bash
git add backend/routers/transactions.py backend/main.py
git commit -m "feat: add transaction CRUD, summary, and bulk endpoints"
```

---

## Task 3: Frontend Types + API + Hooks

**Files:**
- Modify: `frontend/src/types/index.ts`
- Modify: `frontend/src/lib/api.ts`
- Create: `frontend/src/hooks/useTransactions.ts`

- [ ] **Step 1: Add transaction types to index.ts**

At the end of `frontend/src/types/index.ts`, add:

```typescript
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
```

- [ ] **Step 2: Add transaction API namespace**

In `frontend/src/lib/api.ts`, add a `transactions` namespace inside the `api` object (after the `financing` namespace):

```typescript
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
```

- [ ] **Step 3: Create transaction hooks**

```typescript
// frontend/src/hooks/useTransactions.ts
/** Transaction query and mutation hooks. */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import type { TransactionFilters, CreateTransactionRequest } from '@/types'

export function useTransactions(filters?: TransactionFilters) {
  return useQuery({
    queryKey: ['transactions', filters],
    queryFn: () => api.transactions.list(filters),
    staleTime: 30_000,
  })
}

export function useTransactionSummary(filters?: { property_id?: string; date_from?: string; date_to?: string }) {
  return useQuery({
    queryKey: ['transactions', 'summary', filters],
    queryFn: () => api.transactions.summary(filters),
    staleTime: 30_000,
  })
}

export function useCreateTransaction() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateTransactionRequest) => api.transactions.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['today'] })
      toast.success('Transaction recorded')
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to create transaction')
    },
  })
}

export function useUpdateTransaction() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      api.transactions.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      toast.success('Transaction updated')
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to update transaction')
    },
  })
}

export function useDeleteTransaction() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.transactions.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['today'] })
      toast.success('Transaction deleted')
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to delete transaction')
    },
  })
}

export function useBulkCreateTransactions() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: { transactions: CreateTransactionRequest[] }) =>
      api.transactions.bulkCreate(data),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['today'] })
      toast.success(`${result.created} transactions imported`)
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to import transactions')
    },
  })
}
```

- [ ] **Step 4: Verify build**

Run: `cd frontend && npx vite build 2>&1 | tail -5`

- [ ] **Step 5: Commit**

```bash
git add frontend/src/types/index.ts frontend/src/lib/api.ts frontend/src/hooks/useTransactions.ts
git commit -m "feat: add transaction types, API client, and React Query hooks"
```

---

## Task 4: Add Transaction Modal

**Files:**
- Create: `frontend/src/components/transactions/AddTransactionModal.tsx`

- [ ] **Step 1: Create the modal**

```typescript
// frontend/src/components/transactions/AddTransactionModal.tsx
import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { useCreateTransaction } from '@/hooks/useTransactions'

const TYPES_BY_CATEGORY: Record<string, { value: string; label: string }[]> = {
  income: [
    { value: 'rent_income', label: 'Rent' },
    { value: 'late_fee', label: 'Late Fee' },
    { value: 'application_fee', label: 'Application Fee' },
    { value: 'laundry', label: 'Laundry' },
    { value: 'parking', label: 'Parking' },
    { value: 'other_income', label: 'Other Income' },
  ],
  expense: [
    { value: 'mortgage_payment', label: 'Mortgage' },
    { value: 'insurance', label: 'Insurance' },
    { value: 'tax', label: 'Property Tax' },
    { value: 'expense', label: 'Maintenance' },
    { value: 'capex', label: 'CapEx' },
    { value: 'hoa', label: 'HOA' },
    { value: 'utility', label: 'Utilities' },
    { value: 'management', label: 'Management' },
    { value: 'other_expense', label: 'Other Expense' },
  ],
  transfer: [
    { value: 'owner_draw', label: 'Owner Draw' },
    { value: 'capital_contribution', label: 'Capital Contribution' },
    { value: 'deposit', label: 'Deposit' },
    { value: 'refund', label: 'Refund' },
  ],
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  properties: { id: string; address: string }[]
  defaultPropertyId?: string
}

export function AddTransactionModal({ open, onOpenChange, properties, defaultPropertyId }: Props) {
  const createMutation = useCreateTransaction()

  const [propertyId, setPropertyId] = useState(defaultPropertyId ?? '')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState<string>('expense')
  const [txnType, setTxnType] = useState('mortgage_payment')
  const [txnDate, setTxnDate] = useState(new Date().toISOString().split('T')[0])
  const [description, setDescription] = useState('')
  const [isRecurring, setIsRecurring] = useState(false)
  const [recurrenceInterval, setRecurrenceInterval] = useState('monthly')
  const [notes, setNotes] = useState('')

  // Reset on open
  useEffect(() => {
    if (open) {
      setPropertyId(defaultPropertyId ?? '')
      setAmount('')
      setCategory('expense')
      setTxnType('mortgage_payment')
      setTxnDate(new Date().toISOString().split('T')[0])
      setDescription('')
      setIsRecurring(false)
      setRecurrenceInterval('monthly')
      setNotes('')
    }
  }, [open, defaultPropertyId])

  // Reset type when category changes
  useEffect(() => {
    const types = TYPES_BY_CATEGORY[category]
    if (types && types.length > 0) {
      setTxnType(types[0].value)
    }
  }, [category])

  function handleSubmit() {
    if (!propertyId || !amount) return
    createMutation.mutate(
      {
        property_id: propertyId,
        amount: Number(amount),
        transaction_date: txnDate,
        category,
        transaction_type: txnType,
        description: description || undefined,
        notes: notes || undefined,
        is_recurring: isRecurring,
        recurrence_interval: isRecurring ? recurrenceInterval : undefined,
      },
      { onSuccess: () => onOpenChange(false) }
    )
  }

  const typeOptions = TYPES_BY_CATEGORY[category] || []

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] bg-[#141311] border-[#1E1D1B]">
        <DialogHeader>
          <DialogTitle className="text-[#F0EDE8]" style={{ fontFamily: 'Satoshi, sans-serif', fontWeight: 300 }}>
            Add Transaction
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Property */}
          <Field label="Property">
            <select
              value={propertyId}
              onChange={(e) => setPropertyId(e.target.value)}
              className="w-full px-3 py-2 bg-[#0C0B0A] border border-[#1E1D1B] rounded-lg text-sm text-[#F0EDE8] focus:border-[#8B7AFF] outline-none"
            >
              <option value="">Select property...</option>
              {properties.map((p) => (
                <option key={p.id} value={p.id}>{p.address}</option>
              ))}
            </select>
          </Field>

          {/* Amount + Date */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Amount ($)">
              <input
                type="number"
                min="0"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-3 py-2 bg-[#0C0B0A] border border-[#1E1D1B] rounded-lg text-sm text-[#F0EDE8] focus:border-[#8B7AFF] outline-none"
                placeholder="0.00"
              />
            </Field>
            <Field label="Date">
              <input
                type="date"
                value={txnDate}
                onChange={(e) => setTxnDate(e.target.value)}
                className="w-full px-3 py-2 bg-[#0C0B0A] border border-[#1E1D1B] rounded-lg text-sm text-[#F0EDE8] focus:border-[#8B7AFF] outline-none"
              />
            </Field>
          </div>

          {/* Category pills */}
          <Field label="Category">
            <div className="flex gap-1 p-1 bg-[#0C0B0A] rounded-lg border border-[#1E1D1B]">
              {(['income', 'expense', 'transfer'] as const).map((c) => (
                <button
                  key={c}
                  onClick={() => setCategory(c)}
                  className={cn(
                    'flex-1 px-3 py-1.5 text-xs rounded-md transition-colors cursor-pointer capitalize',
                    category === c
                      ? c === 'income' ? 'bg-[#4ADE80]/15 text-[#4ADE80]'
                        : c === 'expense' ? 'bg-[#F87171]/15 text-[#F87171]'
                        : 'bg-[#60A5FA]/15 text-[#60A5FA]'
                      : 'text-[#8A8580] hover:text-[#C5C0B8]'
                  )}
                >
                  {c}
                </button>
              ))}
            </div>
          </Field>

          {/* Type */}
          <Field label="Type">
            <select
              value={txnType}
              onChange={(e) => setTxnType(e.target.value)}
              className="w-full px-3 py-2 bg-[#0C0B0A] border border-[#1E1D1B] rounded-lg text-sm text-[#F0EDE8] focus:border-[#8B7AFF] outline-none"
            >
              {typeOptions.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </Field>

          {/* Description */}
          <Field label="Description (optional)">
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 bg-[#0C0B0A] border border-[#1E1D1B] rounded-lg text-sm text-[#F0EDE8] focus:border-[#8B7AFF] outline-none"
              placeholder="e.g., March rent payment"
            />
          </Field>

          {/* Recurring */}
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-[#C5C0B8] cursor-pointer">
              <input
                type="checkbox"
                checked={isRecurring}
                onChange={(e) => setIsRecurring(e.target.checked)}
                className="rounded border-[#1E1D1B] bg-[#0C0B0A]"
              />
              Recurring
            </label>
            {isRecurring && (
              <select
                value={recurrenceInterval}
                onChange={(e) => setRecurrenceInterval(e.target.value)}
                className="px-2 py-1 bg-[#0C0B0A] border border-[#1E1D1B] rounded-lg text-xs text-[#F0EDE8] outline-none"
              >
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="annually">Annually</option>
              </select>
            )}
          </div>

          {/* Notes */}
          <Field label="Notes (optional)">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 bg-[#0C0B0A] border border-[#1E1D1B] rounded-lg text-sm text-[#F0EDE8] focus:border-[#8B7AFF] outline-none resize-none"
            />
          </Field>

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={!propertyId || !amount || createMutation.isPending}
            className="w-full py-2.5 text-sm rounded-lg bg-[#8B7AFF] text-white font-medium hover:bg-[#7B6AEF] transition-colors disabled:opacity-50 cursor-pointer"
          >
            {createMutation.isPending ? 'Saving...' : 'Add Transaction'}
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

Run: `cd frontend && npx vite build 2>&1 | tail -5`

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/transactions/AddTransactionModal.tsx
git commit -m "feat: add transaction modal with category-specific types and recurring support"
```

---

## Task 5: Transactions Page

**Files:**
- Rewrite: `frontend/src/pages/transactions/TransactionsPage.tsx`

- [ ] **Step 1: Rewrite TransactionsPage**

```typescript
// frontend/src/pages/transactions/TransactionsPage.tsx
import { useState, useMemo } from 'react'
import { DollarSign, Plus, Pencil, Trash2 } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Line, ComposedChart } from 'recharts'
import { toast } from 'sonner'
import { AppShell } from '@/components/layout/AppShell'
import { EmptyState } from '@/components/EmptyState'
import { AddTransactionModal } from '@/components/transactions/AddTransactionModal'
import { cn } from '@/lib/utils'
import { useTransactions, useTransactionSummary, useDeleteTransaction } from '@/hooks/useTransactions'
import { useProperties } from '@/hooks/useProperties'
import type { TransactionFilters } from '@/types'

type DateRange = 'this_month' | 'last_3' | 'this_year' | 'all'

function getDateRange(range: DateRange): { date_from?: string; date_to?: string } {
  const now = new Date()
  if (range === 'this_month') {
    return { date_from: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01` }
  }
  if (range === 'last_3') {
    const d = new Date(now.getFullYear(), now.getMonth() - 2, 1)
    return { date_from: d.toISOString().split('T')[0] }
  }
  if (range === 'this_year') {
    return { date_from: `${now.getFullYear()}-01-01` }
  }
  return {}
}

const CATEGORY_COLORS: Record<string, string> = {
  income: 'bg-[#4ADE80]/15 text-[#4ADE80] border-[#4ADE80]/30',
  expense: 'bg-[#F87171]/15 text-[#F87171] border-[#F87171]/30',
  transfer: 'bg-[#60A5FA]/15 text-[#60A5FA] border-[#60A5FA]/30',
}

export default function TransactionsPage() {
  const [dateRange, setDateRange] = useState<DateRange>('last_3')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [propertyFilter, setPropertyFilter] = useState<string>('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [page, setPage] = useState(1)

  const dateFilters = getDateRange(dateRange)
  const filters: TransactionFilters = {
    ...dateFilters,
    category: categoryFilter !== 'all' ? categoryFilter : undefined,
    property_id: propertyFilter || undefined,
    page,
    per_page: 25,
  }

  const { data: txnData, isLoading } = useTransactions(filters)
  const { data: summary } = useTransactionSummary(dateFilters)
  const { data: propertiesData } = useProperties({})
  const deleteMutation = useDeleteTransaction()

  const transactions = txnData?.items ?? []
  const properties = (propertiesData?.properties ?? []).map(p => ({ id: p.id, address: p.address_line1 }))

  // Current month KPIs
  const now = new Date()
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const currentMonth = summary?.by_month.find(m => m.month === currentMonthKey)
  const monthIncome = currentMonth?.income ?? 0
  const monthExpenses = currentMonth?.expenses ?? 0
  const monthNet = currentMonth?.net ?? 0

  // PostHog
  try {
    (window as any).posthog?.capture?.('transactions_page_viewed', {
      count: txnData?.total ?? 0,
      date_range: dateRange,
    })
  } catch { /* ignore */ }

  function handleDelete(id: string) {
    if (!confirm('Delete this transaction?')) return
    deleteMutation.mutate(id)
  }

  return (
    <AppShell title="Transactions">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h1 className="text-xl sm:text-2xl text-[#F0EDE8]" style={{ fontFamily: 'Satoshi, sans-serif', fontWeight: 300 }}>
            Transactions
          </h1>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg bg-[#8B7AFF] text-white hover:bg-[#7B6AEF] transition-colors cursor-pointer"
          >
            <Plus size={14} /> Add Transaction
          </button>
        </div>

        {/* KPI row */}
        <div className="grid grid-cols-3 gap-3">
          <KpiCard label="Income (this month)" value={monthIncome} color="text-[#4ADE80]" />
          <KpiCard label="Expenses (this month)" value={monthExpenses} color="text-[#F87171]" />
          <KpiCard label="Net (this month)" value={monthNet} color={monthNet >= 0 ? 'text-[#4ADE80]' : 'text-[#F87171]'} />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Category pills */}
          <div className="flex items-center gap-1 p-1 bg-[#141311] rounded-lg border border-[#1E1D1B]">
            {['all', 'income', 'expense', 'transfer'].map(c => (
              <button
                key={c}
                onClick={() => { setCategoryFilter(c); setPage(1) }}
                className={cn(
                  'px-3 py-1.5 text-xs rounded-md transition-colors cursor-pointer capitalize',
                  categoryFilter === c ? 'bg-[#8B7AFF]/15 text-[#8B7AFF]' : 'text-[#8A8580] hover:text-[#C5C0B8]'
                )}
              >
                {c === 'all' ? 'All' : c}
              </button>
            ))}
          </div>

          {/* Property filter */}
          <select
            value={propertyFilter}
            onChange={(e) => { setPropertyFilter(e.target.value); setPage(1) }}
            className="px-3 py-2 bg-[#141311] border border-[#1E1D1B] rounded-lg text-xs text-[#F0EDE8] focus:border-[#8B7AFF] outline-none"
          >
            <option value="">All Properties</option>
            {properties.map(p => (
              <option key={p.id} value={p.id}>{p.address}</option>
            ))}
          </select>

          {/* Date range */}
          <div className="flex items-center gap-1 p-1 bg-[#141311] rounded-lg border border-[#1E1D1B]">
            {([
              { value: 'this_month', label: 'This Month' },
              { value: 'last_3', label: 'Last 3 Mo' },
              { value: 'this_year', label: 'This Year' },
              { value: 'all', label: 'All' },
            ] as const).map(r => (
              <button
                key={r.value}
                onClick={() => { setDateRange(r.value); setPage(1) }}
                className={cn(
                  'px-3 py-1.5 text-xs rounded-md transition-colors cursor-pointer',
                  dateRange === r.value ? 'bg-[#8B7AFF]/15 text-[#8B7AFF]' : 'text-[#8A8580] hover:text-[#C5C0B8]'
                )}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => <div key={i} className="h-12 bg-[#141311] rounded-lg animate-pulse" />)}
          </div>
        ) : transactions.length === 0 ? (
          <EmptyState
            icon={DollarSign}
            heading="No transactions yet"
            description="Start tracking your income and expenses."
          />
        ) : (
          <div className="bg-[#141311] border border-[#1E1D1B] rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[10px] text-[#8A8580] uppercase tracking-wider border-b border-[#1E1D1B]">
                    <th className="text-left py-3 px-4">Date</th>
                    <th className="text-left py-3 px-4">Property</th>
                    <th className="text-left py-3 px-4">Description</th>
                    <th className="text-left py-3 px-4">Category</th>
                    <th className="text-left py-3 px-4">Type</th>
                    <th className="text-right py-3 px-4">Amount</th>
                    <th className="text-right py-3 px-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map(txn => {
                    const amt = Number(txn.amount)
                    const isPositive = amt >= 0
                    const catColor = CATEGORY_COLORS[txn.category || ''] || CATEGORY_COLORS.expense
                    const typeLabel = (txn.transaction_type || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
                    return (
                      <tr key={txn.id} className="border-b border-[#1E1D1B]/50 last:border-0 hover:bg-[#1A1918] transition-colors">
                        <td className="py-3 px-4 text-[#C5C0B8] whitespace-nowrap">
                          {new Date(txn.occurred_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </td>
                        <td className="py-3 px-4 text-[#F0EDE8] max-w-[200px] truncate">{txn.property_address || '—'}</td>
                        <td className="py-3 px-4 text-[#C5C0B8] max-w-[200px] truncate">{txn.description || '—'}</td>
                        <td className="py-3 px-4">
                          <span className={cn('text-[10px] uppercase tracking-wider px-2 py-0.5 rounded border', catColor)}>
                            {txn.category || '—'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-xs text-[#8A8580]">{typeLabel}</td>
                        <td className={cn('py-3 px-4 text-right tabular-nums font-medium', isPositive ? 'text-[#4ADE80]' : 'text-[#F87171]')}>
                          {isPositive ? '+' : ''}${Math.abs(amt).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => handleDelete(txn.id)}
                            className="p-1 rounded text-[#8A8580] hover:text-[#F87171] hover:bg-[#F87171]/10 transition-colors cursor-pointer"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {txnData && txnData.pages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-[#1E1D1B]">
                <span className="text-xs text-[#8A8580]">{txnData.total} transactions</span>
                <div className="flex gap-1">
                  {Array.from({ length: Math.min(txnData.pages, 5) }, (_, i) => i + 1).map(p => (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={cn(
                        'w-8 h-8 text-xs rounded transition-colors cursor-pointer',
                        p === page ? 'bg-[#8B7AFF]/15 text-[#8B7AFF]' : 'text-[#8A8580] hover:text-[#C5C0B8]'
                      )}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Monthly Summary Chart */}
        {summary && summary.by_month.length > 0 && (
          <div className="bg-[#141311] border border-[#1E1D1B] rounded-xl p-5">
            <h3 className="text-[11px] text-[#8A8580] uppercase tracking-wider font-medium mb-4">
              Monthly Income vs Expenses
            </h3>
            <ResponsiveContainer width="100%" height={250}>
              <ComposedChart data={summary.by_month} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                <XAxis
                  dataKey="month"
                  tick={{ fill: '#8A8580', fontSize: 10 }}
                  axisLine={{ stroke: '#1E1D1B' }}
                  tickLine={false}
                  tickFormatter={(v) => {
                    const [y, m] = v.split('-')
                    return new Date(Number(y), Number(m) - 1).toLocaleDateString('en-US', { month: 'short' })
                  }}
                />
                <YAxis
                  tick={{ fill: '#8A8580', fontSize: 10 }}
                  axisLine={{ stroke: '#1E1D1B' }}
                  tickLine={false}
                  tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: '#141311', border: '1px solid #1E1D1B', borderRadius: '8px', fontSize: '12px' }}
                  formatter={(v: number, name: string) => [`$${v.toLocaleString()}`, name === 'income' ? 'Income' : name === 'expenses' ? 'Expenses' : 'Net']}
                />
                <Bar dataKey="income" fill="#4ADE80" radius={[4, 4, 0, 0]} barSize={20} />
                <Bar dataKey="expenses" fill="#F87171" radius={[4, 4, 0, 0]} barSize={20} />
                <Line type="monotone" dataKey="net" stroke="#F0EDE8" strokeWidth={2} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <AddTransactionModal
        open={showAddModal}
        onOpenChange={setShowAddModal}
        properties={properties}
      />
    </AppShell>
  )
}

function KpiCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-[#141311] border border-[#1E1D1B] rounded-xl p-4">
      <p className="text-[10px] uppercase tracking-wider text-[#8A8580] mb-1">{label}</p>
      <p className={cn('text-xl font-medium tabular-nums', color)}>
        ${Math.abs(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </p>
    </div>
  )
}
```

- [ ] **Step 2: Verify build**

Run: `cd frontend && npx vite build 2>&1 | tail -5`

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/transactions/TransactionsPage.tsx
git commit -m "feat: add transactions page with table, filters, summary chart"
```

---

## Task 6: Property Detail — Real Transactions

**Files:**
- Modify: `frontend/src/pages/properties/PropertyDetailPage.tsx`

- [ ] **Step 1: Add transaction imports and wire into FinancialsTab**

Add imports at the top of PropertyDetailPage.tsx:
```typescript
import { useTransactions } from '@/hooks/useTransactions'
import { AddTransactionModal } from '@/components/transactions/AddTransactionModal'
import type { Transaction } from '@/types'
```

In the FinancialsTab component (around line 418), add the transaction hook and modal state:

After the function declaration `function FinancialsTab({...})`, add:
```typescript
  const { data: txnData } = useTransactions({ property_id: propertyId, per_page: 20 })
  const recentTransactions = txnData?.items ?? []
  const [showAddTxn, setShowAddTxn] = useState(false)
```

Replace the transaction stub section (the `<Card title="Transactions">` block, lines 466-475) with:

```typescript
      {/* Recent Transactions */}
      <Card title="Transactions">
        {recentTransactions.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-4">
            <DollarSign size={24} className="text-[#8A8580]" />
            <p className="text-sm text-[#8A8580]">No transactions recorded yet.</p>
            <button
              onClick={() => setShowAddTxn(true)}
              className="text-xs text-[#8B7AFF] hover:text-[#A89FFF] transition-colors cursor-pointer mt-1"
            >
              + Add Transaction
            </button>
          </div>
        ) : (
          <>
            <div className="space-y-1 mb-3">
              {recentTransactions.slice(0, 10).map((txn) => {
                const amt = Number(txn.amount)
                const isPositive = amt >= 0
                return (
                  <div key={txn.id} className="flex items-center justify-between py-1.5 text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-[#8A8580] shrink-0">
                        {new Date(txn.occurred_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                      <span className="text-[#C5C0B8] truncate">{txn.description || txn.transaction_type.replace(/_/g, ' ')}</span>
                    </div>
                    <span className={cn('tabular-nums font-medium shrink-0 ml-2', isPositive ? 'text-[#4ADE80]' : 'text-[#F87171]')}>
                      {isPositive ? '+' : ''}${Math.abs(amt).toLocaleString()}
                    </span>
                  </div>
                )
              })}
            </div>
            <button
              onClick={() => setShowAddTxn(true)}
              className="text-xs text-[#8B7AFF] hover:text-[#A89FFF] transition-colors cursor-pointer"
            >
              + Add Transaction
            </button>
          </>
        )}
      </Card>

      <AddTransactionModal
        open={showAddTxn}
        onOpenChange={setShowAddTxn}
        properties={[{ id: propertyId, address: '' }]}
        defaultPropertyId={propertyId}
      />
```

- [ ] **Step 2: Verify build**

Run: `cd frontend && npx vite build 2>&1 | tail -5`

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/properties/PropertyDetailPage.tsx
git commit -m "feat: replace transaction stub with real data in property detail"
```

---

## Task 7: Today Cash Flow — Real Transaction Data

**Files:**
- Modify: `backend/routers/today.py` (add monthly_actuals to portfolio summary)
- Modify: `frontend/src/components/today/TodayCashFlowChart.tsx` (use real data)
- Modify: `frontend/src/types/index.ts` (add monthly_actuals to TodayPortfolioSummary)

- [ ] **Step 1: Add monthly_actuals to backend today endpoint**

In `backend/routers/today.py`, in the `_build_portfolio_summary` function (line 181), after computing `total_cf` and before the `deal_count` query, add:

```python
    # Monthly transaction actuals (last 6 months)
    from models.transactions import Transaction as TransactionModel
    six_months_ago = date.today().replace(day=1) - timedelta(days=180)
    txns = (
        db.query(TransactionModel)
        .filter(
            TransactionModel.created_by == user_id,
            TransactionModel.is_deleted == False,  # noqa: E712
            TransactionModel.occurred_at >= six_months_ago,
        )
        .all()
    )
    monthly_actuals_map: dict[str, float] = {}
    for t in txns:
        key = t.occurred_at.strftime("%Y-%m")
        monthly_actuals_map[key] = monthly_actuals_map.get(key, 0) + float(t.amount or 0)

    monthly_actuals = []
    for i in range(5, -1, -1):
        d = date.today().replace(day=1) - timedelta(days=i * 30)
        key = d.strftime("%Y-%m")
        monthly_actuals.append({"month": key, "net": round(monthly_actuals_map.get(key, 0), 2)})
```

Then add `monthly_actuals` to the PortfolioSummary return. Find where the summary dict/object is constructed and add the field. The exact shape depends on the PortfolioSummary model — if it's a dict, add `"monthly_actuals": monthly_actuals`. If it's a Pydantic model, add the field to the model.

- [ ] **Step 2: Add monthly_actuals to frontend type**

In `frontend/src/types/index.ts`, update `TodayPortfolioSummary`:

```typescript
export interface TodayPortfolioSummary {
  total_value: number
  total_cash_flow: number
  property_count: number
  deal_count: number
  change_pct: number
  monthly_actuals?: { month: string; net: number }[]
}
```

- [ ] **Step 3: Update TodayCashFlowChart to use real data**

In `frontend/src/components/today/TodayCashFlowChart.tsx`, replace the `generateMonthlyData` function:

```typescript
function generateMonthlyData(monthlyCf: number, actuals?: { month: string; net: number }[]) {
  const now = new Date()
  const data: { month: string; projected: number; actual: number }[] = []

  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const label = d.toLocaleDateString('en-US', { month: 'short' })
    const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`

    // Find actual from transaction data
    const actualEntry = actuals?.find(a => a.month === monthKey)
    const actualValue = actualEntry ? Math.round(actualEntry.net) : 0

    data.push({
      month: label,
      projected: Math.round(monthlyCf),
      actual: actualValue,
    })
  }
  return data
}
```

Update the useMemo call to pass actuals:
```typescript
  const data = useMemo(
    () => generateMonthlyData(portfolio.total_cash_flow, portfolio.monthly_actuals),
    [portfolio.total_cash_flow, portfolio.monthly_actuals]
  )
```

- [ ] **Step 4: Verify build**

Run: `cd frontend && npx vite build 2>&1 | tail -5`

- [ ] **Step 5: Commit**

```bash
git add backend/routers/today.py frontend/src/types/index.ts frontend/src/components/today/TodayCashFlowChart.tsx
git commit -m "feat: wire real transaction data into Today cash flow chart"
```

---

## Summary

| Task | Files | Description |
|------|-------|-------------|
| 1 | `schemas/transactions.py` (new) | Pydantic schemas for all endpoints |
| 2 | `routers/transactions.py` (new), `main.py` | 6 endpoints: CRUD + summary + bulk |
| 3 | `types/index.ts`, `api.ts`, `hooks/useTransactions.ts` | Frontend types, API client, React Query hooks |
| 4 | `AddTransactionModal.tsx` (new) | Modal with category-specific types, recurring toggle |
| 5 | `TransactionsPage.tsx` | Full page: table, filters, KPIs, monthly chart |
| 6 | `PropertyDetailPage.tsx` | Replace transaction stub with real data |
| 7 | `today.py`, `TodayCashFlowChart.tsx`, `types/index.ts` | Real transaction data in Today cash flow |
