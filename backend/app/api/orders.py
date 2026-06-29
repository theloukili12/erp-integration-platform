from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.audit import AuditLog
from app.models.production_order import ProductionOrder, STATUS_WORKFLOW, PRIORITY_LEVELS
from app.models.rbac import Department, User
from app.services.audit import get_client_ip, log_action

router = APIRouter(tags=["Orders"])


# ── Schemas ──────────────────────────────────────────────────────────────

class OrderCreate(BaseModel):
    order_number: str
    article: str
    quantity: int
    priority: str = "MITTEL"
    department_id: int | None = None
    assigned_to: int | None = None
    due_date: str | None = None
    notes: str | None = None


class OrderUpdate(BaseModel):
    article: str | None = None
    quantity: int | None = None
    priority: str | None = None
    department_id: int | None = None
    assigned_to: int | None = None
    due_date: str | None = None
    notes: str | None = None


class StatusTransition(BaseModel):
    new_status: str
    comment: str | None = None


# ── Endpoints ────────────────────────────────────────────────────────────

@router.get("/orders")
def list_orders(
    status: str | None = None,
    priority: str | None = None,
    department_id: int | None = None,
    assigned_to: int | None = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
):
    query = db.query(ProductionOrder)

    if status:
        query = query.filter(ProductionOrder.status == status)
    if priority:
        query = query.filter(ProductionOrder.priority == priority)
    if department_id is not None:
        query = query.filter(ProductionOrder.department_id == department_id)
    if assigned_to is not None:
        query = query.filter(ProductionOrder.assigned_to == assigned_to)

    total = query.count()
    orders = query.order_by(ProductionOrder.created_at.desc()).offset(skip).limit(limit).all()

    return {
        "total": total,
        "skip": skip,
        "limit": limit,
        "items": orders,
    }


@router.get("/orders/stats")
def order_stats(db: Session = Depends(get_db)):
    """Company-wide order KPIs."""
    total = db.query(ProductionOrder).count()

    by_status = dict(
        db.query(ProductionOrder.status, func.count(ProductionOrder.id))
        .group_by(ProductionOrder.status)
        .all()
    )

    by_priority = dict(
        db.query(ProductionOrder.priority, func.count(ProductionOrder.id))
        .group_by(ProductionOrder.priority)
        .all()
    )

    by_department = {}
    rows = (
        db.query(Department.name, func.count(ProductionOrder.id))
        .join(ProductionOrder, ProductionOrder.department_id == Department.id)
        .group_by(Department.name)
        .all()
    )
    by_department = dict(rows)

    # Overdue orders (due_date < now and not completed/failed)
    from datetime import datetime
    overdue = (
        db.query(ProductionOrder)
        .filter(
            ProductionOrder.due_date < datetime.utcnow(),
            ProductionOrder.status.notin_(["ABGESCHLOSSEN", "FEHLGESCHLAGEN"]),
        )
        .count()
    )

    return {
        "total": total,
        "by_status": by_status,
        "by_priority": by_priority,
        "by_department": by_department,
        "overdue": overdue,
    }


@router.get("/orders/{order_id}")
def get_order(order_id: int, db: Session = Depends(get_db)):
    order = db.query(ProductionOrder).filter(ProductionOrder.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    # Enrich with department and assignee names
    dept_name = None
    if order.department_id:
        dept = db.query(Department).filter(Department.id == order.department_id).first()
        dept_name = dept.name if dept else None

    assignee_name = None
    if order.assigned_to:
        user = db.query(User).filter(User.id == order.assigned_to).first()
        assignee_name = user.full_name if user else None

    # Audit history for this order
    history = (
        db.query(AuditLog)
        .filter(AuditLog.resource == "order", AuditLog.resource_id == order_id)
        .order_by(AuditLog.created_at.desc())
        .all()
    )
    audit_history = [
        {
            "id": h.id,
            "action": h.action,
            "username": h.username,
            "detail": h.detail,
            "ip_address": h.ip_address,
            "created_at": h.created_at.isoformat() if h.created_at else None,
        }
        for h in history
    ]

    return {
        "id": order.id,
        "order_number": order.order_number,
        "article": order.article,
        "quantity": order.quantity,
        "status": order.status,
        "priority": order.priority,
        "department_id": order.department_id,
        "department_name": dept_name,
        "assigned_to": order.assigned_to,
        "assignee_name": assignee_name,
        "due_date": order.due_date.isoformat() if order.due_date else None,
        "notes": order.notes,
        "created_at": order.created_at.isoformat() if order.created_at else None,
        "updated_at": order.updated_at.isoformat() if order.updated_at else None,
        "allowed_transitions": STATUS_WORKFLOW.get(order.status, []),
        "history": audit_history,
    }


@router.post("/orders", status_code=201)
def create_order(payload: OrderCreate, request: Request, db: Session = Depends(get_db)):
    if db.query(ProductionOrder).filter(ProductionOrder.order_number == payload.order_number).first():
        raise HTTPException(status_code=409, detail="Order number already exists")
    if payload.priority and payload.priority not in PRIORITY_LEVELS:
        raise HTTPException(status_code=400, detail=f"Priority must be one of: {PRIORITY_LEVELS}")

    from datetime import datetime
    data = payload.model_dump()
    if data.get("due_date"):
        data["due_date"] = datetime.fromisoformat(data["due_date"])
    data["status"] = "GEPLANT"

    order = ProductionOrder(**data)
    db.add(order)
    db.commit()
    db.refresh(order)
    log_action(db, "CREATE", "order", resource_id=order.id, detail={"order_number": order.order_number, "article": order.article}, ip_address=get_client_ip(request))
    return order


@router.put("/orders/{order_id}")
def update_order(order_id: int, payload: OrderUpdate, request: Request, db: Session = Depends(get_db)):
    order = db.query(ProductionOrder).filter(ProductionOrder.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if payload.priority and payload.priority not in PRIORITY_LEVELS:
        raise HTTPException(status_code=400, detail=f"Priority must be one of: {PRIORITY_LEVELS}")

    from datetime import datetime
    for key, value in payload.model_dump(exclude_unset=True).items():
        if key == "due_date" and value:
            value = datetime.fromisoformat(value)
        setattr(order, key, value)

    db.commit()
    db.refresh(order)
    log_action(db, "UPDATE", "order", resource_id=order.id, detail={"order_number": order.order_number}, ip_address=get_client_ip(request))
    return order


@router.post("/orders/{order_id}/transition")
def transition_order(order_id: int, payload: StatusTransition, request: Request, db: Session = Depends(get_db)):
    """Move an order to a new status (enforces workflow rules)."""
    order = db.query(ProductionOrder).filter(ProductionOrder.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    allowed = STATUS_WORKFLOW.get(order.status, [])
    if payload.new_status not in allowed:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot transition from '{order.status}' to '{payload.new_status}'. Allowed: {allowed}",
        )

    old_status = order.status
    order.status = payload.new_status
    if payload.comment:
        existing_notes = order.notes or ""
        from datetime import datetime
        timestamp = datetime.utcnow().strftime("%d.%m.%Y %H:%M")
        order.notes = f"{existing_notes}\n[{timestamp}] {old_status} → {payload.new_status}: {payload.comment}".strip()

    db.commit()
    db.refresh(order)
    log_action(
        db, "STATUS_CHANGE", "order",
        resource_id=order.id,
        detail={"order_number": order.order_number, "from": old_status, "to": payload.new_status},
        ip_address=get_client_ip(request),
    )
    return {
        "id": order.id,
        "order_number": order.order_number,
        "old_status": old_status,
        "new_status": order.status,
        "allowed_transitions": STATUS_WORKFLOW.get(order.status, []),
    }


@router.delete("/orders/{order_id}", status_code=204)
def delete_order(order_id: int, request: Request, db: Session = Depends(get_db)):
    order = db.query(ProductionOrder).filter(ProductionOrder.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.status not in ["GEPLANT", "FEHLGESCHLAGEN"]:
        raise HTTPException(status_code=400, detail="Can only delete orders in GEPLANT or FEHLGESCHLAGEN status")
    log_action(db, "DELETE", "order", resource_id=order.id, detail={"order_number": order.order_number}, ip_address=get_client_ip(request))
    db.delete(order)
    db.commit()


class CommentPayload(BaseModel):
    comment: str


@router.post("/orders/{order_id}/comment")
def add_comment(order_id: int, payload: CommentPayload, request: Request, db: Session = Depends(get_db)):
    """Add a comment/note to an order."""
    order = db.query(ProductionOrder).filter(ProductionOrder.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    from datetime import datetime
    timestamp = datetime.utcnow().strftime("%d.%m.%Y %H:%M")
    existing = order.notes or ""
    order.notes = f"{existing}\n[{timestamp}] {payload.comment}".strip()
    db.commit()
    log_action(
        db, "COMMENT", "order",
        resource_id=order.id,
        detail={"order_number": order.order_number, "comment": payload.comment},
        ip_address=get_client_ip(request),
    )
    return {"status": "ok", "notes": order.notes}