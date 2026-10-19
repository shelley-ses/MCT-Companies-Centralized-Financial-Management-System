from calendar import monthrange
from datetime import date
from typing import Optional

from fastapi import HTTPException
from sqlalchemy.orm import Session, joinedload

from app.models.bills import Bill, BillPayment
from app.models.company import Company
from app.schemas.bills import (
    BillCreate,
    BillOut,
    BillPeriodOut,
    BillPaymentCreate,
    BillScheduleOut,
    BillUpdate,
)


RECURRING_VALUES = {"daily", "monthly", "yearly"}


def _add_period(period_date: date, recurring: str, count: int = 1) -> date:
    if recurring == "daily":
        return date.fromordinal(period_date.toordinal() + count)
    if recurring == "yearly":
        year = period_date.year + count
        return date(year, period_date.month, min(period_date.day, monthrange(year, period_date.month)[1]))
    month_index = period_date.year * 12 + period_date.month - 1 + count
    year, month_zero_based = divmod(month_index, 12)
    month = month_zero_based + 1
    return date(year, month, min(period_date.day, monthrange(year, month)[1]))


def _period_key(period_date: date, recurring: str) -> str:
    if recurring == "daily":
        return period_date.isoformat()
    if recurring == "yearly":
        return str(period_date.year)
    return period_date.strftime("%Y-%m")


def _period_label(period_date: date, recurring: str) -> str:
    if recurring == "daily":
        return period_date.strftime("%b %d, %Y").replace(" 0", " ")
    if recurring == "yearly":
        return str(period_date.year)
    return period_date.strftime("%B %Y")


def _normalize_recurring(value: Optional[str]) -> str:
    recurring = (value or "monthly").lower()
    if recurring not in RECURRING_VALUES:
        raise HTTPException(status_code=400, detail="Recurring must be daily, monthly, or yearly.")
    return recurring


def _resolve_company(db: Session, company_id: Optional[int], company_name: Optional[str]) -> Company:
    company = db.query(Company).filter(Company.company_id == company_id).first() if company_id else None
    if not company and company_name:
        company = db.query(Company).filter(Company.company_name.ilike(company_name.strip())).first()
    if not company:
        raise HTTPException(status_code=400, detail="A valid company_id or company name is required.")
    return company


class BillsService:
    def __init__(self, db: Session):
        self.db = db

    def _periods(self, bill: Bill, as_of: date = date.today(), include_future: int = 12):
        recurring = _normalize_recurring(bill.recurring)
        period_date = bill.due_date
        periods = []
        max_periods = 366 if recurring == "daily" else (15 if recurring == "yearly" else 60)

        for _ in range(max_periods):
            key = _period_key(period_date, recurring)
            payment = next((item for item in bill.payments if item.period_key == key), None)
            is_future = period_date > as_of
            periods.append({
                "period_key": key,
                "period_label": _period_label(period_date, recurring),
                "period_date": period_date,
                "paid": payment is not None,
                "payment_date": payment.payment_date if payment else None,
                "is_future": is_future,
            })
            if period_date >= as_of and sum(1 for item in periods if item["is_future"]) >= include_future:
                break
            period_date = _add_period(period_date, recurring)
        return periods

    def _next_period(self, bill: Bill, as_of: date = date.today()):
        periods = self._periods(bill, as_of)
        return (
            next((period for period in periods if not period["paid"] and not period["is_future"]), None)
            or next((period for period in periods if not period["paid"]), None)
        )

    def _status(self, bill: Bill, as_of: date = date.today()) -> str:
        next_period = self._next_period(bill, as_of)
        if not next_period:
            return "paid"
        if next_period["period_date"] < as_of:
            return "overdue"
        if (next_period["period_date"] - as_of).days <= bill.due_date_reminder:
            return "due soon"
        return "unpaid"

    def _to_output(self, bill: Bill, as_of: date = date.today()) -> BillOut:
        next_period = self._next_period(bill, as_of)
        return BillOut(
            bill_id=bill.bill_id,
            company_id=bill.company_id,
            company=bill.company.company_name if bill.company else None,
            bill_name=bill.bill_name,
            category=bill.category,
            account_no=bill.account_no,
            amount=bill.amount,
            recurring=_normalize_recurring(bill.recurring),
            due_date=bill.due_date,
            due_date_reminder=bill.due_date_reminder,
            notes=bill.notes,
            status=self._status(bill, as_of),
            created_at=bill.created_at,
            updated_at=bill.updated_at,
            payments=bill.payments,
            next_period_key=next_period["period_key"] if next_period else None,
            next_period_label=next_period["period_label"] if next_period else None,
            next_period_date=next_period["period_date"] if next_period else None,
        )

    def list_bills(self, company_id: Optional[int] = None, company_name: Optional[str] = None):
        query = self.db.query(Bill).options(joinedload(Bill.company), joinedload(Bill.payments))
        if company_id:
            query = query.filter(Bill.company_id == company_id)
        elif company_name and company_name.lower() != "all companies":
            query = query.filter(Bill.company_id == _resolve_company(self.db, None, company_name).company_id)
        return [self._to_output(bill) for bill in query.order_by(Bill.due_date.asc()).all()]

    def get_bill(self, bill_id: int) -> Bill:
        bill = (
            self.db.query(Bill)
            .options(joinedload(Bill.company), joinedload(Bill.payments))
            .filter(Bill.bill_id == bill_id)
            .first()
        )
        if not bill:
            raise HTTPException(status_code=404, detail="Bill not found.")
        return bill

    def create_bill(self, data: BillCreate) -> BillOut:
        company = _resolve_company(self.db, data.company_id, data.company)
        values = data.model_dump(exclude={"company", "company_id", "status"})
        values.update(company_id=company.company_id, recurring=_normalize_recurring(data.recurring), status="unpaid")
        bill = Bill(**values)
        self.db.add(bill)
        self.db.commit()
        return self._to_output(self.get_bill(bill.bill_id))

    def update_bill(self, bill_id: int, data: BillUpdate) -> BillOut:
        bill = self.get_bill(bill_id)
        values = data.model_dump(exclude_unset=True, exclude_none=True)
        if "company_id" in values or "company" in values:
            company = _resolve_company(self.db, values.pop("company_id", None), values.pop("company", None))
            bill.company_id = company.company_id
        values["recurring"] = _normalize_recurring(values["recurring"]) if "recurring" in values else bill.recurring
        for key, value in values.items():
            if key != "status":
                setattr(bill, key, value)
        self.db.commit()
        return self._to_output(self.get_bill(bill_id))

    def delete_bill(self, bill_id: int) -> None:
        self.db.delete(self.get_bill(bill_id))
        self.db.commit()

    def schedule(self, bill_id: int, as_of: date = date.today()) -> BillScheduleOut:
        bill = self.get_bill(bill_id)
        periods = self._periods(bill, as_of)
        next_period = self._next_period(bill, as_of)
        return BillScheduleOut(
            bill_id=bill.bill_id,
            recurring=_normalize_recurring(bill.recurring),
            periods=[
                BillPeriodOut(
                    **period,
                    is_next_payable=bool(next_period and period["period_key"] == next_period["period_key"]),
                )
                for period in periods
            ],
            next_period_key=next_period["period_key"] if next_period else None,
            next_period_label=next_period["period_label"] if next_period else None,
        )

    def record_payment(self, bill_id: int, data: BillPaymentCreate) -> BillOut:
        bill = self.get_bill(bill_id)
        next_period = self._next_period(bill)
        if not next_period:
            raise HTTPException(status_code=400, detail="No unpaid billing period is available.")
        period_key = data.period_key or next_period["period_key"]
        if period_key != next_period["period_key"]:
            raise HTTPException(status_code=409, detail=f"Settle {next_period['period_label']} before paying another period.")
        payment = BillPayment(
            bill_id=bill_id,
            period_key=period_key,
            payment_date=data.payment_date,
            amount=data.amount,
            payment_method=data.payment_method.strip(),
            reference_no=data.reference_no,
            notes=data.notes,
        )
        self.db.add(payment)
        try:
            self.db.commit()
        except Exception:
            self.db.rollback()
            raise HTTPException(status_code=409, detail="That billing period has already been paid.")
        return self._to_output(self.get_bill(bill_id))

    def delete_payment(self, bill_id: int, payment_id: int) -> BillOut:
        payment = self.db.query(BillPayment).filter(
            BillPayment.bill_id == bill_id,
            BillPayment.bill_payment_id == payment_id,
        ).first()
        if not payment:
            raise HTTPException(status_code=404, detail="Bill payment not found.")
        self.db.delete(payment)
        self.db.commit()
        return self._to_output(self.get_bill(bill_id))

    def delete_latest_payment(self, bill_id: int) -> BillOut:
        bill = self.get_bill(bill_id)
        payment = max(bill.payments, key=lambda item: item.created_at or item.payment_date, default=None)
        if not payment:
            raise HTTPException(status_code=404, detail="No bill payment found.")
        self.db.delete(payment)
        self.db.commit()
        return self._to_output(self.get_bill(bill_id))