from fastapi import APIRouter, Depends
from services.role_classifier import classify_role, RoleClassificationRequest
from middleware.auth import get_optional_user

router = APIRouter()

@router.post("/classify")
async def classify_org_role(
    request: RoleClassificationRequest,
    user: dict = Depends(get_optional_user)
):
    result = classify_role(
        name=request.organization_name,
        involvement=request.involvement,
        origin=request.system_origin,
        jurisdiction_context=request.jurisdiction_context
    )
    return result
