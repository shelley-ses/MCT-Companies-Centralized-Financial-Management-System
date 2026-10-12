from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.company import CompanyCreate, CompanyOut, CompanyUpdate
from app.services.company_service import CompanyService, CompanyServiceError

router = APIRouter()

# get all companies
@router.get("", response_model=list[CompanyOut], summary="List all MCT companies")
def get_companies(db: Session = Depends(get_db)):
    try:
        return CompanyService(db).list_companies()
    except CompanyServiceError as error:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(error),
        ) from error

# get company by ID
@router.get("/{company_id}", response_model=CompanyOut, summary="Get company by ID")
def get_company(company_id: int, db: Session = Depends(get_db)):
    try:
        company = CompanyService(db).get_company_response(company_id)
    except CompanyServiceError as error:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(error),
        ) from error
    if company is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Company not found")
    return company

# create a new company
@router.post("", response_model=CompanyOut, status_code=status.HTTP_201_CREATED, summary="Create a new company")
def create_company(company: CompanyCreate, db: Session = Depends(get_db)):
    try:
        return CompanyService(db).create_company(company)
    except CompanyServiceError as error:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(error),
        ) from error

# update an existing company
@router.patch("/{company_id}", response_model=CompanyOut, summary="Update an existing company")
def update_company(
    company_id: int,
    company_update: CompanyUpdate,
    db: Session = Depends(get_db),
):
    service = CompanyService(db)
    try:
        company = service.update_company(company_id, company_update)
    except CompanyServiceError as error:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(error),
        ) from error
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=str(error),
        ) from error
    if company is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Company not found")
    return company

# delete a company
@router.delete("/{company_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete a company")
def delete_company(company_id: int, db: Session = Depends(get_db)):
    try:
        deleted = CompanyService(db).delete_company(company_id)
    except CompanyServiceError as error:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(error),
        ) from error
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Company not found")
