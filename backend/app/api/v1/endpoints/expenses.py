from fastapi import APIRouter, Depends, HTTPException, Query, status
from typing import List, Optional
from datetime import date
from decimal import Decimal
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.finance import Expense
from app.schemas.expense import ExpenseCreate, ExpenseOut, ExpenseUpdate

router = APIRouter()

@router.get("", response_model=List[ExpenseOut], summary="List expense records")
def get_expenses(
    company_id: Optional[int] = Query(None, description="Filter by Company ID"),
    category_id: Optional[int] = Query(None, description="Filter by Category ID"),
    start_date: Optional[date] = Query(None, description="Filter from date"),
    end_date: Optional[date] = Query(None, description="Filter to date"),
    db: Session = Depends(get_db)
):
    query = db.query(Expense)
    if company_id:
        query = query.filter(Expense.company_id == company_id)
    if category_id:
        query = query.filter(Expense.category_id == category_id)
    if start_date:
        query = query.filter(Expense.expense_date >= start_date)
    if end_date:
        query = query.filter(Expense.expense_date <= end_date)
    
    expenses = query.order_by(Expense.expense_date.desc()).all()
    results = []
    for exp in expenses:
        out = ExpenseOut.model_validate(exp)
        out.unpaid_balance = exp.amount - (exp.amount_paid or Decimal("0.00"))
        results.append(out)
    return results

@router.post("", response_model=ExpenseOut, status_code=status.HTTP_201_CREATED, summary="Record a new expense")
def create_expense(expense_in: ExpenseCreate, db: Session = Depends(get_db)):
    expense = Expense(**expense_in.model_dump())
    db.add(expense)
    db.commit()
    db.refresh(expense)
    out = ExpenseOut.model_validate(expense)
    out.unpaid_balance = expense.amount - (expense.amount_paid or Decimal("0.00"))
    return out

@router.get("/{expense_id}", response_model=ExpenseOut, summary="Get expense details")
def get_expense(expense_id: int, db: Session = Depends(get_db)):
    expense = db.query(Expense).filter(Expense.expense_id == expense_id).first()
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    out = ExpenseOut.model_validate(expense)
    out.unpaid_balance = expense.amount - (expense.amount_paid or Decimal("0.00"))
    return out
