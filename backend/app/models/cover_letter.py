from datetime import datetime

from pydantic import BaseModel, Field


class CoverLetterDocument(BaseModel):
    user_id: str
    job_description_id: str
    content: str = Field(min_length=1)
    created_at: datetime
