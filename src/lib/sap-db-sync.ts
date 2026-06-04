/**
 * SAP-to-Database field mapping and sync service
 * Converts between SAP PascalCase field names and DB snake_case column names
 */

// ============================================================
// Field Mapping: SAP PascalCase <-> DB snake_case
// ============================================================

/** Convert SAP PascalCase/camelCase to snake_case */
export function toSnakeCase(str: string): string {
  // Handle special SAP abbreviations first
  const specials: Record<string, string> = {
    'MatlWrhsStkQtyInMatlBaseUnit': 'matl_wrhs_stk_qty_in_matl_base_unit',
    'SD': 'sd',
    'Qty': 'qty',
    'Invtry': 'invtry',
    'Chnl': 'chnl',
    'Wrhs': 'wrhs',
    'Matl': 'matl',
  };

  if (specials[str]) return specials[str];

  return str
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .toLowerCase();
}

/** Convert DB snake_case back to SAP PascalCase */
export function toPascalCase(str: string): string {
  const specials: Record<string, string> = {
    'matl_wrhs_stk_qty_in_matl_base_unit': 'MatlWrhsStkQtyInMatlBaseUnit',
    'overall_sd_process_status': 'OverallSDProcessStatus',
  };

  if (specials[str]) return specials[str];

  return str
    .split('_')
    .map(word => {
      // Special abbreviations that should stay uppercase
      const upperWords = ['sd', 'mrp', 'qty', 'chnl'];
      if (upperWords.includes(word.toLowerCase())) {
        return word.toUpperCase();
      }
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join('');
}

// ============================================================
// Per-module field definitions (SAP PascalCase fields, excluding synced_at and id)
// ============================================================

export const SAP_TABLE_FIELDS: Record<string, { dbTable: string; keyFields: string[]; sapFields: string[] }> = {
  'CE_SALESORDER_0001:SalesOrder': {
    dbTable: 'sales_orders',
    keyFields: ['sales_order'],
    sapFields: [
      'SalesOrder', 'SalesOrderType', 'SoldToParty', 'SalesOrganization',
      'DistributionChannel', 'OrganizationDivision', 'PurchaseOrderByCustomer',
      'SalesOrderDate', 'TotalNetAmount', 'TransactionCurrency', 'OverallSDProcessStatus',
    ],
  },
  'CE_PRODUCTIONORDER_0001:ProductionOrder': {
    dbTable: 'production_orders',
    keyFields: ['production_order'],
    sapFields: [
      'ProductionOrder', 'IsMarkedForDeletion', 'IsCompletelyDelivered',
      'ProductionOrderType', 'Product', 'ProductionPlant', 'SalesOrder', 'SalesOrderItem',
      'OrderScheduledStartDate', 'OrderScheduledEndDate', 'OrderActualStartDate',
      'OrderActualEndDate', 'OrderActualReleaseDate', 'TechnicalCompletionDate',
      'OrderPlannedTotalQty', 'ActualDeliveredQuantity',
    ],
  },
  'API_PRODUCT_SRV:A_Product': {
    dbTable: 'products',
    keyFields: ['product'],
    sapFields: [
      // Base fields
      'Product', 'ProductType', 'ProductGroup', 'BaseUnit', 'WeightUnit',
      'GrossWeight', 'NetWeight', 'IsMarkedForDeletion', 'CrossPlantStatus',
      'CreatedByUser', 'CreationDate',
      // Flattened expand fields
      'ProductDescription', 'Language',
      'Plant', 'MRPType', 'MRPResponsible', 'ProductionInvtryManagedLoc', 'ProcurementType',
      'ProfitCenter', 'AvailabilityCheckType', 'PurchasingGroup',
      'CountryOfOrigin', 'RegionOfOrigin', 'IsBatchManagementRequired',
      'ProductSalesOrg', 'ProductDistributionChnl', 'ProductSalesStatus',
      'MinimumOrderQuantity', 'SalesMeasureUnit', 'SupplyingPlant',
      'ValuationArea', 'ValuationClass', 'StandardPrice', 'MovingAveragePrice',
      'PriceUnitQty', 'Currency',
    ],
  },
  'API_BUSINESS_PARTNER:A_Customer': {
    dbTable: 'customers',
    keyFields: ['customer'],
    sapFields: [
      'Customer', 'CustomerName', 'CustomerFullName', 'CustomerAccountGroup',
      'CreationDate', 'CustomerCorporateGroup', 'Industry', 'Supplier',
    ],
  },
  'API_MATERIAL_STOCK_SRV:A_MatlStkInAcctMod': {
    dbTable: 'material_stock',
    keyFields: ['material', 'plant', 'storage_location', 'batch', 'inventory_stock_type'],
    sapFields: [
      'Material', 'Plant', 'StorageLocation', 'Batch',
      'InventoryStockType', 'MaterialBaseUnit', 'MatlWrhsStkQtyInMatlBaseUnit',
    ],
  },
  'API_OUTBOUND_DELIVERY_SRV:A_OutbDeliveryHeader': {
    dbTable: 'outbound_deliveries',
    keyFields: ['delivery_document'],
    sapFields: [
      'DeliveryDocument', 'DeliveryDocumentType', 'DeliveryDate',
      'ActualGoodsMovementDate', 'OverallGoodsMovementStatus', 'OverallSDProcessStatus',
      'SalesOrganization', 'ShippingPoint', 'SoldToParty', 'ShipToParty',
      'SalesOffice', 'IncotermsClassification',
    ],
  },
  'API_BILLING_DOCUMENT_SRV:A_BillingDocument': {
    dbTable: 'billing_documents',
    keyFields: ['billing_document'],
    sapFields: [
      'BillingDocument', 'BillingDocumentType', 'SalesOrganization',
      'DistributionChannel', 'Division', 'BillingDocumentDate', 'TotalNetAmount',
      'TransactionCurrency', 'CompanyCode', 'SoldToParty', 'OverallBillingStatus',
      'AccountingPostingStatus', 'CreationTime', 'LastChangeDate',
    ],
  },
  'API_MATERIAL_DOCUMENT_SRV:A_MaterialDocumentItem': {
    dbTable: 'material_documents',
    keyFields: ['material_document_year', 'material_document', 'material_document_item'],
    sapFields: [
      'MaterialDocumentYear', 'MaterialDocument', 'MaterialDocumentItem',
      'Material', 'Plant', 'StorageLocation', 'Batch', 'GoodsMovementType',
      'PurchaseOrder', 'PurchaseOrderItem', 'ManufacturingOrder', 'CostCenter',
      'ProfitCenter', 'MaterialBaseUnit', 'QuantityInBaseUnit', 'GoodsRecipientName',
    ],
  },
};

// ============================================================
// Data Conversion Utilities
// ============================================================

/** Convert SAP response record (PascalCase keys) to DB row (snake_case keys) */
export function sapToDbRow(sapRecord: Record<string, unknown>, config: { sapFields: string[] }): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  for (const sapField of config.sapFields) {
    const dbField = toSnakeCase(sapField);
    let value = sapRecord[sapField];

    // Flatten expand data for Product
    if (sapField === 'ProductDescription' || sapField === 'Language') {
      const desc = sapRecord['to_Description'];
      const results = Array.isArray(desc) ? desc : (desc as Record<string, unknown>)?.results;
      if (Array.isArray(results) && results.length > 0) {
        // Prefer ZH description, fallback to first
        const zhDesc = results.find((r: Record<string, unknown>) => r.Language === 'ZH');
        const descItem = zhDesc || results[0];
        if (sapField === 'ProductDescription') value = descItem.ProductDescription;
        if (sapField === 'Language') value = descItem.Language;
      }
    } else if (['Plant', 'MRPType', 'ProductionInvtryManagedLoc', 'ProcurementType',
      'ProfitCenter', 'AvailabilityCheckType', 'PurchasingGroup',
      'CountryOfOrigin', 'RegionOfOrigin', 'IsBatchManagementRequired'].includes(sapField)) {
      const plant = sapRecord['to_Plant'];
      const results = Array.isArray(plant) ? plant : (plant as Record<string, unknown>)?.results;
      if (Array.isArray(results) && results.length > 0) {
        value = results[0][sapField as keyof typeof results[0]];
      }
    } else if (['ProductSalesOrg', 'ProductDistributionChnl', 'ProductSalesStatus',
      'MinimumOrderQuantity', 'SalesMeasureUnit', 'SupplyingPlant'].includes(sapField)) {
      const sd = sapRecord['to_SalesDelivery'];
      const results = Array.isArray(sd) ? sd : (sd as Record<string, unknown>)?.results;
      if (Array.isArray(results) && results.length > 0) {
        value = results[0][sapField as keyof typeof results[0]];
      }
    } else if (['ValuationArea', 'ValuationClass', 'StandardPrice', 'MovingAveragePrice',
      'PriceUnitQty', 'Currency'].includes(sapField)) {
      const val = sapRecord['to_Valuation'];
      const results = Array.isArray(val) ? val : (val as Record<string, unknown>)?.results;
      if (Array.isArray(results) && results.length > 0) {
        value = results[0][sapField as keyof typeof results[0]];
      }
    }

    // Convert boolean strings (only for fields starting with 'Is')
    if (sapField.startsWith('Is')) {
      if (value === 'true' || value === 'X') value = true;
      if (value === 'false' || value === '' || value === ' ') value = false;
    }

    // Skip undefined values and complex objects (nested to_ navigation properties)
    if (value !== undefined && typeof value !== 'object') {
      row[dbField] = value;
    }
  }
  return row;
}

/** Convert DB row (snake_case keys) back to SAP format (PascalCase keys) */
export function dbRowToSap(dbRow: Record<string, unknown>, config: { sapFields: string[] }): Record<string, unknown> {
  const sapRecord: Record<string, unknown> = {};
  for (const sapField of config.sapFields) {
    const dbField = toSnakeCase(sapField);
    if (dbField in dbRow) {
      sapRecord[sapField] = dbRow[dbField];
    }
  }
  return sapRecord;
}
