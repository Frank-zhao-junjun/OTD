# E2E（Playwright × SAP 沙箱）

## 本地运行

```powershell
cd OTD
copy .env.e2e.example .env.e2e.local
# 编辑 SAP_PASSWORD 等
corepack pnpm run e2e:install
corepack pnpm run e2e
```

## GitHub Actions（PR / main）

工作流：`.github/workflows/e2e-sap.yml`

| Job | 说明 | 需要 Secrets |
|-----|------|----------------|
| `e2e-smoke` | 未登录跳转 | 否 |
| `e2e-sap` | 全量 UAT 自动化 | 是 |

在仓库 **Settings → Secrets and variables → Actions** 添加：

| Secret | 必填 | 说明 |
|--------|------|------|
| `SAP_USERNAME` | 是 | OData 通信用户 |
| `SAP_PASSWORD` | 是 | 沙箱密码 |
| `E2E_PHONE` | 否 | 门户手机号，默认 `13800000002` |
| `E2E_PASSWORD` | 否 | 门户密码，默认 `demo123` |
| `E2E_SALES_ORDER` | 否 | 详情用样本订单，默认 `1`（沙箱已知 1–13） |

Fork 来的 PR 不会跑 `e2e-sap`（无 Secrets），仅跑 smoke。

失败时可在 Actions 产物中下载 `playwright-report`。

## UAT 覆盖（自动化）

| 编号 | 文件 |
|------|------|
| 鉴权 | `auth-sap.spec.ts` |
| UAT-SO-001 | `sales-orders-sap.spec.ts` |
| UAT-SO-002 | `home-presets-sap.spec.ts` |
| UAT-SO-003 / 005 | `uat-so-003-005-detail.spec.ts` |
| UAT-SO-004 | `uat-so-004-filters.spec.ts` |
| UAT-SO-007 | `uat-so-007-risk-sort.spec.ts` |
| UAT-SO-015 | `uat-so-015-home-counts.spec.ts` |

未自动化：需多样本矩阵或人工判断的用例（010 大量分页、012 最近查询 6 次、014 金额核对等）。
