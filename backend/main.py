from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from services.preload import preload_knowledge_base

@asynccontextmanager
async def lifespan(app):
    preload_knowledge_base()
    yield

app = FastAPI(title="Arkive AI", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

from routes import chat, documents, audit, compliance, redteam, auth, risk_tier, role

app.include_router(auth.router, prefix="/api/auth", tags=["Auth"])
app.include_router(chat.router, prefix="/api/chat", tags=["Chat"])
app.include_router(documents.router, prefix="/api/documents", tags=["Documents"])
app.include_router(audit.router, prefix="/api/audit", tags=["Audit"])
app.include_router(compliance.router, prefix="/api/compliance", tags=["Compliance"])
app.include_router(redteam.router, prefix="/api/redteam", tags=["Red Team"])
app.include_router(risk_tier.router, prefix="/api/risk-tier", tags=["Risk Tier"])
app.include_router(role.router, prefix="/api/role", tags=["Role"])

@app.get("/")
def root():
    return {"message": "Arkive AI is running!"}