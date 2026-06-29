from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.audit import AuditLog
from app.models.rbac import Department, Role, User, UserRole

router = APIRouter(prefix="/departments", tags=["Departments"])


@router.get("")
def list_departments_overview(db: Session = Depends(get_db)):
    """List all departments with member count and basic stats."""
    departments = db.query(Department).order_by(Department.name).all()
    result = []
    for dept in departments:
        member_count = db.query(User).filter(
            User.department_id == dept.id, User.is_active == True
        ).count()
        result.append({
            "id": dept.id,
            "name": dept.name,
            "description": dept.description,
            "member_count": member_count,
            "created_at": dept.created_at.isoformat() if dept.created_at else None,
        })
    return result


@router.get("/{department_id}/dashboard")
def get_department_dashboard(department_id: int, db: Session = Depends(get_db)):
    """Full department dashboard: KPIs, team, recent activity."""
    dept = db.query(Department).filter(Department.id == department_id).first()
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")

    # Team members
    members = (
        db.query(User)
        .filter(User.department_id == department_id)
        .order_by(User.full_name)
        .all()
    )

    team = []
    for m in members:
        # Get user roles
        user_roles = (
            db.query(UserRole, Role)
            .join(Role, UserRole.role_id == Role.id)
            .filter(UserRole.user_id == m.id)
            .all()
        )
        roles = [{"id": r.id, "name": r.name} for _, r in user_roles]
        team.append({
            "id": m.id,
            "username": m.username,
            "full_name": m.full_name,
            "email": m.email,
            "is_active": m.is_active,
            "roles": roles,
            "created_at": m.created_at.isoformat() if m.created_at else None,
        })

    # KPIs
    total_members = len(members)
    active_members = sum(1 for m in members if m.is_active)
    inactive_members = total_members - active_members

    # Recent activity for this department's users
    user_ids = [m.id for m in members]
    recent_activity = []
    if user_ids:
        activity_query = (
            db.query(AuditLog)
            .filter(AuditLog.user_id.in_(user_ids))
            .order_by(AuditLog.created_at.desc())
            .limit(20)
            .all()
        )
        recent_activity = [
            {
                "id": a.id,
                "username": a.username,
                "action": a.action,
                "resource": a.resource,
                "resource_id": a.resource_id,
                "detail": a.detail,
                "created_at": a.created_at.isoformat() if a.created_at else None,
            }
            for a in activity_query
        ]

    # Role distribution in department
    role_distribution = {}
    for m in members:
        user_roles = (
            db.query(Role.name)
            .join(UserRole, UserRole.role_id == Role.id)
            .filter(UserRole.user_id == m.id)
            .all()
        )
        for (role_name,) in user_roles:
            role_distribution[role_name] = role_distribution.get(role_name, 0) + 1

    return {
        "department": {
            "id": dept.id,
            "name": dept.name,
            "description": dept.description,
            "created_at": dept.created_at.isoformat() if dept.created_at else None,
        },
        "kpis": {
            "total_members": total_members,
            "active_members": active_members,
            "inactive_members": inactive_members,
            "role_distribution": role_distribution,
        },
        "team": team,
        "recent_activity": recent_activity,
    }


@router.get("/{department_id}/reports")
def get_department_reports(department_id: int, db: Session = Depends(get_db)):
    """Department reports: activity summary, member growth stats."""
    dept = db.query(Department).filter(Department.id == department_id).first()
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")

    user_ids = [
        u.id for u in db.query(User.id).filter(User.department_id == department_id).all()
    ]

    # Activity by action type
    activity_by_action = {}
    if user_ids:
        rows = (
            db.query(AuditLog.action, func.count(AuditLog.id))
            .filter(AuditLog.user_id.in_(user_ids))
            .group_by(AuditLog.action)
            .all()
        )
        activity_by_action = {action: count for action, count in rows}

    # Activity by day (last 7 days)
    from datetime import datetime, timedelta

    activity_by_day = {}
    if user_ids:
        seven_days_ago = datetime.utcnow() - timedelta(days=7)
        rows = (
            db.query(
                func.date(AuditLog.created_at),
                func.count(AuditLog.id),
            )
            .filter(
                AuditLog.user_id.in_(user_ids),
                AuditLog.created_at >= seven_days_ago,
            )
            .group_by(func.date(AuditLog.created_at))
            .order_by(func.date(AuditLog.created_at))
            .all()
        )
        activity_by_day = {str(day): count for day, count in rows}

    # Top active users
    top_users = []
    if user_ids:
        rows = (
            db.query(AuditLog.username, func.count(AuditLog.id).label("actions"))
            .filter(AuditLog.user_id.in_(user_ids))
            .group_by(AuditLog.username)
            .order_by(func.count(AuditLog.id).desc())
            .limit(5)
            .all()
        )
        top_users = [{"username": name, "actions": count} for name, count in rows]

    return {
        "department": {"id": dept.id, "name": dept.name},
        "activity_by_action": activity_by_action,
        "activity_by_day": activity_by_day,
        "top_active_users": top_users,
        "total_actions": sum(activity_by_action.values()),
    }
