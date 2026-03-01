import os
from services.embeddings import embeddings_col, add_chunks_to_vector_store
from services.ingestion import ingest_document

PRELOAD_DOCS = [
    {"path": "uploads/unesco-ai.pdf", "name": "UNESCO AI Ethics"},
    {"path": "uploads/oecd.pdf", "name": "OECD AI Principles"},
    {"path": "uploads/eu-ai-act.pdf", "name": "EU AI Act 2024"},
]

def preload_knowledge_base():
    for doc in PRELOAD_DOCS:
        path = doc["path"]
        name = doc["name"]

        if not os.path.exists(path):
            print(f"WARNING: {path} not found — skipping {name}")
            continue

        filename = os.path.basename(path)
        already = embeddings_col.count_documents({"source": filename})

        if already > 0:
            print(f"Already indexed: {name} ({already} chunks) — skipping")
            continue

        print(f"Indexing: {name}...")
        chunk_data, doc_id = ingest_document(path, uploaded_by="system", is_permanent=True)
        add_chunks_to_vector_store(chunk_data, doc_id)
        print(f"Done: {name}")

    print("Knowledge base ready.")