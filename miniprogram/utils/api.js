// utils/api.js - API 请求封装（含认证注入）
const API_HOST = 'https://7f286be5-741a-4bb9-af5b-90fecb106734.dev.coze.site';

/**
 * 通用请求方法 — 自动注入 x-session header，统一处理 401
 */
const request = (options) => {
  return new Promise((resolve, reject) => {
    const app = getApp();
    const token = app?.globalData?.token || wx.getStorageSync('auth_token');

    const headers = {
      'Content-Type': 'application/json'
    };
    if (token) {
      headers['x-session'] = token;
    }

    // 防止多个并发请求重复 showLoading / hideLoading 闪烁
    if (!options.hideLoading && !request._loadingCount) {
      request._loadingCount = 0;
    }
    if (!options.hideLoading) {
      if (request._loadingCount === 0) {
        wx.showLoading({
          title: options.loadingTitle || '加载中...',
          mask: true
        });
      }
      request._loadingCount++;
    }

    wx.request({
      url: `${API_HOST}${options.url}`,
      method: options.method || 'GET',
      data: options.data,
      header: headers,
      success: (res) => {
        if (!options.hideLoading) {
          request._loadingCount--;
          if (request._loadingCount <= 0) {
            request._loadingCount = 0;
            wx.hideLoading();
          }
        }

        // 401 → 全局拦截
        if (res.statusCode === 401) {
          const app = getApp();
          if (app && app.handleUnauthorized) {
            app.handleUnauthorized();
          }
          reject('未登录');
          return;
        }

        if (res.statusCode >= 200 && res.statusCode < 300 && res.data?.success !== false) {
          resolve(res.data);
        } else {
          // 业务层 200 但 success: false（如 SAP 404）
          if (res.statusCode === 200 && res.data?.error) {
            reject(res.data.error);
            return;
          }
          const errorMsg = res.data?.error || `请求失败 (${res.statusCode})`;
          if (!options.silent) {
            wx.showToast({
              title: errorMsg,
              icon: 'none',
              duration: 2000
            });
          }
          reject(errorMsg);
        }
      },
      fail: (err) => {
        if (!options.hideLoading) {
          request._loadingCount--;
          if (request._loadingCount <= 0) {
            request._loadingCount = 0;
            wx.hideLoading();
          }
        }
        if (!options.silent) {
          wx.showToast({
            title: '网络请求失败',
            icon: 'none',
            duration: 2000
          });
        }
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
 * 格式化金额：千分位 + 保留 2 位小数 + 货币符号
 */
const formatAmount = (value, currency = 'CNY') => {
  if (value === null || value === undefined || isNaN(value)) return '—';
  const num = Number(value);
  const formatted = num.toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  const symbols = { CNY: '¥', USD: '$', EUR: '€' };
  return `${symbols[currency] || currency + ' '}${formatted}`;
};

/**
 * 格式化日期：处理 /Date(ms)/ 和 ISO 格式
 */
const formatDate = (value) => {
  if (!value) return '—';
  const str = String(value).trim();

  // /Date(1756339200000)/
  const dateMatch = str.match(/\/Date\((\d+)\)\//);
  if (dateMatch) {
    const d = new Date(parseInt(dateMatch[1]));
    if (!isNaN(d.getTime())) {
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }
  }

  // SAP yyyyMMdd / yyyyMMddHHmmss（无分隔符）
  const sapMatch = str.match(/^(\d{4})(\d{2})(\d{2})(\d{2})?(\d{2})?(\d{2})?$/);
  if (sapMatch) {
    return `${sapMatch[1]}-${sapMatch[2]}-${sapMatch[3]}`;
  }

  // ISO / YYYY-MM-DD / YYYY-MM-DDTHH:mm:ss
  const d = new Date(value);
  if (!isNaN(d.getTime())) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  return str;
};

// ============================================================
// API 方法集合
// ============================================================
const api = {
  // ── 认证 ──────────────────────────────────────────────

  /** 获取验证码 */
  getCaptcha: () => request({
    url: '/api/auth/captcha',
    hideLoading: true
  }),

  /** 登录 */
  login: (username, password, captcha) => request({
    url: '/api/auth/login',
    method: 'POST',
    data: { username, password, captcha }
  }),

  /** 注册 */
  register: (username, password, confirmPassword, captcha) => request({
    url: '/api/auth/register',
    method: 'POST',
    data: { username, password, confirmPassword, captcha }
  }),

  /** 获取当前用户信息 */
  getMe: () => request({
    url: '/api/auth/me',
    hideLoading: true,
    silent: true
  }),

  // ── Dashboard ─────────────────────────────────────────

  /** 首页 Dashboard */
  getDashboard: () => request({
    url: '/api/dashboard'
  }),

  // ── 全局搜索 ──────────────────────────────────────────

  /** 全局搜索 */
  search: (q) => request({
    url: '/api/search',
    data: { q }
  }),

  // ── 销售订单 ──────────────────────────────────────────

  /** 销售订单列表 (V4) */
  getSalesOrders: (params = {}) => request({
    url: '/api/sap/CE_SALESORDER_0001/SalesOrder',
    data: params
  }),

  /** 销售订单详情 + 展开 */
  getSalesOrderDetail: (id) => request({
    url: `/api/sap/CE_SALESORDER_0001/SalesOrder`,
    data: {
      $filter: `SalesOrder eq '${id}'`,
      $expand: '_Item,_Partner,_PricingElement'
    }
  }),

  /** 销售订单关联单据 */
  getSalesOrderRelated: (id) => request({
    url: `/api/sap/sales-order/${id}/related`
  }),

  /** 销售订单行项目 */
  getSalesOrderItems: (orderNumber) => request({
    url: `/api/sap/CE_SALESORDER_0001/SalesOrder('${orderNumber}')/to_Item`
  }),

  // ── 生产订单 ──────────────────────────────────────────

  /** 生产订单列表 (V4) */
  getProductionOrders: (params = {}) => request({
    url: '/api/sap/CE_PRODUCTIONORDER_0001/ProductionOrder',
    data: params
  }),

  /** 生产订单详情 + 展开工序和组件 */
  getProductionOrderDetail: (id) => request({
    url: '/api/sap/CE_PRODUCTIONORDER_0001/ProductionOrder',
    data: {
      $filter: `ProductionOrder eq '${id}'`,
      $expand: '_Component,_Operation'
    }
  }),

  // ── 交货单 ────────────────────────────────────────────

  /** 交货单列表 (V2) */
  getOutboundDeliveries: (params = {}) => request({
    url: '/api/sap/API_OUTBOUND_DELIVERY_SRV/A_OutbDeliveryHeader',
    data: params
  }),

  /** 交货单详情 */
  getOutboundDeliveryDetail: (deliveryDoc) => request({
    url: '/api/sap/API_OUTBOUND_DELIVERY_SRV/A_OutbDeliveryHeader',
    data: {
      $filter: `DeliveryDocument eq '${deliveryDoc}'`
    }
  }),

  /** 交货单行项目 */
  getOutboundDeliveryItems: (deliveryDoc) => request({
    url: '/api/sap/API_OUTBOUND_DELIVERY_SRV/A_OutbDeliveryItem',
    data: {
      $filter: `DeliveryDocument eq '${deliveryDoc}'`
    }
  }),

  // ── 开票单据 ──────────────────────────────────────────

  /** 开票单据列表 (V2) */
  getBillingDocuments: (params = {}) => request({
    url: '/api/sap/API_BILLING_DOCUMENT_SRV/A_BillingDocument',
    data: params
  }),

  /** 开票单据详情 */
  getBillingDocumentDetail: (billingDoc) => request({
    url: '/api/sap/API_BILLING_DOCUMENT_SRV/A_BillingDocument',
    data: {
      $filter: `BillingDocument eq '${billingDoc}'`
    }
  }),

  /** 开票单据行项目 */
  getBillingDocumentItems: (billingDoc) => request({
    url: '/api/sap/API_BILLING_DOCUMENT_SRV/A_BillingDocumentItem',
    data: {
      $filter: `BillingDocument eq '${billingDoc}'`
    }
  }),

  // ── 其他实体 ──────────────────────────────────────────

  /** 产品查询 (V2) */
  getProducts: (params = {}) => request({
    url: '/api/sap/API_PRODUCT_SRV/A_Product',
    data: params
  }),

  /** 客户查询 (V2) */
  getCustomers: (params = {}) => request({
    url: '/api/sap/API_BUSINESS_PARTNER/A_Customer',
    data: params
  }),

  /** 成品库存查询 (V2) */
  getMaterialStock: (params = {}) => request({
    url: '/api/sap/API_MATERIAL_STOCK_SRV/A_MatlStkInAcctMod',
    data: params
  }),

  /** 入库单查询 (V2) */
  getMaterialDocuments: (params = {}) => request({
    url: '/api/sap/API_MATERIAL_DOCUMENT_SRV/A_MaterialDocumentHeader',
    data: params
  })
};

module.exports = { api, request, parseV2Response, parseV4Response, formatAmount, formatDate };
