from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.rbac import (
    Department,
    Feature,
    Role,
    RolePermission,
    User,
    UserRole,
)
from app.schemas.rbac import (
    DepartmentCreate,
    DepartmentRead,
    DepartmentUpdate,
    FeatureCreate,
    FeatureRead,
    FeatureUpdate,
    RoleCreate,
    RolePermissionRead,
    RolePermissionSet,
    RoleRead,
    RoleUpdate,
    UserCreate,
    UserRead,
    UserReadWithDept,
    UserRoleAssign,
    UserRoleRead,
    UserUpdate,
)
from app.services.auth import get_user_permissions
from app.services.audit import get_client_ip, log_action

router = APIRouter(prefix="/admin", tags=["Admin"])


# ── Departments ──────────────────────────────────────────────────────────


@router.get("/departments", response_model=list[DepartmentRead])
def list_departments(db: Session = Depends(get_db)):
    return db.query(Department).order_by(Department.name).all()


@router.post("/departments", response_model=DepartmentRead, status_code=201)
def create_department(payload: DepartmentCreate, request: Request, db: Session = Depends(get_db)):
    if db.query(Department).filter(Department.name == payload.name).first():
        raise HTTPException(status_code=409, detail="Department already exists")
    dept = Department(**payload.model_dump())
    db.add(dept)
    db.commit()
    db.refresh(dept)
    log_action(db, "CREATE", "department", resource_id=dept.id, detail={"name": dept.name}, ip_address=get_client_ip(request))
    return dept


@router.put("/departments/{department_id}", response_model=DepartmentRead)
def update_department(department_id: int, payload: DepartmentUpdate, request: Request, db: Session = Depends(get_db)):
    dept = db.query(Department).filter(Department.id == department_id).first()
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(dept, key, value)
    db.commit()
    db.refresh(dept)
    log_action(db, "UPDATE", "department", resource_id=dept.id, detail={"name": dept.name}, ip_address=get_client_ip(request))
    return dept


@router.delete("/departments/{department_id}", status_code=204)
def delete_department(department_id: int, request: Request, db: Session = Depends(get_db)):
    dept = db.query(Department).filter(Department.id == department_id).first()
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")
    log_action(db, "DELETE", "department", resource_id=dept.id, detail={"name": dept.name}, ip_address=get_client_ip(request))
    db.delete(dept)
    db.commit()


# ── Users ────────────────────────────────────────────────────────────────


@router.get("/users", response_model=list[UserReadWithDept])
def list_users(db: Session = Depends(get_db)):
    return db.query(User).order_by(User.username).all()


@router.post("/users", response_model=UserRead, status_code=201)
def create_user(payload: UserCreate, request: Request, db: Session = Depends(get_db)):
    if db.query(User).filter(User.username == payload.username).first():
        raise HTTPException(status_code=409, detail="Username already taken")
    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(status_code=409, detail="Email already taken")
    if payload.department_id:
        if not db.query(Department).filter(Department.id == payload.department_id).first():
            raise HTTPException(status_code=404, detail="Department not found")

    from app.services.auth import hash_password
    data = payload.model_dump(exclude={"password"})
    data["password_hash"] = hash_password(payload.password) if payload.password else ""
    user = User(**data)
    db.add(user)
    db.commit()
    db.refresh(user)
    log_action(db, "CREATE", "user", resource_id=user.id, detail={"username": user.username}, ip_address=get_client_ip(request))
    return user


@router.put("/users/{user_id}", response_model=UserRead)
def update_user(user_id: int, payload: UserUpdate, request: Request, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    from app.services.auth import hash_password
    for key, value in payload.model_dump(exclude_unset=True).items():
        if key == "password":
            if value:
                user.password_hash = hash_password(value)
        else:
            setattr(user, key, value)
    db.commit()
    db.refresh(user)
    log_action(db, "UPDATE", "user", resource_id=user.id, detail={"username": user.username}, ip_address=get_client_ip(request))
    return user


@router.delete("/users/{user_id}", status_code=204)
def delete_user(user_id: int, request: Request, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    log_action(db, "DELETE", "user", resource_id=user.id, detail={"username": user.username}, ip_address=get_client_ip(request))
    db.delete(user)
    db.commit()


@router.get("/users/{user_id}/permissions")
def get_user_perms(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return get_user_permissions(user_id, db)


# ── Roles ────────────────────────────────────────────────────────────────


@router.get("/roles", response_model=list[RoleRead])
def list_roles(db: Session = Depends(get_db)):
    return db.query(Role).order_by(Role.name).all()


@router.post("/roles", response_model=RoleRead, status_code=201)
def create_role(payload: RoleCreate, request: Request, db: Session = Depends(get_db)):
    if db.query(Role).filter(Role.name == payload.name).first():
        raise HTTPException(status_code=409, detail="Role already exists")
    role = Role(**payload.model_dump())
    db.add(role)
    db.commit()
    db.refresh(role)
    log_action(db, "CREATE", "role", resource_id=role.id, detail={"name": role.name}, ip_address=get_client_ip(request))
    return role


@router.put("/roles/{role_id}", response_model=RoleRead)
def update_role(role_id: int, payload: RoleUpdate, request: Request, db: Session = Depends(get_db)):
    role = db.query(Role).filter(Role.id == role_id).first()
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")
    if role.is_system_role:
        raise HTTPException(status_code=403, detail="System roles cannot be modified")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(role, key, value)
    db.commit()
    db.refresh(role)
    log_action(db, "UPDATE", "role", resource_id=role.id, detail={"name": role.name}, ip_address=get_client_ip(request))
    return role


@router.delete("/roles/{role_id}", status_code=204)
def delete_role(role_id: int, request: Request, db: Session = Depends(get_db)):
    role = db.query(Role).filter(Role.id == role_id).first()
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")
    if role.is_system_role:
        raise HTTPException(status_code=403, detail="System roles cannot be deleted")
    log_action(db, "DELETE", "role", resource_id=role.id, detail={"name": role.name}, ip_address=get_client_ip(request))
    db.delete(role)
    db.commit()


# ── Features ─────────────────────────────────────────────────────────────


@router.get("/features", response_model=list[FeatureRead])
def list_features(db: Session = Depends(get_db)):
    return db.query(Feature).order_by(Feature.module, Feature.code).all()


@router.post("/features", response_model=FeatureRead, status_code=201)
def create_feature(payload: FeatureCreate, db: Session = Depends(get_db)):
    if db.query(Feature).filter(Feature.code == payload.code).first():
        raise HTTPException(status_code=409, detail="Feature code already exists")
    feat = Feature(**payload.model_dump())
    db.add(feat)
    db.commit()
    db.refresh(feat)
    return feat


@router.put("/features/{feature_id}", response_model=FeatureRead)
def update_feature(feature_id: int, payload: FeatureUpdate, db: Session = Depends(get_db)):
    feat = db.query(Feature).filter(Feature.id == feature_id).first()
    if not feat:
        raise HTTPException(status_code=404, detail="Feature not found")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(feat, key, value)
    db.commit()
    db.refresh(feat)
    return feat


@router.delete("/features/{feature_id}", status_code=204)
def delete_feature(feature_id: int, db: Session = Depends(get_db)):
    feat = db.query(Feature).filter(Feature.id == feature_id).first()
    if not feat:
        raise HTTPException(status_code=404, detail="Feature not found")
    db.delete(feat)
    db.commit()


# ── Role Permissions (Matrix) ────────────────────────────────────────────


@router.get("/roles/{role_id}/permissions", response_model=list[RolePermissionRead])
def get_role_permissions(role_id: int, db: Session = Depends(get_db)):
    role = db.query(Role).filter(Role.id == role_id).first()
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")
    return db.query(RolePermission).filter(RolePermission.role_id == role_id).all()


@router.put("/roles/{role_id}/permissions")
def set_role_permissions(role_id: int, permissions: list[RolePermissionSet], request: Request, db: Session = Depends(get_db)):
    """Bulk-set permissions for a role. Replaces all existing permissions."""
    role = db.query(Role).filter(Role.id == role_id).first()
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")

    # Delete existing permissions for this role
    db.query(RolePermission).filter(RolePermission.role_id == role_id).delete()

    # Insert new permissions
    for perm in permissions:
        if perm.role_id != role_id:
            continue
        feat = db.query(Feature).filter(Feature.id == perm.feature_id).first()
        if not feat:
            continue
        db.add(RolePermission(
            role_id=role_id,
            feature_id=perm.feature_id,
            can_view=perm.can_view,
            can_create=perm.can_create,
            can_edit=perm.can_edit,
            can_delete=perm.can_delete,
            can_export=perm.can_export,
        ))

    db.commit()
    log_action(db, "UPDATE", "role_permissions", resource_id=role_id, detail={"role": role.name, "count": len(permissions)}, ip_address=get_client_ip(request))
    return {"status": "ok"}


# ── User Role Assignments ────────────────────────────────────────────────


@router.get("/user-roles", response_model=list[UserRoleRead])
def list_user_roles(
    user_id: int | None = Query(None),
    db: Session = Depends(get_db),
):
    query = db.query(UserRole)
    if user_id is not None:
        query = query.filter(UserRole.user_id == user_id)
    return query.all()


@router.post("/user-roles", response_model=UserRoleRead, status_code=201)
def assign_user_role(payload: UserRoleAssign, request: Request, db: Session = Depends(get_db)):
    if not db.query(User).filter(User.id == payload.user_id).first():
        raise HTTPException(status_code=404, detail="User not found")
    if not db.query(Role).filter(Role.id == payload.role_id).first():
        raise HTTPException(status_code=404, detail="Role not found")
    if payload.department_id and not db.query(Department).filter(Department.id == payload.department_id).first():
        raise HTTPException(status_code=404, detail="Department not found")

    existing = (
        db.query(UserRole)
        .filter(
            UserRole.user_id == payload.user_id,
            UserRole.role_id == payload.role_id,
            UserRole.department_id == payload.department_id,
        )
        .first()
    )
    if existing:
        raise HTTPException(status_code=409, detail="User already has this role")

    ur = UserRole(**payload.model_dump())
    db.add(ur)
    db.commit()
    db.refresh(ur)
    log_action(db, "ASSIGN_ROLE", "user_role", resource_id=ur.id, detail={"user_id": payload.user_id, "role_id": payload.role_id}, ip_address=get_client_ip(request))
    return ur


@router.delete("/user-roles/{user_role_id}", status_code=204)
def remove_user_role(user_role_id: int, request: Request, db: Session = Depends(get_db)):
    ur = db.query(UserRole).filter(UserRole.id == user_role_id).first()
    if not ur:
        raise HTTPException(status_code=404, detail="User role not found")
    log_action(db, "REMOVE_ROLE", "user_role", resource_id=ur.id, detail={"user_id": ur.user_id, "role_id": ur.role_id}, ip_address=get_client_ip(request))
    db.delete(ur)
    db.commit()


# ── Seed endpoint ────────────────────────────────────────────────────────


@router.post("/seed", tags=["Admin"])
def seed_data(db: Session = Depends(get_db)):
    """Seed default roles, features, and permissions."""
    from app.services.seed import seed_defaults
    seed_defaults(db)
    return {"status": "ok", "message": "Default data seeded"}
