# OTD 助手小程序 — User Story 汇总（miniprogram）

| 属性 | 内容 |
|------|------|
| 文档版本 | v1.0 |
| 生成日期 | 2026-06-18 |
| 产品范围 | OTD 助手微信小程序 — 8 个新增功能模块 |
| SPEC 基线 | [miniprogram/SPEC.md](SPEC.md) |
| URS 基线 | [miniprogram/URS.md](URS.md) |
| 实现主路径 | `miniprogram/`（微信小程序原生框架） |
| PC 参考 | [US-1.md](../US-1.md)（PC 门户销售订单 US 格式） |

---

## 1. 全局约定

### 1.1 认证机制

- 登录方式：用户名 + 密码 + 4 位数字验证码
- Token 存储：`wx.setStorageSync('auth_token', token)`
- 请求携带：所有业务 API 通过 `x-session` header 传递 token
- 过期处理：后端返回 401 → 前端清除 token → `wx.reLaunch` 跳转 `pages/login/login`
- 启动检查：`app.js onLaunch` 检查 `auth_token`，不存在则跳转登录页

### 1.2 API 端点

| 接口 | 方法 | 用途 |
|------|------|------|
| `/api/auth/captcha` | GET | 获取验证码 |
| `/api/auth/login` | POST | 登录 |
| `/api/auth/register` | POST | 注册 |
| `/api/auth/me` | GET | 当前用户信息 |
| `/api/dashboard` | GET | 首页 KPI + 活动流 |
| `/api/search?q=` | GET | 全局搜索 |
| `/api/sap/CE_SALESORDER_0001/SalesOrder` | GET | 销售订单详情 |
| `/api/sap/sales-order/:id/related` | GET | 销售订单关联单据 |
| `/api/sap/CE_PRODUCTIONORDER_0001/ProductionOrder` | GET | 生产订单详情 |
| `/api/sap/API_OUTBOUND_DELIVERY_SRV/A_OutbDeliveryHeader` | GET | 交货单详情 |
| `/api/sap/API_OUTBOUND_DELIVERY_SRV/A_OutbDeliveryItem` | GET | 交货单行项目 |
| `/api/sap/API_BILLING_DOCUMENT_SRV/A_BillingDocument` | GET | 开票单据详情 |
| `/api/sap/API_BILLING_DOCUMENT_SRV/A_BillingDocumentItem` | GET | 开票单据行项目 |

### 1.3 页面路由规划（新增部分）

```
pages/
├── login/login              # 登录页 (新增)
├── register/register        # 注册页 (新增)
├── sales-orders/
│   └── detail/detail        # 销售订单详情 (新增)
├── production-orders/
│   └── detail/detail        # 生产订单详情 (新增)
├── outbound-delivery/
│   └── detail/detail        # 交货单详情 (新增)
└── billing-documents/
    └── detail/detail        # 开票单据详情 (新增)
```

### 1.4 已有基线能力

以下 8 个实体列表查询页已实现，属于本项目基线，不再单独建立 US：

`pages/sales-orders/` | `pages/production-orders/` | `pages/material-stock/` | `pages/outbound-delivery/` | `pages/billing-documents/` | `pages/material-documents/` | `pages/products/` | `pages/customers/`

---

## 2. US 状态总览

| US | 标题 | 优先级 | 当前状态 | 依赖 | 关联 SPEC |
|----|------|--------|----------|------|-----------|
| US-MP-01 | 登录认证 | P0 | 🔧 代码完成，待 TEST | — | [SPEC-001](SPEC.md#spec-001-登录认证) |
| US-MP-02 | 首页 Dashboard | P0 | 🔧 代码完成，待 TEST | US-MP-01 | [SPEC-002](SPEC.md#spec-002-首页-dashboard) |
| US-MP-03 | 销售订单详情页 | P0 | 🔧 代码完成，待 TEST | US-MP-01 | [SPEC-003](SPEC.md#spec-003-销售订单详情页) |
| US-MP-04 | 生产订单详情页 | P0 | 🔧 代码完成，待 TEST | US-MP-01 | [SPEC-004](SPEC.md#spec-004-生产订单详情页) |
| US-MP-05 | 全局搜索 | P1 | 🔧 代码完成，待 TEST | US-MP-01, US-MP-03, US-MP-04 | [SPEC-005](SPEC.md#spec-005-全局搜索) |
| US-MP-06 | 视图切换（卡片/表格） | P1 | 🔧 代码完成，待 TEST | — | [SPEC-006](SPEC.md#spec-006-视图切换) |
| US-MP-07 | 交货单详情页 | P2 | 🔧 代码完成，待 TEST | US-MP-01, US-MP-03 | [SPEC-007](SPEC.md#spec-007-交货单详情页) |
| US-MP-08 | 开票单据详情页 | P2 | 🔧 代码完成，待 TEST | US-MP-01, US-MP-03 | [SPEC-008](SPEC.md#spec-008-开票单据详情页) |

图例：❌ 未实现 | 🔧 进行中 | ✅ 已实现

---

## 3. 各 User Story 明细

### US-MP-01 — 登录认证

**角色**：全体业务用户

**故事**：用户打开小程序，输入用户名、密码、验证码完成登录；首次使用可通过注册页创建账号。登录态通过 token 持久化，token 过期自动跳转登录页。

**验收要点**：
- 登录页：用户名 + 密码（可切换明文/密文）+ 验证码（点击刷新）
- 注册页：用户名 + 密码 + 确认密码 + 验证码
- 字段校验：用户名 3-20 字符（字母数字下划线）、密码 6-32 字符、验证码 4 位数字
- Token 存储 `wx.setStorageSync('auth_token', token)`，所有 API 请求携带 `x-session` header
- 后端 401 → 清除 token → `wx.reLaunch` 跳转登录页
- `app.js onLaunch` 检查 token，不存在则跳转登录
- 校验失败：字段下方红色提示；登录失败：模糊提示"用户名或密码错误"
- 验证码错误自动刷新；网络超时提示"网络连接失败，请重试"

**初始结论**：小程序端无认证基础设施，登录/注册页面不存在，`utils/api.js` 无 token 注入逻辑。

**当前状态**：❌ 未实现。需新建 `pages/login/login`、`pages/register/register` 页面，改造 `app.js` 和 `utils/api.js`。

**主要文件**（待建/改造）：
- `app.js` — 启动 token 检查 + 401 全局拦截
- `utils/api.js` — 注入 `x-session` header
- `pages/login/login.{js,wxml,wxss,json}` — 登录页（新建）
- `pages/register/register.{js,wxml,wxss,json}` — 注册页（新建）
- `app.json` — 注册新页面路由

**关联 SPEC**：[SPEC-001](SPEC.md#spec-001-登录认证)

---

### US-MP-02 — 首页 Dashboard

**角色**：全体业务用户

**故事**：用户打开小程序进入首页，一眼看到今日核心 KPI（销售订单数、生产订单数、待发货数、库存条目数）、最近业务动态、以及 8 大模块快捷入口。下拉可刷新最新数据。

**验收要点**：
- KPI 卡片 2×2 网格：销售(蓝)、生产(绿)、待发货(橙)、库存(紫)
- 卡片尺寸 48% 宽 × 100px 高，白色背景，圆角 8px，阴影
- 活动流：左侧 4px 竖条，成功=绿、警告=橙、错误=红
- 8 大模块快捷入口（2 行 × 4 列图标网格）
- 下拉刷新 `onPullDownRefresh` 重新获取 dashboard 数据
- 点击 KPI 卡片 / 模块图标跳转对应列表页
- 首页加载 2s 内显示所有 KPI 数据
- 未登录自动跳转登录页

**初始结论**：当前首页为静态模块导航网格，无 KPI 卡片、无活动流、无下拉刷新。

**当前状态**：❌ 未实现。需改造 `pages/index/index`，新增 `/api/dashboard` 调用。

**主要文件**（待建/改造）：
- `pages/index/index.{js,wxml,wxss}` — 改造为 Dashboard 布局
- `utils/api.js` — 新增 `getDashboard()` 方法

**关联 SPEC**：[SPEC-002](SPEC.md#spec-002-首页-dashboard)

---

### US-MP-03 — 销售订单详情页

**角色**：销售人员、客户服务人员

**故事**：销售人员在客户现场，从列表点击销售订单进入完整详情页，快速查看订单的发货进度、开票状态、关联的生产订单情况。

**验收要点**：
- **头部**：订单号、类型、客户、订单日期、金额、状态 Badge
- **KPI 卡片**：净额、行项目数、已交货比例
- **行项目列表**：物料、描述、数量×单价=净额、已交货比例
- **定价明细**：净价/增值税/总计（可折叠，默认折叠）
- **发货信息**：关联交货单列表（单号、数量、状态）
- **开票信息**：关联开票单据列表（单号、金额、状态）
- **生产订单**：MTO 订单关联的生产订单列表
- **业务伙伴**：售达方/送达方
- 点击交货单号/开票单号/生产订单号 → 跳转对应详情页
- 页面加载 3s 内显示完整数据
- 状态颜色正确：已完成=绿(#107E3E)、处理中=蓝(#0A6ED1)、部分完成=橙(#E9730C)

**初始结论**：当前列表页点击仅弹窗提示"详情请在 Web 端查看"，无详情页面。

**当前状态**：❌ 未实现。需新建 `pages/sales-orders/detail/detail` 页面，调用订单详情 + 关联单据两个接口。

**主要文件**（待建/改造）：
- `pages/sales-orders/detail/detail.{js,wxml,wxss,json}` — 详情页（新建）
- `pages/sales-orders/sales-orders.js` — 列表点击改为 `navigateTo` 跳转详情页
- `utils/api.js` — 新增 `getSalesOrderDetail()`、`getSalesOrderRelated()` 方法

**关联 SPEC**：[SPEC-003](SPEC.md#spec-003-销售订单详情页)

---

### US-MP-04 — 生产订单详情页

**角色**：生产管理人员、车间主任

**故事**：生产管理人员在车间巡查，从列表点击生产订单进入完整详情页，查看工序完成情况和物料齐套状态。

**验收要点**：
- **头部**：订单号、工厂、物料、产品组、状态 Badge
- **KPI 卡片**：计划量、实际量、工序数、组件数
- **工序进度表**：工序号、描述、工作中心、计划/实际日期、进度条（100%=绿、<100%=橙）、合格/报废数量
- **组件清单**：物料、描述、需求量/已提量、齐套状态（已齐套=绿、部分=橙、待提货=灰）
- 工序卡片可展开/折叠（默认展开）
- 计划/实际日期对比清晰

**初始结论**：当前列表页点击仅弹窗提示，无详情页面。

**当前状态**：❌ 未实现。需新建 `pages/production-orders/detail/detail` 页面。

**主要文件**（待建/改造）：
- `pages/production-orders/detail/detail.{js,wxml,wxss,json}` — 详情页（新建）
- `pages/production-orders/production-orders.js` — 列表点击改为 `navigateTo` 跳转详情页
- `utils/api.js` — 新增 `getProductionOrderDetail()` 方法

**关联 SPEC**：[SPEC-004](SPEC.md#spec-004-生产订单详情页)

---

### US-MP-05 — 全局搜索

**角色**：全体业务用户

**故事**：用户只记得一个订单号片段"1000"，不确定是销售订单还是生产订单，通过首页搜索栏跨 8 大实体搜索，结果按类型分组，点击跳转对应详情页。

**验收要点**：
- 搜索框（首页 ShellBar）聚焦后弹出搜索历史
- 输入字符 300ms 防抖后触发搜索
- 结果按实体类型分组（销售订单/生产订单/交货单/…），每组显示计数和图标
- 点击搜索结果跳转对应详情页
- 搜索历史存储到本地，最多 10 条，可单独删除（标签式 × 按钮）
- 输入后 500ms 内显示搜索结果
- 空结果提示"未找到匹配数据"

**初始结论**：小程序端无搜索功能，Web 端已有 `/api/search?q=` 可复用。

**当前状态**：❌ 未实现。需在首页集成搜索栏，新建搜索结果组件。

**依赖**：依赖 US-MP-03/US-MP-04 的详情页路由，搜索点击需要跳转到对应详情页。

**主要文件**（待建/改造）：
- `pages/index/index.{wxml,js}` — ShellBar 增加搜索入口
- `pages/search/search.{js,wxml,wxss,json}` — 搜索结果页（新建）
- `utils/api.js` — 新增 `search(q)` 方法

**关联 SPEC**：[SPEC-005](SPEC.md#spec-005-全局搜索)

---

### US-MP-06 — 视图切换（卡片/表格）

**角色**：全体业务用户

**故事**：用户在手机上默认看卡片视图（适合滑动浏览）；在平板上切换到表格视图，一次性看到更多字段。切换偏好持久化，下次进入页面自动恢复。

**验收要点**：
- 列表页顶部工具栏右侧显示切换图标（📋卡片 / 📊表格）
- 默认卡片视图（移动端优先）
- 点击切换，状态保存到 `wx.setStorageSync('viewMode', 'card'|'table')`
- 下次进入页面读取上次设置
- 表格视图横向可滚动
- 两种视图数据一致

**初始结论**：当前列表页仅有卡片视图，无表格视图和切换功能。库存页有汇总/明细切换但非卡片/表格范畴。

**当前状态**：❌ 未实现。需为所有列表页增加视图切换组件。

**主要文件**（待建/改造）：
- `components/view-switch/view-switch.{js,wxml,wxss,json}` — 视图切换组件（新建）
- 各列表页（8 个）集成该组件，支持卡片/表格双模式渲染
- `utils/view-mode.js` — 视图模式读写工具（新建）

**关联 SPEC**：[SPEC-006](SPEC.md#spec-006-视图切换)

---

### US-MP-07 — 交货单详情页

**角色**：仓储人员、物流专员

**故事**：仓储人员扫描交货单号，查看需要拣配的具体物料、计划数量和实际数量，点击关联销售订单跳转查看详情。

**验收要点**：
- **头部**：交货单号、类型 LF、客户、日期、状态（已过账 ✅）
- **行项目**：物料、描述、计划数量 vs 实际数量、过账日期
- **关联销售订单**：显示链接，点击跳转销售订单详情
- 正确展示计划/实际数量对比

**初始结论**：小程序端无交货单详情页，Web 端也无此页面（均为新增能力）。

**当前状态**：❌ 未实现。需新建 `pages/outbound-delivery/detail/detail` 页面。

**依赖**：依赖 US-MP-03，关联销售订单需跳转至销售订单详情页。

**主要文件**（待建/改造）：
- `pages/outbound-delivery/detail/detail.{js,wxml,wxss,json}` — 详情页（新建）
- `pages/outbound-delivery/outbound-delivery.js` — 列表点击跳转详情
- `utils/api.js` — 新增 `getOutboundDeliveryDetail()`、`getOutboundDeliveryItems()` 方法

**关联 SPEC**：[SPEC-007](SPEC.md#spec-007-交货单详情页)

---

### US-MP-08 — 开票单据详情页

**角色**：财务人员、销售助理

**故事**：财务人员核对开票金额，查看具体开票明细和关联的销售订单、交货单。

**验收要点**：
- **头部**：开票单号、类型 F2、客户、日期、金额 ¥xxx CNY、状态（已过账 ✅）
- **行项目**：物料、描述、净额
- **关联单据**：关联的销售订单和交货单链接，点击可跳转
- 金额格式化：千分位 + 保留 2 位小数 + ¥ 前缀

**初始结论**：小程序端无开票单据详情页，Web 端也无此页面（均为新增能力）。

**当前状态**：❌ 未实现。需新建 `pages/billing-documents/detail/detail` 页面。

**依赖**：依赖 US-MP-03/US-MP-07，关联单据需跳转至销售订单/交货单详情页。

**主要文件**（待建/改造）：
- `pages/billing-documents/detail/detail.{js,wxml,wxss,json}` — 详情页（新建）
- `pages/billing-documents/billing-documents.js` — 列表点击跳转详情
- `utils/api.js` — 新增 `getBillingDocumentDetail()`、`getBillingDocumentItems()` 方法

**关联 SPEC**：[SPEC-008](SPEC.md#spec-008-开票单据详情页)

---

## 4. 实施优先级

| 阶段 | US | 理由 |
|------|-----|------|
| **P0（第 1 批）** | US-MP-01 登录认证 | 安全基础，所有功能前提 |
| **P0（第 1 批）** | US-MP-02 首页 Dashboard | 小程序门面，用户第一印象 |
| **P0（第 2 批）** | US-MP-03 销售订单详情页 | 最高频查询场景 |
| **P0（第 2 批）** | US-MP-04 生产订单详情页 | 第二高频查询场景 |
| **P1（第 3 批）** | US-MP-05 全局搜索 | 提升查找效率，依赖 P0 详情页 |
| **P1（第 3 批）** | US-MP-06 视图切换 | 移动端体验优化，可独立实施 |
| **P2（第 4 批）** | US-MP-07 交货单详情页 | 从销售订单详情可跳转 |
| **P2（第 4 批）** | US-MP-08 开票单据详情页 | 从销售订单详情可跳转 |

### 跨 US 依赖关系

```
US-MP-01 (登录认证)
   ├── US-MP-02 (Dashboard)
   ├── US-MP-03 (销售订单详情)
   │      ├── US-MP-07 (交货单详情)
   │      └── US-MP-08 (开票单据详情)
   ├── US-MP-04 (生产订单详情)
   └── US-MP-05 (全局搜索) ── 依赖 US-MP-03 + US-MP-04 详情页路由
US-MP-06 (视图切换) ── 独立，可并行
```

---

## 5. 修订历史

| 日期 | 版本 | 说明 |
|------|------|------|
| 2026-06-18 | v1.0 | 初版：8 条 US，对照 SPEC-001~008 + URS.md 差距分析 |
| 2026-06-18 | v1.2 | US-MP-08 代码完成，状态更新为 🔧（8/8 US 全部完成） |

---

*本文档对照 miniprogram/SPEC.md 生成。后续 SPEC 新增或代码变更时，请同步更新 §2 状态表与 §3 US 明细。*
