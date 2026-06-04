"""OData V4 client for CE_PRODUCTIONORDER_0001 service.

Covers:
  - Production Order Header: CRUD + Release, Schedule, Technically Complete,
    Close, Lock/Unlock, Print, Cost, Set/Remove Deletion Flag,
    Check Material Availability, Reexplode Master Data, Execute Material Staging
  - Production Order Item: CRUD (via _Item association)
  - Production Order Sequence: CRUD (via _Sequence association)
  - Production Order Operation: CRUD + Release, Dispatch, Deallocate,
    SetDates, UnfixDates, Delete (via _Operation association)
  - Production Order Component: Read (via _Component association)
  - Operation Capacity: Read (via _OrderCapacity association)
  - Posting Rule: Create/Update/Delete (via _PostingRule association)
  - Serial Number: Read (via _SerialNumber association)
  - Variant Configuration: Read/SetAssignedValues (via _VariantConfiguration)
"""

from typing import Any

import requests
from requests.auth import HTTPBasicAuth
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

from app.config import settings
from app.sap.client import SapApiError, _extract_sap_error_message


class SapProductionOrderClient:
    """OData V4 client for Production Order API."""

    def __init__(self) -> None:
        self.base_url = settings.sap_base_url.rstrip("/")
        self.service_path = settings.sap_po_path
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

    # ------------------------------------------------------------------
    #  Low-level HTTP helpers
    # ------------------------------------------------------------------

    def _request(
        self,
        method: str,
        path: str,
        params: dict[str, Any] | None = None,
        body: dict[str, Any] | None = None,
        *,
        absolute_url: bool = False,
    ) -> dict[str, Any] | None:
        if absolute_url:
            url = path
            query = None
        else:
            url = path if path.startswith("http") else f"{self.service_root}{path.lstrip('/')}"
            query = {"sap-client": settings.sap_client}
            if params:
                query.update(params)

        headers = {}
        if body is not None:
            headers["Content-Type"] = "application/json"

        timeout = (settings.sap_connect_timeout_seconds, settings.sap_read_timeout_seconds)
        response = self.session.request(method, url, params=query, json=body, headers=headers, timeout=timeout)

        if response.status_code >= 400:
            raise SapApiError(
                status_code=response.status_code,
                message=f"SAP Production Order API error: {response.status_code}",
                sap_body=_extract_sap_error_message(response),
            )

        if response.status_code == 204:
            return None
        return response.json() if response.text else None

    def _fetch_all(
        self,
        path: str,
        params: dict[str, Any] | None = None,
        *,
        page_size: int = 100,
    ) -> list[dict[str, Any]]:
        query = dict(params or {})
        query.setdefault("$top", str(page_size))

        all_rows: list[dict[str, Any]] = []
        payload = self._request("GET", path, query)
        if payload:
            all_rows.extend(payload.get("value") or [])

        next_link = payload.get("@odata.nextLink") if payload else None
        while next_link:
            payload = self._request("GET", next_link, absolute_url=True)
            if payload:
                all_rows.extend(payload.get("value") or [])
            next_link = payload.get("@odata.nextLink") if payload else None

        return all_rows

    # ------------------------------------------------------------------
    #  Production Order Header
    # ------------------------------------------------------------------

    def list_orders(
        self,
        params: dict[str, Any] | None = None,
    ) -> list[dict[str, Any]]:
        """GET /ProductionOrder — list/filter production orders."""
        return self._fetch_all("/ProductionOrder", params)

    def find_by_material(
        self,
        material: str,
        params: dict[str, Any] | None = None,
        *,
        plant: str | None = None,
    ) -> list[dict[str, Any]]:
        """GET /ProductionOrder?$filter=Product eq '{material}' — find orders by material number."""
        escaped = material.replace("'", "''")
        filt = f"Product eq '{escaped}'"
        if plant:
            escaped_plant = plant.replace("'", "''")
            filt += f" and ProductionPlant eq '{escaped_plant}'"
        query = dict(params or {})
        query["$filter"] = filt
        return self._fetch_all("/ProductionOrder", query)

    def get_order(self, order_id: str, params: dict[str, Any] | None = None) -> dict[str, Any] | None:
        """GET /ProductionOrder/{order_id} — get a single production order."""
        return self._request("GET", f"/ProductionOrder/{order_id}", params)

    def create_order(self, data: dict[str, Any]) -> dict[str, Any]:
        """POST /ProductionOrder — create a new production order."""
        result = self._request("POST", "/ProductionOrder", body=data)
        return result or {}

    def update_order(self, order_id: str, data: dict[str, Any]) -> None:
        """PATCH /ProductionOrder/{order_id} — update a production order."""
        self._request("PATCH", f"/ProductionOrder/{order_id}", body=data)

    # --- Production Order Actions ---

    def release_order(self, order_id: str, *, dispatch_missing_parts: bool = False) -> dict[str, Any] | None:
        """POST .../SAP__self.Release — release a production order."""
        body = {"OrdRelIsPmtdDsptMisgParts": dispatch_missing_parts}
        return self._request("POST", f"/ProductionOrder/{order_id}/SAP__self.Release", body=body)

    def schedule_order(self, order_id: str) -> dict[str, Any] | None:
        """POST .../SAP__self.ScheduleProductionOrder — schedule a production order."""
        return self._request("POST", f"/ProductionOrder/{order_id}/SAP__self.ScheduleProductionOrder")

    def technically_complete(self, order_id: str) -> dict[str, Any] | None:
        """POST .../SAP__self.CompleteTechnically — technically complete an order."""
        return self._request("POST", f"/ProductionOrder/{order_id}/SAP__self.CompleteTechnically")

    def revoke_technical_completion(self, order_id: str) -> dict[str, Any] | None:
        """POST .../SAP__self.RevokeTechnicalCompletion."""
        return self._request("POST", f"/ProductionOrder/{order_id}/SAP__self.RevokeTechnicalCompletion")

    def close_order(self, order_id: str) -> dict[str, Any] | None:
        """POST .../SAP__self.CloseProductionOrder — close a production order."""
        return self._request("POST", f"/ProductionOrder/{order_id}/SAP__self.CloseProductionOrder")

    def revoke_close(self, order_id: str) -> dict[str, Any] | None:
        """POST .../SAP__self.RevokeProductionOrderClose."""
        return self._request("POST", f"/ProductionOrder/{order_id}/SAP__self.RevokeProductionOrderClose")

    def lock_order(self, order_id: str) -> dict[str, Any] | None:
        """POST .../SAP__self.Lock — lock a production order."""
        return self._request("POST", f"/ProductionOrder/{order_id}/SAP__self.Lock")

    def unlock_order(self, order_id: str) -> dict[str, Any] | None:
        """POST .../SAP__self.Unlock — unlock a production order."""
        return self._request("POST", f"/ProductionOrder/{order_id}/SAP__self.Unlock")

    def cost_order(self, order_id: str) -> dict[str, Any] | None:
        """POST .../SAP__self.CostProductionOrder — cost a production order."""
        return self._request("POST", f"/ProductionOrder/{order_id}/SAP__self.CostProductionOrder")

    def print_order(self, order_id: str) -> dict[str, Any] | None:
        """POST .../SAP__self.PrintProductionOrder — print a production order."""
        return self._request("POST", f"/ProductionOrder/{order_id}/SAP__self.PrintProductionOrder")

    def set_deletion_flag(self, order_id: str) -> dict[str, Any] | None:
        """POST .../SAP__self.SetDeletionFlag — mark an order for deletion."""
        return self._request("POST", f"/ProductionOrder/{order_id}/SAP__self.SetDeletionFlag")

    def remove_deletion_flag(self, order_id: str) -> dict[str, Any] | None:
        """POST .../SAP__self.RemoveDeletionFlag."""
        return self._request("POST", f"/ProductionOrder/{order_id}/SAP__self.RemoveDeletionFlag")

    def check_material_availability(self, order_id: str) -> dict[str, Any] | None:
        """POST .../SAP__self.CheckMaterialAvailability."""
        return self._request("POST", f"/ProductionOrder/{order_id}/SAP__self.CheckMaterialAvailability")

    def get_missing_parts(self, order_id: str) -> list[dict[str, Any]]:
        """GET .../SAP__self.GetMissingParts() — check missing parts for an order."""
        payload = self._request("GET", f"/ProductionOrder/{order_id}/SAP__self.GetMissingParts()")
        return payload.get("value", []) if payload else []

    def reexplode_master_data(self, order_id: str, production_version: str | None = None) -> dict[str, Any] | None:
        """POST .../SAP__self.ReexplodeMasterData."""
        body = {}
        if production_version:
            body["ProductionVersion"] = production_version
        return self._request("POST", f"/ProductionOrder/{order_id}/SAP__self.ReexplodeMasterData", body=body)

    def execute_material_staging(self, order_id: str) -> dict[str, Any] | None:
        """POST .../SAP__self.ExecuteMaterialStaging."""
        return self._request("POST", f"/ProductionOrder/{order_id}/SAP__self.ExecuteMaterialStaging")

    # ------------------------------------------------------------------
    #  Production Order Items
    # ------------------------------------------------------------------

    def list_items(
        self, order_id: str, params: dict[str, Any] | None = None
    ) -> list[dict[str, Any]]:
        """GET /ProductionOrder/{order_id}/_Item."""
        return self._fetch_all(f"/ProductionOrder/{order_id}/_Item", params)

    def get_item(
        self, order_id: str, item_id: str, params: dict[str, Any] | None = None
    ) -> dict[str, Any] | None:
        """GET /ProductionOrderItem/{order_id}/{item_id}."""
        return self._request("GET", f"/ProductionOrderItem/{order_id}/{item_id}", params)

    def create_item(self, order_id: str, data: dict[str, Any]) -> dict[str, Any]:
        """POST /ProductionOrder/{order_id}/_Item."""
        result = self._request("POST", f"/ProductionOrder/{order_id}/_Item", body=data)
        return result or {}

    def update_item(self, order_id: str, item_id: str, data: dict[str, Any]) -> None:
        """PATCH /ProductionOrderItem/{order_id}/{item_id}."""
        self._request("PATCH", f"/ProductionOrderItem/{order_id}/{item_id}", body=data)

    def delete_item(self, order_id: str, item_id: str) -> None:
        """DELETE /ProductionOrderItem/{order_id}/{item_id}."""
        self._request("DELETE", f"/ProductionOrderItem/{order_id}/{item_id}")

    # ------------------------------------------------------------------
    #  Production Order Operations
    # ------------------------------------------------------------------

    def list_operations(
        self, order_id: str, params: dict[str, Any] | None = None
    ) -> list[dict[str, Any]]:
        """GET /ProductionOrder/{order_id}/_Operation."""
        return self._fetch_all(f"/ProductionOrder/{order_id}/_Operation", params)

    def get_operation(
        self, order_id: str, op_internal_id: str, params: dict[str, Any] | None = None
    ) -> dict[str, Any] | None:
        """GET /ProductionOrderOperation/{order_id}/{op_internal_id}."""
        return self._request("GET", f"/ProductionOrderOperation/{order_id}/{op_internal_id}", params)

    def create_operation(self, order_id: str, data: dict[str, Any]) -> dict[str, Any]:
        """POST /ProductionOrder/{order_id}/_Operation."""
        result = self._request("POST", f"/ProductionOrder/{order_id}/_Operation", body=data)
        return result or {}

    def update_operation(self, order_id: str, op_internal_id: str, data: dict[str, Any]) -> None:
        """PATCH /ProductionOrderOperation/{order_id}/{op_internal_id}."""
        self._request("PATCH", f"/ProductionOrderOperation/{order_id}/{op_internal_id}", body=data)

    # --- Operation Actions ---

    def release_operation(self, order_id: str, op_internal_id: str) -> dict[str, Any] | None:
        """POST .../SAP__self.Release — release an operation."""
        return self._request(
            "POST", f"/ProductionOrderOperation/{order_id}/{op_internal_id}/SAP__self.Release"
        )

    def dispatch_operation(self, order_id: str, op_internal_id: str) -> dict[str, Any] | None:
        """POST .../SAP__self.DispatchOrderOperation."""
        return self._request(
            "POST", f"/ProductionOrderOperation/{order_id}/{op_internal_id}/SAP__self.DispatchOrderOperation"
        )

    def deallocate_operation(self, order_id: str, op_internal_id: str) -> dict[str, Any] | None:
        """POST .../SAP__self.DeallocateOrderOperation."""
        return self._request(
            "POST", f"/ProductionOrderOperation/{order_id}/{op_internal_id}/SAP__self.DeallocateOrderOperation"
        )

    def set_operation_dates(self, order_id: str, op_internal_id: str, data: dict[str, Any]) -> dict[str, Any] | None:
        """POST .../SAP__self.SetDates."""
        return self._request(
            "POST", f"/ProductionOrderOperation/{order_id}/{op_internal_id}/SAP__self.SetDates", body=data
        )

    def unfix_operation_dates(self, order_id: str, op_internal_id: str) -> dict[str, Any] | None:
        """POST .../SAP__self.UnfixDates."""
        return self._request(
            "POST", f"/ProductionOrderOperation/{order_id}/{op_internal_id}/SAP__self.UnfixDates"
        )

    def delete_operation(self, order_id: str, op_internal_id: str) -> dict[str, Any] | None:
        """POST .../SAP__self.Delete — delete an operation."""
        return self._request(
            "POST", f"/ProductionOrderOperation/{order_id}/{op_internal_id}/SAP__self.Delete"
        )

    # ------------------------------------------------------------------
    #  Production Order Sequences
    # ------------------------------------------------------------------

    def list_sequences(
        self, order_id: str, params: dict[str, Any] | None = None
    ) -> list[dict[str, Any]]:
        """GET /ProductionOrder/{order_id}/_Sequence."""
        return self._fetch_all(f"/ProductionOrder/{order_id}/_Sequence", params)

    def get_sequence(
        self, order_id: str, sequence: str, params: dict[str, Any] | None = None
    ) -> dict[str, Any] | None:
        """GET /ProductionOrderSequence/{order_id}/{sequence}."""
        return self._request("GET", f"/ProductionOrderSequence/{order_id}/{sequence}", params)

    def create_sequence(self, order_id: str, data: dict[str, Any]) -> dict[str, Any]:
        """POST /ProductionOrder/{order_id}/_Sequence."""
        result = self._request("POST", f"/ProductionOrder/{order_id}/_Sequence", body=data)
        return result or {}

    def update_sequence(self, order_id: str, sequence: str, data: dict[str, Any]) -> None:
        """PATCH /ProductionOrderSequence/{order_id}/{sequence}."""
        self._request("PATCH", f"/ProductionOrderSequence/{order_id}/{sequence}", body=data)

    def delete_sequence(self, order_id: str, sequence: str) -> None:
        """DELETE /ProductionOrderSequence/{order_id}/{sequence}."""
        self._request("DELETE", f"/ProductionOrderSequence/{order_id}/{sequence}")

    # ------------------------------------------------------------------
    #  Production Order Components
    # ------------------------------------------------------------------

    def list_components(
        self, order_id: str, params: dict[str, Any] | None = None
    ) -> list[dict[str, Any]]:
        """GET /ProductionOrder/{order_id}/_Component."""
        return self._fetch_all(f"/ProductionOrder/{order_id}/_Component", params)

    def get_component(
        self, order_id: str, reservation: str, reservation_item: str,
        params: dict[str, Any] | None = None,
    ) -> dict[str, Any] | None:
        """GET /ProductionOrderComponent/{order_id}/{reservation}/{reservation_item}."""
        return self._request(
            "GET", f"/ProductionOrderComponent/{order_id}/{reservation}/{reservation_item}", params
        )

    # ------------------------------------------------------------------
    #  Operation Capacity
    # ------------------------------------------------------------------

    def list_operation_capacities(
        self, order_id: str, params: dict[str, Any] | None = None
    ) -> list[dict[str, Any]]:
        """GET /ProductionOrder/{order_id}/_OrderCapacity."""
        return self._fetch_all(f"/ProductionOrder/{order_id}/_OrderCapacity", params)

    # ------------------------------------------------------------------
    #  Posting Rules
    # ------------------------------------------------------------------

    def create_posting_rule(self, order_id: str, data: dict[str, Any]) -> dict[str, Any]:
        """POST /ProductionOrder/{order_id}/_PostingRule."""
        result = self._request("POST", f"/ProductionOrder/{order_id}/_PostingRule", body=data)
        return result or {}

    def update_posting_rule(self, uuid: str, data: dict[str, Any]) -> None:
        """PATCH /PostingRule/{uuid}."""
        self._request("PATCH", f"/PostingRule/{uuid}", body=data)

    def delete_posting_rule(self, uuid: str) -> None:
        """DELETE /PostingRule/{uuid}."""
        self._request("DELETE", f"/PostingRule/{uuid}")

    # ------------------------------------------------------------------
    #  Serial Numbers
    # ------------------------------------------------------------------

    def list_serial_numbers(
        self, order_id: str, params: dict[str, Any] | None = None
    ) -> list[dict[str, Any]]:
        """GET /ProductionOrder/{order_id}/_SerialNumber."""
        return self._fetch_all(f"/ProductionOrder/{order_id}/_SerialNumber", params)

    def generate_serial_numbers(self, order_id: str, item_id: str) -> dict[str, Any] | None:
        """POST .../SAP__self.GenerateSerialNumber."""
        return self._request(
            "POST", f"/ProductionOrderItem/{order_id}/{item_id}/SAP__self.GenerateSerialNumber"
        )

    # ------------------------------------------------------------------
    #  Variant Configuration
    # ------------------------------------------------------------------

    def get_variant_configuration(self, order_id: str, params: dict[str, Any] | None = None) -> dict[str, Any] | None:
        """GET /ProductionOrder/{order_id}/_VariantConfiguration."""
        return self._request("GET", f"/ProductionOrder/{order_id}/_VariantConfiguration", params)

    def set_assigned_values(self, order_id: str, data: dict[str, Any]) -> None:
        """POST .../SAP__self.SetAssignedValues."""
        self._request("POST", f"/ProductionOrder/{order_id}/_VariantConfiguration/SAP__self.SetAssignedValues", body=data)


production_order_client = SapProductionOrderClient()
