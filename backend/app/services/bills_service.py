from calendar import monthrange
from datetime import date
from typing import Optional

from decimal import Decimal
from fastapi import HTTPException
from sqlalchemy import func
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


def _add_period(period_date: date, recurring: str, count: int = 1, anchor_day: Optional[int] = None) -> date:
    day = anchor_day if anchor_day is not None else period_date.day
    if recurring == "daily":
        return date.fromordinal(period_date.toordinal() + count)
    if recurring == "yearly":
        year = period_date.year + count
        return date(year, period_date.month, min(day, monthrange(year, period_date.month)[1]))
    month_index = period_date.year * 12 + period_date.month - 1 + count
    year, month_zero_based = divmod(month_index, 12)
    month = month_zero_based + 1
    return date(year, month, min(day, monthrange(year, month)[1]))


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


KNOWN_COMPANY_ALIASES = {
    "mct kitchen": ["mycity kitchen", "kitchen"],
    "kitchen": ["mycity kitchen", "kitchen"],
    "mct hotel": ["mctolentino", "hotel", "hospitality"],
    "hotel": ["mctolentino", "hotel", "hospitality"],
    "filcap": ["filcap", "filcam"],
    "filcap prime holdings corp.": ["filcap", "filcam"],
    "filcap prime": ["filcap", "filcam"],
    "jk property": ["jk property and ventures", "property ventures"],
    "jk property and ventures": ["jk property and ventures", "property ventures"],
    "speedbox": ["speedfire construction", "speedfire"],
    "speedfire": ["speedfire construction", "speedfire"],
    "jk printing": ["jk global headways", "printing"],
    "golden sunburst": ["golden jupiter property ventures", "golden jupiter"],
    "golden sunburst ventures": ["golden jupiter property ventures", "golden jupiter"],
}


def _resolve_company(db: Session, company_id: Optional[int], company_name: Optional[str]) -> Company:
    # 1. By ID if specified
    if company_id:
        company = db.query(Company).filter(Company.company_id == company_id).first()
        if company:
            return company

    all_companies = db.query(Company).all()

    # 2. If name is missing or "all companies", fallback to first company gracefully
    if not company_name or not company_name.strip() or company_name.strip().lower() == "all companies":
        if all_companies:
            return all_companies[0]
        raise HTTPException(status_code=400, detail="A valid company_id or company name is required.")

    clean_name = company_name.strip()
    clean_lower = clean_name.lower()

    # 3. Exact case-insensitive match
    company = db.query(Company).filter(Company.company_name.ilike(clean_name)).first()
    if company:
        return company

    # 4. Trimmed space-insensitive match
    for c in all_companies:
        if c.company_name.strip().lower() == clean_lower:
            return c

    # 5. Known aliases / keyword mappings
    for alias_key, search_terms in KNOWN_COMPANY_ALIASES.items():
        if alias_key in clean_lower or clean_lower in alias_key:
            for term in search_terms:
                for c in all_companies:
                    if term in c.company_name.strip().lower():
                        return c

    # 6. Generic substring containment
    for c in all_companies:
        c_clean = c.company_name.strip().lower()
        if clean_lower in c_clean or c_clean in clean_lower:
            return c

    # 7. Word-level match (words with >= 4 characters)
    words = [w for w in clean_lower.replace("&", " ").replace(".", " ").split() if len(w) >= 4]
    for w in words:
        for c in all_companies:
            if w in c.company_name.lower():
                return c

    raise HTTPException(status_code=400, detail="A valid company_id or company name is required.")


class BillsService:
    def __init__(self, db: Session):
        self.db = db

    def _periods(self, bill: Bill, as_of: date = date.today(), include_future: int = 12):
        recurring = _normalize_recurring(bill.recurring)
        anchor_day = bill.due_date.day
        period_date = bill.due_date
        # Clamp start year to 2025 onwards
        if period_date.year < 2025:
            period_date = date(2025, 1, min(anchor_day, monthrange(2025, 1)[1]))
        periods = []
        max_periods = 366 if recurring == "daily" else (15 if recurring == "yearly" else 60)

        for _ in range(max_periods):
            key = _period_key(period_date, recurring)
            period_payments = [item for item in bill.payments if item.period_key == key]
            paid_amount = sum((item.amount for item in period_payments), Decimal(0))
            is_paid = paid_amount >= bill.amount
            is_partially_paid = not is_paid and paid_amount > 0
            remaining_amount = Decimal(0) if is_paid else max(Decimal(0), bill.amount - paid_amount)
            latest_payment = max(period_payments, key=lambda p: p.payment_date, default=None)
            is_future = period_date > as_of
            periods.append({
                "period_key": key,
                "period_label": _period_label(period_date, recurring),
                "period_date": period_date,
                "paid": is_paid,
                "partially_paid": is_partially_paid,
                "paid_amount": paid_amount,
                "remaining_amount": remaining_amount,
                "payment_date": latest_payment.payment_date if latest_payment else None,
                "is_future": is_future,
            })
            if period_date >= as_of and sum(1 for item in periods if item["is_future"]) >= include_future:
                if not any(item.period_key > key for item in bill.payments):
                    break
            period_date = _add_period(period_date, recurring, 1, anchor_day=anchor_day)
        return periods

    def _next_period(self, bill: Bill, as_of: date = date.today()):
        periods = self._periods(bill, as_of)
        return (
            next((period for period in periods if not period["paid"] and not period["is_future"]), None)
            or next((period for period in periods if not period["paid"]), None)
        )

    def _status(self, bill: Bill, as_of: date = date.today()) -> str:
        periods = self._periods(bill, as_of)
        unpaid_past_or_current = next(
            (p for p in periods if not p["paid"] and not p["is_future"]),
            None,
        )
        if not unpaid_past_or_current:
            return "paid"
        if unpaid_past_or_current.get("partially_paid"):
            return "partially paid"
        if unpaid_past_or_current["period_date"] < as_of:
            return "overdue"
        recurring = _normalize_recurring(bill.recurring)
        reminder_days = 0 if recurring == "daily" else bill.due_date_reminder
        diff_days = (unpaid_past_or_current["period_date"] - as_of).days
        if diff_days <= reminder_days:
            return "due soon"
        return "unpaid"

    def _to_output(self, bill: Bill, as_of: date = date.today()) -> BillOut:
        next_period = self._next_period(bill, as_of)
        return BillOut(
            bill_id=bill.bill_id,
            company_id=bill.company_id,
            company=bill.company.company_name if bill.company else None,
            bill_name=bill.bill_name,
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
        clean_name = data.bill_name.strip()
        existing = (
            self.db.query(Bill)
            .filter(
                Bill.company_id == company.company_id,
                func.lower(Bill.bill_name) == clean_name.lower(),
            )
            .first()
        )
        if existing:
            raise HTTPException(
                status_code=400,
                detail=f"A bill with provider name '{clean_name}' already exists for {company.company_name}."
            )
        values = data.model_dump(exclude={"company", "company_id", "status"})
        values.update(company_id=company.company_id, recurring=_normalize_recurring(data.recurring), status="unpaid")
        bill = Bill(**values)
        self.db.add(bill)
        self.db.commit()
        return self._to_output(self.get_bill(bill.bill_id))

    def update_bill(self, bill_id: int, data: BillUpdate) -> BillOut:
        bill = self.get_bill(bill_id)
        values = data.model_dump(exclude_unset=True, exclude_none=True)
        if "bill_name" in values and values["bill_name"].strip():
            clean_name = values["bill_name"].strip()
            target_company_id = bill.company_id
            if "company_id" in values or "company" in values:
                comp = _resolve_company(self.db, values.get("company_id"), values.get("company"))
                target_company_id = comp.company_id
            existing = (
                self.db.query(Bill)
                .filter(
                    Bill.bill_id != bill_id,
                    Bill.company_id == target_company_id,
                    func.lower(Bill.bill_name) == clean_name.lower(),
                )
                .first()
            )
            if existing:
                raise HTTPException(
                    status_code=400,
                    detail=f"A bill with provider name '{clean_name}' already exists."
                )
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

        existing_payment = (
            self.db.query(BillPayment)
            .filter(
                BillPayment.bill_id == bill_id,
                BillPayment.period_key == period_key,
            )
            .first()
        )

        current_paid = existing_payment.amount if existing_payment else 0.0
        remaining = max(0.0, bill.amount - current_paid)
        if data.amount > (remaining + 0.01):
            raise HTTPException(
                status_code=400,
                detail=f"Amount paid cannot be greater than the Monthly Bill Amount or remaining balance (₱{remaining:,.2f})."
            )

        if existing_payment:
            existing_payment.amount += data.amount
            existing_payment.payment_date = data.payment_date
            existing_payment.payment_method = data.payment_method.strip()
            if data.reference_no:
                existing_payment.reference_no = (
                    f"{existing_payment.reference_no}, {data.reference_no}"
                    if existing_payment.reference_no
                    else data.reference_no
                )
            if data.notes:
                existing_payment.notes = (
                    f"{existing_payment.notes}; {data.notes}"
                    if existing_payment.notes
                    else data.notes
                )
        else:
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
            raise HTTPException(status_code=409, detail="Failed to record bill payment.")
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