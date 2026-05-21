from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter
from db.mongo import documents_col
from datetime import datetime
import os
import fitz  # PyMuPDF
try:
    import pytesseract
    from pdf2image import convert_from_path
    OCR_AVAILABLE = True
except ImportError:
    OCR_AVAILABLE = False

def ingest_document(file_path: str, uploaded_by: str = "user", is_permanent: bool = False, password: str = None, version: str = None, source_url: str = None, supersedes: str = None):
    """
    Takes a PDF file path, extracts text (with layout sorting and OCR fallback),
    chunks it, saves metadata to MongoDB.
    """
    print(f"📄 Loading document: {file_path}")

    doc = fitz.open(file_path)
    if doc.needs_pass:
        if password and doc.authenticate(password):
            pass
        else:
            raise ValueError("PDF is password-protected. Provide a valid password.")

    pages = []
    needs_ocr = False
    
    # Try normal text extraction
    for page_num in range(len(doc)):
        # sort=True helps with multi-column layouts
        text = doc[page_num].get_text("text", sort=True).strip()
        if len(text) > 0:
            pages.append(Document(page_content=text, metadata={"page": page_num + 1}))
        else:
            needs_ocr = True

    # Fallback to OCR if pages are empty (likely scanned)
    if needs_ocr and OCR_AVAILABLE:
        print("Scanned document detected, falling back to OCR...")
        images = convert_from_path(file_path)
        pages = []
        for i, img in enumerate(images):
            text = pytesseract.image_to_string(img)
            pages.append(Document(page_content=text, metadata={"page": i + 1}))

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
        "is_permanent": is_permanent,
        "version": version,
        "source_url": source_url,
        "supersedes": supersedes
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