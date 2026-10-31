"""
notifications.py
----------------
In-app notification endpoints.

Notifications are stateless — computed on the fly from Bills, Lending,
Inter-company Loans, Tenant Leases, Petty Cash, and Audit Logs.
Read/dismiss state is managed on the frontend (localStorage keyed on notification_id).
"""

from __future__ import annotations

from typing import Any, List, Optional

from fastapi import APIRouter, Depends, Query, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.company_resolver import resolve_company
from app.core.dependencies import get_current_user
from app.core.security import verify_token
from app.db.session import get_db
from app.schemas.notification import NotificationCountOut, NotificationOut
from app.services.notification_service import NotificationService

router = APIRouter(prefix="/notifications", tags=["Notifications"])

_optional_bearer = HTTPBearer(auto_error=False)


def _try_get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials],
    db: Session,
) -> Optional[dict[str, Any]]:
    if not credentials or credentials.scheme.lower() != "bearer" or not credentials.credentials:
        return None
    try:
        claims = verify_token(credentials.credentials)
        return dict(get_current_user(claims, db))
    except Exception:
        return None


def _resolve_scope(
    db: Session,
    company_id_param: Optional[int],
    company_name_param: Optional[str],
    user_role_param: Optional[str],
    request: Optional[Request],
    current_user: Optional[dict[str, Any]],
) -> tuple[Optional[int], Optional[str]]:
    role_from_header = request.headers.get("X-User-Role") if request else None
    user_role = (
        (current_user.get("role") if current_user else None)
        or user_role_param
        or role_from_header
        or ""
    ).strip().lower()

    is_multi_company_role = (
        (current_user and current_user.get("is_admin"))
        or user_role in ("admin", "finance", "audit", "auditor")
    )

    # Resolve explicit company_id / company_name if passed
    explicit_cid = company_id_param
    if not explicit_cid and company_name_param and company_name_param.strip().lower() != "all companies":
        try:
            comp = resolve_company(db, None, company_name_param)
            explicit_cid = comp.company_id
        except Exception:
            explicit_cid = None

    if is_multi_company_role or not current_user:
        return explicit_cid, (user_role or None)

    # Company-scoped user (Supervisor)
    user_cid = current_user.get("company_id") or explicit_cid
    return user_cid, (user_role or "supervisor")


@router.get(
    "",
    response_model=List[NotificationOut],
    summary="Get notifications (computed from bills, lending, loans, tenants, petty cash & audit logs)",
)
def get_notifications(
    request: Request,
    company_id: Optional[int] = Query(None, description="Filter by company ID"),
    company_name: Optional[str] = Query(None, description="Filter by company name"),
    user_role: Optional[str] = Query(None, description="User role for workflow scoping"),
    notification_type: Optional[str] = Query(None, description="Filter by notification type"),
    limit: int = Query(100, ge=1, le=200),
    offset: int = Query(0, ge=0),
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(_optional_bearer),
    db: Session = Depends(get_db),
) -> List[NotificationOut]:
    current_user = _try_get_current_user(credentials, db)
    resolved_cid, resolved_role = _resolve_scope(
        db=db,
        company_id_param=company_id,
        company_name_param=company_name,
        user_role_param=user_role,
        request=request,
        current_user=current_user,
    )
    svc = NotificationService(db)
    return svc.get_notifications(
        company_id=resolved_cid,
        user_role=resolved_role,
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
    request: Request,
    company_id: Optional[int] = Query(None, description="Filter by company ID"),
    company_name: Optional[str] = Query(None, description="Filter by company name"),
    user_role: Optional[str] = Query(None, description="User role for workflow scoping"),
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(_optional_bearer),
    db: Session = Depends(get_db),
) -> NotificationCountOut:
    current_user = _try_get_current_user(credentials, db)
    resolved_cid, resolved_role = _resolve_scope(
        db=db,
        company_id_param=company_id,
        company_name_param=company_name,
        user_role_param=user_role,
        request=request,
        current_user=current_user,
    )
    svc = NotificationService(db)
    count = svc.get_unread_count(company_id=resolved_cid, user_role=resolved_role)
    return NotificationCountOut(unread_count=count)
