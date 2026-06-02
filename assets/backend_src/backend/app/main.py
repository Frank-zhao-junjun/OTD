from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.db.database import init_db
from app.routes.billing_documents import router as billing_documents_router
from app.routes.customers import router as customers_router
from app.routes.material_documents import router as material_documents_router
from app.routes.material_stock import router as material_stock_router
from app.routes.materials import router as materials_router
from app.routes.outbound_deliveries import router as outbound_deliveries_router
from app.routes.production_confirmations import router as production_confirmations_router
from app.routes.production_orders import router as production_orders_router
from app.routes.products import router as products_router
from app.routes.sales_orders import router as sales_orders_router


@asynccontextmanager
async def lifespan(_app: FastAPI):
    init_db()
    yield


app = FastAPI(
    title="SAP ERP Portal Backend",
    description="Unified backend encapsulation for SAP OData V2/V4 APIs",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(customers_router)
app.include_router(products_router)
app.include_router(materials_router)
app.include_router(material_stock_router)
app.include_router(material_documents_router)
app.include_router(production_orders_router)
app.include_router(production_confirmations_router)
app.include_router(outbound_deliveries_router)
app.include_router(billing_documents_router)
app.include_router(sales_orders_router)


@app.get("/health")
def health():
    return {"success": True, "service": "sap-erp-portal-backend"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.main:app", host=settings.portal_host, port=settings.portal_port, reload=True)
