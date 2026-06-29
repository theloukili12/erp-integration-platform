from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import Base, engine
from app.models.production_order import ProductionOrder
from app.models.rbac import Department, Feature, Role, RolePermission, User, UserRole
from app.api.etl import router as etl_router
from app.api.orders import router as orders_router
from app.api.admin import router as admin_router

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="ERP Integration Platform API",
    description="Backend API for ERP integration, ETL workflows and manufacturing data.",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(etl_router)

app.include_router(orders_router)

app.include_router(admin_router)

@app.get("/health", tags=["Health Check"])
def health_check():
    return {
        "status": "ok",
        "service": "erp-integration-platform-api"
    }
