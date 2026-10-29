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
    LendingTransactionCreateRequest,
    LendingTransactionOut,
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
        term_days_val=payload.term_days,
    )


@router.get(
    "/facilities",
    response_model=List[LendingFacilityOut],
    summary="List lending facilities with balance and schedule aggregates",
)
def list_facilities(
    borrower: Optional[str] = Query(None, description="Filter facilities by borrower name"),
    company_id: Optional[int] = Query(None, deprecated=True),
    db: Session = Depends(get_db),
):
    """
    Retrieve all lending facilities, computing real-time amount paid, remaining balance,
    and schedule aggregates.
    """
    return LendingService.get_facilities(db=db, borrower_query=borrower)


@router.get(
    "/facilities/{facility_id}",
    response_model=LendingFacilityOut,
    summary="Get single lending facility details",
)
def get_facility(
    facility_id: int,
    db: Session = Depends(get_db),
):
    """
    Retrieve single facility details by ID.
    """
    return LendingService.get_facility(db=db, facility_id=facility_id)


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
    Create a new lending facility record in lending_facilities table and calculate loan terms.
    """
    return LendingService.create_facility(
        db=db,
        borrower_name=payload.borrower_name,
        borrower_contact=payload.borrower_contact,
        borrower_address=payload.borrower_address,
        principal_amount=payload.loan_amount,
        interest_rate=payload.interest_rate,
        frequency=payload.payment_frequency,
        date_borrowed_val=payload.date_borrowed,
        due_date_val=payload.due_date,
        term_days_val=payload.term_days,
        notes=payload.notes,
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


@router.get(
    "/transactions",
    response_model=List[LendingTransactionOut],
    summary="List and filter all lending transactions",
)
def list_transactions(
    facility_id: Optional[int] = Query(None, description="Filter by facility ID"),
    transaction_type: Optional[str] = Query(None, description="Filter by transaction type"),
    payment_method: Optional[str] = Query(None, description="Filter by payment method (Cash, GCash, Bank Transfer)"),
    date_from: Optional[str] = Query(None, description="Filter transactions starting from date (YYYY-MM-DD)"),
    date_to: Optional[str] = Query(None, description="Filter transactions up to date (YYYY-MM-DD)"),
    db: Session = Depends(get_db),
):
    """
    Retrieve all lending transactions recorded in the lending_transactions table with optional filtering.
    """
    return LendingService.get_transactions(
        db=db,
        facility_id=facility_id,
        transaction_type=transaction_type,
        payment_method=payment_method,
        date_from=date_from,
        date_to=date_to,
    )


@router.get(
    "/transactions/{transaction_id}",
    response_model=LendingTransactionOut,
    summary="Get a single lending transaction by ID",
)
def get_transaction(
    transaction_id: int,
    db: Session = Depends(get_db),
):
    """
    Retrieve a single lending transaction record by ID.
    """
    return LendingService.get_transaction(db=db, transaction_id=transaction_id)


@router.post(
    "/transactions",
    status_code=status.HTTP_201_CREATED,
    summary="Record a lending transaction in the lending_transactions table",
)
def create_transaction(
    payload: LendingTransactionCreateRequest,
    db: Session = Depends(get_db),
):
    """
    Record a lending transaction with settlement validation and boundary checks.
    """
    return LendingService.record_payment(
        db=db,
        loan_id=payload.facility_id,
        payment_date_val=payload.payment_date,
        amount_val=payload.amount,
        method=payload.payment_method,
        reference_no=payload.reference_no,
        notes=payload.notes,
        transaction_type=payload.transaction_type,
    )


@router.post(
    "/payments",
    status_code=status.HTTP_201_CREATED,
    summary="Record a payment remittance (compatibility endpoint)",
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
