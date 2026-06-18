// pages/sales-orders/detail/detail.js
const { api, formatAmount, formatDate } = require('../../../utils/api');

Page({
  data: {
    orderId: '',
    loading: true,
    error: false,
    errorMsg: '',
    order: null,
    items: [],
    partners: [],
    pricing: [],
    deliveries: [],
    billings: [],
    productionOrders: [],
    pricingOpen: false
  },

  onLoad(options) {
    const id = options.id || '';
    if (!id) {
      this.setData({ loading: false, error: true, errorMsg: '缺少订单号参数' });
      return;
    }
    this.setData({ orderId: id });
    this.fetchDetail();
  },

  async fetchDetail() {
    this.setData({ loading: true, error: false });

    try {
      const [detailRes, relatedRes] = await Promise.all([
        api.getSalesOrderDetail(this.data.orderId).catch(() => null),
        api.getSalesOrderRelated(this.data.orderId).catch(() => null)
      ]);

      // 解析订单详情
      if (!detailRes) {
        this.setData({ loading: false, error: true, errorMsg: '未找到该销售订单' });
        return;
      }

      // 防御：兼容 {data:{d:{results:[...]}}} 和裸 {d:{results:[...]}} 两种包裹
      const dData = detailRes?.data || detailRes;
      const results = dData?.value || dData?.d?.results || [];
      const raw = Array.isArray(results) ? results[0] : (dData || {});

      if (!raw || !raw.SalesOrder) {
        this.setData({ loading: false, error: true, errorMsg: '未找到该销售订单' });
        return;
      }

      // 映射订单头部
      const order = {
        SalesOrder: raw.SalesOrder,
        SalesOrderType: raw.SalesOrderType || '—',
        SoldToParty: raw.SoldToParty || '—',
        SalesOrderDate: formatDate(raw.SalesOrderDate),
        TotalNetAmount: formatAmount(raw.TotalNetAmount, raw.TransactionCurrency),
        TransactionCurrency: raw.TransactionCurrency || 'CNY',
        OverallSDProcessStatus: raw.OverallSDProcessStatus || '—',
        statusText: this.getStatusText(raw.OverallSDProcessStatus),
        statusColor: this.getStatusColor(raw.OverallSDProcessStatus)
      };

      // 映射行项目（兼容多种 OData $expand 命名）
      const items = (raw.to_Item?.results || raw._Item || raw.Items || raw.to_Items?.results || []).map((item, idx) => ({
        ...item,
        index: idx + 1,
        SalesOrderItem: item.SalesOrderItem || idx + 1,
        Material: item.Material || '—',
        SalesOrderItemText: item.SalesOrderItemText || '',
        OrderQuantity: item.OrderQuantity ? Number(item.OrderQuantity).toFixed(0) : '—',
        OrderQuantityUnit: item.OrderQuantityUnit || '',
        NetPrice: formatAmount(item.NetPrice),
        NetAmount: formatAmount(item.NetAmount),
        ConfdDelivQtyInOrderQtyUnit: item.ConfdDelivQtyInOrderQtyUnit
          ? Number(item.ConfdDelivQtyInOrderQtyUnit).toFixed(0)
          : '0',
        deliveryPct: this.calcDeliveryPct(item.OrderQuantity, item.ConfdDelivQtyInOrderQtyUnit)
      }));

      // 映射业务伙伴（兼容多种命名）
      const partners = (raw.to_Partner?.results || raw._Partner || raw.Partners || raw.to_Partners?.results || []).map(p => ({
        PartnerFunction: p.PartnerFunction || '',
        Customer: p.Customer || '—',
        CustomerName: p.CustomerName || p.Customer || '—',
        functionLabel: this.getPartnerLabel(p.PartnerFunction)
      }));

      // 映射定价（兼容多种命名）
      const pricing = (raw.to_PricingElement?.results || raw._PricingElement || raw.PricingElements || raw.to_PricingElements?.results || []).map(pe => ({
        ConditionType: pe.ConditionType || '—',
        ConditionRate: pe.ConditionRate ? Number(pe.ConditionRate).toFixed(2) : '—',
        ConditionAmount: formatAmount(pe.ConditionAmount)
      }));

      // 解析关联单据（兼容多种包裹 + 字段命名）
      let deliveries = [], billings = [], productionOrders = [];
      const rData = relatedRes?.data || relatedRes;
      if (rData) {
        deliveries = (rData.deliveryByItem
          ? Object.values(rData.deliveryByItem).flat()
          : (rData.deliveries || rData.Deliveries || []));
        billings = (rData.billingByItem
          ? Object.values(rData.billingByItem).flat()
          : (rData.billings || rData.Billings || []));
        productionOrders = rData.productionOrders || rData.ProductionOrders || [];
      }

      this.setData({
        order, items, partners, pricing,
        deliveries, billings, productionOrders,
        loading: false
      });
    } catch (err) {
      console.error('详情加载失败:', err);
      this.setData({
        loading: false,
        error: true,
        errorMsg: '加载失败，请重试'
      });
    }
  },

  // 状态映射
  getStatusText(status) {
    const map = { 'A': '处理中', 'B': '部分完成', 'C': '已完成' };
    return map[status] || status || '—';
  },

  getStatusColor(status) {
    const map = { 'A': '#0A6ED1', 'B': '#E9730C', 'C': '#107E3E' };
    return map[status] || '#94A3B8';
  },

  // 伙伴函数映射
  getPartnerLabel(func) {
    const map = { 'AG': '售达方', 'WE': '送达方', 'RG': '付款方', 'RE': '收款方' };
    return map[func] || func || '—';
  },

  // 交货比例
  calcDeliveryPct(orderQty, confdQty) {
    const o = Number(orderQty);
    const c = Number(confdQty);
    if (!o || o === 0) return '0%';
    return Math.round((c / o) * 100) + '%';
  },

  // 定价折叠/展开
  onTogglePricing() {
    this.setData({ pricingOpen: !this.data.pricingOpen });
  },

  // 关联单据跳转
  onTapDelivery(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/outbound-delivery/detail/detail?id=${id}` });
  },

  onTapBilling(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/billing-documents/detail/detail?id=${id}` });
  },

  onTapProductionOrder(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/production-orders/detail/detail?id=${id}` });
  },

  // 重试
  onRetry() {
    this.fetchDetail();
  }
});
