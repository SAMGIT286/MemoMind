# pyrefly: ignore [missing-import]
from pydantic import BaseModel, EmailStr, Field


class UserCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    email: EmailStr
    password: str = Field(min_length=6, max_length=200)
    role: str = Field(default="elderly", pattern="^(elderly|young_professional|caregiver|emergency_contact)$")
    language: str = Field(default="English", min_length=2, max_length=40)
    preferred_language: str = Field(default="en", min_length=2, max_length=40)


class UserLogin(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=200)
    role: str | None = Field(default=None, pattern="^(elderly|young_professional|caregiver|emergency_contact)$")
    preferred_language: str | None = Field(default=None, min_length=2, max_length=40)
