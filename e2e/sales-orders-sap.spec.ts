import { expect, test } from '@playwright/test';
import { loginPortal } from './helpers/auth';
import { describeSapSandbox, e2eSandboxSalesOrder } from './helpers/sap-env';
import {
  openSalesOrderRow,
  runSalesOrderSearch,
  searchSalesOrderByNo,
} from './helpers/sales-orders';

describeSapSandbox('sales orders × SAP sandbox (UAT-SO-001)', () => {
  test.beforeEach(async ({ page }) => {
    await loginPortal(page, '/sales-orders');
    await expect(page.getByRole('heading', { name: '销售订单' })).toBeVisible();
  });

  test('default scope list query against SAP', async ({ page }) => {
    await expect(page.getByText(/销售组织.*1010/)).toBeVisible();
    await runSalesOrderSearch(page);
    await expect(page.getByText('查询结果')).toBeVisible();
  });

  test('open sandbox sample order detail panel (UAT-SO-001)', async ({ page }) => {
    const salesOrderNo = e2eSandboxSalesOrder();
    await searchSalesOrderByNo(page, salesOrderNo);
    await openSalesOrderRow(page, salesOrderNo);
    await expect(page.getByRole('tab', { name: '履约进度' })).toBeVisible({ timeout: 60_000 });
    await expect(page.getByText('订单详情与穿透')).toBeVisible();
  });
});
