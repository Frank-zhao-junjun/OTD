#!/usr/bin/env python3
"""Diagnose SAP OData RAISE_SHORTDUMP on Sales Order requests."""
import json
import textwrap

import requests
from requests.auth import HTTPBasicAuth

from app.config import settings

BASE = settings.sap_base_url
SO_PATH = "/sap/opu/odata4/sap/api_salesorder/srvd_a2x/sap/salesorder/0001/"
BP_PATH = settings.sap_bp_path

session = requests.Session()
session.auth = HTTPBasicAuth(settings.sap_username, settings.sap_password)
session.headers.update({"Accept": "application/json"})


def probe(name: str, url: str, params: dict | None = None):
    query = {"sap-client": settings.sap_client}
    if params:
        query.update(params)
    try:
        r = session.get(url, params=query, timeout=90)
    except Exception as exc:
        print(f"[ERR] {name}: {exc}")
        return

    body = r.text or ""
    shortdump = "RAISE_SHORTDUMP" in body or "shortdump" in body.lower()
    flag = "SHORTDUMP" if shortdump else ("OK" if r.ok else f"HTTP {r.status_code}")
    print(f"[{flag}] {name}")
    if not r.ok or shortdump:
        snippet = body[:800].replace("\n", " ")
        print(f"       {snippet}")
    elif r.ok:
        try:
            data = r.json()
            if "value" in data:
                print(f"       rows={len(data['value'])}")
            else:
                print(f"       keys={list(data.keys())[:8]}")
        except json.JSONDecodeError:
            print(f"       len={len(body)}")


print("=== Customer API (control) ===")
probe("A_Customer top 2", BASE + BP_PATH + "A_Customer", {"$top": "2"})

print("\n=== Sales Order metadata ===")
probe("$metadata", BASE + SO_PATH + "$metadata")

print("\n=== Sales Order basic reads ===")
probe("SalesOrder $top=1", BASE + SO_PATH + "SalesOrder", {"$top": "1"})
probe("SalesOrder $top=5", BASE + SO_PATH + "SalesOrder", {"$top": "5"})
probe("SalesOrderItem $top=1", BASE + SO_PATH + "SalesOrderItem", {"$top": "1"})

print("\n=== Filters (Sell from Stock) ===")
probe(
    "OR + 1010/10/00 no expand",
    BASE + SO_PATH + "SalesOrder",
    {
        "$top": "10",
        "$filter": "SalesOrderType eq 'OR' and SalesOrganization eq '1010' and DistributionChannel eq '10' and OrganizationDivision eq '00'",
    },
)
probe(
    "OR + 1010 only",
    BASE + SO_PATH + "SalesOrder",
    {"$top": "10", "$filter": "SalesOrderType eq 'OR' and SalesOrganization eq '1010'"},
)
probe(
    "SalesOrganization eq 1010 only",
    BASE + SO_PATH + "SalesOrder",
    {"$top": "10", "$filter": "SalesOrganization eq '1010'"},
)

print("\n=== Expand combinations ===")
probe(
    "expand _Item",
    BASE + SO_PATH + "SalesOrder",
    {"$top": "3", "$expand": "_Item"},
)
probe(
    "OR filter + expand _Item",
    BASE + SO_PATH + "SalesOrder",
    {
        "$top": "3",
        "$expand": "_Item",
        "$filter": "SalesOrderType eq 'OR' and SalesOrganization eq '1010'",
    },
)
probe(
    "expand _Partner",
    BASE + SO_PATH + "SalesOrder",
    {"$top": "3", "$expand": "_Partner"},
)

print("\n=== By key (common pitfalls) ===")
for key in ["1", "0000000001", "0000000002"]:
    probe(f"SalesOrder('{key}')", BASE + SO_PATH + f"SalesOrder('{key}')")
    probe(f"SalesOrder('{key}') + _Item", BASE + SO_PATH + f"SalesOrder('{key}')", {"$expand": "_Item"})

print("\n=== Alternate service paths ===")
alt_paths = [
    "/sap/opu/odata4/sap/ce_salesorder_0001/srvd_a2x/sap/salesorder/0001/",
    "/sap/opu/odata/sap/API_SALES_ORDER_SRV/",
]
for alt in alt_paths:
    probe(f"alt {alt} SalesOrder $top=1", BASE + alt + "SalesOrder", {"$top": "1"})
