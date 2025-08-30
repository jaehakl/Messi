# routers/word_images.py
import io
from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import select
from typing import Optional, List, Dict, Any
from settings import settings

from utils.aws_s3 import (
    is_allowed_content_type, build_object_key, upload_fileobj,
    presign_get_url, delete_object
)
from utils.auth import get_current_user 

from db import SessionLocal, get_db
from db.tables import ImageFile
from db.models import ImageFileOut, UserData



async def upload_images(
    list_image_data: List[Dict[str, Any]],
    db: Session,
    user: Optional[UserData] = None,
):
    uploaded_images = {}
    for image_data in list_image_data:
        file = image_data['file_1']
        key_1 = image_data['key_1']
        key_2 = image_data['key_2']
        
        # 1) 파일 검증
        if not is_allowed_content_type(file.content_type):
            raise HTTPException(status_code=415, detail="Unsupported image type (jpeg/png/webp/gif)")

        max_bytes = settings.MAX_IMAGE_SIZE_MB * 1024 * 1024
        contents = await file.read()
        if len(contents) > max_bytes:
            raise HTTPException(status_code=413, detail=f"File too large (>{settings.MAX_IMAGE_SIZE_MB}MB)")

        # 2) S3 업로드
        key = build_object_key(filename=file.filename)
        try:
            upload_fileobj(io.BytesIO(contents), key, file.content_type or "application/octet-stream")
        except Exception as e:
            raise HTTPException(status_code=502, detail=f"S3 upload failed: {e}")

        # 4) 접근 URL 구성 (사설 버킷 → presigned GET)
        view_url = presign_get_url(key, expires=3600)

        # 5) DB 등록 (실패 시 S3 롤백)
        try:
            print(user.id, 'user.id')
            wi = ImageFile(
                user_id=user.id if user else None,
                tags=f"{key_1},{key_2}",
                object_key=key, 
                content_type=file.content_type, 
                size_bytes=len(contents)
            )
            print(wi, 'wi')
            db.add(wi)
            db.commit()
            db.refresh(wi)
            print(wi, 'wi')
            uploaded_images[wi.id] = view_url
        except Exception as e:
            print(e)
            delete_object(key)
            db.rollback()
            raise HTTPException(status_code=500, detail=f"DB insert failed: {e}")
    return uploaded_images


def get_image_url(
    image_id: int,
    db: Session,
    user: Optional[UserData] = None,
):
    wi = db.get(ImageFile, image_id)
    if not wi or wi.user_id != user.id:
        raise HTTPException(404, detail="Image not found")

    url = presign_get_url(wi.object_key, expires=600)
    return url


async def delete_images(
    image_ids: List[str],
    db: Session,
    user: Optional[UserData] = None,
):
    for image_id in image_ids:
        wi = db.get(ImageFile, image_id)
        if not wi or wi.user_id != user.id:
            raise HTTPException(404, detail="Image not found")

        # S3에서 원본 삭제
        delete_object(wi.object_key)

        db.delete(wi)
    db.commit()
    return