from datetime import datetime

from pydantic import BaseModel


# ── Department ───────────────────────────────────────────────────────────


class DepartmentCreate(BaseModel):
    name: str
    description: str | None = None


class DepartmentUpdate(BaseModel):
    name: str | None = None
    description: str | None = None


class DepartmentRead(BaseModel):
    id: int
    name: str
    description: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


# ── User ─────────────────────────────────────────────────────────────────


class UserCreate(BaseModel):
    username: str
    email: str
    full_name: str
    department_id: int | None = None


class UserUpdate(BaseModel):
    username: str | None = None
    email: str | None = None
    full_name: str | None = None
    department_id: int | None = None
    is_active: bool | None = None


class UserRead(BaseModel):
    id: int
    username: str
    email: str
    full_name: str
    department_id: int | None
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class UserReadWithDept(UserRead):
    department: DepartmentRead | None = None


# ── Role ─────────────────────────────────────────────────────────────────


class RoleCreate(BaseModel):
    name: str
    description: str | None = None


class RoleUpdate(BaseModel):
    name: str | None = None
    description: str | None = None


class RoleRead(BaseModel):
    id: int
    name: str
    description: str | None
    is_system_role: bool
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Feature ──────────────────────────────────────────────────────────────


class FeatureCreate(BaseModel):
    code: str
    name: str
    module: str
    description: str | None = None


class FeatureUpdate(BaseModel):
    code: str | None = None
    name: str | None = None
    module: str | None = None
    description: str | None = None


class FeatureRead(BaseModel):
    id: int
    code: str
    name: str
    module: str
    description: str | None

    model_config = {"from_attributes": True}


# ── Role Permission ─────────────────────────────────────────────────────


class RolePermissionSet(BaseModel):
    role_id: int
    feature_id: int
    can_view: bool = False
    can_create: bool = False
    can_edit: bool = False
    can_delete: bool = False
    can_export: bool = False


class RolePermissionRead(BaseModel):
    id: int
    role_id: int
    feature_id: int
    can_view: bool
    can_create: bool
    can_edit: bool
    can_delete: bool
    can_export: bool
    feature: FeatureRead

    model_config = {"from_attributes": True}


# ── User Role ────────────────────────────────────────────────────────────


class UserRoleAssign(BaseModel):
    user_id: int
    role_id: int
    department_id: int | None = None


class UserRoleRead(BaseModel):
    id: int
    user_id: int
    role_id: int
    department_id: int | None
    created_at: datetime
    user: UserRead
    role: RoleRead
    department: DepartmentRead | None = None

    model_config = {"from_attributes": True}
