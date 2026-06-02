#!/usr/bin/env python3
"""Probe CE_SALESORDER_0001 on my200967 SAP system."""
import json
import requests
from requests.auth import HTTPBasicAuth

from app.config import settings

BASE = settings.sap_base_url
PATH = "/sap/opu/odata4/sap/api_salesorder/srvd_a2x/sap/salesorder/0001/"
session = requests.Session()
session.auth = HTTPBasicAuth(settings.sap_username, settings.sap_password)
session.headers.update({"Accept": "application/json"})


def get(path: str, params: dict | None = None):
    url = BASE + PATH + path
    query = {"sap-client": settings.sap_client}
    if params:
        query.update(params)
    r = session.get(url, params=query, timeout=60)
    print(path, "->", r.status_code)
    if not r.ok:
        print(r.text[:500])
        return None
    return r.json()


print("metadata")
meta = session.get(BASE + PATH + "$metadata", params={"sap-client": settings.sap_client}, timeout=60)
print("metadata status", meta.status_code, "len", len(meta.text))

print("\nSalesOrder top 5")
data = get("SalesOrder", {"$top": "5"})
if data:
    types = sorted({row.get("SalesOrderType") for row in data.get("value", [])})
    orgs = sorted({row.get("SalesOrganization") for row in data.get("value", [])})
    print("order types:", types)
    print("sales orgs:", orgs)
    print("count:", len(data.get("value", [])))

print("\nFilter OR + 1010")
data_or = get("SalesOrder", {
    "$filter": "SalesOrderType eq 'OR' and SalesOrganization eq '1010'",
    "$top": "10",
    "$expand": "_Item",
})
if data_or:
    print("OR/1010 count:", len(data_or.get("value", [])))
    for row in data_or.get("value", [])[:3]:
        print(" ", row.get("SalesOrder"), row.get("SalesOrderType"), row.get("SoldToParty"), row.get("TotalNetAmount"))

print("\nAll order types sample")
data_all = get("SalesOrder", {"$top": "50", "$select": "SalesOrder,SalesOrderType,SalesOrganization"})
if data_all:
    from collections import Counter
    c = Counter((r.get("SalesOrderType"), r.get("SalesOrganization")) for r in data_all.get("value", []))
    for k, v in c.most_common():
        print(" ", k, v)
