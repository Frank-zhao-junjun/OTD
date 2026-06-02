#!/usr/bin/env python3
"""Unit tests for billing, material document, production confirmation, sales portal."""

from fastapi.testclient import TestClient

from app.main import app
from app.services.billing_documents import map_portal_row as map_billing_row
from app.services.material_documents import map_portal_row as map_matdoc_row
from app.services.production_confirmations import map_portal_row as map_conf_row
from app.services.sales_orders import sales_order_service


def test_billing_map():
    row = map_billing_row(
        {
            "BillingDocument": "9000000122",
            "BillingDocumentItem": "10",
            "ReferenceSDDocument": "0000001234",
            "ReferenceSDDocumentItem": "10",
            "Material": "FG10",
            "BillingDocumentItemText": "智能网关终端",
            "BillingQuantity": "100",
            "NetAmount": "780000",
            "TaxAmount": "101400",
        },
        {"customerCode": "200000", "customerName": "上海电子", "currency": "CNY"},
    )
    assert row.billingDocument == "9000000122"
    assert row.netAmount == 780000.0


def test_matdoc_map():
    row = map_matdoc_row(
        {
            "MaterialDocument": "4900123456",
            "MaterialDocumentYear": "2026",
            "MaterialDocumentItem": "0001",
            "Material": "FG10",
            "QuantityInEntryUnit": "100",
            "EntryUnit": "PC",
            "GoodsMovementType": "601",
            "Delivery": "80001234",
        },
        {"postingDate": None},
    )
    assert row.materialDocument == "4900123456"
    assert row.deliveryDocument == "80001234"


def test_confirmation_map():
    row = map_conf_row(
        {
            "OrderID": "1000001",
            "OrderOperation": "0010",
            "ConfirmationYieldQuantity": "40",
            "ConfirmationUnit": "PC",
        }
    )
    assert row.productionOrder == "1000001"
    assert row.yieldQuantity == 40.0


def test_portal_endpoints_from_sample():
    client = TestClient(app)
    for path in [
        "/api/v1/billing-documents/sync-from-sample",
        "/api/v1/material-documents/sync-from-sample",
        "/api/v1/production-confirmations/sync-from-sample",
        "/api/v1/sales-orders/portal-lines/from-sample",
    ]:
        if "sync-from-sample" in path and "portal" not in path:
            response = client.post(path)
        else:
            response = client.get(path)
        assert response.status_code == 200, path
        assert response.json()["success"] is True


def test_sales_portal_lines_from_sample():
    lines = sales_order_service.list_portal_lines_from_sample()
    assert lines
    assert "/" in lines[0].salesOrderLine
