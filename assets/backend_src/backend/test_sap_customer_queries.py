#!/usr/bin/env python3
import requests
from requests.auth import HTTPBasicAuth

BASE = "https://my200967-api.s4hana.sapcloud.cn/sap/opu/odata/sap/API_BUSINESS_PARTNER/"
s = requests.Session()
s.auth = HTTPBasicAuth("EPC_USER", "o3rouK6{rGlt@>5]N~ZY($7BjNr8rt9VzUQub+GB")

r = s.get(
    BASE + "A_Customer('200000')",
    params={
        "sap-client": "100",
        "$format": "json",
        "$expand": "to_CustomerSalesArea,to_CustomerCompany",
    },
    timeout=60,
)
print("detail", r.status_code)
if r.ok:
    d = r.json()["d"]
    print("customer", d.get("CustomerName"))
    print("sales areas", len(d.get("to_CustomerSalesArea", {}).get("results", [])))

r2 = s.get(
    BASE + "A_CustomerSalesArea",
    params={
        "sap-client": "100",
        "$format": "json",
        "$filter": "SalesOrganization eq '1010' and DistributionChannel eq '10' and Division eq '00'",
        "$top": 5,
    },
    timeout=60,
)
print("salesarea list", r2.status_code)
if r2.ok:
    print("rows", len(r2.json()["d"]["results"]))
