from tracemalloc import start
from typing import Optional, List, Dict, Any
from pydantic import BaseModel
from datetime import datetime



class ImageFileOut(BaseModel):
    id: str
    user_id: Optional[str] = None
    image_url: str  # 뷰 API에서 presigned GET으로 채워줘야함
    tags: Optional[str] = None
    content_type: Optional[str] = None
    size_bytes: Optional[int] = None

class UserData(BaseModel):
    id: Optional[int] = None
    email: str
    display_name: Optional[str] = None
    picture_url: Optional[str] = None
    roles: Optional[List[str]] = None


class FilterData(BaseModel):
    search_dict: Optional[Dict[str, List[str]]] = None
    combine: Optional[str] = "and"
    sort_column: Optional[str] = None
    sort_order: Optional[str] = "asc"
    start: Optional[int] = 0
    limit: Optional[int] = 30
