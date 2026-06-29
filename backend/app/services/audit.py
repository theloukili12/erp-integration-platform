import json

from fastapi import Request
from sqlalchemy.orm import Session

from app.models.audit import AuditLog


def log_action(
    db: Session,
    action: str,
    resource: str,
    resource_id: int | None = None,
    detail: dict | str | None = None,
    user_id: int | None = None,
    username: str | None = None,
    ip_address: str | None = None,
):
    """Write an entry to the audit log."""
    entry = AuditLog(
        user_id=user_id,
        username=username,
        action=action,
        resource=resource,
        resource_id=resource_id,
        detail=json.dumps(detail, ensure_ascii=False) if isinstance(detail, dict) else detail,
        ip_address=ip_address,
    )
    db.add(entry)
    db.commit()


def get_client_ip(request: Request) -> str:
    """Extract client IP from request (supports proxies)."""
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"
