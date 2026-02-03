from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import Optional
from datetime import datetime
from uuid import UUID

from app.core.security import validate_password_strength


class UserBase(BaseModel):
    """Base user schema."""
    email: EmailStr
    full_name: str = Field(..., min_length=1, max_length=255)
    organization: Optional[str] = Field(None, max_length=255)


class UserCreate(UserBase):
    """Schema for user registration."""
    password: str = Field(..., min_length=8, max_length=128)

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        is_valid, error_message = validate_password_strength(v)
        if not is_valid:
            raise ValueError(error_message)
        return v


class UserLogin(BaseModel):
    """Schema for user login."""
    email: EmailStr
    password: str


class UserUpdate(BaseModel):
    """Schema for updating user profile."""
    full_name: Optional[str] = Field(None, min_length=1, max_length=255)
    organization: Optional[str] = Field(None, max_length=255)


class UserResponse(BaseModel):
    """Schema for user response."""
    user_id: UUID
    email: EmailStr
    full_name: str
    organization: Optional[str]
    is_active: bool
    created_at: datetime
    last_login: Optional[datetime]

    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    """Schema for login response with tokens."""
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserResponse


class RefreshTokenResponse(BaseModel):
    """Schema for token refresh response."""
    access_token: str
    token_type: str = "bearer"
    expires_in: int


class MessageResponse(BaseModel):
    """Generic message response."""
    message: str


class RegisterResponse(BaseModel):
    """Schema for registration response."""
    message: str
    user_id: UUID
