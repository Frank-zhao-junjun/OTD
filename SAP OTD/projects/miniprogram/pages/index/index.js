// pages/index/index.js - 首页 Dashboard
const { api } = require('../../utils/api');

Page({
  data: {
    // KPI
    kpis: [
      { key: 'sales', label: '销售订单', value: '—', unit: '张', color: 'blue', icon: '单' },
      { key: 'production', label: '生产订单', value: '—', unit: '张', color: 'green', icon: '工' },
      { key: 'delivery', label: '待发货', value: '—', unit: '单', color: 'orange', icon: '交' },
      { key: 'stock', label: '库存条目', value: '—', unit: '条', color: 'purple', icon: '库' }
    ],
    activities: [],
    loading: true,

    // 模块入口
    businessModules: [
      { id: 'sales-orders', title: '销售订单', desc: 'Sales Orders', icon: '单', color: '#0A6ED1' },
      { id: 'production-orders', title: '生产订单', desc: 'Production Orders', icon: '工', color: '#107E3E' },
      { id: 'outbound-delivery', title: '交货单', desc: 'Outbound Delivery', icon: '交', color: '#E9730C' },
      { id: 'billing-documents', title: '开票单据', desc: 'Billing Documents', icon: '票', color: '#6D28D9' }
    ],
    masterModules: [
      { id: 'material-stock', title: '库存', desc: 'Material Stock', icon: '库', color: '#7C3AED' },
      { id: 'material-documents', title: '凭证', desc: 'Material Docs', icon: '凭', color: '#0891B2' },
      { id: 'products', title: '产品', desc: 'Products', icon: '品', color: '#DB2777' },
      { id: 'customers', title: '客户', desc: 'Customers', icon: '客', color: '#059669' }
    ]
  },

  onLoad() {
    const app = getApp();
    if (!app.isLoggedIn()) {
      wx.reLaunch({ url: '/pages/login/login' });
      return;
    }
    this.fetchDashboard();
  },

  onShow() {
    if (getApp().isLoggedIn()) {
      this.fetchDashboard();
    }
  },

  onPullDownRefresh() {
    this.fetchDashboard().finally(() => {
      wx.stopPullDownRefresh();
    });
  },

  // ── 获取 Dashboard 数据 ────────────────────────────────

  async fetchDashboard() {
    this.setData({ loading: true });
    try {
      const res = await api.getDashboard();
      if (res.success && res.data) {
        const serverKpis = res.data.kpis || [];
        this.setData({
          kpis: this.data.kpis.map(kpi => {
            const match = serverKpis.find(k => k.key === kpi.key);
            if (match) {
              return { ...kpi, value: String(match.value), unit: match.unit || kpi.unit };
            }
            return kpi;
          }),
          activities: res.data.activities || []
        });
      }
    } catch (err) {
      console.error('Dashboard 加载失败:', err);
    } finally {
      this.setData({ loading: false });
    }
  },

  // ── 搜索（预留入口，后续 US-MP-05 实现） ──────────────

  onSearchTap() {
    wx.navigateTo({ url: '/pages/search/search' });
  },

  // ── 模块导航 ──────────────────────────────────────────

  navigateToModule(e) {
    const moduleId = e.currentTarget.dataset.id;
    const tabBarPages = ['index', 'sales-orders', 'material-stock', 'products'];
    if (tabBarPages.indexOf(moduleId) >= 0) {
      wx.switchTab({ url: `/pages/${moduleId}/${moduleId}` });
    } else {
      wx.navigateTo({ url: `/pages/${moduleId}/${moduleId}` });
    }
  },

  // ── KPI 卡片点击跳转 ──────────────────────────────────

  onKpiTap(e) {
    const key = e.currentTarget.dataset.key;
    const routeMap = {
      sales: '/pages/sales-orders/sales-orders',
      production: '/pages/production-orders/production-orders',
      delivery: '/pages/outbound-delivery/outbound-delivery',
      stock: '/pages/material-stock/material-stock'
    };
    const url = routeMap[key];
    if (!url) return;
    const tabBarPages = ['/pages/sales-orders/sales-orders', '/pages/material-stock/material-stock'];
    if (tabBarPages.includes(url)) {
      wx.switchTab({ url });
    } else {
      wx.navigateTo({ url });
    }
  }
});
