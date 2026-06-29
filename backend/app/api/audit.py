from datetime import datetime

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.audit import AuditLog

router = APIRouter(prefix="/admin/audit", tags=["Audit Log"])


class AuditLogRead(BaseModel):
    id: int
    user_id: int | None
    username: str | None
    action: str
    resource: str
    resource_id: int | None
    detail: str | None
    ip_address: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


@router.get("/logs", response_model=list[AuditLogRead])
def list_audit_logs(
    action: str | None = Query(None),
    resource: str | None = Query(None),
    user_id: int | None = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
):
    """Query audit logs with optional filters."""
    query = db.query(AuditLog)

    if action:
        query = query.filter(AuditLog.action == action)
    if resource:
        query = query.filter(AuditLog.resource == resource)
    if user_id is not None:
        query = query.filter(AuditLog.user_id == user_id)

    total = query.count()
    logs = query.order_by(AuditLog.created_at.desc()).offset(skip).limit(limit).all()

    return logs


@router.get("/logs/stats")
def audit_stats(db: Session = Depends(get_db)):
    """Get audit log statistics."""
    from sqlalchemy import func

    total = db.query(AuditLog).count()
    action_counts = (
        db.query(AuditLog.action, func.count(AuditLog.id))
        .group_by(AuditLog.action)
        .all()
    )
    return {
        "total_entries": total,
        "by_action": {action: count for action, count in action_counts},
    }
