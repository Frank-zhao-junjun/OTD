#!/usr/bin/env python3
import requests
from requests.auth import HTTPBasicAuth

from app.config import settings

BASE = settings.sap_base_url.rstrip("/")
AUTH = HTTPBasicAuth(settings.sap_username, settings.sap_password)
HEADERS = {"Accept": "application/json"}
CLIENT = settings.sap_client

PATHS = [
    f"/sap/opu/odata/sap/API_MATERIAL_STOCK_SRV/$metadata?sap-client={CLIENT}",
    f"/sap/opu/odata/sap/API_MATERIAL_STOCK_SRV/A_MatlStkInAcctMod?$top=3&$format=json&sap-client={CLIENT}",
    f"/sap/opu/odata/sap/API_MATERIAL_STOCK_SRV/A_MaterialStock?$top=3&$format=json&sap-client={CLIENT}",
]

for path in PATHS:
    url = BASE + path
    resp = requests.get(url, auth=AUTH, headers=HEADERS, timeout=60)
    label = path.split("?")[0].split("/")[-1]
    print(label, resp.status_code)
    print(resp.text[:500])
    print("---")

filter_url = (
    f"{BASE}/sap/opu/odata/sap/API_MATERIAL_STOCK_SRV/A_MatlStkInAcctMod"
    f"?$filter=Material eq 'FG10'&$top=5&$format=json&sap-client={CLIENT}"
)
resp = requests.get(filter_url, auth=AUTH, headers=HEADERS, timeout=60)
print("FG10 filter", resp.status_code)
if resp.ok:
    import json

    print(json.dumps(resp.json(), indent=2)[:3000])
