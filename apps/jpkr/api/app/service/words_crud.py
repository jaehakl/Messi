# words_crud.py
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, select, delete
from typing import List, Dict, Any, Optional, Sequence
from sqlalchemy.dialects.postgresql import insert as pg_insert

from models import WordData
from db import SessionLocal, Word
from datetime import datetime


def row_to_dict(obj) -> dict:
    # ORM 객체를 dict로 안전하게 변환
    return {c.name: getattr(obj, c.name) for c in obj.__table__.columns}

def create_words_batch(words_data: List[WordData], db: Session, user_id: Optional[str] = None) -> Dict[str, dict]:
    if not words_data:
        return {}
    # 유저별 유니크라면 (user_id, word) 키가 실질 키
    word_keys = list({(user_id, wd.word) for wd in words_data if wd.word is not None})
    stmt_exist = select(Word).where(
        (Word.user_id == user_id) & (Word.word.in_([w for _, w in word_keys]))
    )
    existing_rows = db.execute(stmt_exist).scalars().all()
    existing_map = {(w.user_id, w.word): w for w in existing_rows}
    # 3) 새로 넣어야 할 목록 구성(ORM → dict)
    rows_to_insert = []
    for wd in words_data:
        if wd.word is None:
            continue
        key = wd.word if user_id is None else (user_id, wd.word)
        if key in existing_map:
            continue
        payload = {k: v for k, v in wd.model_dump().items() if v is not None}
        if user_id is not None:
            payload['user_id'] = user_id
        rows_to_insert.append(payload)
    result_map: Dict[str, dict] = {}
    # 4) 중복은 유지(또는 업데이트), 신규만 일괄 insert
    if rows_to_insert:
        ins = pg_insert(Word).values(rows_to_insert)
        db.execute(ins)
    # 5) 결과 구성: 기존 + (옵션) 신규
    for w in existing_rows:
        result_map[w.word] = row_to_dict(w)
    db.commit()
    return result_map


def update_words_batch(words_data: List[Dict[str, Any]], db: Session=None, user_id:str = None) -> Dict[int, Dict[str, Any]]:
    result = {}        
    for word_data in words_data:
        word = db.query(Word).filter(Word.id == word_data.id).first()
        
        if word:
            # 단어 데이터 업데이트
            word.word = word_data.word
            word.jp_pronunciation = word_data.jp_pronunciation
            word.kr_pronunciation = word_data.kr_pronunciation
            word.kr_meaning = word_data.kr_meaning
            word.level = word_data.level
            word.user_id = user_id
            
            result[word_data.id] = row_to_dict(word)            
        else:
            # 해당 ID의 단어가 없는 경우
            result[word_data.id] = {"error": "Word not found"}    
    db.commit()
    return result
        

def delete_words_batch(word_ids: Sequence[str], db: Session, user_id: str) -> Dict[int, str]:
    if not word_ids:
        return {}
    ids = set(str(wid) for wid in word_ids)
    stmt = (
        delete(Word)
        .where(Word.id.in_(ids), Word.user_id == user_id)
        .returning(Word.id)
    )
    deleted_ids = set(db.execute(stmt).scalars().all())
    db.commit()
    return {wid: ("deleted" if wid in deleted_ids else "not found") for wid in word_ids}


def search_words_by_word(search_term: str, db: Session=None, user_id:str = None) -> List[Dict[str, Any]]:
    search_terms = search_term.split(',')
    hangul_pattern = f"%{search_terms[0]}%"
    hiragana_pattern = f"%{search_terms[1]}%"
    
    found_words = db.query(Word).filter(
        or_(
            Word.word.like(hiragana_pattern),
            Word.jp_pronunciation.like(hiragana_pattern),
            Word.kr_pronunciation.like(hangul_pattern),
            Word.kr_meaning.like(hangul_pattern),
        )
    ).all()
    
    result = []
    for word in found_words:
        word_data = row_to_dict(word)
        word_data["num_examples"] = str(len(word.examples))
        result.append(word_data)
    return result
        

def get_all_words(limit: Optional[int] = None, offset: Optional[int] = None, db: Session=None, user_id:str = None) -> Dict[str, Any]:
    total_count = db.query(Word).count()    

    # 페이지네이션된 단어 조회
    query = db.query(Word)    
    if offset:
        query = query.offset(offset)
    if limit:
        query = query.limit(limit)
    
    words = query.all()
    result_words = []
    for word in words:
        word_data = row_to_dict(word)
        word_data["num_examples"] = str(len(word.examples))
        result_words.append(word_data)
    return {
        "total_count": total_count,
        "words": result_words,
        "limit": limit,
        "offset": offset
    }
    