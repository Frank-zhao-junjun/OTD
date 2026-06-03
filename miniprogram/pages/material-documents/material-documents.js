// pages/material-documents/material-documents.js
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
        params.filter = `MaterialDocument eq '${q}' or Material eq '${q}'`;
      }

      const result = await api.getMaterialDocuments(params);
      const documents = (result.data || []).map(d => ({
        ...d,
        DocumentDate: this.formatDate(d.DocumentDate),
        PostingDate: this.formatDate(d.PostingDate),
        MoveTypeText: this.getMoveTypeText(d.GoodsMovementCode)
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

  getMoveTypeText(code) {
    const map = { '101': '采购收货', '102': '采购退货', '261': '生产发料', '262': '生产退料', '601': '销售发货', '602': '销售退货', '311': '库存转储', '312': '转储取消' };
    return map[code] || code || '-';
  },

  onSearchInput(e) { this.setData({ searchQuery: e.detail.value }); },
  onSearch() { this.setData({ page: 1 }); this.fetchDocuments(); },
  onClear() { this.setData({ searchQuery: '', page: 1 }); this.fetchDocuments(); }
});
