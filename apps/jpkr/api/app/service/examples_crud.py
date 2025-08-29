# examples_crud.py
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, select
from typing import List, Dict, Any, Optional
from db import SessionLocal, Example
from models import ExampleData
from sqlalchemy.orm import selectinload

def row_to_dict(obj) -> dict:
    # ORM 객체를 dict로 안전하게 변환
    return {c.name: getattr(obj, c.name) for c in obj.__table__.columns}

def create_examples_batch(examples_data: List[ExampleData], db: Session=None, user_id:str = None):
    for example_data in examples_data:
        new_example = Example(
            word_id=example_data.word_id,
            tags=example_data.tags,
            jp_text=example_data.jp_text,
            kr_meaning=example_data.kr_meaning,
            user_id=user_id
        )            
        db.add(new_example)
        db.flush()  # ID 생성을 위해 flush                
    db.commit()
    return


def update_examples_batch(examples_data: List[ExampleData], db: Session=None, user_id:str = None):
    for example_data in examples_data:
        example = db.query(Example).filter(Example.id == example_data.id).first()            
        if example:
            # 예문 데이터 업데이트
            example.word_id = example_data.word_id
            example.tags = example_data.tags
            example.jp_text = example_data.jp_text
            example.kr_meaning = example_data.kr_meaning
            example.user_id = user_id
        else:
            # 해당 ID의 예문이 없는 경우
            raise Exception("Example not found")        
    db.commit()
    return
        

def delete_examples_batch(example_ids: List[int], db: Session=None, user_id:str = None):
    deleted_count = db.query(Example).filter(Example.id.in_(example_ids)).delete(synchronize_session=False)
    db.commit()
    print(f"총 {deleted_count}개의 예문을 일괄 삭제했습니다.")
    return deleted_count                


def search_examples_by_text(search_term: str, db: Session=None, user_id:str = None) -> List[Dict[str, Any]]:
    # jp_text, kr_meaning, tags 중 하나라도 일치하는 경우 검색
    search_pattern = f"%{search_term}%"
    
    found_examples = db.query(Example).filter(
        or_(
            Example.jp_text.like(search_pattern),
            Example.kr_meaning.like(search_pattern),
            Example.tags.like(search_pattern)
        )
    ).all()
    
    result = []
    for example in found_examples:
        result.append({
            "id": example.id,
            "word_id": example.word_id,
            "word_info": example.word.word,
            "tags": example.tags,
            "jp_text": example.jp_text,
            "kr_meaning": example.kr_meaning,
        })
    
    return result
        

def get_examples_by_word_id(word_id: int, db: Session=None, user_id:str = None) -> List[Dict[str, Any]]:
    examples = db.query(Example).filter(Example.word_id == word_id).all()
    
    result = []
    for example in examples:
        result.append({
            "id": example.id,
            "word_id": example.word_id,
            "word_info": example.word.word,
            "tags": example.tags,
            "jp_text": example.jp_text,
            "kr_meaning": example.kr_meaning,
        })
    
    return result
        

def get_all_examples(limit: Optional[int] = None, offset: Optional[int] = None, db: Session=None, user_id:str = None) -> Dict[str, Any]:
    total_count = db.query(Example).count()

    query = db.query(Example)
    if offset:
        query = query.offset(offset)
    if limit:
        query = query.limit(limit)
    examples = query.all()

    result_examples = []
    for example in examples:
        result_examples.append({
            "id": example.id,
            "word_id": example.word_id,
            "word_info": example.word.word,
            "tags": example.tags,
            "jp_text": example.jp_text,
            "kr_meaning": example.kr_meaning,
        })
    
    return {
        "total_count": total_count,
        "examples": result_examples,
        "limit": limit,
        "offset": offset
    }


