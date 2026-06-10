"""
Redis caching service for Arkive AI.
Provides classification result caching and RAG response caching.

Falls back gracefully to no-op when Redis is unavailable or disabled,
so the application works in dev without Redis running.
"""

import os
import json
import hashlib
import numpy as np
from typing import Any
from datetime import timedelta
from services.logger import get_logger

log = get_logger(__name__)

# ── Redis client initialization ───────────────────────────────────────────────
_redis_client = None
_REDIS_ENABLED = os.getenv("ENABLE_REDIS_CACHE", "true").lower() == "true"

def _get_redis():
    global _redis_client
    if _redis_client is not None:
        return _redis_client

    if not _REDIS_ENABLED:
        return None

    redis_url = os.getenv("REDIS_URL", "redis://localhost:6379")
    try:
        import redis
        client = redis.from_url(redis_url, decode_responses=True, socket_connect_timeout=3)
        client.ping()
        _redis_client = client
        log.info("redis_connected", extra={"url": redis_url.split("@")[-1]})  # Don't log credentials
        return _redis_client
    except Exception as e:
        log.warning("redis_unavailable", extra={"error": str(e), "fallback": "no-op cache"})
        return None


# ── TTL constants (from env or defaults) ─────────────────────────────────────
TTL_CLASSIFICATION = int(os.getenv("REDIS_TTL_CLASSIFICATION", "3600"))   # 1 hour
TTL_RAG = int(os.getenv("REDIS_TTL_RAG", "86400"))                        # 24 hours
TTL_TASK = 86400                                                           # 1 day for task status
TTL_HEALTH = 30                                                            # 30s for health cache

# ── Cosine similarity threshold for RAG cache hits ───────────────────────────
RAG_SIMILARITY_THRESHOLD = 0.97


# ══════════════════════════════════════════════════════════════════════════════
# Classification cache — keyed by (doc_hash, model_version, task_type)
# ══════════════════════════════════════════════════════════════════════════════

def make_classification_key(doc_hash: str, model_version: str, task_type: str) -> str:
    raw = f"cls:{task_type}:{doc_hash}:{model_version}"
    return hashlib.sha256(raw.encode()).hexdigest()[:40]


def get_classification(doc_hash: str, model_version: str, task_type: str) -> dict | None:
    r = _get_redis()
    if not r:
        return None
    key = make_classification_key(doc_hash, model_version, task_type)
    try:
        cached = r.get(key)
        if cached:
            log.info("cache_hit_classification", extra={"task_type": task_type})
            return json.loads(cached)
    except Exception as e:
        log.warning("cache_get_error", extra={"error": str(e)})
    return None


def set_classification(doc_hash: str, model_version: str, task_type: str, result: dict) -> None:
    r = _get_redis()
    if not r:
        return
    key = make_classification_key(doc_hash, model_version, task_type)
    try:
        r.setex(key, TTL_CLASSIFICATION, json.dumps(result, default=str))
        log.info("cache_set_classification", extra={"task_type": task_type, "ttl": TTL_CLASSIFICATION})
    except Exception as e:
        log.warning("cache_set_error", extra={"error": str(e)})


# ══════════════════════════════════════════════════════════════════════════════
# RAG response cache — keyed by query embedding similarity
# Stores embedding → response mappings; hits when cosine similarity > 0.97
# ══════════════════════════════════════════════════════════════════════════════

def _cosine_similarity(a: list[float], b: list[float]) -> float:
    va, vb = np.array(a), np.array(b)
    denom = np.linalg.norm(va) * np.linalg.norm(vb)
    return float(np.dot(va, vb) / denom) if denom > 0 else 0.0


def get_rag_response(query_embedding: list[float], top_k: int = 3) -> dict | None:
    """
    Look for a cached RAG response whose query embedding is >= 0.97 cosine
    similarity to the current query. Returns the cached response or None.
    """
    r = _get_redis()
    if not r:
        return None
    try:
        # Scan cached RAG keys — only feasible at small scale; replace with
        # vector-aware cache (e.g. Redis Stack / Upstash Vector) at scale.
        keys = r.keys("rag:*")
        for key in keys[:200]:  # Cap scan to avoid blocking
            raw = r.get(key)
            if not raw:
                continue
            entry = json.loads(raw)
            cached_emb = entry.get("query_embedding")
            if not cached_emb:
                continue
            sim = _cosine_similarity(query_embedding, cached_emb)
            if sim >= RAG_SIMILARITY_THRESHOLD:
                log.info("cache_hit_rag", extra={"similarity": round(sim, 4)})
                return entry.get("response")
    except Exception as e:
        log.warning("cache_rag_get_error", extra={"error": str(e)})
    return None


def set_rag_response(query_embedding: list[float], query: str, response: dict) -> None:
    r = _get_redis()
    if not r:
        return
    key_hash = hashlib.sha256(str(query_embedding[:8]).encode()).hexdigest()[:16]
    key = f"rag:{key_hash}"
    try:
        payload = json.dumps({
            "query": query,
            "query_embedding": query_embedding,
            "response": response,
        }, default=str)
        r.setex(key, TTL_RAG, payload)
        log.info("cache_set_rag", extra={"ttl": TTL_RAG})
    except Exception as e:
        log.warning("cache_rag_set_error", extra={"error": str(e)})


# ══════════════════════════════════════════════════════════════════════════════
# Task status cache (used by TaskQueue)
# ══════════════════════════════════════════════════════════════════════════════

def set_task_status(task_id: str, status: dict) -> None:
    r = _get_redis()
    if not r:
        return
    try:
        r.setex(f"task:{task_id}", TTL_TASK, json.dumps(status, default=str))
    except Exception as e:
        log.warning("cache_task_set_error", extra={"error": str(e)})


def get_task_status(task_id: str) -> dict | None:
    r = _get_redis()
    if not r:
        return None
    try:
        raw = r.get(f"task:{task_id}")
        return json.loads(raw) if raw else None
    except Exception as e:
        log.warning("cache_task_get_error", extra={"error": str(e)})
        return None


# ══════════════════════════════════════════════════════════════════════════════
# Health check
# ══════════════════════════════════════════════════════════════════════════════

def redis_healthy() -> bool:
    r = _get_redis()
    if not r:
        return False
    try:
        return r.ping()
    except Exception:
        return False
