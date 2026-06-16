# OTD - Order to Delivery

OTD助手 - SAP ERP数据查询系统，提供Web端的数据查询能力，支持销售订单、生产订单、库存、交货单、开票单据等8大核心业务模块。

## 功能特性

### 业务模块（8大接口）

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

### 核心功能

- **用户认证**：用户名+密码登录、4位数字验证码、新用户注册、JWT会话管理
- **响应式视图**：PC端默认表格视图，移动端默认卡片视图，可手动切换
- **加载更多**：列表页采用"加载更多"分页（20条/页）
- **关联单据**：销售订单行项目点击查看关联的发货单、开票单、生产订单
- **名称显示**：客户代码旁显示客户名称，物料代码旁显示物料名称
- **Fiori 3 设计**：SAP Fiori 3 设计语言，KPI卡片、活动流、面包屑导航

## 技术栈

### Web端
- **Framework**: Next.js 16 (App Router)
- **Core**: React 19
- **Language**: TypeScript 5
- **UI Components**: shadcn/ui (基于 Radix UI) + Fiori 3 自定义组件
- **Styling**: Tailwind CSS 4
- **Auth**: jose (JWT) + bcryptjs (密码加密)
- **Design**: SAP Fiori 3 (主色#0070F2, ShellBar, Tile, ObjectListItem)

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
├── src/                          # Web端源码
│   ├── app/                      # Next.js App Router
│   │   ├── layout.tsx            # 主布局（认证+Shell+侧边栏）
│   │   ├── page.tsx              # 首页（KPI卡片+Tiles+活动流）
│   │   ├── login/                # 登录页
│   │   ├── register/             # 注册页
│   │   ├── api/                  # API路由
│   │   │   ├── auth/             # 认证API
│   │   │   │   ├── captcha/      # GET 生成验证码
│   │   │   │   ├── register/     # POST 用户注册
│   │   │   │   ├── login/        # POST 用户登录
│   │   │   │   ├── logout/       # POST 退出登录
│   │   │   │   └── me/           # GET 当前用户
│   │   │   ├── sap/              # SAP API代理
│   │   │   │   ├── [service]/[entity]/  # 通用OData代理(V2/V4)
│   │   │   │   ├── sales-order/[id]/related/  # 销售订单关联单据
│   │   │   │   └── search/       # 本地搜索(产品+客户)
│   │   │   ├── settings/         # SAP连接配置
│   │   │   └── sync/             # 数据同步
│   │   ├── products/             # 产品查询
│   │   ├── sales-orders/         # 销售订单
│   │   │   └── [id]/             # 销售订单详情(行项目关联单据)
│   │   ├── production-orders/    # 生产订单
│   │   │   └── [id]/             # 生产订单详情
│   │   ├── material-stock/       # 库存查询
│   │   │   └── [id]/             # 库存详情
│   │   ├── customers/            # 客户管理
│   │   ├── outbound-delivery/    # 交货单
│   │   │   └── [id]/             # 交货单详情
│   │   ├── billing-documents/    # 开票单据
│   │   │   └── [id]/             # 开票单据详情
│   │   └── material-documents/   # 物料凭证
│   │       └── [id]/             # 物料凭证详情
│   ├── components/               # 组件
│   │   ├── ui/                   # shadcn/ui组件库
│   │   ├── fiori.tsx             # Fiori 3 自定义组件
│   │   ├── app-shell.tsx         # ShellBar+侧边栏+用户菜单
│   │   └── app-wrapper.tsx       # 认证包装器
│   ├── hooks/                    # 自定义Hooks
│   │   └── useViewMode.ts        # 响应式视图模式(表格/卡片)
│   ├── lib/                      # 工具库
│   │   ├── utils.ts              # 通用工具
│   │   ├── sap-service.ts        # SAP服务配置
│   │   ├── auth.ts               # JWT认证工具
│   │   ├── users.ts              # 用户数据管理
│   │   └── captcha.ts            # 验证码生成
│   └── middleware.ts             # 路由保护中间件
├── data/                         # 本地数据(不入git)
│   └── users.json                # 用户数据
├── mock/                         # Mock数据
├── miniprogram/                  # 微信小程序源码
├── assets/                       # 项目资源与接口文档
│   └── interface_src/            # SAP接口文档
├── DESIGN.md                     # 设计规范
├── AGENTS.md                     # 开发规范
└── .skills/                      # 项目技能
    └── ralphinho-rfc-pipeline/   # RFC Pipeline技能
```

## API 接口

### 内部API（10个）

| # | 路径 | 方法 | 说明 |
|---|------|------|------|
| 1 | `/api/auth/captcha` | GET | 生成4位数字验证码(SVG) |
| 2 | `/api/auth/register` | POST | 用户注册 |
| 3 | `/api/auth/login` | POST | 用户登录 |
| 4 | `/api/auth/logout` | POST | 退出登录 |
| 5 | `/api/auth/me` | GET | 获取当前用户 |
| 6 | `/api/sap/[service]/[entity]` | GET | SAP OData通用代理 |
| 7 | `/api/sap/sales-order/[id]/related` | GET | 销售订单关联单据 |
| 8 | `/api/sap/search` | GET | 本地搜索 |
| 9 | `/api/settings` | GET/POST | SAP配置管理 |
| 10 | `/api/sync` | POST | 数据同步 |

### 认证方式

- 所有SAP调用使用 Basic Auth（用户名+密码），SAP Client 固定为 100
- Web端使用 JWT Token（httpOnly Cookie，7天有效期）
- 路由保护：未登录自动跳转 `/login`

## License

Private - Internal Use Only
