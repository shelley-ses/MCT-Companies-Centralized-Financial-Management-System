from datetime import date, datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class BillBase(BaseModel):
    company_id: int
    bill_name: str = Field(..., min_length=1, max_length=255)
    category: str = Field(..., min_length=1, max_length=100)
    account_no: Optional[str] = Field(None, max_length=100)
    amount: Decimal = Field(..., gt=0, decimal_places=2)
    recurring: str = Field(
        default="monthly",
        description="monthly, quarterly, or annually",
    )
    due_date: date
    due_date_reminder: int = Field(
        default=3,
        ge=0,
        description="Number of days before the due date to send a reminder",
    )
    notes: Optional[str] = None
    status: str = Field(
        default="unpaid",
        description="unpaid, paid, overdue, or due soon",
    )


class BillCreate(BillBase):
    pass


class BillUpdate(BaseModel):
    bill_name: Optional[str] = Field(None, min_length=1, max_length=255)
    category: Optional[str] = Field(None, min_length=1, max_length=100)
    account_no: Optional[str] = Field(None, max_length=100)
    amount: Optional[Decimal] = Field(None, gt=0, decimal_places=2)
    recurring: Optional[str] = None
    due_date: Optional[date] = None
    due_date_reminder: Optional[int] = Field(None, ge=0)
    notes: Optional[str] = None
    status: Optional[str] = None


class BillOut(BillBase):
    bill_id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)