import pandas as pd
from sqlalchemy.orm import Session

from app.models.production_order import ProductionOrder
from app.services.validators import validate_production_order_row

def import_production_orders(
    db: Session,
    file_path: str,
):
    df = pd.read_csv(file_path)

    imported_orders = 0
    skipped_orders = 0

    for _, row in df.iterrows():

        is_valid, error_message = validate_production_order_row(row)
        if not is_valid:
            skipped_orders += 1
            continue

        existing_order = (
            db.query(ProductionOrder)
            .filter(
                ProductionOrder.order_number == row["order_number"]
            )
            .first()
        )

        if existing_order:
            skipped_orders += 1
            continue

        order = ProductionOrder(
            order_number=row["order_number"],
            article=row["article"],
            quantity=int(row["quantity"]),
            status=row["status"],
        )

        db.add(order)
        imported_orders += 1

    db.commit()

    return {
        "imported_orders": imported_orders,
        "skipped_orders": skipped_orders,
    }