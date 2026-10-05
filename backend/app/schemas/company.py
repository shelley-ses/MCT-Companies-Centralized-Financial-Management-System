from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class CompanyBase(BaseModel):
    name: str
    code: str
    currency: str = "USD"
    status: str = "Active"

class CompanyCreate(CompanyBase):
    pass

class CompanyOut(CompanyBase):
    id: int
    total_revenue: float = 0.0
    total_expenses: float = 0.0
    net_profit: float = 0.0
    created_at: datetime

    class Config:
        from_attributes = True

class HealthResponse(BaseModel):
    status: str
    service: str
    version: str
    api_v1_path: str
