"""
MongoDB connection and collection registry for Arkive AI (v2).

Collections:
  users           — user accounts (role, org_id, disclaimer_acknowledged_at)
  organizations   — org records, members, subscription tier
  sessions        — auth sessions
  messages        — chat messages
  documents       — uploaded document metadata
  embeddings      — chunk vectors (all-MiniLM-L6-v2, 384d)
  audit_logs      — tamper-evident event log
  audit_log_hashes — SHA-256 hash chain for tamper detection
  ai_systems      — AI system registry entries
  tasks           — background task status (also in Redis)
  reports         — generated PDF compliance report metadata
  compliance_results — 8-pillar assessment results
  redteam_results — red team simulation results
"""

import os
import sys
from pymongo import MongoClient, IndexModel, ASCENDING, DESCENDING
from dotenv import load_dotenv

# Fix Windows console encoding
if sys.stdout.encoding and sys.stdout.encoding.lower() != "utf-8":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI")
MONGO_DB_NAME = os.getenv("MONGO_DB_NAME", "arkive_db")

if not MONGO_URI:
    raise RuntimeError("MONGO_URI is not set in environment variables")

client = MongoClient(
    MONGO_URI,
    serverSelectionTimeoutMS=5000,   # fail fast if Atlas unreachable
    connectTimeoutMS=5000,
    socketTimeoutMS=10000,
)
db = client[MONGO_DB_NAME]

# ── Collections ───────────────────────────────────────────────────────────────
users_col             = db["users"]
organizations_col     = db["organizations"]
sessions_col          = db["sessions"]
messages_col          = db["messages"]
documents_col         = db["documents"]
embeddings_col        = db["embeddings"]
audit_logs_col        = db["audit_logs"]
audit_log_hashes_col  = db["audit_log_hashes"]
ai_systems_col        = db["ai_systems"]
tasks_col             = db["tasks"]
reports_col           = db["reports"]
compliance_results_col = db["compliance_results"]
redteam_results_col   = db["redteam_results"]

# ── Indexes ───────────────────────────────────────────────────────────────────
_TTL_7_DAYS = 604800
_TTL_2_YEARS = 63072000

def _ensure_indexes():
    """Create indexes if they don't already exist. Safe to call on startup."""

    # Users
    try:
        users_col.create_index([("email", ASCENDING)], unique=True, background=True)
        users_col.create_index([("org_id", ASCENDING)], background=True)
    except Exception:
        pass

    # Organizations
    try:
        organizations_col.create_index([("slug", ASCENDING)], unique=True, background=True)
    except Exception:
        pass

    # Documents — TTL on non-permanent docs (7 days)
    try:
        documents_col.create_index(
            [("uploaded_at", ASCENDING)],
            expireAfterSeconds=_TTL_7_DAYS,
            partialFilterExpression={"is_permanent": {"$ne": True}},
            background=True,
        )
        documents_col.create_index([("org_id", ASCENDING), ("sha256_hash", ASCENDING)], background=True)
        documents_col.create_index([("org_id", ASCENDING), ("uploaded_at", DESCENDING)], background=True)
    except Exception:
        pass

    # Embeddings — TTL on non-permanent chunks (7 days)
    try:
        embeddings_col.create_index(
            [("uploaded_at", ASCENDING)],
            expireAfterSeconds=_TTL_7_DAYS,
            partialFilterExpression={"is_permanent": {"$ne": True}},
            background=True,
        )
        embeddings_col.create_index([("org_id", ASCENDING), ("doc_id", ASCENDING)], background=True)
    except Exception:
        pass

    # Audit logs — 2-year retention
    try:
        audit_logs_col.create_index(
            [("timestamp", ASCENDING)],
            expireAfterSeconds=_TTL_2_YEARS,
            background=True,
        )
        audit_logs_col.create_index([("org_id", ASCENDING), ("timestamp", DESCENDING)], background=True)
        audit_logs_col.create_index([("user_id", ASCENDING)], background=True)
    except Exception:
        pass

    # AI systems
    try:
        ai_systems_col.create_index([("org_id", ASCENDING), ("updated_at", DESCENDING)], background=True)
        ai_systems_col.create_index([("org_id", ASCENDING), ("risk_tier", ASCENDING)], background=True)
    except Exception:
        pass

    # Reports
    try:
        reports_col.create_index([("org_id", ASCENDING), ("created_at", DESCENDING)], background=True)
        reports_col.create_index([("assessment_id", ASCENDING)], background=True)
    except Exception:
        pass

    # Compliance results
    try:
        compliance_results_col.create_index(
            [("org_id", ASCENDING), ("created_at", DESCENDING)], background=True
        )
        compliance_results_col.create_index([("ai_system_id", ASCENDING)], background=True)
    except Exception:
        pass

    print("✅ MongoDB indexes ensured")


try:
    _ensure_indexes()
    print(f"✅ MongoDB connected → {MONGO_DB_NAME}")
except Exception as e:
    print(f"⚠️  MongoDB index setup warning: {e}")