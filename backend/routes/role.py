from fastapi import APIRouter, Depends, Request
from services.role_classifier import classify_role, RoleClassificationRequest
from middleware.auth import get_current_user

router = APIRouter()

@router.post("/")
async def classify_role_endpoint(
    request: Request,
    user: dict = Depends(get_current_user)
):
    result = classify_role(
        name=request.organization_name,
        involvement=request.involvement,
        origin=request.system_origin,
        jurisdiction_context=request.jurisdiction_context
    )
    return result
