// pages/search/search.js
const { api } = require('../../utils/api');

Page({
  data: {
    query: '',
    results: [],
    history: [],
    searching: false,
    noResult: false,
    focused: true
  },

  onLoad() {
    this.loadHistory();
  },

  // ── 搜索历史 ──────────────────────────────────────────

  loadHistory() {
    try {
      const history = wx.getStorageSync('searchHistory') || [];
      this.setData({ history });
    } catch (e) {
      this.setData({ history: [] });
    }
  },

  saveHistory(keyword) {
    if (!keyword.trim()) return;
    let history = this.data.history.filter(h => h !== keyword);
    history.unshift(keyword);
    if (history.length > 10) history = history.slice(0, 10);
    this.setData({ history });
    wx.setStorageSync('searchHistory', history);
  },

  removeHistory(e) {
    const keyword = e.currentTarget.dataset.keyword;
    const history = this.data.history.filter(h => h !== keyword);
    this.setData({ history });
    wx.setStorageSync('searchHistory', history);
  },

  clearHistory() {
    this.setData({ history: [] });
    wx.removeStorageSync('searchHistory');
  },

  // ── 输入与防抖 ────────────────────────────────────────

  _timer: null,

  onInput(e) {
    const query = e.detail.value;
    this.setData({ query, focused: false });

    if (this._timer) clearTimeout(this._timer);

    if (!query.trim()) {
      this.setData({ results: [], noResult: false });
      return;
    }

    this._timer = setTimeout(() => {
      this.doSearch(query.trim());
    }, 300);
  },

  onFocus() {
    this.setData({ focused: true });
  },

  // ── 搜索 ──────────────────────────────────────────────

  async doSearch(q) {
    this.setData({ searching: true, noResult: false });
    try {
      const res = await api.search(q);
      if (res.success && res.data?.results) {
        const results = res.data.results.filter(g => g.items && g.items.length > 0);
        this.setData({
          results,
          noResult: results.length === 0
        });
        // 搜索成功后存入历史
        if (results.length > 0) {
          this.saveHistory(q);
        }
      } else {
        this.setData({ results: [], noResult: true });
      }
    } catch (err) {
      console.error('搜索失败:', err);
      this.setData({ results: [], noResult: true });
    } finally {
      this.setData({ searching: false });
    }
  },

  // ── 点击历史 ──────────────────────────────────────────

  onTapHistory(e) {
    const keyword = e.currentTarget.dataset.keyword;
    this.setData({ query: keyword, focused: false });
    this.doSearch(keyword);
  },

  // ── 点击结果 ──────────────────────────────────────────

  onTapResult(e) {
    const { path } = e.currentTarget.dataset;
    if (!path) return;

    // 保存搜索历史
    if (this.data.query.trim()) {
      this.saveHistory(this.data.query.trim());
    }

    // 路由映射
    const salesMatch = path.match(/^\/sales-orders\/(.+)/);
    if (salesMatch) {
      wx.navigateTo({ url: `/pages/sales-orders/detail/detail?id=${salesMatch[1]}` });
      return;
    }

    const prodMatch = path.match(/^\/production-orders\/(.+)/);
    if (prodMatch) {
      wx.navigateTo({ url: `/pages/production-orders/detail/detail?id=${prodMatch[1]}` });
      return;
    }

    // 交货单
    const dlvMatch = path.match(/^\/outbound-delivery\/(.+)/);
    if (dlvMatch) {
      wx.navigateTo({ url: `/pages/outbound-delivery/detail/detail?id=${dlvMatch[1]}` });
      return;
    }

    // 开票单
    const billingMatch = path.match(/^\/billing-documents\/(.+)/);
    if (billingMatch) {
      wx.navigateTo({ url: `/pages/billing-documents/detail/detail?id=${billingMatch[1]}` });
      return;
    }

    // 其他实体暂未实现详情页
    wx.showToast({ title: '详情即将上线', icon: 'none' });
  },

  // ── 取消 ──────────────────────────────────────────────

  onCancel() {
    wx.navigateBack();
  },

  // ── 清除输入 ──────────────────────────────────────────

  onClear() {
    this.setData({ query: '', results: [], noResult: false, focused: true });
  }
});
