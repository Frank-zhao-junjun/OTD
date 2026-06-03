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
 * SAP OData V2 响应解析
 */
const parseV2Response = (data) => {
  if (data && data.d) {
    return {
      results: data.d.results || [],
      count: parseInt(data.d.__count || '0')
    };
  }
  return { results: [], count: 0 };
};

/**
 * SAP OData V4 响应解析
 */
const parseV4Response = (data) => {
  if (data) {
    return {
      results: data.value || [],
      count: data['@odata.count'] || 0
    };
  }
  return { results: [], count: 0 };
};

/**
 * API方法集合
 */
const api = {
  // 1. 产品查询 (V2)
  getProducts: (params = {}) => request({
    url: `/API_PRODUCT_SRV/A_Product`,
    data: params
  }),

  // 2. 客户查询 (V2)
  getCustomers: (params = {}) => request({
    url: `/API_BUSINESS_PARTNER/A_Customer`,
    data: params
  }),

  // 3. 销售订单查询 (V4)
  getSalesOrders: (params = {}) => request({
    url: `/CE_SALESORDER_0001/SalesOrder`,
    data: params
  }),

  // 销售订单行项目 (V4)
  getSalesOrderItems: (orderNumber) => request({
    url: `/CE_SALESORDER_0001/SalesOrder('${orderNumber}')/to_Item`,
  }),

  // 4. 生产订单查询 (V4)
  getProductionOrders: (params = {}) => request({
    url: `/CE_PRODUCTIONORDER_0001/ProductionOrder`,
    data: params
  }),

  // 5. 成品库存查询 (V2)
  getMaterialStock: (params = {}) => request({
    url: `/API_MATERIAL_STOCK_SRV/A_MatlStkInAcctMod`,
    data: params
  }),

  // 6. 交货单查询 (V2)
  getOutboundDeliveries: (params = {}) => request({
    url: `/API_OUTBOUND_DELIVERY_SRV/A_OutbDeliveryHeader`,
    data: params
  }),

  // 7. 开票单据查询 (V2)
  getBillingDocuments: (params = {}) => request({
    url: `/API_BILLING_DOCUMENT_SRV/A_BillingDocument`,
    data: params
  }),

  // 8. 物料凭证查询 (V2)
  getMaterialDocuments: (params = {}) => request({
    url: `/API_MATERIAL_DOCUMENT_SRV/A_MaterialDocumentHeader`,
    data: params
  })
};

module.exports = { api, request, parseV2Response, parseV4Response };
