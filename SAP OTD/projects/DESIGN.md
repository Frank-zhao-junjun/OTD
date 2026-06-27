# DESIGN.md

## 设计思考

### 产品定位
SAP ERP数据查询助手，面向企业内部用户，提供8大核心业务数据的快速查询能力。

### 气质与意象
- **关键词**：专业、清晰、高效、数据驱动
- **具象场景**：企业办公环境，用户在简洁的工作台前快速检索业务数据，屏幕上是整洁的数据表格，没有多余装饰，信息一目了然

### 设计风格：SAP Fiori 3
- **风格**：SAP Fiori 3 设计语言，数据密集型仪表盘
- **主色**：#0070F2 (Fiori Blue)
- **8px基准网格**：所有间距基于8的倍数
- **设计变量**：
  - `--fiori-shell-height: 44px`
  - `--fiori-tile-height: 120px`
  - `--fiori-oli-height: 72px`
  - `--fiori-status-bar: 4px`
  - `--fiori-grid-base: 8px`

### 配色方案
- **Primary**: #0070F2 (Fiori Blue)
- **Background**: #FAFAFA (浅灰背景)
- **Surface**: #FFFFFF (白色卡片)
- **Text Primary**: #1A2228
- **Text Muted**: #6A6D70
- **Border**: #E4E4E4
- **状态色**：
  - 成功：#107E3E
  - 警告：#E9730C
  - 错误：#BB0000
  - 信息：#0A6ED1
  - 中性：#6A6D70

### 字体排版
- **字体族**：72, 72full, Inter, PingFang SC (Fiori 72字体优先，Inter回退)
- **数据数字**：tabular-nums 等宽对齐
- **标题层级**：
  - H1: 20px font-bold (ObjectHeader标题)
  - H2: 16px font-semibold (ShellBar标题)
  - Body: 14px (正文)
  - Small: 12px (辅助文字)
  - Label: 11px uppercase tracking-wide (字段标签)

### 页面结构
- **ShellBar**：44px高度，主色背景，汉堡菜单+标题+搜索+通知+头像
- **侧边栏**：固定左侧240px，分组导航，移动端overlay
- **首页**：Tile网格，图标+KPI数字+副标题
- **列表页**：ObjectListItem卡片(左4px状态色条+三行布局)，桌面端可切换表格
- **详情页**：ObjectHeader+字段两列网格
- **筛选**：FilterBar抽屉+FAB浮动按钮

### 组件规范
- **Tile**：120px高度，8px圆角，hover边框变蓝，active scale(0.98)
- **ObjectListItem**：72px高度，左4px状态色条，hover阴影+边框
- **Badge**：4px圆角，状态色背景12%透明度
- **FAB**：48px圆形，fixed右下角，z-40
- **Sidebar**：分组标签uppercase 11px，item 13px 36px行高

### 交互与状态
- **Hover**：Tile/ObjectListItem边框变蓝+阴影加深
- **Active**：scale(0.98)点击反馈
- **Loading**：Skeleton骨架屏
- **状态色条**：ObjectListItem左侧4px彩色竖条标识状态

### 响应式
- Desktop (1024px+): 侧边栏展开 + Tile 3列
- Laptop/Tablet (768px): 侧边栏折叠 + Tile 2列
- Mobile (640px-): 侧边栏overlay + Tile 1列 + ObjectListItem卡片 + 表格pop-in

### 设计禁忌
- 禁止花哨渐变和过度装饰
- 禁止emoji作为图标（使用Lucide SVG图标）
- 禁止复杂动画影响数据查看效率
- 禁止颜色过多导致视觉混乱
- 禁止信息层级不清晰
- 禁止placeholder-only输入框（必须配label）
- 禁止无反馈的表单提交（必须loading→success/error）
