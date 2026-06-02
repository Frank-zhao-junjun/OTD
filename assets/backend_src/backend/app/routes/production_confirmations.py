from fastapi import APIRouter, HTTPException, Query

from app.sap.client import SapApiError
from app.schemas.common import ApiResponse, ErrorDetail, ErrorResponse
from app.schemas.production_confirmations import ProductionConfirmationPortalRowDto
from app.services.production_confirmations import production_confirmation_service

router = APIRouter(prefix="/api/v1/production-confirmations", tags=["production-confirmations"])


def _sap_error(exc: SapApiError) -> HTTPException:
    return HTTPException(
        status_code=502,
        detail=ErrorResponse(
            error=ErrorDetail(
                code="SAP_PRODUCTION_CONFIRMATION_ERROR",
                message=f"{exc.message} (HTTP {exc.status_code})",
            )
        ).model_dump(),
    )


@router.get("/by-order/{production_order}", response_model=ApiResponse[list[ProductionConfirmationPortalRowDto]])
def list_by_production_order(production_order: str, top: int = Query(default=50, ge=1, le=200)):
    try:
        rows = production_confirmation_service.list_by_production_order(production_order, top=top)
    except SapApiError as exc:
        raise _sap_error(exc) from exc
    return ApiResponse(data=rows)


@router.get("/recent", response_model=ApiResponse[list[ProductionConfirmationPortalRowDto]])
def list_recent(top: int = Query(default=100, ge=1, le=500)):
    try:
        rows = production_confirmation_service.list_recent(top=top)
    except SapApiError as exc:
        raise _sap_error(exc) from exc
    return ApiResponse(data=rows)


@router.post("/sync-from-sample", response_model=ApiResponse[list[ProductionConfirmationPortalRowDto]])
def sync_from_sample():
    try:
        payload = production_confirmation_service.load_sample_payload()
        rows = production_confirmation_service.list_from_payload(payload)
    except FileNotFoundError as exc:
        raise HTTPException(
            status_code=404,
            detail=ErrorResponse(error=ErrorDetail(code="SAMPLE_NOT_FOUND", message=str(exc))).model_dump(),
        ) from exc
    return ApiResponse(data=rows)
