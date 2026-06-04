import { expect, test } from '@playwright/test';
import { loginPortal } from './helpers/auth';
import { describeSapSandbox } from './helpers/sap-env';

test.describe('auth (no SAP)', () => {
  test('unauthenticated /sales-orders redirects to login', async ({ page }) => {
    await page.goto('/sales-orders');
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByRole('button', { name: '登录', exact: true })).toBeVisible();
  });
});

describeSapSandbox('auth + SAP sandbox', () => {
  test('portal login reaches sales workbench', async ({ page }) => {
    await loginPortal(page, '/');
    await expect(page.getByRole('heading', { name: '销售工作台' })).toBeVisible();
    await expect(page.getByText('快捷视图')).toBeVisible();
  });
});
