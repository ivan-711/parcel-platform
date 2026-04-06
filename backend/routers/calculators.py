"""Calculator router — lightweight compute endpoint, no database records created."""

import importlib
import logging

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from core.security.jwt import get_current_user
from database import get_db
from limiter import limiter
from models.users import User

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/analysis", tags=["calculators"])

VALID_STRATEGIES = {"wholesale", "buy_and_hold", "flip", "brrrr", "creative_finance"}


class CalculateRequest(BaseModel):
    strategy: str = Field(..., description="One of: wholesale, buy_and_hold, flip, brrrr, creative_finance")
    inputs: dict = Field(..., description="Strategy-specific input values")


class CalculateResponse(BaseModel):
    strategy: str
    outputs: dict
    risk_score: int


REVERSE_STRATEGIES = {"buy_and_hold", "flip", "brrrr", "creative_finance"}


class ReverseCalculateRequest(BaseModel):
    strategy: str = Field(..., description="One of: buy_and_hold, flip, brrrr, creative_finance")
    target_metric: str = Field(..., description="e.g. coc_return, roi, capital_recycled_pct, monthly_cash_flow")
    target_value: float = Field(..., ge=-100_000, le=10_000_000, description="Target value for the metric")
    inputs: dict = Field(..., description="All other calculator inputs (same as forward calculator)")


class ReverseCalculateResponse(BaseModel):
    max_purchase_price: float | None = None
    scenario_at_max: dict | None = None
    risk_score: int | None = None
    feasible: bool = False
    message: str = ""


@router.post("/calculate", response_model=CalculateResponse)
@limiter.limit("60/minute")
async def calculate(
    request: Request,
    body: CalculateRequest,
    current_user: User = Depends(get_current_user),
) -> CalculateResponse:
    """Run calculator on raw inputs — returns outputs without creating any records.

    Fast endpoint for manual calculator mode. No external API calls, no DB writes.
    Target: < 100ms response time.
    """
    if body.strategy not in VALID_STRATEGIES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error": f"Invalid strategy. Must be one of: {', '.join(sorted(VALID_STRATEGIES))}",
                "code": "INVALID_STRATEGY",
            },
        )

    try:
        calc_mod = importlib.import_module(f"core.calculators.{body.strategy}")
        calc_fn = getattr(calc_mod, f"calculate_{body.strategy}")
        risk_mod = importlib.import_module("core.calculators.risk_score")
    except (ImportError, AttributeError):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"error": "Calculator not available", "code": "CALCULATOR_UNAVAILABLE"},
        )

    try:
        outputs = calc_fn(body.inputs)
        risk_score = risk_mod.calculate_risk_score(body.strategy, body.inputs, outputs)
    except Exception as e:
        logger.warning("Calculator error for %s: %s", body.strategy, e)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": f"Calculation error: {str(e)}", "code": "CALCULATION_ERROR"},
        )

    return CalculateResponse(
        strategy=body.strategy,
        outputs=outputs,
        risk_score=risk_score,
    )


@router.post("/reverse-calculate", response_model=ReverseCalculateResponse)
@limiter.limit("30/minute")
async def reverse_calculate(
    request: Request,
    body: ReverseCalculateRequest,
    current_user: User = Depends(get_current_user),
) -> ReverseCalculateResponse:
    """Solve for max purchase price given a target return metric.

    Runs algebraic reverse solver, then forward calculator at the result
    to return a complete scenario at that price. No DB writes.
    """
    if body.strategy not in REVERSE_STRATEGIES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error": f"Reverse calculation not supported for '{body.strategy}'. "
                         f"Supported: {', '.join(sorted(REVERSE_STRATEGIES))}",
                "code": "UNSUPPORTED_STRATEGY",
            },
        )

    try:
        from core.calculators.reverse_valuation import reverse_calculate as solve
        result = solve(body.strategy, body.target_metric, body.target_value, body.inputs)
    except Exception as e:
        logger.warning("Reverse calculator error for %s: %s", body.strategy, e)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": f"Calculation error: {str(e)}", "code": "CALCULATION_ERROR"},
        )

    return ReverseCalculateResponse(**result)
