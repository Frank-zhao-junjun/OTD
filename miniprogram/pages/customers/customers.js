// pages/customers/customers.js
const { api } = require('../../utils/api');
const { getViewMode, setViewMode } = require('../../utils/view-mode');

Page({
  data: {
    customers: [],
    loading: false,
    viewMode: 'card',
    searchQuery: '',
    totalCount: 0,
    page: 1,
    pageSize: 20
  },

  onLoad() { this.setData({ viewMode: getViewMode('customers') }); this.fetchCustomers(); },

  onViewModeChange(e) {
    const mode = e.detail.mode;
    this.setData({ viewMode: mode });
    setViewMode('customers', mode);
  },

  async fetchCustomers() {
    this.setData({ loading: true });
    try {
      const params = { top: this.data.pageSize, skip: (this.data.page - 1) * this.data.pageSize };
      if (this.data.searchQuery) {
        const q = this.data.searchQuery;
        params.filter = `Customer eq '${q}' or substringof('${q}',CustomerName)`;
      }

      const result = await api.getCustomers(params);
      this.setData({ customers: result.data || [], totalCount: result.count || 0, loading: false });
    } catch (error) { this.setData({ loading: false }); }
  },

  onSearchInput(e) { this.setData({ searchQuery: e.detail.value }); },
  onSearch() { this.setData({ page: 1 }); this.fetchCustomers(); },
  onClear() { this.setData({ searchQuery: '', page: 1 }); this.fetchCustomers(); }
});
