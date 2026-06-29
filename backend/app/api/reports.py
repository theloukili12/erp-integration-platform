"""Reporting API: company KPIs, department reports, export endpoints."""
from datetime import datetime, timedelta
from io import StringIO
import csv

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.audit import AuditLog
from app.models.production_order import ProductionOrder
from app.models.rbac import Department, User

router = APIRouter(prefix="/reports", tags=["Reports"])


# ── Company-wide KPIs ────────────────────────────────────────────────────

@router.get("/company")
def company_kpis(db: Session = Depends(get_db)):
    """Company-wide production KPIs and metrics."""
    now = datetime.utcnow()
    thirty_days_ago = now - timedelta(days=30)
    seven_days_ago = now - timedelta(days=7)

    # Total orders
    total_orders = db.query(ProductionOrder).count()
    open_orders = db.query(ProductionOrder).filter(
        ProductionOrder.status.notin_(["ABGESCHLOSSEN", "FEHLGESCHLAGEN"])
    ).count()
    completed_orders = db.query(ProductionOrder).filter(
        ProductionOrder.status == "ABGESCHLOSSEN"
    ).count()
    failed_orders = db.query(ProductionOrder).filter(
        ProductionOrder.status == "FEHLGESCHLAGEN"
    ).count()

    # Overdue
    overdue = db.query(ProductionOrder).filter(
        ProductionOrder.due_date < now,
        ProductionOrder.status.notin_(["ABGESCHLOSSEN", "FEHLGESCHLAGEN"]),
    ).count()

    # Efficiency: completed / (completed + failed) * 100
    total_finished = completed_orders + failed_orders
    efficiency = round((completed_orders / total_finished * 100), 1) if total_finished > 0 else 0

    # Average throughput time (completed orders: updated_at - created_at)
    completed = (
        db.query(ProductionOrder)
        .filter(ProductionOrder.status == "ABGESCHLOSSEN")
        .all()
    )
    if completed:
        durations = [(o.updated_at - o.created_at).total_seconds() / 3600 for o in completed if o.updated_at and o.created_at]
        avg_throughput_hours = round(sum(durations) / len(durations), 1) if durations else 0
    else:
        avg_throughput_hours = 0

    # Orders by department
    dept_load = dict(
        db.query(Department.name, func.count(ProductionOrder.id))
        .join(ProductionOrder, ProductionOrder.department_id == Department.id)
        .filter(ProductionOrder.status.notin_(["ABGESCHLOSSEN", "FEHLGESCHLAGEN"]))
        .group_by(Department.name)
        .all()
    )

    # Orders created per day (last 7 days)
    orders_per_day = {}
    rows = (
        db.query(func.date(ProductionOrder.created_at), func.count(ProductionOrder.id))
        .filter(ProductionOrder.created_at >= seven_days_ago)
        .group_by(func.date(ProductionOrder.created_at))
        .order_by(func.date(ProductionOrder.created_at))
        .all()
    )
    orders_per_day = {str(day): count for day, count in rows}

    # By status
    by_status = dict(
        db.query(ProductionOrder.status, func.count(ProductionOrder.id))
        .group_by(ProductionOrder.status)
        .all()
    )

    # By priority
    by_priority = dict(
        db.query(ProductionOrder.priority, func.count(ProductionOrder.id))
        .group_by(ProductionOrder.priority)
        .all()
    )

    # Total users & active
    total_users = db.query(User).count()
    active_users = db.query(User).filter(User.is_active == True).count()

    return {
        "orders": {
            "total": total_orders,
            "open": open_orders,
            "completed": completed_orders,
            "failed": failed_orders,
            "overdue": overdue,
            "by_status": by_status,
            "by_priority": by_priority,
        },
        "performance": {
            "efficiency_percent": efficiency,
            "avg_throughput_hours": avg_throughput_hours,
            "department_load": dept_load,
        },
        "trends": {
            "orders_per_day_7d": orders_per_day,
        },
        "workforce": {
            "total_users": total_users,
            "active_users": active_users,
        },
    }


# ── Department-specific Reports ──────────────────────────────────────────

@router.get("/department/{department_id}")
def department_report(department_id: int, db: Session = Depends(get_db)):
    """Detailed department report with order metrics."""
    dept = db.query(Department).filter(Department.id == department_id).first()
    if not dept:
        return {"error": "Department not found"}

    now = datetime.utcnow()
    dept_orders = db.query(ProductionOrder).filter(ProductionOrder.department_id == department_id)

    total = dept_orders.count()
    completed = dept_orders.filter(ProductionOrder.status == "ABGESCHLOSSEN").count()
    failed = dept_orders.filter(ProductionOrder.status == "FEHLGESCHLAGEN").count()
    in_progress = dept_orders.filter(ProductionOrder.status == "IN_BEARBEITUNG").count()
    in_qa = dept_orders.filter(ProductionOrder.status == "QUALITAETSPRUEFUNG").count()
    planned = dept_orders.filter(ProductionOrder.status == "GEPLANT").count()

    overdue = dept_orders.filter(
        ProductionOrder.due_date < now,
        ProductionOrder.status.notin_(["ABGESCHLOSSEN", "FEHLGESCHLAGEN"]),
    ).count()

    # Fehlerquote
    finished = completed + failed
    error_rate = round((failed / finished * 100), 1) if finished > 0 else 0

    # Liefertreue: completed orders that were on-time
    on_time = (
        dept_orders.filter(
            ProductionOrder.status == "ABGESCHLOSSEN",
            ProductionOrder.due_date != None,
            ProductionOrder.updated_at <= ProductionOrder.due_date,
        ).count()
    )
    total_with_due = dept_orders.filter(
        ProductionOrder.status == "ABGESCHLOSSEN",
        ProductionOrder.due_date != None,
    ).count()
    delivery_rate = round((on_time / total_with_due * 100), 1) if total_with_due > 0 else 0

    # Average throughput
    completed_orders = dept_orders.filter(ProductionOrder.status == "ABGESCHLOSSEN").all()
    if completed_orders:
        durations = [(o.updated_at - o.created_at).total_seconds() / 3600 for o in completed_orders if o.updated_at and o.created_at]
        avg_hours = round(sum(durations) / len(durations), 1) if durations else 0
    else:
        avg_hours = 0

    # Orders by priority
    by_priority = dict(
        dept_orders.with_entities(ProductionOrder.priority, func.count(ProductionOrder.id))
        .group_by(ProductionOrder.priority)
        .all()
    )

    return {
        "department": {"id": dept.id, "name": dept.name},
        "orders": {
            "total": total,
            "planned": planned,
            "in_progress": in_progress,
            "in_qa": in_qa,
            "completed": completed,
            "failed": failed,
            "overdue": overdue,
            "by_priority": by_priority,
        },
        "metrics": {
            "error_rate_percent": error_rate,
            "delivery_rate_percent": delivery_rate,
            "avg_throughput_hours": avg_hours,
        },
    }


# ── CSV Export ───────────────────────────────────────────────────────────

@router.get("/export/orders")
def export_orders_csv(
    status: str | None = Query(None),
    department_id: int | None = Query(None),
    db: Session = Depends(get_db),
):
    """Export orders as CSV download."""
    query = db.query(ProductionOrder)
    if status:
        query = query.filter(ProductionOrder.status == status)
    if department_id is not None:
        query = query.filter(ProductionOrder.department_id == department_id)

    orders = query.order_by(ProductionOrder.created_at.desc()).all()

    # Get department names
    depts = {d.id: d.name for d in db.query(Department).all()}

    output = StringIO()
    writer = csv.writer(output, delimiter=";")
    writer.writerow([
        "Auftragsnr", "Artikel", "Menge", "Status", "Priorität",
        "Abteilung", "Fälligkeitsdatum", "Erstellt", "Aktualisiert", "Notizen"
    ])
    for o in orders:
        writer.writerow([
            o.order_number,
            o.article,
            o.quantity,
            o.status,
            o.priority,
            depts.get(o.department_id, ""),
            o.due_date.strftime("%d.%m.%Y") if o.due_date else "",
            o.created_at.strftime("%d.%m.%Y %H:%M") if o.created_at else "",
            o.updated_at.strftime("%d.%m.%Y %H:%M") if o.updated_at else "",
            (o.notes or "").replace("\n", " | "),
        ])

    output.seek(0)
    filename = f"auftraege_{datetime.utcnow().strftime('%Y%m%d_%H%M')}.csv"
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@router.get("/export/audit")
def export_audit_csv(
    action: str | None = Query(None),
    resource: str | None = Query(None),
    db: Session = Depends(get_db),
):
    """Export audit logs as CSV download."""
    query = db.query(AuditLog)
    if action:
        query = query.filter(AuditLog.action == action)
    if resource:
        query = query.filter(AuditLog.resource == resource)

    logs = query.order_by(AuditLog.created_at.desc()).limit(1000).all()

    output = StringIO()
    writer = csv.writer(output, delimiter=";")
    writer.writerow(["Zeitpunkt", "Benutzer", "Aktion", "Ressource", "ID", "Details", "IP"])
    for log in logs:
        writer.writerow([
            log.created_at.strftime("%d.%m.%Y %H:%M:%S") if log.created_at else "",
            log.username or "",
            log.action,
            log.resource,
            log.resource_id or "",
            log.detail or "",
            log.ip_address or "",
        ])

    output.seek(0)
    filename = f"audit_log_{datetime.utcnow().strftime('%Y%m%d_%H%M')}.csv"
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )
