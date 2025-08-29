from typing import List, Dict, Any
from sqlalchemy.orm import Session, selectinload
from sqlalchemy import select, func, case
from fastapi import Request
import uuid
from db import Word, UserWordSkill, WordImage

import io, json
from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException
from settings import settings
from utils.auth import get_db, get_current_user, CurrentUser
from utils.aws_s3 import (
    is_allowed_content_type, build_object_key, upload_fileobj,
    presign_get_url, delete_object
)

async def create_words_personal(
    data_json: str = Form(...),                     # 단어 배열(JSON string)
    file_meta_json: str = Form("[]"),               # 파일 메타(JSON string; files 인덱스와 매칭)
    files: List[UploadFile] = File(default=[]),     # 이미지 파일들
    db: Session=None,
    user_id:str=None
):
    try:
        data: List[Dict[str, Any]] = json.loads(data_json)
    except Exception:
        raise HTTPException(400, detail="data_json must be a JSON array")

    try:
        file_meta: List[Dict[str, Any]] = json.loads(file_meta_json)
    except Exception:
        raise HTTPException(400, detail="file_meta_json must be a JSON array")

    if len(file_meta) != len(files):
        raise HTTPException(400, detail="file_meta_json length must match files length")

    # ---------- 1) 단어 upsert ----------
    created_words: List[str] = []
    updated_words: List[str] = []
    created_skills: List[str] = []
    updated_skills: List[str] = []

    # word → payload 매핑
    words_map = {wrec["word"]: wrec for wrec in data if "word" in wrec}

    # 기존 단어 로드
    stmt = (
        select(Word)
        .options(selectinload(Word.examples), selectinload(Word.user_word_skills))
        .where(Word.word.in_(list(words_map.keys())))
    )
    words_existing = db.execute(stmt).scalars().all()
    words_existing_map = {w.word: w for w in words_existing}

    # upsert 처리
    word_id_map: Dict[str, str] = {}  # word 텍스트 -> 실제 Word.id
    for word, payload in words_map.items():
        new_word_id = None
        if word not in words_existing_map:
            new_word = Word(
                user_id=user_id,
                word=word,
                jp_pronunciation=payload.get('jp_pronunciation'),
                kr_pronunciation=payload.get('kr_pronunciation'),
                kr_meaning=payload.get('kr_meaning'),
                level=payload.get('level'),
            )
            db.add(new_word)
            db.flush()
            created_words.append(word)
            new_word_id = new_word.id
            words_existing_map[word] = new_word
        elif words_existing_map[word].user_id == user_id:
            # 본인 소유 → 업데이트
            row = words_existing_map[word]
            row.jp_pronunciation = payload.get('jp_pronunciation')
            row.kr_pronunciation = payload.get('kr_pronunciation')
            row.kr_meaning = payload.get('kr_meaning')
            row.level = payload.get('level')
            updated_words.append(row.word)
            new_word_id = row.id
        else:
            # 타인 소유 루트가 있다면 내 소유 분기 생성
            base = words_existing_map[word]
            new_word = Word(
                user_id=user_id,
                root_word_id=base.id,
                word=word,
                jp_pronunciation=payload.get('jp_pronunciation'),
                kr_pronunciation=payload.get('kr_pronunciation'),
                kr_meaning=payload.get('kr_meaning'),
                level=payload.get('level'),
            )
            db.add(new_word)
            db.flush()
            created_words.append(word)
            new_word_id = new_word.id
            words_existing_map[word] = new_word

        word_id_map[word] = new_word_id

        # skill 자동처리 (예: level == 'N/A' → 읽기 100)
        if payload.get('level') in ['N/A']:
            existing_skill = db.query(UserWordSkill).filter(
                UserWordSkill.user_id == user_id,
                UserWordSkill.word_id == new_word_id
            ).first()
            if existing_skill:
                setattr(existing_skill, 'skill_word_reading', 100)
                updated_skills.append(word)
            else:
                new_skill = UserWordSkill(
                    user_id=user_id,
                    word_id=new_word_id,
                    skill_kanji=0,
                    skill_word_reading=100,
                    skill_word_speaking=0,
                    skill_sentence_reading=0,
                    skill_sentence_speaking=0,
                    skill_sentence_listening=0,
                    is_favorite=False
                )
                db.add(new_skill)
                db.flush()
                created_skills.append(word)

    # ---------- 2) 이미지 업로드 & WordImage 등록 ----------
    created_images = []
    failed_images = []

    for idx, up in enumerate(files):
        meta = file_meta[idx] if idx < len(file_meta) else {}
        word_text = meta.get("word")
        tags = meta.get("tags", "")

        if not word_text or word_text not in word_id_map:
            failed_images.append({"index": idx, "reason": "unknown word in file_meta"})
            continue

        if not is_allowed_content_type(up.content_type):
            failed_images.append({"index": idx, "reason": "unsupported content-type"})
            continue

        # 크기 제한
        raw = await up.read()
        if len(raw) > settings.MAX_IMAGE_SIZE_MB * 1024 * 1024:
            failed_images.append({"index": idx, "reason": "too large"})
            continue

        word_id = word_id_map[word_text]
        key = build_object_key(user_id=user_id, word_id=word_id, filename=up.filename or "image")


        # 기존 이미지 삭제
        existing_images = db.query(WordImage).filter(
            WordImage.user_id == user_id,
            WordImage.word_id == word_id
        ).all()
        print(existing_images, 'existing_images')
        for old in existing_images:
            try:
                if hasattr(old, "object_key") and old.object_key:
                    delete_object(old.object_key)  # S3 삭제
            except Exception as e:
                print("S3 delete failed:", e)
            db.delete(old)  # DB 삭제

         # 이후 새 파일 업로드
        try:
            upload_fileobj(io.BytesIO(raw), key, up.content_type or "application/octet-stream")
        except Exception as e:
            failed_images.append({"index": idx, "reason": f"S3 upload failed: {e}"})
            continue

        # presigned 보기 URL (사설 버킷 가정)
        view_url = presign_get_url(key, expires=3600)

        try:
            wi = WordImage(
                user_id=user_id,
                word_id=word_id,
                tags=tags,
                image_url=view_url,
                object_key=key,
                content_type=up.content_type,
                size_bytes=len(raw),
            )
            db.add(wi)
            db.flush()
            created_images.append({"index": idx, "word": word_text, "image_id": str(wi.id)})
        except Exception as e:
            # DB 실패 → 업로드 롤백
            try:
                delete_object(key)
            except:
                pass
            failed_images.append({"index": idx, "reason": f"DB insert failed: {e}"})

    # ---------- 3) 커밋 ----------
    db.commit()

    return {
        "success": True,
        "created_words": created_words,
        "updated_words": updated_words,
        "created_skills": created_skills,
        "updated_skills": updated_skills,
        "created_images": created_images,
        "failed_images": failed_images,
    }

def get_random_words_to_learn(limit: int, db: Session, user_id: str):
    """
    사용자가 학습할 단어들을 우선순위에 따라 가져옵니다.
    
    우선순위:
    1. level: N5 > N4 > N3 > N2 > N1 > 레벨 null 순
    2. 같은 level인 경우 사용자의 user word skill 총합이 작은 순
    3. 2가 같은 경우, 무작위 선택
    
    Args:
        limit: 가져올 단어 수
        db: 데이터베이스 세션
        user_id: 사용자 ID
    
    Returns:
        우선순위에 따라 정렬된 단어 리스트
    """
    # level 우선순위를 위한 case 문
    level_priority = case(
        (Word.level == 'N5', 1),
        (Word.level == 'N4', 2),
        (Word.level == 'N3', 3),
        (Word.level == 'N2', 4),
        (Word.level == 'N1', 5),
        else_=6
    )
    
    # UserWordSkill의 총합을 계산 (없는 경우 0으로 처리)
    skill_sum = func.coalesce(
        func.coalesce(UserWordSkill.skill_kanji, 0) +
        func.coalesce(UserWordSkill.skill_word_reading, 0) +
        func.coalesce(UserWordSkill.skill_word_speaking, 0) +
        func.coalesce(UserWordSkill.skill_sentence_reading, 0) +
        func.coalesce(UserWordSkill.skill_sentence_speaking, 0) +
        func.coalesce(UserWordSkill.skill_sentence_listening, 0), 0
    )
    
    # 쿼리 실행
    stmt = (
        select(Word, level_priority.label('level_priority'), skill_sum.label('total_skill'))
        .options(
            selectinload(Word.examples),
            selectinload(Word.root_word).selectinload(Word.examples)
        )
        .outerjoin(UserWordSkill, (UserWordSkill.word_id == Word.id) & (UserWordSkill.user_id == user_id))
        .order_by(
            level_priority.asc(),  # level 우선순위 (낮은 숫자가 높은 우선순위)
            skill_sum.asc(),       # skill 총합이 작은 순
            func.random()          # 무작위 선택
        )
        .limit(limit)
    )
    
    result = db.execute(stmt).all()
    print(result, 'result')
    
    # Word 객체를 딕셔너리로 변환하여 반환 (순환 참조 방지)
    words_data = []
    for row in result:
        word = row[0]
        word_dict = {
            "id": word.id,
            "word": word.word,
            "jp_pronunciation": word.jp_pronunciation,
            "kr_pronunciation": word.kr_pronunciation,
            "kr_meaning": word.kr_meaning,
            "level": word.level,
            "user_id": word.user_id,
            "root_word_id": word.root_word_id,
            "examples": [
                {
                    "id": ex.id,
                    "jp_text": ex.jp_text,
                    "kr_text": ex.kr_text,
                    "jp_audio_url": ex.jp_audio_url,
                    "kr_audio_url": ex.kr_audio_url
                } for ex in word.examples
            ] if word.examples else []
        }
        
        # root_word의 예문도 추가
        if word.root_word and word.root_word.examples:
            root_examples = [
                {
                    "id": ex.id,
                    "jp_text": ex.jp_text,
                    "kr_text": ex.kr_text,
                    "jp_audio_url": ex.jp_audio_url,
                    "kr_audio_url": ex.kr_audio_url,
                    "is_root_example": True
                } for ex in word.root_word.examples
            ]
            word_dict["examples"].extend(root_examples)
        
        words_data.append(word_dict)
    
    return words_data 
    
