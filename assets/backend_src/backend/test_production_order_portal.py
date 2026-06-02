#!/usr/bin/env python3
"""Unit tests for production order portal lookup and detail mapping."""

from unittest.mock import patch

from fastapi.testclient import TestClient

from app.main import app
from app.services.production_orders import (
    map_production_order_detail,
    production_order_service,
)


def test_find_order_numbers_by_material():
    with patch(
        "app.services.production_orders.production_order_client.find_by_material",
        return_value=[
            {"ProductionOrder": "1000001"},
            {"ProductionOrder": "1000002"},
            {"ProductionOrder": "1000001"},
        ],
    ):
        numbers = production_order_service.find_order_numbers_by_material("FG10", plant="1010")
    assert numbers == ["1000001", "1000002"]


def test_detail_maps_gr_and_status():
    detail = map_production_order_detail(
        {
            "ProductionOrder": "1000001",
            "Product": "FG10",
            "ProductionOrderText": "Gateway",
            "ProductionPlant": "1010",
            "ProductionISOUnit": "EA",
            "CreationDate": "2026-01-01",
            "OrderActualReleaseDate": "2026-01-02",
            "OrderPlannedTotalQty": 100,
            "OrderConfirmedYieldQty": 80,
            "OrderConfirmedEndDate": "2026-01-20",
            "TechnicalCompletionDate": "2026-01-25",
            "OrderActualEndDate": "2026-01-22",
            "ActualDeliveredQuantity": 75,
            "IsCompletelyDelivered": False,
        },
        [
            {
                "ProductionOrderItem": "0001",
                "GoodsReceiptQty": 50,
                "ActualDeliveryDate": "2026-01-18",
                "OrderIsReleased": True,
            },
            {
                "ProductionOrderItem": "0001",
                "GoodsReceiptQty": 25,
                "ActualDeliveryDate": "2026-01-22",
            },
        ],
    )
    assert detail.productionOrder == "1000001"
    assert detail.orderConfirmedEndDate.isoformat() == "2026-01-20"
    assert detail.technicalCompletionDate.isoformat() == "2026-01-25"
    assert detail.totalGrQuantity == 75
    assert detail.goodsReceiptDate.isoformat() == "2026-01-22"
    assert detail.status.code == "TECO"
    assert len(detail.goodsReceiptLines) == 2


def test_numbers_route():
    client = TestClient(app)
    with patch(
        "app.routes.production_orders.production_order_service.find_order_numbers_by_material",
        return_value=["1000001"],
    ):
        response = client.get("/api/production-orders/by-material/FG10/numbers?plant=1010")
    assert response.status_code == 200
    body = response.json()
    assert body["productionOrderNumbers"] == ["1000001"]
    assert body["material"] == "FG10"


def test_detail_route():
    client = TestClient(app)
    with patch(
        "app.routes.production_orders.production_order_service.get_detail",
        return_value=map_production_order_detail(
            {"ProductionOrder": "1000001", "OrderPlannedTotalQty": 10},
            [],
        ),
    ):
        response = client.get("/api/production-orders/1000001/detail")
    assert response.status_code == 200
    assert response.json()["data"]["productionOrder"] == "1000001"


if __name__ == "__main__":
    test_find_order_numbers_by_material()
    test_detail_maps_gr_and_status()
    test_numbers_route()
    test_detail_route()
    print("production order portal tests passed")
