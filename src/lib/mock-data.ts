/**
 * Mock data generator for demo mode (USE_MOCK=true).
 * Returns sample SAP-style data so the UI renders without a real SAP backend.
 */

export interface MockDataSet {
  list: Record<string, unknown>[];
  count: number;
}

// ---------- helpers ----------
function pad(n: number, len = 10): string {
  return String(n).padStart(len, '0');
}
function dateOffset(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}
function dateTimeOffset(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 19).replace('T', ' ');
}

// ---------- Sales Orders ----------
function generateSalesOrders(count = 200): MockDataSet {
  const orderTypes = ['OR', 'RE', 'RO'];
  const statuses = ['Completed', 'Being Processed', 'Not Yet Processed', 'Partially Processed', 'Rejected'];
  const customers = ['上海华普电子', '北京智联科技', '深圳通达贸易', '广州恒信实业', '苏州精工制造', '杭州云创信息', '南京博瑞医疗', '成都东方电气'];
  const materials = ['成品-A001', '成品-B002', '半成品-C003', '配件-D004', '组件-E005'];
  const list: Record<string, unknown>[] = [];
  for (let i = 0; i < count; i++) {
    const id = 100000000 + i;
    const status = statuses[i % statuses.length];
    list.push({
      SalesOrder: String(id),
      SalesOrderType: orderTypes[i % orderTypes.length],
      SalesOrderTypeText: i % 3 === 0 ? '退货订单' : '标准订单',
      SoldToParty: `C${1000 + (i % customers.length)}`,
      SoldToPartyName: customers[i % customers.length],
      CustomerName: customers[i % customers.length],
      CustomerPurchaseOrderDate: dateOffset(-i % 90 - 1),
      SalesOrderDate: dateOffset(-i % 60 - 1),
      RequestedDeliveryDate: dateOffset(30 - (i % 30)),
      TotalNetAmount: String(((i + 1) * 1234.56).toFixed(2)),
      TransactionCurrency: 'CNY',
      OverallProcessingStatus: status,
      OverallProcessingStatusText: status,
      OverallTotalDeliveryStatus: i % 4 === 0 ? 'Not Delivered' : 'Partially Delivered',
      OverallTotalDeliveryStatusText: i % 4 === 0 ? '未交货' : '部分交货',
      SalesOrganization: '1010',
      DistributionChannel: '10',
      OrganizationDivision: '00',
      Material: materials[i % materials.length],
      MaterialName: materials[i % materials.length],
      to_Item: [{
        SalesOrderItem: String(10 + (i % 5) * 10),
        Material: materials[i % materials.length],
        MaterialName: materials[i % materials.length],
        RequestedQuantity: String((i % 20 + 1) * 10),
        TargetQuantity: String((i % 20 + 1) * 10),
        TargetQuantityUnit: 'PC',
        NetAmount: String(((i + 1) * 123.45).toFixed(2)),
      }],
      to_Partner: [{
        PartnerFunction: 'AG',
        Customer: `C${1000 + (i % customers.length)}`,
        CustomerName: customers[i % customers.length],
      }],
    });
  }
  return { list, count };
}

// ---------- Production Orders ----------
function generateProductionOrders(count = 150): MockDataSet {
  const statuses = ['RELEASED', 'CREATED', 'COMPLETED', 'PARTIALLY CONFIRMED', 'LOCKED'];
  const plants = ['1010', '1020', '1030'];
  const materials = ['FG-A001 成品A型', 'FG-B002 成品B型', 'SF-C003 半成品', 'RM-D004 原材料', 'FG-E005 电子组件'];
  const list: Record<string, unknown>[] = [];
  for (let i = 0; i < count; i++) {
    const id = 600000000 + i;
    const status = statuses[i % statuses.length];
    list.push({
      ProductionOrder: String(id),
      ManufacturingOrder: String(id),
      OrderType: i % 2 === 0 ? 'PP01' : 'PP02',
      OrderTypeText: i % 2 === 0 ? '标准生产订单' : '返工订单',
      Material: `M${100000 + i % 500}`,
      MaterialName: materials[i % materials.length],
      ProductionPlant: plants[i % plants.length],
      MRPController: '001',
      OrderStatus: status,
      OrderStatusText: {
        RELEASED: '已下达',
        CREATED: '已创建',
        COMPLETED: '已完成',
        'PARTIALLY CONFIRMED': '部分确认',
        LOCKED: '已锁定',
      }[status] || status,
      TotalQuantity: String((i % 50 + 1) * 100),
      QuantityUnit: 'PC',
      ConfirmedYieldQuantity: String((i % 50 + 1) * 50),
      ConfirmedScrapQuantity: String(i % 5),
      BasicStartDate: dateOffset(-(i % 20)),
      BasicEndDate: dateOffset(30 - (i % 30)),
      ActualReleaseDate: dateOffset(-(i % 10)),
      SalesOrder: i % 3 === 0 ? String(100000000 + i) : '',
      CustomerName: i % 3 === 0 ? ['上海华普电子', '北京智联科技', '深圳通达贸易'][i % 3] : '',
    });
  }
  return { list, count };
}

// ---------- Deliveries ----------
function generateDeliveries(count = 180): MockDataSet {
  const statuses = ['Not Yet Processed', 'Being Processed', 'Completed'];
  const shiptos = ['上海张江仓库', '北京朝阳仓库', '深圳宝安仓库', '广州白云仓库', '苏州工业园'];
  const list: Record<string, unknown>[] = [];
  for (let i = 0; i < count; i++) {
    const id = 800000000 + i;
    list.push({
      DeliveryDocument: String(id),
      DeliveryDocumentType: 'LF',
      DeliveryDocumentTypeText: '外向交货',
      ShippingPoint: '1010',
      ShipToParty: `C${2000 + (i % shiptos.length)}`,
      ShipToPartyName: shiptos[i % shiptos.length],
      SoldToParty: `C${1000 + (i % 8)}`,
      SoldToPartyName: shiptos[i % shiptos.length],
      ActualGoodsMovementDate: dateOffset(-i % 30),
      DeliveryDate: dateOffset(-i % 15),
      ActualDeliveryDate: dateOffset(-i % 10),
      HeaderBillingBlockReason: '',
      OverallGoodsMovementStatus: statuses[i % statuses.length],
      OverallGoodsMovementStatusText: statuses[i % statuses.length],
      TotalNetAmount: String(((i + 1) * 567.89).toFixed(2)),
      TransactionCurrency: 'CNY',
    });
  }
  return { list, count };
}

// ---------- Billing Documents ----------
function generateBillingDocs(count = 220): MockDataSet {
  const types = ['F2', 'L2', 'G2'];
  const list: Record<string, unknown>[] = [];
  for (let i = 0; i < count; i++) {
    const id = 900000000 + i;
    list.push({
      BillingDocument: String(id),
      BillingDocumentType: types[i % types.length],
      BillingDocumentTypeText: { F2: '发票', L2: '借项凭证', G2: '贷项凭证' }[types[i % types.length]],
      BillingDate: dateOffset(-i % 45),
      SoldToParty: `C${1000 + (i % 8)}`,
      SoldToPartyName: ['上海华普电子', '北京智联科技', '深圳通达贸易', '广州恒信实业'][i % 4],
      PayerParty: `C${3000 + (i % 8)}`,
      TotalNetAmount: String(((i + 1) * 890.12).toFixed(2)),
      TaxAmount: String(((i + 1) * 890.12 * 0.13).toFixed(2)),
      TotalGrossAmount: String(((i + 1) * 890.12 * 1.13).toFixed(2)),
      TransactionCurrency: 'CNY',
      BillingDocumentIsCancelled: i % 20 === 0 ? 'X' : '',
      SalesOrganization: '1010',
      DistributionChannel: '10',
      OrganizationDivision: '00',
    });
  }
  return { list, count };
}

// ---------- Material Documents (goods receipt) ----------
function generateMaterialDocs(count = 300): MockDataSet {
  const types = ['WE', 'WA', 'WL', 'WGI'];
  const plants = ['1010', '1020', '1030'];
  const locations = ['0001', '0002', '0003'];
  const materials = ['FG-A001', 'FG-B002', 'SF-C003', 'RM-D004', 'FG-E005'];
  const movementTypes = ['101', '102', '201', '202', '261', '262', '301', '311', '321', '551', '601'];
  const list: Record<string, unknown>[] = [];
  for (let i = 0; i < count; i++) {
    const id = 500000000 + i;
    const year = new Date().getFullYear().toString();
    const mtype = movementTypes[i % movementTypes.length];
    list.push({
      MaterialDocument: String(id),
      MaterialDocumentYear: year,
      MaterialDocumentItem: '0001',
      DocumentDate: dateOffset(-i % 60),
      PostingDate: dateOffset(-i % 60),
      DocumentType: types[i % types.length],
      MovementType: mtype,
      MovementTypeName: {
        '101': '采购入库',
        '102': '入库冲销',
        '201': '成本中心发料',
        '202': '冲销发料',
        '261': '生产领料',
        '262': '冲销领料',
        '301': '工厂间转移',
        '311': '库位间转移',
        '321': '质检到非限制',
        '551': '报废出库',
        '601': '销售出库',
      }[mtype] || mtype,
      Material: `M${100000 + i % 500}`,
      MaterialName: materials[i % materials.length],
      MaterialDescription: materials[i % materials.length],
      Plant: plants[i % plants.length],
      StorageLocation: locations[i % locations.length],
      QuantityInUnitOfEntry: String(((i % 20 + 1) * 10)),
      UnitOfEntry: 'PC',
      Quantity: String(((i % 20 + 1) * 10)),
      BaseUnit: 'PC',
      DebitCreditIndicator: mtype.startsWith('1') || mtype.startsWith('3') || mtype.startsWith('56') || mtype === '601' ? 'S' : 'H',
      Batch: '',
      PurchaseOrder: i % 4 === 0 ? String(400000000 + i) : '',
      ProductionOrder: i % 5 === 0 ? String(600000000 + i) : '',
      SalesOrder: i % 6 === 0 ? String(100000000 + i) : '',
      UserName: 'CLERK' + (i % 5),
    });
  }
  return { list, count };
}

// ---------- Material Stock ----------
function generateMaterialStock(count = 500): MockDataSet {
  const plants = ['1010', '1020', '1030'];
  const locations = ['0001', '0002', '0003'];
  const types = ['UNRESTRICTED', 'QUALITY_INSPECTION', 'BLOCKED', 'RESTRICTED'];
  const materials = ['FG-A001', 'FG-B002', 'SF-C003', 'RM-D004', 'FG-E005', 'RM-F006', 'SF-G007', 'FG-H008'];
  const list: Record<string, unknown>[] = [];
  for (let i = 0; i < count; i++) {
    list.push({
      Material: `M${100000 + i % 500}`,
      MaterialName: materials[i % materials.length],
      MaterialDescription: materials[i % materials.length],
      Plant: plants[i % plants.length],
      PlantName: { '1010': '上海工厂', '1020': '北京工厂', '1030': '深圳工厂' }[plants[i % plants.length]],
      StorageLocation: locations[i % locations.length],
      StorageLocationName: { '0001': '原材料库', '0002': '成品库', '0003': '半成品库' }[locations[i % locations.length]],
      StockType: types[i % types.length],
      StockTypeText: {
        UNRESTRICTED: '非限制使用',
        QUALITY_INSPECTION: '质检中',
        BLOCKED: '已冻结',
        RESTRICTED: '受限',
      }[types[i % types.length]],
      QuantityOfMatlStockInBaseUnit: String(((i % 100 + 1) * 50)),
      MatlWrhsStkQtyInMatlBaseUnit: String(((i % 100 + 1) * 50)),
      BaseUnit: 'PC',
      MaterialBaseUnit: 'PC',
      BatchStock: '',
      Supplier: '',
      Customer: '',
    });
  }
  return { list, count };
}

// ---------- Products ----------
function generateProducts(count = 500): MockDataSet {
  const divisions = ['00', '01', '02'];
  const groups = ['L001', 'L002', 'L003', 'FERT', 'ROH', 'HALB'];
  const names = ['成品A型控制器', '成品B型传感器', '半成品主板', '原材料芯片', '电子组件模块', '外壳套件', '电源适配器', '连接线束'];
  const list: Record<string, unknown>[] = [];
  for (let i = 0; i < count; i++) {
    const id = 100000 + i;
    list.push({
      Product: `M${id}`,
      ProductType: i < count / 2 ? 'FERT' : (i % 3 === 0 ? 'ROH' : 'HALB'),
      ProductTypeText: i < count / 2 ? '成品' : (i % 3 === 0 ? '原材料' : '半成品'),
      ProductGroup: groups[i % groups.length],
      ProductGroupText: '产品组' + (i % groups.length + 1),
      Division: divisions[i % divisions.length],
      BaseUnit: 'PC',
      ProductDescription: names[i % names.length],
      Name: names[i % names.length],
      MaterialName: names[i % names.length],
      ProductName: names[i % names.length],
      GrossWeight: String(((i % 20 + 1) * 1.5).toFixed(2)),
      NetWeight: String(((i % 20 + 1) * 1.2).toFixed(2)),
      WeightUnit: 'KG',
      Volume: String(((i % 20 + 1) * 0.5).toFixed(2)),
      VolumeUnit: 'M3',
      ProductHierarchy: '0001' + (i % 5 + 1),
      CreationDate: dateOffset(-i % 365),
      LastChangeDate: dateOffset(-i % 30),
      to_Description: [{
        Product: `M${id}`,
        Language: 'ZH',
        ProductDescription: names[i % names.length],
      }],
      to_Plant: [{
        Product: `M${id}`,
        Plant: '1010',
        ProcurementType: i < count / 2 ? 'E' : (i % 3 === 0 ? 'F' : 'X'),
        ProcurementTypeText: i < count / 2 ? '自制' : (i % 3 === 0 ? '外购' : '两种'),
        MRPType: 'PD',
        MRPController: '001',
        LotSizingProcedure: 'EX',
        PlannedDeliveryDurationInDays: String(i % 10 + 1),
        SafetyStock: String(((i % 10 + 1) * 20)),
      }],
    });
  }
  return { list, count };
}

// ---------- Customers ----------
function generateCustomers(count = 120): MockDataSet {
  const names = ['上海华普电子有限公司', '北京智联科技股份有限公司', '深圳通达贸易有限公司', '广州恒信实业集团', '苏州精工制造有限公司', '杭州云创信息技术', '南京博瑞医疗器械', '成都东方电气集团', '武汉长江汽车零部件', '天津滨海物流有限公司', '西安西电智能设备', '重庆长安供应链'];
  const cities = ['上海', '北京', '深圳', '广州', '苏州', '杭州', '南京', '成都', '武汉', '天津', '西安', '重庆'];
  const streets = ['张江高科技园区', '中关村软件园', '宝安科技园', '白云大道88号', '工业园区星湖街', '余杭未来科技城', '江宁开发区', '高新区天府大道', '东湖高新区', '滨海新区', '高新区锦业路', '两江新区'];
  const list: Record<string, unknown>[] = [];
  for (let i = 0; i < count; i++) {
    const idx = i % names.length;
    const id = 1000 + i;
    list.push({
      Customer: String(id),
      BusinessPartner: String(id),
      CustomerName: names[idx] + (i >= names.length ? `第${Math.floor(i / names.length) + 1}分公司` : ''),
      Name: names[idx] + (i >= names.length ? `第${Math.floor(i / names.length) + 1}分公司` : ''),
      FullName: names[idx] + (i >= names.length ? `第${Math.floor(i / names.length) + 1}分公司` : ''),
      SearchTerm1: names[idx].slice(0, 4),
      CustomerClassification: i % 3 === 0 ? 'A' : (i % 3 === 1 ? 'B' : 'C'),
      CustomerAccountGroup: 'CUST',
      SalesOrganization: '1010',
      DistributionChannel: '10',
      Division: '00',
      Country: 'CN',
      CountryName: '中国',
      Region: cities[idx].slice(0, 2),
      City: cities[idx],
      CityName: cities[idx],
      PostalCode: String(200000 + i * 10),
      Street: streets[idx],
      HouseNumber: String(i + 1) + '号',
      PhoneNumber: '021-' + String(60000000 + i),
      FaxNumber: '021-' + String(60000000 + i),
      EmailAddress: `contact${id}@example.com`,
      VATRegistration: '91310000MA' + String(100000000 + i).slice(0, 9),
      Industry: i % 4 === 0 ? '制造业' : (i % 4 === 1 ? '贸易' : '服务业'),
      CreationDate: dateOffset(-i % 730),
      to_CustomerCompany: [{
        Customer: String(id),
        CompanyCode: '1000',
        ReconciliationAccount: '11220000',
        PaymentTerms: '0001',
      }],
      to_CustomerSalesArea: [{
        Customer: String(id),
        SalesOrganization: '1010',
        DistributionChannel: '10',
        Division: '00',
        Currency: 'CNY',
        ShippingCondition: '01',
        IncotermsClassification: 'FOB',
        IncotermsLocation: cities[idx],
      }],
    });
  }
  return { list, count };
}

// ---------- index lookup ----------
const DATASETS: Record<string, () => MockDataSet> = {
  // V2 service:entity
  'API_SALES_ORDER_SRV:A_SalesOrder': generateSalesOrders,
  'API_OUTBOUND_DELIVERY_SRV:A_OutbDeliveryHeader': generateDeliveries,
  'API_BILLING_DOCUMENT_SRV:A_BillingDocument': generateBillingDocs,
  'API_MATERIAL_DOCUMENT_SRV:A_MaterialDocumentItem': generateMaterialDocs,
  'API_MATERIAL_DOCUMENT_SRV:A_MaterialDocumentHeader': generateMaterialDocs,
  'API_MATERIAL_STOCK_SRV:A_MatlStkInAcctMod': generateMaterialStock,
  'API_PRODUCT_SRV:A_Product': generateProducts,
  'API_BUSINESS_PARTNER:A_Customer': generateCustomers,
  // V4 service:entity
  'CE_SALESORDER_0001:SalesOrder': generateSalesOrders,
  'CE_PRODUCTIONORDER_0001:ProductionOrder': generateProductionOrders,
  // fallbacks
  'API_PRODUCTION_ORDER_2_SRV:ProductionOrder': generateProductionOrders,
};

export function getMockData(serviceEntityKey: string): MockDataSet | null {
  const fn = DATASETS[serviceEntityKey];
  if (!fn) return null;
  return fn();
}

export function queryMockData(
  serviceEntityKey: string,
  options: {
    top?: number;
    skip?: number;
    filter?: string;
    orderby?: string;
    id?: string;
    count?: boolean;
  } = {}
): MockDataSet {
  const data = getMockData(serviceEntityKey);
  if (!data) return { list: [], count: 0 };
  let list = [...data.list];

  // Simple id lookup
  if (options.id) {
    const id = decodeURIComponent(options.id);
    const found = list.find((item) => {
      const keys = ['SalesOrder', 'ProductionOrder', 'ManufacturingOrder', 'DeliveryDocument', 'BillingDocument', 'MaterialDocument', 'Product', 'Material', 'Customer', 'BusinessPartner'];
      return keys.some((k) => String(item[k]) === id);
    });
    return { list: found ? [found] : [], count: found ? 1 : 0 };
  }

  // Simple filter (eq only, supports substring of common text fields)
  if (options.filter) {
    const eqMatch = options.filter.match(/(\w+)\s+eq\s+'?([^']+)'?/);
    if (eqMatch) {
      const field = eqMatch[1];
      const val = eqMatch[2].toLowerCase();
      list = list.filter((item) => String(item[field] ?? '').toLowerCase().includes(val));
    } else {
      // Generic contains: treat filter text as search across name/description fields
      const text = options.filter.replace(/'/g, '').toLowerCase();
      if (text && !text.includes(' eq ') && !text.includes(' eq')) {
        const searchFields = ['ProductName', 'Name', 'CustomerName', 'MaterialName', 'SoldToPartyName', 'ProductDescription', 'MaterialDescription', 'FullName', 'SalesOrder', 'ProductionOrder', 'DeliveryDocument', 'BillingDocument', 'MaterialDocument', 'Product', 'Material', 'Customer'];
        list = list.filter((item) => searchFields.some((f) => String(item[f] ?? '').toLowerCase().includes(text)));
      }
    }
  }

  // OrderBy
  if (options.orderby) {
    const [field, dir] = options.orderby.split(' ');
    list.sort((a, b) => {
      const av = a[field];
      const bv = b[field];
      if (av === bv) return 0;
      if (av === undefined) return 1;
      if (bv === undefined) return -1;
      const cmp = String(av).localeCompare(String(bv), 'zh-CN', { numeric: true });
      return dir === 'desc' ? -cmp : cmp;
    });
  }

  const total = list.length;
  const start = options.skip || 0;
  const end = options.top ? start + options.top : list.length;
  list = list.slice(start, end);

  return { list, count: options.count ? total : list.length };
}
