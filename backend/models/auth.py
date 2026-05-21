from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime


class UserRegister(BaseModel):
    """Request model for user registration."""
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=128)
    display_name: str = Field(..., min_length=2, max_length=64)
    organisation: Optional[str] = None


class UserLogin(BaseModel):
    """Request model for user login."""
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    """Response model for auth tokens."""
    access_token: str
    token_type: str = "bearer"
    user_id: str
    display_name: str
    email: str


class UserProfile(BaseModel):
    """User profile data returned from auth middleware."""
    user_id: str
    email: str
    display_name: str
    organisation: Optional[str] = None
    created_at: Optional[datetime] = None
