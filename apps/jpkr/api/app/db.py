from __future__ import annotations

import os, enum, uuid
from dotenv import load_dotenv
from typing import Optional, List
from sqlalchemy import (create_engine, MetaData, func,
    text, String,Text,Boolean,DateTime,LargeBinary,Integer,BigInteger,
    UniqueConstraint,CheckConstraint,ForeignKey,Index,)
from sqlalchemy.orm import (DeclarativeBase,mapped_column,Mapped,relationship,sessionmaker,)
from sqlalchemy.dialects.postgresql import (UUID,JSONB,ARRAY,INET)
from sqlalchemy import Enum as SAEnum
from pgvector.sqlalchemy import Vector

from settings import settings

# ---------------------------------------------------------------------
# Database URL & Engine
# ---------------------------------------------------------------------

DB_URL = settings.db_url
engine = create_engine(DB_URL, future=True, pool_pre_ping=True, echo=False)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True, expire_on_commit=False)
#from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
#engine = create_async_engine(DB_URL, echo=False)
#AsyncSessionLocal = async_sessionmaker(bind=engine, expire_on_commit=False)

# ---------------------------------------------------------------------
# Naming convention (good for migrations & consistent constraint names)
# ---------------------------------------------------------------------
naming_convention = {
    "ix": "ix_%(column_0_label)s",
    "uq": "uq_%(table_name)s_%(column_0_name)s",
    "ck": "ck_%(table_name)s_%(constraint_name)s",
    "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
    "pk": "pk_%(table_name)s",
}

class Base(DeclarativeBase):
    metadata = MetaData(naming_convention=naming_convention)
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
# Tables (App Layer)
# ---------------------------------------------------------------------

class Word(TimestampMixin, Base):
    __tablename__ = "words"
    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("users.id", ondelete="CASCADE"), nullable=True)
    root_word_id: Mapped[Optional[str]] = mapped_column(UUID(as_uuid=False),ForeignKey("words.id", ondelete="SET NULL"),nullable=True)
    word: Mapped[str] = mapped_column(Text, nullable=False)    
    jp_pronunciation: Mapped[str] = mapped_column(Text, nullable=False)
    kr_pronunciation: Mapped[str] = mapped_column(Text, nullable=False)
    kr_meaning: Mapped[str] = mapped_column(Text, nullable=False)
    level: Mapped[str] = mapped_column(Text, nullable=False)
    embedding: Mapped[Vector] = mapped_column(Vector(768), nullable=True)
    examples: Mapped[List["Example"]] = relationship("Example", back_populates="word", cascade="all, delete-orphan", lazy="selectin")
    images: Mapped[List["WordImage"]] = relationship("WordImage", back_populates="word", cascade="all, delete-orphan", lazy="selectin")
    user_word_skills: Mapped[List["UserWordSkill"]] = relationship("UserWordSkill", back_populates="word", cascade="all, delete-orphan", lazy="selectin")
    user: Mapped["User"] = relationship("User", back_populates="words", lazy="selectin")
    root_word: Mapped[Optional["Word"]] = relationship("Word",back_populates="branch_words",foreign_keys=[root_word_id],remote_side=[id],lazy="selectin")
    branch_words: Mapped[List["Word"]] = relationship("Word",back_populates="root_word",lazy="selectin",)

class Example(TimestampMixin, Base):
    __tablename__ = "examples"
    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=uuid.uuid4)
    __table_args__ = (Index("idx_examples_id", id, unique=True),)
    user_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("users.id", ondelete="CASCADE"), nullable=True)
    word_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("words.id", ondelete="CASCADE"), nullable=False)
    tags: Mapped[str] = mapped_column(Text, nullable=False)
    jp_text: Mapped[str] = mapped_column(Text, nullable=False)
    kr_meaning: Mapped[str] = mapped_column(Text, nullable=False)
    embedding: Mapped[Vector] = mapped_column(Vector(768), nullable=True)
    audio: Mapped[List["ExampleAudio"]] = relationship("ExampleAudio", back_populates="example", cascade="all, delete-orphan", lazy="selectin")
    word: Mapped["Word"] = relationship("Word", back_populates="examples", lazy="selectin")
    user: Mapped["User"] = relationship("User", back_populates="examples", lazy="selectin")


class WordImage(TimestampMixin, Base):
    __tablename__ = "word_images"
    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("users.id", ondelete="CASCADE"), nullable=True)
    word_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("words.id", ondelete="CASCADE"), nullable=False)
    tags: Mapped[str] = mapped_column(Text, nullable=False)
    image_url: Mapped[str] = mapped_column(Text, nullable=False)
    word: Mapped["Word"] = relationship("Word", back_populates="images", lazy="selectin")
    user: Mapped["User"] = relationship("User", back_populates="images", lazy="selectin")    
    object_key: Mapped[str] = mapped_column(Text, nullable=False)  # S3 key 원본 보관
    content_type: Mapped[str] = mapped_column(Text, nullable=True)
    size_bytes: Mapped[int] = mapped_column(BigInteger, nullable=True)

class ExampleAudio(TimestampMixin, Base):
    __tablename__ = "example_audio"
    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=uuid.uuid4)
    example_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("examples.id", ondelete="CASCADE"), nullable=False)
    tags: Mapped[str] = mapped_column(Text, nullable=False)
    audio_url: Mapped[str] = mapped_column(Text, nullable=False)
    example: Mapped["Example"] = relationship("Example", back_populates="audio", lazy="selectin")


class UserWordSkill(TimestampMixin, Base):
    __tablename__ = "user_word_skills"
    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    word_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("words.id", ondelete="CASCADE"), nullable=False)
    skill_kanji: Mapped[int] = mapped_column(Integer, default=0)
    skill_word_reading: Mapped[int] = mapped_column(Integer, default=0)
    skill_word_speaking: Mapped[int] = mapped_column(Integer, default=0)
    skill_sentence_reading: Mapped[int] = mapped_column(Integer, default=0)
    skill_sentence_speaking: Mapped[int] = mapped_column(Integer, default=0)
    skill_sentence_listening: Mapped[int] = mapped_column(Integer, default=0)
    is_favorite: Mapped[bool] = mapped_column(Boolean, default=False)
    word: Mapped["Word"] = relationship("Word", back_populates="user_word_skills", lazy="selectin")
    user: Mapped["User"] = relationship("User", back_populates="user_word_skills", lazy="selectin")


class UserText(TimestampMixin, Base):
    __tablename__ = "user_texts"
    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title: Mapped[str] = mapped_column(Text, nullable=False)
    text: Mapped[str] = mapped_column(Text, nullable=False)
    tags: Mapped[str] = mapped_column(Text, nullable=False)
    embedding: Mapped[Vector] = mapped_column(Vector(768), nullable=True)
    youtube_url: Mapped[str] = mapped_column(Text, nullable=True)
    audio_url: Mapped[str] = mapped_column(Text, nullable=True)
    user: Mapped["User"] = relationship("User", back_populates="user_texts", lazy="selectin")

# ---------------------------------------------------------------------
# Tables (Auth Layer)
# ---------------------------------------------------------------------
class User(TimestampMixin, Base):
    __tablename__ = "users"
    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=uuid.uuid4)
    email: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    __table_args__ = (Index("uq_users_email_lower", func.lower(email), unique=True),)
    email_verified_at: Mapped[Optional[DateTime]] = mapped_column(DateTime(timezone=True))
    display_name: Mapped[Optional[str]] = mapped_column(Text)
    picture_url: Mapped[Optional[str]] = mapped_column(Text)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("true"))
    identities: Mapped[List["Identity"]] = relationship(back_populates="user", cascade="all, delete-orphan", lazy="selectin")
    sessions: Mapped[List["Session"]] = relationship(back_populates="user", cascade="all, delete-orphan", lazy="selectin")
    user_roles: Mapped[List["UserRole"]] = relationship(back_populates="user", cascade="all, delete-orphan", lazy="selectin")
    words: Mapped[List["Word"]] = relationship(back_populates="user", cascade="all, delete-orphan", lazy="selectin")
    examples: Mapped[List["Example"]] = relationship(back_populates="user", cascade="all, delete-orphan", lazy="selectin")
    images: Mapped[List["WordImage"]] = relationship(back_populates="user", cascade="all, delete-orphan", lazy="selectin")
    user_word_skills: Mapped[List["UserWordSkill"]] = relationship(back_populates="user", cascade="all, delete-orphan", lazy="selectin")
    user_texts: Mapped[List["UserText"]] = relationship(back_populates="user", cascade="all, delete-orphan", lazy="selectin")


class Identity(TimestampMixin, Base):
    __tablename__ = "identities"
    __table_args__ = (
        UniqueConstraint("provider", "provider_user_id", name="uq_identities_provider_provider_user_id"),
        Index("idx_identities_user_id", "user_id"),
    )
    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    provider: Mapped[OAuthProvider] = mapped_column(oauth_provider_enum, nullable=False)
    provider_user_id: Mapped[str] = mapped_column(Text, nullable=False)  # OIDC 'sub'
    email: Mapped[Optional[str]] = mapped_column(Text)
    email_verified: Mapped[Optional[bool]] = mapped_column(Boolean)
    access_token_enc: Mapped[Optional[bytes]] = mapped_column(LargeBinary)   # encrypted app-side
    refresh_token_enc: Mapped[Optional[bytes]] = mapped_column(LargeBinary)  # encrypted app-side
    scope: Mapped[Optional[List[str]]] = mapped_column(ARRAY(String))
    expires_at: Mapped[Optional[DateTime]] = mapped_column(DateTime(timezone=True))
    raw_profile: Mapped[Optional[dict]] = mapped_column(JSONB)
    user: Mapped[User] = relationship(back_populates="identities")


class Session(Base):
    __tablename__ = "sessions"
    __table_args__ = (
        Index("idx_sessions_user_id", "user_id"),
        UniqueConstraint("session_id_hash", name="uq_sessions_session_id_hash"),
    )
    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    session_id_hash: Mapped[bytes] = mapped_column(LargeBinary, nullable=False)  # store only hash
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    last_seen_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    ip: Mapped[Optional[str]] = mapped_column(INET)
    user_agent: Mapped[Optional[str]] = mapped_column(Text)
    revoked_at: Mapped[Optional[DateTime]] = mapped_column(DateTime(timezone=True))
    user: Mapped[User] = relationship(back_populates="sessions")


class OAuthState(Base):
    __tablename__ = "oauth_states"
    __table_args__ = (
        Index("idx_oauth_states_created_at", "created_at"),
        UniqueConstraint("state", name="uq_oauth_states_state"),
    )
    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=uuid.uuid4)
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
    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[Optional[str]] = mapped_column(UUID(as_uuid=False), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    provider: Mapped[Optional[OAuthProvider]] = mapped_column(oauth_provider_enum)
    event: Mapped[str] = mapped_column(Text, nullable=False)
    ip: Mapped[Optional[str]] = mapped_column(INET)
    user_agent: Mapped[Optional[str]] = mapped_column(Text)
    details: Mapped[Optional[dict]] = mapped_column(JSONB)
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class Role(Base):
    __tablename__ = "roles"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(Text, unique=True, nullable=False)
    user_roles: Mapped[List["UserRole"]] = relationship(back_populates="role", cascade="all, delete-orphan", lazy="selectin")

class UserRole(Base):
    __tablename__ = "user_roles"
    __table_args__ = (UniqueConstraint("user_id", "role_id", name="uq_user_roles_user_id_role_id"),)
    user_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    role_id: Mapped[int] = mapped_column(Integer, ForeignKey("roles.id", ondelete="CASCADE"), primary_key=True)
    role: Mapped[Role] = relationship(back_populates="user_roles")
    user: Mapped[User] = relationship(back_populates="user_roles")

class APIKey(Base):
    __tablename__ = "api_keys"
    __table_args__ = (
        UniqueConstraint("key_hash", name="uq_api_keys_key_hash"),
        Index("idx_api_keys_user_id", "user_id"),
    )
    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, server_default=text("gen_random_uuid()"))
    user_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    key_hash: Mapped[bytes] = mapped_column(LargeBinary, nullable=False)  # store only hash
    name: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    last_used_at: Mapped[Optional[DateTime]] = mapped_column(DateTime(timezone=True))
    revoked_at: Mapped[Optional[DateTime]] = mapped_column(DateTime(timezone=True))