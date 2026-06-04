import { expect, test } from '@playwright/test';
import { loginPortal } from './helpers/auth';
import { describeSapSandbox, e2eSandboxSalesOrder } from './helpers/sap-env';
import {
  openSalesOrderRow,
  searchSalesOrderByNo,
  waitForOrderDetailChain,
} from './helpers/sales-orders';

describeSapSandbox('UAT-SO-003 / UAT-SO-005 detail drill-through', () => {
  test.beforeEach(async ({ page }) => {
    await loginPortal(page, '/sales-orders');
    await searchSalesOrderByNo(page, e2eSandboxSalesOrder());
    await openSalesOrderRow(page, e2eSandboxSalesOrder());
    await waitForOrderDetailChain(page);
  });

  test('UAT-SO-005: fulfillment tabs are reachable without leaving page', async ({ page }) => {
    await expect(page.getByRole('tab', { name: '履约进度' })).toBeVisible();
    await page.getByRole('tab', { name: '订单头' }).click();
    await expect(page.getByRole('tab', { name: '订单头' })).toBeVisible();
    await page.getByRole('tab', { name: /^发货/ }).click();
    await page.getByRole('tab', { name: /^过账/ }).click();
    await page.getByRole('tab', { name: /^开票/ }).click();
    await expect(page.getByText('订单详情与穿透')).toBeVisible();
  });

  test('UAT-SO-003: delivery/posting/billing tabs reflect loaded counts', async ({ page }) => {
    await expect(page.getByRole('tab', { name: /^发货 \(\d+\)/ })).toBeVisible();
    await expect(page.getByRole('tab', { name: /^过账 \(\d+\)/ })).toBeVisible();
    await expect(page.getByRole('tab', { name: /^开票 \(\d+\)/ })).toBeVisible();

    await page.getByRole('tab', { name: /^发货/ }).click();
    await page.getByRole('tab', { name: /^过账/ }).click();
    await page.getByRole('tab', { name: /^开票/ }).click();
    await expect(page.getByText('订单详情与穿透')).toBeVisible();
  });
});
