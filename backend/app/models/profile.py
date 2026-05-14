from datetime import datetime

from pydantic import BaseModel, Field


class ProfileDocument(BaseModel):
    user_id: str
    headline: str | None = None
    summary: str | None = None
    skills: list[str] = Field(default_factory=list)
    resume_file_name: str | None = None
    resume_uploaded_at: datetime | None = None
    created_at: datetime
    updated_at: datetime
