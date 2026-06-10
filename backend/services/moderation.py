"""
Content moderation service for Arkive AI.

Strategy (defence-in-depth):
1. Fast keyword pre-filter for obvious violations
2. LLM-based classifier using Groq (llama-3.1-8b-instant as custom classifier)
   — attempts llama-guard-4-12b if available, falls back gracefully
3. On ANY moderation API failure → allow through with moderation_status: "fallback_allowed"
   (never block a user because the moderation layer had an outage)

Fallback policy: log failure with full context, allow request, flag for human review.
"""

import os
from services.groq_client import groq_chat, GroqServiceError
from services.logger import get_logger

log = get_logger(__name__)

# ── Available Guard models in order of preference ─────────────────────────────
# Update this list as Groq's catalog evolves.
_GUARD_MODELS_PREFERRED = [
    "meta-llama/llama-guard-4-12b",
    "meta-llama/llama-guard-3-11b-vision-instruct",
    "meta-llama/llama-guard-3-8b",
]
_FALLBACK_CLASSIFIER_MODEL = "llama-3.1-8b-instant"

# Discovered at startup — set to None if no Guard model is available
_active_guard_model: str | None = None
_guard_model_checked: bool = False


def _discover_guard_model() -> str | None:
    """Try each Guard model with a minimal test call to find which one is live."""
    global _active_guard_model, _guard_model_checked
    if _guard_model_checked:
        return _active_guard_model

    for model in _GUARD_MODELS_PREFERRED:
        try:
            resp = groq_chat(
                model=model,
                messages=[{"role": "user", "content": "Hello"}],
                max_tokens=5,
                task_type="moderation_probe",
            )
            if resp and resp.choices:
                log.info("guard_model_discovered", extra={"model": model})
                _active_guard_model = model
                _guard_model_checked = True
                return model
        except Exception as e:
            log.info("guard_model_unavailable", extra={"model": model, "error": str(e)})

    log.warning("no_guard_model_available", extra={"fallback": _FALLBACK_CLASSIFIER_MODEL})
    _guard_model_checked = True
    return None


# ── Keyword pre-filter (fast, no API call) ────────────────────────────────────
_BLOCKED_KEYWORDS = [
    "bomb", "weapon", "kill humans", "terrorism", "child abuse",
    "create malware", "synthesize drugs",
]

# Do NOT block: hack/exploit/bypass/fraud — legitimate EU AI Act compliance
# discussion uses these terms. Only block truly harmful content.

def _keyword_check(query: str) -> tuple[bool, str | None]:
    q = query.lower()
    for phrase in _BLOCKED_KEYWORDS:
        if phrase in q:
            return True, f"keyword: {phrase}"
    return False, None


# ── Guard model classifier ────────────────────────────────────────────────────
_GUARD_SYSTEM_PROMPT = """You are a content safety classifier for an EU AI Act compliance platform.
Users ask about AI ethics, bias, compliance gaps, regulatory risks, and governance challenges.
These topics are the CORE PURPOSE of the platform and must ALWAYS be classified as SAFE.

Classify the user input as SAFE or UNSAFE.
UNSAFE categories: direct violence instructions, CSAM, weapons of mass destruction synthesis,
targeted harassment, active exploitation of real vulnerabilities.

Output exactly one line: SAFE or UNSAFE: <category>
Do not explain. Do not add context. One line only."""

_CUSTOM_CLASSIFIER_SYSTEM_PROMPT = """You are a strict AI safety classifier for an EU AI Act compliance platform.
The platform helps organisations check AI policies against regulations like the EU AI Act.
Users may legitimately ask about AI risks, compliance gaps, adversarial prompts, governance challenges,
bias in AI, data privacy violations, and regulatory non-compliance. These are SAFE and core to the platform.

Classify the user input into ONLY one of the following:
SAFE
UNSAFE: <category>

Categories: violence, csam, weapons_synthesis, targeted_harassment, active_exploitation

IMPORTANT: Questions about AI ethics, compliance, regulations, risk assessment, red-teaming,
adversarial prompts, jailbreaks (in a research context), and policy gaps are SAFE.
Only flag content that is genuinely harmful per the categories above.
Do not explain. Output exactly one line."""


def _call_guard_model(query: str, model: str) -> dict:
    """Call a Guard model with its expected prompt format."""
    try:
        resp = groq_chat(
            model=model,
            messages=[
                {"role": "system", "content": _GUARD_SYSTEM_PROMPT},
                {"role": "user", "content": query},
            ],
            max_tokens=30,
            temperature=0,
            task_type="moderation",
        )
        result = resp.choices[0].message.content.strip().lower()
        log.info("guard_model_result", extra={"model": model, "result": result[:50]})

        if result.startswith("unsafe"):
            category = result.split(":")[-1].strip() if ":" in result else "unsafe_content"
            return {"is_flagged": True, "reason": category, "moderation_status": "flagged_by_guard"}

        return {"is_flagged": False, "reason": None, "moderation_status": "cleared_by_guard"}

    except GroqServiceError:
        raise  # Re-raise to trigger fallback in caller
    except Exception as e:
        log.error("guard_model_error", extra={"model": model, "error": str(e)})
        raise


def _call_custom_classifier(query: str) -> dict:
    """Fallback: use llama-3.1-8b-instant with a custom safety classifier prompt."""
    try:
        resp = groq_chat(
            model=_FALLBACK_CLASSIFIER_MODEL,
            messages=[
                {"role": "system", "content": _CUSTOM_CLASSIFIER_SYSTEM_PROMPT},
                {"role": "user", "content": query},
            ],
            max_tokens=20,
            temperature=0,
            task_type="moderation",
        )
        result = resp.choices[0].message.content.strip().lower()
        log.info("custom_classifier_result", extra={"result": result[:50]})

        if "unsafe" in result:
            category = result.split(":")[-1].strip() if ":" in result else "unsafe_content"
            return {"is_flagged": True, "reason": category, "moderation_status": "flagged_by_classifier"}

        return {"is_flagged": False, "reason": None, "moderation_status": "cleared_by_classifier"}

    except Exception as e:
        log.error("custom_classifier_error", extra={"error": str(e)})
        raise


# ── Public interface ──────────────────────────────────────────────────────────
def moderate_query(query: str) -> dict:
    """
    Run the full moderation pipeline on a user query.

    Returns:
        {
            "is_flagged": bool,
            "reason": str | None,
            "moderation_status": "cleared_by_guard" | "cleared_by_classifier" |
                                 "flagged_by_guard" | "flagged_by_classifier" |
                                 "flagged_by_keyword" | "fallback_allowed"
        }
    """
    # Step 1: Fast keyword pre-filter
    flagged, reason = _keyword_check(query)
    if flagged:
        log.info("moderation_keyword_block", extra={"reason": reason})
        return {"is_flagged": True, "reason": reason, "moderation_status": "flagged_by_keyword"}

    # Step 2: Discover and try Guard model
    guard_model = _discover_guard_model()
    if guard_model:
        try:
            return _call_guard_model(query, guard_model)
        except Exception as e:
            log.warning(
                "guard_model_failed_using_custom_classifier",
                extra={"model": guard_model, "error": str(e)},
            )

    # Step 3: Fallback to custom classifier with llama-3.1-8b
    try:
        return _call_custom_classifier(query)
    except Exception as e:
        # Step 4: Final fallback — allow through, never block on outage
        log.error(
            "moderation_complete_failure_fallback_allow",
            extra={
                "error": str(e),
                "query_preview": query[:100],
                "policy": "fallback_allowed — moderation layer had an outage",
            },
        )
        return {
            "is_flagged": False,
            "reason": None,
            "moderation_status": "fallback_allowed",
        }