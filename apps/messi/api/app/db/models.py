from typing import Optional, List, Dict, Any
from pydantic import BaseModel


class UserData(BaseModel):
    id: int
    email: str
    display_name: str
    picture_url: str
    roles: List[str]



class User_In(BaseModel):
    email: str
    display_name: str
    picture_url: Optional[str] = None


class User_Out(BaseModel):
    id: int
    email: str
    display_name: str
    picture_url: Optional[str] = None
    is_active: bool
