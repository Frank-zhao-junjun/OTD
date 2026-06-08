import { expect, test } from '@playwright/test';
import { loginPortal } from './helpers/auth';
import { describeSapSandbox } from './helpers/sap-env';

const PRESET_LABELS = ['未完成订单', '已发货未开票', '近 7 天已开票', '近 7 天需交货'] as const;

describeSapSandbox('UAT-SO-015 home quick view counts', () => {
  test.beforeEach(async ({ page }) => {
    await loginPortal(page, '/');
  });

  test('shows four quick view cards', async ({ page }) => {
    await expect(page.getByText('快捷视图')).toBeVisible();
    await expect(page.getByText('4 个')).toBeVisible();
    for (const label of PRESET_LABELS) {
      await expect(page.getByRole('link', { name: new RegExp(label) })).toBeVisible();
    }
  });

  test('each preset link navigates to sales-orders with preset query', async ({ page }) => {
    const presets = [
      { label: '未完成订单', param: 'open' },
      { label: '已发货未开票', param: 'shipped-unbilled' },
      { label: '近 7 天已开票', param: 'invoiced-7d' },
      { label: '近 7 天需交货', param: 'delivery-7d' },
    ] as const;

    for (const { label, param } of presets) {
      await page.goto('/');
      await page.getByRole('link', { name: new RegExp(label) }).click();
      await expect(page).toHaveURL(new RegExp(`preset=${param}`));
    }
  });
});
