"""FastAPI routes for SAP Production Order API (CE_PRODUCTIONORDER_0001).

Exposes endpoints for:
  - Production Order Header: CRUD + lifecycle actions
  - Production Order Items: CRUD
  - Production Order Sequences: CRUD
  - Production Order Operations: CRUD + actions
  - Production Order Components: Read
  - Operation Capacities: Read
  - Posting Rules: CRUD
  - Serial Numbers: Read + Generate
  - Variant Configuration: Read + SetAssignedValues
"""

from typing import Any

from fastapi import APIRouter, HTTPException, Query

from app.sap.client import SapApiError
from app.sap.production_order_client import production_order_client
from app.schemas.production_orders import (
    PostingRuleCreate,
    PostingRuleUpdate,
    ProductionOrderCreate,
    ProductionOrderItemCreate,
    ProductionOrderItemUpdate,
    ProductionOrderOperationCreate,
    ProductionOrderOperationUpdate,
    ProductionOrderSequenceCreate,
    ProductionOrderSequenceUpdate,
    ProductionOrderUpdate,
)
from app.services.production_orders import production_order_service

router = APIRouter(prefix="/api/production-orders", tags=["Production Orders"])


# ---------------------------------------------------------------------------
#  Helpers
# ---------------------------------------------------------------------------

def _handle_sap_error(e: SapApiError) -> HTTPException:
    return HTTPException(
        status_code=e.status_code or 502,
        detail={"message": str(e), "sap_body": e.sap_body},
    )


def _build_params(
    filter: str | None = None,
    top: int | None = None,
    skip: int | None = None,
    orderby: str | None = None,
    select: str | None = None,
    expand: str | None = None,
    count: bool = False,
) -> dict[str, Any]:
    params: dict[str, Any] = {}
    if filter:
        params["$filter"] = filter
    if top:
        params["$top"] = str(top)
    if skip:
        params["$skip"] = str(skip)
    if orderby:
        params["$orderby"] = orderby
    if select:
        params["$select"] = select
    if expand:
        params["$expand"] = expand
    if count:
        params["$count"] = "true"
    return params


# ---------------------------------------------------------------------------
#  Production Order Header
# ---------------------------------------------------------------------------

@router.get("/")
def list_orders(
    filter: str | None = Query(None, description="OData $filter expression"),
    top: int | None = Query(None, ge=1, le=500),
    skip: int | None = Query(None, ge=0),
    orderby: str | None = Query(None, description="OData $orderby expression"),
    select: str | None = Query(None, description="OData $select fields"),
    expand: str | None = Query(None, description="OData $expand (e.g. _Operation,_Component)"),
    count: bool = Query(False, description="Include $count=true"),
):
    """List production orders with optional OData filtering, sorting, and expansion."""
    params = _build_params(filter, top, skip, orderby, select, expand, count)
    try:
        orders = production_order_client.list_orders(params)
        return {"success": True, "data": orders, "count": len(orders)}
    except SapApiError as e:
        raise _handle_sap_error(e)


@router.get("/by-material/{material}")
def find_orders_by_material(
    material: str,
    top: int | None = Query(None, ge=1, le=500),
    skip: int | None = Query(None, ge=0),
    orderby: str | None = Query(None, description="OData $orderby expression"),
    select: str | None = Query(None, description="OData $select fields"),
    expand: str | None = Query(None, description="OData $expand (e.g. _Operation,_Component)"),
    count: bool = Query(False, description="Include $count=true"),
    plant: str | None = Query(None, description="Optional ProductionPlant filter (e.g. 1010)"),
):
    """Find production orders by material (product) number.

    Uses OData $filter: Product eq '{material}' [and ProductionPlant eq '{plant}']
    """
    params = _build_params(None, top, skip, orderby, select, expand, count)
    try:
        orders = production_order_client.find_by_material(material, params, plant=plant)
        return {"success": True, "data": orders, "count": len(orders), "material": material}
    except SapApiError as e:
        raise _handle_sap_error(e)


@router.get("/by-material/{material}/numbers")
def list_order_numbers_by_material(
    material: str,
    plant: str | None = Query(None, description="ProductionPlant filter (e.g. 1010)"),
    top: int = Query(50, ge=1, le=500),
):
    """Return production order numbers for a material/product (requirement #1)."""
    try:
        numbers = production_order_service.find_order_numbers_by_material(
            material,
            plant=plant,
            top=top,
        )
        return {
            "success": True,
            "material": material,
            "productionOrderNumbers": numbers,
            "count": len(numbers),
        }
    except SapApiError as e:
        raise _handle_sap_error(e)


@router.get("/summary", response_model=dict)
def list_production_order_summary(
    plant: str | None = Query(None, description="ProductionPlant filter (default from config)"),
    material: str | None = Query(None, description="Optional Product / material number filter"),
    top: int = Query(50, ge=1, le=500),
):
    """Portal list with mapped dates including orderConfirmedEndDate and technicalCompletionDate."""
    try:
        rows = production_order_service.list_summary(plant=plant, material=material, top=top)
        return {
            "success": True,
            "data": [row.model_dump() for row in rows],
            "count": len(rows),
        }
    except SapApiError as e:
        raise _handle_sap_error(e)


@router.get("/{order_id}/detail")
def get_production_order_detail(order_id: str):
    """Portal detail: dates, quantities, GR totals, TECO, confirmation, status (requirement #2)."""
    try:
        detail = production_order_service.get_detail(order_id)
        if detail is None:
            raise HTTPException(status_code=404, detail=f"Production order {order_id} not found")
        return {"success": True, "data": detail.model_dump()}
    except SapApiError as e:
        raise _handle_sap_error(e)


@router.get("/{order_id}")
def get_order(
    order_id: str,
    select: str | None = Query(None),
    expand: str | None = Query(None),
):
    """Get a single production order by its ID."""
    params: dict[str, Any] = {}
    if select:
        params["$select"] = select
    if expand:
        params["$expand"] = expand

    try:
        order = production_order_client.get_order(order_id, params)
        if not order:
            raise HTTPException(status_code=404, detail=f"Production order {order_id} not found")
        return {"success": True, "data": order}
    except SapApiError as e:
        raise _handle_sap_error(e)


@router.post("/", status_code=201)
def create_order(body: ProductionOrderCreate):
    """Create a new production order."""
    try:
        result = production_order_client.create_order(body.model_dump(exclude_none=True, by_alias=True))
        return {"success": True, "data": result}
    except SapApiError as e:
        raise _handle_sap_error(e)


@router.patch("/{order_id}")
def update_order(order_id: str, body: ProductionOrderUpdate):
    """Update an existing production order."""
    try:
        production_order_client.update_order(order_id, body.model_dump(exclude_none=True, by_alias=True))
        return {"success": True, "message": f"Production order {order_id} updated"}
    except SapApiError as e:
        raise _handle_sap_error(e)


# ---------------------------------------------------------------------------
#  Production Order Actions
# ---------------------------------------------------------------------------

@router.post("/{order_id}/release")
def release_order(order_id: str, dispatch_missing_parts: bool = Query(False)):
    """Release a production order."""
    try:
        result = production_order_client.release_order(order_id, dispatch_missing_parts=dispatch_missing_parts)
        return {"success": True, "data": result}
    except SapApiError as e:
        raise _handle_sap_error(e)


@router.post("/{order_id}/schedule")
def schedule_order(order_id: str):
    """Schedule a production order."""
    try:
        result = production_order_client.schedule_order(order_id)
        return {"success": True, "data": result}
    except SapApiError as e:
        raise _handle_sap_error(e)


@router.post("/{order_id}/complete-technically")
def complete_technically(order_id: str):
    """Technically complete a production order."""
    try:
        result = production_order_client.technically_complete(order_id)
        return {"success": True, "data": result}
    except SapApiError as e:
        raise _handle_sap_error(e)


@router.post("/{order_id}/revoke-technical-completion")
def revoke_technical_completion(order_id: str):
    """Revoke technical completion of a production order."""
    try:
        result = production_order_client.revoke_technical_completion(order_id)
        return {"success": True, "data": result}
    except SapApiError as e:
        raise _handle_sap_error(e)


@router.post("/{order_id}/close")
def close_order(order_id: str):
    """Close a production order."""
    try:
        result = production_order_client.close_order(order_id)
        return {"success": True, "data": result}
    except SapApiError as e:
        raise _handle_sap_error(e)


@router.post("/{order_id}/revoke-close")
def revoke_close(order_id: str):
    """Revoke closing of a production order."""
    try:
        result = production_order_client.revoke_close(order_id)
        return {"success": True, "data": result}
    except SapApiError as e:
        raise _handle_sap_error(e)


@router.post("/{order_id}/lock")
def lock_order(order_id: str):
    """Lock a production order."""
    try:
        result = production_order_client.lock_order(order_id)
        return {"success": True, "data": result}
    except SapApiError as e:
        raise _handle_sap_error(e)


@router.post("/{order_id}/unlock")
def unlock_order(order_id: str):
    """Unlock a production order."""
    try:
        result = production_order_client.unlock_order(order_id)
        return {"success": True, "data": result}
    except SapApiError as e:
        raise _handle_sap_error(e)


@router.post("/{order_id}/cost")
def cost_order(order_id: str):
    """Cost a production order."""
    try:
        result = production_order_client.cost_order(order_id)
        return {"success": True, "data": result}
    except SapApiError as e:
        raise _handle_sap_error(e)


@router.post("/{order_id}/print")
def print_order(order_id: str):
    """Print a production order."""
    try:
        result = production_order_client.print_order(order_id)
        return {"success": True, "data": result}
    except SapApiError as e:
        raise _handle_sap_error(e)


@router.post("/{order_id}/set-deletion-flag")
def set_deletion_flag(order_id: str):
    """Set the deletion flag on a production order."""
    try:
        result = production_order_client.set_deletion_flag(order_id)
        return {"success": True, "data": result}
    except SapApiError as e:
        raise _handle_sap_error(e)


@router.post("/{order_id}/remove-deletion-flag")
def remove_deletion_flag(order_id: str):
    """Remove the deletion flag from a production order."""
    try:
        result = production_order_client.remove_deletion_flag(order_id)
        return {"success": True, "data": result}
    except SapApiError as e:
        raise _handle_sap_error(e)


@router.post("/{order_id}/check-material-availability")
def check_material_availability(order_id: str):
    """Check material availability for a production order."""
    try:
        result = production_order_client.check_material_availability(order_id)
        return {"success": True, "data": result}
    except SapApiError as e:
        raise _handle_sap_error(e)


@router.get("/{order_id}/missing-parts")
def get_missing_parts(order_id: str):
    """Get missing parts for a production order."""
    try:
        result = production_order_client.get_missing_parts(order_id)
        return {"success": True, "data": result, "count": len(result)}
    except SapApiError as e:
        raise _handle_sap_error(e)


@router.post("/{order_id}/reexplode-master-data")
def reexplode_master_data(order_id: str, production_version: str | None = Query(None)):
    """Reexplode master data (BOM & Routing) for a production order."""
    try:
        result = production_order_client.reexplode_master_data(order_id, production_version)
        return {"success": True, "data": result}
    except SapApiError as e:
        raise _handle_sap_error(e)


@router.post("/{order_id}/execute-material-staging")
def execute_material_staging(order_id: str):
    """Execute material staging for a production order."""
    try:
        result = production_order_client.execute_material_staging(order_id)
        return {"success": True, "data": result}
    except SapApiError as e:
        raise _handle_sap_error(e)


# ---------------------------------------------------------------------------
#  Production Order Items
# ---------------------------------------------------------------------------

@router.get("/{order_id}/items")
def list_items(
    order_id: str,
    filter: str | None = Query(None),
    top: int | None = Query(None),
    skip: int | None = Query(None),
    select: str | None = Query(None),
    expand: str | None = Query(None),
):
    """List items of a production order."""
    params = _build_params(filter, top, skip, None, select, expand)

    try:
        items = production_order_client.list_items(order_id, params)
        return {"success": True, "data": items, "count": len(items)}
    except SapApiError as e:
        raise _handle_sap_error(e)


@router.get("/{order_id}/items/{item_id}")
def get_item(order_id: str, item_id: str):
    """Get a specific production order item."""
    try:
        item = production_order_client.get_item(order_id, item_id)
        if not item:
            raise HTTPException(status_code=404, detail=f"Item {item_id} not found on order {order_id}")
        return {"success": True, "data": item}
    except SapApiError as e:
        raise _handle_sap_error(e)


@router.post("/{order_id}/items", status_code=201)
def create_item(order_id: str, body: ProductionOrderItemCreate):
    """Add a new item to a production order."""
    try:
        result = production_order_client.create_item(order_id, body.model_dump(exclude_none=True, by_alias=True))
        return {"success": True, "data": result}
    except SapApiError as e:
        raise _handle_sap_error(e)


@router.patch("/{order_id}/items/{item_id}")
def update_item(order_id: str, item_id: str, body: ProductionOrderItemUpdate):
    """Update a production order item."""
    try:
        production_order_client.update_item(order_id, item_id, body.model_dump(exclude_none=True, by_alias=True))
        return {"success": True, "message": f"Item {item_id} on order {order_id} updated"}
    except SapApiError as e:
        raise _handle_sap_error(e)


@router.delete("/{order_id}/items/{item_id}")
def delete_item(order_id: str, item_id: str):
    """Delete a production order item."""
    try:
        production_order_client.delete_item(order_id, item_id)
        return {"success": True, "message": f"Item {item_id} on order {order_id} deleted"}
    except SapApiError as e:
        raise _handle_sap_error(e)


# ---------------------------------------------------------------------------
#  Production Order Sequences
# ---------------------------------------------------------------------------

@router.get("/{order_id}/sequences")
def list_sequences(
    order_id: str,
    filter: str | None = Query(None),
    top: int | None = Query(None),
    select: str | None = Query(None),
    expand: str | None = Query(None),
):
    """List sequences of a production order."""
    params = _build_params(filter, top, None, None, select, expand)

    try:
        sequences = production_order_client.list_sequences(order_id, params)
        return {"success": True, "data": sequences, "count": len(sequences)}
    except SapApiError as e:
        raise _handle_sap_error(e)


@router.get("/{order_id}/sequences/{sequence}")
def get_sequence(order_id: str, sequence: str):
    """Get a specific production order sequence."""
    try:
        seq = production_order_client.get_sequence(order_id, sequence)
        if not seq:
            raise HTTPException(status_code=404, detail=f"Sequence {sequence} not found on order {order_id}")
        return {"success": True, "data": seq}
    except SapApiError as e:
        raise _handle_sap_error(e)


@router.post("/{order_id}/sequences", status_code=201)
def create_sequence(order_id: str, body: ProductionOrderSequenceCreate):
    """Add a new sequence to a production order."""
    try:
        result = production_order_client.create_sequence(order_id, body.model_dump(exclude_none=True, by_alias=True))
        return {"success": True, "data": result}
    except SapApiError as e:
        raise _handle_sap_error(e)


@router.patch("/{order_id}/sequences/{sequence}")
def update_sequence(order_id: str, sequence: str, body: ProductionOrderSequenceUpdate):
    """Update a production order sequence."""
    try:
        production_order_client.update_sequence(order_id, sequence, body.model_dump(exclude_none=True, by_alias=True))
        return {"success": True, "message": f"Sequence {sequence} on order {order_id} updated"}
    except SapApiError as e:
        raise _handle_sap_error(e)


@router.delete("/{order_id}/sequences/{sequence}")
def delete_sequence(order_id: str, sequence: str):
    """Delete a production order sequence."""
    try:
        production_order_client.delete_sequence(order_id, sequence)
        return {"success": True, "message": f"Sequence {sequence} on order {order_id} deleted"}
    except SapApiError as e:
        raise _handle_sap_error(e)


# ---------------------------------------------------------------------------
#  Production Order Operations
# ---------------------------------------------------------------------------

@router.get("/{order_id}/operations")
def list_operations(
    order_id: str,
    filter: str | None = Query(None),
    top: int | None = Query(None),
    skip: int | None = Query(None),
    select: str | None = Query(None),
    expand: str | None = Query(None),
):
    """List operations of a production order."""
    params = _build_params(filter, top, skip, None, select, expand)

    try:
        operations = production_order_client.list_operations(order_id, params)
        return {"success": True, "data": operations, "count": len(operations)}
    except SapApiError as e:
        raise _handle_sap_error(e)


@router.get("/{order_id}/operations/{op_internal_id}")
def get_operation(order_id: str, op_internal_id: str):
    """Get a specific production order operation by its internal ID."""
    try:
        op = production_order_client.get_operation(order_id, op_internal_id)
        if not op:
            raise HTTPException(status_code=404, detail=f"Operation {op_internal_id} not found on order {order_id}")
        return {"success": True, "data": op}
    except SapApiError as e:
        raise _handle_sap_error(e)


@router.post("/{order_id}/operations", status_code=201)
def create_operation(order_id: str, body: ProductionOrderOperationCreate):
    """Add a new operation to a production order."""
    try:
        result = production_order_client.create_operation(order_id, body.model_dump(exclude_none=True, by_alias=True))
        return {"success": True, "data": result}
    except SapApiError as e:
        raise _handle_sap_error(e)


@router.patch("/{order_id}/operations/{op_internal_id}")
def update_operation(order_id: str, op_internal_id: str, body: ProductionOrderOperationUpdate):
    """Update a production order operation."""
    try:
        production_order_client.update_operation(
            order_id, op_internal_id, body.model_dump(exclude_none=True, by_alias=True)
        )
        return {"success": True, "message": f"Operation {op_internal_id} on order {order_id} updated"}
    except SapApiError as e:
        raise _handle_sap_error(e)


# --- Operation Actions ---

@router.post("/{order_id}/operations/{op_internal_id}/release")
def release_operation(order_id: str, op_internal_id: str):
    """Release a production order operation."""
    try:
        result = production_order_client.release_operation(order_id, op_internal_id)
        return {"success": True, "data": result}
    except SapApiError as e:
        raise _handle_sap_error(e)


@router.post("/{order_id}/operations/{op_internal_id}/dispatch")
def dispatch_operation(order_id: str, op_internal_id: str):
    """Dispatch a production order operation."""
    try:
        result = production_order_client.dispatch_operation(order_id, op_internal_id)
        return {"success": True, "data": result}
    except SapApiError as e:
        raise _handle_sap_error(e)


@router.post("/{order_id}/operations/{op_internal_id}/deallocate")
def deallocate_operation(order_id: str, op_internal_id: str):
    """Deallocate a production order operation."""
    try:
        result = production_order_client.deallocate_operation(order_id, op_internal_id)
        return {"success": True, "data": result}
    except SapApiError as e:
        raise _handle_sap_error(e)


@router.post("/{order_id}/operations/{op_internal_id}/set-dates")
def set_operation_dates(order_id: str, op_internal_id: str, body: dict[str, Any]):
    """Set dates for a production order operation."""
    try:
        result = production_order_client.set_operation_dates(order_id, op_internal_id, body)
        return {"success": True, "data": result}
    except SapApiError as e:
        raise _handle_sap_error(e)


@router.post("/{order_id}/operations/{op_internal_id}/unfix-dates")
def unfix_operation_dates(order_id: str, op_internal_id: str):
    """Unfix dates for a production order operation."""
    try:
        result = production_order_client.unfix_operation_dates(order_id, op_internal_id)
        return {"success": True, "data": result}
    except SapApiError as e:
        raise _handle_sap_error(e)


@router.post("/{order_id}/operations/{op_internal_id}/delete")
def delete_operation_action(order_id: str, op_internal_id: str):
    """Delete a production order operation (via action)."""
    try:
        result = production_order_client.delete_operation(order_id, op_internal_id)
        return {"success": True, "data": result}
    except SapApiError as e:
        raise _handle_sap_error(e)


# ---------------------------------------------------------------------------
#  Production Order Components
# ---------------------------------------------------------------------------

@router.get("/{order_id}/components")
def list_components(
    order_id: str,
    filter: str | None = Query(None),
    top: int | None = Query(None),
    select: str | None = Query(None),
    expand: str | None = Query(None),
):
    """List components (BOM materials) of a production order."""
    params = _build_params(filter, top, None, None, select, expand)

    try:
        components = production_order_client.list_components(order_id, params)
        return {"success": True, "data": components, "count": len(components)}
    except SapApiError as e:
        raise _handle_sap_error(e)


@router.get("/{order_id}/components/{reservation}/{reservation_item}")
def get_component(order_id: str, reservation: str, reservation_item: str):
    """Get a specific component by reservation and reservation item."""
    try:
        comp = production_order_client.get_component(order_id, reservation, reservation_item)
        if not comp:
            raise HTTPException(
                status_code=404,
                detail=f"Component {reservation}/{reservation_item} not found on order {order_id}",
            )
        return {"success": True, "data": comp}
    except SapApiError as e:
        raise _handle_sap_error(e)


# ---------------------------------------------------------------------------
#  Operation Capacities
# ---------------------------------------------------------------------------

@router.get("/{order_id}/capacities")
def list_operation_capacities(
    order_id: str,
    filter: str | None = Query(None),
    top: int | None = Query(None),
    select: str | None = Query(None),
    expand: str | None = Query(None),
):
    """List operation capacity requirements of a production order."""
    params = _build_params(filter, top, None, None, select, expand)

    try:
        capacities = production_order_client.list_operation_capacities(order_id, params)
        return {"success": True, "data": capacities, "count": len(capacities)}
    except SapApiError as e:
        raise _handle_sap_error(e)


# ---------------------------------------------------------------------------
#  Posting Rules
# ---------------------------------------------------------------------------

@router.post("/{order_id}/posting-rules", status_code=201)
def create_posting_rule(order_id: str, body: PostingRuleCreate):
    """Add a new event-based posting rule to a production order."""
    try:
        result = production_order_client.create_posting_rule(order_id, body.model_dump(exclude_none=True, by_alias=True))
        return {"success": True, "data": result}
    except SapApiError as e:
        raise _handle_sap_error(e)


@router.patch("/posting-rules/{uuid}")
def update_posting_rule(uuid: str, body: PostingRuleUpdate):
    """Update a posting rule by its UUID."""
    try:
        production_order_client.update_posting_rule(uuid, body.model_dump(exclude_none=True, by_alias=True))
        return {"success": True, "message": f"Posting rule {uuid} updated"}
    except SapApiError as e:
        raise _handle_sap_error(e)


@router.delete("/posting-rules/{uuid}")
def delete_posting_rule(uuid: str):
    """Delete a posting rule by its UUID."""
    try:
        production_order_client.delete_posting_rule(uuid)
        return {"success": True, "message": f"Posting rule {uuid} deleted"}
    except SapApiError as e:
        raise _handle_sap_error(e)


# ---------------------------------------------------------------------------
#  Serial Numbers
# ---------------------------------------------------------------------------

@router.get("/{order_id}/serial-numbers")
def list_serial_numbers(
    order_id: str,
    filter: str | None = Query(None),
    top: int | None = Query(None),
    select: str | None = Query(None),
    expand: str | None = Query(None),
):
    """List serial numbers assigned to a production order."""
    params = _build_params(filter, top, None, None, select, expand)

    try:
        serials = production_order_client.list_serial_numbers(order_id, params)
        return {"success": True, "data": serials, "count": len(serials)}
    except SapApiError as e:
        raise _handle_sap_error(e)


@router.post("/{order_id}/items/{item_id}/generate-serial-numbers")
def generate_serial_numbers(order_id: str, item_id: str):
    """Generate serial numbers for a production order item."""
    try:
        result = production_order_client.generate_serial_numbers(order_id, item_id)
        return {"success": True, "data": result}
    except SapApiError as e:
        raise _handle_sap_error(e)


# ---------------------------------------------------------------------------
#  Variant Configuration
# ---------------------------------------------------------------------------

@router.get("/{order_id}/variant-configuration")
def get_variant_configuration(order_id: str):
    """Get variant configuration of a production order."""
    try:
        config = production_order_client.get_variant_configuration(order_id)
        if not config:
            raise HTTPException(status_code=404, detail=f"Variant configuration not found for order {order_id}")
        return {"success": True, "data": config}
    except SapApiError as e:
        raise _handle_sap_error(e)


@router.post("/{order_id}/variant-configuration/set-assigned-values")
def set_assigned_values(order_id: str, body: dict[str, Any]):
    """Set assigned values for variant configuration."""
    try:
        production_order_client.set_assigned_values(order_id, body)
        return {"success": True, "message": f"Assigned values set for order {order_id}"}
    except SapApiError as e:
        raise _handle_sap_error(e)
