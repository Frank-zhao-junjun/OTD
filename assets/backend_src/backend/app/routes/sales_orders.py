from pathlib import Path

from fastapi import APIRouter, HTTPException, Query

from app.config import settings
from app.sap.client import SapApiError
from app.schemas.common import ApiResponse, ErrorDetail, ErrorResponse
from app.schemas.sales_order_portal import SalesOrderPortalDetailDto, SalesOrderPortalLineDto
from app.schemas.sales_orders import SalesOrderDetailDto, SalesOrderSummaryDto, SalesOrderSyncResult
from app.services.sales_orders import sales_order_service

router = APIRouter(prefix="/api/v1/sales-orders", tags=["sales-orders"])


@router.get("", response_model=ApiResponse[list[SalesOrderSummaryDto]])
def list_sales_orders(
    sales_order_type: str | None = Query(default=None, alias="salesOrderType"),
    sales_organization: str = Query(default=settings.default_sales_organization, alias="salesOrganization"),
    distribution_channel: str = Query(default=settings.default_distribution_channel, alias="distributionChannel"),
    organization_division: str = Query(default=settings.default_division, alias="organizationDivision"),
    sales_order: str | None = Query(default=None, alias="salesOrder"),
    expand_items: bool = Query(default=False, alias="expandItems"),
    expand_partner: bool = Query(default=False, alias="expandPartner"),
    top: int = Query(default=50, ge=1, le=200),
    fields: str | None = Query(
        default=settings.so_default_select,
        alias="fields",
        description="逗号分隔的 OData $select 字段列表，不传则使用默认精简集",
    ),
):
    try:
        items = sales_order_service.list_sales_orders(
            sales_order_type=sales_order_type,
            sales_organization=sales_organization,
            distribution_channel=distribution_channel,
            organization_division=organization_division,
            sales_order=sales_order,
            expand_items=expand_items,
            expand_partner=expand_partner,
            top=top,
            select_fields=fields,
        )
    except SapApiError as exc:
        raise HTTPException(
            status_code=502,
            detail=ErrorResponse(error=ErrorDetail(code="SAP_API_ERROR", message=exc.message)).model_dump(),
        ) from exc

    return ApiResponse(data=items)


@router.get("/portal-lines", response_model=ApiResponse[list[SalesOrderPortalLineDto]])
def portal_sales_order_lines(
    sales_order_type: str | None = Query(default=None, alias="salesOrderType"),
    sales_organization: str = Query(default=settings.default_sales_organization, alias="salesOrganization"),
    distribution_channel: str = Query(default=settings.default_distribution_channel, alias="distributionChannel"),
    organization_division: str = Query(default=settings.default_division, alias="organizationDivision"),
    top: int = Query(default=100, ge=1, le=200),
    fields: str | None = Query(default=settings.so_default_select, alias="fields"),
    expand_partner: bool = Query(default=True, alias="expandPartner"),
):
    try:
        lines = sales_order_service.list_portal_lines(
            sales_order_type=sales_order_type,
            sales_organization=sales_organization,
            distribution_channel=distribution_channel,
            organization_division=organization_division,
            top=top,
            select_fields=fields,
            expand_partner=expand_partner,
        )
    except SapApiError as exc:
        raise HTTPException(
            status_code=502,
            detail=ErrorResponse(error=ErrorDetail(code="SAP_API_ERROR", message=exc.message)).model_dump(),
        ) from exc
    return ApiResponse(data=lines)


@router.get("/portal-lines/from-sample", response_model=ApiResponse[list[SalesOrderPortalLineDto]])
def portal_sales_order_lines_from_sample():
    try:
        lines = sales_order_service.list_portal_lines_from_sample()
    except (FileNotFoundError, ValueError) as exc:
        raise HTTPException(
            status_code=404,
            detail=ErrorResponse(error=ErrorDetail(code="SAMPLE_NOT_FOUND", message=str(exc))).model_dump(),
        ) from exc
    return ApiResponse(data=lines)


@router.get("/portal-lines/{sales_order}", response_model=ApiResponse[SalesOrderPortalDetailDto])
def portal_sales_order_detail(sales_order: str):
    try:
        detail = sales_order_service.get_portal_detail(sales_order)
    except SapApiError as exc:
        raise HTTPException(
            status_code=502,
            detail=ErrorResponse(error=ErrorDetail(code="SAP_API_ERROR", message=exc.message)).model_dump(),
        ) from exc
    if detail is None:
        raise HTTPException(
            status_code=404,
            detail=ErrorResponse(
                error=ErrorDetail(code="SALES_ORDER_NOT_FOUND", message=f"Sales order {sales_order} not found")
            ).model_dump(),
        )
    return ApiResponse(data=detail)


@router.get("/{sales_order}", response_model=ApiResponse[SalesOrderDetailDto])
def get_sales_order(
    sales_order: str,
    expand_items: bool = Query(default=True, alias="expandItems"),
    expand_partner: bool = Query(default=False, alias="expandPartner"),
    fields: str | None = Query(default=settings.so_default_select, alias="fields"),
):
    try:
        detail = sales_order_service.get_sales_order(
            sales_order, expand_items=expand_items, expand_partner=expand_partner, select_fields=fields
        )
    except SapApiError as exc:
        raise HTTPException(
            status_code=502,
            detail=ErrorResponse(error=ErrorDetail(code="SAP_API_ERROR", message=exc.message)).model_dump(),
        ) from exc

    if detail is None:
        raise HTTPException(
            status_code=404,
            detail=ErrorResponse(
                error=ErrorDetail(code="SALES_ORDER_NOT_FOUND", message=f"Sales order {sales_order} not found")
            ).model_dump(),
        )
    return ApiResponse(data=detail)


@router.post("/sync", response_model=ApiResponse[SalesOrderSyncResult])
def sync_sales_orders_from_sap(
    sales_order_type: str | None = Query(default=None, alias="salesOrderType"),
    sales_organization: str = Query(default=settings.default_sales_organization, alias="salesOrganization"),
    distribution_channel: str = Query(default=settings.default_distribution_channel, alias="distributionChannel"),
    organization_division: str = Query(default=settings.default_division, alias="organizationDivision"),
    sync_materials: bool = Query(default=True, alias="syncMaterials"),
    page_size: int = Query(default=100, ge=1, le=500, alias="pageSize"),
    fields: str | None = Query(default=settings.so_default_select, alias="fields"),
    expand_partner: bool = Query(default=False, alias="expandPartner"),
):
    """
    Pull sales orders (with _Item) from SAP and auto-upsert portal_material.
    Requires API_SALESORDER authorization on the communication user.
    """
    try:
        result = sales_order_service.sync_from_sap(
            sales_order_type=sales_order_type,
            sales_organization=sales_organization,
            distribution_channel=distribution_channel,
            organization_division=organization_division,
            sync_materials=sync_materials,
            page_size=page_size,
            select_fields=fields,
            expand_partner=expand_partner,
        )
    except SapApiError as exc:
        raise HTTPException(
            status_code=502,
            detail=ErrorResponse(error=ErrorDetail(code="SAP_API_ERROR", message=exc.message)).model_dump(),
        ) from exc

    return ApiResponse(data=result)


@router.post("/sync-from-payload", response_model=ApiResponse[SalesOrderSyncResult])
def sync_sales_orders_from_payload(body: dict):
    """
    Upsert materials from OData payload when SAP live sync is unavailable.
    Body: { "value": [ { "SalesOrder": "...", "_Item": [ ... ] } ] }
    """
    orders = body.get("value") or body.get("orders") or []
    if not isinstance(orders, list):
        raise HTTPException(
            status_code=400,
            detail=ErrorResponse(
                error=ErrorDetail(code="INVALID_PAYLOAD", message="Expected 'value' or 'orders' array")
            ).model_dump(),
        )
    result = sales_order_service.sync_from_payload(orders, source="payload", sync_materials=True)
    return ApiResponse(data=result)


@router.post("/sync-from-sample", response_model=ApiResponse[SalesOrderSyncResult])
def sync_sales_orders_from_sample(
    sample_path: str | None = Query(default=None, alias="samplePath"),
):
    """Load bundled/local sample orders+items and auto-sync materials (offline dev)."""
    try:
        result = sales_order_service.sync_from_local_sample(sample_path)
    except FileNotFoundError as exc:
        raise HTTPException(
            status_code=404,
            detail=ErrorResponse(error=ErrorDetail(code="SAMPLE_NOT_FOUND", message=str(exc))).model_dump(),
        ) from exc
    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail=ErrorResponse(error=ErrorDetail(code="INVALID_SAMPLE", message=str(exc))).model_dump(),
        ) from exc
    return ApiResponse(data=result)
