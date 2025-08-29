# auth.py
from fastapi import Depends, HTTPException, Request
from sqlalchemy.orm import Session
from sqlalchemy import select, update, func

from settings import settings
from utils.auth_utils import hash_token
from db import SessionLocal, User, Session as DbSession  # DbSession = 세션 테이블

# 공용 DB 의존성(이미 deps.py가 있다면 그걸 써도 됩니다)
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

class CurrentUser:
    """
    라우터에서 필요한 최소 정보만 담아 반환.
    필요하면 pydantic BaseModel로 바꿔도 됩니다.
    """
    def __init__(self, id: str, email: str | None, display_name: str | None, picture_url: str | None, roles: list[str]):
        self.id = id
        self.email = email
        self.display_name = display_name
        self.picture_url = picture_url
        self.roles = roles

def _load_user_from_session_cookie(request: Request, db: Session) -> User:
    """
    routes_auth.py 의 /auth/me 와 동일한 규칙으로
    세션 쿠키를 검증하고 사용자 객체를 반환합니다.
    """
    cookie_name = settings.session_cookie_name  # routes_auth.py에서 쓰는 것과 동일해야 함
    raw = request.cookies.get(cookie_name)
    if not raw:
        raise HTTPException(status_code=401, detail="no session")

    sid_hash = hash_token(raw)
    sess = db.scalar(
        select(DbSession).where(
            DbSession.session_id_hash == sid_hash,
            DbSession.revoked_at.is_(None),
        )
    )
    if not sess:
        raise HTTPException(status_code=401, detail="invalid session")

    user = db.get(User, sess.user_id)
    if not user or not getattr(user, "is_active", True):
        raise HTTPException(status_code=401, detail="inactive or missing user")

    # 최근 접속 갱신(선택)
    db.execute(
        update(DbSession)
        .where(DbSession.id == sess.id)
        .values(last_seen_at=func.now())
    )
    db.commit()

    return user

def get_current_user(
    request: Request,
    db: Session = Depends(get_db),
) -> CurrentUser | None:
    """
    라우터에서 Depends(get_current_user) 로 사용.
    인증 실패 시 401을 던집니다.
    인증이 선택인 엔드포인트에서 사용. 세션 없으면 None 반환.
    """
    try:
        user = _load_user_from_session_cookie(request, db)
    except HTTPException:
        return None

    roles = []
    if hasattr(user, "user_roles") and user.user_roles:
        roles = [ur.role.name for ur in user.user_roles if hasattr(ur, "role") and ur.role]

    return CurrentUser(
        id=str(user.id),
        email=user.email,
        display_name=getattr(user, "display_name", None),
        picture_url=getattr(user, "picture_url", None),
        roles=roles,
    )


