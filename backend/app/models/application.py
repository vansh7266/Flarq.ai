from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

ApplicationStatus = Literal[
    "saved",
    "applied",
    "phone_screen",
    "interview",
    "offer",
    "accepted",
    "rejected",
    "ghosted",
]

ApplicationPriority = Literal["high", "medium", "low"]


class ApplicationDocument(BaseModel):
    user_id: str
    company_name: str
    job_title: str
    status: ApplicationStatus = "saved"
    jd_id: str | None = None
    cover_letter_id: str | None = None
    applied_date: datetime | None = None
    last_updated: datetime
    notes: list[dict] | str | None = None
    source: str | None = None
    salary_expectation: str | None = None
    contact_name: str | None = None
    contact_email: str | None = None
    interview_dates: list[datetime] | None = None
    rejection_reason: str | None = None
    offer_amount: str | None = None
    priority: ApplicationPriority = "medium"
    tags: list[str] | None = None
    match_score: float | None = None
    status_history: list[dict] | None = None
    deleted: bool = False
    created_at: datetime
    updated_at: datetime


class ApplicationCreate(BaseModel):
    company_name: str = Field(min_length=1, max_length=200)
    job_title: str = Field(min_length=1, max_length=200)
    status: ApplicationStatus = "saved"
    jd_id: str | None = None
    cover_letter_id: str | None = None
    notes: str | None = Field(default=None, max_length=4000)
    source: str | None = None
    priority: ApplicationPriority = "medium"
    tags: list[str] | None = None
    match_score: float | None = None
