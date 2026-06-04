from typing import Any

import requests
from requests.auth import HTTPBasicAuth
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

from app.config import settings
from app.sap.client import SapApiError, _extract_sap_error_message


class SapODataV4Client:
    """OData V4 client for CE_SALESORDER_0001 and similar services."""

    def __init__(self, service_path: str | None = None) -> None:
        self.base_url = settings.sap_base_url.rstrip("/")
        self.service_path = service_path or settings.sap_so_path
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

    def _request(
        self,
        method: str,
        url: str,
        params: dict[str, Any] | None = None,
        *,
        absolute_url: bool = False,
    ) -> dict[str, Any]:
        if absolute_url:
            request_url = url
            query = None
        else:
            request_url = url if url.startswith("http") else f"{self.service_root}{url.lstrip('/')}"
            query = {"sap-client": settings.sap_client}
            if params:
                query.update(params)

        timeout = (settings.sap_connect_timeout_seconds, settings.sap_read_timeout_seconds)
        response = self.session.request(method, request_url, params=query, timeout=timeout)
        if response.status_code >= 400:
            raise SapApiError(
                status_code=response.status_code,
                message=f"SAP OData V4 request failed: {response.status_code}",
                sap_body=_extract_sap_error_message(response),
            )
        try:
            return response.json()
        except ValueError as exc:
            raise SapApiError(
                status_code=response.status_code,
                message="SAP OData V4 response is not valid JSON",
                sap_body=response.text[:1500],
            ) from exc

    def get_collection(
        self,
        entity_set: str,
        params: dict[str, Any] | None = None,
        *,
        select_fields: str | None = None,
    ) -> dict[str, Any]:
        query = dict(params or {})
        if select_fields:
            query["$select"] = select_fields
        return self._request("GET", entity_set, query)

    def get_entity_by_key(
        self,
        entity_set: str,
        key_expr: str,
        params: dict[str, Any] | None = None,
        *,
        select_fields: str | None = None,
    ) -> dict[str, Any]:
        query = dict(params or {})
        if select_fields:
            query["$select"] = select_fields
        return self._request("GET", f"{entity_set}{key_expr}", query)

    def fetch_all_pages(
        self,
        entity_set: str,
        params: dict[str, Any] | None = None,
        *,
        page_size: int = 100,
        select_fields: str | None = None,
    ) -> list[dict[str, Any]]:
        query = dict(params or {})
        query.setdefault("$top", str(page_size))
        if select_fields:
            query["$select"] = select_fields

        all_rows: list[dict[str, Any]] = []
        payload = self.get_collection(entity_set, query)
        all_rows.extend(payload.get("value") or [])

        next_link = payload.get("@odata.nextLink")
        while next_link:
            payload = self._request("GET", next_link, absolute_url=True)
            all_rows.extend(payload.get("value") or [])
            next_link = payload.get("@odata.nextLink")

        return all_rows


sales_order_client = SapODataV4Client()
