from datetime import datetime

from pydantic import BaseModel, Field


class JobRequirement(BaseModel):
    name: str
    importance: str = Field(pattern="^(must_have|nice_to_have)$")


class JobDescriptionDocument(BaseModel):
    user_id: str
    title: str | None = None
    company: str | None = None
    raw_text: str
    requirements: str
    requirements_structured: list[JobRequirement] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime
