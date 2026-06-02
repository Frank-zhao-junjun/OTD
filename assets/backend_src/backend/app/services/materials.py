from typing import Any

from app.db import materials_repo
from app.schemas.materials import MaterialDto, SyncFromOrderItemsResult


def _map_row(row: dict[str, Any]) -> MaterialDto:
    return MaterialDto(
        materialCode=row["material_code"],
        materialName=row.get("material_name"),
        baseUnit=row.get("base_unit"),
        plant=row.get("plant"),
        storageLocation=row.get("storage_location"),
        firstSeenSalesOrder=row.get("first_seen_sales_order"),
        firstSeenSalesOrderItem=row.get("first_seen_sales_order_item"),
        lastSeenSalesOrder=row.get("last_seen_sales_order"),
        lastSeenSalesOrderItem=row.get("last_seen_sales_order_item"),
        referenceCount=int(row.get("reference_count") or 0),
        createdAt=row.get("created_at"),
        updatedAt=row.get("updated_at"),
    )


def extract_items_from_sales_orders(orders: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Flatten expanded _Item navigation from OData V4 sales orders."""
    items: list[dict[str, Any]] = []
    for order in orders:
        sales_order = order.get("SalesOrder") or order.get("salesOrder") or ""
        nested = order.get("_Item") or order.get("items") or []
        if isinstance(nested, dict):
            nested = nested.get("value") or []
        for raw in nested:
            item = dict(raw)
            item.setdefault("SalesOrder", sales_order)
            item.setdefault("salesOrder", sales_order)
            items.append(item)
    return items


def normalize_order_item(item: dict[str, Any]) -> dict[str, Any]:
    return {
        "product": item.get("product") or item.get("Product"),
        "salesOrderItemText": item.get("salesOrderItemText") or item.get("SalesOrderItemText"),
        "requestedQuantityUnit": (
            item.get("requestedQuantityUnit")
            or item.get("RequestedQuantityISOUnit")
            or item.get("RequestedQuantityUnit")
        ),
        "plant": item.get("plant") or item.get("Plant"),
        "storageLocation": item.get("storageLocation") or item.get("StorageLocation"),
        "salesOrder": item.get("salesOrder") or item.get("SalesOrder"),
        "salesOrderItem": item.get("salesOrderItem") or item.get("SalesOrderItem"),
    }


class MaterialService:
    def list_materials(
        self,
        material_code: str | None = None,
        material_name: str | None = None,
        plant: str | None = None,
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[list[MaterialDto], int]:
        total = materials_repo.count_materials(material_code, material_name, plant)
        rows = materials_repo.list_materials(material_code, material_name, plant, page, page_size)
        return [_map_row(row) for row in rows], total

    def get_material(self, material_code: str) -> MaterialDto | None:
        row = materials_repo.get_material(material_code.strip())
        return _map_row(row) if row else None

    def sync_from_order_items(self, items: list[dict[str, Any]]) -> SyncFromOrderItemsResult:
        normalized = [normalize_order_item(item) for item in items]
        stats = materials_repo.upsert_from_order_items(normalized)
        total = materials_repo.count_materials()
        return SyncFromOrderItemsResult(
            inserted=stats.get("inserted", 0),
            updated=stats.get("updated", 0),
            skipped=stats.get("skipped", 0),
            totalMaterials=total,
        )

    def sync_from_sales_orders(self, orders: list[dict[str, Any]]) -> SyncFromOrderItemsResult:
        items = extract_items_from_sales_orders(orders)
        return self.sync_from_order_items(items)


material_service = MaterialService()
