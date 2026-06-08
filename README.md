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

## SAP S/4HANA Public Cloud API 参考项目（联网精选 10 个）

> 侧重：OData、Communication Scenario/Arrangement、SAP Cloud SDK、CAP、Business Partner/Product/Sales API 集成

1. [SAP-samples/btp-extension-s4-material-availability](https://github.com/SAP-samples/btp-extension-s4-material-availability)  
   CAP 集成 SAP S/4HANA 服务，包含 `API_SALES_ORDER_SRV`、`API_PRODUCT_SRV`、OData 查询与 mashup 示例。
2. [SAP-samples/btp-s4hana-nocode-extension](https://github.com/SAP-samples/btp-s4hana-nocode-extension)  
   明确演示 S/4HANA Cloud 通信配置（Communication Management），含 `SAP_COM_0008` 与 Business Partner API 暴露步骤。
3. [SAP-samples/btp-end-to-end-scenario-use-cases](https://github.com/SAP-samples/btp-end-to-end-scenario-use-cases)  
   覆盖 Clean Core 扩展场景，提供 Communication System/Arrangement 配置教程。
4. [SAP-samples/partner-reference-application](https://github.com/SAP-samples/partner-reference-application)  
   多租户 CAP 参考应用，包含 S/4HANA Cloud Public Edition 集成教程（Sales Order OData v4 + Business Partner OData v2）。
5. [SAP-samples/cloud-cap-samples-java](https://github.com/SAP-samples/cloud-cap-samples-java)  
   CAP Java 官方样例，含 `API_BUSINESS_PARTNER` remote service、sandbox/destination/S4 实际系统接入配置。
6. [SAP-samples/cap-service-integration-codejam](https://github.com/SAP-samples/cap-service-integration-codejam)  
   CAP 服务消费实战，覆盖 OData 外部服务导入、mock、远端系统委托调用与 SAP Cloud SDK 连接能力。
7. [SAP-samples/cloud-sdk-js](https://github.com/SAP-samples/cloud-sdk-js)  
   SAP Cloud SDK JS/TS 样例集合，适合学习 S/4 API 客户端生成、目的地连接与 OData 调用模式。
8. [SAP-samples/cloud-sdk-team-calendar](https://github.com/SAP-samples/cloud-sdk-team-calendar)  
   端到端 Cloud SDK 教程，包含 S/4HANA 读写请求与 OData client 生成实践。
9. [SAP-samples/s4hana-cloud-extension-process-automation](https://github.com/SAP-samples/s4hana-cloud-extension-process-automation)  
   SAP BTP + CAP + 流程自动化扩展示例，含 Business Partner 集成与端到端扩展架构实践。
10. [SAP-samples/btp-side-by-side-extension-learning-journey](https://github.com/SAP-samples/btp-side-by-side-extension-learning-journey)  
    Side-by-side 扩展学习项目，包含 `API_BUSINESS_PARTNER` OData V2 接入与目的地配置练习。

## License

Private - Internal Use Only
