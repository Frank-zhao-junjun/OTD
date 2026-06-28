import { NextResponse } from 'next/server';
import { querySapDirect } from '@/lib/sap-direct-fetch';

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

function countFrom(result: PromiseSettledResult<Awaited<ReturnType<typeof querySapDirect>>>): number {
  if (result.status !== 'fulfilled' || !result.value.success) return 0;
  return result.value.count;
}

function dataFrom(result: PromiseSettledResult<Awaited<ReturnType<typeof querySapDirect>>>): Record<string, unknown>[] {
  if (result.status !== 'fulfilled' || !result.value.success) return [];
  return result.value.data;
}

export async function GET(): Promise<NextResponse> {
  try {
    const [
      salesRes,
      prodRes,
      deliveryRes,
      billingRes,
      stockRes,
      matDocRes,
      productRes,
      customerRes,
      recentSalesRes,
      recentProdsRes,
      recentDeliveriesRes,
    ] = await Promise.allSettled([
      querySapDirect('API_SALES_ORDER_SRV', 'A_SalesOrder', { top: 1, count: true }),
      querySapDirect('CE_PRODUCTIONORDER_0001', 'ProductionOrder', { top: 1, count: true }),
      querySapDirect('API_OUTBOUND_DELIVERY_SRV', 'A_OutbDeliveryHeader', { top: 1, count: true }),
      querySapDirect('API_BILLING_DOCUMENT_SRV', 'A_BillingDocument', { top: 1, count: true }),
      querySapDirect('API_MATERIAL_STOCK_SRV', 'A_MatlStkInAcctMod', { top: 1, count: true }),
      querySapDirect('API_MATERIAL_DOCUMENT_SRV', 'A_MaterialDocumentHeader', { top: 1, count: true }),
      querySapDirect('API_PRODUCT_SRV', 'A_Product', { top: 1, count: true }),
      querySapDirect('API_BUSINESS_PARTNER', 'A_Customer', { top: 1, count: true }),
      querySapDirect('API_SALES_ORDER_SRV', 'A_SalesOrder', { top: 3, orderby: 'SalesOrder desc' }),
      querySapDirect('CE_PRODUCTIONORDER_0001', 'ProductionOrder', { top: 3, orderby: 'ProductionOrder desc' }),
      querySapDirect('API_OUTBOUND_DELIVERY_SRV', 'A_OutbDeliveryHeader', { top: 3, orderby: 'DeliveryDocument desc' }),
    ]);

    const salesCount = countFrom(salesRes);
    const prodCount = countFrom(prodRes);
    const deliveryCount = countFrom(deliveryRes);
    const billingCount = countFrom(billingRes);
    const stockCount = countFrom(stockRes);
    const matDocCount = countFrom(matDocRes);
    const productCount = countFrom(productRes);
    const customerCount = countFrom(customerRes);

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

    const activities: ActivityItem[] = [];

    for (const item of dataFrom(recentSalesRes).slice(0, 3)) {
      activities.push({
        color: 'info',
        text: `销售订单 ${item.SalesOrder} - ${item.SoldToParty || '未知客户'}`,
        meta: '最近',
      });
    }

    for (const item of dataFrom(recentProdsRes).slice(0, 2)) {
      activities.push({
        color: 'success',
        text: `生产订单 ${item.ProductionOrder} - ${item.Product || item.Material || '未知产品'}`,
        meta: '最近',
      });
    }

    for (const item of dataFrom(recentDeliveriesRes).slice(0, 2)) {
      activities.push({
        color: 'warning',
        text: `交货单 ${item.DeliveryDocument} - ${item.ShipToParty || '未知客户'}`,
        meta: '最近',
      });
    }

    if (activities.length === 0) {
      activities.push({
        color: 'info',
        text: salesCount + prodCount > 0 ? '系统就绪，SAP 数据已连接' : '暂无最近动态',
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
    const message = error instanceof Error ? error.message : '无法连接 SAP 系统';
    return NextResponse.json(
      {
        success: false,
        error: message,
        data: {
          kpis: [],
          activities: [{ color: 'info' as const, text: message, meta: '错误' }],
          tileCounts: {},
        },
      },
      { status: 503 }
    );
  }
}
