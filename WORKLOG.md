# WORKLOG.md — OTD 助手开发日志

## 2026-06-16

### 文档完善
- 创建 SPEC.md 技术规格文档（系统架构、API规格、数据模型、组件架构）
- 创建 PRD.md 产品需求文档（功能需求、用户故事、里程碑）
- 创建 WORKLOG.md 开发日志
- 更新 README.md（功能特性、项目结构、API清单）

## 2026-06-12

### 用户认证系统
- 实现登录页面 `/login`（用户名 + 密码 + 4位数字验证码）
- 实现注册页面 `/register`（用户名 + 密码 + 确认密码 + 可选邮箱/显示名）
- 创建 5 个认证 API：captcha、register、login、logout、me
- JWT Token 管理（jose 签名验证，httpOnly Cookie，7天有效期）
- bcryptjs 密码哈希存储
- 验证码 SVG 动态生成（4位数字 + 干扰线 + 噪点，5分钟过期）
- 中间件路由保护（未登录重定向 /login，已登录跳过登录页）
- ShellBar 用户菜单（显示用户名 + 退出登录）

### 响应式视图模式
- 创建 `useViewMode` Hook（PC 默认表格，移动端默认卡片）
- 8 个列表页全部支持表格/卡片切换
- 用户手动切换后保持选择

### 生产订单实际产出
- 销售订单行项目弹窗中生产订单增加 ActualDeliveredQuantity 字段
- API select 参数添加实际产出数量

### Fiori 3 视觉升级
- GenericTile 顶部 4px 语义色带（8色色板）
- KPI 卡片组件（左侧色条 + 标签 + 大数字 + 趋势）
- PageHeader 面包屑导航
- ObjectListItem 三栏布局 + 底部属性行
- Section Header（左侧 3px 主色竖条）
- Activity Stream（状态色圆点 + 文本 + 时间）
- Sidebar 产品切换器 + 激活项 3px 蓝色竖条
- FioriObjectStatus 组件（语义图标 + 颜色配对）
- FioriFacetGroup 键值对表
- Home 页面重构（KPI 区 + Tiles + 活动流）

## 2026-06-11

### 销售订单关联单据
- 创建 `/api/sap/sales-order/[id]/related` API
- 行项目点击弹窗显示关联发货单、开票单、生产订单
- 发货单关联：ReferenceSDDocument 过滤 + Header 获取日期
- 开票单关联：SalesDocument 过滤 + Header 获取日期
- 生产订单关联：SalesOrder 过滤（ItemCategory !== 'TAN'）
- 修复：API 直连 SAP 改为代理调用（避免路径后缀遗漏）
- 修复：select 参数移除不存在字段（ActualGoodsMovementDate 等）
- 修复：日期从 Header 获取而非 Item

### 加载更多分页
- 8 个列表页从翻页改为"加载更多"按钮
- 每页 20 条，增量追加

### 日期格式修复
- formatDate 支持 V2 `/Date(ts)/` 和 V4 `YYYY-MM-DD` 两种格式
- 新增 formatSapTime 处理 Edm.Time 类型 `PT14H30M0S`
- 修复开票单据 CreationTime 显示

### 名称显示
- 所有物料代码后显示物料名称（ProductDescription）
- 所有客户代码后显示客户名称（CustomerName）
- 涉及 6 个页面：material-stock、production-orders、sales-orders、material-documents、outbound-delivery、billing-documents

### 其他修复
- outbound-delivery 页面 Hook 规则违反修复
- billing-documents 页面 TS 类型错误修复
- data 引用错误修复

## 2026-06-10

### 项目初始化
- Next.js 16 + TypeScript 5 + Tailwind CSS 4 项目搭建
- SAP OData 通用代理 API（V2/V4 自动识别）
- 8 大 SAP 服务对接（API_PRODUCT_SRV、API_BUSINESS_PARTNER、API_SALES_ORDER_SRV、API_MATERIAL_STOCK_SRV、API_OUTBOUND_DELIVERY_SRV、API_BILLING_DOCUMENT_SRV、API_MATERIAL_DOCUMENT_SRV、CE_PRODUCTIONORDER_0001）
- 8 个业务模块列表页 + 详情页
- Fiori 3 组件库（ShellBar、Sidebar、Tile、ObjectListItem、Badge、FilterBar）
- SAP Fiori 3 设计语言（主色 #0070F2、8px 网格、状态色）
- 响应式布局（Mobile/Tablet/Desktop）
- Mock 模式支持（USE_MOCK=true）
- 微信小程序基础框架
