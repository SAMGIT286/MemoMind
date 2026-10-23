from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class Observation(BaseModel):
    person: Optional[str] = None
    object: str = Field(min_length=1, max_length=100)
    confidence: float = Field(ge=0, le=1)
    location: Optional[str] = Field(default=None, max_length=200)
    camera_id: Optional[str] = Field(default=None, max_length=100)
    timestamp: datetime
    bounding_box: Optional[list[float]] = None
