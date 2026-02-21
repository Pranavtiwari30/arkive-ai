from fastapi import APIRouter
from db.mongo import audit_logs_col

router = APIRouter()

@router.get("/")
async def get_audit_logs(limit: int = 20):
    """
    Returns recent audit logs.
    """
    logs = list(audit_logs_col.find(
        {},
        {"_id": 0}
    ).sort("timestamp", -1).limit(limit))

    # Convert datetime to string for JSON
    for log in logs:
        if "timestamp" in log:
            log["timestamp"] = str(log["timestamp"])

    return {"logs": logs}