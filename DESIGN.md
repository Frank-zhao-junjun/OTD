# DESIGN.md

## 设计思考

### 产品定位
SAP ERP数据查询助手，面向企业内部用户，提供8大核心业务数据的快速查询能力。

### 气质与意象
- **关键词**：专业、清晰、高效、数据驱动
- **具象场景**：企业办公环境，用户在简洁的工作台前快速检索业务数据，屏幕上是整洁的数据表格，没有多余装饰，信息一目了然

### 设计风格：Data-Dense Dashboard
- **风格**：数据密集型仪表盘，最大化信息密度
- **布局**：12列网格，8px间距，紧凑但可读
- **设计变量**：
  - `--grid-gap: 8px`
  - `--card-padding: 12px`
  - `--table-row-height: 36px`
  - `--sidebar-width: 240px`
  - `--header-height: 56px`

### 配色方案
- **Primary**: `#1E40AF` (深蓝 - 企业级专业感)
- **Secondary**: `#3B82F6` (亮蓝 - 操作与链接)
- **CTA/Highlight**: `#F59E0B` (琥珀 - 关键操作和警示)
- **Background**: `#F8FAFC` (slate-50 - 轻灰背景)
- **Surface**: `#FFFFFF` (白色卡片)
- **Text Primary**: `#1E3A8A` (深蓝文字)
- **Text Muted**: `#64748B` (slate-500 - 辅助文字)
- **Border**: `#E2E8F0` (slate-200 - 边框)
- **功能色**：
  - 成功/正向：`#22C55E` (green-500)
  - 警告/待处理：`#F59E0B` (amber-500)
  - 错误/异常：`#EF4444` (red-500)
  - 信息：`#3B82F6` (blue-500)

### 字体排版
- **字体族**：Inter (英文) + 系统中文字体栈
- **表格数据**：`text-sm` (14px)，行高36px，紧凑排列
- **标题层级**：
  - H1: `text-2xl font-bold` (24px)
  - H2: `text-xl font-semibold` (20px)
  - H3: `text-lg font-medium` (18px)
- **数据数字**：`font-mono tabular-nums` 等宽数字对齐

### 页面结构
- **侧边栏**：固定左侧240px，模块导航 + 折叠
- **顶部栏**：面包屑 + 搜索 + 用户信息
- **查询区**：搜索框 + 筛选条件 + 查询按钮（水平排列，节省垂直空间）
- **数据区**：shadcn Table组件，支持排序、分页、行高亮
- **详情区**：行展开或Sheet侧边面板

### 组件规范
- **表格**：shadcn Table，紧凑型(zebra stripe)，行hover高亮，sticky header
- **按钮**：shadcn Button，微圆角(6px)，primary/secondary/outline/ghost变体
- **输入框**：shadcn Input，聚焦ring-2 ring-blue-500，带label
- **卡片**：shadcn Card，`shadow-sm`，白底，1px border
- **Badge**：shadcn Badge，状态色背景+文字
- **对话框**：shadcn Sheet(侧边) / Dialog(居中)
- **加载态**：Skeleton骨架屏(pulse动画)，查询按钮loading+disabled
- **空状态**：图标+文案+操作引导
- **错误态**：Alert variant=destructive，明确原因+重试按钮

### 交互与状态
- **Hover**：行hover背景`bg-slate-50`，过渡150ms
- **点击**：cursor-pointer所有可交互元素
- **加载**：Skeleton骨架屏 > Spinner，查询按钮显示loading
- **筛选**：smooth filter animations，过渡200ms
- **展开**：Sheet侧边面板滑入，duration-300
- **Toast**：shadcn Toast通知操作结果
- **分页**：shadcn Pagination，每页选择器

### 响应式
- Desktop (1440px+): 侧边栏展开 + 主内容区
- Laptop (1024px): 侧边栏折叠为icons + 主内容区
- Tablet (768px): 侧边栏overlay + 表格横向滚动
- Mobile (375px): 底部导航 + 卡片列表替代表格

### 设计禁忌
- 禁止花哨渐变和过度装饰
- 禁止emoji作为图标（使用Lucide SVG图标）
- 禁止复杂动画影响数据查看效率
- 禁止颜色过多导致视觉混乱
- 禁止信息层级不清晰
- 禁止placeholder-only输入框（必须配label）
- 禁止无反馈的表单提交（必须loading→success/error）
