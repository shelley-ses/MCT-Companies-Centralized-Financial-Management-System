from fastapi import APIRouter
from app.schemas.company import HealthResponse
from app.core.config import settings
from app.db.supabase import get_supabase_client
from app.db.session import engine
from sqlalchemy import text

router = APIRouter()

@router.get("/health", response_model=HealthResponse, summary="System Health Check")
def health_check():
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": "1.0.0",
        "api_v1_path": settings.API_V1_STR
    }

@router.get("/health/db", summary="Check Supabase / Database Connection")
def check_db_connection():
    results = {
        "supabase_api": "not_configured",
        "sqlalchemy_db": "not_configured"
    }

    # Check Supabase client
    if settings.SUPABASE_URL and settings.SUPABASE_KEY:
        try:
            client = get_supabase_client()
            # Perform a lightweight ping/read if client exists
            if client:
                results["supabase_api"] = "configured"
        except Exception as e:
            results["supabase_api"] = f"error: {str(e)}"

    # Check Direct Postgres connection via SQLAlchemy
    if engine:
        try:
            with engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            results["sqlalchemy_db"] = "connected"
        except Exception as e:
            results["sqlalchemy_db"] = f"error: {str(e)}"

    return {
        "status": "ok",
        "database_checks": results
    }

