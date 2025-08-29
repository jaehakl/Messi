from typing import Optional, List, Dict, Any
from pydantic import BaseModel


class UserData(BaseModel):
    id: str
    email: str
    display_name: str
    picture_url: str
    roles: List[str]
