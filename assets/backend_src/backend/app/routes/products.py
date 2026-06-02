from fastapi import APIRouter, HTTPException, Query

from app.sap.client import SapApiError
from app.schemas.common import ApiResponse, ErrorDetail, ErrorResponse
from app.schemas.products import ProductSummaryDto
from app.services.products import product_service

router = APIRouter(prefix="/api/v1/products", tags=["products"])


def _sap_error(exc: SapApiError) -> HTTPException:
    return HTTPException(
        status_code=502,
        detail=ErrorResponse(
            error=ErrorDetail(
                code="SAP_PRODUCT_ERROR",
                message=f"{exc.message} (HTTP {exc.status_code})",
            )
        ).model_dump(),
    )


@router.get("", response_model=ApiResponse[list[ProductSummaryDto]])
def list_products(
    product: str | None = Query(default=None),
    product_group: str | None = Query(default=None, alias="productGroup"),
    top: int = Query(default=50, ge=1, le=200),
):
    try:
        rows = product_service.list_products(
            product=product,
            product_group=product_group,
            top=top,
        )
    except SapApiError as exc:
        raise _sap_error(exc) from exc
    return ApiResponse(data=rows)


@router.get("/{product}", response_model=ApiResponse[ProductSummaryDto])
def get_product(product: str):
    try:
        row = product_service.get_product(product)
    except SapApiError as exc:
        raise _sap_error(exc) from exc
    if row is None:
        raise HTTPException(
            status_code=404,
            detail=ErrorResponse(
                error=ErrorDetail(code="PRODUCT_NOT_FOUND", message=f"Product {product} not found")
            ).model_dump(),
        )
    return ApiResponse(data=row)
