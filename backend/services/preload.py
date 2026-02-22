import os
from services.ingestion import ingest_document
from services.embeddings import add_chunks_to_vector_store, collection

PRELOAD_DOCS = [
    "uploads/unesco-ai.pdf",
    "uploads/oecd.pdf"
]

def preload_knowledge_base():
    """
    Automatically loads core documents into ChromaDB on startup
    if they aren't already indexed.
    """
    # Check if already loaded
    existing = collection.count()
    if existing > 0:
        print(f"✅ Knowledge base already loaded ({existing} chunks) — skipping preload")
        return

    print("📚 Preloading knowledge base documents...")
    for path in PRELOAD_DOCS:
        if os.path.exists(path):
            chunks, doc_id = ingest_document(path, uploaded_by="system")
            add_chunks_to_vector_store(chunks, doc_id)
            print(f"✅ Preloaded: {path}")
        else:
            print(f"⚠️ File not found, skipping: {path}")

    print("✅ Knowledge base ready!")