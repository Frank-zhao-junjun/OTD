# 微信小程序开发说明

## 项目概述

本小程序是 SAP ERP 数据查询助手的微信小程序版本，提供产品、销售订单、生产订单、库存等核心业务数据的查询功能。

## 目录结构

```
miniprogram/
├── app.js              # 小程序入口
├── app.json            # 小程序配置
├── app.wxss            # 全局样式
├── pages/
│   ├── index/          # 首页
│   │   ├── index.js
│   │   ├── index.wxml
│   │   └── index.wxss
│   ├── products/       # 产品查询
│   │   ├── products.js
│   │   ├── products.wxml
│   │   ├── products.wxss
│   ├── sales-orders/   # 销售订单
│   │   ├── sales-orders.js
│   │   ├── sales-orders.wxml
│   │   ├── sales-orders.wxss
│   ├── production-orders/ # 生产订单
│   │   ├── production-orders.js
│   │   ├── production-orders.wxml
│   │   ├── production-orders.wxss
│   └── material-stock/ # 库存查询
│       ├── material-stock.js
│       ├── material-stock.wxml
│       └── material-stock.wxss
├── utils/
│   ├── api.js          # API请求封装
│   └── util.js         # 工具函数
└── components/         # 公共组件
    ├── search-bar/     # 搜索栏组件
    ├── data-table/     # 数据表格组件
    └── status-badge/   # 状态标签组件
```

## API对接说明

小程序通过HTTP请求对接Web后端API（Next.js API Routes）：

### API地址配置

```javascript
// utils/api.js
const API_BASE_URL = 'https://your-domain.coze.site/api/sap';

// 或者使用本地开发地址
const API_BASE_URL = 'http://localhost:5000/api/sap';
```

### API请求封装

```javascript
// utils/api.js
const request = (options) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${API_BASE_URL}${options.url}`,
      method: options.method || 'GET',
      data: options.data,
      header: {
        'Content-Type': 'application/json'
      },
      success: (res) => {
        if (res.data.success) {
          resolve(res.data);
        } else {
          reject(res.data.error);
        }
      },
      fail: (err) => {
        reject(err);
      }
    });
  });
};

// API方法
const api = {
  // 产品查询
  getProducts: (params) => request({
    url: `/API_PRODUCT_SRV/A_Product`,
    data: params
  }),
  
  // 销售订单查询
  getSalesOrders: (params) => request({
    url: `/API_SALES_ORDER_SRV/A_SalesOrder`,
    data: params
  }),
  
  // 生产订单查询
  getProductionOrders: (params) => request({
    url: `/API_PRODUCTION_ORDER_2_SRV/A_ProductionOrder`,
    data: params
  }),
  
  // 库存查询
  getMaterialStock: (params) => request({
    url: `/API_MATERIAL_STOCK_SRV/A_MatlStkInAcctMod`,
    data: params
  }),
  
  // 客户查询
  getCustomers: (params) => request({
    url: `/API_BUSINESS_PARTNER/A_Customer`,
    data: params
  })
};

module.exports = { api };
```

## 开发步骤

### 1. 创建小程序项目

1. 下载并安装 [微信开发者工具](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)
2. 打开开发者工具，选择"小程序项目"
3. 使用本目录下的代码创建项目

### 2. 配置服务器域名

在微信公众平台配置合法域名：
- 登录微信公众平台 > 开发管理 > 开发设置 > 服务器域名
- 添加 `request合法域名`: `https://your-domain.coze.site`

### 3. 调试和发布

1. 在开发者工具中调试小程序
2. 确保API请求正常返回数据
3. 提交代码审核并发布

## 注意事项

1. **凭证安全**: SAP凭证存储在Web后端，小程序无需直接处理凭证
2. **网络请求**: 小程序只能请求HTTPS域名，需在微信公众平台配置
3. **数据安全**: 建议在小程序端增加用户登录验证
4. **性能优化**: 使用分页查询，避免一次性请求大量数据

## 与Web版功能对应

| 功能模块 | Web页面 | 小程序页面 |
|---------|--------|-----------|
| 产品查询 | /products | pages/products |
| 销售订单 | /sales-orders | pages/sales-orders |
| 生产订单 | /production-orders | pages/production-orders |
| 库存查询 | /material-stock | pages/material-stock |
| 客户管理 | /customers | pages/customers |

## 界面设计参考

小程序界面设计参考了 `assets/ui-demo_src/ui-demo/mobile-sales-miniapp.html` 中的设计风格：
- SAP Horizon主题色系
- 紧凑的卡片式布局
- 适配移动端的触摸交互
- 清晰的数据展示表格