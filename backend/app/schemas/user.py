from pydantic import BaseModel, EmailStr, ConfigDict
from typing import Optional
from datetime import datetime

class UserBase(BaseModel):
    name: str
    email: EmailStr
    company_id: Optional[int] = None
    is_admin: bool = False

class UserCreate(UserBase):
    password: str

class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    company_id: Optional[int] = None
    is_admin: Optional[bool] = None
    password: Optional[str] = None

class UserResponse(UserBase):
    user_id: int
    last_login_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    company_name: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)
