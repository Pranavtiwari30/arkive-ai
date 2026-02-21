import chromadb
from sentence_transformers import SentenceTransformer
import os

# Load the embedding model (downloads once, then cached)
print("🔄 Loading embedding model...")
model = SentenceTransformer('all-MiniLM-L6-v2')
print("✅ Embedding model loaded!")

# Set up ChromaDB with persistent storage
chroma_client = chromadb.PersistentClient(path="./chroma_db")
collection = chroma_client.get_or_create_collection(
    name="arkive_chunks",
    metadata={"hnsw:space": "cosine"}  # cosine similarity for text
)

def add_chunks_to_vector_store(chunks: list, doc_id: str):
    """
    Takes chunks from ingestion, generates embeddings, stores in ChromaDB.
    chunks = list of dicts with 'text', 'chunk_index', 'source'
    """
    print(f"⚙️  Generating embeddings for {len(chunks)} chunks...")

    texts = [chunk["text"] for chunk in chunks]
    embeddings = model.encode(texts, show_progress_bar=True).tolist()

    ids = [f"{doc_id}_chunk_{chunk['chunk_index']}" for chunk in chunks]

    metadatas = [{
        "doc_id": chunk["doc_id"],
        "chunk_index": chunk["chunk_index"],
        "source": chunk["source"],
        "page": chunk["page"]
    } for chunk in chunks]

    # Store everything in ChromaDB
    collection.add(
        embeddings=embeddings,
        documents=texts,
        metadatas=metadatas,
        ids=ids
    )

    print(f"✅ {len(chunks)} chunks stored in ChromaDB!")
    return ids

def retrieve_relevant_chunks(query: str, top_k: int = 3):
    """
    Takes a user query, finds the most semantically similar chunks.
    Returns list of relevant text chunks with their sources.
    """
    print(f"🔍 Searching for: '{query}'")

    query_embedding = model.encode([query]).tolist()

    results = collection.query(
        query_embeddings=query_embedding,
        n_results=top_k
    )

    chunks = []
    for i in range(len(results["documents"][0])):
        chunks.append({
            "text": results["documents"][0][i],
            "source": results["metadatas"][0][i]["source"],
            "page": results["metadatas"][0][i]["page"],
            "chunk_index": results["metadatas"][0][i]["chunk_index"]
        })

    print(f"✅ Found {len(chunks)} relevant chunks!")
    return chunks