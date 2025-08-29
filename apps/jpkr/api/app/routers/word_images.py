# routers/word_images.py
import io
from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import select
from settings import settings
from db import Word, WordImage
from models import WordImageOut
from utils.aws_s3 import (
    is_allowed_content_type, build_object_key, upload_fileobj,
    presign_get_url, delete_object
)
from utils.auth import get_current_user  # 사용자 id 제공

from db import SessionLocal

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


router = APIRouter(prefix="/words", tags=["word-images"])

@router.post("/{word_id}/images", response_model=WordImageOut)
async def upload_word_image(
    word_id: str,
    tags: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user = Depends(get_current_user),
):
    # 1) 단어 존재/권한
    word = db.execute(select(Word).where(Word.id == word_id)).scalar_one_or_none()
    if not word:
        raise HTTPException(404, detail="Word not found")

    # 2) 파일 검증
    if not is_allowed_content_type(file.content_type):
        raise HTTPException(status_code=415, detail="Unsupported image type (jpeg/png/webp/gif)")

    max_bytes = settings.MAX_IMAGE_SIZE_MB * 1024 * 1024
    contents = await file.read()
    if len(contents) > max_bytes:
        raise HTTPException(status_code=413, detail=f"File too large (>{settings.MAX_IMAGE_SIZE_MB}MB)")

    # 3) S3 업로드
    key = build_object_key(user_id=user.id, word_id=word_id, filename=file.filename)
    try:
        upload_fileobj(io.BytesIO(contents), key, file.content_type or "application/octet-stream")
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"S3 upload failed: {e}")

    # 4) 접근 URL 구성 (사설 버킷 → presigned GET)
    view_url = presign_get_url(key, expires=3600)

    # 5) DB 등록 (실패 시 S3 롤백)
    try:
        wi = WordImage(
            user_id=user.id,
            word_id=word_id,
            tags=tags,
            image_url=view_url,
            object_key=key, 
            content_type=file.content_type, 
            size_bytes=len(contents)
        )
        db.add(wi)
        db.commit()
        db.refresh(wi)
    except Exception as e:
        delete_object(key)
        db.rollback()
        raise HTTPException(status_code=500, detail=f"DB insert failed: {e}")
    return wi


@router.get("/images/{image_id}/url")
def get_image_url(
    image_id: str,
    db: Session = Depends(get_db),
    user = Depends(get_current_user),
):
    wi = db.get(WordImage, image_id)
    if not wi or wi.user_id != user.id:
        raise HTTPException(404, detail="Image not found")

    url = presign_get_url(wi.object_key, expires=600)
    return {"url": url}


@router.delete("/images/{image_id}", status_code=204)
def delete_word_image(
    image_id: str,
    db: Session = Depends(get_db),
    user = Depends(get_current_user),
):
    wi = db.get(WordImage, image_id)
    if not wi or wi.user_id != user.id:
        raise HTTPException(404, detail="Image not found")

    # S3에서 원본 삭제
    delete_object(wi.object_key)

    db.delete(wi)
    db.commit()
    return