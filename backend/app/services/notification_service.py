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
    LOAN_REQUEST_FINANCE     = "LOAN_REQUEST_FINANCE"      # Finance: new loan request awaiting endorsement
    LOAN_ENDORSED_AUDIT      = "LOAN_ENDORSED_AUDIT"       # Audit: loan endorsed by Finance awaiting compliance review
    LOAN_APPROVED_SUPERVISOR = "LOAN_APPROVED_SUPERVISOR"  # Supervisor: loan approved by Audit
    LOAN_REJECTED_SUPERVISOR = "LOAN_REJECTED_SUPERVISOR"  # Supervisor: loan rejected by Finance or Audit
    PETTY_CASH_REQUEST       = "PETTY_CASH_REQUEST"        # Finance: new petty cash request awaiting endorsement
    PETTY_CASH_AUDIT         = "PETTY_CASH_AUDIT"          # Audit: petty cash endorsed awaiting audit review
    PETTY_CASH_APPROVED      = "PETTY_CASH_APPROVED"       # Supervisor: petty cash top-up approved
    PETTY_CASH_REJECTED      = "PETTY_CASH_REJECTED"       # Supervisor: petty cash top-up rejected
    DEPOSIT_VERIFIED         = "DEPOSIT_VERIFIED"          # Supervisor: deposit/sales audited or verified


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


def _calculate_loan_balance(loan: Loan, total_repaid: Decimal) -> Decimal:
    principal = loan.principal_amount or Decimal("0.00")
    rate = loan.interest_rate or Decimal("0.00")
    interest = FinanceCalculator.calculate_loan_interest(principal, rate)
    total_payable = FinanceCalculator.calculate_loan_total_payable(principal, interest)
    return FinanceCalculator.calculate_loan_remaining_balance(total_payable, total_repaid)


def _company_name(db: Session, company_id: int, name_map: Optional[dict] = None) -> str:
    if name_map and company_id in name_map:
        return name_map[company_id]
    name = db.query(Company.company_name).filter(Company.company_id == company_id).scalar()
    return name or f"Company #{company_id}"


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
        limit: int = 50,
        offset: int = 0,
    ) -> list[NotificationOut]:
        notifications: list[NotificationOut] = []

        name_map = self._get_company_names_map()
        repayments_map = self._get_repayments_map()

        notifications.extend(self._pending_approval_notifications(company_id, name_map))
        notifications.extend(self._due_date_notifications(company_id, name_map, repayments_map))
        notifications.extend(self._repayment_notifications(company_id, name_map))
        notifications.extend(self._loan_workflow_notifications(user_role, company_id, name_map))
        notifications.extend(self._petty_cash_workflow_notifications(user_role, company_id, name_map))
        notifications.extend(self._deposit_workflow_notifications(user_role, company_id, name_map))

        if notification_type:
            nt = notification_type.upper()
            notifications = [n for n in notifications if n.notification_type == nt]

        notifications.sort(key=lambda n: _normalize_dt(n.created_at), reverse=True)
        return notifications[offset: offset + limit]

    def get_unread_count(self, *, company_id: Optional[int] = None, user_role: Optional[str] = None) -> int:
        return len(self.get_notifications(company_id=company_id, user_role=user_role, limit=10_000))

    # ── Source A: due-date notifications (live loan data) ────────────────────

    def _due_date_notifications(
        self,
        company_id: Optional[int],
        name_map: Optional[dict] = None,
        repayments_map: Optional[dict] = None,
    ) -> list[NotificationOut]:
        today    = date.today()
        tomorrow = today + timedelta(days=1)

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
                repaid = repayments_map.get(loan.loan_id, Decimal("0.00"))
                balance = _calculate_loan_balance(loan, repaid)
                if balance <= Decimal("0.00"):
                    continue

                borrower_name = _company_name(self.db, loan.borrower, name_map)
                lender_name   = _company_name(self.db, loan.lender, name_map)
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
                lender_name   = _company_name(self.db, loan.lender, name_map)
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
        self,
        company_id: Optional[int],
        name_map: Optional[dict] = None,
    ) -> list[NotificationOut]:
        q = self.db.query(AuditLog).filter(
            AuditLog.action == "LOAN_UPDATED",
            AuditLog.details.isnot(None),
        )
        if company_id is not None:
            q = q.filter(AuditLog.company_id == company_id)

        audit_rows = (
            q.order_by(AuditLog.created_at.desc())
            .limit(100)
            .all()
        )
        results: list[NotificationOut] = []

        if name_map is None:
            name_map = self._get_company_names_map()

        parsed_items: list[tuple[AuditLog, dict, int]] = []
        needed_loan_ids: set[int] = set()

        for row in audit_rows:
            details = _parse_details(row.details)
            if details.get("record_type") == "loan_repayment" and details.get("record_id"):
                lid = int(details["record_id"])
                parsed_items.append((row, details, lid))
                needed_loan_ids.add(lid)

        loans_by_id: dict[int, Loan] = {}
        if needed_loan_ids:
            found_loans = self.db.query(Loan).filter(Loan.loan_id.in_(list(needed_loan_ids))).all()
            loans_by_id = {l.loan_id: l for l in found_loans}

        for row, details, loan_id in parsed_items:
            try:
                loan = loans_by_id.get(loan_id)
                if not loan:
                    continue

                repayment_id = details.get("repayment_id")
                amount_paid  = Decimal(str(details.get("amount", "0")))
                remaining    = Decimal(str(details.get("remaining_balance", "0")))

                borrower_name = _company_name(self.db, loan.borrower, name_map)
                lender_name   = _company_name(self.db, loan.lender, name_map)
                ref           = loan.loan_ref_no or str(loan_id)
                is_full       = remaining <= Decimal("0.00")
                ts            = row.created_at or datetime.now(timezone.utc)

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

    # ── Source C: Role-based Loan Workflow Notifications ─────────────────────

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
            # 1. Finance & Admin: New loan requests awaiting endorsement
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

            # 2. Audit & Admin: Loans endorsed by Finance awaiting audit compliance review
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

            # 3. Supervisor / Borrower Company: Approved or Disapproved loans
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

    # ── Source D: Role-based Petty Cash Workflow Notifications ────────────────

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

            # 1. Finance & Admin: Petty cash requests awaiting endorsement
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

            # 2. Audit & Admin: Petty cash requests awaiting compliance approval
            if not role or role in ("audit", "auditor", "admin"):
                pending_audit = (
                    self.db.query(PettyCashTopUp)
                    .filter(PettyCashTopUp.status == "Pending Audit Approval")
                    .order_by(PettyCashTopUp.updated_at.desc() if hasattr(PettyCashTopUp, 'updated_at') else PettyCashTopUp.created_at.desc())
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

            # 3. Supervisor: Petty cash requests approved or rejected
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

    # ── Source E: Deposit & Sales Audit Notifications ─────────────────────────

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

        # Only supervisor / company users (and admins) need deposit verified alerts
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
                # Check if it was audited / verified or deposit recorded
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
                    amt_str = f"₱{amt_num:,.2f}" if amt_num > 0 else ""
                    results.append(NotificationOut(
                        notification_id=_make_id(NotificationType.DEPOSIT_VERIFIED, row.audit_log_id),
                        notification_type=NotificationType.DEPOSIT_VERIFIED,
                        title="Deposit / Sales Verified by Audit",
                        message=f"Deposit {amt_str} for {cname} has been verified and approved by Internal Audit.",
                        company_id=row.company_id,
                        reference_type="deposit",
                        reference_id=row.record_id,
                        is_read=False,
                        created_at=row.created_at or datetime.now(timezone.utc),
                    ))
        except Exception as exc:
            logger.warning("Error computing deposit workflow notifications: %s", exc)

        return results
