#!/usr/bin/env python3
import requests
from requests.auth import HTTPBasicAuth

BASE = "https://my200967-api.s4hana.sapcloud.cn/sap/opu/odata/sap/API_BUSINESS_PARTNER/"
s = requests.Session()
s.auth = HTTPBasicAuth("EPC_USER", "o3rouK6{rGlt@>5]N~ZY($7BjNr8rt9VzUQub+GB")

r = s.get(
    BASE + "A_Customer",
    params={
        "sap-client": "100",
        "$format": "json",
        "$expand": "to_CustomerSalesArea,to_CustomerCompany",
        "$inlinecount": "allpages",
        "$top": 10,
    },
    timeout=60,
)
print("list expand", r.status_code)
if r.ok:
    d = r.json()["d"]
    print("count", d.get("__count"), "rows", len(d.get("results", [])))
    if d.get("results"):
        row = d["results"][0]
        print("first", row.get("Customer"), row.get("CustomerName"))
        print("sales", len(row.get("to_CustomerSalesArea", {}).get("results", [])))
