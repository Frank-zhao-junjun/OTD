from fastapi import APIRouter, HTTPException, Query

from app.sap.client import SapApiError
from app.schemas.common import ApiResponse, ErrorDetail, ErrorResponse
from app.schemas.material_documents import MaterialDocumentPortalRowDto
from app.services.material_documents import material_document_service

router = APIRouter(prefix="/api/v1/material-documents", tags=["material-documents"])


def _sap_error(exc: SapApiError) -> HTTPException:
    return HTTPException(
        status_code=502,
        detail=ErrorResponse(
            error=ErrorDetail(
                code="SAP_MATERIAL_DOCUMENT_ERROR",
                message=f"{exc.message} (HTTP {exc.status_code})",
            )
        ).model_dump(),
    )


@router.get("", response_model=ApiResponse[list[MaterialDocumentPortalRowDto]])
def list_material_documents(
    delivery_document: str | None = Query(default=None, alias="deliveryDocument"),
    production_order: str | None = Query(default=None, alias="productionOrder"),
    material: str | None = Query(default=None),
    goods_movement_type: str | None = Query(default=None, alias="goodsMovementType"),
    top: int = Query(default=100, ge=1, le=500),
):
    try:
        rows = material_document_service.list_items(
            delivery_document=delivery_document,
            production_order=production_order,
            material=material,
            goods_movement_type=goods_movement_type,
            top=top,
        )
    except SapApiError as exc:
        raise _sap_error(exc) from exc
    return ApiResponse(data=rows)


@router.post("/sync-from-sample", response_model=ApiResponse[list[MaterialDocumentPortalRowDto]])
def sync_from_sample():
    try:
        payload = material_document_service.load_sample_payload()
        rows = material_document_service.list_from_payload(payload)
    except FileNotFoundError as exc:
        raise HTTPException(
            status_code=404,
            detail=ErrorResponse(error=ErrorDetail(code="SAMPLE_NOT_FOUND", message=str(exc))).model_dump(),
        ) from exc
    return ApiResponse(data=rows)
