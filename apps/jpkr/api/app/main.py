from fastapi import FastAPI, UploadFile, File, HTTPException, Request, Query
from fastapi.responses import JSONResponse
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from fastapi import Depends, Form
from initserver import server
from models import WordData, ExampleData, TextData, UserWordSkillData, UserTextData
from service.words_crud import create_words_batch, update_words_batch, delete_words_batch, get_all_words, search_words_by_word
from service.examples_crud import create_examples_batch, update_examples_batch, delete_examples_batch, get_all_examples, search_examples_by_text, get_examples_by_word_id
from service.analysis_text import analyze_text
from service.user_word_skill import create_user_word_skill_batch, update_user_word_skill_batch, delete_user_word_skill_batch, get_user_word_skills_by_word_ids, get_all_user_word_skills
from service.words_personal import create_words_personal, get_random_words_to_learn
from service.user_text_crud import create_user_text, update_user_text, delete_user_text, get_user_text, get_user_text_list
from service.user_sevice import UserService
from db import SessionLocal
from routers.routes_auth import check_user, get_db
from utils.auth import get_current_user, CurrentUser

app = server()

# new auth_service (2025-08-28)
def auth_service(request: Request, allowed_roles: List[str], db, user, func, *args, **kwargs):    
    user_id = None
    if user is None:
        if '*' not in allowed_roles:
            return JSONResponse(status_code=401, content={"detail": "Unauthorized"})
    else:
        user_id = user.id
    try:
        return func(*args, **kwargs, db=db, user_id=user_id)        
    except Exception as e:
        print("Error: ", e)
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()

async def auth_service_async(request: Request, allowed_roles: List[str], db, user, func, *args, **kwargs):    
    if user is None:
        if '*' not in allowed_roles:
            return JSONResponse(status_code=401, content={"detail": "Unauthorized"})
    try:
        return await func(*args, **kwargs, db=db, user_id=user.id)        
    except Exception as e:
        print("Error: ", e)
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()

# Words CRUD API endpoints
@app.post("/words/create/batch")
async def api_create_words_batch(request: Request, words_data: List[WordData], db: Session = Depends(get_db), user: CurrentUser = Depends(get_current_user)):
    return auth_service(request, ["admin"], db, user, create_words_batch, words_data)

@app.post("/words/update/batch")
async def api_update_words(request: Request, words_data: List[WordData], db: Session = Depends(get_db), user: CurrentUser = Depends(get_current_user)):    
    return auth_service(request, ["admin"], db, user, update_words_batch, words_data)

@app.post("/words/delete/batch")
async def api_delete_words(request: Request, word_ids: List[str], db: Session = Depends(get_db), user: CurrentUser = Depends(get_current_user)):
    return auth_service(request, ["admin"], db, user, delete_words_batch, word_ids)

@app.post("/words/all")
async def api_get_words(request: Request, data: Dict[str, Any], db: Session = Depends(get_db), user: CurrentUser = Depends(get_current_user)):
    limit = data.get("limit")
    offset = data.get("offset")
    return auth_service(request, ["*"], db, user, get_all_words, limit, offset)

@app.get("/words/search/{search_term}")
async def api_search_word(request: Request, search_term: str, db: Session = Depends(get_db), user: CurrentUser = Depends(get_current_user)):
    return auth_service(request, ["admin", "user"], db, user, search_words_by_word, search_term)

# Words Personal API endpoints
@app.post("/words/create/personal")
async def api_create_words_personal(request: Request, data_json: str = Form(...), file_meta_json: str = Form("[]"), 
                                    files: List[UploadFile] = File(default=[]), db: Session = Depends(get_db), user: CurrentUser = Depends(get_current_user)):
    return await auth_service_async(request, ["admin", "user"], db, user, create_words_personal, data_json, file_meta_json, files)

@app.get("/words/personal/random/{limit}")
async def api_get_random_words_to_learn(request: Request, limit: int, db: Session = Depends(get_db), user: CurrentUser = Depends(get_current_user)):
    return auth_service(request, ["admin", "user"], db, user, get_random_words_to_learn, limit)


# Examples CRUD API endpoints
@app.post("/examples/create/batch")
async def api_create_examples(request: Request, examples_data: List[ExampleData], db: Session = Depends(get_db), user: CurrentUser = Depends(get_current_user)):
    return auth_service(request, ["admin"], db, user, create_examples_batch, examples_data)

@app.post("/examples/update/batch")
async def api_update_examples(request: Request, examples_data: List[ExampleData], db: Session = Depends(get_db), user: CurrentUser = Depends(get_current_user)):
    return auth_service(request, ["admin"], db, user, update_examples_batch, examples_data)

@app.post("/examples/delete/batch")
async def api_delete_examples(request: Request, example_ids: List[str], db: Session = Depends(get_db), user: CurrentUser = Depends(get_current_user)):
    return auth_service(request, ["admin"], db, user, delete_examples_batch, example_ids)

@app.post("/examples/all")
async def api_get_examples(request: Request, data: Dict[str, Any], db: Session = Depends(get_db), user: CurrentUser = Depends(get_current_user)):
    limit = data.get("limit")
    offset = data.get("offset")
    return auth_service(request, ["*"], db, user, get_all_examples, limit, offset)


@app.get("/examples/search/{search_term}")
async def api_search_example(request: Request, search_term: str, db: Session = Depends(get_db), user: CurrentUser = Depends(get_current_user)):
    return auth_service(request, ["admin"], db, user, search_examples_by_text, search_term)

@app.get("/examples/word/{word_id}")
async def api_get_examples_by_word(request: Request, word_id: str, db: Session = Depends(get_db), user: CurrentUser = Depends(get_current_user)):
    return auth_service(request, ["admin"], db, user, get_examples_by_word_id, word_id)



# User Text CRUD API endpoints
@app.post("/user_text/create")
async def api_create_user_text(request: Request, user_text_data: UserTextData, db: Session = Depends(get_db), user: CurrentUser = Depends(get_current_user)):
    return auth_service(request, ["admin", "user"], db, user, create_user_text, user_text_data)

@app.get("/user_text/get/{user_text_id}")
async def api_get_user_text(request: Request, user_text_id: str, db: Session = Depends(get_db), user: CurrentUser = Depends(get_current_user)):
    return auth_service(request, ["admin", "user"], db, user, get_user_text, user_text_id)

@app.get("/user_text/all")
async def api_get_user_text_list(request: Request, limit: int = None, offset: int = None, db: Session = Depends(get_db), user: CurrentUser = Depends(get_current_user)):
    return auth_service(request, ["admin", "user"], db, user, get_user_text_list, limit, offset)

@app.post("/user_text/update")
async def api_update_user_text(request: Request, user_text_data: UserTextData, db: Session = Depends(get_db), user: CurrentUser = Depends(get_current_user)):
    return auth_service(request, ["admin", "user"], db, user, update_user_text, user_text_data)

@app.get("/user_text/delete/{user_text_id}")
async def api_delete_user_text(request: Request, user_text_id: str, db: Session = Depends(get_db), user: CurrentUser = Depends(get_current_user)):
    return auth_service(request, ["admin", "user"], db, user, delete_user_text, user_text_id)


# User CRUD API endpoints
@app.get("/user_admin/get_all_users/{limit}/{offset}")
async def api_get_user_list(request: Request, limit: int = None, offset: int = None, db: Session = Depends(get_db), user: CurrentUser = Depends(get_current_user)):
    return auth_service(request, ["admin"], db, user, UserService.get_users, limit, offset)

@app.get("/user_data/summary/admin/{user_id}")
async def api_get_user_summary_admin(request: Request, user_id: str, db: Session = Depends(get_db), user: CurrentUser = Depends(get_current_user)):
    return auth_service(request, ["admin"], db, user, UserService.get_user_summary, user_id)

@app.get("/user_data/all/admin/{user_id}")
async def api_get_user_all_data_admin(request: Request, user_id: str, db: Session = Depends(get_db), user: CurrentUser = Depends(get_current_user)):
    return auth_service(request, ["admin"], db, user, UserService.get_user_with_all_data, user_id)

@app.get("/user_data/summary/user")
async def api_get_user_summary_user(request: Request, db: Session = Depends(get_db), user: CurrentUser = Depends(get_current_user)):
    return auth_service(request, ["admin", "user"], db, user, UserService.get_user_summary, "me")

@app.get("/user_data/all/user")
async def api_get_user_all_data_user(request: Request, db: Session = Depends(get_db), user: CurrentUser = Depends(get_current_user)):
    return auth_service(request, ["admin", "user"], db, user, UserService.get_user_with_all_data, "me")


# Text Analysis API endpoint
@app.post("/text/analyze")
async def api_analyze_text(request: Request, text_data: TextData, db: Session = Depends(get_db), user: CurrentUser = Depends(get_current_user)):
    return auth_service(request, ["*"], db, user, analyze_text, text_data.text)



