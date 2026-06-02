# -*- coding: utf-8 -*-
import requests
import json
import sys
import urllib3
urllib3.disable_warnings()
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

BASE_URL = "https://my200967-api.s4hana.sapcloud.cn"
USERNAME = "CC0000000001"
PASSWORD = "}dfbCxTQK@HpYnTp8VWRa)YhZ}SW(>{hgMB4&~GS"

print("=" * 60)
print("SAP S/4HANA API Connectivity Test")
print("=" * 60)

# Test with different header combinations
test_configs = [
    {
        "name": "PO V4 - default headers",
        "url": f"{BASE_URL}/sap/opu/odata4/sap/api_purchaseorder_2/srvd_a2x/sap/purchaseorder/0001/",
        "headers": {},
    },
    {
        "name": "PO V4 - JSON accept + CSRF fetch",
        "url": f"{BASE_URL}/sap/opu/odata4/sap/api_purchaseorder_2/srvd_a2x/sap/purchaseorder/0001/",
        "headers": {"Accept": "application/json", "x-csrf-token": "fetch"},
    },
    {
        "name": "PO V4 - XML accept + CSRF fetch",
        "url": f"{BASE_URL}/sap/opu/odata4/sap/api_purchaseorder_2/srvd_a2x/sap/purchaseorder/0001/",
        "headers": {"Accept": "application/xml", "x-csrf-token": "fetch"},
    },
    {
        "name": "OData V2 base - CSRF fetch",
        "url": f"{BASE_URL}/sap/opu/odata/sap/",
        "headers": {"x-csrf-token": "fetch"},
    },
    {
        "name": "OData V4 base - CSRF fetch",
        "url": f"{BASE_URL}/sap/opu/odata4/sap/",
        "headers": {"x-csrf-token": "fetch"},
    },
    {
        "name": "Simple ping - root URL",
        "url": f"{BASE_URL}/",
        "headers": {},
    },
]

for cfg in test_configs:
    try:
        r = requests.get(
            cfg["url"],
            auth=(USERNAME, PASSWORD),
            headers=cfg["headers"],
            verify=False,
            timeout=30,
        )
        hdr = dict(r.headers)
        print(f"\n--- {cfg['name']} ---")
        print(f"Status: {r.status_code} {r.reason}")
        
        # Key response headers
        for key in ["content-type", "www-authenticate", "sap-session", "set-cookie", 
                     "x-csrf-token", "sap-server", "sap-system"]:
            val = hdr.get(key.capitalize()) or hdr.get(key.lower()) or hdr.get(key)
            if val:
                print(f"  {key}: {val}")
        
        if r.status_code == 401:
            print("  --> Authentication FAILED")
            www_auth = hdr.get("WWW-Authenticate") or hdr.get("www-authenticate", "")
            print(f"  WWW-Authenticate: {www_auth}")
        elif r.status_code == 403:
            print("  --> Forbidden (CSRF or permission issue)")
        elif r.status_code in (200, 201):
            print("  --> SUCCESS!")
            preview = r.text[:300]
            print(f"  Body preview: {preview}")
        else:
            print(f"  Body: {r.text[:200]}")
            
    except Exception as e:
        print(f"\n--- {cfg['name']} ---")
        print(f"Error: {type(e).__name__}: {e}")

# Also test with explicit auth header
import base64
auth_string = base64.b64encode(f"{USERNAME}:{PASSWORD}".encode()).decode()
print(f"\n{'=' * 60}")
print("Explicit Authorization Header Test")
print(f"Auth header value: Basic {auth_string}")

r = requests.get(
    f"{BASE_URL}/sap/opu/odata4/sap/api_purchaseorder_2/srvd_a2x/sap/purchaseorder/0001/",
    headers={"Authorization": f"Basic {auth_string}", "Accept": "application/json"},
    verify=False,
    timeout=30,
)
print(f"Status: {r.status_code}")
print(f"Headers: {dict(r.headers)}")
if r.text:
    print(f"Body: {r.text[:500]}")
