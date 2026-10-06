from fastapi import HTTPException
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from typing import Generator, Optional

from app.db.session import get_db
from app.core.dependencies import get_current_user, AuthenticatedUser
from app.schemas.auth import (
    LoginRequest,
    TokenResponse,
    PasswordResetRequest,
    PasswordResetConfirm,
    MessageResponse,
)
from app.schemas.user import UserResponse
from app.services.auth_service import (
    login_user,
    logout_user,
    get_current_user_info,
    request_password_reset,
    reset_password,
)

router = APIRouter(prefix="/auth", tags=["Authentication"])

# login user
@router.post("/login", response_model=TokenResponse, summary="User Login")
def login(
    login_data: LoginRequest,
    db: Session = Depends(get_db),
):
    return login_user(db=db, login_data=login_data)

# logout user
@router.post("/logout", response_model=MessageResponse, summary="User Logout")
def logout(
    db: Session = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    return logout_user(db=db)

# get current user profile
@router.get("/me", response_model=UserResponse, summary="Get Current User Profile")
def get_me(
    db: Session = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    user_id = int(current_user["auth_user_id"])
    return get_current_user_info(db=db, user_id=user_id)

# request password reset
@router.post("/forgot-password", response_model=MessageResponse, summary="Request Password Reset")
def forgot_password(
    request: PasswordResetRequest,
    db: Session = Depends(get_db),
):
    return request_password_reset(db=db, request_data=request)

# reset password
@router.post("/reset-password", response_model=MessageResponse, summary="Confirm Password Reset")
def confirm_password_reset(
    request: PasswordResetConfirm,
    db: Session = Depends(get_db),
):
    return reset_password(
        db=db,
        confirm_data=request,
    )