# SAP S/4HANA Cloud 销售订单 GET 接口 — 实战调用指南

> 可直接落地使用 | OData V4 + BAPI WebService 双通道 | 含调试、排错、工具推荐

---

## 目录

- [前置准备（通用）](#前置准备通用)
- [方式一：OData V4 销售订单 GET 接口（推荐）](#方式一odata-v4-销售订单-get-接口推荐)
- [方式二：BAPI 类 GET 接口（7BAPI_SALESORDER_\*_\*\*\_WEBI）](#方式二bapi-类-get-接口7bapi_salesorder__web_webi)
- [调试工具推荐](#调试工具推荐)
- [常见报错与排查](#常见报错与排查)
- [简易调用步骤总结（落地流程）](#简易调用步骤总结落地流程)
- [本项目后端映射](#本项目后端映射)

---

## 前置准备（通用）

### 获取基础信息

| 配置项 | 当前项目值 |
|--------|-----------|
| 系统地址 | `https://my200967-api.s4hana.sapcloud.cn` |
| 认证用户 | `EPC_USER`（技术用户 ID: `CC0000000003`） |
| Client | `100` |
| 所需权限 | SD_SO_DISPLAY（销售订单查询权限） |

### 认证方式

S/4HANA Cloud 支持两种认证：

| 方式 | 适用场景 | 本项目使用 |
|------|---------|-----------|
| **Basic Auth** | 测试/内部集成 | ✅ 当前使用 |
| **OAuth 2.0** | 正式对外对接 | 待迁移 |

当前后端实现：`HTTPBasicAuth(settings.sap_username, settings.sap_password)`（`client_v4.py` 第 17 行）

---

## 方式一：OData V4 销售订单 GET 接口（推荐）

### 1. 服务根地址

```
https://<租户域名>/sap/opu/odata4/salesorder/srvd/salesorder/0001/
```

> 本项目为：`/sap/opu/odata4/sap/api_salesorder/srvd_a2x/sap/salesorder/0001/`（配置在 `config.py: sap_so_path`）

### 2. 核心 GET 场景 & 请求示例

#### 场景1：查询销售订单列表（批量查询）

##### 基础请求（查全部）
```http
GET /sap/opu/odata4/salesorder/srvd/salesorder/0001/SalesOrder
Host: <租户域名>
Authorization: Basic <base64编码>
Content-Type: application/json
```

##### 带筛选、分页、排序（实战常用）

OData V4 标准查询参数：
- `$filter` → 条件过滤
- `$top` → 分页行数
- `$skip` → 跳过行数
- `$orderby` → 排序
- `$select` → 指定返回字段（精简报文）

```http
GET /sap/opu/odata4/salesorder/srvd/salesorder/0001/SalesOrder
  ?$filter=CreationDate ge 2026-05-01 and SalesOrganization eq '3000'
  &$select=SalesOrder,Customer,CreationDate
  &$top=50
  &$orderby=CreationDate desc
Host: <租户域名>
Authorization: Basic <base64串>
```

**后端等效调用**：
```python
# client_v4.py 已支持
client.get_collection("SalesOrder", {
    "$filter": "CreationDate ge 2026-05-01 and SalesOrganization eq '3000'",
    "$select": "SalesOrder,Customer,CreationDate",
    "$top": "50",
    "$orderby": "CreationDate desc",
})
```

#### 场景2：根据订单号查询单张订单全明细
```http
GET /sap/opu/odata4/salesorder/srvd/salesorder/0001/SalesOrder(SalesOrder='0001234567')
Host: <租户域名>
Authorization: Basic <base64串>
```

**后端等效**：`GET /api/v1/sales-orders/0001234567`

#### 场景3：展开行项目明细（联查行项）
```http
GET /sap/opu/odata4/salesorder/srvd/salesorder/0001/SalesOrder(SalesOrder='0001234567')?$expand=_SalesOrderItem
Host: <租户域名>
Authorization: Basic <base64串>
```

**后端等效**：`GET /api/v1/sales-orders/0001234567?expandItems=true`

### 3. 常用筛选字段

| 字段名 | 说明 | 后端已支持 |
|--------|------|-----------|
| `SalesOrder` | 销售订单号 | ✅ |
| `Customer` | 客户编码 | ❌ |
| `SalesOrganization` | 销售组织 | ✅ |
| `DistributionChannel` | 分销渠道 | ✅ |
| `CreationDate` | 创建日期 | ❌ |
| `OverallSDProcessStatus` | 订单整体状态 | ❌ |
| `SoldToParty` | 售达方 | ❌ |

### 4. 正常返回格式

标准 **200 OK**，JSON 格式：
```json
{
  "@odata.context": ".../$metadata#SalesOrder",
  "value": [
    {
      "SalesOrder": "0001234567",
      "SalesOrderType": "OR",
      "Customer": "100001",
      "SalesOrganization": "1010",
      "CreationDate": "2026-05-15",
      ...
    }
  ]
}
```

---

## 方式二：BAPI 类 GET 接口（7BAPI_SALESORDER\_\*\_**\_WEBI\_）

本质是 **SOAP WebService**，部分网关支持 HTTP-GET 传参。

### 1. 核心 BAPI

| BAPI 名称 | 用途 |
|-----------|------|
| `BAPI_SALESORDER_GETLIST` | 获取订单清单 |
| `BAPI_SALESORDER_GETDETAIL` | 获取订单明细 |

### 2. 调用路径

```
https://<租户域名>/sap/bc/webdynpro/sap/7BAPI_SALESORDER_GETLIST_WEBI
```

### 3. GET 传参模式（简易调用）

```http
GET /sap/bc/webdynpro/sap/7BAPI_SALESORDER_GETLIST_WEBI
  ?CUSTOMER=100001
  &DATE_FROM=20260501
  &DATE_TO=20260530
Host: <租户域名>
Authorization: Basic <base64串>
```

### 4. 关键入参说明

| 参数名 | 说明 | 格式 |
|--------|------|------|
| `CUSTOMER` | 客户编码 | 字符串 |
| `SALES_ORG` | 销售组织 | 4位码 |
| `DATE_FROM` | 创建日期起始 | `YYYYMMDD` |
| `DATE_TO` | 创建日期截止 | `YYYYMMDD` |
| `SALESDOCUMENT` | 单个或多个订单号 | 字符串 |

> ⚠️ 复杂查询建议用 **POST + SOAP XML**，简单查询可用 GET 拼参。

---

## 调试工具推荐

| 工具 | 用途 | 推荐度 |
|------|------|--------|
| **Postman / Apifox** | 新建 GET → 填入 URL + Auth → 拼接 OData 参数 → 直接发请求 | ⭐⭐⭐ |
| 浏览器 | 简单查询（复杂筛选建议用工具） | ⭐⭐ |
| SAP 事务码 `/IWFND/GW_CLIENT` | SAP 内部测试 OData | ⭐⭐⭐ |
| 本项目 `diagnose_*.py` | 后端本地诊断 | ⭐⭐ |

---

## 常见报错与排查

| 错误码 | 原因 | 排查步骤 |
|--------|------|---------|
| **401 Unauthorized** | 账号密码错误 / 无访问权限 | 核对账号密码、重新生成 Base64 |
| **403 Forbidden** | 用户缺少销售订单查询权限 | SAP 后台分配 SD_SO_DISPLAY 权限角色；Communication Arrangement 中绑定 Inbound User |
| **404 Not Found** | 接口地址错误 / 服务未激活 | 核对入站服务 ID、激活 SICF 服务 |
| **406 Not Acceptable** | `Accept` 头类型错误 | `$metadata` 必须用 `Accept: application/xml` |
| **RAISE_SHORTDUMP** | ABAP 后端异常 | 用 ST22 查 dump 详情、逐步缩小请求参数定位 |
| **数据为空** | `$filter` 语法错误 / 条件范围无数据 | 检查字段名拼写、日期格式、编码值 |

### 本项目 403 专项

```
Communication Arrangement 配置步骤：
1. Fiori → Communication Arrangements
2. 新建/编辑 Sales Order 场景（CE_SALESORDER_0001）
3. 将 EPC_USER（CC0000000003）绑定到 CA 的 Inbound User
4. Communication System 勾选 Inbound Service: API_SALESORDER
5. 保存并 Deploy
```

---

## 简易调用步骤总结（落地流程）

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. 入站服务列表搜索「Sales Order」→ 复制接口根地址               │
│ 2. 工具新建 GET 请求 → 配置 Basic 认证                          │
│ 3. 选择场景：查清单 / 查单订单 / 联查行项 → 拼接 OData 参数      │
│ 4. 发送请求 → 校验返回数据（200 OK + JSON）                      │
│ 5. 正式开发时固化 URL、参数、异常处理                             │
└─────────────────────────────────────────────────────────────────┘
```

---

## 本项目后端映射

| 指南场景 | 后端端点 | 对应代码 |
|----------|---------|---------|
| 查订单列表（筛选） | `GET /api/v1/sales-orders?salesOrderType=OR&salesOrganization=1010` | `routes/sales_orders.py:15` |
| 查单张订单 | `GET /api/v1/sales-orders/0001234567` | `routes/sales_orders.py:99` |
| 联查行项 | `GET /api/v1/sales-orders/0001234567?expandItems=true` | `routes/sales_orders.py:99` |
| 分页 | `GET /api/v1/sales-orders?top=50` | `client_v4.py:66` (`fetch_all_pages`) |
| 同步到本地 | `POST /api/v1/sales-orders/sync` | `routes/sales_orders.py:122` |
| 离线样本同步 | `POST /api/v1/sales-orders/sync-from-sample` | `routes/sales_orders.py:171` |

---

> 📚 配套文档：`SAP销售订单GET接口体系.md`（架构分类 + CDS 映射 + 增强建议）
