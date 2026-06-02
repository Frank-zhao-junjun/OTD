# -*- coding: utf-8 -*-
import requests
import base64
import sys
import io
import urllib3
urllib3.disable_warnings()
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

BASE_URL = "https://my200967-api.s4hana.sapcloud.cn"
USERNAME = "CC0000000001"
PASSWORD = "}dfbCxTQK@HpYnTp8VWRa)YhZ}SW(>{hgMB4&~GS"

session = requests.Session()
session.auth = (USERNAME, PASSWORD)
session.verify = False

print("=" * 60)
print("SAP S/4HANA OData V2 API Test (matching Postman pattern)")
print("=" * 60)

# Test URLs - using V2 pattern that worked in Postman
apis_to_test = {
    # From Postman screenshot - confirmed working
    "API_PRODUCT_SRV (A_Product)": f"{BASE_URL}/sap/opu/odata/sap/API_PRODUCT_SRV/A_Product",
    
    # PRD required APIs - V2 paths
    "API_PRODUCTION_ORDER_2_SRV": f"{BASE_URL}/sap/opu/odata/sap/API_PRODUCTION_ORDER_2_SRV/",
    "API_OUTBOUND_DELIVERY_SRV": f"{BASE_URL}/sap/opu/odata/sap/API_OUTBOUND_DELIVERY_SRV/",
    "API_BILLING_DOCUMENT_SRV": f"{BASE_URL}/sap/opu/odata/sap/API_BILLING_DOCUMENT_SRV/",
    "API_MATERIAL_DOCUMENT_SRV": f"{BASE_URL}/sap/opu/odata/sap/API_MATERIAL_DOCUMENT_SRV/",
    
    # Sales Order - try both patterns
    "CE_SALESORDER_0001_V2": f"{BASE_URL}/sap/opu/odata/sap/CE_SALESORDER_0001/",
}

for name, url in apis_to_test.items():
    try:
        r = session.get(url, params={"format": "json", "sap-client": "100"}, timeout=30)
        print(f"\n--- {name} ---")
        print(f"URL: {url}")
        print(f"Status: {r.status_code} {r.reason}")
        
        if r.status_code == 401:
            print(f"  FAIL: Authentication failed")
            print(f"  sap-authenticated: {r.headers.get('sap-authenticated', 'N/A')}")
        elif r.status_code in (200, 201):
            print(f"  SUCCESS!")
            ct = r.headers.get("content-type", "")
            print(f"  Content-Type: {ct}")
            # Parse JSON response preview
            try:
                data = r.json()
                text = str(data)[:600]
                print(f"  Response: {text}")
            except:
                print(f"  Response (raw): {r.text[:400]}")
        elif r.status_code == 403:
            print(f"  FORBIDDEN (service not available or no permission)")
            print(f"  Body: {r.text[:300]}")
        else:
            print(f"  HTTP {r.status_code}: {r.text[:300]}")
            
    except Exception as e:
        print(f"\n--- {name} ---")
        print(f"ERROR: {type(e).__name__}: {e}")

# Now test $metadata for each confirmed service
print("\n\n" + "=" * 60)
print("Fetching $metadata for available services")
print("=" * 60)

metadata_services = [
    ("API_PRODUCT_SRV", f"{BASE_URL}/sap/opu/odata/sap/API_PRODUCT_SRV/$metadata"),
]

for name, url in metadata_services:
    try:
        r = session.get(url, params={"sap-client": "100"}, timeout=30)
        print(f"\n[{r.status_code}] {name} $metadata")
        if r.status_code == 200:
            print(f"  SUCCESS! Size: {len(r.text)} chars")
            # Save metadata to file for analysis
            out_file = rf"E:\00 - 中数通ES环境\ES+OTD助手\metadata_{name}.xml"
            with open(out_file, "w", encoding="utf-8") as f:
                f.write(r.text)
            print(f"  Saved to: {out_file}")
            # Show entity sets found
            import re
            entities = re.findall(r'EntitySet\s+Name="([^"]+)"', r.text)
            print(f"  EntitySets ({len(entities)}): {entities[:30]}")
        else:
            print(f"  Body: {r.text[:300]}")
    except Exception as e:
        print(f"\n[ERR] {name}: {e}")

print("\nDone.")
