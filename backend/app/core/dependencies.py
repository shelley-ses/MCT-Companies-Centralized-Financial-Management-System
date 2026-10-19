from __future__ import annotations
from typing import Annotated, Any, TypedDict
from fastapi import Depends, HTTPException, status
from app.core.security import verify_token

#authenticated user model
class AuthenticatedUser(TypedDict):
    auth_user_id: str
    email: str | None
    company_id: int | None
    is_admin: bool
    role: str


VerifiedToken = Annotated[dict[str, Any], Depends(verify_token)]

#get the current authenticated user from the verified token claims.
def get_current_user(claims: VerifiedToken) -> AuthenticatedUser:
    metadata = claims.get("app_metadata")
    if not isinstance(metadata, dict):
        metadata = {}

    company_id = _optional_positive_int(metadata.get("company_id"))
    is_admin = metadata.get("is_admin") is True
    role = str(metadata.get("role") or ("admin" if is_admin else "company")).lower()

    return {
        "auth_user_id": claims["sub"],
        "email": claims.get("email") if isinstance(claims.get("email"), str) else None,
        "company_id": company_id,
        "is_admin": is_admin,
        "role": role,
    }


CurrentUser = Annotated[AuthenticatedUser, Depends(get_current_user)]

# require the current authenticated user to be a central administrator account.
def require_admin_user(user: CurrentUser) -> AuthenticatedUser:
    if not user["is_admin"] and user.get("role") != "admin":
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
    if (user["is_admin"] or user.get("role") in ["audit", "admin"]) and user["company_id"] is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Company account access is required.",
        )

    return user


CompanyUser = Annotated[AuthenticatedUser, Depends(require_company_user)]

# require the current authenticated user to be a company account with a specific company ID.
def _optional_positive_int(value: object) -> int | None:
    if value is None or isinstance(value, bool):
        return None
    if isinstance(value, int) and value > 0:
        return value
    if isinstance(value, str) and value.isdigit() and int(value) > 0:
        return int(value)
    return None
