"""
Vector embeddings service for Arkive AI.

Uses all-MiniLM-L6-v2 (384-dimensional) for semantic search.
Stores enhanced chunk metadata (section_title, article_number, org_id)
for v2 RAG citation precision.
"""

from sentence_transformers import SentenceTransformer
from db.mongo import db
from datetime import datetime, timezone
from services.logger import get_logger

log = get_logger(__name__)

log.info("embedding_model_loading", extra={"model": "all-MiniLM-L6-v2"})
model = SentenceTransformer("all-MiniLM-L6-v2")
log.info("embedding_model_ready")

embeddings_col = db["embeddings"]


def _get_query_embedding(query: str) -> list[float]:
    """Generate embedding for a query string. Used by RAG and cache."""
    return model.encode(query).tolist()


def add_chunks_to_vector_store(chunks: list[dict], doc_id: str) -> None:
    """
    Embed and store chunks in MongoDB with full v2 metadata.

    Each chunk document stored:
        doc_id, chunk_index, text, page, source, org_id,
        section_title, article_number, is_permanent,
        embedding (384-d float array), uploaded_at
    """
    log.info("embedding_start", extra={"doc_id": doc_id, "num_chunks": len(chunks)})

    for chunk in chunks:
        embedding = model.encode(chunk["text"]).tolist()
        embeddings_col.update_one(
            {"doc_id": doc_id, "chunk_index": chunk["chunk_index"]},
            {"$set": {
                "doc_id": doc_id,
                "chunk_index": chunk["chunk_index"],
                "text": chunk["text"],
                "source": chunk["source"],
                "page": chunk["page"],
                "org_id": chunk.get("org_id"),
                "is_permanent": chunk.get("is_permanent", False),
                # v2 RAG citation fields
                "section_title": chunk.get("section_title"),
                "article_number": chunk.get("article_number"),
                "embedding": embedding,
                "uploaded_at": datetime.now(timezone.utc),
            }},
            upsert=True,
        )

    log.info("embedding_complete", extra={"doc_id": doc_id, "stored": len(chunks)})


def retrieve_relevant_chunks(
    query: str,
    top_k: int = 5,
    org_id: str | None = None,
    include_permanent: bool = True,
) -> list[dict]:
    """
    Retrieve the top-k most semantically similar chunks for a query.

    Args:
        query:            The search query
        top_k:            Number of results to return
        org_id:           Filter to org's documents + permanent knowledge base
        include_permanent: Always include permanent knowledge base (default True)

    Returns:
        List of chunk dicts with score, text, source, page, article_number, section_title
    """
    log.info("retrieval_start", extra={"query_preview": query[:60], "top_k": top_k})

    query_embedding = _get_query_embedding(query)

    # Build org-aware filter
    # Always include permanent knowledge base docs (EU AI Act, UNESCO, OECD)
    match_filter: dict = {}
    if org_id and include_permanent:
        match_filter = {"$or": [{"org_id": org_id}, {"is_permanent": True}]}
    elif org_id:
        match_filter = {"org_id": org_id}

    pipeline: list[dict] = [
        {
            "$vectorSearch": {
                "index": "vector_index",
                "path": "embedding",
                "queryVector": query_embedding,
                "numCandidates": max(top_k * 10, 50),
                "limit": top_k,
                **({"filter": match_filter} if match_filter else {}),
            }
        },
        {
            "$project": {
                "_id": 0,
                "text": 1,
                "source": 1,
                "page": 1,
                "chunk_index": 1,
                "org_id": 1,
                "section_title": 1,
                "article_number": 1,
                "is_permanent": 1,
                "score": {"$meta": "vectorSearchScore"},
            }
        },
    ]

    try:
        results = list(embeddings_col.aggregate(pipeline))
        log.info("retrieval_complete", extra={"found": len(results)})
        return results
    except Exception as e:
        log.error("retrieval_failed", extra={"error": str(e)})
        return []


def retrieve_chunks_for_doc(doc_id: str, limit: int = 20) -> list[dict]:
    """Retrieve all chunks for a specific document (used by compliance checker and red team)."""
    return list(embeddings_col.find(
        {"doc_id": doc_id},
        {"_id": 0, "text": 1, "page": 1, "chunk_index": 1, "source": 1,
         "section_title": 1, "article_number": 1},
    ).limit(limit))