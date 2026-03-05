from fastapi import APIRouter, UploadFile, File
from services.ingestion import ingest_document
from services.embeddings import add_chunks_to_vector_store
from services.audit import log_event
from db.mongo import documents_col
import shutil, os

router = APIRouter()

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# These are permanently stored — never auto-deleted
PERMANENT_DOCS = ["unesco-ai.pdf", "oecd.pdf"]

@router.post("/upload")
async def upload_document(file: UploadFile = File(...), user_id: str = "anonymous"):
    file_path = os.path.join(UPLOAD_DIR, file.filename)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # Check if this is a permanent core knowledge doc
    is_permanent = file.filename in PERMANENT_DOCS

    chunks, doc_id = ingest_document(
        file_path,
        uploaded_by=user_id,
        is_permanent=is_permanent
    )
    add_chunks_to_vector_store(chunks, doc_id)

    log_event("document_upload", user_id, {
        "filename": file.filename,
        "doc_id": doc_id,
        "total_chunks": len(chunks),
        "is_permanent": is_permanent
    })

    label = "📌 permanent knowledge base" if is_permanent else "⏳ expires in 7 days"

    return {
        "message": f"✅ '{file.filename}' uploaded! ({label})",
        "doc_id": doc_id,
        "total_chunks": len(chunks),
        "is_permanent": is_permanent
    }

@router.get("/")
async def list_documents():
    docs = list(documents_col.find({}, {"_id": 0, "embedding": 0}))
    return {"documents": docs}