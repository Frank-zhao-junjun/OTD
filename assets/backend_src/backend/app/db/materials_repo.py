from typing import Any

from app.db.database import get_connection


def _row_to_dict(row) -> dict[str, Any]:
    return dict(row)


def upsert_from_order_item(item: dict[str, Any]) -> str:
    """Insert or update one material from a sales order line item. Returns 'inserted' or 'updated'."""
    material_code = (item.get("product") or item.get("Product") or "").strip()
    if not material_code:
        return "skipped"

    material_name = item.get("salesOrderItemText") or item.get("SalesOrderItemText")
    base_unit = (
        item.get("requestedQuantityUnit")
        or item.get("RequestedQuantityISOUnit")
        or item.get("RequestedQuantityUnit")
    )
    plant = item.get("plant") or item.get("Plant")
    storage_location = item.get("storageLocation") or item.get("StorageLocation")
    sales_order = item.get("salesOrder") or item.get("SalesOrder") or ""
    sales_order_item = item.get("salesOrderItem") or item.get("SalesOrderItem") or ""

    with get_connection() as conn:
        existing = conn.execute(
            "SELECT material_code FROM portal_material WHERE material_code = ?",
            (material_code,),
        ).fetchone()

        if existing is None:
            conn.execute(
                """
                INSERT INTO portal_material (
                    material_code, material_name, base_unit, plant, storage_location,
                    first_seen_sales_order, first_seen_sales_order_item,
                    last_seen_sales_order, last_seen_sales_order_item,
                    reference_count, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, datetime('now'), datetime('now'))
                """,
                (
                    material_code,
                    material_name,
                    base_unit,
                    plant,
                    storage_location,
                    sales_order,
                    sales_order_item,
                    sales_order,
                    sales_order_item,
                ),
            )
            return "inserted"

        conn.execute(
            """
            UPDATE portal_material SET
                material_name = COALESCE(?, material_name),
                base_unit = COALESCE(?, base_unit),
                plant = COALESCE(?, plant),
                storage_location = COALESCE(?, storage_location),
                last_seen_sales_order = ?,
                last_seen_sales_order_item = ?,
                reference_count = reference_count + 1,
                updated_at = datetime('now')
            WHERE material_code = ?
            """,
            (
                material_name,
                base_unit,
                plant,
                storage_location,
                sales_order,
                sales_order_item,
                material_code,
            ),
        )
        return "updated"


def upsert_from_order_items(items: list[dict[str, Any]]) -> dict[str, int]:
    stats = {"inserted": 0, "updated": 0, "skipped": 0}
    for item in items:
        result = upsert_from_order_item(item)
        stats[result] = stats.get(result, 0) + 1
    return stats


def count_materials(
    material_code: str | None = None,
    material_name: str | None = None,
    plant: str | None = None,
) -> int:
    where, params = _build_where(material_code, material_name, plant)
    sql = f"SELECT COUNT(*) AS cnt FROM portal_material{where}"
    with get_connection() as conn:
        row = conn.execute(sql, params).fetchone()
        return int(row["cnt"])


def list_materials(
    material_code: str | None = None,
    material_name: str | None = None,
    plant: str | None = None,
    page: int = 1,
    page_size: int = 20,
) -> list[dict[str, Any]]:
    where, params = _build_where(material_code, material_name, plant)
    offset = (page - 1) * page_size
    sql = f"""
        SELECT *
        FROM portal_material
        {where}
        ORDER BY material_code
        LIMIT ? OFFSET ?
    """
    with get_connection() as conn:
        rows = conn.execute(sql, [*params, page_size, offset]).fetchall()
        return [_row_to_dict(row) for row in rows]


def get_material(material_code: str) -> dict[str, Any] | None:
    with get_connection() as conn:
        row = conn.execute(
            "SELECT * FROM portal_material WHERE material_code = ?",
            (material_code,),
        ).fetchone()
        return _row_to_dict(row) if row else None


def _build_where(
    material_code: str | None,
    material_name: str | None,
    plant: str | None,
) -> tuple[str, list[Any]]:
    clauses: list[str] = []
    params: list[Any] = []

    if material_code:
        clauses.append("material_code LIKE ?")
        params.append(f"%{material_code.strip()}%")
    if material_name and material_name.strip():
        clauses.append("material_name LIKE ?")
        params.append(f"%{material_name.strip()}%")
    if plant:
        clauses.append("plant = ?")
        params.append(plant.strip())

    if not clauses:
        return "", params
    return " WHERE " + " AND ".join(clauses), params
