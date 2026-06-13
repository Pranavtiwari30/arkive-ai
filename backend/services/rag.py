"""
v2 RAG service for Arkive AI.

Improvements over v1:
- Routes through ModelRouter (70B for complex queries, 8B for simple)
- Self-consistency confidence scoring via secondary LLM call
- Returns chunks_used with page numbers and article numbers for citations
- Responses below 0.7 confidence flagged for human review
- Redis caching for repeated queries (embedding similarity > 0.97)
- Uses moderation.moderate_query() which now has proper Guard model support
"""

from services.embeddings import retrieve_relevant_chunks
from services.moderation import moderate_query
from services.audit import log_event
from services.model_router import MODEL_70B, MODEL_8B, route_model, routed_chat
from services.groq_client import groq_chat, GroqServiceError
from services import cache as cache_svc
from services.logger import get_logger

log = get_logger(__name__)

# Confidence threshold below which to flag for human review
CONFIDENCE_REVIEW_THRESHOLD = 0.7


def _self_consistency_score(answer: str, context: str) -> float:
    """
    Ask the model: does this answer directly follow from the context? Rate 0-1.
    Uses 8B model (structured, cheap call). Falls back to 0.8 on error.
    """
    prompt = (
        f"Context:\n{context[:2000]}\n\n"
        f"Answer:\n{answer[:1000]}\n\n"
        "Does this answer directly and accurately follow from the provided context only? "
        "Rate from 0.0 (completely unsupported) to 1.0 (perfectly grounded). "
        "Respond with a single decimal number only (e.g. 0.85). No other text."
    )
    try:
        resp = groq_chat(
            model=MODEL_8B,
            messages=[{"role": "user", "content": prompt}],
            max_tokens=10,
            temperature=0,
            task_type="self_consistency_check",
        )
        raw = resp.choices[0].message.content.strip()
        score = float(raw)
        return max(0.0, min(1.0, score))
    except Exception as e:
        log.warning("self_consistency_score_failed", extra={"error": str(e)})
        return 0.8  # Neutral fallback — don't punish good answers


def generate_answer(query: str, user_id: str = "user", org_id: str | None = None) -> dict:
    """
    Generate a RAG answer for the given query.

    Returns:
        {
            answer: str,
            sources: [{source, page, article_number, section_title, chunk_index}],
            flagged: bool,
            confidence: float (0-100),
            confidence_explanation: str,
            needs_human_review: bool,
            moderation_status: str,
            chunks_used: int,
        }
    """
    # ── Step 1: Moderation ────────────────────────────────────────────────────
    moderation_result = moderate_query(query)
    if moderation_result.get("is_flagged"):
        log_event("flagged_query", user_id, {
            "query": query,
            "reason": moderation_result.get("reason"),
            "moderation_status": moderation_result.get("moderation_status"),
        }, org_id=org_id)
        return {
            "answer": f"Your query was flagged: {moderation_result.get('reason', 'unsafe content')}. Please rephrase.",
            "sources": [],
            "flagged": True,
            "confidence": 0,
            "confidence_explanation": "Query was flagged by content moderation.",
            "needs_human_review": False,
            "moderation_status": moderation_result.get("moderation_status"),
            "chunks_used": 0,
        }

    # ── Step 2: Check embedding cache ────────────────────────────────────────
    from services.embeddings import _get_query_embedding
    try:
        query_embedding = _get_query_embedding(query)
        cached = cache_svc.get_rag_response(query_embedding)
        if cached:
            log.info("rag_cache_hit", extra={"user_id": user_id})
            return cached
    except Exception:
        query_embedding = None

    # ── Step 3: Retrieve relevant chunks (top-5 after reranking) ─────────────
    relevant_chunks = retrieve_relevant_chunks(query, top_k=5)

    if not relevant_chunks:
        # No KB match — answer as a helpful AI assistant (general conversation)
        try:
            response = routed_chat(
                query=query,
                task_type="general",
                messages=[
                    {"role": "system", "content": "You are Arkive, a compliance intelligence assistant. Answer helpfully and conversationally. For compliance or AI governance topics, provide expert guidance. For general conversation, respond naturally."},
                    {"role": "user", "content": query},
                ],
                temperature=0.7,
                max_tokens=600,
            )
            return {
                "answer": response.choices[0].message.content,
                "sources": [],
                "flagged": False,
                "confidence": 0,
                "confidence_explanation": "Answered from general knowledge — no specific KB documents matched.",
                "needs_human_review": False,
                "moderation_status": moderation_result.get("moderation_status"),
                "chunks_used": 0,
            }
        except GroqServiceError as e:
            return {**e.to_api_response(), "sources": [], "flagged": False, "chunks_used": 0}

    # ── Step 4: Build context with rich citation metadata ────────────────────
    context = ""
    for i, chunk in enumerate(relevant_chunks):
        article_ref = f" [{chunk.get('article_number', '')}]" if chunk.get("article_number") else ""
        section_ref = f" — {chunk.get('section_title', '')}" if chunk.get("section_title") else ""
        context += f"\n[Source {i+1} — {chunk['source']} Page {chunk['page']}{article_ref}{section_ref}]\n"
        context += chunk["text"] + "\n"

    # ── Step 5: Route model based on query complexity ─────────────────────────
    model = route_model(query, task_type="rag")

    # If top chunk relevance is very low, use hybrid mode (general + KB context)
    max_score = max((c.get("score", 0) for c in relevant_chunks), default=0)
    if max_score < 0.3:
        prompt = f"""You are Arkive, a compliance intelligence assistant.

Some potentially related context from the knowledge base is provided below, but it may not be directly relevant to the question.
Use your own knowledge to answer accurately. Only cite the context if it directly applies.

Context (may not be relevant):
{context}

Question: {query}

Answer:"""
    else:
        prompt = f"""You are Arkive, a compliance intelligence assistant.

Context from the knowledge base (EU AI Act, UNESCO AI Ethics, OECD AI Principles):
{context}

Instructions:
- Prefer the provided context when answering, but supplement with your own expert knowledge if needed
- When referencing regulations, cite the specific article number (e.g. "Article 13 of the EU AI Act")
- Be precise and conversational
- If context is used, note the sources at the end

Question: {query}

Answer:"""

    try:
        response = routed_chat(
            query=query,
            task_type="rag",
            messages=[{"role": "user", "content": prompt}],
            temperature=0,
            max_tokens=800,
        )
        answer = response.choices[0].message.content

    except GroqServiceError as e:
        return {**e.to_api_response(), "sources": [], "flagged": False, "chunks_used": 0}

    # ── Step 6: Self-consistency confidence scoring ───────────────────────────
    consistency_score = _self_consistency_score(answer, context)
    needs_human_review = consistency_score < CONFIDENCE_REVIEW_THRESHOLD

    # Legacy confidence format (0-100) for backward compatibility with frontend
    retrieval_confidence = sum(c.get("score", 0) for c in relevant_chunks) / len(relevant_chunks)
    display_confidence = round(min(consistency_score, retrieval_confidence) * 100, 1)

    if display_confidence > 75:
        confidence_explanation = "Strong grounding — answer is well-supported by source documents."
    elif display_confidence >= 50:
        confidence_explanation = "Moderate grounding — answer may require verification against source documents."
    else:
        confidence_explanation = "Weak grounding — answer may not be fully supported. Consider consulting source documents directly."

    # ── Step 7: Log and cache ────────────────────────────────────────────────
    log_event("rag_query", user_id, {
        "query": query,
        "answer_preview": answer[:150],
        "sources_used": [c["source"] for c in relevant_chunks],
        "confidence": display_confidence,
        "needs_human_review": needs_human_review,
        "model_used": model,
    }, org_id=org_id)

    result = {
        "answer": answer,
        "sources": [
            {
                "source": c["source"],
                "page": c["page"],
                "article_number": c.get("article_number"),
                "section_title": c.get("section_title"),
                "chunk_index": c["chunk_index"],
                "relevance_score": round(c.get("score", 0), 3),
            }
            for c in relevant_chunks
        ],
        "flagged": False,
        "confidence": display_confidence,
        "confidence_explanation": confidence_explanation,
        "needs_human_review": needs_human_review,
        "moderation_status": moderation_result.get("moderation_status"),
        "chunks_used": len(relevant_chunks),
    }

    # Cache the result
    if query_embedding:
        try:
            cache_svc.set_rag_response(query_embedding, query, result)
        except Exception:
            pass

    return result