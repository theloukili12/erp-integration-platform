"""Add new columns to production_orders table."""
from app.database import engine
from sqlalchemy import text

MIGRATIONS = [
    "ALTER TABLE production_orders ADD COLUMN priority VARCHAR DEFAULT 'MITTEL'",
    "ALTER TABLE production_orders ADD COLUMN department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL",
    "ALTER TABLE production_orders ADD COLUMN assigned_to INTEGER REFERENCES users(id) ON DELETE SET NULL",
    "ALTER TABLE production_orders ADD COLUMN due_date TIMESTAMP",
    "ALTER TABLE production_orders ADD COLUMN notes TEXT",
    "ALTER TABLE production_orders ADD COLUMN created_at TIMESTAMP DEFAULT NOW()",
    "ALTER TABLE production_orders ADD COLUMN updated_at TIMESTAMP DEFAULT NOW()",
]

with engine.connect() as conn:
    for sql in MIGRATIONS:
        try:
            conn.execute(text(sql))
            col = sql.split("ADD COLUMN ")[1].split(" ")[0]
            print(f"  + Added: {col}")
        except Exception as e:
            if "already exists" in str(e):
                col = sql.split("ADD COLUMN ")[1].split(" ")[0]
                print(f"  ~ Exists: {col}")
            else:
                print(f"  ! Error: {e}")
    conn.commit()
    print("\nMigration complete.")
