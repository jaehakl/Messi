# words_crud.py
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, select, delete
from typing import List, Dict, Any, Optional, Sequence
from sqlalchemy.dialects.postgresql import insert as pg_insert

from models import UserTextData
from db import SessionLocal, UserText
from datetime import datetime


def row_to_dict(obj) -> dict:
    # ORM 객체를 dict로 안전하게 변환
    return {c.name: getattr(obj, c.name) for c in obj.__table__.columns}

def create_user_text(user_text_data: UserTextData, db: Session, user_id: Optional[str] = None) -> Dict[str, dict]:
    if not user_text_data:
        return {}
    user_text = UserText(
        title=user_text_data.title,
        text=user_text_data.text,
        tags=user_text_data.tags,
        youtube_url=user_text_data.youtube_url,
        user_id=user_id,
    )
    db.add(user_text)
    db.commit()
    return row_to_dict(user_text)

def get_user_text(user_text_id: str, db: Session, user_id: str) -> UserTextData:
    user_text = db.query(UserText).filter(UserText.id == user_text_id).first()
    if user_text:
        return UserTextData(**row_to_dict(user_text))
    else:
        return None

def get_user_text_list(limit, offset, db: Session = None, user_id: str = None) -> Dict[str, Any]:
    total_count = db.query(UserText).filter(UserText.user_id == user_id).count()
    query = db.query(UserText).filter(UserText.user_id == user_id)
    if limit:
        query = query.limit(limit)
    if offset:
        query = query.offset(offset)
    user_texts = query.all()
    return {
        "total_count": total_count,
        "user_texts": [UserTextData(id=user_text.id, title=user_text.title, tags=user_text.tags) for user_text in user_texts],
        "limit": limit,
        "offset": offset
    }

def update_user_text(user_text_data: UserTextData, db: Session=None, user_id:str = None) -> Dict[int, Dict[str, Any]]:
    result = {}        
    user_text = db.query(UserText).filter(UserText.id == user_text_data.id).first()
    if user_text:
        for key, value in user_text_data.model_dump().items():
            if value and key != "id":
                setattr(user_text, key, value)
        user_text.user_id = user_id
        result[user_text_data.id] = row_to_dict(user_text)            
    else:
        result[user_text_data.id] = {"error": "User text not found"}    
    db.commit()
    return result        

def delete_user_text(user_text_id: str, db: Session, user_id: str) -> Dict[int, str]:
    if not user_text_id:
        return {}
    db.query(UserText).filter(UserText.id == user_text_id).delete()
    db.commit()
    return {user_text_id: ("deleted" if user_text_id in user_text_id else "not found")}