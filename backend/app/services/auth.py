import os
from datetime import datetime, timedelta, timezone

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.rbac import Feature, RolePermission, User, UserRole

# ── Configuration ────────────────────────────────────────────────────────

SECRET_KEY = os.getenv("SECRET_KEY", "change-me-in-production-use-a-random-64-char-string")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "480"))  # 8 hours

# ── Password hashing ────────────────────────────────────────────────────

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


# ── JWT tokens ───────────────────────────────────────────────────────────

def create_access_token(user_id: int, username: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {
        "sub": str(user_id),
        "username": username,
        "exp": expire,
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


# ── OAuth2 scheme ────────────────────────────────────────────────────────

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login", auto_error=False)


def get_current_user(
    token: str | None = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    """Resolve the current user from the JWT Bearer token."""
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = int(payload.get("sub", 0))
    except (JWTError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = db.query(User).filter(User.id == user_id).first()
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User not found or inactive")
    return user


def get_optional_user(
    token: str | None = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User | None:
    """Like get_current_user but returns None instead of raising if no token."""
    if not token:
        return None
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = int(payload.get("sub", 0))
    except (JWTError, ValueError):
        return None
    user = db.query(User).filter(User.id == user_id).first()
    if not user or not user.is_active:
        return None
    return user


# ── Permission checking ──────────────────────────────────────────────────


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
        role_ids = [
            ur.role_id
            for ur in db.query(UserRole).filter(UserRole.user_id == current_user.id).all()
        ]

        if not role_ids:
            raise HTTPException(status_code=403, detail="No roles assigned")

        feature = db.query(Feature).filter(Feature.code == feature_code).first()
        if not feature:
            raise HTTPException(status_code=403, detail="Access denied")

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


# ── Utility ──────────────────────────────────────────────────────────────


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
