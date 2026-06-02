#!/usr/bin/env python3
import requests
from requests.auth import HTTPBasicAuth

from app.config import settings
from app.services.customers import _build_customer_filter, customer_service

BASE = settings.sap_base_url + settings.sap_bp_path
session = requests.Session()
session.auth = HTTPBasicAuth(settings.sap_username, settings.sap_password)


def sap_filter(filter_expr: str) -> list[str]:
    response = session.get(
        BASE + "A_Customer",
        params={
            "sap-client": settings.sap_client,
            "$format": "json",
            "$filter": filter_expr,
            "$top": 10,
        },
        timeout=60,
    )
    rows = response.json().get("d", {}).get("results", []) if response.ok else []
    return [row["CustomerName"] for row in rows]


print("Current filter builder:")
for q in ["客户", "Customer", "qingdao"]:
    print(q, "->", _build_customer_filter(None, q))

print("\nSAP multi-field tests:")
tests = [
    "substringof('qingdao', CustomerFullName)",
    "substringof('客户', CustomerName) or substringof('客户', CustomerFullName)",
    (
        "substringof('qingdao', CustomerName) or substringof('qingdao', CustomerFullName) "
        "or substringof('qingdao', BPCustomerName) or substringof('qingdao', BPCustomerFullName)"
    ),
]
for expr in tests:
    print(expr, "->", sap_filter(expr))
