from typing import Any

import requests
from requests.auth import HTTPBasicAuth
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

from app.config import settings


class SapApiError(Exception):
    def __init__(self, status_code: int, message: str, sap_body: str = ""):
        self.status_code = status_code
        self.message = message
        self.sap_body = sap_body
        super().__init__(message)


def _extract_sap_error_message(response: requests.Response) -> str:
    try:
        payload = response.json()
        err = payload.get("error") or {}
        message = err.get("message")
        if isinstance(message, dict):
            value = message.get("value")
            if value:
                return str(value)
        if isinstance(message, str) and message.strip():
            return message.strip()
    except ValueError:
        pass
    return response.text[:1000]


class SapODataClient:
    def __init__(self, service_path: str | None = None) -> None:
        self.base_url = settings.sap_base_url.rstrip("/")
        self.service_path = service_path or settings.sap_bp_path
        self.session = requests.Session()
        self.session.auth = HTTPBasicAuth(settings.sap_username, settings.sap_password)
        retry = Retry(
            total=settings.sap_retry_total,
            connect=settings.sap_retry_total,
            read=settings.sap_retry_total,
            status=settings.sap_retry_total,
            backoff_factor=settings.sap_retry_backoff_seconds,
            status_forcelist=[429, 500, 502, 503, 504],
            allowed_methods=frozenset(["GET", "POST", "PUT", "PATCH", "DELETE"]),
            raise_on_status=False,
        )
        adapter = HTTPAdapter(pool_connections=settings.sap_pool_maxsize, pool_maxsize=settings.sap_pool_maxsize, max_retries=retry)
        self.session.mount("https://", adapter)
        self.session.mount("http://", adapter)
        self.session.headers.update(
            {
                "Accept": "application/json",
                "User-Agent": "SAP-ERP-Portal-Backend/1.0",
                "SAP-Client": settings.sap_client,
            }
        )

    @property
    def service_root(self) -> str:
        return f"{self.base_url}{self.service_path}"

    def _request(self, method: str, url: str, params: dict[str, Any] | None = None) -> dict[str, Any]:
        query = {"sap-client": settings.sap_client, "$format": "json"}
        if params:
            query.update(params)

        timeout = (settings.sap_connect_timeout_seconds, settings.sap_read_timeout_seconds)
        response = self.session.request(method, url, params=query, timeout=timeout)
        if response.status_code >= 400:
            error_message = _extract_sap_error_message(response)
            raise SapApiError(
                status_code=response.status_code,
                message=f"SAP OData request failed: {response.status_code}",
                sap_body=error_message,
            )
        try:
            return response.json()
        except ValueError as exc:
            raise SapApiError(
                status_code=response.status_code,
                message="SAP OData response is not valid JSON",
                sap_body=response.text[:1000],
            ) from exc

    def get_entity_set(self, entity_set: str, params: dict[str, Any] | None = None) -> dict[str, Any]:
        url = f"{self.service_root}{entity_set}"
        payload = self._request("GET", url, params)
        return payload.get("d", {})

    def get_entity_by_key(
        self,
        entity_set: str,
        key_expr: str,
        params: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        url = f"{self.service_root}{entity_set}{key_expr}"
        payload = self._request("GET", url, params)
        return payload.get("d", {})

    def fetch_all_pages(
        self,
        entity_set: str,
        params: dict[str, Any] | None = None,
        *,
        page_size: int = 100,
    ) -> tuple[list[dict[str, Any]], int]:
        query = dict(params or {})
        query["$inlinecount"] = "allpages"
        query["$top"] = page_size

        all_rows: list[dict[str, Any]] = []
        skip = 0
        total = 0

        while True:
            query["$skip"] = skip
            payload = self.get_entity_set(entity_set, query)
            rows = payload.get("results", [])
            all_rows.extend(rows)
            total = int(payload.get("__count", len(all_rows)))
            if not rows or len(all_rows) >= total:
                break
            skip += page_size

        return all_rows, total


sap_client = SapODataClient()
