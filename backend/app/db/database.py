from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.config import get_settings
from app.db.base import Base

settings = get_settings()

connect_args = {}
pool_kwargs = {}
if settings.database_url.startswith("sqlite"):
    connect_args = {"check_same_thread": False}
    if settings.database_url.endswith(":memory:"):
        pool_kwargs = {"poolclass": StaticPool}

engine = create_engine(
    settings.database_url,
    connect_args=connect_args,
    pool_pre_ping=True,
    future=True,
    **pool_kwargs,
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine, future=True)


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
