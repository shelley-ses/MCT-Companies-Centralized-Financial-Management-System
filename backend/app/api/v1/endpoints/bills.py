from datetime import date
from typing import List, Optional

from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.bills import (
    BillCreate,
    BillOut,
    BillPaymentCreate,
    BillReminderOut,
    BillScheduleOut,
    BillStatsOut,
    BillUpdate,
)
from app.services.bills_service import BillsService


router = APIRouter()


@router.get("", response_model=List[BillOut], summary="List company bills")
def list_bills(
    company_id: Optional[int] = Query(None),
    company_name: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    return BillsService(db).list_bills(company_id=company_id, company_name=company_name)


@router.post("", response_model=BillOut, status_code=status.HTTP_201_CREATED, summary="Create a company bill")
def create_bill(bill_in: BillCreate, db: Session = Depends(get_db)):
    return BillsService(db).create_bill(bill_in)


@router.get("/stats", response_model=BillStatsOut, summary="Get aggregated bill statistics")
def get_bill_stats(
    company_id: Optional[int] = Query(None),
    company_name: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    return BillsService(db).get_stats(company_id=company_id, company_name=company_name)


@router.get("/reminders", response_model=List[BillReminderOut], summary="Get bill payment reminders")
def get_bill_reminders(
    company_id: Optional[int] = Query(None),
    company_name: Optional[str] = Query(None),
    as_of: Optional[date] = Query(None),
    db: Session = Depends(get_db),
):
    return BillsService(db).get_reminders(company_id=company_id, company_name=company_name, as_of=as_of or date.today())


@router.get("/{bill_id}", response_model=BillOut, summary="Get a bill")
def get_bill(bill_id: int, db: Session = Depends(get_db)):
    service = BillsService(db)
    bill = service.get_bill(bill_id)
    return service._to_output(bill)


@router.patch("/{bill_id}", response_model=BillOut, summary="Update a company bill")
def update_bill(bill_id: int, bill_in: BillUpdate, db: Session = Depends(get_db)):
    return BillsService(db).update_bill(bill_id, bill_in)


@router.delete("/{bill_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete a company bill")
def delete_bill(bill_id: int, db: Session = Depends(get_db)):
    BillsService(db).delete_bill(bill_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/{bill_id}/schedule", response_model=BillScheduleOut, summary="Get recurring payment schedule")
def get_bill_schedule(
    bill_id: int,
    as_of: Optional[date] = Query(None),
    db: Session = Depends(get_db),
):
    return BillsService(db).schedule(bill_id, as_of or date.today())


@router.post("/{bill_id}/payments", response_model=BillOut, status_code=status.HTTP_201_CREATED, summary="Record a bill payment or installment")
def record_bill_payment(bill_id: int, payment_in: BillPaymentCreate, db: Session = Depends(get_db)):
    return BillsService(db).record_payment(bill_id, payment_in)


@router.delete("/{bill_id}/payments/{payment_id}", response_model=BillOut, summary="Remove a bill payment")
def delete_bill_payment(bill_id: int, payment_id: int, db: Session = Depends(get_db)):
    return BillsService(db).delete_payment(bill_id, payment_id)


@router.delete("/{bill_id}/latest-payment", response_model=BillOut, summary="Undo the latest bill payment")
def delete_latest_bill_payment(bill_id: int, db: Session = Depends(get_db)):
    return BillsService(db).delete_latest_payment(bill_id)
