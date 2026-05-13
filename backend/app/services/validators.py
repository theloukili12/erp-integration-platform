import pandas as pd


ALLOWED_STATUSES = {"PLANNED", "IN_PROGRESS", "COMPLETED", "FAILED"}
REQUIRED_FIELDS = ["order_number", "article", "quantity", "status"]


def validate_production_order_row(row) -> tuple[bool, str | None]:
    for field in REQUIRED_FIELDS:
        if field not in row or pd.isna(row[field]) or str(row[field]).strip() == "":
            return False, f"Missing required field: {field}"

    try:
        quantity = int(row["quantity"])
    except ValueError:
        return False, "Quantity must be a number"

    if quantity <= 0:
        return False, "Quantity must be greater than 0"

    status = str(row["status"]).strip()

    if status not in ALLOWED_STATUSES:
        return False, f"Invalid status: {status}"

    return True, None