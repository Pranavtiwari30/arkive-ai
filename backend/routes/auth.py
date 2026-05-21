from fastapi import APIRouter, HTTPException, status, Depends
from models.auth import UserRegister, UserLogin, TokenResponse
from services.auth import register_user, authenticate_user, create_access_token
from middleware.auth import get_current_user

router = APIRouter()


@router.post("/register", response_model=TokenResponse)
async def register(request: UserRegister):
    """Register a new user and return a JWT token."""
    try:
        user = register_user(
            email=request.email,
            password=request.password,
            display_name=request.display_name,
            organisation=request.organisation
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(e)
        )

    # Generate token immediately after registration
    token = create_access_token(data={"sub": str(user["_id"])})

    return TokenResponse(
        access_token=token,
        user_id=str(user["_id"]),
        display_name=user["display_name"],
        email=user["email"]
    )


@router.post("/login", response_model=TokenResponse)
async def login(request: UserLogin):
    """Authenticate user and return a JWT token."""
    user = authenticate_user(email=request.email, password=request.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password."
        )

    token = create_access_token(data={"sub": str(user["_id"])})

    return TokenResponse(
        access_token=token,
        user_id=str(user["_id"]),
        display_name=user["display_name"],
        email=user["email"]
    )


@router.get("/me")
async def get_profile(user: dict = Depends(get_current_user)):
    """Return the current user's profile from their JWT."""
    return {
        "user_id": user["user_id"],
        "email": user["email"],
        "display_name": user["display_name"],
        "organisation": user.get("organisation")
    }
