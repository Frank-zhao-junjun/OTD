// pages/production-orders/production-orders.js
const { api } = require('../../utils/api');

Page({
  data: {
    orders: [],
    loading: false,
    searchQuery: '',
    plantFilter: '1010',
    totalCount: 0,
    page: 1,
    pageSize: 20
  },

  onLoad() { this.fetchOrders(); },

  async fetchOrders() {
    this.setData({ loading: true });
    try {
      const params = {
        top: this.data.pageSize,
        skip: (this.data.page - 1) * this.data.pageSize
      };

      let filters = [];
      if (this.data.plantFilter) filters.push(`ManufacturingOrder eq '${this.data.plantFilter}' or ProductionPlant eq '${this.data.plantFilter}'`);
      if (this.data.searchQuery) {
        const q = this.data.searchQuery;
        filters.push(`ManufacturingOrder eq '${q}' or Material eq '${q}'`);
      }
      if (filters.length) params.filter = filters.join(' and ');

      const result = await api.getProductionOrders(params);
      const orders = (result.data || []).map(o => ({
        ...o,
        MfgOrderStartDate: this.formatDate(o.MfgOrderStartDate),
        MfgOrderEndDate: this.formatDate(o.MfgOrderEndDate),
        StatusText: this.getOrderStatus(o.MfgOrderStatus)
      }));

      this.setData({ orders, totalCount: result.count || 0, loading: false });
    } catch (error) {
      this.setData({ loading: false });
    }
  },

  formatDate(v) {
    if (!v) return '-';
    return v.replace(/\/Date\((\d+)\)\//, (m, ts) => {
      const d = new Date(parseInt(ts));
      return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    });
  },

  getOrderStatus(status) {
    const map = { 'CRTD': '已创建', 'REL': '已释放', 'PCNF': '部分确认', 'CNF': '已确认', 'DLV': '已交货', 'TECO': '技术完成', 'CLSD': '已关闭' };
    return map[status] || status || '-';
  },

  onSearchInput(e) { this.setData({ searchQuery: e.detail.value }); },
  onSearch() { this.setData({ page: 1 }); this.fetchOrders(); },
  onClear() { this.setData({ searchQuery: '', page: 1 }); this.fetchOrders(); },

  onViewDetail(e) {
    wx.showModal({ title: '生产订单 ' + e.currentTarget.dataset.id, content: '详情请访问Web端查看', showCancel: false });
  }
});
