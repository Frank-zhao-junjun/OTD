# OTD - Order to Delivery

OTD助手 - SAP ERP数据查询系统，提供Web端和企业微信、微信小程序端的数据查询能力。

## 功能模块

| # | 模块 | SAP API | 版本 | 操作能力 |
|---|------|---------|------|---------|
| 1 | 产品管理 | API_PRODUCT_SRV | V2 | 只读 |
| 2 | 客户管理 | API_BUSINESS_PARTNER | V2 | 只读 |
| 3 | 销售订单 | CE_SALESORDER_0001 | V4 | 读取+同步 |
| 4 | 生产订单 | CE_PRODUCTIONORDER_0001 | V4 | 完整CRUD+15业务动作 |
| 5 | 成品库存 | API_MATERIAL_STOCK_SRV | V2 | 读取+同步 |
| 6 | 交货单 | API_OUTBOUND_DELIVERY_SRV;v=0002 | V2 | 读取+同步 |
| 7 | 开票单据 | API_BILLING_DOCUMENT_SRV | V2 | 读取+同步 |
| 8 | 物料凭证 | API_MATERIAL_DOCUMENT_SRV | V2 | 读取+同步 |

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

## 快速开始

### 安装依赖

```bash
pnpm install
```

### 配置SAP凭证

创建 `.env.local` 文件：

```env
SAP_BASE_URL=https://your-s4hana-host.sapcloud.cn
SAP_USERNAME=your_username
SAP_PASSWORD=your_password
SAP_CLIENT=100
```

### 启动开发服务器

```bash
pnpm dev
```

访问 http://localhost:5000 查看应用。

### 构建生产版本

```bash
pnpm build
pnpm start
```

### 微信小程序

在微信开发者工具中打开 `miniprogram/` 目录，详细说明见 `miniprogram/MINIPROGRAM_README.md`。

## 项目结构

```
├── src/                      # Web端源码
│   ├── app/                  # Next.js App Router
│   │   ├── api/sap/          # SAP API代理路由
│   │   ├── products/         # 产品查询
│   │   ├── sales-orders/     # 销售订单
│   │   ├── production-orders/# 生产订单
│   │   ├── material-stock/   # 库存查询
│   │   ├── customers/        # 客户管理
│   │   ├── outbound-delivery/# 交货单
│   │   ├── billing-documents/# 开票单据
│   │   └── material-documents/# 物料凭证
│   ├── components/ui/        # shadcn/ui组件
│   └── lib/sap-service.ts    # SAP服务配置
├── miniprogram/              # 微信小程序源码
└── assets/                   # 项目资源与接口文档
```

## License

Private - Internal Use Only
