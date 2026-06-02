#!/usr/bin/env python3
"""Exact Postman replica - debug SAP auth."""
import requests
import base64
from requests.auth import HTTPBasicAuth

USERNAME = "EPC_USER"
PASSWORD = "o3rouK6{rGlt@>5]N~ZY($7BjNr8rt9VzUQub+GB"
BASE = "https://my200967-api.s4hana.sapcloud.cn"

# Exact URL from Postman screenshot that returned 200
url = f"{BASE}/sap/opu/odata/sap/API_PRODUCT_SRV/A_Product"
params = {'$format': 'json', 'sap-client': '100'}

print(f"URL: {url}")
print(f"Params: {params}")
print(f"User: {USERNAME}")
print(f"Password: {PASSWORD}")
print(f"Password len: {len(PASSWORD)}")
print(f"Password repr: {repr(PASSWORD)}")
print()

# Method 1: requests.auth.HTTPBasicAuth
print("=== Method 1: requests.auth.HTTPBasicAuth ===")
try:
    r = requests.get(url, params=params, auth=HTTPBasicAuth(USERNAME, PASSWORD), timeout=30)
    print(f"HTTP {r.status_code}")
    print(f"Headers: {dict(r.headers)}")
    if r.status_code == 200:
        print(f"Body (truncated): {r.text[:500]}")
    else:
        print(f"Body: {r.text[:500]}")
except Exception as e:
    print(f"Error: {e}")

print()

# Method 2: Manual Base64 (US-ASCII)
print("=== Method 2: Manual Base64 ===")
auth_str = f"{USERNAME}:{PASSWORD}"
auth_b64 = base64.b64encode(auth_str.encode('utf-8')).decode('ascii')
print(f"Auth header: Basic {auth_b64}")
try:
    r = requests.get(url, params=params, 
                     headers={'Authorization': f'Basic {auth_b64}'}, timeout=30)
    print(f"HTTP {r.status_code}")
    if r.status_code == 200:
        print(f"Body (truncated): {r.text[:500]}")
    else:
        print(f"Body: {r.text[:300]}")
except Exception as e:
    print(f"Error: {e}")

print()

# Method 3: URL-encoded password in auth string
print("=== Method 3: URL-encoded special chars ===")
from urllib.parse import quote
encoded_pw = quote(PASSWORD, safe='')
encoded_auth = base64.b64encode(f"{USERNAME}:{encoded_pw}".encode('utf-8')).decode('ascii')
print(f"Encoded password: {encoded_pw}")
try:
    r = requests.get(url, params=params,
                     headers={'Authorization': f'Basic {encoded_auth}'}, timeout=30)
    print(f"HTTP {r.status_code}")
    if r.status_code == 200:
        print(f"Body (truncated): {r.text[:500]}")
    else:
        print(f"Body: {r.text[:300]}")
except Exception as e:
    print(f"Error: {e}")

print()

# Method 4: Try latin-1 encoding for Base64
print("=== Method 4: latin-1 Base64 ===")
auth_b64_latin = base64.b64encode(auth_str.encode('latin-1')).decode('ascii')
print(f"Auth header: Basic {auth_b64_latin}")
print(f"Same as utf-8? {auth_b64 == auth_b64_latin}")
try:
    r = requests.get(url, params=params,
                     headers={'Authorization': f'Basic {auth_b64_latin}'}, timeout=30)
    print(f"HTTP {r.status_code}")
except Exception as e:
    print(f"Error: {e}")

print()

# Method 5: Try WITHOUT sap-client param
print("=== Method 5: Without sap-client param ===")
try:
    r = requests.get(url, params={'$format': 'json'}, 
                     auth=HTTPBasicAuth(USERNAME, PASSWORD), timeout=30)
    print(f"HTTP {r.status_code}")
    if r.status_code == 200:
        print(f"Body (truncated): {r.text[:500]}")
    else:
        print(f"Body: {r.text[:300]}")
except Exception as e:
    print(f"Error: {e}")

print()

# Method 6: Let's also check the raw HTTP request
print("=== Method 6: With prepared request debugging ===")
s = requests.Session()
req = requests.Request('GET', url, params=params, auth=HTTPBasicAuth(USERNAME, PASSWORD))
prepped = s.prepare_request(req)
print(f"Request URL: {prepped.url}")
print(f"Request Headers:")
for k, v in prepped.headers.items():
    if k == 'Authorization':
        print(f"  {k}: Basic (omitted, len={len(v)})")
    else:
        print(f"  {k}: {v}")
try:
    r = s.send(prepped, timeout=30)
    print(f"HTTP {r.status_code}")
except Exception as e:
    print(f"Error: {e}")
