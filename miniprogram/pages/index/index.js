// pages/index/index.js - 首页
const app = getApp();

Page({
  data: {
    businessModules: [
      { id: 'sales-orders', title: '销售订单', desc: '查询销售订单及行项目', icon: '📋', color: '#1E40AF' },
      { id: 'production-orders', title: '生产订单', desc: '查询生产订单及工序', icon: '⚙️', color: '#7C3AED' },
      { id: 'material-stock', title: '库存查询', desc: '查询成品库存数量', icon: '📊', color: '#059669' },
      { id: 'outbound-delivery', title: '交货单', desc: '查询外向交货单', icon: '🚚', color: '#D97706' },
      { id: 'billing-documents', title: '开票单据', desc: '查询开票单据明细', icon: '🧾', color: '#DC2626' },
      { id: 'material-documents', title: '物料凭证', desc: '查询物料凭证记录', icon: '📄', color: '#0891B2' }
    ],
    masterModules: [
      { id: 'products', title: '产品管理', desc: '查询产品主数据', icon: '📦', color: '#475569' },
      { id: 'customers', title: '客户管理', desc: '查询客户主数据', icon: '👥', color: '#475569' }
    ],
    loading: false
  },

  onLoad() {
    app.checkNetwork();
  },

  // 跳转到模块页面
  navigateToModule(e) {
    const moduleId = e.currentTarget.dataset.id;
    // tabBar页面用switchTab，其他用navigateTo
    const tabBarPages = ['index', 'sales-orders', 'material-stock', 'products'];
    if (tabBarPages.indexOf(moduleId) >= 0) {
      wx.switchTab({
        url: `/pages/${moduleId}/${moduleId}`
      });
    } else {
      wx.navigateTo({
        url: `/pages/${moduleId}/${moduleId}`
      });
    }
  },

  onPullDownRefresh() {
    wx.stopPullDownRefresh();
  }
});
