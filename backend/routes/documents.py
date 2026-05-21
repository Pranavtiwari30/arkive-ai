from fastapi import APIRouter, UploadFile, File, Depends, Form
from services.ingestion import ingest_document
from services.embeddings import add_chunks_to_vector_store
from services.audit import log_event
from db.mongo import documents_col
from middleware.auth import get_optional_user
from datetime import datetime, timedelta
import shutil, os

router = APIRouter()

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# These are permanently stored — never auto-deleted
PERMANENT_DOCS = ["unesco-ai.pdf", "oecd.pdf"]

# TTL duration for non-permanent documents
TTL_DAYS = 7

@router.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    password: str = Form(None),
    user: dict = Depends(get_optional_user)
):
    from fastapi import HTTPException
    
    user_id = user["user_id"]
    file_path = os.path.join(UPLOAD_DIR, file.filename)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # Check if this is a permanent core knowledge doc
    is_permanent = file.filename in PERMANENT_DOCS

    try:
        chunks, doc_id = ingest_document(
            file_path,
            uploaded_by=user_id,
            is_permanent=is_permanent,
            password=password
        )
    except ValueError as e:
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(status_code=403, detail=str(e))
        
    # delete local file to conserve Render's 512 MB disk space
    try:
        os.remove(file_path)
    except OSError:
        pass
    add_chunks_to_vector_store(chunks, doc_id)

    log_event("document_upload", user_id, {
        "filename": file.filename,
        "doc_id": doc_id,
        "total_chunks": len(chunks),
        "is_permanent": is_permanent
    })

    label = "permanent knowledge base" if is_permanent else "expires in 7 days"

    return {
        "message": f"'{file.filename}' uploaded! ({label})",
        "doc_id": doc_id,
        "total_chunks": len(chunks),
        "is_permanent": is_permanent
    }

@router.get("/")
async def list_documents():
    docs = list(documents_col.find({}, {"embedding": 0}))
    now = datetime.utcnow()
    for doc in docs:
        doc["doc_id"] = str(doc.pop("_id"))
        # Compute expiry info for non-permanent documents
        if not doc.get("is_permanent", False) and doc.get("uploaded_at"):
            uploaded = doc["uploaded_at"]
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
    """
    Returns the last updated timestamp for the permanent knowledge base.
    Compliance officers need this to verify knowledge base freshness.
    """
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
            "total_chunks": doc.get("total_chunks", 0)
        })

    return {
        "last_updated": str(last_updated) if last_updated else None,
        "documents": doc_list,
        "total_permanent": len(doc_list)
    }

from preload import KNOWLEDGE_BASE_METADATA

@router.get("/knowledge-base/metadata")
async def get_knowledge_base_metadata():
    return KNOWLEDGE_BASE_METADATA

@router.post("/admin/knowledge-base/update")
async def update_knowledge_base(
    file: UploadFile = File(...),
    version: str = Form(...),
    source_url: str = Form(...),
    supersedes: str = Form(None),
    password: str = Form(None),
    user: dict = Depends(get_optional_user)
):
    from fastapi import HTTPException
    
    user_id = user["user_id"]
    file_path = os.path.join(UPLOAD_DIR, file.filename)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    try:
        chunks, doc_id = ingest_document(
            file_path,
            uploaded_by=user_id,
            is_permanent=True,
            password=password,
            version=version,
            source_url=source_url,
            supersedes=supersedes
        )
    except ValueError as e:
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(status_code=403, detail=str(e))
        
    try:
        os.remove(file_path)
    except OSError:
        pass
        
    add_chunks_to_vector_store(chunks, doc_id)

    log_event("kb_update", user_id, {
        "filename": file.filename,
        "doc_id": doc_id,
        "version": version,
        "source_url": source_url,
        "supersedes": supersedes
    })

    return {
        "message": f"Knowledge base updated with '{file.filename}' (v{version})",
        "doc_id": doc_id,
        "version": version
    }