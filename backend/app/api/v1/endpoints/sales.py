from fastapi import APIRouter, Depends, HTTPException, Query, status
from typing import List, Optional
from datetime import date
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.finance import Sale
from app.schemas.sale import SaleCreate, SaleOut, SaleUpdate

router = APIRouter()

@router.get("", response_model=List[SaleOut], summary="List sales transactions")
def get_sales(
    company_id: Optional[int] = Query(None, description="Filter by Company ID"),
    category_id: Optional[int] = Query(None, description="Filter by Category ID"),
    start_date: Optional[date] = Query(None, description="Filter from date"),
    end_date: Optional[date] = Query(None, description="Filter to date"),
    db: Session = Depends(get_db)
):
    query = db.query(Sale)
    if company_id:
        query = query.filter(Sale.company_id == company_id)
    if category_id:
        query = query.filter(Sale.category_id == category_id)
    if start_date:
        query = query.filter(Sale.transaction_date >= start_date)
    if end_date:
        query = query.filter(Sale.transaction_date <= end_date)
    return query.order_by(Sale.transaction_date.desc()).all()

@router.post("", response_model=SaleOut, status_code=status.HTTP_201_CREATED, summary="Record a new sale")
def create_sale(sale_in: SaleCreate, db: Session = Depends(get_db)):
    sale = Sale(**sale_in.model_dump())
    db.add(sale)
    db.commit()
    db.refresh(sale)
    return sale

@router.get("/{sales_id}", response_model=SaleOut, summary="Get sale details")
def get_sale(sales_id: int, db: Session = Depends(get_db)):
    sale = db.query(Sale).filter(Sale.sales_id == sales_id).first()
    if not sale:
        raise HTTPException(status_code=404, detail="Sale not found")
    return sale

@router.delete("/{sales_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete a sale")
def delete_sale(sales_id: int, db: Session = Depends(get_db)):
    sale = db.query(Sale).filter(Sale.sales_id == sales_id).first()
    if not sale:
        raise HTTPException(status_code=404, detail="Sale not found")
    db.delete(sale)
    db.commit()
    return None
