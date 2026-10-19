from datetime import date, datetime
from decimal import Decimal
from typing import List, Optional, Literal

from pydantic import BaseModel, ConfigDict, Field


class BillBase(BaseModel):
    company_id: Optional[int] = None
    company: Optional[str] = Field(None, min_length=1, max_length=100)
    bill_name: str = Field(..., min_length=1, max_length=255)
    category: str = Field(..., min_length=1, max_length=100)
    account_no: Optional[str] = Field(None, max_length=100)
    amount: Decimal = Field(..., gt=0, decimal_places=2)
    recurring: Literal["daily", "monthly", "yearly"] = Field(
        default="monthly",
        description="daily, monthly, or yearly",
    )
    due_date: date
    due_date_reminder: int = Field(
        default=3,
        ge=0,
        description="Number of days before the due date to send a reminder",
    )
    notes: Optional[str] = None
    status: Literal["unpaid", "paid", "overdue", "due soon"] = Field(
        default="unpaid",
        description="unpaid, paid, overdue, or due soon",
    )


class BillCreate(BillBase):
    pass


class BillUpdate(BaseModel):
    company_id: Optional[int] = None
    company: Optional[str] = Field(None, min_length=1, max_length=100)
    bill_name: Optional[str] = Field(None, min_length=1, max_length=255)
    category: Optional[str] = Field(None, min_length=1, max_length=100)
    account_no: Optional[str] = Field(None, max_length=100)
    amount: Optional[Decimal] = Field(None, gt=0, decimal_places=2)
    recurring: Optional[Literal["daily", "monthly", "yearly"]] = None
    due_date: Optional[date] = None
    due_date_reminder: Optional[int] = Field(None, ge=0)
    notes: Optional[str] = None
    status: Optional[Literal["unpaid", "paid", "overdue", "due soon"]] = None


class BillOut(BillBase):
    bill_id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    payments: List["BillPaymentOut"] = []
    next_period_key: Optional[str] = None
    next_period_label: Optional[str] = None
    next_period_date: Optional[date] = None

    model_config = ConfigDict(from_attributes=True)


class BillPaymentCreate(BaseModel):
    period_key: Optional[str] = None
    payment_date: date
    amount: Decimal = Field(..., gt=0, decimal_places=2)
    payment_method: str = Field(..., min_length=1, max_length=50)
    reference_no: Optional[str] = Field(None, max_length=100)
    notes: Optional[str] = None


class BillPaymentOut(BillPaymentCreate):
    bill_payment_id: int
    bill_id: int
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class BillPeriodOut(BaseModel):
    period_key: str
    period_label: str
    period_date: date
    paid: bool
    payment_date: Optional[date] = None
    is_future: bool
    is_next_payable: bool


class BillScheduleOut(BaseModel):
    bill_id: int
    recurring: str
    periods: List[BillPeriodOut]
    next_period_key: Optional[str] = None
    next_period_label: Optional[str] = None


BillOut.model_rebuild()