// pages/products/products.js - 产品查询页面
const { api } = require('../../utils/api');

Page({
  data: {
    products: [],
    loading: false,
    searchQuery: '',
    productGroup: '',
    totalCount: 0,
    page: 1,
    pageSize: 20
  },

  onLoad() {
    this.fetchProducts();
  },

  // 获取产品列表
  async fetchProducts() {
    this.setData({ loading: true });
    
    try {
      const params = {
        top: this.data.pageSize,
        skip: (this.data.page - 1) * this.data.pageSize
      };
      
      // 添加搜索条件
      if (this.data.searchQuery) {
        params.filter = `substringof('${this.data.searchQuery}',Product)`;
      }
      if (this.data.productGroup) {
        params.filter = params.filter 
          ? `${params.filter} and ProductGroup eq '${this.data.productGroup}'`
          : `ProductGroup eq '${this.data.productGroup}'`;
      }
      
      const result = await api.getProducts(params);
      
      this.setData({
        products: result.data || [],
        totalCount: result.count || 0,
        loading: false
      });
    } catch (error) {
      this.setData({ loading: false });
      console.error('查询失败:', error);
    }
  },

  // 搜索输入
  onSearchInput(e) {
    this.setData({ searchQuery: e.detail.value });
  },

  // 执行搜索
  onSearch() {
    this.setData({ page: 1 });
    this.fetchProducts();
  },

  // 清除搜索
  onClear() {
    this.setData({ 
      searchQuery: '', 
      productGroup: '',
      page: 1 
    });
    this.fetchProducts();
  },

  // 选择物料组
  onGroupChange(e) {
    this.setData({ productGroup: e.detail.value, page: 1 });
    this.fetchProducts();
  },

  // 查看详情
  onViewDetail(e) {
    const productId = e.currentTarget.dataset.id;
    wx.showToast({
      title: `查看产品: ${productId}`,
      icon: 'none'
    });
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.setData({ page: 1 });
    this.fetchProducts().then(() => {
      wx.stopPullDownRefresh();
    });
  },

  // 上拉加载更多
  onReachBottom() {
    if (this.data.products.length < this.data.totalCount) {
      this.setData({ page: this.data.page + 1 });
      this.fetchProducts();
    }
  }
});