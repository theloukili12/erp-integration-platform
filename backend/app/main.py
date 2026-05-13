from fastapi import FastAPI

from app.database import Base, engine
from app.models.production_order import ProductionOrder

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="ERP Integration Platform API",
    description="Backend API for ERP integration, ETL workflows and manufacturing data.",
    version="0.1.0",
)

@app.get("/health", tags=["Health Check"])
def health_check():
    return {
        "status": "ok",
        "service": "erp-integration-platform-api"
    }