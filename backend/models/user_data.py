from typing import Any

from pydantic import BaseModel


class UserDataReplace(BaseModel):
    items: list[dict[str, Any]]
