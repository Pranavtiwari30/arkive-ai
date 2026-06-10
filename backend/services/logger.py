"""
Structured JSON logging for Arkive AI.
Replaces all print() statements with structured, level-aware logging.
Ships to Logtail/BetterStack when LOGTAIL_SOURCE_TOKEN is set.
"""

import logging
import json
import sys
import os
from datetime import datetime, timezone
from typing import Any

# ── Optional Logtail shipping ─────────────────────────────────────────────────
try:
    from logtail import LogtailHandler  # type: ignore
    _LOGTAIL_AVAILABLE = True
except ImportError:
    _LOGTAIL_AVAILABLE = False


class _JSONFormatter(logging.Formatter):
    """Emit each log record as a single-line JSON object."""

    ENVIRONMENT = os.getenv("ENVIRONMENT", "dev")
    SERVICE = "arkive-api"

    def format(self, record: logging.LogRecord) -> str:  # noqa: D102
        payload: dict[str, Any] = {
            "ts": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "env": self.ENVIRONMENT,
            "service": self.SERVICE,
            "logger": record.name,
            "message": record.getMessage(),
        }

        # Attach any extra fields passed via log call
        for key, value in record.__dict__.items():
            if key not in (
                "name", "msg", "args", "levelname", "levelno", "pathname",
                "filename", "module", "exc_info", "exc_text", "stack_info",
                "lineno", "funcName", "created", "msecs", "relativeCreated",
                "thread", "threadName", "processName", "process", "message",
                "taskName",
            ):
                payload[key] = value

        if record.exc_info:
            payload["exception"] = self.formatException(record.exc_info)

        return json.dumps(payload, default=str)


def _build_logger(name: str) -> logging.Logger:
    log_level_str = os.getenv("LOG_LEVEL", "INFO").upper()
    level = getattr(logging, log_level_str, logging.INFO)

    logger = logging.getLogger(name)
    if logger.handlers:
        return logger  # Already configured

    logger.setLevel(level)

    # Console handler (JSON to stdout)
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(_JSONFormatter())
    logger.addHandler(handler)

    # Optional Logtail shipping
    token = os.getenv("LOGTAIL_SOURCE_TOKEN")
    if token and _LOGTAIL_AVAILABLE:
        lt_handler = LogtailHandler(source_token=token)
        logger.addHandler(lt_handler)

    logger.propagate = False
    return logger


def get_logger(name: str = "arkive") -> logging.Logger:
    """Return a configured logger. Call from any module:

        from services.logger import get_logger
        log = get_logger(__name__)
        log.info("ingestion started", extra={"doc_id": doc_id, "pages": 12})
    """
    return _build_logger(name)


# Root application logger
log = get_logger("arkive")
