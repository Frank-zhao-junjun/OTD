from fastapi import APIRouter, HTTPException, Query

from app.config import settings
from app.sap.client import SapApiError
from app.schemas.common import ApiResponse, ErrorDetail, ErrorResponse
from app.schemas.outbound_deliveries import OutboundDeliveryItemDto, OutboundDeliveryPortalRowDto
from app.services.outbound_deliveries import outbound_delivery_service

router = APIRouter(prefix="/api/v1/outbound-deliveries", tags=["outbound-deliveries"])


def _sap_http_error(exc: SapApiError) -> HTTPException:
    return HTTPException(
        status_code=502,
        detail=ErrorResponse(
            error=ErrorDetail(
                code="SAP_OUTBOUND_DELIVERY_ERROR",
                message=f"{exc.message} (HTTP {exc.status_code})",
            )
        ).model_dump(),
    )


@router.get("/summary", response_model=ApiResponse[list[OutboundDeliveryPortalRowDto]])
def portal_delivery_summary(
    sales_order: str | None = Query(default=None, alias="salesOrder"),
    material: str | None = Query(default=None),
    plant: str | None = Query(default=settings.default_plant),
    top: int = Query(default=100, ge=1, le=500),
):
    """
    Portal 发货清单：仅返回已完成 PGI 的外向交货行。
    需要 Fiori CA SAP_COM_0106 授权 API_OUTBOUND_DELIVERY_SRV。
    """
    try:
        rows = outbound_delivery_service.list_portal_summary(
            sales_order=sales_order,
            material=material,
            plant=plant,
            top=top,
        )
    except SapApiError as exc:
        raise _sap_http_error(exc) from exc
    return ApiResponse(data=rows)


@router.get("", response_model=ApiResponse[list[OutboundDeliveryItemDto]])
def list_outbound_delivery_items(
    sales_order: str | None = Query(default=None, alias="salesOrder"),
    material: str | None = Query(default=None),
    plant: str | None = Query(default=None),
    top: int = Query(default=50, ge=1, le=500),
):
    try:
        dto_rows = outbound_delivery_service.list_item_details(
            sales_order=sales_order,
            material=material,
            plant=plant,
            top=top,
        )
    except SapApiError as exc:
        raise _sap_http_error(exc) from exc
    return ApiResponse(data=dto_rows)


@router.get(
    "/{delivery_document}/items/{delivery_document_item}",
    response_model=ApiResponse[OutboundDeliveryItemDto],
)
def get_outbound_delivery_item(delivery_document: str, delivery_document_item: str):
    try:
        detail = outbound_delivery_service.get_item(delivery_document, delivery_document_item)
    except SapApiError as exc:
        raise _sap_http_error(exc) from exc
    if detail is None:
        raise HTTPException(
            status_code=404,
            detail=ErrorResponse(
                error=ErrorDetail(
                    code="OUTBOUND_DELIVERY_NOT_FOUND",
                    message=(
                        f"Delivery item {delivery_document}/{delivery_document_item} not found"
                    ),
                )
            ).model_dump(),
        )
    return ApiResponse(data=detail)


@router.post("/sync-from-sample", response_model=ApiResponse[list[OutboundDeliveryPortalRowDto]])
def sync_from_sample():
    """Offline portal list using 接口/Outbound Delivery/OutboundDelivery sync sample.json."""
    try:
        payload = outbound_delivery_service.load_sample_payload()
        rows = outbound_delivery_service.list_portal_summary_from_payload(payload)
    except FileNotFoundError as exc:
        raise HTTPException(
            status_code=404,
            detail=ErrorResponse(
                error=ErrorDetail(code="SAMPLE_NOT_FOUND", message=str(exc))
            ).model_dump(),
        ) from exc
    return ApiResponse(data=rows)
