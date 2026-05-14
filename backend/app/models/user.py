from datetime import datetime

from pydantic import BaseModel, EmailStr, Field


class UserBase(BaseModel):
    email: EmailStr
    full_name: str = Field(min_length=2, max_length=120)


class UserCreate(UserBase):
    password: str = Field(min_length=8, max_length=128)


class UserDocument(UserBase):
    id: str = Field(alias="_id")
    hashed_password: str
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"populate_by_name": True}


class UserPublic(BaseModel):
    id: str
    email: EmailStr
    full_name: str
    is_active: bool
