# routers/word_images.py
import io, os, uuid
from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional, List, Dict, Any
from settings import settings

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
        
        contents = await file.read()

        object_key = f"{uuid.uuid4()}.{file.filename.split('.')[-1]}"        
        file_path = f"{settings.STATIC_DIR}/{object_key}"
        with open(file_path, "wb") as f:
            f.write(contents)

        # DB 등록
        try:
            wi = ImageFile(
                user_id=user.id if user else None,
                tags=f"{key_1},{key_2}",
                object_key=object_key,
                content_type=file.content_type, 
                size_bytes=len(contents)
            )
            db.add(wi)
            db.commit()
            db.refresh(wi)
            uploaded_images[wi.id] = f"{settings.API_URL}{settings.STATIC_ROUTE}/{object_key}"
        except Exception as e:
            print(e)
            os.remove(file_path)
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

    url = f"{settings.API_URL}{settings.STATIC_ROUTE}/{wi.object_key}"
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

        # 파일 삭제
        os.remove(f"{settings.STATIC_DIR}/{wi.object_key}")

        db.delete(wi)
    db.commit()
    return