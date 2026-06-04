/**
 * SAP CE Sales Order OData V4 field names (see assets/interface_src/.../SalesOrder metaData.txt).
 * Header billing completion is OverallOrdReltdBillgStatus — not OverallBillingStatus (V2 / invalid on V4).
 */

export const ODATA_OVERALL_ORD_RELTD_BILLG_STATUS = 'OverallOrdReltdBillgStatus';

const SALES_ORDER_LIST_SELECT_FIELDS = [
  'SalesOrder',
  'SalesOrderType',
  'SoldToParty',
  'PurchaseOrderByCustomer',
  'SalesOrganization',
  'TotalNetAmount',
  'TransactionCurrency',
  'SalesOrderDate',
  'RequestedDeliveryDate',
  'OverallSDProcessStatus',
  'OverallDeliveryStatus',
  ODATA_OVERALL_ORD_RELTD_BILLG_STATUS,
  'OverallSDDocumentRejectionSts',
] as const;

export const SALES_ORDER_LIST_SELECT = SALES_ORDER_LIST_SELECT_FIELDS.join(',');

export const SALES_ORDER_HEADER_SELECT = [
  'SalesOrder',
  'SalesOrderType',
  'SoldToParty',
  'PurchaseOrderByCustomer',
  'TotalNetAmount',
  'TransactionCurrency',
  'SalesOrderDate',
  'RequestedDeliveryDate',
  'OverallSDProcessStatus',
  'OverallDeliveryStatus',
  ODATA_OVERALL_ORD_RELTD_BILLG_STATUS,
  'OverallSDDocumentRejectionSts',
].join(',');

export const SALES_ORDER_HEADER_SELECT_EXTENDED = [
  'SalesOrder',
  'SalesOrderType',
  'SoldToParty',
  'SalesOrganization',
  'DistributionChannel',
  'OrganizationDivision',
  'TotalNetAmount',
  'TransactionCurrency',
  'SalesOrderDate',
  'RequestedDeliveryDate',
  'OverallSDProcessStatus',
  'OverallDeliveryStatus',
  ODATA_OVERALL_ORD_RELTD_BILLG_STATUS,
  'PurchaseOrderByCustomer',
  'CreationDate',
  'LastChangeDate',
  'SalesGroup',
  'SalesOffice',
].join(',');

export type SalesOrderBillingStatusCarrier = {
  OverallBillingStatus?: string;
  OverallOrdReltdBillgStatus?: string;
};

/** Map V4 OData billing status onto OverallBillingStatus for UI layers. */
export function withBillingStatusNormalized<T extends SalesOrderBillingStatusCarrier>(row: T): T {
  const code = row.OverallOrdReltdBillgStatus ?? row.OverallBillingStatus;
  if (code === undefined) return row;
  return {
    ...row,
    OverallBillingStatus: code,
    OverallOrdReltdBillgStatus: row.OverallOrdReltdBillgStatus ?? code,
  };
}

export function withBillingStatusNormalizedList<T extends SalesOrderBillingStatusCarrier>(
  rows: T[],
): T[] {
  return rows.map(withBillingStatusNormalized);
}
