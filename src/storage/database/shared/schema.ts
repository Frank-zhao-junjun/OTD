import { pgTable, serial, varchar, text, boolean, numeric, integer, timestamp, index, uniqueIndex } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

// System table - DO NOT DELETE
export const healthCheck = pgTable("health_check", {
  id: serial().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});

// ============================================================
// SAP Data Tables - fields strictly match SAP API responses
// Column names use snake_case (Supabase requirement)
// ============================================================

// 1. Sales Order (V4 - CE_SALESORDER_0001)
// SAP fields: SalesOrder, SalesOrderType, SoldToParty, SalesOrganization,
//   DistributionChannel, OrganizationDivision, PurchaseOrderByCustomer,
//   SalesOrderDate, TotalNetAmount, TransactionCurrency, OverallSDProcessStatus
export const salesOrders = pgTable(
  "sales_orders",
  {
    id: serial().primaryKey(),
    sales_order: varchar("sales_order", { length: 10 }).notNull(),
    sales_order_type: varchar("sales_order_type", { length: 4 }),
    sold_to_party: varchar("sold_to_party", { length: 10 }),
    sales_organization: varchar("sales_organization", { length: 4 }),
    distribution_channel: varchar("distribution_channel", { length: 2 }),
    organization_division: varchar("organization_division", { length: 2 }),
    purchase_order_by_customer: varchar("purchase_order_by_customer", { length: 40 }),
    sales_order_date: varchar("sales_order_date", { length: 30 }),
    total_net_amount: numeric("total_net_amount", { precision: 16, scale: 3 }),
    transaction_currency: varchar("transaction_currency", { length: 5 }),
    overall_sd_process_status: varchar("overall_sd_process_status", { length: 4 }),
    synced_at: timestamp("synced_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("sales_orders_unique").on(table.sales_order),
    index("sales_orders_sold_to_party_idx").on(table.sold_to_party),
    index("sales_orders_status_idx").on(table.overall_sd_process_status),
  ]
);

// 2. Production Order (V4 - CE_PRODUCTIONORDER_0001)
// SAP fields: ProductionOrder, IsMarkedForDeletion, IsCompletelyDelivered,
//   ProductionOrderType, Product, ProductionPlant, SalesOrder, SalesOrderItem,
//   OrderScheduledStartDate, OrderScheduledEndDate, OrderActualStartDate,
//   OrderActualEndDate, OrderActualReleaseDate, TechnicalCompletionDate,
//   OrderPlannedTotalQty, ActualDeliveredQuantity
export const productionOrders = pgTable(
  "production_orders",
  {
    id: serial().primaryKey(),
    production_order: varchar("production_order", { length: 12 }).notNull(),
    is_marked_for_deletion: boolean("is_marked_for_deletion").default(false),
    is_completely_delivered: boolean("is_completely_delivered").default(false),
    production_order_type: varchar("production_order_type", { length: 4 }),
    product: varchar("product", { length: 40 }),
    production_plant: varchar("production_plant", { length: 4 }),
    sales_order: varchar("sales_order", { length: 10 }),
    sales_order_item: varchar("sales_order_item", { length: 6 }),
    order_scheduled_start_date: varchar("order_scheduled_start_date", { length: 30 }),
    order_scheduled_end_date: varchar("order_scheduled_end_date", { length: 30 }),
    order_actual_start_date: varchar("order_actual_start_date", { length: 30 }),
    order_actual_end_date: varchar("order_actual_end_date", { length: 30 }),
    order_actual_release_date: varchar("order_actual_release_date", { length: 30 }),
    technical_completion_date: varchar("technical_completion_date", { length: 30 }),
    order_planned_total_qty: numeric("order_planned_total_qty", { precision: 16, scale: 3 }),
    actual_delivered_quantity: numeric("actual_delivered_quantity", { precision: 16, scale: 3 }),
    synced_at: timestamp("synced_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("production_orders_unique").on(table.production_order),
    index("production_orders_product_idx").on(table.product),
    index("production_orders_plant_idx").on(table.production_plant),
  ]
);

// 3. Product (V2 - API_PRODUCT_SRV)
// SAP base fields: Product, ProductType, ProductGroup, BaseUnit, WeightUnit,
//   GrossWeight, NetWeight, IsMarkedForDeletion, CrossPlantStatus,
//   CreatedByUser, CreationDate
// Expand: to_Description (ProductDescription, Language)
//         to_Plant (Plant, MRPType, ProductionInvtryManagedLoc, ProcurementType,
//                  ProfitCenter, AvailabilityCheckType, PurchasingGroup,
//                  CountryOfOrigin, RegionOfOrigin, IsBatchManagementRequired)
//         to_SalesDelivery (ProductSalesOrg, ProductDistributionChnl, ProductSalesStatus,
//                          MinimumOrderQuantity, SalesMeasureUnit, SupplyingPlant)
//         to_Valuation (ValuationArea, ValuationClass, StandardPrice,
//                      MovingAveragePrice, PriceUnitQty, Currency)
export const products = pgTable(
  "products",
  {
    id: serial().primaryKey(),
    product: varchar("product", { length: 40 }).notNull(),
    product_type: varchar("product_type", { length: 4 }),
    product_group: varchar("product_group", { length: 9 }),
    base_unit: varchar("base_unit", { length: 3 }),
    weight_unit: varchar("weight_unit", { length: 3 }),
    gross_weight: numeric("gross_weight", { precision: 16, scale: 3 }),
    net_weight: numeric("net_weight", { precision: 16, scale: 3 }),
    is_marked_for_deletion: boolean("is_marked_for_deletion").default(false),
    cross_plant_status: varchar("cross_plant_status", { length: 2 }),
    created_by_user: varchar("created_by_user", { length: 12 }),
    creation_date: varchar("creation_date", { length: 30 }),
    // to_Description (first entry, typically language 'ZH')
    product_description: text("product_description"),
    language: varchar("language", { length: 2 }),
    // to_Plant (first entry)
    plant: varchar("plant", { length: 4 }),
    mrp_type: varchar("mrp_type", { length: 2 }),
    mrp_responsible: varchar("mrp_responsible", { length: 12 }),
    production_invtry_managed_loc: varchar("production_invtry_managed_loc", { length: 4 }),
    procurement_type: varchar("procurement_type", { length: 1 }),
    profit_center: varchar("profit_center", { length: 20 }),
    availability_check_type: varchar("availability_check_type", { length: 2 }),
    purchasing_group: varchar("purchasing_group", { length: 3 }),
    country_of_origin: varchar("country_of_origin", { length: 3 }),
    region_of_origin: varchar("region_of_origin", { length: 3 }),
    is_batch_management_required: boolean("is_batch_management_required").default(false),
    // to_SalesDelivery (first entry)
    product_sales_org: varchar("product_sales_org", { length: 4 }),
    product_distribution_chnl: varchar("product_distribution_chnl", { length: 2 }),
    product_sales_status: varchar("product_sales_status", { length: 2 }),
    minimum_order_quantity: numeric("minimum_order_quantity", { precision: 16, scale: 3 }),
    sales_measure_unit: varchar("sales_measure_unit", { length: 3 }),
    supplying_plant: varchar("supplying_plant", { length: 4 }),
    // to_Valuation (first entry)
    valuation_area: varchar("valuation_area", { length: 4 }),
    valuation_class: varchar("valuation_class", { length: 4 }),
    standard_price: numeric("standard_price", { precision: 16, scale: 3 }),
    moving_average_price: numeric("moving_average_price", { precision: 16, scale: 3 }),
    price_unit_qty: numeric("price_unit_qty", { precision: 16, scale: 3 }),
    currency: varchar("currency", { length: 5 }),
    synced_at: timestamp("synced_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("products_unique").on(table.product),
    index("products_product_type_idx").on(table.product_type),
    index("products_product_group_idx").on(table.product_group),
  ]
);

// 4. Customer (V2 - API_BUSINESS_PARTNER)
// SAP fields: Customer, CustomerName, CustomerFullName, CustomerAccountGroup,
//   CreationDate, CustomerCorporateGroup, Industry, Supplier
export const customers = pgTable(
  "customers",
  {
    id: serial().primaryKey(),
    customer: varchar("customer", { length: 10 }).notNull(),
    customer_name: varchar("customer_name", { length: 100 }),
    customer_full_name: varchar("customer_full_name", { length: 200 }),
    customer_account_group: varchar("customer_account_group", { length: 4 }),
    creation_date: varchar("creation_date", { length: 30 }),
    customer_corporate_group: varchar("customer_corporate_group", { length: 10 }),
    industry: varchar("industry", { length: 10 }),
    supplier: varchar("supplier", { length: 10 }),
    synced_at: timestamp("synced_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("customers_unique").on(table.customer),
    index("customers_customer_name_idx").on(table.customer_name),
  ]
);

// 5. Material Stock (V2 - API_MATERIAL_STOCK_SRV)
// SAP fields: Material, Plant, StorageLocation, Batch,
//   InventoryStockType, MaterialBaseUnit, MatlWrhsStkQtyInMatlBaseUnit
export const materialStock = pgTable(
  "material_stock",
  {
    id: serial().primaryKey(),
    material: varchar("material", { length: 40 }).notNull(),
    plant: varchar("plant", { length: 4 }).notNull(),
    storage_location: varchar("storage_location", { length: 4 }),
    batch: varchar("batch", { length: 20 }),
    inventory_stock_type: varchar("inventory_stock_type", { length: 4 }),
    material_base_unit: varchar("material_base_unit", { length: 3 }),
    matl_wrhs_stk_qty_in_matl_base_unit: numeric("matl_wrhs_stk_qty_in_matl_base_unit", { precision: 16, scale: 3 }),
    synced_at: timestamp("synced_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("material_stock_unique").on(table.material, table.plant, table.storage_location, table.batch, table.inventory_stock_type),
    index("material_stock_plant_idx").on(table.plant),
    index("material_stock_material_plant_idx").on(table.material, table.plant),
  ]
);

// 6. Outbound Delivery (V2 - API_OUTBOUND_DELIVERY_SRV)
// SAP fields: DeliveryDocument, DeliveryDocumentType, DeliveryDate,
//   ActualGoodsMovementDate, OverallGoodsMovementStatus, OverallSDProcessStatus,
//   SalesOrganization, ShippingPoint, SoldToParty, ShipToParty,
//   SalesOffice, IncotermsClassification
export const outboundDeliveries = pgTable(
  "outbound_deliveries",
  {
    id: serial().primaryKey(),
    delivery_document: varchar("delivery_document", { length: 10 }).notNull(),
    delivery_document_type: varchar("delivery_document_type", { length: 4 }),
    delivery_date: varchar("delivery_date", { length: 30 }),
    actual_goods_movement_date: varchar("actual_goods_movement_date", { length: 30 }),
    overall_goods_movement_status: varchar("overall_goods_movement_status", { length: 4 }),
    overall_sd_process_status: varchar("overall_sd_process_status", { length: 4 }),
    sales_organization: varchar("sales_organization", { length: 4 }),
    shipping_point: varchar("shipping_point", { length: 4 }),
    sold_to_party: varchar("sold_to_party", { length: 10 }),
    ship_to_party: varchar("ship_to_party", { length: 10 }),
    sales_office: varchar("sales_office", { length: 4 }),
    incoterms_classification: varchar("incoterms_classification", { length: 3 }),
    synced_at: timestamp("synced_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("outbound_deliveries_unique").on(table.delivery_document),
    index("outbound_deliveries_sold_to_party_idx").on(table.sold_to_party),
    index("outbound_deliveries_status_idx").on(table.overall_goods_movement_status),
  ]
);

// 7. Billing Document (V2 - API_BILLING_DOCUMENT_SRV)
// SAP fields: BillingDocument, BillingDocumentType, SalesOrganization,
//   DistributionChannel, Division, BillingDocumentDate, TotalNetAmount,
//   TransactionCurrency, CompanyCode, SoldToParty, OverallBillingStatus,
//   AccountingPostingStatus, CreationTime, LastChangeDate
export const billingDocuments = pgTable(
  "billing_documents",
  {
    id: serial().primaryKey(),
    billing_document: varchar("billing_document", { length: 10 }).notNull(),
    billing_document_type: varchar("billing_document_type", { length: 4 }),
    sales_organization: varchar("sales_organization", { length: 4 }),
    distribution_channel: varchar("distribution_channel", { length: 2 }),
    division: varchar("division", { length: 2 }),
    billing_document_date: varchar("billing_document_date", { length: 30 }),
    total_net_amount: numeric("total_net_amount", { precision: 16, scale: 3 }),
    transaction_currency: varchar("transaction_currency", { length: 5 }),
    company_code: varchar("company_code", { length: 4 }),
    sold_to_party: varchar("sold_to_party", { length: 10 }),
    overall_billing_status: varchar("overall_billing_status", { length: 4 }),
    accounting_posting_status: varchar("accounting_posting_status", { length: 4 }),
    creation_time: varchar("creation_time", { length: 30 }),
    last_change_date: varchar("last_change_date", { length: 30 }),
    synced_at: timestamp("synced_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("billing_documents_unique").on(table.billing_document),
    index("billing_documents_sold_to_party_idx").on(table.sold_to_party),
    index("billing_documents_status_idx").on(table.overall_billing_status),
  ]
);

// 8. Material Document (V2 - API_MATERIAL_DOCUMENT_SRV)
// SAP fields: MaterialDocumentYear, MaterialDocument, MaterialDocumentItem,
//   Material, Plant, StorageLocation, Batch, GoodsMovementType,
//   PurchaseOrder, PurchaseOrderItem, ManufacturingOrder, CostCenter,
//   ProfitCenter, MaterialBaseUnit, QuantityInBaseUnit, GoodsRecipientName
export const materialDocuments = pgTable(
  "material_documents",
  {
    id: serial().primaryKey(),
    material_document_year: varchar("material_document_year", { length: 4 }).notNull(),
    material_document: varchar("material_document", { length: 10 }).notNull(),
    material_document_item: varchar("material_document_item", { length: 4 }).notNull(),
    material: varchar("material", { length: 40 }),
    plant: varchar("plant", { length: 4 }),
    storage_location: varchar("storage_location", { length: 4 }),
    batch: varchar("batch", { length: 20 }),
    goods_movement_type: varchar("goods_movement_type", { length: 4 }),
    purchase_order: varchar("purchase_order", { length: 10 }),
    purchase_order_item: varchar("purchase_order_item", { length: 6 }),
    manufacturing_order: varchar("manufacturing_order", { length: 12 }),
    cost_center: varchar("cost_center", { length: 10 }),
    profit_center: varchar("profit_center", { length: 10 }),
    material_base_unit: varchar("material_base_unit", { length: 3 }),
    quantity_in_base_unit: numeric("quantity_in_base_unit", { precision: 16, scale: 3 }),
    goods_recipient_name: varchar("goods_recipient_name", { length: 12 }),
    synced_at: timestamp("synced_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("material_documents_unique").on(table.material_document_year, table.material_document, table.material_document_item),
    index("material_documents_material_idx").on(table.material),
    index("material_documents_plant_idx").on(table.plant),
    index("material_documents_movement_type_idx").on(table.goods_movement_type),
  ]
);
