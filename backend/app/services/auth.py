from fastapi import Depends, Header, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.rbac import Feature, RolePermission, User, UserRole


def get_current_user(
    x_user_id: int = Header(..., description="ID of the authenticated user"),
    db: Session = Depends(get_db),
) -> User:
    """
    Simplified user resolution via header.
    In production, replace with JWT/OAuth token validation.
    """
    user = db.query(User).filter(User.id == x_user_id).first()
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User not found or inactive")
    return user


def require_permission(feature_code: str, action: str):
    """
    Returns a FastAPI dependency that verifies the current user
    has the given action on the given feature through any of their roles.

    Usage:
        @router.get("/orders", dependencies=[Depends(require_permission("orders", "view"))])
    """

    def checker(
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db),
    ):
        # Get all role IDs for this user
        role_ids = [
            ur.role_id
            for ur in db.query(UserRole).filter(UserRole.user_id == current_user.id).all()
        ]

        if not role_ids:
            raise HTTPException(status_code=403, detail="No roles assigned")

        # Find the feature
        feature = db.query(Feature).filter(Feature.code == feature_code).first()
        if not feature:
            # If feature doesn't exist in DB, deny by default
            raise HTTPException(status_code=403, detail="Access denied")

        # Check if any role grants the requested action
        action_column = f"can_{action}"
        perms = (
            db.query(RolePermission)
            .filter(
                RolePermission.role_id.in_(role_ids),
                RolePermission.feature_id == feature.id,
            )
            .all()
        )

        for perm in perms:
            if getattr(perm, action_column, False):
                return current_user

        raise HTTPException(status_code=403, detail="Insufficient permissions")

    return checker


def get_user_permissions(user_id: int, db: Session) -> dict:
    """
    Returns a dict of all permissions for a user:
    { "feature_code": {"view": True, "create": False, ...} }
    """
    role_ids = [
        ur.role_id
        for ur in db.query(UserRole).filter(UserRole.user_id == user_id).all()
    ]

    if not role_ids:
        return {}

    perms = (
        db.query(RolePermission)
        .join(Feature)
        .filter(RolePermission.role_id.in_(role_ids))
        .all()
    )

    result: dict[str, dict[str, bool]] = {}
    for perm in perms:
        code = perm.feature.code
        if code not in result:
            result[code] = {
                "view": False,
                "create": False,
                "edit": False,
                "delete": False,
                "export": False,
            }
        # Merge (OR) permissions from all roles
        if perm.can_view:
            result[code]["view"] = True
        if perm.can_create:
            result[code]["create"] = True
        if perm.can_edit:
            result[code]["edit"] = True
        if perm.can_delete:
            result[code]["delete"] = True
        if perm.can_export:
            result[code]["export"] = True

    return result
