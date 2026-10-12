"""
notifications.py
----------------
In-app notification endpoints.

Notifications are stateless — computed on the fly from audit logs and live
loan data.  Nothing is written to the database.  Read/dismiss state is
managed entirely on the frontend (e.g. localStorage keyed on notification_id).

Company users see only their own company's notifications.
Admins can query any company by passing ?company_id=<id>.
"""

from __future__ import annotations

from typing import List, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.dependencies import CurrentUser
from app.db.session import get_db
from app.schemas.notification import NotificationCountOut, NotificationOut
from app.services.notification_service import NotificationService

router = APIRouter(prefix="/notifications", tags=["Notifications"])


def _resolve_company(
    company_id_param: Optional[int],
    current_user: CurrentUser,
) -> Optional[int]:
    """
    Company users are always scoped to their own company_id from the JWT.
    Admins may pass ?company_id to target a specific company, or omit it to
    get notifications across all companies.
    """
    if current_user["is_admin"]:
        return company_id_param
    return current_user.get("company_id")


@router.get(
    "",
    response_model=List[NotificationOut],
    summary="Get notifications (computed from audit logs + loan due dates)",
)
def get_notifications(
    current_user: CurrentUser,
    company_id: Optional[int] = Query(
        None, description="Admin only: filter by company ID"
    ),
    notification_type: Optional[str] = Query(
        None,
        description=(
            "Filter by type: LOAN_OVERDUE | LOAN_DUE_TODAY | LOAN_DUE_TOMORROW | "
            "LOAN_REPAYMENT_RECEIVED | LOAN_REPAYMENT_SENT | LOAN_FULLY_SETTLED"
        ),
    ),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
) -> List[NotificationOut]:
    """
    Returns active notifications for the authenticated company (or the
    specified company for admins).

    Notification sources:

    **Due-date alerts** (live, recalculated on every request)
    - `LOAN_OVERDUE`      — loan.due_date is in the past and balance > 0
    - `LOAN_DUE_TODAY`    — loan.due_date == today and balance > 0
    - `LOAN_DUE_TOMORROW` — loan.due_date == tomorrow and balance > 0

    **Repayment alerts** (derived from audit log entries)
    - `LOAN_REPAYMENT_RECEIVED` — lender: a borrower made a partial payment
    - `LOAN_REPAYMENT_SENT`     — borrower: payment confirmation
    - `LOAN_FULLY_SETTLED`      — both parties: loan fully paid off
    """
    resolved = _resolve_company(company_id, current_user)
    svc = NotificationService(db)
    return svc.get_notifications(
        company_id=resolved,
        notification_type=notification_type,
        limit=limit,
        offset=offset,
    )


@router.get(
    "/count",
    response_model=NotificationCountOut,
    summary="Get total active notification count",
)
def notification_count(
    current_user: CurrentUser,
    company_id: Optional[int] = Query(None, description="Admin only: filter by company ID"),
    db: Session = Depends(get_db),
) -> NotificationCountOut:
    """
    Returns the total number of active notifications.
    Because the backend has no persistence, every notification is treated as
    unread — the frontend is responsible for tracking acknowledged IDs.
    """
    resolved = _resolve_company(company_id, current_user)
    svc = NotificationService(db)
    count = svc.get_unread_count(company_id=resolved)
    return NotificationCountOut(unread_count=count)
