#!/usr/bin/env python3
"""SAP ERP Portal API Discovery - Test all PRD APIs with correct credentials."""
import requests
import json
import sys
import os
import xml.etree.ElementTree as ET
from requests.auth import HTTPBasicAuth

# Correct credentials from Postman
USERNAME = "EPC_USER"
PASSWORD = "o3rouK6{rGlt@>5]N~ZY($7BjNr8rt9VzUQub+GB"
BASE = "https://my200967-api.s4hana.sapcloud.cn"
CLIENT = "100"

# API definitions from PRD
APIS = [
    # V2 APIs (confirmed pattern from Postman)
    {"name": "API_PRODUCT_SRV", "desc": "Product Master", "version": "V2", 
     "path": "/sap/opu/odata/sap/API_PRODUCT_SRV/"},
    {"name": "API_BUSINESS_PARTNER", "desc": "Business Partner", "version": "V2",
     "path": "/sap/opu/odata/sap/API_BUSINESS_PARTNER/"},
    {"name": "API_OUTBOUND_DELIVERY_SRV", "desc": "Outbound Delivery", "version": "V2",
     "path": "/sap/opu/odata/sap/API_OUTBOUND_DELIVERY_SRV/"},
    {"name": "API_BILLING_DOCUMENT_SRV", "desc": "Billing Document", "version": "V2",
     "path": "/sap/opu/odata/sap/API_BILLING_DOCUMENT_SRV/"},
    {"name": "API_PRODUCTION_ORDER_2_SRV", "desc": "Production Order", "version": "V2",
     "path": "/sap/opu/odata/sap/API_PRODUCTION_ORDER_2_SRV/"},
    {"name": "API_MATERIAL_DOCUMENT_SRV", "desc": "Material Document", "version": "V2",
     "path": "/sap/opu/odata/sap/API_MATERIAL_DOCUMENT_SRV/"},
    {"name": "API_PROD_ORDER_CONFIRMATION_2_SRV", "desc": "Production Confirmation", "version": "V2",
     "path": "/sap/opu/odata/sap/API_PROD_ORDER_CONFIRMATION_2_SRV/"},
    
    # V4 APIs (pattern from Postman costcenter)
    {"name": "CE_SALESORDER_0001", "desc": "Sales Order (V4)", "version": "V4",
     "path": "/sap/opu/odata4/sap/ce_salesorder_0001/srvd_a2x/sap/salesorder/0001/"},
    
    # V2 API for sales order (backup if V4 doesn't work)
    {"name": "API_SALES_ORDER_SRV", "desc": "Sales Order (V2)", "version": "V2",
     "path": "/sap/opu/odata/sap/API_SALES_ORDER_SRV/"},
]

def parse_v2_metadata(xml_text):
    """Parse OData V2 $metadata XML to extract entity sets and properties."""
    try:
        root = ET.fromstring(xml_text)
        ns = {'edmx': 'http://schemas.microsoft.com/ado/2007/06/edmx',
              'edm': 'http://schemas.microsoft.com/ado/2008/09/edm'}
        
        entities = []
        for es in root.findall('.//edm:EntitySet', ns):
            name = es.get('Name', '')
            etype = es.get('EntityType', '')
            entities.append({'name': name, 'type': etype, 'properties': []})
        
        # Get properties for each entity type
        for ent in entities:
            type_name = ent['type'].split('.')[-1] if '.' in ent['type'] else ent['type']
            for et in root.findall('.//edm:EntityType', ns):
                if et.get('Name') == type_name:
                    for prop in et.findall('edm:Property', ns):
                        ent['properties'].append({
                            'name': prop.get('Name'),
                            'type': prop.get('Type'),
                            'nullable': prop.get('Nullable', 'true'),
                            'maxLength': prop.get('MaxLength', '')
                        })
                    for nav in et.findall('edm:NavigationProperty', ns):
                        ent['properties'].append({
                            'name': nav.get('Name'),
                            'type': 'Navigation',
                            'relationship': nav.get('Relationship', ''),
                            'fromRole': nav.get('FromRole', ''),
                            'toRole': nav.get('ToRole', '')
                        })
        
        return entities
    except Exception as e:
        return f"XML parse error: {e}"

def parse_v4_metadata(xml_text):
    """Parse OData V4 $metadata XML."""
    try:
        root = ET.fromstring(xml_text)
        ns = {'edmx': 'http://docs.oasis-open.org/odata/ns/edmx',
              'edm': 'http://docs.oasis-open.org/odata/ns/edm'}
        
        entities = []
        for es in root.findall('.//edm:EntitySet', ns):
            name = es.get('Name', '')
            etype = es.get('EntityType', '')
            entities.append({'name': name, 'type': etype, 'properties': []})
        
        for ent in entities:
            type_name = ent['type'].split('.')[-1] if '.' in ent['type'] else ent['type']
            for et in root.findall('.//edm:EntityType', ns):
                if et.get('Name') == type_name:
                    for prop in et.findall('edm:Property', ns):
                        ent['properties'].append({
                            'name': prop.get('Name'),
                            'type': prop.get('Type'),
                            'nullable': prop.get('Nullable', 'true')
                        })
                    for nav in et.findall('edm:NavigationProperty', ns):
                        ent['properties'].append({
                            'name': nav.get('Name'),
                            'type': 'Navigation',
                            'partner': nav.get('Partner', '')
                        })
        
        return entities
    except Exception as e:
        return f"XML parse error: {e}"

def test_api(session, api):
    """Test a single API: metadata + data sample."""
    result = {
        'name': api['name'],
        'desc': api['desc'],
        'version': api['version'],
        'status': 'unknown',
        'metadata_status': '',
        'data_status': '',
        'error': '',
        'entities': []
    }
    
    path = api['path']
    
    # Step 1: Get $metadata
    meta_url = f"{BASE}{path}$metadata"
    params = {'sap-client': CLIENT}
    try:
        r = session.get(meta_url, params=params, timeout=30)
        result['metadata_status'] = f"HTTP {r.status_code}"
        if r.status_code == 200:
            if api['version'] == 'V2':
                result['entities'] = parse_v2_metadata(r.text)
            else:
                result['entities'] = parse_v4_metadata(r.text)
            if isinstance(result['entities'], str) and result['entities'].startswith('XML'):
                result['error'] = result['entities']
                result['entities'] = []
        else:
            result['error'] = r.text[:300] if r.text else 'No body'
    except Exception as e:
        result['metadata_status'] = f"Error: {e}"
        result['error'] = str(e)
    
    # Step 2: Try $top=1 data fetch
    if isinstance(result['entities'], list) and len(result['entities']) > 0:
        first_entity = result['entities'][0]['name']
        data_url = f"{BASE}{path}{first_entity}"
        data_params = {'sap-client': CLIENT, '$top': 1, '$format': 'json'}
        try:
            r = session.get(data_url, params=data_params, timeout=60)
            result['data_status'] = f"HTTP {r.status_code} ({first_entity})"
            if r.status_code == 200:
                try:
                    data = r.json()
                    if 'd' in data and 'results' in data['d']:  # V2 format
                        result['data_status'] += f" - {len(data['d']['results'])} rows"
                    elif 'value' in data:  # V4 format
                        result['data_status'] += f" - {len(data['value'])} rows"
                except:
                    result['data_status'] += f" - response: {r.text[:200]}"
            else:
                result['error'] += f" | Data: {r.status_code} {r.text[:200]}"
        except Exception as e:
            result['data_status'] = f"Error: {e}"
            result['error'] += f" | Data Error: {e}"
    else:
        result['data_status'] = "No entities found"
    
    # Step 3: Try without $top (just the entity set URL)
    if not isinstance(result['entities'], list) or len(result['entities']) == 0:
        data_url = f"{BASE}{path}"
        data_params = {'sap-client': CLIENT, '$top': 1, '$format': 'json'}
        try:
            r = session.get(data_url, params=data_params, timeout=60)
            if r.status_code == 200:
                result['metadata_status'] += " | Root $top=1 OK"
                try:
                    data = r.json()
                    if 'd' in data:
                        entity_sets = list(data['d'].get('EntitySets', data['d'].keys()))
                        result['data_status'] = f"Root OK - keys: {entity_sets[:10]}"
                except:
                    result['data_status'] = f"Root OK - {r.text[:200]}"
            else:
                result['data_status'] = f"Root rejected: {r.status_code}"
        except Exception as e:
            result['data_status'] = f"Root Error: {e}"
    
    # Determine overall status
    if result['metadata_status'].startswith('HTTP 200'):
        result['status'] = 'OK'
        if isinstance(result['entities'], list) and len(result['entities']) > 0:
            result['status'] = f"OK ({len(result['entities'])} entities)"
        elif 'Root OK' in result['metadata_status']:
            result['status'] = 'Partial (no metadata parse)'
    else:
        result['status'] = 'FAILED'
    
    return result

def main():
    session = requests.Session()
    session.auth = HTTPBasicAuth(USERNAME, PASSWORD)
    session.headers.update({
        'Accept': 'application/json, application/xml',
        'User-Agent': 'SAP-Portal-API-Discovery/1.0'
    })
    
    print("=" * 80)
    print("SAP ERP Portal - API Discovery Report")
    print(f"Server: {BASE}  |  Client: {CLIENT}  |  User: {USERNAME}")
    print("=" * 80)
    
    results = []
    for i, api in enumerate(APIS):
        print(f"\n[{i+1}/{len(APIS)}] Testing {api['name']} ({api['desc']}) [{api['version']}]...")
        r = test_api(session, api)
        results.append(r)
        print(f"  Status:        {r['status']}")
        print(f"  Metadata:      {r['metadata_status']}")
        print(f"  Data:          {r['data_status']}")
        if r['error']:
            print(f"  Error:         {r['error'][:200]}")
        if isinstance(r['entities'], list) and len(r['entities']) > 0:
            print(f"  Entity Sets:   {', '.join(e['name'] for e in r['entities'][:10])}")
            for e in r['entities'][:3]:
                print(f"    {e['name']} ({len(e['properties'])} properties)")
                for p in e['properties'][:5]:
                    print(f"      - {p['name']}: {p['type']}")
    
    # Summary
    print("\n" + "=" * 80)
    print("SUMMARY")
    print("=" * 80)
    
    ok_count = sum(1 for r in results if r['status'].startswith('OK'))
    fail_count = sum(1 for r in results if r['status'] == 'FAILED')
    partial_count = len(results) - ok_count - fail_count
    
    print(f"OK: {ok_count}  |  Partial: {partial_count}  |  Failed: {fail_count}")
    print()
    for r in results:
        icon = "+" if r['status'].startswith('OK') else ("?" if r['status'] != 'FAILED' else "X")
        print(f"  [{icon}] {r['name']:45s} {r['status']}")
    
    # Save results
    out_file = os.path.join(os.path.dirname(__file__), "sap_api_discovery.json")
    with open(out_file, 'w', encoding='utf-8') as f:
        json.dump(results, f, indent=2, ensure_ascii=False, default=str)
    print(f"\nFull results saved to: {out_file}")

if __name__ == '__main__':
    main()
