#!/usr/bin/env python3
"""Unit tests for production order by-material lookup."""

from unittest.mock import patch

from fastapi.testclient import TestClient

from app.main import app
from app.sap.production_order_client import SapProductionOrderClient


def test_find_by_material_builds_product_filter():
    client = SapProductionOrderClient()
    with patch.object(client, "_fetch_all", return_value=[]) as mock_fetch:
        client.find_by_material("FG10", {"$top": "50"})
        mock_fetch.assert_called_once_with(
            "/ProductionOrder",
            {"$top": "50", "$filter": "Product eq 'FG10'"},
        )


def test_find_by_material_escapes_quotes_and_adds_plant():
    client = SapProductionOrderClient()
    with patch.object(client, "_fetch_all", return_value=[]) as mock_fetch:
        client.find_by_material("MAT'001", plant="1010")
        mock_fetch.assert_called_once_with(
            "/ProductionOrder",
            {"$filter": "Product eq 'MAT''001' and ProductionPlant eq '1010'"},
        )


def test_by_material_route_delegates_to_client():
    test_client = TestClient(app)
    with patch(
        "app.routes.production_orders.production_order_client.find_by_material",
        return_value=[{"ProductionOrder": "1000001", "Product": "FG10"}],
    ) as mock_find:
        response = test_client.get(
            "/api/production-orders/by-material/FG10",
            params={"expand": "_Operation,_Component", "top": 50, "plant": "1010"},
        )
    assert response.status_code == 200
    body = response.json()
    assert body["success"] is True
    assert body["count"] == 1
    assert body["material"] == "FG10"
    mock_find.assert_called_once()
    args, kwargs = mock_find.call_args
    assert args[0] == "FG10"
    assert args[1]["$top"] == "50"
    assert args[1]["$expand"] == "_Operation,_Component"
    assert kwargs["plant"] == "1010"


if __name__ == "__main__":
    test_find_by_material_builds_product_filter()
    test_find_by_material_escapes_quotes_and_adds_plant()
    test_by_material_route_delegates_to_client()
    print("production order by-material tests passed")
