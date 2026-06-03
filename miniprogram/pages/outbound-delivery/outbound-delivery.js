// pages/outbound-delivery/outbound-delivery.js
const { api } = require('../../utils/api');

Page({
  data: {
    deliveries: [],
    loading: false,
    searchQuery: '',
    totalCount: 0,
    page: 1,
    pageSize: 20
  },

  onLoad() { this.fetchDeliveries(); },

  async fetchDeliveries() {
    this.setData({ loading: true });
    try {
      const params = { top: this.data.pageSize, skip: (this.data.page - 1) * this.data.pageSize };
      let filters = ["GoodsMovementStatus eq 'C'"];
      if (this.data.searchQuery) {
        const q = this.data.searchQuery;
        filters.push(`(DeliveryDocument eq '${q}' or SoldToParty eq '${q}')`);
      }
      params.filter = filters.join(' and ');

      const result = await api.getOutboundDeliveries(params);
      const deliveries = (result.data || []).map(d => ({
        ...d,
        DeliveryDate: this.formatDate(d.ActualGoodsMovementDate || d.PlannedGoodsIssueDate),
        StatusText: d.OverallGoodsMovementStatus === 'C' ? '已发货' : d.OverallGoodsMovementStatus === 'A' ? '待处理' : '部分发货'
      }));

      this.setData({ deliveries, totalCount: result.count || 0, loading: false });
    } catch (error) { this.setData({ loading: false }); }
  },

  formatDate(v) {
    if (!v) return '-';
    return v.replace(/\/Date\((\d+)\)\//, (m, ts) => {
      const d = new Date(parseInt(ts));
      return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    });
  },

  onSearchInput(e) { this.setData({ searchQuery: e.detail.value }); },
  onSearch() { this.setData({ page: 1 }); this.fetchDeliveries(); },
  onClear() { this.setData({ searchQuery: '', page: 1 }); this.fetchDeliveries(); }
});
