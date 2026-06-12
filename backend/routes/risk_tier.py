from fastapi import APIRouter, Depends
from services.risk_classifier import classify_risk_tier, RiskClassificationRequest
from middleware.auth import get_current_user

router = APIRouter()

@router.post("/")
async def classify_risk_tier_endpoint(
    request: RiskClassificationRequest,
    user: dict = Depends(get_current_user)
):
    result = classify_risk_tier(
        description=request.system_description,
        purpose=request.intended_purpose,
        data=request.data_used,
        jurisdiction_context=request.jurisdiction_context
    )
    return result
