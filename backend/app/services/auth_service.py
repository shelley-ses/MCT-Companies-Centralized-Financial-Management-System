from datetime import datetime, timezone, timedelta
from typing import Optional, Union
import logging
import secrets
import json
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen
import jwt
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from passlib.context import CryptContext

from app.core.config import settings
from app.core.encryption import decrypt_payload, encrypt_payload
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
    LoginChallengeResponse,
    VerifyOtpRequest,
    OtpResponse,
)
from app.schemas.user import UserResponse

logger = logging.getLogger(__name__)
password_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
OTP_COOKIE_NAME = "mct_login_otp"
_rate_limits: dict[str, dict[str, object]] = {}


def _mask_email(email: str) -> str:
    local, domain = email.split("@", 1)
    return f"{local[:1]}***@{domain}"


def _send_login_otp(email: str, otp: str) -> None:
    if not settings.RESEND_API_KEY or not settings.RESEND_FROM_EMAIL:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Email delivery is not configured. Please contact an administrator.",
        )

    payload = json.dumps(
        {
            "from": settings.RESEND_FROM_EMAIL,
            "to": [email],
            "subject": "Your MCT login verification code",
            "text": (
                f"Your MCT Financial Management System verification code is {otp}. "
                f"It expires in {settings.OTP_EXPIRES_SECONDS // 60} minutes."
            ),
        }
    ).encode("utf-8")
    request = Request(
        "https://api.resend.com/emails",
        data=payload,
        headers={
            "Authorization": f"Bearer {settings.RESEND_API_KEY}",
            "Content-Type": "application/json",
            "User-Agent": "MCT-Financial-Management-System",
        },
        method="POST",
    )

    try:
        with urlopen(request, timeout=10) as response:
            if response.status < 200 or response.status >= 300:
                raise HTTPError(
                    request.full_url,
                    response.status,
                    "Unexpected response from Resend",
                    response.headers,
                    None,
                )
    except (HTTPError, URLError, TimeoutError, OSError) as exc:
        logger.error("Failed to send login OTP to %s: %s", email, exc)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Unable to send the verification code. Please try again later.",
        ) from exc


def _record_failed_login(db: Session, ip_address: str) -> None:
    now = datetime.now(timezone.utc)
    state = _rate_limits.setdefault(ip_address, {"attempts": 0, "locked_until": None})
    locked_until = state["locked_until"]
    if isinstance(locked_until, datetime) and locked_until > now:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"This device is temporarily locked. Try again in {settings.LOGIN_LOCKOUT_MINUTES} minutes.",
        )
    if isinstance(locked_until, datetime):
        state["attempts"] = 0
        state["locked_until"] = None
    state["attempts"] = int(state["attempts"]) + 1
    if int(state["attempts"]) >= settings.LOGIN_MAX_ATTEMPTS:
        state["locked_until"] = now + timedelta(minutes=settings.LOGIN_LOCKOUT_MINUTES)


def _ensure_ip_available(db: Session, ip_address: str) -> None:
    now = datetime.now(timezone.utc)
    state = _rate_limits.get(ip_address)
    locked_until = state.get("locked_until") if state else None
    if isinstance(locked_until, datetime) and locked_until > now:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"This device is temporarily locked. Try again in {settings.LOGIN_LOCKOUT_MINUTES} minutes.",
        )
    if state and isinstance(locked_until, datetime):
        state["attempts"] = 0
        state["locked_until"] = None


def _get_jwt_secret() -> str:
    secret = settings.SUPABASE_JWT_SECRET or settings.SUPABASE_KEY
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
def login_user(db: Session, login_data: LoginRequest, ip_address: str) -> tuple[LoginChallengeResponse, str]:
    _ensure_ip_available(db, ip_address)
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
    authenticated = False

    # Authenticate via Supabase Auth SDK if configured
    if settings.SUPABASE_URL and settings.SUPABASE_KEY:
        try:
            supabase = get_supabase_client()
            auth_response = supabase.auth.sign_in_with_password({
                "email": normalized_email,
                "password": password
            })
            authenticated = bool(auth_response and auth_response.session)
        except Exception as e:
            logger.error(f"Supabase login failed for {normalized_email}: {e}")

    # Find local user record
    user = db.query(User).filter(User.email == normalized_email).first()

    if not settings.SUPABASE_URL or not settings.SUPABASE_KEY:
        authenticated = bool(user and password_context.verify(password, user.password_hash))

    if not authenticated:
        _record_failed_login(db, ip_address)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )

    otp = f"{secrets.randbelow(1_000_000):06d}"
    now = datetime.now(timezone.utc)
    challenge_cookie = encrypt_payload({
        "user_id": user.user_id if user else None,
        "email": normalized_email,
        "otp": otp,
        "ip_address": ip_address,
        "expires_at": (now + timedelta(seconds=settings.OTP_EXPIRES_SECONDS)).timestamp(),
        "last_sent_at": now.timestamp(),
        "resend_count": 0,
    })
    try:
        _send_login_otp(normalized_email, otp)
    except Exception:
        raise
    return LoginChallengeResponse(
        expires_in=settings.OTP_EXPIRES_SECONDS,
        email=_mask_email(normalized_email),
    ), challenge_cookie


def verify_login_otp(db: Session, otp_data: VerifyOtpRequest, ip_address: str, cookie_value: str | None) -> TokenResponse:
    if not cookie_value:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Login verification session not found.")
    challenge = decrypt_payload(cookie_value)
    now = datetime.now(timezone.utc)
    if challenge.get("ip_address") != ip_address or float(challenge.get("expires_at", 0)) <= now.timestamp():
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired verification code.")
    if not secrets.compare_digest(str(challenge.get("otp")), otp_data.otp):
        _record_failed_login(db, ip_address)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid verification code.")

    user_id = challenge.get("user_id")
    user = db.query(User).filter(User.user_id == user_id).first() if user_id else None
    if user:
        update_last_login_at(db, user.user_id)
        user_info = get_current_user_info(db, user.user_id)
    else:
        user_info = UserResponse(user_id=0, email=challenge["email"], name=challenge["email"].split("@")[0], company_id=None, is_admin=False)
    access_token = create_jwt_token(
        user_id=user.user_id if user else 1,
        email=challenge["email"],
        is_admin=user.is_admin if user else False,
        company_id=user.company_id if user else None,
    )
    return TokenResponse(access_token=access_token, user=user_info)


def resend_login_otp(db: Session, ip_address: str, cookie_value: str | None) -> tuple[OtpResponse, str]:
    if not cookie_value:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Login verification session not found.")
    challenge = decrypt_payload(cookie_value)
    now = datetime.now(timezone.utc)
    if challenge.get("ip_address") != ip_address:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Login verification session not found.")
    elapsed = int(now.timestamp() - float(challenge["last_sent_at"]))
    if elapsed < settings.OTP_RESEND_INTERVAL_SECONDS:
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail=f"Please wait {settings.OTP_RESEND_INTERVAL_SECONDS - elapsed} seconds before resending.")
    if int(challenge["resend_count"]) >= settings.OTP_RESEND_LIMIT:
        _record_failed_login(db, ip_address)
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail=f"Too many resend requests. Try again in {settings.LOGIN_LOCKOUT_MINUTES} minutes.")
    otp = f"{secrets.randbelow(1_000_000):06d}"
    challenge["otp"] = otp
    challenge["expires_at"] = (now + timedelta(seconds=settings.OTP_EXPIRES_SECONDS)).timestamp()
    challenge["last_sent_at"] = now.timestamp()
    challenge["resend_count"] = int(challenge["resend_count"]) + 1
    _send_login_otp(challenge["email"], otp)
    return OtpResponse(message="A new verification code has been sent.", expires_in=settings.OTP_EXPIRES_SECONDS, resend_available_in=settings.OTP_RESEND_INTERVAL_SECONDS), encrypt_payload(challenge)


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
