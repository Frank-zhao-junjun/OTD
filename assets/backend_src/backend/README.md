# SAP ERP Portal Backend

Unified REST API that wraps SAP OData services for the PC portal demo.

## Setup

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
```

Edit `.env` and set `SAP_PASSWORD`.

## Run

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8080 --reload
```

Local SQLite database is created automatically at `backend/data/portal.db`.

## Customer APIs

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/customers/all/full` | All customers with full SAP fields + relations |
| GET | `/api/v1/customers` | Customer list with PRD default filters |
| GET | `/api/v1/customers/{customerCode}` | Customer detail |
| GET | `/api/v1/customers/{customerCode}/addresses` | Customer addresses |

## Material Registry APIs

Portal-local table `portal_material` — incrementally maintained from sales order line items (dedupe by material code). Used as material scope for future inventory queries.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/materials` | Material list (`materialCode`, `materialName`, `plant` filters) |
| GET | `/api/v1/materials/{materialCode}` | Material detail |
| POST | `/api/v1/materials/sync-from-order-items` | Upsert from SO line items |
| POST | `/api/v1/materials/sync-from-sales-orders` | Upsert from orders with expanded `_Item` |

Seed demo data:

```bash
python seed_materials_demo.py
python test_materials.py
```

Example sync:

```bash
curl -X POST "http://localhost:8080/api/v1/materials/sync-from-order-items" ^
  -H "Content-Type: application/json" ^
  -d "{\"items\":[{\"salesOrder\":\"SO-001\",\"salesOrderItem\":\"10\",\"product\":\"FG41\",\"salesOrderItemText\":\"智能网关终端\",\"requestedQuantityUnit\":\"PC\",\"plant\":\"1010\"}]}"
```

## Sales Order APIs

Wraps **CE_SALESORDER_0001** (OData V4). Sync endpoints automatically upsert `portal_material` from line items.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/sales-orders` | List sales orders (default OR + 1010/10/00) |
| GET | `/api/v1/sales-orders/{salesOrder}` | Order detail with items |
| GET | `/api/v1/sales-orders/portal-lines` | Flattened portal list (header + items) |
| GET | `/api/v1/sales-orders/portal-lines/from-sample` | Portal list from bundled sample |
| GET | `/api/v1/sales-orders/portal-lines/{salesOrder}` | Portal detail with line items |
| POST | `/api/v1/sales-orders/sync` | Pull from SAP + auto material sync |
| POST | `/api/v1/sales-orders/sync-from-payload` | Sync from JSON body (offline) |
| POST | `/api/v1/sales-orders/sync-from-sample` | Sync from bundled sample file |

```bash
python test_sales_order_sync.py
curl -X POST "http://localhost:8080/api/v1/sales-orders/sync-from-sample"
curl -X POST "http://localhost:8080/api/v1/sales-orders/sync?syncMaterials=true"
```

> Live SAP sync requires `API_SALESORDER` authorization on the communication user.

## Outbound Delivery APIs

Wraps **API_OUTBOUND_DELIVERY_SRV** (OData V2, SAP_COM_0106). Portal summary returns PGI-completed delivery lines only. **Material document fields** are enriched via **API_MATERIAL_DOCUMENT_SRV** (movement type 601, delivery reference).

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/outbound-deliveries/summary` | Portal delivery list (PGI posted) |
| GET | `/api/v1/outbound-deliveries` | Posted delivery item list |
| GET | `/api/v1/outbound-deliveries/{deliveryDocument}/items/{item}` | Single delivery item |
| POST | `/api/v1/outbound-deliveries/sync-from-sample` | Offline sample payload |

```bash
python test_outbound_deliveries.py
curl "http://localhost:8080/api/v1/outbound-deliveries/summary?plant=1010&top=100"
curl -X POST "http://localhost:8080/api/v1/outbound-deliveries/sync-from-sample"
```

> Live SAP reads require `API_OUTBOUND_DELIVERY_SRV` authorization (SAP_COM_0106).

## Billing Document APIs

Wraps **API_BILLING_DOCUMENT_SRV** (OData V2, SAP_COM_0120). Portal summary joins billing items with header sold-to party.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/billing-documents/summary` | Portal billing list |
| POST | `/api/v1/billing-documents/sync-from-sample` | Offline sample payload |

```bash
curl "http://localhost:8080/api/v1/billing-documents/summary?top=100"
curl -X POST "http://localhost:8080/api/v1/billing-documents/sync-from-sample"
```

## Material Document APIs

Wraps **API_MATERIAL_DOCUMENT_SRV** (OData V2, SAP_COM_0108). Supports filter by delivery, production order, material, movement type.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/material-documents` | Material document item list |
| POST | `/api/v1/material-documents/sync-from-sample` | Offline sample payload |

```bash
curl "http://localhost:8080/api/v1/material-documents?deliveryDocument=80001234"
curl -X POST "http://localhost:8080/api/v1/material-documents/sync-from-sample"
```

## Production Confirmation APIs

Wraps **API_PROD_ORDER_CONFIRMATION_2_SRV** (OData V2, SAP_COM_0522).

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/production-confirmations/by-order/{productionOrder}` | Confirmations for one order |
| GET | `/api/v1/production-confirmations/recent` | Recent confirmations |
| POST | `/api/v1/production-confirmations/sync-from-sample` | Offline sample payload |

## Product Master APIs

Wraps **API_PRODUCT_SRV** (OData V2, SAP_COM_0009).

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/products` | Product list (`product`, `productGroup` filters) |
| GET | `/api/v1/products/{product}` | Single product with description expand |

```bash
curl "http://localhost:8080/api/v1/products?productGroup=L004&top=20"
```

## Material Stock APIs

Wraps **API_MATERIAL_STOCK_SRV** (OData V2, SAP_COM_0164). Queries `A_MatlStkInAcctMod` for warehouse quantities.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/material-stock` | Stock lines (`material`, `plant`, `storageLocation`) |
| GET | `/api/v1/material-stock/{material}` | All stock lines for one material |
| GET | `/api/v1/material-stock/summary?material=` | Aggregated by plant/storage + stock type |
| GET | `/api/v1/material-stock/portal-summary` | Batch query for `portal_material` (inventory cards) |
| POST | `/api/v1/material-stock/sync-from-portal-materials` | Same as portal-summary with sync stats |

```bash
python test_material_stock.py
curl "http://localhost:8080/api/v1/material-stock?material=FG10&plant=1010"
curl "http://localhost:8080/api/v1/material-stock/portal-summary"
```

Default query params for customers follow PRD scope:

- `companyCode=1010`
- `salesOrganization=1010`
- `distributionChannel=10`
- `division=00`

Example:

```bash
curl "http://localhost:8080/api/v1/customers?page=1&pageSize=20"
curl "http://localhost:8080/api/v1/materials?page=1&pageSize=50"
```
