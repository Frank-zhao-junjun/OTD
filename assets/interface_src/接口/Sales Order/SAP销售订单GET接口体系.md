# SAP S/4HANA Cloud 销售订单 GET 接口体系

> 适配 ES+OTD 助手入站服务体系 | 按使用优先级、接口类型分类  
> 所有接口均为读取/查询（GET）类型 | 云端集成最常用方案

---

## 目录

- [当前后端实现状态](#当前后端实现状态)
- [类型 1：OData/RESTful API（首选）](#类型-1odatarestful-api首选)
- [类型 2：BAPI 读取接口（传统兼容）](#类型-2bapi-读取接口传统兼容)
- [CDS 视图 / 实体映射](#cds-视图--实体映射)
- [实战避坑](#实战避坑)
- [通信安排配置](#通信安排配置)

---

## 当前后端实现状态

| 模块 | 状态 | 说明 |
|------|------|------|
| `backend/app/sap/client_v4.py` | ✅ 已实现 | `SapODataV4Client` 封装 OData V4 协议 |
| `backend/app/routes/sales_orders.py` | ✅ 已实现 | 销售订单列表/详情/门户视图/同步 API |
| `config.py: sap_so_path` | ✅ 已配置 | `/sap/opu/odata4/sap/api_salesorder/srvd_a2x/sap/salesorder/0001/` |
| OData `$filter` / `$top` | ✅ 已使用 | 支持按 SO type、SalesOrg、DistChannel、Division 过滤 |
| OData `$expand=_Item` | ✅ 已使用 | expandItems 参数 |
| OData `$select` 字段筛选 | ⚠️ 未使用 | 可优化网络传输量 |
| OData `$expand=_Partner` | ⚠️ 未使用 | 合作伙伴数据需单独请求 |
| OData `$expand=_Text` / Text 实体 | ⚠️ 未使用 | 长文本（备注）需单独处理 |
| OData 分页（`@odata.nextLink`） | ✅ 已实现 | fetch_all_pages() |
| BAPI `7BAPI_SALESORDER_*_WEBI` | ❌ 未实现 | 传统 ABAP 场景备用 |
| BAPI RFC 客户端 | ❌ 未实现 | 需 SAP NW RFC SDK |

---

## 类型 1：OData/RESTful API（首选）

S/4HANA Cloud 对外集成主推方案。基于 OData V4 协议，纯 HTTP GET，支持分页、筛选、排序、关联展开。

### 1.1 销售订单主接口（最常用）

| 属性 | 值 |
|------|-----|
| 接口名称 | Sales Order (A2X) |
| OData 访问路径 | `/sap/opu/odata4/sap/api_salesorder/srvd_a2x/sap/salesorder/0001/` |
| 页面检索关键字 | Sales Order、Read |
| 归属业务域 | Order Fulfillment Management（订单履约）、Sales Management（销售管理） |
| 后端客户端 | `SapODataV4Client` (`client_v4.py`) |
| 后端路由 | `GET /api/v1/sales-orders` |

#### 核心 GET 操作

```http
# 1. 查询销售订单列表
GET /SalesOrder?sap-client=100
  &$top=50
  &$filter=SalesOrderType eq 'OR'
    and SalesOrganization eq '1010'
    and DistributionChannel eq '10'
    and OrganizationDivision eq '00'

# 2. 查询单张订单明细（抬头+行项目+合作伙伴+定价）
GET /SalesOrder(SalesOrder='0000000001')?$expand=_Item

# 3. 按订单号直接查询
GET /SalesOrder('0000000001')?sap-client=100

# 4. 关联展开合作伙伴
GET /SalesOrder('0000000001')?$expand=_Partner

# 5. 关联展开定价要素
GET /SalesOrder('0000000001')?$expand=_PricingElement
```

#### 后端映射

```
用户请求 → GET /api/v1/sales-orders?expandItems=true&top=50
         → sales_order_service.list_sales_orders()
         → SapODataV4Client.get_collection("SalesOrder", params)
         → SAP GET /SalesOrder?sap-client=100&$top=50&$expand=_Item&$filter=...
```

#### 高级 OData 参数（当前后端可增强）

| 参数 | 用途 | 示例 | 后端现状 |
|------|------|------|----------|
| `$expand` | 一次性拉取嵌套数据 | `$expand=_Item,_Partner,_PricingElement` | 仅 `_Item` |
| `$select` | 按需筛选字段减少传输 | `$select=SalesOrder,Customer,TotalNetAmount` | ❌ 未使用 |
| `$filter` | 高级过滤语法 | `$filter=CreationDate ge 2026-05-01` | 基础过滤 |
| `$orderby` | 排序 | `$orderby=CreationDate desc` | ❌ 未使用 |
| `$skip` / `$top` | 分页 | `$skip=100&$top=50` | `$top` 已用 |

### 1.2 销售订单行项目查询接口

| 属性 | 值 |
|------|-----|
| 接口名称 | Sales Order Item |
| 实体集 | `SalesOrderItem` |
| 用途 | 单独拉取订单行项目明细（商品、数量、单价） |
| 后端路由 | `GET /api/v1/sales-orders/portal-lines` |

```http
# 按订单号查行项目
GET /SalesOrderItem?sap-client=100
  &$top=50
  &$filter=SalesOrder eq '0000000001'
```

### 1.3 计划行（交期/确认数量）

```http
GET /SalesOrderScheduleLine?sap-client=100
  &$top=50
  &$filter=SalesOrder eq '0000000001'
```

### 1.4 完整 Entity Sets（metadata 定义）

| 实体集 | 说明 | 后端覆盖 |
|--------|------|----------|
| `SalesOrder` | 订单头 | ✅ |
| `SalesOrderItem` | 订单行 | ✅ |
| `SalesOrderScheduleLine` | 计划行/交期 | ❌ |
| `SalesOrderPartner` | 头合作伙伴 | ❌ |
| `SalesOrderItemPartner` | 行合作伙伴 | ❌ |
| `SalesOrderPricingElement` | 头定价元素 | ❌ |
| `SalesOrderItemPricingElement` | 行定价元素 | ❌ |
| `SalesOrderRelatedObject` | 关联单据 | ❌ |
| `SalesOrderItemRelatedObject` | 行关联单据 | ❌ |
| `SalesOrderText` | 头长文本（备注） | ❌ |
| `SalesOrderItemText` | 行长文本（备注） | ❌ |

---

## 类型 2：BAPI 读取接口（传统兼容）

> ⚠️ **演进建议**：全新第三方系统集成优先使用 OData A2X。BAPI 仅适用于老版本 SAP ERP 迁移的中间件或内部 ABAP 系统 RFC 调用。

### BAPI 接口清单

| 接口名称 | 标准入站 ID | 核心能力 |
|----------|-------------|----------|
| 销售订单 - 获取清单 | `7BAPI_SALESORDER_GETLIST_WEBI` | 批量查询订单清单，支持按订单号、客户、日期、状态筛选，返回抬头基础数据 |
| 销售订单 - 获取明细 | `7BAPI_SALESORDER_GETDETAIL_WEBI` | 根据订单号查询单张订单全量明细（抬头、行项、交货/开票状态、合作伙伴等） |
| 销售订单 - 获取状态 | `7BAPI_SALESORDER_GETSTATUS_WEBI` | 轻量查询：仅获取订单流转状态（已交货、已开票、取消、部分履约） |

### BAPI 入站 ID 命名规范

```
7BAPI_{MODULE}_{ACTION}_WEBI
      ↑        ↑       ↑
      |        |       └── Web Interface 标识
      |        └── 动作名（GETLIST / GETDETAIL / GETSTATUS）
      └── 模块前缀
```

### BAPI 继承规则

```
筛选规则：名称中含 Get/Read，不含 Create/Change/Post → 纯查询接口 ✅
```

### BAPI 集成路线图（待实现）

```
[第三方老旧系统] → RFC / SOAP → SAP PI/PO → 7BAPI_SALESORDER_*_WEBI
[现代系统]       → HTTP GET  → OData V4  → CE_SALESORDER_0001（当前方案 ✅）
```

---

## CDS 视图 / 实体映射

开发或配置时可在 SAP 系统的"自定义 CDS 视图"或官方 API 中心检索：

| 层级 | CDS 视图 | OData 实体 | 说明 |
|------|----------|-----------|------|
| 抬头 | `A_SalesOrder` | `SalesOrder` | 订单主数据 |
| 行项目 | `A_SalesOrderItem` | `_Item`（导航属性） | 商品/数量/单价 |
| 合作伙伴 | `A_SalesOrderPartner` | `_Partner`（导航属性） | 售达方/送达方/付款方 |
| 定价要素 | `A_SalesOrderPrcgElmnt` | `_PricingElement`（导航属性） | 条件类型/金额 |

---

## 实战避坑

### 1. 长文本（Header/Item Texts）盲区

| 问题 | 说明 |
|------|------|
| 现状 | S/4HANA Cloud 公共云出于"纯净核心"原则，标准 CDS 视图和部分 API **不直接提供**订单头/行项目长文本 |
| 影响 | 用户在界面手动输入的备注文本无法通过标准 OData 直接读取 |
| 建议方案 | ① 检查 SAP Business Accelerator Hub 上是否有独立 Text Management API ② 通过 BAdI 将文本同步到扩展字段再抽取 |

实体集 `SalesOrderText` 和 `SalesOrderItemText` 存在于 metadata 中，但实际数据可用性需在具体租户验证。

### 2. 权限问题（403）

```
EPC_USER → 403 No authorization to access service group 'API_SALESORDER'
```

**解决**：Fiori → Communication Arrangements → 新建/编辑 Sales Order 场景，将 EPC_USER 绑定到 Inbound User。

### 3. RAISE_SHORTDUMP（ABAP 后端崩溃）

若配好权限后仍报短 dump：
- 先用最小请求 `GET /SalesOrder?sap-client=100&$top=1` 排除基础连接问题
- 逐步加 `$filter` / `$expand` 定位触发参数
- 查 ST22 获取 ABAP dump 详情

### 4. 订单号格式

- OData Key 查询要求 **10 位**格式：`'0000000001'` ✅
- 不要使用简短格式：`'1'` ❌

### 5. $expand 与复杂 $filter 组合

```http
# ⚠️ 风险组合（可能触发后端短 dump）
GET /SalesOrder?$filter=...复杂条件...&$expand=_Item

# ✅ 推荐：分两步
GET /SalesOrder?$filter=SalesOrder eq '0000000001'
GET /SalesOrder('0000000001')?$expand=_Item
```

---

## 通信安排配置

### 通信场景

| 场景 | OData 服务 | 用途 |
|------|-----------|------|
| `SAP_COM_0109` | `API_SALES_ORDER_SRV` (V2) | 经典销售订单集成 |
| CE_SALESORDER_0001 | `API_SALESORDER` (V4) | 当前后端使用 ✅ |

### 通信用户

| 属性 | 值 |
|------|-----|
| 用户 | `EPC_USER` |
| 技术用户 ID | `CC0000000003` |
| SAP 租户 | `my200967-api.s4hana.sapcloud.cn` |
| Client | `100` |
| 公司代码 / 销售组织 | `1010` |

### 配置步骤

1. Fiori → Communication Arrangements
2. 新建/编辑 Sales Order 场景
3. 将 `EPC_USER`（CC0000000003）绑定到 CA 的 Inbound User
4. Communication System 勾选 Inbound Service: `API_SALESORDER`
5. 保存并 Deploy
6. 用 Postman 或后端诊断脚本验证

---

## 附录：后端增强建议

基于当前实现，建议按优先级增强：

| 优先级 | 增强项 | 收益 |
|--------|--------|------|
| 🔴 高 | 添加 `$select` 参数支持 | 减少网络传输 60%+ |
| 🔴 高 | `$expand=_Partner` 支持 | 一次性获取客户名称 |
| 🟡 中 | `$expand=_PricingElement` 支持 | 获取定价条件 |
| 🟡 中 | 计划行 (`ScheduleLine`) 端点 | 交期查询 |
| 🟢 低 | BAPI RFC 客户端 | 传统系统兼容 |
| 🟢 低 | 长文本独立读取逻辑 | 备注信息获取 |
