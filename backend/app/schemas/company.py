from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class CompanyBase(BaseModel):
    name: str
    code: Optional[str] = None
    currency: str = "PHP"
    status: str = "Active"

class CompanyCreate(CompanyBase):
    pass

class CompanyOut(BaseModel):
    id: int
    name: str
    code: Optional[str] = None
    currency: str = "PHP"
    status: str = "Active"
    location: Optional[str] = None
    contact_person: Optional[str] = None
    email: Optional[str] = None
    total_revenue: float = 0.0
    total_expenses: float = 0.0
    net_profit: float = 0.0
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class HealthResponse(BaseModel):
    status: str
    service: str
    version: str
    api_v1_path: str
