from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from app.database import Base


# Valid status transitions
STATUS_WORKFLOW = {
    "GEPLANT": ["IN_BEARBEITUNG"],
    "IN_BEARBEITUNG": ["QUALITAETSPRUEFUNG", "FEHLGESCHLAGEN"],
    "QUALITAETSPRUEFUNG": ["ABGESCHLOSSEN", "FEHLGESCHLAGEN", "IN_BEARBEITUNG"],
    "ABGESCHLOSSEN": [],
    "FEHLGESCHLAGEN": ["IN_BEARBEITUNG"],
}

PRIORITY_LEVELS = ["HOCH", "MITTEL", "NIEDRIG"]


class ProductionOrder(Base):
    __tablename__ = 'production_orders'

    id = Column(Integer, primary_key=True, index=True)
    order_number = Column(String, unique=True, nullable=False)
    article = Column(String, nullable=False)
    quantity = Column(Integer, nullable=False)
    status = Column(String, nullable=False, default="GEPLANT")
    priority = Column(String, nullable=False, default="MITTEL")
    department_id = Column(Integer, ForeignKey("departments.id", ondelete="SET NULL"), nullable=True)
    assigned_to = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    due_date = Column(DateTime, nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    department = relationship("Department")
    assignee = relationship("User")