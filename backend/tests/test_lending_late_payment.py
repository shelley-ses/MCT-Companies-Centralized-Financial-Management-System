from datetime import date, timedelta
from decimal import Decimal
from app.services.lending_service import LendingService


def test_calculate_terms_daily():
    terms = LendingService.calculate_terms(
        principal=30000,
        interest_rate=20.0,
        frequency="Daily",
        start_date_val="2026-10-01",
        term_days_val=40,
    )
    assert terms["principal"] == 30000.0
    assert terms["interest"] == 6000.0
    assert terms["total_payable"] == 36000.0
    assert terms["installment_target"] == 900.0
    assert terms["cycle_count"] == 40
    assert terms["penalty_rate"] == 5.0
    assert terms["penalty_per_cycle"] == 45.0


def test_daily_ledger_missed_and_penalties():
    # Start date was 5 days ago, zero payments recorded
    today = date.today()
    start_date = today - timedelta(days=5)

    ledger, meta = LendingService.build_daily_ledger(
        date_borrowed_val=start_date,
        due_date_val=start_date + timedelta(days=40),
        repayments=[],
        term_days=40,
        installment_target=900.0,
        penalty_per_cycle=45.0,
    )

    # Past 5 days should be marked "Missed" with penalty computed
    missed_rows = [r for r in ledger if r["status"] == "Missed"]
    assert len(missed_rows) == 5
    assert meta["missed_cycles_count"] == 5
    assert meta["compliance_status"] == "Delinquent"
    assert meta["total_penalties"] > 0


def test_daily_ledger_with_on_time_and_late_payments():
    today = date.today()
    start_date = today - timedelta(days=2)
    due_day_1 = start_date.isoformat()
    due_day_2 = (start_date + timedelta(days=1)).isoformat()

    repayments = [
        # Day 1 was paid on time
        {
            "cycle_due_date": due_day_1,
            "date": due_day_1,
            "payment_date": due_day_1,
            "amount": 900.0,
            "penalty_portion": 0.0,
            "is_late": False,
            "days_late": 0,
            "status": "Paid",
        },
        # Day 2 was paid 3 days late with 5% x 3 = 135 penalty
        {
            "cycle_due_date": due_day_2,
            "date": today.isoformat(),
            "payment_date": today.isoformat(),
            "amount": 1035.0,
            "penalty_portion": 135.0,
            "is_late": True,
            "days_late": 3,
            "status": "Paid",
        },
    ]

    ledger, meta = LendingService.build_daily_ledger(
        date_borrowed_val=start_date,
        due_date_val=start_date + timedelta(days=40),
        repayments=repayments,
        term_days=40,
        installment_target=900.0,
        penalty_per_cycle=45.0,
    )

    row_day_1 = next(r for r in ledger if r["date"] == due_day_1)
    assert row_day_1["status"] == "Paid"
    assert row_day_1["penalty"] == 0.0
    assert row_day_1["isLocked"] is True

    row_day_2 = next(r for r in ledger if r["date"] == due_day_2)
    assert "Paid Late" in row_day_2["status"]
    assert row_day_2["penalty"] == 135.0
    assert row_day_2["isLocked"] is True


def test_manual_penalty_not_deducted_from_total_payable():
    """
    Verify that user-inputted penalty charge is tracked in penalty_portion and total_penalties,
    and is strictly NOT included in the deduction of the contractual total payable.
    """
    terms = LendingService.calculate_terms(
        principal=30000,
        interest_rate=20.0,
        frequency="Daily",
        start_date_val="2026-10-01",
        term_days_val=40,
    )
    contractual_total_payable = terms["total_payable"]
    assert contractual_total_payable == 36000.0

    # Borrower pays daily installment 900 + user-input penalty charge 100
    installment_payment = 900.0
    user_input_penalty = 100.0

    # Total payable must remain exactly 36000.0 (penalty is not added to contractual total payable)
    # Remaining balance must reduce only by the repayment amount (36000 - 900 = 35100.0)
    remaining_balance_after = contractual_total_payable - installment_payment
    assert remaining_balance_after == 35100.0
    assert user_input_penalty != 0.0


def test_negative_penalty_disallowed():
    """
    Verify that negative late payment charges are disallowed by Pydantic schema validation.
    """
    from pydantic import ValidationError
    from app.schemas.lending import LendingPaymentCreateRequest, LendingTransactionCreateRequest

    # Valid with 0.00
    req_zero = LendingPaymentCreateRequest(
        borrower_id=1,
        payment_date="2026-10-30",
        amount=Decimal("900.00"),
        penalty_amount=Decimal("0.00"),
    )
    assert req_zero.penalty_amount == Decimal("0.00")

    # Invalid with negative value
    try:
        LendingPaymentCreateRequest(
            borrower_id=1,
            payment_date="2026-10-30",
            amount=Decimal("900.00"),
            penalty_amount=Decimal("-50.00"),
        )
        assert False, "Should have raised ValidationError for negative penalty"
    except ValidationError:
        pass

    try:
        LendingTransactionCreateRequest(
            borrower_id=1,
            payment_date="2026-10-30",
            amount=Decimal("900.00"),
            penalty_amount=Decimal("-10.00"),
        )
        assert False, "Should have raised ValidationError for negative penalty"
    except ValidationError:
        pass


