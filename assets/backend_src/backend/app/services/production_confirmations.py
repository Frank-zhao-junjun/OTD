import json
from datetime import date
from pathlib import Path
from typing import Any

from app.config import settings
from app.sap.client import SapODataClient
from app.sap.transforms import parse_sap_v2_date
from app.schemas.production_confirmations import ProductionConfirmationPortalRowDto

ENTITY = "A_ProdnOrdConf2"


def _escape_odata(value: str) -> str:
    return value.replace("'", "''")


def _to_float(value: Any) -> float:
    if value is None or value == "":
        return 0.0
    return float(value)


def _parse_date(value: Any) -> date | None:
    parsed = parse_sap_v2_date(value)
    if not parsed:
        return None
    try:
        return date.fromisoformat(parsed[:10])
    except ValueError:
        return None


def map_portal_row(row: dict[str, Any]) -> ProductionConfirmationPortalRowDto:
    production_order = row.get("OrderID") or row.get("ProductionOrder") or row.get("ManufacturingOrder")
    return ProductionConfirmationPortalRowDto(
        productionOrder=str(production_order or ""),
        orderOperation=row.get("OrderOperation"),
        confirmationGroup=row.get("ConfirmationGroup"),
        confirmationCounter=row.get("ConfirmationCounter"),
        yieldQuantity=_to_float(row.get("ConfirmationYieldQuantity") or row.get("YieldQuantity")),
        unit=row.get("ConfirmationUnit") or row.get("ProductionUnit"),
        postingDate=_parse_date(row.get("PostingDate") or row.get("ConfirmationEntryDate")),
        workCenter=row.get("WorkCenter") or row.get("WorkCenterInternalID"),
        finalConfirmationType=row.get("FinalConfirmationType"),
    )


class ProductionConfirmationService:
    def __init__(self) -> None:
        self.client = SapODataClient(service_path=settings.sap_confirmation_path)

    def list_by_production_order(
        self,
        production_order: str,
        top: int = 50,
    ) -> list[ProductionConfirmationPortalRowDto]:
        params: dict[str, Any] = {
            "$filter": (
                f"OrderID eq '{_escape_odata(production_order.strip())}' "
                f"or ManufacturingOrder eq '{_escape_odata(production_order.strip())}'"
            ),
            "$top": top,
            "$orderby": "OrderOperation asc,ConfirmationCounter asc",
        }
        payload = self.client.get_entity_set(ENTITY, params)
        return [map_portal_row(row) for row in payload.get("results", [])]

    def list_recent(self, top: int = 100) -> list[ProductionConfirmationPortalRowDto]:
        payload = self.client.get_entity_set(
            ENTITY,
            {"$top": top, "$orderby": "PostingDate desc"},
        )
        return [map_portal_row(row) for row in payload.get("results", [])]

    def load_sample_payload(self) -> dict[str, Any]:
        path = Path(settings.confirmation_sync_sample_path)
        if not path.exists():
            raise FileNotFoundError(f"Sample file not found: {path}")
        return json.loads(path.read_text(encoding="utf-8"))

    def list_from_payload(self, payload: dict[str, Any]) -> list[ProductionConfirmationPortalRowDto]:
        rows = payload.get("confirmations") or payload.get("A_ProdnOrdConf2") or []
        return [map_portal_row(row) for row in rows]


production_confirmation_service = ProductionConfirmationService()
