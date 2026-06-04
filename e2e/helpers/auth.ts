import type { Page } from '@playwright/test';
import { e2ePortalPassword, e2ePortalPhone } from './sap-env';

export async function loginPortal(page: Page, redirectPath = '/'): Promise<void> {
  await page.goto(`/login?from=${encodeURIComponent(redirectPath)}`);
  await page.getByLabel('手机号').fill(e2ePortalPhone());
  await page.getByLabel('密码').fill(e2ePortalPassword());
  await page.getByRole('button', { name: '登录', exact: true }).click();
  await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 30_000 });
}
