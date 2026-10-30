"""
audit_logs.py
-------------
Admin-only endpoint for retrieving audit log entries.

Logs are **stored only** — they are never shown to regular company users.
Only a central administrator account can query this endpoint.
"""

from __future__ import annotations

import json
from datetime import date
from typing import List, Optional

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.dependencies import AdminUser
from app.db.session import get_db
from app.db.supabase import get_supabase_admin_client
from app.models.audit_log import AuditLog
from app.models.company import Company
from app.models.user import User
from app.services.audit_service import _ACTION_DESCRIPTION_MAP

router = APIRouter(prefix="/audit-logs", tags=["Audit Logs"])


# ---------------------------------------------------------------------------
# Response schema
# ---------------------------------------------------------------------------

class AuditLogOut(BaseModel):
    audit_log_id: int
    user_id: Optional[int] = None
    company_id: Optional[int] = None
    action: str
    action_category: Optional[str] = None
    ip_address: Optional[str] = None
    details: Optional[str] = None
    created_at: Optional[str] = None
    # Worked out on the server for the Activity Log page (spec 0018)
    user_name: str = "System"
    company_name: str = "System"
    description: str = ""
    module: str = "General"
    target: str = "-"

    class Config:
        from_attributes = True


_MODULE_PREFIXES = (
    ("SALE_", "Sales"),
    ("EXPENSE_", "Expense"),
    ("LOAN_", "Loan"),
    ("PETTY_CASH_", "Petty Cash"),
    ("TENANT_", "Tenant"),
    ("USER_", "User"),
    ("COMPANY_", "Company"),
    ("CASH_INFLOW_", "Cash Inflow"),
    ("BUDGET_", "Budget"),
    ("STAFF_CREDIT_", "Staff Credit"),
    ("CATEGORY_", "Category"),
    ("LOGIN", "Auth"),
    ("LOGOUT", "Auth"),
    ("SESSION_", "Auth"),
    ("ACCOUNT_", "Auth"),
    ("PASSWORD_", "Auth"),
    ("FORGOT_PASSWORD", "Auth"),
)


def _module_for(action: str, category: Optional[str]) -> str:
    for prefix, module in _MODULE_PREFIXES:
        if action.startswith(prefix):
            return module
    return (category or "General").replace("_", " ").title()


def _parse_details(raw: Optional[str]) -> dict:
    if not raw:
        return {}
    try:
        data = json.loads(raw)
        return data if isinstance(data, dict) else {}
    except (ValueError, TypeError):
        return {}


def _target_for(details: dict) -> str:
    if details.get("ref"):
        return str(details["ref"])
    if details.get("record_id") is not None:
        kind = str(details.get("record_type") or "").replace("_", " ").strip()
        return f"{kind} #{details['record_id']}".strip() if kind else f"#{details['record_id']}"
    if details.get("email"):
        return str(details["email"])
    return "-"


def _enrich(db: Session, logs: List[AuditLogOut]) -> List[AuditLogOut]:
    """Fill in names, a plain description, the module and the record reference (spec 0018, AC-1)."""
    user_ids = sorted({l.user_id for l in logs if l.user_id is not None})
    company_ids = sorted({l.company_id for l in logs if l.company_id is not None})
    users = {}
    companies = {}
    try:
        if user_ids:
            users = {u[0]: u[1] for u in db.query(User.user_id, User.name).filter(User.user_id.in_(user_ids)).all()}
        if company_ids:
            companies = {
                c[0]: c[1] for c in db.query(Company.company_id, Company.company_name).filter(Company.company_id.in_(company_ids)).all()
            }
    except Exception:
        pass  # names are a nicety; the log rows are still returned

    for log in logs:
        details = _parse_details(log.details)
        log.user_name = users.get(log.user_id) or (str(details["email"]) if details.get("email") else "System")
        log.company_name = companies.get(log.company_id) or "System"
        log.description = _ACTION_DESCRIPTION_MAP.get(log.action) or log.action.replace("_", " ").capitalize()
        log.module = _module_for(log.action, log.action_category)
        log.target = _target_for(details)
    return logs


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@router.get("", response_model=List[AuditLogOut], summary="List audit log entries (admin only)")
def list_audit_logs(
    _: AdminUser,
    user_id: Optional[int] = Query(None, description="Filter by user ID"),
    company_id: Optional[int] = Query(None, description="Filter by company ID"),
    action_category: Optional[str] = Query(None, description="Filter by category (e.g. AUTH, TRANSACTION)"),
    start_date: Optional[date] = Query(None, description="Filter from date (inclusive)"),
    end_date: Optional[date] = Query(None, description="Filter to date (inclusive)"),
    limit: int = Query(100, ge=1, le=1000, description="Max records to return"),
    offset: int = Query(0, ge=0, description="Pagination offset"),
    db: Session = Depends(get_db),
) -> List[AuditLogOut]:
    """
    Returns a paginated, filterable list of audit log entries.
    Accessible only by central administrator accounts.
    """
    # Try Supabase first
    try:
        client = get_supabase_admin_client()
        q = client.table("audit_logs").select(
            "audit_log_id,user_id,company_id,action,action_category,ip_address,details,created_at"
        )
        if user_id is not None:
            q = q.eq("user_id", user_id)
        if company_id is not None:
            q = q.eq("company_id", company_id)
        if action_category is not None:
            q = q.eq("action_category", action_category.upper())
        if start_date is not None:
            q = q.gte("created_at", start_date.isoformat())
        if end_date is not None:
            q = q.lte("created_at", f"{end_date.isoformat()}T23:59:59")

        res = (
            q.order("created_at", desc=True)
            .range(offset, offset + limit - 1)
            .execute()
        )
        rows = res.data or []
        return _enrich(db, [
            AuditLogOut(
                audit_log_id=row["audit_log_id"],
                user_id=row.get("user_id"),
                company_id=row.get("company_id"),
                action=row["action"],
                action_category=row.get("action_category"),
                ip_address=row.get("ip_address"),
                details=row.get("details"),
                created_at=str(row.get("created_at")) if row.get("created_at") else None,
            )
            for row in rows
        ])
    except Exception:
        pass

    # Fallback to local DB
    q = db.query(AuditLog)
    if user_id is not None:
        q = q.filter(AuditLog.user_id == user_id)
    if company_id is not None:
        q = q.filter(AuditLog.company_id == company_id)
    if action_category is not None:
        q = q.filter(AuditLog.action_category == action_category.upper())
    if start_date is not None:
        q = q.filter(AuditLog.created_at >= start_date.isoformat())
    if end_date is not None:
        q = q.filter(AuditLog.created_at <= f"{end_date.isoformat()}T23:59:59")

    rows_local = (
        q.order_by(AuditLog.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )
    return _enrich(db, [
        AuditLogOut(
            audit_log_id=log.audit_log_id,
            user_id=log.user_id,
            company_id=log.company_id,
            action=log.action,
            action_category=log.action_category,
            ip_address=log.ip_address,
            details=log.details,
            created_at=str(log.created_at) if log.created_at else None,
        )
        for log in rows_local
    ])
