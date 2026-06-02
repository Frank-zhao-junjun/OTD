# -*- coding: utf-8 -*-
import requests
import base64
import sys
import io
import re
import urllib3
urllib3.disable_warnings()
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

BASE_URL = "https://my200967-api.s4hana.sapcloud.cn"
USERNAME = "EPC_USER"
PASSWORD = "e3rouK6|rltG@5]N~ZY{78}Nr8rt9VzUQub+GB"

session = requests.Session()
session.auth = (USERNAME, PASSWORD)
session.verify = False

print("=" * 60)
print("SAP S/4HANA OData API Test - CORRECT credentials")
print(f"Username: {USERNAME}")
print(f"Password: {PASSWORD[:10]}...{PASSWORD[-5:]}")
print("=" * 60)

# Test URLs - using V2 pattern confirmed by Postman
apis_to_test = {
    # Confirmed working from Postman
    "API_PRODUCT_SRV": f"{BASE_URL}/sap/opu/odata/sap/API_PRODUCT_SRV/A_Product",
    
    # PRD required APIs - V2 paths
    "API_PRODUCTION_ORDER_2_SRV": f"{BASE_URL}/sap/opu/odata/sap/API_PRODUCTION_ORDER_2_SRV/",
    "API_OUTBOUND_DELIVERY_SRV": f"{BASE_URL}/sap/opu/odata/sap/API_OUTBOUND_DELIVERY_SRV/",
    "API_BILLING_DOCUMENT_SRV": f"{BASE_URL}/sap/opu/odata/sap/API_BILLING_DOCUMENT_SRV/",
    "API_MATERIAL_DOCUMENT_SRV": f"{BASE_URL}/sap/opu/odata/sap/API_MATERIAL_DOCUMENT_SRV/",
    
    # Sales Order
    "CE_SALESORDER_0001_V2": f"{BASE_URL}/sap/opu/odata/sap/CE_SALESORDER_0001/",
}

results = {}
for name, url in apis_to_test.items():
    try:
        r = session.get(url, params={"format": "json", "sap-client": "100"}, timeout=30)
        results[name] = {"status": r.status_code, "url": url}
        
        print(f"\n--- {name} ---")
        print(f"Status: {r.status_code} {r.reason}")
        
        if r.status_code == 401:
            print(f"  FAIL: Authentication failed")
            print(f"  sap-authenticated: {r.headers.get('sap-authenticated', 'N/A')}")
            www_auth = r.headers.get('www-authenticate', '')
            print(f"  WWW-Authenticate: {www_auth}")
        elif r.status_code in (200, 201):
            print(f"  SUCCESS! Content-Type: {r.headers.get('content-type','')}")
            try:
                data = r.json()
                text = str(data)[:500]
                print(f"  Response: {text}")
                # Count results if it's a collection
                if 'd' in data and isinstance(data['d'], dict):
                    results_key = data['d'].get('results')
                    if results_key:
                        print(f"  Result count: {len(results_key)}")
            except:
                print(f"  Response: {r.text[:400]}")
        elif r.status_code == 403:
            print(f"  FORBIDDEN (service may not be activated)")
            print(f"  Body: {r.text[:300]}")
        else:
            print(f"  HTTP {r.status_code}: {r.text[:300]}")
            
    except Exception as e:
        print(f"\n--- {name} ---")
        print(f"ERROR: {type(e).__name__}: {e}")
        results[name] = {"status": 999, "error": str(e)}

# Now get $metadata for all successful APIs
print("\n\n" + "=" * 60)
print("Fetching $metadata for available services...")
print("=" * 60)

metadata_urls = [
    ("API_PRODUCT_SRV", f"{BASE_URL}/sap/opu/odata/sap/API_PRODUCT_SRV/$metadata"),
    ("API_PRODUCTION_ORDER_2_SRV", f"{BASE_URL}/sap/opu/odata/sap/API_PRODUCTION_ORDER_2_SRV/$metadata"),
    ("API_OUTBOUND_DELIVERY_SRV", f"{BASE_URL}/sap/opu/odata/sap/API_OUTBOUND_DELIVERY_SRV/$metadata"),
    ("API_BILLING_DOCUMENT_SRV", f"{BASE_URL}/sap/opu/odata/sap/API_BILLING_DOCUMENT_SRV/$metadata"),
    ("API_MATERIAL_DOCUMENT_SRV", f"{BASE_URL}/sap/opu/odata/sap/API_MATERIAL_DOCUMENT_SRV/$metadata"),
]

for name, url in metadata_urls:
    try:
        r = session.get(url, params={"sap-client": "100"}, timeout=30)
        print(f"\n[{r.status_code}] {name} $metadata ({len(r.text)} chars)")
        if r.status_code == 200:
            entities = re.findall(r'EntitySet\s+Name="([^"]+)"', r.text)
            print(f"  EntitySets ({len(entities)}): {entities[:40]}")
            
            # Save to file for analysis
            out_file = rf"E:\00 - 中数通ES环境\ES+OTD助手\metadata_{name}.xml"
            with open(out_file, "w", encoding="utf-8") as f:
                f.write(r.text)
            print(f"  Saved to: metadata_{name}.xml")
        elif r.status_code == 401:
            print(f"  Auth failed")
        else:
            print(f"  Body preview: {r.text[:200]}")
    except Exception as e:
        print(f"[ERR] {name}: {e}")

print("\n\nDone!")
