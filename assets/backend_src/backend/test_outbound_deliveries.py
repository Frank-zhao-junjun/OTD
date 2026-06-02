#!/usr/bin/env python3
"""Unit tests for outbound delivery portal mapping."""

from unittest.mock import patch

from fastapi.testclient import TestClient

from app.main import app
from app.services.outbound_deliveries import (
    enrich_rows_with_material_documents,
    map_portal_row,
    outbound_delivery_service,
)


SAMPLE_ITEM = {
    "DeliveryDocument": "80001234",
    "DeliveryDocumentItem": "10",
    "ReferenceSDDocument": "0000001234",
    "ReferenceSDDocumentItem": "10",
    "Material": "FG10",
    "DeliveryDocumentItemText": "智能网关终端",
    "ActualDeliveryQuantity": "100.000",
    "DeliveryQuantityUnit": "PC",
    "GoodsMovementStatus": "C",
    "to_DocumentFlow": {
        "results": [
            {
                "Subsequentdocument": "4900123456",
                "SubsequentDocumentCategory": "R",
            }
        ]
    },
}


def test_map_portal_row_fields():
    row = map_portal_row(
        SAMPLE_ITEM,
        {
            "postingDate": None,
            "customerCode": "200000",
            "customerName": "上海电子科技有限公司",
        },
    )
    assert row.deliveryDocument == "80001234"
    assert row.salesOrderLine == "0000001234/10"
    assert row.material == "FG10"
    assert row.postedQuantity == 100.0
    assert row.unit == "PC"
    assert row.materialDocument == "4900123456"
    assert row.customerName == "上海电子科技有限公司"


def test_sync_from_sample_endpoint():
    client = TestClient(app)
    response = client.post("/api/v1/outbound-deliveries/sync-from-sample")
    assert response.status_code == 200
    body = response.json()
    assert body["success"] is True
    assert len(body["data"]) >= 2
    assert body["data"][0]["deliveryDocument"]


def test_enrich_material_document_from_sample():
    row = map_portal_row(
        {
            **SAMPLE_ITEM,
            "to_DocumentFlow": {"results": []},
        },
        {"customerCode": "200000", "customerName": "上海电子科技有限公司"},
    )
    assert row.materialDocument is None
    enriched = enrich_rows_with_material_documents([row])
    assert len(enriched) == 1
    assert enriched[0].materialDocument == "4900123456"
    assert enriched[0].materialDocumentYear == "2026"
    assert enriched[0].goodsMovementType == "601"


def test_summary_endpoint_with_mock():
    client = TestClient(app)
    with patch.object(
        outbound_delivery_service,
        "list_portal_summary",
        return_value=[
            map_portal_row(
                SAMPLE_ITEM,
                {
                    "customerCode": "200000",
                    "customerName": "上海电子科技有限公司",
                },
            )
        ],
    ):
        response = client.get("/api/v1/outbound-deliveries/summary?top=10")
    assert response.status_code == 200
    payload = response.json()["data"][0]
    assert payload["deliveryDocument"] == "80001234"
    assert payload["materialDocument"] == "4900123456"
