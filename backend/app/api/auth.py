from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.rbac import User
from app.services.auth import (
    create_access_token,
    get_current_user,
    get_user_permissions,
    hash_password,
    verify_password,
)
from app.services.audit import get_client_ip, log_action

router = APIRouter(prefix="/auth", tags=["Authentication"])


class LoginRequest(BaseModel):
    username: str
    password: str


class RegisterRequest(BaseModel):
    username: str
    email: str
    full_name: str
    password: str
    department_id: int | None = None


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: int
    username: str
    full_name: str


class MeResponse(BaseModel):
    id: int
    username: str
    email: str
    full_name: str
    department_id: int | None
    is_active: bool
    permissions: dict

    model_config = {"from_attributes": True}


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, request: Request, db: Session = Depends(get_db)):
    """Authenticate user and return JWT access token."""
    user = db.query(User).filter(User.username == payload.username).first()
    if not user or not user.password_hash:
        log_action(db, "LOGIN_FAILED", "auth", detail={"username": payload.username, "reason": "not found"}, ip_address=get_client_ip(request))
        raise HTTPException(status_code=401, detail="Invalid username or password")
    if not verify_password(payload.password, user.password_hash):
        log_action(db, "LOGIN_FAILED", "auth", user_id=user.id, username=user.username, detail={"reason": "bad password"}, ip_address=get_client_ip(request))
        raise HTTPException(status_code=401, detail="Invalid username or password")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is disabled")

    log_action(db, "LOGIN", "auth", user_id=user.id, username=user.username, ip_address=get_client_ip(request))
    token = create_access_token(user.id, user.username)
    return TokenResponse(
        access_token=token,
        user_id=user.id,
        username=user.username,
        full_name=user.full_name,
    )


@router.post("/register", response_model=TokenResponse, status_code=201)
def register(payload: RegisterRequest, request: Request, db: Session = Depends(get_db)):
    """Register a new user account."""
    if db.query(User).filter(User.username == payload.username).first():
        raise HTTPException(status_code=409, detail="Username already taken")
    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(status_code=409, detail="Email already taken")

    user = User(
        username=payload.username,
        email=payload.email,
        full_name=payload.full_name,
        password_hash=hash_password(payload.password),
        department_id=payload.department_id,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    log_action(db, "REGISTER", "user", resource_id=user.id, username=user.username, user_id=user.id, ip_address=get_client_ip(request))
    token = create_access_token(user.id, user.username)
    return TokenResponse(
        access_token=token,
        user_id=user.id,
        username=user.username,
        full_name=user.full_name,
    )


@router.get("/me", response_model=MeResponse)
def get_me(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Get current user profile and effective permissions."""
    permissions = get_user_permissions(current_user.id, db)
    return MeResponse(
        id=current_user.id,
        username=current_user.username,
        email=current_user.email,
        full_name=current_user.full_name,
        department_id=current_user.department_id,
        is_active=current_user.is_active,
        permissions=permissions,
    )


class ProfileUpdate(BaseModel):
    full_name: str | None = None
    email: str | None = None


class PasswordChange(BaseModel):
    current_password: str
    new_password: str


@router.put("/profile", response_model=MeResponse)
def update_profile(
    payload: ProfileUpdate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update own profile (name, email)."""
    if payload.email and payload.email != current_user.email:
        if db.query(User).filter(User.email == payload.email, User.id != current_user.id).first():
            raise HTTPException(status_code=409, detail="Email already taken")
        current_user.email = payload.email
    if payload.full_name:
        current_user.full_name = payload.full_name
    db.commit()
    db.refresh(current_user)
    log_action(db, "PROFILE_UPDATE", "user", resource_id=current_user.id, user_id=current_user.id, username=current_user.username, ip_address=get_client_ip(request))
    permissions = get_user_permissions(current_user.id, db)
    return MeResponse(
        id=current_user.id,
        username=current_user.username,
        email=current_user.email,
        full_name=current_user.full_name,
        department_id=current_user.department_id,
        is_active=current_user.is_active,
        permissions=permissions,
    )


@router.put("/change-password")
def change_password(
    payload: PasswordChange,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Change own password. Requires current password verification."""
    if not verify_password(payload.current_password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="Aktuelles Passwort ist falsch")
    if len(payload.new_password) < 4:
        raise HTTPException(status_code=400, detail="Neues Passwort muss mindestens 4 Zeichen lang sein")
    current_user.password_hash = hash_password(payload.new_password)
    db.commit()
    log_action(db, "PASSWORD_CHANGE", "user", resource_id=current_user.id, user_id=current_user.id, username=current_user.username, ip_address=get_client_ip(request))
    return {"status": "ok", "message": "Passwort erfolgreich geändert"}
