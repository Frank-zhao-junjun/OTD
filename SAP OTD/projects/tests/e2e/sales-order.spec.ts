import { test, expect } from '@playwright/test';

test.describe('Sales Order E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Login via API directly (bypasses captcha UI complexity)
    await page.goto('/login', { waitUntil: 'networkidle' });

    const loginResult = await page.evaluate(async () => {
      const captchaRes = await fetch('/api/auth/captcha');
      const captchaData = await captchaRes.json();
      const loginRes = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'admin',
          password: 'admin123',
          captchaCode: captchaData.codeHint,
          captchaToken: captchaData.captchaToken,
        }),
      });
      return await loginRes.json();
    });

    expect(loginResult.success).toBe(true);
    // Navigate to home after cookie is set
    await page.goto('/');
    await expect(page).toHaveURL('/', { timeout: 5000 });
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
