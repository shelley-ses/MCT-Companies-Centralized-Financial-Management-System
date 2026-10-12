"""
audit_logs.py
-------------
Admin-only endpoint for retrieving audit log entries.

Logs are **stored only** — they are never shown to regular company users.
Only a central administrator account can query this endpoint.
"""

from __future__ import annotations

from datetime import date
from typing import List, Optional

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.dependencies import AdminUser
from app.db.session import get_db
from app.db.supabase import get_supabase_admin_client
from app.models.audit_log import AuditLog

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

    class Config:
        from_attributes = True


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
        return [
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
        ]
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
    return [
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
    ]
