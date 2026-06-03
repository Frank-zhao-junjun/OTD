// pages/customers/customers.js
const { api } = require('../../utils/api');

Page({
  data: {
    customers: [],
    loading: false,
    searchQuery: '',
    totalCount: 0,
    page: 1,
    pageSize: 20
  },

  onLoad() { this.fetchCustomers(); },

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
