# AGENTS.md

## 项目概述

ES+OTD助手 - SAP ERP数据查询系统，提供Web端和微信小程序端的数据查询能力。

## 技术栈

### Web端
- **Framework**: Next.js 16 (App Router)
- **Core**: React 19
- **Language**: TypeScript 5
- **UI Components**: shadcn/ui (基于 Radix UI)
- **Styling**: Tailwind CSS 4

### 微信小程序
- **Framework**: 微信小程序原生框架
- **Language**: JavaScript
- **UI**: 自定义组件 + SAP Horizon风格

## 目录结构

```
├── src/                      # Web端源码
│   ├── app/                  # Next.js App Router
│   │   ├── layout.tsx        # 主布局（侧边栏导航）
│   │   ├── page.tsx          # 首页
│   │   ├── api/              # API路由
│   │   │   └── sap/          # SAP API代理
│   │   │       └── [service]/[entity]/route.ts
│   │   ├── products/         # 产品查询页
│   │   ├── sales-orders/     # 销售订单页
│   │   ├── production-orders/# 生产订单页
│   │   ├── material-stock/   # 库存查询页
│   │   ├── customers/        # 客户管理页
│   │   └── outbound-delivery/# 交货单页
│   ├── components/ui/        # shadcn/ui组件库
│   ├── lib/                  # 工具库
│   │   ├── utils.ts          # 通用工具
│   │   └ sap-service.ts      # SAP服务配置
│   └── hooks/                # 自定义Hooks
│
├── miniprogram/              # 微信小程序源码
│   ├── app.js                # 小程序入口
│   ├── app.json              # 小程序配置
│   ├── app.wxss              # 全局样式
│   ├── pages/                # 页面
│   │   ├── index/            # 首页
│   │   ├── products/         # 产品查询
│   │   ├── sales-orders/     # 销售订单
│   │   ├── production-orders/# 生产订单
│   │   ├── material-stock/   # 库存查询
│   │   └── customers/        # 客户管理
│   ├── utils/                # 工具
│   │   └ api.js              # API封装
│   └── components/           # 公共组件
│
├── assets/                   # 原始项目资源
│   ├── backend_src/          # Python后端代码参考
│   ├── ui-demo_src/          # UI演示参考
│   └── interface_src/        # SAP接口文档
│
├── public/                   # 静态资源
├── .env.local                # SAP凭证配置
├── DESIGN.md                 # 设计规范
└── next.config.ts            # Next.js配置
```

## SAP API接口

### 可用的API服务
| 服务名称 | OData版本 | 路径 | 说明 |
|---------|----------|------|------|
| API_PRODUCT_SRV | V2 | /sap/opu/odata/sap/API_PRODUCT_SRV/ | 产品主数据 |
| API_BUSINESS_PARTNER | V2 | /sap/opu/odata/sap/API_BUSINESS_PARTNER/ | 业务伙伴/客户 |
| API_SALES_ORDER_SRV | V2 | /sap/opu/odata/sap/API_SALES_ORDER_SRV/ | 销售订单(V2,备选) |
| CE_SALESORDER_0001 | **V4** | /sap/opu/odata4/sap/api_salesorder/srvd_a2x/sap/salesorder/0001/ | **销售订单(推荐)** |
| API_PRODUCTION_ORDER_2_SRV | V2 | /sap/opu/odata/sap/API_PRODUCTION_ORDER_2_SRV/ | 生产订单(V2,备选) |
| CE_PRODUCTIONORDER_0001 | **V4** | /sap/opu/odata4/sap/api_productionorder/srvd_a2x/sap/productionorder/0001/ | **生产订单(推荐)** |
| API_MATERIAL_STOCK_SRV | V2 | /sap/opu/odata/sap/API_MATERIAL_STOCK_SRV/ | 物料库存 |
| API_OUTBOUND_DELIVERY_SRV | V2 | /sap/opu/odata/sap/API_OUTBOUND_DELIVERY_SRV;v=0002/ | 外向交货 |
| API_BILLING_DOCUMENT_SRV | V2 | /sap/opu/odata/sap/API_BILLING_DOCUMENT_SRV/ | 开票单据 |

### API代理路由
- 通用代理: `/api/sap/[service]/[entity]`
- 服务名映射: `SERVICE_PATH_MAP` 在 `src/app/api/sap/[service]/[entity]/route.ts`
- 自动识别V2/V4路径，V4不传`$format=json`(使用Accept header)
- V2响应格式: `{ d: { results: [...], __count: N } }`
- V4响应格式: `{ value: [...], @odata.count: N }`

### 销售订单默认过滤 (BD9 Sell from Stock)
- SalesOrderType = 'OR' (标准订单)
- SalesOrganization = '1010'
- DistributionChannel = '10'
- OrganizationDivision = '00'

### 认证方式
- Basic Auth (用户名密码)
- SAP Client: 100

## 开发规范

### 包管理
- **仅使用pnpm**，禁止npm或yarn
- 安装依赖: `pnpm add <package>`
- 安装所有依赖: `pnpm install`

### 代码风格
- TypeScript strict模式
- 禁止隐式any
- React 17+ 不需要import React
- 组件和函数使用前必须import

### UI规范
- 默认使用shadcn/ui组件
- 专业清晰的企业风格
- 禁止花哨渐变和过度装饰

## 常用命令

```bash
# Web端开发
pnpm install              # 安装依赖
pnpm dev                  # 启动开发服务(5000端口)
pnpm build                # 构建生产版本
pnpm start                # 启动生产服务

# 微信小程序
# 在微信开发者工具中打开 miniprogram目录
```

## 部署说明

1. **Web端部署**
   - 确保SAP凭证配置正确(.env.local)
   - 执行构建: `pnpm build`
   - 部署到生产环境

2. **小程序部署**
   - 在微信公众平台配置服务器域名
   - 使用微信开发者工具上传代码
   - 提交审核并发布

## 参考资源

- SAP API文档: `assets/interface_src/接口/`
- Python后端参考: `assets/backend_src/backend/`
- UI设计参考: `assets/ui-demo_src/ui-demo/`