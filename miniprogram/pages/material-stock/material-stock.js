// pages/material-stock/material-stock.js
const { api } = require('../../utils/api');
const app = getApp();

Page({
  data: {
    stocks: [],
    summary: [],
    loading: false,
    searchQuery: '',
    plant: '1010',
    storageLocation: '1003',
    viewMode: 'summary',
    totalCount: 0,
    page: 1,
    pageSize: 50
  },

  onLoad() { this.fetchStock(); },

  async fetchStock() {
    this.setData({ loading: true });
    try {
      const params = {
        top: this.data.pageSize,
        skip: (this.data.page - 1) * this.data.pageSize
      };

      let filters = [];
      if (this.data.plant) filters.push(`Plant eq '${this.data.plant}'`);
      if (this.data.storageLocation) filters.push(`StorageLocation eq '${this.data.storageLocation}'`);
      if (this.data.searchQuery) filters.push("substringof('" + this.data.searchQuery + "',Material)");
      if (filters.length) params.filter = filters.join(' and ');

      const result = await api.getMaterialStock(params);
      const stocks = result.data || [];

      // 按物料汇总
      const summaryMap = {};
      stocks.forEach(s => {
        if (!summaryMap[s.Material]) {
          summaryMap[s.Material] = { Material: s.Material, MaterialName: s.MaterialName || '-', batches: 0, totalQty: 0, unit: s.BaseUnit || '' };
        }
        summaryMap[s.Material].batches++;
        summaryMap[s.Material].totalQty += parseFloat(s.MatlWrhsStkQtyInMatlBaseUnit || '0');
        summaryMap[s.Material].unit = s.BaseUnit || summaryMap[s.Material].unit;
      });
      const summary = Object.values(summaryMap).sort((a, b) => b.totalQty - a.totalQty);

      this.setData({ stocks, summary, totalCount: result.count || 0, loading: false });
    } catch (error) {
      this.setData({ loading: false });
    }
  },

  getStockTypeLabel(type) {
    const map = { '01': '非限制', '02': '质检', '03': '冻结' };
    return map[type] || type || '-';
  },

  onSearchInput(e) { this.setData({ searchQuery: e.detail.value }); },
  onSearch() { this.setData({ page: 1 }); this.fetchStock(); },
  onClear() { this.setData({ searchQuery: '', page: 1 }); this.fetchStock(); },

  switchView(e) {
    this.setData({ viewMode: e.currentTarget.dataset.mode });
  }
});
