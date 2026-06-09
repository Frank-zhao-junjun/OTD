import { expect, test } from '@playwright/test';
import { loginPortal } from './helpers/auth';
import { describeSapSandbox } from './helpers/sap-env';
import { searchSalesOrderByNo } from './helpers/sales-orders';

/** 方案 A：风险排序仅在当前页内生效（页内重排，翻页仍按 SAP 基础排序）。 */
describeSapSandbox('UAT-SO-007 risk and sort', () => {
  test.beforeEach(async ({ page }) => {
    await loginPortal(page, '/sales-orders');
  });

  test('list shows risk column and default risk sort option', async ({ page }) => {
    await searchSalesOrderByNo(page, '1');
    await expect(page.getByText('风险 / 优先级')).toBeVisible();
    await expect(page.getByText(/风险优先级/)).toBeVisible();
  });

  // Plan A: when results are present and risk sort is active, the page-level note must be visible.
  test('shows page-level sort note when risk sort is active', async ({ page }) => {
    await searchSalesOrderByNo(page, '1');
    const row = page.locator('table tbody tr').first();
    const empty = page.getByText('暂无数据');
    const hasResults = await row.isVisible().catch(() => false);
    if (!hasResults) {
      const isEmpty = await empty.isVisible().catch(() => false);
      test.skip(isEmpty, 'No sandbox data available for this order prefix — skip page-level note assertion');
      return;
    }
    await expect(page.getByText(/风险排序仅在当前页内生效/)).toBeVisible();
  });

  // Plan A: sort direction dropdown must be disabled when risk sort is selected (risk is always desc).
  test('sort direction is disabled when risk sort is selected', async ({ page }) => {
    await searchSalesOrderByNo(page, '1');
    const dirCombo = page.getByRole('combobox').filter({ hasText: /降序|升序/ });
    await expect(dirCombo).toBeDisabled();
  });

  test('can switch sort to order date', async ({ page }) => {
    await searchSalesOrderByNo(page, '1');
    await page.getByRole('combobox').filter({ hasText: /风险优先级/ }).click();
    await page.getByRole('option', { name: '订单日期' }).click();
    await expect(page.getByRole('combobox').filter({ hasText: /订单日期/ })).toBeVisible();
  });

  // Plan A: after switching to a non-risk sort, the page-level note must disappear.
  test('page-level note disappears after switching to non-risk sort', async ({ page }) => {
    await searchSalesOrderByNo(page, '1');
    await page.getByRole('combobox').filter({ hasText: /风险优先级/ }).click();
    await page.getByRole('option', { name: '订单日期' }).click();
    await expect(page.getByText(/风险排序仅在当前页内生效/)).toHaveCount(0);
  });
});
