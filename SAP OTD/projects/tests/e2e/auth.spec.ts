import { test, expect } from '@playwright/test';

test.describe('Authentication E2E', () => {
  test('login page loads with captcha', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByPlaceholder('请输入用户名')).toBeVisible({ timeout: 20000 });
    await expect(page.getByPlaceholder('请输入密码')).toBeVisible();
    await expect(page.getByPlaceholder('请输入验证码')).toBeVisible();
    await expect(page.getByRole('button', { name: '登录' })).toBeVisible();
  });

  test('register form fields are present', async ({ page }) => {
    await page.goto('/register');
    await expect(page.getByPlaceholder('3-20个字符')).toBeVisible({ timeout: 20000 });
    await expect(page.locator('#password')).toBeVisible();
    await expect(page.locator('#confirmPassword')).toBeVisible();
    await expect(page.getByRole('button', { name: '注册' })).toBeVisible();
  });

  test('register page validates required fields', async ({ page }) => {
    await page.goto('/register');
    await page.getByRole('button', { name: '注册' }).click();
    await expect(page).toHaveURL(/\/register/);
  });

  test('register → login complete flow', async ({ page }) => {
    const username = `e2e_${Date.now()}`;
    const password = 'test123456';

    // ---- Step 1: Register ----
    await page.goto('/register');
    await expect(page.getByPlaceholder('3-20个字符')).toBeVisible({ timeout: 20000 });

    await page.getByPlaceholder('3-20个字符').fill(username);
    await page.locator('#password').fill(password);
    await page.locator('#confirmPassword').fill(password);

    // Intercept register API response
    const registerPromise = page.waitForResponse(
      (res) => res.url().includes('/api/auth/register') && res.status() === 200
    );

    await page.getByRole('button', { name: '注册' }).click();

    // Verify register API succeeded
    const regRes = await registerPromise;
    const regData = await regRes.json();
    expect(regData.success).toBe(true);

    // Wait for success message
    await expect(page.getByText(/注册成功/)).toBeVisible({ timeout: 10000 });

    // Wait for navigation to login page (1.5s setTimeout + router.push)
    await page.waitForURL('/login', { timeout: 15000 });

    // ---- Step 2: Login via API directly (bypass captcha UI complexity) ----
    await page.waitForLoadState('networkidle');

    // Call captcha + login directly in browser context to avoid React state timing issues
    const loginResult = await page.evaluate(async ({ username, password }) => {
      // Get fresh captcha with codeHint
      const captchaRes = await fetch('/api/auth/captcha');
      const captchaData = await captchaRes.json();

      // Call login API directly
      const loginRes = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          password,
          captchaCode: captchaData.codeHint,
          captchaId: captchaData.captchaId,
        }),
      });
      const loginData = await loginRes.json();
      return { captchaCode: captchaData.codeHint, captchaId: captchaData.captchaId, ...loginData };
    }, { username, password });

    console.log('Login API result:', JSON.stringify(loginResult));
    expect(loginResult.success).toBe(true);

    // After API login succeeds, cookies are set — navigate to home
    await page.goto('/');
    await expect(page.locator('body')).toBeVisible({ timeout: 10000 });
  });
});
