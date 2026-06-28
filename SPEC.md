# SPEC.md — OTD 助手技术规格

## 1. 系统架构

```
┌─────────────────────────────────────────────────────┐
│                    Browser / WeChat                   │
├─────────────────────────────────────────────────────┤
│  Next.js 16 (App Router)                             │
│  ┌──────────┐ ┌──────────┐ ┌───────────────────┐   │
│  │  Pages    │ │  API     │ │  Middleware        │   │
│  │  (RSC)    │ │  Routes  │ │  (Auth Guard)      │   │
│  └──────────┘ └────┬─────┘ └───────────────────┘   │
│                    │                                  │
├────────────────────┼──────────────────────────────────┤
│              Proxy Layer                              │
│  ┌─────────────────┴──────────────────────────┐      │
│  │  /api/sap/[service]/[entity]               │      │
│  │  - V2: $format=json, /Date(ts)/            │      │
│  │  - V4: Accept header, ISO dates            │      │
│  │  - Auth: Basic Auth (env vars)             │      │
│  └─────────────────┬──────────────────────────┘      │
├────────────────────┼──────────────────────────────────┤
│              SAP S/4HANA (External)                   │
│  ┌─────────────────┴──────────────────────────┐      │
│  │  8 V2 Services + 2 V4 Services              │      │
│  │  Client: 100                                │      │
│  └────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────┘
```

## 2. 技术栈


| 层级              | 技术                      | 版本  |
| --------------- | ----------------------- | --- |
| Framework       | Next.js (App Router)    | 16  |
| UI Library      | React                   | 19  |
| Language        | TypeScript              | 5   |
| Styling         | Tailwind CSS            | 4   |
| UI Components   | shadcn/ui + Fiori 3 自定义 | -   |
| Auth (JWT)      | jose                    | 6   |
| Password Hash   | bcryptjs                | 3   |
| Package Manager | pnpm                    | -   |
| Runtime         | Node.js                 | 24  |


## 3. 认证与安全

### 3.1 Web 端认证

```
注册: POST /api/auth/register { username, password, displayName?, email? }
  → bcryptjs hash → 存储到 data/users.json
  → 返回 { success, user }

登录: POST /api/auth/login { username, password, captchaCode, captchaId }
  → 校验验证码 → bcryptjs compare → 签发 JWT
  → Set-Cookie: token=<jwt>; HttpOnly; Path=/; Max-Age=604800; SameSite=Lax

路由保护: middleware.ts
  → 读取 Cookie token → jose jwtVerify
  → 未登录: 307 → /login
  → 已登录访问 /login|/register: 307 → /
  → 白名单: /api/auth/*, /_next/*, /favicon.ico
```

### 3.2 SAP 认证

```
所有 SAP 请求: Basic Auth
  Authorization: Basic base64(<username>:<password>)
  sap-client: 100
  凭证来源: .env.local (SAP_USERNAME, SAP_PASSWORD, SAP_CLIENT)
```

### 3.3 验证码

```
GET /api/auth/captcha
  → 生成 4 位随机数字
  → 渲染 SVG (干扰线 + 噪点)
  → 存储: Map<captchaId, { code, expires }> (5分钟过期)
  → 返回 { captchaId, svg }
```

## 4. API 接口规格

### 4.1 通用 SAP 代理

```
GET /api/sap/[service]/[entity]
  Query: top, skip, filter, orderby, select, expand
  V2 识别: service 不含 "CE_" 前缀
    → URL: /sap/opu/odata/sap/{service}/{entity}?$format=json&...
    → 响应: { d: { results: [...], __count: N } }
  V4 识别: service 含 "CE_" 前缀
    → URL: /sap/opu/odata4/sap/{path}/...
    → Headers: Accept: application/json
    → 响应: { value: [...], @odata.count: N }
```

### 4.2 销售订单关联单据

```
GET /api/sap/sales-order/[id]/related
  → 查 A_OutbDeliveryItem (ReferenceSDDocument = id)
  → 查 A_OutbDeliveryHeader (获取 DeliveryDate, ActualGoodsMovementDate)
  → 查 A_BillingDocumentItem (SalesDocument = id)
  → 查 A_BillingDocument (获取 BillingDocumentDate)
  → 查 CE_PRODUCTIONORDER_0001/ProductionOrder (SalesOrder = id)
  → 返回 { deliveryByItem, billingByItem, productionByItem }
```

### 4.3 搜索

```
GET /api/sap/search?type=product|customer&q=<keyword>
  → 查询本地 SQLite DB
  → 返回 { products: [...], customers: [...] }
```

### 4.4 设置

```
GET /api/settings → 返回配置 schema
POST /api/settings { key: value } → 更新 .env.local
```

### 4.5 数据同步

```
POST /api/sync { serviceEntity: "API_PRODUCT_SRV:A_Product" }
  → 从 SAP 拉取全量数据 → 写入本地 SQLite
  → 返回 { totalUpserted, results }
```

## 5. SAP 外部服务清单

### V2 OData (8个)


| 服务名                               | 路径                                                    | 主要 Entity                                |
| --------------------------------- | ----------------------------------------------------- | ---------------------------------------- |
| API_PRODUCT_SRV                   | /sap/opu/odata/sap/API_PRODUCT_SRV/                   | A_Product, A_ProductDescription          |
| API_BUSINESS_PARTNER              | /sap/opu/odata/sap/API_BUSINESS_PARTNER/              | A_Customer                               |
| API_SALES_ORDER_SRV               | /sap/opu/odata/sap/API_SALES_ORDER_SRV/               | A_SalesOrder, A_SalesOrderItem           |
| API_MATERIAL_STOCK_SRV            | /sap/opu/odata/sap/API_MATERIAL_STOCK_SRV/            | A_MatlStkInAcctMod                       |
| API_OUTBOUND_DELIVERY_SRV         | /sap/opu/odata/sap/API_OUTBOUND_DELIVERY_SRV;v=0002/  | A_OutbDeliveryHeader, A_OutbDeliveryItem |
| API_BILLING_DOCUMENT_SRV          | /sap/opu/odata/sap/API_BILLING_DOCUMENT_SRV/          | A_BillingDocument, A_BillingDocumentItem |
| API_MATERIAL_DOCUMENT_SRV         | /sap/opu/odata/sap/API_MATERIAL_DOCUMENT_SRV/         | A_MaterialDocumentHeader                 |
| API_PROD_ORDER_CONFIRMATION_2_SRV | /sap/opu/odata/sap/API_PROD_ORDER_CONFIRMATION_2_SRV/ | -                                        |


### V4 OData (2个)


| 服务名                     | 路径                                                                         | 主要 Entity       |
| ----------------------- | -------------------------------------------------------------------------- | --------------- |
| CE_SALESORDER_0001      | /sap/opu/odata4/sap/api_salesorder/srvd_a2x/sap/salesorder/0001/           | SalesOrder      |
| CE_PRODUCTIONORDER_0001 | /sap/opu/odata4/sap/api_productionorder/srvd_a2x/sap/productionorder/0001/ | ProductionOrder |


## 6. 数据模型

### 6.1 用户 (data/users.json)

```typescript
interface User {
  id: string;           // UUID
  username: string;     // 3-20字符, 字母数字下划线
  passwordHash: string; // bcryptjs hash
  displayName: string;
  email?: string;
  createdAt: string;    // ISO 8601
  updatedAt: string;
}
```

### 6.2 验证码 (内存)

```typescript
interface CaptchaEntry {
  code: string;      // 4位数字
  expires: number;   // 时间戳 (5分钟)
}
// Map<captchaId, CaptchaEntry>
```

### 6.3 JWT Payload

```typescript
interface JWTPayload {
  userId: string;
  username: string;
  iat: number;
  exp: number;  // 7天
}
```

## 7. 组件架构

### 7.1 Fiori 3 组件 (src/components/fiori.tsx)


| 组件                  | 用途           |
| ------------------- | ------------ |
| FioriShellBar       | 顶部导航栏 (44px) |
| FioriSidebar        | 左侧导航 (240px) |
| FioriTile           | 首页磁贴 (120px) |
| FioriKpiCard        | KPI 指标卡片     |
| FioriObjectListItem | 列表项卡片 (72px) |
| FioriObjectStatus   | 状态指示器        |
| FioriPageHeader     | 页面头 + 面包屑    |
| FioriSection        | 分区标题         |
| FioriActivity       | 活动流条目        |
| FioriBadge          | 状态徽章         |
| FioriFilterBar      | 筛选抽屉         |
| FioriFacetGroup     | 键值对表         |


### 7.2 布局组件


| 组件         | 用途                        |
| ---------- | ------------------------- |
| AppShell   | ShellBar + Sidebar + 用户菜单 |
| AppWrapper | 认证状态管理 + 条件渲染             |


### 7.3 Hooks


| Hook        | 用途              |
| ----------- | --------------- |
| useViewMode | 响应式视图模式 (表格/卡片) |


## 8. 路由表


| 路径                       | 页面               | 认证  |
| ------------------------ | ---------------- | --- |
| /                        | 首页 (KPI + Tiles) | 需要  |
| /login                   | 登录页              | 不需要 |
| /register                | 注册页              | 不需要 |
| /sales-orders            | 销售订单列表           | 需要  |
| /sales-orders/[id]       | 销售订单详情           | 需要  |
| /production-orders       | 生产订单列表           | 需要  |
| /production-orders/[id]  | 生产订单详情           | 需要  |
| /outbound-delivery       | 交货单列表            | 需要  |
| /outbound-delivery/[id]  | 交货单详情            | 需要  |
| /billing-documents       | 开票单据列表           | 需要  |
| /billing-documents/[id]  | 开票单据详情           | 需要  |
| /material-stock          | 库存查询列表           | 需要  |
| /material-stock/[id]     | 库存详情             | 需要  |
| /material-documents      | 物料凭证列表           | 需要  |
| /material-documents/[id] | 物料凭证详情           | 需要  |
| /products                | 产品查询             | 需要  |
| /customers               | 客户管理             | 需要  |


## 9. 响应式断点


| 断点      | 宽度         | 侧边栏     | 视图默认 | Tile列数 |
| ------- | ---------- | ------- | ---- | ------ |
| Mobile  | <640px     | overlay | 卡片   | 1      |
| Tablet  | 640-768px  | overlay | 卡片   | 2      |
| Laptop  | 768-1024px | 折叠      | 表格   | 2      |
| Desktop | ≥1024px    | 展开      | 表格   | 3      |


## 10. 环境变量


| 变量                          | 说明        | 默认值                 |
| --------------------------- | --------- | ------------------- |
| DEPLOY_RUN_PORT             | 服务端口      | 5000                |
| COZE_PROJECT_DOMAIN_DEFAULT | 对外域名      | -                   |
| COZE_WORKSPACE_PATH         | 工作目录      | /workspace/projects |
| SAP_BASE_URL                | SAP 主机地址  | -                   |
| SAP_USERNAME                | SAP 用户名   | -                   |
| SAP_PASSWORD                | SAP 密码    | -                   |
| SAP_CLIENT                  | SAP 客户端   | 100                 |
| JWT_SECRET                  | JWT 签名密钥  | (内置默认)              |
| USE_MOCK                    | Mock 模式开关 | false               |


