from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.services.lending_service import LendingService
from app.schemas.lending import (
    LendingCalculateRequest,
    LendingCalculateResponse,
    LendingFacilityCreateRequest,
    LendingPaymentCreateRequest,
    LendingFacilityOut,
    LendingLedgerResponse,
)

router = APIRouter()


@router.post(
    "/calculate",
    response_model=LendingCalculateResponse,
    summary="Stateless lending facility terms and installment calculation",
)
def calculate_terms(payload: LendingCalculateRequest):
    """
    Pure calculation endpoint computing interest, total payable, and installment amounts
    based on principal, interest rate, payment frequency, and schedule dates.
    """
    return LendingService.calculate_facility(
        principal=payload.principal,
        interest_rate=payload.interest_rate,
        frequency=payload.payment_frequency,
        start_date_val=payload.date_borrowed,
        due_date_val=payload.due_date,
    )


@router.get(
    "/facilities",
    response_model=List[LendingFacilityOut],
    summary="List lending facilities with balance and schedule aggregates",
)
def list_facilities(
    company_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
):
    """
    Retrieve all lending facilities, computing real-time amount paid, remaining balance,
    and schedule aggregates.
    """
    return LendingService.get_facilities(db=db, company_id=company_id)


@router.post(
    "/facilities",
    response_model=LendingFacilityOut,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new lending facility",
)
def create_facility(
    payload: LendingFacilityCreateRequest,
    db: Session = Depends(get_db),
):
    """
    Create a new lending facility record and calculate authoritative loan terms.
    """
    return LendingService.create_facility(
        db=db,
        borrower_name=payload.borrower_name,
        principal_amount=payload.loan_amount,
        interest_rate=payload.interest_rate,
        frequency=payload.payment_frequency,
        date_borrowed_val=payload.date_borrowed,
        due_date_val=payload.due_date,
        notes=payload.notes,
        company_id=payload.company_id,
    )


@router.get(
    "/ledger/{facility_id}",
    response_model=LendingLedgerResponse,
    summary="Get complete facility schedule ledger and installment progress",
)
def get_ledger(
    facility_id: int,
    db: Session = Depends(get_db),
):
    """
    Retrieve the full schedule ledger for a facility. For daily loans, missed days are
    automatically derived. For monthly loans, installment cycle progress and due dates are generated.
    """
    return LendingService.get_facility_ledger(db=db, loan_id=facility_id)


@router.post(
    "/payments",
    status_code=status.HTTP_201_CREATED,
    summary="Record a payment remittance with settlement locking",
)
def record_payment(
    payload: LendingPaymentCreateRequest,
    db: Session = Depends(get_db),
):
    """
    Record payment remittance. Enforces period settlement locking (HTTP 409 if date/cycle
    is already settled) and boundary constraints (1.00 <= amount <= remaining balance).
    """
    return LendingService.record_payment(
        db=db,
        loan_id=payload.facility_id,
        payment_date_val=payload.payment_date,
        amount_val=payload.amount,
        method=payload.method,
        reference_no=payload.reference_no,
        notes=payload.notes,
    )
