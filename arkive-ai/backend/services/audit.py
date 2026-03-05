from db.mongo import audit_logs_col
from datetime import datetime

def log_event(event_type: str, user_id: str, details: dict):
    """
    Logs every action to MongoDB audit_logs collection.
    
    event_type examples: "query", "flagged_query", "document_upload"
    """
    log = {
        "event_type": event_type,
        "user_id": user_id,
        "timestamp": datetime.utcnow(),
        "details": details
    }
    audit_logs_col.insert_one(log)
    print(f"📝 Audit log saved: [{event_type}] by {user_id}")