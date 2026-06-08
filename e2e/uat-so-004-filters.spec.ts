import { expect, test } from '@playwright/test';
import { loginPortal } from './helpers/auth';
import { describeSapSandbox } from './helpers/sap-env';
import { runSalesOrderSearch, searchSalesOrderByNo } from './helpers/sales-orders';

describeSapSandbox('UAT-SO-004 multi-condition filters', () => {
  test.beforeEach(async ({ page }) => {
    await loginPortal(page, '/sales-orders');
  });

  test('exact sales order number returns row or empty state', async ({ page }) => {
    await searchSalesOrderByNo(page, '1');
    const row = page.getByRole('cell', { name: '1', exact: true });
    const empty = page.getByText('暂无数据');
    await expect(row.or(empty)).toBeVisible();
  });

  test('non-existent order shows 暂无数据 without query failure banner', async ({ page }) => {
    await searchSalesOrderByNo(page, '9999999999');
    await expect(page.getByText('暂无数据')).toBeVisible();
    await expect(page.getByText('查询失败')).toHaveCount(0);
  });

  test('default scope list shows result table area', async ({ page }) => {
    await runSalesOrderSearch(page);
    await expect(page.getByText('查询结果')).toBeVisible();
  });
});
