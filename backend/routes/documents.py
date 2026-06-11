"""
Documents routes for Arkive AI — async upload pipeline with task status tracking.

Key changes from v1:
- Upload endpoint returns immediately with {task_id, status: "queued"}
- Ingestion runs in background via TaskQueue (BackgroundTasks now, Celery-ready)
- SHA-256 dedup: returns existing doc_id immediately if already ingested
- 100MB file size limit enforced with user-facing error
- GET /tasks/{task_id}/status for polling (frontend polls every 2s)
- All documents org-scoped via org_id
"""

import os
import uuid
import shutil
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, HTTPException, UploadFile

from db.mongo import documents_col
from middleware.auth import get_current_user
from services.audit import log_event
from services.embeddings import add_chunks_to_vector_store
from services.ingestion import (
    MAX_UPLOAD_BYTES,
    check_duplicate,
    compute_sha256,
    ingest_document,
)
from services.logger import get_logger
from services.task_queue import TaskQueue, get_task_status, update_stage

log = get_logger(__name__)
router = APIRouter()

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

PERMANENT_DOCS = {"unesco-ai.pdf", "oecd.pdf"}
TTL_DAYS = 7
MAX_MB = MAX_UPLOAD_BYTES // (1024 * 1024)


# ══════════════════════════════════════════════════════════════════════════════
# Background ingestion pipeline
# ══════════════════════════════════════════════════════════════════════════════

def _run_ingestion_pipeline(
    *,
    task_id: str,
    file_path: str,
    filename: str,
    user_id: str,
    org_id: str | None,
    is_permanent: bool,
    password: str | None,
) -> None:
    """
    Full ingestion pipeline run in the background.
    Calls update_stage() at each step so the frontend progress bar stays live.
    """
    try:
        update_stage(task_id, "extracting_text")

        def _on_progress(stage: str):
            update_stage(task_id, stage)

        chunk_data, doc_id = ingest_document(
            file_path=file_path,
            uploaded_by=user_id,
            org_id=org_id,
            is_permanent=is_permanent,
            password=password,
            on_progress=_on_progress,
        )

        update_stage(task_id, "indexing")
        add_chunks_to_vector_store(chunk_data, doc_id)

        # Clean up temp file
        if not is_permanent and os.path.exists(file_path):
            os.remove(file_path)

        log_event("document_upload", user_id, {
            "filename": filename,
            "doc_id": doc_id,
            "total_chunks": len(chunk_data),
            "is_permanent": is_permanent,
            "task_id": task_id,
        })

        update_stage(task_id, "complete", extra={
            "doc_id": doc_id,
            "filename": filename,
            "total_chunks": len(chunk_data),
        })
        log.info("ingestion_complete", extra={"task_id": task_id, "doc_id": doc_id})

    except Exception as e:
        log.error("ingestion_pipeline_error", extra={"task_id": task_id, "error": str(e)})
        if os.path.exists(file_path):
            try:
                os.remove(file_path)
            except OSError:
                pass
        raise  # TaskQueue wrapper will catch and update stage to "failed"


# ══════════════════════════════════════════════════════════════════════════════
# Routes
# ══════════════════════════════════════════════════════════════════════════════

@router.post("/upload")
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    password: str | None = Form(None),
    user: dict = Depends(get_current_user),
):
    """
    Upload a document for ingestion.
    Returns immediately with {task_id, status: "queued"}.
    Poll GET /tasks/{task_id}/status for progress.
    """
    user_id = user["user_id"]
    org_id = user.get("org_id")

    # ── File size pre-check from Content-Length header ────────────────────────
    content_length = file.size
    if content_length and content_length > MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"File too large. Maximum size is {MAX_MB}MB. Your file is {content_length // (1024*1024)}MB.",
        )

    # ── Save to disk (needed for PyMuPDF + SHA-256 before backgrounding) ─────
    task_id = str(uuid.uuid4())
    safe_name = f"{task_id}_{file.filename}"
    file_path = os.path.join(UPLOAD_DIR, safe_name)

    try:
        with open(file_path, "wb") as buf:
            shutil.copyfileobj(file.file, buf)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save uploaded file: {e}")

    # ── Enforce size after save (catches cases where Content-Length was absent) ─
    actual_size = os.path.getsize(file_path)
    if actual_size > MAX_UPLOAD_BYTES:
        os.remove(file_path)
        raise HTTPException(
            status_code=413,
            detail=f"File too large. Maximum size is {MAX_MB}MB. Your file is {actual_size // (1024*1024)}MB.",
        )

    # ── SHA-256 deduplication check ──────────────────────────────────────────
    try:
        sha256 = compute_sha256(file_path)
        existing_doc_id = check_duplicate(sha256, org_id)
    except Exception:
        existing_doc_id = None

    if existing_doc_id:
        os.remove(file_path)
        log.info("ingestion_dedup_hit", extra={"doc_id": existing_doc_id, "user_id": user_id})
        return {
            "task_id": None,
            "status": "duplicate",
            "message": "This document has already been uploaded. Using existing indexed version.",
            "doc_id": existing_doc_id,
            "duplicate": True,
        }

    # ── Enqueue background ingestion ─────────────────────────────────────────
    is_permanent = file.filename in PERMANENT_DOCS
    tq = TaskQueue()
    tq.enqueue(
        background_tasks,
        _run_ingestion_pipeline,
        task_id=task_id,
        file_path=file_path,
        filename=file.filename,
        user_id=user_id,
        org_id=org_id,
        is_permanent=is_permanent,
        password=password,
    )

    log.info("upload_queued", extra={"task_id": task_id, "filename": file.filename})
    return {
        "task_id": task_id,
        "status": "queued",
        "message": f"'{file.filename}' is being processed. Track progress with the task_id.",
        "duplicate": False,
    }


@router.get("/tasks/{task_id}/status")
async def task_status(task_id: str):
    """
    Poll ingestion task status.
    Returns: {status, stage, progress (0-100), doc_id (on complete), error (on failed)}
    Frontend polls this every 2 seconds to update the progress bar.
    """
    status = get_task_status(task_id)
    if not status:
        raise HTTPException(status_code=404, detail="Task not found or expired.")
    return status


@router.get("/")
async def list_documents(user: dict = Depends(get_current_user)):
    """List documents for the current user/org."""
    query: dict = {}
    if user.get("org_id"):
        query["org_id"] = user["org_id"]
    elif user["user_id"] != "anonymous":
        query["uploaded_by"] = user["user_id"]

    docs = list(documents_col.find(query, {"embedding": 0}).sort("uploaded_at", -1).limit(100))
    now = datetime.now(timezone.utc)

    for doc in docs:
        doc["doc_id"] = str(doc.pop("_id"))
        uploaded = doc.get("uploaded_at")
        if not doc.get("is_permanent") and uploaded:
            if uploaded.tzinfo is None:
                uploaded = uploaded.replace(tzinfo=timezone.utc)
            expires_at = uploaded + timedelta(days=TTL_DAYS)
            remaining = expires_at - now
            doc["expires_at"] = expires_at.isoformat()
            doc["days_remaining"] = max(0, remaining.days)
            doc["expiry_warning"] = remaining.days <= 2
        else:
            doc["expires_at"] = None
            doc["days_remaining"] = None
            doc["expiry_warning"] = False

    return {"documents": docs}


@router.get("/kb-status")
async def kb_status():
    """Returns the last updated timestamp for the permanent knowledge base."""
    permanent_docs = list(documents_col.find(
        {"is_permanent": True},
        {"_id": 0, "filename": 1, "uploaded_at": 1, "total_chunks": 1}
    ).sort("uploaded_at", -1))

    last_updated = None
    doc_list = []
    for doc in permanent_docs:
        uploaded = doc.get("uploaded_at")
        if uploaded and (last_updated is None or uploaded > last_updated):
            last_updated = uploaded
        doc_list.append({
            "filename": doc.get("filename"),
            "uploaded_at": str(uploaded) if uploaded else None,
            "total_chunks": doc.get("total_chunks", 0),
        })

    return {
        "last_updated": str(last_updated) if last_updated else None,
        "documents": doc_list,
        "total_permanent": len(doc_list),
    }


try:
    from preload import KNOWLEDGE_BASE_METADATA

    @router.get("/knowledge-base/metadata")
    async def get_knowledge_base_metadata():
        return KNOWLEDGE_BASE_METADATA
except ImportError:
    pass


@router.post("/admin/knowledge-base/update")
async def update_knowledge_base(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    version: str = Form(...),
    source_url: str = Form(...),
    supersedes: str | None = Form(None),
    password: str | None = Form(None),
    user: dict = Depends(get_current_user),
):
    """Admin endpoint to update the permanent knowledge base."""
    user_id = user["user_id"]
    task_id = str(uuid.uuid4())
    safe_name = f"{task_id}_{file.filename}"
    file_path = os.path.join(UPLOAD_DIR, safe_name)

    with open(file_path, "wb") as buf:
        shutil.copyfileobj(file.file, buf)

    # Knowledge base updates run synchronously (admin action, not user-facing)
    try:
        update_stage(task_id, "extracting_text")
        chunk_data, doc_id = ingest_document(
            file_path=file_path,
            uploaded_by=user_id,
            is_permanent=True,
            password=password,
            version=version,
            source_url=source_url,
            supersedes=supersedes,
        )
        add_chunks_to_vector_store(chunk_data, doc_id)
        if os.path.exists(file_path):
            os.remove(file_path)

        log_event("kb_update", user_id, {
            "filename": file.filename, "doc_id": doc_id,
            "version": version, "source_url": source_url, "supersedes": supersedes,
        })

        return {
            "message": f"Knowledge base updated with '{file.filename}' (v{version})",
            "doc_id": doc_id,
            "version": version,
        }
    except Exception as e:
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(status_code=500, detail=str(e))