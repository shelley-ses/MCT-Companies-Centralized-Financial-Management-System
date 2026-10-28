import json
from calendar import monthrange
from datetime import date, datetime, timedelta
from decimal import Decimal, ROUND_HALF_UP
from typing import Any, Dict, List, Optional, Tuple
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.loan import Loan, LoanRepayment
from app.models.company import Company


def quantize(value: Decimal | float | int | str) -> Decimal:
    """Helper to round monetary values to 2 decimal places."""
    if not isinstance(value, Decimal):
        value = Decimal(str(value))
    return value.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def parse_date(val: Any) -> Optional[date]:
    """Parse date from date object or ISO string."""
    if not val:
        return None
    if isinstance(val, date):
        return val
    if isinstance(val, datetime):
        return val.date()
    try:
        return date.fromisoformat(str(val).split("T")[0])
    except Exception:
        return None


class LendingService:
    """
    Centralized lending business logic service.
    Contains pure calculations, schedule generators, period locking rules,
    and database persistence operations for lending facilities.
    """

    # -------------------------------------------------------------------------
    # 1. PURE CALCULATION & SCHEDULE HELPERS
    # -------------------------------------------------------------------------

    @staticmethod
    def get_months_between(start_val: Any, end_val: Any) -> int:
        """Calculate calendar months between two dates."""
        start = parse_date(start_val)
        end = parse_date(end_val)
        if not start or not end:
            return 1
        months = (end.year - start.year) * 12 + (end.month - start.month)
        if end.day > start.day:
            months += 1
        return max(1, months)

    @staticmethod
    def get_cycle_due_date(
        date_borrowed_val: Any,
        final_due_date_val: Any,
        frequency: str,
        cycle_index: int,
        total_cycles: int,
    ) -> str:
        """
        Calculate the due date for a specific installment cycle.
        Index is 1-based (1 for first cycle, total_cycles for final cycle).
        """
        final_due = parse_date(final_due_date_val)
        borrowed = parse_date(date_borrowed_val)
        if not borrowed:
            return str(final_due) if final_due else ""

        if cycle_index >= total_cycles and final_due:
            return final_due.isoformat()

        freq = (frequency or "Daily").strip().capitalize()

        if freq == "Daily":
            target = borrowed + timedelta(days=cycle_index)
            if final_due and target > final_due:
                return final_due.isoformat()
            return target.isoformat()

        if freq == "Monthly":
            month_offset = cycle_index
            target_year = borrowed.year + (borrowed.month - 1 + month_offset) // 12
            target_month = ((borrowed.month - 1 + month_offset) % 12) + 1
            max_day = monthrange(target_year, target_month)[1]
            target_day = min(borrowed.day, max_day)
            target = date(target_year, target_month, target_day)
            if final_due and target > final_due:
                return final_due.isoformat()
            return target.isoformat()

        if freq == "Quarterly":
            month_offset = cycle_index * 3
            target_year = borrowed.year + (borrowed.month - 1 + month_offset) // 12
            target_month = ((borrowed.month - 1 + month_offset) % 12) + 1
            max_day = monthrange(target_year, target_month)[1]
            target_day = min(borrowed.day, max_day)
            target = date(target_year, target_month, target_day)
            if final_due and target > final_due:
                return final_due.isoformat()
            return target.isoformat()

        if freq == "Annually":
            target_year = borrowed.year + cycle_index
            max_day = monthrange(target_year, borrowed.month)[1]
            target_day = min(borrowed.day, max_day)
            target = date(target_year, borrowed.month, target_day)
            if final_due and target > final_due:
                return final_due.isoformat()
            return target.isoformat()

        return final_due.isoformat() if final_due else borrowed.isoformat()

    @classmethod
    def calculate_facility(
        cls,
        principal: Decimal | float | int,
        interest_rate: Decimal | float | int,
        frequency: str,
        start_date_val: Any,
        due_date_val: Any,
    ) -> Dict[str, Any]:
        """
        Pure business calculation of loan financial terms and installment targets.
        """
        p = quantize(principal)
        r = quantize(interest_rate)
        start = parse_date(start_date_val) or date.today()
        due = parse_date(due_date_val) or (start + timedelta(days=30))

        interest = quantize(p * (r / Decimal("100.00")))
        total_payable = quantize(p + interest)

        freq = (frequency or "Daily").strip().capitalize()
        if freq not in {"Daily", "Monthly", "Quarterly", "Annually"}:
            freq = "Daily"

        if freq == "Daily":
            days = max(1, (due - start).days)
            cycles = days
            installment = quantize(total_payable / Decimal(str(cycles)))
        elif freq == "Monthly":
            cycles = cls.get_months_between(start, due)
            installment = quantize(total_payable / Decimal(str(cycles)))
        elif freq == "Quarterly":
            months = cls.get_months_between(start, due)
            cycles = max(1, (months + 2) // 3)
            installment = quantize(total_payable / Decimal(str(cycles)))
        else:  # Annually
            years = max(1, due.year - start.year)
            cycles = years
            installment = quantize(total_payable / Decimal(str(cycles)))

        return {
            "principal": float(p),
            "interest_rate": float(r),
            "interest": float(interest),
            "total_payable": float(total_payable),
            "frequency": freq,
            "cycle_count": cycles,
            "installment_target": float(installment),
            "date_borrowed": start.isoformat(),
            "due_date": due.isoformat(),
        }

    @classmethod
    def get_monthly_progress(
        cls,
        date_borrowed_val: Any,
        due_date_val: Any,
        total_payable: float | Decimal,
        repayments: List[Dict[str, Any]],
    ) -> Dict[str, Any]:
        """
        Calculate installment breakdown and active month progress for monthly facilities.
        """
        total_months = cls.get_months_between(date_borrowed_val, due_date_val)
        payable_dec = quantize(total_payable)
        target_per_month = quantize(payable_dec / Decimal(str(total_months)))
        today_iso = date.today().isoformat()

        # Aggregate payments made per month index
        month_paid_map: Dict[int, Decimal] = {}
        for r in repayments:
            idx = r.get("month_index")
            amt = quantize(r.get("amount", 0))
            if idx is not None and int(idx) >= 1:
                month_paid_map[int(idx)] = month_paid_map.get(int(idx), Decimal("0.00")) + amt

        month_details = []
        active_month = None

        for m in range(1, total_months + 1):
            is_last = m == total_months
            expected = payable_dec - (target_per_month * Decimal(str(total_months - 1))) if is_last else target_per_month
            paid = month_paid_map.get(m, Decimal("0.00"))
            rem = max(Decimal("0.00"), expected - paid)
            cycle_due = cls.get_cycle_due_date(date_borrowed_val, due_date_val, "Monthly", m, total_months)
            is_overdue = (today_iso > cycle_due) and (rem > Decimal("0.00"))
            is_settled = rem <= Decimal("0.00") and paid > Decimal("0.00")

            if is_settled:
                status_str = "Paid"
            elif paid > Decimal("0.00"):
                status_str = "Partial"
            else:
                status_str = "Unpaid"

            info = {
                "month_index": m,
                "target": float(expected),
                "paid": float(paid),
                "remaining": float(rem),
                "status": status_str,
                "dueDate": cycle_due,
                "isOverdue": is_overdue,
                "isLocked": is_settled,
            }
            month_details.append(info)

            if not active_month and rem > Decimal("0.00"):
                active_month = info

        if not active_month:
            active_month = month_details[-1] if month_details else {
                "month_index": 1,
                "target": float(target_per_month),
                "paid": 0.0,
                "remaining": float(target_per_month),
                "status": "Unpaid",
                "dueDate": str(due_date_val or ""),
                "isOverdue": False,
                "isLocked": False,
            }

        return {
            "totalMonths": total_months,
            "targetPerMonth": float(target_per_month),
            "monthDetails": month_details,
            "activeMonth": active_month,
        }

    @classmethod
    def get_next_installment_info(
        cls,
        date_borrowed_val: Any,
        due_date_val: Any,
        frequency: str,
        total_payable: float | Decimal,
        amount_paid: float | Decimal,
    ) -> Optional[Dict[str, Any]]:
        """
        Derive the upcoming installment cycle label, due date, target, and overdue status.
        """
        freq = (frequency or "Daily").strip().capitalize()
        if freq == "Daily":
            return None

        total_months = cls.get_months_between(date_borrowed_val, due_date_val)
        payable_dec = quantize(total_payable)
        paid_dec = quantize(amount_paid)

        if freq == "Monthly":
            total_cycles = total_months
            cycle_name = "Month"
        elif freq == "Quarterly":
            total_cycles = max(1, (total_months + 2) // 3)
            cycle_name = "Quarter"
        else:  # Annually
            start = parse_date(date_borrowed_val) or date.today()
            due = parse_date(due_date_val) or (start + timedelta(days=365))
            total_cycles = max(1, due.year - start.year)
            cycle_name = "Year"

        target_per_cycle = quantize(payable_dec / Decimal(str(total_cycles)))
        completed_cycles = int(paid_dec // target_per_cycle) if target_per_cycle > 0 else 0
        active_index = min(total_cycles, completed_cycles + 1)
        cycle_due = cls.get_cycle_due_date(date_borrowed_val, due_date_val, freq, active_index, total_cycles)
        today_iso = date.today().isoformat()
        is_overdue = (today_iso > cycle_due) and (paid_dec < payable_dec)

        return {
            "periodLabel": f"{cycle_name} {active_index}",
            "dueDate": cycle_due,
            "targetAmount": float(target_per_cycle),
            "isOverdue": is_overdue,
            "cycleIndex": active_index,
            "totalCycles": total_cycles,
        }

    @classmethod
    def build_daily_ledger(
        cls,
        date_borrowed_val: Any,
        due_date_val: Any,
        repayments: List[Dict[str, Any]],
    ) -> List[Dict[str, Any]]:
        """
        Build complete calendar day ledger for daily loans including unrecorded missed dates.
        Paid dates have is_locked = True.
        """
        start = parse_date(date_borrowed_val) or date.today()
        today = date.today()
        due = parse_date(due_date_val) or today
        end = today if today > start else (due if due > start else start)

        paid_map: Dict[str, Dict[str, Any]] = {}
        for r in repayments:
            p_date = str(r.get("date") or r.get("payment_date") or "").split("T")[0]
            if p_date:
                paid_map[p_date] = r

        ledger = []
        cur = start
        while cur <= end:
            iso = cur.isoformat()
            if iso in paid_map:
                existing = paid_map[iso]
                ledger.append({
                    "id": str(existing.get("id") or f"paid-{iso}"),
                    "date": iso,
                    "amount": float(existing.get("amount", 0)),
                    "method": str(existing.get("method") or existing.get("payment_method") or "Cash"),
                    "referenceNo": str(existing.get("referenceNo") or existing.get("reference_no") or "-"),
                    "notes": str(existing.get("notes") or "-"),
                    "status": "Paid",
                    "timestamp": str(existing.get("timestamp") or iso),
                    "isLocked": True,
                })
            else:
                ledger.append({
                    "id": f"missed-{iso}",
                    "date": iso,
                    "amount": 0.0,
                    "method": "-",
                    "referenceNo": "-",
                    "notes": "-",
                    "status": "Missed",
                    "timestamp": iso,
                    "isLocked": False,
                })
            cur += timedelta(days=1)

        # Sort descending (most recent first)
        ledger.sort(key=lambda x: x["date"], reverse=True)
        return ledger

    # -------------------------------------------------------------------------
    # 2. VALIDATION & PERIOD SETTLEMENT LOCKING
    # -------------------------------------------------------------------------

    @classmethod
    def check_period_settlement(
        cls,
        frequency: str,
        payment_date_val: Any,
        repayments: List[Dict[str, Any]],
    ) -> Tuple[bool, Optional[str]]:
        """
        Checks whether the specified period or date is already settled and locked.
        Returns (is_locked, reason).
        """
        freq = (frequency or "Daily").strip().capitalize()
        p_date = parse_date(payment_date_val)
        if not p_date:
            return False, None

        iso_date = p_date.isoformat()

        if freq == "Daily":
            # For daily agreements: once a date has a paid record, it cannot receive duplicate collections
            for r in repayments:
                r_date = str(r.get("date") or r.get("payment_date") or "").split("T")[0]
                status_val = str(r.get("status") or "").capitalize()
                if r_date == iso_date and (status_val in {"Paid", "Completed"} or r.get("amount", 0) > 0):
                    return True, f"Date {iso_date} is already fully paid and locked. You cannot record another payment for this date."

        return False, None

    @staticmethod
    def validate_payment_bounds(amount: Decimal | float, remaining_balance: Decimal | float) -> None:
        """Enforces minimum 1.00 peso and remaining balance ceiling."""
        amt = quantize(amount)
        rem = quantize(remaining_balance)
        if amt < Decimal("1.00"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Payment Amount cannot be lower than 1.00.",
            )
        if amt > rem:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Payment amount ({float(amt)}) cannot exceed the remaining balance ({float(rem)}).",
            )

    # -------------------------------------------------------------------------
    # 3. DATABASE REPOSITORY OPERATIONS
    # -------------------------------------------------------------------------

    @classmethod
    def parse_facility_description(cls, desc_str: Optional[str]) -> Dict[str, Any]:
        """Extract structured JSON metadata from loan description if present."""
        if not desc_str:
            return {"borrower_name": "Unknown", "frequency": "Daily", "notes": ""}
        try:
            parsed = json.loads(desc_str)
            if isinstance(parsed, dict):
                return parsed
        except Exception:
            pass
        return {"borrower_name": desc_str.strip(), "frequency": "Daily", "notes": desc_str}

    @classmethod
    def serialize_facility_description(
        cls, borrower_name: str, frequency: str, notes: Optional[str] = ""
    ) -> str:
        """Serialize facility metadata into description JSON string."""
        data = {
            "borrower_name": borrower_name.strip(),
            "frequency": frequency.strip().capitalize(),
            "notes": (notes or "").strip(),
        }
        return json.dumps(data)

    @classmethod
    def get_facilities(cls, db: Session, company_id: Optional[int] = None) -> List[Dict[str, Any]]:
        """Retrieve lending facilities with calculated summary balances and schedules."""
        query = db.query(Loan)
        if company_id:
            query = query.filter(Loan.borrower == company_id)

        loans = query.order_by(Loan.created_at.desc()).all()
        results = []

        for loan in loans:
            meta = cls.parse_facility_description(loan.description)
            freq = meta.get("frequency", "Daily")
            borrower_name = meta.get("borrower_name") or f"Borrower #{loan.borrower}"

            repayments = (
                db.query(LoanRepayment)
                .filter(LoanRepayment.loan_id == loan.loan_id)
                .order_by(LoanRepayment.payment_date.desc(), LoanRepayment.created_at.desc())
                .all()
            )

            repayment_dicts = [
                {
                    "id": str(r.loan_repayment_id),
                    "payment_date": r.payment_date.isoformat() if r.payment_date else "",
                    "date": r.payment_date.isoformat() if r.payment_date else "",
                    "amount": float(r.amount or 0),
                    "method": r.reference_no.split(" - ")[0] if r.reference_no and " - " in r.reference_no else "Cash",
                    "referenceNo": r.reference_no or "-",
                    "notes": r.notes or "-",
                    "status": "Paid" if (r.status or "").lower() == "completed" else (r.status or "Paid"),
                    "timestamp": r.created_at.isoformat() if r.created_at else "",
                }
                for r in repayments
            ]

            terms = cls.calculate_facility(
                principal=loan.principal_amount,
                interest_rate=loan.interest_rate or 0,
                frequency=freq,
                start_date_val=loan.loan_date,
                due_date_val=loan.due_date,
            )

            total_paid = sum((Decimal(str(r["amount"])) for r in repayment_dicts), Decimal("0.00"))
            total_payable = Decimal(str(terms["total_payable"]))
            remaining_balance = max(Decimal("0.00"), total_payable - total_paid)

            today_iso = date.today().isoformat()
            due_iso = loan.due_date.isoformat() if loan.due_date else ""
            if remaining_balance <= Decimal("0.00"):
                derived_status = "Completed"
            elif due_iso and today_iso > due_iso:
                derived_status = "Overdue"
            else:
                derived_status = "Active"

            facility_item = {
                "id": str(loan.loan_id),
                "loanId": loan.loan_id,
                "loanRefNo": loan.loan_ref_no or f"FAC-{loan.loan_id}",
                "borrowerName": borrower_name,
                "loanAmount": float(loan.principal_amount),
                "interestRate": float(loan.interest_rate or 0),
                "interestAmount": terms["interest"],
                "totalAmountPayable": float(total_payable),
                "amountPaid": float(total_paid),
                "remainingBalance": float(remaining_balance),
                "dateBorrowed": loan.loan_date.isoformat() if loan.loan_date else "",
                "dueDate": due_iso,
                "status": derived_status,
                "paymentFrequency": freq,
                "notes": meta.get("notes", ""),
                "dailyPayments": repayment_dicts,
            }
            results.append(facility_item)

        return results

    @classmethod
    def get_facility_ledger(cls, db: Session, loan_id: int) -> Dict[str, Any]:
        """Fetch facility details and generate its complete schedule ledger."""
        loan = db.query(Loan).filter(Loan.loan_id == loan_id).first()
        if not loan:
            raise HTTPException(status_code=404, detail="Lending facility not found.")

        meta = cls.parse_facility_description(loan.description)
        freq = meta.get("frequency", "Daily")

        repayments = (
            db.query(LoanRepayment)
            .filter(LoanRepayment.loan_id == loan.loan_id)
            .order_by(LoanRepayment.payment_date.desc(), LoanRepayment.created_at.desc())
            .all()
        )

        repayment_dicts = [
            {
                "id": str(r.loan_repayment_id),
                "date": r.payment_date.isoformat() if r.payment_date else "",
                "payment_date": r.payment_date.isoformat() if r.payment_date else "",
                "amount": float(r.amount or 0),
                "method": r.reference_no.split(" - ")[0] if r.reference_no and " - " in r.reference_no else "Cash",
                "referenceNo": r.reference_no or "-",
                "notes": r.notes or "-",
                "status": "Paid" if (r.status or "").lower() == "completed" else (r.status or "Paid"),
                "timestamp": r.created_at.isoformat() if r.created_at else "",
            }
            for r in repayments
        ]

        terms = cls.calculate_facility(
            principal=loan.principal_amount,
            interest_rate=loan.interest_rate or 0,
            frequency=freq,
            start_date_val=loan.loan_date,
            due_date_val=loan.due_date,
        )

        total_paid = sum((Decimal(str(r["amount"])) for r in repayment_dicts), Decimal("0.00"))
        total_payable = Decimal(str(terms["total_payable"]))
        remaining_balance = max(Decimal("0.00"), total_payable - total_paid)

        if freq == "Daily":
            ledger_items = cls.build_daily_ledger(loan.loan_date, loan.due_date, repayment_dicts)
            monthly_progress = None
            next_installment = None
        else:
            ledger_items = repayment_dicts
            monthly_progress = cls.get_monthly_progress(
                loan.loan_date, loan.due_date, terms["total_payable"], repayment_dicts
            )
            next_installment = cls.get_next_installment_info(
                loan.loan_date, loan.due_date, freq, total_payable, total_paid
            )

        return {
            "facility_id": str(loan.loan_id),
            "loan_ref_no": loan.loan_ref_no or f"FAC-{loan.loan_id}",
            "borrower_name": meta.get("borrower_name") or f"Borrower #{loan.borrower}",
            "payment_frequency": freq,
            "principal": float(loan.principal_amount),
            "interest_rate": float(loan.interest_rate or 0),
            "total_payable": float(total_payable),
            "amount_paid": float(total_paid),
            "remaining_balance": float(remaining_balance),
            "date_borrowed": loan.loan_date.isoformat() if loan.loan_date else "",
            "due_date": loan.due_date.isoformat() if loan.due_date else "",
            "ledger_items": ledger_items,
            "monthly_progress": monthly_progress,
            "next_installment": next_installment,
        }

    @classmethod
    def create_facility(
        cls,
        db: Session,
        borrower_name: str,
        principal_amount: Decimal | float,
        interest_rate: Decimal | float,
        frequency: str,
        date_borrowed_val: Any,
        due_date_val: Any,
        notes: Optional[str] = None,
        company_id: Optional[int] = None,
    ) -> Dict[str, Any]:
        """Create a new lending facility record in the database."""
        p = quantize(principal_amount)
        if p < Decimal("1.00"):
            raise HTTPException(status_code=400, detail="Principal amount must be at least 1.00.")

        start = parse_date(date_borrowed_val) or date.today()
        due = parse_date(due_date_val) or (start + timedelta(days=30))
        freq = (frequency or "Daily").strip().capitalize()

        terms = cls.calculate_facility(p, interest_rate, freq, start, due)

        # Resolve or fallback borrower company_id
        resolved_borrower_id = company_id
        if not resolved_borrower_id:
            first_company = db.query(Company).first()
            resolved_borrower_id = first_company.company_id if first_company else 1

        ref_no = f"LN-{datetime.now().strftime('%Y%m%d')}-{int(datetime.now().timestamp() % 10000):04d}"
        desc_json = cls.serialize_facility_description(borrower_name, freq, notes)

        new_loan = Loan(
            borrower=resolved_borrower_id,
            lender=None,
            loan_ref_no=ref_no,
            principal_amount=p,
            interest_rate=Decimal(str(terms["interest_rate"])),
            interest_type="simple",
            loan_date=start,
            due_date=due,
            description=desc_json,
            status="Active",
        )
        db.add(new_loan)
        db.commit()
        db.refresh(new_loan)

        return {
            "id": str(new_loan.loan_id),
            "loanId": new_loan.loan_id,
            "loanRefNo": new_loan.loan_ref_no,
            "borrowerName": borrower_name,
            "loanAmount": float(p),
            "interestRate": float(terms["interest_rate"]),
            "interestAmount": terms["interest"],
            "totalAmountPayable": terms["total_payable"],
            "amountPaid": 0.0,
            "remainingBalance": terms["total_payable"],
            "dateBorrowed": start.isoformat(),
            "dueDate": due.isoformat(),
            "status": "Active",
            "paymentFrequency": freq,
            "notes": notes or "",
            "dailyPayments": [],
        }

    @classmethod
    def record_payment(
        cls,
        db: Session,
        loan_id: int,
        payment_date_val: Any,
        amount_val: Decimal | float,
        method: str,
        reference_no: Optional[str] = None,
        notes: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Record a payment remittance with period settlement locking and boundary validations.
        """
        loan = db.query(Loan).filter(Loan.loan_id == loan_id).first()
        if not loan:
            raise HTTPException(status_code=404, detail="Lending facility not found.")

        meta = cls.parse_facility_description(loan.description)
        freq = meta.get("frequency", "Daily")

        # Fetch existing payments
        existing_repayments = (
            db.query(LoanRepayment)
            .filter(LoanRepayment.loan_id == loan.loan_id)
            .order_by(LoanRepayment.payment_date.desc())
            .all()
        )
        repayment_dicts = [
            {
                "date": r.payment_date.isoformat() if r.payment_date else "",
                "amount": float(r.amount or 0),
                "status": "Paid" if (r.status or "").lower() == "completed" else "Paid",
            }
            for r in existing_repayments
        ]

        # 1. Enforce period settlement locking
        is_locked, lock_reason = cls.check_period_settlement(freq, payment_date_val, repayment_dicts)
        if is_locked:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=lock_reason or "Period or date is already fully settled and locked.",
            )

        # 2. Compute current balances and check bounds
        terms = cls.calculate_facility(
            loan.principal_amount,
            loan.interest_rate or 0,
            freq,
            loan.loan_date,
            loan.due_date,
        )
        total_paid_before = sum((Decimal(str(r["amount"])) for r in repayment_dicts), Decimal("0.00"))
        remaining_before = max(Decimal("0.00"), Decimal(str(terms["total_payable"])) - total_paid_before)

        payment_amount = quantize(amount_val)
        cls.validate_payment_bounds(payment_amount, remaining_before)

        # 3. Create LoanRepayment record
        pay_date = parse_date(payment_date_val) or date.today()
        ref_text = f"{method.strip()} - {reference_no.strip()}" if reference_no and reference_no.strip() else method.strip()

        new_repayment = LoanRepayment(
            loan_id=loan.loan_id,
            payment_date=pay_date,
            due_date=loan.due_date,
            amount=payment_amount,
            remaining_balance=max(Decimal("0.00"), remaining_before - payment_amount),
            reference_no=ref_text,
            status="completed",
            notes=(notes or "").strip(),
            received_at=datetime.now(),
        )
        db.add(new_repayment)

        # 4. Update loan status if fully paid
        updated_remaining = remaining_before - payment_amount
        if updated_remaining <= Decimal("0.00"):
            loan.status = "Completed"
        db.commit()
        db.refresh(new_repayment)

        return {
            "repayment_id": new_repayment.loan_repayment_id,
            "loan_id": loan.loan_id,
            "payment_date": pay_date.isoformat(),
            "amount": float(payment_amount),
            "remaining_balance": float(updated_remaining),
            "status": "Paid",
            "reference_no": ref_text,
            "notes": notes or "",
        }
