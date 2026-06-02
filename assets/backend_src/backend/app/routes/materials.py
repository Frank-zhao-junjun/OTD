from fastapi import APIRouter, HTTPException, Query

from app.schemas.common import ApiResponse, ErrorDetail, ErrorResponse, Pagination
from app.schemas.materials import MaterialDto, SyncFromOrderItemsRequest, SyncFromOrderItemsResult
from app.services.materials import material_service

router = APIRouter(prefix="/api/v1/materials", tags=["materials"])


@router.get("", response_model=ApiResponse[list[MaterialDto]])
def list_materials(
    material_code: str | None = Query(default=None, alias="materialCode"),
    material_name: str | None = Query(default=None, alias="materialName"),
    plant: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=200, alias="pageSize"),
):
    items, total = material_service.list_materials(
        material_code=material_code,
        material_name=material_name,
        plant=plant,
        page=page,
        page_size=page_size,
    )
    return ApiResponse(
        data=items,
        pagination=Pagination(page=page, pageSize=page_size, total=total),
    )


@router.get("/{material_code}", response_model=ApiResponse[MaterialDto])
def get_material(material_code: str):
    detail = material_service.get_material(material_code)
    if detail is None:
        raise HTTPException(
            status_code=404,
            detail=ErrorResponse(
                error=ErrorDetail(code="MATERIAL_NOT_FOUND", message=f"Material {material_code} not found")
            ).model_dump(),
        )
    return ApiResponse(data=detail)


@router.post("/sync-from-order-items", response_model=ApiResponse[SyncFromOrderItemsResult])
def sync_from_order_items(body: SyncFromOrderItemsRequest):
    """
    Incrementally upsert materials from sales order line items.
    Same material_code is not duplicated; reference_count increments instead.
    """
    payload = [item.model_dump(by_alias=True) for item in body.items]
    result = material_service.sync_from_order_items(payload)
    return ApiResponse(data=result)


@router.post("/sync-from-sales-orders", response_model=ApiResponse[SyncFromOrderItemsResult])
def sync_from_sales_orders(body: dict):
    """
    Accept OData V4 sales orders with expanded _Item and upsert materials.
    Body: { "value": [ { "SalesOrder": "...", "_Item": [ ... ] }, ... ] }
    or { "orders": [ ... ] }
    """
    orders = body.get("value") or body.get("orders") or []
    if not isinstance(orders, list):
        raise HTTPException(
            status_code=400,
            detail=ErrorResponse(
                error=ErrorDetail(code="INVALID_PAYLOAD", message="Expected 'value' or 'orders' array")
            ).model_dump(),
        )
    result = material_service.sync_from_sales_orders(orders)
    return ApiResponse(data=result)
