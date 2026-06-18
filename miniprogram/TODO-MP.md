# OTD 助手小程序 — 工作日志 (TODO)

| 属性 | 内容 |
|------|------|
| 文档版本 | v5.1 |
| 最后更新 | 2026-06-18 |
| 当前批次 | US-MP-08（全部完成 ✅）+ 防御性加固 |

---

## 0. 持续更新规则

**何时更新**：每个批次/每个维度的产出后立即更新本文档。
**更新内容**：进度摘要表 + 文件变更计数 + 新增决策 + 新发现的问题。
**检查点**：每批次结束时逐维核对六维状态，任一非绿灯则阻塞下一批次。

### 批次检查点模板

```
## YYYY-MM-DD — 第N批: [US范围]

| 维度 | 前态 | 后态 | 产出 |
|------|------|------|------|
| US | — | — | — |
| SPEC | — | — | — |
| PRD | — | — | — |
| TASK | — | — | — |
| TODO | — | — | — |
| TEST | — | — | — |

文件: +N/-M
决策: Dx, Dx+1...
问题: Qx, Qx+1...
```

---

## 2026-06-18 — 第1批: 登录认证 + 首页 Dashboard

### 进度摘要

| 维度 | 状态 | 产出 | 备注 |
|------|------|------|------|
| US | ✅ | US-MP.md v1.1 | 用户已审批 |
| SPEC | ✅ | SPEC.md SPEC-001, SPEC-002 | 已有 |
| PRD | ✅ | PRD-MP.md v1.0 | 黄→绿: 从 URS 升级为正式 PRD |
| TASK | ✅ | TASK-MP.md v1.0 | 6 项任务 + 依赖图 |
| TODO | ✅ | 本文档 v1.1 | 黄→绿: 增加持续更新规则 + 检查点模板 |
| TEST | ✅ | TEST-MP.md v1.1 | 红→绿: 反向验证 + 事前承诺（见 TEST §6） | |

### 文件变更 (+N/-M)

```
+13 / -0 新建
 6 / 0 修改

新建 (+13):
  pages/login/login.js              ← 登录逻辑
  pages/login/login.wxml            ← 登录模板
  pages/login/login.wxss            ← 登录样式
  pages/login/login.json            ← 登录配置
  pages/register/register.js        ← 注册逻辑
  pages/register/register.wxml      ← 注册模板
  pages/register/register.wxss      ← 注册样式（@import 复用）
  pages/register/register.json      ← 注册配置
  pages/index/index.json            ← 首页启用下拉刷新
  TASK-MP.md                        ← 任务拆解文档
  PRD-MP.md                         ← 产品需求文档（六维补全）
  TEST-MP.md                        ← 测试策略文档（六维补全）
  TODO-MP.md                        ← 本工作日志（六维补全）

修改 ( 3):
  app.js          ← +checkLogin/setToken/clearToken/isLoggedIn/handleUnauthorized
  app.json        ← +login +register 路由
  utils/api.js    ← 全重写: +x-session 注入 +401 拦截 +13 API 方法
  pages/index/index.js   ← 全重写: Dashboard 逻辑 + 登录态守卫
  pages/index/index.wxml ← 全重写: ShellBar + KPI + 活动流 + 模块网格
  pages/index/index.wxss ← 全重写: Dashboard 全套样式

总计: +13 新建, 6 修改, 0 删除
```

### 决策记录

| # | 决策 | 原因 |
|----|------|------|
| D1 | `API_HOST` 提到域根 | auth `/api/auth/*` 和 sap `/api/sap/*` 是兄弟路由，不宜硬编码 `/api/sap` |
| D2 | `handleUnauthorized` 防重入锁 | 多个 API 同时 401 时只触发一次跳转 |
| D3 | 验证码用纯文本而非 SVG | SPEC 指出小程序不支持直接渲染 SVG，后端需返回可渲染格式 |
| D4 | 首页 API 失败静默降级 | KPI 卡片显示 "—" 而非崩溃，用户体验优先 |
| D5 | 注册页样式 @import 登录页 | 布局完全一致，避免样式重复 |
| D6 | 首页 onShow 重新拉取数据 | 从登录/注册页面 reLaunch 回来后需要刷新 |
| D7 | TEST 文档事后补写，标注为方法论违规 | 代码先于 TEST，已反向验证 29/29 覆盖，第2批起严格执行事前定义 |

### 已知问题 / 待决议

| # | 问题 | 影响 |
|----|------|------|
| Q1 | `/api/auth/captcha` 返回 SVG 格式 | 小程序无法直接渲染，需协调后端返回 base64 PNG 或纯文本 |
| Q2 | 搜索入口点击暂用 toast 占位 | US-MP-05 实施后替换为实际搜索页跳转 |
| Q3 | KPI 数据字段 key 需与后端约定 | 当前假设 key: sales/production/delivery/stock |

---

## 2026-06-18 — 第2批: 销售订单详情页 + 生产订单详情页

### 进度摘要

| 维度 | 状态 | 产出 | 备注 |
|------|------|------|------|
| US | ✅ | US-MP.md v1.1, US-MP-03/04 | 免审批，已有 |
| SPEC | ✅ | SPEC.md SPEC-003, SPEC-004 | 免审批，已有 |
| PRD | ✅ | PRD-MP.md v1.0 | 覆盖第2批（v1.0 MVP 范围） |
| TASK | ✅ | TASK-MP.md v2.0 | 5 项任务 + 依赖图，已审批 |
| TEST | ✅ | TEST-MP.md v2.0 | ✅ 事前定义（CODE 之前产出），已审批 |
| CODE | ✅ | 本批次代码 | 5/5 任务完成，36/36 用例验证通过 |
| TODO | ✅ | 本文档 v2.0 | 当前更新 |

### 文件变更 (+N/-M)

```
+8 / -0 新建
 2 / 0 修改

新建 (+8):
  pages/sales-orders/detail/detail.js      ← 销售订单详情逻辑 (8区+三态)
  pages/sales-orders/detail/detail.wxml    ← 销售订单详情模板
  pages/sales-orders/detail/detail.wxss    ← 销售订单详情样式
  pages/sales-orders/detail/detail.json    ← 销售订单详情配置
  pages/production-orders/detail/detail.js ← 生产订单详情逻辑 (4区+三态)
  pages/production-orders/detail/detail.wxml ← 生产订单详情模板
  pages/production-orders/detail/detail.wxss ← 生产订单详情样式
  pages/production-orders/detail/detail.json ← 生产订单详情配置

修改 ( 2):
  pages/sales-orders/sales-orders.js       ← onViewDetail: showModal → navigateTo
  pages/production-orders/production-orders.js ← onViewDetail: showModal → navigateTo
  app.json                                 ← +2 detail 路由

总计: +8 新建, 3 修改, 0 删除
累计: +21 新建, 9 修改, 0 删除
```

### 决策记录

| # | 决策 | 原因 |
|----|------|------|
| D8 | `Promise.all` 并行请求详情+关联 | 减少等待时间，两个请求无依赖 |
| D9 | 定价明细默认折叠 | SPEC-003 §6 要求，减少首屏信息密度 |
| D10 | 生产订单兼容双字段名 | `ProductionOrder \|\| ManufacturingOrder`，兼容两套 OData 命名 |
| D11 | 工序进度 `>=100` 判绿 | 存在超产场景（合格>计划），100%也是绿色 |
| D12 | 齐套状态用 `>=` 判定 | 已提量 >= 需求量即齐套 |

### 已知问题 / 待决议

| # | 问题 | 影响 |
|----|------|------|
| Q4 | KPI "已交货比例" 目前用订单状态推导 | 跨行项目聚合比例需后端提供或前端逐行累加 |
| Q5 | 交货单/开票单跳转暂用 toast 占位 | US-MP-07/08 实施后替换 |
| Q6 | OData 字段名可能因 SAP 版本不同而异 | `ProductionOrder` vs `ManufacturingOrder` 等需联调确认 |

---

## 2026-06-18 — 第3批: 全局搜索 + 视图切换

### 进度摘要

| 维度 | 状态 | 产出 | 备注 |
|------|------|------|------|
| US | ✅ | US-MP.md v1.1 | 免审批 |
| SPEC | ✅ | SPEC.md SPEC-005, SPEC-006 | 免审批 |
| PRD | ✅ | PRD-MP.md v1.0 | 覆盖第3批（v1.1 范围） |
| TASK | ✅ | TASK-MP.md v3.0 | 6 项任务 |
| TEST | ✅ | TEST-MP.md v3.0 | ✅ 事前定义 |
| CODE | ✅ | 本批次代码 | 6/6 任务完成 |
| TODO | ✅ | 本文档 v3.0 | 当前更新 |

### 文件变更 (+N/-M)

```
+9 / -0 新建
 2 / 8 修改 (2 JS/WXML + 8×4 列表页集成)

新建 (+9):
  pages/search/search.js/wxml/wxss/json   ← 全局搜索页
  components/view-switch/*.js/wxml/wxss/json ← 视图切换组件
  utils/view-mode.js                       ← 视图偏好读写

修改 (26):
  pages/index/index.js                     ← onSearchTap: toast → navigateTo
  app.json                                 ← +search 路由
  pages/sales-orders/*                     ← 集成 view-switch
  pages/production-orders/*                ← 集成 view-switch
  pages/material-stock/*                   ← 集成 view-switch
  pages/products/*                         ← 集成 view-switch
  pages/outbound-delivery/*                ← 集成 view-switch
  pages/billing-documents/*                ← 集成 view-switch
  pages/material-documents/*               ← 集成 view-switch
  pages/customers/*                        ← 集成 view-switch

总计: +9 新建, 26 修改, 0 删除
累计: +30 新建, 35 修改, 0 删除
```

### 决策记录

| # | 决策 | 原因 |
|----|------|------|
| D13 | 搜索页独立路由而非内嵌组件 | 全屏搜索体验更好，SPEC 明确独立页面 |
| D14 | 搜索历史用去重+前置策略 | 最近搜索排在最前，去重避免重复，≤10 条 |
| D15 | path 正则匹配路由分发 | 搜索结果返回 path 字符串，前端解析跳转对应详情页 |
| D16 | viewMode 按页面独立存储 | `viewModes` 对象 key=pageKey，每个列表页独立偏好 |
| D17 | 表格视图用 flex 固定列宽 | 比 `<table>` 更可控，适配小程序的 scroll-view |

### 已知问题 / 待决议

| # | 问题 | 影响 |
|----|------|------|
| Q7 | 搜索 `/api/search` 返回的 `path` 字段需与前端路由匹配 | 格式不一致会导致跳转失败 |
| Q8 | 表格视图在不同屏幕宽度下表现差异 | iPad/大屏手机可能需要响应式列宽 |

---

## 修订历史

| 日期 | 版本 | 说明 |
|------|------|------|
| 2026-06-18 | v1.0 | 第1批初始工作日志 |
| 2026-06-18 | v1.1 | 六维补全：+PRD-MP.md +TEST-MP.md +持续更新规则 +检查点模板 |
| 2026-06-18 | v1.2 | TEST 红灯修复：反向验证 29/29 + D7 违规记录 + 第2批事前承诺 |
| 2026-06-18 | v2.0 | 第2批完成：+8新建 3修改，36/36 用例验证通过，D8-D12 决策，Q4-Q6 问题 |
| 2026-06-18 | v3.0 | 第3批完成：+9新建 26修改，D13-D17 决策，Q7-Q8 问题 |
| 2026-06-18 | v4.0 | US-MP-07 完成：+4新建 4修改，链路闭环（SO详情→交货单，搜索→交货单） |
| 2026-06-18 | v5.0 | US-MP-08 完成：+4新建 6修改，全链路闭环（8/8 US 全部完成 🎉） |
| 2026-06-18 | v5.1 | 防御性加固：响应包裹兼容 + $expand fallback + 日期格式 + wx:key + loading计数 |

---

## 2026-06-18 — 第4批续: US-MP-08 开票单据详情页

### 进度摘要

| 维度 | 状态 | 产出 | 备注 |
|------|------|------|------|
| US | ✅ | US-MP.md v1.2 | US-MP-08 免审批 |
| SPEC | ✅ | SPEC.md SPEC-008 | 免审批 |
| PRD | ✅ | PRD-MP.md v1.0 | 覆盖第4批（v1.1 范围） |
| TASK | ✅ | TASK-MP.md v4.0 | 已包含 US-MP-08 |
| TEST | ✅ | TEST-MP.md v5.0 | ✅ 事前定义，15 项测试用例 |
| CODE | ✅ | 本批次代码 | 4/4 文件创建 + 6 文件修改完成 |
| TODO | ✅ | 本文档 v5.0 | 当前更新 |

### 文件变更 (+N/-M)

```
+4 / -0 新建
 6 / 0 修改

新建 (+4):
  pages/billing-documents/detail/detail.js    ← 开票详情逻辑 (3区+三态+关联跳转)
  pages/billing-documents/detail/detail.wxml  ← 开票详情模板
  pages/billing-documents/detail/detail.wxss  ← 开票详情样式 (SAP Horizon)
  pages/billing-documents/detail/detail.json  ← 开票详情配置

修改 ( 6):
  pages/billing-documents/billing-documents.js   ← +onViewDetail: toast → navigateTo
  pages/billing-documents/billing-documents.wxml ← +bindtap on card & table
  pages/sales-orders/detail/detail.js            ← onTapBilling: toast → navigateTo
  pages/search/search.js                         ← +billing path regex 匹配
  app.json                                       ← +billing-documents/detail 路由

总计: +4 新建, 6 修改, 0 删除
累计: +34 新建, 41 修改, 0 删除
```

### 决策记录

| # | 决策 | 原因 |
|----|------|------|
| D18 | 开票详情页无独立 KPI 区域 | 开票单核心信息(金额/币种)已在头部大字展示，无需额外 KPI 卡片 |
| D19 | 关联单据条件渲染 | 仅当存在 ReferenceSDDocument/DeliveryDocument 时才显示对应区域 |
| D20 | statusColor 默认 #107E3E | 开票单通常只有已过账/已取消状态，默认绿色 |
| D21 | OData 双字段兼容 | `BillingDocumentStatus \|\| OverallBillingStatus` 兼容 V2/V4 |

### 已知问题 / 待决议

| # | 问题 | 影响 |
|----|------|------|
| Q9 | 开票单关联字段名依赖 SAP 版本 | `ReferenceSDDocument` vs `SalesDocument` 需联调确认 |
| Q10 | 币种默认 CNY | 如果 SAP 返回其他币种(USD/EUR)，金额格式化逻辑需确认 |

### 全项目收尾

- **8/8 US 全部代码完成** 🎉
- **全部 125 项测试用例已定义**（事前：93 项；事后补验证：29 项；US-MP-08：15 项）
- **全链路导航闭环完成**：SO 详情 ⇄ 交货单 ⇄ 开票单，搜索 → 任意详情页
