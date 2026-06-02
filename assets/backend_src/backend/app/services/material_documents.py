import json
from datetime import date
from pathlib import Path
from typing import Any

from app.config import settings
from app.sap.client import SapODataClient
from app.sap.transforms import parse_sap_v2_date
from app.schemas.material_documents import MaterialDocumentPortalRowDto

ITEM_ENTITY = "A_MaterialDocumentItem"
HEADER_ENTITY = "A_MaterialDocumentHeader"


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


def map_portal_row(item: dict[str, Any], header_info: dict[str, Any] | None = None) -> MaterialDocumentPortalRowDto:
    header_info = header_info or {}
    return MaterialDocumentPortalRowDto(
        materialDocument=str(item.get("MaterialDocument") or ""),
        materialDocumentYear=str(item.get("MaterialDocumentYear") or header_info.get("materialDocumentYear") or ""),
        materialDocumentItem=str(item.get("MaterialDocumentItem") or "") or None,
        material=item.get("Material"),
        materialName=item.get("MaterialDocumentItemText") or item.get("MaterialName"),
        plant=item.get("Plant"),
        storageLocation=item.get("StorageLocation"),
        quantity=_to_float(item.get("QuantityInEntryUnit") or item.get("EntryQuantity")),
        unit=item.get("EntryUnit") or item.get("MaterialBaseUnit"),
        postingDate=_parse_date(header_info.get("postingDate") or item.get("PostingDate")),
        goodsMovementType=item.get("GoodsMovementType"),
        deliveryDocument=item.get("Delivery") or item.get("DeliveryDocument"),
        deliveryDocumentItem=item.get("DeliveryItem") or item.get("DeliveryDocumentItem"),
        productionOrder=item.get("ManufacturingOrder") or item.get("OrderID"),
        salesOrder=item.get("SalesOrder") or item.get("SDDocument"),
        salesOrderItem=item.get("SalesOrderItem") or item.get("SDDocumentItem"),
    )


def _header_lookup(headers: list[dict[str, Any]]) -> dict[str, dict[str, Any]]:
    lookup: dict[str, dict[str, Any]] = {}
    for header in headers:
        key = f"{header.get('MaterialDocument')}|{header.get('MaterialDocumentYear')}"
        lookup[key] = {
            "materialDocumentYear": header.get("MaterialDocumentYear"),
            "postingDate": _parse_date(header.get("PostingDate") or header.get("DocumentDate")),
        }
    return lookup


class MaterialDocumentService:
    def __init__(self) -> None:
        self.client = SapODataClient(service_path=settings.sap_matdoc_path)

    def _build_filter(
        self,
        delivery_document: str | None = None,
        production_order: str | None = None,
        material: str | None = None,
        goods_movement_type: str | None = None,
    ) -> str | None:
        parts: list[str] = []
        if delivery_document:
            parts.append(
                f"(Delivery eq '{_escape_odata(delivery_document.strip())}' "
                f"or DeliveryDocument eq '{_escape_odata(delivery_document.strip())}')"
            )
        if production_order:
            parts.append(
                f"(ManufacturingOrder eq '{_escape_odata(production_order.strip())}' "
                f"or OrderID eq '{_escape_odata(production_order.strip())}')"
            )
        if material:
            parts.append(f"Material eq '{_escape_odata(material.strip())}'")
        if goods_movement_type:
            parts.append(f"GoodsMovementType eq '{_escape_odata(goods_movement_type.strip())}'")
        if not parts:
            return None
        return " and ".join(parts)

    def list_items(
        self,
        delivery_document: str | None = None,
        production_order: str | None = None,
        material: str | None = None,
        goods_movement_type: str | None = None,
        top: int = 100,
    ) -> list[MaterialDocumentPortalRowDto]:
        filter_expr = self._build_filter(
            delivery_document, production_order, material, goods_movement_type
        )
        params: dict[str, Any] = {
            "$top": top,
            "$orderby": "MaterialDocument desc,MaterialDocumentItem asc",
        }
        if filter_expr:
            params["$filter"] = filter_expr
        payload = self.client.get_entity_set(ITEM_ENTITY, params)
        items = payload.get("results", [])
        keys = {
            f"{row.get('MaterialDocument')}|{row.get('MaterialDocumentYear')}"
            for row in items
            if row.get("MaterialDocument")
        }
        headers: dict[str, dict[str, Any]] = {}
        if keys:
            docs = sorted({k.split("|")[0] for k in keys if k})
            for index in range(0, len(docs), 15):
                chunk = docs[index : index + 15]
                doc_filter = " or ".join(
                    f"MaterialDocument eq '{_escape_odata(doc)}'" for doc in chunk
                )
                header_payload = self.client.get_entity_set(
                    HEADER_ENTITY,
                    {"$filter": doc_filter, "$top": len(chunk)},
                )
                headers.update(_header_lookup(header_payload.get("results", [])))
        rows: list[MaterialDocumentPortalRowDto] = []
        for item in items:
            key = f"{item.get('MaterialDocument')}|{item.get('MaterialDocumentYear')}"
            rows.append(map_portal_row(item, headers.get(key, {})))
        return rows

    def load_sample_payload(self) -> dict[str, Any]:
        path = Path(settings.matdoc_sync_sample_path)
        if not path.exists():
            raise FileNotFoundError(f"Sample file not found: {path}")
        return json.loads(path.read_text(encoding="utf-8"))

    def list_from_payload(self, payload: dict[str, Any]) -> list[MaterialDocumentPortalRowDto]:
        items = payload.get("items") or payload.get("A_MaterialDocumentItem") or []
        headers = payload.get("headers") or payload.get("A_MaterialDocumentHeader") or []
        header_lookup = _header_lookup(headers)
        return [
            map_portal_row(
                item,
                header_lookup.get(
                    f"{item.get('MaterialDocument')}|{item.get('MaterialDocumentYear')}"
                ),
            )
            for item in items
        ]

    def list_for_deliveries(
        self,
        delivery_documents: list[str],
        *,
        goods_movement_type: str | None = "601",
        top: int = 200,
    ) -> list[MaterialDocumentPortalRowDto]:
        if not delivery_documents:
            return []
        unique_docs = sorted({doc.strip() for doc in delivery_documents if doc and doc.strip()})
        merged: list[MaterialDocumentPortalRowDto] = []
        chunk_size = 10
        for index in range(0, len(unique_docs), chunk_size):
            chunk = unique_docs[index : index + chunk_size]
            doc_filter = " or ".join(
                f"Delivery eq '{_escape_odata(doc)}'" for doc in chunk
            )
            parts = [f"({doc_filter})"]
            if goods_movement_type:
                parts.append(f"GoodsMovementType eq '{_escape_odata(goods_movement_type)}'")
            params: dict[str, Any] = {
                "$filter": " and ".join(parts),
                "$top": top,
                "$orderby": "MaterialDocument desc,MaterialDocumentItem asc",
            }
            payload = self.client.get_entity_set(ITEM_ENTITY, params)
            items = payload.get("results", [])
            keys = {
                f"{row.get('MaterialDocument')}|{row.get('MaterialDocumentYear')}"
                for row in items
                if row.get("MaterialDocument")
            }
            headers: dict[str, dict[str, Any]] = {}
            if keys:
                docs = sorted({k.split("|")[0] for k in keys if k})
                for header_index in range(0, len(docs), 15):
                    header_chunk = docs[header_index : header_index + 15]
                    doc_header_filter = " or ".join(
                        f"MaterialDocument eq '{_escape_odata(doc)}'" for doc in header_chunk
                    )
                    header_payload = self.client.get_entity_set(
                        HEADER_ENTITY,
                        {"$filter": doc_header_filter, "$top": len(header_chunk)},
                    )
                    headers.update(_header_lookup(header_payload.get("results", [])))
            for item in items:
                key = f"{item.get('MaterialDocument')}|{item.get('MaterialDocumentYear')}"
                merged.append(map_portal_row(item, headers.get(key, {})))
        return merged

    def list_from_sample_for_deliveries(
        self,
        delivery_documents: list[str],
    ) -> list[MaterialDocumentPortalRowDto]:
        payload = self.load_sample_payload()
        rows = self.list_from_payload(payload)
        wanted = {doc.strip() for doc in delivery_documents if doc and doc.strip()}
        if not wanted:
            return rows
        return [row for row in rows if row.deliveryDocument in wanted]


def build_delivery_lookup(
    rows: list[MaterialDocumentPortalRowDto],
) -> dict[str, MaterialDocumentPortalRowDto]:
    """Key: DeliveryDocument|DeliveryDocumentItem (also DeliveryDocument| for header match)."""
    lookup: dict[str, MaterialDocumentPortalRowDto] = {}

    def _item_variants(item: str | None) -> list[str]:
        if not item:
            return [""]
        raw = str(item)
        stripped = raw.lstrip("0") or raw
        variants = {raw, stripped}
        return list(variants)

    for row in rows:
        if not row.deliveryDocument:
            continue
        for item_variant in _item_variants(row.deliveryDocumentItem):
            lookup[f"{row.deliveryDocument}|{item_variant}"] = row
        lookup.setdefault(f"{row.deliveryDocument}|", row)
    return lookup


material_document_service = MaterialDocumentService()
