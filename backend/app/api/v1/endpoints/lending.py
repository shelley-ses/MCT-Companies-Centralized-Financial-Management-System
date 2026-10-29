from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.services.lending_service import LendingService
from app.schemas.lending import (
    LendingCalculateRequest,
    LendingCalculateResponse,
    BorrowerCreateRequest,
    BorrowerOut,
    LendingPaymentCreateRequest,
    LendingTransactionCreateRequest,
    LendingTransactionOut,
    LendingLedgerResponse,
)

router = APIRouter()


@router.post(
    "/calculate",
    response_model=LendingCalculateResponse,
    summary="Stateless loan terms and installment calculation",
)
def calculate_terms(payload: LendingCalculateRequest):
    """
    Pure calculation endpoint computing interest, total payable, and installment amounts
    based on principal, interest rate, payment frequency, and schedule dates.
    """
    return LendingService.calculate_terms(
        principal=payload.principal,
        interest_rate=payload.interest_rate,
        frequency=payload.payment_frequency,
        start_date_val=payload.date_borrowed,
        due_date_val=payload.due_date,
        term_days_val=payload.term_days,
    )


@router.get(
    "/borrowers",
    response_model=List[BorrowerOut],
    summary="List borrowers with balance and schedule aggregates",
)
def list_borrowers(
    borrower: Optional[str] = Query(None, description="Filter by borrower name"),
    db: Session = Depends(get_db),
):
    """
    Retrieve all borrowers, computing real-time amount paid, remaining balance,
    and schedule aggregates.
    """
    return LendingService.get_borrowers(db=db, borrower_query=borrower)


@router.get(
    "/borrowers/{borrower_id}",
    response_model=BorrowerOut,
    summary="Get single borrower details",
)
def get_borrower(
    borrower_id: int,
    db: Session = Depends(get_db),
):
    """
    Retrieve single borrower details by ID.
    """
    return LendingService.get_borrower(db=db, borrower_id=borrower_id)


@router.post(
    "/borrowers",
    response_model=BorrowerOut,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new borrower",
)
def create_borrower(
    payload: BorrowerCreateRequest,
    db: Session = Depends(get_db),
):
    """
    Create a new borrower record in the borrowers database table and calculate loan terms.
    """
    return LendingService.create_borrower(
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
    "/ledger/{borrower_id}",
    response_model=LendingLedgerResponse,
    summary="Get complete borrower schedule ledger and installment progress",
)
def get_ledger(
    borrower_id: int,
    db: Session = Depends(get_db),
):
    """
    Retrieve the full schedule ledger for a borrower. For daily loans, missed days are
    automatically derived. For monthly loans, installment cycle progress and due dates are generated.
    """
    return LendingService.get_borrower_ledger(db=db, borrower_id=borrower_id)


@router.get(
    "/transactions",
    response_model=List[LendingTransactionOut],
    summary="List and filter all lending transactions",
)
def list_transactions(
    borrower_id: Optional[int] = Query(None, description="Filter by borrower ID"),
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
        borrower_id=borrower_id,
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
        borrower_id=payload.borrower_id,
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
    summary="Record a payment remittance",
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
        borrower_id=payload.borrower_id,
        payment_date_val=payload.payment_date,
        amount_val=payload.amount,
        method=payload.method,
        reference_no=payload.reference_no,
        notes=payload.notes,
    )
