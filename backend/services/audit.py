"""
Audit logging service for Arkive AI.

Logs all significant events with:
- Timestamp (UTC ISO 8601)
- User ID + email
- Organization ID
- Action type
- Payload (assessment results, file metadata, etc.)
- IP address (when available — passed from request context)
- Session ID

Feeds into the tamper-evident audit log export (Phase 4.3).
"""

from datetime import datetime, timezone
from db.mongo import audit_logs_col
from services.logger import get_logger

log = get_logger(__name__)


def log_event(
    event_type: str,
    user_id: str,
    data: dict,
    *,
    org_id: str | None = None,
    user_email: str | None = None,
    ai_system_id: str | None = None,
    ip_address: str | None = None,
    session_id: str | None = None,
) -> None:
    """
    Write an audit log entry to MongoDB.

    Args:
        event_type:   Identifier for the action (e.g. "compliance_check", "document_upload")
        user_id:      The acting user's ID
        data:         Arbitrary payload dict (assessment results, file info, etc.)
        org_id:       Organization the event belongs to
        user_email:   User's email address
        ai_system_id: AI system this event relates to (if applicable)
        ip_address:   Client IP address
        session_id:   JWT session identifier
    """
    entry = {
        "event_type": event_type,
        "user_id": user_id,
        "user_email": user_email,
        "org_id": org_id,
        "ai_system_id": ai_system_id,
        "ip_address": ip_address,
        "session_id": session_id,
        "timestamp": datetime.now(timezone.utc),
        "data": data,
    }

    try:
        audit_logs_col.insert_one(entry)
        log.info(
            "audit_event",
            extra={
                "event_type": event_type,
                "user_id": user_id,
                "org_id": org_id,
            },
        )
    except Exception as e:
        # Audit log failure must never crash the main flow
        log.error("audit_log_write_failed", extra={"event_type": event_type, "error": str(e)})