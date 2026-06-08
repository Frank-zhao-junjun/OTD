import { expect, test } from '@playwright/test';
import { loginPortal } from './helpers/auth';
import { describeSapSandbox } from './helpers/sap-env';
import { runSalesOrderSearch, searchSalesOrderByNo } from './helpers/sales-orders';

describeSapSandbox('UAT-SO-007 risk and sort', () => {
  test.beforeEach(async ({ page }) => {
    await loginPortal(page, '/sales-orders');
  });

  test('list shows risk column and default risk sort option', async ({ page }) => {
    await searchSalesOrderByNo(page, '1');
    await expect(page.getByText('风险 / 优先级')).toBeVisible();
    await expect(page.getByText(/风险优先级/)).toBeVisible();
  });

  test('can switch sort to order date', async ({ page }) => {
    await searchSalesOrderByNo(page, '1');
    await page.getByRole('combobox').filter({ hasText: /风险优先级/ }).click();
    await page.getByRole('option', { name: '订单日期' }).click();
    await expect(page.getByRole('combobox').filter({ hasText: /订单日期/ })).toBeVisible();
  });
});
