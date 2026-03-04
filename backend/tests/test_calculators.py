"""Unit tests for Parcel's five real estate deal calculators and the risk scoring engine.

These tests exercise the hand-written business logic in core/calculators/ with
realistic deal inputs. Each calculator is tested with a representative deal
scenario, and the risk scorer is verified across all five strategies.
"""

import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from core.calculators.wholesale import calculate_wholesale
from core.calculators.flip import calculate_flip
from core.calculators.buy_and_hold import calculate_buy_and_hold
from core.calculators.brrrr import calculate_brrrr
from core.calculators.creative_finance import calculate_creative_finance
from core.calculators.risk_score import calculate_risk_score


# ---------------------------------------------------------------------------
# Wholesale Calculator
# ---------------------------------------------------------------------------

class TestWholesaleCalculator:
    """Test the wholesale deal analyzer (MAO, spread, recommendation)."""

    INPUTS = {
        "arv": 200_000,
        "repair_costs": 30_000,
        "desired_profit": 10_000,
        "closing_costs_pct": 3.0,
        "asking_price": 90_000,
    }

    def test_wholesale_mao_formula(self):
        """MAO = (ARV * 0.70) - repair_costs - desired_profit."""
        result = calculate_wholesale(self.INPUTS)
        # (200000 * 0.70) - 30000 - 10000 = 140000 - 40000 = 100000
        assert result["mao"] == 100_000

    def test_wholesale_strong_recommendation(self):
        """Asking price below MAO produces a 'strong' recommendation."""
        result = calculate_wholesale(self.INPUTS)
        # asking_price (90000) < mao (100000) → strong
        assert result["recommendation"] == "strong"
        assert result["profit_at_ask"] == 10_000  # mao - asking_price

    def test_wholesale_pass_recommendation(self):
        """Asking price above break-even produces a 'pass' recommendation."""
        bad_deal = {**self.INPUTS, "asking_price": 145_000}
        result = calculate_wholesale(bad_deal)
        # break_even = (200000 * 0.70) - 30000 = 110000
        # asking (145000) > break_even (110000) → pass
        assert result["recommendation"] == "pass"
        assert result["spread_to_break_even"] < 0


# ---------------------------------------------------------------------------
# Flip Calculator
# ---------------------------------------------------------------------------

class TestFlipCalculator:
    """Test the fix-and-flip deal analyzer (profit, ROI, margins)."""

    INPUTS = {
        "purchase_price": 120_000,
        "rehab_budget": 40_000,
        "arv": 220_000,
        "holding_months": 5,
        "selling_costs_pct": 6.0,
        "financing_costs": 5_000,
    }

    def test_flip_gross_profit(self):
        """Gross profit = ARV - total_cost (purchase + rehab + financing + selling)."""
        result = calculate_flip(self.INPUTS)
        # selling_costs = 220000 * 0.06 = 13200
        # total_cost = 120000 + 40000 + 5000 + 13200 = 178200
        # gross_profit = 220000 - 178200 = 41800
        assert result["gross_profit"] == 41_800
        assert result["selling_costs"] == 13_200

    def test_flip_roi_and_annualized(self):
        """ROI is based on total invested; annualized scales by 12/months."""
        result = calculate_flip(self.INPUTS)
        # total_invested = 120000 + 40000 + 5000 = 165000
        # roi = (41800 / 165000) * 100 ≈ 25.33
        assert result["total_invested"] == 165_000
        assert round(result["roi"], 2) == 25.33
        # annualized_roi = (25.33 / 5) * 12 ≈ 60.8
        assert result["annualized_roi"] > result["roi"]


# ---------------------------------------------------------------------------
# Buy & Hold Calculator
# ---------------------------------------------------------------------------

class TestBuyAndHoldCalculator:
    """Test the buy-and-hold rental property analyzer (cash flow, cap rate, DSCR)."""

    INPUTS = {
        "purchase_price": 250_000,
        "down_payment_pct": 20.0,
        "interest_rate": 7.0,
        "loan_term_years": 30,
        "monthly_rent": 2_000,
        "monthly_taxes": 250,
        "monthly_insurance": 100,
        "vacancy_rate_pct": 8.0,
        "maintenance_pct": 5.0,
        "mgmt_fee_pct": 10.0,
    }

    def test_buy_hold_down_payment_and_loan(self):
        """Down payment and loan split correctly from purchase price."""
        result = calculate_buy_and_hold(self.INPUTS)
        assert result["down_payment"] == 50_000
        assert result["loan_amount"] == 200_000

    def test_buy_hold_cash_flow_is_realistic(self):
        """Monthly cash flow should be a reasonable number for a $250k rental."""
        result = calculate_buy_and_hold(self.INPUTS)
        # Should be modest (positive or slightly negative at 7% rate)
        assert -500 < result["monthly_cash_flow"] < 500

    def test_buy_hold_cap_rate_range(self):
        """Cap rate should be reasonable for a standard rental (2-12%)."""
        result = calculate_buy_and_hold(self.INPUTS)
        assert 2 <= result["cap_rate"] <= 12

    def test_buy_hold_dscr_calculation(self):
        """DSCR = effective gross income / monthly P&I — measures debt coverage."""
        result = calculate_buy_and_hold(self.INPUTS)
        # DSCR should be around 1.0-1.5 for a typical deal
        assert result["dscr"] > 0
        # Verify it's calculated correctly: EGI / monthly_pi
        egi = 2_000 * (1 - 8.0 / 100)  # 1840
        expected_dscr = round(egi / result["monthly_pi"], 2)
        assert result["dscr"] == expected_dscr


# ---------------------------------------------------------------------------
# BRRRR Calculator
# ---------------------------------------------------------------------------

class TestBRRRRCalculator:
    """Test the BRRRR (Buy, Rehab, Rent, Refinance, Repeat) analyzer."""

    INPUTS = {
        "purchase_price": 100_000,
        "rehab_costs": 50_000,
        "arv_post_rehab": 200_000,
        "refinance_ltv_pct": 75.0,
        "new_loan_rate": 7.0,
        "new_loan_term_years": 30,
        "monthly_rent": 1_800,
        "monthly_expenses": 400,
    }

    def test_brrrr_capital_recycling(self):
        """A good BRRRR deal recycles most or all of the invested capital."""
        result = calculate_brrrr(self.INPUTS)
        # all_in = 100000 + 50000 = 150000
        # refi_proceeds = 200000 * 0.75 = 150000
        # money_left_in = max(0, 150000 - 150000) = 0
        assert result["all_in"] == 150_000
        assert result["refi_proceeds"] == 150_000
        assert result["money_left_in"] == 0
        assert result["capital_recycled_pct"] == 100.0

    def test_brrrr_coc_return_none_when_zero_left_in(self):
        """CoC return is None when money_left_in is zero (infinite return)."""
        result = calculate_brrrr(self.INPUTS)
        assert result["coc_return"] is None


# ---------------------------------------------------------------------------
# Creative Finance Calculator
# ---------------------------------------------------------------------------

class TestCreativeFinanceCalculator:
    """Test the creative finance analyzer (subject-to and seller finance)."""

    SUBJECT_TO_INPUTS = {
        "existing_loan_balance": 150_000,
        "monthly_piti": 1_100,
        "monthly_rent_estimate": 1_800,
        "monthly_expenses": 200,
        "finance_type": "subject_to",
        "new_rate": 0,
        "new_term_years": 0,
        "arv": 220_000,
    }

    def test_subject_to_uses_existing_payment(self):
        """Subject-to keeps the existing mortgage payment as monthly_payment."""
        result = calculate_creative_finance(self.SUBJECT_TO_INPUTS)
        assert result["monthly_payment"] == 1_100
        assert result["finance_type"] == "subject_to"

    def test_subject_to_cash_flow(self):
        """Cash flow = rent - payment - expenses."""
        result = calculate_creative_finance(self.SUBJECT_TO_INPUTS)
        # 1800 - 1100 - 200 = 500
        assert result["monthly_cash_flow"] == 500
        assert result["annual_cash_flow"] == 6_000

    def test_subject_to_equity_day_one(self):
        """Equity day one = ARV - existing loan balance."""
        result = calculate_creative_finance(self.SUBJECT_TO_INPUTS)
        # 220000 - 150000 = 70000
        assert result["equity_day_one"] == 70_000


# ---------------------------------------------------------------------------
# Risk Score Engine
# ---------------------------------------------------------------------------

class TestRiskScore:
    """Test the risk scoring engine across all five deal strategies."""

    def test_risk_score_always_bounded_0_to_100(self):
        """Risk scores must always be in the valid 0-100 range."""
        strategies = ["wholesale", "buy_and_hold", "flip", "brrrr", "creative_finance"]
        for strategy in strategies:
            score = calculate_risk_score(strategy, {}, {})
            assert 0 <= score <= 100, f"{strategy} score {score} is out of range"

    def test_strong_wholesale_deal_has_low_risk(self):
        """A strong wholesale deal (good spread, low repairs) scores low risk."""
        inputs = {"arv": 200_000, "repair_costs": 20_000, "asking_price": 80_000}
        outputs = {
            "recommendation": "strong",
            "spread_to_break_even": 40_000,
        }
        score = calculate_risk_score("wholesale", inputs, outputs)
        # strong rec → 0, spread > 15k → 0, repairs 10% of ARV → 0
        assert score <= 20

    def test_bad_wholesale_deal_has_high_risk(self):
        """A 'pass' wholesale deal (negative spread, high repairs) scores high risk."""
        inputs = {"arv": 100_000, "repair_costs": 50_000, "asking_price": 95_000}
        outputs = {
            "recommendation": "pass",
            "spread_to_break_even": -25_000,
        }
        score = calculate_risk_score("wholesale", inputs, outputs)
        # pass → 40, spread < 0 → 30, repairs 50% → 30 → total 100
        assert score >= 80

    def test_unknown_strategy_returns_neutral_50(self):
        """An unrecognized strategy defaults to a neutral risk score of 50."""
        score = calculate_risk_score("unknown_strategy", {}, {})
        assert score == 50

    def test_buy_hold_risk_factors_count(self):
        """Buy & hold scoring uses exactly 4 risk factors (cash flow, cap, CoC, DSCR)."""
        # Great deal: all factors score 0
        outputs = {
            "monthly_cash_flow": 500,
            "cap_rate": 8,
            "coc_return": 10,
            "dscr": 1.5,
        }
        score = calculate_risk_score("buy_and_hold", {}, outputs)
        assert score == 0

        # Terrible deal: all factors score max
        bad_outputs = {
            "monthly_cash_flow": -500,
            "cap_rate": 1,
            "coc_return": 0,
            "dscr": 0.5,
        }
        bad_score = calculate_risk_score("buy_and_hold", {}, bad_outputs)
        assert bad_score == 100
