from langchain_community.document_loaders import PyMuPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from db.mongo import documents_col
from datetime import datetime
import os

def ingest_document(file_path: str, uploaded_by: str = "user", is_permanent: bool = False):
    """
    Takes a PDF file path, chunks it, saves metadata to MongoDB.
    is_permanent=True means the doc never gets auto-deleted (for UNESCO/OECD etc)
    """
    print(f"📄 Loading document: {file_path}")

    loader = PyMuPDFLoader(file_path)
    pages = loader.load()
    print(f" Loaded {len(pages)} pages")

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=500,
        chunk_overlap=50
    )
    chunks = splitter.split_documents(pages)
    print(f" Split into {len(chunks)} chunks")

    doc_record = {
        "filename": os.path.basename(file_path),
        "file_path": file_path,
        "uploaded_by": uploaded_by,
        "uploaded_at": datetime.utcnow(),
        "total_pages": len(pages),
        "total_chunks": len(chunks),
        "status": "ingested",
        "is_permanent": is_permanent  # ← key flag
    }
    result = documents_col.insert_one(doc_record)
    doc_id = str(result.inserted_id)
    print(f" Saved to MongoDB with ID: {doc_id}")

    chunk_data = []
    for i, chunk in enumerate(chunks):
        chunk_data.append({
            "doc_id": doc_id,
            "chunk_index": i,
            "text": chunk.page_content,
            "page": chunk.metadata.get("page", 0),
            "source": os.path.basename(file_path),
            "is_permanent": is_permanent
        })

    return chunk_data, doc_id