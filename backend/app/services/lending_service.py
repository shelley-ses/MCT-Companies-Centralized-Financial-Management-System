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
from app.models.lending import LendingFacility, LendingTransaction


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
        interest_rate: Decimal | float | int = Decimal("20.00"),
        frequency: str = "Daily",
        start_date_val: Any = None,
        due_date_val: Any = None,
        term_days_val: Optional[int] = None,
    ) -> Dict[str, Any]:
        """
        Authoritative calculation of loan financial terms, installment targets, and 5% penalty rate.
        Defaults: 40 days for Daily, 60 days for Monthly, and 20.0% interest rate.
        """
        p = quantize(principal)
        r = quantize(interest_rate if interest_rate is not None else Decimal("20.00"))
        start = parse_date(start_date_val) or date.today()
        freq = (frequency or "Daily").strip().capitalize()
        if freq not in {"Daily", "Monthly", "Quarterly", "Annually"}:
            freq = "Daily"

        if term_days_val is not None and int(term_days_val) > 0:
            term_days = int(term_days_val)
        else:
            term_days = 40 if freq == "Daily" else (60 if freq == "Monthly" else 90)

        due = parse_date(due_date_val)
        if not due:
            due = start + timedelta(days=term_days)

        interest = quantize(p * (r / Decimal("100.00")))
        total_payable = quantize(p + interest)

        if freq == "Daily":
            cycles = max(1, term_days)
            installment = quantize(total_payable / Decimal(str(cycles)))
        elif freq == "Monthly":
            cycles = max(1, term_days // 30) if term_days else cls.get_months_between(start, due)
            installment = quantize(total_payable / Decimal(str(cycles)))
        elif freq == "Quarterly":
            months = cls.get_months_between(start, due)
            cycles = max(1, (months + 2) // 3)
            installment = quantize(total_payable / Decimal(str(cycles)))
        else:  # Annually
            years = max(1, due.year - start.year)
            cycles = years
            installment = quantize(total_payable / Decimal(str(cycles)))

        penalty_rate = Decimal("5.00")
        penalty_per_cycle = quantize(installment * (penalty_rate / Decimal("100.00")))

        return {
            "principal": float(p),
            "interest_rate": float(r),
            "interest": float(interest),
            "total_payable": float(total_payable),
            "frequency": freq,
            "cycle_count": cycles,
            "installment_target": float(installment),
            "term_days": int(term_days),
            "penalty_rate": float(penalty_rate),
            "penalty_per_cycle": float(penalty_per_cycle),
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
        term_days: int = 60,
    ) -> Dict[str, Any]:
        """
        Calculate installment breakdown, forward advance crediting, and flat 5% penalties for monthly facilities.
        """
        total_months = max(1, term_days // 30) if term_days else cls.get_months_between(date_borrowed_val, due_date_val)
        payable_dec = quantize(total_payable)
        target_per_month = quantize(payable_dec / Decimal(str(total_months)))
        today_iso = date.today().isoformat()

        # Aggregate payments made per month index or payment date
        month_paid_map: Dict[int, Decimal] = {}
        for r in repayments:
            idx = r.get("month_index")
            amt = quantize(r.get("amount", 0))
            if idx is not None and int(idx) >= 1:
                month_paid_map[int(idx)] = month_paid_map.get(int(idx), Decimal("0.00")) + amt
            else:
                p_date = parse_date(r.get("date") or r.get("payment_date"))
                start = parse_date(date_borrowed_val) or date.today()
                if p_date and p_date >= start:
                    m_idx = min(total_months, max(1, ((p_date.year - start.year) * 12 + (p_date.month - start.month) + 1)))
                    month_paid_map[m_idx] = month_paid_map.get(m_idx, Decimal("0.00")) + amt

        month_details = []
        active_month = None
        available_credit = Decimal("0.00")
        total_penalties = Decimal("0.00")
        missed_count = 0
        penalty_per_month = quantize(target_per_month * Decimal("0.05"))

        for m in range(1, total_months + 1):
            is_last = m == total_months
            expected = payable_dec - (target_per_month * Decimal(str(total_months - 1))) if is_last else target_per_month
            direct_paid = month_paid_map.get(m, Decimal("0.00"))
            available_funds = direct_paid + available_credit
            cycle_due = cls.get_cycle_due_date(date_borrowed_val, due_date_val, "Monthly", m, total_months)

            if available_funds >= expected and expected > 0:
                available_credit = available_funds - expected
                rem = Decimal("0.00")
                status_str = "Paid" if direct_paid > 0 else "Advance Paid"
                is_settled = True
                is_overdue = False
                month_penalty = 0.0
            elif available_funds > 0:
                rem = expected - available_funds
                available_credit = Decimal("0.00")
                is_settled = False
                is_overdue = today_iso > cycle_due
                if is_overdue:
                    missed_count += 1
                    total_penalties += penalty_per_month
                    month_penalty = float(penalty_per_month)
                    status_str = "Partial"
                else:
                    month_penalty = 0.0
                    status_str = "Partial"
            else:
                rem = expected
                is_settled = False
                is_overdue = today_iso > cycle_due
                if is_overdue:
                    missed_count += 1
                    total_penalties += penalty_per_month
                    month_penalty = float(penalty_per_month)
                    status_str = "Missed"
                else:
                    month_penalty = 0.0
                    status_str = "Unpaid"

            info = {
                "month_index": m,
                "target": float(expected),
                "paid": float(direct_paid),
                "remaining": float(rem),
                "status": status_str,
                "dueDate": cycle_due,
                "isOverdue": is_overdue,
                "isLocked": is_settled,
                "penalty": month_penalty,
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
                "penalty": 0.0,
            }

        if missed_count == 0:
            compliance_status = "Compliant"
        elif missed_count == 1:
            compliance_status = "Delayed"
        else:
            compliance_status = "Delinquent"

        return {
            "totalMonths": total_months,
            "targetPerMonth": float(target_per_month),
            "monthDetails": month_details,
            "activeMonth": active_month,
            "totalPenalties": float(total_penalties),
            "advanceAmount": float(available_credit),
            "complianceStatus": compliance_status,
            "missedCyclesCount": missed_count,
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
        term_days: int = 40,
        installment_target: float | Decimal = 0.0,
        penalty_per_cycle: float | Decimal = 0.0,
    ) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
        """
        Build complete calendar day ledger for daily loans including advance forward crediting,
        transaction date validation, flat 5% penalties for missed dates, and compliance tier.
        """
        start = parse_date(date_borrowed_val) or date.today()
        today = date.today()
        safe_term_days = int(term_days) if term_days is not None else 40
        due = parse_date(due_date_val) or (start + timedelta(days=safe_term_days))
        end_date = max(today, start + timedelta(days=max(1, safe_term_days) - 1))

        # Group payments by payment date (actual transaction date)
        day_payments: Dict[str, List[Dict[str, Any]]] = {}
        for r in repayments:
            p_date = str(r.get("date") or r.get("payment_date") or "").split("T")[0]
            if p_date:
                if p_date not in day_payments:
                    day_payments[p_date] = []
                day_payments[p_date].append(r)

        target_dec = quantize(installment_target)
        penalty_dec = quantize(penalty_per_cycle if penalty_per_cycle > 0 else (target_dec * Decimal("0.05")))
        available_credit = Decimal("0.00")
        total_penalties = Decimal("0.00")
        missed_count = 0

        ledger_rows = []
        cur = start
        while cur <= end_date:
            iso = cur.isoformat()
            payments_today = day_payments.get(iso, [])
            paid_today = sum((Decimal(str(p.get("amount", 0))) for p in payments_today), Decimal("0.00"))
            available_funds = paid_today + available_credit

            if available_funds >= target_dec and target_dec > Decimal("0.00"):
                available_credit = available_funds - target_dec
                if paid_today > Decimal("0.00"):
                    status_str = "Paid"
                    method_str = payments_today[0].get("method", "Cash") if payments_today else "Cash"
                    ref_str = payments_today[0].get("referenceNo", "-") if payments_today else "-"
                    notes_str = payments_today[0].get("notes", "-") if payments_today else "-"
                else:
                    status_str = "Advance Paid"
                    method_str = "Advance Credit"
                    ref_str = "ADVANCE"
                    notes_str = "Covered by advance payment"

                ledger_rows.append({
                    "id": f"day-{iso}",
                    "date": iso,
                    "amount": float(paid_today),
                    "target": float(target_dec),
                    "method": method_str,
                    "referenceNo": ref_str,
                    "notes": notes_str,
                    "status": status_str,
                    "penalty": 0.0,
                    "timestamp": iso,
                    "isLocked": True,
                })
            elif available_funds > Decimal("0.00"):
                available_credit = Decimal("0.00")
                if cur < today:
                    missed_count += 1
                    total_penalties += penalty_dec
                    item_penalty = float(penalty_dec)
                    status_str = "Partial"
                else:
                    item_penalty = 0.0
                    status_str = "Partial"

                method_str = payments_today[0].get("method", "Cash") if payments_today else "Cash"
                ref_str = payments_today[0].get("referenceNo", "-") if payments_today else "-"
                notes_str = payments_today[0].get("notes", "-") if payments_today else "-"

                ledger_rows.append({
                    "id": f"day-{iso}",
                    "date": iso,
                    "amount": float(paid_today),
                    "target": float(target_dec),
                    "method": method_str,
                    "referenceNo": ref_str,
                    "notes": notes_str,
                    "status": status_str,
                    "penalty": item_penalty,
                    "timestamp": iso,
                    "isLocked": False,
                })
            else:
                if cur < today:
                    missed_count += 1
                    total_penalties += penalty_dec
                    item_penalty = float(penalty_dec)
                    status_str = "Missed"
                elif cur == today:
                    item_penalty = 0.0
                    status_str = "Pending"
                else:
                    item_penalty = 0.0
                    status_str = "Scheduled"

                ledger_rows.append({
                    "id": f"day-{iso}",
                    "date": iso,
                    "amount": 0.0,
                    "target": float(target_dec),
                    "method": "-",
                    "referenceNo": "-",
                    "notes": "-",
                    "status": status_str,
                    "penalty": item_penalty,
                    "timestamp": iso,
                    "isLocked": False,
                })

            cur += timedelta(days=1)

        if missed_count == 0:
            compliance_status = "Compliant"
        elif missed_count == 1:
            compliance_status = "Delayed"
        else:
            compliance_status = "Delinquent"

        ledger_rows.sort(key=lambda x: x["date"], reverse=True)

        meta = {
            "total_penalties": float(total_penalties),
            "advance_amount": float(available_credit),
            "compliance_status": compliance_status,
            "missed_cycles_count": missed_count,
        }
        return ledger_rows, meta

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
            return {"borrower_name": "Unknown", "frequency": "Daily", "term_days": 40, "penalty_rate": 5.0, "notes": ""}
        try:
            parsed = json.loads(desc_str)
            if isinstance(parsed, dict):
                freq = parsed.get("frequency", "Daily")
                if "term_days" not in parsed:
                    parsed["term_days"] = 40 if freq == "Daily" else (60 if freq == "Monthly" else 90)
                if "penalty_rate" not in parsed:
                    parsed["penalty_rate"] = 5.0
                return parsed
        except Exception:
            pass
        return {"borrower_name": desc_str.strip(), "frequency": "Daily", "term_days": 40, "penalty_rate": 5.0, "notes": desc_str}

    @classmethod
    def serialize_facility_description(
        cls,
        borrower_name: str,
        frequency: str,
        notes: Optional[str] = "",
        term_days: int = 40,
        penalty_rate: float = 5.0,
    ) -> str:
        """Serialize facility metadata into description JSON string."""
        data = {
            "borrower_name": borrower_name.strip(),
            "frequency": frequency.strip().capitalize(),
            "term_days": int(term_days),
            "penalty_rate": float(penalty_rate),
            "notes": (notes or "").strip(),
        }
        return json.dumps(data)

    @classmethod
    def get_facilities(cls, db: Session, borrower_query: Optional[str] = None) -> List[Dict[str, Any]]:
        """Retrieve lending facilities with calculated summary balances, accrued penalties, and schedules."""
        fac_query = db.query(LendingFacility)
        if borrower_query and str(borrower_query).strip():
            fac_query = fac_query.filter(LendingFacility.borrower_name.ilike(f"%{str(borrower_query).strip()}%"))
        facilities = fac_query.order_by(LendingFacility.created_at.desc()).all()

        results = []

        if facilities:
            for fac in facilities:
                freq = fac.payment_frequency or "Daily"
                borrower_name = fac.borrower_name
                term_days = fac.term_days or (40 if freq == "Daily" else 60)

                txs = (
                    db.query(LendingTransaction)
                    .filter(LendingTransaction.facility_id == fac.facility_id)
                    .order_by(LendingTransaction.payment_date.desc(), LendingTransaction.created_at.desc())
                    .all()
                )

                repayment_dicts = [
                    {
                        "id": str(t.transaction_id),
                        "payment_date": t.payment_date.isoformat() if t.payment_date else "",
                        "date": t.payment_date.isoformat() if t.payment_date else "",
                        "amount": float(t.amount or 0),
                        "method": t.payment_method or "Cash",
                        "referenceNo": t.reference_no or "-",
                        "notes": t.notes or "-",
                        "status": "Paid" if (t.status or "").lower() == "completed" else (t.status or "Paid"),
                        "timestamp": t.created_at.isoformat() if t.created_at else "",
                    }
                    for t in txs
                ]

                terms = cls.calculate_facility(
                    principal=fac.principal_amount,
                    interest_rate=fac.interest_rate or Decimal("20.00"),
                    frequency=freq,
                    start_date_val=fac.date_borrowed,
                    due_date_val=fac.due_date,
                    term_days_val=term_days,
                )

                total_paid = sum((Decimal(str(r["amount"])) for r in repayment_dicts), Decimal("0.00"))

                if freq == "Daily":
                    _, ledger_meta = cls.build_daily_ledger(
                        fac.date_borrowed,
                        fac.due_date,
                        repayment_dicts,
                        term_days=terms["term_days"],
                        installment_target=terms["installment_target"],
                        penalty_per_cycle=terms["penalty_per_cycle"],
                    )
                    total_penalties = Decimal(str(ledger_meta["total_penalties"]))
                    advance_amount = Decimal(str(ledger_meta["advance_amount"]))
                    compliance_status = ledger_meta["compliance_status"]
                    missed_cycles_count = ledger_meta["missed_cycles_count"]
                else:
                    progress = cls.get_monthly_progress(
                        fac.date_borrowed,
                        fac.due_date,
                        terms["total_payable"],
                        repayment_dicts,
                        term_days=terms["term_days"],
                    )
                    total_penalties = Decimal(str(progress["totalPenalties"]))
                    advance_amount = Decimal(str(progress["advanceAmount"]))
                    compliance_status = progress["complianceStatus"]
                    missed_cycles_count = progress["missedCyclesCount"]

                total_payable_with_penalties = Decimal(str(terms["total_payable"])) + total_penalties
                remaining_balance = max(Decimal("0.00"), total_payable_with_penalties - total_paid)

                today_iso = date.today().isoformat()
                due_iso = fac.due_date.isoformat() if fac.due_date else ""
                if remaining_balance <= Decimal("0.00"):
                    derived_status = "Completed"
                elif compliance_status == "Delinquent" or (due_iso and today_iso > due_iso):
                    derived_status = "Overdue"
                else:
                    derived_status = fac.status or "Active"

                results.append({
                    "id": str(fac.facility_id),
                    "loanId": fac.facility_id,
                    "loanRefNo": fac.facility_ref_no or f"FAC-{fac.facility_id}",
                    "borrowerName": borrower_name,
                    "borrowerContact": fac.borrower_contact or "",
                    "borrowerAddress": fac.borrower_address or "",
                    "loanAmount": float(fac.principal_amount),
                    "interestRate": float(terms["interest_rate"]),
                    "interestAmount": terms["interest"],
                    "totalAmountPayable": float(total_payable_with_penalties),
                    "amountPaid": float(total_paid),
                    "remainingBalance": float(remaining_balance),
                    "dateBorrowed": fac.date_borrowed.isoformat() if fac.date_borrowed else "",
                    "dueDate": due_iso,
                    "status": derived_status,
                    "paymentFrequency": freq,
                    "termDays": terms["term_days"],
                    "penaltyRate": terms["penalty_rate"],
                    "penaltyPerCycle": terms["penalty_per_cycle"],
                    "totalPenalties": float(total_penalties),
                    "advanceAmount": float(advance_amount),
                    "installmentTarget": terms["installment_target"],
                    "complianceStatus": compliance_status,
                    "missedCyclesCount": missed_cycles_count,
                    "notes": fac.notes or "",
                    "dailyPayments": repayment_dicts,
                })
            return results

        # Legacy fallback query for loans table if lending_facilities is empty
        query = db.query(Loan)
        if company_id:
            query = query.filter(Loan.borrower == company_id)

        loans = query.order_by(Loan.created_at.desc()).all()
        for loan in loans:
            meta = cls.parse_facility_description(loan.description)
            freq = meta.get("frequency", "Daily")
            borrower_name = meta.get("borrower_name") or f"Borrower #{loan.borrower}"
            term_days = meta.get("term_days", 40 if freq == "Daily" else 60)

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
                interest_rate=loan.interest_rate or Decimal("20.00"),
                frequency=freq,
                start_date_val=loan.loan_date,
                due_date_val=loan.due_date,
                term_days_val=term_days,
            )

            total_paid = sum((Decimal(str(r["amount"])) for r in repayment_dicts), Decimal("0.00"))

            if freq == "Daily":
                _, ledger_meta = cls.build_daily_ledger(
                    loan.loan_date,
                    loan.due_date,
                    repayment_dicts,
                    term_days=terms["term_days"],
                    installment_target=terms["installment_target"],
                    penalty_per_cycle=terms["penalty_per_cycle"],
                )
                total_penalties = Decimal(str(ledger_meta["total_penalties"]))
                advance_amount = Decimal(str(ledger_meta["advance_amount"]))
                compliance_status = ledger_meta["compliance_status"]
                missed_cycles_count = ledger_meta["missed_cycles_count"]
            else:
                progress = cls.get_monthly_progress(
                    loan.loan_date,
                    loan.due_date,
                    terms["total_payable"],
                    repayment_dicts,
                    term_days=terms["term_days"],
                )
                total_penalties = Decimal(str(progress["totalPenalties"]))
                advance_amount = Decimal(str(progress["advanceAmount"]))
                compliance_status = progress["complianceStatus"]
                missed_cycles_count = progress["missedCyclesCount"]

            total_payable_with_penalties = Decimal(str(terms["total_payable"])) + total_penalties
            remaining_balance = max(Decimal("0.00"), total_payable_with_penalties - total_paid)

            today_iso = date.today().isoformat()
            due_iso = loan.due_date.isoformat() if loan.due_date else ""
            if remaining_balance <= Decimal("0.00"):
                derived_status = "Completed"
            elif compliance_status == "Delinquent" or (due_iso and today_iso > due_iso):
                derived_status = "Overdue"
            else:
                derived_status = "Active"

            results.append({
                "id": str(loan.loan_id),
                "loanId": loan.loan_id,
                "loanRefNo": loan.loan_ref_no or f"FAC-{loan.loan_id}",
                "borrowerName": borrower_name,
                "loanAmount": float(loan.principal_amount),
                "interestRate": float(terms["interest_rate"]),
                "interestAmount": terms["interest"],
                "totalAmountPayable": float(total_payable_with_penalties),
                "amountPaid": float(total_paid),
                "remainingBalance": float(remaining_balance),
                "dateBorrowed": loan.loan_date.isoformat() if loan.loan_date else "",
                "dueDate": due_iso,
                "status": derived_status,
                "paymentFrequency": freq,
                "termDays": terms["term_days"],
                "penaltyRate": terms["penalty_rate"],
                "penaltyPerCycle": terms["penalty_per_cycle"],
                "totalPenalties": float(total_penalties),
                "advanceAmount": float(advance_amount),
                "installmentTarget": terms["installment_target"],
                "complianceStatus": compliance_status,
                "missedCyclesCount": missed_cycles_count,
                "notes": meta.get("notes", ""),
                "dailyPayments": repayment_dicts,
            })

        return results

    @classmethod
    def get_facility(cls, db: Session, facility_id: int) -> Dict[str, Any]:
        """Fetch single facility details by ID."""
        fac = db.query(LendingFacility).filter(LendingFacility.facility_id == facility_id).first()
        if fac:
            res = cls.get_facilities(db)
            for item in res:
                if str(item["id"]) == str(facility_id):
                    return item
        # Fallback to legacy loan
        res = cls.get_facilities(db)
        for item in res:
            if str(item["id"]) == str(facility_id):
                return item
        raise HTTPException(status_code=404, detail="Lending facility not found.")

    @classmethod
    def get_facility_ledger(cls, db: Session, loan_id: int) -> Dict[str, Any]:
        """Fetch facility details and generate its complete schedule ledger."""
        fac = db.query(LendingFacility).filter(LendingFacility.facility_id == loan_id).first()
        if fac:
            freq = fac.payment_frequency or "Daily"
            term_days = fac.term_days or (40 if freq == "Daily" else 60)

            txs = (
                db.query(LendingTransaction)
                .filter(LendingTransaction.facility_id == fac.facility_id)
                .order_by(LendingTransaction.payment_date.desc(), LendingTransaction.created_at.desc())
                .all()
            )
            repayment_dicts = [
                {
                    "id": str(t.transaction_id),
                    "date": t.payment_date.isoformat() if t.payment_date else "",
                    "payment_date": t.payment_date.isoformat() if t.payment_date else "",
                    "amount": float(t.amount or 0),
                    "method": t.payment_method or "Cash",
                    "referenceNo": t.reference_no or "-",
                    "notes": t.notes or "-",
                    "status": "Paid" if (t.status or "").lower() == "completed" else (t.status or "Paid"),
                    "timestamp": t.created_at.isoformat() if t.created_at else "",
                }
                for t in txs
            ]

            terms = cls.calculate_facility(
                principal=fac.principal_amount,
                interest_rate=fac.interest_rate or Decimal("20.00"),
                frequency=freq,
                start_date_val=fac.date_borrowed,
                due_date_val=fac.due_date,
                term_days_val=term_days,
            )

            total_paid = sum((Decimal(str(r["amount"])) for r in repayment_dicts), Decimal("0.00"))

            if freq == "Daily":
                ledger_items, ledger_meta = cls.build_daily_ledger(
                    fac.date_borrowed,
                    fac.due_date,
                    repayment_dicts,
                    term_days=terms["term_days"],
                    installment_target=terms["installment_target"],
                    penalty_per_cycle=terms["penalty_per_cycle"],
                )
                monthly_progress = None
                next_installment = None
                total_penalties = Decimal(str(ledger_meta["total_penalties"]))
                advance_amount = Decimal(str(ledger_meta["advance_amount"]))
                compliance_status = ledger_meta["compliance_status"]
                missed_cycles_count = ledger_meta["missed_cycles_count"]
            else:
                ledger_items = repayment_dicts
                monthly_progress = cls.get_monthly_progress(
                    fac.date_borrowed,
                    fac.due_date,
                    terms["total_payable"],
                    repayment_dicts,
                    term_days=terms["term_days"],
                )
                total_penalties = Decimal(str(monthly_progress["totalPenalties"]))
                advance_amount = Decimal(str(monthly_progress["advanceAmount"]))
                compliance_status = monthly_progress["complianceStatus"]
                missed_cycles_count = monthly_progress["missedCyclesCount"]

                total_payable_with_penalties = Decimal(str(terms["total_payable"])) + total_penalties
                next_installment = cls.get_next_installment_info(
                    fac.date_borrowed, fac.due_date, freq, total_payable_with_penalties, total_paid
                )

            total_payable_with_penalties = Decimal(str(terms["total_payable"])) + total_penalties
            remaining_balance = max(Decimal("0.00"), total_payable_with_penalties - total_paid)

            return {
                "facility_id": str(fac.facility_id),
                "loan_ref_no": fac.facility_ref_no or f"FAC-{fac.facility_id}",
                "borrower_name": fac.borrower_name,
                "borrower_contact": fac.borrower_contact or "",
                "borrower_address": fac.borrower_address or "",
                "payment_frequency": freq,
                "principal": float(fac.principal_amount),
                "interest_rate": float(terms["interest_rate"]),
                "total_payable": float(total_payable_with_penalties),
                "amount_paid": float(total_paid),
                "remaining_balance": float(remaining_balance),
                "date_borrowed": fac.date_borrowed.isoformat() if fac.date_borrowed else "",
                "due_date": fac.due_date.isoformat() if fac.due_date else "",
                "term_days": terms["term_days"],
                "penalty_rate": terms["penalty_rate"],
                "penalty_per_cycle": terms["penalty_per_cycle"],
                "total_penalties": float(total_penalties),
                "advance_amount": float(advance_amount),
                "installment_target": terms["installment_target"],
                "compliance_status": compliance_status,
                "missed_cycles_count": missed_cycles_count,
                "ledger_items": ledger_items,
                "monthly_progress": monthly_progress,
                "next_installment": next_installment,
            }

        # Fallback to legacy loan
        loan = db.query(Loan).filter(Loan.loan_id == loan_id).first()
        if not loan:
            raise HTTPException(status_code=404, detail="Lending facility not found.")

        meta = cls.parse_facility_description(loan.description)
        freq = meta.get("frequency", "Daily")
        term_days = meta.get("term_days", 40 if freq == "Daily" else 60)

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
            interest_rate=loan.interest_rate or Decimal("20.00"),
            frequency=freq,
            start_date_val=loan.loan_date,
            due_date_val=loan.due_date,
            term_days_val=term_days,
        )

        total_paid = sum((Decimal(str(r["amount"])) for r in repayment_dicts), Decimal("0.00"))

        if freq == "Daily":
            ledger_items, ledger_meta = cls.build_daily_ledger(
                loan.loan_date,
                loan.due_date,
                repayment_dicts,
                term_days=terms["term_days"],
                installment_target=terms["installment_target"],
                penalty_per_cycle=terms["penalty_per_cycle"],
            )
            monthly_progress = None
            next_installment = None
            total_penalties = Decimal(str(ledger_meta["total_penalties"]))
            advance_amount = Decimal(str(ledger_meta["advance_amount"]))
            compliance_status = ledger_meta["compliance_status"]
            missed_cycles_count = ledger_meta["missed_cycles_count"]
        else:
            ledger_items = repayment_dicts
            monthly_progress = cls.get_monthly_progress(
                loan.loan_date,
                loan.due_date,
                terms["total_payable"],
                repayment_dicts,
                term_days=terms["term_days"],
            )
            total_penalties = Decimal(str(monthly_progress["totalPenalties"]))
            advance_amount = Decimal(str(monthly_progress["advanceAmount"]))
            compliance_status = monthly_progress["complianceStatus"]
            missed_cycles_count = monthly_progress["missedCyclesCount"]

            total_payable_with_penalties = Decimal(str(terms["total_payable"])) + total_penalties
            next_installment = cls.get_next_installment_info(
                loan.loan_date, loan.due_date, freq, total_payable_with_penalties, total_paid
            )

        total_payable_with_penalties = Decimal(str(terms["total_payable"])) + total_penalties
        remaining_balance = max(Decimal("0.00"), total_payable_with_penalties - total_paid)

        return {
            "facility_id": str(loan.loan_id),
            "loan_ref_no": loan.loan_ref_no or f"FAC-{loan.loan_id}",
            "borrower_name": meta.get("borrower_name") or f"Borrower #{loan.borrower}",
            "payment_frequency": freq,
            "principal": float(loan.principal_amount),
            "interest_rate": float(terms["interest_rate"]),
            "total_payable": float(total_payable_with_penalties),
            "amount_paid": float(total_paid),
            "remaining_balance": float(remaining_balance),
            "date_borrowed": loan.loan_date.isoformat() if loan.loan_date else "",
            "due_date": loan.due_date.isoformat() if loan.due_date else "",
            "term_days": terms["term_days"],
            "penalty_rate": terms["penalty_rate"],
            "penalty_per_cycle": terms["penalty_per_cycle"],
            "total_penalties": float(total_penalties),
            "advance_amount": float(advance_amount),
            "installment_target": terms["installment_target"],
            "compliance_status": compliance_status,
            "missed_cycles_count": missed_cycles_count,
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
        interest_rate: Decimal | float = Decimal("20.00"),
        frequency: str = "Daily",
        date_borrowed_val: Any = None,
        due_date_val: Any = None,
        term_days_val: Optional[int] = None,
        borrower_contact: Optional[str] = None,
        borrower_address: Optional[str] = None,
        notes: Optional[str] = None,
        **kwargs,
    ) -> Dict[str, Any]:
        """Create a new lending facility record in the lending_facilities database table."""
        p = quantize(principal_amount)
        if p < Decimal("1.00"):
            raise HTTPException(status_code=400, detail="Principal amount must be at least 1.00.")

        start = parse_date(date_borrowed_val) or date.today()
        freq = (frequency or "Daily").strip().capitalize()
        term_days = int(term_days_val) if term_days_val and int(term_days_val) > 0 else (40 if freq == "Daily" else 60)
        due = parse_date(due_date_val) or (start + timedelta(days=term_days))

        terms = cls.calculate_facility(p, interest_rate, freq, start, due, term_days)

        ref_no = f"LN-{datetime.now().strftime('%Y%m%d')}-{int(datetime.now().timestamp() % 10000):04d}"

        new_facility = LendingFacility(
            facility_ref_no=ref_no,
            borrower_name=borrower_name.strip(),
            borrower_contact=(borrower_contact or "").strip() or None,
            borrower_address=(borrower_address or "").strip() or None,
            principal_amount=p,
            interest_rate=Decimal(str(terms["interest_rate"])),
            interest_amount=Decimal(str(terms["interest"])),
            total_payable=Decimal(str(terms["total_payable"])),
            payment_frequency=freq,
            term_days=term_days,
            installment_target=Decimal(str(terms["installment_target"])),
            penalty_rate=Decimal(str(terms["penalty_rate"])),
            date_borrowed=start,
            due_date=due,
            status="Active",
            notes=(notes or "").strip(),
        )
        db.add(new_facility)
        db.commit()
        db.refresh(new_facility)

        return {
            "id": str(new_facility.facility_id),
            "loanId": new_facility.facility_id,
            "loanRefNo": new_facility.facility_ref_no,
            "borrowerName": new_facility.borrower_name,
            "borrowerContact": new_facility.borrower_contact or "",
            "borrowerAddress": new_facility.borrower_address or "",
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
            "termDays": term_days,
            "penaltyRate": terms["penalty_rate"],
            "penaltyPerCycle": terms["penalty_per_cycle"],
            "totalPenalties": 0.0,
            "advanceAmount": 0.0,
            "installmentTarget": terms["installment_target"],
            "complianceStatus": "Compliant",
            "missedCyclesCount": 0,
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
        recorded_by: Optional[str] = None,
        transaction_type: str = "Repayment",
    ) -> Dict[str, Any]:
        """
        Record a payment remittance in the lending_transactions table with period settlement locking.
        """
        fac = db.query(LendingFacility).filter(LendingFacility.facility_id == loan_id).first()

        if fac:
            freq = fac.payment_frequency or "Daily"
            term_days = fac.term_days or (40 if freq == "Daily" else 60)

            existing_txs = (
                db.query(LendingTransaction)
                .filter(LendingTransaction.facility_id == fac.facility_id)
                .order_by(LendingTransaction.payment_date.desc())
                .all()
            )
            repayment_dicts = [
                {
                    "date": t.payment_date.isoformat() if t.payment_date else "",
                    "amount": float(t.amount or 0),
                    "status": "Paid" if (t.status or "").lower() == "completed" else "Paid",
                }
                for t in existing_txs
            ]

            # 1. Period settlement locking check
            is_locked, lock_reason = cls.check_period_settlement(freq, payment_date_val, repayment_dicts)
            if is_locked:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=lock_reason or "Period or date is already fully settled and locked.",
                )

            # 2. Terms & current balances
            terms = cls.calculate_facility(
                fac.principal_amount,
                fac.interest_rate or Decimal("20.00"),
                freq,
                fac.date_borrowed,
                fac.due_date,
                term_days,
            )

            total_paid_before = sum((Decimal(str(r["amount"])) for r in repayment_dicts), Decimal("0.00"))

            if freq == "Daily":
                _, ledger_meta = cls.build_daily_ledger(
                    fac.date_borrowed,
                    fac.due_date,
                    repayment_dicts,
                    term_days=terms["term_days"],
                    installment_target=terms["installment_target"],
                    penalty_per_cycle=terms["penalty_per_cycle"],
                )
                total_penalties = Decimal(str(ledger_meta["total_penalties"]))
            else:
                progress = cls.get_monthly_progress(
                    fac.date_borrowed,
                    fac.due_date,
                    terms["total_payable"],
                    repayment_dicts,
                    term_days=terms["term_days"],
                )
                total_penalties = Decimal(str(progress["totalPenalties"]))

            total_payable_with_penalties = Decimal(str(terms["total_payable"])) + total_penalties
            remaining_before = max(Decimal("0.00"), total_payable_with_penalties - total_paid_before)

            payment_amount = quantize(amount_val)
            cls.validate_payment_bounds(payment_amount, remaining_before)

            # 3. Create LendingTransaction record
            pay_date = parse_date(payment_date_val) or date.today()
            ref_clean = reference_no.strip() if reference_no and reference_no.strip() else f"TX-{int(datetime.now().timestamp() % 100000):05d}"
            tx_ref = f"TX-{datetime.now().strftime('%Y%m%d')}-{int(datetime.now().timestamp() % 10000):04d}"

            new_tx = LendingTransaction(
                facility_id=fac.facility_id,
                transaction_ref_no=tx_ref,
                transaction_type=transaction_type or "Repayment",
                payment_date=pay_date,
                due_date=fac.due_date,
                amount=payment_amount,
                remaining_balance=max(Decimal("0.00"), remaining_before - payment_amount),
                payment_method=method.strip() if method else "Cash",
                reference_no=ref_clean,
                status="Completed",
                notes=(notes or "").strip(),
                recorded_by=recorded_by,
            )
            db.add(new_tx)

            # 4. Update facility status if fully paid
            updated_remaining = remaining_before - payment_amount
            if updated_remaining <= Decimal("0.00"):
                fac.status = "Fully Paid"

            db.commit()
            db.refresh(new_tx)

            return {
                "transaction_id": new_tx.transaction_id,
                "repayment_id": new_tx.transaction_id,
                "facility_id": fac.facility_id,
                "loan_id": fac.facility_id,
                "payment_date": pay_date.isoformat(),
                "amount": float(payment_amount),
                "remaining_balance": float(updated_remaining),
                "status": "Paid",
                "payment_method": new_tx.payment_method,
                "reference_no": ref_clean,
                "notes": notes or "",
            }

        # Fallback to legacy loan table
        loan = db.query(Loan).filter(Loan.loan_id == loan_id).first()
        if not loan:
            raise HTTPException(status_code=404, detail="Lending facility not found.")

        meta = cls.parse_facility_description(loan.description)
        freq = meta.get("frequency", "Daily")
        term_days = meta.get("term_days", 40 if freq == "Daily" else 60)

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

        is_locked, lock_reason = cls.check_period_settlement(freq, payment_date_val, repayment_dicts)
        if is_locked:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=lock_reason or "Period or date is already fully settled and locked.",
            )

        terms = cls.calculate_facility(
            loan.principal_amount,
            loan.interest_rate or Decimal("20.00"),
            freq,
            loan.loan_date,
            loan.due_date,
            term_days,
        )

        total_paid_before = sum((Decimal(str(r["amount"])) for r in repayment_dicts), Decimal("0.00"))

        if freq == "Daily":
            _, ledger_meta = cls.build_daily_ledger(
                loan.loan_date,
                loan.due_date,
                repayment_dicts,
                term_days=terms["term_days"],
                installment_target=terms["installment_target"],
                penalty_per_cycle=terms["penalty_per_cycle"],
            )
            total_penalties = Decimal(str(ledger_meta["total_penalties"]))
        else:
            progress = cls.get_monthly_progress(
                loan.loan_date,
                loan.due_date,
                terms["total_payable"],
                repayment_dicts,
                term_days=terms["term_days"],
            )
            total_penalties = Decimal(str(progress["totalPenalties"]))

        total_payable_with_penalties = Decimal(str(terms["total_payable"])) + total_penalties
        remaining_before = max(Decimal("0.00"), total_payable_with_penalties - total_paid_before)

        payment_amount = quantize(amount_val)
        cls.validate_payment_bounds(payment_amount, remaining_before)

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

        updated_remaining = remaining_before - payment_amount
        if updated_remaining <= Decimal("0.00"):
            loan.status = "Completed"
        db.commit()
        db.refresh(new_repayment)

        return {
            "transaction_id": new_repayment.loan_repayment_id,
            "repayment_id": new_repayment.loan_repayment_id,
            "facility_id": loan.loan_id,
            "loan_id": loan.loan_id,
            "payment_date": pay_date.isoformat(),
            "amount": float(payment_amount),
            "remaining_balance": float(updated_remaining),
            "status": "Paid",
            "payment_method": method.strip(),
            "reference_no": ref_text,
            "notes": notes or "",
        }

    @classmethod
    def get_transactions(
        cls,
        db: Session,
        facility_id: Optional[int] = None,
        transaction_type: Optional[str] = None,
        payment_method: Optional[str] = None,
        date_from: Optional[str] = None,
        date_to: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """Query and filter lending transactions from the lending_transactions table."""
        query = db.query(LendingTransaction)
        if facility_id:
            query = query.filter(LendingTransaction.facility_id == facility_id)
        if transaction_type:
            query = query.filter(LendingTransaction.transaction_type == transaction_type)
        if payment_method:
            query = query.filter(LendingTransaction.payment_method == payment_method)
        if date_from:
            d_from = parse_date(date_from)
            if d_from:
                query = query.filter(LendingTransaction.payment_date >= d_from)
        if date_to:
            d_to = parse_date(date_to)
            if d_to:
                query = query.filter(LendingTransaction.payment_date <= d_to)

        txs = query.order_by(LendingTransaction.payment_date.desc(), LendingTransaction.created_at.desc()).all()
        return [
            {
                "transaction_id": t.transaction_id,
                "facility_id": t.facility_id,
                "transaction_ref_no": t.transaction_ref_no,
                "transaction_type": t.transaction_type,
                "payment_date": t.payment_date.isoformat() if t.payment_date else "",
                "due_date": t.due_date.isoformat() if t.due_date else "",
                "amount": float(t.amount or 0),
                "principal_portion": float(t.principal_portion or 0),
                "interest_portion": float(t.interest_portion or 0),
                "penalty_portion": float(t.penalty_portion or 0),
                "remaining_balance": float(t.remaining_balance) if t.remaining_balance is not None else None,
                "payment_method": t.payment_method or "Cash",
                "reference_no": t.reference_no or "-",
                "status": t.status or "Completed",
                "notes": t.notes or "-",
                "recorded_by": t.recorded_by,
                "created_at": t.created_at.isoformat() if t.created_at else "",
                "updated_at": t.updated_at.isoformat() if t.updated_at else "",
            }
            for t in txs
        ]

    @classmethod
    def get_transaction(cls, db: Session, transaction_id: int) -> Dict[str, Any]:
        """Fetch single transaction by ID."""
        t = db.query(LendingTransaction).filter(LendingTransaction.transaction_id == transaction_id).first()
        if not t:
            raise HTTPException(status_code=404, detail="Lending transaction not found.")
        return {
            "transaction_id": t.transaction_id,
            "facility_id": t.facility_id,
            "transaction_ref_no": t.transaction_ref_no,
            "transaction_type": t.transaction_type,
            "payment_date": t.payment_date.isoformat() if t.payment_date else "",
            "due_date": t.due_date.isoformat() if t.due_date else "",
            "amount": float(t.amount or 0),
            "principal_portion": float(t.principal_portion or 0),
            "interest_portion": float(t.interest_portion or 0),
            "penalty_portion": float(t.penalty_portion or 0),
            "remaining_balance": float(t.remaining_balance) if t.remaining_balance is not None else None,
            "payment_method": t.payment_method or "Cash",
            "reference_no": t.reference_no or "-",
            "status": t.status or "Completed",
            "notes": t.notes or "-",
            "recorded_by": t.recorded_by,
            "created_at": t.created_at.isoformat() if t.created_at else "",
            "updated_at": t.updated_at.isoformat() if t.updated_at else "",
        }

