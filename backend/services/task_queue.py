"""
TaskQueue — async task management for Arkive AI.

Wraps FastAPI BackgroundTasks with a stable interface designed to be
swapped for Celery + Redis later without changing any callers.

Architecture:
  - Tasks are enqueued via BackgroundTasks (immediate, in-process)
  - Task status stored in Redis (with in-memory fallback for dev)
  - Interface is stable: callers never import BackgroundTasks directly

Status flow:
  queued → processing → complete
                      ↘ failed

Usage:
    from services.task_queue import TaskQueue

    task_queue = TaskQueue()  # one instance per request (BackgroundTasks lifecycle)

    @router.post("/upload")
    async def upload(
        file: UploadFile,
        background_tasks: BackgroundTasks,
        user: dict = Depends(get_current_user),
    ):
        task_id = task_queue.enqueue(
            background_tasks,
            ingest_pipeline,
            file_path=saved_path,
            doc_id=doc_id,
            task_id=task_id,
        )
        return {"task_id": task_id, "status": "queued"}
"""

import uuid
import traceback
from datetime import datetime, timezone
from typing import Callable, Any
from services.logger import get_logger
from services import cache as cache_svc

log = get_logger(__name__)

# In-memory fallback for when Redis is unavailable
_task_store: dict[str, dict] = {}

# Stage labels shown to the user in the progress UI
STAGES = [
    "queued",
    "uploading",
    "extracting_text",
    "chunking",
    "embedding",
    "indexing",
    "complete",
]

STAGE_PROGRESS = {
    "queued": 0,
    "uploading": 10,
    "extracting_text": 25,
    "chunking": 45,
    "embedding": 65,
    "indexing": 85,
    "complete": 100,
    "failed": -1,
}


def _write_status(task_id: str, status: dict) -> None:
    """Write task status to Redis (primary) and in-memory (fallback)."""
    _task_store[task_id] = status
    cache_svc.set_task_status(task_id, status)


def _read_status(task_id: str) -> dict | None:
    """Read task status from Redis first, then in-memory fallback."""
    cached = cache_svc.get_task_status(task_id)
    if cached:
        return cached
    return _task_store.get(task_id)


def get_task_status(task_id: str) -> dict | None:
    """Public read — used by the status endpoint."""
    return _read_status(task_id)


def update_stage(task_id: str, stage: str, extra: dict | None = None) -> None:
    """
    Update the stage of a running task. Called from inside task functions
    to report progress to the polling frontend.

    Args:
        task_id: The task identifier
        stage:   One of STAGES (or "failed")
        extra:   Additional fields to merge into the status dict
    """
    progress = STAGE_PROGRESS.get(stage, 0)
    status: dict[str, Any] = {
        "task_id": task_id,
        "status": "failed" if stage == "failed" else (
            "complete" if stage == "complete" else "processing"
        ),
        "stage": stage,
        "progress": progress,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    if extra:
        status.update(extra)
    _write_status(task_id, status)
    log.info("task_stage_update", extra={"task_id": task_id, "stage": stage, "progress": progress})


class TaskQueue:
    """
    Thin wrapper over FastAPI BackgroundTasks.
    Interface is stable — Celery can drop in later by reimplementing enqueue().
    """

    def enqueue(
        self,
        background_tasks,  # FastAPI BackgroundTasks
        fn: Callable,
        *,
        task_id: str | None = None,
        **kwargs: Any,
    ) -> str:
        """
        Enqueue a background task.

        Args:
            background_tasks: FastAPI BackgroundTasks instance from the endpoint
            fn:  The callable to run in the background
            task_id: Optional pre-generated task ID (UUID will be generated if not given)
            **kwargs: Arguments forwarded to fn

        Returns:
            task_id: The task identifier for status polling
        """
        if task_id is None:
            task_id = str(uuid.uuid4())

        # Write initial "queued" status
        _write_status(task_id, {
            "task_id": task_id,
            "status": "queued",
            "stage": "queued",
            "progress": 0,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        })

        # Wrap fn to catch all exceptions and update status
        def _safe_run():
            try:
                fn(task_id=task_id, **kwargs)
            except Exception as e:
                log.error(
                    "background_task_failed",
                    extra={
                        "task_id": task_id,
                        "error": str(e),
                        "traceback": traceback.format_exc(),
                    },
                )
                update_stage(task_id, "failed", extra={"error": str(e)})

        background_tasks.add_task(_safe_run)
        log.info("task_enqueued", extra={"task_id": task_id, "fn": fn.__name__})
        return task_id
