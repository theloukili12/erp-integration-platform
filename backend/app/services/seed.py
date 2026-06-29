from sqlalchemy.orm import Session

from app.models.rbac import Feature, Role, RolePermission

DEFAULT_ROLES = [
    {"name": "Administrator", "description": "Vollzugriff auf alle Module", "is_system_role": True},
    {"name": "Manager", "description": "Lese-/Schreibzugriff auf die meisten Module", "is_system_role": True},
    {"name": "Mitarbeiter", "description": "Standard-Zugriff für Mitarbeiter", "is_system_role": True},
    {"name": "Viewer", "description": "Nur Lesezugriff", "is_system_role": True},
]

DEFAULT_FEATURES = [
    {"code": "orders", "name": "Produktionsaufträge", "module": "Produktion", "description": "Produktionsaufträge verwalten"},
    {"code": "orders.import", "name": "ETL Import", "module": "Produktion", "description": "CSV/ERP Datenimport"},
    {"code": "admin.departments", "name": "Abteilungen", "module": "Admin", "description": "Abteilungen verwalten"},
    {"code": "admin.users", "name": "Benutzer", "module": "Admin", "description": "Benutzer verwalten"},
    {"code": "admin.roles", "name": "Rollen", "module": "Admin", "description": "Rollen verwalten"},
    {"code": "admin.permissions", "name": "Berechtigungen", "module": "Admin", "description": "Berechtigungsmatrix verwalten"},
    {"code": "reports", "name": "Berichte", "module": "Berichte", "description": "Berichte & Auswertungen"},
    {"code": "dashboard", "name": "Dashboard", "module": "Allgemein", "description": "Übersichts-Dashboard"},
]

# Admin gets everything
ADMIN_PERMISSIONS = {code: {"view": True, "create": True, "edit": True, "delete": True, "export": True} for code in [f["code"] for f in DEFAULT_FEATURES]}

# Manager gets most things, no admin delete
MANAGER_PERMISSIONS = {
    "orders": {"view": True, "create": True, "edit": True, "delete": False, "export": True},
    "orders.import": {"view": True, "create": True, "edit": False, "delete": False, "export": False},
    "admin.departments": {"view": True, "create": False, "edit": False, "delete": False, "export": False},
    "admin.users": {"view": True, "create": False, "edit": False, "delete": False, "export": False},
    "admin.roles": {"view": True, "create": False, "edit": False, "delete": False, "export": False},
    "admin.permissions": {"view": True, "create": False, "edit": False, "delete": False, "export": False},
    "reports": {"view": True, "create": True, "edit": True, "delete": False, "export": True},
    "dashboard": {"view": True, "create": False, "edit": False, "delete": False, "export": True},
}

# Mitarbeiter gets operational access
MITARBEITER_PERMISSIONS = {
    "orders": {"view": True, "create": True, "edit": True, "delete": False, "export": False},
    "orders.import": {"view": True, "create": False, "edit": False, "delete": False, "export": False},
    "reports": {"view": True, "create": False, "edit": False, "delete": False, "export": False},
    "dashboard": {"view": True, "create": False, "edit": False, "delete": False, "export": False},
}

# Viewer only reads
VIEWER_PERMISSIONS = {
    "orders": {"view": True, "create": False, "edit": False, "delete": False, "export": False},
    "reports": {"view": True, "create": False, "edit": False, "delete": False, "export": False},
    "dashboard": {"view": True, "create": False, "edit": False, "delete": False, "export": False},
}

ROLE_PERMISSION_MAP = {
    "Administrator": ADMIN_PERMISSIONS,
    "Manager": MANAGER_PERMISSIONS,
    "Mitarbeiter": MITARBEITER_PERMISSIONS,
    "Viewer": VIEWER_PERMISSIONS,
}


def seed_defaults(db: Session):
    """Seed default roles and features if they don't exist."""

    # Seed roles
    for role_data in DEFAULT_ROLES:
        existing = db.query(Role).filter(Role.name == role_data["name"]).first()
        if not existing:
            db.add(Role(**role_data))
    db.commit()

    # Seed features
    for feat_data in DEFAULT_FEATURES:
        existing = db.query(Feature).filter(Feature.code == feat_data["code"]).first()
        if not existing:
            db.add(Feature(**feat_data))
    db.commit()

    # Seed role permissions
    roles = {r.name: r for r in db.query(Role).all()}
    features = {f.code: f for f in db.query(Feature).all()}

    for role_name, perms in ROLE_PERMISSION_MAP.items():
        role = roles.get(role_name)
        if not role:
            continue
        for feature_code, actions in perms.items():
            feature = features.get(feature_code)
            if not feature:
                continue
            existing = (
                db.query(RolePermission)
                .filter(
                    RolePermission.role_id == role.id,
                    RolePermission.feature_id == feature.id,
                )
                .first()
            )
            if not existing:
                db.add(
                    RolePermission(
                        role_id=role.id,
                        feature_id=feature.id,
                        can_view=actions["view"],
                        can_create=actions["create"],
                        can_edit=actions["edit"],
                        can_delete=actions["delete"],
                        can_export=actions["export"],
                    )
                )
    db.commit()
