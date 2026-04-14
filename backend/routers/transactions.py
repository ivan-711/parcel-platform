"""Transaction router — CRUD, summary, and bulk operations."""

import math
from datetime import date
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
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

    # Validate deal ownership if provided
    if body.deal_id:
        from models.deals import Deal
        deal = db.query(Deal).filter(
            Deal.id == body.deal_id,
            Deal.user_id == current_user.id,
        ).first()
        if not deal:
            raise HTTPException(status_code=400, detail={"error": "Deal not found or not owned", "code": "DEAL_NOT_FOUND"})

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

    # Validate deal ownership if deal_id is being updated
    if "deal_id" in update_data and update_data["deal_id"]:
        from models.deals import Deal
        deal = db.query(Deal).filter(
            Deal.id == update_data["deal_id"],
            Deal.user_id == current_user.id,
        ).first()
        if not deal:
            raise HTTPException(status_code=400, detail={"error": "Deal not found or not owned", "code": "DEAL_NOT_FOUND"})

    new_category = update_data.get("category", txn.category)
    if "amount" in update_data:
        update_data["amount"] = _apply_sign(float(update_data["amount"]), new_category)
    elif "category" in update_data and txn.amount is not None:
        update_data["amount"] = _apply_sign(abs(float(txn.amount)), new_category)

    if "transaction_date" in update_data:
        update_data["occurred_at"] = update_data.pop("transaction_date")
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

    cat_totals: dict[str, float] = {}
    for t in transactions:
        cat = t.category or "uncategorized"
        cat_totals[cat] = cat_totals.get(cat, 0) + float(t.amount or 0)
    by_category = [CategorySummary(category=k, total=round(v, 2)) for k, v in cat_totals.items()]

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
            property_id=pid, address=props.get(pid, str(pid)),
            income=round(v["income"], 2), expenses=round(v["expenses"], 2),
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
    if len(body.transactions) > 100:
        raise HTTPException(
            status_code=400,
            detail={"error": "Maximum 100 items per bulk request", "code": "BATCH_TOO_LARGE"},
        )

    created = 0
    errors: list[str] = []

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

    # Validate deal ownership for all deal_ids referenced in the batch
    deal_ids = {t.deal_id for t in body.transactions if t.deal_id}
    valid_deals: set = set()
    if deal_ids:
        from models.deals import Deal
        for did in deal_ids:
            deal = db.query(Deal).filter(
                Deal.id == did,
                Deal.user_id == current_user.id,
            ).first()
            if deal:
                valid_deals.add(did)

    for i, txn_data in enumerate(body.transactions):
        if txn_data.property_id not in valid_props:
            errors.append(f"Row {i + 1}: property not found or not owned")
            continue
        if txn_data.deal_id and txn_data.deal_id not in valid_deals:
            errors.append(f"Row {i + 1}: deal not found or not owned")
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
