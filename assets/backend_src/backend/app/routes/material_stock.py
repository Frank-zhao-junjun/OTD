from fastapi import APIRouter, HTTPException, Query

from app.config import settings
from app.sap.client import SapApiError
from app.schemas.common import ApiResponse, ErrorDetail, ErrorResponse, Pagination
from app.schemas.material_stock import MaterialStockLineDto, MaterialStockSummaryDto, MaterialStockSyncResult
from app.services.material_stock import material_stock_service

router = APIRouter(prefix="/api/v1/material-stock", tags=["material-stock"])


def _sap_http_error(exc: SapApiError) -> HTTPException:
    return HTTPException(
        status_code=502,
        detail=ErrorResponse(
            error=ErrorDetail(
                code="SAP_MATERIAL_STOCK_ERROR",
                message=f"{exc.message} (HTTP {exc.status_code})",
            )
        ).model_dump(),
    )


@router.get("", response_model=ApiResponse[list[MaterialStockLineDto]])
def list_material_stock(
    material: str | None = Query(default=None),
    plant: str | None = Query(default=None),
    storage_location: str | None = Query(default=None, alias="storageLocation"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=200, alias="pageSize"),
):
    try:
        items, total = material_stock_service.list_stock(
            material=material,
            plant=plant,
            storage_location=storage_location,
            page=page,
            page_size=page_size,
        )
    except SapApiError as exc:
        raise _sap_http_error(exc) from exc
    return ApiResponse(
        data=items,
        pagination=Pagination(page=page, pageSize=page_size, total=total),
    )


@router.get("/portal-summary", response_model=ApiResponse[list[MaterialStockSummaryDto]])
def portal_material_stock_summary(
    plant: str | None = Query(default=None),
    storage_location: str | None = Query(default=None, alias="storageLocation"),
    page_size: int = Query(default=200, ge=1, le=500, alias="pageSize"),
):
    """Aggregate stock for portal_material entries. Defaults: plant=1010, storageLocation=1003."""
    try:
        summaries = material_stock_service.portal_summary(
            plant=plant or settings.default_plant,
            storage_location=storage_location or settings.default_storage_location,
            page_size=page_size,
        )
    except SapApiError as exc:
        raise _sap_http_error(exc) from exc
    return ApiResponse(data=summaries)


@router.get("/summary", response_model=ApiResponse[list[MaterialStockSummaryDto]])
def summarize_material_stock(
    material: str | None = Query(default=None),
    plant: str | None = Query(default=None),
    storage_location: str | None = Query(default=None, alias="storageLocation"),
):
    if not material:
        raise HTTPException(
            status_code=400,
            detail=ErrorResponse(
                error=ErrorDetail(code="MISSING_MATERIAL", message="Query parameter 'material' is required")
            ).model_dump(),
        )
    try:
        summaries = material_stock_service.summarize_material_stock(
            material=material,
            plant=plant,
            storage_location=storage_location,
        )
    except SapApiError as exc:
        raise _sap_http_error(exc) from exc
    return ApiResponse(data=summaries)


@router.get("/{material}", response_model=ApiResponse[list[MaterialStockLineDto]])
def get_material_stock(
    material: str,
    plant: str | None = Query(default=None),
    storage_location: str | None = Query(default=None, alias="storageLocation"),
):
    try:
        lines = material_stock_service.get_material_stock(
            material=material,
            plant=plant,
            storage_location=storage_location,
        )
    except SapApiError as exc:
        raise _sap_http_error(exc) from exc
    return ApiResponse(data=lines)


@router.post("/sync-from-portal-materials", response_model=ApiResponse[MaterialStockSyncResult])
def sync_from_portal_materials(
    plant: str | None = Query(default=None),
    storage_location: str | None = Query(default=None, alias="storageLocation"),
    page_size: int = Query(default=200, ge=1, le=500, alias="pageSize"),
):
    """
    Batch query SAP stock for materials registered in portal_material.
    """
    try:
        result = material_stock_service.sync_from_portal_materials(
            plant=plant or settings.default_plant,
            storage_location=storage_location or settings.default_storage_location,
            page_size=page_size,
        )
    except SapApiError as exc:
        raise _sap_http_error(exc) from exc
    return ApiResponse(data=result)
