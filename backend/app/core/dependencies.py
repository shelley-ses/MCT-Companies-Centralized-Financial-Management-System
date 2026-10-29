from __future__ import annotations
from typing import Annotated, Any, TypedDict
from fastapi import Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.security import verify_token
from app.db.session import get_db
from app.models.user import User

# authenticated user model
class AuthenticatedUser(TypedDict, total=False):
    auth_user_id: str
    user_id: int | None
    email: str | None
    company_id: int | None
    company_ids: list[int]
    is_admin: bool
    role: str


VerifiedToken = Annotated[dict[str, Any], Depends(verify_token)]

# get the current authenticated user from the verified token claims and DB
def get_current_user(
    claims: VerifiedToken,
    db: Session = Depends(get_db),
) -> AuthenticatedUser:
    metadata = claims.get("app_metadata")
    if not isinstance(metadata, dict):
        metadata = {}

    company_id = _optional_positive_int(metadata.get("company_id"))
    is_admin = metadata.get("is_admin") is True
    role = str(metadata.get("role") or ("admin" if is_admin else "supervisor")).lower()
    email = claims.get("email") if isinstance(claims.get("email"), str) else None

    user_id = None
    company_ids = [company_id] if company_id else []

    if email:
        from app.core.company_resolver import normalize_email, normalize_company_id
        resolved_email = normalize_email(email)
        db_user = db.query(User).filter(func.lower(User.email) == resolved_email.lower()).first()
        if db_user:
            user_id = db_user.user_id
            is_admin = db_user.is_admin or db_user.user_id == 1 or (db_user.email and db_user.email.lower() == "admin@mct.com")
            role = "admin" if is_admin else (db_user.role or "supervisor").lower()
            if role in ("company", "company employee"):
                role = "supervisor"
            assigned = [normalize_company_id(uc.company_id) for uc in db_user.user_companies if uc.company_id is not None]
            if not assigned and db_user.company_id:
                assigned = [normalize_company_id(db_user.company_id)]
            company_ids = [cid for cid in assigned if cid is not None]
            if company_ids:
                company_id = company_ids[0]
        else:
            # Check Supabase users table fallback
            try:
                from app.db.supabase import get_supabase_admin_client
                client = get_supabase_admin_client()
                supa_res = client.table("users").select("*").ilike("email", resolved_email).limit(1).execute()
                if supa_res.data:
                    su = supa_res.data[0]
                    user_id = su.get("user_id")
                    is_admin = su.get("is_admin") is True or resolved_email == "admin@mct.com"
                    role = "admin" if is_admin else (su.get("role") or "supervisor").lower()
                    if role in ("company", "company employee"):
                        role = "supervisor"
                    s_cid = normalize_company_id(su.get("company_id"))
                    if s_cid:
                        company_id = s_cid
                        company_ids = [s_cid]
            except Exception:
                pass

    return {
        "auth_user_id": claims.get("sub", ""),
        "user_id": user_id,
        "email": email,
        "company_id": company_id,
        "company_ids": company_ids,
        "is_admin": is_admin,
        "role": role,
    }


CurrentUser = Annotated[AuthenticatedUser, Depends(get_current_user)]

# require an Audit or Administrator account (only they may save an audit review, spec 0014)
def require_audit_or_admin_user(user: CurrentUser) -> AuthenticatedUser:
    role = str(user.get("role") or "").lower()
    if role not in ("audit", "auditor", "admin") and not user.get("is_admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Audit or Admin accounts can change the audit status.",
        )
    return user


AuditOrAdminUser = Annotated[AuthenticatedUser, Depends(require_audit_or_admin_user)]

# require the current authenticated user to be a central administrator account.
def require_admin_user(user: CurrentUser) -> AuthenticatedUser:
    if not user.get("is_admin") and user.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Central administrator access is required.",
        )
    return user


AdminUser = Annotated[AuthenticatedUser, Depends(require_admin_user)]

# require Finance or Administrator role
def require_finance_or_admin_user(user: CurrentUser) -> AuthenticatedUser:
    role = user.get("role", "").lower()
    if role not in ["finance", "audit", "admin"] and not user.get("is_admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Finance or administrator access is required.",
        )
    return user


FinanceOrAdminUser = Annotated[AuthenticatedUser, Depends(require_finance_or_admin_user)]

# require the current authenticated user to be a company account.
def require_company_user(user: CurrentUser) -> AuthenticatedUser:
    if (user.get("is_admin") or user.get("role") in ["audit", "admin"]) and user.get("company_id") is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Company account access is required.",
        )
    return user


CompanyUser = Annotated[AuthenticatedUser, Depends(require_company_user)]

# Company scope authorization checker
def check_company_access(user: AuthenticatedUser, target_company_id: int | None) -> None:
    """Ensure user has access to a specific company or is an administrator/finance/audit user."""
    if target_company_id is None:
        return
    from app.core.company_resolver import normalize_company_id
    normalized_target_id = normalize_company_id(target_company_id)

    role = str(user.get("role") or "").lower()
    if user.get("is_admin") or role in ("admin", "finance", "audit", "auditor"):
        return

    assigned = user.get("company_ids") or []
    assigned_normalized = {normalize_company_id(cid) for cid in assigned if cid is not None}
    if user.get("company_id"):
        assigned_normalized.add(normalize_company_id(user.get("company_id")))

    if normalized_target_id not in assigned_normalized:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: You are not assigned to this company."
        )

def _optional_positive_int(value: object) -> int | None:
    if value is None or isinstance(value, bool):
        return None
    if isinstance(value, int) and value > 0:
        return value
    if isinstance(value, str) and value.isdigit() and int(value) > 0:
        return int(value)
    return None
