import { NextResponse } from 'next/server';

interface KpiCard {
  label: string;
  value: string;
  unit: string;
  trend: 'up' | 'down' | 'flat';
  trendValue: string;
  trendLabel: string;
  color: 'blue' | 'green' | 'orange' | 'purple';
  icon: string;
}

interface ActivityItem {
  color: 'success' | 'info' | 'warning' | 'neutral';
  text: string;
  meta: string;
}

interface DashboardData {
  kpis: KpiCard[];
  activities: ActivityItem[];
  tileCounts: {
    salesOrders: number;
    productionOrders: number;
    deliveries: number;
    billingDocs: number;
    materialStock: number;
    materialDocs: number;
    products: number;
    customers: number;
  };
}

function formatCount(n: number): string {
  if (n >= 10000) return `${(n / 10000).toFixed(1)}万`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

export async function GET(): Promise<NextResponse> {
  const base = `http://localhost:${process.env.DEPLOY_RUN_PORT || 5000}`;

  try {
    // Fetch counts in parallel via proxy API
    const [
      salesRes,
      prodRes,
      deliveryRes,
      billingRes,
      stockRes,
      matDocRes,
      productRes,
      customerRes,
    ] = await Promise.allSettled([
      fetch(`${base}/api/sap/API_SALES_ORDER_SRV/A_SalesOrder?$top=1&$inlinecount=allpages`, { signal: AbortSignal.timeout(15000) }),
      fetch(`${base}/api/sap/CE_PRODUCTIONORDER_0001/ProductionOrder?$top=1&$count=true`, { signal: AbortSignal.timeout(15000) }),
      fetch(`${base}/api/sap/API_OUTBOUND_DELIVERY_SRV/A_OutbDeliveryHeader?$top=1&$inlinecount=allpages`, { signal: AbortSignal.timeout(15000) }),
      fetch(`${base}/api/sap/API_BILLING_DOCUMENT_SRV/A_BillingDocument?$top=1&$inlinecount=allpages`, { signal: AbortSignal.timeout(15000) }),
      fetch(`${base}/api/sap/API_MATERIAL_STOCK_SRV/A_MatlStkInAcctMod?$top=1&$inlinecount=allpages`, { signal: AbortSignal.timeout(15000) }),
      fetch(`${base}/api/sap/API_MATERIAL_DOCUMENT_SRV/A_MaterialDocumentHeader?$top=1&$inlinecount=allpages`, { signal: AbortSignal.timeout(15000) }),
      fetch(`${base}/api/sap/API_PRODUCT_SRV/A_Product?$top=1&$inlinecount=allpages`, { signal: AbortSignal.timeout(15000) }),
      fetch(`${base}/api/sap/API_BUSINESS_PARTNER/A_Customer?$top=1&$inlinecount=allpages`, { signal: AbortSignal.timeout(15000) }),
    ]);

    // Also fetch recent items for activities
    const [recentSalesRes, recentProdsRes, recentDeliveriesRes] = await Promise.allSettled([
      fetch(`${base}/api/sap/API_SALES_ORDER_SRV/A_SalesOrder?$top=3&$orderby=SalesOrder desc`, { signal: AbortSignal.timeout(15000) }),
      fetch(`${base}/api/sap/CE_PRODUCTIONORDER_0001/ProductionOrder?$top=3&$orderby=ProductionOrder desc`, { signal: AbortSignal.timeout(15000) }),
      fetch(`${base}/api/sap/API_OUTBOUND_DELIVERY_SRV/A_OutbDeliveryHeader?$top=3&$orderby=DeliveryDocument desc`, { signal: AbortSignal.timeout(15000) }),
    ]);

    const getCount = async (result: PromiseSettledResult<Response>, isV4 = false): Promise<number> => {
      if (result.status !== 'fulfilled' || !result.value.ok) return 0;
      const json = await result.value.json();
      if (isV4) return json.count || json['@odata.count'] || 0;
      return json.count || json.data?.__count || 0;
    };

    const getResults = async (result: PromiseSettledResult<Response>, isV4 = false): Promise<unknown[]> => {
      if (result.status !== 'fulfilled' || !result.value.ok) return [];
      const json = await result.value.json();
      if (isV4) return json.data || json.value || [];
      return json.data?.results || [];
    };

    const salesCount = await getCount(salesRes);
    const prodCount = await getCount(prodRes, true);
    const deliveryCount = await getCount(deliveryRes);
    const billingCount = await getCount(billingRes);
    const stockCount = await getCount(stockRes);
    const matDocCount = await getCount(matDocRes);
    const productCount = await getCount(productRes);
    const customerCount = await getCount(customerRes);

    // Build KPI cards
    const kpis: KpiCard[] = [
      {
        label: '销售订单',
        value: formatCount(salesCount),
        unit: '张',
        trend: 'up',
        trendValue: `共${salesCount}张`,
        trendLabel: '全部',
        color: 'blue',
        icon: 'FileText',
      },
      {
        label: '生产订单',
        value: formatCount(prodCount),
        unit: '张',
        trend: 'up',
        trendValue: `共${prodCount}张`,
        trendLabel: '全部',
        color: 'green',
        icon: 'Factory',
      },
      {
        label: '待发货',
        value: formatCount(deliveryCount),
        unit: '单',
        trend: 'down',
        trendValue: `共${deliveryCount}单`,
        trendLabel: '全部',
        color: 'orange',
        icon: 'Truck',
      },
      {
        label: '库存条目',
        value: formatCount(stockCount),
        unit: '条',
        trend: 'flat',
        trendValue: `共${stockCount}条`,
        trendLabel: '全部',
        color: 'purple',
        icon: 'PackageOpen',
      },
    ];

    // Build activity stream from recent items
    const activities: ActivityItem[] = [];

    const recentSales = await getResults(recentSalesRes);
    const recentProds = await getResults(recentProdsRes, true);
    const recentDeliveries = await getResults(recentDeliveriesRes);

    for (const item of recentSales.slice(0, 3)) {
      const so = item as Record<string, unknown>;
      activities.push({
        color: 'info',
        text: `销售订单 ${so.SalesOrder} - ${so.SoldToParty || '未知客户'}`,
        meta: '最近',
      });
    }

    for (const item of recentProds.slice(0, 2)) {
      const po = item as Record<string, unknown>;
      activities.push({
        color: 'success',
        text: `生产订单 ${po.ProductionOrder} - ${po.Product || po.Material || '未知产品'}`,
        meta: '最近',
      });
    }

    for (const item of recentDeliveries.slice(0, 2)) {
      const dlv = item as Record<string, unknown>;
      activities.push({
        color: 'warning',
        text: `交货单 ${dlv.DeliveryDocument} - ${dlv.ShipToParty || '未知客户'}`,
        meta: '最近',
      });
    }

    if (activities.length === 0) {
      activities.push({
        color: 'info',
        text: '系统就绪，SAP 数据已连接',
        meta: '刚刚',
      });
    }

    const data: DashboardData = {
      kpis,
      activities,
      tileCounts: {
        salesOrders: salesCount,
        productionOrders: prodCount,
        deliveries: deliveryCount,
        billingDocs: billingCount,
        materialStock: stockCount,
        materialDocs: matDocCount,
        products: productCount,
        customers: customerCount,
      },
    };

    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json({
      success: true,
      data: {
        kpis: [],
        activities: [{ color: 'info' as const, text: '无法连接 SAP 系统', meta: '错误' }],
        tileCounts: {},
      },
    });
  }
}
