from pydantic import BaseModel, ConfigDict, EmailStr, Field
from typing import Optional
from datetime import datetime

class UserBase(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    email: EmailStr
    company_id: Optional[int] = None
    is_admin: bool = False

class UserCreate(UserBase):
    password: str = Field(min_length=8, max_length=50)

class UserUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=100)
    email: Optional[EmailStr] = None
    company_id: Optional[int] = None
    is_admin: Optional[bool] = None
    password: Optional[str] = Field(default=None, min_length=8, max_length=50)

class UserResponse(UserBase):
    user_id: int
    last_login_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    company_name: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)
