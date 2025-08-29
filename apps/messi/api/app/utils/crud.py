# factory.py
from fastapi import HTTPException
from sqlalchemy import select, update as sa_update, delete as sa_delete, or_
from sqlalchemy.orm import Session
from typing import Any, Callable

# ---- 유틸: 컬럼 접근/검증 ----
def _get_col(model, name: str):
    try:
        col = getattr(model, name)
    except AttributeError:
        raise HTTPException(status_code=400, detail=f"Unknown column: {name}")
    return col

def _maybe_user_scope(stmt, model, user):
    # 모델에 user_id 컬럼이 있으면 자동 스코프
    if hasattr(model, "user_id") and user is not None:
        return stmt.where(getattr(model, "user_id") == getattr(user, "id", user))
    return stmt

def _apply_filters(stmt, model, filt: dict[str, list[str]] | None):
    """
    filt 예시:
      {
        "level": ["N2","N3"],         # IN
        "word__like": ["%走%"],       # LIKE
        "created_at__gte": ["2025-01-01"],
        "created_at__lte": ["2025-12-31"],
        "count__gt": ["3"],
      }
    지원 연산자: eq(기본), in, like, ilike, gt, gte, lt, lte, ne
    키 형식: 컬럼명__연산자
    """
    if not filt:
        return stmt
    ops_map = {
        "eq": lambda c, v: c == v,
        "ne": lambda c, v: c != v,
        "like": lambda c, v: c.like(v),
        "ilike": lambda c, v: c.ilike(v),
        "gt": lambda c, v: c > v,
        "gte": lambda c, v: c >= v,
        "lt": lambda c, v: c < v,
        "lte": lambda c, v: c <= v,
        "in": lambda c, vs: c.in_(vs),
    }
    for raw_key, values in filt.items():
        if not values:
            continue
        if "__" in raw_key:
            col_name, op = raw_key.split("__", 1)
        else:
            col_name, op = raw_key, "in" if len(values) > 1 else "eq"
        col = _get_col(model, col_name)
        if op == "in":
            stmt = stmt.where(ops_map[op](col, values))
        else:
            # 단일 값만 사용
            stmt = stmt.where(ops_map[op](col, values[0]))
    return stmt

def _apply_search(stmt, model, q: str | None, columns: list[str] | None):
    if not q or not columns:
        return stmt
    conds = []
    for name in columns:
        col = _get_col(model, name)
        conds.append(col.ilike(f"%{q}%"))
    return stmt.where(or_(*conds))

def _apply_sort(stmt, model, sort: str | None):
    """
    sort 예시: "created_at,-word"  (기본 오름차순, -는 내림차순)
    """
    if not sort:
        return stmt
    order_cols = []
    for token in [s.strip() for s in sort.split(",") if s.strip()]:
        desc = token.startswith("-")
        name = token[1:] if desc else token
        col = _get_col(model, name)
        order_cols.append(col.desc() if desc else col.asc())
    return stmt.order_by(*order_cols)

def _paginate(stmt, page: int, page_size: int):
    page = max(1, int(page or 1))
    page_size = max(1, min(200, int(page_size or 20)))
    return stmt.offset((page - 1) * page_size).limit(page_size), page, page_size

# ---- 팩토리 본체 ----
class CrudFactory:
    def __init__(self, model):
        self.model = model

    # --- READ (단건) ---
    def get(self, id: Any, db: Session, user=None):
        stmt = select(self.model).where(_get_col(self.model, "id") == id)
        stmt = _maybe_user_scope(stmt, self.model, user)
        row = db.execute(stmt).scalar_one_or_none()
        if not row:
            raise HTTPException(status_code=404, detail="Not found")
        return row

    # --- LIST (필터/검색/정렬/페이지네이션) ---
    def filtered_content(
        self,
        filter_values: dict[str, list[str]] | None,
        db: Session,
        user=None,
        page: int = 1,
        page_size: int = 20,
        sort: str | None = None,
        q: str | None = None,
        search_columns: list[str] | None = None,
    ):
        base = select(self.model)
        base = _maybe_user_scope(base, self.model, user)
        base = _apply_filters(base, self.model, filter_values)
        base = _apply_search(base, self.model, q, search_columns)
        # total count
        total = db.execute(base.with_only_columns(_get_col(self.model, "id"))).unique().all()
        total_count = len(total)
        # sort + paginate
        stmt = _apply_sort(base, self.model, sort)
        stmt, page, page_size = _paginate(stmt, page, page_size)
        items = db.execute(stmt).scalars().all()
        return {
            "items": items,
            "meta": {
                "page": page,
                "page_size": page_size,
                "total": total_count,
                "pages": (total_count + page_size - 1) // page_size if page_size else 1,
            },
        }

    # --- CREATE (단건) ---
    def create(self, data: dict, db: Session, user=None):
        payload = dict(data)
        if hasattr(self.model, "user_id") and user is not None and "user_id" not in payload:
            payload["user_id"] = getattr(user, "id", user)
        obj = self.model(**payload)
        db.add(obj)
        db.commit()
        db.refresh(obj)
        return obj

    # --- UPDATE (단건) ---
    def update(self, id: Any, data: dict, db: Session, user=None):
        stmt = sa_update(self.model).where(_get_col(self.model, "id") == id)
        stmt = _maybe_user_scope(stmt, self.model, user).values(**data).returning(self.model)
        row = db.execute(stmt).scalar_one_or_none()
        if not row:
            db.rollback()
            raise HTTPException(status_code=404, detail="Not found or forbidden")
        db.commit()
        return row

    # --- DELETE (단건) ---
    def delete(self, id: Any, db: Session, user=None):
        stmt = sa_delete(self.model).where(_get_col(self.model, "id") == id)
        stmt = _maybe_user_scope(stmt, self.model, user)
        res = db.execute(stmt)
        db.commit()
        if res.rowcount == 0:
            raise HTTPException(status_code=404, detail="Not found or forbidden")
        return {"ok": True, "deleted": res.rowcount}

    # --- BULK: upsert-by-id(초간단), update-many, delete-many ---
    def upsert_many_by_id(self, rows: list[dict], db: Session, user=None):
        """
        아주 단순한 upsert: payload에 id가 있으면 update, 없으면 insert.
        (충돌키/복합키 upsert는 DB별 문법이 달라 여기선 생략)
        """
        created, updated = 0, 0
        for r in rows:
            r = dict(r)
            rid = r.pop("id", None)
            if hasattr(self.model, "user_id") and user is not None and "user_id" not in r:
                r["user_id"] = getattr(user, "id", user)
            if rid is None:
                db.add(self.model(**r))
                created += 1
            else:
                stmt = sa_update(self.model).where(_get_col(self.model, "id") == rid)
                stmt = _maybe_user_scope(stmt, self.model, user).values(**r)
                res = db.execute(stmt)
                updated += res.rowcount
        db.commit()
        return {"created": created, "updated": updated}

    def update_many(self, ids: list[Any], patch: dict, db: Session, user=None):
        stmt = sa_update(self.model).where(_get_col(self.model, "id").in_(ids))
        stmt = _maybe_user_scope(stmt, self.model, user).values(**patch)
        res = db.execute(stmt)
        db.commit()
        return {"updated": res.rowcount}

    def delete_many(self, ids: list[Any], db: Session, user=None):
        stmt = sa_delete(self.model).where(_get_col(self.model, "id").in_(ids))
        stmt = _maybe_user_scope(stmt, self.model, user)
        res = db.execute(stmt)
        db.commit()
        return {"deleted": res.rowcount}


# ---- 외부 노출: 메서드 한 개만 꺼내 쓰는 함수 팩 ----
def factory(model, method: str) -> Callable:
    """
    사용예:
      factory(Word, method="filtered_content")(filter_values, db, user, page=1, page_size=50, sort="-created_at", q="走る", search_columns=["word","jp_pronunciation"])
    """
    f = CrudFactory(model)
    if not hasattr(f, method):
        raise HTTPException(status_code=400, detail=f"Unknown method: {method}")
    return getattr(f, method)
