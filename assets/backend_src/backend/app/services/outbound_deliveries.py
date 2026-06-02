import json
from datetime import date
from pathlib import Path
from typing import Any

from app.config import settings
from app.sap.client import SapApiError, SapODataClient
from app.sap.transforms import nav_results, parse_sap_v2_date
from app.schemas.outbound_deliveries import OutboundDeliveryItemDto, OutboundDeliveryPortalRowDto
from app.schemas.material_documents import MaterialDocumentPortalRowDto
from app.services.material_documents import build_delivery_lookup, material_document_service

ITEM_ENTITY = "A_OutbDeliveryItem"
HEADER_ENTITY = "A_OutbDeliveryHeader"

PGI_COMPLETE_STATUS = "C"
BILLING_FLOW_CATEGORIES = {"M", "O", "P", "U", "6", "N"}


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


def _material_document_from_flow(flow_rows: list[dict[str, Any]]) -> str | None:
    for row in flow_rows:
        subsequent = (
            row.get("Subsequentdocument")
            or row.get("SubsequentDocument")
            or row.get("subsequentdocument")
        )
        category = str(row.get("SubsequentDocumentCategory") or "").strip().upper()
        if not subsequent:
            continue
        if category and category in BILLING_FLOW_CATEGORIES:
            continue
        return str(subsequent)
    return None


def _partner_name(partners: list[dict[str, Any]], sold_to_party: str | None = None) -> tuple[str | None, str | None]:
    preferred = None
    fallback = None
    for partner in partners:
        function = str(partner.get("PartnerFunction") or "").strip().upper()
        customer_code = partner.get("Customer") or None
        address = partner.get("to_Address") or {}
        if isinstance(address, dict) and "results" in address:
            address = address["results"][0] if address["results"] else {}
        name = (
            address.get("FullName")
            or address.get("BusinessPartnerName1")
            or address.get("OrganizationBPName1")
        )
        if function == "SP":
            return customer_code, name
        if sold_to_party and customer_code == sold_to_party:
            preferred = (customer_code, name)
        if name and fallback is None:
            fallback = (customer_code, name)
    return preferred or fallback or (sold_to_party, None)


def _header_lookup(headers: list[dict[str, Any]]) -> dict[str, dict[str, Any]]:
    lookup: dict[str, dict[str, Any]] = {}
    for header in headers:
        delivery_document = header.get("DeliveryDocument")
        if not delivery_document:
            continue
        partners = nav_results(header, "to_DeliveryDocumentPartner")
        customer_code, customer_name = _partner_name(partners, header.get("SoldToParty"))
        lookup[str(delivery_document)] = {
            "postingDate": _parse_date(header.get("ActualGoodsMovementDate")),
            "customerCode": customer_code or header.get("SoldToParty"),
            "customerName": customer_name,
            "soldToParty": header.get("SoldToParty"),
        }
    return lookup


def _sales_order_line(sales_order: str | None, sales_order_item: str | None) -> str | None:
    if not sales_order:
        return None
    if sales_order_item:
        return f"{sales_order}/{sales_order_item}"
    return sales_order


def map_portal_row(
    item: dict[str, Any],
    header_info: dict[str, Any] | None = None,
) -> OutboundDeliveryPortalRowDto:
    header_info = header_info or {}
    flow_rows = nav_results(item, "to_DocumentFlow")
    sales_order = item.get("ReferenceSDDocument")
    sales_order_item = item.get("ReferenceSDDocumentItem")
    posted_qty = _to_float(item.get("ActualDeliveryQuantity") or item.get("ActualDeliveredQtyInBaseUnit"))
    return OutboundDeliveryPortalRowDto(
        deliveryDocument=str(item.get("DeliveryDocument") or ""),
        deliveryDocumentItem=str(item.get("DeliveryDocumentItem") or ""),
        salesOrder=sales_order,
        salesOrderItem=sales_order_item,
        salesOrderLine=_sales_order_line(sales_order, sales_order_item),
        customerCode=header_info.get("customerCode"),
        customerName=header_info.get("customerName"),
        material=item.get("Material"),
        materialName=item.get("DeliveryDocumentItemText"),
        postedQuantity=posted_qty,
        unit=item.get("DeliveryQuantityUnit") or item.get("BaseUnit"),
        postingDate=header_info.get("postingDate"),
        materialDocument=_material_document_from_flow(flow_rows),
    )


def map_item_dto(
    item: dict[str, Any],
    header_info: dict[str, Any] | None = None,
) -> OutboundDeliveryItemDto:
    header_info = header_info or {}
    flow_rows = nav_results(item, "to_DocumentFlow")
    return OutboundDeliveryItemDto(
        deliveryDocument=str(item.get("DeliveryDocument") or ""),
        deliveryDocumentItem=str(item.get("DeliveryDocumentItem") or ""),
        referenceSDDocument=item.get("ReferenceSDDocument"),
        referenceSDDocumentItem=item.get("ReferenceSDDocumentItem"),
        material=item.get("Material"),
        deliveryDocumentItemText=item.get("DeliveryDocumentItemText"),
        actualDeliveryQuantity=_to_float(item.get("ActualDeliveryQuantity")),
        actualDeliveredQtyInBaseUnit=_to_float(item.get("ActualDeliveredQtyInBaseUnit")),
        deliveryQuantityUnit=item.get("DeliveryQuantityUnit"),
        goodsMovementStatus=item.get("GoodsMovementStatus"),
        materialDocument=_material_document_from_flow(flow_rows),
        postingDate=header_info.get("postingDate"),
        customerCode=header_info.get("customerCode"),
        customerName=header_info.get("customerName"),
    )


def _delivery_item_key(delivery_document: str, delivery_document_item: str | None) -> str:
    item = str(delivery_document_item or "")
    stripped = item.lstrip("0") or item
    return f"{delivery_document}|{stripped}"


def _resolve_material_document_row(
    row: OutboundDeliveryPortalRowDto,
    lookup: dict[str, MaterialDocumentPortalRowDto],
) -> MaterialDocumentPortalRowDto | None:
    keys = [
        _delivery_item_key(row.deliveryDocument, row.deliveryDocumentItem),
        f"{row.deliveryDocument}|{row.deliveryDocumentItem}",
        f"{row.deliveryDocument}|",
    ]
    for key in keys:
        matched = lookup.get(key)
        if matched:
            return matched
    return None


def enrich_rows_with_material_documents(
    rows: list[OutboundDeliveryPortalRowDto],
) -> list[OutboundDeliveryPortalRowDto]:
    if not rows:
        return rows

    delivery_documents = sorted({row.deliveryDocument for row in rows if row.deliveryDocument})
    matdoc_rows: list[MaterialDocumentPortalRowDto] = []
    try:
        matdoc_rows = material_document_service.list_for_deliveries(
            delivery_documents,
            goods_movement_type="601",
        )
    except SapApiError:
        matdoc_rows = []

    if not matdoc_rows:
        try:
            matdoc_rows = material_document_service.list_from_sample_for_deliveries(delivery_documents)
        except FileNotFoundError:
            return rows

    lookup = build_delivery_lookup(matdoc_rows)
    enriched: list[OutboundDeliveryPortalRowDto] = []
    for row in rows:
        matched = _resolve_material_document_row(row, lookup)
        if not matched:
            enriched.append(row)
            continue
        enriched.append(
            row.model_copy(
                update={
                    "materialDocument": row.materialDocument or matched.materialDocument,
                    "materialDocumentYear": matched.materialDocumentYear,
                    "materialDocumentItem": matched.materialDocumentItem,
                    "goodsMovementType": matched.goodsMovementType,
                    "materialDocumentPostingDate": matched.postingDate,
                }
            )
        )
    return enriched


class OutboundDeliveryService:
    def __init__(self) -> None:
        self.client = SapODataClient(service_path=settings.sap_od_path)

    def _build_posted_filter(
        self,
        sales_order: str | None = None,
        material: str | None = None,
        plant: str | None = None,
        posted_only: bool = True,
    ) -> str:
        parts: list[str] = []
        if posted_only:
            parts.append(f"GoodsMovementStatus eq '{PGI_COMPLETE_STATUS}'")
            parts.append("ActualDeliveryQuantity gt 0")
        if sales_order:
            parts.append(f"ReferenceSDDocument eq '{_escape_odata(sales_order.strip())}'")
        if material:
            parts.append(f"Material eq '{_escape_odata(material.strip())}'")
        if plant:
            parts.append(f"Plant eq '{_escape_odata(plant.strip())}'")
        return " and ".join(parts)

    def _fetch_headers_for_items(self, items: list[dict[str, Any]]) -> dict[str, dict[str, Any]]:
        delivery_documents = sorted(
            {str(row.get("DeliveryDocument")) for row in items if row.get("DeliveryDocument")}
        )
        if not delivery_documents:
            return {}

        chunks: list[dict[str, dict[str, Any]]] = []
        chunk_size = 15
        for index in range(0, len(delivery_documents), chunk_size):
            chunk = delivery_documents[index : index + chunk_size]
            doc_filter = " or ".join(
                f"DeliveryDocument eq '{_escape_odata(doc)}'" for doc in chunk
            )
            params: dict[str, Any] = {
                "$filter": doc_filter,
                "$expand": "to_DeliveryDocumentPartner/to_Address",
                "$top": len(chunk),
            }
            payload = self.client.get_entity_set(HEADER_ENTITY, params)
            chunks.append(_header_lookup(payload.get("results", [])))
        merged: dict[str, dict[str, Any]] = {}
        for chunk in chunks:
            merged.update(chunk)
        return merged

    def list_posted_items(
        self,
        sales_order: str | None = None,
        material: str | None = None,
        plant: str | None = None,
        top: int = 100,
    ) -> list[dict[str, Any]]:
        filter_expr = self._build_posted_filter(
            sales_order=sales_order,
            material=material,
            plant=plant,
            posted_only=True,
        )
        params: dict[str, Any] = {
            "$filter": filter_expr,
            "$expand": "to_DocumentFlow",
            "$top": top,
            "$orderby": "DeliveryDocument desc,DeliveryDocumentItem asc",
        }
        payload = self.client.get_entity_set(ITEM_ENTITY, params)
        return payload.get("results", [])

    def list_portal_summary(
        self,
        sales_order: str | None = None,
        material: str | None = None,
        plant: str | None = None,
        top: int = 100,
    ) -> list[OutboundDeliveryPortalRowDto]:
        items = self.list_posted_items(
            sales_order=sales_order,
            material=material,
            plant=plant,
            top=top,
        )
        header_lookup = self._fetch_headers_for_items(items)
        rows = [
            map_portal_row(item, header_lookup.get(str(item.get("DeliveryDocument"))))
            for item in items
        ]
        return enrich_rows_with_material_documents(rows)

    def list_item_details(
        self,
        sales_order: str | None = None,
        material: str | None = None,
        plant: str | None = None,
        top: int = 50,
    ) -> list[OutboundDeliveryItemDto]:
        items = self.list_posted_items(
            sales_order=sales_order,
            material=material,
            plant=plant,
            top=top,
        )
        header_lookup = self._fetch_headers_for_items(items)
        return [
            map_item_dto(item, header_lookup.get(str(item.get("DeliveryDocument"))))
            for item in items
        ]

    def get_item(
        self,
        delivery_document: str,
        delivery_document_item: str,
        *,
        expand_document_flow: bool = True,
    ) -> OutboundDeliveryItemDto | None:
        key = (
            f"(DeliveryDocument='{_escape_odata(delivery_document)}',"
            f"DeliveryDocumentItem='{_escape_odata(delivery_document_item)}')"
        )
        params: dict[str, Any] = {}
        if expand_document_flow:
            params["$expand"] = "to_DocumentFlow"
        row = self.client.get_entity_by_key(ITEM_ENTITY, key, params)
        if not row:
            return None
        header_key = f"(DeliveryDocument='{_escape_odata(delivery_document)}')"
        header = self.client.get_entity_by_key(
            HEADER_ENTITY,
            header_key,
            {"$expand": "to_DeliveryDocumentPartner/to_Address"},
        )
        header_info = _header_lookup([header]).get(delivery_document, {})
        return map_item_dto(row, header_info)

    def load_sample_payload(self) -> dict[str, Any]:
        sample_path = Path(settings.od_sync_sample_path)
        if not sample_path.exists():
            raise FileNotFoundError(f"Sample file not found: {sample_path}")
        return json.loads(sample_path.read_text(encoding="utf-8"))

    def list_portal_summary_from_payload(self, payload: dict[str, Any]) -> list[OutboundDeliveryPortalRowDto]:
        items = payload.get("items") or payload.get("A_OutbDeliveryItem") or []
        headers = payload.get("headers") or payload.get("A_OutbDeliveryHeader") or []
        header_lookup = _header_lookup(headers)
        rows = [
            map_portal_row(item, header_lookup.get(str(item.get("DeliveryDocument"))))
            for item in items
            if str(item.get("GoodsMovementStatus") or PGI_COMPLETE_STATUS) == PGI_COMPLETE_STATUS
        ]
        return enrich_rows_with_material_documents(rows)


outbound_delivery_service = OutboundDeliveryService()
