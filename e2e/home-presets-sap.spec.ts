import { expect, test } from '@playwright/test';
import { loginPortal } from './helpers/auth';
import { describeSapSandbox } from './helpers/sap-env';
import { runSalesOrderSearch, waitForSalesOrderListReady } from './helpers/sales-orders';

describeSapSandbox('home quick views × SAP sandbox (UAT-SO-002)', () => {
  test.beforeEach(async ({ page }) => {
    await loginPortal(page, '/');
  });

  test('unfinished orders preset navigates and queries SAP', async ({ page }) => {
    await page.getByRole('link', { name: /未完成订单/ }).click();
    await expect(page).toHaveURL(/preset=open/);
    await expect(page.getByText('快捷视图：')).toBeVisible();
    await waitForSalesOrderListReady(page, { clickSearch: false });
  });

  test('clear preset banner allows manual search', async ({ page }) => {
    await page.goto('/sales-orders?preset=open');
    await expect(page.getByText('快捷视图：')).toBeVisible({ timeout: 30_000 });
    await page.getByRole('button', { name: '清除快捷视图' }).click();
    await expect(page).toHaveURL(/\/sales-orders$/);
    await runSalesOrderSearch(page);
  });
});
