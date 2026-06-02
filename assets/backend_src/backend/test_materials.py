#!/usr/bin/env python3
"""Quick test for materials API repository."""
from app.db.database import init_db
from app.services.materials import material_service


def main():
    init_db()
    result = material_service.sync_from_order_items(
        [
            {
                "salesOrder": "TEST-001",
                "salesOrderItem": "10",
                "product": "FG10",
                "salesOrderItemText": "Test Material",
                "requestedQuantityUnit": "PC",
                "plant": "1010",
            }
        ]
    )
    assert result.inserted == 1
    detail = material_service.get_material("FG10")
    assert detail is not None
    assert detail.materialName == "Test Material"
    repeat = material_service.sync_from_order_items(
        [
            {
                "salesOrder": "TEST-002",
                "salesOrderItem": "20",
                "product": "FG10",
                "salesOrderItemText": "Test Material Updated",
                "requestedQuantityUnit": "PC",
                "plant": "1010",
            }
        ]
    )
    assert repeat.updated == 1
    detail2 = material_service.get_material("FG10")
    assert detail2.referenceCount == 2
    assert detail2.lastSeenSalesOrder == "TEST-002"
    print("materials repo tests passed")


if __name__ == "__main__":
    main()
