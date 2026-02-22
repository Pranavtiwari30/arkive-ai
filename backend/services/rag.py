from groq import Groq
from services.embeddings import retrieve_relevant_chunks
from services.moderation import moderate_query
from services.audit import log_event
from dotenv import load_dotenv
import os

load_dotenv()

client = Groq(api_key=os.getenv("GROQ_API_KEY"))

def generate_answer(query: str, user_id: str = "user"):

    # Step 1 — Moderate
    moderation_result = moderate_query(query)
    if moderation_result["is_flagged"]:
        log_event("flagged_query", user_id, {
            "query": query,
            "reason": moderation_result["reason"]
        })
        return {
            "answer": f"⚠️ Your query was flagged: {moderation_result['reason']}. Please rephrase.",
            "sources": [],
            "flagged": True,
            "confidence": 0
        }

    # Step 2 — Retrieve
    relevant_chunks = retrieve_relevant_chunks(query, top_k=3)

    if not relevant_chunks:
        return {
            "answer": "I couldn't find relevant information in the knowledge base.",
            "sources": [],
            "flagged": False,
            "confidence": 0
        }

    # Step 3 — Calculate confidence from vector search scores
    scores = [chunk.get("score", 0) for chunk in relevant_chunks]
    avg_score = sum(scores) / len(scores) if scores else 0
    confidence = round(avg_score * 100, 1)  # convert to percentage

    # Step 4 — Build context
    context = ""
    for i, chunk in enumerate(relevant_chunks):
        context += f"\n[Source {i+1} - {chunk['source']} Page {chunk['page']}]\n"
        context += chunk["text"] + "\n"

    # Step 5 — Build prompt
    prompt = f"""You are Arkive AI, an ethical AI assistant governed by UNESCO and OECD AI principles.

Context from knowledge base:
{context}

Rules:
- Answer ONLY based on the context above
- If the answer is not in the context, say "I don't have enough information about this in the knowledge base."
- NEVER provide instructions for illegal activities, hacking, privacy violations, or harmful acts
- If a question asks HOW TO do something potentially harmful or illegal, refuse and explain why
- At the end of your answer, always list which sources you used
- Be concise and clear
- Do NOT mention which sources don't contain information. Only mention sources that ARE used.

User Question: {query}

Answer:"""

    # Step 6 — Call Groq
    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.2,
        max_tokens=500
    )
    answer = response.choices[0].message.content

    # Step 7 — Audit log
    log_event("query", user_id, {
        "query": query,
        "answer_preview": answer[:100],
        "sources_used": [c["source"] for c in relevant_chunks],
        "confidence": confidence
    })

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
        "flagged": False,
        "confidence": confidence
    }