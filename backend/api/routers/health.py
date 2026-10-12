"""Health check router."""
from fastapi import APIRouter
from datetime import datetime

router = APIRouter()

@router.get("/health")
async def health() -> dict:
    return {"status": "ok", "timestamp": datetime.utcnow().isoformat(), "service": "EKA Backend"}

@router.get("/health/ready")
async def readiness() -> dict:
    return {"status": "ready"}

@router.get("/health/live")
async def liveness() -> dict:
    return {"status": "alive"}
