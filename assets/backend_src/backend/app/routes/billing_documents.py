from fastapi import APIRouter, HTTPException, Query

from app.sap.client import SapApiError
from app.schemas.billing_documents import BillingDocumentPortalRowDto
from app.schemas.common import ApiResponse, ErrorDetail, ErrorResponse
from app.services.billing_documents import billing_document_service

router = APIRouter(prefix="/api/v1/billing-documents", tags=["billing-documents"])


def _sap_error(exc: SapApiError) -> HTTPException:
    return HTTPException(
        status_code=502,
        detail=ErrorResponse(
            error=ErrorDetail(
                code="SAP_BILLING_DOCUMENT_ERROR",
                message=f"{exc.message} (HTTP {exc.status_code})",
            )
        ).model_dump(),
    )


@router.get("/summary", response_model=ApiResponse[list[BillingDocumentPortalRowDto]])
def portal_billing_summary(
    sales_order: str | None = Query(default=None, alias="salesOrder"),
    material: str | None = Query(default=None),
    top: int = Query(default=100, ge=1, le=500),
):
    try:
        rows = billing_document_service.list_portal_summary(
            sales_order=sales_order,
            material=material,
            top=top,
        )
    except SapApiError as exc:
        raise _sap_error(exc) from exc
    return ApiResponse(data=rows)


@router.post("/sync-from-sample", response_model=ApiResponse[list[BillingDocumentPortalRowDto]])
def sync_from_sample():
    try:
        payload = billing_document_service.load_sample_payload()
        rows = billing_document_service.list_portal_summary_from_payload(payload)
    except FileNotFoundError as exc:
        raise HTTPException(
            status_code=404,
            detail=ErrorResponse(error=ErrorDetail(code="SAMPLE_NOT_FOUND", message=str(exc))).model_dump(),
        ) from exc
    return ApiResponse(data=rows)
