from pydantic import BaseModel, ConfigDict, Field
from typing import Optional
from datetime import date, datetime
from decimal import Decimal

class ExpenseBase(BaseModel):
    company_id: int
    category_id: Optional[int] = None
    created_by: Optional[int] = None
    expense_date: date
    reference_no: Optional[str] = None
    amount: Decimal = Field(..., gt=0, decimal_places=2)
    amount_paid: Decimal = Field(default=Decimal("0.00"), ge=0, decimal_places=2)
    description: Optional[str] = None

class ExpenseCreate(ExpenseBase):
    pass

class ExpenseUpdate(BaseModel):
    category_id: Optional[int] = None
    expense_date: Optional[date] = None
    reference_no: Optional[str] = None
    amount: Optional[Decimal] = Field(None, gt=0, decimal_places=2)
    amount_paid: Optional[Decimal] = Field(None, ge=0, decimal_places=2)
    description: Optional[str] = None

class ExpenseOut(ExpenseBase):
    expense_id: int
    unpaid_balance: Optional[Decimal] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
