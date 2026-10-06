from pydantic import BaseModel, ConfigDict, Field
from typing import Optional
from datetime import date, datetime
from decimal import Decimal

class SaleBase(BaseModel):
    company_id: int
    category_id: Optional[int] = None
    transaction_date: date
    reference_no: Optional[str] = None
    amount: Decimal = Field(..., gt=0, decimal_places=2)
    description: Optional[str] = None

class SaleCreate(SaleBase):
    pass

class SaleUpdate(BaseModel):
    category_id: Optional[int] = None
    transaction_date: Optional[date] = None
    reference_no: Optional[str] = None
    amount: Optional[Decimal] = Field(None, gt=0, decimal_places=2)
    description: Optional[str] = None

class SaleOut(SaleBase):
    sales_id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
