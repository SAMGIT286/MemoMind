from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class ReminderCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    description: str = Field(default="", max_length=2000)
    due_at: datetime
    recurrence: Optional[str] = Field(default=None, max_length=100)
    priority: str = Field(default="medium", pattern="^(low|medium|high)$")


class ReminderUpdate(BaseModel):
    title: Optional[str] = Field(default=None, min_length=1, max_length=200)
    description: Optional[str] = Field(default=None, max_length=2000)
    due_at: Optional[datetime] = None
    recurrence: Optional[str] = Field(default=None, max_length=100)
    priority: Optional[str] = Field(default=None, pattern="^(low|medium|high)$")
    completed: Optional[bool] = None
