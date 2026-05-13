from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.services.etl_service import import_production_orders
from app.models.production_order import ProductionOrder

router = APIRouter()


@router.post("/etl/import")
def import_orders(
    db: Session = Depends(get_db),
):
    result = import_production_orders(
        db=db,
        file_path="../data/erp_production_orders_dummy.csv",
    )

    return result


@router.get("/orders")
def list_orders(
    db: Session = Depends(get_db),
):
    orders = db.query(ProductionOrder).all()
    return orders
