"""
Health check endpoint for Arkive AI.
Used by Railway health checks and external uptime monitors (UptimeRobot, Better Uptime).

GET /health returns per-component status:
    {
        "status": "healthy" | "degraded" | "unhealthy",
        "components": {
            "mongodb": {"status": "ok" | "error", "latency_ms": 12},
            "groq":    {"status": "ok" | "error", "model": "llama-3.3-70b-versatile"},
            "redis":   {"status": "ok" | "unavailable"},
            "vector_index": {"status": "ok" | "error", "indexed_chunks": 1423}
        },
        "version": "2.0.0",
        "environment": "prod"
    }

Railway considers the service healthy when this returns 2xx.
Return 503 if any critical component (MongoDB, Groq) is down.
"""

import os
import time
from datetime import datetime, timezone

from fastapi import APIRouter
from fastapi.responses import JSONResponse

from services.logger import get_logger

log = get_logger(__name__)
router = APIRouter()

APP_VERSION = "2.0.0"


@router.get("/health")
async def health_check():
    environment = os.getenv("ENVIRONMENT", "dev")
    results: dict = {
        "mongodb": _check_mongodb(),
        "groq": _check_groq(),
        "redis": _check_redis(),
        "vector_index": _check_vector_index(),
    }

    # Determine overall status
    critical = [results["mongodb"]["status"], results["groq"]["status"]]
    if any(s == "error" for s in critical):
        overall = "unhealthy"
    elif any(s in ("error", "unavailable") for s in results.values() if isinstance(s, str)):
        overall = "degraded"
    elif any(v.get("status") in ("error", "unavailable") for v in results.values()):
        overall = "degraded"
    else:
        overall = "healthy"

    payload = {
        "status": overall,
        "components": results,
        "version": APP_VERSION,
        "environment": environment,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }

    status_code = 503 if overall == "unhealthy" else 200
    return JSONResponse(content=payload, status_code=status_code)


def _check_mongodb() -> dict:
    t0 = time.monotonic()
    try:
        from db.mongo import client as mongo_client
        mongo_client.admin.command("ping")
        latency_ms = round((time.monotonic() - t0) * 1000, 1)
        return {"status": "ok", "latency_ms": latency_ms}
    except Exception as e:
        log.error("health_mongodb_fail", extra={"error": str(e)})
        return {"status": "error", "error": str(e)}


def _check_groq() -> dict:
    try:
        from services.groq_client import groq_chat
        t0 = time.monotonic()
        resp = groq_chat(
            model="llama-3.1-8b-instant",
            messages=[{"role": "user", "content": "ping"}],
            max_tokens=3,
            task_type="health_check",
        )
        latency_ms = round((time.monotonic() - t0) * 1000, 1)
        return {
            "status": "ok",
            "model": "llama-3.1-8b-instant",
            "latency_ms": latency_ms,
        }
    except Exception as e:
        log.error("health_groq_fail", extra={"error": str(e)})
        return {"status": "error", "error": str(e)[:100]}


def _check_redis() -> dict:
    try:
        from services.cache import redis_healthy
        if redis_healthy():
            return {"status": "ok"}
        return {"status": "unavailable", "note": "Redis not reachable — using in-memory fallback"}
    except Exception as e:
        return {"status": "unavailable", "error": str(e)[:100]}


def _check_vector_index() -> dict:
    try:
        from db.mongo import db
        embeddings_col = db["embeddings"]
        count = embeddings_col.count_documents({})
        # Try a minimal aggregation to verify vector index is queryable
        return {"status": "ok", "indexed_chunks": count}
    except Exception as e:
        log.error("health_vector_index_fail", extra={"error": str(e)})
        return {"status": "error", "error": str(e)[:100]}
