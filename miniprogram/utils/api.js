// utils/api.js - API请求封装
const API_BASE_URL = 'https://your-domain.coze.site/api/sap';

/**
 * 通用请求方法
 */
const request = (options) => {
  return new Promise((resolve, reject) => {
    wx.showLoading({
      title: '加载中...',
      mask: true
    });
    
    wx.request({
      url: `${API_BASE_URL}${options.url}`,
      method: options.method || 'GET',
      data: options.data,
      header: {
        'Content-Type': 'application/json'
      },
      success: (res) => {
        wx.hideLoading();
        if (res.statusCode === 200 && res.data.success) {
          resolve(res.data);
        } else {
          const errorMsg = res.data?.error || `请求失败 (${res.statusCode})`;
          wx.showToast({
            title: errorMsg,
            icon: 'none',
            duration: 2000
          });
          reject(errorMsg);
        }
      },
      fail: (err) => {
        wx.hideLoading();
        wx.showToast({
          title: '网络请求失败',
          icon: 'none',
          duration: 2000
        });
        reject(err);
      }
    });
  });
};

/**
 * API方法集合
 */
const api = {
  // 产品查询
  getProducts: (params = {}) => request({
    url: `/API_PRODUCT_SRV/A_Product`,
    data: params
  }),
  
  // 单个产品详情
  getProductDetail: (productId) => request({
    url: `/API_PRODUCT_SRV/A_Product`,
    data: { id: productId }
  }),
  
  // 销售订单查询
  getSalesOrders: (params = {}) => request({
    url: `/API_SALES_ORDER_SRV/A_SalesOrder`,
    data: params
  }),
  
  // 生产订单查询
  getProductionOrders: (params = {}) => request({
    url: `/API_PRODUCTION_ORDER_2_SRV/A_ProductionOrder`,
    data: params
  }),
  
  // 库存查询
  getMaterialStock: (params = {}) => request({
    url: `/API_MATERIAL_STOCK_SRV/A_MatlStkInAcctMod`,
    data: params
  }),
  
  // 客户查询
  getCustomers: (params = {}) => request({
    url: `/API_BUSINESS_PARTNER/A_Customer`,
    data: params
  }),
  
  // 外向交货单查询
  getOutboundDeliveries: (params = {}) => request({
    url: `/API_OUTBOUND_DELIVERY_SRV/A_OutbDeliveryHeader`,
    data: params
  })
};

module.exports = { api, request };