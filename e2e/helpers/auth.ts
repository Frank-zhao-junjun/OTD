import type { Page } from '@playwright/test';
import { e2ePortalPhone } from './sap-env';

/** Demo OTP 123456 — stable in CI without depending on E2E_PASSWORD secrets. */
export async function loginPortal(page: Page, redirectPath = '/'): Promise<void> {
  await page.goto(`/login?from=${encodeURIComponent(redirectPath)}`);
  await page.getByLabel('手机号').fill(e2ePortalPhone());
  await page.getByRole('button', { name: '验证码（Demo）' }).click();
  await page.getByLabel('验证码').fill('123456');
  await page.getByRole('button', { name: '登录', exact: true }).click();
  await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 30_000 });
}
