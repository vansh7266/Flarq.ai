from datetime import datetime

from pydantic import BaseModel, Field


class AlertDocument(BaseModel):
    user_id: str
    application_id: str
    kind: str = Field(min_length=1, max_length=64)
    message: str
    due_at: datetime
    acknowledged: bool = False
    created_at: datetime
