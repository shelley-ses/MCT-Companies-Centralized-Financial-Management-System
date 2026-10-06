from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from app.core.config import settings
from typing import Generator
import logging

logger = logging.getLogger(__name__)

Base = declarative_base()

engine = None
SessionLocal = None

if settings.DATABASE_URL:
    try:
        # Standardize connection string for SQLAlchemy with psycopg2
        db_url = settings.DATABASE_URL
        if db_url.startswith("postgres://"):
            db_url = db_url.replace("postgres://", "postgresql+psycopg2://", 1)
        elif db_url.startswith("postgresql://"):
            db_url = db_url.replace("postgresql://", "postgresql+psycopg2://", 1)

        engine = create_engine(db_url, pool_pre_ping=True)
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    except Exception as e:
        logger.error(f"Failed to initialize database engine: {e}")

def get_db() -> Generator:
    """
    FastAPI dependency that yields a SQLAlchemy database session.
    """
    if SessionLocal is None:
        raise RuntimeError("DATABASE_URL is not configured or engine failed to initialize.")
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
