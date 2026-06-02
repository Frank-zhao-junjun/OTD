import re
from datetime import datetime, timezone
from typing import Any


SAP_DATE_RE = re.compile(r"/Date\((-?\d+)(?:[+-]\d+)?\)/")


def parse_sap_v2_date(value: Any) -> str | None:
    if value is None or value == "":
        return None
    if isinstance(value, str):
        match = SAP_DATE_RE.match(value)
        if match:
            millis = int(match.group(1))
            try:
                dt = datetime.fromtimestamp(millis / 1000, tz=timezone.utc)
                return dt.date().isoformat()
            except (OSError, OverflowError, ValueError):
                return value
        return value[:10] if len(value) >= 10 else value
    return None


def pick(row: dict[str, Any], *keys: str) -> Any:
    for key in keys:
        if key in row:
            return row[key]
    return None


def nav_results(row: dict[str, Any], nav_name: str) -> list[dict[str, Any]]:
    nav = row.get(nav_name) or {}
    if isinstance(nav, dict):
        results = nav.get("results")
        if isinstance(results, list):
            return results
    return []


def format_sales_area(
    sales_org: str,
    distribution_channel: str,
    division: str,
) -> str:
    return f"{sales_org}/{distribution_channel}/{division}"


def blocked_status(*flags: Any) -> str:
    for flag in flags:
        if flag is True:
            return "冻结"
        if isinstance(flag, str) and flag.strip():
            return "冻结"
    return "正常"


def normalize_sap_value(value: Any) -> Any:
    if isinstance(value, dict):
        if "__deferred" in value:
            return {"deferredUri": value["__deferred"].get("uri")}
        if "results" in value:
            return [normalize_sap_record(item) for item in value["results"]]
        return {key: normalize_sap_value(item) for key, item in value.items()}
    if isinstance(value, list):
        return [normalize_sap_value(item) for item in value]
    if isinstance(value, str):
        parsed_date = parse_sap_v2_date(value)
        if parsed_date and SAP_DATE_RE.match(value):
            return parsed_date
    return value


def normalize_sap_record(row: dict[str, Any]) -> dict[str, Any]:
    cleaned: dict[str, Any] = {}
    for key, value in row.items():
        if key == "__metadata":
            continue
        cleaned[key] = normalize_sap_value(value)
    return cleaned


def extract_scalar_fields(row: dict[str, Any]) -> dict[str, Any]:
    cleaned: dict[str, Any] = {}
    for key, value in row.items():
        if key == "__metadata" or key.startswith("to_"):
            continue
        cleaned[key] = normalize_sap_value(value)
    return cleaned
