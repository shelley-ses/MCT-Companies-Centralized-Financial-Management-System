from fastapi import APIRouter
from app.schemas.company import HealthResponse
from app.core.config import settings

router = APIRouter()

@router.get("/health", response_model=HealthResponse, summary="System Health Check")
def health_check():
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": "1.0.0",
        "api_v1_path": settings.API_V1_STR
    }
