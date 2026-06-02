from typing import Any

from app.config import settings
from app.sap.client import SapODataClient
from app.schemas.products import ProductSummaryDto

ENTITY = "A_Product"


def _escape_odata(value: str) -> str:
    return value.replace("'", "''")


def map_product(row: dict[str, Any]) -> ProductSummaryDto:
    descriptions = row.get("to_Description") or {}
    description = None
    if isinstance(descriptions, dict):
        results = descriptions.get("results") or []
        if results:
            description = results[0].get("ProductDescription")
    return ProductSummaryDto(
        product=row.get("Product") or "",
        productType=row.get("ProductType"),
        baseUnit=row.get("BaseUnit"),
        productGroup=row.get("ProductGroup"),
        description=description or row.get("ProductDescription"),
    )


class ProductService:
    def __init__(self) -> None:
        self.client = SapODataClient(service_path=settings.sap_product_path)

    def get_product(self, product: str) -> ProductSummaryDto | None:
        key = f"('{_escape_odata(product)}')"
        try:
            row = self.client.get_entity_by_key(ENTITY, key, {"$expand": "to_Description"})
        except Exception:
            return None
        if not row:
            return None
        return map_product(row)

    def list_products(
        self,
        product: str | None = None,
        product_group: str | None = None,
        top: int = 50,
    ) -> list[ProductSummaryDto]:
        parts: list[str] = []
        if product:
            parts.append(f"Product eq '{_escape_odata(product.strip())}'")
        if product_group:
            parts.append(f"ProductGroup eq '{_escape_odata(product_group.strip())}'")
        params: dict[str, Any] = {"$top": top}
        if parts:
            params["$filter"] = " and ".join(parts)
        payload = self.client.get_entity_set(ENTITY, params)
        return [map_product(row) for row in payload.get("results", [])]


product_service = ProductService()
