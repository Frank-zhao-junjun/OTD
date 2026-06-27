// pages/billing-documents/detail/detail.js
const { api, formatDate, formatAmount } = require('../../../utils/api');

Page({
  data: {
    billingId: '',
    loading: true,
    error: false,
    errorMsg: '',
    header: null,
    items: [],
    salesOrder: null,
    deliveryDoc: null
  },

  onLoad(options) {
    const id = options.id || '';
    if (!id) {
      this.setData({ loading: false, error: true, errorMsg: '缺少开票单号参数' });
      return;
    }
    this.setData({ billingId: id });
    this.fetchDetail();
  },

  async fetchDetail() {
    this.setData({ loading: true, error: false });
    try {
      const [hRes, iRes] = await Promise.all([
        api.getBillingDocumentDetail(this.data.billingId).catch(() => null),
        api.getBillingDocumentItems(this.data.billingId).catch(() => null)
      ]);

      // 防御：兼容 {data:{d:{results:[...]}}} 和裸 {d:{results:[...]}} 两种包裹
      const hDataWrap = hRes?.data || hRes;
      const hData = hDataWrap?.d?.results || hDataWrap?.value || [];
      const raw = Array.isArray(hData) ? hData[0] : (hRes?.data || hRes || {});
      if (!raw || !raw.BillingDocument) {
        this.setData({ loading: false, error: true, errorMsg: '未找到该开票单据' });
        return;
      }

      const header = {
        BillingDocument: raw.BillingDocument,
        BillingDocumentType: raw.BillingDocumentType || 'F2',
        SoldToParty: raw.SoldToParty || '—',
        BillingDocumentDate: formatDate(raw.BillingDocumentDate),
        TotalNetAmount: formatAmount(raw.TotalNetAmount, raw.TransactionCurrency || 'CNY'),
        TransactionCurrency: raw.TransactionCurrency || 'CNY',
        BillingDocumentStatus: raw.BillingDocumentStatus || raw.OverallBillingStatus || 'C',
        statusText: raw.BillingDocumentStatus === 'C' || raw.OverallBillingStatus === 'C' ? '已过账' : (raw.BillingDocumentStatus || '—'),
        statusColor: '#107E3E',
        ReferenceSDDocument: raw.ReferenceSDDocument || raw.SalesDocument || raw.SalesOrder || '',
        ReferenceDeliveryDocument: raw.ReferenceDeliveryDocument || raw.DeliveryDocument || raw.OutboundDelivery || '',
      };

      // 解析行项目（防御：兼容双包裹）
      const iDataWrap = iRes?.data || iRes;
      const iData = iDataWrap?.d?.results || iDataWrap?.value || [];
      const items = (Array.isArray(iData) ? iData : []).map(item => ({
        BillingDocumentItem: item.BillingDocumentItem || '—',
        Material: item.Material || '—',
        BillingDocumentItemText: item.BillingDocumentItemText || item.MaterialDescription || '',
        NetAmount: formatAmount(item.NetAmount),
        BillingQuantity: item.BillingQuantity ? Number(item.BillingQuantity).toFixed(0) : '—',
        BillingQuantityUnit: item.BillingQuantityUnit || ''
      }));

      // 关联单据
      let salesOrder = null, deliveryDoc = null;
      if (header.ReferenceSDDocument) {
        salesOrder = { SalesOrder: header.ReferenceSDDocument };
      }
      if (header.ReferenceDeliveryDocument) {
        deliveryDoc = { DeliveryDocument: header.ReferenceDeliveryDocument };
      }

      this.setData({ header, items, salesOrder, deliveryDoc, loading: false });
    } catch (err) {
      console.error('开票详情加载失败:', err);
      this.setData({ loading: false, error: true, errorMsg: '加载失败，请重试' });
    }
  },

  onTapSalesOrder() {
    if (this.data.salesOrder) {
      wx.navigateTo({ url: `/pages/sales-orders/detail/detail?id=${this.data.salesOrder.SalesOrder}` });
    }
  },

  onTapDelivery() {
    if (this.data.deliveryDoc) {
      wx.navigateTo({ url: `/pages/outbound-delivery/detail/detail?id=${this.data.deliveryDoc.DeliveryDocument}` });
    }
  },

  onRetry() { this.fetchDetail(); }
});
