from groq import Groq
from services.embeddings import retrieve_relevant_chunks
from services.moderation import moderate_query
from services.audit import log_event
from dotenv import load_dotenv
import os

load_dotenv()

client = Groq(api_key=os.getenv("GROQ_API_KEY"))

def generate_answer(query: str, user_id: str = "user"):
    """
    Full RAG pipeline with moderation + audit logging:
    1. Moderate the query
    2. Retrieve relevant chunks
    3. Generate grounded answer
    4. Log everything to MongoDB
    """

    # Step 1 — Moderate the query FIRST
    moderation_result = moderate_query(query)

    if moderation_result["is_flagged"]:
        # Log the flagged query
        log_event(
            event_type="flagged_query",
            user_id=user_id,
            details={
                "query": query,
                "reason": moderation_result["reason"]
            }
        )
        return {
            "answer": f"⚠️ Your query was flagged: {moderation_result['reason']}. Please rephrase.",
            "sources": [],
            "flagged": True
        }

    # Step 2 — Retrieve relevant chunks
    relevant_chunks = retrieve_relevant_chunks(query, top_k=3)

    if not relevant_chunks:
        return {
            "answer": "I couldn't find relevant information in the knowledge base.",
            "sources": [],
            "flagged": False
        }

    # Step 3 — Build context
    context = ""
    for i, chunk in enumerate(relevant_chunks):
        context += f"\n[Source {i+1} - {chunk['source']} Page {chunk['page']}]\n"
        context += chunk["text"] + "\n"

    # Step 4 — Build prompt
    prompt = f"""You are Arkive AI, a helpful assistant that answers questions based ONLY on the provided context.

Context from knowledge base:
{context}

Rules:
- Answer ONLY based on the context above
- If the answer is not in the context, say "I don't have enough information about this in the knowledge base."
- At the end of your answer, always list which sources you used
- Be concise and clear

User Question: {query}

Answer:"""

    # Step 5 — Call Groq LLM
    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.2,
        max_tokens=500
    )

    answer = response.choices[0].message.content

    # Step 6 — Log the successful query
    log_event(
        event_type="query",
        user_id=user_id,
        details={
            "query": query,
            "answer_preview": answer[:100],  # first 100 chars only
            "sources_used": [c["source"] for c in relevant_chunks],
            "chunks_retrieved": len(relevant_chunks)
        }
    )

    return {
        "answer": answer,
        "sources": [
            {
                "source": chunk["source"],
                "page": chunk["page"],
                "chunk_index": chunk["chunk_index"]
            }
            for chunk in relevant_chunks
        ],
        "flagged": False
    }