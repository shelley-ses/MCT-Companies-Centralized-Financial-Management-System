from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from app.core.config import settings
from typing import Generator
import logging
import os

logger = logging.getLogger(__name__)

Base = declarative_base()

# Database connection setup
db_url = settings.DATABASE_URL
engine = None
from sqlalchemy.pool import NullPool

if db_url and db_url.strip() and not db_url.startswith("sqlite"):
    try:
        if db_url.startswith("postgres://"):
            db_url = db_url.replace("postgres://", "postgresql+psycopg2://", 1)
        elif db_url.startswith("postgresql://") and not db_url.startswith("postgresql+psycopg2://"):
            db_url = db_url.replace("postgresql://", "postgresql+psycopg2://", 1)
        if "pooler.supabase.com:5432" in db_url:
            db_url = db_url.replace(":5432", ":6543")
        engine = create_engine(db_url, poolclass=NullPool, pool_pre_ping=True)
    except Exception as e:
        logger.warning(f"Failed to initialize database engine with {db_url}: {e}. Falling back to SQLite.")

if engine is None:
    db_file = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "mct_financial.db")
    engine = create_engine(f"sqlite:///{db_file}", connect_args={"check_same_thread": False})

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def init_db():
    import app.models.company
    import app.models.finance
    import app.models.user
    import app.models.audit_log
    import app.models.loan
    import app.models.permission
    import app.models.staff_credit
    import app.models.bills
    import app.models.petty_cash
    from app.models.company import Company
    Base.metadata.create_all(bind=engine)

    # Sync companies from Supabase if local table is empty
    try:
        db = SessionLocal()
        if db.query(Company).count() == 0:
            from app.db.supabase import get_supabase_admin_client
            client = get_supabase_admin_client()
            supa_companies = client.table("company").select("*").execute().data
            if supa_companies:
                for sc in supa_companies:
                    db.add(Company(
                        company_id=sc.get("company_id"),
                        company_name=sc.get("company_name"),
                        location=sc.get("location"),
                        contact_person=sc.get("contact_person"),
                        contact_number=sc.get("contact_number"),
                        phone=sc.get("phone"),
                        email=sc.get("email"),
                        starting_balance=sc.get("starting_balance", 0.0),
                        current_balance=sc.get("current_balance", 0.0),
                    ))
                db.commit()
        db.close()
    except Exception as e:
        logger.warning(f"Could not sync companies on init: {e}")

# Dependency to get a database session for FastAPI endpoints
def get_db() -> Generator:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
