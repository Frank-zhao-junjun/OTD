#!/usr/bin/env python3
"""Test sales order sync + automatic material upsert."""
from app.db.database import init_db
from app.services.materials import material_service
from app.services.sales_orders import sales_order_service


def main():
    init_db()
    result = sales_order_service.sync_from_local_sample()
    print("Sync result:", result.model_dump())
    assert result.ordersFetched == 2
    assert result.itemsExtracted == 4
    assert result.materials is not None
    assert result.materials.totalMaterials >= 3

    items, total = material_service.list_materials(page_size=50)
    print(f"Materials after SO sync: {total}")
    for item in items:
        print(f"  {item.materialCode} refs={item.referenceCount}")

    repeat = sales_order_service.sync_from_local_sample()
    assert repeat.materials is not None
    assert repeat.materials.updated >= 3
    print("Incremental re-sync OK:", repeat.materials.model_dump())
    print("sales order sync tests passed")


if __name__ == "__main__":
    main()
