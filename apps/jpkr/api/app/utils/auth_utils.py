import os, base64, hashlib
from fastapi import Response
from settings import settings

def random_urlsafe(nbytes: int = 32) -> str:
    return base64.urlsafe_b64encode(os.urandom(nbytes)).rstrip(b"=").decode("ascii")

def pkce_challenge(verifier: str) -> str:
    digest = hashlib.sha256(verifier.encode("ascii")).digest()
    return base64.urlsafe_b64encode(digest).rstrip(b"=").decode("ascii")

def hash_token(token: str) -> bytes:
    return hashlib.sha256(token.encode("utf-8")).digest()

def set_session_cookie(resp: Response, token: str):
    resp.set_cookie(
        key=settings.session_cookie_name,
        value=token,
        max_age=settings.session_max_age,
        httponly=True,
        secure=settings.session_cookie_secure,
        samesite="lax",
        path="/",
    )

def clear_session_cookie(resp: Response):
    resp.delete_cookie(key=settings.session_cookie_name, path="/")

# return_to를 콜백까지 전달하기 위한 임시 쿠키 (HttpOnly 아님)
def set_return_to_cookie(resp: Response, url: str | None):
    if not url:
        return
    resp.set_cookie(
        key="rt",
        value=url,
        max_age=600,
        httponly=False,    # 콜백에서 서버가 읽을 것이므로 굳이 JS 접근 필요 없음
        secure=settings.session_cookie_secure,
        samesite="lax",
        path="/",
    )

def pop_return_to_cookie(resp: Response):
    resp.delete_cookie(key="rt", path="/")