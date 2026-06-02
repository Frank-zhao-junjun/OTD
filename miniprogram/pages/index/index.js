// pages/index/index.js - 首页
const app = getApp();

Page({
  data: {
    modules: [
      { id: 'products', title: '产品管理', desc: '查询产品主数据', icon: '📦', count: 0 },
      { id: 'sales-orders', title: '销售订单', desc: '查询销售订单', icon: '📝', count: 0 },
      { id: 'production-orders', title: '生产订单', desc: '查询生产订单', icon: '🏭', count: 0 },
      { id: 'material-stock', title: '库存查询', desc: '查询物料库存', icon: '📊', count: 0 },
      { id: 'customers', title: '客户管理', desc: '查询客户信息', icon: '👥', count: 0 },
      { id: 'outbound-delivery', title: '交货单', desc: '查询交货单', icon: '🚚', count: 0 }
    ],
    loading: false
  },

  onLoad() {
    app.checkNetwork();
  },

  // 跳转到模块页面
  navigateToModule(e) {
    const moduleId = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/${moduleId}/${moduleId}`
    });
  },

  // 下拉刷新
  onPullDownRefresh() {
    wx.stopPullDownRefresh();
  }
});