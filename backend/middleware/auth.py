from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from services.auth import decode_token, get_user_by_id
from jose import JWTError

# HTTP Bearer token scheme
security = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> dict:
    """
    FastAPI dependency that extracts and validates the JWT from the Authorization header.
    Returns the user profile dict (including role and org_id) or raises 401.

    Usage in routes:
        @router.post("/endpoint")
        async def endpoint(user: dict = Depends(get_current_user)):
            user_id = user["user_id"]
            org_id  = user["org_id"]
    """
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please log in.",
            headers={"WWW-Authenticate": "Bearer"}
        )

    token = credentials.credentials

    try:
        payload = decode_token(token)
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token: missing user identifier.",
                headers={"WWW-Authenticate": "Bearer"}
            )
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token. Please log in again.",
            headers={"WWW-Authenticate": "Bearer"}
        )

    # Fetch user from DB to ensure they still exist
    user = get_user_by_id(user_id)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account not found.",
            headers={"WWW-Authenticate": "Bearer"}
        )

    return {
        "user_id": str(user["_id"]),
        "email": user["email"],
        "display_name": user["display_name"],
        "organisation": user.get("organisation"),
        # RBAC + org-scoping fields
        "role": user.get("role", "compliance_officer"),  # default for legacy users
        "org_id": user.get("org_id"),
        "disclaimer_acknowledged_at": user.get("disclaimer_acknowledged_at"),
    }


async def get_optional_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> dict:
    """
    Optional auth dependency — returns user dict if valid token present,
    or a fallback anonymous user if no token. Used during migration where
    some endpoints need to work both authenticated and unauthenticated.
    """
    if credentials is None:
        return {
            "user_id": "anonymous",
            "email": None,
            "display_name": "Anonymous",
            "organisation": None,
            "role": "reviewer",
            "org_id": None,
            "disclaimer_acknowledged_at": None,
        }

    try:
        return await get_current_user(credentials)
    except HTTPException:
        return {
            "user_id": "anonymous",
            "email": None,
            "display_name": "Anonymous",
            "organisation": None,
            "role": "reviewer",
            "org_id": None,
            "disclaimer_acknowledged_at": None,
        }
