# OTD 助手 — M7/M8 实施计划

> **Goal:** 完成 OTD 助手剩余里程碑：E2E 测试（Playwright）+ 性能优化（M7）和高级安全（M8）
>
> **Architecture:** Next.js 16 App Router, Playwright for E2E, jose for JWT
>
> **Tech Stack:** Next.js 16 · React 19 · TypeScript 5 · Playwright 1.61 · jose 6 · bcryptjs 3 · Supabase

---

## Task 1: E2E 测试基础设施

**Objective:** 搭建 Playwright E2E 测试框架，覆盖核心用户旅程

**Files:**
- Create: `tests/e2e/auth.spec.ts`
- Create: `tests/e2e/sales-order.spec.ts`
- Create: `tests/e2e/production-order.spec.ts`
- Create: `playwright.config.ts`（如无）
- Modify: `package.json` — 添加 `test:e2e` 脚本

**TC:** M7-PW-01~05

**Step 1: 检查 Playwright 是否已安装**

Run: `npx playwright --version`
Expected: 显示版本号（如 `1.61.0`）
如果未安装：`pnpm add -D @playwright/test && npx playwright install chromium`

**Step 2: 创建 playwright.config.ts**

```typescript
import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30000,
  use: { baseURL: 'http://localhost:5000', headless: true },
  webServer: {
    command: 'pnpm dev',
    port: 5000,
    reuseExistingServer: true,
  },
});
```

**Step 3: 写 3 个 E2E 测试**

**测试 1 — 登录流程（TC-M7-PW-01）**
```typescript
// tests/e2e/auth.spec.ts
test('用户能完成登录流程', async ({ page }) => {
  await page.goto('/login');
  await page.fill('input[name="username"]', 'admin');
  await page.fill('input[name="password"]', 'admin123');
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL('/');
});
```

**测试 2 — 销售订单列表（TC-M7-PW-02）**
```typescript
// tests/e2e/sales-order.spec.ts
test('销售订单列表能加载', async ({ page }) => {
  await page.goto('/sales-orders');
  await expect(page.locator('[data-testid="order-list"]')).toBeVisible();
});
```

**测试 3 — 生产订单详情（TC-M7-PW-03）**
```typescript
// tests/e2e/production-order.spec.ts
test('生产订单详情能展示', async ({ page }) => {
  await page.goto('/production-orders');
  await page.click('[data-testid="order-row"]:first-child');
  await expect(page.locator('[data-testid="order-detail"]')).toBeVisible();
});
```

**Step 4: 运行验证**

Run: `npx playwright test tests/e2e/auth.spec.ts`
Expected: PASS

**Step 5: Commit**

```bash
git commit -m "test(e2e): M7 Playwright E2E auth + sales + production"
```

---

## Task 2: 性能优化

**Objective:** 达到 PRD 性能指标（LCP < 2s, API < 3s）

**TC:** M7-PERF-01~03

**Step 1: 测量基线**

Run: `npx playwright test tests/e2e/perf-baseline.spec.ts`
工具：使用 Playwright 的 `page.metrics()` 或 Chrome DevTools Protocol 采集 LCP

**Step 2: 优化 SAP 代理响应**

关键文件：`src/app/api/sap/[service]/[entity]/route.ts`
- 添加 HTTP keep-alive（`https.Agent({ keepAlive: true })`）
- 添加响应缓存（内存 Map，TTL 60s）
- 减少 serialization 开销（`JSON.stringify` 只调用一次）

**验证：**
Run: `curl -w '%{time_total}' http://localhost:5000/api/sap/API_PRODUCT_SRV/A_Product?$top=1`
Expected: time_total < 3000ms

**Step 3: 优化前端加载**

- 确认动态导入（`next/dynamic`）用于重型组件
- 确认图片懒加载
- 确认字体预加载（Fiori 72 字体）

**验证：**
Run: `npx playwright open --profile=chromium http://localhost:5000` → DevTools → Performance
Expected: LCP < 2s

**Step 4: Commit**

```bash
git commit -m "perf: M7 SAP proxy keep-alive + cache, LCP under 2s"
```

---

## Task 3: 高级安全

**Objective:** 实现 PRD M8 功能：登录失败锁定 + 审计日志

**TC:** M8-SEC-01~04

**Step 1: 登录失败锁定**

修改文件：`src/app/api/auth/login/route.ts`

```typescript
// 新增：登录失败计数器（内存 Map）
const loginAttempts = new Map<string, { count: number; lockedUntil: number }>();
const MAX_ATTEMPTS = 5;
const LOCK_DURATION_MS = 15 * 60 * 1000; // 15分钟

// 在密码校验失败分支中：
const record = loginAttempts.get(username) || { count: 0, lockedUntil: 0 };
if (Date.now() < record.lockedUntil) {
  return Response.json({ error: '账户已锁定，请15分钟后再试' }, { status: 429 });
}
record.count++;
if (record.count >= MAX_ATTEMPTS) {
  record.lockedUntil = Date.now() + LOCK_DURATION_MS;
  record.count = 0;
}
loginAttempts.set(username, record);
```

**测试：**
```typescript
// tests/e2e/security.spec.ts
test('连续5次密码错误后锁定', async () => { /* ... */ });
```

**Step 2: 审计日志**

创建文件：`src/lib/audit-log.ts`

```typescript
export interface AuditEntry {
  userId: string;
  action: string;
  detail: string;
  ip: string;
  timestamp: string;
}

const auditLog: AuditEntry[] = [];
const MAX_LOG = 1000;

export function addAuditLog(entry: Omit<AuditEntry, 'timestamp'>) {
  auditLog.push({ ...entry, timestamp: new Date().toISOString() });
  if (auditLog.length > MAX_LOG) auditLog.shift();
}

export function getAuditLog(userId?: string): AuditEntry[] {
  return userId ? auditLog.filter(e => e.userId === userId) : [...auditLog];
}
```

在登录成功/失败、登出、SAP 配置变更等关键操作处调用 `addAuditLog()`。

**测试：**
```typescript
test('审计日志记录登录成功和失败', () => {
  addAuditLog({ userId: 'u1', action: 'LOGIN_SUCCESS', detail: 'admin', ip: '127.0.0.1' });
  expect(getAuditLog('u1')).toHaveLength(1);
});
```

**Step 3: 验证码过期后状态保持**

修改 `src/app/api/auth/captcha/route.ts`：
- 验证码使用后立即失效（防止重复使用）
- 增加 30s 冷却期（同一 IP 30s 内只能请求一次）

**Step 4: 运行全部安全测试**

Run: `npx vitest run tests/unit/security/`
Expected: ALL PASS

**Step 5: Commit**

```bash
git commit -m "feat(security): M8 login lockout + audit log + captcha hardening"
```

---

## 验证清单

| TC ID | 测试 | 类型 |
|-------|------|------|
| M7-PW-01 | 登录 E2E | ✅ 自动化 |
| M7-PW-02 | 销售订单 E2E | ✅ 自动化 |
| M7-PW-03 | 生产订单 E2E | ✅ 自动化 |
| M7-PERF-01 | LCP < 2s | Manual (DevTools) |
| M7-PERF-02 | API < 3s | ✅ curl |
| M8-SEC-01 | 5次失败锁定 | ✅ 自动化 |
| M8-SEC-02 | 锁定后提示"15分钟" | ✅ 自动化 |
| M8-SEC-03 | 审计日志记录 | ✅ 自动化 |
| M8-SEC-04 | 验证码防重放 | ✅ 自动化 |

## 风险

| 风险 | 影响 | 缓解 |
|------|------|------|
| Playwright 安装失败（pnpm） | M7 阻塞 | 降级到 `npx playwright install --with-deps` |
| 登录失败锁定影响 E2E 测试 | 测试顺序依赖 | 每个测试前 clean state |
| 审计日志内存增长 | 服务重启丢失 | MVP 先用内存，后续可换文件/数据库 |
