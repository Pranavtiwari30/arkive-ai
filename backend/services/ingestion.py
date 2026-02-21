from langchain_community.document_loaders import PyMuPDFLoader
from db.mongo import documents_col
from langchain_text_splitters import RecursiveCharacterTextSplitter
from datetime import datetime
import os

def ingest_document(file_path: str, uploaded_by: str = "user"):
    """
    Takes a PDF file path, chunks it, and saves metadata to MongoDB.
    Returns the list of chunks.
    """

    print(f"📄 Loading document: {file_path}")

    # Step 1 — Load the PDF
    loader = PyMuPDFLoader(file_path)
    pages = loader.load()
    print(f"✅ Loaded {len(pages)} pages")

    # Step 2 — Split into chunks
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=500,       # each chunk = ~500 characters
        chunk_overlap=50      # chunks overlap by 50 chars so context isn't lost
    )
    chunks = splitter.split_documents(pages)
    print(f"✅ Split into {len(chunks)} chunks")

    # Step 3 — Save document metadata to MongoDB
    doc_record = {
        "filename": os.path.basename(file_path),
        "file_path": file_path,
        "uploaded_by": uploaded_by,
        "uploaded_at": datetime.utcnow(),
        "total_pages": len(pages),
        "total_chunks": len(chunks),
        "status": "ingested"
    }
    result = documents_col.insert_one(doc_record)
    doc_id = str(result.inserted_id)
    print(f"✅ Saved document metadata to MongoDB with ID: {doc_id}")

    # Step 4 — Return chunks with their metadata
    chunk_data = []
    for i, chunk in enumerate(chunks):
        chunk_data.append({
            "doc_id": doc_id,
            "chunk_index": i,
            "text": chunk.page_content,
            "page": chunk.metadata.get("page", 0),
            "source": os.path.basename(file_path)
        })

    return chunk_data, doc_id