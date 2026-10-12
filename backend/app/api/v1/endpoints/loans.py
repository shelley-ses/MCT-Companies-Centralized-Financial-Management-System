from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from typing import List, Optional
from decimal import Decimal
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.loan import Loan, LoanRepayment
from app.schemas.loan import LoanCreate, LoanOut, LoanRepaymentCreate, LoanRepaymentOut, LoanStatementOut
from app.services.finance_service import FinanceService, FinanceCalculator
from app.services.audit_service import AuditAction, log_transaction

router = APIRouter()

@router.get("", response_model=List[LoanOut], summary="List loans")
def get_loans(
    borrower_id: Optional[int] = Query(None, description="Filter by Borrower Company ID"),
    lender_id: Optional[int] = Query(None, description="Filter by Lender Company ID"),
    db: Session = Depends(get_db)
):
    query = db.query(Loan)
    if borrower_id:
        query = query.filter(Loan.borrower == borrower_id)
    if lender_id:
        query = query.filter(Loan.lender == lender_id)
    return query.order_by(Loan.loan_date.desc()).all()

@router.post("", response_model=LoanOut, status_code=status.HTTP_201_CREATED, summary="Create a new loan record")
def create_loan(loan_in: LoanCreate, request: Request, db: Session = Depends(get_db)):
    if loan_in.borrower == loan_in.lender:
        raise HTTPException(status_code=400, detail="Borrower and lender cannot be the same company.")
    loan = Loan(**loan_in.model_dump())
    db.add(loan)
    db.commit()
    db.refresh(loan)

    log_transaction(
        db, AuditAction.LOAN_CREATED,
        user_id=None, company_id=loan.borrower,
        ip_address=request.client.host if request.client else "unknown",
        record_id=loan.loan_id, record_type="loan",
        extra={"borrower": loan.borrower, "lender": loan.lender, "amount": float(loan.principal_amount)},
    )
    return loan

@router.get("/{loan_id}/statement", response_model=LoanStatementOut, summary="Get full loan statement and amortized balance")
def get_loan_statement(loan_id: int, db: Session = Depends(get_db)):
    service = FinanceService(db)
    statement = service.get_loan_statement(loan_id)
    if not statement:
        raise HTTPException(status_code=404, detail="Loan not found")
    return statement

@router.post("/{loan_id}/repayments", response_model=LoanRepaymentOut, status_code=status.HTTP_201_CREATED, summary="Record a loan repayment")
def create_loan_repayment(loan_id: int, repayment_in: LoanRepaymentCreate, request: Request, db: Session = Depends(get_db)):
    loan = db.query(Loan).filter(Loan.loan_id == loan_id).first()
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found")

    # Calculate current remaining balance before this payment
    service = FinanceService(db)
    statement = service.get_loan_statement(loan_id)
    if not statement:
        raise HTTPException(status_code=404, detail="Loan statement error")

    if repayment_in.amount > statement.current_remaining_balance:
        raise HTTPException(
            status_code=400,
            detail=f"Repayment amount ({repayment_in.amount}) exceeds remaining balance ({statement.current_remaining_balance})"
        )

    new_remaining = statement.current_remaining_balance - repayment_in.amount

    repayment_data = repayment_in.model_dump()
    repayment_data["loan_id"] = loan_id
    repayment_data["remaining_balance"] = new_remaining

    repayment = LoanRepayment(**repayment_data)
    db.add(repayment)
    db.commit()
    db.refresh(repayment)

    log_transaction(
        db, AuditAction.LOAN_UPDATED,
        user_id=None, company_id=loan.borrower,
        ip_address=request.client.host if request.client else "unknown",
        record_id=loan_id, record_type="loan_repayment",
        extra={"repayment_id": repayment.repayment_id, "amount": float(repayment.amount), "remaining_balance": float(new_remaining)},
    )
    return repayment
