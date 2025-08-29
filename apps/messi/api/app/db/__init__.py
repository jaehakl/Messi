from settings import settings
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase, Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB, ARRAY, INET
from sqlalchemy import Enum as SAEnum
from sqlalchemy import (MetaData, func,
    text, String,Text,Boolean,DateTime,LargeBinary,Integer,
    UniqueConstraint,CheckConstraint,ForeignKey,Index,)
from sqlalchemy.orm import (DeclarativeBase,mapped_column,Mapped,relationship,)
from sqlalchemy.dialects.postgresql import (UUID,JSONB,ARRAY,INET)
from sqlalchemy import Enum as SAEnum

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

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

class Base(DeclarativeBase):
    metadata = MetaData(naming_convention=naming_convention)

DB_URL = settings.db_url
engine = create_engine(DB_URL, future=True, pool_pre_ping=True, echo=False)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True, expire_on_commit=False)