from fastapi import APIRouter
from pydantic import BaseModel
from services.rag import generate_answer

router = APIRouter()

class ChatRequest(BaseModel):
    query: str
    user_id: str = "anonymous"

@router.post("/")
async def chat(request: ChatRequest):
    """
    Main chat endpoint.
    Receives a query, runs RAG pipeline, returns answer + sources.
    """
    result = generate_answer(
        query=request.query,
        user_id=request.user_id
    )
    return result