from __future__ import annotations

import enum, uuid
from typing import Optional, List, Any
from sqlalchemy import (MetaData, func,
    Integer,text, String,Text,Boolean,DateTime,LargeBinary,JSON,
    UniqueConstraint,CheckConstraint,ForeignKey,Index,)
from sqlalchemy.orm import (DeclarativeBase,mapped_column,Mapped,relationship,)
from sqlalchemy.dialects.postgresql import (UUID,JSONB,ARRAY,INET)
from sqlalchemy import Enum as SAEnum
from db import Base, DB_URL

# ---------------------------------------------------------------------
# Database type detection utility
# ---------------------------------------------------------------------
def get_array_column_type():
    """데이터베이스 타입에 따라 적절한 배열 컬럼 타입을 반환합니다."""
    if "postgresql" in DB_URL.lower():
        return ARRAY(String)
    else:
        # SQLite의 경우 JSON 타입을 사용하여 배열을 저장
        return JSON

def get_json_column_type():
    """데이터베이스 타입에 따라 적절한 JSON 컬럼 타입을 반환합니다."""
    if "postgresql" in DB_URL.lower():
        return JSONB
    else:
        # SQLite의 경우 JSON 타입을 사용
        return JSON

def get_inet_column_type():
    """데이터베이스 타입에 따라 적절한 INET 컬럼 타입을 반환합니다."""
    if "postgresql" in DB_URL.lower():
        return INET
    else:
        # SQLite의 경우 Text 타입을 사용
        return Text

# ---------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------
class OAuthProvider(enum.Enum):
    google = "google"
    github = "github"
    kakao = "kakao"
    naver = "naver"
    apple = "apple"

oauth_provider_enum = SAEnum(
    OAuthProvider,
    name="oauth_provider",
    native_enum=True,
    create_type=True,  # create the enum type in PostgreSQL if not exists
)
# ---------------------------------------------------------------------
# Mixins
# ---------------------------------------------------------------------
class TimestampMixin:
    created_at: Mapped[DateTime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[DateTime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

# ---------------------------------------------------------------------
# Tables (Auth Layer)
# ---------------------------------------------------------------------
class User(TimestampMixin, Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    email: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    __table_args__ = (Index("uq_users_email_lower", func.lower(email), unique=True),)
    email_verified_at: Mapped[Optional[DateTime]] = mapped_column(DateTime(timezone=True))
    display_name: Mapped[Optional[str]] = mapped_column(Text)
    picture_url: Mapped[Optional[str]] = mapped_column(Text)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("true"))
    identities: Mapped[List["Identity"]] = relationship(back_populates="user", cascade="all, delete-orphan", lazy="selectin")
    sessions: Mapped[List["Session"]] = relationship(back_populates="user", cascade="all, delete-orphan", lazy="selectin")
    user_roles: Mapped[List["UserRole"]] = relationship(back_populates="user", cascade="all, delete-orphan", lazy="selectin")


class Identity(TimestampMixin, Base):
    __tablename__ = "identities"
    __table_args__ = (
        UniqueConstraint("provider", "provider_user_id", name="uq_identities_provider_provider_user_id"),
        Index("idx_identities_user_id", "user_id"),
    )
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    provider: Mapped[OAuthProvider] = mapped_column(oauth_provider_enum, nullable=False)
    provider_user_id: Mapped[str] = mapped_column(Text, nullable=False)  # OIDC 'sub'
    email: Mapped[Optional[str]] = mapped_column(Text)
    email_verified: Mapped[Optional[bool]] = mapped_column(Boolean)
    access_token_enc: Mapped[Optional[bytes]] = mapped_column(LargeBinary)   # encrypted app-side
    refresh_token_enc: Mapped[Optional[bytes]] = mapped_column(LargeBinary)  # encrypted app-side
    scope: Mapped[Optional[List[str]]] = mapped_column(get_array_column_type())
    expires_at: Mapped[Optional[DateTime]] = mapped_column(DateTime(timezone=True))
    raw_profile: Mapped[Optional[dict]] = mapped_column(get_json_column_type())
    user: Mapped[User] = relationship(back_populates="identities")


class Session(Base):
    __tablename__ = "sessions"
    __table_args__ = (
        Index("idx_sessions_user_id", "user_id"),
        UniqueConstraint("session_id_hash", name="uq_sessions_session_id_hash"),
    )
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    session_id_hash: Mapped[bytes] = mapped_column(LargeBinary, nullable=False)  # store only hash
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    last_seen_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    ip: Mapped[Optional[str]] = mapped_column(get_inet_column_type())
    user_agent: Mapped[Optional[str]] = mapped_column(Text)
    revoked_at: Mapped[Optional[DateTime]] = mapped_column(DateTime(timezone=True))
    user: Mapped[User] = relationship(back_populates="sessions")


class OAuthState(Base):
    __tablename__ = "oauth_states"
    __table_args__ = (
        Index("idx_oauth_states_created_at", "created_at"),
        UniqueConstraint("state", name="uq_oauth_states_state"),
    )
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    provider: Mapped[OAuthProvider] = mapped_column(oauth_provider_enum, nullable=False)
    state: Mapped[str] = mapped_column(Text, nullable=False)  # CSRF
    nonce: Mapped[Optional[str]] = mapped_column(Text)        # OIDC
    code_verifier: Mapped[Optional[str]] = mapped_column(Text)  # PKCE
    redirect_uri: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    consumed_at: Mapped[Optional[DateTime]] = mapped_column(DateTime(timezone=True))


class AuthAudit(Base):
    __tablename__ = "auth_audit"
    __table_args__ = (
        Index("idx_auth_audit_user_id", "user_id"),
        CheckConstraint(
            "event IN ('login_success','login_failure','logout','link_success','unlink')",
            name="ck_auth_audit_event",
        ),
    )
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    provider: Mapped[Optional[OAuthProvider]] = mapped_column(oauth_provider_enum)
    event: Mapped[str] = mapped_column(Text, nullable=False)
    ip: Mapped[Optional[str]] = mapped_column(get_inet_column_type())
    user_agent: Mapped[Optional[str]] = mapped_column(Text)
    details: Mapped[Optional[dict]] = mapped_column(get_json_column_type())
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class Role(Base):
    __tablename__ = "roles"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(Text, unique=True, nullable=False)
    user_roles: Mapped[List["UserRole"]] = relationship(back_populates="role", cascade="all, delete-orphan", lazy="selectin")

class UserRole(Base):
    __tablename__ = "user_roles"
    __table_args__ = (UniqueConstraint("user_id", "role_id", name="uq_user_roles_user_id_role_id"),)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    role_id: Mapped[int] = mapped_column(Integer, ForeignKey("roles.id", ondelete="CASCADE"), primary_key=True)
    role: Mapped[Role] = relationship(back_populates="user_roles")
    user: Mapped[User] = relationship(back_populates="user_roles")

class APIKey(Base):
    __tablename__ = "api_keys"
    __table_args__ = (
        UniqueConstraint("key_hash", name="uq_api_keys_key_hash"),
        Index("idx_api_keys_user_id", "user_id"),
    )
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    key_hash: Mapped[bytes] = mapped_column(LargeBinary, nullable=False)  # store only hash
    name: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    last_used_at: Mapped[Optional[DateTime]] = mapped_column(DateTime(timezone=True))
    revoked_at: Mapped[Optional[DateTime]] = mapped_column(DateTime(timezone=True))