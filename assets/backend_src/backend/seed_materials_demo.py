#!/usr/bin/env python3
"""Seed portal_material from demo sales order line items (PRD FERT products)."""
from app.db.database import init_db
from app.services.materials import material_service

DEMO_ORDER_ITEMS = [
    {
        "salesOrder": "SO-2026050001/0010",
        "salesOrderItem": "10",
        "product": "TG-100",
        "salesOrderItemText": "高端交换机模块",
        "requestedQuantityUnit": "PC",
        "plant": "1010",
        "storageLocation": "101A",
    },
    {
        "salesOrder": "SO-2026050001/0020",
        "salesOrderItem": "20",
        "product": "FG41",
        "salesOrderItemText": "智能网关终端",
        "requestedQuantityUnit": "PC",
        "plant": "1010",
        "storageLocation": "101A",
    },
    {
        "salesOrder": "SO-2026050002/0010",
        "salesOrderItem": "10",
        "product": "FG42",
        "salesOrderItemText": "数据采集器",
        "requestedQuantityUnit": "PC",
        "plant": "1010",
        "storageLocation": "101A",
    },
    {
        "salesOrder": "SO-2026050003/0010",
        "salesOrderItem": "10",
        "product": "TG-100",
        "salesOrderItemText": "高端交换机模块",
        "requestedQuantityUnit": "PC",
        "plant": "1010",
        "storageLocation": "101A",
    },
]


def main():
    init_db()
    first = material_service.sync_from_order_items(DEMO_ORDER_ITEMS[:3])
    second = material_service.sync_from_order_items(DEMO_ORDER_ITEMS)
    print("First sync:", first.model_dump())
    print("Second sync (incremental):", second.model_dump())
    items, total = material_service.list_materials(page_size=50)
    print(f"Materials in registry: {total}")
    for item in items:
        print(f"  {item.materialCode} | {item.materialName} | refs={item.referenceCount}")


if __name__ == "__main__":
    main()
