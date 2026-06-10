"""
ModelRouter — all LLM calls in Arkive go through here.

Implements dual-model routing:
  - Llama 3.3 70B (versatile): complex multi-step reasoning tasks
  - Llama 3.1 8B (instant): structured output, classification, moderation

Target: 40%+ reduction in 70B token spend while maintaining quality on complex tasks.

All routing decisions are logged. If 8B routes produce low confidence scores,
tune the complexity threshold in COMPLEXITY_THRESHOLD.
"""

import os
from services.groq_client import groq_chat, groq_chat_async, GroqServiceError
from services.logger import get_logger

log = get_logger(__name__)

# ── Model identifiers ─────────────────────────────────────────────────────────
MODEL_70B = "llama-3.3-70b-versatile"
MODEL_8B  = "llama-3.1-8b-instant"

# ── Task type routing rules ───────────────────────────────────────────────────
# Tasks that ALWAYS use the 70B model (complex reasoning required)
ALWAYS_70B: set[str] = {
    "pillar_analysis",
    "remediation",
    "red_team_synthesis",
    "framework_mapping",
    "report_generation",
    "rag_complex",
    "cross_framework_analysis",
    "self_consistency_check",
}

# Tasks that ALWAYS use the 8B model (structured output, no deep reasoning)
ALWAYS_8B: set[str] = {
    "classification",           # Risk tier classifier
    "role_classification",      # Role classifier
    "moderation",               # Content moderation
    "duplicate_check",          # Dedup detection
    "health_check",             # Health probe
    "moderation_probe",         # Guard model warmup
}

# Complexity scoring threshold for RAG queries (anything above → 70B)
COMPLEXITY_THRESHOLD = 40


def _complexity_score(query: str) -> int:
    """
    Heuristic complexity scorer for RAG queries.
    No model call required — pure text analysis.
    """
    score = len(query.split())                     # Word count baseline
    score += query.lower().count(" and ") * 3      # Multi-part questions
    score += query.lower().count("compare") * 5    # Comparative questions
    score += query.lower().count("explain") * 3    # Explanatory questions
    score += query.lower().count("why") * 4        # Reasoning questions
    score += query.lower().count("how does") * 4   # Process questions
    score += query.lower().count("article") * 2    # Specific article references
    score += query.lower().count("vs") * 5         # Comparison operators
    score += query.count("?") * 2                  # Multiple questions
    return score


def route_model(query: str, task_type: str) -> str:
    """
    Determine which model to use for a given task.

    Args:
        query:     The input text (used for complexity scoring on RAG tasks)
        task_type: The task category (see ALWAYS_70B / ALWAYS_8B sets)

    Returns:
        Model name string (MODEL_70B or MODEL_8B)
    """
    if task_type in ALWAYS_70B:
        model = MODEL_70B
        reason = "always_70b_task"
    elif task_type in ALWAYS_8B:
        model = MODEL_8B
        reason = "always_8b_task"
    else:
        # Dynamic routing for RAG queries and unspecified tasks
        score = _complexity_score(query)
        if score > COMPLEXITY_THRESHOLD:
            model = MODEL_70B
            reason = f"complexity_score_{score}_above_threshold_{COMPLEXITY_THRESHOLD}"
        else:
            model = MODEL_8B
            reason = f"complexity_score_{score}_below_threshold_{COMPLEXITY_THRESHOLD}"

    log.info(
        "model_routing_decision",
        extra={
            "task_type": task_type,
            "model": model,
            "reason": reason,
            "query_length": len(query.split()),
        },
    )
    return model


# ── Convenience wrappers ──────────────────────────────────────────────────────

def routed_chat(
    query: str,
    task_type: str,
    messages: list[dict],
    *,
    temperature: float = 0,
    max_tokens: int = 2000,
    response_format: dict | None = None,
):
    """Synchronous routed chat call."""
    model = route_model(query, task_type)
    return groq_chat(
        model=model,
        messages=messages,
        temperature=temperature,
        max_tokens=max_tokens,
        response_format=response_format,
        task_type=task_type,
    )


async def routed_chat_async(
    query: str,
    task_type: str,
    messages: list[dict],
    *,
    temperature: float = 0,
    max_tokens: int = 2000,
    response_format: dict | None = None,
):
    """Async routed chat call."""
    model = route_model(query, task_type)
    return await groq_chat_async(
        model=model,
        messages=messages,
        temperature=temperature,
        max_tokens=max_tokens,
        response_format=response_format,
        task_type=task_type,
    )
