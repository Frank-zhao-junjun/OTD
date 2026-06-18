// pages/production-orders/detail/detail.js
const { api, formatAmount, formatDate } = require('../../../utils/api');

Page({
  data: {
    orderId: '',
    loading: true,
    error: false,
    errorMsg: '',
    order: null,
    operations: [],
    components: [],
    kpis: []
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
      const res = await api.getProductionOrderDetail(this.data.orderId);
      if (!res) {
        this.setData({ loading: false, error: true, errorMsg: '未找到该生产订单' });
        return;
      }

      // 防御：兼容 {data:{d:{results:[...]}}} 和裸 {d:{results:[...]}} 两种包裹
      const dData = res?.data || res;
      const results = dData?.value || dData?.d?.results || [];
      const raw = Array.isArray(results) ? results[0] : (dData || {});

      // 兼容不同字段名格式
      const poNumber = raw.ProductionOrder || raw.ManufacturingOrder || '';
      if (!poNumber) {
        this.setData({ loading: false, error: true, errorMsg: '未找到该生产订单' });
        return;
      }

      // 映射订单头部
      const order = {
        ProductionOrder: poNumber,
        ProductionOrderType: raw.ProductionOrderType || raw.MfgOrderType || '—',
        Material: raw.Material || '—',
        ProductionPlant: raw.ProductionPlant || raw.ManufacturingPlant || '—',
        ProductGroup: raw.ProductGroup || '—',
        MfgOrderStatus: raw.MfgOrderStatus || raw.ProductionOrderStatus || '—',
        statusText: this.getStatusText(raw.MfgOrderStatus || raw.ProductionOrderStatus),
        statusColor: this.getStatusColor(raw.MfgOrderStatus || raw.ProductionOrderStatus),
        MfgOrderPlannedTotalQty: raw.MfgOrderPlannedTotalQty
          ? Number(raw.MfgOrderPlannedTotalQty).toFixed(0)
          : '—',
        MfgOrderActualDeliveredQty: raw.MfgOrderActualDeliveredQty
          ? Number(raw.MfgOrderActualDeliveredQty).toFixed(0)
          : '—',
        OrderUnit: raw.OrderUnit || raw.ProductionUnit || ''
      };

      // 映射工序（兼容多种 OData $expand 命名）
      const operations = (raw.to_Operation?.results || raw._Operation || raw.Operations || raw.to_Operations?.results || []).map(op => {
        const plannedQty = Number(op.OpPlannedTotalQuantity || 0);
        const yieldQty = Number(op.OpConfirmedYieldQuantity || 0);
        const scrapQty = Number(op.ScrapQuantity || op.OpScrapQuantity || 0);
        const progress = plannedQty > 0 ? Math.round((yieldQty / plannedQty) * 100) : 0;

        return {
          ProductionOrderOperation: op.ProductionOrderOperation || op.OperationNumber || '—',
          OperationDescription: op.OperationDescription || op.OperationShortText || '',
          WorkCenter: op.WorkCenter || op.OperationWorkCenter || '—',
          OperationStatus: op.OperationStatus || '—',
          OpPlannedStartDate: formatDate(op.OpPlannedStartDate),
          OpActualStartDate: formatDate(op.OpActualStartDate),
          OpPlannedEndDate: formatDate(op.OpPlannedEndDate),
          OpActualEndDate: formatDate(op.OpActualEndDate),
          plannedQty: plannedQty.toFixed(0),
          yieldQty: yieldQty.toFixed(0),
          scrapQty: scrapQty.toFixed(0),
          progress: progress,
          progressColor: progress >= 100 ? '#107E3E' : '#E9730C'
        };
      });

      // 映射组件（兼容多种命名 + 可能嵌套在 results 中）
      const components = (raw.to_Component?.results || raw._Component || raw.Components || raw.to_Components?.results || []).map(comp => {
        const required = Number(comp.RequiredQuantity || 0);
        const withdrawn = Number(comp.WithdrawnQuantity || 0);
        let kittingStatus, kittingColor;
        if (withdrawn >= required && required > 0) {
          kittingStatus = '已齐套';
          kittingColor = '#107E3E';
        } else if (withdrawn > 0) {
          kittingStatus = '部分齐套';
          kittingColor = '#E9730C';
        } else {
          kittingStatus = '待提货';
          kittingColor = '#94A3B8';
        }

        return {
          Material: comp.Material || '—',
          MaterialDescription: comp.MaterialDescription || comp.MaterialName || '',
          RequiredQuantity: required.toFixed(0),
          WithdrawnQuantity: withdrawn.toFixed(0),
          EntrySAPUnit: comp.EntrySAPUnit || comp.UnitOfMeasure || '',
          StorageLocation: comp.StorageLocation || '—',
          ProductionOrderOperation: comp.ProductionOrderOperation || '—',
          kittingStatus,
          kittingColor
        };
      });

      // KPI
      const kpis = [
        { label: '计划量', value: order.MfgOrderPlannedTotalQty, unit: order.OrderUnit, color: 'blue' },
        { label: '实际量', value: order.MfgOrderActualDeliveredQty, unit: order.OrderUnit, color: 'green' },
        { label: '工序数', value: String(operations.length), unit: '道', color: 'orange' },
        { label: '组件数', value: String(components.length), unit: '个', color: 'purple' }
      ];

      this.setData({ order, operations, components, kpis, loading: false });
    } catch (err) {
      console.error('生产订单详情加载失败:', err);
      this.setData({ loading: false, error: true, errorMsg: '加载失败，请重试' });
    }
  },

  getStatusText(status) {
    const map = {
      'CRTD': '已创建', 'REL': '已释放', 'PCNF': '部分确认',
      'CNF': '已确认', 'DLV': '已交货', 'TECO': '技术完成', 'CLSD': '已关闭'
    };
    return map[status] || status || '—';
  },

  getStatusColor(status) {
    const map = {
      'CRTD': '#94A3B8', 'REL': '#0A6ED1', 'PCNF': '#E9730C',
      'CNF': '#0A6ED1', 'DLV': '#107E3E', 'TECO': '#107E3E', 'CLSD': '#107E3E'
    };
    return map[status] || '#94A3B8';
  },

  onRetry() {
    this.fetchDetail();
  }
});
