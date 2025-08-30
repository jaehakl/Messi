from fastapi import APIRouter, Request, Depends, UploadFile, File, Form
from sqlalchemy.orm import Session
from initserver import server
from typing import List, Dict, Any
from settings import settings
from db import get_db
from db.tables import User, ImageFile
from utils.auth import get_current_user
from db.models import UserData, FilterData
from utils import crud

from services.image import upload_images, get_image_url, delete_images
app = server()





@app.post("/images/upload")
async def api_upload_images(
    key_1: List[str] = Form(...),
    key_2: List[str] = Form(...),
    file_1: List[UploadFile] = File(...),
    db: Session = Depends(get_db),
    user = Depends(get_current_user),
):
    list_image_data = [{'key_1': key_1, 'key_2': key_2, 'file_1': file_1} 
        for key_1, key_2, file_1 in zip(key_1, key_2, file_1)]
    return await upload_images(list_image_data, db, user)

@app.post("/images/read")
async def api_images_read(request: Request, filter_data: FilterData, db: Session = Depends(get_db), user = Depends(get_current_user)) -> Dict[str, Any]:
    rows, total = crud.generic_read(ImageFile, filter_data, db, user)
    return {"images": {row.id: get_image_url(row.id, db, user) for row in rows}, "total": int(total)}
    
@app.post("/images/delete")
async def api_images_delete(imageIds: List[int], db: Session = Depends(get_db), user = Depends(get_current_user)):
    return await delete_images(imageIds, db, user)


# API endpoints
@app.post("/users/read")
async def api_users_read(request: Request, filter_data: FilterData, db: Session = Depends(get_db), user = Depends(get_current_user)) -> Dict[str, Any]:
    rows, total = crud.generic_read(User, filter_data, db, user)
    return {"rows": [UserData(**row.__dict__).model_dump(exclude_unset=True) for row in rows], "total": int(total)}

@app.post("/users/upsert")
async def api_users_upsert(list_user_data: List[UserData], db: Session = Depends(get_db), user = Depends(get_current_user)):
    result = crud.generic_upsert(User, [ud.model_dump(exclude_unset=True) for ud in list_user_data], "email", db, user)
    result["updated"] = {k: UserData(**v.__dict__).model_dump(exclude_unset=True) for k, v in result["updated"].items()}
    result["inserted"] = {k: UserData(**v.__dict__).model_dump(exclude_unset=True) for k, v in result["inserted"].items()}
    return result

@app.post("/users/delete")
async def api_users_delete(userIds: List[int], db: Session = Depends(get_db), user = Depends(get_current_user)):
    return crud.generic_delete(User, userIds, db, user)


