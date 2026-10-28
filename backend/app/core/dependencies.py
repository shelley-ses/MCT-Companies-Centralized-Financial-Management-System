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
        db_user = db.query(User).filter(func.lower(User.email) == email.lower()).first()
        if db_user:
            user_id = db_user.user_id
            is_admin = db_user.is_admin or db_user.user_id == 1 or (db_user.email and db_user.email.lower() == "admin@mct.com")
            role = "admin" if is_admin else (db_user.role or "supervisor").lower()
            if role in ("company", "company employee"):
                role = "supervisor"
            assigned = [uc.company_id for uc in db_user.user_companies]
            if not assigned and db_user.company_id:
                assigned = [db_user.company_id]
            company_ids = assigned
            if company_ids:
                company_id = company_ids[0]

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
    """Ensure user has access to a specific company or is an admin."""
    if target_company_id is None:
        return
    if user.get("is_admin") or user.get("role") == "admin":
        return
    assigned = user.get("company_ids") or []
    if target_company_id not in assigned:
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
