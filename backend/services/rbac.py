"""
RBAC (Role-Based Access Control) for Arkive AI.

Three roles:
  admin             — full access, invite/remove users, billing, audit export
  compliance_officer — create/run assessments, download reports, manage AI systems
  reviewer          — read-only: view assessments, reports, registry

All data is org-scoped — every database query must include org_id.

Usage:
    from services.rbac import require_role, get_current_user

    @router.post("/assessments")
    async def run_assessment(
        user: dict = Depends(require_role(["admin", "compliance_officer"]))
    ):
        org_id = user["org_id"]
        ...
"""

from functools import wraps
from typing import Callable
from fastapi import Depends, HTTPException, status
from middleware.auth import get_current_user

# ── Role constants ────────────────────────────────────────────────────────────
ROLE_ADMIN = "admin"
ROLE_COMPLIANCE_OFFICER = "compliance_officer"
ROLE_REVIEWER = "reviewer"

ALL_ROLES = {ROLE_ADMIN, ROLE_COMPLIANCE_OFFICER, ROLE_REVIEWER}

# Role hierarchy: each role implicitly includes the permissions of roles below it
ROLE_HIERARCHY = {
    ROLE_ADMIN: {ROLE_ADMIN, ROLE_COMPLIANCE_OFFICER, ROLE_REVIEWER},
    ROLE_COMPLIANCE_OFFICER: {ROLE_COMPLIANCE_OFFICER, ROLE_REVIEWER},
    ROLE_REVIEWER: {ROLE_REVIEWER},
}


def _user_has_role(user: dict, allowed_roles: list[str]) -> bool:
    user_role = user.get("role", ROLE_REVIEWER)
    # A user passes if their role covers any of the allowed roles
    user_permissions = ROLE_HIERARCHY.get(user_role, {user_role})
    return bool(user_permissions.intersection(set(allowed_roles)))


def require_role(allowed_roles: list[str]) -> Callable:
    """
    FastAPI dependency that enforces role-based access control.
    Returns the current user dict (including org_id) on success.

    Example:
        @router.delete("/reports/{report_id}")
        async def delete_report(
            report_id: str,
            user: dict = Depends(require_role(["admin"]))
        ):
    """
    async def _dependency(user: dict = Depends(get_current_user)) -> dict:
        if not _user_has_role(user, allowed_roles):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={
                    "error": "insufficient_permissions",
                    "message": f"This action requires one of: {', '.join(allowed_roles)}",
                    "your_role": user.get("role", "unknown"),
                },
            )
        return user

    return _dependency


def require_org_ownership(resource_org_id: str, user: dict) -> None:
    """
    Verify a user belongs to the same org as the resource they're accessing.
    Raises 403 on mismatch. Call this inside endpoint logic when org_id
    comes from the resource, not from the request.
    """
    if user.get("org_id") != resource_org_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "error": "cross_org_access_denied",
                "message": "You do not have access to this resource.",
            },
        )


# ── Convenience dependencies ──────────────────────────────────────────────────
require_admin = require_role([ROLE_ADMIN])
require_compliance_officer = require_role([ROLE_ADMIN, ROLE_COMPLIANCE_OFFICER])
require_any_role = require_role([ROLE_ADMIN, ROLE_COMPLIANCE_OFFICER, ROLE_REVIEWER])
