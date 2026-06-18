// pages/sales-orders/sales-orders.js - 销售订单查询
const { api } = require('../../utils/api');
const { getViewMode, setViewMode } = require('../../utils/view-mode');
const app = getApp();

Page({
  data: {
    orders: [],
    loading: false,
    searchQuery: '',
    totalCount: 0,
    page: 1,
    pageSize: 20,
    viewMode: 'card'
  },

  onLoad() {
    this.setData({ viewMode: getViewMode('sales-orders') });
    this.fetchOrders();
  },

  onViewModeChange(e) {
    const mode = e.detail.mode;
    this.setData({ viewMode: mode });
    setViewMode('sales-orders', mode);
  },

  async fetchOrders() {
    this.setData({ loading: true });
    try {
      const defaults = app.globalData.salesOrderDefaults;
      const params = {
        top: this.data.pageSize,
        skip: (this.data.page - 1) * this.data.pageSize
      };

      // 构建筛选条件
      let filters = [
        `SalesOrderType eq '${defaults.SalesOrderType}'`,
        `SalesOrganization eq '${defaults.SalesOrganization}'`,
        `DistributionChannel eq '${defaults.DistributionChannel}'`,
        `OrganizationDivision eq '${defaults.OrganizationDivision}'`
      ];

      if (this.data.searchQuery) {
        const q = this.data.searchQuery;
        filters.push(`(SalesOrder eq '${q}' or SoldToParty eq '${q}' or PurchaseOrderByCustomer eq '${q}')`);
      }
      params.filter = filters.join(' and ');

      const result = await api.getSalesOrders(params);
      const orders = (result.data || []).map(order => ({
        ...order,
        SalesOrderDate: order.SalesOrderDate ? order.SalesOrderDate.replace(/\/Date\((\d+)\)\//, (m, ts) => {
          const d = new Date(parseInt(ts));
          return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
        }) : '-',
        TotalNetAmount: parseFloat(order.TotalNetAmount || '0').toFixed(2),
        OverallSDProcessStatus_text: this.getStatusText(order.OverallSDProcessStatus)
      }));

      this.setData({
        orders,
        totalCount: result.count || 0,
        loading: false
      });
    } catch (error) {
      this.setData({ loading: false });
      console.error('查询失败:', error);
    }
  },

  getStatusText(status) {
    const map = { 'A': '尚未处理', 'B': '部分处理', 'C': '已完成' };
    return map[status] || status || '-';
  },

  getStatusColor(status) {
    const map = { 'A': '#F59E0B', 'B': '#3B82F6', 'C': '#22C55E' };
    return map[status] || '#94A3B8';
  },

  onSearchInput(e) {
    this.setData({ searchQuery: e.detail.value });
  },

  onSearch() {
    this.setData({ page: 1 });
    this.fetchOrders();
  },

  onClear() {
    this.setData({ searchQuery: '', page: 1 });
    this.fetchOrders();
  },

  onViewDetail(e) {
    const orderId = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/sales-orders/detail/detail?id=${orderId}`
    });
  },

  onLoadMore() {
    if (this.data.orders.length < this.data.totalCount) {
      this.setData({ page: this.data.page + 1 });
      this.fetchOrders();
    }
  }
});
