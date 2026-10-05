from fastapi import APIRouter, HTTPException, status
from typing import List
from datetime import datetime, timezone
from app.schemas.company import CompanyOut, CompanyCreate

router = APIRouter()

# Seed sample data for MCT Companies
SAMPLE_COMPANIES = [
    {
        "id": 1,
        "name": "MCT Holdings Corp.",
        "code": "MCT-HOLDINGS",
        "currency": "USD",
        "status": "Active",
        "total_revenue": 1450000.00,
        "total_expenses": 820000.00,
        "net_profit": 630000.00,
        "created_at": datetime.now(timezone.utc)
    },
    {
        "id": 2,
        "name": "MCT Logistics & Transport",
        "code": "MCT-LOGISTICS",
        "currency": "USD",
        "status": "Active",
        "total_revenue": 980000.00,
        "total_expenses": 670000.00,
        "net_profit": 310000.00,
        "created_at": datetime.now(timezone.utc)
    },
    {
        "id": 3,
        "name": "MCT Technologies Inc.",
        "code": "MCT-TECH",
        "currency": "USD",
        "status": "Active",
        "total_revenue": 2100000.00,
        "total_expenses": 1250000.00,
        "net_profit": 850000.00,
        "created_at": datetime.now(timezone.utc)
    },
    {
        "id": 4,
        "name": "MCT Energy Solutions",
        "code": "MCT-ENERGY",
        "currency": "USD",
        "status": "Active",
        "total_revenue": 760000.00,
        "total_expenses": 540000.00,
        "net_profit": 220000.00,
        "created_at": datetime.now(timezone.utc)
    }
]

@router.get("", response_model=List[CompanyOut], summary="List all MCT companies")
def get_companies():
    return SAMPLE_COMPANIES

@router.get("/{company_id}", response_model=CompanyOut, summary="Get company by ID")
def get_company(company_id: int):
    for company in SAMPLE_COMPANIES:
        if company["id"] == company_id:
            return company
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Company not found")

@router.post("", response_model=CompanyOut, status_code=status.HTTP_201_CREATED, summary="Create a new company")
def create_company(company: CompanyCreate):
    new_id = max(c["id"] for c in SAMPLE_COMPANIES) + 1 if SAMPLE_COMPANIES else 1
    new_company = {
        "id": new_id,
        "name": company.name,
        "code": company.code,
        "currency": company.currency,
        "status": company.status,
        "total_revenue": 0.0,
        "total_expenses": 0.0,
        "net_profit": 0.0,
        "created_at": datetime.now(timezone.utc)
    }
    SAMPLE_COMPANIES.append(new_company)
    return new_company
