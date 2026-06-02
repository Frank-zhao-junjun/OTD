from typing import Any

from app.config import settings
from app.db import materials_repo
from app.sap.client import SapODataClient
from app.schemas.material_stock import MaterialStockLineDto, MaterialStockSummaryDto, MaterialStockSyncResult

STOCK_ENTITY_SET = "A_MatlStkInAcctMod"

STOCK_TYPE_UNRESTRICTED = "01"
STOCK_TYPE_QUALITY = "02"
STOCK_TYPE_BLOCKED = "03"


def _escape_odata(value: str) -> str:
    return value.replace("'", "''")


def _to_float(value: Any) -> float:
    if value is None or value == "":
        return 0.0
    return float(value)


def _map_line(row: dict[str, Any]) -> MaterialStockLineDto:
    return MaterialStockLineDto(
        material=row.get("Material", ""),
        plant=row.get("Plant", ""),
        storageLocation=row.get("StorageLocation", ""),
        batch=row.get("Batch", ""),
        supplier=row.get("Supplier", ""),
        customer=row.get("Customer", ""),
        inventorySpecialStockType=row.get("InventorySpecialStockType", ""),
        inventoryStockType=row.get("InventoryStockType", ""),
        materialBaseUnit=row.get("MaterialBaseUnit", ""),
        quantity=_to_float(row.get("MatlWrhsStkQtyInMatlBaseUnit")),
    )


def _build_filter(
    material: str | None,
    plant: str | None,
    storage_location: str | None,
    materials: list[str] | None,
) -> str | None:
    parts: list[str] = []
    if material:
        parts.append(f"Material eq '{_escape_odata(material.strip())}'")
    if plant:
        parts.append(f"Plant eq '{_escape_odata(plant.strip())}'")
    if storage_location:
        parts.append(f"StorageLocation eq '{_escape_odata(storage_location.strip())}'")
    if materials:
        codes = [code.strip() for code in materials if code and code.strip()]
        if codes:
            material_filter = " or ".join(
                f"Material eq '{_escape_odata(code)}'" for code in codes
            )
            parts.append(f"({material_filter})")
    if not parts:
        return None
    return " and ".join(parts)


def _aggregate_lines(lines: list[MaterialStockLineDto]) -> list[MaterialStockSummaryDto]:
    buckets: dict[tuple[str, str, str], MaterialStockSummaryDto] = {}
    for line in lines:
        key = (line.material, line.plant, line.storageLocation)
        summary = buckets.get(key)
        if summary is None:
            summary = MaterialStockSummaryDto(
                material=line.material,
                plant=line.plant,
                storageLocation=line.storageLocation,
                baseUnit=line.materialBaseUnit,
            )
            buckets[key] = summary
        if not summary.baseUnit and line.materialBaseUnit:
            summary.baseUnit = line.materialBaseUnit

        summary.totalQty += line.quantity
        if line.inventoryStockType == STOCK_TYPE_UNRESTRICTED:
            summary.unrestrictedQty += line.quantity
            summary.availableQty += line.quantity
        elif line.inventoryStockType == STOCK_TYPE_QUALITY:
            summary.qualityInspectionQty += line.quantity
        elif line.inventoryStockType == STOCK_TYPE_BLOCKED:
            summary.blockedQty += line.quantity
        else:
            summary.availableQty += line.quantity

    return sorted(
        buckets.values(),
        key=lambda item: (item.material, item.plant, item.storageLocation),
    )


class MaterialStockService:
    def __init__(self) -> None:
        self.client = SapODataClient(service_path=settings.sap_stock_path)

    def list_stock(
        self,
        material: str | None = None,
        plant: str | None = None,
        storage_location: str | None = None,
        page: int = 1,
        page_size: int = 50,
    ) -> tuple[list[MaterialStockLineDto], int]:
        filter_expr = _build_filter(material, plant, storage_location, None)
        params: dict[str, Any] = {
            "$top": page_size,
            "$skip": (page - 1) * page_size,
            "$inlinecount": "allpages",
        }
        if filter_expr:
            params["$filter"] = filter_expr

        payload = self.client.get_entity_set(STOCK_ENTITY_SET, params)
        rows = payload.get("results", [])
        total = int(payload.get("__count", len(rows)))
        return [_map_line(row) for row in rows], total

    def get_material_stock(
        self,
        material: str,
        plant: str | None = None,
        storage_location: str | None = None,
    ) -> list[MaterialStockLineDto]:
        filter_expr = _build_filter(material, plant, storage_location, None)
        params: dict[str, Any] = {"$top": 500}
        if filter_expr:
            params["$filter"] = filter_expr
        rows, _ = self.client.fetch_all_pages(STOCK_ENTITY_SET, params, page_size=100)
        return [_map_line(row) for row in rows]

    def summarize_material_stock(
        self,
        material: str,
        plant: str | None = None,
        storage_location: str | None = None,
    ) -> list[MaterialStockSummaryDto]:
        return _aggregate_lines(self.get_material_stock(material, plant, storage_location))

    def sync_from_portal_materials(
        self,
        plant: str | None = None,
        storage_location: str | None = None,
        page_size: int = 200,
    ) -> MaterialStockSyncResult:
        plant = plant or settings.default_plant
        storage_location = storage_location or settings.default_storage_location
        material_rows = materials_repo.list_materials(
            plant=plant,
            page=1,
            page_size=page_size,
        )
        codes = [row["material_code"] for row in material_rows if row.get("material_code")]
        if not codes:
            return MaterialStockSyncResult(materialsQueried=0, linesFetched=0, summaries=[])

        name_map = {row["material_code"]: row.get("material_name") for row in material_rows}
        plant_map = {row["material_code"]: row.get("plant") for row in material_rows}
        storage_map = {
            row["material_code"]: row.get("storage_location") for row in material_rows
        }

        all_lines: list[MaterialStockLineDto] = []
        chunk_size = 20
        for index in range(0, len(codes), chunk_size):
            chunk = codes[index : index + chunk_size]
            filter_expr = _build_filter(None, plant, storage_location, chunk)
            params: dict[str, Any] = {"$top": 500}
            if filter_expr:
                params["$filter"] = filter_expr
            rows, _ = self.client.fetch_all_pages(STOCK_ENTITY_SET, params, page_size=100)
            all_lines.extend(_map_line(row) for row in rows)

        summaries = _aggregate_lines(all_lines)
        for summary in summaries:
            summary.materialName = name_map.get(summary.material)
            if not summary.plant:
                summary.plant = plant_map.get(summary.material) or plant
            if not summary.storageLocation:
                summary.storageLocation = storage_map.get(summary.material) or storage_location

        return MaterialStockSyncResult(
            materialsQueried=len(codes),
            linesFetched=len(all_lines),
            summaries=summaries,
        )

    def portal_summary(
        self,
        plant: str | None = None,
        storage_location: str | None = None,
        page_size: int = 200,
    ) -> list[MaterialStockSummaryDto]:
        sync_result = self.sync_from_portal_materials(
            plant=plant,
            storage_location=storage_location,
            page_size=page_size,
        )
        by_material: dict[str, MaterialStockSummaryDto] = {}
        for item in sync_result.summaries:
            bucket = by_material.get(item.material)
            if bucket is None:
                bucket = MaterialStockSummaryDto(
                    material=item.material,
                    materialName=item.materialName,
                    plant=item.plant,
                    storageLocation=item.storageLocation,
                    baseUnit=item.baseUnit,
                )
                by_material[item.material] = bucket
            bucket.unrestrictedQty += item.unrestrictedQty
            bucket.qualityInspectionQty += item.qualityInspectionQty
            bucket.blockedQty += item.blockedQty
            bucket.availableQty += item.availableQty
            bucket.totalQty += item.totalQty
            if not bucket.baseUnit and item.baseUnit:
                bucket.baseUnit = item.baseUnit
            if not bucket.materialName and item.materialName:
                bucket.materialName = item.materialName
        return sorted(by_material.values(), key=lambda row: row.material)


material_stock_service = MaterialStockService()
