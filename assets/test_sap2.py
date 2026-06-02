# -*- coding: utf-8 -*-
import requests
import base64
import sys
import io
import urllib3
urllib3.disable_warnings()
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# Read credentials directly from file to avoid any copy-paste issues
with open(r"E:\00 - 中数通ES环境\ES+OTD助手\user.txt", "r", encoding="utf-8") as f:
    content = f.read()

USERNAME = "CC0000000001"
# Extract password: line 3: "密码：......"
for line in content.split("\n"):
    if "密码" in line or "password" in line.lower():
        # Extract everything after first colon or ： 
        for sep in ["：", ":"]:
            if sep in line:
                PASSWORD = line.split(sep, 1)[1].strip()
                break

print(f"Username: '{USERNAME}' (len={len(USERNAME)})")
print(f"Password: '{PASSWORD}' (len={len(PASSWORD)})")
print(f"Password repr: {repr(PASSWORD)}")

# Check for invisible characters
for i, c in enumerate(PASSWORD):
    if ord(c) < 32 or ord(c) > 126:
        print(f"  WARNING: non-printable char at pos {i}: U+{ord(c):04X}")

BASE_URL = "https://my200967-api.s4hana.sapcloud.cn"
PO_URL = f"{BASE_URL}/sap/opu/odata4/sap/api_purchaseorder_2/srvd_a2x/sap/purchaseorder/0001/"

# Test multiple auth encoding approaches
tests = []

# 1. requests.auth (tuple)
tests.append(("requests.auth tuple", lambda: requests.get(
    PO_URL, auth=(USERNAME, PASSWORD), verify=False, timeout=30,
    headers={"Accept": "application/json"}
)))

# 2. Manual Basic header with ASCII-safe encoding
auth_bytes = f"{USERNAME}:{PASSWORD}".encode("latin-1")
auth_b64 = base64.b64encode(auth_bytes).decode("ascii")
tests.append(("Manual Basic latin-1", lambda: requests.get(
    PO_URL, verify=False, timeout=30,
    headers={"Authorization": f"Basic {auth_b64}", "Accept": "application/json"}
)))

# 3. Manual Basic with UTF-8
auth_bytes_utf8 = f"{USERNAME}:{PASSWORD}".encode("utf-8")
auth_b64_utf8 = base64.b64encode(auth_bytes_utf8).decode("ascii")
tests.append(("Manual Basic UTF-8", lambda: requests.get(
    PO_URL, verify=False, timeout=30,
    headers={"Authorization": f"Basic {auth_b64_utf8}", "Accept": "application/json"}
)))

# 4. HTTPBasicAuth from requests
from requests.auth import HTTPBasicAuth
tests.append(("HTTPBasicAuth", lambda: requests.get(
    PO_URL, auth=HTTPBasicAuth(USERNAME, PASSWORD), verify=False, timeout=30,
    headers={"Accept": "application/json"}
)))

# 5. Try URL encoding password
from urllib.parse import quote
encoded_pw = quote(PASSWORD, safe='')
tests.append(("URL-encoded password", lambda: requests.get(
    PO_URL, auth=(USERNAME, PASSWORD), verify=False, timeout=30,
    headers={"Accept": "application/json"}
)))

print(f"\n{'='*50}")
print(f"Testing auth against: {PO_URL}")
print(f"Auth header preview: Basic {auth_b64[:30]}...")
print(f"{'='*50}")

for name, fn in tests:
    try:
        r = fn()
        print(f"\n[{r.status_code}] {name}")
        if r.status_code == 401:
            print(f"  FAIL - sap-authenticated: {r.headers.get('sap-authenticated', 'N/A')}")
        elif r.status_code in (200, 201):
            print(f"  SUCCESS!")
            print(f"  Content-Type: {r.headers.get('content-type')}")
            print(f"  Body: {r.text[:500]}")
        else:
            print(f"  HTTP {r.status_code}: {r.text[:200]}")
    except Exception as e:
        print(f"\n[ERR] {name}: {e}")

# Also try with cookies first
print(f"\n{'='*50}")
print("Trying session+cookie approach")
print(f"{'='*50}")
s = requests.Session()
s.verify = False
# Step 1: Get root to get XSRF cookie
r1 = s.get(f"{BASE_URL}/", auth=(USERNAME, PASSWORD), timeout=30)
print(f"Root GET: {r1.status_code}, cookies: {dict(s.cookies)}")

# Step 2: Try API with cookies
r2 = s.get(PO_URL, headers={"Accept": "application/json"}, timeout=30)
print(f"PO GET with cookies: {r2.status_code}")
if r2.status_code == 200:
    print(f"SUCCESS! {r2.text[:500]}")
elif r2.status_code == 401:
    print(f"sap-authenticated: {r2.headers.get('sap-authenticated')}")
    www_auth = r2.headers.get('www-authenticate', '')
    print(f"WWW-Authenticate: {www_auth}")
