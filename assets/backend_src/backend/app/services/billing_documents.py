import json
from datetime import date
from pathlib import Path
from typing import Any

from app.config import settings
from app.sap.client import SapODataClient
from app.sap.transforms import nav_results, parse_sap_v2_date
from app.schemas.billing_documents import BillingDocumentPortalRowDto

ITEM_ENTITY = "A_BillingDocumentItem"
HEADER_ENTITY = "A_BillingDocument"


def _escape_odata(value: str) -> str:
    return value.replace("'", "''")


def _to_float(value: Any) -> float:
    if value is None or value == "":
        return 0.0
    return float(value)


def _parse_date(value: Any) -> date | None:
    parsed = parse_sap_v2_date(value)
    if not parsed:
        return None
    try:
        return date.fromisoformat(parsed[:10])
    except ValueError:
        return None


def _sales_order_line(sales_order: str | None, sales_order_item: str | None) -> str | None:
    if not sales_order:
        return None
    if sales_order_item:
        return f"{sales_order}/{sales_order_item}"
    return sales_order


def _header_lookup(headers: list[dict[str, Any]]) -> dict[str, dict[str, Any]]:
    lookup: dict[str, dict[str, Any]] = {}
    for header in headers:
        billing_document = header.get("BillingDocument")
        if not billing_document:
            continue
        lookup[str(billing_document)] = {
            "billingDate": _parse_date(
                header.get("BillingDocumentDate") or header.get("CreationDate")
            ),
            "customerCode": header.get("SoldToParty"),
            "customerName": header.get("SoldToPartyName") or header.get("SoldToParty"),
            "currency": header.get("TransactionCurrency") or "CNY",
        }
    return lookup


def map_portal_row(
    item: dict[str, Any],
    header_info: dict[str, Any] | None = None,
) -> BillingDocumentPortalRowDto:
    header_info = header_info or {}
    sales_order = item.get("ReferenceSDDocument")
    sales_order_item = item.get("ReferenceSDDocumentItem")
    return BillingDocumentPortalRowDto(
        billingDocument=str(item.get("BillingDocument") or ""),
        billingDocumentItem=str(item.get("BillingDocumentItem") or ""),
        salesOrder=sales_order,
        salesOrderItem=sales_order_item,
        salesOrderLine=_sales_order_line(sales_order, sales_order_item),
        customerCode=header_info.get("customerCode"),
        customerName=header_info.get("customerName"),
        material=item.get("Material"),
        materialName=item.get("BillingDocumentItemText") or item.get("MaterialDescription"),
        billingDate=header_info.get("billingDate"),
        billingQuantity=_to_float(item.get("BillingQuantity") or item.get("RequestedQuantity")),
        unit=item.get("BillingQuantityUnit") or item.get("BaseUnit"),
        netAmount=_to_float(item.get("NetAmount") or item.get("ConditionAmount")),
        taxAmount=_to_float(item.get("TaxAmount")),
        currency=header_info.get("currency") or item.get("TransactionCurrency") or "CNY",
    )


class BillingDocumentService:
    def __init__(self) -> None:
        self.client = SapODataClient(service_path=settings.sap_billing_path)

    def _fetch_headers(self, billing_documents: list[str]) -> dict[str, dict[str, Any]]:
        if not billing_documents:
            return {}
        merged: dict[str, dict[str, Any]] = {}
        chunk_size = 15
        for index in range(0, len(billing_documents), chunk_size):
            chunk = billing_documents[index : index + chunk_size]
            doc_filter = " or ".join(
                f"BillingDocument eq '{_escape_odata(doc)}'" for doc in chunk
            )
            params: dict[str, Any] = {
                "$filter": doc_filter,
                "$top": len(chunk),
                "$select": settings.billing_header_default_select,
            }
            payload = self.client.get_entity_set(HEADER_ENTITY, params)
            merged.update(_header_lookup(payload.get("results", [])))
        return merged

    def list_billing_items(
        self,
        sales_order: str | None = None,
        material: str | None = None,
        top: int = 100,
    ) -> list[dict[str, Any]]:
        parts: list[str] = []
        if sales_order:
            parts.append(f"ReferenceSDDocument eq '{_escape_odata(sales_order.strip())}'")
        if material:
            parts.append(f"Material eq '{_escape_odata(material.strip())}'")
        params: dict[str, Any] = {
            "$top": top,
            "$orderby": "BillingDocument desc,BillingDocumentItem asc",
            "$select": settings.billing_item_default_select,
        }
        if parts:
            params["$filter"] = " and ".join(parts)
        payload = self.client.get_entity_set(ITEM_ENTITY, params)
        return payload.get("results", [])

    def list_portal_summary(
        self,
        sales_order: str | None = None,
        material: str | None = None,
        top: int = 100,
    ) -> list[BillingDocumentPortalRowDto]:
        items = self.list_billing_items(sales_order=sales_order, material=material, top=top)
        billing_docs = sorted({str(row.get("BillingDocument")) for row in items if row.get("BillingDocument")})
        header_lookup = self._fetch_headers(billing_docs)
        return [
            map_portal_row(item, header_lookup.get(str(item.get("BillingDocument"))))
            for item in items
        ]

    def load_sample_payload(self) -> dict[str, Any]:
        path = Path(settings.billing_sync_sample_path)
        if not path.exists():
            raise FileNotFoundError(f"Sample file not found: {path}")
        return json.loads(path.read_text(encoding="utf-8"))

    def list_portal_summary_from_payload(self, payload: dict[str, Any]) -> list[BillingDocumentPortalRowDto]:
        items = payload.get("items") or payload.get("A_BillingDocumentItem") or []
        headers = payload.get("headers") or payload.get("A_BillingDocument") or []
        header_lookup = _header_lookup(headers)
        return [
            map_portal_row(item, header_lookup.get(str(item.get("BillingDocument"))))
            for item in items
        ]


billing_document_service = BillingDocumentService()
