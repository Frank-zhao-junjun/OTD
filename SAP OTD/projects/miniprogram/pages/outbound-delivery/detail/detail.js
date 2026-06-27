// pages/outbound-delivery/detail/detail.js
const { api, formatDate } = require('../../../utils/api');

Page({
  data: {
    deliveryId: '',
    loading: true,
    error: false,
    errorMsg: '',
    header: null,
    items: [],
    salesOrder: null
  },

  onLoad(options) {
    const id = options.id || '';
    if (!id) {
      this.setData({ loading: false, error: true, errorMsg: '缺少交货单号参数' });
      return;
    }
    this.setData({ deliveryId: id });
    this.fetchDetail();
  },

  async fetchDetail() {
    this.setData({ loading: true, error: false });
    try {
      const [hRes, iRes] = await Promise.all([
        api.getOutboundDeliveryDetail(this.data.deliveryId).catch(() => null),
        api.getOutboundDeliveryItems(this.data.deliveryId).catch(() => null)
      ]);

      // 解析头部（防御：兼容 {data:{d:...}} 和裸 {d:...} 包裹）
      const hDataWrap = hRes?.data || hRes;
      const hData = hDataWrap?.d?.results || hDataWrap?.value || [];
      const raw = Array.isArray(hData) ? hData[0] : (hRes?.data || hRes || {});
      if (!raw || !raw.DeliveryDocument) {
        this.setData({ loading: false, error: true, errorMsg: '未找到该交货单' });
        return;
      }

      const header = {
        DeliveryDocument: raw.DeliveryDocument,
        DeliveryDocumentType: raw.DeliveryDocumentType || 'LF',
        SoldToParty: raw.SoldToParty || '—',
        DeliveryDate: formatDate(raw.ActualGoodsMovementDate || raw.PlannedGoodsIssueDate),
        OverallGoodsMovementStatus: raw.OverallGoodsMovementStatus || '—',
        statusText: raw.OverallGoodsMovementStatus === 'C' ? '已过账' : (raw.OverallGoodsMovementStatus === 'A' ? '待处理' : raw.OverallGoodsMovementStatus || '—'),
        statusColor: raw.OverallGoodsMovementStatus === 'C' ? '#107E3E' : '#0A6ED1',
        SalesOrganization: raw.SalesOrganization || '—',
        ReferenceSDDocument: raw.ReferenceSDDocument || raw.SalesDocument || raw.SalesOrder || '',
      };

      // 解析行项目（防御：兼容双包裹）
      const iDataWrap = iRes?.data || iRes;
      const iData = iDataWrap?.d?.results || iDataWrap?.value || [];
      const items = (Array.isArray(iData) ? iData : []).map(item => ({
        DeliveryDocumentItem: item.DeliveryDocumentItem || '—',
        Material: item.Material || '—',
        DeliveryDocumentItemText: item.DeliveryDocumentItemText || item.MaterialDescription || '',
        ActualDeliveryQuantity: item.ActualDeliveryQuantity ? Number(item.ActualDeliveryQuantity).toFixed(0) : '—',
        DeliveryQuantityUnit: item.DeliveryQuantityUnit || '',
        PlannedDeliveryQuantity: item.PlannedDeliveryQuantity ? Number(item.PlannedDeliveryQuantity).toFixed(0) : '0',
        ActualGoodsMovementDate: formatDate(item.ActualGoodsMovementDate || item.PostingDate),
        Batch: item.Batch || '—',
        StorageLocation: item.StorageLocation || '—'
      }));

      // 关联销售订单
      let salesOrder = null;
      if (header.ReferenceSDDocument) {
        salesOrder = { SalesOrder: header.ReferenceSDDocument };
      }

      this.setData({ header, items, salesOrder, loading: false });
    } catch (err) {
      console.error('交货单详情加载失败:', err);
      this.setData({ loading: false, error: true, errorMsg: '加载失败，请重试' });
    }
  },

  onTapSalesOrder() {
    if (this.data.salesOrder) {
      wx.navigateTo({ url: `/pages/sales-orders/detail/detail?id=${this.data.salesOrder.SalesOrder}` });
    }
  },

  onRetry() { this.fetchDetail(); }
});
