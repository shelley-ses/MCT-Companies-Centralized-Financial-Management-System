from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.company import Company
from app.schemas.company import CompanyOut, CompanyCreate
from app.services.finance_service import FinanceService

router = APIRouter()

@router.get("", response_model=List[CompanyOut], summary="List all MCT companies")
def get_companies(db: Session = Depends(get_db)):
    companies = db.query(Company).order_by(Company.company_id.asc()).all()
    finance_svc = FinanceService(db)
    
    result = []
    for c in companies:
        summary = finance_svc.get_company_financial_summary(company_id=c.company_id)
        result.append(
            CompanyOut(
                id=c.company_id,
                name=c.company_name,
                code=c.company_name.upper().replace(" ", "-")[:15],
                currency="PHP",
                status="Active",
                location=c.location,
                contact_person=c.contact_person,
                email=c.email,
                total_revenue=float(summary.total_revenue),
                total_expenses=float(summary.total_expenses),
                net_profit=float(summary.net_profit),
                created_at=c.created_at
            )
        )
    return result

@router.get("/{company_id}", response_model=CompanyOut, summary="Get company by ID")
def get_company(company_id: int, db: Session = Depends(get_db)):
    c = db.query(Company).filter(Company.company_id == company_id).first()
    if not c:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Company not found")
    
    summary = FinanceService(db).get_company_financial_summary(company_id=c.company_id)
    return CompanyOut(
        id=c.company_id,
        name=c.company_name,
        code=c.company_name.upper().replace(" ", "-")[:15],
        currency="PHP",
        status="Active",
        location=c.location,
        contact_person=c.contact_person,
        email=c.email,
        total_revenue=float(summary.total_revenue),
        total_expenses=float(summary.total_expenses),
        net_profit=float(summary.net_profit),
        created_at=c.created_at
    )

@router.post("", response_model=CompanyOut, status_code=status.HTTP_201_CREATED, summary="Create a new company")
def create_company(company: CompanyCreate, db: Session = Depends(get_db)):
    new_c = Company(
        company_name=company.name,
        starting_balance=0.00,
        current_balance=0.00
    )
    db.add(new_c)
    db.commit()
    db.refresh(new_c)
    return CompanyOut(
        id=new_c.company_id,
        name=new_c.company_name,
        code=company.code or new_c.company_name.upper().replace(" ", "-")[:15],
        currency="PHP",
        status="Active",
        location=new_c.location,
        contact_person=new_c.contact_person,
        email=new_c.email,
        total_revenue=0.0,
        total_expenses=0.0,
        net_profit=0.0,
        created_at=new_c.created_at
    )

