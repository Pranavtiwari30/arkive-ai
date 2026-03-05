from sentence_transformers import SentenceTransformer
from db.mongo import db
from datetime import datetime

print("🔄 Loading embedding model...")
model = SentenceTransformer('all-MiniLM-L6-v2')
print(" Embedding model loaded!")

embeddings_col = db["embeddings"]

# TTL index on embeddings — auto delete non-permanent after 7 days
try:
    embeddings_col.create_index(
        "uploaded_at",
        expireAfterSeconds=604800,
        partialFilterExpression={"is_permanent": {"$ne": True}}
    )
except:
    pass

def add_chunks_to_vector_store(chunks: list, doc_id: str):
    """
    Generates embeddings and stores in MongoDB Atlas.
    """
    print(f"⚙️  Generating embeddings for {len(chunks)} chunks...")

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
                "embedding": embedding,
                "is_permanent": chunk.get("is_permanent", False),
                "uploaded_at": datetime.utcnow()
            }},
            upsert=True
        )

    print(f" {len(chunks)} chunks stored in MongoDB!")

def retrieve_relevant_chunks(query: str, top_k: int = 3):
    """
    Semantic search using MongoDB Atlas Vector Search.
    """
    print(f" Searching for: '{query}'")

    query_embedding = model.encode(query).tolist()

    pipeline = [
        {
            "$vectorSearch": {
                "index": "vector_index",
                "path": "embedding",
                "queryVector": query_embedding,
                "numCandidates": 50,
                "limit": top_k
            }
        },
        {
            "$project": {
                "_id": 0,
                "text": 1,
                "source": 1,
                "page": 1,
                "chunk_index": 1,
                "score": {"$meta": "vectorSearchScore"}
            }
        }
    ]

    results = list(embeddings_col.aggregate(pipeline))
    print(f" Found {len(results)} relevant chunks!")
    return results