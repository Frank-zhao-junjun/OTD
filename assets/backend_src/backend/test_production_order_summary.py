#!/usr/bin/env python3
"""Unit tests for production order summary mapping."""

from app.services.production_orders import map_production_order_summary


def test_summary_maps_both_completion_dates():
    row = map_production_order_summary(
        {
            "ProductionOrder": "1000001",
            "Product": "FG10",
            "CreationDate": "2026-01-10",
            "OrderActualReleaseDate": "2026-01-12",
            "OrderPlannedTotalQty": 100,
            "OrderConfirmedYieldQty": 100,
            "OrderPlannedEndDate": "2026-02-01",
            "OrderConfirmedEndDate": "2026-01-28",
            "TechnicalCompletionDate": "2026-01-30",
            "ProductionISOUnit": "EA",
            "SalesOrder": "SO123",
        }
    )
    assert row.productionOrder == "1000001"
    assert row.orderConfirmedEndDate.isoformat() == "2026-01-28"
    assert row.technicalCompletionDate.isoformat() == "2026-01-30"
    assert row.status == "技术完成"


if __name__ == "__main__":
    test_summary_maps_both_completion_dates()
    print("production order summary tests passed")
