from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

ApplicationStatus = Literal[
    "saved",
    "applied",
    "interviewing",
    "offer",
    "rejected",
    "withdrawn",
]


class ApplicationDocument(BaseModel):
    user_id: str
    company: str
    role_title: str
    status: ApplicationStatus = "saved"
    job_description_id: str | None = None
    notes: str | None = None
    applied_at: datetime | None = None
    next_follow_up_at: datetime | None = None
    created_at: datetime
    updated_at: datetime


class ApplicationCreate(BaseModel):
    company: str = Field(min_length=1, max_length=200)
    role_title: str = Field(min_length=1, max_length=200)
    status: ApplicationStatus = "saved"
    job_description_id: str | None = None
    notes: str | None = Field(default=None, max_length=4000)
