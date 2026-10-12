"""
notification_service.py
-----------------------
Stateless, zero-storage in-app notification service.

How it works
-------------
Notifications are NEVER stored in the database.  Instead, they are
computed on the fly at read-time by examining two sources of truth:

1. Audit logs (app.models.audit_log.AuditLog)
   - A LOAN_UPDATED audit entry whose details JSON contains
     "record_type": "loan_repayment" means a repayment was recorded.
   - The details payload already holds amount_paid, remaining_balance,
     repayment_id, and record_id (loan_id) — everything needed to build a
     repayment notification without hitting the loans table twice.

2. Live loan data (app.models.loan.Loan)
   - Due-date comparisons (overdue / due today / due tomorrow) are done
     against date.today() at query time — no scheduled jobs required.
   - The FinanceService calculates the remaining balance so settled loans
     are automatically excluded.

Every call to get_notifications() re-derives the notification list fresh.
The result is ephemeral; the frontend should poll or cache as needed.

Notification shapes
--------------------
Each notification is a plain dict / NotificationOut pydantic object with:
    notification_id : str  – deterministic, stable key (see _make_id)
    notification_type : str
    title : str
    message : str
    reference_type : str   – "loan" | "loan_repayment"
    reference_id : int
    company_id : int        – recipient company
    is_read : bool          – always False (no persistence)
    created_at : datetime   – audit log timestamp or date.today()
"""

from __future__ import annotations

import json
import logging
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal
from typing import Any, Optional

from sqlalchemy import and_, or_
from sqlalchemy.orm import Session

from app.models.audit_log import AuditLog
from app.models.loan import Loan, LoanRepayment
from app.models.company import Company
from app.schemas.notification import NotificationOut
from app.services.finance_service import FinanceCalculator

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Notification type constants
# ---------------------------------------------------------------------------

class NotificationType:
    LOAN_PENDING_APPROVAL    = "LOAN_PENDING_APPROVAL"     # approval required / pending
    LOAN_OVERDUE             = "LOAN_OVERDUE"
    LOAN_DUE_TODAY           = "LOAN_DUE_TODAY"
    LOAN_DUE_TOMORROW        = "LOAN_DUE_TOMORROW"
    LOAN_DUE_SOON            = "LOAN_DUE_SOON"             # due within 7 days
    LOAN_REPAYMENT_RECEIVED  = "LOAN_REPAYMENT_RECEIVED"   # lender sees this
    LOAN_REPAYMENT_SENT      = "LOAN_REPAYMENT_SENT"       # borrower sees this
    LOAN_FULLY_SETTLED       = "LOAN_FULLY_SETTLED"        # both parties


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


def _parse_details(details_str: Optional[str]) -> dict:
    if not details_str:
        return {}
    try:
        return json.loads(details_str)
    except Exception:
        return {}


def _remaining_balance(db: Session, loan: Loan) -> Decimal:
    """Compute the current outstanding balance for a loan."""
    principal = loan.principal_amount or Decimal("0.00")
    rate = loan.interest_rate or Decimal("0.00")
    interest = FinanceCalculator.calculate_loan_interest(principal, rate)
    total_payable = FinanceCalculator.calculate_loan_total_payable(principal, interest)

    from sqlalchemy import func
    total_repaid = (
        db.query(func.coalesce(func.sum(LoanRepayment.amount), 0))
        .filter(LoanRepayment.loan_id == loan.loan_id)
        .scalar()
    )
    return FinanceCalculator.calculate_loan_remaining_balance(
        total_payable, Decimal(str(total_repaid))
    )


def _company_name(db: Session, company_id: int) -> str:
    name = db.query(Company.company_name).filter(Company.company_id == company_id).scalar()
    return name or f"Company #{company_id}"


# ---------------------------------------------------------------------------
# Service
# ---------------------------------------------------------------------------

class NotificationService:

    def __init__(self, db: Session):
        self.db = db

    # ── Public API ────────────────────────────────────────────────────────────

    def get_notifications(
        self,
        *,
        company_id: Optional[int] = None,
        notification_type: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> list[NotificationOut]:
        """
        Return all active notifications for a company (or all companies if
        company_id is None — admin use-case).

        Notifications come from two sources:
          A) Due-date alerts — computed from live loan records.
          B) Repayment alerts — derived from LOAN_UPDATED audit log entries.
        """
        notifications: list[NotificationOut] = []

        notifications.extend(self._pending_approval_notifications(company_id))
        notifications.extend(self._due_date_notifications(company_id))
        notifications.extend(self._repayment_notifications(company_id))

        # Filter by type if requested
        if notification_type:
            nt = notification_type.upper()
            notifications = [n for n in notifications if n.notification_type == nt]

        # Sort newest first, then paginate
        notifications.sort(key=lambda n: _normalize_dt(n.created_at), reverse=True)
        return notifications[offset: offset + limit]

    def get_unread_count(self, *, company_id: Optional[int] = None) -> int:
        """
        Since there is no persistence, every notification is considered
        'unread' by the backend.  The frontend is responsible for tracking
        which IDs have been acknowledged (e.g. localStorage / session state).
        Returns the total active notification count for the given company.
        """
        return len(self.get_notifications(company_id=company_id, limit=10_000))

    # ── Source A: due-date notifications (live loan data) ────────────────────

    def _due_date_notifications(
        self, company_id: Optional[int]
    ) -> list[NotificationOut]:
        today    = date.today()
        tomorrow = today + timedelta(days=1)

        q = self.db.query(Loan).filter(Loan.due_date.isnot(None))
        if company_id is not None:
            # The company is either the borrower OR the lender
            q = q.filter(or_(Loan.borrower == company_id, Loan.lender == company_id))

        loans = q.all()
        results: list[NotificationOut] = []

        for loan in loans:
            try:
                balance = _remaining_balance(self.db, loan)
                if balance <= Decimal("0.00"):
                    continue  # fully settled — no alert needed

                borrower_name = _company_name(self.db, loan.borrower)
                lender_name   = _company_name(self.db, loan.lender)
                ref           = loan.loan_ref_no or str(loan.loan_id)

                if loan.due_date < today:
                    # ── Overdue ──────────────────────────────────────────────
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
                            created_at=datetime.combine(loan.due_date, datetime.min.time()),
                        ))

                    if company_id is None or company_id == loan.lender:
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
                            created_at=datetime.combine(loan.due_date, datetime.min.time()),
                        ))

                elif loan.due_date == today:
                    # ── Due today ────────────────────────────────────────────
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
                            created_at=datetime.combine(today, datetime.min.time()),
                        ))

                    if company_id is None or company_id == loan.lender:
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
                            created_at=datetime.combine(today, datetime.min.time()),
                        ))

                elif loan.due_date == tomorrow:
                    # ── Due tomorrow ─────────────────────────────────────────
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
                            created_at=datetime.combine(today, datetime.min.time()),
                        ))

                    if company_id is None or company_id == loan.lender:
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
                            created_at=datetime.combine(today, datetime.min.time()),
                        ))

                elif today < loan.due_date <= today + timedelta(days=7):
                    # ── Due soon (near: within 7 days) ───────────────────────
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
                            created_at=datetime.combine(today, datetime.min.time()),
                        ))

                    if company_id is None or company_id == loan.lender:
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
                            created_at=datetime.combine(today, datetime.min.time()),
                        ))

            except Exception as exc:
                logger.warning("Due-date notification error for loan %s: %s", loan.loan_id, exc)

        return results

    # ── Source B: pending approval notifications (live loan records) ─────────

    def _pending_approval_notifications(
        self, company_id: Optional[int]
    ) -> list[NotificationOut]:
        """
        Check for loans whose status is 'Pending Approval'.
        Lenders see an actionable notification that their approval is required.
        Borrowers see that their submitted request is waiting for lender authorization.
        """
        q = self.db.query(Loan).filter(Loan.status.ilike("%pending%"))
        if company_id is not None:
            q = q.filter(or_(Loan.borrower == company_id, Loan.lender == company_id))
        loans = q.all()
        results: list[NotificationOut] = []

        for loan in loans:
            try:
                borrower_name = _company_name(self.db, loan.borrower)
                lender_name   = _company_name(self.db, loan.lender)
                ref           = loan.loan_ref_no or str(loan.loan_id)
                amount        = loan.principal_amount or Decimal("0.00")

                # Lender sees request needing approval
                if company_id is None or company_id == loan.lender:
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

                # Borrower sees request waiting for approval
                if company_id is None or company_id == loan.borrower:
                    results.append(NotificationOut(
                        notification_id=_make_id(NotificationType.LOAN_PENDING_APPROVAL, "borrower", loan.loan_id),
                        notification_type=NotificationType.LOAN_PENDING_APPROVAL,
                        title="Loan Request Pending Approval",
                        message=(
                            f"Your loan request of ₱{amount:,.2f} to {lender_name} "
                            f"(Ref: {ref}) is awaiting lender approval."
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

    # ── Source B: repayment notifications (audit log) ────────────────────────

    def _repayment_notifications(
        self, company_id: Optional[int]
    ) -> list[NotificationOut]:
        """
        Look up every LOAN_UPDATED audit log entry whose details contain
        record_type = "loan_repayment".  From those details we build
        repayment notifications — one for the lender and one for the borrower.

        We join to the Loan table to resolve borrower/lender IDs and names.
        """
        # Fetch relevant audit log entries
        q = (
            self.db.query(AuditLog)
            .filter(
                AuditLog.action == "LOAN_UPDATED",
                AuditLog.details.isnot(None),
            )
            .order_by(AuditLog.created_at.desc())
            # Pull a generous window; we filter further below
            .limit(500)
        )
        if company_id is not None:
            # Pre-filter by company_id stored in the audit log row
            q = q.filter(AuditLog.company_id == company_id)

        audit_rows = q.all()
        results: list[NotificationOut] = []

        for row in audit_rows:
            try:
                details = _parse_details(row.details)
                if details.get("record_type") != "loan_repayment":
                    continue

                loan_id      = details.get("record_id")
                repayment_id = details.get("repayment_id")
                amount_paid  = Decimal(str(details.get("amount", "0")))
                remaining    = Decimal(str(details.get("remaining_balance", "0")))

                if not loan_id:
                    continue

                loan = self.db.query(Loan).filter(Loan.loan_id == loan_id).first()
                if not loan:
                    continue

                borrower_name = _company_name(self.db, loan.borrower)
                lender_name   = _company_name(self.db, loan.lender)
                ref           = loan.loan_ref_no or str(loan_id)
                is_full       = remaining <= Decimal("0.00")

                ts = row.created_at or datetime.now(timezone.utc)

                # --- Lender notification ---
                if company_id is None or company_id == loan.lender:
                    if is_full:
                        n_type   = NotificationType.LOAN_FULLY_SETTLED
                        n_title  = "Loan Fully Settled"
                        n_msg    = (
                            f"{borrower_name} has fully settled their loan (Ref: {ref}). "
                            f"Final payment: ₱{amount_paid:,.2f}. Loan is now closed."
                        )
                    else:
                        n_type  = NotificationType.LOAN_REPAYMENT_RECEIVED
                        n_title = "Loan Repayment Received"
                        n_msg   = (
                            f"{borrower_name} made a payment of ₱{amount_paid:,.2f} "
                            f"on loan (Ref: {ref}). "
                            f"Remaining balance: ₱{remaining:,.2f}."
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

                # --- Borrower confirmation ---
                if company_id is None or company_id == loan.borrower:
                    if is_full:
                        b_type  = NotificationType.LOAN_FULLY_SETTLED
                        b_title = "Loan Fully Settled"
                        b_msg   = (
                            f"Your payment of ₱{amount_paid:,.2f} for loan (Ref: {ref}) "
                            f"to {lender_name} has been recorded. "
                            f"Loan is now fully settled. ✓"
                        )
                    else:
                        b_type  = NotificationType.LOAN_REPAYMENT_SENT
                        b_title = "Payment Recorded"
                        b_msg   = (
                            f"Your payment of ₱{amount_paid:,.2f} for loan (Ref: {ref}) "
                            f"to {lender_name} has been recorded. "
                            f"Remaining balance: ₱{remaining:,.2f}."
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
                logger.warning("Repayment notification error for audit log %s: %s", row.audit_log_id, exc)

        return results
