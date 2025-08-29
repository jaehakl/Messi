from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, select
from typing import List, Dict, Any, Optional
from db import SessionLocal, UserWordSkill
from models import UserWordSkillData
from sqlalchemy.orm import selectinload


def create_user_word_skill_batch(user_word_skill_data: List[UserWordSkillData], db: Session=None, user_id:str = None):
    """
    여러 단어 숙련도를 한 번에 생성합니다.
    Args:
        user_word_skill_data: 단어 숙련도 데이터 리스트 [UserWordSkillData]    
    """
    if db is None:
        db = SessionLocal()
    try:
        for user_word_skill_data in user_word_skill_data:
            new_user_word_skill = UserWordSkill(
                word_id=user_word_skill_data.word_id,
                skill_kanji=user_word_skill_data.skill_kanji if user_word_skill_data.skill_kanji is not None else 0,
                skill_word_reading=user_word_skill_data.skill_word_reading if user_word_skill_data.skill_word_reading is not None else 0,
                skill_word_speaking=user_word_skill_data.skill_word_speaking if user_word_skill_data.skill_word_speaking is not None else 0,
                skill_sentence_reading=user_word_skill_data.skill_sentence_reading if user_word_skill_data.skill_sentence_reading is not None else 0,
                skill_sentence_speaking=user_word_skill_data.skill_sentence_speaking if user_word_skill_data.skill_sentence_speaking is not None else 0,
                skill_sentence_listening=user_word_skill_data.skill_sentence_listening if user_word_skill_data.skill_sentence_listening is not None else 0,
                is_favorite=user_word_skill_data.is_favorite if user_word_skill_data.is_favorite is not None else False,
                user_id=user_id
            )            
            db.add(new_user_word_skill)
            db.flush()  # ID 생성을 위해 flush                
        db.commit()
        return
        
    except Exception as e:
        db.rollback()
        raise e
    finally:
        db.close()


def update_user_word_skill_batch(user_word_skill_data: List[UserWordSkillData], db: Session=None, user_id:str = None):
    """
    여러 단어 숙련도를 한 번에 업데이트합니다.
    
    Args:
        user_word_skill_data: 업데이트할 단어 숙련도 데이터 [UserWordSkillData]
    """
    if db is None:
        db = SessionLocal()
    try:
        user_word_skill_ids = [user_word_skill_data.id for user_word_skill_data in user_word_skill_data]
        user_word_skills = db.query(UserWordSkill).filter(UserWordSkill.id.in_(user_word_skill_ids)).all()
        for user_word_skill in user_word_skills:
            if user_word_skill.word_id is not None:
                user_word_skill.word_id = user_word_skill.word_id
            if user_word_skill.skill_kanji is not None:
                user_word_skill.skill_kanji = user_word_skill.skill_kanji
            if user_word_skill.skill_word_reading is not None:
                user_word_skill.skill_word_reading = user_word_skill.skill_word_reading
            if user_word_skill.skill_word_speaking is not None:
                user_word_skill.skill_word_speaking = user_word_skill.skill_word_speaking
            if user_word_skill.skill_sentence_reading is not None:
                user_word_skill.skill_sentence_reading = user_word_skill.skill_sentence_reading
            if user_word_skill.skill_sentence_speaking is not None:
                user_word_skill.skill_sentence_speaking = user_word_skill.skill_sentence_speaking
            if user_word_skill.skill_sentence_listening is not None:
                user_word_skill.skill_sentence_listening = user_word_skill.skill_sentence_listening
            if user_word_skill.is_favorite is not None:
                user_word_skill.is_favorite = user_word_skill.is_favorite
            user_word_skill.user_id = user_id
        db.commit()
        return
        
    except Exception as e:
        db.rollback()
        raise e
    finally:
        db.close()

def delete_user_word_skill_batch(user_word_skill_ids: List[int], db: Session=None, user_id:str = None):
    """
    여러 단어 숙련도를 ID로 일괄 삭제합니다.
    
    Args:
        user_word_skill_ids: 삭제할 단어 숙련도 ID 리스트 [1, 2, 3, ...]
    
    Returns:
        삭제된 단어 숙련도 수
    """
    if db is None:
        db = SessionLocal()
    try:
        deleted_count = db.query(UserWordSkill).filter(UserWordSkill.user_id == user_id).filter(UserWordSkill.id.in_(user_word_skill_ids)).delete(synchronize_session=False)
        db.commit()
        print(f"총 {deleted_count}개의 단어 숙련도를 일괄 삭제했습니다.")
        return deleted_count                
    except Exception as e:
        db.rollback()
        raise e
    finally:
        db.close()




def get_user_word_skills_by_word_ids(word_ids: List[int], db: Session=None, user_id:str = None) -> List[Dict[str, Any]]:
    """
    특정 단어 ID에 해당하는 모든 단어 숙련도를 조회합니다.
    
    Args:
        word_ids: 조회할 단어 ID 리스트
    
    Returns:
        해당 단어의 단어 숙련도 데이터 리스트
    """
    if db is None:
        db = SessionLocal()
    try:
        user_word_skills = db.query(UserWordSkill).filter(UserWordSkill.user_id == user_id).filter(UserWordSkill.word_id.in_(word_ids)).all()
        
        result = []
        for user_word_skill in user_word_skills:
            result.append({
                "id": user_word_skill.id,
                "word_id": user_word_skill.word_id,
                "word_info": user_word_skill.word.word,
                "skill_kanji": user_word_skill.skill_kanji,
                "skill_word_reading": user_word_skill.skill_word_reading,
                "skill_word_speaking": user_word_skill.skill_word_speaking,
                "skill_sentence_reading": user_word_skill.skill_sentence_reading,
                "skill_sentence_speaking": user_word_skill.skill_sentence_speaking,
                "skill_sentence_listening": user_word_skill.skill_sentence_listening,
                "is_favorite": user_word_skill.is_favorite,
            })
        
        return result
        
    finally:
        db.close()


def get_all_user_word_skills(limit: Optional[int] = None, offset: Optional[int] = None, db: Session=None, user_id:str = None) -> Dict[str, Any]:
    """
    모든 단어 숙련도를 조회합니다 (페이지네이션 지원).
    
    Args:
        limit: 조회할 단어 숙련도 수 제한
        offset: 건너뛸 단어 숙련도 수
    
    Returns:
        전체 단어 숙련도 수와 페이지네이션된 단어 숙련도 데이터를 포함한 딕셔너리
    """
    if db is None:
        db = SessionLocal()
    try:
        # 전체 예문 수 조회
        total_count = db.query(UserWordSkill).filter(UserWordSkill.user_id == user_id).count()

        query = db.query(UserWordSkill).filter(UserWordSkill.user_id == user_id)
        if offset:
            query = query.offset(offset)
        if limit:
            query = query.limit(limit)
        user_word_skills = query.all()
    
        result_user_word_skills = []
        for user_word_skill in user_word_skills:
            result_user_word_skills.append({
                "id": user_word_skill.id,
                "word_id": user_word_skill.word_id,
                "word_info": user_word_skill.word.word,
                "skill_kanji": user_word_skill.skill_kanji,
                "skill_word_reading": user_word_skill.skill_word_reading,
                "skill_word_speaking": user_word_skill.skill_word_speaking,
                "skill_sentence_reading": user_word_skill.skill_sentence_reading,
                "skill_sentence_speaking": user_word_skill.skill_sentence_speaking,
                "skill_sentence_listening": user_word_skill.skill_sentence_listening,
                "is_favorite": user_word_skill.is_favorite,
            })
        
        return {
            "total_count": total_count,
            "user_word_skills": result_user_word_skills,
            "limit": limit,
            "offset": offset
        }
        
    finally:
        db.close()


