import { test, expect } from '@playwright/test';

test.describe('Sales Order E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Login first (mock auth if needed)
    await page.goto('/login');
    // Quick login with existing credentials
    await page.fill('input[name="username"]', 'admin');
    await page.fill('input[name="password"]', 'admin123');
    const captcha = page.locator('input[name="captchaCode"]');
    if (await captcha.isVisible()) {
      await captcha.fill('0000');
    }
    await page.click('button[type="submit"]');
  });

  test('sales order list loads and displays orders', async ({ page }) => {
    await page.goto('/sales-orders');
    // Wait for table or card view
    await page.waitForLoadState('networkidle');
    // Should see order rows or cards
    const rows = page.locator('[data-testid="order-row"], [data-testid="order-card"]');
    await expect(rows.first()).toBeVisible({ timeout: 10000 });
  });

  test('sales order detail page shows order info', async ({ page }) => {
    await page.goto('/sales-orders');
    await page.waitForLoadState('networkidle');
    // Click first order
    const firstRow = page.locator('[data-testid="order-row"], [data-testid="order-card"]').first();
    await firstRow.click();
    // Should navigate to detail
    await expect(page).toHaveURL(/\/sales-orders\/\d+/);
    await expect(page.locator('[data-testid="order-detail"]')).toBeVisible({ timeout: 10000 });
  });
});
