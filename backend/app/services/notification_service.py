"""
notification_service.py
-----------------------
Stateless, zero-storage in-app notification service.

Computes notifications and due-date reminders on the fly from live database
records across:
1. Bills (overdue, due today, due tomorrow, due soon reminders + payments)
2. Lending / Borrowers (overdue maturity, missed daily/monthly installments,
   daily/monthly installments due today/tomorrow/soon + repayments)
3. Inter-company Loans (overdue, due today, due tomorrow, due soon, pending
   approvals, finance/audit workflow, repayments)
4. Tenant Leases (overdue, due today, due tomorrow, due soon rent + payments)
5. Petty Cash (pending finance/audit requests, approvals/rejections, low wallet balance)
6. Sales / Deposits & Expenses Audit alerts
"""

from __future__ import annotations

import json
import logging
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal
from typing import Any, Optional

from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.models.audit_log import AuditLog
from app.models.company import Company
from app.models.loan import Loan, LoanRepayment
from app.schemas.notification import NotificationOut
from app.services.finance_service import FinanceCalculator

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Notification type constants
# ---------------------------------------------------------------------------

class NotificationType:
    # Bills
    BILL_OVERDUE               = "BILL_OVERDUE"
    BILL_DUE_TODAY             = "BILL_DUE_TODAY"
    BILL_DUE_TOMORROW          = "BILL_DUE_TOMORROW"
    BILL_DUE_SOON              = "BILL_DUE_SOON"
    BILL_PAID                  = "BILL_PAID"
    BILL_PARTIALLY_PAID        = "BILL_PARTIALLY_PAID"

    # Lending (Micro-lending / Borrowers)
    LENDING_OVERDUE            = "LENDING_OVERDUE"
    LENDING_INSTALLMENT_OVERDUE = "LENDING_INSTALLMENT_OVERDUE"
    LENDING_DUE_TODAY          = "LENDING_DUE_TODAY"
    LENDING_DUE_TOMORROW       = "LENDING_DUE_TOMORROW"
    LENDING_DUE_SOON           = "LENDING_DUE_SOON"
    LENDING_PAYMENT_RECEIVED   = "LENDING_PAYMENT_RECEIVED"
    LENDING_FULLY_SETTLED      = "LENDING_FULLY_SETTLED"

    # Inter-company Loans
    LOAN_PENDING_APPROVAL      = "LOAN_PENDING_APPROVAL"
    LOAN_OVERDUE               = "LOAN_OVERDUE"
    LOAN_DUE_TODAY             = "LOAN_DUE_TODAY"
    LOAN_DUE_TOMORROW          = "LOAN_DUE_TOMORROW"
    LOAN_DUE_SOON              = "LOAN_DUE_SOON"
    LOAN_REPAYMENT_RECEIVED    = "LOAN_REPAYMENT_RECEIVED"
    LOAN_REPAYMENT_SENT        = "LOAN_REPAYMENT_SENT"
    LOAN_FULLY_SETTLED         = "LOAN_FULLY_SETTLED"
    LOAN_REQUEST_FINANCE       = "LOAN_REQUEST_FINANCE"
    LOAN_ENDORSED_AUDIT        = "LOAN_ENDORSED_AUDIT"
    LOAN_APPROVED_SUPERVISOR   = "LOAN_APPROVED_SUPERVISOR"
    LOAN_REJECTED_SUPERVISOR   = "LOAN_REJECTED_SUPERVISOR"

    # Tenants
    TENANT_OVERDUE             = "TENANT_OVERDUE"
    TENANT_DUE_TODAY           = "TENANT_DUE_TODAY"
    TENANT_DUE_TOMORROW        = "TENANT_DUE_TOMORROW"
    TENANT_DUE_SOON            = "TENANT_DUE_SOON"
    TENANT_PAYMENT_RECEIVED    = "TENANT_PAYMENT_RECEIVED"

    # Petty Cash
    PETTY_CASH_REQUEST         = "PETTY_CASH_REQUEST"
    PETTY_CASH_AUDIT           = "PETTY_CASH_AUDIT"
    PETTY_CASH_APPROVED        = "PETTY_CASH_APPROVED"
    PETTY_CASH_REJECTED        = "PETTY_CASH_REJECTED"
    PETTY_CASH_LOW_BALANCE     = "PETTY_CASH_LOW_BALANCE"

    # Deposits & Audit
    DEPOSIT_VERIFIED           = "DEPOSIT_VERIFIED"


OVERDUE_TYPES = {
    NotificationType.BILL_OVERDUE,
    NotificationType.LENDING_OVERDUE,
    NotificationType.LENDING_INSTALLMENT_OVERDUE,
    NotificationType.LOAN_OVERDUE,
    NotificationType.TENANT_OVERDUE,
}

DUE_TODAY_TYPES = {
    NotificationType.BILL_DUE_TODAY,
    NotificationType.LENDING_DUE_TODAY,
    NotificationType.LOAN_DUE_TODAY,
    NotificationType.TENANT_DUE_TODAY,
}

DUE_SOON_TYPES = {
    NotificationType.BILL_DUE_TOMORROW,
    NotificationType.BILL_DUE_SOON,
    NotificationType.LENDING_DUE_TOMORROW,
    NotificationType.LENDING_DUE_SOON,
    NotificationType.LOAN_DUE_TOMORROW,
    NotificationType.LOAN_DUE_SOON,
    NotificationType.TENANT_DUE_TOMORROW,
    NotificationType.TENANT_DUE_SOON,
    NotificationType.PETTY_CASH_LOW_BALANCE,
}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_id(*parts: Any) -> str:
    """
    Produce a deterministic, stable notification ID from its source data
    so the frontend can track read/dismiss state in local storage.
    Format: "<type>-<part1>-<part2>-..."
    """
    return "-".join(str(p) for p in parts)


def _normalize_dt(dt: Optional[datetime]) -> datetime:
    if not dt:
        return datetime.min.replace(tzinfo=timezone.utc)
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt


def _urgency_priority(notification_type: str) -> int:
    """
    Sort priority so active due-date reminders (Overdue -> Due Today -> Due Soon)
    always surface prominently at the top of the notification panel.
    """
    if notification_type in OVERDUE_TYPES:
        return 0
    if notification_type in DUE_TODAY_TYPES:
        return 1
    if notification_type in DUE_SOON_TYPES:
        return 2
    return 3


def _parse_details(details_str: Optional[str]) -> dict:
    if not details_str:
        return {}
    try:
        return json.loads(details_str)
    except Exception:
        return {}


def _calculate_loan_balance(loan: Loan, total_repaid: Decimal) -> Decimal:
    principal = loan.principal_amount or Decimal("0.00")
    rate = loan.interest_rate or Decimal("0.00")
    interest = FinanceCalculator.calculate_loan_interest(principal, rate)
    total_payable = FinanceCalculator.calculate_loan_total_payable(principal, interest)
    return FinanceCalculator.calculate_loan_remaining_balance(total_payable, total_repaid)


def _company_name(db: Session, company_id: Optional[int], name_map: Optional[dict] = None) -> str:
    if not company_id:
        return "All Companies"
    if name_map and company_id in name_map:
        return name_map[company_id]
    name = db.query(Company.company_name).filter(Company.company_id == company_id).scalar()
    return name or f"Company #{company_id}"


def _is_filcap_company(company_name: str) -> bool:
    low = (company_name or "").strip().lower()
    return "filcap" in low or "filcam" in low


def _parse_date_safe(val: Any) -> Optional[date]:
    if not val:
        return None
    if isinstance(val, datetime):
        return val.date()
    if isinstance(val, date):
        return val
    try:
        return date.fromisoformat(str(val).split("T")[0][:10])
    except Exception:
        return None


# ---------------------------------------------------------------------------
# Service
# ---------------------------------------------------------------------------

class NotificationService:

    def __init__(self, db: Session):
        self.db = db

    def _get_company_names_map(self) -> dict[int, str]:
        try:
            return dict(self.db.query(Company.company_id, Company.company_name).all())
        except Exception:
            return {}

    def _get_repayments_map(self) -> dict[int, Decimal]:
        try:
            from sqlalchemy import func
            rows = (
                self.db.query(
                    LoanRepayment.loan_id,
                    func.coalesce(func.sum(LoanRepayment.amount), 0),
                )
                .group_by(LoanRepayment.loan_id)
                .all()
            )
            return {loan_id: Decimal(str(total)) for loan_id, total in rows}
        except Exception:
            return {}

    # ── Public API ────────────────────────────────────────────────────────────

    def get_notifications(
        self,
        *,
        company_id: Optional[int] = None,
        user_role: Optional[str] = None,
        notification_type: Optional[str] = None,
        limit: int = 100,
        offset: int = 0,
    ) -> list[NotificationOut]:
        raw_notifications: list[NotificationOut] = []

        name_map = self._get_company_names_map()
        repayments_map = self._get_repayments_map()

        # 1. Bills due-date reminders & payment notifications
        raw_notifications.extend(self._bill_notifications(company_id, name_map))

        # 2. Lending (Borrower) due-date reminders, installment alerts & repayments
        raw_notifications.extend(self._lending_notifications(company_id, user_role, name_map))

        # 3. Inter-company loan due-date reminders, pending approvals, workflow & repayments
        raw_notifications.extend(self._due_date_notifications(company_id, name_map, repayments_map))
        raw_notifications.extend(self._pending_approval_notifications(company_id, name_map))
        raw_notifications.extend(self._repayment_notifications(company_id, name_map))
        raw_notifications.extend(self._loan_workflow_notifications(user_role, company_id, name_map))

        # 4. Tenant lease due-date reminders & rent payment notifications
        raw_notifications.extend(self._tenant_notifications(company_id, name_map))

        # 5. Petty cash workflow & low balance notifications
        raw_notifications.extend(self._petty_cash_workflow_notifications(user_role, company_id, name_map))
        raw_notifications.extend(self._petty_cash_low_balance_notifications(company_id, name_map))

        # 6. Sales / Deposit audit notifications
        raw_notifications.extend(self._deposit_workflow_notifications(user_role, company_id, name_map))

        # Deduplicate by notification_id
        deduped: list[NotificationOut] = []
        seen_ids: set[str] = set()
        for item in raw_notifications:
            if item.notification_id not in seen_ids:
                seen_ids.add(item.notification_id)
                deduped.append(item)

        if notification_type:
            nt = notification_type.upper()
            deduped = [n for n in deduped if n.notification_type == nt]

        deduped.sort(
            key=lambda n: (
                _urgency_priority(n.notification_type),
                -_normalize_dt(n.created_at).timestamp(),
            )
        )
        return deduped[offset: offset + limit]

    def get_unread_count(self, *, company_id: Optional[int] = None, user_role: Optional[str] = None) -> int:
        return len(self.get_notifications(company_id=company_id, user_role=user_role, limit=10_000))

    # ── Source 1: Bills (Due-date reminders & payments) ──────────────────────

    def _bill_notifications(
        self,
        company_id: Optional[int],
        name_map: Optional[dict] = None,
    ) -> list[NotificationOut]:
        results: list[NotificationOut] = []
        today = date.today()
        now_utc = datetime.now(timezone.utc)

        try:
            from app.services.bills_service import BillsService
            bills_svc = BillsService(self.db)
            bills = bills_svc.list_bills(company_id=company_id)

            for b in bills:
                try:
                    company_label = b.company or _company_name(self.db, b.company_id, name_map)
                    next_p = next(
                        (p for p in (b.periods or []) if getattr(p, "is_next_payable", False) or not p.paid),
                        None,
                    )
                    due_d = b.next_period_date or (next_p.period_date if next_p else None) or b.due_date
                    if due_d and b.status != "paid":
                        period_key = b.next_period_key or (next_p.period_key if next_p else due_d.isoformat())
                        period_label = b.next_period_label or (next_p.period_label if next_p else due_d.strftime("%b %d, %Y"))

                        rem_amt = Decimal("0.00")
                        if next_p and next_p.remaining_amount and next_p.remaining_amount > Decimal("0.00"):
                            rem_amt = Decimal(str(next_p.remaining_amount))
                        elif next_p and next_p.billed_amount and next_p.billed_amount > Decimal("0.00"):
                            rem_amt = Decimal(str(next_p.billed_amount))
                        elif b.latest_amount and b.latest_amount > Decimal("0.00"):
                            rem_amt = Decimal(str(b.latest_amount))
                        elif b.amount and b.amount > Decimal("0.00"):
                            rem_amt = Decimal(str(b.amount))

                        amt_str = f" Amount due: ₱{rem_amt:,.2f}." if rem_amt > Decimal("0.00") else ""
                        is_partial = (next_p and getattr(next_p, "partially_paid", False)) or b.status == "partially paid"
                        partial_tag = " (Partially Paid)" if is_partial else ""

                        diff_days = (due_d - today).days
                        reminder_window = max(int(b.due_date_reminder or 3), 7)

                        if diff_days < 0:
                            days_overdue = abs(diff_days)
                            results.append(NotificationOut(
                                notification_id=_make_id(NotificationType.BILL_OVERDUE, b.bill_id, period_key),
                                notification_type=NotificationType.BILL_OVERDUE,
                                title=f"Overdue Bill{partial_tag}: {b.bill_name}",
                                message=(
                                    f"{b.bill_name} ({company_label}) for {period_label} was due on "
                                    f"{due_d.strftime('%b %d, %Y')} ({days_overdue} day{'s' if days_overdue != 1 else ''} overdue)."
                                    f"{amt_str}"
                                ),
                                company_id=b.company_id,
                                reference_type="bill",
                                reference_id=b.bill_id,
                                is_read=False,
                                created_at=now_utc - timedelta(minutes=min(days_overdue, 60)),
                            ))
                        elif diff_days == 0:
                            results.append(NotificationOut(
                                notification_id=_make_id(NotificationType.BILL_DUE_TODAY, b.bill_id, period_key),
                                notification_type=NotificationType.BILL_DUE_TODAY,
                                title=f"Bill Due Today{partial_tag}: {b.bill_name}",
                                message=(
                                    f"{b.bill_name} ({company_label}) for {period_label} is due TODAY "
                                    f"({due_d.strftime('%b %d, %Y')})!{amt_str}"
                                ),
                                company_id=b.company_id,
                                reference_type="bill",
                                reference_id=b.bill_id,
                                is_read=False,
                                created_at=now_utc,
                            ))
                        elif diff_days == 1:
                            results.append(NotificationOut(
                                notification_id=_make_id(NotificationType.BILL_DUE_TOMORROW, b.bill_id, period_key),
                                notification_type=NotificationType.BILL_DUE_TOMORROW,
                                title=f"Bill Due Tomorrow{partial_tag}: {b.bill_name}",
                                message=(
                                    f"{b.bill_name} ({company_label}) for {period_label} is due tomorrow "
                                    f"({due_d.strftime('%b %d, %Y')}).{amt_str}"
                                ),
                                company_id=b.company_id,
                                reference_type="bill",
                                reference_id=b.bill_id,
                                is_read=False,
                                created_at=now_utc - timedelta(minutes=5),
                            ))
                        elif 1 < diff_days <= reminder_window:
                            results.append(NotificationOut(
                                notification_id=_make_id(NotificationType.BILL_DUE_SOON, b.bill_id, period_key),
                                notification_type=NotificationType.BILL_DUE_SOON,
                                title=f"Bill Due in {diff_days} Days{partial_tag}: {b.bill_name}",
                                message=(
                                    f"{b.bill_name} ({company_label}) for {period_label} is due on "
                                    f"{due_d.strftime('%b %d, %Y')} ({diff_days} days left).{amt_str}"
                                ),
                                company_id=b.company_id,
                                reference_type="bill",
                                reference_id=b.bill_id,
                                is_read=False,
                                created_at=now_utc - timedelta(minutes=10 + diff_days),
                            ))

                    # Recent bill payments
                    for p in (b.payments or [])[:2]:
                        p_period = next((per for per in (b.periods or []) if per.period_key == p.period_key), None)
                        is_period_paid = p_period.paid if p_period else True
                        ntype = NotificationType.BILL_PAID if is_period_paid else NotificationType.BILL_PARTIALLY_PAID
                        title = f"Bill Payment Recorded: {b.bill_name}" if is_period_paid else f"Partial Bill Payment: {b.bill_name}"
                        p_label = p_period.period_label if p_period else p.period_key
                        ts = p.created_at or datetime.combine(p.payment_date, datetime.min.time()).replace(tzinfo=timezone.utc)
                        results.append(NotificationOut(
                            notification_id=_make_id(ntype, b.bill_id, p.bill_payment_id),
                            notification_type=ntype,
                            title=title,
                            message=(
                                f"Payment of ₱{p.amount:,.2f} recorded for {b.bill_name} ({company_label}) "
                                f"— {p_label} via {p.payment_method}."
                            ),
                            company_id=b.company_id,
                            reference_type="bill",
                            reference_id=b.bill_id,
                            is_read=False,
                            created_at=ts,
                        ))
                except Exception as inner_exc:
                    logger.warning("Bill notification error for bill %s: %s", getattr(b, "bill_id", "?"), inner_exc)
        except Exception as exc:
            logger.warning("Error computing bill notifications: %s", exc)

        return results

    # ── Source 2: Lending (Borrowers due-date reminders & payments) ──────────

    def _lending_notifications(
        self,
        company_id: Optional[int],
        user_role: Optional[str],
        name_map: Optional[dict] = None,
    ) -> list[NotificationOut]:
        results: list[NotificationOut] = []
        if name_map is None:
            name_map = self._get_company_names_map()

        # Find FilCap company_id if registered
        filcap_cid: Optional[int] = None
        for cid, cname in name_map.items():
            if _is_filcap_company(cname):
                filcap_cid = cid
                break

        # If a specific non-FilCap company is queried by a supervisor of another branch, skip lending
        if company_id is not None and filcap_cid is not None and company_id != filcap_cid:
            cname = name_map.get(company_id, "")
            if not _is_filcap_company(cname):
                return results

        today = date.today()
        today_iso = today.isoformat()
        now_utc = datetime.now(timezone.utc)

        try:
            from app.services.lending_service import LendingService
            borrowers = LendingService.get_borrowers(self.db, company_id=company_id)

            for b in borrowers:
                try:
                    bid = int(b.get("borrower_id") or b.get("loanId") or b.get("id") or 0)
                    bname = str(b.get("borrowerName") or "Borrower").strip()
                    ref = str(b.get("borrowerRefNo") or b.get("loanRefNo") or f"BOR-{bid}")
                    rem = Decimal(str(b.get("remainingBalance", 0)))
                    freq = str(b.get("paymentFrequency") or "Daily").strip().capitalize()
                    target = Decimal(str(b.get("installmentTarget", 0)))
                    penalties = Decimal(str(b.get("totalPenalties", 0)))
                    missed_count = int(b.get("missedCyclesCount") or 0)
                    compliance = str(b.get("complianceStatus") or "Compliant")
                    due_d = _parse_date_safe(b.get("dueDate"))
                    start_d = _parse_date_safe(b.get("dateBorrowed"))
                    repayments = b.get("dailyPayments") or []
                    status_str = str(b.get("status") or "Active").lower()

                    if rem > Decimal("0.00") and status_str not in ("completed", "fully paid"):
                        # A. Overall Loan Maturity Due Date Reminders
                        if due_d:
                            diff_days = (due_d - today).days
                            if diff_days < 0:
                                days_overdue = abs(diff_days)
                                results.append(NotificationOut(
                                    notification_id=_make_id(NotificationType.LENDING_OVERDUE, bid),
                                    notification_type=NotificationType.LENDING_OVERDUE,
                                    title=f"Overdue Lending Facility: {bname}",
                                    message=(
                                        f"{bname} ({ref}) maturity due date was {due_d.strftime('%b %d, %Y')} "
                                        f"({days_overdue} day{'s' if days_overdue != 1 else ''} overdue). "
                                        f"Remaining balance: ₱{rem:,.2f}."
                                    ),
                                    company_id=filcap_cid,
                                    reference_type="lending",
                                    reference_id=bid,
                                    is_read=False,
                                    created_at=now_utc - timedelta(minutes=min(days_overdue, 60)),
                                ))
                            elif diff_days == 0:
                                results.append(NotificationOut(
                                    notification_id=_make_id(NotificationType.LENDING_DUE_TODAY, "maturity", bid, today_iso),
                                    notification_type=NotificationType.LENDING_DUE_TODAY,
                                    title=f"Lending Maturity Due Today: {bname}",
                                    message=(
                                        f"{bname} ({ref}) lending facility matures TODAY ({due_d.strftime('%b %d, %Y')})! "
                                        f"Remaining balance: ₱{rem:,.2f}."
                                    ),
                                    company_id=filcap_cid,
                                    reference_type="lending",
                                    reference_id=bid,
                                    is_read=False,
                                    created_at=now_utc,
                                ))
                            elif diff_days == 1:
                                results.append(NotificationOut(
                                    notification_id=_make_id(NotificationType.LENDING_DUE_TOMORROW, "maturity", bid, due_d.isoformat()),
                                    notification_type=NotificationType.LENDING_DUE_TOMORROW,
                                    title=f"Lending Maturity Due Tomorrow: {bname}",
                                    message=(
                                        f"{bname} ({ref}) lending facility matures tomorrow ({due_d.strftime('%b %d, %Y')}). "
                                        f"Remaining balance: ₱{rem:,.2f}."
                                    ),
                                    company_id=filcap_cid,
                                    reference_type="lending",
                                    reference_id=bid,
                                    is_read=False,
                                    created_at=now_utc - timedelta(minutes=5),
                                ))
                            elif 1 < diff_days <= 7:
                                results.append(NotificationOut(
                                    notification_id=_make_id(NotificationType.LENDING_DUE_SOON, "maturity", bid, due_d.isoformat()),
                                    notification_type=NotificationType.LENDING_DUE_SOON,
                                    title=f"Lending Maturity Due in {diff_days} Days: {bname}",
                                    message=(
                                        f"{bname} ({ref}) lending facility matures on {due_d.strftime('%b %d, %Y')} "
                                        f"({diff_days} days left). Remaining balance: ₱{rem:,.2f}."
                                    ),
                                    company_id=filcap_cid,
                                    reference_type="lending",
                                    reference_id=bid,
                                    is_read=False,
                                    created_at=now_utc - timedelta(minutes=10 + diff_days),
                                ))

                        # B. Installment / Schedule Cycle Reminders
                        if freq == "Daily":
                            if missed_count > 0:
                                pen_text = f" Accrued penalties: ₱{penalties:,.2f}." if penalties > Decimal("0.00") else ""
                                results.append(NotificationOut(
                                    notification_id=_make_id(NotificationType.LENDING_INSTALLMENT_OVERDUE, bid, missed_count),
                                    notification_type=NotificationType.LENDING_INSTALLMENT_OVERDUE,
                                    title=f"Missed Daily Installments ({missed_count}d): {bname}",
                                    message=(
                                        f"{bname} ({ref}) has {missed_count} missed daily installment"
                                        f"{'s' if missed_count != 1 else ''} ({compliance}). "
                                        f"Daily target: ₱{target:,.2f}.{pen_text}"
                                    ),
                                    company_id=filcap_cid,
                                    reference_type="lending",
                                    reference_id=bid,
                                    is_read=False,
                                    created_at=now_utc - timedelta(minutes=2),
                                ))

                            # Check today's daily installment
                            if start_d and start_d <= today and (not due_d or today <= due_d) and target > Decimal("0.00"):
                                paid_today = sum(
                                    (
                                        Decimal(str(r.get("amount", 0)))
                                        for r in repayments
                                        if str(r.get("cycle_due_date") or r.get("date") or r.get("payment_date") or "").split("T")[0] == today_iso
                                    ),
                                    Decimal("0.00"),
                                )
                                if paid_today < target:
                                    rem_today = min(rem, max(Decimal("0.00"), target - paid_today))
                                    if rem_today > Decimal("0.00"):
                                        results.append(NotificationOut(
                                            notification_id=_make_id(NotificationType.LENDING_DUE_TODAY, "daily", bid, today_iso),
                                            notification_type=NotificationType.LENDING_DUE_TODAY,
                                            title=f"Daily Installment Due Today: {bname}",
                                            message=(
                                                f"{bname} ({ref}) has a daily lending installment of "
                                                f"₱{rem_today:,.2f} due today ({today.strftime('%b %d, %Y')})."
                                            ),
                                            company_id=filcap_cid,
                                            reference_type="lending",
                                            reference_id=bid,
                                            is_read=False,
                                            created_at=now_utc - timedelta(minutes=1),
                                        ))
                        else:
                            # Monthly schedule cycles
                            progress = LendingService.get_monthly_progress(
                                b.get("dateBorrowed"),
                                b.get("dueDate"),
                                b.get("totalAmountPayable", 0),
                                repayments,
                                term_days=int(b.get("termDays") or 2),
                            )
                            for m_info in progress.get("monthDetails", []):
                                m_rem = Decimal(str(m_info.get("remaining", 0)))
                                if m_rem <= Decimal("0.00"):
                                    continue
                                c_due_d = _parse_date_safe(m_info.get("dueDate"))
                                if not c_due_d:
                                    continue
                                m_idx = m_info.get("month_index", 1)
                                c_diff = (c_due_d - today).days

                                if c_diff < 0:
                                    days_ov = abs(c_diff)
                                    results.append(NotificationOut(
                                        notification_id=_make_id(NotificationType.LENDING_INSTALLMENT_OVERDUE, bid, f"M{m_idx}"),
                                        notification_type=NotificationType.LENDING_INSTALLMENT_OVERDUE,
                                        title=f"Overdue Monthly Installment (Month {m_idx}): {bname}",
                                        message=(
                                            f"{bname} ({ref}) — Month {m_idx} installment of ₱{m_rem:,.2f} "
                                            f"was due on {c_due_d.strftime('%b %d, %Y')} "
                                            f"({days_ov} day{'s' if days_ov != 1 else ''} overdue)."
                                        ),
                                        company_id=filcap_cid,
                                        reference_type="lending",
                                        reference_id=bid,
                                        is_read=False,
                                        created_at=now_utc - timedelta(minutes=3),
                                    ))
                                elif c_diff == 0:
                                    results.append(NotificationOut(
                                        notification_id=_make_id(NotificationType.LENDING_DUE_TODAY, bid, f"M{m_idx}"),
                                        notification_type=NotificationType.LENDING_DUE_TODAY,
                                        title=f"Monthly Installment Due Today (Month {m_idx}): {bname}",
                                        message=(
                                            f"{bname} ({ref}) — Month {m_idx} installment of ₱{m_rem:,.2f} "
                                            f"is due TODAY ({c_due_d.strftime('%b %d, %Y')})!"
                                        ),
                                        company_id=filcap_cid,
                                        reference_type="lending",
                                        reference_id=bid,
                                        is_read=False,
                                        created_at=now_utc - timedelta(minutes=1),
                                    ))
                                elif c_diff == 1:
                                    results.append(NotificationOut(
                                        notification_id=_make_id(NotificationType.LENDING_DUE_TOMORROW, bid, f"M{m_idx}"),
                                        notification_type=NotificationType.LENDING_DUE_TOMORROW,
                                        title=f"Monthly Installment Due Tomorrow (Month {m_idx}): {bname}",
                                        message=(
                                            f"{bname} ({ref}) — Month {m_idx} installment of ₱{m_rem:,.2f} "
                                            f"is due tomorrow ({c_due_d.strftime('%b %d, %Y')})."
                                        ),
                                        company_id=filcap_cid,
                                        reference_type="lending",
                                        reference_id=bid,
                                        is_read=False,
                                        created_at=now_utc - timedelta(minutes=6),
                                    ))
                                elif 1 < c_diff <= 7:
                                    results.append(NotificationOut(
                                        notification_id=_make_id(NotificationType.LENDING_DUE_SOON, bid, f"M{m_idx}"),
                                        notification_type=NotificationType.LENDING_DUE_SOON,
                                        title=f"Monthly Installment Due in {c_diff} Days: {bname}",
                                        message=(
                                            f"{bname} ({ref}) — Month {m_idx} installment of ₱{m_rem:,.2f} "
                                            f"is due on {c_due_d.strftime('%b %d, %Y')} ({c_diff} days left)."
                                        ),
                                        company_id=filcap_cid,
                                        reference_type="lending",
                                        reference_id=bid,
                                        is_read=False,
                                        created_at=now_utc - timedelta(minutes=10 + c_diff),
                                    ))

                    # C. Recent Lending Repayment Transactions
                    for r in repayments[:2]:
                        amt_paid = Decimal(str(r.get("amount", 0)))
                        if amt_paid <= Decimal("0.00"):
                            continue
                        tx_id = r.get("transaction_id") or r.get("id")
                        tx_ref = r.get("transaction_ref_no") or r.get("transactionRefNo") or f"TX-{tx_id}"
                        pen_paid = Decimal(str(r.get("penalty_portion") or r.get("penalty") or 0))
                        method = r.get("method") or "Cash"
                        is_settled = rem <= Decimal("0.00")
                        ntype = NotificationType.LENDING_FULLY_SETTLED if is_settled else NotificationType.LENDING_PAYMENT_RECEIVED
                        title = f"Lending Facility Settled: {bname}" if is_settled else f"Lending Payment Received: {bname}"
                        pen_str = f" (+₱{pen_paid:,.2f} late fee)" if pen_paid > Decimal("0.00") else ""
                        ts_raw = r.get("timestamp") or r.get("payment_date") or r.get("date")
                        ts_dt = now_utc - timedelta(hours=1)
                        if ts_raw:
                            try:
                                ts_dt = datetime.fromisoformat(str(ts_raw).replace("Z", "+00:00"))
                                if ts_dt.tzinfo is None:
                                    ts_dt = ts_dt.replace(tzinfo=timezone.utc)
                            except Exception:
                                pass
                        results.append(NotificationOut(
                            notification_id=_make_id(ntype, bid, tx_id),
                            notification_type=ntype,
                            title=title,
                            message=(
                                f"{bname} ({ref}) paid ₱{amt_paid:,.2f}{pen_str} via {method} ({tx_ref}). "
                                f"Remaining balance: ₱{rem:,.2f}."
                            ),
                            company_id=filcap_cid,
                            reference_type="lending",
                            reference_id=bid,
                            is_read=False,
                            created_at=ts_dt,
                        ))
                except Exception as b_exc:
                    logger.warning("Lending notification error for borrower %s: %s", b.get("id"), b_exc)
        except Exception as exc:
            logger.warning("Error computing lending notifications: %s", exc)

        return results

    # ── Source 3: Inter-Company Loan Due-Date Notifications ──────────────────

    def _due_date_notifications(
        self,
        company_id: Optional[int],
        name_map: Optional[dict] = None,
        repayments_map: Optional[dict] = None,
    ) -> list[NotificationOut]:
        today = date.today()
        tomorrow = today + timedelta(days=1)
        now_utc = datetime.now(timezone.utc)

        q = self.db.query(Loan).filter(Loan.due_date.isnot(None))
        if company_id is not None:
            q = q.filter(or_(Loan.borrower == company_id, Loan.lender == company_id))

        loans = q.all()
        results: list[NotificationOut] = []

        if repayments_map is None:
            repayments_map = self._get_repayments_map()
        if name_map is None:
            name_map = self._get_company_names_map()

        for loan in loans:
            try:
                status_low = (loan.status or "").lower()
                if "reject" in status_low or "disapprov" in status_low:
                    continue

                repaid = repayments_map.get(loan.loan_id, Decimal("0.00"))
                balance = _calculate_loan_balance(loan, repaid)
                if balance <= Decimal("0.00"):
                    continue

                borrower_name = _company_name(self.db, loan.borrower, name_map)
                lender_name = _company_name(self.db, loan.lender, name_map) if loan.lender else "Corporate Treasury"
                ref = loan.loan_ref_no or str(loan.loan_id)

                if loan.due_date < today:
                    days_overdue = (today - loan.due_date).days

                    if company_id is None or company_id == loan.borrower:
                        results.append(NotificationOut(
                            notification_id=_make_id(NotificationType.LOAN_OVERDUE, "borrower", loan.loan_id),
                            notification_type=NotificationType.LOAN_OVERDUE,
                            title="Overdue Loan Payment",
                            message=(
                                f"Your loan from {lender_name} (Ref: {ref}) is overdue by "
                                f"{days_overdue} day{'s' if days_overdue != 1 else ''}. "
                                f"Outstanding balance: ₱{balance:,.2f}. Please settle immediately."
                            ),
                            company_id=loan.borrower,
                            reference_type="loan",
                            reference_id=loan.loan_id,
                            is_read=False,
                            created_at=now_utc - timedelta(minutes=min(days_overdue, 60)),
                        ))

                    if loan.lender and (company_id is None or company_id == loan.lender):
                        results.append(NotificationOut(
                            notification_id=_make_id(NotificationType.LOAN_OVERDUE, "lender", loan.loan_id),
                            notification_type=NotificationType.LOAN_OVERDUE,
                            title="Overdue Loan — Payment Not Received",
                            message=(
                                f"{borrower_name}'s loan (Ref: {ref}) is overdue by "
                                f"{days_overdue} day{'s' if days_overdue != 1 else ''}. "
                                f"Outstanding balance: ₱{balance:,.2f}."
                            ),
                            company_id=loan.lender,
                            reference_type="loan",
                            reference_id=loan.loan_id,
                            is_read=False,
                            created_at=now_utc - timedelta(minutes=min(days_overdue, 60)),
                        ))

                elif loan.due_date == today:
                    if company_id is None or company_id == loan.borrower:
                        results.append(NotificationOut(
                            notification_id=_make_id(NotificationType.LOAN_DUE_TODAY, "borrower", loan.loan_id),
                            notification_type=NotificationType.LOAN_DUE_TODAY,
                            title="Loan Payment Due Today",
                            message=(
                                f"Your loan from {lender_name} (Ref: {ref}) is due today. "
                                f"Outstanding balance: ₱{balance:,.2f}."
                            ),
                            company_id=loan.borrower,
                            reference_type="loan",
                            reference_id=loan.loan_id,
                            is_read=False,
                            created_at=now_utc,
                        ))

                    if loan.lender and (company_id is None or company_id == loan.lender):
                        results.append(NotificationOut(
                            notification_id=_make_id(NotificationType.LOAN_DUE_TODAY, "lender", loan.loan_id),
                            notification_type=NotificationType.LOAN_DUE_TODAY,
                            title="Loan Payment Expected Today",
                            message=(
                                f"{borrower_name}'s loan (Ref: {ref}) is due today. "
                                f"Outstanding balance: ₱{balance:,.2f}."
                            ),
                            company_id=loan.lender,
                            reference_type="loan",
                            reference_id=loan.loan_id,
                            is_read=False,
                            created_at=now_utc,
                        ))

                elif loan.due_date == tomorrow:
                    if company_id is None or company_id == loan.borrower:
                        results.append(NotificationOut(
                            notification_id=_make_id(NotificationType.LOAN_DUE_TOMORROW, "borrower", loan.loan_id),
                            notification_type=NotificationType.LOAN_DUE_TOMORROW,
                            title="Loan Payment Due Tomorrow",
                            message=(
                                f"Your loan from {lender_name} (Ref: {ref}) is due tomorrow. "
                                f"Outstanding balance: ₱{balance:,.2f}. Please prepare payment."
                            ),
                            company_id=loan.borrower,
                            reference_type="loan",
                            reference_id=loan.loan_id,
                            is_read=False,
                            created_at=now_utc - timedelta(minutes=5),
                        ))

                    if loan.lender and (company_id is None or company_id == loan.lender):
                        results.append(NotificationOut(
                            notification_id=_make_id(NotificationType.LOAN_DUE_TOMORROW, "lender", loan.loan_id),
                            notification_type=NotificationType.LOAN_DUE_TOMORROW,
                            title="Loan Payment Expected Tomorrow",
                            message=(
                                f"{borrower_name}'s loan (Ref: {ref}) is due tomorrow. "
                                f"Outstanding balance: ₱{balance:,.2f}."
                            ),
                            company_id=loan.lender,
                            reference_type="loan",
                            reference_id=loan.loan_id,
                            is_read=False,
                            created_at=now_utc - timedelta(minutes=5),
                        ))

                elif today < loan.due_date <= today + timedelta(days=7):
                    days_left = (loan.due_date - today).days
                    if company_id is None or company_id == loan.borrower:
                        results.append(NotificationOut(
                            notification_id=_make_id(NotificationType.LOAN_DUE_SOON, "borrower", loan.loan_id),
                            notification_type=NotificationType.LOAN_DUE_SOON,
                            title=f"Loan Payment Due Soon ({days_left} Days)",
                            message=(
                                f"Your loan from {lender_name} (Ref: {ref}) is due on "
                                f"{loan.due_date.strftime('%b %d, %Y')} ({days_left} days left). "
                                f"Outstanding balance: ₱{balance:,.2f}."
                            ),
                            company_id=loan.borrower,
                            reference_type="loan",
                            reference_id=loan.loan_id,
                            is_read=False,
                            created_at=now_utc - timedelta(minutes=10 + days_left),
                        ))

                    if loan.lender and (company_id is None or company_id == loan.lender):
                        results.append(NotificationOut(
                            notification_id=_make_id(NotificationType.LOAN_DUE_SOON, "lender", loan.loan_id),
                            notification_type=NotificationType.LOAN_DUE_SOON,
                            title=f"Loan Payment Expected Soon ({days_left} Days)",
                            message=(
                                f"{borrower_name}'s loan (Ref: {ref}) is due on "
                                f"{loan.due_date.strftime('%b %d, %Y')} ({days_left} days left). "
                                f"Outstanding balance: ₱{balance:,.2f}."
                            ),
                            company_id=loan.lender,
                            reference_type="loan",
                            reference_id=loan.loan_id,
                            is_read=False,
                            created_at=now_utc - timedelta(minutes=10 + days_left),
                        ))

            except Exception as exc:
                logger.warning("Due-date notification error for loan %s: %s", loan.loan_id, exc)

        return results

    # ── Source 3B: Pending Approval Notifications (live loan records) ────────

    def _pending_approval_notifications(
        self,
        company_id: Optional[int],
        name_map: Optional[dict] = None,
    ) -> list[NotificationOut]:
        q = self.db.query(Loan).filter(Loan.status.ilike("%pending%"))
        if company_id is not None:
            q = q.filter(or_(Loan.borrower == company_id, Loan.lender == company_id))
        loans = q.all()
        results: list[NotificationOut] = []

        if name_map is None:
            name_map = self._get_company_names_map()

        for loan in loans:
            try:
                borrower_name = _company_name(self.db, loan.borrower, name_map)
                lender_name = _company_name(self.db, loan.lender, name_map) if loan.lender else "Corporate Treasury"
                ref = loan.loan_ref_no or str(loan.loan_id)
                amount = loan.principal_amount or Decimal("0.00")

                if loan.lender and (company_id is None or company_id == loan.lender):
                    results.append(NotificationOut(
                        notification_id=_make_id(NotificationType.LOAN_PENDING_APPROVAL, "lender", loan.loan_id),
                        notification_type=NotificationType.LOAN_PENDING_APPROVAL,
                        title="Loan Approval Required",
                        message=(
                            f"{borrower_name} requested an inter-company loan of ₱{amount:,.2f} "
                            f"(Ref: {ref}) requiring your authorization."
                        ),
                        company_id=loan.lender,
                        reference_type="loan",
                        reference_id=loan.loan_id,
                        is_read=False,
                        created_at=loan.created_at or datetime.now(timezone.utc),
                    ))

                if company_id is None or company_id == loan.borrower:
                    results.append(NotificationOut(
                        notification_id=_make_id(NotificationType.LOAN_PENDING_APPROVAL, "borrower", loan.loan_id),
                        notification_type=NotificationType.LOAN_PENDING_APPROVAL,
                        title="Loan Request Pending Approval",
                        message=(
                            f"Your loan request of ₱{amount:,.2f} to {lender_name} "
                            f"(Ref: {ref}) is awaiting approval ({loan.status})."
                        ),
                        company_id=loan.borrower,
                        reference_type="loan",
                        reference_id=loan.loan_id,
                        is_read=False,
                        created_at=loan.created_at or datetime.now(timezone.utc),
                    ))
            except Exception as exc:
                logger.warning("Pending approval notification error for loan %s: %s", loan.loan_id, exc)

        return results

    # ── Source 3C: Repayment Notifications (LoanRepayment + AuditLog) ────────

    def _repayment_notifications(
        self,
        company_id: Optional[int],
        name_map: Optional[dict] = None,
    ) -> list[NotificationOut]:
        results: list[NotificationOut] = []
        if name_map is None:
            name_map = self._get_company_names_map()

        seen_repayment_ids: set[int] = set()

        # 1. Direct LoanRepayment table records
        try:
            rep_q = self.db.query(LoanRepayment, Loan).join(Loan, LoanRepayment.loan_id == Loan.loan_id)
            if company_id is not None:
                rep_q = rep_q.filter(or_(Loan.borrower == company_id, Loan.lender == company_id))
            rep_rows = rep_q.order_by(LoanRepayment.created_at.desc()).limit(30).all()

            for rep, loan in rep_rows:
                seen_repayment_ids.add(int(rep.loan_repayment_id))
                amount_paid = rep.amount or Decimal("0.00")
                remaining = rep.remaining_balance if rep.remaining_balance is not None else Decimal("0.00")
                borrower_name = _company_name(self.db, loan.borrower, name_map)
                lender_name = _company_name(self.db, loan.lender, name_map) if loan.lender else "Corporate Treasury"
                ref = loan.loan_ref_no or str(loan.loan_id)
                is_full = remaining <= Decimal("0.00")
                ts = rep.created_at or datetime.combine(rep.payment_date, datetime.min.time()).replace(tzinfo=timezone.utc)

                if loan.lender and (company_id is None or company_id == loan.lender):
                    n_type = NotificationType.LOAN_FULLY_SETTLED if is_full else NotificationType.LOAN_REPAYMENT_RECEIVED
                    n_title = "Loan Fully Settled" if is_full else "Loan Repayment Received"
                    n_msg = (
                        f"{borrower_name} has fully settled their loan (Ref: {ref}). Final payment: ₱{amount_paid:,.2f}."
                        if is_full
                        else f"{borrower_name} made a payment of ₱{amount_paid:,.2f} on loan (Ref: {ref}). Remaining balance: ₱{remaining:,.2f}."
                    )
                    results.append(NotificationOut(
                        notification_id=_make_id(n_type, "lender", rep.loan_repayment_id),
                        notification_type=n_type,
                        title=n_title,
                        message=n_msg,
                        company_id=loan.lender,
                        reference_type="loan_repayment",
                        reference_id=rep.loan_repayment_id,
                        is_read=False,
                        created_at=ts,
                    ))

                if company_id is None or company_id == loan.borrower:
                    b_type = NotificationType.LOAN_FULLY_SETTLED if is_full else NotificationType.LOAN_REPAYMENT_SENT
                    b_title = "Loan Fully Settled" if is_full else "Loan Payment Recorded"
                    b_msg = (
                        f"Your payment of ₱{amount_paid:,.2f} for loan (Ref: {ref}) to {lender_name} has been recorded. Loan is now fully settled."
                        if is_full
                        else f"Your payment of ₱{amount_paid:,.2f} for loan (Ref: {ref}) to {lender_name} has been recorded. Remaining balance: ₱{remaining:,.2f}."
                    )
                    results.append(NotificationOut(
                        notification_id=_make_id(b_type, "borrower", rep.loan_repayment_id),
                        notification_type=b_type,
                        title=b_title,
                        message=b_msg,
                        company_id=loan.borrower,
                        reference_type="loan_repayment",
                        reference_id=rep.loan_repayment_id,
                        is_read=False,
                        created_at=ts,
                    ))
        except Exception as exc:
            logger.warning("Direct loan repayment notification error: %s", exc)

        # 2. Fallback from AuditLog for any historical repayments
        try:
            q = self.db.query(AuditLog).filter(
                AuditLog.action == "LOAN_UPDATED",
                AuditLog.details.isnot(None),
            )
            if company_id is not None:
                q = q.filter(AuditLog.company_id == company_id)

            audit_rows = q.order_by(AuditLog.created_at.desc()).limit(50).all()
            parsed_items: list[tuple[AuditLog, dict, int]] = []
            needed_loan_ids: set[int] = set()

            for row in audit_rows:
                details = _parse_details(row.details)
                if details.get("record_type") == "loan_repayment" and details.get("record_id"):
                    rep_id = details.get("repayment_id")
                    if rep_id and int(rep_id) in seen_repayment_ids:
                        continue
                    lid = int(details["record_id"])
                    parsed_items.append((row, details, lid))
                    needed_loan_ids.add(lid)

            loans_by_id: dict[int, Loan] = {}
            if needed_loan_ids:
                found_loans = self.db.query(Loan).filter(Loan.loan_id.in_(list(needed_loan_ids))).all()
                loans_by_id = {l.loan_id: l for l in found_loans}

            for row, details, loan_id in parsed_items:
                loan = loans_by_id.get(loan_id)
                if not loan:
                    continue

                repayment_id = details.get("repayment_id")
                amount_paid = Decimal(str(details.get("amount", "0")))
                remaining = Decimal(str(details.get("remaining_balance", "0")))

                borrower_name = _company_name(self.db, loan.borrower, name_map)
                lender_name = _company_name(self.db, loan.lender, name_map)
                ref = loan.loan_ref_no or str(loan_id)
                is_full = remaining <= Decimal("0.00")
                ts = row.created_at or datetime.now(timezone.utc)

                if loan.lender and (company_id is None or company_id == loan.lender):
                    n_type = NotificationType.LOAN_FULLY_SETTLED if is_full else NotificationType.LOAN_REPAYMENT_RECEIVED
                    n_title = "Loan Fully Settled" if is_full else "Loan Repayment Received"
                    n_msg = (
                        f"{borrower_name} has fully settled their loan (Ref: {ref}). Final payment: ₱{amount_paid:,.2f}."
                        if is_full
                        else f"{borrower_name} made a payment of ₱{amount_paid:,.2f} on loan (Ref: {ref}). Remaining balance: ₱{remaining:,.2f}."
                    )
                    results.append(NotificationOut(
                        notification_id=_make_id(n_type, "lender", repayment_id or row.audit_log_id),
                        notification_type=n_type,
                        title=n_title,
                        message=n_msg,
                        company_id=loan.lender,
                        reference_type="loan_repayment",
                        reference_id=repayment_id or loan_id,
                        is_read=False,
                        created_at=ts,
                    ))

                if company_id is None or company_id == loan.borrower:
                    b_type = NotificationType.LOAN_FULLY_SETTLED if is_full else NotificationType.LOAN_REPAYMENT_SENT
                    b_title = "Loan Fully Settled" if is_full else "Payment Recorded"
                    b_msg = (
                        f"Your payment of ₱{amount_paid:,.2f} for loan (Ref: {ref}) to {lender_name} has been recorded. Loan is now fully settled."
                        if is_full
                        else f"Your payment of ₱{amount_paid:,.2f} for loan (Ref: {ref}) to {lender_name} has been recorded. Remaining balance: ₱{remaining:,.2f}."
                    )
                    results.append(NotificationOut(
                        notification_id=_make_id(b_type, "borrower", repayment_id or row.audit_log_id),
                        notification_type=b_type,
                        title=b_title,
                        message=b_msg,
                        company_id=loan.borrower,
                        reference_type="loan_repayment",
                        reference_id=repayment_id or loan_id,
                        is_read=False,
                        created_at=ts,
                    ))
        except Exception as exc:
            logger.warning("Audit repayment notification error: %s", exc)

        return results

    # ── Source 3D: Role-based Loan Workflow Notifications ────────────────────

    def _loan_workflow_notifications(
        self,
        user_role: Optional[str],
        company_id: Optional[int],
        name_map: Optional[dict] = None,
    ) -> list[NotificationOut]:
        results: list[NotificationOut] = []
        if name_map is None:
            name_map = self._get_company_names_map()
        role = (user_role or "").lower()

        try:
            if not role or role in ("finance", "admin"):
                pending_finance = (
                    self.db.query(Loan)
                    .filter(Loan.status.in_(["Pending Finance Endorsement", "Pending Approval"]))
                    .order_by(Loan.created_at.desc())
                    .limit(20)
                    .all()
                )
                for loan in pending_finance:
                    borrower_name = _company_name(self.db, loan.borrower, name_map)
                    ref = loan.loan_ref_no or str(loan.loan_id)
                    amt = loan.principal_amount or Decimal("0.00")
                    results.append(NotificationOut(
                        notification_id=_make_id(NotificationType.LOAN_REQUEST_FINANCE, loan.loan_id),
                        notification_type=NotificationType.LOAN_REQUEST_FINANCE,
                        title="New Loan Request (Finance Endorsement)",
                        message=f"{borrower_name} requested a loan of ₱{amt:,.2f} (Ref: {ref}) awaiting your review and endorsement.",
                        company_id=loan.borrower,
                        reference_type="loan",
                        reference_id=loan.loan_id,
                        is_read=False,
                        created_at=loan.created_at or datetime.now(timezone.utc),
                    ))

            if not role or role in ("audit", "auditor", "admin"):
                pending_audit = (
                    self.db.query(Loan)
                    .filter(Loan.status == "Pending Audit Approval")
                    .order_by(Loan.updated_at.desc())
                    .limit(20)
                    .all()
                )
                for loan in pending_audit:
                    borrower_name = _company_name(self.db, loan.borrower, name_map)
                    lender_name = _company_name(self.db, loan.lender, name_map) if loan.lender else "Corporate Treasury"
                    ref = loan.loan_ref_no or str(loan.loan_id)
                    amt = loan.principal_amount or Decimal("0.00")
                    results.append(NotificationOut(
                        notification_id=_make_id(NotificationType.LOAN_ENDORSED_AUDIT, loan.loan_id),
                        notification_type=NotificationType.LOAN_ENDORSED_AUDIT,
                        title="Loan Endorsed for Audit Review",
                        message=f"Loan request of ₱{amt:,.2f} for {borrower_name} from {lender_name} (Ref: {ref}) was endorsed by Finance and awaits compliance approval.",
                        company_id=loan.borrower,
                        reference_type="loan",
                        reference_id=loan.loan_id,
                        is_read=False,
                        created_at=loan.endorsed_at or loan.updated_at or datetime.now(timezone.utc),
                    ))

            if not role or role in ("supervisor", "company", "admin"):
                q_sup = self.db.query(Loan).filter(
                    Loan.status.in_(["Approved", "Disapproved by Audit", "Rejected by Finance"])
                )
                if company_id:
                    q_sup = q_sup.filter(Loan.borrower == company_id)
                supervisor_loans = q_sup.order_by(Loan.updated_at.desc()).limit(20).all()
                for loan in supervisor_loans:
                    lender_name = _company_name(self.db, loan.lender, name_map) if loan.lender else "Corporate Treasury"
                    ref = loan.loan_ref_no or str(loan.loan_id)
                    amt = loan.principal_amount or Decimal("0.00")
                    is_approved = loan.status == "Approved"
                    ntype = NotificationType.LOAN_APPROVED_SUPERVISOR if is_approved else NotificationType.LOAN_REJECTED_SUPERVISOR
                    title = "Loan Request Approved" if is_approved else f"Loan Request {loan.status}"
                    if is_approved:
                        msg = f"Your loan request of ₱{amt:,.2f} from {lender_name} (Ref: {ref}) has been approved by Internal Audit. Funds disbursed to your account."
                    else:
                        reason = loan.audit_remark or loan.finance_remark or "Request declined."
                        msg = f"Your loan request (Ref: {ref}) of ₱{amt:,.2f} was {loan.status.lower()}: {reason}"
                    results.append(NotificationOut(
                        notification_id=_make_id(ntype, loan.loan_id, loan.status.replace(" ", "_")),
                        notification_type=ntype,
                        title=title,
                        message=msg,
                        company_id=loan.borrower,
                        reference_type="loan",
                        reference_id=loan.loan_id,
                        is_read=False,
                        created_at=loan.audit_reviewed_at or loan.endorsed_at or loan.updated_at or datetime.now(timezone.utc),
                    ))
        except Exception as exc:
            logger.warning("Error computing loan workflow notifications: %s", exc)

        return results

    # ── Source 4: Tenant Lease Due-Date & Rent Payment Notifications ─────────

    def _tenant_notifications(
        self,
        company_id: Optional[int],
        name_map: Optional[dict] = None,
    ) -> list[NotificationOut]:
        results: list[NotificationOut] = []
        if name_map is None:
            name_map = self._get_company_names_map()

        today = date.today()
        now_utc = datetime.now(timezone.utc)

        try:
            from app.models.tenant import TenantLease
            from app.services.tenant_service import add_period_clamped, count_periods

            q = self.db.query(TenantLease)
            if company_id is not None:
                q = q.filter(TenantLease.company_id == company_id)
            leases = q.order_by(TenantLease.lease_id.desc()).all()

            for lease in leases:
                try:
                    if (lease.status or "").lower() == "completed":
                        continue

                    cname = _company_name(self.db, lease.company_id, name_map)
                    tname = lease.tenant_name
                    unit = lease.unit_name
                    rent = Decimal(str(lease.rent_amount or 0))
                    total_payable = Decimal(str(lease.total_amount_payable or rent))
                    paid_total = sum(
                        (
                            Decimal(str(p.amount or 0))
                            for p in (lease.payments or [])
                            if (p.status or "Paid").lower() != "missed"
                        ),
                        Decimal("0.00"),
                    )
                    rem_total = max(Decimal("0.00"), total_payable - paid_total)
                    if rem_total <= Decimal("0.00"):
                        continue

                    # Determine next unpaid period due date
                    mode = lease.repeat_mode or "None"
                    next_due: Optional[date] = lease.due_date
                    due_amt = rem_total

                    if mode in ("Daily", "Monthly", "Quarterly", "Annually") and lease.due_date and lease.lease_end_date and rent > Decimal("0.00"):
                        n_periods = count_periods(lease.due_date, lease.lease_end_date, mode)
                        completed_periods = int(paid_total // rent)
                        if completed_periods < n_periods:
                            next_due = add_period_clamped(lease.due_date, mode, completed_periods)
                            paid_in_current = paid_total - (Decimal(str(completed_periods)) * rent)
                            due_amt = max(Decimal("0.00"), rent - paid_in_current)

                    if next_due:
                        diff_days = (next_due - today).days
                        if diff_days < 0:
                            days_ov = abs(diff_days)
                            results.append(NotificationOut(
                                notification_id=_make_id(NotificationType.TENANT_OVERDUE, lease.lease_id, next_due.isoformat()),
                                notification_type=NotificationType.TENANT_OVERDUE,
                                title=f"Overdue Tenant Rent: {tname}",
                                message=(
                                    f"{tname} ({unit} • {cname}) rent of ₱{due_amt:,.2f} was due on "
                                    f"{next_due.strftime('%b %d, %Y')} ({days_ov} day{'s' if days_ov != 1 else ''} overdue)."
                                ),
                                company_id=lease.company_id,
                                reference_type="tenant",
                                reference_id=lease.lease_id,
                                is_read=False,
                                created_at=now_utc - timedelta(minutes=min(days_ov, 60)),
                            ))
                        elif diff_days == 0:
                            results.append(NotificationOut(
                                notification_id=_make_id(NotificationType.TENANT_DUE_TODAY, lease.lease_id, next_due.isoformat()),
                                notification_type=NotificationType.TENANT_DUE_TODAY,
                                title=f"Tenant Rent Due Today: {tname}",
                                message=(
                                    f"{tname} ({unit} • {cname}) rent of ₱{due_amt:,.2f} is due TODAY "
                                    f"({next_due.strftime('%b %d, %Y')})!"
                                ),
                                company_id=lease.company_id,
                                reference_type="tenant",
                                reference_id=lease.lease_id,
                                is_read=False,
                                created_at=now_utc,
                            ))
                        elif diff_days == 1:
                            results.append(NotificationOut(
                                notification_id=_make_id(NotificationType.TENANT_DUE_TOMORROW, lease.lease_id, next_due.isoformat()),
                                notification_type=NotificationType.TENANT_DUE_TOMORROW,
                                title=f"Tenant Rent Due Tomorrow: {tname}",
                                message=(
                                    f"{tname} ({unit} • {cname}) rent of ₱{due_amt:,.2f} is due tomorrow "
                                    f"({next_due.strftime('%b %d, %Y')})."
                                ),
                                company_id=lease.company_id,
                                reference_type="tenant",
                                reference_id=lease.lease_id,
                                is_read=False,
                                created_at=now_utc - timedelta(minutes=5),
                            ))
                        elif 1 < diff_days <= 7:
                            results.append(NotificationOut(
                                notification_id=_make_id(NotificationType.TENANT_DUE_SOON, lease.lease_id, next_due.isoformat()),
                                notification_type=NotificationType.TENANT_DUE_SOON,
                                title=f"Tenant Rent Due in {diff_days} Days: {tname}",
                                message=(
                                    f"{tname} ({unit} • {cname}) rent of ₱{due_amt:,.2f} is due on "
                                    f"{next_due.strftime('%b %d, %Y')} ({diff_days} days left)."
                                ),
                                company_id=lease.company_id,
                                reference_type="tenant",
                                reference_id=lease.lease_id,
                                is_read=False,
                                created_at=now_utc - timedelta(minutes=10 + diff_days),
                            ))

                    # Recent rent payments
                    for p in (lease.payments or [])[:2]:
                        if (p.status or "Paid").lower() == "missed" or (p.amount or 0) <= 0:
                            continue
                        ts = p.created_at or datetime.combine(p.payment_date, datetime.min.time()).replace(tzinfo=timezone.utc)
                        results.append(NotificationOut(
                            notification_id=_make_id(NotificationType.TENANT_PAYMENT_RECEIVED, lease.lease_id, p.payment_id),
                            notification_type=NotificationType.TENANT_PAYMENT_RECEIVED,
                            title=f"Tenant Rent Received: {tname}",
                            message=(
                                f"{tname} ({unit}) paid ₱{Decimal(str(p.amount)):,.2f} via {p.method or 'Cash'}."
                            ),
                            company_id=lease.company_id,
                            reference_type="tenant",
                            reference_id=lease.lease_id,
                            is_read=False,
                            created_at=ts,
                        ))
                except Exception as l_exc:
                    logger.warning("Tenant notification error for lease %s: %s", lease.lease_id, l_exc)
        except Exception as exc:
            logger.warning("Error computing tenant notifications: %s", exc)

        return results

    # ── Source 5: Role-based Petty Cash Workflow & Low Balance Notifications ─

    def _petty_cash_workflow_notifications(
        self,
        user_role: Optional[str],
        company_id: Optional[int],
        name_map: Optional[dict] = None,
    ) -> list[NotificationOut]:
        results: list[NotificationOut] = []
        if name_map is None:
            name_map = self._get_company_names_map()
        role = (user_role or "").lower()

        try:
            from app.models.petty_cash import PettyCashTopUp

            if not role or role in ("finance", "admin"):
                pending_finance = (
                    self.db.query(PettyCashTopUp)
                    .filter(PettyCashTopUp.status == "Pending Finance Endorsement")
                    .order_by(PettyCashTopUp.created_at.desc())
                    .limit(20)
                    .all()
                )
                for topup in pending_finance:
                    cname = _company_name(self.db, topup.company_id, name_map)
                    ref = topup.reference_no or str(topup.topup_id)
                    amt = topup.amount or Decimal("0.00")
                    results.append(NotificationOut(
                        notification_id=_make_id(NotificationType.PETTY_CASH_REQUEST, topup.topup_id),
                        notification_type=NotificationType.PETTY_CASH_REQUEST,
                        title="Petty Cash Request (Finance Endorsement)",
                        message=f"{cname} requested a petty cash top-up of ₱{amt:,.2f} (Ref: {ref}) awaiting your review and endorsement.",
                        company_id=topup.company_id,
                        reference_type="petty_cash",
                        reference_id=topup.topup_id,
                        is_read=False,
                        created_at=topup.created_at or datetime.now(timezone.utc),
                    ))

            if not role or role in ("audit", "auditor", "admin"):
                pending_audit = (
                    self.db.query(PettyCashTopUp)
                    .filter(PettyCashTopUp.status == "Pending Audit Approval")
                    .order_by(PettyCashTopUp.created_at.desc())
                    .limit(20)
                    .all()
                )
                for topup in pending_audit:
                    cname = _company_name(self.db, topup.company_id, name_map)
                    ref = topup.reference_no or str(topup.topup_id)
                    amt = topup.amount or Decimal("0.00")
                    results.append(NotificationOut(
                        notification_id=_make_id(NotificationType.PETTY_CASH_AUDIT, topup.topup_id),
                        notification_type=NotificationType.PETTY_CASH_AUDIT,
                        title="Petty Cash Audit Compliance Required",
                        message=f"Petty cash top-up of ₱{amt:,.2f} for {cname} (Ref: {ref}) was endorsed by Finance and awaits Audit approval.",
                        company_id=topup.company_id,
                        reference_type="petty_cash",
                        reference_id=topup.topup_id,
                        is_read=False,
                        created_at=topup.endorsed_at or topup.created_at or datetime.now(timezone.utc),
                    ))

            if not role or role in ("supervisor", "company", "admin"):
                q_sup = self.db.query(PettyCashTopUp).filter(
                    PettyCashTopUp.status.in_(["Approved", "Rejected by Finance", "Disapproved by Audit", "Disapproved"])
                )
                if company_id:
                    q_sup = q_sup.filter(PettyCashTopUp.company_id == company_id)
                topup_rows = q_sup.order_by(PettyCashTopUp.created_at.desc()).limit(20).all()
                for topup in topup_rows:
                    ref = topup.reference_no or str(topup.topup_id)
                    amt = topup.amount or Decimal("0.00")
                    is_approved = topup.status == "Approved"
                    ntype = NotificationType.PETTY_CASH_APPROVED if is_approved else NotificationType.PETTY_CASH_REJECTED
                    title = "Petty Cash Top-up Approved" if is_approved else f"Petty Cash {topup.status}"
                    if is_approved:
                        msg = f"Your petty cash top-up of ₱{amt:,.2f} (Ref: {ref}) has been approved by Audit and credited to your petty cash wallet."
                    else:
                        reason = topup.remark or topup.finance_remark or "Request declined."
                        msg = f"Your petty cash top-up of ₱{amt:,.2f} (Ref: {ref}) was {topup.status.lower()}: {reason}"
                    results.append(NotificationOut(
                        notification_id=_make_id(ntype, topup.topup_id, topup.status.replace(" ", "_")),
                        notification_type=ntype,
                        title=title,
                        message=msg,
                        company_id=topup.company_id,
                        reference_type="petty_cash",
                        reference_id=topup.topup_id,
                        is_read=False,
                        created_at=topup.reviewed_at or topup.endorsed_at or topup.created_at or datetime.now(timezone.utc),
                    ))
        except Exception as exc:
            logger.warning("Error computing petty cash workflow notifications: %s", exc)

        return results

    def _petty_cash_low_balance_notifications(
        self,
        company_id: Optional[int],
        name_map: Optional[dict] = None,
    ) -> list[NotificationOut]:
        results: list[NotificationOut] = []
        now_utc = datetime.now(timezone.utc)
        try:
            from app.services.petty_cash_service import PettyCashService
            pc_svc = PettyCashService(self.db)
            summaries = pc_svc.list_summaries()
            for s in summaries:
                if company_id is not None and s.company_id != company_id:
                    continue
                if s.is_low and (s.total_topups > Decimal("0.00") or s.total_spent > Decimal("0.00")):
                    results.append(NotificationOut(
                        notification_id=_make_id(NotificationType.PETTY_CASH_LOW_BALANCE, s.company_id),
                        notification_type=NotificationType.PETTY_CASH_LOW_BALANCE,
                        title=f"Low Petty Cash Balance: {s.company_name}",
                        message=(
                            f"{s.company_name}'s petty cash wallet balance is ₱{s.balance:,.2f}, "
                            f"below the ₱{s.low_balance_threshold:,.2f} threshold. Please request a top-up."
                        ),
                        company_id=s.company_id,
                        reference_type="petty_cash",
                        reference_id=s.company_id,
                        is_read=False,
                        created_at=now_utc - timedelta(minutes=15),
                    ))
        except Exception as exc:
            logger.warning("Error computing petty cash low balance notifications: %s", exc)

        return results

    # ── Source 6: Deposit & Sales Audit Notifications ────────────────────────

    def _deposit_workflow_notifications(
        self,
        user_role: Optional[str],
        company_id: Optional[int],
        name_map: Optional[dict] = None,
    ) -> list[NotificationOut]:
        results: list[NotificationOut] = []
        if name_map is None:
            name_map = self._get_company_names_map()
        role = (user_role or "").lower()

        if role and role not in ("supervisor", "company", "admin"):
            return results

        try:
            q = self.db.query(AuditLog).filter(
                AuditLog.action.in_(["SALE_UPDATED", "SALE_CREATED"]),
                AuditLog.details.isnot(None),
            )
            if company_id:
                q = q.filter(AuditLog.company_id == company_id)

            audit_rows = q.order_by(AuditLog.created_at.desc()).limit(30).all()
            for row in audit_rows:
                details = _parse_details(row.details)
                is_deposit_or_verified = (
                    details.get("audit_status") in ("Verified", "Audited")
                    or details.get("status") == "Paid"
                    or details.get("record_type") in ("deposit", "sales_deposit")
                )
                if is_deposit_or_verified and row.record_id:
                    cname = _company_name(self.db, row.company_id, name_map)
                    amt = details.get("amount") or details.get("net_amount") or 0.0
                    try:
                        amt_num = float(amt)
                    except Exception:
                        amt_num = 0.0
                    amt_str = f"₱{amt_num:,.2f} " if amt_num > 0 else ""
                    results.append(NotificationOut(
                        notification_id=_make_id(NotificationType.DEPOSIT_VERIFIED, row.audit_log_id),
                        notification_type=NotificationType.DEPOSIT_VERIFIED,
                        title="Deposit / Sales Verified by Audit",
                        message=f"Deposit {amt_str}for {cname} has been verified and approved by Internal Audit.",
                        company_id=row.company_id,
                        reference_type="deposit",
                        reference_id=row.record_id,
                        is_read=False,
                        created_at=row.created_at or datetime.now(timezone.utc),
                    ))
        except Exception as exc:
            logger.warning("Error computing deposit workflow notifications: %s", exc)

        return results
