"""
Arkive AI — FastAPI application entry point (v2.0)

Changes from v1:
- CORS origins locked to env var (no more wildcard)
- Structured logging replaces print() throughout
- Health route registered at /health (Railway health checks)
- New routers: organizations, ai_systems, reports, analytics, frameworks
- Lifespan handler initialises preload + logs startup summary
"""

import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from services.logger import get_logger

log = get_logger("arkive.startup")

# ── Lifespan (startup / shutdown) ─────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    log.info("arkive_startup", extra={"version": "2.0.0", "env": os.getenv("ENVIRONMENT", "dev")})
    try:
        from services.preload import preload_knowledge_base
        preload_knowledge_base()
    except Exception as e:
        log.error("preload_failed", extra={"error": str(e)})

    # Warm up moderation — discover which Guard model is available
    try:
        from services.moderation import _discover_guard_model
        _discover_guard_model()
    except Exception as e:
        log.warning("moderation_warmup_failed", extra={"error": str(e)})

    log.info("arkive_ready")
    yield
    log.info("arkive_shutdown")


# ── App ───────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="Arkive AI",
    version="2.0.0",
    description="EU AI Act Compliance Intelligence Platform",
    lifespan=lifespan,
)

# ── CORS ──────────────────────────────────────────────────────────────────────
_raw_origins = os.getenv(
    "CORS_ALLOWED_ORIGINS",
    "http://localhost:5173,http://localhost:5174,http://localhost:5175,http://localhost:5176,http://127.0.0.1:5173,http://127.0.0.1:5174,http://127.0.0.1:5175,http://127.0.0.1:5176"
)
allowed_origins = [o.strip() for o in _raw_origins.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────────────────────
from routes import chat, documents, audit, compliance, redteam, auth, risk_tier, role
from routes.health import router as health_router

# Phase 1 — core routes (existing, now updated)
app.include_router(auth.router,        prefix="/api/auth",       tags=["Auth"])
app.include_router(chat.router,        prefix="/api/chat",        tags=["Chat"])
app.include_router(documents.router,   prefix="/api/documents",   tags=["Documents"])
app.include_router(audit.router,       prefix="/api/audit",       tags=["Audit"])
app.include_router(compliance.router,  prefix="/api/compliance",  tags=["Compliance"])
app.include_router(redteam.router,     prefix="/api/redteam",     tags=["Red Team"])
app.include_router(risk_tier.router,   prefix="/api/risk-tier",   tags=["Risk Tier"])
app.include_router(role.router,        prefix="/api/role",        tags=["Role"])
app.include_router(health_router,      tags=["Health"])

# Phase 2+ routes — registered conditionally as they are built
_optional_routers = [
    ("routes.organizations",  "/api/organizations",  "Organizations"),
    ("routes.reports",        "/api/reports",        "Reports"),
    ("routes.frameworks",     "/api/frameworks",     "Frameworks"),
    ("routes.ai_systems",     "/api/ai-systems",     "AI Systems"),
    ("routes.analytics",      "/api/analytics",      "Analytics"),
    ("routes.billing",        "/api/billing",        "Billing"),
    ("routes.audit_export",   "/api/audit-export",   "Audit Export"),
    ("routes.templates",      "/api/templates",      "Templates"),
]

for module_name, prefix, tag in _optional_routers:
    try:
        import importlib
        mod = importlib.import_module(module_name)
        app.include_router(mod.router, prefix=prefix, tags=[tag])
        log.info("router_registered", extra={"router_module": module_name, "prefix": prefix})
    except ModuleNotFoundError:
        log.info("router_skipped", extra={"router_module": module_name, "reason": "not yet implemented"})
    except Exception as e:
        log.warning("router_error", extra={"router_module": module_name, "error": str(e)})


@app.get("/")
def root():
    return {
        "service": "Arkive AI",
        "version": "2.0.0",
        "status": "running",
        "docs": "/docs",
        "health": "/health",
    }