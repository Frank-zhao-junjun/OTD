#!/usr/bin/env python3
"""Fetch and document API_BUSINESS_PARTNER Customer entities."""
import json
import os
import xml.etree.ElementTree as ET

import requests
from requests.auth import HTTPBasicAuth

USERNAME = "EPC_USER"
PASSWORD = "o3rouK6{rGlt@>5]N~ZY($7BjNr8rt9VzUQub+GB"
BASE = "https://my200967-api.s4hana.sapcloud.cn"
CLIENT = "100"
PATH = "/sap/opu/odata/sap/API_BUSINESS_PARTNER/"


def parse_entity_sets(xml_text):
    root = ET.fromstring(xml_text)
    ns = {"edm": "http://schemas.microsoft.com/ado/2008/09/edm"}
    entity_sets = []
    for es in root.findall(".//edm:EntitySet", ns):
        entity_sets.append({"name": es.get("Name"), "type": es.get("EntityType")})
    return root, ns, entity_sets


def parse_entity_type(root, ns, type_name):
    props = []
    for et in root.findall(".//edm:EntityType", ns):
        if et.get("Name") != type_name:
            continue
        for prop in et.findall("edm:Property", ns):
            props.append(
                {
                    "name": prop.get("Name"),
                    "type": prop.get("Type"),
                    "nullable": prop.get("Nullable", "true"),
                    "maxLength": prop.get("MaxLength", ""),
                }
            )
        for nav in et.findall("edm:NavigationProperty", ns):
            props.append({"name": nav.get("Name"), "type": "Navigation"})
    return props


def main():
    session = requests.Session()
    session.auth = HTTPBasicAuth(USERNAME, PASSWORD)
    session.headers.update({"Accept": "application/json, application/xml"})

    meta_url = f"{BASE}{PATH}$metadata"
    meta_resp = session.get(meta_url, params={"sap-client": CLIENT}, timeout=60)
    print(f"$metadata: HTTP {meta_resp.status_code}")
    meta_resp.raise_for_status()

    root, ns, entity_sets = parse_entity_sets(meta_resp.text)
    customer_sets = [
        e for e in entity_sets if "Customer" in e["name"] or e["name"] == "A_BusinessPartner"
    ]

    print(f"Entity sets total: {len(entity_sets)}")
    print("Customer/BP entity sets:")
    for item in customer_sets:
        print(f"  - {item['name']}")

    result = {
        "service": "API_BUSINESS_PARTNER",
        "base_url": f"{BASE}{PATH}",
        "scenario": "SAP_COM_0008",
        "entity_sets": [],
        "samples": {},
    }

    priority = [
        "A_BusinessPartner",
        "A_Customer",
        "A_CustomerSalesArea",
        "A_CustomerCompany",
        "A_BusinessPartnerAddress",
        "A_BusinessPartnerTaxNumber",
    ]

    for es_name in priority:
        match = next((e for e in entity_sets if e["name"] == es_name), None)
        if not match:
            continue
        type_name = match["type"].split(".")[-1]
        props = parse_entity_type(root, ns, type_name)
        result["entity_sets"].append(
            {"name": es_name, "type": match["type"], "properties": props}
        )

        data_url = f"{BASE}{PATH}{es_name}"
        data_resp = session.get(
            data_url,
            params={"sap-client": CLIENT, "$top": 3, "$format": "json"},
            timeout=60,
        )
        print(f"{es_name}: HTTP {data_resp.status_code}")
        if data_resp.status_code == 200:
            rows = data_resp.json().get("d", {}).get("results", [])
            result["samples"][es_name] = rows
            print(f"  rows: {len(rows)}")
        else:
            result["samples"][es_name] = {"error": data_resp.text[:500]}

    out_dir = os.path.join(os.path.dirname(__file__), "接口")
    out_file = os.path.join(out_dir, "Customer Master Response.json")
    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(result, f, indent=2, ensure_ascii=False, default=str)
    print(f"Saved: {out_file}")


if __name__ == "__main__":
    main()
