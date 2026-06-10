"""
Groq API client with exponential backoff, jitter, and rate-limit handling.
All LLM calls in Arkive go through this module — never the raw Groq client.

Usage:
    from services.groq_client import groq_chat

    response = await groq_chat(
        model="llama-3.3-70b-versatile",
        messages=[...],
        temperature=0,
        max_tokens=2000,
        task_type="pillar_analysis",  # for logging
    )
"""

import os
import time
import random
import asyncio
from typing import Any

from groq import Groq, RateLimitError, APIConnectionError, APIStatusError
from services.logger import get_logger

log = get_logger(__name__)

# ── Singleton Groq client ─────────────────────────────────────────────────────
_client: Groq | None = None


def _get_client() -> Groq:
    global _client
    if _client is None:
        api_key = os.getenv("GROQ_API_KEY")
        if not api_key:
            raise RuntimeError("GROQ_API_KEY is not set")
        _client = Groq(api_key=api_key)
    return _client


# ── Retry configuration ───────────────────────────────────────────────────────
_BASE_DELAY = 1.0    # seconds
_MAX_DELAY = 30.0    # seconds
_MAX_RETRIES = 3


def _backoff(attempt: int) -> float:
    """Exponential backoff with full jitter."""
    delay = min(_BASE_DELAY * (2 ** attempt), _MAX_DELAY)
    return random.uniform(0, delay)


# ── Core chat completion wrapper ──────────────────────────────────────────────
def groq_chat(
    *,
    model: str,
    messages: list[dict],
    temperature: float = 0,
    max_tokens: int = 2000,
    response_format: dict | None = None,
    task_type: str = "unknown",
) -> Any:
    """
    Synchronous Groq chat with exponential backoff and rate-limit handling.

    Returns the raw Groq completion object on success.
    Raises GroqRateLimitError with structured metadata on persistent rate limits.
    """
    client = _get_client()

    # Approximate prompt token count for logging
    prompt_chars = sum(len(m.get("content", "")) for m in messages)
    prompt_tokens_approx = prompt_chars // 4

    kwargs: dict[str, Any] = {
        "model": model,
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens,
    }
    if response_format:
        kwargs["response_format"] = response_format

    last_error: Exception | None = None

    for attempt in range(_MAX_RETRIES + 1):
        try:
            response = client.chat.completions.create(**kwargs)
            if attempt > 0:
                log.info(
                    "groq_retry_succeeded",
                    extra={
                        "model": model,
                        "task_type": task_type,
                        "attempt": attempt,
                        "prompt_tokens_approx": prompt_tokens_approx,
                    },
                )
            return response

        except RateLimitError as e:
            last_error = e
            retry_after = _parse_retry_after(e) or 60
            log.warning(
                "groq_rate_limited",
                extra={
                    "model": model,
                    "task_type": task_type,
                    "attempt": attempt,
                    "retry_after_hint": retry_after,
                    "prompt_tokens_approx": prompt_tokens_approx,
                    "error": str(e),
                },
            )
            if attempt < _MAX_RETRIES:
                sleep_s = max(_backoff(attempt), retry_after / 2)
                log.info(f"Rate limit — sleeping {sleep_s:.1f}s before retry")
                time.sleep(sleep_s)

        except (APIConnectionError, APIStatusError) as e:
            last_error = e
            status = getattr(e, "status_code", None)
            log.warning(
                "groq_api_error",
                extra={
                    "model": model,
                    "task_type": task_type,
                    "attempt": attempt,
                    "status_code": status,
                    "error": str(e),
                    "prompt_tokens_approx": prompt_tokens_approx,
                },
            )
            if attempt < _MAX_RETRIES:
                sleep_s = _backoff(attempt)
                time.sleep(sleep_s)

        except Exception as e:
            last_error = e
            log.error(
                "groq_unexpected_error",
                extra={
                    "model": model,
                    "task_type": task_type,
                    "attempt": attempt,
                    "error": str(e),
                },
            )
            # Don't retry unexpected errors
            break

    # All retries exhausted
    raise GroqServiceError(
        message=f"Groq API unavailable after {_MAX_RETRIES} retries",
        model=model,
        task_type=task_type,
        cause=last_error,
    )


def _parse_retry_after(error: RateLimitError) -> int | None:
    """Extract retry-after seconds from rate limit error headers."""
    try:
        headers = getattr(error, "response", None) and error.response.headers
        if headers and "retry-after" in headers:
            return int(headers["retry-after"])
    except Exception:
        pass
    return None


# ── Async wrapper (non-blocking for FastAPI endpoints) ────────────────────────
async def groq_chat_async(
    *,
    model: str,
    messages: list[dict],
    temperature: float = 0,
    max_tokens: int = 2000,
    response_format: dict | None = None,
    task_type: str = "unknown",
) -> Any:
    """Async version — runs groq_chat in a thread pool to avoid blocking the event loop."""
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(
        None,
        lambda: groq_chat(
            model=model,
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens,
            response_format=response_format,
            task_type=task_type,
        ),
    )


# ── Custom exception ──────────────────────────────────────────────────────────
class GroqServiceError(Exception):
    """Raised when Groq is unavailable after all retries."""

    def __init__(self, message: str, model: str, task_type: str, cause: Exception | None = None):
        super().__init__(message)
        self.model = model
        self.task_type = task_type
        self.cause = cause

    def to_api_response(self) -> dict:
        return {
            "error": "rate_limited",
            "retry_after": 60,
            "message": "Assessment queued — results will be available shortly. Please retry in a moment.",
            "model": self.model,
            "task_type": self.task_type,
        }
