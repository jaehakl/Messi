from typing import Dict, List, Optional, Tuple, Type, Any, Sequence
from sqlalchemy import select, or_, and_, func, String, Text, inspect, delete
from sqlalchemy.orm import Session
from sqlalchemy.orm.decl_api import DeclarativeMeta
from db.models import FilterData, UserData
from sqlalchemy.dialects.postgresql import insert  # SQLite 3.35+도 insert 사용 가능 (SQLAlchemy가 변환)



def generic_read(
    Model: Type[DeclarativeMeta],
    filter_data: FilterData,
    db: Session,
    user: Optional[UserData] = None,
) -> Tuple[List[object], int]:
    search_dict = filter_data.search_dict
    combine = filter_data.combine
    sort_column = filter_data.sort_column
    sort_order = filter_data.sort_order
    start = max(0, int(filter_data.start or 0))
    limit = max(1, int(filter_data.limit or 1))

    dialect = db.bind.dialect.name if db.bind is not None else ""

    table_cols = {c.name: getattr(Model, c.name) for c in Model.__table__.columns}
    # 문자열 컬럼만 검색 대상으로 허용 (보안 & 성능)
    string_cols = {name for name, col in table_cols.items()
                   if isinstance(col.type, (String, Text))}

    # 1) WHERE 구성
    column_groups = []  # 각 컬럼별 OR 묶음
    if search_dict:
        for col_name, words in search_dict.items():
            if not words:
                continue
            if col_name not in table_cols or col_name not in string_cols:
                # 존재하지 않거나 문자열 컬럼이 아니면 스킵 (화이트리스트)
                continue
            col = table_cols[col_name]

            # 같은 컬럼에 대해 단어들 OR
            if dialect == "postgresql":
                ors = [col.ilike(f"%{w}%") for w in words if w is not None and str(w) != ""]
            else:
                # 범용: LOWER(col) LIKE LOWER(:word)
                ors = [func.lower(col).like(f"%{str(w).lower()}%")
                       for w in words if w is not None and str(w) != ""]
            if ors:
                column_groups.append(or_(*ors))

    where_clause = None
    if column_groups:
        if combine.lower() == "or":
            where_clause = or_(*column_groups)
        else:
            where_clause = and_(*column_groups)

    # 2) 정렬 컬럼 확정 (없으면 PK → 없으면 첫 컬럼)
    if sort_column and sort_column in table_cols:
        sort_col = table_cols[sort_column]
    else:
        insp = inspect(Model)
        if insp.primary_key:
            sort_col = insp.primary_key[0]
        else:
            sort_col = list(Model.__table__.columns)[0]

    order_expr = sort_col.desc() if sort_order == "desc" else sort_col.asc()

    # 3) 쿼리 구성
    base = select(Model)
    if where_clause is not None:
        base = base.where(where_clause)

    count_stmt = select(func.count()).select_from(base.subquery())
    total = db.execute(count_stmt).scalar_one()

    stmt = base.order_by(order_expr).offset(start).limit(limit)
    rows = db.execute(stmt).scalars().all()
    return rows, total

def generic_upsert(
    Model: Type[DeclarativeMeta],
    data_list: List[Dict[str, Any]],
    unique_column: Optional[str],
    db: Session,
    user: Optional[UserData] = None,
) -> Dict[str, Any]:
    """
    DUPLICATE : user 소유의 데이터 중, unique_column 값이 중복되는 것이 있는 경우
               (Model 에 user_id 가 없는 경우에는 전역 범위에서 중복 판정)
    UPDATE : DUPLICATE 가 아니면서 user 소유의 데이터 중 id 값이 일치하는 것이 있는 경우
    INSERT : DUPLICATE 가 아니면서 user 소유의 데이터 중 id 값이 일치하는 것이 없는 경우 
             (id 값이 일치해도 타인 소유면 UPDATE 하지 않고 INSERT)
             (id 값이 없는 경우에도 INSERT)    
    """
    result = {"inserted": {}, "updated": {}, "duplicates": []}
    if not data_list:
        return result

    # Model 컬럼 목록
    col_names = {c.name for c in Model.__table__.columns}

    # ---------- 중복 판정 준비 ----------
    # 입력에서 unique 값 모으기
    values = []
    for data in data_list:
        if unique_column in data and data[unique_column] is not None:
            values.append(data[unique_column])

    # 중복 범위: user가 주어지고, Model에 user_id가 있으면 user별로, 아니면 전역
    scope_is_user = ("user_id" in col_names) and (user is not None) and getattr(user.__dict__, "id", None)

    # 기존 DB에 있는 값들 한 번에 조회
    uq_col = getattr(Model, unique_column)
    stmt = select(Model).where(uq_col.in_(values))
    if scope_is_user:
        stmt = stmt.where(getattr(Model, "user_id") == user.id)

    existing_rows = db.execute(stmt).scalars().all()
    existing_map = {getattr(r, unique_column): r for r in existing_rows}
    # 입력 내부 중복도 잡기 위한 seen 집합
    seen_in_batch = set()

    # 기존 데이터 ID 목록
    total_ids = set(db.execute(select(Model.id)).scalars().all())
    if scope_is_user:
        total_ids = set(db.execute(select(Model.id).where(getattr(Model, "user_id") == user.id)).scalars().all())

    # UPDATE 할 것, INSERT할 것, 중복으로 스킵할 것 분리
    to_update = []
    to_insert = []
    for data in data_list:
        if unique_column in data and data[unique_column] is not None:
            v = data[unique_column]
        else:
            v = None
        # unique 값이 비어있으면 중복 판단 불가 → 그냥 생성쪽으로 보냄(원한다면 여기서 스킵 규칙을 바꿀 수 있음)
        if v is None:
            if "id" in data:
                if data["id"] in total_ids:
                    to_update.append(data)
                    continue
            to_insert.append(data)
            continue

        # 전역/유저 범위 내 기존 존재 or 배치 내부에서 이미 본 값 → 중복
        if (v in existing_map) or (v in seen_in_batch):
            if "id" in data:
                if data["id"] == existing_map[v].id:
                    to_update.append(data)
                    continue
            result["duplicates"].append(data)
            continue
        # 유효: 생성
        if "id" in data:
            if data["id"] in total_ids:
                to_update.append(data)
                seen_in_batch.add(v)
                continue

        to_insert.append(data)
        seen_in_batch.add(v)
        continue


    # ---------- UPDATE ----------
    for data in to_update:
        row = db.query(Model).filter(Model.id == data["id"]).first()
        if row:
            for key, value in data.items():
                if key != "id":
                    if key in Model.__table__.columns:
                        setattr(row, key, value)
        result["updated"][data["id"]] = row
    db.commit()

    # ---------- INSERT ----------
    if scope_is_user:
        for data in to_insert:
            data.setdefault("user_id", user.id)

    objs = []
    for data in to_insert:
        if "id" in data:
            del data["id"]
        objs.append(Model(**data))
    if objs:
        db.add_all(objs)
        db.commit()

    # 직렬화
    pk_name = next(iter(Model.__mapper__.primary_key)).name
    for o in objs:
        pk = getattr(o, pk_name)
        result["inserted"][pk] = o
    return result


def generic_delete(
    Model: Type[DeclarativeMeta],
    ids: List[int],
    db: Session,
    user: Optional[UserData] = None,
) -> Dict[str, Any]:
    if not ids:
        return {}
    ids = set(str(id) for id in ids)
    stmt = (
        delete(Model)
        .where(Model.id.in_(ids))
        .returning(Model.id)
    )
    deleted_ids = set(db.execute(stmt).scalars().all())
    db.commit()
    return {id: ("deleted" if id in deleted_ids else "not found") for id in ids}


