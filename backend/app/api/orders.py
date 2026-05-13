from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.production_order import ProductionOrder
from app.schemas.production_order import ProductionOrderCreate, ProductionOrderRead
from app.services.etl_service import import_production_orders

router = APIRouter()

@router.get("/orders")
def list_orders(
    status: str | None = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db),
):
    query = db.query(ProductionOrder)

    if status:
        query = query.filter(ProductionOrder.status == status)

    total = query.count()
    orders = query.offset(skip).limit(limit).all()

    return {
        "total": total,
        "skip": skip,
        "limit": limit,
        "items": orders,
    }

@router.get("/orders/{order_id}", response_model=ProductionOrderRead)
def get_order(
    order_id: int,
    db: Session = Depends(get_db),
):
    order = db.query(ProductionOrder).filter(ProductionOrder.id == order_id).first()
    if order is None:
        raise HTTPException(status_code=404, detail="Order not found")
    return order

@router.post("/orders", response_model=ProductionOrderRead, status_code=201)
def create_order(
    order: ProductionOrderCreate,
    db: Session = Depends(get_db),
):
    db_order = ProductionOrder(**order.model_dump())
    db.add(db_order)
    db.commit()
    db.refresh(db_order)
    return db_order