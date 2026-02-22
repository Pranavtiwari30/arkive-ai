from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional
from services.rag import generate_answer
from db.mongo import sessions_col, messages_col
from datetime import datetime
from bson import ObjectId

router = APIRouter()

class ChatRequest(BaseModel):
    query: str
    user_id: str = "anonymous"
    session_id: Optional[str] = None

@router.post("/")
async def chat(request: ChatRequest):
    # Create session if none exists
    session_id = request.session_id
    if not session_id:
        session = {
            "user_id": request.user_id,
            "created_at": datetime.utcnow(),
            "last_active": datetime.utcnow()
        }
        result = sessions_col.insert_one(session)
        session_id = str(result.inserted_id)
    else:
        try:
            sessions_col.update_one(
                {"_id": ObjectId(session_id)},
                {"$set": {"last_active": datetime.utcnow()}}
            )
        except:
            # Invalid session_id — create new one
            session = {
                "user_id": request.user_id,
                "created_at": datetime.utcnow(),
                "last_active": datetime.utcnow()
            }
            result = sessions_col.insert_one(session)
            session_id = str(result.inserted_id)

    # Save user message
    messages_col.insert_one({
        "session_id": session_id,
        "role": "user",
        "content": request.query,
        "timestamp": datetime.utcnow()
    })

    # Generate answer
    result = generate_answer(query=request.query, user_id=request.user_id)

    # Save assistant message
    messages_col.insert_one({
        "session_id": session_id,
        "role": "assistant",
        "content": result["answer"],
        "sources": result.get("sources", []),
        "confidence": result.get("confidence", 0),
        "flagged": result.get("flagged", False),
        "timestamp": datetime.utcnow()
    })

    result["session_id"] = session_id
    return result

@router.get("/sessions/{user_id}")
async def get_sessions(user_id: str):
    sessions = list(sessions_col.find(
        {"user_id": user_id},
        {"_id": 1, "created_at": 1, "last_active": 1}
    ).sort("last_active", -1).limit(10))

    for s in sessions:
        s["_id"] = str(s["_id"])
        s["created_at"] = str(s["created_at"])
        s["last_active"] = str(s["last_active"])

    return {"sessions": sessions}

@router.get("/history/{session_id}")
async def get_history(session_id: str):
    messages = list(messages_col.find(
        {"session_id": session_id},
        {"_id": 0}
    ).sort("timestamp", 1))

    for m in messages:
        m["timestamp"] = str(m["timestamp"])

    return {"messages": messages}