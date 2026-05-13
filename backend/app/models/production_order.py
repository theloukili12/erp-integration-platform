from sqlalchemy import Column, Integer, String

from app.database import Base

class ProductionOrder(Base):
    __tablename__ = 'production_orders'

    id = Column(Integer, primary_key=True, index=True)
    order_number = Column(String, unique=True, nullable=False)
    article = Column(String, nullable=False)
    quantity = Column(Integer, nullable=False)
    status = Column(String, nullable=False)