from pydantic import BaseModel, EmailStr
from typing import Optional
from app.schemas.user import UserResponse

class LoginRequest(BaseModel):
    email: Optional[EmailStr] = None
    password: Optional[str] = None
    encrypted_payload: Optional[str] = None

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
    encrypted_response: Optional[str] = None

class PasswordResetRequest(BaseModel):
    email: Optional[EmailStr] = None
    encrypted_payload: Optional[str] = None

class PasswordResetConfirm(BaseModel):
    token: Optional[str] = None
    email: Optional[EmailStr] = None
    new_password: Optional[str] = None
    encrypted_payload: Optional[str] = None

class MessageResponse(BaseModel):
    message: str
    success: bool = True
    encrypted_data: Optional[str] = None
