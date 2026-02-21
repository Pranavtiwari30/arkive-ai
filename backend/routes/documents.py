from fastapi import APIRouter, UploadFile, File
from services.ingestion import ingest_document
from services.embeddings import add_chunks_to_vector_store
from services.audit import log_event
from db.mongo import documents_col
import shutil, os

router = APIRouter()

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/upload")
async def upload_document(file: UploadFile = File(...), user_id: str = "anonymous"):
    """
    Upload a PDF, chunk it, embed it, store in ChromaDB + MongoDB.
    """
    # Save file to uploads/
    file_path = os.path.join(UPLOAD_DIR, file.filename)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # Ingest + embed
    chunks, doc_id = ingest_document(file_path, uploaded_by=user_id)
    add_chunks_to_vector_store(chunks, doc_id)

    # Audit log
    log_event("document_upload", user_id, {
        "filename": file.filename,
        "doc_id": doc_id,
        "total_chunks": len(chunks)
    })

    return {
        "message": f"✅ Document '{file.filename}' uploaded successfully!",
        "doc_id": doc_id,
        "total_chunks": len(chunks)
    }

@router.get("/")
async def list_documents():
    """
    Returns all uploaded documents.
    """
    docs = list(documents_col.find({}, {"_id": 0}))
    return {"documents": docs}