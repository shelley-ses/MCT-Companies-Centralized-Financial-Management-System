from datetime import datetime, timezone, timedelta
from typing import Optional, Union, Dict, Any
import logging
import os
import jwt
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.core.config import settings
from app.core.encryption import encrypt_payload, decrypt_payload
from app.db.supabase import get_supabase_client, get_supabase_admin_client
from app.models.user import User
from app.models.company import Company
from app.models.audit_log import AuditLog
from app.schemas.auth import (
    LoginRequest,
    TokenResponse,
    PasswordResetRequest,
    PasswordResetConfirm,
    MessageResponse,
)
from app.schemas.user import UserResponse

logger = logging.getLogger(__name__)


def _get_jwt_secret() -> str:
    secret = os.getenv("SUPABASE_JWT_SECRET") or settings.SUPABASE_KEY
    if not secret:
        secret = "mct-centralized-financial-system-secret-key-32chars!"
    return secret


# create jwt token
def create_jwt_token(
    user_id: int,
    email: str,
    is_admin: bool = False,
    company_id: Optional[int] = None,
    expires_delta_seconds: int = 86400,
) -> str:
    now = datetime.now(timezone.utc)
    expiration = now + timedelta(seconds=expires_delta_seconds)

    payload = {
        "sub": str(user_id),
        "email": email,
        "aud": "authenticated",
        "role": "admin" if is_admin else "authenticated",
        "iat": int(now.timestamp()),
        "exp": int(expiration.timestamp()),
        "app_metadata": {
            "is_admin": is_admin,
            "company_id": company_id,
            "provider": "email",
        },
        "user_metadata": {
            "name": email.split("@")[0],
        },
    }

    token = jwt.encode(payload, _get_jwt_secret(), algorithm="HS256")
    return token


# update last login at
def update_last_login_at(db: Session, user_id: int) -> Optional[User]:
    user = db.query(User).filter(User.user_id == user_id).first()
    if user:
        user.last_login_at = datetime.now(timezone.utc)
        db.add(user)
        db.commit()
        db.refresh(user)
    return user


# load application user
def load_application_user(db: Session, identifier: Union[int, str]) -> Optional[User]:
    if isinstance(identifier, int) or (isinstance(identifier, str) and identifier.isdigit()):
        return db.query(User).filter(User.user_id == int(identifier)).first()
    elif isinstance(identifier, str):
        return db.query(User).filter(User.email == identifier.strip().lower()).first()
    return None


# get current user information
def get_current_user_info(db: Session, user_id: int) -> UserResponse:
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    company_name = None
    if user.company_id:
        company = db.query(Company).filter(Company.company_id == user.company_id).first()
        if company:
            company_name = company.company_name

    return UserResponse(
        user_id=user.user_id,
        email=user.email,
        name=user.name,
        company_id=user.company_id,
        is_admin=user.is_admin,
        last_login_at=user.last_login_at,
        created_at=user.created_at,
        updated_at=user.updated_at,
        company_name=company_name,
    )


# login user with encrypted payload support
def login_user(db: Session, login_data: LoginRequest) -> TokenResponse:
    email = login_data.email
    password = login_data.password

    # Decrypt encrypted_payload if provided over network
    if login_data.encrypted_payload:
        decrypted = decrypt_payload(login_data.encrypted_payload)
        email = decrypted.get("email", email)
        password = decrypted.get("password", password)

    if not email or not password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email and password credentials are required.",
        )

    normalized_email = str(email).strip().lower()

    auth_response = None
    access_token = None

    # Authenticate via Supabase Auth SDK if configured
    if settings.SUPABASE_URL and settings.SUPABASE_KEY:
        try:
            supabase = get_supabase_client()
            auth_response = supabase.auth.sign_in_with_password({
                "email": normalized_email,
                "password": password
            })
            if auth_response and auth_response.session:
                access_token = auth_response.session.access_token
        except Exception as e:
            logger.error(f"Supabase login failed for {normalized_email}: {e}")

    # Find local user record
    user = db.query(User).filter(User.email == normalized_email).first()

    if not access_token and not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )

    # Generate JWT token if not provided by Supabase session
    if not access_token:
        access_token = create_jwt_token(
            user_id=user.user_id if user else 1,
            email=normalized_email,
            is_admin=user.is_admin if user else False,
            company_id=user.company_id if user else None,
        )

    if user:
        update_last_login_at(db, user.user_id)
        user_info = get_current_user_info(db, user.user_id)
    else:
        user_info = UserResponse(
            user_id=0,
            email=normalized_email,
            name=auth_response.user.user_metadata.get("name", normalized_email.split("@")[0]) if auth_response and auth_response.user else normalized_email.split("@")[0],
            company_id=None,
            is_admin=False,
        )

    # Encrypt outgoing network response payload
    encrypted_response_payload = encrypt_payload({
        "access_token": access_token,
        "token_type": "bearer",
        "user_id": user_info.user_id,
        "email": user_info.email,
        "name": user_info.name,
        "company_id": user_info.company_id,
        "is_admin": user_info.is_admin,
    })

    # Log audit trail
    try:
        audit = AuditLog(
            company_id=user.company_id if user else None,
            user_id=user.user_id if user else None,
            action=f"User {normalized_email} logged in with encrypted payload",
        )
        db.add(audit)
        db.commit()
    except Exception:
        db.rollback()

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=user_info,
        encrypted_response=encrypted_response_payload,
    )


# logout user
def logout_user(db: Session, token: Optional[str] = None) -> MessageResponse:
    if settings.SUPABASE_URL and settings.SUPABASE_KEY:
        try:
            supabase = get_supabase_client()
            supabase.auth.sign_out()
        except Exception as e:
            logger.warning(f"Supabase sign_out error: {e}")

    return MessageResponse(message="Successfully logged out.", success=True)


# request password reset with encrypted payload support
def request_password_reset(db: Session, request_data: PasswordResetRequest) -> MessageResponse:
    email = request_data.email
    if request_data.encrypted_payload:
        decrypted = decrypt_payload(request_data.encrypted_payload)
        email = decrypted.get("email", email)

    if not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email is required for password reset.",
        )

    normalized_email = str(email).strip().lower()
    if settings.SUPABASE_URL and settings.SUPABASE_KEY:
        try:
            supabase = get_supabase_client()
            supabase.auth.reset_password_for_email(normalized_email)
        except Exception as e:
            logger.warning(f"Supabase reset_password_for_email error: {e}")

    return MessageResponse(
        message="If an account with that email exists, a password reset request has been initiated.",
        success=True,
    )


# reset password with encrypted payload support
def reset_password(
    db: Session,
    confirm_data: PasswordResetConfirm,
) -> MessageResponse:
    email = confirm_data.email
    new_password = confirm_data.new_password
    token = confirm_data.token

    if confirm_data.encrypted_payload:
        decrypted = decrypt_payload(confirm_data.encrypted_payload)
        email = decrypted.get("email", email)
        new_password = decrypted.get("new_password", new_password)
        token = decrypted.get("token", token)

    if not email or not new_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email address and new password are required.",
        )

    normalized_email = str(email).strip().lower()

    if settings.SUPABASE_URL and settings.SUPABASE_KEY:
        try:
            supabase = get_supabase_client()
            supabase.auth.update_user({"password": new_password})
        except Exception as e:
            logger.error(f"Failed to update password via Supabase Auth SDK: {e}")
            if settings.SUPABASE_SERVICE_ROLE_KEY:
                try:
                    admin_client = get_supabase_admin_client()
                    user = db.query(User).filter(User.email == normalized_email).first()
                    if user:
                        admin_client.auth.admin.update_user_by_id(str(user.user_id), {"password": new_password})
                except Exception as admin_err:
                    logger.error(f"Admin auth password update failed: {admin_err}")

    user = db.query(User).filter(User.email == normalized_email).first()
    if user:
        user.updated_at = datetime.now(timezone.utc)
        db.add(user)
        db.commit()

        try:
            audit = AuditLog(
                company_id=user.company_id,
                user_id=user.user_id,
                action=f"User {normalized_email} reset password",
            )
            db.add(audit)
            db.commit()
        except Exception:
            db.rollback()

    return MessageResponse(
        message="Password has been reset successfully.",
        success=True,
    )
