# OTD 助手小程序 — 任务拆解 (TASK)

| 属性 | 内容 |
|------|------|
| 文档版本 | v4.0 |
| 生成日期 | 2026-06-18 |
| 覆盖范围 | 第1~3批 + 第4批: US-MP-07 |
| 基线 US | [US-MP.md](US-MP.md) |
| 基线 SPEC | [SPEC.md](SPEC.md) |

---

# 第1批：登录认证 + 首页 Dashboard

| 执行状态 | ✅ 已完成 |
| 基线 US | US-MP-01, US-MP-02 |
| 基线 SPEC | SPEC-001, SPEC-002 |

---

## 1. 任务总览

```
T-MP-01 (app.js) ──────────────────────┐
T-MP-02 (api.js) ──────────────────────┤
                                        ├── T-MP-06 (Dashboard)
T-MP-03 (登录页) ──┐                    │
T-MP-04 (注册页) ──┼── T-MP-05 (路由) ──┘
```

| # | 任务 | 文件数 | 依赖 | 可独立验证 | 状态 |
|----|------|--------|------|------------|------|
| T-MP-01 | app.js 登录态基础设施 | 1 | — | ✅ | ✅ |
| T-MP-02 | api.js 认证注入 | 1 | — | ✅ | ✅ |
| T-MP-03 | 登录页 | 4 | T-MP-02 | ✅ | ✅ |
| T-MP-04 | 注册页 | 4 | T-MP-02 | ✅ | ✅ |
| T-MP-05 | 路由注册 | 1 | T-MP-03, T-MP-04 | ✅ | ✅ |
| T-MP-06 | 首页 Dashboard | 4 | T-MP-01, T-MP-02 | ✅ | ✅ |

---

## 2. 任务明细

### T-MP-01 — app.js 登录态基础设施

**文件**：`app.js`（1 个）

**改动点**：
- `onLaunch` 增加 `checkLogin()` 调用
- 新增 `checkLogin()`：读取 Storage `auth_token`，无则 `wx.reLaunch` 跳转登录页
- 新增 `setToken(token, userInfo)`：写入 `globalData` + `wx.setStorageSync`
- 新增 `clearToken()`：清除内存和 Storage
- 新增 `isLoggedIn()`：判断登录态
- 新增 `handleUnauthorized()`：401 回调，带防重入锁，清除 token 后 2s 跳转登录页

**验证方式**：清除小程序缓存后启动 → 应跳转登录页；手动设置 `auth_token` 后重启 → 留在当前页。

---

### T-MP-02 — api.js 认证注入

**文件**：`utils/api.js`（1 个）

**改动点**：
- `API_BASE_URL` → `API_HOST`（域根），auth 路由用 `/api/auth/*`，sap 用 `/api/sap/*`
- `request()` 自动读取 `auth_token` 注入 `x-session` header
- `res.statusCode === 401` 时调用 `app.handleUnauthorized()`
- 新增 `options.hideLoading`、`options.silent`、`options.loadingTitle` 控制项
- 新增 11 个 API 方法：`getCaptcha / login / register / getMe / getDashboard / search / getSalesOrderDetail / getSalesOrderRelated / getProductionOrderDetail / getOutboundDeliveryDetail / getOutboundDeliveryItems / getBillingDocumentDetail / getBillingDocumentItems`
- 新增工具函数：`formatAmount(value, currency)`、`formatDate(value)`

**验证方式**：调用 `api.getCaptcha()` → 应发起 `/api/auth/captcha` 请求并返回 valid response（可能为 mock）。

---

### T-MP-03 — 登录页

**文件**（4 个）：
- `pages/login/login.js` — 登录逻辑
- `pages/login/login.wxml` — 登录模板
- `pages/login/login.wxss` — 登录样式
- `pages/login/login.json` — 页面配置

**功能点**：
- 用户名/密码/验证码输入 + 实时字段校验
- 密码显隐切换
- 验证码点击刷新
- 登录按钮 loading 态
- 校验失败红色提示；登录失败模糊提示"用户名或密码错误"+ 自动刷新验证码
- 登录成功：`setToken` → toast → `reLaunch` 首页
- 底部"去注册"跳转

**验证方式**：输入非法用户名（<3 字符）→ 红色提示；输入正确凭证 → 跳转首页；输入错误密码 → 提示 + 验证码刷新。

---

### T-MP-04 — 注册页

**文件**（4 个）：
- `pages/register/register.js` — 注册逻辑
- `pages/register/register.wxml` — 注册模板
- `pages/register/register.wxss` — 注册样式（@import 复用登录）
- `pages/register/register.json` — 页面配置

**功能点**：
- 用户名/密码/确认密码/验证码输入 + 校验
- 确认密码一致性校验（密码变更时自动联动校验）
- 注册成功：自动登录 → toast → `reLaunch` 首页
- 底部"去登录"返回

**验证方式**：两次密码不一致 → 红色提示；修改密码后确认密码联动校验；注册成功 → 直接进入首页。

---

### T-MP-05 — 路由注册

**文件**：`app.json`（1 个）

**改动点**：`pages` 数组首行增加 `pages/login/login` 和 `pages/register/register`

**验证方式**：开发者工具中页面列表出现 login 和 register；手动 `wx.navigateTo({url: '/pages/login/login'})` 可正常跳转。

---

### T-MP-06 — 首页 Dashboard

**文件**（4 个）：
- `pages/index/index.js` — Dashboard 逻辑
- `pages/index/index.wxml` — Dashboard 模板
- `pages/index/index.wxss` — Dashboard 样式
- `pages/index/index.json` — 启用下拉刷新

**功能点**：
- ShellBar：Logo + 搜索入口（预留 US-MP-05）
- KPI 2×2 网格：蓝(销售)/绿(生产)/橙(发货)/紫(库存)，左侧 3px 色条
- 最近活动流：圆点颜色区分 success/warning/error/info
- 8 模块 2 行 × 4 列图标网格（业务交易 4 + 主数据 4）
- 下拉刷新 `onPullDownRefresh`
- `onLoad` / `onShow` 双重登录态守卫
- Dashboard API 失败静默降级（保留 KPI 骨架）

**验证方式**：登录后进入首页 → KPI 卡片显示；下拉 → 触发刷新动画；API 不可用时 KPI 显示 "—" 而非崩溃。

---

## 3. 验收矩阵

| 验收点 | 来源 | 覆盖任务 | 状态 |
|--------|------|----------|------|
| 未登录自动跳转登录页 | SPEC-001 §7 | T-MP-01, T-MP-03 | ✅ |
| 输入正确凭证 1s 内完成登录 | SPEC-001 §7 | T-MP-03 | 待实测 |
| 密码错误验证码自动刷新 | SPEC-001 §7 | T-MP-03 | ✅ |
| token 过期自动跳转登录页 | SPEC-001 §7 | T-MP-01, T-MP-02 | ✅ |
| 注册成功后自动登录 | SPEC-001 §7 | T-MP-04 | ✅ |
| 首页加载 2s 内显示 KPI | SPEC-002 §6 | T-MP-06 | 待实测 |
| 下拉刷新成功更新数据 | SPEC-002 §6 | T-MP-06 | ✅ |
| Dashboard API 不可用时降级 | US-MP-02 | T-MP-06 | ✅ |
| 字段校验实时红色提示 | US-MP-01 | T-MP-03, T-MP-04 | ✅ |

---

## 4. 修订历史

| 日期 | 版本 | 说明 |
|------|------|------|
| 2026-06-18 | v1.0 | 第1批 6 项任务拆解 + 验收矩阵 |
| 2026-06-18 | v2.0 | 追加第2批 5 项任务：销售订单详情页 + 生产订单详情页 |
| 2026-06-18 | v3.0 | 第2批状态→✅ + 追加第3批 6 项任务：全局搜索 + 视图切换 |
| 2026-06-18 | v4.0 | 第3批状态→✅ + 追加 US-MP-07 4 项任务：交货单详情页 |

---

# 第2批：销售订单详情页 + 生产订单详情页

| 执行状态 | ✅ 已完成 |
| 基线 US | US-MP-03, US-MP-04 |
| 基线 SPEC | SPEC-003, SPEC-004 |

---

## 2.1 任务总览

```
T-MP-07 (销售订单详情页) ── T-MP-08 (列表页改造) ──┐
                                                    ├── T-MP-11 (路由注册)
T-MP-09 (生产订单详情页) ── T-MP-10 (列表页改造) ──┘
```

| # | 任务 | 文件数 | 依赖 | 可独立验证 | 状态 |
|----|------|--------|------|------------|------|
| T-MP-07 | 销售订单详情页 | 4 | — | ✅ | ✅ |
| T-MP-08 | 销售订单列表页改造 | 1 | T-MP-07 | ✅ | ✅ |
| T-MP-09 | 生产订单详情页 | 4 | — | ✅ | ✅ |
| T-MP-10 | 生产订单列表页改造 | 1 | T-MP-09 | ✅ | ✅ |
| T-MP-11 | 路由注册 | 1 | T-MP-07, T-MP-09 | ✅ | ✅ |

---

## 2.2 任务明细

### T-MP-07 — 销售订单详情页

**文件**（4 个，新建）：
- `pages/sales-orders/detail/detail.js`
- `pages/sales-orders/detail/detail.wxml`
- `pages/sales-orders/detail/detail.wxss`
- `pages/sales-orders/detail/detail.json`

**功能点**（对应 SPEC-003）：
1. **头部信息**：订单号 + 类型 + 客户 + 日期 + 金额 + 状态 Badge
2. **KPI 卡片**（3 张横排）：净额 ¥xx、行项目数 xx、已交货比例 xx%
3. **行项目列表**：物料、描述、数量×单价=净额、已交货比例条
4. **定价明细**（可折叠，默认折叠）：净价/增值税/总计
5. **发货信息**：关联交货单列表（单号、数量、状态）
6. **开票信息**：关联开票单据列表（单号、金额、状态）
7. **生产订单**：MTO 关联的生产订单（单号、物料、状态）
8. **业务伙伴**：售达方/送达方

**数据获取**：
- 步骤 1：`api.getSalesOrderDetail(id)` → OData V4 $expand=_Item,_Partner,_PricingElement
- 步骤 2：`api.getSalesOrderRelated(id)` → 关联的交货单/开票单/生产订单

**状态颜色映射**：C=绿(#107E3E)、A=蓝(#0A6ED1)、B=橙(#E9730C)

**验证方式**：从销售订单列表点击某订单 → 跳转详情页 → 8 个信息区正确渲染 → 折叠/展开定价明细 → 点击关联单据号可跳转（US-MP-07/08 实施后）。

---

### T-MP-08 — 销售订单列表页改造

**文件**（1 个，修改）：
- `pages/sales-orders/sales-orders.js`

**改动点**：
- `onViewDetail(e)`：将 `wx.showModal({...})` 替换为 `wx.navigateTo({ url: '/pages/sales-orders/detail/detail?id=' + orderId })`

**验证方式**：列表页点击卡片 → 不再弹窗 → 导航到详情页。

---

### T-MP-09 — 生产订单详情页

**文件**（4 个，新建）：
- `pages/production-orders/detail/detail.js`
- `pages/production-orders/detail/detail.wxml`
- `pages/production-orders/detail/detail.wxss`
- `pages/production-orders/detail/detail.json`

**功能点**（对应 SPEC-004）：
1. **头部信息**：订单号 + 工厂 + 物料 + 产品组 + 状态 Badge
2. **KPI 卡片**（4 张 2×2）：计划量、实际量、工序数、组件数
3. **工序进度表**：工序号、描述、工作中心、计划/实际日期对比、进度条（100%=绿、<100%=橙）、合格/报废数量
4. **组件清单**：物料、描述、需求量/已提量、齐套状态（已齐套=绿、部分=橙、待提货=灰）

**数据获取**：
- `api.getProductionOrderDetail(id)` → OData V4 $expand=_Component,_Operation

**进度条颜色**：100%=绿(#107E3E)、<100%=橙(#E9730C)
**齐套状态**：已齐套=绿、部分=橙、待提货=灰(#94A3B8)

**验证方式**：从生产订单列表点击某订单 → 跳转详情页 → 4 个信息区正确渲染 → 进度条百分比正确 → 齐套状态颜色正确。

---

### T-MP-10 — 生产订单列表页改造

**文件**（1 个，修改）：
- `pages/production-orders/production-orders.js`

**改动点**：
- `onViewDetail(e)`：将 `wx.showModal({...})` 替换为 `wx.navigateTo({ url: '/pages/production-orders/detail/detail?id=' + orderId })`

**验证方式**：列表页点击卡片 → 不再弹窗 → 导航到详情页。

---

### T-MP-11 — 路由注册

**文件**（1 个，修改）：
- `app.json`

**改动点**：`pages` 数组增加 `pages/sales-orders/detail/detail` 和 `pages/production-orders/detail/detail`

**验证方式**：开发者工具页面列表出现两个新 detail 页面。

---

## 2.3 验收矩阵

| 验收点 | 来源 | 覆盖任务 |
|--------|------|----------|
| 点击列表卡片跳转详情页（非弹窗） | US-MP-03/04 | T-MP-08, T-MP-10 |
| 销售订单详情 8 个信息区完整 | SPEC-003 §3 | T-MP-07 |
| 页面加载 3s 内显示完整数据 | SPEC-003 §7 | T-MP-07 |
| 状态颜色正确（C=绿/A=蓝/B=橙） | SPEC-003 §7 | T-MP-07 |
| 定价明细可折叠，默认折叠 | SPEC-003 §6 | T-MP-07 |
| 生产订单详情 4 个信息区完整 | SPEC-004 §3 | T-MP-09 |
| 工序进度条百分比正确 | SPEC-004 §7 | T-MP-09 |
| 齐套状态颜色正确 | SPEC-004 §7 | T-MP-09 |
| 计划/实际日期对比清晰 | SPEC-004 §7 | T-MP-09 |
| 关联单据点击可跳转（预留） | SPEC-003 §6 | T-MP-07 |

---

# 第3批：全局搜索 + 视图切换

| 执行状态 | ⏳ 待审批 |
| 基线 US | US-MP-05, US-MP-06 |
| 基线 SPEC | SPEC-005, SPEC-006 |

---

## 3.1 任务总览

```
T-MP-12 (搜索页) ── T-MP-13 (首页入口+路由)     ← US-MP-05

T-MP-14 (视图切换组件+工具) ─┬── T-MP-15 (核心4列表页)
                             └── T-MP-16 (其余4列表页)    ← US-MP-06
```

| # | 任务 | 文件数 | 依赖 | 可独立验证 | 状态 |
|----|------|--------|------|------------|------|
| T-MP-12 | 全局搜索页 | 4 | — | ✅ | ✅ |
| T-MP-13 | 首页搜索入口 + 路由 | 2 | T-MP-12 | ✅ | ✅ |
| T-MP-14 | 视图切换组件 + 工具 | 5 | — | ✅ | ✅ |
| T-MP-15 | 核心列表页集成视图切换 | 4 | T-MP-14 | ✅ | ✅ |
| T-MP-16 | 其余列表页集成视图切换 | 4 | T-MP-14 | ✅ | ✅ |

---

## 3.2 任务明细

### T-MP-12 — 全局搜索页

**文件**（4 个，新建）：
- `pages/search/search.js`
- `pages/search/search.wxml`
- `pages/search/search.wxss`
- `pages/search/search.json`

**功能点**（对应 SPEC-005）：
1. 搜索输入框自动聚焦，输入 300ms 防抖调用 `/api/search?q=`
2. 搜索历史：`wx.setStorageSync('searchHistory', [])`，最多 10 条，标签式 + × 删除
3. 搜索结果按实体类型分组：每组显示图标 + 名称 + 计数
4. 点击结果跳转对应详情页（已实现：sales/production detail；其余 toast 占位）
5. 空结果提示"未找到匹配数据"
6. 搜索框右侧"取消"按钮返回上一页

**API**：`api.search(q)` → `{ results: [{ group, icon, items: [{ label, description, path }] }] }`

**跳转映射**：
| path 模式 | 目标 |
|-----------|------|
| `/sales-orders/:id` | `pages/sales-orders/detail/detail?id=:id` |
| `/production-orders/:id` | `pages/production-orders/detail/detail?id=:id` |
| 其余 | toast "详情即将上线" |

**验证方式**：首页点击搜索 → 输入"1000" → 500ms 内分组结果出现 → 点击结果跳转详情 → 返回后搜索历史出现"1000"标签。

---

### T-MP-13 — 首页搜索入口 + 路由

**文件**（2 个，修改）：
- `pages/index/index.js` — `onSearchTap`: toast → `navigateTo(/pages/search/search)`
- `app.json` — +`pages/search/search`

**验证方式**：首页点击搜索栏 → 跳转搜索页。

---

### T-MP-14 — 视图切换组件 + 工具

**文件**（5 个，新建）：
- `components/view-switch/view-switch.js` — 组件逻辑
- `components/view-switch/view-switch.wxml` — 切换按钮 UI
- `components/view-switch/view-switch.wxss` — 样式
- `components/view-switch/view-switch.json` — 组件配置
- `utils/view-mode.js` — `getViewMode()` / `setViewMode(mode)` 读写 Storage

**组件接口**：
- Properties: `mode: 'card' | 'table'`
- Events: `bind:change` → `{ mode: 'card' | 'table' }`
- UI: 两个图标按钮 📋 / 📊，当前选中的高亮

**验证方式**：在任一页面引入组件 → 默认显示卡片图标高亮 → 点击表格图标 → 触发 change 事件 → Storage 更新。

---

### T-MP-15 — 核心列表页集成视图切换

**文件**（4 个，修改）：
- `pages/sales-orders/sales-orders` — (.js, .wxml, .wxss)
- `pages/production-orders/production-orders`
- `pages/material-stock/material-stock`
- `pages/products/products`

> 这 4 个是 tabBar 页面 + 最高频使用的列表页。

**每页改动**：
- JS: 引入 `getViewMode/setViewMode`，data 加 `viewMode`，onLoad 读取偏好，onViewModeChange 切换+保存
- WXML: 顶部工具栏引入 `<view-switch>` 组件；卡片/表格用 `wx:if` 切换
- WXSS: 新增表格模式样式（横向 scroll-view）

**验证方式**：进入销售订单列表 → 默认卡片 → 点击 📊 → 切换表格 → 退出再进 → 仍是表格。

---

### T-MP-16 — 其余列表页集成视图切换

**文件**（4 个，修改）：
- `pages/outbound-delivery/outbound-delivery`
- `pages/billing-documents/billing-documents`
- `pages/material-documents/material-documents`
- `pages/customers/customers`

**改动**：与 T-MP-15 完全相同的模式。

---

## 3.3 验收矩阵

| 验收点 | 来源 | 覆盖任务 |
|--------|------|----------|
| 输入后 500ms 显示搜索结果 | SPEC-005 §6 | T-MP-12 |
| 结果按实体类型正确分组 | SPEC-005 §6 | T-MP-12 |
| 搜索历史正确记录和展示（≤10条） | SPEC-005 §6 | T-MP-12 |
| 空结果提示"未找到匹配数据" | SPEC-005 §6 | T-MP-12 |
| 搜索结果点击跳转详情页 | SPEC-005 §5 | T-MP-12 |
| 首页搜索入口跳转 | US-MP-05 | T-MP-13 |
| 默认显示卡片视图 | SPEC-006 §5 | T-MP-15, T-MP-16 |
| 切换后状态持久化 | SPEC-006 §5 | T-MP-14, T-MP-15, T-MP-16 |
| 表格视图横向可滚动 | SPEC-006 §5 | T-MP-15, T-MP-16 |
| 两种视图数据一致 | SPEC-006 §5 | T-MP-15, T-MP-16 |

---

# US-MP-07：交货单详情页

| 执行状态 | ⏳ 待审批 |
| 基线 US | US-MP-07 |
| 基线 SPEC | SPEC-007 |

---

## 4.1 任务总览

```
T-MP-18 (交货单详情页 4新) ──┬── T-MP-19 (列表页改造 1改)
                              ├── T-MP-20 (关联跳转改造 2改)
                              └── T-MP-21 (路由注册 1改)
```

| # | 任务 | 文件数 | 依赖 | 状态 |
|----|------|--------|------|------|
| T-MP-18 | 交货单详情页 | 4 | — | ⏳ |
| T-MP-19 | 列表页 onViewDetail 改造 | 1 | T-MP-18 | ⏳ |
| T-MP-20 | 关联跳转改造（SO详情+搜索） | 2 | T-MP-18 | ⏳ |
| T-MP-21 | 路由注册 | 1 | T-MP-18 | ⏳ |

---

## 4.2 任务明细

### T-MP-18 — 交货单详情页

**文件**（4，新建）：
- `pages/outbound-delivery/detail/detail.{js,wxml,wxss,json}`

**功能点**（对应 SPEC-007）：
1. **头部**：交货单号 + 类型 LF + 客户 + 日期 + 状态 Badge
2. **行项目列表**：物料、描述、计划数量 vs 实际数量、过账日期
3. **关联销售订单**：显示链接，点击跳转销售订单详情页

**数据获取**：
- `api.getOutboundDeliveryDetail(id)` → V2 header
- `api.getOutboundDeliveryItems(id)` → V2 items

**API 已就绪**（第1批 api.js 已添加）

---

### T-MP-19 — 交货单列表页改造

**文件**（1，修改）：
- `pages/outbound-delivery/outbound-delivery.js` — onViewDetail: showModal → `navigateTo(/pages/outbound-delivery/detail/detail?id=...)`

---

### T-MP-20 — 关联跳转改造

**文件**（2，修改）：
- `pages/sales-orders/detail/detail.js` — onTapDelivery: toast → `navigateTo(/pages/outbound-delivery/detail/detail?id=...)`
- `pages/search/search.js` — onTapResult: delivery path → `navigateTo(/pages/outbound-delivery/detail/detail?id=...)`

---

### T-MP-21 — 路由注册

**文件**（1，修改）：
- `app.json` — +`pages/outbound-delivery/detail/detail`

---

## 4.3 验收矩阵

| 验收点 | 来源 | 覆盖任务 |
|--------|------|----------|
| 正确显示交货单行项目 | SPEC-007 §5 | T-MP-18 |
| 计划/实际数量对比 | SPEC-007 §3 | T-MP-18 |
| 可跳转关联销售订单 | SPEC-007 §5 | T-MP-18, T-MP-20 |
| 列表点击跳转详情 | US-MP-07 | T-MP-19 |
| 全局搜索结果跳转 | US-MP-07 | T-MP-20 |
