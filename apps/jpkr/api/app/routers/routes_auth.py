from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import RedirectResponse, JSONResponse
from sqlalchemy.orm import Session
from sqlalchemy import select, func, update
from datetime import datetime, timedelta, timezone
import requests

from google.oauth2 import id_token as google_id_token
from google.auth.transport import requests as google_requests

from models import UserData
from settings import settings
from utils.auth_utils import random_urlsafe, pkce_challenge, hash_token, set_session_cookie, clear_session_cookie, set_return_to_cookie, pop_return_to_cookie
from db import SessionLocal, User, Identity, Session as DbSession, OAuthState, UserRole  # 기존 db.py 모델 임포트

router = APIRouter(prefix="/auth", tags=["auth"])

AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
TOKEN_URL = "https://oauth2.googleapis.com/token"
SCOPES = "openid email profile"
PROVIDER = "google"

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# 로그인 시작
@router.get("/google/start")
def google_start(request: Request, return_to: str | None = None, db: Session = Depends(get_db)):
    state = random_urlsafe(32)
    nonce = random_urlsafe(32)
    code_verifier = random_urlsafe(64)
    challenge = pkce_challenge(code_verifier)

    st = OAuthState(
        provider=PROVIDER,   # Enum을 쓰면 OAuthProvider.google
        state=state,
        nonce=nonce,
        code_verifier=code_verifier,
        redirect_uri=settings.google_redirect_uri,
    )
    db.add(st)
    db.commit()

    # 사용자가 눌렀던 페이지로 되돌아가기 위해 임시 쿠키에 저장
    resp = RedirectResponse(url="/")
    set_return_to_cookie(resp, return_to)

    from urllib.parse import urlencode
    params = {
        "client_id": settings.google_client_id,
        "redirect_uri": settings.google_redirect_uri,
        "response_type": "code",
        "scope": SCOPES,
        "state": state,
        "nonce": nonce,
        "code_challenge": challenge,
        "code_challenge_method": "S256",
        "access_type": "offline",   # refresh_token 필요 시
        # "prompt": "consent",
    }
    resp.headers["Location"] = f"{AUTH_URL}?{urlencode(params)}"
    resp.status_code = 307
    return resp

# 콜백
@router.get("/google/callback")
def google_callback(request: Request, state: str = "", code: str = "", db: Session = Depends(get_db)):
    if not state or not code:
        raise HTTPException(400, "missing state or code")

    st = db.scalar(select(OAuthState).where(OAuthState.state == state))
    if not st or st.consumed_at is not None:
        raise HTTPException(400, "invalid or used state")

    # 토큰 교환
    data = {
        "code": code,
        "client_id": settings.google_client_id,
        "client_secret": settings.google_client_secret,
        "redirect_uri": st.redirect_uri or settings.google_redirect_uri,
        "grant_type": "authorization_code",
        "code_verifier": st.code_verifier,
    }
    tok = requests.post(TOKEN_URL, data=data, timeout=10)
    if tok.status_code != 200:
        raise HTTPException(400, f"token exchange failed: {tok.text}")
    token_json = tok.json()
    id_tok = token_json.get("id_token")
    expires_in = token_json.get("expires_in")

    # ID 토큰 검증
    try:
        req = google_requests.Request()
        idinfo = google_id_token.verify_oauth2_token(id_tok, req, settings.google_client_id)
        # nonce는 직접 확인
        if st.nonce and idinfo.get("nonce") != st.nonce:
            raise ValueError("nonce mismatch")
    except Exception as e:
        raise HTTPException(400, f"id_token verification failed: {e}")

    sub = idinfo["sub"]
    email = idinfo.get("email")
    email_verified = bool(idinfo.get("email_verified", False))
    name = idinfo.get("name")
    picture = idinfo.get("picture")

    # 아이덴티티 조회/생성
    ident = db.scalar(select(Identity).where(Identity.provider == PROVIDER, Identity.provider_user_id == sub))
    if ident:
        user = db.get(User, ident.user_id)
    else:
        user = None
        if email and email_verified:
            # CITEXT면 == email, TEXT면 lower 비교 등으로 수정
            user = db.scalar(select(User).where(User.email == email))
        if not user:
            user = User(
                email=email,
                email_verified_at=func.now() if email_verified else None,
                display_name=name,
                picture_url=picture,
                is_active=True,
            )
            db.add(user)
            db.flush()  # user.id 확보

        ident = Identity(
            user_id=user.id,
            provider=PROVIDER,
            provider_user_id=sub,
            email=email,
            email_verified=email_verified,
            raw_profile=idinfo,
            expires_at=datetime.now(timezone.utc) + timedelta(seconds=expires_in or 0) if expires_in else None,
            scope=token_json.get("scope", "").split() if token_json.get("scope") else None,
        )
        db.add(ident)

    # state 소진
    st.consumed_at = func.now()

    # 세션 발급(쿠키엔 랜덤 토큰, DB엔 SHA-256 해시 저장)
    sid_raw = random_urlsafe(32)
    sid_hash = hash_token(sid_raw)
    sess = DbSession(user_id=user.id, session_id_hash=sid_hash)
    db.add(sess)
    db.commit()

    # 돌아갈 곳
    return_to = request.cookies.get("rt") or settings.app_base_url
    resp = RedirectResponse(return_to)
    set_session_cookie(resp, sid_raw)
    pop_return_to_cookie(resp)
    return resp

# 현재 로그인 사용자
@router.get("/me")
def check_user(request: Request, db: Session = Depends(get_db))->UserData:
    cookie = request.cookies.get(settings.session_cookie_name)
    if not cookie:
        raise HTTPException(401, "no session")
    sid_hash = hash_token(cookie)
    print(cookie, sid_hash)
    sess = db.scalar(select(DbSession).where(DbSession.session_id_hash == sid_hash, DbSession.revoked_at.is_(None)))
    if not sess:
        raise HTTPException(401, "invalid session")
    user = db.get(User, sess.user_id)
    db.execute(update(DbSession).where(DbSession.id == sess.id).values(last_seen_at=func.now()))
    db.commit()
    return UserData(
        id=str(user.id),
        email=user.email,
        display_name=user.display_name,
        picture_url=user.picture_url,
        roles=[user_role.role.name for user_role in user.user_roles],
    )

# 로그아웃
@router.post("/logout")
def logout(request: Request, db: Session = Depends(get_db)):
    cookie = request.cookies.get(settings.session_cookie_name)
    resp = JSONResponse({"ok": True})
    if not cookie:
        clear_session_cookie(resp)
        return resp
    sid_hash = hash_token(cookie)
    sess = db.scalar(select(DbSession).where(DbSession.session_id_hash == sid_hash, DbSession.revoked_at.is_(None)))
    if sess:
        sess.revoked_at = func.now()
        db.commit()
    clear_session_cookie(resp)
    return resp
