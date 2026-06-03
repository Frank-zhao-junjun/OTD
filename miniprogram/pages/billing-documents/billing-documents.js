// pages/billing-documents/billing-documents.js
const { api } = require('../../utils/api');

Page({
  data: {
    documents: [],
    loading: false,
    searchQuery: '',
    totalCount: 0,
    page: 1,
    pageSize: 20
  },

  onLoad() { this.fetchDocuments(); },

  async fetchDocuments() {
    this.setData({ loading: true });
    try {
      const params = { top: this.data.pageSize, skip: (this.data.page - 1) * this.data.pageSize };
      if (this.data.searchQuery) {
        const q = this.data.searchQuery;
        params.filter = `BillingDocument eq '${q}' or SoldToParty eq '${q}'`;
      }

      const result = await api.getBillingDocuments(params);
      const documents = (result.data || []).map(d => ({
        ...d,
        BillingDocumentDate: this.formatDate(d.BillingDocumentDate),
        TotalNetAmount: parseFloat(d.TotalNetAmount || '0').toFixed(2),
        TotalTaxAmount: parseFloat(d.TotalTaxAmount || '0').toFixed(2)
      }));

      this.setData({ documents, totalCount: result.count || 0, loading: false });
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
  onSearch() { this.setData({ page: 1 }); this.fetchDocuments(); },
  onClear() { this.setData({ searchQuery: '', page: 1 }); this.fetchDocuments(); }
});
