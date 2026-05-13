from pydantic import BaseModel


class ProductionOrderBase(BaseModel):
    order_number: str
    article: str
    quantity: int
    status: str


class ProductionOrderCreate(ProductionOrderBase):
    pass


class ProductionOrderRead(ProductionOrderBase):
    id: int

    model_config = {"from_attributes": True}
