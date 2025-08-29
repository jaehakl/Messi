from fastapi import APIRouter, Request, Depends
from sqlalchemy.orm import Session
from initserver import server
from typing import List, Dict, Any
from settings import settings
from utils.crud import factory as crud_factory
from db import get_db
from db.tables import User
from utils.auth import get_current_user
from db.models import User_In, User_Out
app = server()

# API endpoints
@app.get("/messi/hello/{name}")
async def api_messi_hello(request: Request, name: str):
    print("got:", name)
    rv = {"message": f"Messi: Hello, {name}!"}
    print("rv:", rv)
    return rv


@app.get("/settings/list")
async def api_settings_list(request: Request):
    rv = [name for name in settings.__dict__ if not name.startswith("_")]
    print("rv:", rv)
    return rv

@app.post("/settings/detail")
async def api_settings_detail(request: Request, names: List[str]):
    print("got:", names)
    rv = [getattr(settings, name) for name in names]
    print("rv:", rv)
    return rv



user_router = APIRouter(prefix="/users", tags=["users"])

@app.post("/users/list/by_filter")
async def api_list_by_filter(
    request: Request,
    body: dict,
    db: Session = Depends(get_db),
    user = Depends(get_current_user),
) -> Dict[str, Any]:
    filter_values = body.get("filter_values") or {}
    page = body.get("page", 1)
    page_size = body.get("page_size", 20)
    sort = body.get("sort")
    q = body.get("q")
    search_columns = body.get("search_columns")  # 없으면 검색 미적용

    return crud_factory(User, method="filtered_content")(
        filter_values, db, user, page=page, page_size=page_size, sort=sort, q=q, search_columns=search_columns
    )

@app.post("/users/")
async def create_user(data: dict, db: Session = Depends(get_db), user = Depends(get_current_user)):
    return crud_factory(User, "create")(data, db, user)

@app.get("/users/{id}")
async def get_user(id: int, db: Session = Depends(get_db), user = Depends(get_current_user)):
    return crud_factory(User, "get")(id, db, user)

@app.patch("/users/{id}")
async def update_user(id: int, patch: dict, db: Session = Depends(get_db), user = Depends(get_current_user)):
    return crud_factory(User, "update")(id, patch, db, user)

@app.delete("/users/{id}")
async def delete_user(id: int, db: Session = Depends(get_db), user = Depends(get_current_user)):
    return crud_factory(User, "delete")(id, db, user)

@app.post("/users/bulk/upsert")
async def upsert_many(payload: Dict[str, Any], db: Session = Depends(get_db), user = Depends(get_current_user)):
    rows = payload.get("rows") or []
    return crud_factory(User, "upsert_many_by_id")(rows, db, user)

@app.post("/users/bulk/update")
async def update_many(payload: Dict[str, Any], db: Session = Depends(get_db), user = Depends(get_current_user)):
    return crud_factory(User, "update_many")(payload.get("ids") or [], payload.get("patch") or {}, db, user)

@app.post("/users/bulk/delete")
async def delete_many(payload: Dict[str, Any], db: Session = Depends(get_db), user = Depends(get_current_user)):
    return crud_factory(User, "delete_many")(payload.get("ids") or [], db, user)

